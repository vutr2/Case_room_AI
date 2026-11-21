"""Entry points called by the API. Replace the bodies with your pipeline."""

from ..schemas import IngestRequest, IngestResponse


def ingest_document(request: IngestRequest) -> IngestResponse:
    """Index one document of one case.

    Store organization_id and case_room_id on every chunk, vector and graph
    node: retrieval filters on them. Ingesting the same document id again must
    replace its previous chunks (documents are reprocessed).
    """
    raise NotImplementedError("Ingestion is not built yet (services/rag/app/ingest/service.py).")


def delete_document(*, organization_id: str, case_room_id: str, document_id: str) -> None:
    """Remove every chunk, vector and graph node of a document. Deleting twice is not an error."""
    raise NotImplementedError("Document deletion is not built yet (services/rag/app/ingest/service.py).")
