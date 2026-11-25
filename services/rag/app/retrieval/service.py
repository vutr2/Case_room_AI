"""Entry point called by the API. Replace the body with your pipeline."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ..schemas import RetrieveRequest, RetrieveResponse

if TYPE_CHECKING:
    from ..resources import Resources


def retrieve(request: RetrieveRequest, res: Resources) -> RetrieveResponse:
    """Return up to request.limit passages for request.query.

    "document" passages must come only from request.case_room_id within
    request.organization_id: filter in the database query itself, not after it.
    The web app has already checked that the user may open this case.
    Return text exactly as stored: the web app verifies quotes against it.
    """
    raise NotImplementedError("Retrieval is not built yet (services/rag/app/retrieval/service.py).")
