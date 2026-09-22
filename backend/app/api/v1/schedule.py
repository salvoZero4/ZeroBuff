from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import currentUserDep, sessionDep
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.services.schedule_service import (
    create_schedule,
    delete_schedule,
    get_schedule_by_user,
    get_today_schedule,
    update_schedule,
)

router = APIRouter(
    prefix="/v1/schedule",
    tags=["schedule"],
)


@router.get("/", response_model=list[ScheduleRead])
def get_schedule_route(current_user: currentUserDep, session: sessionDep):
    return get_schedule_by_user(current_user.id, session)


@router.get("/today", response_model=ScheduleRead | None)
def get_today_schedule_route(current_user: currentUserDep, session: sessionDep):
    return get_today_schedule(current_user.id, session)


@router.post("/", response_model=ScheduleRead, status_code=201)
def create_schedule_route(
    schedule_create: ScheduleCreate, user: currentUserDep, session: sessionDep
):
    return create_schedule(schedule_create, user.id, session)


@router.patch("/{schedule_id}", response_model=ScheduleRead)
def update_schedule_route(
    schedule_id: UUID,
    schedule_update: ScheduleUpdate,
    current_user: currentUserDep,
    session: sessionDep,
):
    return update_schedule(schedule_id, schedule_update, current_user.id, session)


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule_route(
    schedule_id: UUID, current_user: currentUserDep, session: sessionDep
):
    delete_schedule(schedule_id, current_user.id, session)
