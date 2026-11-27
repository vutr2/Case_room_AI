"""The HTTP contract between the web app and this service.

Mirrored in TypeScript by packages/ai/src/retrieval/remote/contract.ts. The
examples in contract/examples/ are validated by the tests on both sides, so a
change here must be made there too (or the tests fail).

JSON uses camelCase like the rest of Case Room; Python code uses snake_case.
"""

import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Language = Literal["en", "vi"]

# "document": a passage of one of the case's documents (cited D# in the web app).
# "guideline", "literature": medical knowledge shared by all cases (G#, L#).
PassageKind = Literal["document", "guideline", "literature"]


class Request(BaseModel):
    """Requests reject unknown fields, so the two sides cannot drift apart silently."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class Response(BaseModel):
    """Base of every response model: camelCase JSON like Request, but without extra="forbid"."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class IngestDocument(Request):
    """One processed case document, as the web app sends it: metadata plus its extracted text."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    # A DocumentType from @ccr/types, for example "PATHOLOGY_REPORT".
    type: str = Field(min_length=1)
    date: dt.date
    language: Language
    text: str = Field(min_length=1)


class IngestRequest(Request):
    """Body of POST /v1/ingest: the document and the organization and case it belongs to."""

    organization_id: str = Field(min_length=1)
    case_room_id: str = Field(min_length=1)
    document: IngestDocument


class IngestResponse(Response):
    """Reply to POST /v1/ingest."""

    document_id: str
    # "accepted": queued and indexed in the background; "indexed": searchable now.
    status: Literal["accepted", "indexed"]


class RetrieveRequest(Request):
    """Body of POST /v1/retrieve: a question about one case.

    organization_id and case_room_id are required: retrieval must never return a passage
    from another organization's or another case's documents.
    """

    organization_id: str = Field(min_length=1)
    case_room_id: str = Field(min_length=1)
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=12, ge=1, le=50)
    kinds: list[PassageKind] = Field(default_factory=lambda: ["document"], min_length=1)


class Passage(Response):
    """One retrieved piece of text, with where it comes from and its relevance score."""

    kind: PassageKind
    # The document id for "document" passages; the guideline or article id otherwise.
    source_id: str
    title: str
    text: str
    score: float
    date: dt.date | None = None
    # A human-readable reference for guidelines and literature, e.g. "PMID 12345678".
    reference: str | None = None
    # Position of the chunk within its source (1-based) and the number of chunks.
    part: int | None = None
    parts: int | None = None


class RetrieveResponse(Response):
    """Reply to POST /v1/retrieve: passages ordered from most to least relevant."""

    passages: list[Passage]
