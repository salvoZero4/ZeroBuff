from sqlmodel import SQLModel, Field

class Session(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    routine_id: int = Field(foreign_key="routine.id")
    date: str = Field(index=True)

class Set_log(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    exercise_id: int = Field(foreign_key="exercise.id")
    set_number: int
    reps: int
    weight: float