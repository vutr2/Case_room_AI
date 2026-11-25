from __future__ import annotations

from typing import TYPE_CHECKING

from app.store.chunks import delete_document_chunks

from ..schemas import IngestRequest, IngestResponse

if TYPE_CHECKING:
    from ..resources import Resources

from ..store.chunks import DocumentRef, replace_document_chunks
from ..text import normalize
from .chunking import chunk_by_section


def ingest_document(request: IngestRequest, res: Resources) -> IngestResponse:
    """Index one document of one case.

    Store organization_id and case_room_id on every chunk, vector and graph
    node: retrieval filters on them. Ingesting the same document id again must
    replace its previous chunks (documents are reprocessed).
    """
    settings = res.settings
    if settings.chunk_strategy != "section":
        raise NotImplementedError(f"{settings.chunk_strategy} is not supported")
    document = request.document
    text = normalize(document.text)
    chunks = chunk_by_section(text, settings.chunk_target_chars)
    vectors = res.embedder().embed([c.text for c in chunks])
    ref = DocumentRef(
        organization_id=request.organization_id,
        case_room_id=request.case_room_id,
        document_id=document.id,
    )
    with res.pool().connection() as conn:
        replace_document_chunks(conn, ref, document, settings.chunk_strategy, chunks, vectors)

    return IngestResponse(document_id=document.id, status="indexed")


def delete_document(*, organization_id: str, case_room_id: str, document_id: str, res: Resources) -> None:
    """Remove every chunk, vector and graph node of a document. Deleting twice is not an error."""
    ref = DocumentRef(organization_id=organization_id, case_room_id=case_room_id, document_id=document_id)

    with res.pool().connection() as conn:
        delete_document_chunks(conn, ref)
