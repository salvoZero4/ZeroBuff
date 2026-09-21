from datetime import date, timedelta
from uuid import uuid4

from sqlmodel import select

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.session import Session as WorkoutSession
from app.models.session import Set_log
from app.models.user import User


class TestExerciseStats:
    def create_exercise(self, session, name="Bench Press"):
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

    def log_session(self, session, user_id, exercise_id, session_date, sets_data):
        """sets_data: lista di tuple (reps, weight, rir)"""
        workout = WorkoutSession(
            user_id=user_id,
            date=session_date,
            status="completed",
        )
        session.add(workout)
        session.commit()
        session.refresh(workout)

        for i, (reps, weight, rir) in enumerate(sets_data, start=1):
            log = Set_log(
                session_id=workout.id,
                exercise_id=exercise_id,
                set_number=i,
                reps=reps,
                weight=weight,
                rir=rir,
            )
            session.add(log)
        session.commit()
        return workout

    def get_user_id(self, session, email):
        return session.exec(select(User).where(User.email == email)).one().id

    def test_stats_isolated_between_users(
        self, authenticated_client, authenticated_client2, session
    ):
        exercise = self.create_exercise(session)
        user_a_id = self.get_user_id(session, "test@example.com")

        # Utente A logga una sessione
        self.log_session(
            session,
            user_a_id,
            exercise.id,
            date.today(),
            sets_data=[(10, 60.0, 2)],
        )

        # Utente B chiama le stats sullo STESSO exercise_id
        response = authenticated_client2.get(f"/v1/exercises/{exercise.id}/stats")

        assert response.status_code == 200
        assert response.json()["sessions"] == []  # B non deve vedere nulla di A

    def test_stats_pagination_returns_full_session(self, authenticated_client, session):
        exercise = self.create_exercise(session)
        user_id = self.get_user_id(session, "test@example.com")

        today = date.today()
        # 3 sessioni, ciascuna con un numero diverso di serie
        self.log_session(
            session,
            user_id,
            exercise.id,
            today - timedelta(days=2),
            sets_data=[(10, 60.0, 2), (8, 65.0, 1), (6, 70.0, 0)],
        )
        self.log_session(
            session,
            user_id,
            exercise.id,
            today - timedelta(days=1),
            sets_data=[(10, 60.0, 2)],
        )
        self.log_session(
            session,
            user_id,
            exercise.id,
            today,
            sets_data=[(10, 60.0, 2), (8, 65.0, 1)],
        )

        response = authenticated_client.get(
            f"/v1/exercises/{exercise.id}/stats?limit=1&offset=0"
        )

        assert response.status_code == 200
        data = response.json()["sessions"]
        assert len(data) == 1
        assert data[0]["date"] == today.isoformat()
        assert len(data[0]["sets"]) == 2

    def test_stats_no_logs(self, authenticated_client, session):
        exercise = self.create_exercise(session)

        response = authenticated_client.get(f"/v1/exercises/{exercise.id}/stats")

        assert response.status_code == 200
        assert response.json()["sessions"] == []

    def test_stats_exercise_not_found(self, authenticated_client):
        response = authenticated_client.get(f"/v1/exercises/{uuid4()}/stats")

        assert response.status_code == 404
        assert response.json()["detail"] == "Exercise not found"

    def test_stats_ordering_most_recent_first(self, authenticated_client, session):
        exercise = self.create_exercise(session)
        user_id = self.get_user_id(session, "test@example.com")

        today = date.today()
        self.log_session(
            session,
            user_id,
            exercise.id,
            today - timedelta(days=5),
            sets_data=[(10, 50.0, 2)],
        )
        self.log_session(
            session, user_id, exercise.id, today, sets_data=[(10, 60.0, 2)]
        )
        self.log_session(
            session,
            user_id,
            exercise.id,
            today - timedelta(days=2),
            sets_data=[(10, 55.0, 2)],
        )

        response = authenticated_client.get(f"/v1/exercises/{exercise.id}/stats")
        dates = [s["date"] for s in response.json()["sessions"]]

        assert dates == sorted(dates, reverse=True)

    def test_stats_unauthenticated(self, client, session):
        exercise = self.create_exercise(session)
        response = client.get(f"/v1/exercises/{exercise.id}/stats")
        assert response.status_code == 401
