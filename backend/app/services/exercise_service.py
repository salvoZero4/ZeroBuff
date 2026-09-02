from fastapi import HTTPException
from sqlmodel import Session, select
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseListResponse, ExerciseBase


def exercises_list(session: Session, name: str | None = None, limit: int = 10, offset: int = 0, muscle_group: str | None = None):
    if muscle_group and name:
        statement = select(Exercise).where(Exercise.name.ilike(f"%{name}%"), Exercise.muscle_group == muscle_group)
    elif muscle_group:
        statement = select(Exercise).where(Exercise.muscle_group == muscle_group)
        statement = select(Exercise).where(Exercise.name.ilike(f"%{name}%"))
    else:
        statement = select(Exercise).offset(offset).limit(limit)

    statement = statement.offset(offset).limit(limit)

    exercises = session.exec(statement).all()
    
    return ExerciseListResponse(exercises=[ExerciseBase.model_validate(exercise) for exercise in exercises])