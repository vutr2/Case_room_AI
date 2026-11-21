# RAG service

Retrieval for Clinical Case Room. It indexes case documents and shared medical knowledge (guidelines, literature) and returns the passages that answer a question.

The web app (TypeScript) stays in charge of users, permissions, prompts and citations. This service only ingests and retrieves.

**Status: skeleton.** The API contract, authentication, configuration, Docker and CI are in place. Ingestion, retrieval, the graph pipeline and evals are still to be built. Until then the endpoints answer `501`, and the web app keeps using its in-process BM25 (`packages/ai/src/retrieval/local`).

## Layout

```
services/rag/
  app/
    main.py            app factory, /health, 501 for the parts not built yet
    api.py             routes under /v1 (service token required)
    schemas.py         the contract with the web app (camelCase JSON)
    security.py        service token check
    config.py          settings from the environment
    ingest/            chunking, entities, embeddings, pgvector, Neo4j        (to build)
    retrieval/         BM25 + dense + reciprocal rank fusion + rerank        (to build)
    graph/             LangGraph pipeline: router → … → source check         (to build)
  contract/examples/   request and response examples, tested by both sides
  docker-compose.yml   the databases: pgvector and Neo4j
  db/init/             runs once when the pgvector container is created (enables the extension)
  evals/               golden set, metrics, judge, CI gate                    (to build)
  tests/               API and contract tests
```

Each folder still to build has an `__init__.py` that describes its job, and `ingest/service.py` and `retrieval/service.py` hold the entry points the API calls.

## Run it

The databases run in Docker. The service runs on your machine: it reloads on every change, and models can use the Mac's GPU, which Docker on macOS cannot reach.

```bash
cd services/rag
docker compose up -d --wait               # pgvector on localhost:5433, Neo4j on localhost:7474 (browser) / 7687 (bolt)
uv sync                                   # Python 3.12 and the dependencies, in .venv
cp .env.example .env                      # then set RAG_SERVICE_TOKEN (openssl rand -hex 32)
uv run uvicorn app.main:create_app --factory --reload --port 8000
uv run pytest                             # tests/ only; evals run with `uv run pytest evals`
uv run ruff check . && uv run ruff format .
```

To add a dependency, run `uv add <package>` (or `uv add --dev <package>`), then commit `pyproject.toml` and `uv.lock` together.

| Database | Address | Credentials (development only) |
|---|---|---|
| PostgreSQL 16 + pgvector | `localhost:5433`, database `case_room_rag` | `postgres` / `postgres` |
| Neo4j 5 Community + APOC | `bolt://localhost:7687`, browser http://localhost:7474 | `neo4j` / `case-room-dev` (`NEO4J_PASSWORD` changes it) |

- Both containers have memory caps (512 MB and 1.5 GB), so they fit in a Docker Desktop VM of about 3 GB. A container that stops with exit code 137 ran out of memory.
- `docker compose down` (in `services/rag`) stops them and keeps the data. Add `-v` to erase the index and the graph and start again from empty.
- The index has its own database, separate from the web app's. `npm run db:reset` and the demo seed never touch it. A reseed creates new document ids, so reindex after one.
- The `Dockerfile` builds the service image for deployment: `docker build -t case-room-rag services/rag`.

## API

| Method and path | Purpose | Answer |
|---|---|---|
| `GET /health` | Liveness, no token | `{"status": "ok"}` |
| `POST /v1/ingest` | Index one case document (sending it again replaces it) | `202` `IngestResponse` |
| `DELETE /v1/organizations/{organizationId}/cases/{caseRoomId}/documents/{documentId}` | Remove a document from every index | `204` |
| `POST /v1/retrieve` | Passages for a question, from one case and the shared knowledge | `200` `RetrieveResponse` |

Every `/v1` call needs `Authorization: Bearer $RAG_SERVICE_TOKEN`. The examples in `contract/examples/` show each body.

**Changing the contract:** edit `app/schemas.py`, `packages/ai/src/retrieval/remote/contract.ts` and the examples together. The Python tests (`tests/test_contract.py`) and the TypeScript tests (`rag-client.test.ts`) both validate the examples, so a change made on one side only fails one of them.

## Rules to keep while building

- **Synthetic data only**, in the index, the golden set and the logs. Never real patients.
- **Filter in the database.** The web app checks that the user may open the case before it calls this service. The service only trusts the token, and it must not trust the caller beyond that. Every query for `document` passages filters on `organizationId` and `caseRoomId` inside the database query itself. Then a bug in the web app cannot leak another case.
- **Return text exactly as stored.** The web app checks quotes word for word against the source (`SourceRegistry`). Normalize Vietnamese text to NFC when ingesting; the web app's `normalizeForMatch` does the same.
- **Log ids, not text.** Do not log document text or questions.
- **Internal network only in production.** Only the web app calls the service. The development compose file publishes port 8000 for local work.

## Wiring it into the web app

These are the places on the TypeScript side to change once retrieval works:

1. **Client:** read `RAG_SERVICE_URL` and `RAG_SERVICE_TOKEN` in the web app's server code, and create the client with `createRagClient` from `@ccr/ai`.
2. **Ingest:** `processDocument` in `apps/web/src/server/services/documents.ts` calls `client.ingest(...)`.
   - Call it after the processing transaction commits, the way `realtime.touch` is called.
   - Do not fail the upload when the service is down.
   - The app cannot delete documents today. If deletion is added, call `client.deleteDocument(...)` there too.
3. **Retrieve:** `formatCaseRecord` (`packages/ai/src/context/format-context.ts`) is synchronous and calls the local `retrievePassages`.
   - Fetch passages from the service before the prompt is built, in `LLMCaseAIProvider` (`packages/ai/src/services/llm-provider.ts`).
   - Pass them in through `FormatOptions`.
   - Keep the local BM25 as the fallback when the service is not configured or fails.
4. **Citations:** guideline and literature passages need their own keys (`G#`, `L#`).
   - Add the kinds to `SOURCE_KINDS` in `packages/types/src/sources.ts`.
   - Register them in `SourceRegistry` (`packages/ai/src/context/source-registry.ts`), and show them in the source chips.
   - `document` passages keep their `D#` key through `registry.keyFor(sourceId)`.
5. **Test the boundary:** add an integration test showing that a user who cannot open a case never receives its passages.
