from datetime import date
from enum import Enum
from uuid import UUID, uuid4

from pydantic import EmailStr
from sqlmodel import Field, SQLModel


class Sex(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class User(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, primary_key=True, index=True, unique=True, nullable=False
    )
    username: str = Field(index=True, unique=True)
    email: EmailStr = Field(index=True, unique=True)
    hashed_password: str


class UserProfile(SQLModel, table=True):
    user_id: UUID = Field(foreign_key="user.id", primary_key=True)
    date_of_birth: date | None = Field(default=None)
    sex: Sex | None = Field(default=None)
    height_cm: float | None = Field(default=None)  # Cm
