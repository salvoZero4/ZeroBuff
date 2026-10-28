from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

from app.models.session import Session as WorkoutSession
from app.models.user import User
from fastapi import status
from sqlmodel import Session, select


class TestDeleteWorkout:
    def get_user(self, db_session: Session, email: str = "test@example.com") -> User:
        user = db_session.exec(select(User).where(User.email == email)).first()
        assert user is not None, f"Utente con email {email} non trovato nelle fixture."
        return user

    def create_completed_session(
        self, db_session: Session, user_id, days_ago: int = 0
    ) -> WorkoutSession:
        session_date = date.today() - timedelta(days=days_ago)
        started_at = datetime.now(UTC) - timedelta(days=days_ago, hours=1)
        ended_at = started_at + timedelta(minutes=60)

        workout = WorkoutSession(
            user_id=user_id,
            routine_id=None,
            date=session_date,
            started_at=started_at,
            ended_at=ended_at,
            status="completed",
        )
        db_session.add(workout)
        db_session.commit()
        db_session.refresh(workout)
        return workout

    def test_delete_session_success(self, authenticated_client, session: Session):
        """
        Verifica che la sessione dell'utente autenticato venga eliminata con successo (204).
        """
        current_user = self.get_user(db_session=session, email="test@example.com")
        workout = self.create_completed_session(
            db_session=session, user_id=current_user.id
        )
        session_id = str(workout.id)

        response = authenticated_client.delete(f"/v1/session/{session_id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        get_response = authenticated_client.get(f"/v1/session/{session_id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_session_not_found(self, authenticated_client):
        """
        Verifica che eliminare un UUID inesistente restituisca 404.
        """
        random_uuid = str(uuid4())
        response = authenticated_client.delete(f"/v1/session/{random_uuid}")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_session_other_user(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        """
        Verifica che tentare di eliminare la sessione di un altro utente restituisca 403.
        """
        owner_user = self.get_user(db_session=session, email="test@example.com")
        workout = self.create_completed_session(
            db_session=session, user_id=owner_user.id
        )
        session_id = str(workout.id)

        response = authenticated_client2.delete(f"/v1/session/{session_id}")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert (
            response.json()["detail"]
            == "You do not have permission to delete this workout session."
        )

    def test_delete_session_unauthorized(self, client):
        """
        Verifica che chiamare l'endpoint senza token JWT restituisca 401.
        """
        random_uuid = str(uuid4())
        response = client.delete(f"/v1/session/{random_uuid}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
