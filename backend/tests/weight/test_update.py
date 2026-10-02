from uuid import uuid4


class TestUpdateWeight:
    def create_weight(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/weight",
            json={"date": "2026-09-15", "weight": 80.5},
        )
        assert response.status_code == 201
        return response.json()

    def test_update_weight_success(self, authenticated_client):
        weight_log = self.create_weight(authenticated_client)

        response = authenticated_client.patch(
            f"/v1/weight/{weight_log['id']}",
            json={"weight": 79.8},
        )

        assert response.status_code == 200
        assert response.json()["id"] == weight_log["id"]
        assert response.json()["date"] == "2026-09-15"
        assert response.json()["weight"] == 79.8

    def test_update_weight_not_found(self, authenticated_client):
        response = authenticated_client.patch(
            f"/v1/weight/{uuid4()}",
            json={"weight": 79.8},
        )

        assert response.status_code == 404
        assert response.json() == {"detail": "Weight log not found"}

    def test_update_weight_forbidden_for_another_user(
        self, authenticated_client, authenticated_client2
    ):
        weight_log = self.create_weight(authenticated_client)

        response = authenticated_client2.patch(
            f"/v1/weight/{weight_log['id']}",
            json={"weight": 79.8},
        )

        assert response.status_code == 403
        assert response.json() == {"detail": "Not allowed"}

    def test_update_weight_invalid_value(self, authenticated_client):
        weight_log = self.create_weight(authenticated_client)

        response = authenticated_client.patch(
            f"/v1/weight/{weight_log['id']}",
            json={"weight": 0},
        )

        assert response.status_code == 422

    def test_update_weight_unauthenticated(self, client):
        response = client.patch(
            f"/v1/weight/{uuid4()}",
            json={"weight": 79.8},
        )

        assert response.status_code == 401
