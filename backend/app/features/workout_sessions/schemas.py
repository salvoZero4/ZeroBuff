from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class SessionCreate(BaseModel):
    routine_id: UUID | None = None
    started_at: datetime


class SessionRead(BaseModel):
    id: UUID
    routine_id: UUID | None = None
    status: str
    date: date
    started_at: datetime
    ended_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class SetLogCreate(BaseModel):
    set_number: int = Field(gt=0, description="The set number must be greater than 0.")
    reps: int = Field(gt=0, description="The number of reps must be greater than 0.")
    weight: float = Field(ge=0, description="The added weight must be 0 or greater.")
    rir: int | None = Field(
        default=None,
        ge=0,
        le=10,
        description="The RIR (Reps In Reserve) must be greater than or equal to 0 and less than or equal to 10.",
    )


class SessionUpdate(BaseModel):
    status: str
    ended_at: datetime | None = None


class SetLogRead(BaseModel):
    id: UUID
    session_id: UUID
    exercise_id: UUID
    exercise_name: str
    set_number: int
    reps: int
    weight: float
    rir: int | None

    model_config = ConfigDict(from_attributes=True)


class SessionDetailRead(SessionRead):
    sets: list[SetLogRead] = []


class SetLogUpdate(BaseModel):
    set_number: int | None = Field(default=None, gt=0)
    reps: int | None = Field(default=None, gt=0)
    weight: float | None = Field(default=None, ge=0)
    rir: int | None = Field(default=None, ge=0, le=10)


class CompletedSet(SetLogCreate):
    exercise_id: UUID
    weight: float = Field(ge=0, allow_inf_nan=False)


class CompletedWorkout(BaseModel):
    id: UUID
    routine_id: UUID | None = None
    started_at: AwareDatetime
    ended_at: AwareDatetime
    sets: list[CompletedSet]

    @model_validator(mode="after")
    def validate_workout(self):
        if self.ended_at < self.started_at:
            raise ValueError("Workout end must be at or after its start.")
        if self.ended_at > datetime.now(UTC) + timedelta(minutes=5):
            raise ValueError("Workout end cannot be in the future.")
        if len({(item.exercise_id, item.set_number) for item in self.sets}) != len(self.sets):
            raise ValueError("Duplicate set number for an exercise.")
        return self


class WorkoutSyncRead(BaseModel):
    id: UUID
