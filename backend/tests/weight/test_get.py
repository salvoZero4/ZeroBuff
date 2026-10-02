class TestGetWeight:
    def create_weight(self, authenticated_client, weight, day):
        response = authenticated_client.post(
            "/v1/weight",
            json={"date": day, "weight": weight},
        )
        assert response.status_code == 201
        return response.json()

    def test_get_today_weight_returns_log_for_requested_date(
        self, authenticated_client
    ):
        weight_log = self.create_weight(authenticated_client, 80.5, "2026-09-15")

        response = authenticated_client.get(
            "/v1/weight/today",
            params={"day": "2026-09-15"},
        )

        assert response.status_code == 200
        assert response.json() == weight_log

    def test_get_today_weight_returns_null_when_missing(self, authenticated_client):
        response = authenticated_client.get(
            "/v1/weight/today",
            params={"day": "2026-09-15"},
        )

        assert response.status_code == 200
        assert response.json() is None

    def test_list_weights_returns_logs_sorted_by_date_descending(
        self, authenticated_client
    ):
        self.create_weight(authenticated_client, 81.0, "2026-09-14")
        latest = self.create_weight(authenticated_client, 80.5, "2026-09-15")

        response = authenticated_client.get("/v1/weight")

        assert response.status_code == 200
        data = response.json()
        assert data[0] == latest
        assert [item["date"] for item in data] == [
            "2026-09-15",
            "2026-09-14",
        ]

    def test_list_weights_filters_by_date_range(self, authenticated_client):
        self.create_weight(authenticated_client, 81.0, "2026-09-10")
        included = self.create_weight(authenticated_client, 80.5, "2026-09-15")
        self.create_weight(authenticated_client, 80.0, "2026-09-20")

        response = authenticated_client.get(
            "/v1/weight",
            params={"date_from": "2026-09-12", "date_to": "2026-09-18"},
        )

        assert response.status_code == 200
        assert response.json() == [included]

    def test_list_weights_only_returns_current_user_logs(
        self, authenticated_client, authenticated_client2
    ):
        self.create_weight(authenticated_client, 81.0, "2026-09-15")
        self.create_weight(authenticated_client2, 75.0, "2026-09-15")

        response = authenticated_client.get("/v1/weight")

        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["weight"] == 81.0

    def test_get_weight_unauthenticated(self, client):
        response = client.get("/v1/weight")

        assert response.status_code == 401

    def test_get_today_weight_invalid_date(self, authenticated_client):
        response = authenticated_client.get(
            "/v1/weight/today",
            params={"day": "not-a-date"},
        )

        assert response.status_code == 422
