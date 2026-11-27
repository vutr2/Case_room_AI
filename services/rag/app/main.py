"""Application factory. Run with: uv run uvicorn app.main:create_app --factory --reload"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from .api import router
from .config import Settings
from .resources import Resources


def create_app(settings: Settings | None = None, resources: Resources | None = None) -> FastAPI:
    """Build the FastAPI app.

    Tests pass their own settings and resources (fakes); in production both are None,
    so the settings come from the environment and a real Resources object is made.
    """

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Run code once when the server starts and once when it stops.

        Startup: call resources.pool(), which connects to Postgres and creates the chunks
        table if needed, so a wrong RAG_DATABASE_URL fails at startup, not at the first request.
        Shutdown: the `finally` closes the pool even if the server stops because of an error.
        Note: TestClient only runs this when used as `with TestClient(app) as client:`.
        """
        # StartUp: runs once before the app starts accepting request
        app.state.resources.pool()
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
        """Liveness check: answers as soon as the server is up. It does not touch the database."""
        return {"status": "ok"}

    @app.exception_handler(NotImplementedError)
    async def not_implemented(_: Request, error: NotImplementedError) -> JSONResponse:
        """Turn a NotImplementedError from an unfinished step into HTTP 501 instead of a 500 crash."""
        return JSONResponse(status_code=status.HTTP_501_NOT_IMPLEMENTED, content={"detail": str(error)})

    app.include_router(router)
    return app
