"""Tests for reciprocal rank fusion (Handout 1, Bài 7).

Worked example from the handout, k = 60:
    L1 = ["A", "C"], L2 = ["B", "X", "A"]
    A = 1/61 + 1/63 ≈ 0.03227   (rank 1 in L1, rank 3 in L2)
    B = 1/61        ≈ 0.01639
    C = 1/62        ≈ 0.01613   (tie with X: same score, same best rank 2; C was seen first)
    X = 1/62        ≈ 0.01613
"""

import pytest

from app.retrieval.fusion import rrf

L1 = ["A", "C"]
L2 = ["B", "X", "A"]


def keys(results):
    return [key for key, _ in results]


# --- The handout example ------------------------------------------------------


def test_the_handout_example_comes_out_a_b_c_x():
    assert keys(rrf([L1, L2])) == ["A", "B", "C", "X"]


def test_the_handout_example_scores():
    scores = dict(rrf([L1, L2]))

    assert scores["A"] == pytest.approx(1 / 61 + 1 / 63)
    assert scores["A"] == pytest.approx(0.03227, abs=1e-5)
    assert scores["B"] == pytest.approx(1 / 61)
    assert scores["C"] == pytest.approx(1 / 62)
    assert scores["X"] == pytest.approx(1 / 62)


def test_scores_go_from_highest_to_lowest():
    scores = [score for _, score in rrf([L1, L2])]

    assert scores == sorted(scores, reverse=True)


def test_each_key_appears_once():
    results = keys(rrf([L1, L2]))

    assert sorted(results) == ["A", "B", "C", "X"]


# --- Agreement beats a single first place --------------------------------------


def test_a_key_found_by_both_lists_beats_a_key_first_in_only_one():
    # "both" is only 2nd in each list, yet it beats the two keys ranked 1st once.
    results = keys(rrf([["only-1", "both"], ["only-2", "both"]]))

    assert results[0] == "both"


# --- Ties ---------------------------------------------------------------------------
# With k=0 the scores are simple fractions, which makes exact ties easy to build.


def test_a_tie_on_score_is_broken_by_the_best_rank():
    # List 1 (weight 2): X rank 1 -> 2/1 = 2,  N rank 2 -> 2/2 = 1.
    # List 2 (weight 1): M rank 1 -> 1/1 = 1.
    # N and M both score 1. N was seen first, but M's best rank (1) beats N's (2).
    results = rrf([["X", "N"], ["M"]], k=0, weights=(2, 1))
    scores = dict(results)

    assert scores["N"] == pytest.approx(scores["M"])
    assert keys(results) == ["X", "M", "N"]


def test_a_tie_on_score_and_best_rank_keeps_the_first_seen_key_first():
    # The handout's C and X: same score 1/62, same best rank 2; C appears first.
    assert keys(rrf([L1, L2]))[2:] == ["C", "X"]


def test_a_full_tie_is_in_first_seen_order():
    # S and T: each ranked 1st once and 2nd once, so same score and same best rank.
    assert keys(rrf([["S", "T"], ["T", "S"]])) == ["S", "T"]
    assert keys(rrf([["T", "S"], ["S", "T"]])) == ["T", "S"]


# --- Weights ---------------------------------------------------------------------------


def test_default_weights_are_all_one():
    assert rrf([L1, L2]) == rrf([L1, L2], weights=(1.0, 1.0))


def test_a_zero_weight_ignores_that_list():
    # The handout: weights=(0, 1) gives the order of L2. C, only in the ignored list,
    # still comes out, last and with a score of 0.
    results = rrf([L1, L2], weights=(0, 1))

    assert keys(results)[:3] == L2
    assert results[3] == ("C", 0.0)


def test_a_weight_multiplies_that_list_contribution():
    assert dict(rrf([["A"]], weights=(3,)))["A"] == pytest.approx(3 / 61)


def test_a_heavier_list_wins():
    assert keys(rrf([["bm25-first"], ["dense-first"]], weights=(1, 2)))[0] == "dense-first"
    assert keys(rrf([["bm25-first"], ["dense-first"]], weights=(2, 1)))[0] == "bm25-first"


def test_too_few_weights_are_rejected():
    with pytest.raises(ValueError):
        rrf([L1, L2], weights=(1.0,))


def test_too_many_weights_are_rejected():
    with pytest.raises(ValueError):
        rrf([L1, L2], weights=(1.0, 1.0, 1.0))


# --- k -----------------------------------------------------------------------------------


def test_k_changes_the_scores():
    assert dict(rrf([["A"]], k=0))["A"] == pytest.approx(1.0)
    assert dict(rrf([["A"]], k=10))["A"] == pytest.approx(1 / 11)


def test_a_small_k_widens_the_gap_between_ranks():
    def gap(k: int) -> float:
        scores = dict(rrf([["first", "second"]], k=k))
        return scores["first"] / scores["second"]

    assert gap(0) > gap(60) > gap(1000)


# --- Edge cases ----------------------------------------------------------------------------


def test_no_rankings_gives_an_empty_list():
    assert rrf([]) == []


def test_empty_rankings_give_an_empty_list():
    assert rrf([[], []]) == []


def test_a_single_ranking_keeps_its_order():
    assert keys(rrf([["c", "a", "b"]])) == ["c", "a", "b"]


def test_a_key_repeated_in_one_list_counts_once():
    scores = dict(rrf([["A", "A", "B"]]))

    assert scores["A"] == pytest.approx(1 / 61)
    # B keeps its real position: rank 3, not 2.
    assert scores["B"] == pytest.approx(1 / 63)


def test_keys_can_be_any_hashable_type():
    # Chunk ids (int) here; graph nodes in Handout 2.
    assert keys(rrf([[3, 1], [1, 2]])) == [1, 3, 2]
    assert keys(rrf([[("doc", 1)], [("doc", 1)]])) == [("doc", 1)]
