// Session Bookmarks: explicit bookmarks for sessions you want to come back to.
//
// Nothing is saved unless the person asks (/bm, or the model's bookmark_session
// tool when they say "bookmark this"). A bookmark holds a title, a short note,
// the project (cwd, folder name, git branch), the session id, the transcript's
// path and a timestamp. Never the transcript itself: the one short model call
// that writes a title reads a clipped digest in memory and only its answer is kept.
//
// Storage is a plain JSON file (default ~/.claude/bookmarks/bookmarks.json), not
// $.store, because $.store is keyed per install and bookmarks must survive moving
// from a --plugin-dir load to a marketplace install. Writes go to a temp file
// that is then renamed over the old one; an unreadable file is backed up and a
// fresh list started.

const PANE = "session-bookmarks";
const PANE_TITLE = "Bookmarks";
const PANE_STATE = { plugin: "session-bookmarks", key: "pane" };
const EMPTY_PANE = { rows: [], notice: "", file: "", loadedAt: 0 };

const FILE_VERSION = 1;
const TITLE_MAX = 60;
const NOTE_MAX = 400;
const DIGEST_MAX = 4000;

const TOOL_SAVE = "bookmark_session";
const TOOL_FIND = "find_bookmarks";

// The only fields a bookmark ever holds.
export const FIELDS = [
  "id",
  "title",
  "titleSource",
  "note",
  "project",
  "branch",
  "cwd",
  "sessionId",
  "transcriptPath",
  "createdAt",
  "createdIso",
];

// A command word counts only in its own shape, so "/bm resume the auth work"
// is a note, while "/bm resume 2" resumes. An empty shape mismatch shows usage.
export function parseArgs(args) {
  const text = String(args ?? "").trim();
  const [first = ""] = text.split(/\s+/);
  const word = first.toLowerCase();
  const tail = text.slice(first.length).trim();
  const verb = { ls: "list", search: "find", rm: "delete" }[word] ?? word;
  const shapes = {
    save: () => true,
    help: () => tail === "",
    list: () => tail === "",
    open: () => tail === "",
    close: () => tail === "",
    find: () => tail !== "",
    resume: () => /^\d+$/.test(tail),
    delete: () => /^\d+$/.test(tail),
    rename: () => /^\d+\s+\S/.test(tail),
  };
  if (shapes[verb]?.()) return { verb, tail };
  if (shapes[verb] && tail === "") return { verb: "usage", tail: verb };
  return { verb: "save", tail: text };
}

const USAGE = {
  find: "Usage is /bm find <words>",
  resume: "Usage is /bm resume <n>, the number from /bm list",
  delete: "Usage is /bm delete <n>, the number from /bm list",
  rename: "Usage is /bm rename <n> <new title>",
};

export const TITLE_SYSTEM =
  "You label coding sessions so a person can find them again later. You answer in exactly the two-line format asked for, nothing else.";

export function titlePrompt(digest) {
  return [
    "Below is a clipped digest of a Claude Code session. Write a bookmark for it.",
    "",
    "<digest>",
    digest,
    "</digest>",
    "",
    "Answer with exactly two lines:",
    "TITLE: a specific title of at most 60 characters naming the task, not the tool",
    "NOTE: one or two short sentences on where the session left off and the next step",
    "",
    "No quotes, no markdown, no em dashes.",
  ].join("\n");
}

export function register(on, options) {
  const configured = typeof options?.bookmarksFile === "string" ? options.bookmarksFile.trim() : "";
  const titleModel = (typeof options?.titleModel === "string" && options.titleModel.trim()) || "haiku";

  on("session.start", async ($, e, next) => {
    const started = await next(e);
    await $.command.register({
      name: "bm",
      description: "Bookmark this session, or list, find, open, resume, delete bookmarks",
      argumentHint: "[note] | list | find <words> | open | resume <n> | delete <n> | help",
    });
    await $.tool.register({
      name: TOOL_SAVE,
      description:
        "Bookmark the CURRENT Claude Code session so the user can find and resume it later. " +
        "Call this only when the user explicitly asks to bookmark or save this session (for example \"bookmark this\"). " +
        "Never call it on your own initiative. Pass a short specific title (at most 60 characters) and a one or two sentence note " +
        "on where the work left off and the next step. Returns the saved bookmark.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short specific title, at most 60 characters" },
          note: { type: "string", description: "One or two sentences on where the session left off and the next step" },
        },
      },
    });
    await $.tool.register({
      name: TOOL_FIND,
      description:
        "Search the user's saved session bookmarks by words in the title, note or project name. " +
        "Use it when the user asks to find, list or resume a bookmarked session. An empty query lists them all, newest first. " +
        "Each match comes with the exact shell command that resumes it, which must be run in a new terminal.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", description: "Words to look for; empty lists every bookmark" } },
      },
    });
    // The pane can outlive a hot reload; give it fresh rows.
    const isUp = (await $.ui.panes()).some((p) => p.id === PANE);
    if (isUp) {
      const io = {
        read: (p) => $.fs.read(p),
        write: (p, t) => $.fs.write(p, t),
        exists: (p) => $.fs.exists(p),
        list: (p) => $.fs.list(p),
        run: (argv) => $.process.run(argv, { timeoutMs: 5000 }),
        home: () => $.env.get("HOME"),
        configDirEnv: () => $.env.get("CLAUDE_CONFIG_DIR"),
        fileEnv: () => $.env.get("SESSION_BOOKMARKS_FILE"),
        now: () => $.clock.now(),
        configured,
      };
      const view = await paneView(io, "");
      await $.state.set(PANE_STATE, view);
    }
    return started;
  });

  on("command.run", { command: "bm" }, async ($, e) => {
    const io = {
      read: (p) => $.fs.read(p),
      write: (p, t) => $.fs.write(p, t),
      exists: (p) => $.fs.exists(p),
      list: (p) => $.fs.list(p),
      run: (argv) => $.process.run(argv, { timeoutMs: 5000 }),
      home: () => $.env.get("HOME"),
        configDirEnv: () => $.env.get("CLAUDE_CONFIG_DIR"),
        fileEnv: () => $.env.get("SESSION_BOOKMARKS_FILE"),
      now: () => $.clock.now(),
      sessionId: () => $.session.id(),
      cwd: () => $.session.cwd(),
      messages: () => $.session.messages(),
      complete: (req) => $.model.complete(req),
      configured,
      titleModel,
    };
    const { verb, tail } = parseArgs(e.args);

    // Keep an open pane in step after anything that changes the list.
    const syncPane = async (notice) => {
      const isUp = (await $.ui.panes()).some((p) => p.id === PANE);
      if (!isUp) return;
      const view = await paneView(io, notice ?? "");
      await $.state.set(PANE_STATE, view);
    };

    if (verb === "usage") return { text: USAGE[tail] ?? helpText(await bookmarksFile(io)) };

    if (verb === "help") return { text: helpText(await bookmarksFile(io)) };

    if (verb === "close") {
      const isUp = (await $.ui.panes()).some((p) => p.id === PANE);
      if (!isUp) return { text: "The Bookmarks pane is not open." };
      await $.ui.close({ id: PANE });
      return { text: "Bookmarks pane closed." };
    }

    if (verb === "open") {
      const isUp = (await $.ui.panes()).some((p) => p.id === PANE);
      if (isUp) {
        await $.ui.close({ id: PANE });
        return { text: "Bookmarks pane closed." };
      }
      const view = await paneView(io, "");
      await $.state.set(PANE_STATE, view);
      // Focus so the row hotkeys work at once; Esc hands the keys back.
      const opened = await $.ui.open({
        id: PANE,
        title: PANE_TITLE,
        focus: true,
        rows: Math.min(22, 5 + 2 * Math.max(1, view.rows.length) + (view.notice ? 2 : 0)),
      });
      const count = `${view.rows.length} bookmark${view.rows.length === 1 ? "" : "s"}`;
      if (!opened.isPlaced) {
        const loaded = await loadBookmarks(io);
        return { text: `The pane could not be placed (${opened.reason}).\n${formatList(await withFlags(io, sortNewest(loaded.bookmarks)), await io.now())}` };
      }
      return { text: `Bookmarks pane open, ${count}. Number keys copy a resume command, Esc returns to the prompt, /bm close hides it.` };
    }

    if (verb === "list") {
      const loaded = await loadBookmarks(io);
      const rows = await withFlags(io, sortNewest(loaded.bookmarks));
      return { text: withWarning(loaded.warning, formatList(rows, await io.now())) };
    }

    if (verb === "find") {
      const loaded = await loadBookmarks(io);
      const rows = await withFlags(io, sortNewest(loaded.bookmarks));
      const hits = search(rows, tail);
      const body = hits.length === 0 ? `No bookmark matches "${tail}".` : formatList(hits, await io.now(), `Bookmarks matching "${tail}"`);
      return { text: withWarning(loaded.warning, body) };
    }

    if (verb === "resume") {
      const loaded = await loadBookmarks(io);
      const picked = pick(sortNewest(loaded.bookmarks), tail);
      if (picked.error) return { text: withWarning(loaded.warning, picked.error) };
      const cmd = resumeCommand(picked.bookmark);
      const copied = await $.ui.copy({ text: cmd });
      const head = copied.isCopied ? "Copied to the clipboard. Paste it in a new terminal" : `Could not copy (${copied.reason}). Run it in a new terminal`;
      await syncPane(copied.isCopied ? `Copied #${picked.n}: ${cmd}` : "");
      return { text: withWarning(loaded.warning, `${head}\n${cmd}\nA mod cannot switch the session you are in, so resuming happens in a new terminal.`) };
    }

    if (verb === "delete") {
      const loaded = await loadBookmarks(io);
      const picked = pick(sortNewest(loaded.bookmarks), tail);
      if (picked.error) return { text: withWarning(loaded.warning, picked.error) };
      await deleteBookmark(io, picked.bookmark.id);
      await syncPane(`Deleted "${picked.bookmark.title}".`);
      return { text: withWarning(loaded.warning, `Deleted bookmark ${picked.n}, "${picked.bookmark.title}".`) };
    }

    if (verb === "rename") {
      const [num = "", ...words] = tail.split(/\s+/);
      const title = cleanTitle(words.join(" "));
      if (!num || !title) return { text: "Usage is /bm rename <n> <new title>" };
      const loaded = await loadBookmarks(io);
      const picked = pick(sortNewest(loaded.bookmarks), num);
      if (picked.error) return { text: withWarning(loaded.warning, picked.error) };
      await renameBookmark(io, picked.bookmark.id, title);
      await syncPane(`Renamed #${picked.n}.`);
      return { text: withWarning(loaded.warning, `Bookmark ${picked.n} is now "${title}".`) };
    }

    // Anything else saves a bookmark; the words are the note.
    const saved = await saveCurrent(io, { note: tail });
    await syncPane(`Saved "${saved.bookmark.title}".`);
    return { text: withWarning(saved.warning, savedText(saved)) };
  });

  on("tool.call", { tool: "mcp__session-bookmarks__bookmark_session" }, async ($, e) => {
    const io = {
      read: (p) => $.fs.read(p),
      write: (p, t) => $.fs.write(p, t),
      exists: (p) => $.fs.exists(p),
      list: (p) => $.fs.list(p),
      run: (argv) => $.process.run(argv, { timeoutMs: 5000 }),
      home: () => $.env.get("HOME"),
        configDirEnv: () => $.env.get("CLAUDE_CONFIG_DIR"),
        fileEnv: () => $.env.get("SESSION_BOOKMARKS_FILE"),
      now: () => $.clock.now(),
      sessionId: () => $.session.id(),
      cwd: () => $.session.cwd(),
      messages: () => $.session.messages(),
      complete: (req) => $.model.complete(req),
      configured,
      titleModel,
    };
    const saved = await saveCurrent(io, {
      title: typeof e.title === "string" ? e.title : "",
      note: typeof e.note === "string" ? e.note : "",
    });
    const isUp = (await $.ui.panes()).some((p) => p.id === PANE);
    if (isUp) await $.state.set(PANE_STATE, await paneView(io, `Saved "${saved.bookmark.title}".`));
    return { result: withWarning(saved.warning, savedText(saved)) };
  });

  on("tool.call", { tool: "mcp__session-bookmarks__find_bookmarks" }, async ($, e) => {
    const io = {
      read: (p) => $.fs.read(p),
      write: (p, t) => $.fs.write(p, t),
      exists: (p) => $.fs.exists(p),
      list: (p) => $.fs.list(p),
      run: (argv) => $.process.run(argv, { timeoutMs: 5000 }),
      home: () => $.env.get("HOME"),
        configDirEnv: () => $.env.get("CLAUDE_CONFIG_DIR"),
        fileEnv: () => $.env.get("SESSION_BOOKMARKS_FILE"),
      now: () => $.clock.now(),
      configured,
    };
    const query = typeof e.query === "string" ? e.query.trim() : "";
    const loaded = await loadBookmarks(io);
    const rows = await withFlags(io, sortNewest(loaded.bookmarks));
    const hits = query ? search(rows, query) : rows;
    const now = await io.now();
    const body =
      hits.length === 0
        ? query
          ? `No bookmark matches "${query}".`
          : "No bookmarks saved yet."
        : formatList(hits, now, query ? `Bookmarks matching "${query}"` : "Bookmarks", { withCommand: true });
    return { result: withWarning(loaded.warning, body) };
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    const { value: pane = EMPTY_PANE } = await $.state.get(PANE_STATE);
    const width = Math.max(30, e.props.bodyColumns ?? 80);
    const height = Math.max(8, e.viewport?.rows ?? 24);
    const dim = (children) => Text({ dimColor: true, wrap: "truncate", children });

    const refresh = async (notice) => {
      const io = {
        read: (p) => $.fs.read(p),
        write: (p, t) => $.fs.write(p, t),
        exists: (p) => $.fs.exists(p),
        list: (p) => $.fs.list(p),
        run: (argv) => $.process.run(argv, { timeoutMs: 5000 }),
        home: () => $.env.get("HOME"),
        configDirEnv: () => $.env.get("CLAUDE_CONFIG_DIR"),
        fileEnv: () => $.env.get("SESSION_BOOKMARKS_FILE"),
        now: () => $.clock.now(),
        configured,
      };
      await $.state.set(PANE_STATE, await paneView(io, notice));
    };

    const children = [
      dim(clip(`${pane.rows.length} bookmark${pane.rows.length === 1 ? "" : "s"}, newest first  ·  ${shortPath(pane.file, Math.max(10, width - 30))}`, width)),
      Box({
        flexDirection: "row",
        gap: 1,
        children: [
          Button({ key: "refresh", label: "r Refresh", hotkey: "r", onPress: () => refresh("") }),
          Button({ key: "close", label: "c Close", hotkey: "c", role: "dismiss", onPress: () => $.ui.close({ id: PANE }) }),
        ],
      }),
    ];
    if (pane.notice) children.push(Text({ color: "cyan", children: pane.notice }));
    if (pane.rows.length === 0) children.push(dim("No bookmarks yet. /bm saves this session."));

    const room = Math.max(1, Math.floor((height - 6 - (pane.notice ? 3 : 0)) / 2));
    for (const row of pane.rows.slice(0, room)) {
      const hotkey = row.n <= 9 ? String(row.n) : undefined;
      const flags = [];
      if (row.isCwdMissing) flags.push("folder gone");
      if (row.isTranscriptMissing) flags.push("transcript missing");
      const where = row.branch ? `${row.project} (${row.branch})` : row.project;
      children.push(
        Box({
          flexDirection: "row",
          gap: 1,
          children: [
            Button({
              key: `resume:${row.id}`,
              label: `${hotkey ? hotkey + " " : ""}Resume`,
              hotkey,
              variant: "primary",
              onPress: async (press) => {
                const cmd = resumeCommand(row);
                const copied = await $.ui.copy({ text: cmd, surface: press.surface });
                const notice = copied.isCopied
                  ? `Copied. Paste in a new terminal: ${cmd}`
                  : `Could not copy (${copied.reason}). Run in a new terminal: ${cmd}`;
                const { value: now = EMPTY_PANE } = await $.state.get(PANE_STATE);
                await $.state.set(PANE_STATE, { ...now, notice });
                $.ui.toast(copied.isCopied ? `Resume command for #${row.n} copied` : "Copy failed, the command is in the pane");
              },
            }),
            Button({
              key: `delete:${row.id}`,
              label: "Delete",
              onPress: async () => {
                let answer;
                try {
                  answer = await $.ui.ask(`Delete bookmark ${row.n}, "${clip(row.title, 60)}"?`, {
                    options: ["Delete", "Keep"],
                    header: "Bookmarks",
                  });
                } catch {
                  answer = undefined;
                }
                if (answer !== "Delete") {
                  await refresh("Kept, nothing deleted.");
                  return;
                }
                const io = {
                  read: (p) => $.fs.read(p),
                  write: (p, t) => $.fs.write(p, t),
                  exists: (p) => $.fs.exists(p),
                  list: (p) => $.fs.list(p),
                  run: (argv) => $.process.run(argv, { timeoutMs: 5000 }),
                  home: () => $.env.get("HOME"),
        configDirEnv: () => $.env.get("CLAUDE_CONFIG_DIR"),
        fileEnv: () => $.env.get("SESSION_BOOKMARKS_FILE"),
                  now: () => $.clock.now(),
                  configured,
                };
                await deleteBookmark(io, row.id);
                await refresh(`Deleted "${row.title}".`);
              },
            }),
            Text({ bold: true, wrap: "truncate", children: `${row.n}. ${row.title}` }),
          ],
        }),
      );
      const meta = [where, ago(pane.loadedAt - row.createdAt)];
      if (flags.length) meta.push(flags.join(", "));
      if (row.note) meta.push(row.note);
      children.push(
        Text({
          dimColor: !flags.length,
          color: flags.length ? "yellow" : undefined,
          wrap: "truncate",
          children: clip(`    ${meta.join("  ·  ")}`, width),
        }),
      );
    }
    if (pane.rows.length > room) children.push(dim(`${pane.rows.length - room} more, /bm list shows all`));
    return Box({ flexDirection: "column", children });
  });
}

// ---- saving -----------------------------------------------------------------

// Builds a bookmark of the current session and appends it to the file.
export async function saveCurrent(io, { title = "", note = "" } = {}) {
  const cwd = (await io.cwd()) || "";
  const sessionId = (await io.sessionId()) || "";
  const now = await io.now();
  const project = baseName(cwd) || cwd || "unknown";
  const branch = await gitBranch(io, cwd);
  const transcriptPath = await findTranscript(io, sessionId, cwd);

  let finalTitle = cleanTitle(title);
  let finalNote = cleanNote(note);
  let titleSource = finalTitle ? "given" : "";
  if (!finalTitle && finalNote) {
    finalTitle = cleanTitle(firstSentence(finalNote));
    titleSource = "note";
  }
  if (!finalTitle) {
    const made = await generateTitle(io, project);
    finalTitle = made.title;
    titleSource = made.source;
    if (!finalNote) finalNote = made.note;
  }

  const bookmark = {
    id: `bm-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: finalTitle,
    titleSource,
    note: finalNote,
    project,
    branch,
    cwd,
    sessionId,
    transcriptPath,
    createdAt: now,
    createdIso: new Date(now).toISOString(),
  };

  const loaded = await loadBookmarks(io);
  const list = [...loaded.bookmarks, bookmark];
  await saveBookmarks(io, loaded.file, list);
  return { bookmark, count: list.length, file: loaded.file, warning: loaded.warning };
}

// One bounded model call over a clipped digest; the first prompt when it fails.
export async function generateTitle(io, project) {
  let messages = [];
  try {
    const got = await io.messages();
    messages = Array.isArray(got) ? got : [];
  } catch {
    messages = [];
  }
  const firstPrompt = firstUserPrompt(messages);
  const fallback = () => {
    const title = cleanTitle(firstPrompt) || `Session in ${project}`;
    return { title, note: "", source: "first-prompt" };
  };
  const digest = buildDigest(messages);
  if (!digest) return fallback();
  let reply;
  try {
    reply = await io.complete({
      model: io.titleModel || "haiku",
      system: TITLE_SYSTEM,
      prompt: titlePrompt(digest),
      maxTokens: 160,
      timeoutMs: 20000,
    });
  } catch {
    return fallback();
  }
  if (!reply?.isAnswered) return fallback();
  const parsed = parseTitleReply(reply.text ?? "");
  if (!parsed.title) return fallback();
  return { title: parsed.title, note: parsed.note, source: "model" };
}

export function parseTitleReply(text) {
  const title = /^\s*\**TITLE\**\s*:\s*(.+)$/im.exec(text)?.[1] ?? "";
  const note = /^\s*\**NOTE\**\s*:\s*(.+)$/im.exec(text)?.[1] ?? "";
  return { title: cleanTitle(title), note: cleanNote(note) };
}

// The person's real prompts and the replies, newest last, clipped. Kept in memory only.
export function buildDigest(messages) {
  const talk = messages
    .map((m) => ({ role: m.role, text: m.role === "user" ? userText(m.text) : oneLine(m.text ?? "") }))
    .filter((m) => m.text);
  if (talk.length === 0) return "";
  const parts = [];
  const first = talk.find((m) => m.role === "user");
  if (first) parts.push(`First request: ${clip(first.text, 400)}`);
  for (const m of talk.slice(-8)) parts.push(`${m.role === "user" ? "User" : "Assistant"}: ${clip(m.text, 400)}`);
  let digest = parts.join("\n");
  if (digest.length > DIGEST_MAX) digest = digest.slice(digest.length - DIGEST_MAX);
  return digest;
}

export function firstUserPrompt(messages) {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = userText(m.text);
    if (text) return text;
  }
  return "";
}

// A user row's own words: no command records, no injected tags, no slash commands.
function userText(text) {
  const raw = String(text ?? "");
  if (/<command-name>|<local-command-stdout>|<command-message>/.test(raw)) return "";
  const stripped = oneLine(raw.replace(/<([a-z-]+)>[\s\S]*?<\/\1>/g, " "));
  if (!stripped || stripped.startsWith("/")) return "";
  return stripped;
}

async function gitBranch(io, cwd) {
  if (!cwd) return "";
  try {
    const r = await io.run(["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"]);
    if (r.exitCode !== 0) return "";
    const branch = r.stdout.trim();
    return branch === "HEAD" ? "detached" : branch;
  } catch {
    return "";
  }
}

export function projectSlug(path) {
  return String(path).replace(/[^a-zA-Z0-9]/g, "-");
}

// <config>/projects/<slug of cwd>/<id>.jsonl, or wherever that id's file is.
export async function findTranscript(io, sessionId, cwd) {
  if (!sessionId) return "";
  const configDir = await configDirOf(io);
  const direct = `${configDir}/projects/${projectSlug(cwd)}/${sessionId}.jsonl`;
  try {
    if (await io.exists(direct)) return direct;
    const dirs = await io.list(`${configDir}/projects`);
    for (const d of dirs.slice(0, 3000)) {
      if (d.kind !== "dir") continue;
      const path = `${configDir}/projects/${d.name}/${sessionId}.jsonl`;
      if (await io.exists(path)) return path;
    }
  } catch {
    // no projects folder; keep the expected path
  }
  return direct;
}

async function configDirOf(io) {
  const home = (await io.home()) ?? "";
  return (await io.configDirEnv()) || `${home}/.claude`;
}

// ---- the file -----------------------------------------------------------------

export async function bookmarksFile(io) {
  const home = (await io.home()) ?? "";
  const fromEnv = ((await io.fileEnv()) ?? "").trim();
  const chosen = fromEnv || io.configured || `${home}/.claude/bookmarks/bookmarks.json`;
  return chosen.startsWith("~/") ? `${home}${chosen.slice(1)}` : chosen;
}

// Reads the list. A file that does not parse is copied aside and replaced by an
// empty list, and `warning` says so.
export async function loadBookmarks(io) {
  const file = await bookmarksFile(io);
  if (!(await io.exists(file))) return { file, bookmarks: [], warning: "" };
  let raw = "";
  try {
    raw = await io.read(file);
  } catch (err) {
    return { file, bookmarks: [], warning: `Could not read ${file} (${err?.message ?? err}).` };
  }
  const parsed = parseFile(raw);
  if (parsed) return { file, bookmarks: parsed, warning: "" };
  const backup = `${file}.corrupt-${stamp(await io.now())}`;
  await io.write(backup, raw);
  await saveBookmarks(io, file, []);
  return {
    file,
    bookmarks: [],
    warning: `Your bookmarks file was unreadable, so I saved a copy to ${backup} and started a fresh list.`,
  };
}

export function parseFile(raw) {
  try {
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data && Array.isArray(data.bookmarks) ? data.bookmarks : null;
    if (!list) return null;
    return list.filter((b) => b && typeof b === "object" && typeof b.id === "string").map(onlyFields);
  } catch {
    return null;
  }
}

function onlyFields(b) {
  const out = {};
  for (const k of FIELDS) {
    if (b[k] !== undefined) out[k] = b[k];
  }
  out.title = typeof out.title === "string" && out.title ? out.title : "(untitled)";
  out.note = typeof out.note === "string" ? out.note : "";
  out.project = typeof out.project === "string" ? out.project : "";
  out.branch = typeof out.branch === "string" ? out.branch : "";
  out.cwd = typeof out.cwd === "string" ? out.cwd : "";
  out.sessionId = typeof out.sessionId === "string" ? out.sessionId : "";
  out.transcriptPath = typeof out.transcriptPath === "string" ? out.transcriptPath : "";
  out.createdAt = typeof out.createdAt === "number" ? out.createdAt : 0;
  return out;
}

// Writes to a temp file beside it, then renames it over the old one.
export async function saveBookmarks(io, file, list) {
  const text = `${JSON.stringify({ version: FILE_VERSION, bookmarks: list.map(onlyFields) }, null, 2)}\n`;
  const tmp = `${file}.tmp-${await io.now()}`;
  await io.write(tmp, text);
  let isMoved = false;
  try {
    await io.run(["chmod", "600", tmp]);
    const r = await io.run(["mv", "-f", tmp, file]);
    isMoved = r.exitCode === 0;
  } catch {
    isMoved = false;
  }
  if (!isMoved) {
    await io.write(file, text);
    try {
      await io.run(["rm", "-f", tmp]);
    } catch {
      // the temp file stays; harmless
    }
  }
  // Keep the default folder private; a folder the person chose is theirs.
  const home = (await io.home()) ?? "";
  if (file === `${home}/.claude/bookmarks/bookmarks.json`) {
    try {
      await io.run(["chmod", "700", `${home}/.claude/bookmarks`]);
    } catch {
      // best effort
    }
  }
}

export async function deleteBookmark(io, id) {
  const loaded = await loadBookmarks(io);
  const list = loaded.bookmarks.filter((b) => b.id !== id);
  await saveBookmarks(io, loaded.file, list);
  return list.length !== loaded.bookmarks.length;
}

export async function renameBookmark(io, id, title) {
  const loaded = await loadBookmarks(io);
  const list = loaded.bookmarks.map((b) => (b.id === id ? { ...b, title, titleSource: "given" } : b));
  await saveBookmarks(io, loaded.file, list);
}

// ---- listing ------------------------------------------------------------------

export function sortNewest(list) {
  return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

// Numbers rows newest first and notes a folder or transcript that is gone.
export async function withFlags(io, sorted) {
  const rows = [];
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const isCwdMissing = b.cwd ? !(await io.exists(b.cwd)) : true;
    const isTranscriptMissing = b.transcriptPath ? !(await io.exists(b.transcriptPath)) : true;
    rows.push({ ...b, n: i + 1, isCwdMissing, isTranscriptMissing });
  }
  return rows;
}

async function paneView(io, notice) {
  const loaded = await loadBookmarks(io);
  const rows = (await withFlags(io, sortNewest(loaded.bookmarks))).map((r) => ({
    n: r.n,
    id: r.id,
    title: r.title,
    note: r.note,
    project: r.project,
    branch: r.branch,
    cwd: r.cwd,
    sessionId: r.sessionId,
    createdAt: r.createdAt,
    isCwdMissing: r.isCwdMissing,
    isTranscriptMissing: r.isTranscriptMissing,
  }));
  return { rows, notice: loaded.warning || notice || "", file: loaded.file, loadedAt: await io.now() };
}

// Every word must appear in the title, the note or the project (name or branch).
export function search(rows, query) {
  const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return rows;
  return rows.filter((r) => {
    const hay = `${r.title} ${r.note} ${r.project} ${r.branch}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

function pick(sorted, arg) {
  const n = Number.parseInt(String(arg ?? "").trim(), 10);
  if (sorted.length === 0) return { error: "No bookmarks saved yet. /bm saves this session." };
  if (!Number.isInteger(n) || n < 1 || n > sorted.length) {
    return { error: `Pick a bookmark number from 1 to ${sorted.length}. /bm list shows them.` };
  }
  return { n, bookmark: sorted[n - 1] };
}

export function formatList(rows, now, heading = "Bookmarks", { withCommand = false } = {}) {
  if (rows.length === 0) return "No bookmarks saved yet. /bm saves this session.";
  const lines = [`${heading} (${rows.length}), newest first`];
  for (const r of rows) {
    const where = r.branch ? `${r.project} (${r.branch})` : r.project;
    lines.push(`${String(r.n).padStart(2)}. ${r.title}`);
    lines.push(`    ${where}  ·  ${ago(now - r.createdAt)}  ·  session ${String(r.sessionId).slice(0, 8)}`);
    if (r.note) lines.push(`    ${r.note}`);
    const flags = [];
    if (r.isCwdMissing) flags.push("folder no longer exists");
    if (r.isTranscriptMissing) flags.push("transcript file not found");
    if (flags.length) lines.push(`    [${flags.join(", ")}]`);
    if (withCommand) lines.push(`    resume in a new terminal with: ${resumeCommand(r)}`);
  }
  if (!withCommand) lines.push("/bm resume <n> copies the command that reopens one.");
  return lines.join("\n");
}

function savedText(saved) {
  const b = saved.bookmark;
  const how = { given: "", note: "", model: " (title written by the model)", "first-prompt": " (title from your first prompt)" }[b.titleSource] ?? "";
  const lines = [`Bookmarked "${b.title}"${how}.`];
  if (b.note) lines.push(`Note: ${b.note}`);
  lines.push(`${b.project}${b.branch ? ` (${b.branch})` : ""}, session ${b.sessionId.slice(0, 8)}. ${saved.count} bookmark${saved.count === 1 ? "" : "s"} in total, /bm list shows them.`);
  return lines.join("\n");
}

function withWarning(warning, text) {
  return warning ? `${warning}\n\n${text}` : text;
}

export function helpText(file) {
  return [
    "Session bookmarks, saved only when you ask.",
    "  /bm [note]             bookmark this session (no note means a short title is written for you)",
    "  /bm save <note>        the same, for a note that starts with a command word",
    "  /bm list               every bookmark, newest first",
    "  /bm find <words>       search titles, notes and project names",
    "  /bm open               toggle the Bookmarks pane (Resume copies the command, Delete asks first)",
    "  /bm resume <n>         copy the command that reopens bookmark n",
    "  /bm rename <n> <title> retitle bookmark n",
    "  /bm delete <n>         remove bookmark n",
    "  /bm close              close the pane",
    "Resuming happens in a new terminal, since a mod cannot switch the session you are in.",
    "Plain English works too, for example \"bookmark this session\" or \"find my bookmark about the parser\".",
    `Bookmarks live in ${file}`,
  ].join("\n");
}

// ---- the resume command ----------------------------------------------------------

export function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

export function resumeCommand(b) {
  const id = /^[A-Za-z0-9_-]+$/.test(b.sessionId) ? b.sessionId : shellQuote(b.sessionId);
  return b.cwd ? `cd ${shellQuote(b.cwd)} && claude --resume ${id}` : `claude --resume ${id}`;
}

// ---- text helpers -----------------------------------------------------------------

export function cleanTitle(text) {
  let t = oneLine(String(text ?? ""))
    .replace(/[—–]/g, ", ")
    .replace(/^["'`*#\s]+|["'`*\s]+$/g, "")
    .replace(/\s+,/g, ",")
    .trim();
  if (t.length > TITLE_MAX) {
    const cut = t.slice(0, TITLE_MAX - 1);
    const space = cut.lastIndexOf(" ");
    t = `${(space > 30 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
  }
  return t;
}

function cleanNote(text) {
  const t = oneLine(String(text ?? "")).replace(/[—–]/g, ", ").replace(/\s+,/g, ",").trim();
  return t.length > NOTE_MAX ? `${t.slice(0, NOTE_MAX - 1)}…` : t;
}

function firstSentence(text) {
  const m = /^(.+?[.!?])(\s|$)/.exec(text);
  return m ? m[1] : text;
}

function baseName(path) {
  return String(path).split("/").filter(Boolean).pop() ?? "";
}

function oneLine(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

function clip(s, n) {
  const t = String(s);
  return t.length <= n ? t : `${t.slice(0, Math.max(0, n - 1))}…`;
}

function stamp(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function shortPath(path, n) {
  let p = String(path).replace(/^\/Users\/[^/]+/, "~").replace(/^\/home\/[^/]+/, "~");
  if (p.length <= n) return p;
  return `…${p.slice(p.length - n + 1)}`;
}
