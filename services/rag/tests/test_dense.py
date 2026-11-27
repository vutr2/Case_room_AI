"""Tests for dense_ranking (Handout 1, Bài 7).

The chunks are stored with fake_embed(chunk.text) vectors, and FakeEmbedder embeds the
question with the same fake_embed. So a question equal to a chunk's text gets exactly
that chunk's vector: it must come first with a score of 1.

fake_embed gives unrelated vectors to texts that differ by one character, so the
questions below are whole chunk texts, not a sentence taken from inside a chunk.
"""

import datetime as dt
import unicodedata

import pytest

from app.ingest.chunking import chunk_by_section
from app.retrieval.dense import dense_ranking
from app.schemas import IngestDocument
from app.store.chunks import DocumentRef, StoredChunk, ensure_schema, replace_chunks
from app.text import normalize

from .fakes import FakeEmbedder, fake_embed

pytestmark = pytest.mark.db

REPORT = (
    "CHẨN ĐOÁN:\nUng thư biểu mô thể ống xâm nhập, độ mô học 3.\n\n"
    "HÓA MÔ MIỄN DỊCH:\nER: âm tính (0%). PR: âm tính (0%). HER2: dương tính (3+). Ki-67: 45%.\n\n"
    "NHẬN XÉT: Ung thư vú thể HER2 dương tính."
)
CHUNKS = chunk_by_section(REPORT, 80)


def store(conn, case_room_id: str = "case-1", organization_id: str = "org-1", strategy: str = "section") -> None:
    document = IngestDocument(
        id="doc-1",
        title="Phiếu giải phẫu bệnh",
        type="PATHOLOGY_REPORT",
        date=dt.date(2026, 3, 2),
        language="vi",
        text=REPORT,
    )
    ref = DocumentRef(organization_id=organization_id, case_room_id=case_room_id, document_id="doc-1")
    replace_chunks(conn, ref, document, CHUNKS, fake_embed([c.text for c in CHUNKS]), strategy)


@pytest.fixture
def db(conn):
    ensure_schema(conn)
    return conn


@pytest.fixture
def embedder() -> FakeEmbedder:
    return FakeEmbedder()


def test_the_report_really_has_three_chunks():
    # The tests below rely on the second chunk being distinct from the others.
    assert len(CHUNKS) == 3


def test_the_chunk_matching_the_question_comes_first(db, embedder):
    store(db)
    second = CHUNKS[1]

    results = dense_ranking(db, embedder, "org-1", "case-1", second.text, 3, "section")

    best, score = results[0]
    assert isinstance(best, StoredChunk)
    assert best.part == second.part
    assert best.text == second.text
    assert score == pytest.approx(1.0, abs=1e-5)


def test_results_go_from_most_to_least_similar(db, embedder):
    store(db)

    scores = [score for _, score in dense_ranking(db, embedder, "org-1", "case-1", CHUNKS[0].text, 3, "section")]

    assert len(scores) == 3
    assert scores == sorted(scores, reverse=True)


def test_the_question_is_embedded_once_with_embed_query(db, embedder):
    store(db)

    dense_ranking(db, embedder, "org-1", "case-1", "HER2", 3, "section")

    # FakeEmbedder.embed_query goes through embed_documents, which records each call.
    assert embedder.calls == [["HER2"]]


def test_the_question_is_normalized_before_it_is_embedded(db, embedder):
    # The same words typed in decomposed Unicode (NFD), as some keyboards and PDFs produce.
    store(db)
    second = CHUNKS[1]
    nfd_question = unicodedata.normalize("NFD", second.text)
    assert nfd_question != second.text

    results = dense_ranking(db, embedder, "org-1", "case-1", nfd_question, 3, "section")

    assert embedder.calls == [[normalize(nfd_question)]]
    assert results[0][0].text == second.text
    assert results[0][1] == pytest.approx(1.0, abs=1e-5)


def test_k_limits_the_number_of_results(db, embedder):
    store(db)

    assert len(dense_ranking(db, embedder, "org-1", "case-1", "HER2", 2, "section")) == 2


def test_an_empty_case_returns_an_empty_list(db, embedder):
    store(db)

    assert dense_ranking(db, embedder, "org-1", "case-without-documents", "HER2", 3, "section") == []


def test_only_the_given_case_room_is_searched(db, embedder):
    store(db, case_room_id="case-1")
    store(db, case_room_id="case-2")

    results = dense_ranking(db, embedder, "org-1", "case-1", CHUNKS[1].text, 10, "section")

    assert {chunk.case_room_id for chunk, _ in results} == {"case-1"}
    assert len(results) == 3


def test_only_the_given_organization_is_searched(db, embedder):
    store(db, organization_id="org-2")

    assert dense_ranking(db, embedder, "org-1", "case-1", CHUNKS[1].text, 10, "section") == []


def test_only_the_given_strategy_is_searched(db, embedder):
    store(db, strategy="fixed")

    assert dense_ranking(db, embedder, "org-1", "case-1", CHUNKS[1].text, 10, "section") == []
    assert len(dense_ranking(db, embedder, "org-1", "case-1", CHUNKS[1].text, 10, "fixed")) == 3
