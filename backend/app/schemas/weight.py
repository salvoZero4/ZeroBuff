from datetime import date, timedelta
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class WeightLogCreate(BaseModel):
    weight: float = Field(gt=0, le=500)  # kg
    date: date | None = None  # defaults to server today in the service

    @field_validator("date")
    @classmethod
    def not_in_the_future(cls, v: date | None) -> date | None:
        # 1 day of tolerance for clients ahead of the server's timezone
        if v is not None and v > date.today() + timedelta(days=1):
            raise ValueError("date cannot be in the future")
        return v


class WeightLogUpdate(BaseModel):
    # Only the weight is editable: changing the date could violate
    # the UniqueConstraint(user_id, date)
    weight: float = Field(gt=0, le=500)  # kg


class WeightLogRead(BaseModel):
    id: UUID
    date: date
    weight: float
