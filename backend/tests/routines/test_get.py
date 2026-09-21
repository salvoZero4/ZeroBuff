from uuid import uuid4

from sqlmodel import Session, select

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.routine import Routine, RoutineExercise
from app.models.user import User


class TestGetRoutines:
    def add_exercises(self, session: Session):
        exercises = [
            Exercise(
                name="Bench Press",
                muscle_group=MuscleGroup.chest,
                secondary_muscle_groups=[MuscleGroup.triceps, MuscleGroup.front_delts],
                equipment=Equipment.barbell,
            ),
            Exercise(
                name="Squat",
                muscle_group=MuscleGroup.quads,
                secondary_muscle_groups=[MuscleGroup.glutes, MuscleGroup.hamstrings],
                equipment=Equipment.barbell,
            ),
        ]
        session.add_all(exercises)
        session.commit()
        return exercises

    def add_routines(self, session: Session, user_id: str):
        added_exercises = self.add_exercises(session)
        routine1 = Routine(name="Routine 1", user_id=user_id)
        routine2 = Routine(name="Routine 2", user_id=user_id)

        routine1_exercise1 = RoutineExercise(
            routine_id=routine1.id,
            exercise_id=added_exercises[0].id,
            sets=3,
            reps=10,
            rest_time=60,
            order_index=1,
        )
        routine1_exercise2 = RoutineExercise(
            routine_id=routine1.id,
            exercise_id=added_exercises[1].id,
            sets=4,
            reps=8,
            rest_time=90,
            order_index=2,
        )
        routine2_exercise1 = RoutineExercise(
            routine_id=routine2.id,
            exercise_id=added_exercises[0].id,
            sets=5,
            reps=5,
            rest_time=120,
            order_index=1,
        )
        session.add_all(
            [
                routine1,
                routine2,
                routine1_exercise1,
                routine1_exercise2,
                routine2_exercise1,
            ]
        )
        session.commit()
        return [routine1, routine2]

    def get_user_id(self, session: Session, email):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id if user else None

    def test_get_routines_list(self, authenticated_client, session: Session):
        user_id = self.get_user_id(session, "test@example.com")
        self.add_routines(session, user_id)

        response = authenticated_client.get("/v1/routines/")
        assert response.status_code == 200
        routines = response.json()
        print("Routines response:", routines)
        assert len(routines) == 2
        assert routines[0]["exercises_count"] == 2
        assert routines[1]["exercises_count"] == 1
        assert MuscleGroup.chest in routines[0]["muscle_groups"]
        assert MuscleGroup.quads in routines[0]["muscle_groups"]
        assert MuscleGroup.chest in routines[1]["muscle_groups"]

    def test_get_routines_list_unauthenticated(self, client, session: Session):
        response = client.get("/v1/routines/")
        assert response.status_code == 401

    def test_get_routines_list_no_routines(
        self, authenticated_client, session: Session
    ):
        response = authenticated_client.get("/v1/routines/")
        assert response.status_code == 200
        routines = response.json()
        assert len(routines) == 0

    def test_get_exercises_in_routine(self, authenticated_client, session: Session):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)
        routine_id = routines[0].id

        response = authenticated_client.get(f"/v1/routines/{routine_id}/")
        print("Response JSON:", response.json())
        assert response.status_code == 200
        assert response.json()["id"] == str(routine_id)
        assert len(response.json()["exercises"]) == 2
        assert response.json()["exercises"][0]["name"] == "Bench Press"
        assert response.json()["exercises"][0]["muscle_group"] == MuscleGroup.chest
        assert response.json()["exercises"][0]["order_index"] == 1

    def test_get_exercises_in_routine_unauthenticated(self, client, session: Session):

        routine_id = uuid4()  # Generate a random UUID for testing

        response = client.get(f"/v1/routines/{routine_id}")
        assert response.status_code == 401

    def test_get_exercises_in_routine_not_found(
        self, authenticated_client, session: Session
    ):
        routine_id = uuid4()  # Generate a random UUID for testing

        response = authenticated_client.get(f"/v1/routines/{routine_id}")
        assert response.status_code == 404

    def test_get_exercises_in_routine_forbidden(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)

        routine_id = routines[0].id

        response = authenticated_client2.get(f"/v1/routines/{routine_id}")
        assert response.status_code == 403
