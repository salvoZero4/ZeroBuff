from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

from sqlmodel import Session, select

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.routine import Routine, RoutineExercise
from app.models.session import Session as WorkoutSession
from app.models.session import Set_log
from app.models.user import User


class TestRoutineStats:
    def get_user_id(self, session: Session, email):
        return session.exec(select(User).where(User.email == email)).first().id

    def create_exercise(self, session: Session, name="Bench Press"):
        exercise = Exercise(
            name=name, muscle_group=MuscleGroup.chest, equipment=Equipment.barbell
        )
        session.add(exercise)
        session.commit()
        session.refresh(exercise)
        return exercise

    def create_routine_with_exercise(self, session: Session, user_id, exercise_id):
        routine = Routine(name="Push Day", user_id=user_id)
        session.add(routine)
        session.commit()
        session.refresh(routine)

        routine_exercise = RoutineExercise(
            routine_id=routine.id,
            exercise_id=exercise_id,
            sets=3,
            reps=10,
            rest_time=60,
            order_index=0,
        )
        session.add(routine_exercise)
        session.commit()
        return routine

    def log_top_set(
        self, session: Session, user_id, exercise_id, session_date, top_weight
    ):
        workout = WorkoutSession(user_id=user_id, date=session_date, status="completed")
        session.add(workout)
        session.commit()
        session.refresh(workout)

        # una serie di riscaldamento più leggera + il top set, per verificare che
        # venga preso davvero il MASSIMO e non una media o l'ultima serie inserita
        session.add_all(
            [
                Set_log(
                    session_id=workout.id,
                    exercise_id=exercise_id,
                    set_number=1,
                    reps=10,
                    weight=top_weight - 10,
                    rir=3,
                ),
                Set_log(
                    session_id=workout.id,
                    exercise_id=exercise_id,
                    set_number=2,
                    reps=8,
                    weight=top_weight,
                    rir=1,
                ),
            ]
        )
        session.commit()
        return workout

    def test_stats_improvement_uses_latest_and_previous_not_first(
        self, authenticated_client, session: Session
    ):
        exercise = self.create_exercise(session)
        user_id = self.get_user_id(session, "test@example.com")
        routine = self.create_routine_with_exercise(session, user_id, exercise.id)

        today = date.today()
        # 3 sessioni: se il codice avesse un bug e confrontasse prima/ultima invece di
        # ultima/penultima, otterremmo un risultato diverso da quello atteso qui
        self.log_top_set(
            session, user_id, exercise.id, today - timedelta(days=14), top_weight=60.0
        )
        self.log_top_set(
            session, user_id, exercise.id, today - timedelta(days=7), top_weight=70.0
        )
        self.log_top_set(session, user_id, exercise.id, today, top_weight=77.0)

        routine_id = str(routine.id)
        response = authenticated_client.get(f"/v1/routines/{routine_id}/stats")

        assert response.status_code == 200
        stats = response.json()["exercises_stats"][0]
        assert stats["latest_weight"] == 77.0
        assert stats["previous_weight"] == 70.0
        assert stats["percentage_improvement"] == 10.0  # (77-70)/70 * 100

    def test_stats_single_session_no_comparison(
        self, authenticated_client, session: Session
    ):
        exercise = self.create_exercise(session)
        user_id = self.get_user_id(session, "test@example.com")
        routine = self.create_routine_with_exercise(session, user_id, exercise.id)

        self.log_top_set(session, user_id, exercise.id, date.today(), top_weight=60.0)

        response = authenticated_client.get(f"/v1/routines/{str(routine.id)}/stats")

        stats = response.json()["exercises_stats"][0]
        assert stats["latest_weight"] == 60.0
        assert stats["previous_weight"] is None
        assert stats["percentage_improvement"] is None

    def test_stats_no_sessions_logged(self, authenticated_client, session: Session):
        exercise = self.create_exercise(session)
        user_id = self.get_user_id(session, "test@example.com")
        routine = self.create_routine_with_exercise(session, user_id, exercise.id)

        response = authenticated_client.get(f"/v1/routines/{str(routine.id)}/stats")

        stats = response.json()["exercises_stats"][0]
        assert stats["latest_weight"] is None
        assert stats["percentage_improvement"] is None

    def test_stats_empty_routine(self, authenticated_client, session: Session):
        user_id = self.get_user_id(session, "test@example.com")
        routine = Routine(name="Empty Routine", user_id=user_id)
        session.add(routine)
        session.commit()

        response = authenticated_client.get(f"/v1/routines/{str(routine.id)}/stats")

        assert response.status_code == 200
        assert response.json()["exercises_stats"] == []

    def test_stats_isolated_between_users(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        exercise = self.create_exercise(session)
        user_a_id = self.get_user_id(session, "test@example.com")
        routine = self.create_routine_with_exercise(session, user_a_id, exercise.id)

        self.log_top_set(
            session, user_a_id, exercise.id, date.today(), top_weight=100.0
        )

        response = authenticated_client2.get(f"/v1/routines/{routine.id}/stats")
        assert response.status_code == 403  # routine di A, B non ci accede affatto

    def test_stats_not_found(self, authenticated_client):
        response = authenticated_client.get(f"/v1/routines/{uuid4()}/stats")
        assert response.status_code == 404

    def test_stats_unauthenticated(self, client, session: Session):
        fake_routine_id = str(uuid4())
        response = client.get(f"/v1/routines/{fake_routine_id}/stats")
        assert response.status_code == 401
