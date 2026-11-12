from datetime import date
from uuid import UUID

from app.models.weight_log import WeightLog
from app.features.weight.schemas import WeightLogCreate, WeightLogUpdate
from app.core.db_errors import commit_with_http_error_handling
from fastapi import HTTPException, status
from sqlmodel import Session, select


def create_weight_log(db: Session, user_id: UUID, data: WeightLogCreate) -> WeightLog:
    log = WeightLog(
        user_id=user_id,
        date=data.date or date.today(),
        weight=data.weight,
    )
    db.add(log)
    # Unique (user_id, date): a weight is already logged for that day
    commit_with_http_error_handling(db, "Weight already logged for this date")
    db.refresh(log)
    return log


def get_weight_log_by_date(
    db: Session, user_id: UUID, day: date | None = None
) -> WeightLog | None:
    query = select(WeightLog).where(
        WeightLog.user_id == user_id,
        WeightLog.date == (day or date.today()),
    )
    return db.exec(query).first()


def list_weight_logs(
    db: Session,
    user_id: UUID,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[WeightLog]:
    query = select(WeightLog).where(WeightLog.user_id == user_id)
    if date_from:
        query = query.where(WeightLog.date >= date_from)
    if date_to:
        query = query.where(WeightLog.date <= date_to)
    return list(db.exec(query.order_by(WeightLog.date.desc())).all())


def update_weight_log(
    db: Session, user_id: UUID, log_id: UUID, data: WeightLogUpdate
) -> WeightLog:
    log = db.get(WeightLog, log_id)
    if log is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Weight log not found")
    if log.user_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
    log.weight = data.weight
    db.add(log)
    commit_with_http_error_handling(db)
    db.refresh(log)
    return log


def delete_weight_log(db: Session, user_id: UUID, log_id: UUID) -> None:
    log = db.get(WeightLog, log_id)
    if log is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Weight log not found")
    if log.user_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")

    db.delete(log)
    commit_with_http_error_handling(db)
