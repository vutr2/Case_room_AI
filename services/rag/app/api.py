"""HTTP routes. Thin: validate, call the pipeline, return the contract model."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from .ingest import delete_document, ingest_document
from .resources import Resources
from .retrieval import retrieve
from .schemas import IngestRequest, IngestResponse, RetrieveRequest, RetrieveResponse
from .security import require_service_token

router = APIRouter(prefix="/v1", dependencies=[Depends(require_service_token)])


def get_resources(request: Request) -> Resources:
    return request.app.state.resources


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
def ingest(request: IngestRequest, res: Annotated[Resources, Depends(get_resources)]) -> IngestResponse:
    """Index one case document (called after the web app has processed an upload)."""
    return ingest_document(request, res)


@router.delete(
    "/organizations/{organization_id}/cases/{case_room_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    organization_id: str, case_room_id: str, document_id: str, res: Annotated[Resources, Depends(get_resources)]
) -> Response:
    """Remove a deleted document from every index."""
    delete_document(organization_id=organization_id, case_room_id=case_room_id, document_id=document_id, res=res)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/retrieve")
def retrieve_passages(request: RetrieveRequest, res: Annotated[Resources, Depends(get_resources)]) -> RetrieveResponse:
    """Return the passages most relevant to a question, from one case and shared knowledge."""
    return retrieve(request, res)
