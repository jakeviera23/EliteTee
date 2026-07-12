import type { AiCompletionResult, AiProvider, AiTask } from "./types.ts";
import { OpenAiProvider } from "./openai-provider.ts";

export function getProviderForTask(task: AiTask): AiProvider {
  switch (task) {
    case "classification":
    case "concierge":
    case "summarization":
    case "moderation":
      return new OpenAiProvider();
    default:
      return new OpenAiProvider();
  }
}

export function getLlamaProviderPlaceholder(): AiProvider | null {
  // Phase 2: register Meta Llama via a legitimate API host.
  return null;
}

export type { AiCompletionResult };
