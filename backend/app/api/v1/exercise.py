from uuid import UUID

from fastapi import APIRouter, Query

from app.api.dependencies import currentUserDep, sessionDep
from app.models.exercise import MuscleGroup
from app.schemas.exercise import (
    ExerciseCreated,
    ExerciseListResponse,
    ExerciseModified,
    ExerciseRead,
)
from app.services.exercise_service import (
    create_custom_exercise,
    delete_exercise,
    exercise_details,
    exercises_list,
    update_exercise,
)

router = APIRouter(prefix="/v1/exercises", tags=["Exercises"])


@router.get(
    "/", response_model=ExerciseListResponse
)  # rotta per ottenere lista di esercizi disponibili con filtri e paginazione
def get_exercises(
    session: sessionDep,
    current_user: currentUserDep,
    name: str | None = None,
    limit: int = Query(default=10, le=100),
    offset: int = Query(default=0, ge=0),
    muscle_group: MuscleGroup | None = None,
):
    """Get a list of exercises with optional filters and pagination."""
    return exercises_list(
        session, name=name, limit=limit, offset=offset, muscle_group=muscle_group
    )


@router.post(
    "/", response_model=ExerciseRead
)  # rotta per creare un esercizio personalizzato per l'utente autenticato
def post_exercise(
    new_exercise: ExerciseCreated, session: sessionDep, current_user: currentUserDep
) -> ExerciseRead:
    """Create a custom exercise for the authenticated user."""
    return create_custom_exercise(new_exercise, session, current_user)


@router.get(
    "/{exercise_id}", response_model=ExerciseRead
)  # rotta per ottenere i dettagli di un esercizio specifico
def get_exercise_details(
    exercise_id: UUID, session: sessionDep, current_user: currentUserDep
):
    """Get the details of a specific exercise."""
    return exercise_details(exercise_id, session, current_user)


@router.patch(
    "/{exercise_id}", response_model=ExerciseRead
)  # rotta per aggiornare un esercizio personalizzato, aggiornabile solo dall'utente che l'ha creato
def update_custom_exercise(
    exercise_id: UUID,
    modified_exercise: ExerciseModified,
    session: sessionDep,
    current_user: currentUserDep,
):
    """Update a custom exercise created by the authenticated user."""
    return update_exercise(exercise_id, modified_exercise, session, current_user)


@router.delete(
    "/{exercise_id}", response_model=dict
)  # rotta per eliminare un esercizio personalizzato, eliminabile solo dall'utente che l'ha creato
def delete_custom_exercise(
    exercise_id: UUID, session: sessionDep, current_user: currentUserDep
):
    """Delete a custom exercise created by the authenticated user."""
    return delete_exercise(exercise_id, session, current_user)


# router.get("/{exercise_id}/stats") #rotta per ottenere le statistiche di un esercizio specifico come tutti i pesi e le ripetizioni registrate dall'utente, con filtri e paginazione
