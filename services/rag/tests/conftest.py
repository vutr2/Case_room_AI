import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

from .helpers import TOKEN


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings(_env_file=None, rag_service_token=TOKEN)))


@pytest.fixture
def auth() -> dict[str, str]:
    return {"Authorization": f"Bearer {TOKEN}"}
