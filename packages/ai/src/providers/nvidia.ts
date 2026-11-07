import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { AIConfigurationError, AIOutputError, AIProviderError, AIRefusalError } from "../errors";
import { DEFAULT_MAX_OUTPUT_TOKENS, type LLMClient, type StructuredRequest, type StructuredResponse, type ResponseBilling } from "./llm-client";
import { parseStructuredJson, withBilling } from "./structured";

export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b";
/** NVIDIA's hosted API catalog (build.nvidia.com). A self-hosted NIM serves the same API at its own URL. */
export const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export interface NvidiaClientOptions {
  apiKey?: string;
  model?: string;
  /** A self-hosted NIM, e.g. http://nim:8000/v1. Defaults to NVIDIA's hosted API. */
  baseURL?: string;
  /** Pre-configured SDK client (tests, proxies). */
  client?: OpenAI;
}

/**
 * NVIDIA NIM implementation of the LLM client (Nemotron by default), through
 * the OpenAI-compatible Chat Completions API.
 *
 * - The JSON schema is enforced with NIM guided decoding (`guided_json`). It
 *   applies to the answer only: Nemotron reasons first, and the reasoning is
 *   returned separately (`reasoning_content`), never shown or stored. Reasoning
 *   tokens count toward `max_tokens`.
 * - `effort` is ignored, and so are `cacheable` hints (no prompt caching).
 */
export class NvidiaLLMClient implements LLMClient {
  readonly providerId = "nvidia" as const;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(options: NvidiaClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.NVIDIA_API_KEY;
    const baseURL = options.baseURL || DEFAULT_NVIDIA_BASE_URL;
    // A self-hosted NIM may run without authentication; NVIDIA's hosted API always needs a key.
    if (!options.client && !apiKey && baseURL === DEFAULT_NVIDIA_BASE_URL) throw new AIConfigurationError("NVIDIA_API_KEY is not set");
    this.client = options.client ?? new OpenAI({ apiKey: apiKey || "not-needed", baseURL });
    this.model = options.model || DEFAULT_NVIDIA_MODEL;
  }

  async generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const input = [...request.context.map((block) => block.text).filter((text) => text.trim()), request.prompt].join("\n\n");
    const body = {
      model: this.model,
      messages: [
        { role: "system" as const, content: request.system },
        { role: "user" as const, content: input },
      ],
      max_tokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      temperature: 0,
      guided_json: zodTextFormat(request.schema, request.schemaName).schema,
    };
    let response: ChatCompletion;
    try {
      // `guided_json` is a NIM extension the OpenAI SDK passes through unchanged.
      response = await this.client.chat.completions.create(body as ChatCompletionCreateParamsNonStreaming);
    } catch (error) {
      throw mapNvidiaError(error);
    }

    const billing: ResponseBilling = {
      model: response.model,
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        cacheReadTokens: response.usage?.prompt_tokens_details?.cached_tokens,
      },
    };
    return withBilling(billing, () => {
      const choice = response.choices[0];
      if (!choice) throw new AIOutputError(`NVIDIA response has no output for task ${request.task}`);
      if (choice.message.refusal) throw new AIRefusalError(choice.message.refusal);
      if (choice.finish_reason === "content_filter") throw new AIRefusalError();
      if (choice.finish_reason === "length") {
        throw new AIOutputError(`NVIDIA response incomplete (length) for task ${request.task}`);
      }
      return { data: parseStructuredJson(withoutReasoning(choice.message.content ?? ""), request.schema, request.task), ...billing };
    });
  }
}

/** Drop a reasoning block left in the answer by a server that does not separate it out. */
function withoutReasoning(text: string): string {
  return text.replace(/^\s*<think>[\s\S]*?<\/think>/, "");
}

function mapNvidiaError(error: unknown): Error {
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
    return new AIConfigurationError(`NVIDIA authentication failed: ${error.message}`);
  }
  if (error instanceof OpenAI.RateLimitError) {
    return new AIProviderError(`NVIDIA rate limit: ${error.message}`, true, { cause: error });
  }
  if (error instanceof OpenAI.BadRequestError) {
    return new AIProviderError(`NVIDIA rejected the request: ${error.message}`, false, { cause: error });
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return new AIProviderError(`Could not reach NVIDIA: ${error.message}`, true, { cause: error });
  }
  if (error instanceof OpenAI.APIError) {
    const retryable = typeof error.status === "number" && error.status >= 500;
    return new AIProviderError(`NVIDIA API error ${error.status}: ${error.message}`, retryable, { cause: error });
  }
  return new AIProviderError(`Unexpected NVIDIA client error: ${error instanceof Error ? error.message : String(error)}`, false, { cause: error });
}
