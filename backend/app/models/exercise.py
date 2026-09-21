from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlmodel import ARRAY, Column, Field, SQLModel


class MuscleGroup(str, Enum):
    chest = "chest"
    chest_upper = "chest_upper"

    lats = "lats"
    upper_back = "upper_back"
    lower_back = "lower_back"

    front_delts = "front_delts"
    side_delts = "side_delts"
    rear_delts = "rear_delts"

    biceps = "biceps"
    triceps = "triceps"
    forearms = "forearms"
    brachialis = "brachialis"

    quads = "quads"
    hamstrings = "hamstrings"
    glutes = "glutes"
    calves = "calves"
    adductors = "adductors"
    abductors = "abductors"
    hip_flexors = "hip_flexors"

    abs = "abs"
    obliques = "obliques"

    traps = "traps"
    neck = "neck"

    cardio = "cardio"
    full_body = "full_body"


class Equipment(str, Enum):
    barbell = "barbell"
    dumbbell = "dumbbell"
    machine = "machine"
    smith_machine = "smith_machine"
    cable = "cable"
    kettlebell = "kettlebell"
    bodyweight = "bodyweight"
    bodyweight_weighted = "bodyweight_weighted"
    resistance_band = "resistance_band"
    other = "other"


class Exercise(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, primary_key=True, index=True, unique=True, nullable=False
    )
    name: str = Field(index=True)
    muscle_group: MuscleGroup = Field(index=True)
    secondary_muscle_groups: list[MuscleGroup] | None = Field(
        default_factory=list, sa_column=Column(ARRAY(SAEnum(MuscleGroup)))
    )
    equipment: Equipment = Field(index=True)
    created_by_user: UUID | None = Field(
        default=None, foreign_key="user.id", index=True, nullable=True
    )
