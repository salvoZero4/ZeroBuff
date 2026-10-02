from datetime import date


class TestCreateWeight:
    def test_create_weight_success(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/weight",
            json={"date": "2026-09-15", "weight": 80.5},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] is not None
        assert data["date"] == "2026-09-15"
        assert data["weight"] == 80.5

    def test_create_weight_without_date_uses_today(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/weight",
            json={"weight": 80.5},
        )

        assert response.status_code == 201
        assert response.json()["date"] == date.today().isoformat()

    def test_create_weight_duplicate_date(self, authenticated_client):
        payload = {"date": "2026-09-15", "weight": 80.5}

        first_response = authenticated_client.post("/v1/weight", json=payload)
        second_response = authenticated_client.post(
            "/v1/weight",
            json={"date": payload["date"], "weight": 79.8},
        )

        assert first_response.status_code == 201
        assert second_response.status_code == 409
        assert second_response.json() == {
            "detail": "Weight already logged for this date"
        }

    def test_create_weight_invalid_weight(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/weight",
            json={"date": "2026-09-15", "weight": 0},
        )

        assert response.status_code == 422

    def test_create_weight_date_too_far_in_future(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/weight",
            json={"date": "2999-01-01", "weight": 80.5},
        )

        assert response.status_code == 422

    def test_create_weight_unauthenticated(self, client):
        response = client.post(
            "/v1/weight",
            json={"date": "2026-09-15", "weight": 80.5},
        )

        assert response.status_code == 401
