from uuid import uuid4

from sqlmodel import Session

from app.models.exercise import Equipment, Exercise, MuscleGroup


class TestCreateSchedule:
    def create_exercise(self, session: Session, name: str = "Bench Press"):
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

    def create_routine(
        self, session: Session, authenticated_client, name: str = "Full Body Routine"
    ):
        exercises = self.create_exercise(session)
        response = authenticated_client.post(
            "/v1/routines/",
            json={
                "name": name,
                "exercises": [
                    {
                        "exercise_id": str(exercises[0].id),
                        "sets": 3,
                        "reps": 10,
                        "rest_time": 60,
                        "order_index": 0,
                    },
                    {
                        "exercise_id": str(exercises[1].id),
                        "sets": 3,
                        "reps": 10,
                        "rest_time": 60,
                        "order_index": 1,
                    },
                ],
            },
        )
        print(response.json())
        assert response.status_code == 201
        routine = response.json()["id"]
        return routine

    def test_create_schedule_success(self, authenticated_client, session: Session):
        routine_id = self.create_routine(session, authenticated_client)

        response = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id,
                "day_of_week": "monday",
            },
        )
        print(response.json())
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["routine_id"] == str(routine_id)
        assert data["day_of_week"] == "monday"
        assert data["routine_name"] == "Full Body Routine"

    def test_create_schedule_invalid_routine(self, authenticated_client):
        fake_routine_id = str(uuid4())
        response = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": fake_routine_id,
                "day_of_week": "monday",
            },
        )

        assert response.status_code == 404
        assert response.json() == {"detail": "Routine not found."}

    def test_create_schedule_invalid_day_of_week(
        self, authenticated_client, session: Session
    ):
        routine_id = self.create_routine(session, authenticated_client)

        response = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id,
                "day_of_week": "funday",
            },
        )

        assert response.status_code == 422

    def test_create_schedule_duplicate_day(
        self, authenticated_client, session: Session
    ):
        routine_id = self.create_routine(session, authenticated_client)

        # Create the first schedule
        response1 = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id,
                "day_of_week": "monday",
            },
        )
        assert response1.status_code == 201

        # Attempt to create a second schedule with the same day_of_week
        response2 = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id,
                "day_of_week": "monday",
            },
        )
        assert response2.status_code == 409
        assert response2.json() == {"detail": "A schedule for this day already exists."}

    def test_create_schedule_unauthorized_routine(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        routine_id = self.create_routine(session, authenticated_client)

        response = authenticated_client2.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id,
                "day_of_week": "monday",
            },
        )

        assert response.status_code == 403
        assert response.json() == {
            "detail": "You do not have permission to use this routine."
        }

    def test_create_schedule_unauthorized(self, client, session: Session):
        routine_id = str(uuid4())
        response = client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id,
                "day_of_week": "monday",
            },
        )

        assert response.status_code == 401

    def test_create_multiple_schedules(self, authenticated_client, session: Session):
        routine_id1 = self.create_routine(session, authenticated_client, "Routine 1")
        routine_id2 = self.create_routine(session, authenticated_client, "Routine 2")

        # Create the first schedule
        response1 = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id1,
                "day_of_week": "monday",
            },
        )
        assert response1.status_code == 201

        # Create the second schedule on a different day
        response2 = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id2,
                "day_of_week": "tuesday",
            },
        )
        assert response2.status_code == 201

    def test_create_schedule_diffent_user_routine(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        routine_id1 = self.create_routine(session, authenticated_client, "Routine 1")
        routine_id2 = self.create_routine(session, authenticated_client2, "Routine 2")

        # Create the first schedule for user 1
        response1 = authenticated_client.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id1,
                "day_of_week": "monday",
            },
        )
        assert response1.status_code == 201

        # Create the second schedule for user 2 on the same dat
        response2 = authenticated_client2.post(
            "/v1/schedule/",
            json={
                "routine_id": routine_id2,
                "day_of_week": "monday",
            },
        )
        assert response2.status_code == 201
