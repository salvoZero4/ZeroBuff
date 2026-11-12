from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.exercise import MuscleGroup


class ExerciseInRoutine(BaseModel):
    exercise_id: UUID
    sets: int
    reps: int
    rest_time: int
    order_index: int


class ExerciseInRoutineRead(ExerciseInRoutine):
    id: UUID
    name: str
    muscle_group: MuscleGroup
    model_config = ConfigDict(from_attributes=True)


class RoutineCreate(BaseModel):
    name: str
    exercises: list[ExerciseInRoutine]


class RoutineUpdate(BaseModel):
    name: str | None = None
    exercises: list[ExerciseInRoutine] | None = None


class ExerciseInRoutineUpdate(ExerciseInRoutine):
    routine_exercise_id: UUID | None = None


class RoutineRead(BaseModel):
    id: UUID
    name: str
    exercises: list[ExerciseInRoutineRead]
    model_config = ConfigDict(from_attributes=True)


class RoutineListRead(BaseModel):
    id: UUID
    name: str
    exercises_count: int
    muscle_groups: list[MuscleGroup]
    model_config = ConfigDict(from_attributes=True)


class ExerciseStats(BaseModel):
    exercise_id: UUID
    name: str
    latest_weight: float | None = None
    latest_date: date | None = None
    previous_weight: float | None = None
    previous_date: date | None = None
    percentage_improvement: float | None = None
    model_config = ConfigDict(from_attributes=True)


class RoutineStats(BaseModel):
    routine_id: UUID
    exercises_stats: list[ExerciseStats]
