from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Routine(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, primary_key=True, index=True, unique=True, nullable=False
    )
    user_id: UUID = Field(foreign_key="user.id")
    name: str = Field(index=True)


class RoutineExercise(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, primary_key=True, index=True, unique=True, nullable=False
    )
    routine_id: UUID = Field(foreign_key="routine.id")
    exercise_id: UUID = Field(foreign_key="exercise.id")
    sets: int
    reps: int
    rest_time: int
    order_index: int = Field(default=0, index=True)
