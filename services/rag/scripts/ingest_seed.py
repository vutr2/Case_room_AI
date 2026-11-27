import time

import psycopg

from app.config import Settings
from app.ingest.service import ingest_document
from app.resources import Resources
from app.schemas import IngestDocument, IngestRequest


def load_app_documents(app_database_url: str) -> list[IngestRequest]:

    sql_statement = """SELECT d.id, d.title, d.type::text, d."documentDate", d."rawText",
        c.id AS case_room_id, c."organizationId", o.locale
        FROM "ClinicalDocument" d
        JOIN "CaseRoom" c ON c.id = d."caseRoomId"
        JOIN "Organization" o ON o.id = c."organizationId"
        ORDER BY c.id, d."documentDate";
    """

    with psycopg.connect(app_database_url) as conn:
        conn.read_only = True

        rows = conn.execute(sql_statement).fetchall()

    requests = []
    for doc_id, title, doc_type, doc_date, raw_text, case_room_id, organization_id, locale in rows:
        # A document the app has not processed yet has no text to index.
        if not raw_text or not raw_text.strip():
            continue
        language = "vi" if locale == "vi" else "en"
        document = IngestDocument(
            id=doc_id,
            title=title,
            type=doc_type,
            date=doc_date,
            language=language,
            text=raw_text,
        )
        requests.append(IngestRequest(organization_id=organization_id, case_room_id=case_room_id, document=document))
    return requests


def count_chunks(res: Resources, request: IngestRequest) -> int:
    """How many chunks of this document are stored for the configured strategy."""
    with res.pool().connection() as conn:
        return conn.execute(
            """
            SELECT count(*) FROM chunks
            WHERE kind = 'document'
              AND organization_id = %s
              AND case_room_id = %s
              AND source_id = %s
              AND strategy = %s
            """,
            (request.organization_id, request.case_room_id, request.document.id, res.settings.chunk_strategy),
        ).fetchone()[0]


def main() -> None:
    """Index every document of the app's demo database into pgvector.

    Calls ingest_document directly (no HTTP): the script runs on the same machine
    and needs no service token. Running it again replaces the chunks instead of
    duplicating them, because replace_chunks deletes before it inserts.
    """
    settings = Settings()
    url = settings.app_database_url
    if url is None:
        raise RuntimeError("Missing APP_DATABASE_URL in services/rag/.env (copy DATABASE_URL from the repo's .env)")

    res = Resources(settings)
    try:
        started = time.perf_counter()
        requests = load_app_documents(url.get_secret_value())
        print(f"{len(requests)} documents to index with the '{settings.chunk_strategy}' strategy")

        total = 0
        for request in requests:
            ingest_document(request, res)
            chunks = count_chunks(res, request)
            total += chunks
            print(f"  case {request.case_room_id[:8]}  {chunks:3d} chunks  {request.document.title}")

        elapsed = time.perf_counter() - started
        print(f"Done: {len(requests)} documents, {total} chunks in {elapsed:.1f} s")
    finally:
        res.close()


if __name__ == "__main__":
    main()
