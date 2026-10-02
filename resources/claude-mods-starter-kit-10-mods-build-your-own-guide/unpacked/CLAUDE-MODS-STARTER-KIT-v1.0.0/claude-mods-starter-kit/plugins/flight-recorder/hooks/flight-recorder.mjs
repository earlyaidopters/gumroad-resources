// Flight Recorder: see inside a turn. A live Gantt timeline in a pane, one lane
// for the main agent and one per subagent. Every model request (turn.step) and
// every tool call (tool.call) is a bar from its start to its end, colored by
// model family or tool kind, with requests, tools, tokens and estimated cost
// per lane on the right.
//
// Data lives in $.state ("rec"), written by the event hooks with update() so
// parallel subagents never lose a write. The pane draws one Raster (a cell
// grid); while a turn runs, a 10 fps timer repaints it in place with $.ui.blit
// so the "now" edge and running bars advance without a render pass. The timer
// stops when nothing is running or the pane is closed.

import { update } from "claude-code";

const PANE = "flight-recorder";
const TITLE = "Flight Recorder";
const RASTER_KEY = "timeline";
const FRAME_MS = 100;
const KEEP_TURNS = 10;
const MAX_SEGS = 1500;
const PACK_TOLERANCE_MS = 400;
const DEFAULT_VIEW = { turns: 1 };
const EMPTY_REC = { count: 0, turns: [] };

const rec = { plugin: "flight-recorder", key: "rec" };
const view = { plugin: "flight-recorder", key: "view" };

// List prices in USD per million tokens (model-router's table). First match wins.
const PRICES = [
  { match: /opus-5-5/, input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  { match: /opus/, input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  { match: /sonnet-5/, input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  { match: /sonnet/, input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  { match: /haiku/, input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  { match: /fable-5-1|mythos-5-1/, input: 10, output: 50, cacheWrite: 12.5, cacheRead: 0.25 },
  { match: /fable|mythos/, input: 10, output: 50, cacheWrite: 12.5, cacheRead: 1 },
];

// ---------------------------------------------------------------- palette

const C = {
  frame: 0x0b0d11,
  head: 0x10131a,
  laneA: 0x151922,
  laneB: 0x1a1f2a,
  grid: 0x2a3140,
  text: 0xd6dbe4,
  dim: 0x7a8496,
  faint: 0x4a5263,
  ink: 0x0b0d11,
  white: 0xffffff,
  coral: 0xe8603c,
  rec: 0xff4d4d,
  now: 0xffd166,
  done: 0x3ddc84,
};

const FAMILY = {
  fable: 0xf5c542,
  opus: 0xa070ff,
  sonnet: 0x4c8dff,
  haiku: 0x3ddc84,
  other: 0x9aa3b2,
};

const TOOL = {
  read: 0x22d3ee,
  edit: 0xe8603c,
  bash: 0xffb020,
  agent: 0xf2f4f8,
  mcp: 0xff5fa2,
  other: 0x8b9bb4,
  failed: 0xff3030,
};

const LEFT_EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

// ---------------------------------------------------------------- register

export function register(on) {
  let ticker = null;
  let ticking = false;
  let paneOpen = false;
  let mounted = null; // { columns, rows } of the Raster on screen
  let misses = 0;
  let deps = null; // closures over a live `$`, for the frame timer
  let nextIsNotice = false; // the coming turn.start answers a background task, not a person

  const stopTicker = () => {
    if (ticker && typeof ticker.cancel === "function") ticker.cancel();
    ticker = null;
  };

  const tick = async () => {
    if (ticking || !deps) return;
    ticking = true;
    try {
      const { value: r = EMPTY_REC } = await deps.readRec();
      const { value: v = DEFAULT_VIEW } = await deps.readView();
      const now = await deps.now();
      if (paneOpen && mounted) {
        const frame = buildFrame(r, v, { columns: mounted.columns, now });
        if (frame.rows === mounted.rows) {
          const res = await deps.blit({
            requestId: PANE,
            key: RASTER_KEY,
            cells: encodeCells(frame.words),
            columns: frame.columns,
            rows: frame.rows,
          });
          misses = res && res.deny ? misses + 1 : 0;
        }
      }
      if (!paneOpen || misses > 30 || !isLive(r, v, now)) stopTicker();
    } catch {
      stopTicker();
    } finally {
      ticking = false;
    }
  };

  const kick = () => {
    if (!ticker && paneOpen && deps) ticker = deps.every(FRAME_MS, tick);
  };

  on("session.start", async ($, e, next) => {
    const result = await next(e);
    deps = {
      now: () => $.clock.now(),
      readRec: () => $.state.get(rec),
      readView: () => $.state.get(view),
      blit: (args) => $.ui.blit(args),
      every: (ms, fn) => $.clock.every(ms, fn),
    };
    const stored = await $.store.get("turns");
    const turns = clampTurns(stored);
    await $.state.set(view, { turns });
    await $.command.register({
      name: "timeline",
      description: "Flight Recorder: live timeline of requests, tools and subagents",
      argumentHint: "[clear|turns <n>|close]",
      immediate: true,
    });
    return result;
  });

  on("command.run", { command: "timeline" }, async ($, e) => {
    if (!deps) {
      deps = {
        now: () => $.clock.now(),
        readRec: () => $.state.get(rec),
        readView: () => $.state.get(view),
        blit: (args) => $.ui.blit(args),
        every: (ms, fn) => $.clock.every(ms, fn),
      };
    }
    const words = (e.args ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const verb = words[0] ?? "";

    if (verb === "clear") {
      await update($, rec, (r = EMPTY_REC) => ({ count: r.count ?? 0, turns: [] }));
      return { text: "Flight Recorder cleared. The next turn starts a fresh timeline." };
    }

    if (verb === "turns") {
      const n = Number(words[1]);
      if (!Number.isInteger(n) || n < 1 || n > KEEP_TURNS) {
        return { text: `Usage /timeline turns <1-${KEEP_TURNS}>` };
      }
      await $.state.set(view, { turns: n });
      await $.store.set("turns", n);
      return { text: `Flight Recorder shows the last ${n} turn${n === 1 ? "" : "s"}.` };
    }

    const panes = await $.ui.panes();
    const isOpen = panes.some((p) => p.id === PANE);

    if (verb === "close" || verb === "off" || (verb === "" && isOpen)) {
      await $.ui.close({ id: PANE });
      paneOpen = false;
      stopTicker();
      return { text: "Flight Recorder closed." };
    }

    if (verb !== "" && verb !== "open") {
      return { text: "Usage /timeline [clear|turns <n>|close]" };
    }

    const { value: r = EMPTY_REC } = await $.state.get(rec);
    const { value: v = DEFAULT_VIEW } = await $.state.get(view);
    const width = e.presentation?.columns ?? 120;
    const wanted = Math.max(70, Math.min(140, Math.round(width * 0.58)));
    const probe = buildFrame(r, v, { columns: wanted, now: await $.clock.now() });
    const opened = await $.ui.open({
      id: PANE,
      title: TITLE,
      rows: Math.max(12, probe.rows),
      columns: wanted,
    });
    paneOpen = true;
    kick();
    if (opened && opened.isPlaced === false) {
      return { text: `Flight Recorder is open but waits for room (${opened.reason}).` };
    }
    return { text: "Flight Recorder open. Send a prompt and watch the turn unfold." };
  });

  on("ui.close", async ($, e, next) => {
    if (e.id === PANE) {
      paneOpen = false;
      mounted = null;
      stopTicker();
    }
    return next(e);
  });

  on("prompt.submit", async ($, e, next) => {
    const kind = e.origin && e.origin.kind;
    if (e.turnId === undefined) nextIsNotice = kind === "task-notification";
    return next(e);
  });

  on("turn.start", async ($, e, next) => {
    const at = await $.clock.now();
    const isNotice = nextIsNotice || isNoticeText(e.text);
    nextIsNotice = false;
    await update($, rec, (r = EMPTY_REC) =>
      isNotice && r.turns && r.turns.length > 0
        ? applyTurnResume(r, { id: e.turnId, at })
        : applyTurnStart(r, { id: e.turnId, prompt: e.text ?? "", at }),
    );
    kick();
    return next(e);
  });

  on("turn.step", async function* ($, e, next) {
    const at = await $.clock.now();
    const segId = `s:${e.turnId}:${e.agentId ?? "main"}:${e.index}:${at}`;
    await update($, rec, (r = EMPTY_REC) =>
      applyStepStart(r, { turnId: e.turnId, agentId: e.agentId, model: e.model, segId, at }),
    );
    kick();
    let result = null;
    try {
      result = yield* next(e);
      return result;
    } finally {
      try {
        const end = await $.clock.now();
        const usage = result && result.usage ? result.usage : null;
        await update($, rec, (r = EMPTY_REC) =>
          applyStepEnd(r, { agentId: e.agentId, segId, at: end, usage, model: e.model }),
        );
      } catch {
        // the dispatch was abandoned; the turn's end closes what is left open
      }
    }
  });

  on("tool.call", async ($, e, next) => {
    const at = await $.clock.now();
    const segId = e.tool_use_id ? `t:${e.tool_use_id}` : `t:${e.tool}:${at}`;
    await update($, rec, (r = EMPTY_REC) =>
      applyToolStart(r, { agentId: e.agentId, name: String(e.tool), segId, at }),
    );
    kick();
    let failed = true;
    try {
      const result = await next(e);
      failed = Boolean(result && (result.deny || result.isError));
      return result;
    } finally {
      try {
        const end = await $.clock.now();
        await update($, rec, (r = EMPTY_REC) => applyToolEnd(r, { agentId: e.agentId, segId, at: end, failed }));
      } catch {
        // abandoned; closed at the turn's end
      }
    }
  });

  on("agent.spawn", async ($, e, next) => {
    const result = await next(e);
    if (result && result.agentId) {
      const at = await $.clock.now();
      await update($, rec, (r = EMPTY_REC) =>
        applySpawn(r, {
          id: result.agentId,
          type: e.subagentType || "agent",
          model: result.model || "",
          parent: e.parentAgentId || "",
          toolUseId: e.tool_use_id || "",
          at,
        }),
      );
      kick();
    }
    return result;
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    const at = await $.clock.now();
    await update($, rec, (r = EMPTY_REC) => applyComplete(r, { agentId: e.agentId, turnId: e.turnId, at }));
    return result;
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { value: r = EMPTY_REC } = await $.state.get(rec);
    const { value: v = DEFAULT_VIEW } = await $.state.get(view);
    const now = await $.clock.now();
    paneOpen = true;
    if (e.surface !== "terminal") {
      const { Box, Text } = $.ui.resolve(e);
      return fallbackTree(Box, Text, r, v, now);
    }
    const { Raster } = $.ui.resolve(e);
    const columns = Math.max(24, Math.min(512, e.props.bodyColumns || 100));
    const frame = buildFrame(r, v, { columns, now });
    mounted = { columns: frame.columns, rows: frame.rows };
    return Raster({ key: RASTER_KEY, columns: frame.columns, rows: frame.rows, cells: encodeCells(frame.words) });
  });
}

// ---------------------------------------------------------------- bookkeeping (pure)

function clampTurns(n) {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= KEEP_TURNS ? v : DEFAULT_VIEW.turns;
}

function clone(r) {
  return structuredClone({ count: r.count ?? 0, turns: Array.isArray(r.turns) ? r.turns : [] });
}

function newLane(id, at, fields = {}) {
  return {
    id,
    label: id === "main" ? "main" : `agent ${shortId(id)}`,
    type: id === "main" ? "main" : "agent",
    model: "",
    parent: "",
    toolUseId: "",
    t0: at,
    done: null,
    segs: [],
    ...fields,
  };
}

function newTurn(r, id, prompt, at) {
  r.count = (r.count ?? 0) + 1;
  const turn = { n: r.count, id, prompt: oneLine(prompt).slice(0, 160), t0: at, t1: null, lanes: [newLane("main", at)] };
  r.turns.push(turn);
  if (r.turns.length > KEEP_TURNS) r.turns.splice(0, r.turns.length - KEEP_TURNS);
  return turn;
}

function latestTurn(r, at) {
  return r.turns[r.turns.length - 1] ?? newTurn(r, `t${at}`, "", at);
}

// The lane a main-loop or subagent event belongs to, made when missing.
function laneFor(r, agentId, at, turnId) {
  if (agentId === undefined || agentId === null || agentId === "") {
    let turn = turnId ? r.turns.find((t) => t.id === turnId) : undefined;
    if (!turn) turn = latestTurn(r, at);
    let lane = turn.lanes.find((l) => l.id === "main");
    if (!lane) {
      lane = newLane("main", at);
      turn.lanes.unshift(lane);
    }
    return { turn, lane };
  }
  for (let i = r.turns.length - 1; i >= 0; i--) {
    const lane = r.turns[i].lanes.find((l) => l.id === agentId);
    if (lane) return { turn: r.turns[i], lane };
  }
  const turn = latestTurn(r, at);
  const lane = newLane(agentId, at);
  turn.lanes.push(lane);
  return { turn, lane };
}

function findSeg(r, agentId, segId) {
  for (let i = r.turns.length - 1; i >= 0; i--) {
    for (const lane of r.turns[i].lanes) {
      if (agentId && lane.id !== agentId) continue;
      if (!agentId && lane.id !== "main") continue;
      const seg = lane.segs.find((s) => s.id === segId);
      if (seg) return { turn: r.turns[i], lane, seg };
    }
  }
  return null;
}

function countSegs(turn) {
  let n = 0;
  for (const l of turn.lanes) n += l.segs.length;
  return n;
}

export function applyTurnStart(r0, { id, prompt, at }) {
  const r = clone(r0);
  // Close anything a previous turn left open (an interrupt mid-call).
  for (const t of r.turns) {
    if (t.t1 === null) t.t1 = at;
    for (const l of t.lanes) for (const s of l.segs) if (s.t1 === null && l.id === "main") s.t1 = at;
  }
  newTurn(r, id, prompt, at);
  return r;
}

// A turn the engine starts to hand the model a background task's result (a
// subagent finished) belongs to the person's turn it came from: reopen it.
export function applyTurnResume(r0, { id, at }) {
  const r = clone(r0);
  const turn = r.turns[r.turns.length - 1];
  if (!turn) return applyTurnStart(r0, { id, prompt: "", at });
  turn.id = id;
  turn.t1 = null;
  const main = turn.lanes.find((l) => l.id === "main");
  if (main) main.done = null;
  return r;
}

export function isNoticeText(text) {
  return /^\s*<(task-notification|agent-message|background-task|system-reminder)\b/.test(String(text ?? ""));
}

export function applyStepStart(r0, { turnId, agentId, model, segId, at }) {
  const r = clone(r0);
  const { turn, lane } = laneFor(r, agentId, at, agentId ? undefined : turnId);
  lane.model = model || lane.model;
  if (countSegs(turn) < MAX_SEGS) {
    lane.segs.push({ id: segId, kind: "req", name: model || "", t0: at, t1: null, out: 0, tok: 0, cost: 0, err: false });
  }
  return r;
}

export function applyStepEnd(r0, { agentId, segId, at, usage, model }) {
  const r = clone(r0);
  const hit = findSeg(r, agentId, segId);
  if (!hit) return r;
  const { seg, lane } = hit;
  seg.t1 = at;
  if (usage) {
    seg.name = usage.model || model || seg.name;
    seg.out = usage.output_tokens ?? 0;
    seg.tok =
      (usage.input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.output_tokens ?? 0);
    seg.cost = costOf(usage.model || model, usage);
    lane.model = usage.model || lane.model;
  } else {
    seg.err = true;
  }
  return r;
}

export function applyToolStart(r0, { agentId, name, segId, at }) {
  const r = clone(r0);
  const { turn, lane } = laneFor(r, agentId, at);
  if (countSegs(turn) < MAX_SEGS && !lane.segs.some((s) => s.id === segId)) {
    lane.segs.push({ id: segId, kind: "tool", name, t0: at, t1: null, out: 0, tok: 0, cost: 0, err: false });
  }
  return r;
}

export function applyToolEnd(r0, { agentId, segId, at, failed }) {
  const r = clone(r0);
  const hit = findSeg(r, agentId, segId);
  if (!hit) return r;
  hit.seg.t1 = at;
  hit.seg.err = Boolean(failed);
  return r;
}

export function applySpawn(r0, { id, type, model, parent, toolUseId, at }) {
  const r = clone(r0);
  const label = `${type} ${shortId(id)}`;
  for (const t of r.turns) {
    const lane = t.lanes.find((l) => l.id === id);
    if (lane) {
      Object.assign(lane, { label, type, parent, toolUseId, model: lane.model || model });
      return r;
    }
  }
  const turn = latestTurn(r, at);
  const lane = newLane(id, at, { label, type, model, parent, toolUseId });
  // Nested subagents sit right under their parent.
  const pi = parent ? turn.lanes.findIndex((l) => l.id === parent) : -1;
  if (pi >= 0) {
    let at2 = pi + 1;
    while (at2 < turn.lanes.length && turn.lanes[at2].parent === parent) at2++;
    turn.lanes.splice(at2, 0, lane);
  } else {
    turn.lanes.push(lane);
  }
  return r;
}

export function applyComplete(r0, { agentId, turnId, at }) {
  const r = clone(r0);
  if (agentId) {
    for (const t of r.turns) {
      const lane = t.lanes.find((l) => l.id === agentId);
      if (lane) {
        lane.done = at;
        for (const s of lane.segs) if (s.t1 === null) s.t1 = at;
      }
    }
    return r;
  }
  const turn = r.turns.find((t) => t.id === turnId) ?? r.turns[r.turns.length - 1];
  if (!turn) return r;
  turn.t1 = at;
  const main = turn.lanes.find((l) => l.id === "main");
  if (main) {
    main.done = at;
    for (const s of main.segs) if (s.t1 === null) s.t1 = at;
  }
  return r;
}

export function isLive(r, v, now) {
  const shown = (r.turns ?? []).slice(-clampTurns(v?.turns));
  for (const t of shown) {
    if (t.t1 === null && now - t.t0 < 3_600_000) return true;
    if (t.lanes.some((l) => l.id !== "main" && l.done === null && now - lastActivity(l) < 60_000)) return true;
    for (const l of t.lanes) for (const s of l.segs) if (s.t1 === null && now - s.t0 < 3_600_000) return true;
  }
  return false;
}

function lastActivity(lane) {
  let t = lane.t0;
  for (const s of lane.segs) t = Math.max(t, s.t1 ?? s.t0);
  return t;
}

// ---------------------------------------------------------------- money and names

function priceOf(model) {
  return PRICES.find((p) => p.match.test(String(model ?? "")));
}

export function costOf(model, u) {
  const p = priceOf(model);
  if (!p || !u) return 0;
  return (
    ((u.input_tokens ?? 0) * p.input +
      (u.output_tokens ?? 0) * p.output +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead) /
    1_000_000
  );
}

export function familyOf(model) {
  const m = String(model ?? "").toLowerCase();
  if (/fable|mythos/.test(m)) return "fable";
  if (/opus/.test(m)) return "opus";
  if (/sonnet/.test(m)) return "sonnet";
  if (/haiku/.test(m)) return "haiku";
  return "other";
}

export function toolKind(name) {
  const n = String(name ?? "");
  if (n.startsWith("mcp__")) return "mcp";
  if (/^(Read|Grep|Glob|LS|NotebookRead)$/.test(n)) return "read";
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(n)) return "edit";
  if (/^(Bash|BashOutput|KillShell|KillBash|PowerShell|Monitor)$/.test(n)) return "bash";
  if (/^(Agent|Task)$/.test(n)) return "agent";
  return "other";
}

function toolGlyph(name) {
  const n = String(name ?? "");
  const kind = toolKind(n);
  if (kind === "mcp") return "M";
  if (n === "Bash") return "$";
  if (n === "Glob") return "*";
  return (n[0] ?? "?").toUpperCase();
}

function toolLabel(name) {
  const n = String(name ?? "");
  if (n.startsWith("mcp__")) return n.split("__").slice(-1)[0] || "mcp";
  return n;
}

function shortId(id) {
  const s = String(id ?? "").replace(/^(agent|subagent|task)[-_]?/i, "");
  return s.slice(0, 4) || "????";
}

function oneLine(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

export function fmtTok(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

export function fmtUsd(n) {
  if (n <= 0) return "$0";
  if (n < 1) return `$${n.toFixed(3)}`;
  return n < 100 ? `$${n.toFixed(2)}` : `$${n.toFixed(0)}`;
}

export function fmtSecs(ms) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

function fmtTick(sec) {
  if (sec < 120 || sec % 60 !== 0) {
    if (sec >= 120) return `${Math.floor(sec / 60)}m${String(sec % 60).padStart(2, "0")}`;
    return `${sec}s`;
  }
  return `${sec / 60}m`;
}

// ---------------------------------------------------------------- time scale (pure)

const NICE_SPANS = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 450, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200];
const NICE_STEPS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1800, 3600];

// The visible span in ms: a live turn uses the next nice span above its
// elapsed time (so the "now" edge walks right, then the scale steps), a
// finished one fits its elapsed time exactly.
export function spanFor(elapsedMs, isLiveTurn) {
  const e = Math.max(1, elapsedMs);
  if (!isLiveTurn) return Math.max(1000, e);
  const want = (e * 1.06) / 1000;
  for (const s of NICE_SPANS) if (s >= want) return s * 1000;
  return Math.ceil(want / 3600) * 3600 * 1000;
}

// Tick step in seconds so labels are at least `minCols` apart.
export function tickStep(spanMs, cols, minCols = 9) {
  const span = spanMs / 1000;
  for (const s of NICE_STEPS) if ((s / span) * cols >= minCols) return s;
  return NICE_STEPS[NICE_STEPS.length - 1];
}

// Greedy interval packing: each segment gets the first sub-row free at its
// start (with a small tolerance, since a tool may start while its request is
// still closing). Open segments run to infinity. Returns rows per seg index.
export function packLane(segs0) {
  // A request's row is free from the moment its first tool starts: tools run
  // while the response is still streaming, and should not push a new row.
  const segs = segs0.map((s) => {
    if (s.kind !== "req") return s;
    let end = s.t1 === null ? Infinity : s.t1;
    for (const o of segs0) if (o.kind === "tool" && o.t0 >= s.t0 && o.t0 < end) end = o.t0;
    return { ...s, t1: end === Infinity ? null : end };
  });
  const order = segs.map((s, i) => i).sort((a, b) => segs[a].t0 - segs[b].t0 || a - b);
  const ends = [];
  const rows = new Array(segs.length).fill(0);
  for (const i of order) {
    const s = segs[i];
    let row = ends.findIndex((end) => end <= s.t0 + PACK_TOLERANCE_MS);
    if (row < 0) {
      row = ends.length;
      ends.push(0);
    }
    ends[row] = s.t1 === null ? Infinity : Math.max(s.t1, s.t0);
    rows[i] = row;
  }
  return { rows, depth: Math.max(1, ends.length) };
}

// ---------------------------------------------------------------- canvas

class Canvas {
  constructor(columns) {
    this.columns = columns;
    this.lines = [];
  }
  row(bg) {
    const line = new Uint32Array(this.columns * 3);
    for (let x = 0; x < this.columns; x++) {
      line[x * 3] = 0x20;
      line[x * 3 + 1] = C.text;
      line[x * 3 + 2] = bg;
    }
    this.lines.push(line);
    return this.lines.length - 1;
  }
  put(x, y, ch, fg, bg) {
    if (x < 0 || x >= this.columns || y < 0 || y >= this.lines.length) return;
    const line = this.lines[y];
    line[x * 3] = typeof ch === "number" ? ch : ch.codePointAt(0) ?? 0x20;
    if (fg !== undefined) line[x * 3 + 1] = fg;
    if (bg !== undefined) line[x * 3 + 2] = bg;
  }
  bgAt(x, y) {
    return this.lines[y][x * 3 + 2];
  }
  chAt(x, y) {
    return this.lines[y][x * 3];
  }
  text(x, y, str, fg, bg, max = Infinity) {
    let i = 0;
    for (const ch of String(str)) {
      if (i >= max) break;
      this.put(x + i, y, ch, fg, bg);
      i++;
    }
    return x + i;
  }
  words() {
    const out = new Uint32Array(this.lines.length * this.columns * 3);
    this.lines.forEach((line, i) => out.set(line, i * this.columns * 3));
    return out;
  }
}

function mix(a, b, t) {
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return (r << 16) | (g << 8) | bl;
}

function luma(c) {
  return 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
}

// A bar from p0 to p1 in eighths of a cell on row y, starting at column x0,
// with 1/8-cell edges: a right edge is a left-aligned partial block in the bar
// color, a left edge the same glyph inverted (background color over the bar).
function bar(cv, y, x0, p0, p1, color) {
  const a = Math.max(0, Math.round(p0));
  const z = Math.max(a, Math.round(p1));
  if (z <= a) return { first: -1, last: -1 };
  const c0 = Math.floor(a / 8);
  const c1 = Math.floor((z - 1) / 8);
  let first = -1;
  let last = -1;
  for (let c = c0; c <= c1; c++) {
    const lo = Math.max(a, c * 8) - c * 8;
    const hi = Math.min(z, c * 8 + 8) - c * 8;
    const x = x0 + c;
    const under = cv.bgAt(x, y);
    if (lo === 0 && hi === 8) {
      cv.put(x, y, 0x20, C.ink, color);
      if (first < 0) first = x;
      last = x;
    } else if (lo === 0) {
      cv.put(x, y, LEFT_EIGHTHS[hi], color, under);
    } else if (hi === 8) {
      cv.put(x, y, LEFT_EIGHTHS[lo], under, color);
    } else {
      cv.put(x, y, LEFT_EIGHTHS[Math.max(1, hi)], color, under);
    }
  }
  return { first, last };
}

// A label inside a bar, on the longest run of its cells nothing drew over
// since; the full text with a cell of padding, else the short glyph.
function labelIn(cv, y, span, text, glyph, color) {
  if (span.first < 0) return;
  let best = { start: -1, len: 0 };
  let start = -1;
  for (let x = span.first; x <= span.last + 1; x++) {
    const ok = x <= span.last && cv.bgAt(x, y) === color && cv.chAt(x, y) === 0x20;
    if (ok && start < 0) start = x;
    if (!ok && start >= 0) {
      if (x - start > best.len) best = { start, len: x - start };
      start = -1;
    }
  }
  if (best.len < 1) return;
  const fg = luma(color) > 140 ? C.ink : C.white;
  const s = String(text);
  if (best.len >= s.length + 2) cv.text(best.start + 1, y, s, fg, color);
  else if (best.len >= s.length && s.length > 0) cv.text(best.start, y, s, fg, color);
  else if (glyph && best.len >= glyph.length) cv.text(best.start + (best.len >= glyph.length + 2 ? 1 : 0), y, glyph, fg, color);
}

const BRIGHTNESS = [0.55, 0.7, 0.85, 1];

// Output tokens to one of four brightness steps (under 30, 300, 1500, more).
export function brightnessStep(out) {
  if (out < 30) return BRIGHTNESS[0];
  if (out < 300) return BRIGHTNESS[1];
  if (out < 1500) return BRIGHTNESS[2];
  return BRIGHTNESS[3];
}

// ---------------------------------------------------------------- frame (pure)

function laneTotals(lane) {
  let req = 0;
  let tools = 0;
  let tok = 0;
  let cost = 0;
  for (const s of lane.segs) {
    if (s.kind === "req") {
      req++;
      tok += s.tok;
      cost += s.cost;
    } else {
      tools++;
    }
  }
  return { req, tools, tok, cost };
}

function geometry(columns) {
  const labelW = columns >= 110 ? 18 : columns >= 80 ? 15 : 12;
  const totalsW = columns >= 100 ? 27 : columns >= 76 ? 18 : 0;
  const timeW = Math.max(8, columns - labelW - totalsW - 2);
  return { labelW, totalsW, timeW, x0: labelW + 1 };
}

export function buildFrame(r0, v, { columns, now }) {
  const r = r0 && Array.isArray(r0.turns) ? r0 : EMPTY_REC;
  const W = Math.max(24, Math.min(512, Math.floor(columns)));
  const cv = new Canvas(W);
  const g = geometry(W);
  const shown = r.turns.slice(-clampTurns(v?.turns)).reverse();
  const live = isLive(r, v, now);

  // Title bar
  const y0 = cv.row(C.head);
  let x = cv.text(1, y0, "◉ ", C.coral, C.head);
  x = cv.text(x, y0, "FLIGHT RECORDER", C.white, C.head);
  if (W >= 60) cv.text(x + 2, y0, "inside the turn", C.faint, C.head);
  const blinkOn = Math.floor(now / 500) % 2 === 0;
  if (live) {
    cv.text(W - 8, y0, "●", blinkOn ? C.rec : mix(C.rec, C.head, 0.6), C.head);
    cv.text(W - 6, y0, "REC", C.text, C.head);
  } else {
    cv.text(W - 9, y0, "■", C.faint, C.head);
    cv.text(W - 7, y0, "IDLE", C.dim, C.head);
  }

  if (shown.length === 0) {
    cv.row(C.frame);
    const y = cv.row(C.frame);
    cv.text(2, y, "Waiting for the next turn. Send a prompt and watch it fly.", C.dim, C.frame, W - 3);
    cv.row(C.frame);
  }

  for (const turn of shown) drawTurn(cv, turn, g, now, W);

  drawLegend(cv, W);
  return { columns: W, rows: cv.lines.length, words: cv.words() };
}

function drawTurn(cv, turn, g, now, W) {
  const isLiveTurn =
    turn.t1 === null ||
    turn.lanes.some(
      (l) => l.segs.some((s) => s.t1 === null) || (l.id !== "main" && l.done === null && now - lastActivity(l) < 60_000),
    );
  let end = turn.t1 ?? now;
  for (const l of turn.lanes) {
    if (l.done) end = Math.max(end, l.done);
    for (const s of l.segs) end = Math.max(end, s.t1 ?? now);
  }
  if (isLiveTurn) end = Math.max(end, now);
  const elapsed = Math.max(0, end - turn.t0);
  const span = spanFor(elapsed, isLiveTurn);
  const pxPerMs = (g.timeW * 8) / span;
  const toP = (t) => (t - turn.t0) * pxPerMs;

  // Turn totals
  let req = 0;
  let tools = 0;
  let tok = 0;
  let cost = 0;
  for (const l of turn.lanes) {
    const t = laneTotals(l);
    req += t.req;
    tools += t.tools;
    tok += t.tok;
    cost += t.cost;
  }
  const agents = turn.lanes.filter((l) => l.id !== "main").length;

  // Summary row
  cv.row(C.frame);
  const ys = cv.row(C.frame);
  let x = cv.text(1, ys, ` TURN ${turn.n} `, C.ink, isLiveTurn ? C.coral : C.dim);
  x = cv.text(x + 2, ys, fmtSecs(elapsed), C.white, C.frame);
  x = cv.text(x + 3, ys, fmtUsd(cost), C.now, C.frame);
  const stats = `${req} req  ${tools} tools  ${fmtTok(tok)} tok${agents ? `  ${agents} agent${agents === 1 ? "" : "s"}` : ""}`;
  x = cv.text(x + 3, ys, stats, C.dim, C.frame);
  if (turn.prompt && W - x > 12) {
    const room = W - x - 4;
    const p = turn.prompt.length > room - 2 ? `${turn.prompt.slice(0, Math.max(0, room - 3))}...` : turn.prompt;
    cv.text(x + 3, ys, `"${p}"`, C.faint, C.frame, room);
  }

  // Axis row
  const ya = cv.row(C.frame);
  cv.text(1, ya, "LANE", C.faint, C.frame);
  if (g.totalsW >= 27) cv.text(W - g.totalsW, ya, "REQ TOOLS  TOKENS     COST", C.faint, C.frame);
  else if (g.totalsW > 0) cv.text(W - g.totalsW, ya, "REQ TOOL    COST", C.faint, C.frame);
  const step = tickStep(span, g.timeW);
  const ticks = [];
  for (let s = 0; s * 1000 <= span + 1; s += step) ticks.push(s);
  for (const s of ticks) {
    const cx = g.x0 + Math.floor((s * 1000 * pxPerMs) / 8);
    if (cx >= g.x0 + g.timeW) break;
    const label = fmtTick(s);
    if (cx + label.length + 1 > g.x0 + g.timeW + 1) continue;
    cv.put(cx, ya, "▏", C.faint, C.frame);
    cv.text(cx + 1, ya, label, C.dim, C.frame);
  }

  // Lanes
  const nowX = isLiveTurn ? g.x0 + Math.min(g.timeW - 1, Math.floor(toP(now) / 8)) : -1;
  turn.lanes.forEach((lane, li) => {
    const bg = li % 2 === 0 ? C.laneA : C.laneB;
    const { rows, depth } = packLane(lane.segs);
    const ys0 = cv.lines.length;
    for (let d = 0; d < depth; d++) cv.row(bg);

    // grid lines in the empty timeline
    for (const s of ticks) {
      if (s === 0) continue;
      const cx = g.x0 + Math.floor((s * 1000 * pxPerMs) / 8);
      if (cx >= g.x0 + g.timeW) break;
      for (let d = 0; d < depth; d++) cv.put(cx, ys0 + d, "▏", C.grid, bg);
    }

    // bars: requests first, tools on top; labels after every bar is down
    const labels = [];
    const order = lane.segs.map((s, i) => i);
    order.sort((a, b) => (lane.segs[a].kind === lane.segs[b].kind ? 0 : lane.segs[a].kind === "req" ? -1 : 1));
    for (const i of order) {
      const s = lane.segs[i];
      const y = ys0 + rows[i];
      const t1 = s.t1 ?? now;
      const running = s.t1 === null;
      let color;
      let label;
      let minE;
      if (s.kind === "req") {
        const base = FAMILY[familyOf(s.name || lane.model)];
        // Four fixed brightness steps: the terminal keeps one table of 1024
        // color pairs per session, so every color here comes from a short list.
        const f = running ? BRIGHTNESS[1] : brightnessStep(s.out);
        color = s.err && !running ? mix(base, C.frame, 0.55) : mix(mix(base, C.frame, 0.3), base, f);
        const fam = familyOf(s.name || lane.model);
        label = running ? fam : s.out > 0 ? `${fam} ${fmtTok(s.out)}` : fam;
        minE = 2;
      } else {
        const kind = toolKind(s.name);
        color = s.err && !running ? TOOL.failed : TOOL[kind];
        const linked = kind === "agent" ? agentLaneLabel(lane, s, t1, turn) : "";
        label = linked || toolLabel(s.name);
        minE = 4;
      }
      let p0 = toP(s.t0);
      let p1 = toP(t1);
      if (p1 - p0 < minE) p1 = p0 + minE;
      const limit = g.timeW * 8;
      if (p0 >= limit) continue;
      p1 = Math.min(p1, limit);
      // a 1/8 cell gap at the end keeps back-to-back bars apart
      const spanCells = bar(cv, y, g.x0, p0, p1 - p0 >= 6 && !running ? p1 - 1 : p1, color);
      if (s.kind === "tool") {
        const room = spanCells.first < 0 ? 0 : spanCells.last - spanCells.first + 1;
        if (room >= 1) labels.push({ y, spanCells, text: label, glyph: toolGlyph(s.name), color });
        else {
          // a sliver: put the glyph in the cell after it when that cell is empty
          const gx = g.x0 + Math.floor(p1 / 8);
          if (gx < g.x0 + g.timeW && cv.bgAt(gx, y) === bg && cv.chAt(gx, y) !== 0x2588) {
            const ch = cv.chAt(gx, y);
            if (ch === 0x20 || ch === 0x258f) cv.put(gx, y, toolGlyph(s.name), color, bg);
          }
        }
      } else {
        labels.push({ y, spanCells, text: label, glyph: familyOf(s.name || lane.model), color });
      }
      if (running) {
        // a bright leading edge on what is still running
        const ex = g.x0 + Math.min(g.timeW - 1, Math.floor(Math.max(p0, p1 - 1) / 8));
        const pulse = Math.floor(now / 250) % 2 === 0;
        cv.put(ex, y, "▐", pulse ? C.white : mix(color, C.white, 0.5), cv.bgAt(ex, y));
      }
    }

    for (const l of labels) labelIn(cv, l.y, l.spanCells, l.text, l.glyph, l.color);

    // done cap
    if (lane.done && lane.id !== "main") {
      const cx = g.x0 + Math.floor(toP(lane.done) / 8) + 1;
      if (cx < g.x0 + g.timeW && cv.bgAt(cx, ys0) === bg) cv.put(cx, ys0, "✓", C.done, bg);
    }

    // now edge
    if (nowX >= g.x0) {
      for (let d = 0; d < depth; d++) {
        if (cv.bgAt(nowX, ys0 + d) === bg && (cv.chAt(nowX, ys0 + d) === 0x20 || cv.chAt(nowX, ys0 + d) === 0x258f)) {
          cv.put(nowX, ys0 + d, "▏", C.now, bg);
        }
      }
    }

    // label column
    const nested = lane.parent && turn.lanes.some((l) => l.id === lane.parent);
    const fam = familyOf(lane.model);
    const dot = FAMILY[fam];
    let lx = 1;
    if (nested) lx = cv.text(lx, ys0, "└", C.faint, bg);
    lx = cv.text(lx, ys0, "●", dot, bg);
    const status = laneStatus(lane, turn, now, isLiveTurn);
    const room = g.labelW - (lx - 1) - 3;
    const name = lane.id === "main" ? "main" : fitLabel(lane, room);
    cv.text(lx + 1, ys0, name, lane.id === "main" ? C.white : C.text, bg, room);
    cv.text(g.labelW - 1, ys0, status.ch, status.color, bg);
    if (depth >= 2 && lane.id !== "main" && lane.type) {
      // second row: the model under the name
      cv.text(lx + 1, ys0 + 1, fam, C.dim, bg, room);
    } else if (depth >= 2 && lane.id === "main") {
      cv.text(lx + 1, ys0 + 1, fam, C.dim, bg, room);
    }

    // totals
    if (g.totalsW > 0) {
      const t = laneTotals(lane);
      const tx = W - g.totalsW;
      if (g.totalsW >= 27) {
        cv.text(tx, ys0, String(t.req).padStart(3), C.text, bg);
        cv.text(tx + 4, ys0, String(t.tools).padStart(5), C.text, bg);
        cv.text(tx + 11, ys0, fmtTok(t.tok).padStart(6), C.dim, bg);
        cv.text(tx + 18, ys0, fmtUsd(t.cost).padStart(8), C.now, bg);
      } else {
        cv.text(tx, ys0, String(t.req).padStart(3), C.text, bg);
        cv.text(tx + 4, ys0, String(t.tools).padStart(4), C.text, bg);
        cv.text(tx + 9, ys0, fmtUsd(t.cost).padStart(7), C.now, bg);
      }
    }
  });
}

// "general-purpose 3f9c" in a narrow column keeps the id and trims the type.
function fitLabel(lane, room) {
  if (lane.label.length <= room) return lane.label;
  const id = shortId(lane.id);
  const type = lane.label.slice(0, Math.max(0, lane.label.length - id.length - 1));
  return `${type.slice(0, Math.max(1, room - id.length - 1))} ${id}`;
}

function agentLaneLabel(lane, seg, t1, turn) {
  const id = seg.id.startsWith("t:") ? seg.id.slice(2) : "";
  if (!id) return "";
  const target = turn.lanes.find((l) => l.toolUseId === id);
  return target ? `> ${target.label}` : "";
}

function laneStatus(lane, turn, now, isLiveTurn) {
  const pulse = { ch: "●", color: Math.floor(now / 400) % 2 === 0 ? C.now : mix(C.now, C.frame, 0.55) };
  if (lane.id === "main") {
    if (turn.t1 === null || lane.segs.some((s) => s.t1 === null)) return pulse;
    if (isLiveTurn) return { ch: "○", color: C.dim }; // waiting on subagents
    return { ch: "✓", color: C.done };
  }
  if (lane.done) return { ch: "✓", color: C.done };
  if (isLiveTurn) return pulse;
  return { ch: "·", color: C.faint };
}

function drawLegend(cv, W) {
  cv.row(C.frame);
  const y = cv.row(C.head);
  const items = [
    ["MODEL", null],
    ["fable", FAMILY.fable],
    ["opus", FAMILY.opus],
    ["sonnet", FAMILY.sonnet],
    ["haiku", FAMILY.haiku],
    ["TOOL", null],
    ["read", TOOL.read],
    ["edit", TOOL.edit],
    ["bash", TOOL.bash],
    ["agent", TOOL.agent],
    ["mcp", TOOL.mcp],
    ["other", TOOL.other],
    ["failed", TOOL.failed],
  ];
  let x = 1;
  for (const [name, color] of items) {
    if (color === null) {
      if (x > 1) x += 1;
      if (x + name.length >= W) break;
      x = cv.text(x, y, name, C.faint, C.head) + 1;
      continue;
    }
    if (x + name.length + 3 >= W) break;
    cv.put(x, y, "█", color, C.head);
    x = cv.text(x + 2, y, name, C.dim, C.head) + 2;
  }
  const y2 = cv.row(C.head);
  const hint = "brighter request = more output   ▏now   ✓ done   /timeline turns <n>   /timeline clear";
  cv.text(1, y2, hint, C.faint, C.head, W - 2);
  // color the now and done glyphs in the hint
  const ni = hint.indexOf("▏now");
  if (ni >= 0 && ni + 1 < W - 1) cv.put(1 + ni, y2, "▏", C.now, C.head);
  const di = hint.indexOf("✓ done");
  if (di >= 0 && di + 1 < W - 1) cv.put(1 + di, y2, "✓", C.done, C.head);
}

// ---------------------------------------------------------------- non-terminal fallback

function fallbackTree(Box, Text, r, v, now) {
  const shown = (r.turns ?? []).slice(-clampTurns(v?.turns)).reverse();
  const rows = [Text({ bold: true, children: "Flight Recorder" })];
  if (shown.length === 0) rows.push(Text({ dimColor: true, children: "Waiting for the next turn." }));
  for (const turn of shown) {
    const end = turn.t1 ?? now;
    let cost = 0;
    for (const l of turn.lanes) cost += laneTotals(l).cost;
    rows.push(
      Text({
        bold: true,
        children: `Turn ${turn.n}  ${fmtSecs(end - turn.t0)}  ${fmtUsd(cost)}${turn.t1 === null ? "  running" : ""}`,
      }),
    );
    for (const lane of turn.lanes) {
      const t = laneTotals(lane);
      const name = lane.id === "main" ? "main" : lane.label;
      const state = lane.done || (lane.id === "main" && turn.t1 !== null) ? "done" : "running";
      rows.push(
        Text({
          wrap: "truncate",
          children: `  ${name}  ${familyOf(lane.model)}  ${t.req} req  ${t.tools} tools  ${fmtTok(t.tok)} tok  ${fmtUsd(t.cost)}  ${state}`,
        }),
      );
    }
  }
  return Box({ flexDirection: "column", children: rows });
}

// ---------------------------------------------------------------- base64

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function encodeCells(words) {
  const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength);
  if (typeof bytes.toBase64 === "function") return bytes.toBase64();
  const parts = [];
  const n = bytes.length;
  let chunk = "";
  let i = 0;
  for (; i + 2 < n; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    chunk += B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63];
    if (chunk.length > 8192) {
      parts.push(chunk);
      chunk = "";
    }
  }
  if (i < n) {
    const b1 = i + 1 < n ? bytes[i + 1] : 0;
    const v = (bytes[i] << 16) | (b1 << 8);
    chunk += B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + (i + 1 < n ? B64[(v >> 6) & 63] : "=") + "=";
  }
  parts.push(chunk);
  return parts.join("");
}
