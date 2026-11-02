import "server-only";
import { AIError } from "@ccr/ai";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { localizeServerMessage } from "@/i18n/server";
import { BUSY_MESSAGE, isRetryableDatabaseError } from "./db-errors";
import { AppError } from "./errors";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Run a server action body and convert failures into a serializable result.
 * Next.js control-flow errors (redirect, notFound) are re-thrown.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    // Services write English; the form shows the message in the reader's language.
    return { ok: false, error: await localizeServerMessage(failureMessage(error)) };
  }
}

function failureMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof AIError) {
    console.error("[ai]", error.message);
    return error.userMessage;
  }
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Some fields are invalid.";
  if (isRetryableDatabaseError(error)) {
    console.warn("[action] transaction rolled back (busy)", error instanceof Error ? error.message : error);
    return BUSY_MESSAGE;
  }
  console.error("[action]", error);
  return "Something went wrong. Please try again.";
}
