from uuid import uuid4

from sqlmodel import Session, select

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.routine import Routine, RoutineExercise
from app.models.user import User


class TestDeleteRoutine:
    def create_exercise(self, session: Session, name="Bench Press"):
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

    def get_user_id(self, session: Session, email: str):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id if user else None

    def test_delete_routine_success(self, authenticated_client, session: Session):

        exercise = self.create_exercise(session)
        user_id = self.get_user_id(session, "test@example.com")

        routine = Routine(name="Routine To Delete", user_id=user_id)
        session.add(routine)
        session.commit()
        session.refresh(routine)

        routine_exercise = RoutineExercise(
            routine_id=routine.id,
            exercise_id=exercise.id,
            sets=3,
            reps=10,
            rest_time=60,
            order_index=1,
        )
        session.add(routine_exercise)
        session.commit()

        response = authenticated_client.delete(f"/v1/routines/{routine.id}")
        assert response.status_code == 204

        get_res = authenticated_client.get(f"/v1/routines/{routine.id}")
        assert get_res.status_code == 404
        assert session.get(Routine, routine.id) is None

        re_query = session.exec(
            select(RoutineExercise).where(RoutineExercise.routine_id == routine.id)
        ).all()
        assert len(re_query) == 0

        assert session.get(Exercise, exercise.id) is not None

    def test_delete_routine_not_found(self, authenticated_client):
        fake_id = uuid4()
        response = authenticated_client.delete(f"/v1/routines/{fake_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_delete_routine_forbidden(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        # Routine creata dall'utente 1
        user_1_id = self.get_user_id(session, "test@example.com")
        routine = Routine(name="User 1 Routine", user_id=user_1_id)
        session.add(routine)
        session.commit()
        session.refresh(routine)

        response = authenticated_client2.delete(f"/v1/routines/{routine.id}")
        assert response.status_code == 403
        assert (
            "you do not have permission to delete this routine"
            in response.json()["detail"].lower()
        )

        assert session.get(Routine, routine.id) is not None

    def test_delete_routine_unauthenticated(self, client):
        fake_id = uuid4()
        response = client.delete(f"/v1/routines/{fake_id}")
        assert response.status_code == 401
        assert "not authenticated" in response.json()["detail"].lower()

    def test_delete_routine_invalid_uuid(self, authenticated_client):
        response = authenticated_client.delete("/v1/routines/not-a-valid-uuid")
        assert response.status_code == 422
