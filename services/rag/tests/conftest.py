import os
import sys
import uuid
from collections.abc import Iterator

import psycopg
import pytest
from fastapi.testclient import TestClient
from pgvector.psycopg import register_vector

from app.config import Settings
from app.main import create_app

from .helpers import TOKEN, connect_to


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Skip tests that need services a plain `uv run pytest` does not have.

    - `db`: needs RAG_DATABASE_URL (pgvector on port 5433).
    - `model`: needs RAG_RUN_MODEL_TESTS=1, because it downloads and loads a real model (bge-m3, ~2.3 GB).

    Read from the environment only, not services/rag/.env, like the fixtures below.
    """
    skips = {}
    if not os.environ.get("RAG_DATABASE_URL", "").strip():
        skips["db"] = pytest.mark.skip(reason="RAG_DATABASE_URL is not set (pgvector on port 5433)")
    if os.environ.get("RAG_RUN_MODEL_TESTS", "").strip() != "1":
        skips["model"] = pytest.mark.skip(reason="set RAG_RUN_MODEL_TESTS=1 to load the real model")
    for item in items:
        for marker, skip in skips.items():
            if item.get_closest_marker(marker) is not None:
                item.add_marker(skip)


@pytest.fixture(autouse=True)
def no_real_model(request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch) -> None:
    """Outside tests marked `model`, importing sentence_transformers fails fast.

    Without this, a test that reaches Resources.embedder() would silently download
    bge-m3 (~2.3 GB) and hang the suite. Tests that need a model use a fake instead.
    """
    if request.node.get_closest_marker("model") is None:
        monkeypatch.setitem(sys.modules, "sentence_transformers", None)


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings(_env_file=None, rag_service_token=TOKEN)))


@pytest.fixture
def auth() -> dict[str, str]:
    return {"Authorization": f"Bearer {TOKEN}"}


# --- Database fixtures (only used by tests marked `db`) ---------------------


@pytest.fixture
def db_url() -> str:
    return os.environ["RAG_DATABASE_URL"]


@pytest.fixture
def db_schema(db_url: str) -> Iterator[str]:
    """A fresh, empty Postgres schema per test, dropped afterwards.

    Tests never touch the real `public.chunks` table, and each test starts clean.
    """
    name = f"test_{uuid.uuid4().hex[:12]}"
    with psycopg.connect(db_url, autocommit=True) as admin:
        # The `vector` type lives in `public`; the test schema only holds tables.
        admin.execute("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public")
        admin.execute(f"CREATE SCHEMA {name}")
    yield name
    with psycopg.connect(db_url, autocommit=True) as admin:
        admin.execute(f"DROP SCHEMA {name} CASCADE")


@pytest.fixture
def conn(db_url: str, db_schema: str) -> Iterator[psycopg.Connection]:
    with connect_to(db_url, db_schema) as c:
        # Lets psycopg send and receive numpy arrays for `vector` columns,
        # like the pool in app/resources.py does.
        register_vector(c)
        yield c
