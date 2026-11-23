from typing import Annotated
from uuid import UUID

from app.db.session import sessionDep
from app.features.auth.dependencies import currentUserDep
from app.models.exercise import Equipment, MuscleGroup
from app.features.exercises.languages import preferred_language
from app.features.exercises.schemas import (
    ExerciseCreated,
    ExerciseListResponse,
    ExerciseModified,
    ExerciseNameConflictResponse,
    ExerciseRead,
    ExerciseStatsResponse,
    ExerciseTranslationsResponse,
)
from app.features.exercises.service import (
    ExerciseNameConflict,
    create_custom_exercise,
    delete_exercise,
    exercise_details,
    exercise_translations,
    exercises_list,
    get_stats,
    update_exercise,
)
from fastapi import APIRouter, Header, Query, Request, Response, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/v1/exercises", tags=["Exercises"])


async def exercise_name_conflict_response(
    _request: Request, exc: ExerciseNameConflict
) -> JSONResponse:
    body = ExerciseNameConflictResponse(detail=exc.detail, matches=exc.matches)
    return JSONResponse(status_code=exc.status_code, content=body.model_dump(mode="json"))


@router.get(
    "/", response_model=ExerciseListResponse
)  # rotta per ottenere lista di esercizi disponibili con filtri e paginazione
def get_exercises(
    response: Response,
    session: sessionDep,
    current_user: currentUserDep,
    name: str | None = None,
    limit: int = Query(default=10, le=100),
    offset: int = Query(default=0, ge=0),
    muscle_group: MuscleGroup | None = None,
    equipment: Equipment | None = None,
    accept_language: Annotated[str | None, Header()] = None,
    mine: bool = False,
):
    """Get a list of exercises with optional filters and pagination."""
    response.headers.append("Vary", "Accept-Language")
    return exercises_list(
        session,
        name=name,
        limit=limit,
        offset=offset,
        muscle_group=muscle_group,
        equipment=equipment,
        language=preferred_language(accept_language),
        created_by_user=current_user.id if mine else None,
    )


@router.get("/translations", response_model=ExerciseTranslationsResponse)
def get_exercise_translations(
    session: sessionDep,
    current_user: currentUserDep,
    language: Annotated[str, Query(pattern=r"^[a-z]{2,8}(-[a-z0-9]{1,8})*$", max_length=63)],
):
    """Get the translated display names for global exercises."""
    return exercise_translations(session, language)


@router.post(
    "/",
    response_model=ExerciseRead,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"model": ExerciseNameConflictResponse}},
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
    return exercise_details(exercise_id, session)


@router.patch(
    "/{exercise_id}",
    response_model=ExerciseRead,
    responses={409: {"model": ExerciseNameConflictResponse}},
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
    "/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT
)  # rotta per eliminare un esercizio personalizzato, eliminabile solo dall'utente che l'ha creato
def delete_custom_exercise(
    exercise_id: UUID, session: sessionDep, current_user: currentUserDep
):
    delete_exercise(exercise_id, session, current_user)


@router.get(
    "/{exercise_id}/stats", response_model=ExerciseStatsResponse
)  # rotta per ottenere le statistiche di un esercizio specifico come tutti i pesi e le ripetizioni registrate dall'utente, con filtri e paginazione
def get_exercise_stats(
    exercise_id: UUID,
    session: sessionDep,
    current_user: currentUserDep,
    limit: int = Query(default=10, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Get the stats of a specific exercise for the authenticated user."""
    return get_stats(exercise_id, current_user.id, limit, offset, session)
