from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Session, select

from app.models.user import User


class TestUpdateSession:
    def get_user_id(self, session: Session, email="test@example.com"):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id if user else None

    def create_workout_session(self, authenticated_client, session: Session):
        # Create a routine first
        routine_data = {"name": "Test Routine", "exercises": []}
        routine_response = authenticated_client.post("/v1/routines/", json=routine_data)
        print(routine_response.json())
        assert routine_response.status_code == 201
        routine_id = routine_response.json()["id"]

        # Now create a workout session with the created routine
        started_at = datetime.now(UTC)
        session_data = {
            "routine_id": str(routine_id),
            "started_at": started_at.isoformat(),
        }
        response = authenticated_client.post("/v1/session/", json=session_data)
        assert response.status_code == 201
        return response.json()

    def test_update_session_completed(self, authenticated_client, session: Session):
        session_info = self.create_workout_session(authenticated_client, session)
        session_id = session_info["id"]
        ended_at = datetime.now(UTC).isoformat()
        update_data = {
            "status": "completed",
            "ended_at": ended_at,
        }
        response = authenticated_client.patch(
            f"/v1/session/{session_id}", json=update_data
        )
        assert response.status_code == 200
        updated_session = response.json()
        assert updated_session["status"] == "completed"
        response_ended_at = datetime.fromisoformat(updated_session["ended_at"])
        assert response_ended_at == datetime.fromisoformat(ended_at)

    def test_update_session_paused(self, authenticated_client, session: Session):
        session_info = self.create_workout_session(authenticated_client, session)
        session_id = session_info["id"]
        update_data = {
            "status": "paused",
            "ended_at": None,
        }
        response = authenticated_client.patch(
            f"/v1/session/{session_id}", json=update_data
        )
        assert response.status_code == 200
        updated_session = response.json()
        assert updated_session["status"] == "paused"
        assert updated_session["ended_at"] is None

    def test_update_session_invalid_status(
        self, authenticated_client, session: Session
    ):
        session_info = self.create_workout_session(authenticated_client, session)
        session_id = session_info["id"]
        update_data = {
            "status": "invalid_status",
            "ended_at": None,
        }
        response = authenticated_client.patch(
            f"/v1/session/{session_id}", json=update_data
        )
        assert response.status_code == 422

    def test_update_session_not_found(self, authenticated_client, session: Session):
        fake_session_id = str(uuid4())
        update_data = {
            "status": "paused",
            "ended_at": None,
        }
        response = authenticated_client.patch(
            f"/v1/session/{fake_session_id}", json=update_data
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Workout session not found."

    def test_update_session_forbidden(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        # Create a workout session with one user
        session_info = self.create_workout_session(authenticated_client, session)
        session_id = session_info["id"]

        # Attempt to update the session with a different user
        update_data = {
            "status": "paused",
            "ended_at": None,
        }
        response = authenticated_client2.patch(
            f"/v1/session/{session_id}", json=update_data
        )
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "You do not have permission to update this workout session."
        )

    def test_update_session_already_completed(
        self, authenticated_client, session: Session
    ):
        session_info = self.create_workout_session(authenticated_client, session)
        session_id = session_info["id"]

        # First, complete the session
        ended_at = datetime.now(UTC).isoformat()
        update_data_completed = {
            "status": "completed",
            "ended_at": ended_at,
        }
        response_completed = authenticated_client.patch(
            f"/v1/session/{session_id}", json=update_data_completed
        )
        assert response_completed.status_code == 200

        # Now, attempt to update the already completed session
        update_data_paused = {
            "status": "paused",
            "ended_at": None,
        }
        response_paused = authenticated_client.patch(
            f"/v1/session/{session_id}", json=update_data_paused
        )
        assert response_paused.status_code == 409
        assert (
            response_paused.json()["detail"] == "Workout session is already completed."
        )

    def test_update_session_unathenticated(self, client, session: Session):

        session_id = str(uuid4())  # Use a random UUID for testing
        update_data = {
            "status": "paused",
            "ended_at": None,
        }
        response = client.patch(f"/v1/session/{session_id}", json=update_data)
        assert response.status_code == 401
