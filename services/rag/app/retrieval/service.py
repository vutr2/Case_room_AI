"""Entry point called by the API. Replace the body with your pipeline."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ..schemas import Passage, RetrieveRequest, RetrieveResponse
from ..store.chunks import StoredChunk, list_case_chunks
from .bm25 import lexical_ranking
from .dense import dense_ranking
from .fusion import rrf

if TYPE_CHECKING:
    from ..resources import Resources


def retrieve(request: RetrieveRequest, res: Resources) -> RetrieveResponse:
    """ "Retrieval pipeline: BM25 and dense search, fused with RRF, optionally reranked." """

    if "document" not in request.kinds:
        return RetrieveResponse(passages=[])
    s = res.settings
    mode = s.retrieval_mode
    with res.pool().connection() as conn:
        chunks = list_case_chunks(conn, request.organization_id, request.case_room_id, s.chunk_strategy)
        if not chunks:
            return RetrieveResponse(passages=[])
        lex = []
        den = []
        if mode != "dense":
            lex = lexical_ranking(chunks, request.query, s.candidate_pool)
        if mode != "bm25":
            den = dense_ranking(
                conn,
                res.embedder(),
                request.organization_id,
                request.case_room_id,
                request.query,
                s.candidate_pool,
                s.chunk_strategy,
            )
    if mode == "bm25":
        ranked = lex
    elif mode == "dense":
        ranked = den
    else:
        lex_ids = [c.id for c, _ in lex]
        den_ids = [c.id for c, _ in den]
        fused = rrf([lex_ids, den_ids], k=s.rrf_k, weights=(s.weight_bm25, s.weight_dense))
        by_id = {c.id: c for c in chunks}
        ranked = [(by_id[cid], score) for (cid, score) in fused]

    if mode == "hybrid_rerank":
        cands = ranked[: s.rerank_candidates]
        scores = res.reranker().score(request.query, [c.text for c, _ in cands])
        pairs = [(chunk, score) for (chunk, _), score in zip(cands, scores, strict=True)]
        ranked = sorted(pairs, key=lambda pair: pair[1], reverse=True)

    for chunk, _ in ranked:
        if chunk.case_room_id != request.case_room_id:
            raise RuntimeError("retrieval returned a chunk from another case room")
    top = ranked[: request.limit]

    return RetrieveResponse(passages=[to_passage(chunk, score) for chunk, score in top])


def to_passage(chunk: StoredChunk, score: float) -> Passage:
    result = Passage(
        kind="document",
        source_id=chunk.source_id,
        title=chunk.title,
        text=chunk.text,
        score=score,
        date=chunk.doc_date,
        reference=None,
        part=chunk.part,
        parts=chunk.parts,
    )
    return result
