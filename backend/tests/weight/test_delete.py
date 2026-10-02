from uuid import uuid4

from app.models.weight_log import WeightLog


class TestDeleteWeight:
    def create_weight(self, authenticated_client):
        response = authenticated_client.post(
            "/v1/weight",
            json={"date": "2026-09-15", "weight": 80.5},
        )
        assert response.status_code == 201
        return response.json()

    def test_delete_weight_success(self, authenticated_client, session):
        weight_log = self.create_weight(authenticated_client)

        response = authenticated_client.delete(f"/v1/weight/{weight_log['id']}")

        assert response.status_code == 204
        assert response.content == b""
        assert session.get(WeightLog, weight_log["id"]) is None

    def test_delete_weight_not_found(self, authenticated_client):
        response = authenticated_client.delete(f"/v1/weight/{uuid4()}")

        assert response.status_code == 404
        assert response.json() == {"detail": "Weight log not found"}

    def test_delete_weight_forbidden_for_another_user(
        self, authenticated_client, authenticated_client2, session
    ):
        weight_log = self.create_weight(authenticated_client)

        response = authenticated_client2.delete(f"/v1/weight/{weight_log['id']}")

        assert response.status_code == 403
        assert response.json() == {"detail": "Not allowed"}
        assert session.get(WeightLog, weight_log["id"]) is not None

    def test_delete_weight_unauthenticated(self, client):
        response = client.delete(f"/v1/weight/{uuid4()}")

        assert response.status_code == 401

    def test_delete_weight_invalid_uuid(self, authenticated_client):
        response = authenticated_client.delete("/v1/weight/not-a-valid-uuid")

        assert response.status_code == 422
