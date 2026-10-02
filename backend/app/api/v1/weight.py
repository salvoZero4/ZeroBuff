from datetime import date
from uuid import UUID

from app.api.dependencies import currentUserDep, sessionDep
from app.schemas.weight import WeightLogCreate, WeightLogRead, WeightLogUpdate
from app.services.weight_service import (
    create_weight_log,
    delete_weight_log,
    get_weight_log_by_date,
    list_weight_logs,
    update_weight_log,
)
from fastapi import APIRouter, status

router = APIRouter(prefix="/v1/weight", tags=["weight"])


@router.get("/today", response_model=WeightLogRead | None)
def get_today_weight(
    session: sessionDep,
    user: currentUserDep,
    day: date | None = None,
):
    return get_weight_log_by_date(session, user.id, day)


@router.get("", response_model=list[WeightLogRead])
def list_weights(
    session: sessionDep,
    user: currentUserDep,
    date_to: date | None = None,
    date_from: date | None = None,
):
    return list_weight_logs(session, user.id, date_from, date_to)


@router.post("", response_model=WeightLogRead, status_code=status.HTTP_201_CREATED)
def create_weight(
    data: WeightLogCreate,
    session: sessionDep,
    user: currentUserDep,
):
    return create_weight_log(session, user.id, data)


@router.patch("/{log_id}", response_model=WeightLogRead)
def update_weight(
    log_id: UUID,
    data: WeightLogUpdate,
    session: sessionDep,
    user: currentUserDep,
):
    return update_weight_log(session, user.id, log_id, data)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(
    log_id: UUID,
    session: sessionDep,
    user: currentUserDep,
) -> None:
    delete_weight_log(session, user.id, log_id)
