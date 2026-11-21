-- Runs once, when the database volume is created (services/rag/docker-compose.yml).
-- Tables are not created here: they belong to the service's own migrations.
CREATE EXTENSION IF NOT EXISTS vector;
