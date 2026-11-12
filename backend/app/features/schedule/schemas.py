from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.schedule import DayOfWeek


class ScheduleBase(BaseModel):
    user_id: UUID
    routine_id: UUID
    day_of_week: DayOfWeek


class ScheduleRead(ScheduleBase):
    id: UUID
    routine_name: str
    model_config = ConfigDict(from_attributes=True)


class ScheduleCreate(BaseModel):
    routine_id: UUID
    day_of_week: DayOfWeek


class ScheduleUpdate(BaseModel):
    routine_id: UUID | None = None
    day_of_week: DayOfWeek | None = None
