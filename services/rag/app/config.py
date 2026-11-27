"""Settings read from the environment (or services/rag/.env)."""

from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every setting of the RAG service, read from environment variables or services/rag/.env.

    Field names map to upper-case variables: rag_database_url <- RAG_DATABASE_URL.
    SecretStr fields hide their value in logs and reprs; read them with .get_secret_value().
    """

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

    embedding_model: str = "BAAI/bge-m3"
    embedding_dim: int = 1024
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    model_device: str = "mps"
    chunk_strategy: Literal["section", "fixed"] = "section"
    chunk_target_chars: int = 1000
    retrieval_mode: Literal["bm25", "dense", "hybrid", "hybrid_rerank"] = "hybrid_rerank"
    candidate_pool: int = 50
    rerank_candidates: int = 20
    rrf_k: int = 60
    weight_bm25: float = 1.0
    weight_dense: float = 1.0
    app_database_url: SecretStr | None = None
