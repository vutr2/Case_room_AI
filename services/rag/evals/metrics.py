"""Retrieval metrics for the golden set (Handout 1, Bài 9).

Every metric takes `relevance`: relevance[i] tells whether the passage at rank i + 1
is relevant. Building that list (is_relevant on each returned passage) is separate from
scoring it, so the metrics are plain functions of booleans that are easy to check by hand.
"""

from collections.abc import Sequence

from app.text import normalize


def _fold(text: str) -> str:
    """Text as compared: Unicode NFC (so Vietnamese diacritics match), then casefold."""
    return normalize(text).casefold()


def is_relevant(passage_text: str, snippets: Sequence[str]) -> bool:
    """True if the passage contains at least one of the snippets.

    Compared after NFC and casefold, so "HER2 3+" matches "her2 3+" and a snippet typed
    with decomposed accents still matches. No snippets (a negative question) means
    nothing is relevant.
    """
    text = _fold(passage_text)
    return any(_fold(snippet) in text for snippet in snippets)


def hit_at_k(relevance: Sequence[bool], k: int) -> float:
    """1.0 if at least one of the first k passages is relevant, else 0.0."""
    return 1.0 if any(relevance[:k]) else 0.0


def recall_at_k(relevance: Sequence[bool], total_relevant: int, k: int) -> float:
    """Share of all relevant chunks of the case found in the first k passages.

    total_relevant counts the case's chunks that contain a snippet (from
    list_case_chunks). When it is 0 there is nothing to find, and the result is 0.0.
    """
    if total_relevant <= 0:
        return 0.0
    return sum(relevance[:k]) / total_relevant


def reciprocal_rank(relevance: Sequence[bool]) -> float:
    """1 / rank of the first relevant passage (ranks start at 1), or 0.0 if none is.

    Averaged over the questions, this is the MRR (mean reciprocal rank).
    """
    for rank, relevant in enumerate(relevance, start=1):
        if relevant:
            return 1.0 / rank
    return 0.0
