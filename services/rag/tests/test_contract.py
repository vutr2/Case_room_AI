"""The contract examples are also validated by packages/ai/src/retrieval/remote/rag-client.test.ts."""

from app.schemas import IngestRequest, IngestResponse, RetrieveRequest, RetrieveResponse

from .helpers import example


def test_examples_match_the_schemas():
    IngestRequest.model_validate(example("ingest-request"))
    IngestResponse.model_validate(example("ingest-response"))
    RetrieveRequest.model_validate(example("retrieve-request"))
    RetrieveResponse.model_validate(example("retrieve-response"))


def test_responses_serialize_to_the_camel_case_examples():
    for model, name in [(IngestResponse, "ingest-response"), (RetrieveResponse, "retrieve-response")]:
        data = example(name)
        assert model.model_validate(data).model_dump(mode="json", by_alias=True) == data


def test_retrieve_defaults_to_case_documents():
    request = RetrieveRequest.model_validate({"organizationId": "org", "caseRoomId": "case", "query": "EGFR"})
    assert request.kinds == ["document"]
    assert request.limit == 12
