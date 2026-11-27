from collections import defaultdict
from collections.abc import Hashable, Sequence


def rrf[K: Hashable](
    rankings: Sequence[Sequence[K]], k: int = 60, weights: Sequence[float] | None = None
) -> list[tuple[K, float]]:

    if weights is None:
        weights = [1.0] * len(rankings)
    if len(weights) != len(rankings):
        raise ValueError("Weight is different")

    scores = defaultdict(float)
    best_rank = {}
    first_seen = {}

    for ranking, w in zip(rankings, weights, strict=True):
        seen = set()
        for r, key in enumerate(ranking, start=1):
            if key in seen:
                continue
            seen.add(key)
            scores[key] += w / (k + r)
            if key not in best_rank or r < best_rank[key]:
                best_rank[key] = r
            if key not in first_seen:
                first_seen[key] = len(first_seen)
    ordered = sorted(scores, key=lambda x: (-scores[x], best_rank[x], first_seen[x]))

    res = []
    for item in ordered:
        res.append((item, scores[item]))
    return res
