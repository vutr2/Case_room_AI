import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ragIngestRequestSchema, ragIngestResponseSchema, ragRetrieveRequestSchema, ragRetrieveResponseSchema } from "./contract";
import { createRagClient, RagServiceError } from "./rag-client";

// Shared with services/rag/tests/test_contract.py: both sides must accept the same examples.
const examples = path.resolve(import.meta.dirname, "../../../../../services/rag/contract/examples");
const example = (name: string) => JSON.parse(readFileSync(path.join(examples, `${name}.json`), "utf8"));

function fakeFetch(status: number, body?: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

describe("contract", () => {
  it("accepts the examples the Python service is tested with", () => {
    expect(() => ragIngestRequestSchema.parse(example("ingest-request"))).not.toThrow();
    expect(() => ragIngestResponseSchema.parse(example("ingest-response"))).not.toThrow();
    expect(() => ragRetrieveRequestSchema.parse(example("retrieve-request"))).not.toThrow();
    expect(() => ragRetrieveResponseSchema.parse(example("retrieve-response"))).not.toThrow();
  });
});

describe("createRagClient", () => {
  it("sends the service token and parses the passages", async () => {
    const fetch = fakeFetch(200, example("retrieve-response"));
    const client = createRagClient({ baseUrl: "http://rag:8000/", token: "secret-token", fetch });

    const result = await client.retrieve(example("retrieve-request"));

    expect(result.passages.map((p) => p.kind)).toEqual(["document", "guideline"]);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("http://rag:8000/v1/retrieve");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer secret-token");
  });

  it("refuses to send a request outside the contract", async () => {
    const fetch = fakeFetch(200, example("retrieve-response"));
    const client = createRagClient({ baseUrl: "http://rag:8000", token: "t", fetch });
    await expect(client.retrieve({ ...example("retrieve-request"), userId: "u1" })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports error statuses and unexpected responses as RagServiceError", async () => {
    const failing = createRagClient({ baseUrl: "http://rag:8000", token: "t", fetch: fakeFetch(501, { detail: "Retrieval is not built yet" }) });
    await expect(failing.retrieve(example("retrieve-request"))).rejects.toMatchObject({ name: "RagServiceError", status: 501 });

    const malformed = createRagClient({ baseUrl: "http://rag:8000", token: "t", fetch: fakeFetch(200, { passages: [{ kind: "web" }] }) });
    await expect(malformed.retrieve(example("retrieve-request"))).rejects.toBeInstanceOf(RagServiceError);
  });

  it("encodes the ids in the delete path", async () => {
    const fetch = fakeFetch(204);
    const client = createRagClient({ baseUrl: "http://rag:8000", token: "t", fetch });
    await client.deleteDocument({ organizationId: "org 1", caseRoomId: "case/2", documentId: "doc?3" });
    expect(fetch.mock.calls[0]![0]).toBe("http://rag:8000/v1/organizations/org%201/cases/case%2F2/documents/doc%3F3");
    expect(fetch.mock.calls[0]![1]?.method).toBe("DELETE");
  });
});
