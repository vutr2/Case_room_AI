from __future__ import annotations

from typing import TYPE_CHECKING

from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

from .config import Settings

if TYPE_CHECKING:
    from .ingest.embedding import Embedder
    from .retrieval.rerank import Reranker


class Resources:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._pool, self._embedder, self._reranker = None, None, None

    @property
    def settings(self) -> Settings:
        return self._settings

    def pool(self) -> ConnectionPool:

        url = self._settings.rag_database_url
        if self._pool is None:
            if url is None:
                raise RuntimeError("Miss RAG_DATABASE_URL in ENV")
            conninfo = url.get_secret_value()

            self._pool = ConnectionPool(conninfo, min_size=1, max_size=5, configure=register_vector)
        return self._pool

    def embedder(self) -> Embedder:
        if self._embedder is None:
            from .ingest.embedding import SentenceTransformerEmbedder

            self._embedder = SentenceTransformerEmbedder(self.settings.embedding_model, self.settings.model_device)
        return self._embedder

    def reranker(self) -> Reranker:
        if self._reranker is None:
            from .retrieval.rerank import CrossEncoderReranker

            self._reranker = CrossEncoderReranker(self.settings.reranker_model, self.settings.model_device)

        return self._reranker

    def close(self) -> None:
        if self._pool is not None:
            self._pool.close()
        self._pool = None
