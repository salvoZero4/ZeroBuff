from sqlmodel import Session

from app.models.exercise import Equipment, Exercise, MuscleGroup


def add_fake_exercises(session):
    exercises = [
        Exercise(
            name="Bench Press",
            muscle_group=MuscleGroup.chest,
            secondary_muscle_groups=[MuscleGroup.triceps, MuscleGroup.front_delts],
            equipment=Equipment.barbell,
        ),
        Exercise(
            name="Incline Bench Press",
            muscle_group=MuscleGroup.chest,
            secondary_muscle_groups=[MuscleGroup.triceps, MuscleGroup.front_delts],
            equipment=Equipment.barbell,
        ),
        Exercise(
            name="Dumbbell Fly",
            muscle_group=MuscleGroup.chest,
            secondary_muscle_groups=[MuscleGroup.front_delts],
            equipment=Equipment.dumbbell,
        ),
        Exercise(
            name="Squat",
            muscle_group=MuscleGroup.quads,
            secondary_muscle_groups=[MuscleGroup.glutes, MuscleGroup.lower_back],
            equipment=Equipment.barbell,
        ),
        Exercise(
            name="Deadlift",
            muscle_group=MuscleGroup.lower_back,
            secondary_muscle_groups=[MuscleGroup.hamstrings, MuscleGroup.glutes],
            equipment=Equipment.barbell,
        ),
        Exercise(
            name="Pull-Up",
            muscle_group=MuscleGroup.lats,
            secondary_muscle_groups=[MuscleGroup.biceps, MuscleGroup.traps],
            equipment=Equipment.bodyweight,
        ),
    ]
    session.add_all(exercises)
    session.commit()


class TestExerciseList:
    def test_get_exercises(self, authenticated_client, session: Session):
        add_fake_exercises(session)

        response = authenticated_client.get("/v1/exercises/")

        assert response.status_code == 200
        assert len(response.json()["exercises"]) == 6

    def test_get_exercises_with_name_filter(
        self, authenticated_client, session: Session
    ):
        add_fake_exercises(session)

        response = authenticated_client.get("/v1/exercises/?name=bench")

        assert response.status_code == 200
        assert len(response.json()["exercises"]) == 2

    def test_get_exercises_with_muscle_group_filter(
        self, authenticated_client, session: Session
    ):
        add_fake_exercises(session)

        response = authenticated_client.get("/v1/exercises/?muscle_group=chest")

        assert response.status_code == 200
        assert len(response.json()["exercises"]) == 3

    def test_list_matches_typo_with_filters_and_pagination(
        self, authenticated_client, session: Session
    ):
        add_fake_exercises(session)
        session.add(
            Exercise(
                name="Benhc Press",
                muscle_group=MuscleGroup.chest,
                equipment=Equipment.dumbbell,
            )
        )
        session.commit()

        params = {"name": "benhc", "equipment": "barbell", "limit": 1}
        first = authenticated_client.get("/v1/exercises/", params=params)
        second = authenticated_client.get("/v1/exercises/", params={**params, "offset": 1})
        assert first.status_code == second.status_code == 200
        assert [row["name"] for row in first.json()["exercises"]] == ["Bench Press"]
        assert [row["name"] for row in second.json()["exercises"]] == ["Incline Bench Press"]

        unfiltered = authenticated_client.get("/v1/exercises/", params={"name": "benhc"})
        assert unfiltered.status_code == 200
        assert unfiltered.json()["exercises"][0]["name"] == "Benhc Press"

    def test_get_exercises_unauthenticated(self, client, session: Session):
        add_fake_exercises(session)

        response = client.get("/v1/exercises/")

        assert response.status_code == 401

    def test_get_exercises_with_pagination(
        self, authenticated_client, session: Session
    ):
        add_fake_exercises(session)

        response = authenticated_client.get("/v1/exercises/?limit=2&offset=1")

        assert response.status_code == 200
        assert len(response.json()["exercises"]) == 2
