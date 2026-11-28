import pytest
from pydantic import ValidationError

from app.config import Settings

from .helpers import example

DELETE_PATH = "/v1/organizations/org_synthetic_riverside/cases/case_synthetic_001/documents/doc_synthetic_pathology"


def test_health_needs_no_token(client):
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer wrong-token"}, {"Authorization": "Basic abc"}])
def test_v1_refuses_a_missing_or_wrong_token(client, headers):
    response = client.post("/v1/retrieve", json=example("retrieve-request"), headers=headers)
    assert response.status_code == 401


def test_the_service_does_not_start_without_a_strong_token(monkeypatch):
    monkeypatch.delenv("RAG_SERVICE_TOKEN", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, rag_service_token="short")


def test_requests_with_unknown_fields_are_rejected(client, auth):
    body = {**example("retrieve-request"), "userId": "not-part-of-the-contract"}
    assert client.post("/v1/retrieve", json=body, headers=auth).status_code == 422


# Every endpoint is built: /v1/ingest and DELETE are tested in tests/test_ingest.py,
# /v1/retrieve in tests/test_retrieve.py.
