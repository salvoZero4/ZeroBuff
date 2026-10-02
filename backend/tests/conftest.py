import os

import pytest
from alembic import command
from alembic.config import Config
from app.api.dependencies import get_session
from app.main import app
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import make_url
from sqlmodel import Session, create_engine

load_dotenv()

DATABASE_URL_TEST = os.environ["TEST_DATABASE_URL"]


def _assert_is_test_db(url: str) -> None:

    db_name = make_url(url).database or ""
    assert db_name.endswith("_test"), (
        f"Refusing to run tests against database '{db_name}': name must end with '_test'"
    )


_assert_is_test_db(DATABASE_URL_TEST)
engine = create_engine(DATABASE_URL_TEST)


@pytest.fixture(scope="function")
def session():
    connection = engine.connect()
    transaction = connection.begin()
    with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
        yield session
        transaction.rollback()  # in questo modo ogni test non influenzerà il database, perché dopo ogni test viene fatto un rollback
        connection.close()


@pytest.fixture(scope="function", autouse=True)
def override_get_session(session: Session):
    app.dependency_overrides[get_session] = lambda: session
    yield
    app.dependency_overrides.clear()


# Unathenticated client fixture
@pytest.fixture(scope="function")
def client():
    with TestClient(app) as c:
        yield c


# Fixture to provide an authenticated client for testing
@pytest.fixture(scope="function")
def authenticated_client():
    with TestClient(app) as client:
        client.post(
            "/v1/auth/register",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        response = client.post(
            "/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        token = response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client


# Fixture to provide a second authenticated client for testing
@pytest.fixture(scope="function")
def authenticated_client2():
    with TestClient(app) as client:
        client.post(
            "/v1/auth/register",
            json={
                "username": "testuser2",
                "email": "test2@example.com",
                "password": "SecurePass123!",
            },
        )
        response = client.post(
            "/v1/auth/login",
            json={
                "email": "test2@example.com",
                "password": "SecurePass123!",
            },
        )
        token = response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client


# Fixture to disable rate limiting for tests for not obtaining 429 errors during testing
@pytest.fixture(autouse=True)
def disable_rate_limit():
    app.state.limiter.enabled = False
    yield
    app.state.limiter.enabled = True


@pytest.fixture(scope="session", autouse=True)
def run_migrations():

    alembic_cfg = Config("alembic.ini")
    # modifico l'URL del database di test per le migrazioni
    alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL_TEST)
    # applico le migrazioni al database di test
    command.upgrade(alembic_cfg, "head")
    yield
