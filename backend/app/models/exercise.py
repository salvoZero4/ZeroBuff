from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Boolean, Index, Text, UniqueConstraint, false
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
    archived: bool = Field(default=False, sa_column=Column(Boolean, nullable=False, server_default=false()))
    created_by_user: UUID | None = Field(
        default=None, foreign_key="user.id", index=True, nullable=True
    )


class ExerciseTranslation(SQLModel, table=True):
    __tablename__ = "exercise_translation"
    __table_args__ = (
        UniqueConstraint("exercise_id", "language", name="uq_exercise_translation_language"),
        Index(
            "ix_exercise_translation_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    exercise_id: UUID = Field(foreign_key="exercise.id", ondelete="CASCADE")
    language: str = Field(max_length=63)
    name: str = Field(sa_type=Text)
