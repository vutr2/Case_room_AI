"""Application factory. Run with: uv run uvicorn app.main:create_app --factory --reload"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from .api import router
from .config import Settings
from .resources import Resources
from .store.chunks import ensure_schema


def create_app(settings: Settings | None = None, resources: Resources | None = None) -> FastAPI:

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # StartUp: runs once before the app starts accepting request
        with app.state.resources.pool().connection() as conn:
            ensure_schema(conn)

        # make sure that the schema is always automatically closed
        try:
            yield
        finally:
            app.state.resources.close()

    app = FastAPI(title="Case Room RAG", version="0.1.0", lifespan=lifespan)
    # Read once at startup: a missing or short RAG_SERVICE_TOKEN stops the service here.
    app.state.settings = settings or Settings()
    app.state.resources = resources or Resources(app.state.settings)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.exception_handler(NotImplementedError)
    async def not_implemented(_: Request, error: NotImplementedError) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_501_NOT_IMPLEMENTED, content={"detail": str(error)})

    app.include_router(router)
    return app
