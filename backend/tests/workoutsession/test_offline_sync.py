from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from sqlmodel import Session

from app.features.workout_sessions.schemas import CompletedWorkout
from app.features.workout_sessions.sync import sync_completed_workout
from app.models.session import Session as WorkoutSession
from app.models.session import WorkoutSyncReceipt
from app.models.user import User

ENDPOINT = "/v1/session/completed"


def completed_workout(**changes):
    return {
        "id": str(uuid4()),
        "started_at": "2024-01-02T00:10:00+02:00",
        "ended_at": "2024-01-01T23:05:00Z",
        "sets": [],
        **changes,
    }


def test_retry_survives_deletion_and_rejects_other_account(authenticated_client, authenticated_client2):
    workout = completed_workout(routine_id=str(uuid4()))
    initial = authenticated_client.post(ENDPOINT, json=workout)
    assert initial.status_code == 201
    assert initial.json() == {"id": workout["id"]}
    url = f"/v1/session/{workout['id']}"
    detail = authenticated_client.get(url).json()
    assert detail["date"] == "2024-01-02"
    assert detail["status"] == "completed"
    assert detail["routine_id"] is None

    assert authenticated_client2.post(ENDPOINT, json=workout).status_code == 409
    assert authenticated_client.post(
        ENDPOINT, json={**workout, "ended_at": "2024-01-01T23:06:00Z"}
    ).status_code == 409
    assert authenticated_client.delete(url).status_code == 204
    replay = authenticated_client.post(ENDPOINT, json=workout)
    assert replay.status_code == 200
    assert replay.json() == initial.json()
    assert authenticated_client.get(url).status_code == 404


def test_missing_exercise_rolls_back_session_and_receipt(authenticated_client):
    exercise = authenticated_client.post(
        "/v1/exercises/",
        json={"name": "Offline squat", "muscle_group": "quads", "equipment": "barbell"},
    ).json()
    entry = {"exercise_id": exercise["id"], "set_number": 1, "reps": 8, "weight": 0, "rir": 2}
    missing = {**entry, "exercise_id": str(uuid4())}
    workout = completed_workout(sets=[entry, missing])
    rejected = authenticated_client.post(ENDPOINT, json=workout)
    assert rejected.status_code == 422
    assert missing["exercise_id"] in rejected.json()["detail"]
    assert authenticated_client.get(f"/v1/session/{workout['id']}").status_code == 404
    assert authenticated_client.post(ENDPOINT, json={**workout, "sets": [entry]}).status_code == 201


def test_archived_exercise_keeps_id_for_other_users_offline_sets(authenticated_client, authenticated_client2):
    created = authenticated_client.post(
        "/v1/exercises/",
        json={"name": "Offline press", "muscle_group": "chest", "equipment": "dumbbell"},
    )
    assert created.status_code == 201
    exercise = created.json()["id"]
    assert authenticated_client.delete(f"/v1/exercises/{exercise}").status_code == 204
    assert authenticated_client2.get(f"/v1/exercises/{exercise}").status_code == 404
    workout = completed_workout(sets=[
        {"exercise_id": exercise, "set_number": 1, "reps": 8, "weight": 15, "rir": None}
    ])
    assert authenticated_client2.post(ENDPOINT, json=workout).status_code == 201
    url = f"/v1/session/{workout['id']}"
    detail = authenticated_client2.get(url).json()
    assert detail["sets"][0]["exercise_id"] == exercise
    assert authenticated_client2.patch(
        f"{url}/log/{detail['sets'][0]['id']}", json={"reps": 9}
    ).status_code == 200
    assert authenticated_client2.post(ENDPOINT, json=workout).status_code == 200
    assert authenticated_client2.get(url).json()["sets"][0]["reps"] == 9


def test_concurrent_retries_create_one_session(session):
    engine = session.get_bind().engine
    workout = CompletedWorkout.model_validate(completed_workout())
    user_id = uuid4()
    with Session(engine) as db:
        db.add(User(id=user_id, username=str(user_id), email=f"{user_id}@example.com", hashed_password="unused"))
        db.commit()

    start = Barrier(2)

    def sync():
        with Session(engine) as db:
            start.wait(timeout=5)
            return sync_completed_workout(user_id, workout, db)

    try:
        with ThreadPoolExecutor(max_workers=2) as workers:
            first, second = (workers.submit(sync) for _ in range(2))
            assert sorted([first.result(timeout=15), second.result(timeout=15)]) == [False, True]
    finally:
        with Session(engine) as db:
            for model, record_id in (
                (WorkoutSession, workout.id),
                (WorkoutSyncReceipt, workout.id),
                (User, user_id),
            ):
                if record := db.get(model, record_id):
                    db.delete(record)
                    db.flush()
            db.commit()
