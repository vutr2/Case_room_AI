"""Test doubles that stand in for the real models, so tests run fast and offline."""

import hashlib
from collections.abc import Sequence

import numpy as np

from app.text import tokenize

DIM = 1024


def fake_embed(texts: Sequence[str], dim: int = DIM) -> np.ndarray:
    """One unit-length vector per text, shape (len(texts), dim).

    Deterministic: the same text always gives the same vector, in every run.
    The seed comes from sha256, not hash(): Python salts hash() per process.
    """
    vectors = np.empty((len(texts), dim), dtype=np.float32)
    for i, text in enumerate(texts):
        seed = int.from_bytes(hashlib.sha256(text.encode("utf-8")).digest()[:8], "big")
        v = np.random.default_rng(seed).standard_normal(dim)
        vectors[i] = v / np.linalg.norm(v)
    return vectors


class FakeEmbedder:
    """An Embedder (app.ingest.embeddings) that uses fake_embed and records every call."""

    dim = DIM

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def embed_documents(self, texts: Sequence[str]) -> np.ndarray:
        self.calls.append(list(texts))
        return fake_embed(texts)

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_documents([text])[0]


class FakeReranker:
    """A Reranker (app.retrieval.rerank) that scores by word overlap, and records every call.

    The score is the Jaccard index of the two token sets: |shared words| / |all words|.
    It lies in [0, 1] like the real reranker's, and is 1 only when both use the same words.
    """

    def __init__(self) -> None:
        self.calls: list[tuple[str, list[str]]] = []

    def score(self, query: str, texts: Sequence[str]) -> list[float]:
        self.calls.append((query, list(texts)))
        query_words = set(tokenize(query))
        scores = []
        for text in texts:
            words = set(tokenize(text))
            union = query_words | words
            scores.append(len(query_words & words) / len(union) if union else 0.0)
        return scores


class FakeResources:
    """Stands in for app.resources.Resources: real settings and pool, fake embedder.

    Pass `pool=None` for tests that must not touch the database: calling pool() then fails.
    """

    def __init__(self, settings, pool=None, embedder=None) -> None:
        self.settings = settings
        self._pool = pool
        self._embedder = embedder or FakeEmbedder()

    def pool(self):
        if self._pool is None:
            raise AssertionError("this test must not use the database")
        return self._pool

    def embedder(self) -> FakeEmbedder:
        return self._embedder

    def reranker(self):
        raise AssertionError("ingestion must not load the reranker")

    def close(self) -> None:
        pass
