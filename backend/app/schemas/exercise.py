import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.exercise import MuscleGroup


class ExerciseBase(BaseModel):
    name: str
    muscle_group: MuscleGroup
    created_by_user: UUID | None = None

    model_config = ConfigDict(
        from_attributes=True
    )  # Abilita lettura di oggetti SQLModel


class ExerciseRead(ExerciseBase):
    id: UUID


class ExerciseSearchResult(BaseModel):
    exercise: ExerciseRead
    score: float


class SearchResponse(BaseModel):
    results: list[ExerciseSearchResult]


class ExerciseCreated(BaseModel):
    name: str
    muscle_group: MuscleGroup


class ExerciseModified(BaseModel):
    name: str | None = None
    muscle_group: MuscleGroup | None = None


class ExerciseListResponse(BaseModel):
    exercises: list[ExerciseRead]


class SetLogRead(BaseModel):
    set_number: int
    reps: int
    weight: float
    rir: int | None = None


class ExerciseSessionLog(BaseModel):
    session_id: UUID
    date: datetime.date
    sets: list[SetLogRead]

    model_config = ConfigDict(from_attributes=True)


class ExerciseStatsResponse(BaseModel):
    exercise_id: UUID
    sessions: list[ExerciseSessionLog]
