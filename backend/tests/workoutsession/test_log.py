from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Session

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.session import Set_log


class TestCreateSetLog:
    def create_exercise(self, session: Session, name: str = "Bench Press"):
        exercise = Exercise(
            name=name,
            muscle_group=MuscleGroup.chest,
            secondary_muscle_groups=[MuscleGroup.triceps],
            equipment=Equipment.barbell,
        )
        session.add(exercise)
        session.commit()
        session.refresh(exercise)
        return exercise

    def create_ongoing_session(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/session/",
            json={
                "started_at": datetime.now(UTC).isoformat(),
            },
        )
        assert response.status_code == 201
        return response.json()["id"]

    def test_create_set_log_success(self, authenticated_client, session: Session):
        exercise = self.create_exercise(session)
        session_id = self.create_ongoing_session(authenticated_client)

        payload = {
            "set_number": 1,
            "reps": 10,
            "weight": 80.5,
            "rir": 2,
        }
        response = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json=payload,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["session_id"] == session_id
        assert data["exercise_id"] == str(exercise.id)
        assert data["exercise_name"] == exercise.name
        assert data["set_number"] == 1
        assert data["reps"] == 10
        assert data["weight"] == 80.5
        assert data["rir"] == 2

    def test_create_bodyweight_set_log(self, authenticated_client, session: Session):
        exercise = self.create_exercise(session)
        session_id = self.create_ongoing_session(authenticated_client)
        response = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": 12, "weight": 0, "rir": 0},
        )
        assert response.status_code == 201
        assert response.json()["weight"] == 0
        assert response.json()["reps"] == 12

    def test_create_set_log_without_rir(self, authenticated_client, session: Session):
        exercise = self.create_exercise(session)
        session_id = self.create_ongoing_session(authenticated_client)

        payload = {
            "set_number": 1,
            "reps": 12,
            "weight": 60.0,
        }
        response = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json=payload,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["rir"] is None

    def test_create_set_log_session_not_found(
        self, authenticated_client, session: Session
    ):
        exercise = self.create_exercise(session)
        fake_session_id = uuid4()

        response = authenticated_client.post(
            f"/v1/session/{fake_session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": 10, "weight": 50.0},
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Workout session not found."

    def test_create_set_log_exercise_not_found(self, authenticated_client):
        session_id = self.create_ongoing_session(authenticated_client)
        fake_exercise_id = uuid4()

        response = authenticated_client.post(
            f"/v1/session/{session_id}/log/{fake_exercise_id}",
            json={"set_number": 1, "reps": 10, "weight": 50.0},
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Exercise not found."

    def test_create_set_log_forbidden_session(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        exercise = self.create_exercise(session)
        user1_session_id = self.create_ongoing_session(authenticated_client)

        # L'Utente 2 prova ad aggiungere una serie alla sessione dell'Utente 1
        response = authenticated_client2.post(
            f"/v1/session/{user1_session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": 10, "weight": 50.0},
        )
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "You do not have permission to add a set log to this workout session."
        )

    def test_create_set_log_on_completed_session(
        self, authenticated_client, session: Session
    ):
        exercise = self.create_exercise(session)
        session_id = self.create_ongoing_session(authenticated_client)

        patch_res = authenticated_client.patch(
            f"/v1/session/{session_id}",
            json={"status": "completed"},
        )
        assert patch_res.status_code == 200

        response = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": 10, "weight": 50.0},
        )
        assert response.status_code == 201

    def test_create_set_log_validation_errors(
        self, authenticated_client, session: Session
    ):
        exercise = self.create_exercise(session)
        session_id = self.create_ongoing_session(authenticated_client)

        # set_number <= 0
        res = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json={"set_number": 0, "reps": 10, "weight": 50.0},
        )
        assert res.status_code == 422

        # reps <= 0
        res = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": -5, "weight": 50.0},
        )
        assert res.status_code == 422

        # weight < 0
        res = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": 10, "weight": -10.0},
        )
        assert res.status_code == 422

        # rir < 0 o rir > 10
        res = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": 10, "weight": 50.0, "rir": 15},
        )
        assert res.status_code == 422

    def test_create_set_log_unauthenticated(self, client, session: Session):
        exercise = self.create_exercise(session)
        response = client.post(
            f"/v1/session/{uuid4()}/log/{exercise.id}",
            json={"set_number": 1, "reps": 10, "weight": 50.0},
        )
        assert response.status_code == 401


class TestUpdateAndDeleteSetLog:
    def create_exercise(self, session: Session, name: str = "Bench Press"):
        exercise = Exercise(
            name=name,
            muscle_group=MuscleGroup.chest,
            secondary_muscle_groups=[],
            equipment=Equipment.barbell,
        )
        session.add(exercise)
        session.commit()
        session.refresh(exercise)
        return exercise

    def create_session_with_log(self, authenticated_client, session: Session):
        exercise = self.create_exercise(session)
        res_session = authenticated_client.post(
            "/v1/session/", json={"started_at": datetime.now(UTC).isoformat()}
        )
        session_id = res_session.json()["id"]

        res_log = authenticated_client.post(
            f"/v1/session/{session_id}/log/{exercise.id}",
            json={"set_number": 1, "reps": 10, "weight": 70.0, "rir": 2},
        )
        set_id = res_log.json()["id"]
        return session_id, set_id, exercise

    def test_update_set_log_success(self, authenticated_client, session: Session):
        session_id, set_id, _ = self.create_session_with_log(
            authenticated_client, session
        )

        response = authenticated_client.patch(
            f"/v1/session/{session_id}/log/{set_id}",
            json={"weight": 75.0, "reps": 8, "rir": 1},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["weight"] == 75.0
        assert data["reps"] == 8
        assert data["rir"] == 1
        assert data["set_number"] == 1

    def test_update_set_log_completed_session(
        self, authenticated_client, session: Session
    ):
        session_id, set_id, _ = self.create_session_with_log(
            authenticated_client, session
        )
        authenticated_client.patch(
            f"/v1/session/{session_id}", json={"status": "completed"}
        )

        response = authenticated_client.patch(
            f"/v1/session/{session_id}/log/{set_id}",
            json={"weight": 80.0},
        )
        assert response.status_code == 200
        assert response.json()["weight"] == 80.0

    def test_update_set_log_forbidden(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        session_id, set_id, _ = self.create_session_with_log(
            authenticated_client, session
        )

        response = authenticated_client2.patch(
            f"/v1/session/{session_id}/log/{set_id}",
            json={"weight": 80.0},
        )
        assert response.status_code == 403

    def test_update_set_log_not_found(self, authenticated_client, session: Session):
        session_id, _, _ = self.create_session_with_log(authenticated_client, session)
        fake_set_id = uuid4()

        response = authenticated_client.patch(
            f"/v1/session/{session_id}/log/{fake_set_id}",
            json={"weight": 80.0},
        )
        assert response.status_code == 404

    def test_delete_set_log_success(self, authenticated_client, session: Session):
        session_id, set_id, _ = self.create_session_with_log(
            authenticated_client, session
        )

        del_res = authenticated_client.delete(f"/v1/session/{session_id}/log/{set_id}")
        assert del_res.status_code == 204

        assert session.get(Set_log, set_id) is None

    def test_delete_set_log_completed_session(
        self, authenticated_client, session: Session
    ):
        session_id, set_id, _ = self.create_session_with_log(
            authenticated_client, session
        )
        authenticated_client.patch(
            f"/v1/session/{session_id}", json={"status": "completed"}
        )

        response = authenticated_client.delete(f"/v1/session/{session_id}/log/{set_id}")
        assert response.status_code == 204

    def test_delete_set_log_forbidden(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        session_id, set_id, _ = self.create_session_with_log(
            authenticated_client, session
        )

        response = authenticated_client2.delete(
            f"/v1/session/{session_id}/log/{set_id}"
        )
        assert response.status_code == 403

    def test_delete_set_log_not_found(self, authenticated_client, session: Session):
        session_id, _, _ = self.create_session_with_log(authenticated_client, session)
        fake_set_id = uuid4()

        response = authenticated_client.delete(
            f"/v1/session/{session_id}/log/{fake_set_id}"
        )
        assert response.status_code == 404
