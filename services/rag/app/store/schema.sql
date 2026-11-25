CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS chunks (
    id          bigserial PRIMARY KEY,
    kind        text NOT NULL CHECK (kind IN ('document', 'guideline', 'literature')),
    organization_id text,
    case_room_id    text,
    source_id       text NOT NULL,
    title           text NOT NULL,
    doc_type        text,
    doc_date        date,
    language        text NOT NULL,
    strategy        text NOT NULL,
    part            int NOT NULL,
    parts           int NOT NULL,
    section         text,
    char_start      int NOT NULL,
    char_end        int NOT NULL,
    text            text NOT NULL,
    embedding       vector(1024) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CHECK (kind <> 'document' OR (organization_id IS NOT NULL AND case_room_id IS NOT NULL)),
    UNIQUE NULLS NOT DISTINCT (organization_id, case_room_id, source_id, strategy, part) 
);
CREATE INDEX IF NOT EXISTS chunks_scope_idx ON chunks (organization_id, case_room_id, kind, strategy);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
