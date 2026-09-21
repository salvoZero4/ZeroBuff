from uuid import uuid4

from sqlmodel import Session, select

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.routine import Routine, RoutineExercise
from app.models.user import User


class TestUpdateRoutine:
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
        return [routine1, routine2, added_exercises]

    def get_user_id(self, session: Session, email):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id if user else None

    def test_update_routine_success_only_name(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)

        routine_id = routines[0].id

        update_data = {
            "name": "Updated Routine Name",
            "exercises": None,  # No exercises provided, should keep existing exercises
        }

        response = authenticated_client.patch(
            f"/v1/routines/{routine_id}", json=update_data
        )
        assert response.status_code == 200
        updated_routine = response.json()
        assert updated_routine["name"] == update_data["name"]
        assert len(updated_routine["exercises"]) == 2

    def test_update_routine_success_with_exercises(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)

        routine_id = routines[0].id
        added_exercises = routines[2]
        new_exercise = Exercise(
            name="Deadlift",
            muscle_group=MuscleGroup.hamstrings,
            secondary_muscle_groups=[MuscleGroup.lower_back, MuscleGroup.glutes],
            equipment=Equipment.barbell,
        )
        session.add(new_exercise)
        session.commit()

        update_data = {
            "name": "Updated Routine With Exercises",
            "exercises": [
                {
                    "exercise_id": str(added_exercises[0].id),
                    "sets": 5,
                    "reps": 5,
                    "rest_time": 120,
                    "order_index": 1,
                },
                {
                    "exercise_id": str(new_exercise.id),
                    "sets": 5,
                    "reps": 5,
                    "rest_time": 120,
                    "order_index": 2,
                },
                {
                    "exercise_id": str(added_exercises[1].id),
                    "sets": 4,
                    "reps": 8,
                    "rest_time": 90,
                    "order_index": 3,
                },
            ],
        }

        response = authenticated_client.patch(
            f"/v1/routines/{routine_id}", json=update_data
        )
        assert response.status_code == 200
        updated_routine = response.json()
        assert updated_routine["name"] == update_data["name"]
        assert len(updated_routine["exercises"]) == 3
        assert updated_routine["exercises"][0]["order_index"] == 1
        assert updated_routine["exercises"][1]["order_index"] == 2
        assert updated_routine["exercises"][2]["order_index"] == 3

    def test_update_routine_unauthenticated(self, client, session: Session):

        response = client.patch(
            "/v1/routines/any-routine-id", json={"name": "New Name"}
        )
        assert response.status_code == 401

    def test_update_routine_not_found(self, authenticated_client, session: Session):
        fake_routine_id = str(uuid4())  # Generate a random UUID for testing
        response = authenticated_client.patch(
            f"/v1/routines/{fake_routine_id}", json={"name": "New Name"}
        )
        assert response.status_code == 404

    def test_update_routine_forbidden(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)
        routine_id = routines[0].id

        update_data = {"name": "Attempted Update By Another User"}

        response = authenticated_client2.patch(
            f"/v1/routines/{routine_id}", json=update_data
        )
        assert response.status_code == 403

    def test_update_routine_with_already_existing_name(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)
        routine_id = routines[0].id
        routine_new_name = routines[1].name  # Name of the second routine

        update_data = {"name": routine_new_name}

        response = authenticated_client.patch(
            f"/v1/routines/{routine_id}", json=update_data
        )
        assert response.status_code == 409

    def test_update_routine_same_name_allowed(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)
        routine = routines[0]

        response = authenticated_client.patch(
            f"/v1/routines/{routine.id}", json={"name": routine.name}
        )
        assert response.status_code == 200
        assert response.json()["name"] == routine.name

    def test_update_routine_only_exercises(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)
        routine = routines[0]
        original_name = routine.name
        added_exercises = routines[2]

        update_data = {
            "exercises": [
                {
                    "exercise_id": str(added_exercises[1].id),
                    "sets": 3,
                    "reps": 12,
                    "rest_time": 60,
                    "order_index": 1,
                }
            ]
        }
        response = authenticated_client.patch(
            f"/v1/routines/{routine.id}", json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == original_name
        assert len(data["exercises"]) == 1
        assert data["exercises"][0]["exercise_id"] == str(added_exercises[1].id)

    def test_update_routine_clear_all_exercises(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)
        routine_id = routines[0].id

        response = authenticated_client.patch(
            f"/v1/routines/{routine_id}", json={"exercises": []}
        )
        assert response.status_code == 200
        assert response.json()["exercises"] == []

    def test_update_routine_name_conflict_scoped_to_user(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        user_1_id = self.get_user_id(session, "test@example.com")
        user_2_id = self.get_user_id(session, "test2@example.com")

        # Routine per l'utente 1 e per l'utente 2
        r1 = Routine(name="User 1 Routine", user_id=user_1_id)
        r2 = Routine(name="Target Name", user_id=user_2_id)
        session.add_all([r1, r2])
        session.commit()

        # Utente 1 rinomina con lo stesso nome già posseduto da Utente 2 -> deve andare a buon fine
        response = authenticated_client.patch(
            f"/v1/routines/{r1.id}", json={"name": "Target Name"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Target Name"

    def test_update_routine_name_sanitization(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        routines = self.add_routines(session, user_id)
        routine_id = routines[0].id

        response = authenticated_client.patch(
            f"/v1/routines/{routine_id}",
            json={"name": "   upper body blast   "},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Upper Body Blast"

    def test_update_routine_invalid_uuid_path(self, authenticated_client):
        response = authenticated_client.patch(
            "/v1/routines/not-a-valid-uuid", json={"name": "Any Name"}
        )
        assert response.status_code == 422
