// Changes Receipt: a plain-English receipt after every turn of the files that
// were created, changed and deleted.
//
// Two sources, reconciled at the end of each main-loop turn:
//  1. tool calls: successful Edit / Write / NotebookEdit (subagents' included),
//     with denied, errored and no-op calls kept apart as "attempted but not
//     applied";
//  2. a snapshot taken at turn.start and again at turn.complete: in a git repo
//     `git status --porcelain=v1 -z --untracked-files=all` plus a content hash
//     (`git hash-object`) of every dirty or untracked file, so a pre-existing
//     uncommitted change that did not move during the turn is left out;
//     outside git, a bounded size + mtime walk of the folder.
// A file that changed during the turn with no tool call behind it is "via
// shell". The end-of-turn line is returned from turn.complete; `/receipt`
// toggles a pane with the full list; the model can call `changes_receipt`.

import { update } from "claude-code";

const PLUGIN = "changes-receipt";
const PANE = "changes-receipt";
const TITLE = "Changes Receipt";
const TOOL = "changes_receipt";
export const TOOL_FULL = `mcp__${PLUGIN}__${TOOL}`;

export const KEEP = 20; // receipts kept in the session
export const WALK_CAP = 3000; // files a non-git walk records
export const GIT_CAP = 3000; // dirty + untracked entries a git snapshot hashes
const DIR_CAP = 1500; // folders a non-git walk lists
const LINES_MAX_BYTES = 1_000_000;
const COUNT_FILES_MAX = 60;

export const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".hg",
  ".svn",
  "coverage",
]);
const WATCHED = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
const GIT_ENV = { GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" };

const receiptsRef = { plugin: "changes-receipt", key: "receipts" };
const viewRef = { plugin: "changes-receipt", key: "view" };
const metaRef = { plugin: "changes-receipt", key: "meta" };

const DEFAULT_VIEW = { count: 5, open: {} };
const DEFAULT_META = { enabled: true, turns: 0, lastTurn: 0, lastEmpty: false };

export const ALWAYS_NOTES = [
  "Shell changes outside the session folder cannot be detected; Edit and Write outside it are listed with full paths.",
  "Anything else that writes files during a turn (your editor, a watcher) also shows up as via shell.",
];

export const HELP = [
  "Changes Receipt: after each turn, one line under the answer counts the files created, changed and deleted.",
  "",
  "/receipt              open or close the pane (last turn in full, earlier turns collapsible)",
  "/receipt last         print the last receipt as plain text, good for pasting",
  "/receipt turns <n>    list the last n receipts in the pane (1-20)",
  "/receipt off | on     stop or resume tracking and the end-of-turn line",
  "/receipt close        close the pane",
  "/receipt help         this help",
  "",
  "Or just ask Claude: what did you change?",
  "",
  "Pre-existing uncommitted changes that did not change during the turn are left out.",
  ...ALWAYS_NOTES,
].join("\n");

// ---- small helpers -------------------------------------------------------------

export const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export const clip = (s, n) => {
  const t = String(s ?? "");
  return t.length > n ? `${t.slice(0, Math.max(0, n - 3))}...` : t;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function canon(p, cwd = "/") {
  if (typeof p !== "string") return null;
  let s = p.trim();
  if (!s) return null;
  if (!s.startsWith("/")) s = `${String(cwd || "/").replace(/\/+$/, "")}/${s}`;
  const parts = [];
  for (const seg of s.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  let out = `/${parts.join("/")}`;
  // macOS: /tmp and /var are links into /private; spell both one way.
  if (/^\/private\/(tmp|var|etc)(\/|$)/.test(out)) out = out.slice("/private".length);
  return out;
}

export function isInside(abs, cwd) {
  const c = canon(cwd);
  return abs === c || abs.startsWith(c === "/" ? "/" : `${c}/`);
}

export function displayPath(abs, cwd) {
  const c = canon(cwd);
  if (abs === c) return ".";
  if (c === "/") return abs;
  return abs.startsWith(`${c}/`) ? abs.slice(c.length + 1) : abs;
}

const parentOf = (rel) => {
  const i = rel.lastIndexOf("/");
  return i < 0 ? "" : rel.slice(0, i);
};

export function isSkipped(rel) {
  return rel.split("/").some((seg) => SKIP_DIRS.has(seg));
}

export function countLines(text) {
  const t = String(text ?? "");
  if (t === "") return 0;
  const n = t.split("\n").length;
  return t.endsWith("\n") ? n - 1 : n;
}

export function patchCounts(patch) {
  let added = 0;
  let removed = 0;
  for (const h of patch ?? []) {
    for (const line of h?.lines ?? []) {
      if (line.startsWith("+")) added += 1;
      else if (line.startsWith("-")) removed += 1;
    }
  }
  return { added, removed };
}

export function isNoticeText(text) {
  return /^\s*<(task-notification|agent-message|background-task|system-reminder)\b/.test(String(text ?? ""));
}

// ---- tool calls ----------------------------------------------------------------

const DENIED = /doesn.t want to proceed|was rejected|rejected by|denied|not allowed|permission/i;

function errorReason(text) {
  const t = oneLine(String(text ?? "").replace(/<\/?tool_use_error>/g, ""));
  if (!t) return "failed";
  if (DENIED.test(t)) return `denied: ${clip(t, 70)}`;
  const first = t.split(/(?<=\.)\s/)[0] || t;
  return `failed: ${clip(first, 80)}`;
}

// One tool call -> one op: { tool, abs, agentId, ok, created, added, removed, counted, reason, noop }.
export function toolOpFrom(call, outcome, cwd) {
  if (!call || !WATCHED.has(call.tool)) return null;
  const raw = call.tool === "NotebookEdit" ? call.notebook_path : call.file_path;
  const abs = canon(raw, cwd);
  if (!abs) return null;
  const base = { tool: call.tool, abs, agentId: call.agentId ? String(call.agentId) : "" };
  if (!outcome) return { ...base, ok: false, reason: "failed: no result" };
  if (outcome.deny !== undefined) return { ...base, ok: false, reason: `denied: ${clip(oneLine(outcome.deny), 70)}` };
  if (outcome.isError) return { ...base, ok: false, reason: errorReason(outcome.text ?? outcome.result) };
  const res = outcome.result && typeof outcome.result === "object" ? outcome.result : {};
  if (res.staged) return { ...base, ok: false, reason: "held for review, not written" };
  if (call.tool === "NotebookEdit" && res.error) return { ...base, ok: false, reason: errorReason(res.error) };

  let created = false;
  if (call.tool === "Write") {
    created = res.type === "create";
    const content = typeof res.content === "string" ? res.content : call.content;
    if (res.type === "update" && typeof res.originalFile === "string" && res.originalFile === content) {
      return { ...base, ok: false, noop: true, reason: "no change: same content" };
    }
  }
  let counted = false;
  let added = 0;
  let removed = 0;
  if (Array.isArray(res.structuredPatch)) {
    ({ added, removed } = patchCounts(res.structuredPatch));
    counted = true;
    if (call.tool !== "Write" && res.structuredPatch.length === 0) {
      return { ...base, ok: false, noop: true, reason: "no change" };
    }
    if (call.tool === "Write" && created && added === 0) added = countLines(res.content ?? call.content);
  } else if (call.tool === "Write" && created) {
    added = countLines(call.content);
    counted = true;
  }
  return { ...base, ok: true, created, added, removed, counted };
}

// ---- git snapshot --------------------------------------------------------------

export function parsePorcelainZ(out) {
  const toks = String(out ?? "").split("\0");
  const entries = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.length < 4) continue;
    const x = t[0];
    const y = t[1];
    const path = t.slice(3);
    if (x === "R" || x === "C" || y === "R" || y === "C") {
      entries.push({ x, y, path, from: toks[i + 1] ?? "" });
      i += 1;
    } else entries.push({ x, y, path });
  }
  return entries;
}

// path (root-relative) -> { code, exists }
export function entryStates(entries) {
  const m = new Map();
  for (const e of entries) {
    const missing = e.y === "D" || (e.x === "D" && e.y === " ");
    m.set(e.path, { code: e.x + e.y, exists: !missing });
    if (e.from && (e.x === "R" || e.y === "R") && !m.has(e.from)) m.set(e.from, { code: "R<", exists: false });
  }
  return m;
}

export function parseLsTreeZ(out) {
  const m = new Map();
  for (const rec of String(out ?? "").split("\0")) {
    const tab = rec.indexOf("\t");
    if (tab < 0) continue;
    const [, , hash] = rec.slice(0, tab).split(" ");
    if (hash) m.set(rec.slice(tab + 1), hash);
  }
  return m;
}

export function parseNumstatZ(out) {
  const m = new Map();
  for (const rec of String(out ?? "").split("\0")) {
    const parts = rec.split("\t");
    if (parts.length < 3) continue;
    const [a, d, ...rest] = parts;
    const p = rest.join("\t").replace(/^\n+/, "");
    if (a === "-" || d === "-") m.set(p, null);
    else m.set(p, { added: Number(a) || 0, removed: Number(d) || 0 });
  }
  return m;
}

async function hashPaths(io, top, paths) {
  const out = new Map();
  const ok = paths.filter((p) => !p.includes("\n"));
  if (ok.length === 0) return out;
  try {
    const r = await io.run(["git", "hash-object", "--stdin-paths"], { cwd: top, stdin: `${ok.join("\n")}\n` });
    const lines = r.stdout.split("\n").filter(Boolean);
    if (r.exitCode === 0 && lines.length === ok.length) {
      ok.forEach((p, i) => out.set(p, lines[i].trim()));
      return out;
    }
  } catch {
    // fall through to one at a time
  }
  for (const p of ok.slice(0, 200)) {
    try {
      const r = await io.run(["git", "hash-object", "--", p], { cwd: top });
      if (r.exitCode === 0) out.set(p, r.stdout.trim());
    } catch {
      // unknown hash: compared as unknown
    }
  }
  return out;
}

async function lsTree(io, top, rev, paths) {
  const out = new Map();
  if (!rev || paths.length === 0) return out;
  for (let i = 0; i < paths.length; i += 400) {
    const chunk = paths.slice(i, i + 400);
    try {
      const r = await io.run(["git", "--literal-pathspecs", "ls-tree", "-z", rev, "--", ...chunk], { cwd: top });
      if (r.exitCode === 0) for (const [p, h] of parseLsTreeZ(r.stdout)) out.set(p, h);
    } catch {
      // treated as absent
    }
  }
  return out;
}

export async function gitSnapshot(io, cwd) {
  let top;
  try {
    const r = await io.run(["git", "rev-parse", "--show-toplevel"], { cwd });
    if (r.exitCode !== 0) return null;
    top = r.stdout.trim();
  } catch {
    return null;
  }
  if (!top) return null;
  const headR = await io.run(["git", "rev-parse", "--verify", "-q", "HEAD"], { cwd });
  const head = headR.exitCode === 0 ? headR.stdout.trim() : "";
  const st = await io.run(
    ["git", "-c", "core.quotepath=off", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", "."],
    { cwd, timeoutMs: 20000 },
  );
  if (st.exitCode !== 0) return null;
  const all = [...entryStates(parsePorcelainZ(st.stdout))].filter(([p]) => !isSkipped(p));
  const capped = all.length > GIT_CAP;
  const states = new Map(all.slice(0, GIT_CAP).map(([p, s]) => [p, { ...s, hash: null }]));
  const hashes = await hashPaths(
    io,
    top,
    [...states].filter(([, s]) => s.exists).map(([p]) => p),
  );
  for (const [p, h] of hashes) states.get(p).hash = h;
  return { mode: "git", cwd, top, head, states, capped };
}

// Start and end states of every candidate path -> net changes (root-relative).
export function classifyGit(cands, start, end, startTree, endTree) {
  const changes = [];
  for (const p of cands) {
    const s = start.states.get(p);
    const e = end.states.get(p);
    const a = s ? { exists: s.exists, hash: s.hash, dirty: true } : { exists: startTree.has(p), hash: startTree.get(p) ?? null, dirty: false };
    const b = e ? { exists: e.exists, hash: e.hash } : { exists: endTree.has(p), hash: endTree.get(p) ?? null };
    if (!a.exists && !b.exists) continue;
    if (a.exists && b.exists) {
      if (a.hash && b.hash && a.hash === b.hash) continue;
      if (!a.hash && !b.hash) continue; // nothing to compare: say nothing rather than guess
      changes.push({ rel: p, kind: "changed", startHash: a.hash, endHash: b.hash, startClean: !a.dirty });
    } else if (b.exists) changes.push({ rel: p, kind: "created", startHash: null, endHash: b.hash, startClean: !a.dirty });
    else changes.push({ rel: p, kind: "deleted", startHash: a.hash, endHash: null, startClean: !a.dirty });
  }
  return changes;
}

// Pair a deleted path with a created one when they hold the same content.
export function pairRenames(changes, keyOf) {
  const created = changes.filter((c) => c.kind === "created");
  const deleted = changes.filter((c) => c.kind === "deleted");
  const byKey = new Map();
  for (const c of created) {
    const k = keyOf(c, "end");
    if (!k) continue;
    byKey.set(k, byKey.has(k) ? null : c); // ambiguous: no pairing
  }
  const gone = new Set();
  const out = [];
  for (const d of deleted) {
    const k = keyOf(d, "start");
    const c = k ? byKey.get(k) : undefined;
    if (c && !gone.has(c)) {
      gone.add(c);
      gone.add(d);
      out.push({ ...c, kind: "renamed", fromRel: d.rel });
    }
  }
  return [...changes.filter((c) => !gone.has(c)), ...out];
}

export async function gitDiff(io, start, end) {
  const cands = new Set([...start.states.keys(), ...end.states.keys()]);
  if (start.head && end.head && start.head !== end.head) {
    try {
      const d = await io.run(["git", "diff", "--name-only", "--no-renames", "-z", start.head, end.head, "--", "."], { cwd: end.cwd });
      if (d.exitCode === 0) for (const p of d.stdout.split("\0").filter(Boolean)) if (!isSkipped(p)) cands.add(p);
    } catch {
      // the moved HEAD's own changes are missed
    }
  }
  const startTree = await lsTree(io, start.top, start.head, [...cands].filter((p) => !start.states.has(p)));
  const endTree = await lsTree(io, end.top, end.head, [...cands].filter((p) => !end.states.has(p)));
  let changes = classifyGit(cands, start, end, startTree, endTree);
  changes = pairRenames(changes, (c, side) => (side === "end" ? c.endHash : c.startHash));

  // Line counts: a file clean at turn start diffs against the start HEAD.
  const numPaths = changes.filter((c) => c.startClean && start.head && (c.kind === "changed" || c.kind === "deleted")).map((c) => c.rel);
  if (numPaths.length > 0) {
    try {
      const r = await io.run(
        ["git", "--literal-pathspecs", "diff", "--numstat", "--no-renames", "-z", start.head, "--", ...numPaths],
        { cwd: start.top },
      );
      if (r.exitCode === 0) {
        const nums = parseNumstatZ(r.stdout);
        for (const c of changes) {
          const n = nums.get(c.rel);
          if (n) Object.assign(c, n);
        }
      }
    } catch {
      // counts omitted
    }
  }
  const top = start.top;
  return changes.map((c) => ({
    abs: canon(`${top}/${c.rel}`),
    kind: c.kind,
    fromAbs: c.fromRel ? canon(`${top}/${c.fromRel}`) : undefined,
    added: c.added,
    removed: c.removed,
  }));
}

// ---- non-git walk --------------------------------------------------------------

export async function walkSnapshot(io, cwd, cap = WALK_CAP) {
  const files = new Map();
  const done = new Set();
  let capped = false;
  let listed = 0;
  const queue = [""];
  while (queue.length > 0) {
    const rel = queue.shift();
    if (listed >= DIR_CAP) {
      capped = true;
      break;
    }
    listed += 1;
    let entries;
    try {
      entries = await io.list(rel ? `${cwd}/${rel}` : cwd);
    } catch {
      continue;
    }
    let complete = true;
    for (const en of entries) {
      const p = rel ? `${rel}/${en.name}` : en.name;
      if (en.kind === "dir") {
        if (!SKIP_DIRS.has(en.name) && !en.isLink) queue.push(p);
        continue;
      }
      if (en.kind !== "file") continue;
      if (files.size >= cap) {
        capped = true;
        complete = false;
        break;
      }
      files.set(p, { size: en.size, mtime: en.mtimeMs });
    }
    if (complete) done.add(rel);
    if (capped) break;
  }
  return { mode: "walk", cwd, files, done, capped };
}

export function diffWalk(start, end) {
  const covered = (rel) => {
    const dir = parentOf(rel);
    return (start.done.has(dir) || !start.capped) && (end.done.has(dir) || !end.capped);
  };
  const changes = [];
  for (const p of new Set([...start.files.keys(), ...end.files.keys()])) {
    if (!covered(p)) continue;
    const a = start.files.get(p);
    const b = end.files.get(p);
    if (a && b) {
      if (a.size !== b.size || a.mtime !== b.mtime) changes.push({ rel: p, kind: "changed", a, b });
    } else if (b) changes.push({ rel: p, kind: "created", a, b });
    else changes.push({ rel: p, kind: "deleted", a, b });
  }
  // mv keeps size and mtime: a deleted + created pair with both equal is a rename.
  const paired = pairRenames(changes, (c, side) => {
    const s = side === "end" ? c.b : c.a;
    return s && s.size > 0 ? `${s.size}:${s.mtime}` : null;
  });
  return paired.map((c) => ({
    abs: canon(`${start.cwd}/${c.rel}`),
    kind: c.kind,
    fromAbs: c.fromRel ? canon(`${start.cwd}/${c.fromRel}`) : undefined,
  }));
}

// ---- snapshots, either kind -------------------------------------------------------

export async function takeSnapshot(io, cwd) {
  try {
    const g = await gitSnapshot(io, cwd);
    if (g) return g;
  } catch {
    // fall back to the walk
  }
  try {
    return await walkSnapshot(io, cwd);
  } catch {
    return null;
  }
}

export async function diffSnapshots(io, start, end) {
  if (!start || !end || start.mode !== end.mode) return null;
  if (start.mode === "git") return gitDiff(io, start, end);
  return diffWalk(start, end);
}

// ---- reconcile -------------------------------------------------------------------

const KIND_ORDER = { created: 0, changed: 1, renamed: 2, deleted: 3 };

const sourceLabel = (op) => (op.agentId ? `${op.tool} (subagent)` : op.tool);

// fsChanges: [{ abs, kind, fromAbs?, added?, removed? }] or null (no snapshot)
// ops: tool ops of the turn; exists: abs -> boolean for tool-only paths now.
export function reconcile({ fsChanges, ops, cwd, exists = {} }) {
  const okOps = new Map();
  for (const op of ops) {
    if (!op.ok) continue;
    if (!okOps.has(op.abs)) okOps.set(op.abs, []);
    okOps.get(op.abs).push(op);
  }
  const sumOps = (list) => {
    if (!list || list.length === 0 || list.some((o) => !o.counted)) return {};
    return { added: list.reduce((s, o) => s + o.added, 0), removed: list.reduce((s, o) => s + o.removed, 0) };
  };
  const items = [];
  const seen = new Set();
  for (const c of fsChanges ?? []) {
    const list = [...(okOps.get(c.abs) ?? []), ...(c.fromAbs ? okOps.get(c.fromAbs) ?? [] : [])];
    const sources = list.length > 0 ? [...new Set(list.map(sourceLabel))] : ["shell"];
    seen.add(c.abs);
    if (c.fromAbs) seen.add(c.fromAbs);
    let added = c.added;
    let removed = c.removed;
    if (added === undefined && removed === undefined && c.kind !== "renamed" && c.kind !== "deleted") {
      ({ added, removed } = sumOps(okOps.get(c.abs)));
    }
    const item = { kind: c.kind, path: displayPath(c.abs, cwd), sources };
    if (c.fromAbs) item.from = displayPath(c.fromAbs, cwd);
    if (added !== undefined) item.added = added;
    if (removed !== undefined) item.removed = removed;
    if (!isInside(c.abs, cwd)) item.outside = true;
    items.push(item);
  }
  // Tool changes the snapshot did not see: outside the folder, ignored by git,
  // past the cap, or no snapshot at all. A file gone again is left out.
  for (const [abs, list] of okOps) {
    if (seen.has(abs)) continue;
    if (exists[abs] === false) continue;
    const { added, removed } = sumOps(list);
    const item = {
      kind: list[0].created ? "created" : "changed",
      path: displayPath(abs, cwd),
      sources: [...new Set(list.map(sourceLabel))],
    };
    if (added !== undefined) item.added = added;
    if (removed !== undefined) item.removed = removed;
    if (!isInside(abs, cwd)) item.outside = true;
    items.push(item);
  }
  items.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.path.localeCompare(b.path));

  const attempts = [];
  const tried = new Set();
  for (const op of ops) {
    if (op.ok || okOps.has(op.abs)) continue;
    const key = `${op.abs}\0${op.tool}\0${op.reason}`;
    if (tried.has(key)) continue;
    tried.add(key);
    const a = { path: displayPath(op.abs, cwd), tool: op.tool, reason: op.reason };
    if (op.agentId) a.bySubagent = true;
    attempts.push(a);
  }
  return { items, attempts };
}

// Paths only the tool calls know of, which the caller checks for existence.
export function toolOnlyPaths(fsChanges, ops, cwd) {
  const seen = new Set();
  for (const c of fsChanges ?? []) {
    seen.add(c.abs);
    if (c.fromAbs) seen.add(c.fromAbs);
  }
  const out = new Set();
  for (const op of ops) if (op.ok && !seen.has(op.abs)) out.add(op.abs);
  return [...out];
}

// ---- words -------------------------------------------------------------------------

export function counts(rc) {
  const c = { created: 0, changed: 0, deleted: 0, renamed: 0, shell: 0, attempts: rc.attempts.length };
  for (const it of rc.items) {
    c[it.kind] += 1;
    if (it.sources.length === 1 && it.sources[0] === "shell") c.shell += 1;
  }
  return c;
}

export function summaryLine(rc) {
  if (!rc || (rc.items.length === 0 && rc.attempts.length === 0)) return "";
  const c = counts(rc);
  const parts = [];
  if (c.created) parts.push(`${c.created} created`);
  if (c.changed) parts.push(`${c.changed} changed`);
  if (c.renamed) parts.push(`${c.renamed} renamed`);
  if (c.deleted) parts.push(`${c.deleted} deleted`);
  if (rc.items.length === 0) parts.push("nothing changed");
  if (c.shell) parts.push(`${c.shell} via shell`);
  if (c.attempts) parts.push(`${c.attempts} not applied`);
  return `Receipt · ${parts.join(" · ")} · /receipt for details`;
}

export function lineCounts(it) {
  const a = it.added ?? 0;
  const r = it.removed ?? 0;
  if (a && r) return `${plural(a, "line")} added, ${r} removed`;
  if (a) return `${plural(a, "line")} added`;
  if (r) return `${plural(r, "line")} removed`;
  return "";
}

export function sourceText(it) {
  if (it.sources.length === 1 && it.sources[0] === "shell") return "via shell";
  return `by ${it.sources.join(", ")}`;
}

const GROUPS = [
  ["created", "Created"],
  ["changed", "Changed"],
  ["renamed", "Renamed"],
  ["deleted", "Deleted"],
];

export function receiptText(rc) {
  if (!rc) return "No receipt yet: no turn has changed a file in this session.";
  const lines = [`Turn ${rc.n} receipt${rc.prompt ? ` for "${clip(oneLine(rc.prompt), 70)}"` : ""}`];
  if (rc.items.length === 0 && rc.attempts.length === 0) lines.push("No files were created, changed or deleted.");
  for (const [kind, label] of GROUPS) {
    const list = rc.items.filter((it) => it.kind === kind);
    if (list.length === 0) continue;
    lines.push(`${label} (${list.length})`);
    for (const it of list) {
      const name = it.from ? `${it.from} to ${it.path}` : it.path;
      const lc = lineCounts(it);
      lines.push(`- ${name}${lc ? `, ${lc}` : ""}, ${sourceText(it)}`);
    }
  }
  if (rc.attempts.length > 0) {
    lines.push(`Attempted but not applied (${rc.attempts.length})`);
    for (const a of rc.attempts) lines.push(`- ${a.path}, ${a.tool}${a.bySubagent ? " (subagent)" : ""} ${a.reason}`);
  }
  for (const n of rc.notes) lines.push(`Note: ${n}`);
  return lines.join("\n");
}

// ---- the plugin ---------------------------------------------------------------------

export function register(on) {
  let current = null; // { id, n, prompt, at, cwd, snap, ops }
  let between = []; // ops landing while no main turn runs (a background subagent)

  on("session.start", async ($, e, next) => {
    const started = await next(e);
    try {
      await $.command.register({
        name: "receipt",
        description: "Changes Receipt: files this turn created, changed and deleted",
        argumentHint: "[last|turns <n>|on|off|close|help]",
        immediate: true,
      });
    } catch {
      // registered on an earlier load
    }
    try {
      await $.tool.register({
        name: TOOL,
        description:
          "Show the receipt of files created, changed, renamed and deleted in a recent turn of this session, " +
          "from Edit/Write/NotebookEdit calls (subagents included) and a git or file snapshot that catches shell changes. " +
          "Also lists edits that were attempted but not applied. Call it when the user asks what you changed, " +
          "which files were touched, or for a receipt or summary of changes. Pass the answer on as written.",
        inputSchema: {
          type: "object",
          properties: {
            turn: {
              description: '"last" (default) for the latest receipt, "all" for every kept receipt, or a turn number.',
              anyOf: [{ type: "string" }, { type: "integer" }],
            },
          },
        },
      });
    } catch {
      // registered on an earlier load
    }
    let enabled = true;
    try {
      enabled = (await $.store.get("enabled")) !== false;
    } catch {
      // default on
    }
    await update($, metaRef, (m) => ({ ...DEFAULT_META, ...(m ?? {}), enabled }));
    return started;
  });

  on("turn.start", async ($, e, next) => {
    if (e.agentId) return next(e); // helper turns must not replace the main receipt
    try {
      const { value: meta = DEFAULT_META } = await $.state.get(metaRef);
      const n = (meta.turns ?? 0) + 1;
      await $.state.set(metaRef, { ...meta, turns: n });
      if (meta.enabled === false) {
        current = null;
      } else {
        const cwd = await $.session.cwd();
        const io = {
          run: (argv, opts = {}) => $.process.run(argv, { timeoutMs: 15000, ...opts, env: GIT_ENV }),
          list: (path) => $.fs.list(path),
        };
        const prompt = isNoticeText(e.text) ? "(background task finished)" : e.text ?? "";
        const turn = { id: e.turnId, n, prompt, at: await $.clock.now(), cwd, snap: null, ops: between };
        current = turn; // keep direct writes even when the optional snapshot fails
        between = [];
        turn.snap = await takeSnapshot(io, cwd);
      }
    } catch {
      current = null;
    }
    return next(e);
  });

  on("tool.call", async ($, e, next) => {
    if (!WATCHED.has(e.tool)) return next(e);
    const result = await next(e);
    try {
      const cwd = current ? current.cwd : await $.session.cwd();
      const op = toolOpFrom(e, result, cwd);
      if (op) {
        if (current) current.ops.push(op);
        else {
          const { value: meta = DEFAULT_META } = await $.state.get(metaRef);
          if (meta.enabled !== false) between = [...between, op].slice(-200);
        }
      }
    } catch {
      // the receipt is a record, never a reason to fail the call
    }
    return result;
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (e.agentId) return result; // a subagent's run: its calls ride the main turn
    let turn = current;
    current = null;
    if (!turn && between.length) {
      const { value: meta = DEFAULT_META } = await $.state.get(metaRef);
      if (meta.enabled !== false) {
        turn = { id: e.turnId, n: meta.turns || 1, prompt: "Recovered tool activity", at: await $.clock.now(), cwd: await $.session.cwd(), snap: null, ops: between };
        between = [];
      }
    }
    if (!turn) return result;
    try {
      const cwd = turn.cwd;
      const io = {
        run: (argv, opts = {}) => $.process.run(argv, { timeoutMs: 15000, ...opts, env: GIT_ENV }),
        list: (path) => $.fs.list(path),
      };
      const notes = [];
      let fsChanges = null;
      if (!turn.snap) {
        notes.push("No folder snapshot this turn: only Edit and Write calls are listed, shell changes are not.");
      } else {
        let endSnap = null;
        try {
          endSnap = await takeSnapshot(io, cwd);
          fsChanges = await diffSnapshots(io, turn.snap, endSnap);
        } catch {
          // Snapshot enrichment must never discard confirmed tool writes.
          fsChanges = null;
        }
        if (fsChanges === null) notes.push("The folder snapshot failed at the end of the turn: shell changes are not listed.");
        if (turn.snap.mode === "walk") notes.push("Not a git folder: shell changes were found by file size and time.");
        if (turn.snap.capped || (endSnap && endSnap.capped)) {
          notes.push(`Snapshot capped at ${turn.snap.mode === "git" ? GIT_CAP : WALK_CAP} files: shell changes past the cap were not checked.`);
        }
      }
      const exists = {};
      for (const abs of toolOnlyPaths(fsChanges, turn.ops, cwd)) {
        try {
          exists[abs] = await $.fs.exists(abs);
        } catch {
          exists[abs] = true;
        }
      }
      const { items, attempts } = reconcile({ fsChanges, ops: turn.ops, cwd, exists });
      // Line counts for created files the tools did not count (shell-made).
      let budget = COUNT_FILES_MAX;
      for (const it of items) {
        if (it.kind !== "created" || it.added !== undefined || budget <= 0) continue;
        budget -= 1;
        try {
          const abs = canon(it.path, cwd);
          const st = await $.fs.stat(abs);
          if (st.kind !== "file" || st.size > LINES_MAX_BYTES) continue;
          const text = await $.fs.read(abs);
          if (typeof text === "string" && !text.includes("\u0000")) it.added = countLines(text);
        } catch {
          // counts omitted
        }
      }
      const empty = items.length === 0 && attempts.length === 0;
      const { value: meta = DEFAULT_META } = await $.state.get(metaRef);
      await $.state.set(metaRef, { ...meta, lastTurn: turn.n, lastEmpty: empty });
      if (empty) return result;
      const rc = {
        id: String(turn.id ?? `t${turn.n}`),
        n: turn.n,
        prompt: clip(oneLine(turn.prompt), 200),
        at: turn.at,
        mode: turn.snap ? turn.snap.mode : "none",
        notes,
        items,
        attempts,
      };
      await update($, receiptsRef, (list) => [...(list ?? []), rc].slice(-KEEP));
      return { ...result, text: summaryLine(rc) };
    } catch {
      // Retain the evidence for the next completion instead of losing it.
      between = [...turn.ops, ...between].slice(-200);
      return result;
    }
  });

  // ---- /receipt ----------------------------------------------------------------------
  on("command.run", { command: "receipt" }, async ($, e) => {
    const words = String(e.args ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const verb = words[0] ?? "";
    if (verb === "help" || verb === "?") return { text: HELP };
    if (verb === "last") {
      const { value: list = [] } = await $.state.get(receiptsRef);
      const { value: meta = DEFAULT_META } = await $.state.get(metaRef);
      const text = list.length ? receiptText(list[list.length - 1]) : "No saved receipt yet. Tracking may have been off, started after the changes, or failed to capture the turn.";
      return { text: meta.enabled === false ? "Tracking is off. Use /receipt on before your next task.\n\n" + text : text };
    }
    if (verb === "off" || verb === "on") {
      const enabled = verb === "on";
      await update($, metaRef, (m) => ({ ...DEFAULT_META, ...(m ?? {}), enabled }));
      await $.store.set("enabled", enabled);
      if (!enabled) {
        current = null;
        between = [];
      }
      return {
        text: enabled
          ? "Changes Receipt on: each turn ends with a receipt line."
          : "Changes Receipt off: no snapshots, no tracking, no end-of-turn line. /receipt on to resume.",
      };
    }
    if (verb === "turns") {
      const n = Number(words[1]);
      if (!Number.isInteger(n) || n < 1 || n > KEEP) return { text: `Usage /receipt turns <1-${KEEP}>` };
      await update($, viewRef, (v) => ({ ...DEFAULT_VIEW, ...(v ?? {}), count: n }));
      const panes = await $.ui.panes();
      if (!panes.some((p) => p.id === PANE)) await $.ui.open({ id: PANE, title: TITLE });
      return { text: `Changes Receipt lists the last ${plural(n, "receipt")}.` };
    }
    const panes = await $.ui.panes();
    const pane = panes.find((p) => p.id === PANE);
    if (verb === "close" || (verb === "" && pane && pane.isShown !== false)) {
      if (pane) await $.ui.close({ id: PANE });
      return { text: "Changes Receipt closed." };
    }
    if (verb !== "" && verb !== "open") return { text: `Unknown option "${verb}".\n\n${HELP}` };
    const opened = await $.ui.open({ id: PANE, title: TITLE });
    if (opened && opened.isPlaced === false) {
      const { value: list = [] } = await $.state.get(receiptsRef);
      return { text: `Changes Receipt could not dock (${opened.reason}). Here is the last receipt:\n\n${receiptText(list[list.length - 1])}` };
    }
    return { text: "Changes Receipt open. /receipt again closes it." };
  });

  // ---- the model's tool ------------------------------------------------------------
  on("tool.call", { tool: "mcp__changes-receipt__changes_receipt" }, async ($, e) => {
    const { value: list = [] } = await $.state.get(receiptsRef);
    const { value: meta = DEFAULT_META } = await $.state.get(metaRef);
    const want = e.turn ?? "last";
    let text;
    if (list.length === 0) {
      text = "No receipt yet: no turn in this session has created, changed or deleted a file (or tried to).";
    } else if (want === "all") {
      text = list.map(receiptText).join("\n\n");
    } else if (want === "last" || want === "" || want === undefined) {
      const rc = list[list.length - 1];
      text = receiptText(rc);
      if (meta.lastEmpty && meta.lastTurn > rc.n) {
        text = `The most recent finished turn (turn ${meta.lastTurn}) changed no files. The latest receipt is from turn ${rc.n}:\n\n${text}`;
      }
    } else {
      const n = Number(want);
      const rc = list.find((r) => r.n === n);
      text = rc
        ? receiptText(rc)
        : `No receipt for turn ${want}: it changed no files, or it is older than the last ${KEEP} receipts. Kept turns: ${list.map((r) => r.n).join(", ")}.`;
    }
    if (meta.enabled === false) text = `Tracking is off (/receipt on resumes it).\n\n${text}`;
    return { result: text };
  });

  // ---- the pane ----------------------------------------------------------------------
  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    const { value: list = [] } = await $.state.get(receiptsRef);
    const { value: view = DEFAULT_VIEW } = await $.state.get(viewRef);
    const { value: meta = DEFAULT_META } = await $.state.get(metaRef);
    const width = Math.max(30, e.props?.bodyColumns ?? 80);
    const dim = (children, key) => Text({ key, dimColor: true, wrap: "truncate", children });

    const rows = [];
    const head = [];
    head.push(meta.enabled === false ? "tracking off" : "tracking on");
    if (list.length) head.push(plural(list.length, "receipt"));
    if (meta.lastEmpty && list.length && meta.lastTurn > list[list.length - 1].n) head.push(`turn ${meta.lastTurn} changed nothing`);
    rows.push(dim(head.join("  ·  "), "head"));

    if (list.length === 0) {
      rows.push(Text({ key: "empty", children: "No changes yet. After a turn that creates, changes or deletes a file, its receipt shows here." }));
    }

    const shown = list.slice(-Math.max(1, view.count ?? 5)).reverse();
    shown.forEach((rc, idx) => {
      const isOpen = view.open?.[rc.id] ?? idx === 0;
      const summary = summaryLine(rc).replace(/^Receipt · /, "").replace(/ · \/receipt for details$/, "");
      rows.push(
        Box({
          key: `h:${rc.id}`,
          flexDirection: "row",
          gap: 1,
          marginTop: 1,
          children: [
            Button({
              key: `t:${rc.id}`,
              label: isOpen ? "-" : "+",
              plain: true,
              onPress: () =>
                update($, viewRef, (v) => {
                  const cur = v ?? DEFAULT_VIEW;
                  return { ...cur, open: { ...(cur.open ?? {}), [rc.id]: !isOpen } };
                }),
            }),
            Text({ bold: true, color: idx === 0 ? "#e8603c" : undefined, children: `Turn ${rc.n}` }),
            Text({ dimColor: true, wrap: "truncate", children: clip(summary, Math.max(10, width - 14)) }),
          ],
        }),
      );
      if (!isOpen) return;
      if (rc.prompt) rows.push(dim(clip(`"${rc.prompt}"`, width), `p:${rc.id}`));
      for (const [kind, label] of GROUPS) {
        const its = rc.items.filter((it) => it.kind === kind);
        if (its.length === 0) continue;
        rows.push(Text({ key: `g:${rc.id}:${kind}`, bold: true, children: `${label} (${its.length})` }));
        its.forEach((it, i) => {
          const name = it.from ? `${it.from} -> ${it.path}` : it.path;
          const src = sourceText(it);
          const room = Math.max(8, width - 22 - src.length);
          rows.push(
            Box({
              key: `i:${rc.id}:${kind}:${i}`,
              flexDirection: "row",
              gap: 1,
              children: [
                Text({ color: MARK_COLOR[kind], children: ` ${MARK[kind]}` }),
                Text({ wrap: "truncate", children: clip(name, room) }),
                it.added ? Text({ color: "green", children: `+${it.added}` }) : null,
                it.removed ? Text({ color: "red", children: `-${it.removed}` }) : null,
                Text({ dimColor: true, children: src }),
              ],
            }),
          );
        });
      }
      if (rc.attempts.length > 0) {
        rows.push(Text({ key: `g:${rc.id}:att`, bold: true, color: "yellow", children: `Attempted but not applied (${rc.attempts.length})` }));
        rc.attempts.forEach((a, i) => {
          rows.push(
            Text({
              key: `a:${rc.id}:${i}`,
              wrap: "truncate",
              children: clip(` ! ${a.path}  ${a.tool}${a.bySubagent ? " (subagent)" : ""} ${a.reason}`, width),
            }),
          );
        });
      }
      for (const [i, n] of rc.notes.entries()) rows.push(dim(clip(`note: ${n}`, width), `n:${rc.id}:${i}`));
    });

    rows.push(dim(clip("Pre-existing uncommitted changes that did not move this turn are left out.", width), "f1"));
    rows.push(dim(clip("Shell changes outside this folder are not seen; other programs' writes count as shell.", width), "f2"));
    rows.push(
      Box({
        key: "buttons",
        flexDirection: "row",
        gap: 1,
        marginTop: 1,
        children: [
          Button({
            key: "copy",
            label: "y Copy last",
            hotkey: "y",
            onPress: async (pe) => {
              const { value: now = [] } = await $.state.get(receiptsRef);
              const r = await $.ui.copy({ text: receiptText(now[now.length - 1]), surface: pe?.surface });
              $.ui.toast(r && r.isCopied ? "Receipt copied." : "Could not copy here. /receipt last prints it.");
            },
          }),
          Button({ key: "close", label: "c Close", hotkey: "c", role: "dismiss", onPress: () => $.ui.close({ id: PANE }) }),
        ],
      }),
    );
    return Box({ flexDirection: "column", children: rows });
  });
}

const MARK = { created: "+", changed: "~", renamed: ">", deleted: "-" };
const MARK_COLOR = { created: "green", changed: "yellow", renamed: "cyan", deleted: "red" };
