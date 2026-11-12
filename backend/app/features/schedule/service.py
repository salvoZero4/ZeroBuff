from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.routine import Routine
from app.models.schedule import Schedule
from app.features.schedule.schemas import ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.core.db_errors import commit_with_http_error_handling


def create_schedule(
    schedule_create: ScheduleCreate, user_id: UUID, session: Session
) -> ScheduleRead:
    existing_schedule = session.exec(
        select(Schedule).where(
            Schedule.user_id == user_id,
            Schedule.day_of_week == schedule_create.day_of_week,
        )
    ).first()

    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A schedule for this day already exists.",
        )
    routine = session.get(Routine, schedule_create.routine_id)

    if not routine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found."
        )
    if routine.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use this routine.",
        )

    schedule = Schedule(
        user_id=user_id,
        routine_id=schedule_create.routine_id,
        day_of_week=schedule_create.day_of_week,
    )

    session.add(schedule)
    commit_with_http_error_handling(session, "Invalid routine_id or user_id.")
    session.refresh(schedule)

    return ScheduleRead(
        id=schedule.id,
        user_id=schedule.user_id,
        routine_id=schedule.routine_id,
        day_of_week=schedule.day_of_week,
        routine_name=routine.name if routine else None,
    )


def get_schedule_by_user(user_id: UUID, session: Session) -> list[ScheduleRead]:
    schedules = session.exec(
        select(Schedule, Routine.name.label("routine_name"))
        .join(Routine, Schedule.routine_id == Routine.id)
        .where(Schedule.user_id == user_id)
    ).all()
    return [
        ScheduleRead(
            id=schedule.id,
            user_id=schedule.user_id,
            routine_id=schedule.routine_id,
            day_of_week=schedule.day_of_week,
            routine_name=routine_name,
        )
        for schedule, routine_name in schedules
    ]


def update_schedule(
    schedule_id: UUID, schedule_update: ScheduleUpdate, user_id: UUID, session: Session
) -> ScheduleRead:
    schedule = session.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found."
        )
    if schedule.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this schedule.",
        )

    if schedule_update.routine_id is not None:
        routine = session.get(Routine, schedule_update.routine_id)
        if not routine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found."
            )
        if routine.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to use this routine.",
            )
        schedule.routine_id = schedule_update.routine_id
    if schedule_update.day_of_week is not None:
        # Check for existing schedule on the same day
        existing_schedule = session.exec(
            select(Schedule).where(
                Schedule.user_id == user_id,
                Schedule.day_of_week == schedule_update.day_of_week,
                Schedule.id != schedule_id,
            )
        ).first()

        if existing_schedule:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A schedule for this day already exists.",
            )
        schedule.day_of_week = schedule_update.day_of_week

    session.add(schedule)
    commit_with_http_error_handling(session, "Invalid routine_id or user_id.")
    session.refresh(schedule)
    routine = session.get(Routine, schedule.routine_id)

    return ScheduleRead(
        id=schedule.id,
        user_id=schedule.user_id,
        routine_id=schedule.routine_id,
        day_of_week=schedule.day_of_week,
        routine_name=routine.name if routine else None,
    )


def delete_schedule(schedule_id: UUID, user_id: UUID, session: Session) -> None:
    schedule = session.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found."
        )
    if schedule.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this schedule.",
        )

    session.delete(schedule)
    commit_with_http_error_handling(session)


def get_today_schedule(user_id: UUID, session: Session) -> ScheduleRead | None:
    today_name = datetime.now(UTC).strftime("%A").lower()  # es. "monday"

    result = session.exec(
        select(Schedule, Routine.name.label("routine_name"))
        .join(Routine, Schedule.routine_id == Routine.id)
        .where(Schedule.user_id == user_id, Schedule.day_of_week == today_name)
    ).first()

    if not result:
        return None  # giorno di riposo, nessuna routine assegnata

    schedule, routine_name = result
    return ScheduleRead(
        id=schedule.id,
        user_id=schedule.user_id,
        routine_id=schedule.routine_id,
        day_of_week=schedule.day_of_week,
        routine_name=routine_name,
    )
