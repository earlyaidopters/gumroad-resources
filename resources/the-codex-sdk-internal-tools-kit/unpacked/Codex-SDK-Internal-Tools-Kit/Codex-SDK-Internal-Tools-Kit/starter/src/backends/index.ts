import type { AppConfig } from "../config.js";
import type { AiBackend } from "../types.js";
import { CodexSubscriptionBackend } from "./codex-subscription.js";
import { OpenAiApiBackend } from "./openai-api.js";

export function createBackend(config: AppConfig): AiBackend {
  if (config.backend === "codex-subscription") {
    return new CodexSubscriptionBackend(config);
  }
  if (config.backend === "openai-api") {
    return new OpenAiApiBackend(config);
  }
  const impossible: never = config.backend;
  throw new Error(`Unsupported AI backend: ${String(impossible)}`);
}

