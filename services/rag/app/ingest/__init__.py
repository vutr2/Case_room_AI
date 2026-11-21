"""Ingestion: turn one case document into searchable chunks, vectors and graph entities.

Modules to add here as you build it, for example:
    chunking.py      split the text into passages that keep section headings
    entities.py      extract diagnoses, drugs, biomarkers, procedures
    embeddings.py    embed the chunks
    vector_store.py  write chunks and embeddings to pgvector
    graph_store.py   write entities and relations to Neo4j
"""

from .service import delete_document, ingest_document

__all__ = ["delete_document", "ingest_document"]
