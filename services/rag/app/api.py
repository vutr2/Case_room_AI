"""HTTP routes. Thin: validate, call the pipeline, return the contract model."""

from fastapi import APIRouter, Depends, Response, status

from .ingest import delete_document, ingest_document
from .retrieval import retrieve
from .schemas import IngestRequest, IngestResponse, RetrieveRequest, RetrieveResponse
from .security import require_service_token

router = APIRouter(prefix="/v1", dependencies=[Depends(require_service_token)])


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
def ingest(request: IngestRequest) -> IngestResponse:
    """Index one case document (called after the web app has processed an upload)."""
    return ingest_document(request)


@router.delete(
    "/organizations/{organization_id}/cases/{case_room_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(organization_id: str, case_room_id: str, document_id: str) -> Response:
    """Remove a deleted document from every index."""
    delete_document(organization_id=organization_id, case_room_id=case_room_id, document_id=document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/retrieve")
def retrieve_passages(request: RetrieveRequest) -> RetrieveResponse:
    """Return the passages most relevant to a question, from one case and shared knowledge."""
    return retrieve(request)
