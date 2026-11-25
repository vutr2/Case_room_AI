"""Tests for replace_document_chunks and delete_document_chunks.

Each test runs in its own empty Postgres schema (the `conn` fixture in conftest.py).
"""

import datetime as dt

import numpy as np
import pytest
from psycopg import errors

from app.ingest.chunking import Chunk, chunk_by_section
from app.schemas import IngestDocument
from app.store.chunks import (
    DocumentRef,
    delete_document_chunks,
    ensure_schema,
    replace_document_chunks,
)

from .fakes import fake_embed
from .helpers import connect_to

pytestmark = pytest.mark.db

REPORT = (
    "CHẨN ĐOÁN:\nUng thư biểu mô thể ống xâm nhập, độ mô học 3.\n\n"
    "HÓA MÔ MIỄN DỊCH:\nER: âm tính (0%). PR: âm tính (0%). HER2: dương tính (3+). Ki-67: 45%.\n\n"
    "NHẬN XÉT: Ung thư vú thể HER2 dương tính."
)


def document(doc_id: str = "doc-1", text: str = REPORT) -> IngestDocument:
    return IngestDocument(
        id=doc_id,
        title="Phiếu giải phẫu bệnh",
        type="PATHOLOGY_REPORT",
        date=dt.date(2026, 3, 2),
        language="vi",
        text=text,
    )


def ref(case_room_id: str = "case-1", doc_id: str = "doc-1") -> DocumentRef:
    return DocumentRef(organization_id="org-1", case_room_id=case_room_id, document_id=doc_id)


def store(conn, r: DocumentRef, doc: IngestDocument, strategy: str = "section", target: int = 80) -> int:
    """Chunk the document, embed with the fake, and replace its chunks."""
    chunks = chunk_by_section(doc.text, target)
    return replace_document_chunks(conn, r, doc, strategy, chunks, fake_embed([c.text for c in chunks]))


def count(conn, where: str = "TRUE", params: tuple = ()) -> int:
    return conn.execute(f"SELECT count(*) FROM chunks WHERE {where}", params).fetchone()[0]  # noqa: S608


@pytest.fixture
def db(conn):
    ensure_schema(conn)
    return conn


# --- replace_document_chunks: what gets written --------------------------------


def test_inserts_every_chunk_and_returns_how_many(db):
    expected = len(chunk_by_section(REPORT, 80))
    assert expected > 1  # the report really is split
    assert store(db, ref(), document()) == expected
    assert count(db) == expected


def test_rows_carry_the_document_and_chunk_fields(db):
    store(db, ref(), document())
    chunks = chunk_by_section(REPORT, 80)
    rows = db.execute(
        "SELECT kind, organization_id, case_room_id, source_id, title, doc_type, doc_date, language,"
        " strategy, part, parts, section, char_start, char_end, text FROM chunks ORDER BY part"
    ).fetchall()
    assert rows == [
        (
            "document",
            "org-1",
            "case-1",
            "doc-1",
            "Phiếu giải phẫu bệnh",
            "PATHOLOGY_REPORT",
            dt.date(2026, 3, 2),
            "vi",
            "section",
            c.part,
            c.parts,
            c.section,
            c.start,
            c.end,
            c.text,
        )
        for c in chunks
    ]


def test_stored_text_is_the_verbatim_slice_of_the_document(db):
    store(db, ref(), document())
    for start, end, text in db.execute("SELECT char_start, char_end, text FROM chunks").fetchall():
        assert REPORT[start:end] == text


def test_each_row_stores_the_vector_of_its_own_chunk(db):
    store(db, ref(), document())
    for text, embedding in db.execute("SELECT text, embedding FROM chunks").fetchall():
        assert np.allclose(embedding.to_numpy(), fake_embed([text])[0], atol=1e-6)


def test_the_chunks_are_committed(db, db_url, db_schema):
    store(db, ref(), document())
    with connect_to(db_url, db_schema) as other:
        assert count(other) == len(chunk_by_section(REPORT, 80))


# --- replace_document_chunks: replacing ----------------------------------------


def test_storing_the_same_document_twice_does_not_duplicate(db):
    n = store(db, ref(), document())
    store(db, ref(), document())
    assert count(db) == n


def test_a_shorter_new_version_leaves_no_old_parts_behind(db):
    store(db, ref(), document())
    store(db, ref(), document(text="CHẨN ĐOÁN: Viêm mạn tính."))
    assert db.execute("SELECT text FROM chunks").fetchall() == [("CHẨN ĐOÁN: Viêm mạn tính.",)]


def test_replacing_with_no_chunks_removes_the_document(db):
    store(db, ref(), document())
    assert replace_document_chunks(db, ref(), document(), "section", [], fake_embed([])) == 0
    assert count(db) == 0


def test_only_the_given_strategy_is_replaced(db):
    store(db, ref(), document(), strategy="fixed")
    n_fixed = count(db)
    store(db, ref(), document(), strategy="section")
    store(db, ref(), document(), strategy="section")
    assert count(db, "strategy = 'fixed'") == n_fixed


# --- replace_document_chunks: tenant isolation ---------------------------------


def test_the_same_document_id_in_another_case_room_is_untouched(db):
    n = store(db, ref(case_room_id="case-2"), document())
    store(db, ref(case_room_id="case-1"), document())
    replace_document_chunks(db, ref(case_room_id="case-1"), document(), "section", [], fake_embed([]))
    assert count(db, "case_room_id = %s", ("case-2",)) == n
    assert count(db, "case_room_id = %s", ("case-1",)) == 0


def test_another_document_in_the_same_case_room_is_untouched(db):
    n = store(db, ref(doc_id="doc-2"), document(doc_id="doc-2"))
    store(db, ref(doc_id="doc-1"), document(doc_id="doc-1"))
    assert count(db, "source_id = %s", ("doc-2",)) == n


# --- replace_document_chunks: bad input changes nothing ------------------------


def test_wrong_number_of_vectors_is_rejected_before_touching_the_database(db):
    n = store(db, ref(), document())
    chunks = chunk_by_section(REPORT, 80)
    with pytest.raises(ValueError):
        replace_document_chunks(db, ref(), document(), "section", chunks, fake_embed(["only one"]))
    assert count(db) == n


def test_vectors_of_the_wrong_dimension_are_rejected(db):
    chunks = chunk_by_section(REPORT, 80)
    with pytest.raises(ValueError):
        replace_document_chunks(db, ref(), document(), "section", chunks, fake_embed([c.text for c in chunks], dim=768))
    assert count(db) == 0


def test_a_ref_for_another_document_is_rejected(db):
    chunks = chunk_by_section(REPORT, 80)
    with pytest.raises(ValueError):
        replace_document_chunks(
            db, ref(doc_id="doc-1"), document(doc_id="doc-2"), "section", chunks, fake_embed([c.text for c in chunks])
        )
    assert count(db) == 0


def test_a_failing_insert_rolls_back_and_keeps_the_old_chunks(db):
    store(db, ref(), document())
    old = db.execute("SELECT text FROM chunks ORDER BY part").fetchall()
    db.commit()

    # `part` is NOT NULL, so the second row fails after the DELETE already ran.
    broken = [
        Chunk(part=1, parts=2, start=0, end=5, section=None, text="CHẨN"),
        Chunk(part=None, parts=2, start=5, end=10, section=None, text="ĐOÁN"),  # type: ignore[arg-type]
    ]
    with pytest.raises(errors.NotNullViolation):
        replace_document_chunks(db, ref(), document(), "section", broken, fake_embed(["CHẨN", "ĐOÁN"]))

    assert db.execute("SELECT text FROM chunks ORDER BY part").fetchall() == old


# --- delete_document_chunks ---------------------------------------------------


def test_delete_removes_every_strategy_and_returns_how_many(db):
    n_section = store(db, ref(), document(), strategy="section")
    n_fixed = store(db, ref(), document(), strategy="fixed")
    assert delete_document_chunks(db, ref()) == n_section + n_fixed
    assert count(db) == 0


def test_deleting_twice_is_not_an_error(db):
    store(db, ref(), document())
    delete_document_chunks(db, ref())
    assert delete_document_chunks(db, ref()) == 0


def test_deleting_an_unknown_document_returns_zero(db):
    assert delete_document_chunks(db, ref(doc_id="never-stored")) == 0


def test_delete_leaves_other_case_rooms_and_documents_alone(db):
    store(db, ref(case_room_id="case-1", doc_id="doc-1"), document(doc_id="doc-1"))
    n_other_case = store(db, ref(case_room_id="case-2", doc_id="doc-1"), document(doc_id="doc-1"))
    n_other_doc = store(db, ref(case_room_id="case-1", doc_id="doc-2"), document(doc_id="doc-2"))

    delete_document_chunks(db, ref(case_room_id="case-1", doc_id="doc-1"))

    assert count(db) == n_other_case + n_other_doc
    assert count(db, "case_room_id = 'case-1' AND source_id = 'doc-1'") == 0


def test_the_delete_is_committed(db, db_url, db_schema):
    store(db, ref(), document())
    delete_document_chunks(db, ref())
    with connect_to(db_url, db_schema) as other:
        assert count(other) == 0


def test_delete_never_touches_shared_guidelines(db):
    # A guideline that happens to use the same source id must survive a document delete.
    db.execute(
        "INSERT INTO chunks (kind, source_id, title, language, strategy, part, parts,"
        " char_start, char_end, text, embedding)"
        " VALUES ('guideline', 'doc-1', 'NCCN', 'en', 'section', 1, 1, 0, 4, 'HER2', %s)",
        (fake_embed(["HER2"])[0],),
    )
    store(db, ref(), document())
    delete_document_chunks(db, ref())
    assert count(db, "kind = 'guideline'") == 1
