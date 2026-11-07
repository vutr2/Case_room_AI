import { DEFAULT_ANTHROPIC_MODEL } from "./providers/anthropic";
import type { ReasoningEffort } from "./providers/llm-client";
import { DEFAULT_NVIDIA_MODEL } from "./providers/nvidia";
import { DEFAULT_OPENAI_MODEL } from "./providers/openai";
import type { AIProviderId } from "./services/types";

export interface AIConfig {
  provider: AIProviderId;
  anthropic: { apiKey?: string; model: string; effort: ReasoningEffort };
  openai: { apiKey?: string; model: string };
  /** `baseURL` is set only for a self-hosted NIM; otherwise NVIDIA's hosted API is used. */
  nvidia: { apiKey?: string; model: string; baseURL?: string };
  demo: { simulatedLatencyMs: number };
}

type Env = Record<string, string | undefined>;

const EFFORTS: ReasoningEffort[] = ["low", "medium", "high"];

/**
 * Resolve which provider to use:
 *  1. AI_PROVIDER if set to anthropic | openai | nvidia | demo
 *  2. anthropic when ANTHROPIC_API_KEY is present
 *  3. openai when OPENAI_API_KEY is present
 *  4. nvidia when NVIDIA_API_KEY or NVIDIA_BASE_URL (a self-hosted NIM) is present
 *  5. the offline demo engine
 */
export function resolveAIConfig(env: Env = process.env): AIConfig {
  const explicit = env.AI_PROVIDER?.trim().toLowerCase();
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim() || undefined;
  const openaiKey = env.OPENAI_API_KEY?.trim() || undefined;
  const nvidiaKey = env.NVIDIA_API_KEY?.trim() || undefined;
  const nvidiaBaseURL = env.NVIDIA_BASE_URL?.trim() || undefined;

  let provider: AIProviderId;
  if (explicit === "anthropic" || explicit === "openai" || explicit === "nvidia" || explicit === "demo") provider = explicit;
  else if (anthropicKey) provider = "anthropic";
  else if (openaiKey) provider = "openai";
  else if (nvidiaKey || nvidiaBaseURL) provider = "nvidia";
  else provider = "demo";

  const effort = env.ANTHROPIC_EFFORT?.trim().toLowerCase() as ReasoningEffort | undefined;

  return {
    provider,
    anthropic: {
      apiKey: anthropicKey,
      model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
      effort: effort && EFFORTS.includes(effort) ? effort : "medium",
    },
    openai: {
      apiKey: openaiKey,
      model: env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    },
    nvidia: {
      apiKey: nvidiaKey,
      model: env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL,
      baseURL: nvidiaBaseURL,
    },
    demo: {
      simulatedLatencyMs: Number.parseInt(env.DEMO_AI_LATENCY_MS ?? "", 10) || 900,
    },
  };
}
