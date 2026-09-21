from uuid import uuid4

from sqlmodel import Session, select

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.user import User


class TestCreateRoutine:
    def create_exercise(self, session: Session, name, muscle_group, equipment):
        exercise = Exercise(
            name=name,
            muscle_group=muscle_group,
            secondary_muscle_groups=[],
            equipment=equipment,
        )
        session.add(exercise)
        session.commit()
        session.refresh(exercise)
        return exercise

    def create_routine(self, authenticated_client, routine_data):
        return authenticated_client.post("/v1/routines/", json=routine_data)

    def get_user_id(self, session: Session, email):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id if user else None

    def test_create_routine_success(self, authenticated_client, session: Session):
        exercise1 = self.create_exercise(
            session, "Bench Press", MuscleGroup.chest, Equipment.barbell
        )
        exercise2 = self.create_exercise(
            session, "Squat", MuscleGroup.quads, Equipment.barbell
        )

        routine_data = {
            "name": "My Routine",
            "exercises": [
                {
                    "exercise_id": str(exercise1.id),
                    "sets": 3,
                    "reps": 10,
                    "rest_time": 60,
                    "order_index": 1,
                },
                {
                    "exercise_id": str(exercise2.id),
                    "sets": 4,
                    "reps": 8,
                    "rest_time": 90,
                    "order_index": 2,
                },
            ],
        }

        response = self.create_routine(authenticated_client, routine_data)

        assert response.status_code == 201
        response_data = response.json()
        assert response_data["name"] == routine_data["name"]
        assert len(response_data["exercises"]) == len(routine_data["exercises"])
        assert response_data["exercises"][0]["order_index"] == 1
        assert response_data["exercises"][1]["order_index"] == 2

    def test_create_routine_duplicate_name(
        self, authenticated_client, session: Session
    ):
        exercise = self.create_exercise(
            session, "Bench Press", MuscleGroup.chest, Equipment.barbell
        )

        routine_data = {
            "name": "My Routine",
            "exercises": [
                {
                    "exercise_id": str(exercise.id),
                    "sets": 3,
                    "reps": 10,
                    "rest_time": 60,
                    "order_index": 1,
                }
            ],
        }

        # Create the first routine
        response1 = self.create_routine(authenticated_client, routine_data)
        assert response1.status_code == 201

        # Attempt to create a second routine with the same name
        response2 = self.create_routine(authenticated_client, routine_data)
        assert response2.status_code == 409
        assert (
            response2.json()["detail"]
            == f"Routine with name '{routine_data['name']}' already exists."
        )

    def test_create_routine_with_duplicate_exercises(
        self, authenticated_client, session: Session
    ):
        exercise = self.create_exercise(
            session, "Bench Press", MuscleGroup.chest, Equipment.barbell
        )

        routine_data = {
            "name": "My Routine",
            "exercises": [
                {
                    "exercise_id": str(exercise.id),
                    "sets": 3,
                    "reps": 10,
                    "rest_time": 60,
                    "order_index": 1,
                },
                {
                    "exercise_id": str(exercise.id),  # Duplicate exercise
                    "sets": 4,
                    "reps": 8,
                    "rest_time": 90,
                    "order_index": 2,
                },
            ],
        }

        response = self.create_routine(authenticated_client, routine_data)

        assert response.status_code == 409
        assert (
            "duplicate exercise found in the routine."
            in response.json()["detail"].lower()
        )

    def test_create_routine_with_same_name_different_user(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        exercise = self.create_exercise(
            session, "Bench Press", MuscleGroup.chest, Equipment.barbell
        )

        routine_data = {
            "name": "My Routine",
            "exercises": [
                {
                    "exercise_id": str(exercise.id),
                    "sets": 3,
                    "reps": 10,
                    "rest_time": 60,
                    "order_index": 1,
                }
            ],
        }

        # Create the first routine for the first user
        response1 = self.create_routine(authenticated_client, routine_data)
        assert response1.status_code == 201

        # Create the second routine with the same name for a different user
        response2 = self.create_routine(authenticated_client2, routine_data)
        assert response2.status_code == 201

    def test_create_routine_with_no_exercises(self, authenticated_client):
        routine_data = {
            "name": "Empty Routine",
            "exercises": [],
        }

        response = self.create_routine(authenticated_client, routine_data)

        assert response.status_code == 201
        response_data = response.json()
        assert response_data["name"] == routine_data["name"]
        assert len(response_data["exercises"]) == 0

    def test_create_routine_with_invalid_exercise_id(
        self, authenticated_client, session: Session
    ):
        fake_exercise_id = str(
            uuid4()
        )  # Generate a random UUID that doesn't exist in the db
        routine_data = {
            "name": "Invalid Exercise Routine",
            "exercises": [
                {
                    "exercise_id": fake_exercise_id,
                    "sets": 3,
                    "reps": 10,
                    "rest_time": 60,
                    "order_index": 1,
                }
            ],
        }

        response = self.create_routine(authenticated_client, routine_data)
        print(response.json())
        assert response.status_code == 404
        assert "exercises not found" in response.json()["detail"].lower()

    def test_create_routine_unauthenticated(self, client):
        routine_data = {
            "name": "My Routine",
            "exercises": [],
        }

        response = client.post("/v1/routines/", json=routine_data)

        assert response.status_code == 401

    def test_create_routine_with_missing_fields(self, authenticated_client):
        routine_data = {
            # "name" is missing
            "exercises": [],
        }

        response = self.create_routine(authenticated_client, routine_data)

        assert response.status_code == 422
