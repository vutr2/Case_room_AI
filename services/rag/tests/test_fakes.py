import numpy as np
import pytest

from .fakes import FakeReranker, fake_embed


def test_fake_embed_gives_one_unit_vector_per_text():
    vectors = fake_embed(["HER2 3+", "ER âm tính"])
    assert vectors.shape == (2, 1024)
    assert np.allclose(np.linalg.norm(vectors, axis=1), 1.0)


def test_fake_embed_is_deterministic_and_tells_texts_apart():
    a1, b = fake_embed(["HER2 3+", "ER âm tính"])
    (a2,) = fake_embed(["HER2 3+"])
    assert np.array_equal(a1, a2)
    assert not np.allclose(a1, b)


def test_fake_embed_of_no_text_is_empty():
    assert fake_embed([]).shape == (0, 1024)


def test_fake_reranker_scores_word_overlap_in_order():
    scores = FakeReranker().score("HER2 status", ["HER2 status", "HER2 positive", "CT chest"])

    assert scores[0] == 1.0
    assert scores[1] == pytest.approx(1 / 3)  # shared {her2}, all {her2, status, positive}
    assert scores[2] == 0.0


def test_fake_reranker_ignores_case_punctuation_and_stopwords():
    assert FakeReranker().score("What is the HER2?", ["her2"]) == [1.0]


def test_fake_reranker_of_no_text_is_empty_and_empty_text_scores_zero():
    reranker = FakeReranker()

    assert reranker.score("HER2", []) == []
    assert reranker.score("", [""]) == [0.0]


def test_fake_reranker_records_its_calls():
    reranker = FakeReranker()
    reranker.score("HER2", ("a", "b"))

    assert reranker.calls == [("HER2", ["a", "b"])]
