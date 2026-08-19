import { mkdir } from "node:fs/promises";
import { Codex } from "@openai/codex-sdk";
import type { AppConfig } from "../config.js";
import { buildTaskPrompt } from "../prompt.js";
import type { AiBackend, RunOptions, TaskRequest, TaskResult } from "../types.js";

export function environmentWithoutApiKeys(
  source: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "string") continue;
    if (/_API_KEY$/i.test(key) || key === "CODEX_API_KEY") continue;
    clean[key] = value;
  }
  return clean;
}

export class CodexSubscriptionBackend implements AiBackend {
  readonly name = "codex-subscription" as const;

  constructor(private readonly config: AppConfig) {}

  async runTask(request: TaskRequest, options: RunOptions): Promise<TaskResult> {
    await mkdir(this.config.workspaceDirectory, { recursive: true });

    const codex = new Codex({ env: environmentWithoutApiKeys() });
    const thread = codex.startThread({
      workingDirectory: this.config.workspaceDirectory,
      skipGitRepoCheck: true,
      sandboxMode: "read-only",
      approvalPolicy: "never",
      networkAccessEnabled: false,
      webSearchMode: "disabled",
      ...(this.config.codexModel ? { model: this.config.codexModel } : {}),
    });

    const turn = await thread.run(buildTaskPrompt(request), { signal: options.signal });
    const output = turn.finalResponse.trim();
    if (!output) throw new Error("Codex returned an empty result.");

    return {
      backend: this.name,
      output,
      ...(thread.id ? { threadId: thread.id } : {}),
      ...(turn.usage ? { usage: { ...turn.usage } } : {}),
    };
  }
}

