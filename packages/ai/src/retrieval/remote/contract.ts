import { z } from "zod";

/**
 * The HTTP contract with the retrieval service (services/rag). Mirrors
 * services/rag/app/schemas.py; the examples in services/rag/contract/examples
 * are validated by the tests on both sides.
 */

export const RAG_PASSAGE_KINDS = ["document", "guideline", "literature"] as const;
export type RagPassageKind = (typeof RAG_PASSAGE_KINDS)[number];

const id = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Requests are strict, like the service's: an unknown field is a bug on this side.
export const ragIngestRequestSchema = z.strictObject({
  organizationId: id,
  caseRoomId: id,
  document: z.strictObject({
    id,
    title: z.string().min(1),
    type: z.string().min(1),
    date: isoDate,
    language: z.enum(["en", "vi"]),
    text: z.string().min(1),
  }),
});
export type RagIngestRequest = z.infer<typeof ragIngestRequestSchema>;

export const ragIngestResponseSchema = z.object({
  documentId: z.string(),
  status: z.enum(["accepted", "indexed"]),
});
export type RagIngestResponse = z.infer<typeof ragIngestResponseSchema>;

export const ragRetrieveRequestSchema = z.strictObject({
  organizationId: id,
  caseRoomId: id,
  query: z.string().min(1).max(2000),
  limit: z.number().int().min(1).max(50).optional(),
  kinds: z.array(z.enum(RAG_PASSAGE_KINDS)).min(1).optional(),
});
export type RagRetrieveRequest = z.infer<typeof ragRetrieveRequestSchema>;

export const ragPassageSchema = z.object({
  kind: z.enum(RAG_PASSAGE_KINDS),
  sourceId: z.string(),
  title: z.string(),
  text: z.string(),
  score: z.number(),
  date: isoDate.nullable().optional(),
  reference: z.string().nullable().optional(),
  part: z.number().int().nullable().optional(),
  parts: z.number().int().nullable().optional(),
});
export type RagPassage = z.infer<typeof ragPassageSchema>;

export const ragRetrieveResponseSchema = z.object({ passages: z.array(ragPassageSchema) });
export type RagRetrieveResponse = z.infer<typeof ragRetrieveResponseSchema>;
