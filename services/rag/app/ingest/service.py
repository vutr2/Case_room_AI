from __future__ import annotations

from typing import TYPE_CHECKING

from ..schemas import IngestDocument, IngestRequest, IngestResponse
from ..store.chunks import DocumentRef, delete_chunks, replace_chunks
from ..text import normalize
from .chunking import Chunk, chunk_text

if TYPE_CHECKING:
    from ..resources import Resources


def embedding_input(document: IngestDocument, chunk: Chunk) -> str:
    """The text the embedder reads for one chunk: the document title, a newline, then the chunk.

    The title gives each chunk context ("Pathology report") that the chunk text alone
    may lack. Only the vector uses it: the stored chunk text stays chunk.text, unchanged.
    """
    title = normalize(document.title)
    return f"{title}\n{chunk.text}"


def ingest_document(request: IngestRequest, res: Resources) -> IngestResponse:
    """Index one document of one case.

    Store organization_id and case_room_id on every chunk, vector and graph
    node: retrieval filters on them. Ingesting the same document id again must
    replace its previous chunks (documents are reprocessed).
    """
    settings = res.settings
    document = request.document
    text = normalize(document.text)
    chunks = chunk_text(text, settings.chunk_strategy, settings.chunk_target_chars)
    vectors = res.embedder().embed_documents([embedding_input(document, c) for c in chunks])
    ref = DocumentRef(
        organization_id=request.organization_id,
        case_room_id=request.case_room_id,
        document_id=document.id,
    )
    with res.pool().connection() as conn:
        replace_chunks(conn, ref, document, chunks, vectors, settings.chunk_strategy)

    return IngestResponse(document_id=document.id, status="indexed")


def delete_document(*, organization_id: str, case_room_id: str, document_id: str, res: Resources) -> None:
    """Remove every chunk, vector and graph node of a document. Deleting twice is not an error."""
    ref = DocumentRef(organization_id=organization_id, case_room_id=case_room_id, document_id=document_id)

    with res.pool().connection() as conn:
        delete_chunks(conn, ref)
