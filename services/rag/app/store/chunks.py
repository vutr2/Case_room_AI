from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
from psycopg import Connection

from ..ingest.chunking import Chunk
from ..schemas import IngestDocument

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


@dataclass(frozen=True)
class DocumentRef:
    """Which document a store operation is about: organization, case room and document id together."""

    organization_id: str
    case_room_id: str
    document_id: str


@dataclass(frozen=True)
class StoredChunk:
    """One row of the chunks table, as retrieval reads it back (Handout 1, Bài 4).

    case_room_id and doc_date are None for shared knowledge (guidelines, literature).
    """

    id: int
    case_room_id: str | None
    source_id: str
    kind: str
    title: str
    doc_date: date | None
    part: int
    parts: int
    section: str | None
    text: str


def ensure_schema(conn: Connection) -> None:
    """Create the pgvector extension, the chunks table and its indexes if missing."""
    with conn.transaction():
        conn.execute(SCHEMA_PATH.read_text(encoding="utf-8"))


def replace_chunks(
    conn: Connection,
    ref: DocumentRef,
    document: IngestDocument,
    chunks: Sequence[Chunk],
    vectors: np.ndarray,
    strategy: str,
) -> int:
    """Replace every chunk of one document (for one strategy) in a single transaction.

    Returns the number of chunks inserted.
    """
    if ref.document_id != document.id:
        raise ValueError(f"Document id mismatch: ref has {ref.document_id!r}, document has {document.id!r}")
    expected_shape = (len(chunks), 1024)
    if vectors.shape != expected_shape:
        raise ValueError(f"Expected vectors shape {expected_shape}; got {vectors.shape}")

    rows = [
        (
            ref.organization_id,
            ref.case_room_id,
            ref.document_id,
            document.title,
            document.type,
            document.date,
            document.language,
            strategy,
            chunk.part,
            chunk.parts,
            chunk.section,
            chunk.start,
            chunk.end,
            chunk.text,
            vectors[index],
        )
        for index, chunk in enumerate(chunks)
    ]

    with conn.transaction(), conn.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM chunks
            WHERE kind = 'document'
              AND organization_id = %s
              AND case_room_id = %s
              AND source_id = %s
              AND strategy = %s
            """,
            (ref.organization_id, ref.case_room_id, ref.document_id, strategy),
        )

        if rows:
            cursor.executemany(
                """
                INSERT INTO chunks (
                    kind, organization_id, case_room_id, source_id,
                    title, doc_type, doc_date, language, strategy,
                    part, parts, section, char_start, char_end, text, embedding
                )
                VALUES (
                    'document', %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s
                )
                """,
                rows,
            )

    return len(rows)


def delete_chunks(conn: Connection, ref: DocumentRef) -> int:
    """Delete every chunk of one document, whatever the strategy. Returns the rows deleted."""
    with conn.transaction():
        cursor = conn.execute(
            """
            DELETE FROM chunks
            WHERE kind = 'document'
              AND organization_id = %s
              AND case_room_id = %s
              AND source_id = %s
            """,
            (ref.organization_id, ref.case_room_id, ref.document_id),
        )
    return cursor.rowcount


def list_case_chunks(conn: Connection, organization_id: str, case_room_id: str, strategy: str) -> list[StoredChunk]:
    """Every chunk of one case, ordered by source_id then part (Handout 1, Bài 4)."""
    raise NotImplementedError("Bài 4: list_case_chunks")


def dense_search(
    conn: Connection, organization_id: str, case_room_id: str, query_vector: np.ndarray, k: int, strategy: str
) -> list[tuple[StoredChunk, float]]:
    """The k chunks of one case closest to query_vector, with their cosine similarity (Handout 1, Bài 4)."""
    raise NotImplementedError("Bài 4: dense_search")
