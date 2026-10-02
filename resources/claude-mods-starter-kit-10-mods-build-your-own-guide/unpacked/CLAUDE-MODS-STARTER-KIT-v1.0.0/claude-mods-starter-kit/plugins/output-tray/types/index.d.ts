export type OutputTrayVia = "write" | "notebook" | "shell" | "other";

export type OutputTrayItem = {
  id: string;
  key: string;
  abs: string;
  rel: string;
  name: string;
  folder: string;
  via: OutputTrayVia;
  agentId: string;
  at: number;
  size: number;
};

export type OutputTrayMeta = {
  cwd: string;
  seq: number;
  selected: string;
  modified: string[];
  lastAction: string;
};

declare module "claude-code" {
  interface PluginState {
    "output-tray": {
      items: OutputTrayItem[];
      meta: OutputTrayMeta;
    };
  }
}
