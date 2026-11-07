import { resolveAIConfig, type AIConfig } from "../config";
import { AnthropicLLMClient } from "../providers/anthropic";
import { NvidiaLLMClient } from "../providers/nvidia";
import { OpenAILLMClient } from "../providers/openai";
import { DemoCaseAIProvider } from "./demo";
import { LLMCaseAIProvider } from "./llm-provider";
import type { CaseAIProvider } from "./types";

/** Build the configured CaseAIProvider. */
export function createCaseAIProvider(config: AIConfig = resolveAIConfig()): CaseAIProvider {
  switch (config.provider) {
    case "anthropic":
      return new LLMCaseAIProvider(
        new AnthropicLLMClient({
          apiKey: config.anthropic.apiKey,
          model: config.anthropic.model,
          effort: config.anthropic.effort,
        }),
      );
    case "openai":
      return new LLMCaseAIProvider(new OpenAILLMClient({ apiKey: config.openai.apiKey, model: config.openai.model }));
    case "nvidia":
      return new LLMCaseAIProvider(
        new NvidiaLLMClient({ apiKey: config.nvidia.apiKey, model: config.nvidia.model, baseURL: config.nvidia.baseURL }),
      );
    case "demo":
      return new DemoCaseAIProvider({ simulatedLatencyMs: config.demo.simulatedLatencyMs });
  }
}
