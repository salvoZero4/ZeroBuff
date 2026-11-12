from uuid import UUID

from fastapi import APIRouter

from app.db.session import sessionDep
from app.features.auth.dependencies import currentUserDep
from app.features.routines.schemas import (
    RoutineCreate,
    RoutineListRead,
    RoutineRead,
    RoutineStats,
    RoutineUpdate,
)
from app.features.routines.service import (
    create_routine,
    delete_routine,
    get_exercises_in_routine,
    get_routine_stats,
    get_routines,
    update_routine,
)

router = APIRouter(prefix="/v1/routines", tags=["Routines"])


@router.get("/", response_model=list[RoutineListRead])
def get_routines_list_route(
    session: sessionDep, current_user: currentUserDep, limit: int = 10, offset: int = 0
):
    return get_routines(session, current_user.id, limit, offset)


@router.get("/{routine_id}", response_model=RoutineRead)
def get_routine_route(
    session: sessionDep, current_user: currentUserDep, routine_id: UUID
) -> RoutineRead:
    return get_exercises_in_routine(session, routine_id, current_user.id)


@router.post("/", response_model=RoutineRead, status_code=201)
def create_new_routine_route(
    routine_data: RoutineCreate, session: sessionDep, current_user: currentUserDep
) -> RoutineRead:
    return create_routine(routine_data, session, current_user)


@router.patch("/{routine_id}", response_model=RoutineRead)
def update_routine_route(
    routine_id: UUID,
    routine_data: RoutineUpdate,
    session: sessionDep,
    current_user: currentUserDep,
) -> RoutineRead:
    return update_routine(routine_id, routine_data, session, current_user.id)


@router.delete("/{routine_id}", status_code=204)
def delete_routine_route(
    routine_id: UUID,
    session: sessionDep,
    current_user: currentUserDep,
):
    delete_routine(routine_id, session, current_user.id)


@router.get("/{routine_id}/stats", response_model=RoutineStats)
def get_routine_stats_route(
    routine_id: UUID,
    session: sessionDep,
    current_user: currentUserDep,
) -> RoutineStats:
    return get_routine_stats(routine_id, current_user.id, session)
