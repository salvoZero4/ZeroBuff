class TestGetUser:
    def test_get_user_unauthenticated(self, client):
        response = client.get("/v1/users/me")
        assert response.status_code == 401
        assert "not authenticated" in response.json()["detail"].lower()

    def test_get_user_authenticated(self, authenticated_client):
        response = authenticated_client.get("/v1/users/me")
        assert response.status_code == 200
        assert "id" in response.json()
        assert "username" in response.json()
        assert "email" in response.json()
        assert "sex" in response.json()
        assert response.json()["id"] is not None
        assert "date_of_birth" in response.json()
        assert "height_cm" in response.json()


class TestUpdateUser:
    def test_update_user_info(self, authenticated_client):
        new_info = {
            "username": "new_username",
            "sex": "female",
            "date_of_birth": "1990-01-01",
            "height_cm": 170,
        }
        response = authenticated_client.patch("/v1/users/me", json=new_info)
        assert response.status_code == 200
        assert response.json()["username"] == new_info["username"]
        assert response.json()["sex"] == new_info["sex"]
        assert response.json()["date_of_birth"] == new_info["date_of_birth"]
        assert response.json()["height_cm"] == new_info["height_cm"]

    def test_update_user_no_changes(self, authenticated_client):
        response = authenticated_client.patch("/v1/users/me", json={})
        assert response.status_code == 200
        assert "id" in response.json()
        assert "username" in response.json()
        assert "email" in response.json()
        assert "sex" in response.json()
        assert "date_of_birth" in response.json()
        assert "height_cm" in response.json()

    def test_update_user_unauthenticated(self, client):
        new_info = {
            "username": "new_username",
            "sex": "female",
            "date_of_birth": "1990-01-01",
        }
        response = client.patch("/v1/users/me", json=new_info)
        assert response.status_code == 401
        assert "not authenticated" in response.json()["detail"].lower()

    def test_update_user_invalid_date_of_birth(self, authenticated_client):
        new_info = {
            "date_of_birth": "2024-02-25"  # Invalid date
        }
        response = authenticated_client.patch("/v1/users/me", json=new_info)
        print(response.json())
        assert response.status_code == 422
        assert (
            "date of birth is not valid" in response.json()["detail"][0]["msg"].lower()
        )

    def test_update_user_invalid_username_length(self, authenticated_client):
        # Meno di 3 caratteri
        response = authenticated_client.patch(
            "/v1/users/me",
            json={"username": "ab"},
        )
        assert response.status_code == 422

    def test_update_user_invalid_email_format(self, authenticated_client):
        response = authenticated_client.patch(
            "/v1/users/me",
            json={"email": "not-an-email"},
        )
        assert response.status_code == 422

    def test_update_user_email_success(self, authenticated_client):
        # Aggiornamento corretto dell'email
        response = authenticated_client.patch(
            "/v1/users/me",
            json={"email": "updated_email@example.com"},
        )
        assert response.status_code == 200
        assert response.json()["email"] == "updated_email@example.com"

    def test_update_user_email_email_already_exists(self, authenticated_client, client):
        # Creazione di un altro utente con la stessa email
        client.post(
            "/v1/auth/register",
            json={
                "username": "anotheruser",
                "email": "another@example.com",
                "password": "SecurePass123!",
            },
        )
        # Tentativo di aggiornare l'email dell'utente autenticato con una email già esistente
        response = authenticated_client.patch(
            "/v1/users/me",
            json={"email": "another@example.com"},
        )
        print(response.json())
        assert response.status_code == 409
        assert "username or email already exists." in response.json()["detail"].lower()

    def test_update_user_username_already_exists(self, authenticated_client, client):
        # Creazione di un altro utente con lo stesso username
        client.post(
            "/v1/auth/register",
            json={
                "username": "existinguser",
                "email": "existing@example.com",
                "password": "SecurePass123!",
            },
        )
        # Tentativo di aggiornare lo username dell'utente autenticato con uno username già esistente
        response = authenticated_client.patch(
            "/v1/users/me",
            json={"username": "existinguser"},
        )
        print(response.json())
        assert response.status_code == 409
        assert "username or email already exists." in response.json()["detail"].lower()

    def test_update_user_invalid_height(self, authenticated_client):
        new_info = {
            "height_cm": -10,
            "username": None,
        }
        response = authenticated_client.patch("/v1/users/me", json=new_info)
        print(response.json())
        assert response.status_code == 422
        assert (
            "input should be greater than 0"
            in response.json()["detail"][0]["msg"].lower()
        )
