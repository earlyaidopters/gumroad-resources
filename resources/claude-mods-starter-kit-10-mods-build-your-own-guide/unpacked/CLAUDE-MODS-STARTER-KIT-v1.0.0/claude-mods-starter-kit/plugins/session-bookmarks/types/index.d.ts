export type SessionBookmarksRow = {
  n: number;
  id: string;
  title: string;
  note: string;
  project: string;
  branch: string;
  cwd: string;
  sessionId: string;
  createdAt: number;
  isCwdMissing: boolean;
  isTranscriptMissing: boolean;
};

export type SessionBookmarksPane = {
  rows: SessionBookmarksRow[];
  notice: string;
  file: string;
  loadedAt: number;
};

declare module "claude-code" {
  interface PluginState {
    "session-bookmarks": {
      pane: SessionBookmarksPane;
    };
  }
}
