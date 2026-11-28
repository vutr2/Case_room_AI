from psycopg import Connection

from ..ingest.embeddings import Embedder
from ..store.chunks import StoredChunk, dense_search
from ..text import normalize


def dense_ranking(
    conn: Connection, embedder: Embedder, organization_id: str, case_room_id: str, query: str, k: int, strategy: str
) -> list[tuple[StoredChunk, float]]:
    q = embedder.embed_query(normalize(query))

    return dense_search(conn, organization_id, case_room_id, q, k, strategy)
