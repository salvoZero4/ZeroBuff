from datetime import date
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import Sex


class UserResponse(BaseModel):
    id: UUID
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    sex: Sex | None = None
    date_of_birth: date | None = None
    height_cm: float | None = None


class UserNewInfo(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=30)
    email: EmailStr | None = None
    sex: Sex | None = None
    date_of_birth: date | None = None
    height_cm: float | None = Field(default=None, gt=0, lt=250)

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value):
        if value is not None:
            today = date.now().date()

            age = (today - value).days // 365

            if age < 13 or age > 150:
                raise ValueError("Date of birth is not valid")

        return value
