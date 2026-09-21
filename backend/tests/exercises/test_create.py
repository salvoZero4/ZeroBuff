from app.models.exercise import Equipment, MuscleGroup


class TestCreateExercise:
    def test_create_exercise(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Push Up",
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [
                    MuscleGroup.triceps,
                    MuscleGroup.front_delts,
                ],
                "equipment": Equipment.bodyweight,
            },
        )
        print(response.json())

        assert response.status_code == 201
        assert response.json()["id"] is not None

    def test_create_exercise_with_similar_name(self, authenticated_client):
        # First, create an exercise with a specific name
        response1 = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Bench Press",
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [MuscleGroup.triceps],
                "equipment": Equipment.barbell,
            },
        )
        assert response1.status_code == 201

        # Now, try to create another exercise with a similar name
        response2 = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "bench_press",  # Similar name (case-insensitive)
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [MuscleGroup.triceps],
                "equipment": Equipment.dumbbell,
            },
        )

        assert response2.status_code == 409
        assert (
            "An exercise with a similar name already exists"
            in response2.json()["detail"]
        )

    def test_create_exercise_unauthenticated(self, client):
        response = client.post(
            "/v1/exercises/",
            json={
                "name": "Pull Up",
                "muscle_group": MuscleGroup.lats,
                "secondary_muscle_groups": [MuscleGroup.biceps],
                "equipment": Equipment.bodyweight,
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"

    def test_create_exercise_with_wrong_muscle_group(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Invalid Muscle Group Exercise",
                "muscle_group": "back",  # Invalid muscle group
                "secondary_muscle_groups": [],
                "equipment": Equipment.bodyweight,
            },
        )
        assert response.status_code == 422  # Unprocessable Entity

    def test_create_exercise_with_wrong_equipment(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Invalid Equipment Exercise",
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [],
                "equipment": "invalid_equipment",  # Invalid equipment
            },
        )
        assert response.status_code == 422  # Unprocessable Entity

    def test_create_exercise_with_empty_name(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "",  # Empty name
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [],
                "equipment": Equipment.bodyweight,
            },
        )
        assert response.status_code == 422  # Unprocessable Entity
