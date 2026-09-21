from uuid import uuid4

from app.models.exercise import Equipment, MuscleGroup


class TestGetExerciseById:
    def test_get_exercise_by_id(self, authenticated_client):
        # First, create an exercise
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Deadlift",
                "muscle_group": MuscleGroup.hamstrings,
                "secondary_muscle_groups": [MuscleGroup.lower_back],
                "equipment": Equipment.barbell,
            },
        )
        assert create_response.status_code == 201
        exercise_id = create_response.json()["id"]

        # Now, retrieve the exercise by ID
        get_response = authenticated_client.get(f"/v1/exercises/{exercise_id}")
        assert get_response.status_code == 200
        assert get_response.json()["id"] == exercise_id

    def test_get_exercise_by_id_not_found(self, authenticated_client):
        non_existent_id = uuid4()
        response = authenticated_client.get(f"/v1/exercises/{non_existent_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "Exercise not found"

    def test_get_exercise_by_another_user(
        self, authenticated_client, authenticated_client2
    ):
        # Create an exercise with the first user
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Bench Press",
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [MuscleGroup.triceps],
                "equipment": Equipment.barbell,
            },
        )
        assert create_response.status_code == 201
        exercise_id = create_response.json()["id"]

        get_response = authenticated_client2.get(f"/v1/exercises/{exercise_id}")
        assert get_response.status_code == 200
        assert get_response.json()["id"] == exercise_id
        assert get_response.json()["name"] == "Bench Press"
