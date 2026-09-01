from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field
from datetime import datetime

class Session(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    user_id: UUID = Field(foreign_key="user.id")
    routine_id: UUID = Field(foreign_key="routine.id", nullable=True)
    date: str = Field(index=True)
    status : str = Field(index=True) #planned, completed, skipped
    started_at: datetime = Field(default=None, nullable=True)
    ended_at: datetime = Field(default=None, nullable=True)

class Set_log(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    session_id: UUID = Field(foreign_key="session.id")
    exercise_id: UUID = Field(foreign_key="exercise.id")
    set_number: int
    reps: int
    weight: float
    rir: int