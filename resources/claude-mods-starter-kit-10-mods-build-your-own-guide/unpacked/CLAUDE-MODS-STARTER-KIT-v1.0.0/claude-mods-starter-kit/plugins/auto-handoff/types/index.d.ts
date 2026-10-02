export type AutoHandoffSaved = { path: string; at: number; reason: string };
export type AutoHandoffOffer = { at: number; file: string };

declare module "claude-code" {
  interface PluginState {
    "auto-handoff": {
      cwd: string;
      isInteractive: boolean;
      fired: boolean;
      busy: boolean;
      last: AutoHandoffSaved | null;
      compactedAt: number;
      offer: AutoHandoffOffer | null;
    };
  }
}
