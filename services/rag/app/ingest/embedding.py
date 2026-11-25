from collections.abc import Sequence
from typing import Protocol

import numpy as np

DIMENSION = 1024  # Must match the vector(1024) column in app/store/schema.sql.


class Embedder(Protocol):
    def embed(self, texts: Sequence[str]) -> np.ndarray:
        """Return a float32 matrix of shape (len(texts), 1024): one row per input text.

        Every row is L2-normalized (length 1), so cosine similarity equals the dot product.
        Normalizing is the embedder's job; every implementation, fakes included, must do it.
        """
        ...


class SentenceTransformerEmbedder:
    """Embeds texts with a sentence-transformers model, such as BAAI/bge-m3."""

    def __init__(self, model_name: str, device: str) -> None:
        # Imported here, not at the top: importing torch takes seconds.
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name, device=device)
        dimension = self._model.get_embedding_dimension()
        if dimension != DIMENSION:
            raise ValueError(f"{model_name} gives {dimension}-dimension vectors; the store needs {DIMENSION}")
        # bge-m3 accepts 8192 tokens; chunks are far shorter, so cap the memory a stray long text can take.
        self._model.max_seq_length = 1024

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, DIMENSION), dtype=np.float32)
        vectors = self._model.encode(
            list(texts),
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
            batch_size=32,
        )
        return vectors.astype(np.float32, copy=False)
