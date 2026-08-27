from sqlmodel import SQLModel, Field

class Exercise(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    muscle_group: str = Field(index=True)