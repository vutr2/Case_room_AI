"""Resources: lazy, thread-safe creation of the pool and the models (Handout 1, Bài 0).

Most tests replace ConnectionPool, ensure_schema and the embedder class with fakes,
so they need neither Postgres nor a real model. Only the last test, marked `db`,
opens a real pool.
"""

import threading
import time

import psycopg
import pytest
from psycopg.conninfo import make_conninfo

import app.ingest.embeddings as embeddings_module
import app.resources as resources_module
from app.config import Settings
from app.resources import Resources

from .helpers import TOKEN

THREADS = 8


def make_settings(**overrides) -> Settings:
    values = {"rag_service_token": TOKEN, "rag_database_url": "postgresql://fake/fake"}
    values.update(overrides)
    return Settings(_env_file=None, **values)


class SlowFakePool:
    """Stands in for psycopg_pool.ConnectionPool and counts how many were created.

    The constructor sleeps, so other threads have time to reach `if self._pool is None`
    while the first one is still building: without a lock, they all build one too.
    """

    created: list["SlowFakePool"] = []
    guard = threading.Lock()  # Only protects `created` inside the fake itself.

    def __init__(self, conninfo, **kwargs) -> None:
        time.sleep(0.05)
        self.conninfo = conninfo
        self.kwargs = kwargs
        self.closed = False
        with SlowFakePool.guard:
            SlowFakePool.created.append(self)

    def connection(self):
        pool = self

        class _Borrowed:
            def __enter__(self):
                return pool

            def __exit__(self, *exc):
                return False

        return _Borrowed()

    def close(self) -> None:
        self.closed = True


@pytest.fixture
def fake_pool(monkeypatch: pytest.MonkeyPatch) -> list[SlowFakePool]:
    """Replace ConnectionPool and ensure_schema inside app.resources; returns the created pools."""
    SlowFakePool.created = []
    monkeypatch.setattr(resources_module, "ConnectionPool", SlowFakePool)
    monkeypatch.setattr(resources_module, "ensure_schema", lambda conn: None)
    return SlowFakePool.created


def call_from_threads(fn, count: int = THREADS) -> list:
    """Call fn() from `count` threads released at the same instant; return every result."""
    barrier = threading.Barrier(count)
    results: list = [None] * count
    errors: list[BaseException] = []

    def worker(index: int) -> None:
        barrier.wait()
        try:
            results[index] = fn()
        except BaseException as error:  # noqa: BLE001 - re-raised in the main thread below.
            errors.append(error)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(count)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10)
    if errors:
        raise errors[0]
    return results


# --- pool() -----------------------------------------------------------------


def test_pool_is_not_created_until_first_use(fake_pool) -> None:
    Resources(make_settings())

    assert fake_pool == []


def test_pool_is_created_once_and_reused(fake_pool) -> None:
    resources = Resources(make_settings())

    first = resources.pool()
    second = resources.pool()

    assert first is second
    assert len(fake_pool) == 1


def test_pool_uses_the_database_url_and_registers_vector(fake_pool) -> None:
    Resources(make_settings(rag_database_url="postgresql://u:p@db:5433/rag")).pool()

    (pool,) = fake_pool
    assert pool.conninfo == "postgresql://u:p@db:5433/rag"
    assert pool.kwargs["configure"] is resources_module.register_vector


def test_threads_calling_pool_together_create_exactly_one_pool(fake_pool) -> None:
    resources = Resources(make_settings())

    results = call_from_threads(resources.pool)

    assert len(fake_pool) == 1, f"{len(fake_pool)} pools were created; the lock is missing or misplaced"
    assert all(result is fake_pool[0] for result in results)


def test_pool_runs_ensure_schema_once_even_with_many_threads(fake_pool, monkeypatch) -> None:
    calls = []
    monkeypatch.setattr(resources_module, "ensure_schema", calls.append)
    resources = Resources(make_settings())

    call_from_threads(resources.pool)
    resources.pool()

    assert calls == [fake_pool[0]]


def test_pool_without_database_url_raises(fake_pool) -> None:
    resources = Resources(make_settings(rag_database_url=None))

    with pytest.raises(RuntimeError, match="RAG_DATABASE_URL"):
        resources.pool()
    assert fake_pool == []


def test_pool_is_not_kept_when_ensure_schema_fails(fake_pool, monkeypatch) -> None:
    def broken_schema(conn) -> None:
        raise psycopg.OperationalError("database is down")

    monkeypatch.setattr(resources_module, "ensure_schema", broken_schema)
    resources = Resources(make_settings())

    with pytest.raises(psycopg.OperationalError):
        resources.pool()

    # Nothing half-made is cached: the next call tries again from scratch.
    monkeypatch.setattr(resources_module, "ensure_schema", lambda conn: None)
    assert resources.pool() is fake_pool[1]


def test_a_failed_pool_does_not_leave_the_lock_held(fake_pool) -> None:
    resources = Resources(make_settings(rag_database_url=None))

    with pytest.raises(RuntimeError):
        resources.pool()

    # `with self._lock:` releases the lock even when the block raises.
    assert resources._lock.acquire(timeout=1)
    resources._lock.release()


def test_close_closes_the_pool_and_allows_a_new_one(fake_pool) -> None:
    resources = Resources(make_settings())
    first = resources.pool()

    resources.close()

    assert first.closed
    assert resources.pool() is not first
    assert len(fake_pool) == 2


def test_close_without_a_pool_does_nothing(fake_pool) -> None:
    Resources(make_settings()).close()

    assert fake_pool == []


# --- embedder() -------------------------------------------------------------


class SlowFakeEmbedder:
    """Stands in for SentenceTransformerEmbedder: loading takes time, like bge-m3 does."""

    created: list["SlowFakeEmbedder"] = []
    guard = threading.Lock()

    def __init__(self, model_name: str, device: str = "mps") -> None:
        time.sleep(0.05)
        self.model_name = model_name
        self.device = device
        with SlowFakeEmbedder.guard:
            SlowFakeEmbedder.created.append(self)


@pytest.fixture
def fake_embedder_class(monkeypatch: pytest.MonkeyPatch) -> list[SlowFakeEmbedder]:
    SlowFakeEmbedder.created = []
    monkeypatch.setattr(embeddings_module, "SentenceTransformerEmbedder", SlowFakeEmbedder)
    return SlowFakeEmbedder.created


def test_embedder_is_created_once_with_the_configured_model(fake_embedder_class) -> None:
    resources = Resources(make_settings(embedding_model="some/model", model_device="cpu"))

    first = resources.embedder()

    assert resources.embedder() is first
    assert (first.model_name, first.device) == ("some/model", "cpu")
    assert len(fake_embedder_class) == 1


def test_threads_calling_embedder_together_load_the_model_once(fake_embedder_class) -> None:
    resources = Resources(make_settings())

    results = call_from_threads(resources.embedder)

    assert len(fake_embedder_class) == 1, (
        f"the model was loaded {len(fake_embedder_class)} times; the lock is missing or misplaced"
    )
    assert all(result is fake_embedder_class[0] for result in results)


# --- With a real database ---------------------------------------------------


@pytest.mark.db
def test_real_pool_creates_the_chunks_table(db_url: str, db_schema: str) -> None:
    # search_path sends the CREATE TABLE into the empty test schema, not public.
    url = make_conninfo(db_url, options=f"-c search_path={db_schema},public")
    resources = Resources(make_settings(rag_database_url=url))
    try:
        with resources.pool().connection() as conn:
            found = conn.execute(
                "SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND table_name = 'chunks'",
                (db_schema,),
            ).fetchone()
    finally:
        resources.close()

    assert found is not None


# --- with_settings -------------------------------------------------------------------


def test_with_settings_shares_the_pool_and_loaded_models(fake_pool, fake_embedder_class) -> None:
    base = Resources(make_settings())
    pool, embedder = base.pool(), base.embedder()

    copy = base.with_settings(make_settings(retrieval_mode="bm25", rrf_k=10))

    assert copy.settings.retrieval_mode == "bm25"
    assert copy.settings.rrf_k == 10
    assert copy.pool() is pool
    assert copy.embedder() is embedder
    assert len(fake_pool) == 1
    assert len(fake_embedder_class) == 1


def test_with_settings_leaves_the_original_settings_alone(fake_pool) -> None:
    base = Resources(make_settings(retrieval_mode="hybrid"))

    base.with_settings(make_settings(retrieval_mode="dense"))

    assert base.settings.retrieval_mode == "hybrid"


@pytest.mark.parametrize(
    "change",
    [
        {"rag_database_url": "postgresql://other/db"},
        {"embedding_model": "other/model"},
        {"reranker_model": "other/reranker"},
        {"model_device": "cpu"},
    ],
)
def test_with_settings_refuses_a_different_database_or_model(fake_pool, change) -> None:
    base = Resources(make_settings())

    with pytest.raises(ValueError, match="with_settings cannot change"):
        base.with_settings(make_settings(**change))
