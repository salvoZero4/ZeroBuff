from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import select

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.session import Session as WorkoutSession
from app.models.session import Set_log
from app.models.user import User


class TestDeleteExercise:
    def test_delete_exercise_success(self, authenticated_client):
        # First, create an exercise
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Tricep Dip",
                "muscle_group": MuscleGroup.triceps,
                "secondary_muscle_groups": [],
                "equipment": Equipment.bodyweight,
            },
        )
        assert create_response.status_code == 201
        exercise_id = create_response.json()["id"]

        # Now, delete the exercise
        delete_response = authenticated_client.delete(f"/v1/exercises/{exercise_id}")
        assert delete_response.status_code == 204

        # Verify that the exercise is deleted
        get_response = authenticated_client.get(f"/v1/exercises/{exercise_id}")
        assert get_response.status_code == 404

    def test_delete_exercise_not_found(self, authenticated_client):
        non_existent_id = uuid4()
        response = authenticated_client.delete(f"/v1/exercises/{non_existent_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "Exercise not found"

    def test_delete_exercise_unauthorized(
        self, authenticated_client, authenticated_client2
    ):
        # First, create an exercise with the authenticated user
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Leg Press",
                "muscle_group": MuscleGroup.quads,
                "secondary_muscle_groups": [MuscleGroup.glutes],
                "equipment": Equipment.machine,
            },
        )
        assert create_response.status_code == 201
        exercise_id = create_response.json()["id"]

        # Now, try to delete the exercise with a different authenticated user
        response = authenticated_client2.delete(f"/v1/exercises/{exercise_id}")
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "You are not authorized to delete this exercise"
        )

    def test_delete_exercise_unauthenticated(self, client):
        exercise_id = uuid4()
        response = client.delete(f"/v1/exercises/{exercise_id}")
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"

    def test_delete_default_exercise(self, authenticated_client, session):
        # First, create a default exercise
        default_exercise = Exercise(
            name="Default Exercise",
            muscle_group=MuscleGroup.chest,
            secondary_muscle_groups=[MuscleGroup.triceps],
            equipment=Equipment.barbell,
            created_by_user=None,
        )
        # Add the default exercise to db
        session.add(default_exercise)
        session.commit()
        session.refresh(default_exercise)

        exercise_id = default_exercise.id

        # Now, try to delete the exercise to be a default exercise
        delete_response = authenticated_client.delete(f"/v1/exercises/{exercise_id}")
        assert delete_response.status_code == 403
        assert (
            "cannot delete a default exercise"
            in delete_response.json()["detail"].lower()
        )

    def test_delete_exercise_referenced_by_logged_workout(
        self, authenticated_client, session
    ):
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Logged Workout Exercise",
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [],
                "equipment": Equipment.barbell,
            },
        )
        assert create_response.status_code == 201
        exercise_id = UUID(create_response.json()["id"])

        user = session.exec(select(User).where(User.email == "test@example.com")).one()
        workout_session = WorkoutSession(
            user_id=user.id,
            date=datetime.now(UTC).date(),
            status="completed",
        )
        session.add(workout_session)
        session.flush()
        workout_log = Set_log(
            session_id=workout_session.id,
            exercise_id=exercise_id,
            set_number=1,
            reps=10,
            weight=50,
            rir=2,
        )
        session.add(workout_log)
        session.commit()

        delete_response = authenticated_client.delete(f"/v1/exercises/{exercise_id}")

        assert delete_response.status_code == 409
        assert (
            delete_response.json()["detail"]
            == "Cannot delete exercise because it is referenced in logged workouts or routines"
        )
        assert session.get(Exercise, exercise_id) is not None
        persisted_log = session.get(Set_log, workout_log.id)
        assert persisted_log is not None
        assert persisted_log.session_id == workout_session.id
        assert persisted_log.exercise_id == exercise_id

    def test_delete_exercise_referenced_by_routine(self, authenticated_client, session):
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Routine Exercise",
                "muscle_group": MuscleGroup.adductors,
                "secondary_muscle_groups": [],
                "equipment": Equipment.dumbbell,
            },
        )
        assert create_response.status_code == 201
        exercise_id = UUID(create_response.json()["id"])

        create_routine_response = authenticated_client.post(
            "/v1/routines/",
            json={
                "name": "Test Routine",
                "exercises": [
                    {
                        "exercise_id": str(exercise_id),
                        "sets": 3,
                        "reps": 12,
                        "rest_time": 60,
                        "order_index": 1,
                    }
                ],
            },
        )
        assert create_routine_response.status_code == 201

        delete_response = authenticated_client.delete(f"/v1/exercises/{exercise_id}")

        assert delete_response.status_code == 409
        assert (
            delete_response.json()["detail"]
            == "Cannot delete exercise because it is referenced in logged workouts or routines"
        )
