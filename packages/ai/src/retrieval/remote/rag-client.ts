import type { z } from "zod";
import {
  ragIngestRequestSchema,
  ragIngestResponseSchema,
  ragRetrieveRequestSchema,
  ragRetrieveResponseSchema,
  type RagIngestRequest,
  type RagIngestResponse,
  type RagRetrieveRequest,
  type RagRetrieveResponse,
} from "./contract";

/**
 * Client for the retrieval service (services/rag). Call it only after the
 * user's access to the case has been checked: the service trusts the caller.
 */

export interface RagClientOptions {
  /** For example http://localhost:8000 */
  baseUrl: string;
  /** RAG_SERVICE_TOKEN, shared with the service. */
  token: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface RagDocumentRef {
  organizationId: string;
  caseRoomId: string;
  documentId: string;
}

export interface RagClient {
  ingest(request: RagIngestRequest): Promise<RagIngestResponse>;
  deleteDocument(ref: RagDocumentRef): Promise<void>;
  retrieve(request: RagRetrieveRequest): Promise<RagRetrieveResponse>;
}

export class RagServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "RagServiceError";
  }
}

export function createRagClient(options: RagClientOptions): RagClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;

  async function call(method: string, path: string, body?: unknown): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${options.token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new RagServiceError(`RAG service unreachable: ${method} ${path}`, undefined, { cause: error });
    }
    if (!response.ok) throw new RagServiceError(`RAG service answered ${response.status}: ${method} ${path}`, response.status);
    return response;
  }

  async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
    const result = schema.safeParse(await response.json().catch(() => undefined));
    if (!result.success) throw new RagServiceError("RAG service returned an unexpected response", response.status, { cause: result.error });
    return result.data;
  }

  return {
    async ingest(request) {
      const response = await call("POST", "/v1/ingest", ragIngestRequestSchema.parse(request));
      return parse(response, ragIngestResponseSchema);
    },
    async deleteDocument({ organizationId, caseRoomId, documentId }) {
      const path = [organizationId, caseRoomId, documentId].map(encodeURIComponent);
      await call("DELETE", `/v1/organizations/${path[0]}/cases/${path[1]}/documents/${path[2]}`);
    },
    async retrieve(request) {
      const response = await call("POST", "/v1/retrieve", ragRetrieveRequestSchema.parse(request));
      return parse(response, ragRetrieveResponseSchema);
    },
  };
}
