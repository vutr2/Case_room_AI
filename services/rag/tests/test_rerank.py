"""Tests for app.retrieval.rerank.CrossEncoderReranker (Handout 1, Bài 8).

Two layers, like tests/test_embeddings.py:
- Fast tests (always run): a fake `sentence_transformers` module stands in for the real
  library, so they check how the reranker *uses* the model, without torch or a download.
- Model tests (marked `model`): load the real bge-reranker-v2-m3. Run them with
  RAG_RUN_MODEL_TESTS=1 uv run pytest tests/test_rerank.py
"""

import math
import sys
import types

import numpy as np
import pytest

from app.retrieval.rerank import CrossEncoderReranker

# --- A fake sentence_transformers library ------------------------------------------


class FakeCrossEncoder:
    """Mimics the parts of sentence_transformers.CrossEncoder the reranker uses.

    Same constructor signature as the real class: `device` and `max_length` are
    keyword-only. `outputs` is what predict() returns; each test sets it.
    """

    instances: list["FakeCrossEncoder"] = []
    outputs: list[float] = []

    def __init__(self, model_name_or_path=None, *, device=None, max_length=None, **kwargs):
        self.model_name = model_name_or_path
        self.device = device
        self.max_length = max_length
        self.predict_calls: list[dict] = []
        FakeCrossEncoder.instances.append(self)

    def predict(self, sentences, batch_size=32, **kwargs):
        self.predict_calls.append({"pairs": list(sentences), "batch_size": batch_size, **kwargs})
        # float32, like the real model: the reranker must turn these into Python floats.
        return np.array(FakeCrossEncoder.outputs[: len(sentences)], dtype=np.float32)


@pytest.fixture
def fake_model(monkeypatch):
    """Replace the `sentence_transformers` module for this test only."""
    FakeCrossEncoder.instances = []
    FakeCrossEncoder.outputs = []
    module = types.ModuleType("sentence_transformers")
    module.CrossEncoder = FakeCrossEncoder
    monkeypatch.setitem(sys.modules, "sentence_transformers", module)
    return FakeCrossEncoder


def only_model(fake) -> FakeCrossEncoder:
    assert len(fake.instances) == 1
    return fake.instances[0]


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


# --- Loading the model ------------------------------------------------------------------


def test_loads_the_named_model_with_device_and_max_length(fake_model):
    CrossEncoderReranker("BAAI/bge-reranker-v2-m3", "cpu", 256)
    model = only_model(fake_model)

    assert model.model_name == "BAAI/bge-reranker-v2-m3"
    assert model.device == "cpu"
    assert model.max_length == 256


def test_defaults_to_mps_and_512_tokens(fake_model):
    CrossEncoderReranker("BAAI/bge-reranker-v2-m3")
    model = only_model(fake_model)

    assert (model.device, model.max_length) == ("mps", 512)


def test_loads_the_model_once_not_on_every_call(fake_model):
    fake_model.outputs = [0.5]
    reranker = CrossEncoderReranker("BAAI/bge-reranker-v2-m3")

    reranker.score("q", ["a"])
    reranker.score("q", ["b"])

    assert len(fake_model.instances) == 1


# --- What is sent to the model --------------------------------------------------------------


def test_sends_one_query_text_pair_per_text_in_order(fake_model):
    fake_model.outputs = [0.1, 0.2, 0.3]
    reranker = CrossEncoderReranker("m")

    reranker.score("HER2 status?", ["first", "second", "third"])

    (call,) = only_model(fake_model).predict_calls
    assert [tuple(pair) for pair in call["pairs"]] == [
        ("HER2 status?", "first"),
        ("HER2 status?", "second"),
        ("HER2 status?", "third"),
    ]


def test_predicts_in_batches_of_16(fake_model):
    fake_model.outputs = [0.5]
    reranker = CrossEncoderReranker("m")

    reranker.score("q", ["a"])

    assert only_model(fake_model).predict_calls[0]["batch_size"] == 16


def test_accepts_a_tuple_of_texts(fake_model):
    fake_model.outputs = [0.4, 0.6]

    assert CrossEncoderReranker("m").score("q", ("a", "b")) == pytest.approx([0.4, 0.6])


def test_no_texts_returns_an_empty_list_without_calling_the_model(fake_model):
    reranker = CrossEncoderReranker("m")

    assert reranker.score("q", []) == []
    assert only_model(fake_model).predict_calls == []


# --- What comes back -----------------------------------------------------------------------


def test_probabilities_are_returned_unchanged_in_order(fake_model):
    fake_model.outputs = [0.9, 0.1, 0.5]

    assert CrossEncoderReranker("m").score("q", ["a", "b", "c"]) == pytest.approx([0.9, 0.1, 0.5])


def test_scores_are_a_list_of_python_floats(fake_model):
    # numpy float32 would leak into Passage.score and the JSON response otherwise.
    fake_model.outputs = [0.9, 0.1]

    scores = CrossEncoderReranker("m").score("q", ["a", "b"])

    assert isinstance(scores, list)
    assert all(type(s) is float for s in scores)


def test_the_bounds_0_and_1_count_as_probabilities(fake_model):
    fake_model.outputs = [0.0, 1.0]

    assert CrossEncoderReranker("m").score("q", ["a", "b"]) == pytest.approx([0.0, 1.0])


def test_raw_logits_go_through_a_sigmoid(fake_model):
    fake_model.outputs = [4.0, -4.0, 0.0]

    scores = CrossEncoderReranker("m").score("q", ["a", "b", "c"])

    assert scores == pytest.approx([sigmoid(4.0), sigmoid(-4.0), 0.5])


def test_a_higher_logit_still_gets_a_higher_score(fake_model):
    # Catches a sigmoid written with exp(x) instead of exp(-x): it reverses the order.
    fake_model.outputs = [4.0, -4.0]

    relevant, irrelevant = CrossEncoderReranker("m").score("q", ["relevant", "irrelevant"])

    assert relevant > 0.9
    assert irrelevant < 0.1


def test_one_value_outside_0_1_means_every_value_is_a_logit(fake_model):
    # 0.3 alone looks like a probability, but next to 2.0 it must be a logit too:
    # one array never mixes the two scales.
    fake_model.outputs = [0.3, 2.0]

    scores = CrossEncoderReranker("m").score("q", ["a", "b"])

    assert scores == pytest.approx([sigmoid(0.3), sigmoid(2.0)])


def test_every_score_is_between_0_and_1(fake_model):
    fake_model.outputs = [12.0, -30.0, 0.7]

    assert all(0 <= s <= 1 for s in CrossEncoderReranker("m").score("q", ["a", "b", "c"]))


# --- With the real model --------------------------------------------------------------------


@pytest.fixture(scope="module")
def real_reranker() -> CrossEncoderReranker:
    return CrossEncoderReranker("BAAI/bge-reranker-v2-m3")


@pytest.mark.model
def test_real_model_ranks_the_answer_above_an_unrelated_passage(real_reranker):
    answer, unrelated = real_reranker.score(
        "What is the HER2 status?", ["HER2: positive (3+) by IHC.", "CT chest: no distant metastasis."]
    )

    # Absolute scores depend on the wording (this question gives the answer ~0.42,
    # "HER2 status?" gives ~0.87), so check the gap rather than a fixed threshold.
    assert answer > 0.2
    assert unrelated < 0.01
    assert answer > 100 * unrelated


@pytest.mark.model
def test_real_model_scores_are_probabilities_in_order(real_reranker):
    texts = ["CT chest: no distant metastasis.", "HER2: positive (3+) by IHC.", ""]

    scores = real_reranker.score("HER2 status?", texts)

    assert len(scores) == 3
    assert all(type(s) is float and 0 <= s <= 1 for s in scores)
    assert scores.index(max(scores)) == 1


@pytest.mark.model
def test_real_model_matches_a_vietnamese_passage_to_an_english_question(real_reranker):
    vietnamese, unrelated = real_reranker.score(
        "HER2 status?", ["HER2 dương tính (3+) trên hóa mô miễn dịch.", "CT ngực: không di căn xa."]
    )

    assert vietnamese > unrelated


@pytest.mark.model
def test_real_model_with_no_texts_returns_an_empty_list(real_reranker):
    assert real_reranker.score("HER2", []) == []
