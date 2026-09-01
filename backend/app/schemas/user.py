from pydantic import BaseModel, EmailStr
from uuid import UUID

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr

class UserNewInfo(BaseModel):
    username: str | None = None
    email: EmailStr | None = None