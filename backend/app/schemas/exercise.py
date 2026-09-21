import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.exercise import Equipment, MuscleGroup


class ExerciseBase(BaseModel):
    name: str
    muscle_group: MuscleGroup
    secondary_muscle_groups: list[MuscleGroup] | None = []
    equipment: Equipment
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
    secondary_muscle_groups: list[MuscleGroup] | None = []
    equipment: Equipment

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        cleaned_name = value.strip().title()
        if not cleaned_name:
            raise ValueError("Exercise name cannot be empty")
        if len(cleaned_name) > 100:
            raise ValueError("Exercise name cannot exceed 100 characters")
        if len(cleaned_name) < 3:
            raise ValueError("Exercise name must be at least 3 characters long")
        return cleaned_name


class ExerciseModified(BaseModel):
    name: str | None = None
    muscle_group: MuscleGroup | None = None
    secondary_muscle_groups: list[MuscleGroup] | None = None
    equipment: Equipment | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        cleaned_name = value.strip().title()
        if not cleaned_name:
            raise ValueError("Exercise name cannot be empty")
        if len(cleaned_name) > 100:
            raise ValueError("Exercise name cannot exceed 100 characters")
        if len(cleaned_name) < 3:
            raise ValueError("Exercise name must be at least 3 characters long")
        return cleaned_name


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
