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
    organization_id: str
    case_room_id: str
    document_id: str


@dataclass(frozen=True)
class StoredChunk:
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


def replace_document_chunks(
    conn: Connection,
    ref: DocumentRef,
    document: IngestDocument,
    strategy: str,
    chunks: Sequence[Chunk],
    embeddings: np.ndarray,
) -> int:
    """Replace every chunk of one document (for one strategy) in a single transaction.

    Returns the number of chunks inserted.
    """
    if ref.document_id != document.id:
        raise ValueError(f"Document id mismatch: ref has {ref.document_id!r}, document has {document.id!r}")
    expected_shape = (len(chunks), 1024)
    if embeddings.shape != expected_shape:
        raise ValueError(f"Expected embeddings shape {expected_shape}; got {embeddings.shape}")

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
            embeddings[index],
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


def delete_document_chunks(conn: Connection, ref: DocumentRef) -> int:
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
