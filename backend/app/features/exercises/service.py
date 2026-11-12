from uuid import UUID

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.routine import RoutineExercise
from app.models.session import Session as SessionModel
from app.models.session import Set_log
from app.features.exercises.schemas import (
    ExerciseCreated,
    ExerciseListResponse,
    ExerciseModified,
    ExerciseRead,
    ExerciseSearchResult,
    ExerciseSessionLog,
    ExerciseStatsResponse,
    SearchResponse,
    SetLogRead,
)
from app.core.db_errors import commit_with_http_error_handling
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select


def find_similar_exercises(name: str, session: Session, threshold: float = 0.3):
    similarity_score = func.similarity(Exercise.name, name)

    return session.exec(
        select(Exercise, similarity_score.label("score"))
        .where(similarity_score > threshold)
        .order_by(similarity_score.desc())
        .limit(5)
    ).all()


def search(session: Session, query: str) -> SearchResponse:
    similar_exercises = find_similar_exercises(query, session)

    results = [
        ExerciseSearchResult(
            exercise=ExerciseRead.model_validate(exercise), score=score
        )
        for exercise, score in similar_exercises
    ]

    return SearchResponse(results=results)


def exercises_list(
    session: Session,
    name: str | None = None,
    limit: int = 10,
    offset: int = 0,
    muscle_group: MuscleGroup | None = None,
    equipment: Equipment | None = None,
):
    statement = select(Exercise)

    if name:
        statement = statement.where(Exercise.name.ilike(f"%{name}%"))
    if muscle_group:
        statement = statement.where(Exercise.muscle_group == muscle_group)
    if equipment:
        statement = statement.where(Exercise.equipment == equipment)

    statement = statement.order_by(Exercise.name).offset(offset).limit(limit)

    exercises = session.exec(statement).all()

    return ExerciseListResponse(
        exercises=[ExerciseRead.model_validate(exercise) for exercise in exercises]
    )


def create_custom_exercise(
    new_exercise: ExerciseCreated, session: Session, current_user
) -> ExerciseRead:

    user_id = current_user.id

    similar_exercises = find_similar_exercises(
        new_exercise.name, session, threshold=0.8
    )
    if similar_exercises:
        similar_names = [exercise.name for exercise, _ in similar_exercises]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An exercise with a similar name already exists: {', '.join(similar_names)}",
        )

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
    if not exercise:
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
    if not exercise:
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
    if updated_fields:
        for field, value in updated_fields.items():
            if field == "name":
                setattr(exercise, field, value.strip().title())
            else:
                setattr(exercise, field, value)

    session.add(exercise)
    commit_with_http_error_handling(
        session, "Error occurred while updating the exercise"
    )
    session.refresh(exercise)

    return ExerciseRead.model_validate(exercise)


def delete_exercise(exercise_id: UUID, session: Session, current_user):
    exercise = session.get(Exercise, exercise_id)
    if not exercise:
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

    session.delete(exercise)
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
