from uuid import UUID

from fastapi import APIRouter, status

from app.api.dependencies import currentUserDep, sessionDep
from app.schemas.workoutsession import (
    SessionCreate,
    SessionDetailRead,
    SessionRead,
    SessionUpdate,
    SetLogCreate,
    SetLogRead,
    SetLogUpdate,
)
from app.services.workoutsession_service import (
    create_session,
    create_set_log,
    delete_set_log,
    get_session_details,
    get_sessions,
    update_session,
    update_set_log,
)

router = APIRouter(
    prefix="/v1/session",
    tags=["Session"],
)


@router.get("/", response_model=list[SessionRead])
def get_sessions_route(
    user: currentUserDep,
    session: sessionDep,
    offset: int = 0,
    limit: int = 100,
):

    return get_sessions(user.id, offset, limit, session)


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=SessionRead)
def create_session_route(
    session_data: SessionCreate, user: currentUserDep, session: sessionDep
):
    return create_session(user.id, session_data, session)


@router.post(
    "/{session_id}/log/{exercise_id}",
    response_model=SetLogRead,
    status_code=status.HTTP_201_CREATED,
)
def create_set_log_route(
    session_id: UUID,
    exercise_id: UUID,
    set_log_data: SetLogCreate,
    user: currentUserDep,
    session: sessionDep,
):
    return create_set_log(user.id, session_id, exercise_id, set_log_data, session)


@router.patch("/{session_id}", response_model=SessionRead)
def update_session_route(
    session_id: UUID,
    session_data: SessionUpdate,
    user: currentUserDep,
    session: sessionDep,
):
    return update_session(user.id, session_id, session_data, session)


@router.get("/{session_id}", response_model=SessionDetailRead)
def get_session_details_route(
    session_id: UUID,
    user: currentUserDep,
    session: sessionDep,
):
    return get_session_details(user.id, session_id, session)


@router.patch("/{session_id}/log/{set_id}", response_model=SetLogRead)
def update_set_log_route(
    session_id: UUID,
    set_id: UUID,
    set_log_data: SetLogUpdate,
    user: currentUserDep,
    session: sessionDep,
):
    return update_set_log(user.id, session_id, set_id, set_log_data, session)


@router.delete("/{session_id}/log/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set_log_route(
    session_id: UUID,
    set_id: UUID,
    user: currentUserDep,
    session: sessionDep,
):
    delete_set_log(user.id, session_id, set_id, session)
