export type CoralSkinPrefs = { enabled: boolean; risk: boolean };
export type CoralSkinTurn = {
  active: boolean;
  startedAt: number;
  now: number;
  frame: number;
  reads: number;
  edits: number;
  bash: number;
  danger: number;
  other: number;
};

declare module "claude-code" {
  interface PluginState {
    "coral-skin": { prefs: CoralSkinPrefs; turn: CoralSkinTurn };
  }
}
