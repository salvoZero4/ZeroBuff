from datetime import UTC, datetime
from uuid import UUID

from sqlmodel import Session, select

from app.models.routine import Routine
from app.models.schedule import DayOfWeek, Schedule
from app.models.user import User


class TestGetSchedule:
    def get_user_id(self, session: Session, email: str = "test@example.com") -> UUID:
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id

    def add_schedules(
        self, session: Session, user_id: UUID
    ) -> tuple[list[Schedule], list[Routine]]:

        routine1 = Routine(name="Push Day", user_id=user_id)
        routine2 = Routine(name="Pull Day", user_id=user_id)
        routine3 = Routine(name="Legs Day", user_id=user_id)
        session.add_all([routine1, routine2, routine3])
        session.commit()
        session.refresh(routine1)
        session.refresh(routine2)
        session.refresh(routine3)

        schedule1 = Schedule(
            user_id=user_id,
            routine_id=routine1.id,
            day_of_week=DayOfWeek.monday,
        )
        schedule2 = Schedule(
            user_id=user_id,
            routine_id=routine2.id,
            day_of_week=DayOfWeek.wednesday,
        )
        schedule3 = Schedule(
            user_id=user_id,
            routine_id=routine3.id,
            day_of_week=DayOfWeek.friday,
        )
        session.add_all([schedule1, schedule2, schedule3])
        session.commit()
        session.refresh(schedule1)
        session.refresh(schedule2)
        session.refresh(schedule3)

        return [schedule1, schedule2, schedule3], [routine1, routine2, routine3]

    def test_get_schedule_unauthorized(self, client):
        response = client.get("/v1/schedule/")
        assert response.status_code == 401
        assert response.json() == {"detail": "Not authenticated"}

        response_today = client.get("/v1/schedule/today")
        assert response_today.status_code == 401
        assert response_today.json() == {"detail": "Not authenticated"}

    def test_get_schedule_empty(self, authenticated_client):
        """Verifica che un utente senza schede riceva una lista vuota e 200 OK."""
        response = authenticated_client.get("/v1/schedule/")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_schedule_isolated_between_users(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        """L'Utente B non deve vedere gli schedule programmati dall'Utente A."""
        user_a_id = self.get_user_id(session, "test@example.com")
        self.add_schedules(session, user_a_id)

        # Chiamata effettuata dall'Utente B
        response = authenticated_client2.get("/v1/schedule/")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_schedule_today_with_assigned_routine(
        self, authenticated_client, session: Session
    ):
        """Verifica che /today restituisca la scheda programmata esattamente per il giorno corrente."""
        user_id = self.get_user_id(session, "test@example.com")

        # Calcola il giorno odierno a runtime
        today_name = datetime.now(UTC).strftime("%A").lower()

        routine_today = Routine(name="Today Routine", user_id=user_id)
        session.add(routine_today)
        session.commit()
        session.refresh(routine_today)

        schedule_today = Schedule(
            user_id=user_id,
            routine_id=routine_today.id,
            day_of_week=DayOfWeek(today_name),
        )
        session.add(schedule_today)
        session.commit()

        response = authenticated_client.get("/v1/schedule/today")
        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert data["routine_id"] == str(routine_today.id)
        assert data["routine_name"] == "Today Routine"
        assert data["day_of_week"] == today_name

    def test_get_schedule_today_rest_day(self, authenticated_client, session: Session):
        """Verifica che /today restituisca null (None) se oggi è un giorno di riposo."""
        user_id = self.get_user_id(session, "test@example.com")
        today_name = datetime.now(UTC).strftime("%A").lower()

        # Seleziona un giorno diverso da oggi
        other_day = DayOfWeek.sunday if today_name != "sunday" else DayOfWeek.monday

        routine = Routine(name="Other Day Routine", user_id=user_id)
        session.add(routine)
        session.commit()

        schedule = Schedule(
            user_id=user_id,
            routine_id=routine.id,
            day_of_week=other_day,
        )
        session.add(schedule)
        session.commit()

        response = authenticated_client.get("/v1/schedule/today")
        assert response.status_code == 200
        assert response.json() is None

    def test_get_schedule_cascade_on_routine_deletion(
        self, authenticated_client, session: Session
    ):
        """Se una routine viene eliminata, lo schedule associato deve sparire a cascata."""
        user_id = self.get_user_id(session, "test@example.com")
        schedules, routines = self.add_schedules(session, user_id)
        routine_to_delete = routines[0]

        # Elimina la prima routine tramite endpoint dedicato
        del_res = authenticated_client.delete(f"/v1/routines/{routine_to_delete.id}")
        assert del_res.status_code == 204

        # La lista degli schedule deve ora contenerne solo 2
        response = authenticated_client.get("/v1/schedule/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(s["routine_id"] != str(routine_to_delete.id) for s in data)
