export type RepoHeatmapFile = { p: string; l: number; b: number };
export type RepoHeatmapKind = "read" | "search" | "edit" | "fail";
export type RepoHeatmapTouch = {
  first: number;
  last: number;
  kind: RepoHeatmapKind;
  r: number;
  s: number;
  e: number;
  f: number;
  n: number;
  edits: number;
};
export type RepoHeatmapRecent = { path: string; kind: RepoHeatmapKind; at: number };
export type RepoHeatmapMeta = {
  cwd: string;
  mode: "lines" | "bytes";
  total: number;
  more: number;
  moreWeight: number;
  status: "idle" | "scanning" | "ready" | "error";
  scannedAt: number;
  note: string;
};

declare module "claude-code" {
  interface PluginState {
    "repo-heatmap": {
      files: RepoHeatmapFile[];
      meta: RepoHeatmapMeta;
      touches: Record<string, RepoHeatmapTouch>;
      recent: RepoHeatmapRecent[];
    };
  }
}
