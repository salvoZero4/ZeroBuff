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


class ExerciseCreated(BaseModel):
    name: str
    muscle_group: MuscleGroup


class ExerciseRead(ExerciseBase):
    id: UUID


class ExerciseModified(BaseModel):
    name: str | None = None
    muscle_group: MuscleGroup | None = None


class ExerciseListResponse(BaseModel):
    exercises: list[ExerciseRead]
