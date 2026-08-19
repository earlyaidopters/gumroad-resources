import OpenAI from "openai";
import type { AppConfig } from "../config.js";
import { buildTaskPrompt } from "../prompt.js";
import type { AiBackend, RunOptions, TaskRequest, TaskResult } from "../types.js";

export class OpenAiApiBackend implements AiBackend {
  readonly name = "openai-api" as const;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: AppConfig) {
    if (!config.openAiApiKey || !config.openAiModel) {
      throw new Error(
        "API mode requires both OPENAI_API_KEY and OPENAI_MODEL. No paid fallback was attempted.",
      );
    }
    this.client = new OpenAI({ apiKey: config.openAiApiKey });
    this.model = config.openAiModel;
  }

  async runTask(request: TaskRequest, options: RunOptions): Promise<TaskResult> {
    const response = await this.client.responses.create(
      {
        model: this.model,
        input: buildTaskPrompt(request),
      },
      { signal: options.signal },
    );

    const output = response.output_text.trim();
    if (!output) throw new Error("The OpenAI API returned an empty result.");

    return { backend: this.name, output };
  }
}

