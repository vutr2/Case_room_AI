"""Tests for app.ingest.service: ingest_document and delete_document.

They run the real chunking and the real store (pgvector, in a throwaway schema),
with a fake embedder instead of bge-m3. The last group goes through the HTTP API.
"""

import unicodedata
from collections.abc import Iterator

import numpy as np
import pytest
from fastapi.testclient import TestClient
from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

from app.config import Settings
from app.ingest.chunking import Chunk, chunk_by_section, chunk_text
from app.ingest.service import delete_document, embedding_input, ingest_document
from app.main import create_app
from app.schemas import IngestRequest, IngestResponse
from app.store.chunks import ensure_schema

from .fakes import FakeEmbedder, FakeResources, fake_embed
from .helpers import TOKEN, example

REPORT = (
    "PHIẾU KẾT QUẢ GIẢI PHẪU BỆNH\n\n"
    "CHẨN ĐOÁN:\nUng thư biểu mô thể ống xâm nhập, độ mô học 3 (Nottingham).\n\n"
    "HÓA MÔ MIỄN DỊCH:\nER: âm tính (0%). PR: âm tính (0%). HER2: dương tính (3+). Ki-67: 45%.\n\n"
    "NHẬN XÉT: Ung thư vú thể HER2 dương tính, thụ thể nội tiết âm tính."
)


TITLE = "Phiếu giải phẫu bệnh"


def settings(**overrides) -> Settings:
    return Settings(_env_file=None, rag_service_token=TOKEN, **({"chunk_target_chars": 80} | overrides))


def request(
    text: str = REPORT,
    *,
    organization_id: str = "org-1",
    case_room_id: str = "case-1",
    doc_id: str = "doc-1",
    title: str = TITLE,
) -> IngestRequest:
    return IngestRequest.model_validate(
        {
            "organizationId": organization_id,
            "caseRoomId": case_room_id,
            "document": {
                "id": doc_id,
                "title": title,
                "type": "PATHOLOGY_REPORT",
                "date": "2026-03-02",
                "language": "vi",
                "text": text,
            },
        }
    )


# --- Fixtures --------------------------------------------------------------------


@pytest.fixture
def pool(db_url: str, db_schema: str) -> Iterator[ConnectionPool]:
    """A pool like the one in app/resources.py, but pointed at the test schema."""
    with ConnectionPool(
        db_url,
        kwargs={"options": f"-c search_path={db_schema},public"},
        min_size=1,
        max_size=2,
        configure=register_vector,
        open=True,
    ) as p:
        with p.connection() as conn:
            ensure_schema(conn)
        yield p


@pytest.fixture
def res(pool: ConnectionPool) -> FakeResources:
    return FakeResources(settings(), pool=pool)


def rows(res: FakeResources, sql: str = "SELECT * FROM chunks", params: tuple = ()) -> list[tuple]:
    with res.pool().connection() as conn:
        return conn.execute(sql, params).fetchall()


def count(res: FakeResources, where: str = "TRUE", params: tuple = ()) -> int:
    return rows(res, f"SELECT count(*) FROM chunks WHERE {where}", params)[0][0]  # noqa: S608


# --- ingest_document: response -------------------------------------------------


@pytest.mark.db
def test_ingest_answers_indexed_with_the_document_id(res):
    assert ingest_document(request(), res) == IngestResponse(document_id="doc-1", status="indexed")


# --- ingest_document: what gets stored --------------------------------------------


@pytest.mark.db
def test_ingest_stores_every_chunk_of_the_document(res):
    ingest_document(request(), res)
    expected = chunk_by_section(REPORT, 80)
    assert len(expected) > 1  # the report really is split
    stored = rows(res, "SELECT part, parts, section, char_start, char_end, text FROM chunks ORDER BY part")
    assert stored == [(c.part, c.parts, c.section, c.start, c.end, c.text) for c in expected]


@pytest.mark.db
def test_every_chunk_carries_the_organization_case_room_and_document(res):
    ingest_document(request(organization_id="org-7", case_room_id="case-9", doc_id="doc-3"), res)
    assert set(rows(res, "SELECT kind, organization_id, case_room_id, source_id FROM chunks")) == {
        ("document", "org-7", "case-9", "doc-3")
    }


@pytest.mark.db
def test_chunks_are_stored_under_the_configured_strategy(res):
    ingest_document(request(), res)
    assert set(rows(res, "SELECT strategy FROM chunks")) == {("section",)}


@pytest.mark.db
def test_the_configured_chunk_size_is_used(pool):
    small = FakeResources(settings(chunk_target_chars=60), pool=pool)
    ingest_document(request(doc_id="small"), small)
    large = FakeResources(settings(chunk_target_chars=5000), pool=pool)
    ingest_document(request(doc_id="large"), large)
    assert count(large, "source_id = 'large'") == 1
    assert count(small, "source_id = 'small'") > 1


@pytest.mark.db
def test_decomposed_vietnamese_is_stored_composed(res):
    # Text pasted from some PDFs and Macs is NFD: "ư" is "u" + a combining horn.
    ingest_document(request(unicodedata.normalize("NFD", REPORT)), res)
    for (text,) in rows(res, "SELECT text FROM chunks"):
        assert text == unicodedata.normalize("NFC", text)
    assert any("Ung thư" in t for (t,) in rows(res, "SELECT text FROM chunks"))


@pytest.mark.db
def test_positions_point_into_the_normalized_text(res):
    nfd = unicodedata.normalize("NFD", REPORT.replace("\n", "\r\n"))
    ingest_document(request(nfd), res)
    normalized = unicodedata.normalize("NFC", REPORT)
    for start, end, text in rows(res, "SELECT char_start, char_end, text FROM chunks"):
        assert normalized[start:end] == text


@pytest.mark.db
def test_windows_line_endings_do_not_reach_the_store(res):
    ingest_document(request(REPORT.replace("\n", "\r\n")), res)
    assert all("\r" not in t for (t,) in rows(res, "SELECT text FROM chunks"))


# --- ingest_document: embedding -------------------------------------------------


@pytest.mark.db
def test_all_chunks_are_embedded_in_one_call_with_the_title_in_front(res):
    ingest_document(request(), res)
    assert res.embedder().calls == [[f"{TITLE}\n{c.text}" for c in chunk_by_section(REPORT, 80)]]


@pytest.mark.db
def test_each_chunk_is_stored_with_the_vector_of_its_embedding_input(res):
    ingest_document(request(), res)
    for text, embedding in rows(res, "SELECT text, embedding FROM chunks"):
        assert np.allclose(embedding.to_numpy(), fake_embed([f"{TITLE}\n{text}"])[0], atol=1e-6)


@pytest.mark.db
def test_the_title_is_embedded_but_never_stored_in_the_text(res):
    # The web app checks quotes against the stored text: it must stay verbatim.
    ingest_document(request(title="Core biopsy pathology report"), res)
    for start, end, text in rows(res, "SELECT char_start, char_end, text FROM chunks"):
        assert "Core biopsy pathology report" not in text
        assert REPORT[start:end] == text


@pytest.mark.db
def test_a_new_title_changes_the_vectors_of_the_same_text(res):
    ingest_document(request(title="Sinh thiết lõi kim"), res)
    before = rows(res, "SELECT part, embedding FROM chunks ORDER BY part")
    ingest_document(request(title="Bệnh phẩm sau mổ"), res)
    after = rows(res, "SELECT part, embedding FROM chunks ORDER BY part")
    assert [p for p, _ in before] == [p for p, _ in after]
    for (_, old), (_, new) in zip(before, after, strict=True):
        assert not np.allclose(old.to_numpy(), new.to_numpy())


# --- embedding_input (no database needed) -----------------------------------------


def chunk(text: str = "ER positive (90%), HER2 3+", section: str | None = "BIOMARKERS") -> Chunk:
    return Chunk(part=1, parts=1, start=0, end=len(text), section=section, text=text)


def test_embedding_input_is_the_title_then_the_chunk_text():
    doc = request(title="Core biopsy pathology report").document
    assert embedding_input(doc, chunk()) == "Core biopsy pathology report\nER positive (90%), HER2 3+"


def test_embedding_input_keeps_the_chunk_text_verbatim():
    text = "  HER2: dương tính (3+).\nKi-67: 45%.  "
    assert embedding_input(request().document, chunk(text)).endswith("\n" + text)


def test_embedding_input_normalizes_a_decomposed_title():
    nfd_title = unicodedata.normalize("NFD", "Phiếu giải phẫu bệnh")
    result = embedding_input(request(title=nfd_title).document, chunk())
    assert result.startswith(unicodedata.normalize("NFC", "Phiếu giải phẫu bệnh") + "\n")


def test_embedding_input_does_not_change_the_chunk_or_document():
    doc, c = request().document, chunk()
    embedding_input(doc, c)
    assert c.text == "ER positive (90%), HER2 3+"
    assert doc.title == TITLE


# --- ingest_document: reprocessing ---------------------------------------------


@pytest.mark.db
def test_ingesting_the_same_document_twice_does_not_duplicate(res):
    ingest_document(request(), res)
    n = count(res)
    ingest_document(request(), res)
    assert count(res) == n


@pytest.mark.db
def test_a_new_version_of_the_document_replaces_the_old_one(res):
    ingest_document(request(), res)
    ingest_document(request("CHẨN ĐOÁN: Viêm mạn tính, không có tế bào ác tính."), res)
    assert rows(res, "SELECT text FROM chunks") == [("CHẨN ĐOÁN: Viêm mạn tính, không có tế bào ác tính.",)]


@pytest.mark.db
def test_a_blank_new_version_removes_the_old_chunks(res):
    ingest_document(request(), res)
    assert ingest_document(request("   \n\n  "), res).status == "indexed"
    assert count(res) == 0


# --- ingest_document: tenant isolation ----------------------------------------


@pytest.mark.db
def test_the_same_document_id_in_two_case_rooms_is_stored_twice(res):
    ingest_document(request(case_room_id="case-1"), res)
    ingest_document(request(case_room_id="case-2"), res)
    assert count(res, "case_room_id = 'case-1'") == count(res, "case_room_id = 'case-2'") > 0


@pytest.mark.db
def test_reingesting_in_one_case_room_leaves_the_other_alone(res):
    ingest_document(request(case_room_id="case-2"), res)
    n = count(res, "case_room_id = 'case-2'")
    ingest_document(request("CHẨN ĐOÁN: Viêm mạn tính.", case_room_id="case-1"), res)
    assert count(res, "case_room_id = 'case-2'") == n


# --- ingest_document: chunking strategy -------------------------------------------


@pytest.mark.db
def test_the_fixed_strategy_stores_fixed_chunks_without_sections(pool):
    fixed = FakeResources(settings(chunk_strategy="fixed"), pool=pool)
    ingest_document(request(), fixed)
    stored = rows(fixed, "SELECT strategy, section, part, text FROM chunks ORDER BY part")
    assert [(s, sec, p, t) for s, sec, p, t in stored] == [
        ("fixed", None, c.part, c.text) for c in chunk_text(REPORT, "fixed")
    ]


@pytest.mark.db
def test_section_and_fixed_chunks_of_one_document_live_side_by_side(pool):
    # Bài 9 indexes the same documents with both strategies to compare them.
    ingest_document(request(), FakeResources(settings(chunk_strategy="section"), pool=pool))
    ingest_document(request(), FakeResources(settings(chunk_strategy="fixed"), pool=pool))
    strategies = rows(FakeResources(settings(), pool=pool), "SELECT DISTINCT strategy FROM chunks ORDER BY 1")
    assert strategies == [("fixed",), ("section",)]


# --- delete_document -----------------------------------------------------------


def delete(res, *, organization_id="org-1", case_room_id="case-1", doc_id="doc-1") -> None:
    delete_document(organization_id=organization_id, case_room_id=case_room_id, document_id=doc_id, res=res)


@pytest.mark.db
def test_delete_removes_the_documents_chunks(res):
    ingest_document(request(), res)
    delete(res)
    assert count(res) == 0


@pytest.mark.db
def test_deleting_twice_or_an_unknown_document_is_not_an_error(res):
    ingest_document(request(), res)
    delete(res)
    delete(res)
    delete(res, doc_id="never-ingested")
    assert count(res) == 0


@pytest.mark.db
def test_delete_leaves_other_documents_and_case_rooms_alone(res):
    ingest_document(request(case_room_id="case-1", doc_id="doc-1"), res)
    ingest_document(request(case_room_id="case-1", doc_id="doc-2"), res)
    ingest_document(request(case_room_id="case-2", doc_id="doc-1"), res)

    delete(res, case_room_id="case-1", doc_id="doc-1")

    assert set(rows(res, "SELECT DISTINCT case_room_id, source_id FROM chunks")) == {
        ("case-1", "doc-2"),
        ("case-2", "doc-1"),
    }


@pytest.mark.db
def test_delete_does_not_need_the_embedding_model(pool):
    class NoModel(FakeEmbedder):
        def embed(self, texts):
            raise AssertionError("delete must not embed anything")

    delete(FakeResources(settings(), pool=pool, embedder=NoModel()))


# --- Through the HTTP API ----------------------------------------------------


@pytest.fixture
def api(res: FakeResources) -> TestClient:
    return TestClient(create_app(res.settings, resources=res))


AUTH = {"Authorization": f"Bearer {TOKEN}"}
DOC_PATH = "/v1/organizations/org_synthetic_riverside/cases/case_synthetic_001/documents/doc_synthetic_pathology"


@pytest.mark.db
def test_post_ingest_indexes_the_contract_example(api, res):
    response = api.post("/v1/ingest", json=example("ingest-request"), headers=AUTH)
    assert response.status_code == 202
    assert response.json() == {"documentId": "doc_synthetic_pathology", "status": "indexed"}
    assert count(res, "source_id = 'doc_synthetic_pathology'") > 0


@pytest.mark.db
def test_delete_route_removes_the_document_and_answers_204(api, res):
    api.post("/v1/ingest", json=example("ingest-request"), headers=AUTH)
    response = api.delete(DOC_PATH, headers=AUTH)
    assert response.status_code == 204
    assert count(res) == 0
    assert api.delete(DOC_PATH, headers=AUTH).status_code == 204  # deleting again is fine


def test_ingest_route_needs_the_service_token():
    api = TestClient(create_app(settings(), resources=FakeResources(settings(), pool=None)))
    assert api.post("/v1/ingest", json=example("ingest-request")).status_code == 401
    assert api.delete(DOC_PATH).status_code == 401
