"""Settings read from the environment (or services/rag/.env)."""

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Shared secret the web app sends as "Authorization: Bearer <token>".
    # Required: the service refuses to start without it (generate with `openssl rand -hex 32`).
    rag_service_token: SecretStr = Field(min_length=32)

    # PostgreSQL with pgvector for chunks and embeddings. A separate database from
    # the web app's, so `npm run db:reset` and the demo reseed never touch the index.
    rag_database_url: SecretStr | None = None

    # Neo4j for the entity graph.
    neo4j_uri: str | None = None
    neo4j_user: str = "neo4j"
    neo4j_password: SecretStr | None = None
