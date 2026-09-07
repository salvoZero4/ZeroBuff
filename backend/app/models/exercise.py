from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class MuscleGroup(str, Enum):
    chest = "chest"

    lats = "lats"
    upper_back = "upper_back"
    lower_back = "lower_back"

    front_delts = "front_delts"
    side_delts = "side_delts"
    rear_delts = "rear_delts"

    biceps = "biceps"
    triceps = "triceps"
    forearms = "forearms"

    quads = "quads"
    hamstrings = "hamstrings"
    glutes = "glutes"
    calves = "calves"
    adductors = "adductors"
    abductors = "abductors"

    abs = "abs"
    obliques = "obliques"

    # Altro
    traps = "traps"
    neck = "neck"
    full_body = "full_body"


class Exercise(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, primary_key=True, index=True, unique=True, nullable=False
    )
    name: str = Field(index=True)
    muscle_group: MuscleGroup = Field(index=True)
    created_by_user: UUID | None = Field(
        foreign_key="user.id", index=True, nullable=True
    )
