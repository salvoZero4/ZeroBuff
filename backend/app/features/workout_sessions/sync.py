import hashlib
import json
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from app.core.db_errors import commit_with_http_error_handling
from app.features.workout_sessions.schemas import CompletedWorkout
from app.models.exercise import Exercise
from app.models.routine import Routine
from app.models.session import Session as WorkoutSession
from app.models.session import Set_log, WorkoutSyncReceipt


def sync_completed_workout(
    user_id: UUID, workout: CompletedWorkout, db: Session
) -> bool:
    payload = workout.model_dump(mode="json")
    payload["sets"].sort(key=lambda item: (item["exercise_id"], item["set_number"]))
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

    # PostgreSQL waits for any concurrent submission of the same UUID to commit.
    claim = (
        insert(WorkoutSyncReceipt)
        .values(id=workout.id, user_id=user_id, payload_hash=digest)
        .on_conflict_do_nothing(index_elements=["id"])
        .returning(WorkoutSyncReceipt.id)
    )
    if db.exec(claim).scalar_one_or_none() is None:
        receipt = db.get(WorkoutSyncReceipt, workout.id)
        if receipt.user_id != user_id or receipt.payload_hash != digest:
            raise HTTPException(status.HTTP_409_CONFLICT, "Workout ID already used.")
        return False

    routine_id = None
    if workout.routine_id is not None:
        routine = db.exec(
            select(Routine)
            .where(Routine.id == workout.routine_id)
            .with_for_update(read=True)
        ).first()
        if routine is not None:
            if routine.user_id != user_id:
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN, "Routine belongs to another account."
                )
            routine_id = routine.id

    exercise_ids = {item.exercise_id for item in workout.sets}
    if exercise_ids:
        found = set(
            db.exec(select(Exercise.id).where(Exercise.id.in_(exercise_ids))).all()
        )
        if missing := exercise_ids - found:
            ids = ", ".join(sorted(map(str, missing)))
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, f"Exercises not found: {ids}"
            )

    db.add(
        WorkoutSession(
            id=workout.id,
            user_id=user_id,
            routine_id=routine_id,
            date=workout.started_at.date(),
            started_at=workout.started_at,
            ended_at=workout.ended_at,
            status="completed",
        )
    )
    # The models have no ORM relationship to order the two inserts.
    commit_with_sets(db, workout)
    return True


def commit_with_sets(db: Session, workout: CompletedWorkout) -> None:
    from sqlalchemy.exc import IntegrityError, OperationalError

    try:
        db.flush()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Workout ID already used."
        ) from error
    except OperationalError as error:
        db.rollback()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Database unavailable"
        ) from error

    db.add_all(
        Set_log(session_id=workout.id, **item.model_dump()) for item in workout.sets
    )
    commit_with_http_error_handling(db)
