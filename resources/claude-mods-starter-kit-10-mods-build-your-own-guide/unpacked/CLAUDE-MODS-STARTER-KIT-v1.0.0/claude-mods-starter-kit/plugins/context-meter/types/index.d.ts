export type ContextMeterReading = { tokens: number; window: number; percent: number; usd: number };
export type ContextMeterLimit = { kind: string; percentUsed: number };

declare module "claude-code" {
  interface PluginState {
    "context-meter": { readings: ContextMeterReading[]; limits: ContextMeterLimit[] };
  }
}
