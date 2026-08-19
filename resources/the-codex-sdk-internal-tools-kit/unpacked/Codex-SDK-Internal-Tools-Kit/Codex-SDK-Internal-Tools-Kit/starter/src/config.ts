import path from "node:path";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const envSchema = z.object({
  AI_BACKEND: z.enum(["codex-subscription", "openai-api"]).default("codex-subscription"),
  HOST: z.literal("127.0.0.1").default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1024).max(65_535).default(3210),
  MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(4).default(1),
  JOB_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(900_000).default(180_000),
  INTERNAL_TOOL_WORKSPACE: z.string().trim().default("./runtime/workspace"),
  CODEX_MODEL: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
});

export type AppConfig = {
  backend: "codex-subscription" | "openai-api";
  host: "127.0.0.1";
  port: number;
  maxConcurrentJobs: number;
  jobTimeoutMs: number;
  workspaceDirectory: string;
  codexModel?: string;
  openAiApiKey?: string;
  openAiModel?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    backend: parsed.AI_BACKEND,
    host: parsed.HOST,
    port: parsed.PORT,
    maxConcurrentJobs: parsed.MAX_CONCURRENT_JOBS,
    jobTimeoutMs: parsed.JOB_TIMEOUT_MS,
    workspaceDirectory: path.resolve(parsed.INTERNAL_TOOL_WORKSPACE),
    ...(parsed.CODEX_MODEL ? { codexModel: parsed.CODEX_MODEL } : {}),
    ...(parsed.OPENAI_API_KEY ? { openAiApiKey: parsed.OPENAI_API_KEY } : {}),
    ...(parsed.OPENAI_MODEL ? { openAiModel: parsed.OPENAI_MODEL } : {}),
  };
}

