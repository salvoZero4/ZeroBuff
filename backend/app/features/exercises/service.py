from uuid import UUID

from app.models.exercise import Equipment, Exercise, ExerciseTranslation, MuscleGroup
from app.models.routine import RoutineExercise
from app.models.session import Session as SessionModel
from app.models.session import Set_log
from app.features.exercises.schemas import (
    ExerciseCreated,
    ExerciseListResponse,
    ExerciseModified,
    ExerciseRead,
    ExerciseSessionLog,
    ExerciseStatsResponse,
    ExerciseTranslationRead,
    ExerciseTranslationsResponse,
    SetLogRead,
)
from app.core.db_errors import commit_with_http_error_handling
from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, or_
from sqlmodel import Session, select


def _translation_join(language: str):
    return and_(
        ExerciseTranslation.exercise_id == Exercise.id,
        ExerciseTranslation.language == language,
        Exercise.created_by_user.is_(None),
    )


class ExerciseNameConflict(HTTPException):
    def __init__(self, matches: list[ExerciseRead]):
        names = ", ".join(exercise.name for exercise in matches)
        super().__init__(
            status.HTTP_409_CONFLICT,
            f"An exercise with a similar name already exists: {names}",
        )
        self.matches = matches


def _exercise_name_similarity(name: str, language: str):
    score = func.word_similarity(name, Exercise.name)
    if language != "en":
        score = func.greatest(score, func.word_similarity(name, ExerciseTranslation.name))
    return score


def ensure_exercise_name_available(
    name: str, session: Session, *, excluding: UUID | None = None
) -> None:
    # Serialize catalog name writes so two requests cannot both pass the check.
    session.exec(
        select(func.pg_advisory_xact_lock(func.hashtext("zerobuff.exercise_names")))
    )

    def name_key(value):
        return func.regexp_replace(func.lower(value), "[^[:alnum:]]+", "", "g")

    normalized_name = name_key(name)

    def duplicate_score(candidate):
        return case(
            (
                and_(normalized_name != "", name_key(candidate) == normalized_name),
                1.0,
            ),
            (func.lower(candidate) == func.lower(name), 1.0),
            else_=func.similarity(candidate, name),
        )

    translated_scores = (
        select(
            ExerciseTranslation.exercise_id,
            func.max(duplicate_score(ExerciseTranslation.name)).label("score"),
        )
        .group_by(ExerciseTranslation.exercise_id)
        .subquery()
    )
    score = func.greatest(
        duplicate_score(Exercise.name),
        translated_scores.c.score,
    )
    statement = (
        select(Exercise)
        .outerjoin(translated_scores, Exercise.id == translated_scores.c.exercise_id)
        .where(Exercise.archived.is_(False), score > 0.8)
        .order_by(score.desc(), Exercise.id)
        .limit(5)
    )
    if excluding is not None:
        statement = statement.where(Exercise.id != excluding)
    matches = session.exec(statement).all()
    if matches:
        raise ExerciseNameConflict([ExerciseRead.model_validate(row) for row in matches])


def exercises_list(
    session: Session,
    name: str | None = None,
    limit: int = 10,
    offset: int = 0,
    muscle_group: MuscleGroup | None = None,
    equipment: Equipment | None = None,
    language: str = "en",
    created_by_user: UUID | None = None,
):
    statement = select(Exercise).where(Exercise.archived.is_(False))
    name_order = []

    if created_by_user is not None:
        statement = statement.where(Exercise.created_by_user == created_by_user)
    if name:
        pattern = f"%{name}%"
        matches = Exercise.name.ilike(pattern)
        if language != "en":
            statement = statement.outerjoin(ExerciseTranslation, _translation_join(language))
            matches = or_(matches, ExerciseTranslation.name.ilike(pattern))
        if len(name.strip()) >= 3:
            score = _exercise_name_similarity(name, language)
            name_order.append(case((matches, 2.0), else_=score).desc())
            matches = or_(matches, score > 0.3)
        statement = statement.where(matches)
    if muscle_group:
        statement = statement.where(Exercise.muscle_group == muscle_group)
    if equipment:
        statement = statement.where(Exercise.equipment == equipment)

    statement = (
        statement.order_by(*name_order, Exercise.name, Exercise.id)
        .offset(offset)
        .limit(limit)
    )

    exercises = session.exec(statement).all()

    return ExerciseListResponse(
        exercises=[ExerciseRead.model_validate(exercise) for exercise in exercises]
    )


def exercise_translations(session: Session, language: str) -> ExerciseTranslationsResponse:
    translations = session.exec(
        select(ExerciseTranslation)
        .join(Exercise, Exercise.id == ExerciseTranslation.exercise_id)
        .where(
            ExerciseTranslation.language == language,
            Exercise.created_by_user.is_(None),
        )
        .order_by(ExerciseTranslation.exercise_id)
    ).all()
    return ExerciseTranslationsResponse(
        translations=[ExerciseTranslationRead.model_validate(row) for row in translations]
    )


def create_custom_exercise(
    new_exercise: ExerciseCreated, session: Session, current_user
) -> ExerciseRead:

    user_id = current_user.id

    ensure_exercise_name_available(new_exercise.name, session)

    exercise = Exercise(
        name=new_exercise.name,
        muscle_group=new_exercise.muscle_group,
        secondary_muscle_groups=new_exercise.secondary_muscle_groups,
        equipment=new_exercise.equipment,
        created_by_user=user_id,
    )

    session.add(exercise)
    commit_with_http_error_handling(
        session, "Error occurred while creating the exercise"
    )
    session.refresh(exercise)

    return ExerciseRead.model_validate(exercise)


def exercise_details(exercise_id: UUID, session: Session) -> ExerciseRead:
    exercise = session.get(Exercise, exercise_id)
    if not exercise or exercise.archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found"
        )
    return ExerciseRead.model_validate(exercise)


def update_exercise(
    exercise_id: UUID,
    modified_exercise: ExerciseModified,
    session: Session,
    current_user,
) -> ExerciseRead:
    exercise = session.get(Exercise, exercise_id)
    if not exercise or exercise.archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found"
        )
    if exercise.created_by_user != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this exercise",
        )

    updated_fields = {
        k: v for k, v in modified_exercise.model_dump().items() if v is not None
    }
    name = modified_exercise.name
    if name is not None and name != exercise.name:
        ensure_exercise_name_available(name, session, excluding=exercise.id)
    for field, value in updated_fields.items():
        setattr(exercise, field, value)

    session.add(exercise)
    commit_with_http_error_handling(
        session, "Error occurred while updating the exercise"
    )
    session.refresh(exercise)

    return ExerciseRead.model_validate(exercise)


def delete_exercise(exercise_id: UUID, session: Session, current_user):
    exercise = session.get(Exercise, exercise_id, with_for_update=True)
    if not exercise or exercise.archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found"
        )
    if not exercise.created_by_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete a default exercise",
        )
    if exercise.created_by_user != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this exercise",
        )

    has_logged_workouts = (
        session.exec(
            select(Set_log).where(Set_log.exercise_id == exercise_id).limit(1)
        ).first()
        is not None
    )

    has_routine_references = (
        session.exec(
            select(RoutineExercise)
            .where(RoutineExercise.exercise_id == exercise_id)
            .limit(1)
        ).first()
        is not None
    )

    if has_logged_workouts or has_routine_references:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete exercise because it is referenced in logged workouts or routines",
        )

    exercise.archived = True
    session.add(exercise)
    commit_with_http_error_handling(
        session, "Error occurred while deleting the exercise"
    )


def get_stats(
    exercise_id: UUID, user_id: UUID, limit: int, offset: int, session: Session
):
    # Check if the exercise exists
    exercise = session.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found"
        )
    session_rank = func.dense_rank().over(
        order_by=(SessionModel.date.desc(), SessionModel.id.desc())
    )

    subq = (
        select(
            SessionModel.id.label("session_id"),
            session_rank.label("rank"),
        )
        .join(Set_log, Set_log.session_id == SessionModel.id)
        .where(Set_log.exercise_id == exercise_id, SessionModel.user_id == user_id)
        .distinct()
        .subquery()
    )

    response = session.exec(
        select(
            Set_log.session_id,
            SessionModel.date,
            Set_log.set_number,
            Set_log.reps,
            Set_log.weight,
            Set_log.rir,
        )
        .join(SessionModel, Set_log.session_id == SessionModel.id)
        .join(subq, subq.c.session_id == SessionModel.id)
        .where(
            Set_log.exercise_id == exercise_id,
            SessionModel.user_id == user_id,
            subq.c.rank > offset,
            subq.c.rank <= offset + limit,
        )
        .order_by(SessionModel.date.desc(), Set_log.set_number.asc())
    ).all()

    # Raggruppamento per session_id
    sessions_map: dict[UUID, ExerciseSessionLog] = {}
    # l'ordine finale dipende dall'ORDER BY della query sopra
    for row in response:
        if row.session_id not in sessions_map:
            sessions_map[row.session_id] = ExerciseSessionLog(
                session_id=row.session_id,
                date=row.date,
                sets=[],
            )

        sessions_map[row.session_id].sets.append(
            SetLogRead(
                set_number=row.set_number, reps=row.reps, weight=row.weight, rir=row.rir
            )
        )

    return ExerciseStatsResponse(
        exercise_id=exercise_id,
        sessions=list(sessions_map.values()),
    )
