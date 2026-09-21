from uuid import uuid4

from app.core.security import create_refresh_token


class TestRegistration:
    def test_register_user_success(self, client):
        response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert response.status_code == 201
        assert "access_token" in response.json()

    def test_register_user_existing_email(self, client):
        # First, register a user
        client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        # Then, try to register another user with the same email
        response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser2",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert response.status_code == 409

    def test_register_user_existing_username(self, client):

        client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )

        response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test2@example.com",
                "password": "SecurePass123!",
            },
        )
        assert response.status_code == 409

    def test_register_user_invalid_email(self, client):
        response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "invalid-email",
                "password": "SecurePass123!",
            },
        )
        assert response.status_code == 422

    def test_register_user_weak_password(self, client):
        response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "weak",
            },
        )
        assert response.status_code == 422

    def test_register_user_missing_fields(self, client):
        response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "password": "SecurePass123!",
            },
        )
        assert response.status_code == 422
        assert "field required" in response.json()["detail"][0]["msg"].lower()


class TestLogin:
    def test_login_user(self, client):
        # First, register a user
        client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )

        # Then, login the user
        response = client.post(
            "/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login_user_invalid_credentials(self, client):
        # First, register a user
        client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )

        # Then, try to login with invalid credentials
        response = client.post(
            "/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPass123!",
            },
        )
        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()

    def test_login_invalid_user(self, client):
        response = client.post(
            "/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!",
            },
        )
        print(response.json())
        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()

    def test_login_missing_fields(self, client):
        response = client.post(
            "/v1/auth/login",
            json={
                "email": "test@example.com",
            },
        )
        assert response.status_code == 422
        assert "field required" in response.json()["detail"][0]["msg"].lower()


class TestRefreshToken:
    def test_refresh_token_success(self, client):
        # First, register a user
        register_response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert register_response.status_code == 201

        refresh_token = register_response.json()["refresh_token"]

        refresh_response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 200
        assert "access_token" in refresh_response.json()

    def test_refresh_token_invalid(self, client):
        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": "invalidtoken"},
        )
        assert response.status_code == 401
        assert "invalid token" in response.json()["detail"].lower()

    def test_refresh_token_wrong_type(self, client):
        # First, register a user
        register_response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert register_response.status_code == 201

        access_token = register_response.json()["access_token"]

        # Then, try to refresh with a wrong type
        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": access_token},
        )
        assert response.status_code == 401
        assert "invalid refresh token" in response.json()["detail"].lower()

    def test_refresh_token_invalid_user_id(self, client):
        # Create a refresh token for a non-existent user
        invalid_refresh_token = create_refresh_token(subject="nonexistentuser")

        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": invalid_refresh_token},
        )
        assert response.status_code == 401
        assert "invalid refresh token" in response.json()["detail"].lower()

    def test_refresh_token_fake_user_id(self, client):
        # Create a refresh token for a non-existent user
        invalid_refresh_token = create_refresh_token(subject=str(uuid4()))

        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": invalid_refresh_token},
        )
        assert response.status_code == 401
        assert "invalid refresh token" in response.json()["detail"].lower()


class TestChangePassword:
    def test_change_password_success(self, client):
        # First, register a user
        register_response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert register_response.status_code == 201

        # Then, change the password
        change_password_response = client.post(
            "/v1/auth/change-password",
            headers={
                "Authorization": f"Bearer {register_response.json()['access_token']}"
            },
            json={
                "new_password": "NewSecurePass123!",
            },
        )
        assert change_password_response.status_code == 200
        assert (
            "password changed successfully"
            in change_password_response.json()["message"].lower()
        )

    def test_change_password_same_as_old(self, client):
        # First, register a user
        register_response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert register_response.status_code == 201

        # Then, try to change the password to the same as the old one
        change_password_response = client.post(
            "/v1/auth/change-password",
            headers={
                "Authorization": f"Bearer {register_response.json()['access_token']}"
            },
            json={
                "new_password": "SecurePass123!",
            },
        )
        assert change_password_response.status_code == 409
        assert (
            "new password cannot be the same as the old password"
            in change_password_response.json()["detail"].lower()
        )

    def test_change_password_weak(self, client):
        # First, register a user
        register_response = client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        assert register_response.status_code == 201

        # Then, try to change the password to a weak one
        change_password_response = client.post(
            "/v1/auth/change-password",
            headers={
                "Authorization": f"Bearer {register_response.json()['access_token']}"
            },
            json={
                "new_password": "weak",
            },
        )
        assert change_password_response.status_code == 422
        assert (
            "password must be at least 8 characters long"
            in change_password_response.json()["detail"][0]["msg"].lower()
        )

    def test_change_password_unauthenticated(self, client):
        change_password_response = client.post(
            "/v1/auth/change-password",
            json={
                "new_password": "NewSecurePass123!",
            },
        )
        assert change_password_response.status_code == 401
        assert "not authenticated" in change_password_response.json()["detail"].lower()
