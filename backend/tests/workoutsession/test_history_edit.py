"""Analytics can correct a completed workout without reopening or changing its plan."""
from datetime import UTC, datetime

from app.models.exercise import Equipment, Exercise, MuscleGroup
from sqlmodel import Session


def test_completed_history_edit_updates_exercise_stats(authenticated_client, session: Session):
    exercises = [
        Exercise(name=name, muscle_group=MuscleGroup.chest, equipment=Equipment.barbell)
        for name in ["History original exercise", "History added exercise"]
    ]
    for exercise in exercises:
        session.add(exercise)
    session.commit()
    for exercise in exercises:
        session.refresh(exercise)

    response = authenticated_client.post(
        "/v1/session/", json={"started_at": datetime.now(UTC).isoformat()}
    )
    assert response.status_code == 201
    session_id = response.json()["id"]
    response = authenticated_client.patch(
        f"/v1/session/{session_id}", json={"status": "completed"}
    )
    assert response.status_code == 200

    created = authenticated_client.post(
        f"/v1/session/{session_id}/log/{exercises[1].id}",
        json={"set_number": 1, "weight": 20, "reps": 8, "rir": 2},
    )
    assert created.status_code == 201
    set_id = created.json()["id"]
    edited = authenticated_client.patch(
        f"/v1/session/{session_id}/log/{set_id}",
        json={"set_number": 2, "weight": 22.5, "reps": 10, "rir": None},
    )
    assert edited.status_code == 200
    detail = authenticated_client.get(f"/v1/session/{session_id}").json()
    assert detail["status"] == "completed"
    assert detail["routine_id"] is None
    assert len(detail["sets"]) == 1
    assert detail["sets"][0]["set_number"] == 2
    assert detail["sets"][0]["rir"] is None

    stats = authenticated_client.get(f"/v1/exercises/{exercises[1].id}/stats").json()
    assert stats["sessions"][0]["sets"][0]["weight"] == 22.5
    assert stats["sessions"][0]["sets"][0]["reps"] == 10
    deleted = authenticated_client.delete(f"/v1/session/{session_id}/log/{set_id}")
    assert deleted.status_code == 204
    assert authenticated_client.get(f"/v1/session/{session_id}").json()["sets"] == []
    assert authenticated_client.get(f"/v1/exercises/{exercises[1].id}/stats").json()["sessions"] == []
