from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field

class Exercise(SQLModel, table=True):
    id: UUID = Field(
        default_factory=uuid4, 
        primary_key=True, index=True, 
        unique=True, 
        nullable=False)
    name: str = Field(index=True, unique=True)
    muscle_group: str = Field(index=True)