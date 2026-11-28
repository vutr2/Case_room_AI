import math
from collections.abc import Sequence
from typing import Protocol


class Reranker(Protocol):
    def score(self, query: str, texts: Sequence[str]) -> list[float]: ...


class CrossEncoderReranker:
    def __init__(self, model_name: str, device: str = "mps", max_length: int = 512) -> None:
        from sentence_transformers import CrossEncoder

        self._model = CrossEncoder(model_name, device=device, max_length=max_length)

    def score(self, query: str, texts: Sequence[str]) -> list[float]:

        if len(texts) == 0:
            return []
        res = self._model.predict([(query, t) for t in texts], batch_size=16)

        is_raw_logits = any(not (0 <= x <= 1) for x in res)

        values = [float(1 / (1 + math.exp(-x))) for x in res] if is_raw_logits else [float(x) for x in res]

        return values
