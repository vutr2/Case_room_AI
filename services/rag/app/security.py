"""Service-to-service authentication.

Only the web app calls this service. It authorizes the user and checks case
access first, then sends the shared token. The token proves the caller is the
web app; it does not replace the per-case filter every query must apply.
"""

import hmac
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings

_bearer = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    """FastAPI dependency: the Settings object stored on the app in create_app."""
    return request.app.state.settings


def require_service_token(
    settings: Annotated[Settings, Depends(get_settings)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> None:
    """Reject the request with 401 unless it carries `Authorization: Bearer <RAG_SERVICE_TOKEN>`.

    hmac.compare_digest compares in constant time, so the response time does not leak
    how many leading characters of a guessed token were right.
    """
    expected = settings.rag_service_token.get_secret_value().encode()
    supplied = credentials.credentials.encode() if credentials else b""
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
