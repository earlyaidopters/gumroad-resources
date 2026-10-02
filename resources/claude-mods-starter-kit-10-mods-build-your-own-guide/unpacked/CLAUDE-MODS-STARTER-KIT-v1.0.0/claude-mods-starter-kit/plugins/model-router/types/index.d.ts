export type ModelRouterCheap = "sonnet" | "haiku";
export type ModelRouterMode = "subagents" | "steps" | "both";
export type ModelRouterConfig = { enabled: boolean; cheap: ModelRouterCheap; mode: ModelRouterMode };
export type ModelRouterDecision = { kind: "step" | "subagent"; turn: number; step: number; to: string; isRouted: boolean; reason: string };
export type ModelRouterStats = {
  turns: number;
  steps: number;
  routed: number;
  actualUsd: number;
  counterfactualUsd: number;
  lastPrefix: number;
  sessionModel: string;
  subSteps: number;
  subActualUsd: number;
  subCounterfactualUsd: number;
  subagents: number;
};

declare module "claude-code" {
  interface PluginState {
    "model-router": {
      config: ModelRouterConfig;
      stats: ModelRouterStats;
      decisions: ModelRouterDecision[];
      readOnly: StateFamily<boolean>;
    };
  }
}
