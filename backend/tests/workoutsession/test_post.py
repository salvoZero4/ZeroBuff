from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlmodel import Session, select

from app.models.routine import Routine
from app.models.user import User


class TestCreateWorkoutSession:
    def get_user_id(self, session: Session, email="test@example.com"):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id if user else None

    def create_routine(self, session: Session, user_id):
        routine = Routine(
            user_id=user_id,
            name="Test Routine",
        )
        session.add(routine)
        session.commit()
        session.refresh(routine)
        return routine.id

    def test_create_workout_session(self, authenticated_client, session: Session):
        user_id = self.get_user_id(session)
        routine_id = self.create_routine(session, user_id)

        started_at = datetime.now(UTC)
        response = authenticated_client.post(
            "/v1/session/",
            json={
                "routine_id": str(routine_id),
                "started_at": started_at.isoformat(),
            },
        )

        data = response.json()
        print(data)
        assert response.status_code == 201
        assert data["status"] == "ongoing"
        assert data["date"] == started_at.date().isoformat()
        print(data["started_at"], "\n", started_at.isoformat())
        response_started_at = datetime.fromisoformat(data["started_at"])
        assert response_started_at == started_at

    def test_create_workout_session_with_invalid_routine(
        self, authenticated_client, session: Session
    ):
        fake_routine_id = str(uuid4())

        started_at = datetime.now(UTC)
        response = authenticated_client.post(
            "/v1/session/",
            json={
                "routine_id": fake_routine_id,
                "started_at": started_at.isoformat(),
            },
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Routine not found"

    def test_create_workout_session_with_future_started_at(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine_id = self.create_routine(session, user_id)

        future_started_at = datetime.now(UTC) + timedelta(days=1)
        response = authenticated_client.post(
            "/v1/session/",
            json={
                "routine_id": str(routine_id),
                "started_at": future_started_at.isoformat(),
            },
        )

        assert response.status_code == 422
        assert response.json()["detail"] == "started_at cannot be in the future."

    def test_create_workout_session_with_old_started_at(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine_id = self.create_routine(session, user_id)

        old_started_at = datetime.now(UTC) - timedelta(days=2)
        response = authenticated_client.post(
            "/v1/session/",
            json={
                "routine_id": str(routine_id),
                "started_at": old_started_at.isoformat(),
            },
        )

        assert response.status_code == 422
        assert response.json()["detail"] == "started_at cannot be older than 24 hours."

    def test_create_workout_session_with_existing_ongoing_session(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine_id = self.create_routine(session, user_id)

        # Create an ongoing session first
        started_at = datetime.now(UTC)
        response1 = authenticated_client.post(
            "/v1/session/",
            json={
                "routine_id": str(routine_id),
                "started_at": started_at.isoformat(),
            },
        )
        assert response1.status_code == 201

        # Try to create another session while the first one is still ongoing
        response2 = authenticated_client.post(
            "/v1/session/",
            json={
                "routine_id": str(routine_id),
                "started_at": started_at.isoformat(),
            },
        )

        assert response2.status_code == 409
        assert (
            response2.json()["detail"]
            == "A Session in already started and not completed"
        )
