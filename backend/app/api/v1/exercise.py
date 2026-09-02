from fastapi import APIRouter, Depends
from app.api.dependencies import currentUserDep, sessionDep
from app.services.exercise_service import exercises_list
from app.schemas.exercise import ExerciseListResponse


router = APIRouter(
    prefix="/v1/exercises",
    tags=["Exercises"]
)

@router.get("/", response_model=ExerciseListResponse) #rotta per ottenere lista di esercizi disponibili con filtri e paginazione
def get_exercises(session: sessionDep,current_user: currentUserDep, name: str = None, limit: int = 10, Offset: int = 0, muscle_group: str = None):
    return exercises_list(session,name=name, limit=limit, offset=Offset, muscle_group=muscle_group)    

#router.post("/") #rotta per creare un esercizio personalizzato per l'utente autenticato

#router.get("/{exercise_id}") #rotta per ottenere i dettagli di un esercizio specifico

#router.patch("/{exercise_id}") #rotta per aggiornare un esercizio personalizzato, aggiornabile solo dall'utente che l'ha creato

#router.delete("/{exercise_id}") #rotta per eliminare un esercizio personalizzato, eliminabile solo dall'utente che l'ha creato

#router.get("/{exercise_id}/stats") #rotta per ottenere le statistiche di un esercizio specifico come tutti i pesi e le ripetizioni registrate dall'utente, con filtri e paginazione