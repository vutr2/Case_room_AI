"""Agentic retrieval pipeline (LangGraph), used by retrieval/service.py once built.

Planned flow: router (which sources does the question need?) -> retrieve ->
rerank -> grade relevance (retry with a rewritten query if too weak) ->
source check (every passage returned resolves to a stored chunk).

Modules to add here, for example: state.py, nodes.py, pipeline.py.
"""
