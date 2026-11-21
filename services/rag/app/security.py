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
    return request.app.state.settings


def require_service_token(
    settings: Annotated[Settings, Depends(get_settings)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> None:
    expected = settings.rag_service_token.get_secret_value().encode()
    supplied = credentials.credentials.encode() if credentials else b""
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
