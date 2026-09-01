from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from enum import Enum

class DayOfWeek(str, Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"

class Schedule(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    user_id: UUID = Field(foreign_key="user.id")
    routine_id: UUID = Field(foreign_key="routine.id")
    day_of_week: DayOfWeek