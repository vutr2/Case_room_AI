"""Retrieval: find the passages that answer a question.

Modules to add here as you build it, for example:
    bm25.py      lexical search (Vietnamese diacritics: normalize to NFC first)
    dense.py     vector search in pgvector
    fusion.py    reciprocal rank fusion of the result lists
    rerank.py    cross-encoder reranking of the fused candidates
"""

from .service import retrieve

__all__ = ["retrieve"]
