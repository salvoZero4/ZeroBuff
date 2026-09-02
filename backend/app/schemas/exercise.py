from pydantic import BaseModel

class ExerciseBase(BaseModel):
    name: str
    muscle_group: str
    created_by_user: str | None = None

class ExerciseListResponse(BaseModel):
    exercises: list[ExerciseBase]