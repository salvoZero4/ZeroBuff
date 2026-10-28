from datetime import UTC, date, datetime, timedelta

from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.session import Session as WorkoutSession
from app.models.user import User
from sqlmodel import Session, select


class TestGetWorkoutSessions:
    def get_user_id(self, session: Session, email: str = "test@example.com"):
        user = session.exec(select(User).where(User.email == email)).first()
        return user.id

    def create_completed_session(
        self, session: Session, user_id, days_ago: int = 0
    ) -> WorkoutSession:
        session_date = date.today() - timedelta(days=days_ago)
        started_at = datetime.now(UTC) - timedelta(days=days_ago, hours=1)
        ended_at = started_at + timedelta(minutes=60)

        workout = WorkoutSession(
            user_id=user_id,
            routine_id=None,
            date=session_date,
            started_at=started_at,
            ended_at=ended_at,
            status="completed",
        )
        session.add(workout)
        session.commit()
        session.refresh(workout)
        return workout

    def test_get_sessions_empty(self, authenticated_client):
        response = authenticated_client.get("/v1/session/")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_sessions_list_success(self, authenticated_client, session: Session):
        user_id = self.get_user_id(session, "test@example.com")
        self.create_completed_session(session, user_id, days_ago=2)
        self.create_completed_session(session, user_id, days_ago=1)

        response = authenticated_client.get("/v1/session/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert "id" in data[0]
        assert data[0]["status"] == "completed"

    def test_get_sessions_isolated_between_users(
        self, authenticated_client, authenticated_client2, session: Session
    ):
        user_1_id = self.get_user_id(session, "test@example.com")
        self.create_completed_session(session, user_1_id, days_ago=1)

        # L'Utente 2 deve ricevere un array vuoto
        response = authenticated_client2.get("/v1/session/")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_sessions_ordering_most_recent_first(
        self, authenticated_client, session: Session
    ):
        user_id = self.get_user_id(session, "test@example.com")
        s1 = self.create_completed_session(session, user_id, days_ago=5)
        s2 = self.create_completed_session(session, user_id, days_ago=0)
        s3 = self.create_completed_session(session, user_id, days_ago=2)

        response = authenticated_client.get("/v1/session/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Ordine atteso: oggi (s2), 2 giorni fa (s3), 5 giorni fa (s1)
        assert data[0]["id"] == str(s2.id)
        assert data[1]["id"] == str(s3.id)
        assert data[2]["id"] == str(s1.id)

    def test_get_sessions_pagination(self, authenticated_client, session: Session):
        user_id = self.get_user_id(session, "test@example.com")
        for i in range(5):
            self.create_completed_session(session, user_id, days_ago=i)

        # Pagina 1: limit 2, offset 0
        res_page1 = authenticated_client.get("/v1/session/?limit=2&offset=0")
        assert res_page1.status_code == 200
        assert len(res_page1.json()) == 2

        # Pagina 2: limit 2, offset 2
        res_page2 = authenticated_client.get("/v1/session/?limit=2&offset=2")
        assert res_page2.status_code == 200
        assert len(res_page2.json()) == 2

        # Gli ID delle due pagine devono essere distinti
        ids_page1 = {item["id"] for item in res_page1.json()}
        ids_page2 = {item["id"] for item in res_page2.json()}
        assert ids_page1.isdisjoint(ids_page2)

    def test_get_sessions_unauthenticated(self, client):
        response = client.get("/v1/session/")
        assert response.status_code == 401

    def test_get_session_detail_ordered_by_routine_and_set_number(
        self, authenticated_client, session: Session
    ):

        squat = Exercise(
            name="Squat",
            muscle_group=MuscleGroup.quads,
            secondary_muscle_groups=[],
            equipment=Equipment.barbell,
        )
        bench = Exercise(
            name="Bench Press",
            muscle_group=MuscleGroup.chest,
            secondary_muscle_groups=[],
            equipment=Equipment.barbell,
        )
        session.add_all([squat, bench])
        session.commit()

        routine_res = authenticated_client.post(
            "/v1/routines/",
            json={
                "name": "Legs and Chest",
                "exercises": [
                    {
                        "exercise_id": str(squat.id),
                        "sets": 3,
                        "reps": 8,
                        "rest_time": 90,
                        "order_index": 0,
                    },
                    {
                        "exercise_id": str(bench.id),
                        "sets": 3,
                        "reps": 10,
                        "rest_time": 60,
                        "order_index": 1,
                    },
                ],
            },
        )
        assert routine_res.status_code == 201
        routine_id = routine_res.json()["id"]

        session_res = authenticated_client.post(
            "/v1/session/",
            json={
                "routine_id": routine_id,
                "started_at": datetime.now(UTC).isoformat(),
            },
        )
        session_id = session_res.json()["id"]

        authenticated_client.post(
            f"/v1/session/{session_id}/log/{bench.id}",
            json={"set_number": 2, "reps": 10, "weight": 75.0},
        )
        authenticated_client.post(
            f"/v1/session/{session_id}/log/{squat.id}",
            json={"set_number": 2, "reps": 8, "weight": 110.0},
        )
        authenticated_client.post(
            f"/v1/session/{session_id}/log/{bench.id}",
            json={"set_number": 1, "reps": 10, "weight": 70.0},
        )
        authenticated_client.post(
            f"/v1/session/{session_id}/log/{squat.id}",
            json={"set_number": 1, "reps": 8, "weight": 100.0},
        )

        response = authenticated_client.get(f"/v1/session/{session_id}")
        assert response.status_code == 200
        sets = response.json()["sets"]

        assert len(sets) == 4
        # Devono essere: Squat #1, Squat #2, Bench #1, Bench #2
        assert sets[0]["exercise_name"] == "Squat" and sets[0]["set_number"] == 1
        assert sets[1]["exercise_name"] == "Squat" and sets[1]["set_number"] == 2
        assert sets[2]["exercise_name"] == "Bench Press" and sets[2]["set_number"] == 1
        assert sets[3]["exercise_name"] == "Bench Press" and sets[3]["set_number"] == 2
