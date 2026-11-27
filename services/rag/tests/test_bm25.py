"""Tests for the hand-written BM25 (Handout 1, Bài 6).

The expected numbers were worked out by hand with k1 = 1.5 and b = 0.75:
    N = 3, avgdl = 8/3
    idf("her2")     = ln(1 + 2.5/1.5) ≈ 0.9808
    idf("positive") = ln(1 + 1.5/2.5) ≈ 0.4700
    score(["her2"], 0) = 0.9808 * 2.5 / (1 + 1.5 * (0.25 + 0.75 * 2 / (8/3))) ≈ 1.1052
"""

import math

import pytest

from app.retrieval.bm25 import BM25, lexical_ranking
from app.store.chunks import StoredChunk

CORPUS = [["her2", "positive"], ["er", "positive", "pr", "positive"], ["ki67", "high"]]


@pytest.fixture
def bm25() -> BM25:
    return BM25(CORPUS)


# --- __init__ ---------------------------------------------------------------


def test_counts_documents_and_average_length(bm25):
    assert bm25.n == 3
    assert bm25.avgdl == pytest.approx(8 / 3)


def test_document_frequency_counts_each_document_once(bm25):
    # "positive" appears 3 times in total, but in only 2 documents.
    assert bm25.df["positive"] == 2
    assert bm25.df["her2"] == 1


def test_term_frequency_is_counted_per_document(bm25):
    assert bm25.tf[1]["positive"] == 2
    assert bm25.tf[0]["positive"] == 1
    assert bm25.tf[2]["positive"] == 0


def test_default_parameters():
    assert (BM25(CORPUS).k1, BM25(CORPUS).b) == (1.5, 0.75)


# --- idf ----------------------------------------------------------------------


def test_idf_matches_the_hand_computed_values(bm25):
    assert bm25.idf("her2") == pytest.approx(0.9808, abs=1e-4)
    assert bm25.idf("positive") == pytest.approx(0.4700, abs=1e-4)


def test_a_rare_term_weighs_more_than_a_common_one(bm25):
    assert bm25.idf("her2") > bm25.idf("positive")


def test_idf_stays_positive_for_a_term_in_every_document():
    # Robertson's original formula would give a negative idf here; the "1 +" prevents it.
    assert BM25([["tumor"], ["tumor"], ["tumor"]]).idf("tumor") > 0


def test_idf_of_an_unknown_term_does_not_fail(bm25):
    assert bm25.idf("xyz") == pytest.approx(math.log(1 + 3.5 / 0.5))


# --- score ----------------------------------------------------------------------


def test_score_matches_the_hand_computed_value(bm25):
    assert bm25.score(["her2"], 0) == pytest.approx(1.1052, abs=1e-3)


def test_score_is_zero_when_the_document_lacks_every_query_term(bm25):
    assert bm25.score(["her2"], 2) == 0.0
    assert bm25.score(["xyz"], 0) == 0.0


def test_score_adds_up_the_terms_of_the_query(bm25):
    both = bm25.score(["her2", "positive"], 0)

    assert both == pytest.approx(bm25.score(["her2"], 0) + bm25.score(["positive"], 0))


def test_a_repeated_query_term_counts_once(bm25):
    assert bm25.score(["her2", "her2", "her2"], 0) == pytest.approx(bm25.score(["her2"], 0))


def test_term_frequency_saturates():
    # Same length (10 tokens): "a" once versus "a" ten times.
    bm25 = BM25([["a"] + ["x"] * 9, ["a"] * 10])
    once, ten_times = bm25.score(["a"], 0), bm25.score(["a"], 1)

    assert ten_times > once
    assert ten_times < 10 * once


def test_a_shorter_document_scores_higher_for_the_same_count():
    bm25 = BM25([["a", "b"], ["a", "b", "c", "d", "e", "f"]])

    assert bm25.score(["a"], 0) > bm25.score(["a"], 1)


def test_k1_zero_ignores_how_often_the_term_appears():
    bm25 = BM25([["a"] + ["x"] * 9, ["a"] * 10], k1=0)

    assert bm25.score(["a"], 0) == pytest.approx(bm25.score(["a"], 1))


def test_b_zero_ignores_document_length():
    bm25 = BM25([["a", "b"], ["a", "b", "c", "d", "e", "f"]], b=0)

    assert bm25.score(["a"], 0) == pytest.approx(bm25.score(["a"], 1))


def test_a_corpus_of_empty_documents_does_not_divide_by_zero():
    assert BM25([[], []]).score(["a"], 0) == 0.0


# --- top_k ------------------------------------------------------------------------


def test_top_k_returns_only_documents_that_contain_a_query_term(bm25):
    results = bm25.top_k(["her2"], 5)

    assert [index for index, _ in results] == [0]
    assert results[0][1] == pytest.approx(1.1052, abs=1e-3)


def test_top_k_goes_from_highest_to_lowest_score(bm25):
    results = bm25.top_k(["positive", "her2"], 5)
    scores = [score for _, score in results]

    assert len(results) == 2
    assert scores == sorted(scores, reverse=True)
    assert results[0][0] == 0  # her2 is rare, so the document with it wins


def test_top_k_returns_at_most_k(bm25):
    assert len(bm25.top_k(["positive"], 1)) == 1


def test_top_k_breaks_ties_by_the_smaller_index():
    # Three identical documents get the same score: indexes must come out 0, 1, 2.
    bm25 = BM25([["a", "b"], ["a", "b"], ["a", "b"]])

    assert [index for index, _ in bm25.top_k(["a"], 3)] == [0, 1, 2]


def test_top_k_of_an_empty_corpus_is_empty():
    assert BM25([]).top_k(["her2"], 5) == []


def test_top_k_of_an_unknown_term_is_empty(bm25):
    assert bm25.top_k(["xyz"], 5) == []


def test_top_k_of_an_empty_query_is_empty(bm25):
    assert bm25.top_k([], 5) == []


# --- lexical_ranking --------------------------------------------------------------


def stored(chunk_id: int, text: str, title: str = "Pathology report") -> StoredChunk:
    return StoredChunk(
        id=chunk_id,
        case_room_id="case-1",
        source_id=f"doc-{chunk_id}",
        kind="document",
        title=title,
        doc_date=None,
        part=1,
        parts=1,
        section=None,
        text=text,
    )


CHUNKS = [
    stored(1, "ER: negative (0%). PR: negative (0%)."),
    stored(2, "HER2: positive (3+) by IHC. Ki-67: 45%."),
    stored(3, "CT chest: no distant metastasis.", title="Imaging report"),
]


def test_lexical_ranking_returns_the_stored_chunks_with_their_scores():
    results = lexical_ranking(CHUNKS, "HER2 status", 5)

    assert [chunk.id for chunk, _ in results] == [2]
    assert results[0][0] is CHUNKS[1]
    assert results[0][1] > 0


def test_lexical_ranking_tokenizes_the_query_like_the_chunks():
    # Upper case, punctuation and stopwords in the question must not matter.
    assert [c.id for c, _ in lexical_ranking(CHUNKS, "What is the her2?", 5)] == [2]


def test_lexical_ranking_also_searches_the_title():
    # "imaging" is only in the title of chunk 3, not in its text.
    assert [c.id for c, _ in lexical_ranking(CHUNKS, "imaging", 5)] == [3]


def test_lexical_ranking_handles_vietnamese_diacritics():
    chunks = [stored(1, "Không di căn hạch."), stored(2, "Ung thư biểu mô thể ống xâm nhập.")]

    assert [c.id for c, _ in lexical_ranking(chunks, "UNG THƯ", 5)] == [2]


def test_lexical_ranking_respects_k():
    assert len(lexical_ranking(CHUNKS, "negative positive metastasis", 2)) == 2


def test_lexical_ranking_of_no_chunks_is_empty():
    assert lexical_ranking([], "HER2", 5) == []


def test_lexical_ranking_with_no_matching_word_is_empty():
    assert lexical_ranking(CHUNKS, "EGFR mutation", 5) == []
