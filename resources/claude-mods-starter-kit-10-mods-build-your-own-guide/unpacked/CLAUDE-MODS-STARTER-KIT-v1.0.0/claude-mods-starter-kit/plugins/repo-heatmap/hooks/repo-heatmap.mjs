// Repo Heatmap: watch where Claude looks.
//
// A squarified treemap of the repository in a side pane: every file is a
// rectangle sized by its line count (or bytes), grouped by folder. Files light
// up as Claude touches them (cyan for Read, yellow for search hits, coral for
// Edit/Write, a red flash for a failed edit) and the glow decays over ~20s into
// a faint "visited" tint, so the session's footprint stays on the map.
//
// Drawing: one Raster, two pixels per cell (upper half block, fg = top pixel,
// bg = bottom pixel). The render hook paints the current frame; while anything
// glows a `$.clock.every` timer repaints it in place with `$.ui.blit` (15 fps
// during a pulse, 5 fps during the slow decay, stopped once everything settles).

import { update } from "claude-code";

const PANE = "repo-heatmap";
const TITLE = "Repo Heatmap";
const RASTER_KEY = "map";

export const MAX_FILES = 1500;
export const GLOW_MS = 20000;
export const FAIL_MS = 6000;
export const PULSE_MS = 1400;
export const FLASH_MS = 700;
const FAST_MS = 66; // ~15 fps while a pulse ring or flash runs
const SLOW_MS = 200; // ~5 fps for the slow glow decay
const RECENT_MAX = 5;
const SCAN_BATCH = 200;

const filesRef = { plugin: "repo-heatmap", key: "files" };
const metaRef = { plugin: "repo-heatmap", key: "meta" };
const touchesRef = { plugin: "repo-heatmap", key: "touches" };
const recentRef = { plugin: "repo-heatmap", key: "recent" };

const EMPTY_META = {
  cwd: "",
  mode: "lines",
  total: 0,
  more: 0,
  moreWeight: 0,
  status: "idle",
  scannedAt: 0,
  note: "",
};

// ---- palette ----------------------------------------------------------------

export const COLORS = {
  bg: 0x0b0e14,
  cream: 0xf3e9d2,
  creamDim: 0xb9b09c,
  ink: 0x101317,
  read: 0x2fd8f2,
  search: 0xffd23f,
  edit: 0xe8603c,
  fail: 0xff2a3d,
};
const KIND_COLOR = { read: COLORS.read, search: COLORS.search, edit: COLORS.edit, fail: COLORS.fail };
const HEX = (c) => `#${c.toString(16).padStart(6, "0")}`;
// Folder hues, picked away from the heat colors so a glow always pops.
const HUES = [222, 276, 150, 322, 204, 252, 112, 300, 172, 238, 136, 262];

const WATCHED = new Set(["Read", "Edit", "MultiEdit", "Write", "NotebookEdit", "Grep", "Glob", "Bash", "LSP"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "target", "vendor", "__pycache__", ".venv", "venv", "coverage", ".cache", ".turbo", "out"]);
const SKIP_FILE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Cargo\.lock|poetry\.lock|Gemfile\.lock|composer\.lock|go\.sum)$|\.(png|jpe?g|gif|ico|webp|bmp|tiff?|pdf|zip|gz|tgz|bz2|xz|7z|rar|jar|woff2?|ttf|otf|eot|mp[34]|mov|avi|wav|ogg|flac|so|dylib|dll|exe|bin|o|a|class|pyc|wasm|db|sqlite|map|min\.js|min\.css|lockb|DS_Store)$/i;

// ---- registration -------------------------------------------------------------

export function register(on) {
  // Animation and caches live in the module: a hot reload starts them fresh and
  // the next render (which reads $.state) fills them again.
  const anim = {
    timer: null,
    layout: null,
    touches: {},
    lastBlit: 0,
    busy: false,
    denies: 0,
    settledAt: -1,
  };
  const cache = { key: "", layout: null, known: null, knownKey: "" };

  function stopAnim() {
    if (anim.timer) {
      try {
        anim.timer.cancel();
      } catch {
        // already gone
      }
    }
    anim.timer = null;
  }

  // `every` and `blit` are closures over the calling hook's `$`.
  function startAnim(every, blit) {
    if (anim.timer || !anim.layout) return;
    if (!animState(anim.touches, Date.now()).active) return;
    anim.denies = 0;
    anim.timer = every(FAST_MS, () => {
      const now = Date.now();
      const layout = anim.layout;
      if (!layout) return stopAnim();
      const st = animState(anim.touches, now);
      if (!st.pulsing && now - anim.lastBlit < SLOW_MS && st.active) return;
      if (anim.busy) return;
      anim.busy = true;
      anim.lastBlit = now;
      let cells;
      try {
        cells = encodeCells(renderFrame(layout, anim.touches, now));
      } catch {
        anim.busy = false;
        return stopAnim();
      }
      Promise.resolve(blit({ requestId: PANE, key: RASTER_KEY, cells })).then(
        (r) => {
          anim.busy = false;
          if (r && r.deny) {
            anim.denies += 1;
            if (anim.denies > 3) stopAnim();
          } else anim.denies = 0;
        },
        () => {
          anim.busy = false;
          stopAnim();
        },
      );
      // The frame just sent is the settled one: nothing left to animate.
      if (!st.active) stopAnim();
    });
  }

  function knownSet(files) {
    const key = `${files.length}:${files.length ? files[0].p : ""}:${files.length ? files[files.length - 1].p : ""}`;
    if (cache.known && cache.knownKey === key) return cache.known;
    cache.known = new Set(files.map((f) => f.p));
    cache.knownKey = key;
    return cache.known;
  }

  // ---- session start: register the command, scan the repo in the background --
  on("session.start", async ($, e, next) => {
    const started = await next(e);
    try {
      await $.command.register({
        name: "heatmap",
        description: "Repo Heatmap: a live treemap of the repo that lights up as Claude reads, searches and edits",
        argumentHint: "[reset|size lines|size bytes|rescan|close]",
        immediate: true,
      });
    } catch {
      // registered on a previous load
    }
    const cwd = e.cwd;
    const { value: meta = EMPTY_META } = await $.state.get(metaRef);
    if (meta.cwd === cwd && meta.status === "ready") return started;
    await $.state.set(metaRef, { ...EMPTY_META, mode: meta.mode || "lines", cwd, status: "scanning" });
    const run = (argv) => $.process.run(argv, { cwd, timeoutMs: 20000 });
    const list = (path) => $.fs.list(path);
    $.clock.after(5, async () => {
      try {
        const scan = await scanRepo(run, list, cwd);
        await $.state.set(filesRef, scan.files);
        const { value: m = EMPTY_META } = await $.state.get(metaRef);
        await $.state.set(metaRef, {
          ...m,
          cwd,
          total: scan.total,
          more: scan.more,
          moreWeight: scan.moreWeight,
          status: "ready",
          scannedAt: Date.now(),
          note: scan.note,
        });
      } catch (err) {
        const { value: m = EMPTY_META } = await $.state.get(metaRef);
        await $.state.set(metaRef, { ...m, status: "error", note: String(err?.message ?? err).slice(0, 120) });
      }
    });
    return started;
  });

  // ---- /heatmap -----------------------------------------------------------------
  on("command.run", { command: "heatmap" }, async ($, e) => {
    const [verb = "", arg = ""] = (e.args ?? "").trim().toLowerCase().split(/\s+/);

    if (verb === "reset") {
      await $.state.set(touchesRef, {});
      await $.state.set(recentRef, []);
      anim.touches = {};
      stopAnim();
      return { text: "Repo Heatmap: footprint cleared." };
    }

    if (verb === "size") {
      if (arg !== "lines" && arg !== "bytes") return { text: "Usage: /heatmap size lines|bytes" };
      const { value: m = EMPTY_META } = await $.state.get(metaRef);
      await $.state.set(metaRef, { ...m, mode: arg });
      return { text: `Repo Heatmap: files sized by ${arg}.` };
    }

    if (verb === "rescan") {
      const cwd = await $.session.cwd();
      const { value: m = EMPTY_META } = await $.state.get(metaRef);
      await $.state.set(metaRef, { ...m, cwd, status: "scanning" });
      const scan = await scanRepo(
        (argv) => $.process.run(argv, { cwd, timeoutMs: 20000 }),
        (path) => $.fs.list(path),
        cwd,
      );
      await $.state.set(filesRef, scan.files);
      await $.state.set(metaRef, {
        ...m,
        cwd,
        total: scan.total,
        more: scan.more,
        moreWeight: scan.moreWeight,
        status: "ready",
        scannedAt: Date.now(),
        note: scan.note,
      });
      return { text: `Repo Heatmap: ${scan.total} files mapped.` };
    }

    const pane = (await $.ui.panes()).find((p) => p.id === PANE);
    // Open and on screen: the bare command closes it. Open behind another
    // panel (the engine's diff view, say): it comes back to the front.
    if (verb === "close" || (verb === "" && pane && pane.isShown)) {
      stopAnim();
      await $.ui.close({ id: PANE });
      return { text: "Repo Heatmap closed." };
    }
    if (verb !== "" && verb !== "open") {
      return { text: `Unknown option "${verb}". Try /heatmap, /heatmap reset, /heatmap size lines|bytes, /heatmap rescan.` };
    }

    const opened = await $.ui.open({ id: PANE, title: TITLE });
    if (!opened.isPlaced) return { text: `Repo Heatmap could not be placed (${opened.reason}). Widen the terminal.` };
    const { value: m = EMPTY_META } = await $.state.get(metaRef);
    return { text: `Repo Heatmap open: ${m.total || "scanning"} files, sized by ${m.mode}.` };
  });

  // ---- tool calls: what Claude touches --------------------------------------------
  on("tool.call", async ($, e, next) => {
    if (!WATCHED.has(e.tool)) return next(e);
    let cwd = "";
    let known = null;
    try {
      const { value: meta = EMPTY_META } = await $.state.get(metaRef);
      const { value: files = [] } = await $.state.get(filesRef);
      cwd = meta.cwd || (await $.session.cwd());
      known = knownSet(files);
    } catch {
      return next(e);
    }

    const record = async (hits) => {
      if (hits.length === 0) return;
      const now = await $.clock.now();
      const touches = await update($, touchesRef, (t) => applyTouches(t ?? {}, hits, now));
      await update($, recentRef, (r) => pushRecent(r ?? [], hits, now));
      anim.touches = touches;
      startAnim(
        (ms, fn) => $.clock.every(ms, fn),
        (args) => $.ui.blit(args),
      );
    };

    // A read glows the moment it starts.
    const pre = e.tool === "Read" ? touchesFromCall(e, null, cwd, known) : [];
    try {
      await record(pre);
    } catch {
      // never hold the tool up over a drawing
    }

    const result = await next(e);
    try {
      if (e.tool !== "Read" && !result.deny) {
        // A Write that creates a file adds it to the map.
        const fresh = newFileFromWrite(e, result, cwd, known);
        if (fresh) {
          await update($, filesRef, (f) => {
            const list = f ?? [];
            return list.some((x) => x.p === fresh.p) ? list : [...list, fresh];
          });
          known = new Set([...known, fresh.p]);
        }
        await record(touchesFromCall(e, result, cwd, known));
      }
    } catch {
      // ignore: the map is decoration
    }
    return result;
  });

  // ---- the pane -------------------------------------------------------------------
  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e);
    const { Box, Text } = els;
    const { value: files = [] } = await $.state.get(filesRef);
    const { value: meta = EMPTY_META } = await $.state.get(metaRef);
    const { value: touches = {} } = await $.state.get(touchesRef);
    const { value: recent = [] } = await $.state.get(recentRef);
    anim.touches = touches;

    const cols = clamp(Math.floor(e.props.bodyColumns ?? 60), 20, 200);
    const stats = statsOf(files, touches, meta);
    const header = Box({
      flexDirection: "row",
      children: [
        Text({ bold: true, color: HEX(COLORS.cream), children: "REPO HEATMAP " }),
        Text({ dimColor: true, wrap: "truncate", children: headerNote(meta, files.length) }),
      ],
    });

    if (e.surface !== "terminal") {
      const folders = folderSummary(files, touches, meta.mode).slice(0, 12);
      return Box({
        flexDirection: "column",
        children: [
          header,
          Text({ children: stats.line }),
          ...folders.map((g) =>
            Text({
              color: g.touched ? HEX(COLORS.edit) : undefined,
              dimColor: !g.touched,
              children: `${g.label}  ${g.touched}/${g.count} touched${g.edited ? `, ${g.edited} edited` : ""}`,
            }),
          ),
          ...recentRows(Box, Text, recent, cols),
        ],
      });
    }

    const screenRows = e.viewport?.rows ?? 40;
    const textRows = 3 + RECENT_MAX + 1; // reserved, so the map never jumps when the list fills
    const mapRows = clamp(screenRows - textRows - 9, 6, 120);

    if (files.length === 0) {
      anim.layout = null;
      return Box({
        flexDirection: "column",
        children: [
          header,
          Text({ dimColor: true, children: meta.status === "error" ? `Scan failed: ${meta.note}` : "Scanning the repository..." }),
        ],
      });
    }

    const key = `${cols}x${mapRows}:${meta.mode}:${files.length}:${meta.scannedAt}:${meta.more}`;
    if (cache.key !== key || !cache.layout) {
      cache.layout = buildLayout(files, meta.mode, cols, mapRows * 2, { count: meta.more, weight: meta.moreWeight });
      cache.key = key;
    }
    anim.layout = cache.layout;
    const now = Date.now();
    const cells = encodeCells(renderFrame(cache.layout, touches, now));
    startAnim(
      (ms, fn) => $.clock.every(ms, fn),
      (args) => $.ui.blit(args),
    );

    return Box({
      flexDirection: "column",
      children: [
        header,
        els.Raster({ key: RASTER_KEY, columns: cols, rows: mapRows, cells }),
        Box({
          flexDirection: "row",
          children: [
            Text({ color: HEX(COLORS.read), children: "■ Read  " }),
            Text({ color: HEX(COLORS.search), children: "■ Search  " }),
            Text({ color: HEX(COLORS.edit), children: "■ Edit  " }),
            Text({ color: HEX(COLORS.fail), children: "■ Failed  " }),
            Text({ color: HEX(palette().visited.read), children: "■ Visited" }),
          ],
        }),
        Text({ wrap: "truncate", children: clip(stats.line, cols) }),
        ...recentRows(Box, Text, recent, cols),
      ],
    });
  });

  on("ui.close", async ($, e, next) => {
    if (e.id === PANE) stopAnim();
    return next(e);
  });
}

function recentRows(Box, Text, recent, cols) {
  const shown = recent.slice(0, RECENT_MAX);
  if (shown.length === 0) return [Text({ dimColor: true, children: "recently touched: nothing yet" })];
  return [
    Text({ dimColor: true, children: "recently touched" }),
    ...shown.map((r) =>
      Box({
        flexDirection: "row",
        children: [
          Text({ color: HEX(KIND_COLOR[r.kind] ?? COLORS.cream), children: "● " }),
          Text({ color: HEX(KIND_COLOR[r.kind] ?? COLORS.cream), children: `${KIND_LABEL[r.kind] ?? r.kind}`.padEnd(7) }),
          Text({ wrap: "truncate", children: clip(r.path, Math.max(8, cols - 10)) }),
        ],
      }),
    ),
  ];
}

const VISITED_MIX = { search: 0.24, read: 0.36, edit: 0.62, fail: 0.5 };

const KIND_LABEL = { read: "read", search: "search", edit: "edit", fail: "failed" };

function headerNote(meta, n) {
  if (meta.status === "scanning" && n === 0) return "scanning...";
  const more = meta.more > 0 ? ` (+${meta.more} more)` : "";
  return `${meta.total || n} files${more} · sized by ${meta.mode}`;
}

// ---- scanning -------------------------------------------------------------------

// `run(argv)` and `list(path)` wrap $.process.run and $.fs.list.
export async function scanRepo(run, list, cwd) {
  let paths = [];
  let note = "";
  try {
    const g = await run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
    if (g.exitCode === 0) paths = g.stdout.split("\0").filter(Boolean);
  } catch {
    paths = [];
  }
  if (paths.length === 0) {
    paths = await walk(list, cwd);
    note = "walked (not a git repo)";
  }
  paths = [...new Set(paths)].filter((p) => !SKIP_FILE.test(p) && !p.split("/").some((s) => SKIP_DIRS.has(s)));

  const sized = [];
  if (paths.length > 4000) {
    // Big repo: one call for byte sizes, lines estimated from bytes.
    try {
      const t = await run(["git", "ls-tree", "-r", "-l", "HEAD"]);
      const bytes = new Map();
      for (const line of t.stdout.split("\n")) {
        const m = /^\S+ blob \S+\s+(\d+)\t(.+)$/.exec(line);
        if (m) bytes.set(m[2], Number(m[1]));
      }
      for (const p of paths) {
        const b = bytes.get(p) ?? 0;
        sized.push({ p, l: Math.max(1, Math.round(b / 36)), b });
      }
    } catch {
      for (const p of paths) sized.push({ p, l: 1, b: 1 });
    }
  } else {
    for (let i = 0; i < paths.length; i += SCAN_BATCH) {
      const batch = paths.slice(i, i + SCAN_BATCH);
      let out = "";
      try {
        const r = await run(["wc", "-l", "-c", "--", ...batch]);
        out = r.stdout;
      } catch {
        out = "";
      }
      const got = parseWc(out);
      for (const p of batch) {
        const s = got.get(p);
        if (s) sized.push({ p, l: s.l, b: s.b });
      }
    }
  }
  return capFiles(sized, MAX_FILES, note);
}

export function parseWc(text) {
  const got = new Map();
  for (const line of String(text).split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.+)$/.exec(line);
    if (!m || m[3] === "total") continue;
    got.set(m[3], { l: Number(m[1]), b: Number(m[2]) });
  }
  return got;
}

export function capFiles(sized, max, note = "") {
  const sorted = [...sized].sort((a, b) => b.l - a.l || a.p.localeCompare(b.p));
  const files = sorted.slice(0, max).sort((a, b) => a.p.localeCompare(b.p));
  const rest = sorted.slice(max);
  return {
    files,
    total: sized.length,
    more: rest.length,
    moreWeight: rest.reduce((s, f) => s + Math.max(1, f.l), 0),
    note,
  };
}

async function walk(list, root) {
  const out = [];
  const queue = [""];
  while (queue.length > 0 && out.length < 20000) {
    const rel = queue.shift();
    let entries = [];
    try {
      entries = await list(rel ? `${root}/${rel}` : root);
    } catch {
      entries = [];
    }
    for (const ent of entries) {
      const p = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.kind === "directory") {
        if (!SKIP_DIRS.has(ent.name) && !ent.name.startsWith(".") && p.split("/").length < 9) queue.push(p);
      } else if (ent.kind === "file") out.push(p);
    }
  }
  return out;
}

// ---- tool call -> files ---------------------------------------------------------

export function normalizePath(raw, cwd) {
  if (typeof raw !== "string") return null;
  let s = raw.trim().replace(/^['"`]+|['"`,;)]+$/g, "");
  if (!s) return null;
  if (s.startsWith("~")) return null;
  if (s.startsWith("/")) {
    const roots = [cwd];
    if (cwd.startsWith("/private/")) roots.push(cwd.slice("/private".length));
    else roots.push(`/private${cwd}`);
    const root = roots.find((r) => r && (s === r || s.startsWith(`${r}/`)));
    if (!root) return null;
    s = s.slice(root.length + 1);
  }
  const parts = [];
  for (const seg of s.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else parts.push(seg);
  }
  return parts.length ? parts.join("/") : null;
}

// Files named in tool output, split by shape: `path:12:text` (grep -n / rg)
// and `path:` lines are content hits; a bare path line is a listing entry.
export function outputHits(text, cwd, known, limit = 400) {
  const colon = [];
  const bare = [];
  const seenBare = new Set();
  const seenColon = new Set();
  const lines = String(text ?? "").split("\n");
  for (let i = 0; i < lines.length && i < 6000 && colon.length + bare.length < limit; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const whole = normalizePath(line, cwd);
    if (whole && known.has(whole)) {
      if (!seenBare.has(whole)) {
        seenBare.add(whole);
        bare.push(whole);
      }
      continue;
    }
    const m = /^(.+?)[:-]\d+[:-]/.exec(line) ?? /^([^:\s]+):/.exec(line);
    if (!m) continue;
    const p = normalizePath(m[1], cwd);
    if (p && known.has(p) && !seenColon.has(p)) {
      seenColon.add(p);
      colon.push(p);
    }
  }
  return { colon, bare };
}

// Every file hit in a search tool's output (Grep, Glob).
export function filesInText(text, cwd, known, limit = 80) {
  const { colon, bare } = outputHits(text, cwd, known);
  return [...colon, ...bare].slice(0, limit);
}

function words(cmd) {
  return String(cmd).match(/"[^"]*"|'[^']*'|[^\s|;&<>()]+|[|;&<>]+/g) ?? [];
}

const READ_CMDS = new Set(["cat", "head", "tail", "less", "more", "bat", "nl", "wc", "sed", "awk", "view", "diff", "cmp", "jq"]);
const CONTENT_CMDS = new Set(["grep", "egrep", "fgrep", "rg", "ag", "ack"]);
const LIST_CMDS = new Set(["ls", "find", "fd", "tree"]);
const LISTING_MAX = 12; // a listing of more files than this is an overview, not a look
const SEARCH_MAX = 40;
const SCRIPT_WRITE = /\.write\(|writeFile|write_text|open\([^)]*['"][wa]|perl\s+-\w*i/;
const RANK = { fail: 4, edit: 3, read: 2, search: 1 };

function knownIn(text, cwd, known) {
  const out = [];
  for (const tok of String(text).match(/[A-Za-z0-9_@+.\/-]+/g) ?? []) {
    const p = normalizePath(tok, cwd);
    if (p && known.has(p)) out.push(p);
  }
  return out;
}

function bashTouches(command, text, failed, cwd, known, add, push) {
  let content = false;
  let bareOk = false;
  let listing = false;
  for (const seg of command.split(/\|\||&&|;|\n|\|/)) {
    const toks = words(seg).filter((t) => !/^[A-Z_][A-Z0-9_]*=/.test(t));
    const cmd = (toks[0] ?? "").replace(/^.*\//, "");
    const args = toks.slice(1).filter((t) => !t.startsWith("-") && !/^[<>|&]+$/.test(t));
    const redirect = toks.findIndex((t) => t === ">" || t === ">>");
    const target = redirect >= 0 ? toks[redirect + 1] : undefined;
    if (target) add(target, failed ? "fail" : "edit");
    if (cmd === "tee") for (const a of args) add(a, failed ? "fail" : "edit");
    if (cmd === "git") {
      const sub = args[0];
      if (sub === "grep") {
        content = true;
        if (toks.some((t) => /^-(l|-files-with-matches|-name-only)$/.test(t))) bareOk = true;
      } else if (sub === "ls-files") listing = true;
      continue;
    }
    if (cmd === "sed" && toks.some((t) => /^-i/.test(t))) {
      for (const a of args.slice(1)) add(a, failed ? "fail" : "edit");
    } else if (READ_CMDS.has(cmd)) {
      for (const a of args) if (a !== target) add(a, "read");
    } else if (CONTENT_CMDS.has(cmd)) {
      content = true;
      if (toks.some((t) => /^-\w*l\w*$|^--files-with-matches$|^-\w*c$/.test(t))) bareOk = true;
      for (const a of args.slice(1)) add(a, "search");
    } else if (LIST_CMDS.has(cmd)) listing = true;
  }
  if (!failed) {
    const { colon, bare } = outputHits(text, cwd, known);
    if (content) for (const p of colon.slice(0, SEARCH_MAX)) push(p, "search");
    if (content && bareOk) for (const p of bare.slice(0, SEARCH_MAX)) push(p, "search");
    else if (listing && bare.length <= LISTING_MAX) for (const p of bare) push(p, "search");
  }
  // An inline script that writes (python, node, perl): the files it names were edited.
  if (SCRIPT_WRITE.test(command)) for (const p of knownIn(command, cwd, known)) push(p, failed ? "fail" : "edit");
}

// What a tool call touched: [{ path, kind }], paths relative to cwd and known.
export function touchesFromCall(call, outcome, cwd, known) {
  const hits = [];
  const push = (p, kind) => hits.push({ path: p, kind });
  const add = (raw, kind) => {
    const p = normalizePath(raw, cwd);
    if (p && known.has(p)) push(p, kind);
  };
  const failed = Boolean(outcome && outcome.isError);
  const text = outcome && typeof outcome.text === "string" ? outcome.text : "";
  switch (call.tool) {
    case "Read":
      add(call.file_path, "read");
      break;
    case "LSP":
      add(call.filePath ?? call.file_path, "read");
      break;
    case "Edit":
    case "MultiEdit":
    case "Write":
      add(call.file_path, failed ? "fail" : "edit");
      break;
    case "NotebookEdit":
      add(call.notebook_path, failed ? "fail" : "edit");
      break;
    case "Grep":
    case "Glob": {
      if (failed) break;
      const found = filesInText(text, cwd, known, 200);
      const cap = call.tool === "Glob" ? LISTING_MAX * 2 : SEARCH_MAX;
      if (found.length <= cap) for (const p of found) push(p, "search");
      if (found.length === 0) add(call.path, "search");
      break;
    }
    case "Bash":
      if (typeof call.command === "string") bashTouches(call.command, text, failed, cwd, known, add, push);
      break;
    default:
      break;
  }
  // One hit per file, the strongest kind winning (a failed edit, an edit, a read, a search).
  const best = new Map();
  for (const h of hits) {
    const had = best.get(h.path);
    if (!had || RANK[h.kind] > RANK[had.kind]) best.set(h.path, h);
  }
  return [...best.values()].slice(0, 80);
}

export function newFileFromWrite(call, outcome, cwd, known) {
  if (call.tool !== "Write" || !outcome || outcome.isError || outcome.deny) return null;
  const p = normalizePath(call.file_path, cwd);
  if (!p || known.has(p) || SKIP_FILE.test(p)) return null;
  const content = typeof call.content === "string" ? call.content : "";
  return { p, l: Math.max(1, content.split("\n").length), b: content.length };
}

export function applyTouches(prev, hits, now) {
  const next = { ...prev };
  for (const h of hits) {
    const old = next[h.path];
    const t = old ? { ...old } : { first: now, last: now, kind: h.kind, r: 0, s: 0, e: 0, f: 0, n: 0, edits: 0 };
    t.last = now;
    t.kind = h.kind;
    t.n += 1;
    if (h.kind === "read") t.r = now;
    if (h.kind === "search") t.s = now;
    if (h.kind === "edit") {
      t.e = now;
      t.edits += 1;
    }
    if (h.kind === "fail") t.f = now;
    next[h.path] = t;
  }
  return next;
}

export function pushRecent(prev, hits, now) {
  let list = [...prev];
  for (const h of hits) {
    list = [{ path: h.path, kind: h.kind, at: now }, ...list.filter((r) => r.path !== h.path)];
  }
  return list.slice(0, RECENT_MAX);
}

// ---- decay ------------------------------------------------------------------------

// 1 at the touch, easing to 0 at `span` (smoothstep): bright for a while, then a soft fade.
export function glow(age, span = GLOW_MS) {
  if (age <= 0) return 1;
  if (age >= span) return 0;
  const u = age / span;
  return 1 - u * u * (3 - 2 * u);
}

export function animState(touches, now) {
  let active = false;
  let pulsing = false;
  for (const k in touches) {
    const t = touches[k];
    if (now - t.last < GLOW_MS || (t.f && now - t.f < FAIL_MS)) active = true;
    if (now - t.first < PULSE_MS || now - t.last < FLASH_MS || (t.e && now - t.e < PULSE_MS * 1.5) || (t.f && now - t.f < FAIL_MS)) {
      pulsing = true;
      break;
    }
  }
  return { active: active || pulsing, pulsing };
}

// The settled tint a touched file keeps: edit beats read beats search.
export function visitedKind(t) {
  if (t.edits > 0) return "edit";
  if (t.r > 0) return "read";
  if (t.f > 0) return "fail";
  return "search";
}

// ---- palette ----------------------------------------------------------------------
//
// The terminal paints a Raster from a table of 1024 (fg, bg) color pairs per
// session and quantizes each channel to 16 levels, so every color the map can
// show comes from this small fixed palette (already on the 16-level grid), and
// the drawing is arranged so only a bounded set of pairs can ever meet in a cell:
// a tile's bottom row is the gap color, and rings and halos fill whole cells.

export const GLOW_STEPS = 4;
let PAL = null;

// A color snapped to the 16 levels per channel the terminal paints.
export function quantize(c) {
  const f = (v) => Math.round(v / 17) * 17;
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}

export function palette() {
  if (PAL) return PAL;
  const q = quantize;
  const kinds = ["read", "search", "edit", "fail"];
  const neutral = 0x2b2f36;
  const P = {
    gap: q(COLORS.bg),
    cream: q(COLORS.cream),
    creamDim: q(COLORS.creamDim),
    ink: q(COLORS.ink),
    visited: {},
    ramp: {},
    flash: {},
    ring: {},
    halo: {},
    blink: [q(COLORS.fail), q(darken(COLORS.fail, 0.5))],
    folder: HUES.map((h) => ({ header: q(hsl(h, 0.34, 0.3)), tiles: [q(hsl(h, 0.26, 0.17)), q(hsl(h, 0.26, 0.22))] })),
    more: { header: q(hsl(220, 0.12, 0.3)), tiles: [q(hsl(220, 0.06, 0.16)), q(hsl(220, 0.06, 0.16))] },
    shade: new Map(),
  };
  for (const k of kinds) {
    const c = KIND_COLOR[k];
    P.visited[k] = q(mix(neutral, c, VISITED_MIX[k]));
    // ramp[0] is the visited tint, ramp[GLOW_STEPS] the full glow.
    P.ramp[k] = Array.from({ length: GLOW_STEPS + 1 }, (_, i) => q(mix(P.visited[k], c, i / GLOW_STEPS)));
    P.flash[k] = q(mix(c, 0xffffff, k === "fail" ? 0.2 : 0.45));
    P.ring[k] = [q(mix(c, 0xffffff, 0.35)), q(c), q(darken(c, 0.4)), q(darken(c, 0.65))];
    P.halo[k] = [q(darken(c, 0.35)), q(darken(c, 0.6))];
  }
  PAL = P;
  return P;
}

// A fill's bevel: a lighter top row and left column, from the same palette grid.
function shadeOf(fill) {
  const P = palette();
  let s = P.shade.get(fill);
  if (!s) {
    s = { top: quantize(lighten(fill, 0.14)), left: quantize(lighten(fill, 0.06)) };
    P.shade.set(fill, s);
  }
  return s;
}

// The fill a touched tile shows at `now`: one of a few palette steps per kind.
export function heatFill(base, t, now) {
  const P = palette();
  if (t.f) {
    const age = now - t.f;
    // Blink between hot red and a darker red while the failure is fresh.
    if (age >= 0 && age < FAIL_MS) return P.blink[Math.floor(age / 250) % 2];
  }
  const age = now - t.last;
  if (age >= 0 && age < FLASH_MS * 0.6) return P.flash[t.kind];
  const g = t.kind === "fail" ? glow(age, FAIL_MS * 2) : glow(age);
  const step = Math.round(g * GLOW_STEPS);
  if (step === 0) return P.visited[visitedKind(t)];
  return P.ramp[t.kind][step];
}

// ---- layout -----------------------------------------------------------------------

// Squarified treemap (Bruls et al.). Returns one float rect per weight, in input order.
export function squarify(weights, rect) {
  const n = weights.length;
  const out = new Array(n);
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (n === 0) return out;
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) {
    for (let i = 0; i < n; i++) out[i] = { x: rect.x, y: rect.y, w: 0, h: 0 };
    return out;
  }
  const scale = (rect.w * rect.h) / total;
  const order = weights.map((_, i) => i).sort((a, b) => weights[b] - weights[a] || a - b);
  let { x, y, w, h } = rect;
  let row = [];
  let rowSum = 0;

  const worst = (sum, min, max, side) => {
    if (sum <= 0 || min <= 0) return Infinity;
    const s2 = sum * sum;
    const side2 = side * side;
    return Math.max((side2 * max) / s2, s2 / (side2 * min));
  };

  const flush = () => {
    if (row.length === 0) return;
    if (w >= h) {
      const colW = h > 0 ? rowSum / h : 0;
      let yy = y;
      for (const i of row) {
        const a = Math.max(0, weights[i]) * scale;
        const hh = colW > 0 ? a / colW : 0;
        out[i] = { x, y: yy, w: colW, h: hh };
        yy += hh;
      }
      x += colW;
      w -= colW;
    } else {
      const rowH = w > 0 ? rowSum / w : 0;
      let xx = x;
      for (const i of row) {
        const a = Math.max(0, weights[i]) * scale;
        const ww = rowH > 0 ? a / rowH : 0;
        out[i] = { x: xx, y, w: ww, h: rowH };
        xx += ww;
      }
      y += rowH;
      h -= rowH;
    }
    row = [];
    rowSum = 0;
  };

  let min = Infinity;
  let max = 0;
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const a = Math.max(0, weights[i]) * scale;
    const side = Math.min(w, h);
    if (row.length === 0) {
      row.push(i);
      rowSum = a;
      min = a;
      max = a;
      continue;
    }
    const before = worst(rowSum, min, max, side);
    const after = worst(rowSum + a, Math.min(min, a), Math.max(max, a), side);
    if (after <= before) {
      row.push(i);
      rowSum += a;
      min = Math.min(min, a);
      max = Math.max(max, a);
    } else {
      flush();
      row.push(i);
      rowSum = a;
      min = a;
      max = a;
    }
  }
  flush();
  return out;
}

export function weightOf(f, mode) {
  return Math.max(1, mode === "bytes" ? f.b : f.l);
}

// Folder groups: top-level folders, with a dominant one (say `src`) split into
// its subfolders so `src/api` and `src/auth` read as their own regions.
export function groupFiles(files, mode) {
  const total = files.reduce((s, f) => s + weightOf(f, mode), 0);
  const top = new Map();
  for (const f of files) {
    const i = f.p.indexOf("/");
    const k = i < 0 ? "" : f.p.slice(0, i);
    if (!top.has(k)) top.set(k, []);
    top.get(k).push(f);
  }
  const groups = [];
  for (const [name, list] of top) {
    const tw = list.reduce((s, f) => s + weightOf(f, mode), 0);
    const subs = new Map();
    for (const f of list) {
      const parts = f.p.split("/");
      const k = name === "" ? "" : parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
      if (!subs.has(k)) subs.set(k, []);
      subs.get(k).push(f);
    }
    if (name !== "" && tw > total * 0.3 && subs.size >= 2 && list.length >= 8) {
      for (const [k, sl] of subs) groups.push({ name: k, label: k, files: sl });
    } else groups.push({ name, label: name === "" ? "(root)" : name, files: list });
  }
  for (const g of groups) g.weight = g.files.reduce((s, f) => s + weightOf(f, mode), 0);
  groups.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));
  return groups;
}

function hashOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// The static picture: folder regions with header strips, file tiles, label
// slots. W columns, H pixel rows (2 per terminal row).
export function buildLayout(files, mode, W, H, more = { count: 0, weight: 0 }) {
  const groups = groupFiles(files, mode);
  if (more && more.count > 0) {
    groups.push({
      name: "+more",
      label: `+${more.count} more`,
      files: [{ p: `+${more.count} more`, l: more.weight, b: more.weight, isMore: true }],
      weight: more.weight,
    });
  }
  const P = palette();
  const base = new Uint32Array(W * H).fill(P.gap);
  const L = { W, H, base, folders: [], files: [], index: new Map(), labels: [] };
  const rects = squarify(
    groups.map((g) => g.weight),
    { x: 0, y: 0, w: W, h: H },
  );

  groups.forEach((g, gi) => {
    const r = rects[gi];
    // Snap folder edges: x to whole columns, y to whole cells (even pixels)
    // so the header strip is one clean terminal row.
    const x0 = Math.round(r.x);
    const x1 = Math.round(r.x + r.w);
    const y0 = 2 * Math.round(r.y / 2);
    const y1 = 2 * Math.round((r.y + r.h) / 2);
    const tone = g.name === "+more" ? P.more : P.folder[gi % P.folder.length];
    const header = tone.header;
    const folder = { label: g.label, x0, y0, x1, y1, header, count: g.files.length, hasHeader: false };
    L.folders.push(folder);
    if (x1 - x0 < 1 || y1 - y0 < 1) {
      for (const f of g.files) L.index.set(f.p, -1);
      return;
    }
    // A one-column gutter on the right of every folder but the last in its row.
    const gx1 = x1 < W && x1 - x0 >= 4 ? x1 - 1 : x1;
    const hasHeader = y1 - y0 >= 6 && gx1 - x0 >= 3;
    folder.hasHeader = hasHeader;
    const fy0 = hasHeader ? y0 + 2 : y0;
    if (hasHeader) {
      for (let y = y0; y < y0 + 2; y++) for (let x = x0; x < gx1; x++) base[y * W + x] = header;
      L.labels.push({ kind: "folder", folder: L.folders.length - 1, cx: x0, cy: y0 / 2, width: gx1 - x0 });
    }
    const inner = squarify(
      g.files.map((f) => weightOf(f, mode)),
      { x: x0, y: fy0, w: gx1 - x0, h: y1 - fy0 },
    );
    g.files.forEach((f, fi) => {
      const fr = inner[fi];
      const tile = {
        path: f.p,
        g: L.folders.length - 1,
        x0: Math.round(fr.x),
        x1: Math.round(fr.x + fr.w),
        // Whole cells vertically: every cell belongs to one tile, so a cell's
        // (fg, bg) pair never mixes two tiles' colors.
        y0: 2 * Math.round(fr.y / 2),
        y1: 2 * Math.round((fr.y + fr.h) / 2),
        color: 0,
        isMore: Boolean(f.isMore),
      };
      tile.color = tone.tiles[hashOf(f.p) % 2];
      const idx = L.files.length;
      L.files.push(tile);
      L.index.set(f.p, idx);
      if (tile.x1 - tile.x0 < 1 || tile.y1 - tile.y0 < 1) return;
      paintTile(base, W, tile, tile.color);
      // A name label where the tile has a whole cell row and room for a word.
      const w = tile.x1 - tile.x0;
      const cy = Math.ceil(tile.y0 / 2);
      if (w >= 5 && 2 * cy + 1 <= tile.y1 - 2) {
        L.labels.push({ kind: "file", file: idx, cx: tile.x0 + (w >= 8 ? 1 : 0), cy, width: w - (w >= 8 ? 2 : 1) });
      }
    });
  });
  return L;
}

export function paintTile(pix, W, t, fill) {
  const w = t.x1 - t.x0;
  const h = t.y1 - t.y0;
  if (w < 1 || h < 1) return;
  const sh = shadeOf(fill);
  const top = h >= 3 ? sh.top : fill;
  const left = w >= 3 && h >= 2 ? sh.left : fill;
  // The bottom row is the gap color, so two tiles never share a cell's pair.
  const bottom = h >= 2 ? palette().gap : fill;
  for (let y = t.y0; y < t.y1; y++) {
    const row = y * W;
    const c = y === t.y1 - 1 ? bottom : y === t.y0 ? top : null;
    for (let x = t.x0; x < t.x1; x++) {
      pix[row + x] = c ?? (x === t.x0 ? left : fill);
    }
  }
}

// A rectangle outline of whole cells (both half pixels one color), `dx` columns
// and `dy` rows out from the tile: a ring adds only (c, c) pairs.
function cellOutline(out, W, rows, t, dx, dy, c) {
  const xa = t.x0 - dx;
  const xb = t.x1 - 1 + dx;
  const ya = (t.y0 >> 1) - dy;
  const yb = ((t.y1 - 1) >> 1) + dy;
  const put = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= rows) return;
    const o = (y * W + x) * 3;
    out[o] = 0x2580;
    out[o + 1] = c;
    out[o + 2] = c;
  };
  for (let x = xa; x <= xb; x++) {
    put(x, ya);
    put(x, yb);
  }
  for (let y = ya + 1; y < yb; y++) {
    put(xa, y);
    put(xb, y);
  }
}

// ---- frames ---------------------------------------------------------------------

// The frame at `now`: `[codePoint, fg, bg]` per cell, row-major (RasterProps).
export function renderFrame(L, touches, now) {
  const P = palette();
  const { W, H } = L;
  const rows = H >> 1;
  const pix = L.base.slice();
  const counts = new Int32Array(L.folders.length);
  const pulses = [];
  const halos = [];
  const lit = new Map();
  for (const path in touches) {
    const i = L.index.get(path);
    if (i === undefined || i < 0) continue;
    const t = touches[path];
    const tile = L.files[i];
    counts[tile.g] += 1;
    const fill = heatFill(tile.color, t, now);
    lit.set(i, fill);
    paintTile(pix, W, tile, fill);
    // A ring on the first touch, and on every edit or failure (the climax).
    const age = now - t.first;
    if (age >= 0 && age < PULSE_MS) pulses.push([tile, age / PULSE_MS, t.kind, 3]);
    for (const [at, kind] of [
      [t.e, "edit"],
      [t.f, "fail"],
    ]) {
      const a = now - at;
      if (at && a >= 0 && a < PULSE_MS * 1.5 && at !== t.first) pulses.push([tile, a / (PULSE_MS * 1.5), kind, 5]);
    }
    // A hot edit keeps a halo, so even a tiny file reads from across the room.
    const hot = t.e && t.kind !== "read" && t.kind !== "search" ? glow(now - t.e) : 0;
    if (hot > 0.3) halos.push([tile, hot > 0.65 ? 0 : 1, t.kind === "fail" ? "fail" : "edit"]);
  }

  const out = new Uint32Array(W * rows * 3);
  for (let cy = 0; cy < rows; cy++) {
    const top = 2 * cy * W;
    const bot = top + W;
    let o = cy * W * 3;
    for (let x = 0; x < W; x++) {
      out[o] = 0x2580;
      out[o + 1] = pix[top + x];
      out[o + 2] = pix[bot + x];
      o += 3;
    }
  }

  for (const lab of L.labels) {
    let text;
    let fg;
    let bg;
    if (lab.kind === "folder") {
      const f = L.folders[lab.folder];
      const n = counts[lab.folder];
      const tail = n > 0 ? ` ${n}/${f.count}` : "";
      const name = clip(f.label, Math.max(1, lab.width - 1 - tail.length));
      text = ` ${name}${tail.length + name.length + 1 <= lab.width ? tail : ""}`;
      fg = n > 0 ? P.cream : P.creamDim;
      bg = f.header;
    } else {
      const tile = L.files[lab.file];
      const fill = lit.get(lab.file);
      bg = pix[(2 * lab.cy + 1) * W + lab.cx];
      text = clip(baseName(tile.path), lab.width);
      fg = fill !== undefined ? (luma(bg) > 0.5 ? P.ink : P.cream) : P.creamDim;
    }
    writeText(out, W, lab.cx, lab.cy, text, fg, bg);
  }

  // Halos and rings last, as whole cells over the map (and any label under them).
  for (const [tile, step, kind] of halos) cellOutline(out, W, rows, tile, 1, 1, P.halo[kind][step]);
  for (const [tile, p, kind, reach] of pulses) {
    const d = 1 + Math.round(p * reach);
    const step = Math.min(P.ring[kind].length - 1, Math.floor(p * P.ring[kind].length));
    cellOutline(out, W, rows, tile, d, Math.max(1, Math.round(d / 2)), P.ring[kind][step]);
  }
  return out;
}

function writeText(out, W, cx, cy, text, fg, bg) {
  for (let k = 0; k < text.length && cx + k < W; k++) {
    let code = text.charCodeAt(k);
    if (code < 0x20 || (code > 0x7e && code !== 0x2026)) code = 0x3f;
    const o = (cy * W + cx + k) * 3;
    out[o] = code;
    out[o + 1] = fg;
    out[o + 2] = bg;
  }
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function toBase64(bytes) {
  if (typeof bytes.toBase64 === "function") return bytes.toBase64();
  let s = "";
  const n = bytes.length;
  let i = 0;
  for (; i + 2 < n; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    s += B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63];
  }
  if (i < n) {
    const a = bytes[i];
    const b = i + 1 < n ? bytes[i + 1] : 0;
    const v = (a << 16) | (b << 8);
    s += B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + (i + 1 < n ? B64[(v >> 6) & 63] : "=") + "=";
  }
  return s;
}

// Little-endian u32 triplets, base64 (RasterProps.cells).
export function encodeCells(words) {
  const bytes = new Uint8Array(words.length * 4);
  for (let i = 0, o = 0; i < words.length; i++, o += 4) {
    const v = words[i];
    bytes[o] = v & 255;
    bytes[o + 1] = (v >>> 8) & 255;
    bytes[o + 2] = (v >>> 16) & 255;
    bytes[o + 3] = (v >>> 24) & 255;
  }
  return toBase64(bytes);
}

// ---- stats ----------------------------------------------------------------------

export function statsOf(files, touches, meta) {
  const total = meta && meta.total ? meta.total : files.length;
  let touched = 0;
  let edited = 0;
  let hottest = null;
  for (const p in touches) {
    const t = touches[p];
    touched += 1;
    if (t.edits > 0) edited += 1;
    if (!hottest || t.n > hottest.t.n || (t.n === hottest.t.n && t.last > hottest.t.last)) hottest = { p, t };
  }
  const parts = [`touched ${touched} of ${total} files`, `${edited} edited`];
  if (hottest) parts.push(`hottest: ${hottest.p}`);
  return { touched, edited, total, hottest: hottest ? hottest.p : "", line: parts.join(" · ") };
}

export function folderSummary(files, touches, mode) {
  return groupFiles(files, mode).map((g) => {
    let touched = 0;
    let edited = 0;
    for (const f of g.files) {
      const t = touches[f.p];
      if (t) {
        touched += 1;
        if (t.edits > 0) edited += 1;
      }
    }
    return { label: g.label, count: g.files.length, touched, edited };
  });
}

// ---- color + text helpers ---------------------------------------------------------

export function mix(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t)
  );
}

function lighten(c, t) {
  return mix(c, 0xffffff, t);
}

function darken(c, t) {
  return mix(c, 0x000000, t);
}

function luma(c) {
  return (0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255)) / 255;
}

export function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

function baseName(p) {
  const i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}

function clip(s, n) {
  const t = String(s);
  if (n <= 0) return "";
  return t.length <= n ? t : `${t.slice(0, Math.max(0, n - 1))}…`;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
