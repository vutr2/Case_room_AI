from collections.abc import Sequence
from typing import Protocol

import numpy as np

DIMENSION = 1024  # Must match the vector(1024) column in app/store/schema.sql.


class Embedder(Protocol):
    """What any embedder must provide: the real model, or FakeEmbedder in tests.

    A Protocol, so classes do not inherit from it; having these members is enough.
    """

    dim: int

    def embed_documents(self, texts: Sequence[str]) -> np.ndarray:
        """Return a float32 matrix of shape (len(texts), dim): one row per input text.

        Every row is L2-normalized (length 1), so cosine similarity equals the dot product.
        Normalizing is the embedder's job; every implementation, fakes included, must do it.
        """
        ...

    def embed_query(self, text: str) -> np.ndarray:
        """Return one unit vector of shape (dim,) for a search question."""
        ...


class SentenceTransformerEmbedder:
    """Embeds texts with a sentence-transformers model, such as BAAI/bge-m3."""

    def __init__(self, model_name: str, device: str = "mps", batch_size: int = 16, max_seq_length: int = 1024) -> None:
        """Load the model; this takes seconds and about 2.3 GB, so Resources does it only once.

        Raises ValueError if the model's vectors do not have DIMENSION numbers, because
        they would not fit the vector(1024) column.
        """
        # Imported here, not at the top: importing torch takes seconds.
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name, device=device)
        self.dim = self._model.get_embedding_dimension()
        if self.dim != DIMENSION:
            raise ValueError(f"{model_name} gives {self.dim}-dimension vectors; the store needs {DIMENSION}")
        # bge-m3 accepts 8192 tokens; chunks are far shorter, so cap the memory a stray long text can take.
        self._model.max_seq_length = max_seq_length
        self._batch_size = batch_size

    def embed_documents(self, texts: Sequence[str]) -> np.ndarray:
        """Embed many texts in batches; see Embedder.embed_documents.

        An empty list returns an empty (0, dim) matrix without calling the model.
        """
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        vectors = self._model.encode(
            list(texts),
            batch_size=self._batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return vectors.astype(np.float32, copy=False)

    def embed_query(self, text: str) -> np.ndarray:
        """Embed one search question; see Embedder.embed_query."""
        # bge-m3 needs no "query: " prefix; e5-style models would, which is why this is a separate method.
        return self.embed_documents([text])[0]
