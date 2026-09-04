from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlmodel import Session, select

from app.models.exercise import Exercise
from app.models.routine import RoutineExercise
from app.models.session import Set_log
from app.schemas.exercise import (
    ExerciseCreated,
    ExerciseListResponse,
    ExerciseModified,
    ExerciseRead,
)


def find_similar_exercises(name: str, session: Session, threshold: float = 0.3):
    similarity = func.similarity(Exercise.name, name)
    return session.exec(
        select(Exercise, similarity.label("score"))
        .where(similarity > threshold)
        .order_by(similarity.desc())
        .limit(5)
    ).all()


def exercises_list(
    session: Session,
    name: str | None = None,
    limit: int = 10,
    offset: int = 0,
    muscle_group: str | None = None,
):
    statement = select(Exercise)

    if name:
        statement = statement.where(Exercise.name.ilike(f"%{name}%"))
    if muscle_group:
        statement = statement.where(Exercise.muscle_group == muscle_group)

    statement = statement.order_by(Exercise.name).offset(offset).limit(limit)

    exercises = session.exec(statement).all()

    return ExerciseListResponse(
        exercises=[ExerciseRead.model_validate(exercise) for exercise in exercises]
    )


def create_custom_exercise(
    new_exercise: ExerciseCreated, session: Session, current_user
) -> ExerciseRead:
    user_id = current_user.id

    exercise = Exercise(
        name=new_exercise.name,
        muscle_group=new_exercise.muscle_group,
        created_by_user=user_id,
    )

    try:
        session.add(exercise)
        session.commit()
        session.refresh(exercise)
    except IntegrityError as exc:
        print(f"IntegrityError: {exc.orig}")
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Error occurred while creating the exercise",
        )
    except OperationalError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database operational error occurred",
        )

    return ExerciseRead.model_validate(exercise)


def exercise_details(exercise_id: UUID, session: Session, current_user) -> ExerciseRead:
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

    if modified_exercise.name is not None:
        exercise.name = modified_exercise.name
    if modified_exercise.muscle_group is not None:
        exercise.muscle_group = modified_exercise.muscle_group

    try:
        session.add(exercise)
        session.commit()
        session.refresh(exercise)
    except IntegrityError as exc:
        print(f"IntegrityError: {exc.orig}")
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Error occurred while updating the exercise",
        )
    except OperationalError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database operational error occurred",
        )

    return ExerciseRead.model_validate(exercise)


def delete_exercise(exercise_id: UUID, session: Session, current_user):
    exercise = session.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found"
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

    try:
        session.delete(exercise)
        session.commit()
    except IntegrityError as exc:
        print(f"IntegrityError: {exc.orig}")
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Error occurred while deleting the exercise",
        )
    except OperationalError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database operational error occurred",
        )
    return {"detail": "Exercise deleted successfully"}
