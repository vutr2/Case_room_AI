from __future__ import annotations

import threading
from typing import TYPE_CHECKING

from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

from .config import Settings
from .store.chunks import ensure_schema

if TYPE_CHECKING:
    from .ingest.embeddings import Embedder
    from .retrieval.rerank import Reranker


class Resources:
    """The expensive, shared things the service needs: the database pool and the models.

    One instance lives for the whole server (app.state.resources) and is shared by every
    request. Each resource is created lazily, the first time someone asks for it, so
    starting the server or running a test does not load a 2 GB model nobody uses.

    FastAPI runs requests on several threads at once, so each getter uses
    double-checked locking: two threads asking at the same moment still get one pool
    and one model, never two.
    """

    def __init__(self, settings: Settings) -> None:
        """Store the settings only; nothing is connected or loaded yet.

        `_lock` is one lock shared by pool(), embedder() and reranker(). Only one
        thread at a time may be creating a resource.
        """
        self._settings = settings
        self._pool, self._embedder, self._reranker = None, None, None
        self._lock = threading.Lock()

    @property
    def settings(self) -> Settings:
        """The settings this service was started with (read-only)."""
        return self._settings

    def pool(self) -> ConnectionPool:
        """Return the Postgres connection pool, creating it on the first call.

        On the first call it:
        1. reads RAG_DATABASE_URL (RuntimeError if it is missing);
        2. opens a pool of 1-5 connections, each set up by register_vector so numpy
           arrays can be sent to and read from `vector` columns;
        3. borrows one connection and runs ensure_schema, so the chunks table exists
           even for scripts that never run the FastAPI lifespan;
        4. only then saves the pool in self._pool.

        Step 4 comes last on purpose: if ensure_schema fails, no broken pool is kept,
        and the next call tries again from scratch.

        Double-checked locking:
        - the first `is None` check (no lock) makes later calls fast;
        - the second check (inside the lock) stops a thread that waited at the lock
          from building a second pool after the first thread already built one.

        Borrow a connection with `with resources.pool().connection() as conn:`.
        Never close the pool yourself; close() does that when the server stops.
        """
        if self._pool is None:
            with self._lock:
                if self._pool is None:
                    url = self._settings.rag_database_url
                    if url is None:
                        raise RuntimeError("Miss RAG_DATABASE_URL in ENV")
                    conninfo = url.get_secret_value()
                    pool_tmp = ConnectionPool(conninfo, min_size=1, max_size=5, configure=register_vector)

                    with pool_tmp.connection() as conn:
                        ensure_schema(conn)

                    self._pool = pool_tmp

        return self._pool

    def embedder(self) -> Embedder:
        """Return the embedding model (bge-m3), loading it on the first call.

        Loading takes seconds and about 2.3 GB of memory, so it happens once and the
        same object is reused by every request. The lock makes sure two requests
        arriving together do not load the model twice.

        The import is inside the method because importing sentence_transformers
        (and torch) is slow; code that never embeds never pays for it.
        """
        if self._embedder is None:
            with self._lock:
                if self._embedder is None:
                    from .ingest.embeddings import SentenceTransformerEmbedder

                    self._embedder = SentenceTransformerEmbedder(
                        self.settings.embedding_model, self.settings.model_device
                    )
        return self._embedder

    def reranker(self) -> Reranker:
        """Return the cross-encoder reranker (bge-reranker-v2-m3), loading it on the first call.

        Same pattern as embedder(): lazy, created once, guarded by the lock.
        Only retrieval uses it (Handout 1, Bài 8); ingestion never loads it.
        """
        if self._reranker is None:
            with self._lock:
                if self._reranker is None:
                    from .retrieval.rerank import CrossEncoderReranker

                    self._reranker = CrossEncoderReranker(self.settings.reranker_model, self.settings.model_device)

        return self._reranker

    def close(self) -> None:
        """Close the database pool, if one was opened. Called when the server stops.

        Setting _pool back to None means a later pool() call opens a fresh pool.
        The models need no closing; they are freed with the process.
        """
        if self._pool is not None:
            self._pool.close()
        self._pool = None
