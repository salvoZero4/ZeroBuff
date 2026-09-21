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


class TestExerciseSearch:
    def test_search_exercises(self, authenticated_client, session: Session):

        add_fake_exercises(session)

        search_response = authenticated_client.get("/v1/exercises/search?query=Bench")

        assert search_response.status_code == 200
        assert len(search_response.json()["results"]) == 2

    def test_search_exercises_no_results(self, authenticated_client, session: Session):
        add_fake_exercises(session)

        search_response = authenticated_client.get(
            "/v1/exercises/search?query=NonExistentExercise"
        )

        assert search_response.status_code == 200
        assert len(search_response.json()["results"]) == 0

    def test_search_exercises_short_query(self, authenticated_client, session: Session):
        add_fake_exercises(session)

        search_response = authenticated_client.get("/v1/exercises/search?query=be")

        assert search_response.status_code == 422

    def test_search_exercises_unauthenticated(self, client, session: Session):
        add_fake_exercises(session)

        search_response = client.get("/v1/exercises/search?query=Bench")

        assert search_response.status_code == 401


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
