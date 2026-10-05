// Threads: pure helpers (no `$`). Everything here is plain data in, plain data out,
// so the tests can pin it down without an engine.

export const TMUX_SOCKET = "cc-threads";
export const TITLE_PREFIX = "Thread | ";
export const DEFAULT_CAP = 4;
export const MAX_CAP = 12;
export const STATUSES = ["starting", "working", "idle", "needs-you", "held-message", "needs-login", "needs-trust", "exited", "closed"];
export const LIVE = new Set(["starting", "working", "idle", "needs-you", "held-message", "needs-login", "needs-trust"]);
export const ATTENTION = new Set(["needs-you", "held-message", "needs-login", "needs-trust"]);
// Per-thread --settings. crossSessionInbound accept: Claude Code would otherwise hold messages
// between sessions of different permission classes. skipDangerousModePermissionPrompt (read from
// flag settings too): without it a bypass thread sits on the one-time bypass warning dialog.
export function threadSettings(permissionMode) {
  return JSON.stringify({
    crossSessionInbound: "accept",
    ...(permissionMode === "bypassPermissions" ? { skipDangerousModePermissionPrompt: true } : {}),
  });
}
export const MODES = ["default", "acceptEdits", "plan", "auto", "bypassPermissions"];
// The user's choice: threads run with bypassed permissions unless told otherwise.
export const DEFAULT_MODE = "bypassPermissions";
export const MODEL_ALIASES = ["haiku", "sonnet", "opus", "fable"];
const MODEL_ID = /^claude-(haiku|sonnet|opus|fable|mythos)-[0-9][0-9a-z.-]*(\[1m\])?$/;
const ALIAS_1M = /^(sonnet|opus|fable)\[1m\]$/;

// Variables a nested Claude Code would otherwise inherit from the lead and mistake
// for its own (it would think it is a child of the lead, reuse its socket, and so on).
export const SCRUB_ENV = [
  "CLAUDECODE",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_HOST_SESSION_ID",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "CLAUDE_PID",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_CODE_TERMINAL_MCP_TOOLS",
  "CLAUDE_CODE_DISABLE_TERMINAL_TITLE",
  "CLAUDE_EFFORT",
  "CLAUDE_PLUGIN_DATA",
  "CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES",
  "CLAUDE_CODE_REPORT_FINDINGS",
  "CLAUDE_PREVIEW_CLASSIFIER_FLOOR",
  "CLAUDE_AGENT_SDK_VERSION",
  "CLAUDE_CODE_EXECPATH",
  "TMUX",
  "TERM_PROGRAM",
];

export const LOGIN_HINT = "Threads need the terminal Claude Code login. Run `claude auth login` in Terminal once.";

// ---- models -------------------------------------------------------------------

export function normalizeModel(raw) {
  const m = String(raw ?? "").trim().toLowerCase();
  if (MODEL_ALIASES.includes(m) || ALIAS_1M.test(m) || MODEL_ID.test(m)) return { model: m };
  return {
    error: `Unknown model "${raw}". Use haiku, sonnet, opus, fable, or a full id like claude-haiku-4-5-20251001.`,
  };
}

// A short chip for the tree: the family name.
export function modelChip(model) {
  const m = String(model ?? "").toLowerCase();
  for (const f of ["haiku", "sonnet", "opus", "fable", "mythos"]) if (m.includes(f)) return f;
  return m ? m.slice(0, 8) : "?";
}

// ---- titles, ids, refs ----------------------------------------------------------

// ---- worktrees, unread, renames -------------------------------------------------------

export function worktreeName(id) {
  return `threads-${id}`;
}

// Where Claude Code puts a --worktree session (and where inline threads get theirs)
export function worktreeFor(repo, id) {
  const name = worktreeName(id);
  return { name, repo, path: `${repo}/.claude/worktrees/${name}`, branch: `worktree-${name}` };
}

export function worktreeLine(w) {
  return `You work in your own git worktree (${w.path}, branch ${w.branch}), isolated from the lead and other threads, so edit freely there. Before your final answer, commit your finished work on that branch (git add -A && git commit -m "<what you did>") so the lead can review and merge it.`;
}

// After a worktree thread ends: what to do with it, from git status --porcelain and the commit count past its base
export function worktreeOutcome({ statusOk, porcelain, commits }) {
  const dirty = String(porcelain ?? "").trim().length > 0;
  if (statusOk && !dirty && !commits) return { remove: true, dirty: false, commits: 0 };
  return { remove: false, dirty, commits: Number(commits) || 0 };
}

// New output the user has not looked at: a report newer than the last time they viewed the thread
export function isUnread(t) {
  if (t.status === "closed" && !t.lastReport) return false;
  return Boolean(t.lastReport?.at) && (t.lastReport.at ?? 0) > (t.seenAt ?? 0);
}

export function threadTitle(raw) {
  const t = oneLine(raw).slice(0, 80);
  if (!t) return "";
  return /^thread\s*\|/i.test(t) ? t : `${TITLE_PREFIX}${t}`;
}

export function shortTitle(title) {
  return String(title ?? "").replace(/^thread\s*\|\s*/i, "");
}

export function tmuxName(id) {
  return `thread-${id}`;
}

// Short id: "t" plus five hex characters of the session uuid, unique in the registry.
export function shortId(uuid, taken) {
  const hex = String(uuid).replace(/[^0-9a-f]/gi, "").toLowerCase();
  for (let n = 5; n <= hex.length; n++) {
    const id = `t${hex.slice(0, n)}`;
    if (!taken.has(id)) return id;
  }
  return `t${hex}`;
}

// Finds one thread by id, id prefix or title prefix. Live threads win over closed ones.
export function resolveRef(threads, ref) {
  const q = String(ref ?? "").trim().toLowerCase();
  if (!q) return { error: "Name a thread by its id or the start of its title. /threads list shows them." };
  const exact = threads.filter((t) => t.id === q);
  if (exact.length === 1) return { thread: exact[0] };
  const hits = threads.filter(
    (t) =>
      t.id.startsWith(q) ||
      shortTitle(t.title).toLowerCase().startsWith(q) ||
      t.title.toLowerCase().startsWith(q) ||
      t.sessionId === q,
  );
  if (hits.length === 1) return { thread: hits[0] };
  const live = hits.filter((t) => LIVE.has(t.status));
  if (live.length === 1) return { thread: live[0] };
  if (hits.length === 0) return { error: `No thread matches "${ref}". /threads list shows them.` };
  const pool = live.length > 1 ? live : hits;
  return {
    error: `"${ref}" matches ${pool.length} threads: ${pool.map((t) => `${t.id} (${shortTitle(t.title)})`).join(", ")}. Use the id.`,
  };
}

// ---- argument parsing -------------------------------------------------------------

// Splits on spaces, keeping "quoted words" together.
export function tokenize(text) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(String(text ?? "")))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// `/threads new <model> <title> [--cwd <path>] [--mode <mode>] [--no-report] -- <task>`
export function parseNew(args) {
  const text = String(args ?? "");
  const sep = /(^|\s)--(\s|$)/.exec(text);
  if (!sep) return { error: NEW_USAGE };
  const head = text.slice(0, sep.index);
  const task = text.slice(sep.index + sep[0].length).trim();
  const tokens = tokenize(head);
  const [model = "", ...rest] = tokens;
  const words = [];
  const out = { model, title: "", task, cwd: undefined, permissionMode: undefined, reportBack: true, backend: "auto" };
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i];
    if (tok === "--cwd") {
      out.cwd = rest[++i];
      if (!out.cwd) return { error: "--cwd needs a folder." };
    } else if (tok === "--mode") {
      out.permissionMode = rest[++i];
      if (!out.permissionMode) return { error: "--mode needs one of default, acceptEdits, plan, auto." };
    } else if (tok === "--effort") {
      out.effort = rest[++i];
      if (!out.effort) return { error: "--effort needs one of low, medium, high, xhigh, max." };
    } else if (tok === "--no-report") {
      out.reportBack = false;
    } else if (tok === "--worktree") {
      out.worktree = true;
    } else if (tok === "--inline" || tok === "--session") {
      out.backend = tok.slice(2);
    } else {
      words.push(tok);
    }
  }
  out.title = words.join(" ");
  if (!out.model || !out.title || !out.task) return { error: NEW_USAGE };
  return out;
}

export const NEW_USAGE =
  "Usage is /threads new <model> <title> [--inline|--session] [--cwd <path>] [--mode bypassPermissions|default|acceptEdits|plan|auto] [--effort <level>] [--worktree] [--no-report] -- <task>";

export function checkMode(mode) {
  if (mode === undefined || mode === null || mode === "") return { mode: undefined };
  const want = String(mode).toLowerCase() === "bypass" ? "bypasspermissions" : String(mode).toLowerCase();
  const hit = MODES.find((m) => m.toLowerCase() === want);
  if (!hit) return { error: `Unknown permission mode "${mode}". Use bypassPermissions, default, acceptEdits, plan or auto.` };
  return { mode: hit };
}

// ---- the thread's brief and argv -----------------------------------------------------

export function leadAddress(socket) {
  return socket ? `uds:${socket}` : "";
}

export function buildBrief({ title, leadTitle, leadId, task, cwd, reportBack, leadSocket, context, worktree }) {
  const lines = [
    `You are a Claude Code worker session ("thread") titled "${title}".`,
    `You were created by the lead chat "${leadTitle}" (session ${leadId}), which watches your work and may steer you.`,
    `Your task is the first prompt of this session. In short: ${clip(oneLine(task), 600)}`,
    `Your working folder is ${cwd}. Other sessions, the lead and other threads, may be editing this codebase at the same time, so re-read a file right before you edit it and keep changes scoped to your task.`,
    ...(worktree ? [worktreeLine(worktree)] : []),
    "Messages from the lead can arrive mid-task as cross-session messages. Treat them as instructions from the lead and adjust.",
  ];
  const address = leadAddress(leadSocket);
  if (reportBack && address) {
    lines.push(
      `The lead sees your final answer automatically when you go idle, so finish each turn with a complete answer. Optionally, if you get blocked or need a decision mid-task, you may also send ONE short note to the lead with your SendMessage tool, with "to" set to exactly "${address}". Claude Code may hold that note on the lead's side (different permission modes); that is fine, the lead still gets your final answer. Do not send progress chatter.`,
    );
  } else if (reportBack) {
    lines.push("The lead sees your final answer automatically when you go idle, so finish each turn with a complete answer.");
  } else {
    lines.push("Do not message the lead. End with a short summary of what you did.");
  }
  if (context) lines.push("", forkContextBlock(context, leadTitle));
  return lines.join("\n");
}

// What a forked thread carries from the lead: a summary inline, or a file to read first.
export function forkContextBlock(context, leadTitle) {
  if (context.file) {
    return `You were forked from the lead chat "${leadTitle}". Before your task, read ${context.file}: it holds that conversation so far. Continue from it.`;
  }
  return [`You were forked from the lead chat "${leadTitle}". What that conversation established so far:`, String(context.summary ?? "").trim(), "Continue from this context."].join("\n");
}

export function buildSpawnArgv({ name, cwd, model, sessionId, title, permissionMode, brief, task, effort, worktree }) {
  const scrub = SCRUB_ENV.flatMap((v) => ["-u", v]);
  const claude = ["claude", "--model", model, "--session-id", sessionId, "-n", title, "--remote-control", title, "--settings", threadSettings(permissionMode)];
  if (effort) claude.push("--effort", effort);
  // Claude Code makes the worktree itself (<repo>/.claude/worktrees/<name>, branch worktree-<name>) and keeps the launch folder's trust
  if (worktree) claude.push("--worktree", worktree);
  if (permissionMode && permissionMode !== "default") claude.push("--permission-mode", permissionMode);
  claude.push("--append-system-prompt", brief);
  // A prompt that starts with "-" would be read as a flag.
  claude.push(/^\s*-/.test(task) ? `Task: ${task}` : task);
  return [
    "tmux", "-L", TMUX_SOCKET, "-f", "/dev/null",
    "new-session", "-d", "-s", name, "-x", "200", "-y", "50", "-c", cwd,
    "env", ...scrub, "TERM=xterm-256color", "COLORTERM=truecolor",
    ...claude,
    // keep the pane after claude exits so its last screen can still be read
    ";", "set-option", "-t", name, "remain-on-exit", "on",
  ];
}

export function tmuxArgv(...rest) {
  return ["tmux", "-L", TMUX_SOCKET, "-f", "/dev/null", ...rest];
}

// `list-panes -a -F '#{session_name}|#{pane_dead}|#{pane_pid}'`
export function parsePanes(stdout) {
  const map = new Map();
  for (const line of String(stdout ?? "").split("\n")) {
    const [name, dead, pid] = line.trim().split("|");
    if (!name) continue;
    map.set(name, { isDead: dead === "1", panePid: Number(pid) || 0 });
  }
  return map;
}

export const PANE_FORMAT = "#{session_name}|#{pane_dead}|#{pane_pid}";

// ---- trust -------------------------------------------------------------------------

// Is the folder trusted in ~/.claude.json? Both /tmp and /private/tmp spellings. Exact folder only:
// a live check showed Claude Code asking again in a git repo inside a trusted folder.
export function isTrusted(claudeJson, path) {
  let projects;
  try {
    projects = JSON.parse(claudeJson)?.projects ?? {};
  } catch {
    return false;
  }
  const p = String(path).replace(/\/+$/, "") || "/";
  const spellings = new Set([p]);
  if (p.startsWith("/private/")) spellings.add(p.slice("/private".length));
  else if (/^\/(tmp|var|etc)(\/|$)/.test(p)) spellings.add(`/private${p}`);
  return [...spellings].some((x) => projects[x]?.hasTrustDialogAccepted === true);
}

// ---- the screen ----------------------------------------------------------------------

const LOGIN = /Login expired|Not logged in|Please run \/login|Invalid API key|OAuth token (has )?expired|run `?claude auth login/i;
const TRUST = /Do you trust the files in this folder|Yes, I trust this folder|Is this a project you created or one you trust/i;
const YES_OPTION = /^\s*[❯>›]?\s*1\.\s+Yes\b/m;

const HELD = /Held message from another session/;
// the codex-computer-use mod's approval pane: "Allow Codex computer use to use <App>?"
const CU_ASK = /Allow Codex computer use to use (.+?)\?/;
const BYPASS_WARNING = /WARNING: Claude Code running in Bypass Permissions mode|you accept all responsibility for actions taken while running in Bypass Permissions mode/i;

export function readScreen(text) {
  // box borders (│ on either side) are dropped so the option lines read plainly
  const lines = String(text ?? "")
    .replace(/\s+$/g, "")
    .split("\n")
    .map((l) => l.replace(/^[\s│┃]+/, (m) => m.replace(/[│┃]/g, " ")).replace(/[\s│┃]+$/, ""));
  const tail = lines.slice(-30).join("\n");
  const needsLogin = LOGIN.test(lines.join("\n"));
  const needsTrust = TRUST.test(tail);
  const needsYou = !needsTrust && /Do you want to|Would you like to proceed/.test(tail) && YES_OPTION.test(tail);
  let prompt = "";
  if (needsYou) {
    const tl = lines.slice(-30);
    let start = tl.findIndex((l) => /Do you want to|Would you like to proceed/.test(l));
    start = Math.max(0, start - 8);
    prompt = tl
      .slice(start)
      .map((l) => l.replace(/[│╭╮╰╯─]+/g, " ").replace(/\s+$/, ""))
      .filter((l) => l.trim())
      .slice(-16)
      .join("\n");
  }
  const isCursorOnYes = needsYou && /^\s*[❯>›]\s*1\.\s+Yes\b/m.test(tail);
  // "Held message from another session" dialog: the body it would deliver follows "Message body"
  const heldMessage = HELD.test(lines.join("\n"));
  let heldPreview = "";
  if (heldMessage) {
    const all = lines.map((l) => l.replace(/[╭╮╰╯─]+/g, " ").trim());
    const at = all.findIndex((l) => /Message body/.test(l));
    if (at >= 0) {
      const body = [];
      for (const l of all.slice(at + 1)) {
        if (/^(❯\s*)?\d+\.\s|^Deny\b|^Deliver\b|Esc to|Enter to/.test(l)) break;
        if (l) body.push(l);
      }
      heldPreview = oneLine(body.join(" "));
    }
  }
  // the one-time bypass warning (should not appear: threads get skipDangerousModePermissionPrompt)
  const bypassWarning = BYPASS_WARNING.test(lines.join("\n"));
  if (bypassWarning) {
    return { needsLogin, needsTrust, needsYou: true, prompt: "the bypass permissions warning (Yes, I accept / No, exit)", isCursorOnYes: false, heldMessage: false, heldPreview: "", bypassWarning };
  }
  // a thread waiting on Codex computer use's per-app approval (keys: a this session, l always, d deny)
  const cu = CU_ASK.exec(tail);
  if (cu && !heldMessage) {
    return { needsLogin, needsTrust, needsYou: true, prompt: `Codex computer use wants to use ${cu[1]} (approve allows it for that thread's session)`, isCursorOnYes: false, heldMessage: false, heldPreview: "", bypassWarning: false, cuApproval: cu[1] };
  }
  return { needsLogin, needsTrust, needsYou: needsYou && !heldMessage, prompt, isCursorOnYes, heldMessage, heldPreview, bypassWarning: false };
}

// Last N non-empty screen lines, trailing spaces trimmed.
export function screenLines(text, n) {
  const lines = [];
  for (const raw of String(text ?? "").split("\n")) {
    const l = raw.replace(/\s+$/, "");
    // runs of blank rows (the empty middle of a fresh screen) fold to one
    if (!l && lines.length && !lines[lines.length - 1]) continue;
    lines.push(l);
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  while (lines.length && !lines[0]) lines.shift();
  return lines.slice(-n);
}

// ---- status ----------------------------------------------------------------------------

// tmux: { isLive, isDead }, session: the ~/.claude/sessions json or null, pidAlive, screen: readScreen()
export function statusOf({ previous, tmux, session, pidAlive, screen, now, createdAt }) {
  if (previous === "closed") return "closed";
  if (!tmux?.isLive || tmux.isDead) return "exited";
  if (screen?.needsLogin) return "needs-login";
  if (screen?.needsTrust) return "needs-trust";
  if (screen?.heldMessage) return "held-message";
  if (screen?.needsYou) return "needs-you";
  if (session && pidAlive !== false) {
    if (session.status === "busy") return "working";
    if (session.status === "waiting") return "needs-you";
    if (session.status === "idle") return "idle";
  }
  if (now - (createdAt ?? now) < 120000) return "starting";
  return session ? "idle" : "starting";
}

export function dotOf(status) {
  return (
    {
      starting: "◌",
      working: "●",
      idle: "○",
      "needs-you": "◆",
      "held-message": "✉",
      "needs-login": "◆",
      "needs-trust": "◆",
      exited: "×",
      closed: "·",
    }[status] ?? "?"
  );
}

export function colorOf(status) {
  return (
    {
      starting: "cyan",
      working: "yellow",
      idle: "green",
      "needs-you": "magenta",
      "held-message": "magenta",
      "needs-login": "red",
      "needs-trust": "red",
      exited: "gray",
      closed: "gray",
    }[status] ?? undefined
  );
}

// ---- transcripts ---------------------------------------------------------------------------

export function slug(path) {
  return String(path).replace(/[^a-zA-Z0-9]/g, "-");
}

export function toolLine(name, input) {
  const i = input && typeof input === "object" ? input : {};
  const first = (s) => oneLine(String(s ?? "").split("\n")[0]);
  switch (name) {
    case "Read":
    case "Write":
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return `${name} ${i.file_path ?? i.notebook_path ?? ""}`.trim();
    case "Bash":
      return `Bash ${first(i.command)}`;
    case "Grep":
      return `Grep ${i.pattern ?? ""}${i.path ? ` in ${i.path}` : ""}`;
    case "Glob":
      return `Glob ${i.pattern ?? ""}`;
    case "WebFetch":
      return `WebFetch ${i.url ?? ""}`;
    case "WebSearch":
      return `WebSearch ${i.query ?? ""}`;
    case "Task":
    case "Agent":
      return `${name} ${i.description ?? i.subagent_type ?? ""}`.trim();
    case "SendMessage":
      return `SendMessage to ${i.to ?? i.recipient ?? "?"}`;
    case "TodoWrite":
      return "TodoWrite";
    default: {
      const json = Object.keys(i).length ? ` ${JSON.stringify(i)}` : "";
      return clip(`${name}${json}`, 160);
    }
  }
}

function blockText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join(" ");
}

// The tail of a transcript, as display items plus the model of the latest assistant row.
export function parseTranscript(jsonl) {
  const items = [];
  let model = "";
  let lastAt = 0;
  // the newest assistant row with text, whole (not one-lined), and whether anything user-side came after it
  let lastAnswer = null;
  let afterAnswer = false;
  for (const raw of String(jsonl ?? "").split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("{")) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue; // the first line of a tail is usually cut
    }
    const at = Date.parse(row.timestamp ?? "") || 0;
    if (at) lastAt = Math.max(lastAt, at);
    if (row.isSidechain) continue;
    if (row.type === "assistant" && row.message) {
      if (typeof row.message.model === "string" && row.message.model && !row.message.model.startsWith("<")) {
        model = row.message.model;
      }
      if (row.isApiErrorMessage || row.error) {
        items.push({ kind: "error", text: oneLine(blockText(row.message.content) || String(row.error)), at });
        continue;
      }
      const blocks = Array.isArray(row.message.content) ? row.message.content : [];
      for (const b of blocks) {
        if (b?.type === "text" && b.text?.trim()) items.push({ kind: "assistant", text: oneLine(b.text), at });
        else if (b?.type === "tool_use") items.push({ kind: "tool", text: toolLine(b.name, b.input), at });
      }
      const whole = blocks.filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n").trim();
      if (whole) {
        lastAnswer = { text: whole, at, key: `${row.uuid ?? row.message.id ?? at}:${whole.length}` };
        afterAnswer = false;
      } else if (blocks.some((b) => b?.type === "tool_use")) {
        afterAnswer = true; // still working after that text
      }
    } else if (row.type === "user" && row.message && !row.isMeta) {
      const c = row.message.content;
      const isToolResult = Array.isArray(c) && c.length > 0 && c.every((b) => b?.type === "tool_result");
      if (!isToolResult && lastAnswer) afterAnswer = true;
      if (typeof c === "string") {
        pushUserText(items, c, at);
      } else if (Array.isArray(c)) {
        for (const b of c) {
          if (b?.type === "tool_result" && b.is_error) {
            items.push({ kind: "error", text: oneLine(blockText(b.content) || String(b.content ?? "")), at });
          } else if (b?.type === "text" && typeof b.text === "string") {
            pushUserText(items, b.text, at);
          }
        }
      }
    } else if (row.type === "system" && (row.level === "error" || row.subtype === "api_error")) {
      items.push({ kind: "error", text: oneLine(row.content ?? row.subtype ?? "error"), at });
    }
  }
  return { items, model, lastAt, lastAnswer, isAnswerLatest: Boolean(lastAnswer) && !afterAnswer };
}

function pushUserText(items, text, at) {
  const t = String(text);
  if (!t.trim()) return;
  if (t.includes("<cross-session-message")) {
    const env = envelopeOf(t);
    items.push({ kind: "message", text: `from ${env.fromName || env.from || "a session"}: ${stripTags(t)}`, at });
    return;
  }
  const cmd = /<command-name>([^<]*)<\/command-name>/.exec(t);
  if (cmd) {
    const args = /<command-args>([^<]*)<\/command-args>/.exec(t)?.[1] ?? "";
    items.push({ kind: "user", text: oneLine(`${cmd[1]} ${args}`), at });
    return;
  }
  if (/^\s*<(local-command|system-reminder|bash-|task-notification)/.test(t)) return;
  if (/^\[Request interrupted/.test(t.trim())) {
    items.push({ kind: "error", text: oneLine(t), at });
    return;
  }
  items.push({ kind: "user", text: oneLine(t), at });
}

// ---- reports -----------------------------------------------------------------------------

export function envelopeOf(text) {
  const tag = /<cross-session-message\b([^>]*)>/.exec(String(text ?? ""))?.[1] ?? "";
  const attr = (n) => new RegExp(`\\s${n}="([^"]*)"`).exec(tag)?.[1] ?? "";
  return { from: attr("from"), fromName: attr("from-name"), isEnvelope: tag !== "" || /<cross-session-message/.test(text ?? "") };
}

export function stripTags(text) {
  return oneLine(String(text ?? "").replace(/<[^>]+>/g, " "));
}

// Which registered thread a delivery came from: its socket, its pid's socket, or its exact title.
export function threadOfDelivery(text, threads) {
  const env = envelopeOf(text);
  if (!env.isEnvelope) return undefined;
  threads = threads.filter((t) => t.backend !== "inline");
  if (env.from) {
    const bySocket = threads.find(
      (t) => (t.socket && (env.from === `uds:${t.socket}` || env.from.endsWith(t.socket))) || (t.pid && env.from.endsWith(`/${t.pid}.sock`)),
    );
    if (bySocket) return bySocket;
    const bySession = threads.find(
      (t) => (t.sessionId && env.from.includes(t.sessionId)) || (t.bridgeSessionId && env.from.includes(t.bridgeSessionId)),
    );
    if (bySession) return bySession;
  }
  if (env.fromName) {
    const named = threads.filter((t) => t.title === env.fromName);
    if (named.length === 1) return named[0];
    const live = named.filter((t) => LIVE.has(t.status));
    if (live.length === 1) return live[0];
  }
  return undefined;
}

// ---- registry ------------------------------------------------------------------------------

export function emptyRegistry() {
  return { version: 1, cap: DEFAULT_CAP, threads: [], plans: [] };
}

// Parses the registry file; a file that does not parse is reported, never thrown.
export function parseRegistry(text) {
  if (text === null || text === undefined || String(text).trim() === "") return { registry: emptyRegistry(), isCorrupt: false };
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || !Array.isArray(data.threads)) return { registry: emptyRegistry(), isCorrupt: true };
    const cap = Number.isInteger(data.cap) && data.cap >= 1 && data.cap <= MAX_CAP ? data.cap : DEFAULT_CAP;
    const threads = data.threads.filter((t) => t && typeof t.id === "string" && typeof t.sessionId === "string");
    const plans = Array.isArray(data.plans) ? data.plans.filter((x) => x && typeof x.id === "string" && Array.isArray(x.phases)) : [];
    // keys a newer version wrote are kept as they are, so an older copy of the mod never drops them
    const { version: _v, cap: _c, threads: _t, plans: _p, ...rest } = data;
    return { registry: { ...rest, version: 1, cap, threads, plans }, isCorrupt: false };
  } catch {
    return { registry: emptyRegistry(), isCorrupt: true };
  }
}

export function serializeRegistry(reg) {
  return `${JSON.stringify({ ...reg, version: 1, cap: reg.cap, threads: reg.threads, plans: reg.plans ?? [] }, null, 2)}\n`;
}

// Closed or exited entries older than the cutoff go; live ones always stay.
export function cleanable(threads, now, maxAgeMs) {
  return threads.filter((t) => !LIVE.has(t.status) && now - (t.closedAt || t.endedAt || t.createdAt || 0) > maxAgeMs);
}

// ---- formatting --------------------------------------------------------------------------------

export function oneLine(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

export function clip(s, n) {
  const t = String(s ?? "");
  return t.length <= n ? t : `${t.slice(0, Math.max(0, n - 1))}…`;
}

export function shortPath(path, n) {
  let p = String(path ?? "").replace(/^\/Users\/[^/]+/, "~").replace(/^\/home\/[^/]+/, "~");
  if (p.length <= n) return p;
  return `…${p.slice(p.length - n + 1)}`;
}

export function age(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

export function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

export function resumeCommand(t) {
  return `cd ${shellQuote(t.cwd)} && claude --resume ${t.sessionId}`;
}

export function remoteLink(t) {
  return t.bridgeSessionId ? `https://claude.ai/code/${t.bridgeSessionId}` : "";
}

export function itemLine(it) {
  const tag = { user: "you", assistant: "says", tool: "tool", error: "error", message: "msg", step: "model", wait: "wait", done: "done" }[it.kind] ?? it.kind;
  return `${tag.padEnd(5)} ${it.text}`;
}

// The band: counts of this lead's live threads.
export function bandText(threads) {
  const live = threads.filter((t) => LIVE.has(t.status));
  if (live.length === 0) return "";
  const working = live.filter((t) => t.status === "working" || t.status === "starting").length;
  const needs = live.filter((t) => ATTENTION.has(t.status)).length;
  const parts = [`⇶ ${live.length} thread${live.length === 1 ? "" : "s"}`];
  if (working) parts.push(`${working} working`);
  if (needs) parts.push(`${needs} need${needs === 1 ? "s" : ""} you`);
  const fresh = threads.filter(isUnread).length;
  if (fresh) parts.push(`${fresh} new`);
  parts.push("/threads");
  return parts.join(" · ");
}

// ---- the inline backend ----------------------------------------------------------------------

export const BACKENDS = ["auto", "session", "inline"];
export const ACTIVITY_MAX = 60;

// auto: a real session when the terminal login works, otherwise a subagent of this chat.
export function chooseBackend(requested, isLoggedIn) {
  const want = String(requested ?? "auto").toLowerCase();
  if (!BACKENDS.includes(want)) return { error: `Unknown backend "${requested}". Use auto, session or inline.` };
  if (want === "auto") return { backend: isLoggedIn ? "session" : "inline", isAuto: true };
  return { backend: want, isAuto: false };
}

export function agentName(id) {
  return `thread-${id}`;
}

// What an inline thread (a background subagent of the lead) is told before its task.
export function buildInlinePrompt({ title, leadTitle, task, cwd, reportBack, context, worktree }) {
  return [
    ...(context ? [forkContextBlock(context, leadTitle), ""] : []),
    `You are a worker ("thread") titled "${title}", started in the background by the lead chat "${leadTitle}", which watches your work and may send you messages mid-task. Treat those as instructions from the lead.`,
    worktree
      ? `Working folder: ${cwd}. ${worktreeLine(worktree)} Work only inside that folder.`
      : `Working folder: ${cwd}. Other sessions and threads may edit this codebase at the same time, so re-read a file right before you edit it and keep changes scoped to your task.`,
    reportBack
      ? "When you finish or get blocked, end with a SHORT report as your final answer (at most 5 lines: outcome, key findings, any question). It reaches the lead automatically; do not use SendMessage for it."
      : "End with a short summary of what you did.",
    "",
    "Task:",
    task,
  ].join("\n");
}

// agent.list status plus what the hooks saw.
export function statusOfInline({ previous, isMine, agent, meta, leadAlive, now, createdAt }) {
  if (previous === "closed") return "closed";
  if (!isMine) return leadAlive === false && LIVE.has(previous) ? "exited" : previous;
  if (meta?.needsYou) return "needs-you";
  if (!agent) {
    if (meta?.status === "working" || meta?.status === "idle") return meta.status;
    return now - (createdAt ?? now) < 15000 && LIVE.has(previous) ? previous : "exited";
  }
  const st = String(agent.status ?? "").toLowerCase();
  if (st === "running" || st === "pending") return meta?.status === "idle" ? "idle" : "working";
  if (st === "completed") return "idle";
  if (st === "failed" || st === "killed" || st === "stopped" || st === "cancelled") return "exited";
  return meta?.status ?? "working";
}

// $.session.messages({ agentId }) rows as display items.
export function messagesToItems(rows) {
  const items = [];
  for (const m of Array.isArray(rows) ? rows : []) {
    if (m.role === "assistant") {
      if (m.text && m.text.trim()) items.push({ kind: "assistant", text: oneLine(m.text) });
      for (const u of Array.isArray(m.toolUses) ? m.toolUses : []) {
        items.push({ kind: "tool", text: toolLine(u.tool ?? u.name, u.input) });
        if (u.isError) items.push({ kind: "error", text: oneLine(u.text ?? "tool error") });
      }
    } else if (m.role === "user") {
      const t = String(m.text ?? "");
      if (!t.trim()) continue;
      if (t.includes("<cross-session-message") || t.includes("<teammate-message")) {
        const body = stripTags(t);
        // the thread's own brief: show just its task
        const task = /You are a worker \("thread"\)[\s\S]*?Task:\s*([\s\S]*)$/.exec(t.replace(/<[^>]+>/g, " "));
        items.push(task ? { kind: "user", text: `task: ${oneLine(task[1])}` } : { kind: "message", text: body });
      }
      else if (!/^\s*<(system-reminder|local-command|task-notification)/.test(t)) items.push({ kind: "user", text: oneLine(t) });
    }
  }
  return items;
}

export function pushBounded(list, item, max = ACTIVITY_MAX) {
  return [...(Array.isArray(list) ? list : []), item].slice(-max);
}

export function activityLine(it) {
  const at = it.at ? new Date(it.at) : null;
  const two = (n) => String(n).padStart(2, "0");
  const clock = at ? `${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())} ` : "";
  return `${clock}${itemLine(it)}`;
}

// ---- reports the lead model reads ------------------------------------------------------------

export const ANSWER_MAX = 2000;
export const REPORT_APPEND_MAX = 1500;
export const PEER_DEDUPE_MS = 60000;

// The row appended for the lead's model when a thread finishes.
export function reportRow({ title, id, model, answer }) {
  const body = clip(String(answer ?? "").trim(), REPORT_APPEND_MAX);
  return {
    message: {
      type: "user",
      content: [{ type: "text", text: `<thread report from ${title} (${id}), model ${model || "unknown"}>\n${body}\n</thread report>` }],
    },
  };
}

// Should a finished answer be recorded and appended? Not twice, and not right after the thread messaged the lead itself.
export function shouldReport({ lastReport, appendedKey, key, now }) {
  if (!key || key === appendedKey) return { report: false, reason: "already reported" };
  if (lastReport?.source === "peer" && now - (lastReport.at ?? 0) < PEER_DEDUPE_MS) return { report: false, reason: "the thread reported itself" };
  return { report: true };
}

// Is the held message on screen the one the lead just sent? Compare the start of each, spacing ignored.
export function heldMatches(preview, sent) {
  const a = oneLine(preview).toLowerCase();
  const b = oneLine(sent).toLowerCase();
  if (!a || !b) return false;
  const n = Math.min(60, a.length, b.length);
  return n >= 8 && (a.includes(b.slice(0, n)) || b.includes(a.slice(0, n)));
}

// ---- effort ------------------------------------------------------------------------------------

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export function checkEffort(raw) {
  if (raw === undefined || raw === null || raw === "") return { effort: undefined };
  const e = String(raw).toLowerCase();
  return EFFORTS.includes(e) ? { effort: e } : { error: `Unknown effort "${raw}". Use low, medium, high, xhigh or max.` };
}

// ---- phase plans ---------------------------------------------------------------------------------
//
// A plan runs phases one at a time; each phase is a thread that ends by writing an
// immutable handoff file, which the next phase starts from. Gates decide who lets
// the next phase start: auto (at once), lead (the lead model reviews, then calls
// threads_plan_advance) or user (/threads plan next).

export const GATES = ["auto", "lead", "user"];
export const PHASE_STATES = ["queued", "working", "awaiting-gate", "accepted", "revising", "blocked", "done"];
export const MAX_PHASES = 8;
export const MAX_REVISIONS = 2;

const two = (n) => String(n).padStart(2, "0");

export function phaseNumber(i) {
  return two(i + 1);
}

export function stamp(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
}

// Local wall-clock time, like the handoff file names, so history reads in the user's own hours
export function localTime(ms, withSeconds = true) {
  const d = new Date(ms);
  const t = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
  return withSeconds ? `${t}:${two(d.getSeconds())}` : t;
}

export function handoffPathFor(plan, i, ms) {
  return `${plan.handoffDir}/plan-${plan.id}-phase-${phaseNumber(i)}-${stamp(ms)}.md`;
}

export function phaseTitle(plan, i) {
  return `Thread | ${plan.title} | ${phaseNumber(i)} ${plan.phases[i].name}`;
}

// Checks and normalizes a threads_plan request (models, efforts, gates, at most MAX_PHASES phases).
export function validatePlan(input) {
  const title = oneLine(input?.title ?? "").slice(0, 40);
  if (!title) return { error: "A plan needs a title." };
  const gate = String(input?.gate ?? "lead").toLowerCase();
  if (!GATES.includes(gate)) return { error: `Unknown gate "${input.gate}". Use auto, lead or user.` };
  const raw = Array.isArray(input?.phases) ? input.phases : [];
  if (raw.length === 0) return { error: "A plan needs at least one phase." };
  if (raw.length > MAX_PHASES) return { error: `A plan has at most ${MAX_PHASES} phases.` };
  const phases = [];
  for (const [i, ph] of raw.entries()) {
    const name = oneLine(ph?.name ?? "").slice(0, 40);
    const task = String(ph?.task ?? "").trim();
    if (!name || !task) return { error: `Phase ${i + 1} needs a name and a task.` };
    const m = normalizeModel(ph.model);
    if (m.error) return { error: `Phase ${i + 1}: ${m.error}` };
    const e = checkEffort(ph.effort);
    if (e.error) return { error: `Phase ${i + 1}: ${e.error}` };
    const mode = checkMode(ph.permission_mode ?? ph.permissionMode);
    if (mode.error) return { error: `Phase ${i + 1}: ${mode.error}` };
    const pg = ph.gate === undefined || ph.gate === null || ph.gate === "" ? undefined : String(ph.gate).toLowerCase();
    if (pg !== undefined && !GATES.includes(pg)) return { error: `Phase ${i + 1}: unknown gate "${ph.gate}".` };
    phases.push({
      name,
      model: m.model,
      effort: e.effort,
      task,
      acceptance: String(ph.acceptance ?? "").trim(),
      permissionMode: mode.mode,
      gate: pg,
      status: "queued",
      threadId: "",
      handoffPath: "",
      revisions: 0,
      nudges: 0,
      startedAt: 0,
      endedAt: 0,
      note: "",
    });
  }
  return { title, gate, phases, keepThreads: input?.keep_threads === true || input?.keepThreads === true };
}

// The gate that decides what happens after phase i (its own, else the plan's).
export function gateAfter(plan, i) {
  return plan.phases[i]?.gate ?? plan.gate;
}

// What phase i is told: the whole plan, its own task and check, how to hand off,
// and (from phase 2 on) the exact handoff it starts from.
export function buildPhasePrompt(plan, i, { handoffPath, predecessorHandoff }) {
  const ph = plan.phases[i];
  const list = plan.phases
    .map((p, j) => `${phaseNumber(j)} ${p.name} (${p.model}${p.effort ? `, effort ${p.effort}` : ""})${j === i ? "  <- you" : ""}`)
    .join("\n");
  const lines = [];
  if (i > 0 && predecessorHandoff) {
    lines.push(
      "Before anything else: run the /prime skill if it is available; either way make sure you have read this exact handoff file (read it directly if /prime is not available or picked another file):",
      predecessorHandoff,
      "Verify it against the current files, then confirm the recovered state in one line. Only then start your task.",
      "",
    );
  }
  lines.push(
    `You are phase ${phaseNumber(i)} "${ph.name}" of the plan "${plan.title}" (plan ${plan.id}), which runs one phase at a time:`,
    list,
    "",
    `Project root: ${plan.cwd}`,
    "",
    "Your task:",
    ph.task,
  );
  if (ph.acceptance) lines.push("", "Acceptance check (run or verify it before you hand off):", ph.acceptance);
  lines.push(
    "",
    "Finish by writing your handoff. This is required: the next phase starts from it.",
    `1. Write a NEW file at exactly ${handoffPath} (never edit an existing handoff file). Sections: Project root, Accepted decisions, Changed files, Commands run, Check results, Known failures, Open questions, Exact next action.`,
    `2. Overwrite ${plan.handoffDir}/LATEST.md with two lines: line 1 the handoff file name, line 2 a one-line summary of where this phase landed.`,
    "3. If the project is a git repository and its .gitignore does not list handoff/, add that line.",
    "Then end your turn with a short summary of what you did and the handoff path.",
  );
  return lines.join("\n");
}

export function revisionPrompt(feedback, handoffPath, plan) {
  return [
    `The lead asks for a revision of your phase: ${oneLine(feedback) || "address the acceptance check."}`,
    `When done, write a NEW handoff file at exactly ${handoffPath} (do not edit the old one), update ${plan.handoffDir}/LATEST.md, and end your turn with a short summary.`,
  ].join("\n");
}

export function handoffNudge(handoffPath, plan) {
  return `You finished without writing the handoff file. Write it now at exactly ${handoffPath} (sections: Project root, Accepted decisions, Changed files, Commands run, Check results, Known failures, Open questions, Exact next action), update ${plan.handoffDir}/LATEST.md, then end your turn.`;
}

// The plan's state machine. Pure: takes the plan and one event, returns the next plan and
// the actions the caller carries out. Events:
//   { type: "finished", index, hasHandoff }   a phase thread went idle
//   { type: "decision", decision: "approve"|"revise", feedback }   the lead's (or the person's) verdict on the awaiting phase
//   { type: "next" }   /threads plan next (the user gate)
//   { type: "started", index, threadId, handoffPath, at }   a phase thread was created
//   { type: "retry", index }   start that phase again
//   { type: "stop" }
export function stepPlan(plan, event) {
  const p = { ...plan, phases: plan.phases.map((x) => ({ ...x })) };
  const actions = [];
  const cur = p.current ?? 0;
  const ph = p.phases[cur];
  // An accepted phase's thread closes, except the one just before the next phase, which stays
  // until that phase has produced output (the watcher closes it then). keepThreads keeps all.
  const startNext = (i) => {
    if (!p.keepThreads && i - 2 >= 0) actions.push({ type: "retire", index: i - 2, reason: "its successor is under way" });
    if (i >= p.phases.length) {
      if (!p.keepThreads) actions.push({ type: "retire", index: i - 1, reason: "the plan is done" });
      p.status = "done";
      actions.push({ type: "done" });
    } else {
      p.current = i;
      actions.push({ type: "start", index: i });
    }
  };
  if (p.status === "stopped" || p.status === "done") {
    if (event.type !== "retry") return { plan: p, actions: [{ type: "ignored", reason: `the plan is ${p.status}` }] };
  }
  switch (event.type) {
    case "started": {
      const t = p.phases[event.index];
      t.status = "working";
      t.threadId = event.threadId;
      t.handoffPath = event.handoffPath;
      t.startedAt = event.at;
      t.note = "";
      p.status = "running";
      break;
    }
    case "finished": {
      if (event.index !== cur || !ph || (ph.status !== "working" && ph.status !== "revising")) {
        actions.push({ type: "ignored", reason: "not the phase that is running" });
        break;
      }
      if (!event.hasHandoff) {
        if (ph.nudges < 1) {
          ph.nudges += 1;
          ph.note = "finished without its handoff file; asked it to write one";
          actions.push({ type: "nudge", index: cur });
        } else {
          ph.status = "blocked";
          ph.note = "finished twice without writing its handoff file";
          p.status = "blocked";
          actions.push({ type: "blocked", index: cur, reason: ph.note });
        }
        break;
      }
      const gate = gateAfter(p, cur);
      if (gate === "auto") {
        ph.status = "done";
        ph.endedAt = event.at ?? 0;
        startNext(cur + 1);
      } else {
        ph.status = "awaiting-gate";
        ph.note = gate === "lead" ? "waiting for the lead's review" : "waiting for /threads plan next";
        actions.push({ type: gate === "lead" ? "ask-lead" : "ask-user", index: cur });
      }
      break;
    }
    case "decision":
    case "next": {
      if (!ph || ph.status !== "awaiting-gate") {
        actions.push({ type: "ignored", reason: `phase ${phaseNumber(cur)} is ${ph?.status ?? "missing"}, not awaiting a gate` });
        break;
      }
      const decision = event.type === "next" ? "approve" : event.decision;
      if (decision === "approve") {
        ph.status = "done";
        ph.endedAt = event.at ?? 0;
        ph.note = "";
        startNext(cur + 1);
      } else if (decision === "revise") {
        if (ph.revisions >= MAX_REVISIONS) {
          ph.status = "blocked";
          ph.note = `still not accepted after ${MAX_REVISIONS} revisions`;
          p.status = "blocked";
          actions.push({ type: "blocked", index: cur, reason: ph.note });
        } else {
          ph.revisions += 1;
          ph.status = "revising";
          ph.note = `revision ${ph.revisions} of ${MAX_REVISIONS}`;
          actions.push({ type: "revise", index: cur, feedback: event.feedback ?? "" });
        }
      } else {
        actions.push({ type: "ignored", reason: `unknown decision "${decision}"` });
      }
      break;
    }
    case "retry": {
      const i = event.index;
      if (!p.phases[i]) {
        actions.push({ type: "ignored", reason: "no such phase" });
        break;
      }
      for (let j = i; j < p.phases.length; j++) {
        Object.assign(p.phases[j], { status: "queued", threadId: j === i ? p.phases[j].threadId : "", revisions: 0, nudges: 0, note: "" });
      }
      p.status = "running";
      p.current = i;
      actions.push({ type: "start", index: i });
      break;
    }
    case "stop": {
      p.status = "stopped";
      actions.push({ type: "stopped" });
      break;
    }
    default:
      actions.push({ type: "ignored", reason: `unknown event ${event.type}` });
  }
  if (actions.some((a) => a.type !== "ignored") || event.type === "started") {
    p.history = [...(p.history ?? []), historyEntry(event, actions, cur)].slice(-200);
  }
  return { plan: p, actions };
}

function historyEntry(event, actions, cur) {
  const e = { at: event.at ?? 0, event: event.type, phase: (event.index ?? cur) + 1 };
  if (event.decision) e.decision = event.decision;
  if (event.feedback) e.feedback = oneLine(event.feedback).slice(0, 300);
  if (event.threadId) e.thread = event.threadId;
  if (event.hasHandoff !== undefined) e.hasHandoff = event.hasHandoff;
  e.then = actions.map((a) => a.type);
  return e;
}

// `/threads plan start <title> [--gate g] [--cwd path] -- model[/effort] Name: task || model Name: task`
export function parsePlanCommand(args) {
  const text = String(args ?? "");
  const sep = /(^|\s)--(\s|$)/.exec(text);
  if (!sep) return { error: PLAN_USAGE };
  const tokens = tokenize(text.slice(0, sep.index));
  const body = text.slice(sep.index + sep[0].length).trim();
  const out = { title: "", gate: undefined, cwd: undefined, phases: [] };
  const words = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "--gate") out.gate = tokens[++i];
    else if (tokens[i] === "--mode") out.mode = tokens[++i];
    else if (tokens[i] === "--cwd") out.cwd = tokens[++i];
    else words.push(tokens[i]);
  }
  out.title = words.join(" ");
  for (const chunk of body.split("||").map((c) => c.trim()).filter(Boolean)) {
    const m = /^(\S+)\s+([^:]+):\s*([\s\S]+)$/.exec(chunk);
    if (!m) return { error: `Could not read the phase "${clip(chunk, 60)}". ${PLAN_USAGE}` };
    const [model, effort] = m[1].split("/");
    out.phases.push({ model, effort, name: m[2].trim(), task: m[3].trim(), ...(out.mode ? { permission_mode: out.mode } : {}) });
  }
  if (!out.title || out.phases.length === 0) return { error: PLAN_USAGE };
  return out;
}

export const PLAN_USAGE =
  "Usage is /threads plan start <title> [--gate auto|lead|user] [--mode acceptEdits|...] [--cwd <path>] -- <model>[/<effort>] <Name>: <task> || <model> <Name>: <task> ...";

export function planStatusText(plan, threadsById = new Map()) {
  const mark = { queued: "·", working: "●", "awaiting-gate": "◆", accepted: "✓", revising: "↻", blocked: "✕", done: "✓" };
  const lines = [`Plan ${plan.title} (${plan.id}) · ${plan.status} · gate ${plan.gate} · ${plan.cwd}`];
  plan.phases.forEach((ph, i) => {
    const t = threadsById.get(ph.threadId);
    const who = ph.threadId ? ` · ${ph.threadId}${t ? ` ${t.status}` : ""}` : "";
    const gate = ph.gate && ph.gate !== plan.gate ? ` · gate ${ph.gate}` : "";
    lines.push(`${mark[ph.status] ?? "?"} ${phaseNumber(i)} ${ph.name} · ${ph.model}${ph.effort ? `/${ph.effort}` : ""} · ${ph.status}${who}${gate}`);
    if (ph.handoffPath) lines.push(`     handoff ${ph.handoffPath}`);
    if (ph.note) lines.push(`     ${ph.note}`);
  });
  return lines.join("\n");
}

// ---- cost (est. API-equivalent) ---------------------------------------------------------------
//
// List prices in USD per million tokens (task-budget's table). Cache writes: a row that says how
// many tokens went to the 1-hour and 5-minute caches is priced exactly (2x and 1.25x input);
// otherwise by loop, as task-budget measured: a main loop writes at the 1-hour rate, a subagent
// at the 5-minute rate.

export const PRICES = [
  { match: /opus-5-5/, input: 4, output: 20, cacheRead: 0.2 },
  { match: /opus/, input: 5, output: 25, cacheRead: 0.5 },
  { match: /sonnet-5/, input: 2, output: 10, cacheRead: 0.2 },
  { match: /sonnet/, input: 3, output: 15, cacheRead: 0.3 },
  { match: /haiku/, input: 1, output: 5, cacheRead: 0.1 },
  { match: /fable-5-1|mythos-5-1/, input: 10, output: 50, cacheRead: 0.25 },
  { match: /fable|mythos/, input: 10, output: 50, cacheRead: 1 },
];
const WRITE_1H = 2;
const WRITE_5M = 1.25;

export function priceOf(model) {
  const m = String(model ?? "").toLowerCase();
  return PRICES.find((x) => x.match.test(m)) ?? null;
}

// One request's usage: { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, cache_creation? }.
export function costOfUsage(usage, model, loop = "main") {
  const price = priceOf(model);
  if (!price || !usage) return { usd: 0, isPriced: Boolean(price) };
  const per = (n, rate) => ((Number(n) || 0) * rate) / 1e6;
  const split = usage.cache_creation;
  let writes;
  if (split && (split.ephemeral_1h_input_tokens !== undefined || split.ephemeral_5m_input_tokens !== undefined)) {
    writes = per(split.ephemeral_1h_input_tokens, price.input * WRITE_1H) + per(split.ephemeral_5m_input_tokens, price.input * WRITE_5M);
  } else {
    writes = per(usage.cache_creation_input_tokens, price.input * (loop === "main" ? WRITE_1H : WRITE_5M));
  }
  const usd = per(usage.input_tokens, price.input) + per(usage.output_tokens, price.output) + per(usage.cache_read_input_tokens, price.cacheRead) + writes;
  return { usd, isPriced: true };
}

// A session thread's whole transcript: one charge per API message (its content blocks share one usage).
export function costFromTranscript(jsonl) {
  const seen = new Set();
  let usd = 0;
  let unpriced = 0;
  for (const raw of String(jsonl ?? "").split("\n")) {
    if (!raw.includes('"usage"')) continue;
    let row;
    try {
      row = JSON.parse(raw);
    } catch {
      continue;
    }
    if (row.type !== "assistant" || row.isSidechain || !row.message?.usage) continue;
    const key = row.message.id ?? row.requestId ?? row.uuid;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    const model = row.message.model;
    if (!model || String(model).startsWith("<")) continue;
    const c = costOfUsage(row.message.usage, model, "main");
    if (c.isPriced) usd += c.usd;
    else unpriced += 1;
  }
  return { usd, unpriced };
}

export function money(usd) {
  const n = Number(usd) || 0;
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 10) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

// ---- plan history ------------------------------------------------------------------------------

export function planRecord(plan, threadsById, now, opts = {}) {
  const phases = plan.phases.map((ph, i) => {
    const t = threadsById.get(ph.threadId);
    return {
      number: i + 1,
      name: ph.name,
      model: ph.model,
      verifiedModel: t?.verifiedModel ?? "",
      effort: ph.effort ?? "",
      permissionMode: t?.permissionMode ?? ph.permissionMode ?? "",
      status: ph.status,
      thread: ph.threadId ? { id: ph.threadId, title: t?.title ?? "", sessionId: t?.sessionId ?? "", backend: t?.backend ?? "" } : null,
      handoffPath: ph.handoffPath,
      acceptance: ph.acceptance,
      revisions: ph.revisions,
      startedAt: ph.startedAt || 0,
      endedAt: ph.endedAt || 0,
      durationMs: ph.startedAt && ph.endedAt ? ph.endedAt - ph.startedAt : 0,
      costUsd: t?.costUsd ?? 0,
    };
  });
  return {
    id: plan.id,
    title: plan.title,
    cwd: plan.cwd,
    gate: plan.gate,
    backend: plan.backend,
    keepThreads: Boolean(plan.keepThreads),
    lead: plan.lead,
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: now,
    durationMs: now - (plan.createdAt ?? now),
    costUsd: phases.reduce((a, x) => a + (x.costUsd || 0), 0),
    phases,
    history: plan.history ?? [],
    ...(opts.backfilled ? { backfilled: true } : {}),
  };
}

export function planRecordMarkdown(r) {
  const when = (ms) => (ms ? localTime(ms) : "-");
  const dur = (ms) => (ms ? age(ms) : "-");
  const lines = [
    `# Plan ${r.title} (${r.id})`,
    "",
    `Status: ${r.status} · gate ${r.gate} · ${r.backend} threads · started ${when(r.createdAt)} · ${dur(r.durationMs)} · est. API-equivalent ${money(r.costUsd)}`,
    `Project: ${r.cwd}`,
    `Lead: ${r.lead?.title ?? "?"} (${r.lead?.sessionId ?? "?"})`,
    ...(r.backfilled ? ["", "Backfilled from the registry: this plan ran before history was kept, so gate decisions, events and some timings are not known."] : []),
    "",
    "## Phases",
    "",
    "| # | Phase | Model | Effort | Mode | Status | Thread | Time | Cost |",
    "|---|---|---|---|---|---|---|---|---|",
    ...r.phases.map((x) => `| ${String(x.number).padStart(2, "0")} | ${x.name} | ${x.verifiedModel || x.model} | ${x.effort || "-"} | ${x.permissionMode || "-"} | ${x.status} | ${x.thread ? `${x.thread.id}` : "-"} | ${dur(x.durationMs)} | ${money(x.costUsd)} |`),
    "",
    "## Handoffs",
    "",
    ...r.phases.map((x) => `- ${String(x.number).padStart(2, "0")} ${x.name}: ${x.handoffPath || "(none)"}`),
    "",
    "## Events",
    "",
    ...r.history.map((h) => `- ${when(h.at)} phase ${String(h.phase).padStart(2, "0")} ${h.event}${h.decision ? ` ${h.decision}` : ""}${h.feedback ? ` ("${h.feedback}")` : ""}${h.hasHandoff === false ? " (no handoff)" : ""} -> ${h.then.join(", ") || "-"}`),
    "",
  ];
  return lines.join("\n");
}

// ---- fork outline -------------------------------------------------------------------------------
//
// A chronological outline of a whole conversation, so a fork's summary covers early milestones and
// not just the recent turns: every user request (clipped), the assistant replies that read like a
// result, and when that is too long the first and last turns, every milestone, then an even sample.

const MILESTONE = /\b(plan|phase|finished|done|complete[ds]?|merged|shipped|released|decid\w*|agreed|created|built|fixed|passed|failed|blocked|install\w*|deploy\w*|milestone|summary)\b/i;

export function conversationOutline(rows, maxChars = 9000) {
  const items = [];
  (Array.isArray(rows) ? rows : []).forEach((m, i) => {
    const text = oneLine(m?.text ?? "");
    if (!text) return;
    if (m.role === "user") {
      if (/^<(system-reminder|local-command|command-)/.test(text)) return;
      items.push({ i, line: `#${i + 1} user: ${clip(text, 220)}`, isMilestone: MILESTONE.test(text) });
    } else if (m.role === "assistant" && (text.length > 160 || MILESTONE.test(text))) {
      items.push({ i, line: `#${i + 1} assistant: ${clip(text, 320)}`, isMilestone: MILESTONE.test(text) });
    }
  });
  const size = (list) => list.reduce((a, x) => a + x.line.length + 1, 0);
  if (size(items) <= maxChars) return items.map((x) => x.line).join("\n");
  const keep = new Set();
  items.slice(0, 5).forEach((x) => keep.add(x.i));
  items.slice(-10).forEach((x) => keep.add(x.i));
  let chosen = () => items.filter((x) => keep.has(x.i));
  for (const x of items.filter((y) => y.isMilestone)) {
    if (size(chosen()) + x.line.length > maxChars) break;
    keep.add(x.i);
  }
  const rest = items.filter((x) => !keep.has(x.i));
  const step = Math.max(1, Math.floor(rest.length / 20));
  for (let k = 0; k < rest.length; k += step) {
    if (size(chosen()) + rest[k].line.length > maxChars) break;
    keep.add(rest[k].i);
  }
  const out = chosen();
  return [...out.map((x) => x.line), `(${items.length - out.length} other turns left out of this outline)`].join("\n");
}

export function forkPrompt(outline) {
  return [
    "Summarize this WHOLE conversation, from its very first message, for a new worker who will continue from it in a separate session.",
    "Weight the early and middle parts as much as the recent turns: earlier milestones (plans that ran, things built, decisions) matter.",
    "Use these sections:",
    "Goal",
    "Milestones so far (chronological, from the start, one line each)",
    "Decisions (and why)",
    "Files, paths and commands that matter",
    "Current state",
    "Open questions",
    "Plain text, 600 to 1200 words, no preamble, no secrets.",
    "",
    "An outline of the whole conversation, oldest first, to make sure nothing early is missed:",
    outline || "(no outline)",
  ].join("\n");
}
