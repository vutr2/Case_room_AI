"""Tests for evals/metrics.py, with relevance lists worked out by hand (Handout 1, Bài 9)."""

import unicodedata

import pytest

from evals.metrics import hit_at_k, is_relevant, recall_at_k, reciprocal_rank

# --- is_relevant ----------------------------------------------------------------------


def test_a_passage_containing_a_snippet_is_relevant():
    assert is_relevant("EGFR: đột biến mất đoạn exon 19 (dương tính).", ["đột biến mất đoạn exon 19"])


def test_one_matching_snippet_out_of_several_is_enough():
    assert is_relevant("Ki-67 45% in the tumor.", ["Ki-67: 45%", "Ki-67 45%"])


def test_a_passage_without_any_snippet_is_not_relevant():
    assert not is_relevant("CT chest: no distant metastasis.", ["L858R"])


def test_matching_ignores_case():
    assert is_relevant("her2 3+ by ihc", ["HER2 3+"])


def test_matching_ignores_unicode_normal_form():
    # The same Vietnamese words, one decomposed (NFD) and one composed (NFC).
    passage = unicodedata.normalize("NFD", "Giãn tĩnh mạch thực quản độ I.")

    assert is_relevant(passage, ["giãn tĩnh mạch thực quản độ I"])


def test_a_negative_question_with_no_snippets_finds_nothing_relevant():
    assert not is_relevant("Any passage at all.", [])


# --- hit_at_k -------------------------------------------------------------------------------


def test_hit_when_a_relevant_passage_is_in_the_top_k():
    assert hit_at_k([False, True, False], 2) == 1.0


def test_no_hit_when_the_first_relevant_passage_is_after_k():
    assert hit_at_k([False, False, True], 2) == 0.0


def test_hit_counts_once_however_many_are_relevant():
    assert hit_at_k([True, True, True], 3) == 1.0


def test_no_hit_without_relevant_passages_or_results():
    assert hit_at_k([False, False], 5) == 0.0
    assert hit_at_k([], 5) == 0.0


def test_k_larger_than_the_list_looks_at_everything():
    assert hit_at_k([False, True], 10) == 1.0


# --- recall_at_k ---------------------------------------------------------------------------------


def test_recall_is_the_share_of_relevant_chunks_found_in_the_top_k():
    # 2 of the case's 4 relevant chunks are in the top 3.
    assert recall_at_k([True, False, True, True], 4, 3) == pytest.approx(2 / 4)


def test_recall_is_one_when_every_relevant_chunk_is_found():
    assert recall_at_k([False, True, True], 2, 3) == 1.0


def test_recall_ignores_relevant_passages_after_k():
    assert recall_at_k([False, False, True], 1, 2) == 0.0


def test_recall_with_nothing_to_find_is_zero_not_a_division_by_zero():
    assert recall_at_k([False, False], 0, 10) == 0.0


# --- reciprocal_rank ------------------------------------------------------------------------------


def test_reciprocal_rank_of_a_first_place_answer_is_one():
    assert reciprocal_rank([True, False, False]) == 1.0


def test_reciprocal_rank_uses_the_first_relevant_passage():
    assert reciprocal_rank([False, True, False]) == pytest.approx(1 / 2)
    assert reciprocal_rank([False, False, True, True]) == pytest.approx(1 / 3)


def test_reciprocal_rank_without_a_relevant_passage_is_zero():
    assert reciprocal_rank([False, False, False]) == 0.0
    assert reciprocal_rank([]) == 0.0


def test_mrr_is_the_mean_of_reciprocal_ranks():
    # Three questions answered at ranks 1, 2 and never: (1 + 0.5 + 0) / 3 = 0.5.
    rankings = [[True], [False, True], [False, False]]

    assert sum(reciprocal_rank(r) for r in rankings) / len(rankings) == pytest.approx(0.5)
