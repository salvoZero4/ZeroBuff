
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field
from pydantic import EmailStr

class User(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    username: str = Field(index=True, unique=True)
    email: EmailStr = Field(index=True, unique=True)
    hashed_password: str