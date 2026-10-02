// Output Tray: the files this session CREATED, in a side pane, with Open, Reveal
// in Finder and Copy path. Nothing is ever opened unless the person presses a
// button or types a /tray command; the model can show or list the tray, never
// open a file.
//
// Tracking, three ways, all honest about what they saw:
//   - Write / NotebookEdit: the path is checked BEFORE the call (`$.fs.exists`);
//     after `next(e)` it counts only when the call was not denied, not errored,
//     not staged, and the tool itself did not report an update. A Write over an
//     existing file goes to a separate "edited existing" count.
//   - Bash: a snapshot of new files under the session's folder (`git status
//     --porcelain -z --untracked-files=all`, or a bounded `find` outside git)
//     before and after each call; the difference is tagged "shell".
//   - Turn sweep: the same snapshot at turn start and end catches what neither
//     saw (a background command, an MCP tool), tagged "other".
// A call with `e.agentId` came from a subagent and is tagged so.

import { update } from "claude-code";

const PANE = "output-tray";
const TITLE = "Output Tray";
const TOOL = "output_tray";
const TOOL_FULL = "mcp__output-tray__output_tray";
const MAX_ITEMS = 300;
const MAX_MODIFIED = 100;
const TICK_MS = 15000;
const SHEBANG_READ_MAX = 1024 * 1024;

const itemsRef = { plugin: "output-tray", key: "items" };
const metaRef = { plugin: "output-tray", key: "meta" };

const EMPTY_META = { cwd: "", seq: 0, selected: "", modified: [], lastAction: "" };

// Opening these with `open` could run, install, mount or launch something, so
// Open reveals them in Finder instead.
const REVEAL_ONLY = new Set([
  "app", "pkg", "mpkg", "dmg", "iso", "jar", "workflow", "action", "prefpane", "kext", "plugin", "bundle",
  "saver", "mobileconfig", "shortcut", "exe", "msi", "appex", "framework", "scpt", "scptd", "osax", "service",
  "qlgenerator", "mdimporter", "xpc", "dylib", "so", "bin", "run", "out", "elf", "deb", "rpm", "appimage",
]);
// Scripts and link files: `open` might run them (a .command or .sh opens in
// Terminal and runs; Python Launcher runs a .py), so Open shows them as text.
const TEXT_ONLY = new Set([
  "sh", "bash", "zsh", "fish", "ksh", "csh", "tcsh", "command", "tool", "py", "pyw", "rb", "pl", "php", "lua",
  "js", "mjs", "cjs", "ts", "tsx", "jsx", "ps1", "psm1", "bat", "cmd", "vbs", "applescript", "terminal",
  "webloc", "inetloc", "url", "fileloc", "desktop", "swift", "r", "tcl", "awk", "expect",
]);

const VIA_LABEL = { write: "Write", notebook: "Notebook", shell: "shell", other: "other" };

const HELP = [
  "Output Tray: the files Claude created in this session.",
  "  /tray              open or close the tray panel",
  "  /tray list         list the files as text",
  "  /tray open <n>     open file n (scripts open as text, apps and installers are revealed instead)",
  "  /tray reveal <n>   show file n in Finder",
  "  /tray copy <n>     copy file n's full path",
  "  /tray clear        forget the list (files on disk are untouched)",
  "  /tray close        close the panel",
  "In the panel: 1-9 pick a row, o Open, r Reveal, c Copy path, f Refresh, x Close. Esc gives the keys back.",
  "Nothing is ever opened automatically. Claude can show or list the tray, never open a file.",
].join("\n");

export function register(on) {
  // Module memory: reset on a hot reload, which only costs one turn sweep.
  const mem = { inflight: new Set(), roots: new Map(), turnBase: null, ticker: null };

  on("session.start", async ($, e, next) => {
    const started = await next(e);
    try {
      await $.command.register({
        name: "tray",
        description: "Output Tray: the files Claude created this session, with Open, Reveal and Copy path",
        argumentHint: "[list|open <n>|reveal <n>|copy <n>|clear|close|help]",
        immediate: true,
      });
    } catch {
      // registered by an earlier load
    }
    try {
      await $.tool.register({
        name: TOOL,
        description:
          "Show the user their Output Tray (a side panel listing the files created in this session, newest first, " +
          "with buttons the USER presses to open or reveal them), or list those files as text. Use when the user asks " +
          "to see the files you made, the outputs, or the deliverables. action 'show' opens the panel; 'list' returns " +
          "the list. This tool cannot open files: opening is the user's own action in the panel.",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["show", "list"], description: "show: open the panel. list: return the files as text." },
          },
          required: ["action"],
        },
      });
    } catch {
      // registered by an earlier load
    }
    const { value: m = EMPTY_META } = await $.state.get(metaRef);
    if (e.cwd && m.cwd !== e.cwd) await $.state.set(metaRef, { ...m, cwd: e.cwd });
    return started;
  });

  // A /clear ends the conversation; the tray starts over with the next one.
  on("session.end", async ($, e, next) => {
    if (e.reason === "clear") {
      await $.state.set(itemsRef, []);
      const { value: m = EMPTY_META } = await $.state.get(metaRef);
      await $.state.set(metaRef, { ...m, selected: "", modified: [], lastAction: "" });
    }
    return next(e);
  });

  // ---- tracking ------------------------------------------------------------------

  on("tool.call", { tool: "Write" }, async ($, e, next) => trackFileTool($, e, next, e.file_path, "write", mem));
  on("tool.call", { tool: "NotebookEdit" }, async ($, e, next) => trackFileTool($, e, next, e.notebook_path, "notebook", mem));

  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const cwd = await cwdOf($);
    const before = await snapshot($, cwd, mem.roots);
    const ran = await next(e);
    if (!before || ran.deny !== undefined) return ran;
    try {
      const after = await snapshot($, cwd, mem.roots);
      if (after) {
        const fresh = await newPaths($, before, after, mem.inflight);
        if (fresh.length) await addItems($, fresh, "shell", e.agentId ?? "");
      }
    } catch {
      // ignore
    }
    return ran;
  });

  on("turn.start", async ($, e, next) => {
    if (e.agentId == null) {
      try {
        mem.turnBase = await snapshot($, await cwdOf($), mem.roots);
      } catch {
        mem.turnBase = null;
      }
    }
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (e.agentId != null || !mem.turnBase) return result;
    const base = mem.turnBase;
    mem.turnBase = null;
    try {
      const after = await snapshot($, await cwdOf($), mem.roots);
      if (after) {
        const fresh = await newPaths($, base, after, mem.inflight);
        if (fresh.length) await addItems($, fresh, "other", "");
      }
    } catch {
      // ignore
    }
    return result;
  });

  // ---- the model's tool: show or list, never open ------------------------------------

  on("tool.call", { tool: TOOL_FULL }, async ($, e) => {
    const action = String(e.action ?? "show").toLowerCase();
    const { value: items = [] } = await $.state.get(itemsRef);
    if (action === "list") return { result: await listing($, items) };
    if (action !== "show") return { result: `Unknown action "${action}". Use "show" or "list".` };
    let placed = false;
    try {
      placed = (await $.ui.open({ id: PANE, title: TITLE })).isPlaced;
    } catch {
      placed = false;
    }
    ensureTicker($, mem);
    const count = `${items.length} file${items.length === 1 ? "" : "s"}`;
    if (!placed) {
      return { result: `The Output Tray panel could not be placed here, so here is the list instead.\n${await listing($, items)}` };
    }
    return {
      result:
        `Output Tray is open beside the conversation with ${count}. The user opens or reveals files with its buttons ` +
        "(or /tray open <n>); you cannot open files with this tool.",
    };
  });

  // ---- /tray ---------------------------------------------------------------------------

  on("command.run", { command: "tray" }, async ($, e) => {
    const args = (e.args ?? "").trim();
    const [verbRaw = "", nRaw = ""] = args.split(/\s+/);
    const verb = verbRaw.toLowerCase();
    const { value: items = [] } = await $.state.get(itemsRef);

    if (verb === "help" || verb === "?") return { text: HELP };
    if (verb === "list" || verb === "ls") return { text: await listing($, items) };

    if (verb === "clear") {
      await $.state.set(itemsRef, []);
      const { value: m = EMPTY_META } = await $.state.get(metaRef);
      await $.state.set(metaRef, { ...m, selected: "", modified: [], lastAction: "" });
      return { text: `Output Tray cleared (${items.length} entr${items.length === 1 ? "y" : "ies"} forgotten; files on disk untouched).` };
    }

    if (verb === "close") {
      await $.ui.close({ id: PANE });
      return { text: "Output Tray closed." };
    }

    if ((verb === "open" || verb === "reveal" || verb === "copy") && nRaw) {
      const n = Number.parseInt(nRaw, 10);
      const item = Number.isFinite(n) ? items[n - 1] : undefined;
      if (!item) return { text: `No file ${nRaw} in the tray (it has ${items.length}). Try /tray list.` };
      if (verb === "copy") {
        const copied = await $.ui.copy({ text: item.abs });
        return { text: copied.isCopied ? `Copied: ${item.abs}` : `Could not copy (${copied.reason}). Path: ${item.abs}` };
      }
      const done = verb === "open" ? await openItem($, item) : await revealItem($, item);
      return { text: done };
    }

    if (verb !== "" && verb !== "show" && verb !== "open") {
      return { text: `Unknown /tray option "${verbRaw}".\n${HELP}` };
    }

    const pane = (await $.ui.panes()).find((p) => p.id === PANE);
    if (verb === "" && pane && pane.isShown) {
      await $.ui.close({ id: PANE });
      return { text: "Output Tray closed." };
    }
    const opened = await $.ui.open({ id: PANE, title: TITLE, focus: true });
    ensureTicker($, mem);
    if (!opened.isPlaced) {
      return { text: `Output Tray could not be placed (${opened.reason}).\n${await listing($, items)}` };
    }
    return {
      text: `Output Tray open: ${items.length} file${items.length === 1 ? "" : "s"}. Keys 1-9 pick, o open, r reveal, c copy path, x close.`,
    };
  });

  // ---- the pane ------------------------------------------------------------------------

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    const { value: items = [] } = await $.state.get(itemsRef);
    const { value: m = EMPTY_META } = await $.state.get(metaRef);
    const width = Math.max(30, Math.floor(e.props.bodyColumns ?? 60));
    const now = await $.clock.now();
    const dim = (children, extra = {}) => Text({ dimColor: true, wrap: "truncate", children, ...extra });
    ensureTicker($, mem);

    const rows = [];
    const created = `${items.length} file${items.length === 1 ? "" : "s"} created this session`;
    const edited = m.modified.length ? `  ·  ${m.modified.length} existing edited` : "";
    rows.push(Text({ bold: true, wrap: "truncate", children: "OUTPUT TRAY" }));
    rows.push(dim(clip(created + edited, width)));

    if (items.length === 0) {
      rows.push(Text({ children: " " }));
      rows.push(dim("Nothing created yet. Files Claude makes with Write, notebooks or shell commands show up here, newest first."));
      rows.push(Box({ flexDirection: "row", gap: 1, children: [closeButton($, Button)] }));
      return Box({ flexDirection: "column", children: rows });
    }

    const selectedId = items.some((x) => x.id === m.selected) ? m.selected : items[0].id;
    const room = Math.max(3, Math.floor(((e.viewport?.rows ?? 40) - 12) / 3));
    const shown = items.slice(0, room);
    const stats = await Promise.all(shown.map((x) => statOf($, x.abs)));

    rows.push(
      Box({
        flexDirection: "row",
        gap: 1,
        children: [
          Button({ key: "act:open", label: "o Open", hotkey: "o", variant: "primary", onPress: () => actOnSelected($, "open") }),
          Button({ key: "act:reveal", label: "r Reveal", hotkey: "r", onPress: () => actOnSelected($, "reveal") }),
          Button({ key: "act:copy", label: "c Copy path", hotkey: "c", onPress: (p) => actOnSelected($, "copy", p.surface) }),
          Button({ key: "act:refresh", label: "f Refresh", hotkey: "f", onPress: () => refresh($) }),
          closeButton($, Button),
        ],
      }),
    );

    shown.forEach((item, i) => {
      const st = stats[i];
      const isSel = item.id === selectedId;
      const hotkey = i < 9 ? String(i + 1) : undefined;
      const tag = tagOf(item);
      const meta = st ? `${sizeOf(st.size)}  ${ago(now - item.at)}` : "missing: deleted or moved";
      rows.push(
        Box({
          key: `row:${item.id}`,
          flexDirection: "row",
          gap: 1,
          marginTop: 1,
          children: [
            Button({
              key: `pick:${item.id}`,
              label: isSel ? "▶" : "·",
              hotkey,
              plain: true,
              onPress: () => select($, item.id),
            }),
            Text({ bold: true, color: isSel ? "cyan" : undefined, strikethrough: !st, wrap: "truncate", children: clip(item.name, Math.max(10, width - 34)) }),
            Text({ color: st ? undefined : "yellow", dimColor: Boolean(st), wrap: "truncate", children: meta }),
            Text({ color: tagColor(item), wrap: "truncate", children: tag }),
          ],
        }),
      );
      const buttons = st
        ? [
            Button({ key: `open:${item.id}`, label: "Open", dimColor: !isSel, onPress: () => select($, item.id).then(() => openItem($, item)) }),
            Button({ key: `reveal:${item.id}`, label: "Reveal", dimColor: !isSel, onPress: () => select($, item.id).then(() => revealItem($, item)) }),
          ]
        : [];
      rows.push(
        Box({
          flexDirection: "row",
          gap: 1,
          children: [Text({ children: "   " }), dim(clip(item.folder, Math.max(8, width - 24))), ...buttons],
        }),
      );
    });

    if (items.length > shown.length) rows.push(dim(`+${items.length - shown.length} more: /tray list`));

    const sel = shown.find((x) => x.id === selectedId);
    if (sel && openPlanByName(sel.abs) !== "open") {
      rows.push(Text({ children: " " }));
      rows.push(
        Text({
          color: "yellow",
          wrap: "wrap",
          children: `${sel.name} is ${openPlanByName(sel.abs) === "text" ? "a script: Open shows it as text and never runs it" : "an app, installer or package: Open reveals it in Finder instead"}.`,
        }),
      );
    }
    if (m.lastAction) {
      rows.push(Text({ children: " " }));
      rows.push(dim(clip(m.lastAction, width * 2), { wrap: "wrap" }));
    }
    return Box({ flexDirection: "column", children: rows });
  });

  on("ui.close", async ($, e, next) => {
    const r = await next(e);
    if (e.id === PANE && mem.ticker) {
      mem.ticker.cancel();
      mem.ticker = null;
    }
    return r;
  });
}

// ---- tracking a file tool -----------------------------------------------------------

async function trackFileTool($, e, next, path, via, mem) {
  if (typeof path !== "string" || !path) return next(e);
  let existed = true;
  try {
    existed = await $.fs.exists(path);
  } catch {
    existed = true; // unknown: never claim it was created
  }
  const key = keyOf(path);
  if (!existed) mem.inflight.add(key);
  let ran;
  try {
    ran = await next(e);
  } catch (err) {
    mem.inflight.delete(key);
    throw err;
  }
  try {
    const verdict = writeVerdict(existed, ran);
    if (verdict === "created") {
      // NotebookEdit has no create flag: the file must be there now.
      const there = via === "write" || (await $.fs.exists(path).catch(() => false));
      if (there) await addItems($, [path], via, e.agentId ?? "");
    } else if (verdict === "modified") {
      await noteModified($, path);
    }
  } catch {
    // the tray is a convenience; never fail the tool over it
  }
  mem.inflight.delete(key);
  return ran;
}

function ensureTicker($, mem) {
  if (mem.ticker) return;
  mem.ticker = $.clock.every(TICK_MS, async () => {
    let up = false;
    try {
      up = (await $.ui.panes()).some((p) => p.id === PANE);
    } catch {
      up = false;
    }
    if (up) $.ui.invalidate("ui.render");
    else if (mem.ticker) {
      mem.ticker.cancel();
      mem.ticker = null;
    }
  });
}

// ---- actions (only ever from a press or a /tray command) -------------------------------

function closeButton($, Button) {
  return Button({ key: "act:close", label: "x Close", hotkey: "x", role: "dismiss", onPress: () => $.ui.close({ id: PANE }) });
}

async function select($, id) {
  await update($, metaRef, (m) => ({ ...(m ?? EMPTY_META), selected: id }));
}

async function refresh($) {
  $.ui.invalidate("ui.render");
}

async function actOnSelected($, action, surface) {
  const { value: items = [] } = await $.state.get(itemsRef);
  const { value: m = EMPTY_META } = await $.state.get(metaRef);
  const item = items.find((x) => x.id === m.selected) ?? items[0];
  if (!item) return;
  if (action === "open") return openItem($, item);
  if (action === "reveal") return revealItem($, item);
  const copied = await $.ui.copy(surface ? { text: item.abs, surface } : { text: item.abs });
  await noteAction($, copied.isCopied ? `Copied path of ${item.name}` : `Could not copy (${copied.reason}): ${item.abs}`);
}

async function openItem($, item) {
  const st = await statOf($, item.abs, true);
  if (!st) return noteAction($, `${item.name} is missing: deleted or moved.`);
  const plan = await openPlan($, item.abs, st);
  const argv = plan === "open" ? ["open", item.abs] : plan === "text" ? ["open", "-t", item.abs] : ["open", "-R", item.abs];
  const code = await run($, argv);
  const how =
    plan === "open"
      ? `Opened ${item.name}`
      : plan === "text"
        ? `Opened ${item.name} as text (a script is never run from the tray)`
        : `Revealed ${item.name} in Finder (an app, installer or executable is never launched from the tray)`;
  return noteAction($, code === 0 ? how : `open failed for ${item.name} (exit ${code})`);
}

async function revealItem($, item) {
  const st = await statOf($, item.abs);
  if (!st) return noteAction($, `${item.name} is missing: deleted or moved.`);
  const code = await run($, ["open", "-R", item.abs]);
  return noteAction($, code === 0 ? `Revealed ${item.name} in Finder` : `Reveal failed for ${item.name} (exit ${code})`);
}

async function run($, argv) {
  let code = -1;
  try {
    const r = await $.process.run(argv, { timeoutMs: 10000 });
    code = r.exitCode;
  } catch (err) {
    $.ui.log(`output-tray: ${JSON.stringify(argv)} could not start: ${String(err?.message ?? err)}`, { to: "debug" });
    return -1;
  }
  $.ui.log(`output-tray: ran ${JSON.stringify(argv)} exit ${code}`, { to: "debug" });
  return code;
}

async function noteAction($, text) {
  await update($, metaRef, (m) => ({ ...(m ?? EMPTY_META), lastAction: text }));
  return text;
}

// What Open does for a path: "open" (its default app), "text" (`open -t`), or
// "reveal" (`open -R`). Decided at press time from the name, the kind, the
// execute bit and a shebang.
async function openPlan($, abs, st) {
  const byName = openPlanByName(abs);
  if (byName !== "open") return byName;
  if (st.realPath && openPlanByName(st.realPath) !== "open") return openPlanByName(st.realPath);
  if (st.kind !== "file") return "reveal";
  let isExec = true;
  try {
    isExec = (await $.process.run(["test", "-x", abs], { timeoutMs: 5000 })).exitCode === 0;
  } catch {
    isExec = true; // unknown: be careful
  }
  if (!isExec) return "open";
  if (st.size <= SHEBANG_READ_MAX) {
    try {
      const head = await $.fs.read(abs);
      if (typeof head === "string" && head.startsWith("#!")) return "text";
    } catch {
      // unreadable
    }
  }
  return "reveal";
}

// The outermost bundle (Hello.app, a .pkg folder) a path sits in, or the path.
export function bundleOf(abs) {
  const parts = String(abs).split("/");
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i].toLowerCase();
    const dot = seg.lastIndexOf(".");
    if (dot > 0 && REVEAL_ONLY.has(seg.slice(dot + 1))) return parts.slice(0, i + 1).join("/");
  }
  return abs;
}

export function openPlanByName(abs) {
  const base = basename(abs).toLowerCase();
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1) : "";
  if (REVEAL_ONLY.has(ext)) return "reveal";
  if (TEXT_ONLY.has(ext)) return "text";
  return "open";
}

// ---- tracking helpers -------------------------------------------------------------------

export function writeVerdict(existed, ran) {
  if (!ran || ran.deny !== undefined || ran.isError) return "none";
  const r = ran.result;
  if (r && typeof r === "object" && r.staged) return "none";
  if (existed) return "modified";
  if (r && typeof r === "object" && r.type === "update") return "modified";
  return "created";
}

async function addItems($, paths, via, agentId) {
  const { value: m0 = EMPTY_META } = await $.state.get(metaRef);
  const cwd = m0.cwd || (await $.session.cwd().catch(() => ""));
  const now = await $.clock.now();
  const fresh = [];
  let seq = m0.seq;
  for (const abs of paths) {
    const st = await statOf($, abs);
    if (st && st.kind !== "file" && bundleOf(abs) !== abs) continue;
    seq += 1;
    fresh.push(makeItem(abs, cwd, { id: `f${seq}`, via, agentId, at: now, size: st ? st.size : 0 }));
  }
  if (!fresh.length) return;
  await update($, metaRef, (m) => ({ ...(m ?? EMPTY_META), seq: Math.max(seq, (m ?? EMPTY_META).seq), cwd: (m ?? EMPTY_META).cwd || cwd }));
  const keys = new Set(fresh.map((x) => x.key));
  const newestFirst = [...fresh].reverse();
  await update($, itemsRef, (list) => [...newestFirst, ...(list ?? []).filter((x) => !keys.has(x.key))].slice(0, MAX_ITEMS));
  await update($, metaRef, (m) => ({ ...(m ?? EMPTY_META), selected: newestFirst[0].id }));
}

async function noteModified($, path) {
  const { value: m0 = EMPTY_META } = await $.state.get(metaRef);
  const cwd = m0.cwd || "";
  const shown = relOf(path, cwd) ?? shortHome(path);
  await update($, metaRef, (m) => {
    const cur = m ?? EMPTY_META;
    if (cur.modified.includes(shown)) return cur;
    return { ...cur, modified: [...cur.modified, shown].slice(-MAX_MODIFIED) };
  });
}

export function makeItem(abs, cwd, { id, via, agentId, at, size }) {
  const rel = relOf(abs, cwd);
  const name = basename(abs);
  const dir = rel === null ? dirname(shortHome(abs)) : dirname(rel);
  const folder = rel === null ? `${dir}/` : dir ? `${dir}/` : "./ (project root)";
  return { id, key: keyOf(abs), abs, rel: rel ?? shortHome(abs), name, folder, via, agentId, at, size };
}

export function tagOf(item) {
  const base = VIA_LABEL[item.via] ?? item.via;
  return item.agentId ? `subagent ${base}` : base;
}

function tagColor(item) {
  if (item.agentId) return "magenta";
  if (item.via === "shell") return "yellow";
  if (item.via === "other") return "gray";
  return "green";
}

// New file paths in `after` that were not in `before`, not a Write in flight,
// and not already in the tray.
async function newPaths($, before, after, inflight) {
  const { value: items = [] } = await $.state.get(itemsRef);
  const known = new Set(items.map((x) => x.key));
  const out = [];
  for (const [key, abs] of after) {
    if (before.has(key) || inflight.has(key) || known.has(key)) continue;
    if (/(^|\/)\.DS_Store$/.test(abs)) continue;
    const top = bundleOf(abs);
    if (top !== abs && (known.has(keyOf(top)) || out.includes(top))) continue;
    out.push(top);
  }
  return out.sort();
}

// A snapshot of the files under `cwd` a creation would add: git's untracked and
// newly added files, or a bounded listing outside git. Map of key -> path, or
// null when it cannot be taken cheaply (then nothing is guessed).
async function snapshot($, cwd, roots) {
  if (!cwd) return null;
  try {
    let root = roots.get(cwd);
    if (root === undefined) {
      const r = await $.process.run(["git", "-C", cwd, "rev-parse", "--show-toplevel"], { cwd, timeoutMs: 5000 });
      root = r.exitCode === 0 ? r.stdout.trim() : "";
      roots.set(cwd, root);
    }
    if (root) {
      const r = await $.process.run(
        ["git", "-C", cwd, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", "."],
        { cwd, timeoutMs: 8000 },
      );
      if (r.exitCode !== 0 || r.isStdoutTruncated) return null;
      return parsePorcelain(r.stdout, root);
    }
  } catch {
    return null;
  }
  const home = (await $.env.get("HOME").catch(() => "")) ?? "";
  if (cwd === "/" || (home && keyOf(cwd) === keyOf(home))) return null;
  try {
    const r = await $.process.run(
      ["find", cwd, "-maxdepth", "6", "(", "-name", ".git", "-o", "-name", "node_modules", ")", "-prune", "-o", "-type", "f", "-print0"],
      { cwd, timeoutMs: 5000 },
    );
    if (r.exitCode !== 0 || r.isStdoutTruncated) return null;
    const out = new Map();
    for (const p of r.stdout.split("\0")) if (p) out.set(keyOf(p), p);
    return out;
  } catch {
    return null;
  }
}

export function parsePorcelain(stdout, root) {
  const out = new Map();
  const parts = stdout.split("\0");
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    const xy = entry.slice(0, 2);
    const p = entry.slice(3);
    if (xy[0] === "R" || xy[0] === "C") i += 1; // the original path follows
    if (xy === "??" || xy[0] === "A") {
      const abs = `${root.replace(/\/$/, "")}/${p}`;
      out.set(keyOf(abs), abs);
    }
  }
  return out;
}

async function cwdOf($) {
  const { value: m = EMPTY_META } = await $.state.get(metaRef);
  if (m.cwd) return m.cwd;
  try {
    return await $.session.cwd();
  } catch {
    return "";
  }
}

async function statOf($, abs, resolve = false) {
  try {
    return await $.fs.stat(abs, resolve ? { resolve: true } : undefined);
  } catch {
    return null;
  }
}

async function listing($, items) {
  const { value: m = EMPTY_META } = await $.state.get(metaRef);
  if (items.length === 0) {
    const edited = m.modified.length ? ` (${m.modified.length} existing file${m.modified.length === 1 ? "" : "s"} edited)` : "";
    return `Output Tray: no files created yet this session${edited}.`;
  }
  const now = await $.clock.now();
  const lines = [`Output Tray: ${items.length} file${items.length === 1 ? "" : "s"} created this session (newest first)`];
  let i = 0;
  for (const item of items) {
    i += 1;
    const st = await statOf($, item.abs);
    const state = st ? `${sizeOf(st.size)}, ${ago(now - item.at)}` : "missing: deleted or moved";
    lines.push(`${String(i).padStart(2)}. ${item.rel}  [${tagOf(item)}]  ${state}`);
  }
  if (m.modified.length) lines.push(`Also edited ${m.modified.length} existing file${m.modified.length === 1 ? "" : "s"}: ${m.modified.slice(-8).join(", ")}`);
  lines.push("Open one with /tray open <n> or /tray reveal <n>.");
  return lines.join("\n");
}

// ---- paths and formatting ---------------------------------------------------------------

// A comparison key: NFC, macOS /private aliases folded, segments normalized.
export function keyOf(path) {
  let s = String(path).normalize("NFC");
  s = s.replace(/^\/private(?=\/(tmp|var|etc)(\/|$))/, "");
  const abs = s.startsWith("/");
  const parts = [];
  for (const seg of s.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return (abs ? "/" : "") + parts.join("/");
}

export function relOf(abs, cwd) {
  if (!cwd) return null;
  const a = keyOf(abs);
  const c = keyOf(cwd);
  if (a === c) return "";
  if (!a.startsWith(`${c}/`)) return null;
  // keep the original spelling of the tail (only the prefix was folded)
  return a.slice(c.length + 1);
}

function basename(p) {
  const s = String(p).replace(/\/+$/, "");
  return s.slice(s.lastIndexOf("/") + 1);
}

function dirname(p) {
  const s = String(p).replace(/\/+$/, "");
  const i = s.lastIndexOf("/");
  return i < 0 ? "" : i === 0 ? "/" : s.slice(0, i);
}

function shortHome(p) {
  return String(p).replace(/^\/Users\/[^/]+/, "~").replace(/^\/home\/[^/]+/, "~");
}

export function sizeOf(n) {
  if (!Number.isFinite(n)) return "?";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function clip(s, n) {
  const t = String(s);
  return t.length <= n ? t : `${t.slice(0, Math.max(0, n - 1))}…`;
}
