import { z } from "zod";

export const taskKinds = ["brief", "rewrite", "extract"] as const;

export const taskRequestSchema = z.object({
  kind: z.enum(taskKinds),
  input: z.string().trim().min(20).max(40_000),
  direction: z.string().trim().max(1_000).optional(),
});

export type TaskRequest = z.infer<typeof taskRequestSchema>;

export type TaskResult = {
  backend: "codex-subscription" | "openai-api";
  output: string;
  threadId?: string;
  usage?: Record<string, number>;
};

export type RunOptions = {
  signal: AbortSignal;
};

export interface AiBackend {
  readonly name: TaskResult["backend"];
  runTask(request: TaskRequest, options: RunOptions): Promise<TaskResult>;
}

export function parseTaskRequest(value: unknown): TaskRequest {
  return taskRequestSchema.parse(value);
}

