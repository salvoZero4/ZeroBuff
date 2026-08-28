from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field

class Routine(SQLModel, table=True):
    id: UUID= Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    user_id: UUID = Field(foreign_key="user.id")
    name: str= Field(index=True)


class RoutineExercise(SQLModel, table=True):
    routine_id: UUID = Field(foreign_key="routine.id", primary_key=True)
    exercise_id: UUID = Field(foreign_key="exercise.id", primary_key=True)
    sets: int
    reps: int
    rest_time: int
    order_index: int = Field(default=0, index=True)