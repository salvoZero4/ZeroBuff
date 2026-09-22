from uuid import UUID, uuid4

from sqlmodel import Session, select

from app.models.routine import Routine
from app.models.schedule import DayOfWeek, Schedule
from app.models.user import User


class TestPatchSchedule:
    def get_user_id(self, session: Session, email: str = "test@example.com"):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id

    def create_routine(
        self, session: Session, user_id: UUID, name: str = "Test Routine"
    ):
        routine = Routine(name=name, user_id=user_id)
        session.add(routine)
        session.commit()
        session.refresh(routine)
        return routine

    def create_schedule(
        self, session: Session, user_id: UUID, routine_id: UUID, day_of_week: DayOfWeek
    ):
        schedule = Schedule(
            user_id=user_id, routine_id=routine_id, day_of_week=day_of_week
        )
        session.add(schedule)
        session.commit()
        session.refresh(schedule)
        return schedule

    def test_update_schedule_success_routine(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine1 = self.create_routine(session, user_id, "Routine 1")
        routine2 = self.create_routine(session, user_id, "Routine 2")
        schedule = self.create_schedule(session, user_id, routine1.id, DayOfWeek.monday)

        response = authenticated_client.patch(
            f"/v1/schedule/{schedule.id}",
            json={"routine_id": str(routine2.id)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(schedule.id)
        assert data["routine_id"] == str(routine2.id)
        assert data["day_of_week"] == "monday"

    def test_update_schedule_success_day_of_week(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine = self.create_routine(session, user_id, "Routine 1")
        schedule = self.create_schedule(session, user_id, routine.id, DayOfWeek.monday)

        response = authenticated_client.patch(
            f"/v1/schedule/{schedule.id}",
            json={"day_of_week": "tuesday"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(schedule.id)
        assert data["routine_id"] == str(routine.id)
        assert data["day_of_week"] == "tuesday"

    def test_update_schedule_conflict_day_of_week(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine1 = self.create_routine(session, user_id, "Routine 1")
        routine2 = self.create_routine(session, user_id, "Routine 2")
        schedule1 = self.create_schedule(
            session, user_id, routine1.id, DayOfWeek.monday
        )
        schedule2 = self.create_schedule(
            session, user_id, routine2.id, DayOfWeek.tuesday
        )

        response = authenticated_client.patch(
            f"/v1/schedule/{schedule2.id}",
            json={"day_of_week": "monday"},
        )
        assert response.status_code == 409
        assert response.json() == {"detail": "A schedule for this day already exists."}

    def test_update_schedule_unauthorized(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        user_id = self.get_user_id(session)
        routine = self.create_routine(session, user_id, "Routine 1")
        schedule = self.create_schedule(session, user_id, routine.id, DayOfWeek.monday)

        response = authenticated_client2.patch(
            f"/v1/schedule/{schedule.id}",
            json={"day_of_week": "tuesday"},
        )
        assert response.status_code == 403

    def test_update_schedule_not_found(self, authenticated_client):
        fake_schedule_id = str(uuid4())
        response = authenticated_client.patch(
            f"/v1/schedule/{fake_schedule_id}",
            json={"day_of_week": "tuesday"},
        )
        assert response.status_code == 404
        assert response.json() == {"detail": "Schedule not found."}

    def test_update_schedule_invalid_day_of_week(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine = self.create_routine(session, user_id, "Routine 1")
        schedule = self.create_schedule(session, user_id, routine.id, DayOfWeek.monday)

        response = authenticated_client.patch(
            f"/v1/schedule/{schedule.id}",
            json={"day_of_week": "funday"},
        )
        assert response.status_code == 422

    def test_update_schedule_invalid_routine(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine = self.create_routine(session, user_id, "Routine 1")
        schedule = self.create_schedule(session, user_id, routine.id, DayOfWeek.monday)

        fake_routine_id = str(uuid4())
        response = authenticated_client.patch(
            f"/v1/schedule/{schedule.id}",
            json={"routine_id": fake_routine_id},
        )
        assert response.status_code == 404
        assert response.json() == {"detail": "Routine not found."}

    def test_update_schedule_routine_not_owned(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        user_id = self.get_user_id(session)
        routine = self.create_routine(session, user_id, "Routine 1")

        user_id2 = self.get_user_id(session, email="test2@example.com")
        routine2 = self.create_routine(session, user_id2, "Routine 2")
        schedule2 = self.create_schedule(
            session, user_id2, routine2.id, DayOfWeek.monday
        )

        response = authenticated_client2.patch(
            f"/v1/schedule/{schedule2.id}",
            json={"routine_id": str(routine.id)},
        )
        assert response.status_code == 403
        assert response.json() == {
            "detail": "You do not have permission to use this routine."
        }

    def test_update_schedule_unauthenticated(self, client, session: Session):
        fake_schedule_id = str(uuid4())

        response = client.patch(
            f"/v1/schedule/{fake_schedule_id}",
            json={"day_of_week": "tuesday"},
        )
        assert response.status_code == 401

    def test_update_schedule_same_day_allowed(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session)
        routine = self.create_routine(session, user_id, "Routine 1")
        schedule = self.create_schedule(session, user_id, routine.id, DayOfWeek.monday)

        # Invio lo stesso identico giorno: deve rispondere 200 OK e NON 409
        response = authenticated_client.patch(
            f"/v1/schedule/{schedule.id}",
            json={"day_of_week": "monday"},
        )
        assert response.status_code == 200
        assert response.json()["day_of_week"] == "monday"
