from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.session import Session as WorkoutSession
from app.models.session import Set_log
from app.features.workout_sessions.schemas import (
    SessionCreate,
    SessionDetailRead,
    SessionRead,
    SessionUpdate,
    SetLogCreate,
    SetLogRead,
    SetLogUpdate,
)
from app.core.db_errors import commit_with_http_error_handling
from fastapi import HTTPException, status
from sqlmodel import Session, select


def create_session(user_id: UUID, session_data: SessionCreate, session: Session):
    now = datetime.now(UTC)

    # Check if started_at is in the future or older than 24 hours
    started_at = session_data.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=UTC)

    if started_at > now + timedelta(minutes=5):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="started_at cannot be in the future.",
        )

    if started_at < now - timedelta(days=1):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="started_at cannot be older than 24 hours.",
        )

    ongoin_session = session.exec(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user_id, WorkoutSession.status != "completed"
        )
    ).first()

    if ongoin_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Session in already started and not completed",
        )
    if session_data.routine_id is not None:
        routine_exists = session.exec(
            select(Routine).where(Routine.id == session_data.routine_id)
        ).first()
        if not routine_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Routine not found",
            )
        if routine_exists.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to create a session for this routine.",
            )

    today = datetime.now(UTC).date()

    new_session = WorkoutSession(
        user_id=user_id,
        routine_id=session_data.routine_id,
        date=today,
        started_at=started_at,
        status="ongoing",
    )
    session.add(new_session)
    commit_with_http_error_handling(session, "Invalid routine_id or user_id.")
    session.refresh(new_session)
    return SessionRead(
        id=new_session.id,
        routine_id=new_session.routine_id,
        status=new_session.status,
        date=new_session.date,
        started_at=new_session.started_at,
        ended_at=new_session.ended_at,
    )


def update_session(
    user_id: UUID, session_id: UUID, update_data: SessionUpdate, session: Session
):
    workout_session = session.get(WorkoutSession, session_id)

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found.",
        )
    if workout_session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this workout session.",
        )

    if workout_session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Workout session is already completed.",
        )
    if update_data.status not in ["ongoing", "paused", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid status value. Must be 'ongoing', 'paused', or 'completed'.",
        )

    workout_session.status = update_data.status
    if workout_session.status == "completed" and update_data.ended_at is not None:
        workout_session.ended_at = update_data.ended_at
    elif workout_session.status == "completed" and update_data.ended_at is None:
        workout_session.ended_at = datetime.now(UTC)

    session.add(workout_session)
    commit_with_http_error_handling(session)

    session.refresh(workout_session)
    return SessionRead(
        id=workout_session.id,
        routine_id=workout_session.routine_id,
        status=workout_session.status,
        date=workout_session.date,
        started_at=workout_session.started_at,
        ended_at=workout_session.ended_at,
    )


def get_sessions(user_id: UUID, offset: int, limit: int, session: Session):
    sessions = session.exec(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.date.desc(), WorkoutSession.started_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return [
        SessionRead(
            id=s.id,
            routine_id=s.routine_id,
            status=s.status,
            date=s.date,
            started_at=s.started_at,
            ended_at=s.ended_at,
        )
        for s in sessions
    ]


def create_set_log(
    user_id: UUID,
    session_id: UUID,
    exercise_id: UUID,
    set_log_data: SetLogCreate,
    session: Session,
):
    workout_session = session.get(WorkoutSession, session_id)

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found.",
        )
    if workout_session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add a set log to this workout session.",
        )

    exercise_exists = session.get(Exercise, exercise_id)

    if not exercise_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found.",
        )

    new_set_log = Set_log(
        session_id=session_id,
        exercise_id=exercise_id,
        set_number=set_log_data.set_number,
        reps=set_log_data.reps,
        weight=set_log_data.weight,
        rir=set_log_data.rir,
    )

    session.add(new_set_log)
    commit_with_http_error_handling(session, "Invalid data for set log.")

    session.refresh(new_set_log)
    return SetLogRead(
        id=new_set_log.id,
        session_id=new_set_log.session_id,
        exercise_id=new_set_log.exercise_id,
        exercise_name=exercise_exists.name,
        set_number=new_set_log.set_number,
        reps=new_set_log.reps,
        weight=new_set_log.weight,
        rir=new_set_log.rir,
    )


def get_session_details(
    user_id: UUID, session_id: UUID, session: Session
) -> SessionDetailRead:
    workout_session = session.get(WorkoutSession, session_id)
    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found.",
        )

    if workout_session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this workout session.",
        )

    # Join con RoutineExercise per prendere l'order_index della scheda associata
    query = (
        select(Set_log, Exercise.name.label("exercise_name"))
        .join(Exercise, Set_log.exercise_id == Exercise.id)
        .outerjoin(
            RoutineExercise,
            (RoutineExercise.routine_id == workout_session.routine_id)
            & (RoutineExercise.exercise_id == Set_log.exercise_id),
        )
        .where(Set_log.session_id == session_id)
        .order_by(
            RoutineExercise.order_index.asc().nulls_last(),
            Exercise.name.asc(),
            Set_log.set_number.asc(),
        )
    )
    logs = session.exec(query).all()

    sets_read = [
        SetLogRead(
            id=log.id,
            session_id=log.session_id,
            exercise_id=log.exercise_id,
            exercise_name=exercise_name,
            set_number=log.set_number,
            reps=log.reps,
            weight=log.weight,
            rir=log.rir,
        )
        for log, exercise_name in logs
    ]

    return SessionDetailRead(
        id=workout_session.id,
        routine_id=workout_session.routine_id,
        status=workout_session.status,
        date=workout_session.date,
        started_at=workout_session.started_at,
        ended_at=workout_session.ended_at,
        sets=sets_read,
    )


def update_set_log(
    user_id: UUID,
    session_id: UUID,
    set_id: UUID,
    update_data: SetLogUpdate,
    session: Session,
) -> SetLogRead:
    workout_session = session.get(WorkoutSession, session_id)
    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found.",
        )

    if workout_session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this workout session.",
        )

    set_log = session.get(Set_log, set_id)
    if not set_log or set_log.session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set log not found.",
        )

    patch_dict = update_data.model_dump(exclude_unset=True)
    for field, value in patch_dict.items():
        setattr(set_log, field, value)

    session.add(set_log)
    commit_with_http_error_handling(session)

    session.refresh(set_log)
    exercise = session.get(Exercise, set_log.exercise_id)

    return SetLogRead(
        id=set_log.id,
        session_id=set_log.session_id,
        exercise_id=set_log.exercise_id,
        exercise_name=exercise.name,
        set_number=set_log.set_number,
        reps=set_log.reps,
        weight=set_log.weight,
        rir=set_log.rir,
    )


def delete_set_log(
    user_id: UUID,
    session_id: UUID,
    set_id: UUID,
    session: Session,
) -> None:
    workout_session = session.get(WorkoutSession, session_id)
    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found.",
        )

    if workout_session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this workout session.",
        )

    set_log = session.get(Set_log, set_id)
    if not set_log or set_log.session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set log not found.",
        )

    session.delete(set_log)
    commit_with_http_error_handling(session)


def delete_session(session_id: UUID, user_id: UUID, session: Session):
    workout_session = session.get(WorkoutSession, session_id)
    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found.",
        )
    if workout_session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this workout session.",
        )
    session.delete(workout_session)
    commit_with_http_error_handling(session)
