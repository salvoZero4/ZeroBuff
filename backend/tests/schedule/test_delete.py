from uuid import UUID, uuid4

from sqlmodel import Session, select

from app.models.routine import Routine
from app.models.schedule import DayOfWeek, Schedule
from app.models.user import User


class TestDeleteSchedule:
    def get_user_id(self, session: Session, email: str = "test@example.com") -> UUID:
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id

    def create_schedule_helper(
        self, session: Session, user_id: UUID, day: DayOfWeek = DayOfWeek.monday
    ) -> tuple[Schedule, Routine]:
        routine = Routine(name="Legs Day", user_id=user_id)
        session.add(routine)
        session.commit()
        session.refresh(routine)

        schedule = Schedule(
            user_id=user_id,
            routine_id=routine.id,
            day_of_week=day,
        )
        session.add(schedule)
        session.commit()
        session.refresh(schedule)
        return schedule, routine

    def test_delete_schedule_success(self, authenticated_client, session: Session):
        user_id = self.get_user_id(session, "test@example.com")
        schedule, routine = self.create_schedule_helper(session, user_id)

        response = authenticated_client.delete(f"/v1/schedule/{schedule.id}")
        assert response.status_code == 204

        # Lo schedule non deve più esistere nel database
        assert session.get(Schedule, schedule.id) is None

        # La routine originale non deve essere intaccata
        assert session.get(Routine, routine.id) is not None

    def test_delete_schedule_not_found(self, authenticated_client):
        fake_id = uuid4()
        response = authenticated_client.delete(f"/v1/schedule/{fake_id}")
        assert response.status_code == 404
        assert response.json() == {"detail": "Schedule not found."}

    def test_delete_schedule_forbidden(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        user_1_id = self.get_user_id(session, "test@example.com")
        schedule, _ = self.create_schedule_helper(session, user_1_id)

        # Utente 2 prova a cancellare lo schedule dell'Utente 1
        response = authenticated_client2.delete(f"/v1/schedule/{schedule.id}")
        assert response.status_code == 403
        assert response.json() == {
            "detail": "You do not have permission to delete this schedule."
        }
        assert session.get(Schedule, schedule.id) is not None

    def test_delete_schedule_unauthenticated(self, client):
        fake_id = uuid4()
        response = client.delete(f"/v1/schedule/{fake_id}")
        assert response.status_code == 401

    def test_delete_schedule_invalid_uuid(self, authenticated_client):
        response = authenticated_client.delete("/v1/schedule/not-a-valid-uuid")
        assert response.status_code == 422
