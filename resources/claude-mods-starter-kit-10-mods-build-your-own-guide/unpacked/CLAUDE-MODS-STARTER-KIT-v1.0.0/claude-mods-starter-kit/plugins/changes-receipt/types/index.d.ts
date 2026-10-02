export type ChangesReceiptKind = "created" | "changed" | "deleted" | "renamed";

export type ChangesReceiptItem = {
  kind: ChangesReceiptKind;
  /** Relative to the session folder when inside it, else absolute. */
  path: string;
  /** For a rename: where it came from. */
  from?: string;
  added?: number;
  removed?: number;
  /** Edit, Write, NotebookEdit, "Edit (subagent)", or "shell". */
  sources: string[];
  outside?: boolean;
};

export type ChangesReceiptAttempt = {
  path: string;
  tool: string;
  reason: string;
  bySubagent?: boolean;
};

export type ChangesReceipt = {
  id: string;
  n: number;
  prompt: string;
  at: number;
  mode: "git" | "walk" | "none";
  notes: string[];
  items: ChangesReceiptItem[];
  attempts: ChangesReceiptAttempt[];
};

export type ChangesReceiptView = {
  /** How many recent receipts the pane lists. */
  count: number;
  /** Per receipt id: expanded (true) or collapsed (false); absent = default. */
  open: Record<string, boolean>;
};

export type ChangesReceiptMeta = {
  enabled: boolean;
  /** Main-loop turns seen this session. */
  turns: number;
  /** The number of the most recent finished turn, and whether it changed nothing. */
  lastTurn: number;
  lastEmpty: boolean;
};

declare module "claude-code" {
  interface PluginState {
    "changes-receipt": {
      receipts: ChangesReceipt[];
      view: ChangesReceiptView;
      meta: ChangesReceiptMeta;
    };
  }
}
