export type CodexCuPending = { app: string } | null

declare module 'claude-code' {
  interface PluginState {
    'codex-computer-use': { pending: CodexCuPending; allowed: string[] }
  }
}
