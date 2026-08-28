from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field

class Session(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    user_id: UUID = Field(foreign_key="user.id")
    routine_id: UUID = Field(foreign_key="routine.id")
    date: str = Field(index=True)

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