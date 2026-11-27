"""Tests for replace_chunks, delete_chunks, list_case_chunks and dense_search.

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
    StoredChunk,
    delete_chunks,
    dense_search,
    ensure_schema,
    list_case_chunks,
    replace_chunks,
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


def ref(case_room_id: str = "case-1", doc_id: str = "doc-1", organization_id: str = "org-1") -> DocumentRef:
    return DocumentRef(organization_id=organization_id, case_room_id=case_room_id, document_id=doc_id)


def store(conn, r: DocumentRef, doc: IngestDocument, strategy: str = "section", target: int = 80) -> int:
    """Chunk the document, embed with the fake, and replace its chunks."""
    chunks = chunk_by_section(doc.text, target)
    return replace_chunks(conn, r, doc, chunks, fake_embed([c.text for c in chunks]), strategy)


def count(conn, where: str = "TRUE", params: tuple = ()) -> int:
    return conn.execute(f"SELECT count(*) FROM chunks WHERE {where}", params).fetchone()[0]  # noqa: S608


@pytest.fixture
def db(conn):
    ensure_schema(conn)
    return conn


# --- replace_chunks: what gets written --------------------------------


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


# --- replace_chunks: replacing ----------------------------------------


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
    assert replace_chunks(db, ref(), document(), [], fake_embed([]), "section") == 0
    assert count(db) == 0


def test_only_the_given_strategy_is_replaced(db):
    store(db, ref(), document(), strategy="fixed")
    n_fixed = count(db)
    store(db, ref(), document(), strategy="section")
    store(db, ref(), document(), strategy="section")
    assert count(db, "strategy = 'fixed'") == n_fixed


# --- replace_chunks: tenant isolation ---------------------------------


def test_the_same_document_id_in_another_case_room_is_untouched(db):
    n = store(db, ref(case_room_id="case-2"), document())
    store(db, ref(case_room_id="case-1"), document())
    replace_chunks(db, ref(case_room_id="case-1"), document(), [], fake_embed([]), "section")
    assert count(db, "case_room_id = %s", ("case-2",)) == n
    assert count(db, "case_room_id = %s", ("case-1",)) == 0


def test_another_document_in_the_same_case_room_is_untouched(db):
    n = store(db, ref(doc_id="doc-2"), document(doc_id="doc-2"))
    store(db, ref(doc_id="doc-1"), document(doc_id="doc-1"))
    assert count(db, "source_id = %s", ("doc-2",)) == n


# --- replace_chunks: bad input changes nothing ------------------------


def test_wrong_number_of_vectors_is_rejected_before_touching_the_database(db):
    n = store(db, ref(), document())
    chunks = chunk_by_section(REPORT, 80)
    with pytest.raises(ValueError):
        replace_chunks(db, ref(), document(), chunks, fake_embed(["only one"]), "section")
    assert count(db) == n


def test_vectors_of_the_wrong_dimension_are_rejected(db):
    chunks = chunk_by_section(REPORT, 80)
    with pytest.raises(ValueError):
        replace_chunks(db, ref(), document(), chunks, fake_embed([c.text for c in chunks], dim=768), "section")
    assert count(db) == 0


def test_a_ref_for_another_document_is_rejected(db):
    chunks = chunk_by_section(REPORT, 80)
    with pytest.raises(ValueError):
        replace_chunks(
            db, ref(doc_id="doc-1"), document(doc_id="doc-2"), chunks, fake_embed([c.text for c in chunks]), "section"
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
        replace_chunks(db, ref(), document(), broken, fake_embed(["CHẨN", "ĐOÁN"]), "section")

    assert db.execute("SELECT text FROM chunks ORDER BY part").fetchall() == old


# --- delete_chunks ---------------------------------------------------


def test_delete_removes_every_strategy_and_returns_how_many(db):
    n_section = store(db, ref(), document(), strategy="section")
    n_fixed = store(db, ref(), document(), strategy="fixed")
    assert delete_chunks(db, ref()) == n_section + n_fixed
    assert count(db) == 0


def test_deleting_twice_is_not_an_error(db):
    store(db, ref(), document())
    delete_chunks(db, ref())
    assert delete_chunks(db, ref()) == 0


def test_deleting_an_unknown_document_returns_zero(db):
    assert delete_chunks(db, ref(doc_id="never-stored")) == 0


def test_delete_leaves_other_case_rooms_and_documents_alone(db):
    store(db, ref(case_room_id="case-1", doc_id="doc-1"), document(doc_id="doc-1"))
    n_other_case = store(db, ref(case_room_id="case-2", doc_id="doc-1"), document(doc_id="doc-1"))
    n_other_doc = store(db, ref(case_room_id="case-1", doc_id="doc-2"), document(doc_id="doc-2"))

    delete_chunks(db, ref(case_room_id="case-1", doc_id="doc-1"))

    assert count(db) == n_other_case + n_other_doc
    assert count(db, "case_room_id = 'case-1' AND source_id = 'doc-1'") == 0


def test_the_delete_is_committed(db, db_url, db_schema):
    store(db, ref(), document())
    delete_chunks(db, ref())
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
    delete_chunks(db, ref())
    assert count(db, "kind = 'guideline'") == 1


# --- list_case_chunks ---------------------------------------------------

OTHER_REPORT = "KẾT LUẬN:\nKhối u phổi thùy trên phải, EGFR L858R dương tính.\n\nĐỀ NGHỊ: Hội chẩn tiểu ban u phổi."


def test_list_returns_every_chunk_of_the_case_as_stored_chunks(db):
    store(db, ref(), document())
    chunks = chunk_by_section(REPORT, 80)

    listed = list_case_chunks(db, "org-1", "case-1", "section")

    assert all(isinstance(c, StoredChunk) for c in listed)
    assert [(c.part, c.parts, c.section, c.text) for c in listed] == [
        (c.part, c.parts, c.section, c.text) for c in chunks
    ]


def test_list_fills_every_field_from_its_column(db):
    store(db, ref(), document())

    first = list_case_chunks(db, "org-1", "case-1", "section")[0]
    row_id = db.execute("SELECT id FROM chunks WHERE part = 1").fetchone()[0]

    # Catches a SELECT whose columns are not in the same order as the StoredChunk fields.
    assert first.id == row_id
    assert first.case_room_id == "case-1"
    assert first.source_id == "doc-1"
    assert first.kind == "document"
    assert first.title == "Phiếu giải phẫu bệnh"
    assert first.doc_date == dt.date(2026, 3, 2)
    assert first.part == 1


def test_list_text_is_the_verbatim_chunk_text(db):
    store(db, ref(), document())

    for chunk in list_case_chunks(db, "org-1", "case-1", "section"):
        assert chunk.text in REPORT


def test_list_is_ordered_by_source_id_then_part(db):
    # Inserted in the "wrong" order: doc-b first, then doc-a.
    store(db, ref(doc_id="doc-b"), document("doc-b"))
    store(db, ref(doc_id="doc-a"), document("doc-a", OTHER_REPORT))

    listed = list_case_chunks(db, "org-1", "case-1", "section")
    keys = [(c.source_id, c.part) for c in listed]

    assert keys == sorted(keys)
    assert {c.source_id for c in listed} == {"doc-a", "doc-b"}


def test_list_of_an_empty_case_is_an_empty_list(db):
    store(db, ref(), document())

    assert list_case_chunks(db, "org-1", "case-without-documents", "section") == []


def test_list_never_returns_another_case_room(db):
    # The same text in two cases of the same organization.
    store(db, ref("case-1"), document())
    store(db, ref("case-2"), document())

    listed = list_case_chunks(db, "org-1", "case-1", "section")

    assert listed
    assert {c.case_room_id for c in listed} == {"case-1"}


def test_list_never_returns_another_organization_with_the_same_case_room_id(db):
    # Two hospitals may use the same case_room_id; only organization_id tells them apart.
    store(db, ref("case-1", organization_id="org-1"), document())
    store(db, ref("case-1", "doc-other", organization_id="org-2"), document("doc-other", OTHER_REPORT))

    listed = list_case_chunks(db, "org-1", "case-1", "section")

    assert listed
    assert {c.source_id for c in listed} == {"doc-1"}
    assert {c.source_id for c in list_case_chunks(db, "org-2", "case-1", "section")} == {"doc-other"}


def test_list_returns_only_the_given_strategy(db):
    store(db, ref(), document(), strategy="section")
    store(db, ref(), document(), strategy="fixed", target=40)

    section = list_case_chunks(db, "org-1", "case-1", "section")
    fixed = list_case_chunks(db, "org-1", "case-1", "fixed")

    assert len(section) == len(chunk_by_section(REPORT, 80))
    assert len(fixed) == len(chunk_by_section(REPORT, 40))
    assert len(section) != len(fixed)  # otherwise this test could not tell them apart


def test_list_never_returns_guidelines_even_with_the_same_scope(db):
    # Only `kind = 'document'` keeps this guideline out: its organization and case match.
    db.execute(
        "INSERT INTO chunks (kind, organization_id, case_room_id, source_id, title, language, strategy,"
        " part, parts, char_start, char_end, text, embedding)"
        " VALUES ('guideline', 'org-1', 'case-1', 'nccn', 'NCCN', 'en', 'section', 1, 1, 0, 4, 'HER2', %s)",
        (fake_embed(["HER2"])[0],),
    )
    store(db, ref(), document())

    assert {c.kind for c in list_case_chunks(db, "org-1", "case-1", "section")} == {"document"}


# --- dense_search -------------------------------------------------------
#
# The stored vectors come from fake_embed(chunk.text), so fake_embed([some chunk text])[0]
# is exactly that chunk's vector: searching with it must find that chunk first, score 1.


def query_for(text: str) -> np.ndarray:
    return fake_embed([text])[0]


def test_dense_finds_the_chunk_whose_vector_is_the_query(db):
    store(db, ref(), document())
    target = chunk_by_section(REPORT, 80)[1]

    results = dense_search(db, "org-1", "case-1", query_for(target.text), 3, "section")

    best, score = results[0]
    assert best.text == target.text
    assert best.part == target.part
    assert score == pytest.approx(1.0, abs=1e-5)


def test_dense_returns_stored_chunk_and_float_pairs(db):
    store(db, ref(), document())

    results = dense_search(db, "org-1", "case-1", query_for("HER2"), 3, "section")

    assert results
    for chunk, score in results:
        assert isinstance(chunk, StoredChunk)
        assert isinstance(score, float)
        assert (chunk.case_room_id, chunk.source_id, chunk.kind) == ("case-1", "doc-1", "document")
        assert chunk.title == "Phiếu giải phẫu bệnh"
        assert chunk.doc_date == dt.date(2026, 3, 2)


def test_dense_score_is_the_cosine_similarity(db):
    # Catches a score written as the distance (embedding <=> q) instead of 1 - distance.
    store(db, ref(), document())
    query = query_for("Ung thư vú")

    for chunk, score in dense_search(db, "org-1", "case-1", query, 10, "section"):
        assert score == pytest.approx(float(np.dot(query, query_for(chunk.text))), abs=1e-5)


def test_dense_results_go_from_most_to_least_similar(db):
    store(db, ref(), document())

    scores = [score for _, score in dense_search(db, "org-1", "case-1", query_for("HER2"), 10, "section")]

    assert len(scores) > 1
    assert scores == sorted(scores, reverse=True)


def test_dense_returns_at_most_k_results(db):
    store(db, ref(), document())
    total = len(chunk_by_section(REPORT, 80))
    assert total > 2

    assert len(dense_search(db, "org-1", "case-1", query_for("HER2"), 2, "section")) == 2
    assert len(dense_search(db, "org-1", "case-1", query_for("HER2"), total + 5, "section")) == total


def test_dense_in_an_empty_case_is_an_empty_list(db):
    store(db, ref(), document())

    assert dense_search(db, "org-1", "case-without-documents", query_for("HER2"), 5, "section") == []


def test_dense_never_returns_another_case_room(db):
    # The same text, so the same vectors, in two cases: case-2 rows are exactly as close.
    store(db, ref("case-1"), document())
    store(db, ref("case-2"), document())
    target = chunk_by_section(REPORT, 80)[0]

    results = dense_search(db, "org-1", "case-1", query_for(target.text), 100, "section")

    assert results
    assert {c.case_room_id for c, _ in results} == {"case-1"}
    assert len(results) == len(chunk_by_section(REPORT, 80))


def test_dense_never_returns_another_organization_with_the_same_case_room_id(db):
    store(db, ref("case-1", organization_id="org-1"), document())
    store(db, ref("case-1", "doc-other", organization_id="org-2"), document("doc-other"))
    target = chunk_by_section(REPORT, 80)[0]

    results = dense_search(db, "org-1", "case-1", query_for(target.text), 100, "section")

    assert results
    assert {c.source_id for c, _ in results} == {"doc-1"}


def test_dense_returns_only_the_given_strategy(db):
    store(db, ref(), document(), strategy="section")
    store(db, ref(), document(), strategy="fixed", target=40)
    fixed_text = chunk_by_section(REPORT, 40)[0].text

    results = dense_search(db, "org-1", "case-1", query_for(fixed_text), 100, "section")

    assert len(results) == len(chunk_by_section(REPORT, 80))
    assert {c.text for c, _ in results} == {c.text for c in chunk_by_section(REPORT, 80)}


def test_dense_never_returns_guidelines_even_with_the_same_scope(db):
    # The guideline's vector IS the query, so it would rank first if `kind` were not filtered.
    db.execute(
        "INSERT INTO chunks (kind, organization_id, case_room_id, source_id, title, language, strategy,"
        " part, parts, char_start, char_end, text, embedding)"
        " VALUES ('guideline', 'org-1', 'case-1', 'nccn', 'NCCN', 'en', 'section', 1, 1, 0, 4, 'HER2', %s)",
        (query_for("HER2"),),
    )
    store(db, ref(), document())

    results = dense_search(db, "org-1", "case-1", query_for("HER2"), 100, "section")

    assert {c.kind for c, _ in results} == {"document"}
