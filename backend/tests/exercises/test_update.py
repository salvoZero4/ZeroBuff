from uuid import uuid4

from app.models.exercise import Equipment, Exercise, MuscleGroup


class TestUpdateExercise:
    def test_update_exercise(self, authenticated_client):
        # First, create an exercise
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Squat",
                "muscle_group": MuscleGroup.quads,
                "secondary_muscle_groups": [MuscleGroup.glutes],
                "equipment": Equipment.barbell,
            },
        )
        assert create_response.status_code == 201
        exercise_id = create_response.json()["id"]

        # Now, update the exercise
        update_response = authenticated_client.patch(
            f"/v1/exercises/{exercise_id}",
            json={
                "name": "Hack Squat",
                "muscle_group": MuscleGroup.quads,
                "secondary_muscle_groups": [MuscleGroup.glutes, MuscleGroup.hamstrings],
                "equipment": Equipment.barbell,
            },
        )

        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Hack Squat"
        assert (
            update_response.json()["secondary_muscle_groups"][1]
            == MuscleGroup.hamstrings
        )

    def test_update_exercise_not_found(self, authenticated_client):
        non_existent_id = uuid4()
        response = authenticated_client.patch(
            f"/v1/exercises/{non_existent_id}",
            json={
                "name": "Non-existent Exercise",
                "muscle_group": MuscleGroup.chest,
                "secondary_muscle_groups": [MuscleGroup.triceps],
                "equipment": Equipment.dumbbell,
            },
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Exercise not found"

    def test_update_exercise_unauthorized(
        self, authenticated_client, authenticated_client2
    ):
        # First, create an exercise with the authenticated user
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Lunge",
                "muscle_group": MuscleGroup.quads,
                "secondary_muscle_groups": [MuscleGroup.glutes],
                "equipment": Equipment.bodyweight,
            },
        )
        assert create_response.status_code == 201
        exercise_id = create_response.json()["id"]

        # Now, try to update the exercise with a different authenticated user
        response = authenticated_client2.patch(
            f"/v1/exercises/{exercise_id}",
            json={
                "name": "Reverse Lunge",
                "muscle_group": MuscleGroup.quads,
                "secondary_muscle_groups": [MuscleGroup.glutes],
                "equipment": Equipment.bodyweight,
            },
        )
        print(response.json())
        print(authenticated_client2.headers)
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "You are not authorized to update this exercise"
        )

    def test_update_exercise_unauthenticated(self, client):
        exercise_id = uuid4()
        create_response = client.patch(
            f"/v1/exercises/{exercise_id}",
            json={
                "name": "Plank",
                "muscle_group": MuscleGroup.abs,
                "secondary_muscle_groups": [],
                "equipment": Equipment.bodyweight,
            },
        )
        assert create_response.status_code == 401
        assert create_response.json()["detail"] == "Not authenticated"

    def test_update_exercise_with_missing_fields(self, authenticated_client):
        # First, create an exercise
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Bicep Curl",
                "muscle_group": MuscleGroup.biceps,
                "secondary_muscle_groups": [],
                "equipment": Equipment.dumbbell,
            },
        )
        assert create_response.status_code == 201
        exercise_id = create_response.json()["id"]

        # Now, try to update the exercise with missing fields
        update_response = authenticated_client.patch(
            f"/v1/exercises/{exercise_id}",
            json={
                "equipment": Equipment.barbell,
            },
        )

        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Bicep Curl"
        assert update_response.json()["muscle_group"] == MuscleGroup.biceps
        assert update_response.json()["equipment"] == Equipment.barbell

    def test_update_default_exercise(self, authenticated_client, session):
        # First, create an exercise
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

        # Now, try to update the exercise to be a default exercise
        update_response = authenticated_client.patch(
            f"/v1/exercises/{exercise_id}",
            json={
                "name": "Updated Default Exercise",
            },
        )

        assert update_response.status_code == 403
        assert (
            "you are not authorized to update this exercise"
            in update_response.json()["detail"].lower()
        )

    def test_update_exercise_name_sanitization(self, authenticated_client):
        create_response = authenticated_client.post(
            "/v1/exercises/",
            json={
                "name": "Plank",
                "muscle_group": MuscleGroup.abs,
                "equipment": Equipment.bodyweight,
            },
        )
        exercise_id = create_response.json()["id"]

        patch_response = authenticated_client.patch(
            f"/v1/exercises/{exercise_id}",
            json={"name": "   side plank   "},
        )
        assert patch_response.status_code == 200
        assert patch_response.json()["name"] == "Side Plank"
