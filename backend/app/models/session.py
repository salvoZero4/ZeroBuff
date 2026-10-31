import datetime
from uuid import UUID, uuid4

from sqlmodel import Column, DateTime, Field, SQLModel


class Session(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, primary_key=True, index=True, unique=True, nullable=False
    )
    user_id: UUID = Field(foreign_key="user.id")
    routine_id: UUID = Field(
        foreign_key="routine.id", nullable=True, ondelete="SET NULL"
    )
    date: datetime.date = Field(index=True)
    status: str = Field(index=True)  # ongoing, completed, paused
    started_at: datetime.datetime = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    ended_at: datetime.datetime = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )


class Set_log(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, primary_key=True, index=True, unique=True, nullable=False
    )
    session_id: UUID = Field(foreign_key="session.id", ondelete="CASCADE")
    exercise_id: UUID = Field(foreign_key="exercise.id")
    set_number: int
    reps: int
    weight: float
    rir: int = Field(
        default=None,
        nullable=True,
    )
