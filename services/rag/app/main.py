"""Application factory. Run with: uv run uvicorn app.main:create_app --factory --reload"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from .api import router
from .config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Case Room RAG", version="0.1.0")
    # Read once at startup: a missing or short RAG_SERVICE_TOKEN stops the service here.
    app.state.settings = settings or Settings()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.exception_handler(NotImplementedError)
    async def not_implemented(_: Request, error: NotImplementedError) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_501_NOT_IMPLEMENTED, content={"detail": str(error)})

    app.include_router(router)
    return app
