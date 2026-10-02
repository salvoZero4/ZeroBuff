import datetime
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class WeightLog(SQLModel, table=True):
    __tablename__ = "weight_log"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_weight_log_user_date"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    date: datetime.date = Field(nullable=False)
    weight: float = Field(nullable=False, gt=0.0, le=1000.0)  # Kg
