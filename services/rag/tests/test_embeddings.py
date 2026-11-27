"""Tests for app.ingest.embeddings.SentenceTransformerEmbedder.

Two layers:
- Fast tests (always run): a fake `sentence_transformers` module stands in for the real
  library, so they check how the embedder *uses* the model, without torch or a download.
- Model tests (marked `model`): load the real bge-m3. Run them with
  RAG_RUN_MODEL_TESTS=1 uv run pytest tests/test_embeddings.py
"""

import sys
import types

import numpy as np
import pytest

from app.ingest.embeddings import SentenceTransformerEmbedder

# --- A fake sentence_transformers library ------------------------------------


class FakeSentenceTransformer:
    """Mimics the parts of sentence_transformers.SentenceTransformer the embedder uses.

    Same constructor signature as the real class: `device` is keyword-only.
    Records every call so tests can check how it was used.
    """

    instances: list["FakeSentenceTransformer"] = []
    dimension = 1024

    def __init__(self, model_name_or_path=None, *, device=None, **kwargs):
        self.model_name = model_name_or_path
        self.device = device
        self.max_seq_length = 8192
        self.encode_calls: list[dict] = []
        FakeSentenceTransformer.instances.append(self)

    def get_embedding_dimension(self) -> int:
        return self.dimension

    get_sentence_embedding_dimension = get_embedding_dimension

    def encode(self, inputs, normalize_embeddings=False, **kwargs):
        self.encode_calls.append({"inputs": list(inputs), "normalize_embeddings": normalize_embeddings, **kwargs})
        rng = np.random.default_rng(len(self.encode_calls))
        # float64 and NOT unit length, unless the caller asks the model to normalize.
        vectors = rng.standard_normal((len(inputs), self.dimension)) * 3.0
        if normalize_embeddings:
            vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)
        return vectors


@pytest.fixture
def fake_model(monkeypatch):
    """Replace the `sentence_transformers` module for this test only."""
    FakeSentenceTransformer.instances = []
    FakeSentenceTransformer.dimension = 1024
    module = types.ModuleType("sentence_transformers")
    module.SentenceTransformer = FakeSentenceTransformer
    monkeypatch.setitem(sys.modules, "sentence_transformers", module)
    return FakeSentenceTransformer


def only_model(fake) -> FakeSentenceTransformer:
    assert len(fake.instances) == 1
    return fake.instances[0]


# --- Loading the model ---------------------------------------------------------


def test_loads_the_named_model_on_the_given_device(fake_model):
    SentenceTransformerEmbedder("BAAI/bge-m3", "mps")
    model = only_model(fake_model)
    assert model.model_name == "BAAI/bge-m3"
    assert model.device == "mps"


def test_loads_the_model_once_not_on_every_call(fake_model):
    embedder = SentenceTransformerEmbedder("BAAI/bge-m3", "cpu")
    embedder.embed_documents(["a"])
    embedder.embed_documents(["b"])
    assert len(fake_model.instances) == 1


def test_a_model_with_the_wrong_dimension_is_rejected_at_load_time(fake_model):
    fake_model.dimension = 768
    with pytest.raises(ValueError):
        SentenceTransformerEmbedder("some/768-dim-model", "cpu")


# --- embed() -------------------------------------------------------------------


def test_returns_one_row_of_1024_numbers_per_text(fake_model):
    vectors = SentenceTransformerEmbedder("BAAI/bge-m3", "cpu").embed_documents(["HER2 3+", "ER âm tính", "Ki-67 45%"])
    assert vectors.shape == (3, 1024)


def test_rows_are_unit_length(fake_model):
    vectors = SentenceTransformerEmbedder("BAAI/bge-m3", "cpu").embed_documents(["HER2 3+", "ER âm tính"])
    assert np.allclose(np.linalg.norm(vectors, axis=1), 1.0)


def test_returns_float32(fake_model):
    # pgvector stores float4; float32 also halves the memory of a big batch.
    vectors = SentenceTransformerEmbedder("BAAI/bge-m3", "cpu").embed_documents(["HER2 3+"])
    assert vectors.dtype == np.float32


def test_embeds_all_texts_in_one_call(fake_model):
    texts = ["CHẨN ĐOÁN: Ung thư vú.", "HÓA MÔ MIỄN DỊCH: HER2 3+.", "NHẬN XÉT: HER2 dương tính."]
    SentenceTransformerEmbedder("BAAI/bge-m3", "cpu").embed_documents(texts)
    calls = only_model(fake_model).encode_calls
    assert len(calls) == 1
    assert calls[0]["inputs"] == texts


def test_does_not_print_a_progress_bar(fake_model):
    SentenceTransformerEmbedder("BAAI/bge-m3", "cpu").embed_documents(["HER2 3+"])
    assert only_model(fake_model).encode_calls[0].get("show_progress_bar") is False


def test_accepts_any_sequence_not_only_a_list(fake_model):
    vectors = SentenceTransformerEmbedder("BAAI/bge-m3", "cpu").embed_documents(("HER2 3+", "ER âm tính"))
    assert vectors.shape == (2, 1024)


def test_no_texts_gives_an_empty_matrix_without_calling_the_model(fake_model):
    vectors = SentenceTransformerEmbedder("BAAI/bge-m3", "cpu").embed_documents([])
    assert vectors.shape == (0, 1024)
    assert vectors.dtype == np.float32
    assert only_model(fake_model).encode_calls == []


# --- The real model (RAG_RUN_MODEL_TESTS=1) ---------------------------------


def _device() -> str:
    import torch

    return "mps" if torch.backends.mps.is_available() else "cpu"


@pytest.fixture(scope="module")
def real_embedder():
    return SentenceTransformerEmbedder("BAAI/bge-m3", _device())


@pytest.mark.model
def test_real_model_gives_unit_float32_vectors(real_embedder):
    vectors = real_embedder.embed_documents(["HER2 dương tính (3+).", "ER positive (90%)."])
    assert vectors.shape == (2, 1024)
    assert vectors.dtype == np.float32
    assert np.allclose(np.linalg.norm(vectors, axis=1), 1.0, atol=1e-3)


@pytest.mark.model
def test_real_model_is_deterministic(real_embedder):
    (a,) = real_embedder.embed_documents(["Ung thư biểu mô thể ống xâm nhập."])
    (b,) = real_embedder.embed_documents(["Ung thư biểu mô thể ống xâm nhập."])
    assert np.allclose(a, b, atol=1e-4)


@pytest.mark.model
def test_vietnamese_and_english_with_the_same_meaning_are_close(real_embedder):
    her2_vi, her2_en, diabetes_vi = real_embedder.embed_documents(
        ["HER2 dương tính", "HER2 positive", "đái tháo đường type 2"]
    )
    # Unit vectors: the dot product is the cosine similarity.
    assert her2_vi @ her2_en > her2_vi @ diabetes_vi


@pytest.mark.model
def test_a_question_is_closest_to_the_passage_that_answers_it(real_embedder):
    passages = [
        "CHẨN ĐOÁN: Ung thư biểu mô thể ống xâm nhập, độ mô học 3.",
        "HÓA MÔ MIỄN DỊCH: ER âm tính (0%). PR âm tính (0%). HER2 dương tính (3+). Ki-67 45%.",
        "TIỀN SỬ: Tăng huyết áp, đang điều trị amlodipine.",
    ]
    (query,) = real_embedder.embed_documents(["Tình trạng thụ thể HER2 của bệnh nhân?"])
    scores = real_embedder.embed_documents(passages) @ query
    assert int(np.argmax(scores)) == 1
