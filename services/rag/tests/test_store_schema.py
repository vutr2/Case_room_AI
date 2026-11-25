"""Tests for app.store.chunks.ensure_schema.

Each test runs in its own empty Postgres schema (see the `conn` fixture in conftest.py),
so the real `chunks` table is never touched.
"""

import psycopg
import pytest
from psycopg import errors, sql

from app.store.chunks import ensure_schema

from .helpers import connect_to

pytestmark = pytest.mark.db

ONES = "[" + ",".join(["1"] * 1024) + "]"


def insert_row(conn: psycopg.Connection, **overrides) -> None:
    """Insert one row with valid defaults; pass keyword arguments to change columns."""
    row = {
        "kind": "document",
        "organization_id": "org-1",
        "case_room_id": "case-1",
        "source_id": "doc-1",
        "title": "Pathology report",
        "language": "vi",
        "strategy": "section",
        "part": 1,
        "parts": 1,
        "char_start": 0,
        "char_end": 10,
        "text": "HER2 3+.",
        "embedding": ONES,
    } | overrides
    query = sql.SQL("INSERT INTO chunks ({}) VALUES ({})").format(
        sql.SQL(", ").join(map(sql.Identifier, row)),
        sql.SQL(", ").join(sql.Placeholder() * len(row)),
    )
    conn.execute(query, list(row.values()))


def tables(conn: psycopg.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()"
    ).fetchall()
    return [r[0] for r in rows]


# --- The table exists --------------------------------------------------------


def test_creates_the_chunks_table(conn):
    assert "chunks" not in tables(conn)
    ensure_schema(conn)
    assert "chunks" in tables(conn)


def test_running_twice_does_not_fail(conn):
    ensure_schema(conn)
    ensure_schema(conn)
    assert "chunks" in tables(conn)


def test_the_table_is_committed(conn, db_url, db_schema):
    # A second, separate connection only sees the table if ensure_schema committed.
    ensure_schema(conn)
    with connect_to(db_url, db_schema) as other:
        assert "chunks" in tables(other)


def test_running_again_keeps_existing_rows(conn):
    ensure_schema(conn)
    insert_row(conn)
    conn.commit()

    ensure_schema(conn)

    assert conn.execute("SELECT count(*) FROM chunks").fetchone()[0] == 1


# --- The table has the right shape ----------------------------------------


def test_embedding_is_a_1024_dimension_vector(conn):
    ensure_schema(conn)
    kind = conn.execute(
        "SELECT format_type(atttypid, atttypmod) FROM pg_attribute "
        "WHERE attrelid = 'chunks'::regclass AND attname = 'embedding'"
    ).fetchone()[0]
    assert kind == "vector(1024)"


def test_creates_the_scope_and_embedding_indexes(conn):
    ensure_schema(conn)
    rows = conn.execute(
        "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'chunks'"
    ).fetchall()
    indexes = dict(rows)
    assert "chunks_scope_idx" in indexes
    assert "hnsw" in indexes["chunks_embedding_idx"]
    assert "vector_cosine_ops" in indexes["chunks_embedding_idx"]


# --- The constraints protect the data ----------------------------------------


def test_the_same_chunk_cannot_be_stored_twice(conn):
    ensure_schema(conn)
    insert_row(conn)
    with pytest.raises(errors.UniqueViolation):
        insert_row(conn)


def test_the_same_document_id_may_exist_in_two_case_rooms(conn):
    ensure_schema(conn)
    insert_row(conn, case_room_id="case-1")
    insert_row(conn, case_room_id="case-2")
    assert conn.execute("SELECT count(*) FROM chunks").fetchone()[0] == 2


def test_a_guideline_without_organization_is_still_unique(conn):
    # organization_id and case_room_id are NULL for guidelines.
    # Without NULLS NOT DISTINCT, Postgres would accept this duplicate.
    ensure_schema(conn)
    guideline = {"kind": "guideline", "organization_id": None, "case_room_id": None}
    insert_row(conn, **guideline)
    with pytest.raises(errors.UniqueViolation):
        insert_row(conn, **guideline)


def test_a_case_document_must_have_organization_and_case_room(conn):
    ensure_schema(conn)
    with pytest.raises(errors.CheckViolation):
        insert_row(conn, kind="document", organization_id=None)


def test_kind_must_be_a_known_value(conn):
    ensure_schema(conn)
    with pytest.raises(errors.CheckViolation):
        insert_row(conn, kind="email")
