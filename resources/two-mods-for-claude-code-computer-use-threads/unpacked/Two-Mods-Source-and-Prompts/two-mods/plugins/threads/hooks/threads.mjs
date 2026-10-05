// Threads: a lead chat creates real Claude Code sessions ("threads") on chosen
// models, watches them live and steers them.
//
// A thread is an interactive `claude` process in a private tmux server
// (`tmux -L cc-threads`), so it needs no visible terminal. It registers itself in
// <config>/sessions/<pid>.json under the session id we chose, writes its
// transcript to <config>/projects/<slug(cwd)>/<sessionId>.jsonl, and listens on a
// messaging socket, so the lead can:
//   - watch: tmux capture-pane (the live screen) and the transcript tail,
//   - steer: $.session.send({ to: { sessionId } }) (a message, works mid-turn),
//     or tmux send-keys (typing, Escape to interrupt, /model, permission keys),
//   - hear back: the thread's brief asks it to SendMessage a short report to the
//     lead's socket; `session.receive` records it and lets it through to the model.
//
// Every thread is in <config>/threads/registry.json (shared by every chat on the
// machine) and every action in <config>/threads/events.jsonl.

import { update } from "claude-code";
import {
  ATTENTION,
  DEFAULT_CAP,
  LIVE,
  LOGIN_HINT,
  MAX_CAP,
  MODEL_ALIASES,
  NEW_USAGE,
  PANE_FORMAT,
  age,
  bandText,
  buildBrief,
  buildSpawnArgv,
  checkMode,
  cleanable,
  clip,
  colorOf,
  dotOf,

  isTrusted,
  itemLine,

  modelChip,
  normalizeModel,
  oneLine,
  parseNew,
  parsePanes,
  parseRegistry,
  parseTranscript,
  readScreen,
  remoteLink,
  resolveRef,
  resumeCommand,
  screenLines,
  serializeRegistry,
  shortId,
  shortPath,
  shortTitle,
  slug,
  statusOf,
  stripTags,
  threadOfDelivery,
  threadTitle,
  tmuxArgv,
  tmuxName,
  tokenize,
  activityLine,
  agentName,
  buildInlinePrompt,
  chooseBackend,
  messagesToItems,
  pushBounded,
  statusOfInline,
  toolLine,
  DEFAULT_MODE,
  ANSWER_MAX,
  heldMatches,
  reportRow,
  shouldReport,
  EFFORTS,
  buildPhasePrompt,
  checkEffort,
  gateAfter,
  handoffNudge,
  handoffPathFor,
  parsePlanCommand,
  phaseNumber,
  phaseTitle,
  planStatusText,
  revisionPrompt,
  stepPlan,
  validatePlan,
  costFromTranscript,
  costOfUsage,
  money,
  planRecord,
  planRecordMarkdown,
  conversationOutline,
  forkPrompt,
  localTime,
  worktreeFor,
  worktreeOutcome,
  isUnread,
} from "./core.mjs";

const PANE = "threads";
const PANE_TITLE = "Threads";
const VIEW = { plugin: "threads", key: "view" };
const UI = { plugin: "threads", key: "ui" };
const DETAIL = { plugin: "threads", key: "detail" };
const AUTH = { plugin: "threads", key: "auth" };
// inline threads: agentId -> thread id, per-thread activity feed, per-agent live facts
const INLINE = { plugin: "threads", key: "inline" };
const ACTIVITY = { plugin: "threads", key: "activity" };
const AGENTS = { plugin: "threads", key: "agents" };
// the completion watcher: last status it saw per thread, and messages the lead sent (for held ones)
const WATCH = { plugin: "threads", key: "watch" };
const SENT = { plugin: "threads", key: "sent" };
// wakes waiting for the lead to be idle, and whether the lead's own turn is running
const WAKES = { plugin: "threads", key: "wakes" };
const LEAD = { plugin: "threads", key: "lead" };
const WATCH_MS = 4000;
const AUTOWAKE_KEY = "autowake";

const EMPTY_VIEW = { threads: [], plans: [], selfId: "", leadTitle: "", refreshedAt: 0, cap: DEFAULT_CAP };
const EMPTY_UI = { selected: "", mode: "transcript", showOthers: false, steering: false, notice: "", planView: false };
const EMPTY_DETAIL = { id: "", mode: "transcript", lines: [], at: 0 };

const AUTH_TTL_MS = 120000;
const TICK_MS = 2000;
const FAST_MS = 2000;
const SLOW_MS = 10000;
const CLEAN_AGE_MS = 7 * 24 * 3600 * 1000;
const TAIL_BYTES = "262144";

const T_CREATE = "threads_create";
const T_LIST = "threads_list";
const T_READ = "threads_read";
const T_SEND = "threads_send";
const T_WAIT = "threads_wait";
const T_CLOSE = "threads_close";
const T_PLAN = "threads_plan";
const T_SETUP = "threads_setup";
const SETUP_KEY = "setupPassedAt";
const SETUP_RAN = { plugin: "threads", key: "setupRan" };
const COST = { plugin: "threads", key: "cost" };
// where the lead chat is shown: tool results carry no surface, so it is worked out once per session
const SURFACE = { plugin: "threads", key: "surface" };
const T_SHOW = "threads_show";
const T_OPEN = "threads_open";
const T_FORK = "threads_fork";
const T_ADOPT = "threads_adopt";
const T_HISTORY = "threads_plan_history";
const T_PIN = "threads_pin";
const T_ARCHIVE = "threads_archive";
const T_ADVANCE = "threads_plan_advance";
const T_RENAME = "threads_rename";
const T_HANDOFF = "threads_handoff";
const T_MARK_READ = "threads_mark_read";
// inline threads being spawned: agent name -> { id, effort }, so the very first request already gets its effort
const pendingInline = new Map();

// Module state: a timer handle and an in-flight guard. A hot reload resets them.
let ticker = null;
let inflight = null;
let dirReady = false;
let watcher = null;
let watching = false;
// plan phases being started right now (a start can take seconds; never start one twice)
const startingPhases = new Set();
// tool_use_id -> { agentId, tool } of an inline thread's call in flight (to tie tool.check to it)
const callsInFlight = new Map();

// the configured default permission mode (userConfig), refreshed by each register
let configuredMode = DEFAULT_MODE;
// idleCloseMinutes setting: finished session threads idle this long are closed (0: never)
let idleCloseMinutes = 120;
let lastIdleCheck = 0;
const MODE_KEY = "defaultMode";

export function register(on, options) {
  configuredMode = checkMode(options?.defaultPermissionMode).mode ?? DEFAULT_MODE;
  const idle = Number(options?.idleCloseMinutes);
  idleCloseMinutes = Number.isFinite(idle) && idle >= 0 ? idle : 120;
  on("session.start", async ($, e, next) => {
    const started = await next(e);
    try {
      await detectSurface($, e.surface);
    } catch {
      // keep the default
    }
    await $.command.register({
      name: "threads",
      description: "Threads: create, watch and steer Claude Code worker sessions on other models",
      argumentHint: "[new <model> <title> [--inline|--session] -- <task> | list | send <id> <msg> | type | interrupt | model | approve | deny | open | close <id> | cap <n> | clean | help]",
      immediate: true,
    });
    await registerTools($);
    startTicker($);
    try {
      await refresh($);
    } catch (err) {
      $.ui.log(`threads: first refresh failed (${String(err?.message ?? err)})`, { to: "debug" });
    }
    await startWatcher($);
    try {
      await backfillPlanHistory($);
    } catch (err) {
      $.ui.log(`threads: plan history backfill failed (${String(err?.message ?? err)})`, { to: "debug" });
    }
    try {
      await noticeOrphans($);
    } catch (err) {
      $.ui.log(`threads: orphan check failed (${String(err?.message ?? err)})`, { to: "debug" });
    }
    return started;
  });

  on("command.run", { command: "threads" }, async ($, e) => {
    startTicker($);
    return { text: await runCommand($, e.args ?? "") };
  });

  // ---- model tools -----------------------------------------------------------------

  on("tool.call", { tool: "mcp__threads__threads_create" }, async ($, e) => {
    startTicker($);
    const made = await createThread($, {
      model: e.model,
      title: e.title,
      task: e.task,
      cwd: e.cwd,
      permissionMode: e.permission_mode,
      reportBack: e.report_back !== false,
      backend: e.backend,
      effort: e.effort,
      worktree: e.worktree === true,
    });
    if (made.error) return { deny: made.error };
    return { result: made.text };
  });

  on("tool.call", { tool: "mcp__threads__threads_list" }, async ($, e) => {
    await refresh($);
    return { result: await listText($, { forModel: true, includeArchived: e?.include_archived === true, includeClosed: e?.include_closed === true }) };
  });

  on("tool.call", { tool: "mcp__threads__threads_read" }, async ($, e) => {
    await refresh($);
    const found = await findThread($, e.id);
    if (found.error) return { deny: found.error };
    const text = await readText($, found.thread, e.view === "screen" ? "screen" : "transcript", e.limit);
    if (isUnread(found.thread)) await markRead($, [found.thread.id]);
    return { result: text };
  });

  on("tool.call", { tool: "mcp__threads__threads_send" }, async ($, e) => {
    await refresh($);
    const found = await findThread($, e.id);
    if (found.error) return { deny: found.error };
    const mode = e.mode ?? "message";
    if (mode === "interrupt") return { result: await interruptThread($, found.thread) };
    const message = String(e.message ?? "").trim();
    if (!message) return { deny: "message is empty." };
    if (mode === "type") return { result: await typeIntoThread($, found.thread, message) };
    if (mode !== "message") return { deny: `Unknown mode "${mode}". Use message, type or interrupt.` };
    return { result: await sendToThread($, found.thread, message) };
  });

  on("tool.call", { tool: "mcp__threads__threads_wait" }, async ($, e, next) => {
    return { result: await waitForThreads($, e, next?.signal) };
  });

  on("tool.call", { tool: "mcp__threads__threads_close" }, async ($, e) => {
    await refresh($);
    const confirmed = e.confirmed === true;
    if (e.all_of_plan) {
      const p = await paths($);
      const plan = await pickPlan($, p, String(e.all_of_plan));
      if (!plan) return { deny: `No plan ${e.all_of_plan}.` };
      return { result: await closePlanThreads($, plan, { confirmed, from: "tool" }) };
    }
    if (!e.id) return { deny: "threads_close needs id (a thread id such as t1a2b3, or the start of its title) or all_of_plan (a plan id). threads_list shows them." };
    const found = await findThread($, e.id);
    if (found.error) return { deny: found.error };
    return { result: await closeThread($, found.thread, { confirmed, from: "tool" }) };
  });

  on("tool.call", { tool: "mcp__threads__threads_show" }, async ($, e) => {
    startTicker($);
    return { result: await showPane($, { id: e.id, plan: e.plan }) };
  });

  on("tool.call", { tool: "mcp__threads__threads_open" }, async ($, e) => {
    await refresh($);
    const found = await findThread($, e.id);
    if (found.error) return { deny: found.error };
    return { result: await openThread($, found.thread) };
  });

  on("tool.call", { tool: "mcp__threads__threads_fork" }, async ($, e) => {
    startTicker($);
    const made = await forkThread($, e);
    if (made.error) return { deny: made.error };
    return { result: made.text };
  });

  on("tool.call", { tool: "mcp__threads__threads_handoff" }, async ($, e) => {
    startTicker($);
    const made = await handoffThread($, e);
    if (made.error) return { deny: made.error };
    return { result: made.text };
  });

  on("tool.call", { tool: "mcp__threads__threads_rename" }, async ($, e) => {
    await refresh($);
    const found = await findThread($, e.id, { includeArchived: true });
    if (found.error) return { deny: found.error };
    return { result: await renameThread($, found.thread, e.title) };
  });

  on("tool.call", { tool: "mcp__threads__threads_mark_read" }, async ($, e) => {
    return { result: await markReadText($, { id: e.id, all: e.all === true }) };
  });

  on("tool.call", { tool: "mcp__threads__threads_adopt" }, async ($, e) => {
    return { result: await adoptThreads($, { ids: Array.isArray(e.ids) ? e.ids : [], all: e.all === true }) };
  });

  on("tool.call", { tool: "mcp__threads__threads_plan_history" }, async ($, e) => {
    return { result: await planHistoryText($, e.planId) };
  });

  on("tool.call", { tool: "mcp__threads__threads_pin" }, async ($, e) => {
    await refresh($);
    const found = await findThread($, e.id);
    if (found.error) return { deny: found.error };
    return { result: await setFlag($, found.thread, "pinned", e.pinned !== false) };
  });

  on("tool.call", { tool: "mcp__threads__threads_archive" }, async ($, e) => {
    await refresh($);
    const found = await findThread($, e.id, { includeArchived: true });
    if (found.error) return { deny: found.error };
    return { result: await setFlag($, found.thread, "archived", e.archived !== false) };
  });

  on("tool.call", { tool: "mcp__threads__threads_setup" }, async ($, e) => {
    const out = await runSetup($, { cwd: e.cwd, closeStale: e.close_stale === true });
    return { result: out.text };
  });

  on("tool.call", { tool: "mcp__threads__threads_plan" }, async ($, e) => {
    startTicker($);
    const made = await createPlan($, e);
    if (made.error) return { deny: made.error };
    return { result: made.text };
  });

  on("tool.call", { tool: "mcp__threads__threads_plan_advance" }, async ($, e) => {
    const out = await advancePlan($, e.planId, e.decision, e.feedback, { quiet: false });
    if (out.error) return { deny: out.error };
    return { result: out.text };
  });

  // ---- inline threads: what their loops do -----------------------------------------
  //
  // An inline thread is a background subagent of this chat. Its tool calls, model
  // requests and turns pass through these hooks with `e.agentId`; only agents in
  // the INLINE map are recorded, everything else passes straight through.

  on("tool.call", async ($, e, next) => {
    if (!e.agentId) return next(e);
    const tid = await inlineThreadOf($, e.agentId);
    if (!tid) return next(e);
    const at = await $.clock.now();
    await noteActivity($, tid, e.agentId, { kind: "tool", text: toolLine(e.tool, e), at }, { status: "working", lastAt: at });
    const callKey = e.tool_use_id || `${e.agentId}:${e.tool}:${at}`;
    callsInFlight.set(callKey, { agentId: e.agentId, tool: e.tool });
    let ran;
    try {
      ran = await next(e);
    } finally {
      callsInFlight.delete(callKey);
    }
    const failed = ran?.deny !== undefined || ran?.isError === true;
    const now = await $.clock.now();
    if (failed) {
      const why = ran?.deny ?? (typeof ran?.text === "string" ? ran.text : "error");
      await noteActivity($, tid, e.agentId, { kind: "error", text: `${e.tool}: ${clip(oneLine(why), 200)}`, at: now }, { needsYou: false, lastAt: now });
    } else {
      await noteAgent($, e.agentId, { needsYou: false, lastAt: now });
    }
    return ran;
  });

  // A permission decision for one of an inline thread's calls: an "ask" means it waits on the person.
  on("tool.check", async ($, e, next) => {
    const decided = await next(e);
    // by the call's id; a check without one is tied to the only inline call of that tool in flight
    let agentId = e.tool_use_id ? callsInFlight.get(e.tool_use_id)?.agentId : undefined;
    if (!agentId && !e.tool_use_id) {
      const same = [...callsInFlight.values()].filter((c) => c.tool === e.tool);
      if (same.length === 1) agentId = same[0].agentId;
    }
    if (!agentId || decided?.decision !== "ask") return decided;
    const tid = await inlineThreadOf($, agentId);
    if (tid) {
      const at = await $.clock.now();
      await noteActivity($, tid, agentId, { kind: "wait", text: `asks to run ${toolLine(e.tool, e.input)}`, at }, { needsYou: true, lastAt: at });
      const { value: view = EMPTY_VIEW } = await $.state.get(VIEW);
      const title = view.threads.find((x) => x.id === tid)?.title ?? tid;
      $.ui.toast(`${title} needs you: asks to run ${clip(toolLine(e.tool, e.input), 80)}`, { timeoutMs: 8000 });
    }
    return decided;
  });

  on("turn.step", async function* ($, e, next) {
    let tid = e.agentId ? await inlineThreadOf($, e.agentId) : undefined;
    // the agent can make its first request before agent.spawn resolves: match it by name now
    if (!tid && e.agentId && pendingInline.size) tid = await claimPendingInline($, e.agentId);
    if (!tid) return yield* next(e);
    const at = await $.clock.now();
    const { value: metaAll = {} } = await $.state.get(AGENTS);
    const effort = metaAll[e.agentId]?.effort;
    await noteActivity($, tid, e.agentId, { kind: "step", text: `${e.model}${effort ? ` (${effort})` : ""} thinking (request ${e.index + 1})`, at }, { status: "working", model: e.model, lastAt: at, partial: "" });
    // the thread's effort rides on each of its requests (agent.spawn takes none)
    const stream = next(effort ? { ...e, effort } : e);
    let partial = "";
    let shownAt = at;
    for await (const chunk of stream) {
      if (chunk?.kind === "text" && typeof chunk.text === "string") {
        partial += chunk.text;
        const now = await $.clock.now();
        if (now - shownAt > 1500) {
          shownAt = now;
          await noteAgent($, e.agentId, { partial: clip(oneLine(partial), 300), lastAt: now });
        }
      }
      yield chunk;
    }
    const result = await stream.result;
    const now = await $.clock.now();
    const model = result?.usage?.model || e.model;
    if (result?.usage) {
      // a subagent's request: cache writes at the 5-minute rate unless the usage says otherwise
      const c = costOfUsage(result.usage, model, "sub");
      await update($, AGENTS, (all) => {
        const cur = (all ?? {})[e.agentId] ?? {};
        return { ...(all ?? {}), [e.agentId]: { ...cur, costUsd: (cur.costUsd ?? 0) + c.usd } };
      });
    }
    if (result?.answer && result.answer.trim()) {
      await noteActivity($, tid, e.agentId, { kind: "assistant", text: clip(oneLine(result.answer), 400), at: now }, { model, partial: "", lastAt: now });
    } else {
      await noteAgent($, e.agentId, { model, partial: "", lastAt: now });
    }
    return result;
  });

  // The end of an inline thread's run: its answer is the report.
  // The lead's own turns: a wake is only submitted while the lead is idle, so it never queues
  // behind a turn that may resolve the gate it is about.
  on("turn.start", async ($, e, next) => {
    if (!e.agentId) await $.state.set(LEAD, { busy: true });
    return next(e);
  });

  on("prompt.submit", async ($, e, next) => {
    // our own wake, checked once more as it enters: a gate resolved meanwhile drops it
    if (e.origin?.kind === "plugin" && e.origin?.name === "threads") {
      const gate = wakeGateOf(e.text);
      if (gate && !(await gateStillOpen($, gate.planId, gate.index))) {
        return { drop: `threads: phase ${phaseNumber(gate.index)} of plan ${gate.planId} was already decided` };
      }
    }
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (!e.agentId) {
      await $.state.set(LEAD, { busy: false });
      await scheduleWakes($);
      return result;
    }
    try {
      await noteInlineDone($, e);
    } catch (err) {
      $.ui.log(`threads: could not record an inline report (${String(err?.message ?? err)})`, { to: "debug" });
    }
    return result;
  });

  // ---- reports -----------------------------------------------------------------------

  // A thread's report: note it on the thread, toast it, and let it through so the
  // lead's model reads it. Anything that is not from a registered thread is untouched.
  on("session.receive", async ($, e, next) => {
    if (e.agentId !== undefined) return next(e);
    const text = String(e.text ?? "");
    if (!text.includes("<cross-session-message")) return next(e);
    try {
      await noteReport($, text);
    } catch (err) {
      $.ui.log(`threads: could not record a report (${String(err?.message ?? err)})`, { to: "debug" });
    }
    return next(e);
  });

  // ---- drawing -------------------------------------------------------------------------

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const original = await next(e);
    if (e.props.hasSurvey) return original;
    const { value: view = EMPTY_VIEW } = await $.state.get(VIEW);
    const mine = view.threads.filter((t) => t.isMine);
    const gates = (view.plans ?? [])
      .filter((pl) => pl.status === "running" && pl.phases[pl.current ?? 0]?.status === "awaiting-gate")
      .map((pl) => {
        const i = pl.current ?? 0;
        return gateAfter(pl, i) === "user" ? `plan ${pl.title}: phase ${phaseNumber(i + 1)} ready · /threads plan next` : `plan ${pl.title}: phase ${phaseNumber(i)} awaits lead review`;
      });
    const text = [bandText(mine), ...gates].filter(Boolean).join(" · ");
    if (!text) return original;
    const { Box, Text } = $.ui.resolve(e);
    const needs = mine.some((t) => ATTENTION.has(t.status)) || gates.length > 0;
    const row = Box({
      flexDirection: "row",
      children: [Text({ color: needs ? "magenta" : "cyan", wrap: "truncate", children: clip(text, Math.max(20, e.props.bodyColumns ?? 100)) })],
    });
    if (!original) return row;
    return Box({ flexDirection: "column", children: [original, row] });
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e);
    const { Box, Text, Button } = els;
    const Input = els.Input;
    const { value: view = EMPTY_VIEW } = await $.state.get(VIEW);
    const { value: ui = EMPTY_UI } = await $.state.get(UI);
    const { value: detail = EMPTY_DETAIL } = await $.state.get(DETAIL);
    const width = Math.max(40, e.props.bodyColumns ?? 100);
    const isWide = width >= 96;
    const leftW = isWide ? Math.min(44, Math.floor(width * 0.36)) : width;
    const rightW = isWide ? width - leftW - 2 : width;
    const dim = (s, w) => Text({ dimColor: true, wrap: "truncate", children: clip(s, w) });

    const visible = view.threads.filter((t) => ui.showArchived || !t.archived);
    const archivedCount = view.threads.filter((t) => t.archived).length;
    const pinFirst = (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    const mine = visible.filter((t) => t.isMine).sort(pinFirst);
    const others = visible.filter((t) => !t.isMine).sort(pinFirst);
    const shown = [...mine, ...(ui.showOthers ? others : [])];
    const selected = shown.find((t) => t.id === ui.selected) ?? shown[0] ?? null;
    const isDesktop = e.surface !== "terminal";

    // left: the tree
    const tree = [
      Text({ bold: true, wrap: "truncate", children: clip(`Lead · ${view.leadTitle || "this chat"}`, leftW) }),
    ];
    if (mine.length === 0) tree.push(dim("  no threads yet: /threads new", leftW));
    const row = (t, i, indent) => {
      const hotkey = i < 9 ? String(i + 1) : undefined;
      const isSel = selected && t.id === selected.id;
      return Box({
        key: `row:${t.id}`,
        flexDirection: "row",
        gap: 1,
        children: [
          Text({ children: `${indent}${isSel ? "›" : " "}` }),
          Text({ color: colorOf(t.status), children: dotOf(t.status) }),
          Text({ color: "blue", children: modelChip(t.verifiedModel || t.requestedModel).padEnd(6) }),
          Button({
            key: `sel:${t.id}`,
            label: clip(`${t.pinned ? "⚑ " : ""}${t.forkedFrom ? "⑂ " : ""}${t.worktree && !t.worktree.removed ? "⎇ " : ""}${t.desktop?.length ? "▣ " : ""}${shortTitle(t.title)}${t.archived ? " (archived)" : ""}`, Math.max(8, leftW - 24 - indent.length - (isUnread(t) ? 4 : 0))),
            hotkey,
            plain: true,
            dimColor: !isSel,
            onPress: () => selectThread($, t.id),
          }),
          ...(isUnread(t) ? [Text({ color: "yellow", bold: true, children: "new" })] : []),
          ...(t.costUsd ? [Text({ dimColor: true, children: money(t.costUsd) })] : []),
        ],
      });
    };
    mine.forEach((t, i) => tree.push(row(t, i, "  ")));
    if (others.length > 0) {
      tree.push(
        Button({
          key: "others",
          label: `${ui.showOthers ? "Hide" : "Show"} other leads' threads (${others.length})`,
          hotkey: "a",
          plain: true,
          dimColor: true,
          onPress: () => patchUi($, (u) => ({ ...u, showOthers: !u.showOthers })),
        }),
      );
      if (ui.showOthers) {
        let lastParent = "";
        others.forEach((t, j) => {
          const parent = t.parent?.title || t.parent?.sessionId?.slice(0, 8) || "unknown lead";
          if (parent !== lastParent) {
            tree.push(dim(`Lead · ${parent}`, leftW));
            lastParent = parent;
          }
          tree.push(row(t, mine.length + j, "  "));
        });
      }
    }
    const totalCost = mine.reduce((a, t) => a + (t.costUsd ?? 0), 0);
    tree.push(dim(`${view.threads.filter((t) => LIVE.has(t.status)).length} live · cap ${view.cap}${totalCost ? ` · ${money(totalCost)} est.` : ""}`, leftW));
    if (archivedCount) {
      tree.push(
        Button({
          key: "archived",
          label: `${ui.showArchived ? "Hide" : "Show"} archived (${archivedCount})`,
          hotkey: "h",
          plain: true,
          dimColor: true,
          onPress: () => patchUi($, (u) => ({ ...u, showArchived: !u.showArchived })),
        }),
      );
    }

    // right: the selected thread, or its plan
    const right = [];
    const plans = view.plans ?? [];
    const planAt = Math.min(Math.max(0, plans.length - 1 - (ui.planIndex ?? 0)), Math.max(0, plans.length - 1));
    const plan = ui.planView ? (ui.planIndex ? plans[planAt] : plans.find((x) => x.id === selected?.planId) ?? plans[planAt]) : null;
    if (plan) {
      const byId = new Map(view.threads.map((x) => [x.id, x]));
      const color = { working: "yellow", "awaiting-gate": "magenta", revising: "cyan", blocked: "red", done: "green", accepted: "green", queued: undefined };
      const planCost = plan.phases.reduce((a, ph) => a + (byId.get(ph.threadId)?.costUsd ?? 0), 0);
      const isHistory = plan.status !== "running";
      right.push(Text({ bold: true, wrap: "truncate", children: clip(`Plan ${plan.title} (${plan.id}) · ${plan.status} · gate ${plan.gate}${isHistory ? " · history (read-only)" : ""}`, rightW) }));
      right.push(dim(`est. API-equivalent ${money(planCost)} · ${plan.phases.length} phases`, rightW));
      if (plans.length > 1) {
        right.push(
          Box({
            flexDirection: "row",
            gap: 1,
            children: [
              Button({ key: "plan-older", label: "‹ Older plan", onPress: () => patchUi($, (u) => ({ ...u, planIndex: Math.min(plans.length - 1, (u.planIndex ?? 0) + 1) })) }),
              Button({ key: "plan-newer", label: "Newer plan ›", onPress: () => patchUi($, (u) => ({ ...u, planIndex: Math.max(0, (u.planIndex ?? 0) - 1) })) }),
            ],
          }),
        );
      }
      right.push(dim(`handoffs in ${shortPath(plan.handoffDir, rightW - 12)}`, rightW));
      plan.phases.forEach((ph, i) => {
        const th = byId.get(ph.threadId);
        right.push(
          Box({
            flexDirection: "row",
            gap: 1,
            children: [
              Text({ color: color[ph.status], children: `${phaseNumber(i)} ${ph.status.padEnd(13)}` }),
              Text({ color: "blue", children: `${ph.model}${ph.effort ? `/${ph.effort}` : ""}` }),
              Text({ wrap: "truncate", children: clip(`${ph.name}${th ? ` · ${th.id} ${th.status}` : ""}${th?.costUsd ? ` · ${money(th.costUsd)}` : ""}${(ph.gate ?? plan.gate) !== "auto" && i < plan.phases.length - 1 ? ` · gate ${ph.gate ?? plan.gate}` : ""}`, Math.max(10, rightW - 34)) }),
            ],
          }),
        );
        if (ph.handoffPath) right.push(dim(`   handoff ${shortPath(ph.handoffPath, rightW - 11)}`, rightW));
        if (ph.note) right.push(dim(`   ${ph.note}`, rightW));
      });
      const chain = plan.phases.map((ph) => ph.threadId || "·").join(" → ");
      right.push(dim(`threads ${chain}`, rightW));
      if (plan.status === "running" && plan.phases[plan.current ?? 0]?.status === "awaiting-gate" && gateAfter(plan, plan.current ?? 0) === "user") {
        right.push(Text({ color: "magenta", children: "Phase ready: run /threads plan next" }));
      }
    } else if (!selected) {
      right.push(dim("Create one with /threads new haiku Scout -- list the files here", rightW));
      right.push(dim("or ask in plain English: spin up a Haiku thread to ...", rightW));
    } else {
      const t = selected;
      const verified = t.verifiedModel ? t.verifiedModel : "not seen yet";
      right.push(Text({ bold: true, wrap: "truncate", children: clip(`${t.title}  (${t.id})`, rightW) }));
      right.push(
        Box({
          flexDirection: "row",
          gap: 1,
          children: [
            Text({ color: colorOf(t.status), children: `${dotOf(t.status)} ${t.status}` }),
            dim(`· ${age((view.refreshedAt || 0) - (t.createdAt || 0))} old · ${t.permissionMode}`, rightW - 16),
          ],
        }),
      );
      right.push(dim(`model  asked ${t.requestedModel} · running ${verified}${t.effort ? ` · effort ${t.effort}` : ""}`, rightW));
      const isInline = t.backend === "inline";
      right.push(dim(`cwd    ${shortPath(t.cwd, isInline ? 40 : rightW - 7)}${isInline ? ` · inline agent ${t.agentId}` : ""}`, rightW));
      right.push(dim(`task   ${oneLine(t.task)}`, rightW));
      right.push(dim(`cost   ${t.costUsd ? money(t.costUsd) : "$0"} est. API-equivalent${t.pinned ? " · pinned" : ""}${t.archived ? " · archived" : ""}`, rightW));
      if (t.forkedFrom) right.push(dim(`${t.handedOff ? "handoff" : "fork  "} from "${t.forkedFrom.title}" with ${t.forkedFrom.include === "full" ? "its transcript" : "a summary"}`, rightW));
      if (t.desktop?.length) right.push(dim(`desk   drives ${t.desktop.join(", ")} through Codex computer use (leased to this thread)`, rightW));
      if (t.worktree) {
        const w = t.worktree;
        const state = w.removed ? "removed (no changes)" : w.kept ? `kept${w.commits ? `, ${w.commits} commit${w.commits === 1 ? "" : "s"}` : ""}${w.dirty ? ", uncommitted changes" : ""} · merge: git merge ${w.branch}` : "isolated";
        right.push(dim(`tree   ${w.branch} · ${state}`, rightW));
      }
      if (t.lastReport?.text) {
        right.push(Text({ color: "cyan", wrap: "truncate", children: clip(`report ${t.lastReport.text}`, rightW) }));
      }
      if (t.status === "needs-you" && t.prompt && isInline) {
        right.push(Text({ color: "magenta", wrap: "truncate", children: clip(`waiting: ${oneLine(t.prompt)} (answer it in this chat)`, rightW) }));
      } else if (t.status === "needs-you" && t.prompt) {
        right.push(Text({ color: "magenta", wrap: "truncate", children: clip(`waiting: ${oneLine(t.prompt)}`, rightW) }));
      }
      if (t.status === "needs-login") right.push(Text({ color: "red", wrap: "truncate", children: clip(LOGIN_HINT, rightW) }));
      if (t.status === "needs-trust") {
        right.push(Text({ color: "red", wrap: "truncate", children: clip("Sits on the folder trust prompt. Trust the folder yourself, then close and recreate.", rightW) }));
      }
      const isLive = LIVE.has(t.status);
      const buttons = [
        Button({ key: "view", label: `w ${ui.mode === "screen" ? "Transcript" : isInline ? "Activity" : "Screen"}`, hotkey: "w", onPress: () => toggleMode($) }),
      ];
      if (isLive) {
        buttons.push(
          Button({ key: "steer", label: "s Steer", hotkey: "s", variant: "primary", onPress: () => patchUi($, (u) => ({ ...u, steering: !u.steering })) }),
          Button({ key: "interrupt", label: isInline ? "i Stop" : "i Interrupt", hotkey: "i", onPress: () => noticeOf($, () => interruptThread($, t)) }),
        );
        // model and effort open a row of choices right here (no dialog, so they work on every surface)
        if (!isInline) buttons.push(Button({ key: "model", label: "m Model", hotkey: "m", onPress: () => patchUi($, (u) => ({ ...u, picker: u.picker === "model" ? "" : "model" })) }));
        buttons.push(Button({ key: "effort", label: "e Effort", hotkey: "e", onPress: () => patchUi($, (u) => ({ ...u, picker: u.picker === "effort" ? "" : "effort" })) }));
      }
      if (t.status === "needs-you" && !isInline) {
        buttons.push(
          Button({ key: "approve", label: "y Approve", hotkey: "y", onPress: () => noticeOf($, () => answerPrompt($, t, true)) }),
          Button({ key: "deny", label: "n Deny", hotkey: "n", onPress: () => noticeOf($, () => answerPrompt($, t, false)) }),
        );
      }
      buttons.push(
        Button({ key: "open", label: "o Open", hotkey: "o", onPress: (pe) => noticeOf($, () => openThread($, t, pe?.surface)) }),
      );
      buttons.push(
        Button({ key: "pin", label: t.pinned ? "u Unpin" : "u Pin", hotkey: "u", onPress: () => noticeOf($, () => setFlag($, t, "pinned", !t.pinned)) }),
        Button({ key: "archive", label: t.archived ? "v Unarchive" : "v Archive", hotkey: "v", onPress: () => noticeOf($, () => setFlag($, t, "archived", !t.archived)) }),
        Button({ key: "rename", label: "t Rename", hotkey: "t", onPress: () => patchUi($, (u) => ({ ...u, renaming: !u.renaming, steering: false })) }),
      );
      if (t.status !== "closed") {
        buttons.push(Button({ key: "close-thread", label: "x Close", hotkey: "x", onPress: () => noticeOf($, () => closeThread($, t, { from: "pane" })) }));
      }
      right.push(Box({ flexDirection: "row", flexWrap: "wrap", gap: 1, children: buttons }));
      if (ui.picker && isLive) {
        const choices = ui.picker === "model" ? MODEL_ALIASES : EFFORTS;
        const current = ui.picker === "model" ? t.requestedModel : t.effort;
        right.push(
          Box({
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 1,
            children: [
              Text({ dimColor: true, children: ui.picker === "model" ? "model:" : "effort:" }),
              ...choices.map((c) =>
                Button({
                  key: `pick:${ui.picker}:${c}`,
                  label: c === current ? `${c} ✓` : c,
                  variant: c === current ? "primary" : undefined,
                  onPress: () =>
                    noticeOf($, async () => {
                      const kind = ui.picker;
                      await patchUi($, (u) => ({ ...u, picker: "" }));
                      return kind === "model" ? setThreadModel($, t, c) : setThreadEffort($, t, c);
                    }),
                }),
              ),
              Button({ key: "pick:cancel", label: "Cancel", onPress: () => patchUi($, (u) => ({ ...u, picker: "" })) }),
            ],
          }),
        );
      }
      if (ui.armedClose?.id === t.id) right.push(Text({ color: "magenta", wrap: "truncate", children: clip("Press Close again within 10 seconds to close it.", rightW) }));
      if (ui.renaming && Input) {
        right.push(
          Input({
            key: "rename-input",
            label: "New name › ",
            placeholder: shortTitle(t.title),
            submitLabel: "rename",
            autoFocus: true,
            onSubmit: (value) =>
              noticeOf($, async () => {
                await patchUi($, (u) => ({ ...u, renaming: false }));
                return String(value ?? "").trim() ? renameThread($, t, value) : "Not renamed.";
              }),
          }),
        );
      }
      if (ui.steering && isLive) {
        if (Input) {
          right.push(
            Input({
              key: "steer-input",
              label: "Message › ",
              placeholder: "tell the thread what to change, Enter sends",
              submitLabel: "send",
              autoFocus: true,
              onSubmit: (value) => noticeOf($, () => steerFromPane($, t, value)),
            }),
          );
        } else {
          right.push(dim(`Use /threads send ${t.id} <message> to steer it.`, rightW));
        }
      }
      for (const line of String(ui.notice ?? "").split("\n").filter(Boolean).slice(0, 4)) {
        right.push(Text({ color: "green", wrap: "truncate", children: clip(line, rightW) }));
      }
      const isFresh = detail.id === t.id && detail.mode === ui.mode;
      const heading = ui.mode === "screen" ? (isInline ? "Live activity (last 30)" : "Screen (last 30 lines)") : "Transcript (last 20)";
      right.push(Text({ bold: true, children: heading }));
      if (!isFresh) right.push(dim("loading…", rightW));
      else if (detail.lines.length === 0) {
        right.push(dim(ui.mode === "screen" ? (isInline ? "(no activity seen yet)" : "(screen is empty or the thread is gone)") : "(nothing in the transcript yet)", rightW));
      }
      else for (const l of detail.lines) right.push(Text({ wrap: "truncate", dimColor: ui.mode === "screen", children: clip(l, rightW) }));
    }

    const head = Box({
      flexDirection: "row",
      gap: 1,
      children: [
        dim(`Threads · ${mine.length} yours${others.length ? ` · ${others.length} other` : ""} · ${clockOf(view.refreshedAt)}`, Math.max(20, width - 26)),
        Button({ key: "refresh", label: "r Refresh", hotkey: "r", onPress: () => refresh($, { force: true }) }),
        ...((view.plans ?? []).length
          ? [Button({ key: "plan-view", label: ui.planView ? "p Threads" : "p Plan", hotkey: "p", onPress: () => patchUi($, (u) => ({ ...u, planView: !u.planView })) })]
          : []),
        Button({ key: "close-pane", label: "c Close", hotkey: "c", role: "dismiss", onPress: () => $.ui.close({ id: PANE }) }),
      ],
    });
    // how to use the pane: clicking works everywhere; keys need the pane to hold the keyboard
    const hint = Text({
      dimColor: true,
      wrap: "wrap",
      children: isDesktop
        ? "Click a thread or any button. You can also ask in the chat: show, steer, fork, wait for or close threads."
        : "Click a thread or any button. Keys: ctrl+x then tab gives the pane the keyboard; the letter on each button is its key.",
    });
    const body = isWide
      ? Box({
          flexDirection: "row",
          gap: 2,
          children: [
            Box({ flexDirection: "column", width: leftW, children: tree }),
            Box({ flexDirection: "column", width: rightW, children: right }),
          ],
        })
      : Box({ flexDirection: "column", children: [...tree, Text({ children: " " }), ...right] });
    return Box({ flexDirection: "column", children: [head, hint, body] });
  });
}

// ---- setup ----------------------------------------------------------------------------------

async function registerTools($) {
  const idProp = { type: "string", description: "The thread's id (like t3f9a2) or the start of its title" };
  await $.tool.register({
    name: T_CREATE,
    description:
      "Create a thread: a real, separate Claude Code session on a chosen model that works on a task in the background, " +
      "which the user can watch (/threads) and you can steer and monitor. Use it when the user asks to spin up, start, or create " +
      "a thread, worker or session on a model (\"spin up a Haiku thread to triage the inbox\"). One call per thread. " +
      "By default the thread sends you a short report when it finishes or gets stuck; it reaches you as a cross-session message. " +
      "Models: haiku, sonnet, opus, fable, or a full claude-* id. Session threads run with bypassed permissions by default (they never stop for approval); pass permission_mode to change one, or /threads mode for all.",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", description: "haiku, sonnet, opus, fable, or a full model id" },
        title: { type: "string", description: "Short title, e.g. \"Haiku scout\"; shown as \"Thread | <title>\"" },
        task: { type: "string", description: "The thread's task, written as a complete first prompt" },
        cwd: { type: "string", description: "Folder to work in (default: this chat's folder). Must be a trusted folder." },
        permission_mode: { type: "string", enum: ["bypassPermissions", "default", "acceptEdits", "plan", "auto"], description: "Permission mode for a session thread (default bypassPermissions, or what /threads mode set). Inline threads use this chat's mode." },
        report_back: { type: "boolean", description: "Ask the thread to message a short report back to this chat (default true)" },
        effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"], description: "Reasoning effort (default: the model's)" },
        worktree: { type: "boolean", description: "Run it in its own git worktree and branch (the folder must be in a git repo), so parallel threads never edit the same files. Use when the user asks for isolation, a worktree or a separate branch, or when several threads will edit the same repo at once" },
        backend: {
          type: "string",
          enum: ["auto", "session", "inline"],
          description:
            "session: its own Claude Code process (needs the terminal CLI login; shows in the sidebar via Remote Control). inline: a background agent of this chat on this chat's login. auto (default): session when the CLI is logged in, else inline.",
        },
      },
      required: ["model", "title", "task"],
    },
  });
  await $.tool.register({
    name: T_LIST,
    description: "List the threads (Claude Code worker sessions) with their status, model, permission mode, est. API-equivalent cost, folder and latest output. Archived threads, and other chats' closed threads, are left out unless include_archived or include_closed.",
    inputSchema: { type: "object", properties: { include_archived: { type: "boolean" }, include_closed: { type: "boolean", description: "Also list other chats' closed threads" } } },
  });
  await $.tool.register({
    name: T_READ,
    description: "Read what a thread is doing: its transcript (prompts, replies, tool calls, errors) or its live terminal screen.",
    inputSchema: {
      type: "object",
      properties: {
        id: idProp,
        view: { type: "string", enum: ["transcript", "screen"], description: "transcript (default) or screen" },
        limit: { type: "number", description: "Items (transcript, default 20, max 60) or lines (screen, default 30, max 80)" },
      },
      required: ["id"],
    },
  });
  await $.tool.register({
    name: T_SEND,
    description:
      "Steer a thread. mode message (default) delivers a message the thread reads even mid-task; mode type types the text " +
      "into its prompt and presses Enter (use for slash commands); mode interrupt presses Escape to stop its current step.",
    inputSchema: {
      type: "object",
      properties: {
        id: idProp,
        message: { type: "string", description: "What to send or type (ignored for interrupt)" },
        mode: { type: "string", enum: ["message", "type", "interrupt"] },
      },
      required: ["id"],
    },
  });
  await $.tool.register({
    name: T_WAIT,
    description:
      "Wait for threads and return what changed plus their latest output. until idle (default) waits until every named " +
      "thread has finished its turn or needs the user; any_change returns at the first status or output change; needs_you " +
      "returns when one needs the user. Polls every 3 seconds, at most timeout_s (default 300, max 600).",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" }, description: "Thread ids or title prefixes; default: this chat's live threads" },
        until: { type: "string", enum: ["idle", "any_change", "needs_you"] },
        timeout_s: { type: "number", description: "Seconds, at most 600" },
      },
    },
  });
  await $.tool.register({
    name: T_PLAN,
    description:
      "Run a phase plan: phases run strictly one at a time, each as its own thread on its own model, and each ends by writing a " +
      "handoff file the next phase starts from. Use when the user wants a multi-step job split into phases on different models " +
      "(\"architect on opus, build on sonnet, test on haiku\"). gate decides who lets the next phase start: auto (at once), lead " +
      "(you review each phase and call threads_plan_advance; default) or user (/threads plan next). A phase's own gate overrides " +
      "the plan's for the step after it.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short plan title" },
        cwd: { type: "string", description: "Project folder (default: this chat's); must be trusted for session threads" },
        gate: { type: "string", enum: ["auto", "lead", "user"] },
        handoff_dir: { type: "string", description: "Where handoff files go (default <cwd>/handoff)" },
        backend: { type: "string", enum: ["auto", "session", "inline"], description: "Default auto: session when the terminal CLI is logged in" },
        keep_threads: { type: "boolean", description: "Keep every phase thread open until you close it (default false: an accepted phase's thread closes once the next phase is under way)" },
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              model: { type: "string", description: "haiku, sonnet, opus, fable or a full id" },
              effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"] },
              task: { type: "string", description: "The phase's task, complete" },
              acceptance: { type: "string", description: "How to check the phase is done" },
              permission_mode: { type: "string", enum: ["bypassPermissions", "default", "acceptEdits", "plan", "auto"], description: "Default bypassPermissions (or what /threads mode set)" },
              gate: { type: "string", enum: ["auto", "lead", "user"], description: "Gate after this phase (default: the plan's)" },
            },
            required: ["name", "model", "task"],
          },
        },
      },
      required: ["title", "phases"],
    },
  });
  await $.tool.register({
    name: T_ADVANCE,
    description:
      "Decide on a plan phase that waits for your review (a lead gate): approve starts the next phase; revise sends your feedback " +
      "to the same phase thread, which revises and hands off again. After two revisions a further revise marks the phase blocked.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        decision: { type: "string", enum: ["approve", "revise"] },
        feedback: { type: "string", description: "What to change (for revise)" },
      },
      required: ["planId", "decision"],
    },
  });
  await $.tool.register({
    name: T_SHOW,
    description:
      "Open the Threads pane next to this chat (the user sees every thread, its status, model, cost and live output, with buttons). Use it when the user asks to see, show or watch the threads, a thread or a plan. Optional id selects a thread; plan: true opens the plan view.",
    inputSchema: { type: "object", properties: { id: idProp, plan: { type: "boolean", description: "Open the plan view" } } },
  });
  await $.tool.register({
    name: T_OPEN,
    description: "Open a session thread as its own chat in the Claude desktop app (through Remote Control), for when the user wants to look at it or talk to it directly.",
    inputSchema: { type: "object", properties: { id: idProp }, required: ["id"] },
  });
  await $.tool.register({
    name: T_FORK,
    description:
      "Fork this chat: start a thread that already knows what this conversation established, then works on a new task (like forking a chat). include summary (default) passes a compact summary of goal, decisions, files and state; full gives it this conversation's transcript as a file to read. Use when the user says fork, branch off, or continue this in a new thread.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        task: { type: "string", description: "What the fork should do next" },
        model: { type: "string", description: "Default: this chat's model. Pass one only when the user names it: a fork reasons over a dense summary, and haiku misreads details more often than sonnet or opus" },
        effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"] },
        cwd: { type: "string" },
        include: { type: "string", enum: ["summary", "full"] },
        backend: { type: "string", enum: ["auto", "session", "inline"] },
        worktree: { type: "boolean", description: "Run it in its own git worktree and branch (the folder must be in a git repo), so parallel threads never edit the same files. Use when the user asks for isolation, a worktree or a separate branch, or when several threads will edit the same repo at once" },
      },
      required: ["title", "task"],
    },
  });
  await $.tool.register({
    name: T_HANDOFF,
    description:
      "Hand this chat's work off to a thread: it starts knowing what this conversation established and carries on with the work in progress, then reports back, so this chat is free (like Codex's handoff). Use when the user says hand this off, hand it over, let a thread finish this, or keep going in the background. next names the first step; leave it out to continue with the next steps the conversation named.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        next: { type: "string", description: "The first thing the thread should do (default: carry on where this conversation left off)" },
        model: { type: "string", description: "Default: this chat's model" },
        effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"] },
        cwd: { type: "string" },
        include: { type: "string", enum: ["summary", "full"] },
        backend: { type: "string", enum: ["auto", "session", "inline"] },
        worktree: { type: "boolean", description: "Run it in its own git worktree and branch (the folder must be in a git repo), so parallel threads never edit the same files. Use when the user asks for isolation, a worktree or a separate branch, or when several threads will edit the same repo at once" },
      },
      required: ["title"],
    },
  });
  await $.tool.register({
    name: T_RENAME,
    description: "Rename a thread (shown as \"Thread | <title>\" in the pane, the list and, for an idle session thread, its session name). Use when the user asks to rename or retitle a thread.",
    inputSchema: { type: "object", properties: { id: idProp, title: { type: "string", description: "The new name" } }, required: ["id", "title"] },
  });
  await $.tool.register({
    name: T_MARK_READ,
    description: "Mark a thread's new output as read (id), or every thread of this chat (all: true or no id). Threads with a report the user has not looked at show as new in the pane, the list and the band.",
    inputSchema: { type: "object", properties: { id: idProp, all: { type: "boolean" } } },
  });
  await $.tool.register({
    name: T_ADOPT,
    description: "Adopt threads whose lead chat is gone (orphans): this chat becomes their lead, gets their reports and can steer them. ids names them, or all: true adopts every orphan. threads_setup lists orphans.",
    inputSchema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } }, all: { type: "boolean" } } },
  });
  await $.tool.register({
    name: T_HISTORY,
    description: "Plan history: with no planId, lists saved plans (title, status, phases, cost); with a planId, shows that plan's full record (phases, models, threads, handoffs, gate decisions, timing, cost).",
    inputSchema: { type: "object", properties: { planId: { type: "string" } } },
  });
  await $.tool.register({
    name: T_PIN,
    description: "Pin a thread (pinned: true, default) so it stays on top and is never cleaned up or idle-closed; pinned: false unpins.",
    inputSchema: { type: "object", properties: { id: idProp, pinned: { type: "boolean" } }, required: ["id"] },
  });
  await $.tool.register({
    name: T_ARCHIVE,
    description: "Archive a thread (archived: true, default) to hide it from the pane and threads_list; archived: false brings it back.",
    inputSchema: { type: "object", properties: { id: idProp, archived: { type: "boolean" } }, required: ["id"] },
  });
  await $.tool.register({
    name: T_SETUP,
    description:
      "Check what threads need and say exactly what to fix: the terminal CLI login (session threads), tmux, whether this folder is trusted, the live-thread cap and stale threads, the default permission mode and how the mod is loaded. " +
      "Use it when the user asks to set up or check threads, or when creating a thread failed. Set close_stale: true only when the user explicitly asked to close the stale threads it lists.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: { type: "string", description: "Folder to check for trust (default: this chat's)" },
        close_stale: { type: "boolean", description: "Close the stale threads found (only when the user asked)" },
      },
    },
  });
  await $.tool.register({
    name: T_CLOSE,
    description:
      "Close a thread (or every thread of a plan with all_of_plan): ends its Claude Code process; the transcript is kept and can be resumed. " +
      "Set confirmed: true ONLY when the user explicitly asked in plain words to close that thread, those threads or that plan's threads; then it closes without a dialog. " +
      "Otherwise leave it out: a confirmation dialog is shown, and if none can be shown the result tells you to ask the user in chat first.",
    inputSchema: {
      type: "object",
      properties: {
        id: idProp,
        all_of_plan: { type: "string", description: "A plan id: close every open thread of that plan instead of one thread" },
        confirmed: { type: "boolean", description: "True only when the user explicitly asked to close it in plain words" },
      },
    },
  });
}

function startTicker($) {
  if (ticker) return;
  ticker = $.clock.every(TICK_MS, () => {
    void tick($);
  });
}

async function tick($) {
  if (inflight) return;
  const { value: view = EMPTY_VIEW } = await $.state.get(VIEW);
  const now = await $.clock.now();
  const isOpen = (await $.ui.panes()).some((p) => p.id === PANE);
  const anyWorking = view.threads.some((t) => t.status === "working" || t.status === "starting");
  const hasMine = view.threads.some((t) => t.isMine && LIVE.has(t.status));
  let due = 0;
  if (isOpen && anyWorking) due = FAST_MS;
  else if (isOpen || hasMine) due = SLOW_MS;
  if (!due || now - view.refreshedAt < due - 200) return;
  await refresh($);
}

// ---- paths and small host calls -----------------------------------------------------------------

async function paths($) {
  const home = (await $.env.get("HOME")) ?? "";
  const configEnv = await $.env.get("CLAUDE_CONFIG_DIR");
  const config = configEnv || `${home}/.claude`;
  return {
    home,
    config,
    dir: `${config}/threads`,
    registry: `${config}/threads/registry.json`,
    events: `${config}/threads/events.jsonl`,
    sessions: `${config}/sessions`,
    projects: `${config}/projects`,
    claudeJson: configEnv ? `${configEnv}/.claude.json` : `${home}/.claude.json`,
  };
}

async function run($, argv, timeoutMs = 10000, stdin = undefined) {
  try {
    const init = stdin === undefined ? { timeoutMs } : { timeoutMs, stdin };
    return await $.process.run(argv, init);
  } catch (err) {
    return { exitCode: 127, stdout: "", stderr: String(err?.message ?? err) };
  }
}

async function ensureDir($, p) {
  if (dirReady) return;
  await run($, ["mkdir", "-p", p.dir]);
  dirReady = true;
}

async function logEvent($, p, type, data) {
  await ensureDir($, p);
  const now = await $.clock.now();
  const line = JSON.stringify({ at: new Date(now).toISOString(), ts: now, type, ...data });
  await run($, ["tee", "-a", p.events], 5000, `${line}\n`);
}

async function loadRegistry($, p) {
  let text = null;
  try {
    if (await $.fs.exists(p.registry)) text = await $.fs.read(p.registry);
  } catch {
    text = null;
  }
  const parsed = parseRegistry(text);
  if (parsed.isCorrupt) {
    const now = await $.clock.now();
    const backup = `${p.registry}.corrupt-${now}`;
    await run($, ["mv", "-f", p.registry, backup]);
    await logEvent($, p, "registry-reset", { backup });
    $.ui.toast(`Threads: the registry did not parse; backed up to ${shortPath(backup, 60)} and started fresh.`, { timeoutMs: 8000 });
  }
  return parsed.registry;
}

async function saveRegistry($, p, reg) {
  await ensureDir($, p);
  const now = await $.clock.now();
  const tmp = `${p.registry}.tmp-${now}-${Math.floor(Math.random() * 1e6)}`;
  await $.fs.write(tmp, serializeRegistry(reg));
  const moved = await run($, ["mv", "-f", tmp, p.registry]);
  if (moved.exitCode !== 0) {
    await $.fs.write(p.registry, serializeRegistry(reg));
    await run($, ["rm", "-f", tmp]);
  }
}

// Read, change, write. Writes from this process run one at a time (the watcher, a refresh and a
// report can overlap); two chats writing at the same moment can still collide, rarely.
// Across processes (several chats share the file), a lock directory: mkdir is atomic, so only one
// chat holds <registry>.lock at a time; a lock older than 15 s is taken as stale and removed.
let registryLock = Promise.resolve();
async function mutateRegistry($, p, change) {
  const turn = registryLock.then(async () => {
    const held = await lockRegistry($, p);
    try {
      const reg = await loadRegistry($, p);
      const out = change(reg) ?? reg;
      await saveRegistry($, p, out);
      return out;
    } finally {
      if (held) await run($, ["rmdir", `${p.registry}.lock`], 3000);
    }
  });
  registryLock = turn.catch(() => undefined);
  return turn;
}

async function lockRegistry($, p) {
  await ensureDir($, p);
  const lock = `${p.registry}.lock`;
  for (let i = 0; i < 40; i++) {
    const r = await run($, ["mkdir", lock], 3000);
    if (r.exitCode === 0) return true;
    if (i === 0 || i % 10 === 9) {
      try {
        const st = await $.fs.stat(lock);
        if (st.kind === "dir" && (await $.clock.now()) - st.mtimeMs > 15000) await run($, ["rmdir", lock], 3000);
      } catch {
        // gone already
      }
    }
    await run($, ["sleep", "0.05"], 3000);
  }
  // could not get it in ~2 s: write anyway rather than lose the change
  return false;
}

async function patchThread($, p, id, patch) {
  await mutateRegistry($, p, (reg) => {
    reg.threads = reg.threads.map((t) => (t.id === id ? { ...t, ...patch } : t));
    return reg;
  });
}

// `claude auth status` answers JSON (and exits 1 when logged out). Cached two minutes.
async function authStatus($) {
  const now = await $.clock.now();
  const { value: cached } = await $.state.get(AUTH);
  if (cached && cached.at && now - cached.at < AUTH_TTL_MS && now >= cached.at) return cached;
  const r = await run($, ["claude", "auth", "status"], 20000);
  let loggedIn = false;
  let detail = "";
  try {
    const data = JSON.parse(r.stdout);
    loggedIn = data.loggedIn === true;
    detail = loggedIn ? `${data.authMethod ?? ""}` : `not logged in, auth method ${data.authMethod ?? "none"}`;
  } catch {
    detail = r.exitCode === 127 ? `could not run claude (${clip(r.stderr, 120)})` : clip(oneLine(r.stdout || r.stderr), 160);
  }
  const fresh = { at: now, loggedIn, detail };
  await $.state.set(AUTH, fresh);
  return fresh;
}

async function newUuid($) {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID().toLowerCase();
  const r = await run($, ["uuidgen"]);
  return oneLine(r.stdout).toLowerCase();
}

async function scanSessions($, p) {
  const out = new Map();
  let entries = [];
  try {
    entries = await $.fs.list(p.sessions);
  } catch {
    entries = [];
  }
  for (const entry of entries.slice(0, 400)) {
    if (entry.kind !== "file" || !/^\d+\.json$/.test(entry.name)) continue;
    try {
      const raw = JSON.parse(await $.fs.read(`${p.sessions}/${entry.name}`));
      if (typeof raw.sessionId === "string" && typeof raw.pid === "number") out.set(raw.sessionId, raw);
    } catch {
      // mid-write or not ours
    }
  }
  return out;
}

async function pidsAlive($, pids) {
  if (pids.length === 0) return new Set();
  const r = await run($, ["ps", "-o", "pid=", "-p", pids.join(",")], 5000);
  if (r.exitCode === 127) return null;
  return new Set(r.stdout.split(/\s+/).filter(Boolean).map(Number));
}

async function livePanes($) {
  const r = await run($, tmuxArgv("list-panes", "-a", "-F", PANE_FORMAT), 5000);
  if (r.exitCode !== 0) return new Map();
  return parsePanes(r.stdout);
}

async function capture($, name, joined) {
  const argv = joined ? tmuxArgv("capture-pane", "-p", "-J", "-t", name) : tmuxArgv("capture-pane", "-p", "-t", name);
  const r = await run($, argv, 5000);
  return r.exitCode === 0 ? r.stdout : "";
}

async function transcriptTail($, p, t, bytes = TAIL_BYTES) {
  const r = await run($, ["tail", "-c", bytes, `${p.projects}/${slug(t.cwd)}/${t.sessionId}.jsonl`], 5000);
  return r.exitCode === 0 ? r.stdout : "";
}

async function leadInfo($, p, sessions) {
  const selfId = await $.session.id();
  const map = sessions ?? (await scanSessions($, p));
  const me = map.get(selfId);
  const title = (me && typeof me.name === "string" && me.name) || `chat ${selfId.slice(0, 8)}`;
  return { selfId, title, socket: me?.messagingSocketPath ?? "", pid: me?.pid ?? 0 };
}

// ---- refresh ---------------------------------------------------------------------------------------

async function refresh($, opts = {}) {
  if (inflight) {
    await inflight.catch(() => undefined);
    if (!opts.force) return;
  }
  inflight = doRefresh($);
  try {
    await inflight;
  } finally {
    inflight = null;
  }
}

// Which threads drive desktop apps through the codex-computer-use mod: its daemon keeps one
// Codex session per Claude session (and per subagent, "<session>/<agent>") and leases each app
// to one of them. Map of caller key -> { apps, busy }; empty when the daemon is not running.
let desktopCache = { at: 0, map: new Map() };
async function desktopUsers($, p) {
  const now = Date.now();
  if (now - desktopCache.at < 3000) return desktopCache.map;
  const socketPath = `${p.home}/.claude/mcp/codex-cu/daemon.sock`;
  let map = new Map();
  try {
    if (await $.fs.exists(socketPath)) {
      const res = await $.http.fetch("http://codex-cu/sessions", { socketPath });
      if (res.ok) for (const u of JSON.parse(res.text)) map.set(u.session, { apps: u.leases ?? [], busy: u.busy === true });
    }
  } catch {
    map = new Map();
  }
  desktopCache = { at: now, map };
  return map;
}

// A closed thread's process is killed before its own session.end hook can free its Codex
// computer-use session, so tell the daemon directly (no-op when it is not running).
async function releaseDesktop($, p, t) {
  const socketPath = `${p.home}/.claude/mcp/codex-cu/daemon.sock`;
  const session = t.backend === "inline" ? `${t.parent?.sessionId ?? ""}/${t.agentId}` : t.sessionId;
  if (!session || !(await $.fs.exists(socketPath))) return;
  try {
    await $.http.fetch("http://codex-cu/end", { method: "POST", socketPath, body: JSON.stringify({ session }) });
    desktopCache.at = 0;
  } catch {
    // daemon gone: nothing to free
  }
}

function desktopOf(desk, t, leadId) {
  const key = t.backend === "inline" ? `${t.parent?.sessionId ?? leadId}/${t.agentId}` : t.sessionId;
  const hit = key ? desk.get(key) : undefined;
  return hit && hit.apps.length ? hit.apps : [];
}

async function doRefresh($) {
  const p = await paths($);
  const reg = await loadRegistry($, p);
  const desk = await desktopUsers($, p);
  const panes = await livePanes($);
  const sessions = await scanSessions($, p);
  const lead = await leadInfo($, p, sessions);
  const ours = reg.threads.map((t) => sessions.get(t.sessionId)).filter(Boolean);
  const alive = await pidsAlive($, ours.map((s) => s.pid));
  const now = await $.clock.now();
  const { value: ui = EMPTY_UI } = await $.state.get(UI);

  const patches = new Map();
  const rows = [];
  // inline threads: this chat's agents, what the hooks saw, and whether other leads still run
  const hasInline = reg.threads.some((t) => t.backend === "inline" && t.status !== "closed");
  let agents = new Map();
  if (hasInline) {
    try {
      agents = new Map((await $.agent.list()).map((a) => [a.id, a]));
    } catch {
      agents = new Map();
    }
  }
  const { value: metaAll = {} } = await $.state.get(AGENTS);
  const { value: feed = {} } = await $.state.get(ACTIVITY);
  const { value: inlineMap = {} } = await $.state.get(INLINE);
  const leadPids = await pidsAlive($, [...sessions.values()].map((x) => x.pid));
  const liveLeads = new Set([...sessions.values()].filter((x) => !leadPids || leadPids.has(x.pid)).map((x) => x.sessionId));
  let inlineMapChanged = false;
  const nextMap = { ...inlineMap };
  for (const t of reg.threads) {
    if (t.backend === "inline") {
      const isMine = t.parent?.sessionId === lead.selfId;
      if (isMine && t.agentId && LIVE.has(t.status) && nextMap[t.agentId] !== t.id) {
        nextMap[t.agentId] = t.id;
        inlineMapChanged = true;
      }
      const meta = metaAll[t.agentId] ?? null;
      const status = statusOfInline({
        previous: t.status,
        isMine,
        agent: agents.get(t.agentId) ?? null,
        meta,
        leadAlive: liveLeads.has(t.parent?.sessionId),
        now,
        createdAt: t.createdAt,
      });
      const items = feed[t.id] ?? [];
      const last = [...items].reverse().find((x) => x.kind !== "step" && x.kind !== "done") ?? items[items.length - 1];
      const patch = {};
      if (status !== t.status) {
        patch.status = status;
        if (status === "exited") patch.endedAt = now;
      }
      // only a full model id counts as verified, never the alias the spawn echoed
      if (meta?.model && meta.model !== t.verifiedModel && /^claude-/.test(meta.model)) patch.verifiedModel = meta.model;
      if (meta?.costUsd !== undefined && Math.abs(meta.costUsd - (t.costUsd ?? 0)) >= 0.0005) patch.costUsd = Number(meta.costUsd.toFixed(5));
      if (Object.keys(patch).length && (isMine || patch.status === "exited")) patches.set(t.id, { patch, from: t });
      rows.push({
        ...t,
        ...patch,
        isMine,
        lastLine: meta?.partial ? `says  ${meta.partial}` : last ? itemLine(last) : "",
        lastKind: last?.kind === "done" ? "assistant" : last?.kind ?? "",
        prompt: meta?.needsYou ? (last?.kind === "wait" ? last.text : "a permission prompt in this chat") : "",
        desktop: desktopOf(desk, t, lead.selfId),
      });
      continue;
    }
    const pane = panes.get(t.tmux);
    const sess = sessions.get(t.sessionId) ?? null;
    let status = t.status;
    let screen = null;
    let lastLine = "";
    let lastKind = "";
    let verified = t.verifiedModel ?? "";
    if (t.status !== "closed") {
      if (pane && !pane.isDead) screen = readScreen(await capture($, t.tmux, false));
      status = statusOf({
        previous: t.status,
        tmux: { isLive: Boolean(pane), isDead: Boolean(pane?.isDead) },
        session: sess,
        pidAlive: sess && alive ? alive.has(sess.pid) : undefined,
        screen,
        now,
        createdAt: t.createdAt,
      });
      if (pane || !verified) {
        const parsed = parseTranscript(await transcriptTail($, p, t, "131072"));
        if (parsed.model) verified = parsed.model;
        const last = parsed.items[parsed.items.length - 1];
        if (last) {
          lastLine = itemLine(last);
          lastKind = last.kind;
        }
      }
    }
    const patch = {};
    if (status !== t.status) {
      patch.status = status;
      if (status === "exited") patch.endedAt = now;
    }
    if (verified && verified !== t.verifiedModel) patch.verifiedModel = verified;
    if (t.status !== "closed" || t.costUsd === undefined) {
      const usd = await sessionCost($, p, t);
      if (usd !== null && Math.abs(usd - (t.costUsd ?? 0)) >= 0.0005) patch.costUsd = Number(usd.toFixed(5));
    }
    if (sess) {
      if (sess.pid && sess.pid !== t.pid) patch.pid = sess.pid;
      if (sess.messagingSocketPath && sess.messagingSocketPath !== t.socket) patch.socket = sess.messagingSocketPath;
      if (sess.bridgeSessionId && sess.bridgeSessionId !== t.bridgeSessionId) patch.bridgeSessionId = sess.bridgeSessionId;
    }
    // only the chat that owns a thread writes its changes; the others just show them
    if (Object.keys(patch).length && (t.parent?.sessionId === lead.selfId || !liveLeads.has(t.parent?.sessionId))) patches.set(t.id, { patch, from: t });
    rows.push({
      ...t,
      ...patch,
      isMine: t.parent?.sessionId === lead.selfId,
      lastLine,
      lastKind,
      prompt: screen?.prompt ?? "",
      desktop: desktopOf(desk, t, lead.selfId),
    });
  }

  if (inlineMapChanged) await $.state.set(INLINE, nextMap);
  if (patches.size > 0) {
    await mutateRegistry($, p, (fresh) => {
      fresh.threads = fresh.threads.map((t) => (patches.has(t.id) ? { ...t, ...patches.get(t.id).patch } : t));
      return fresh;
    });
    for (const [id, { patch, from }] of patches) {
      if (patch.status) await logEvent($, p, "status", { id, from: from.status, to: patch.status });
      if (patch.verifiedModel) await logEvent($, p, "model-verified", { id, model: patch.verifiedModel });
      if (patch.bridgeSessionId) await logEvent($, p, "remote-control", { id, bridgeSessionId: patch.bridgeSessionId });
    }
  }

  // yours first, in the order they were made (so hotkeys stay put), then the rest
  rows.sort((a, b) => Number(b.isMine) - Number(a.isMine) || (a.isMine ? 0 : Number(LIVE.has(b.status)) - Number(LIVE.has(a.status))) || a.createdAt - b.createdAt);
  const plans = (reg.plans ?? []).filter((pl) => pl.lead?.sessionId === lead.selfId);
  await $.state.set(VIEW, { threads: rows, plans, selfId: lead.selfId, leadTitle: lead.title, refreshedAt: now, cap: reg.cap });

  // the selected thread's live view, only while the pane is up
  const isOpen = (await $.ui.panes()).some((x) => x.id === PANE);
  if (isOpen) {
    const pool = [...rows.filter((r) => r.isMine), ...(ui.showOthers ? rows.filter((r) => !r.isMine) : [])];
    const sel = pool.find((r) => r.id === ui.selected) ?? pool[0];
    if (sel) {
      const lines =
        sel.backend === "inline"
          ? ui.mode === "screen"
            ? await activityLines($, sel, 30)
            : await transcriptLines($, p, sel, 20)
          : ui.mode === "screen"
            ? screenLines(await capture($, sel.tmux, true), 30)
            : await transcriptLines($, p, sel, 20);
      await $.state.set(DETAIL, { id: sel.id, mode: ui.mode, lines, at: now });
    }
  }
  return rows;
}

async function transcriptLines($, p, t, n) {
  if (t.backend === "inline") {
    let rows = [];
    try {
      rows = t.agentId ? await $.session.messages({ agentId: t.agentId }) : [];
    } catch {
      rows = [];
    }
    const items = messagesToItems(rows);
    // the agent's own record is gone once this chat ends; fall back to what the hooks saw
    if (items.length === 0) return activityLines($, t, n);
    return items.slice(-n).map(itemLine);
  }
  const parsed = parseTranscript(await transcriptTail($, p, t));
  return parsed.items.slice(-n).map(itemLine);
}

// A thread's newest answer, whole (up to ANSWER_MAX), not a one-line snippet.
async function latestAnswer($, p, t) {
  if (t.backend === "inline") {
    let rows = [];
    try {
      rows = t.agentId ? await $.session.messages({ agentId: t.agentId }) : [];
    } catch {
      rows = [];
    }
    const last = [...rows].reverse().find((m) => m.role === "assistant" && String(m.text ?? "").trim());
    const text = last ? String(last.text).trim() : t.lastReport?.text ?? "";
    return clip(text, ANSWER_MAX);
  }
  const parsed = parseTranscript(await transcriptTail($, p, t));
  return clip(parsed.lastAnswer?.text ?? t.lastReport?.text ?? "", ANSWER_MAX);
}

// The live activity feed of an inline thread (tool calls, model requests, answers), newest last.
async function activityLines($, t, n) {
  const { value: feed = {} } = await $.state.get(ACTIVITY);
  const { value: metaAll = {} } = await $.state.get(AGENTS);
  const lines = (feed[t.id] ?? []).slice(-n).map(activityLine);
  const partial = metaAll[t.agentId]?.partial;
  if (partial) lines.push(`…     ${partial}`);
  return lines;
}

async function viewThreads($) {
  const { value: view = EMPTY_VIEW } = await $.state.get(VIEW);
  return view;
}

async function findThread($, ref, opts = {}) {
  const view = await viewThreads($);
  const pool = opts.includeArchived ? view.threads : view.threads.filter((t) => !t.archived);
  const hit = resolveRef(pool, ref);
  // an archived thread named exactly by id is still found
  if (hit.error && !opts.includeArchived) {
    const exact = view.threads.find((t) => t.id === String(ref ?? "").trim().toLowerCase());
    if (exact) return { thread: exact };
  }
  return hit;
}

// ---- creating -----------------------------------------------------------------------------------------

async function createThread($, input) {
  const m = normalizeModel(input.model);
  if (m.error) return { error: m.error };
  const title = threadTitle(input.title);
  if (!title) return { error: "A thread needs a title." };
  const task = String(input.task ?? "").trim();
  if (!task) return { error: "A thread needs a task." };
  const mode = checkMode(input.permissionMode);
  if (mode.error) return { error: mode.error };
  const eff = checkEffort(input.effort);
  if (eff.error) return { error: eff.error };
  const extra = input.extra ?? {};
  const permissionMode = mode.mode ?? (await defaultMode($));
  const setupNote = input.extra?.planId ? "" : await setupOnFirstUse($);
  const made = await createThreadChecked($, input, { m, title, task, mode, eff, extra, permissionMode });
  if (!setupNote) return made;
  return made.error ? { error: `${made.error}\n${setupNote}` } : { ...made, text: `${made.text}\n${setupNote}` };
}

async function createThreadChecked($, input, { m, title, task, mode, eff, extra, permissionMode }) {
  const requested = String(input.backend ?? "auto").toLowerCase();
  if (!["auto", "session", "inline"].includes(requested)) return { error: `Unknown backend "${input.backend}". Use auto, session or inline.` };

  const p = await paths($);
  const here = await $.session.cwd();
  let cwd = String(input.cwd ?? "").trim() || here;
  if (cwd === "~" || cwd.startsWith("~/")) cwd = `${p.home}${cwd.slice(1)}`;
  if (!cwd.startsWith("/")) cwd = `${here}/${cwd}`;
  let st = null;
  try {
    st = await $.fs.stat(cwd, { resolve: true });
  } catch {
    st = null;
  }
  if (!st || st.kind !== "dir") return { error: `Folder not found: ${cwd}` };
  const real = st.realPath || cwd;
  let repo = "";
  if (input.worktree) {
    const top = await run($, ["git", "-C", real, "rev-parse", "--show-toplevel"], 5000);
    if (top.exitCode !== 0) return { error: `A worktree thread needs a git repository, and ${real} is not inside one. Leave worktree off, or point cwd at a repo.` };
    repo = top.stdout.trim();
    const head = await run($, ["git", "-C", repo, "rev-parse", "HEAD"], 5000);
    if (head.exitCode !== 0) return { error: `${repo} has no commits yet, so there is nothing to branch a worktree from. Make a first commit, or leave worktree off.` };
    input = { ...input, worktreeBase: head.stdout.trim() };
  }

  // auto: a real session when the terminal login works, else an inline subagent
  let backend = requested;
  let authNote = "";
  if (requested !== "inline") {
    const auth = await authStatus($);
    const chosen = chooseBackend(requested, auth.loggedIn);
    backend = chosen.backend;
    if (backend === "session" && !auth.loggedIn) {
      return { error: `${LOGIN_HINT} (claude auth status says ${auth.detail || "not logged in"}). Or use an inline thread (--inline, backend inline), which runs inside this chat.` };
    }
    if (chosen.isAuto) authNote = auth.loggedIn ? "auto picked a session because the terminal login works" : "auto picked inline because the terminal CLI is not logged in";
  }
  if (backend === "inline") return createInline($, p, { model: m.model, title, task, cwd: real, here, reportBack: input.reportBack !== false, mode: mode.mode, authNote, effort: eff.effort, extra, context: input.context, repo, base: input.worktreeBase });

  let claudeJson = "";
  try {
    claudeJson = await $.fs.read(p.claudeJson);
  } catch {
    claudeJson = "";
  }
  if (!isTrusted(claudeJson, real) && !isTrusted(claudeJson, cwd)) {
    return {
      error: `${real} is not a trusted folder. Open Claude Code there once (cd '${real}' && claude) and accept the trust prompt, then try again. Threads never accept trust for you.`,
    };
  }

  const reg = await loadRegistry($, p);
  const live = await liveCount($, reg);
  if (live.length >= reg.cap) {
    return {
      error: `${live.length} threads are already live and the cap is ${reg.cap}. Close one (/threads close <id>) or raise the cap (/threads cap <n>).`,
    };
  }

  const sessions = await scanSessions($, p);
  const lead = await leadInfo($, p, sessions);
  const sessionId = await newUuid($);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)) {
    return { error: `Could not make a session id (got "${clip(sessionId, 40)}").` };
  }
  const id = shortId(sessionId, new Set(reg.threads.map((t) => t.id)));
  const name = tmuxName(id);
  const reportBack = input.reportBack !== false;
  const wt = repo ? { ...worktreeFor(repo, id), base: input.worktreeBase, launchCwd: real } : null;
  const workCwd = wt ? wt.path : real;
  const brief = buildBrief({ title, leadTitle: lead.title, leadId: lead.selfId, task, cwd: workCwd, reportBack, leadSocket: lead.socket, context: input.context, worktree: wt });
  const argv = buildSpawnArgv({ name, cwd: real, model: m.model, sessionId, title, permissionMode, brief, task, effort: eff.effort, worktree: wt?.name });
  const started = await run($, argv, 15000);
  if (started.exitCode !== 0) {
    return { error: `tmux could not start the thread: ${clip(oneLine(started.stderr || started.stdout), 300)}` };
  }

  const now = await $.clock.now();
  const entry = {
    id,
    backend: "session",
    agentId: "",
    resolvedModel: "",
    effort: eff.effort ?? "",
    title,
    requestedModel: m.model,
    verifiedModel: "",
    sessionId,
    tmux: name,
    // a worktree thread's transcript is filed under the worktree folder it runs in
    cwd: workCwd,
    ...(wt ? { worktree: wt } : {}),
    permissionMode,
    reportBack,
    parent: { sessionId: lead.selfId, title: lead.title, socket: lead.socket },
    task,
    createdAt: now,
    status: "starting",
    lastReport: null,
    bridgeSessionId: "",
    closedAt: 0,
    pid: 0,
    socket: "",
    ...extra,
  };
  await mutateRegistry($, p, (fresh) => {
    fresh.threads.push(entry);
    return fresh;
  });
  await logEvent($, p, "created", {
    id,
    effort: eff.effort ?? "",
    title,
    model: m.model,
    sessionId,
    tmux: name,
    cwd: real,
    permissionMode: entry.permissionMode,
    reportBack,
    lead: lead.selfId,
  });

  const early = await settle($, p, entry);
  await refresh($, { force: true });
  await startWatcher($);
  await patchUi($, (u) => (u.selected ? u : { ...u, selected: id }));

  const lines = [`Created ${title} (${id}) on ${m.model}${eff.effort ? ` (effort ${eff.effort})` : ""} in ${workCwd} as its own Claude Code session, permission mode ${permissionMode}.`];
  if (wt) lines.push(`It works in its own git worktree on branch ${wt.branch}, so it cannot clash with other threads. When it closes, an unchanged worktree is removed; one with work is kept for you to merge.`);
  if (authNote) lines.push(`Backend: ${authNote}.`);
  if (early.status === "needs-login") lines.push(`It is stuck on the login screen. ${LOGIN_HINT}`);
  else if (early.status === "needs-trust") lines.push("It is stuck on the folder trust prompt.");
  else if (early.status === "exited") lines.push(`It exited right away: ${clip(early.screen, 300) || "no output"}`);
  else if (early.isRegistered) lines.push("It is running.");
  else lines.push("It is starting.");
  if (reportBack && !lead.socket) lines.push("This chat's messaging address was not found, so the thread cannot report back; watch it with /threads.");
  else if (reportBack) lines.push("It will message a short report back here when it finishes or gets stuck.");
  lines.push(`Watch: /threads · Steer: /threads send ${id} <message> · Close: /threads close ${id}`);
  return { text: lines.join("\n"), id };
}

// Live threads of both kinds, for the cap.
// Not counted: closed or exited threads, and threads of other chats whose lead process is gone.
async function liveCount($, reg) {
  const panes = await livePanes($);
  const { value: view = EMPTY_VIEW } = await $.state.get(VIEW);
  const statusOf = new Map(view.threads.map((t) => [t.id, t.status]));
  const p = await paths($);
  const sessions = await scanSessions($, p);
  const alive = await pidsAlive($, [...sessions.values()].map((x) => x.pid));
  const liveLeads = new Set([...sessions.values()].filter((x) => !alive || alive.has(x.pid)).map((x) => x.sessionId));
  const selfId = await $.session.id();
  return reg.threads.filter((t) => {
    if (t.status === "closed" || t.status === "exited") return false;
    if (t.parent?.sessionId !== selfId && !liveLeads.has(t.parent?.sessionId)) return false;
    if (t.backend === "inline") return LIVE.has(statusOf.get(t.id) ?? t.status);
    return panes.has(t.tmux) && !panes.get(t.tmux).isDead;
  });
}

// An inline thread: a background subagent of this chat, on this chat's own login.
async function createInline($, p, { model, title, task, cwd, here, reportBack, mode, authNote, effort, extra = {}, context, repo = "", base = "" }) {
  const reg = await loadRegistry($, p);
  const live = await liveCount($, reg);
  if (live.length >= reg.cap) {
    return { error: `${live.length} threads are already live and the cap is ${reg.cap}. Close one (/threads close <id>) or raise the cap (/threads cap <n>).` };
  }
  const sessions = await scanSessions($, p);
  const lead = await leadInfo($, p, sessions);
  const seed = await newUuid($);
  const id = shortId(seed, new Set(reg.threads.map((t) => t.id)));
  // an inline agent cannot take --worktree, so the worktree is made here, in the same place Claude Code would
  let wt = null;
  if (repo) {
    wt = { ...worktreeFor(repo, id), base, launchCwd: cwd };
    await run($, ["mkdir", "-p", `${repo}/.claude/worktrees`]);
    const added = await run($, ["git", "-C", repo, "worktree", "add", "-b", wt.branch, wt.path, base], 20000);
    if (added.exitCode !== 0) return { error: `Could not make the worktree: ${clip(oneLine(added.stderr || added.stdout), 300)}` };
    cwd = wt.path;
  }
  const prompt = buildInlinePrompt({ title, leadTitle: lead.title, task, cwd, reportBack, context, worktree: wt });
  const args = { prompt, model, name: agentName(id), description: title, subagentType: "general-purpose" };
  if (cwd !== here) args.cwd = cwd;
  pendingInline.set(args.name, { id, effort: effort ?? "" });
  let spawned;
  try {
    spawned = await $.agent.spawn(args);
  } catch (err) {
    spawned = { deny: String(err?.message ?? err) };
  }
  if (spawned.deny !== undefined) {
    pendingInline.delete(args.name);
    if (wt) await removeWorktree($, wt);
    return { error: `The inline thread did not start: ${spawned.deny}` };
  }
  if (!spawned.agentId) {
    // no id on the answer: find the agent by the name it was given
    try {
      const hit = (await $.agent.list()).find((a) => a.name === args.name);
      if (hit) spawned = { ...spawned, agentId: hit.id };
    } catch {
      // keep going without it
    }
  }
  pendingInline.delete(args.name);
  if (!spawned.agentId) return { error: "The inline thread did not start: no agent id came back and no agent carries its name." };
  const now = await $.clock.now();
  const entry = {
    id,
    backend: "inline",
    agentId: spawned.agentId,
    resolvedModel: spawned.model ?? "",
    effort: effort ?? "",
    title,
    requestedModel: model,
    verifiedModel: "",
    sessionId: "",
    tmux: "",
    cwd,
    ...(wt ? { worktree: wt } : {}),
    permissionMode: "inherited",
    reportBack,
    parent: { sessionId: lead.selfId, title: lead.title, socket: lead.socket },
    task,
    createdAt: now,
    status: "working",
    lastReport: null,
    bridgeSessionId: "",
    closedAt: 0,
    pid: 0,
    socket: "",
    ...extra,
  };
  await update($, INLINE, (map) => ({ ...(map ?? {}), [spawned.agentId]: id }));
  await noteActivity($, id, spawned.agentId, { kind: "step", text: `started on ${spawned.model ?? model}`, at: now }, { status: "working", lastAt: now, ...(effort ? { effort } : {}) });
  await mutateRegistry($, p, (fresh) => {
    fresh.threads.push(entry);
    return fresh;
  });
  await logEvent($, p, "created", { id, backend: "inline", title, model, resolvedModel: spawned.model ?? "", agentId: spawned.agentId, cwd, lead: lead.selfId });
  await refresh($, { force: true });
  await patchUi($, (u) => (u.selected ? u : { ...u, selected: id }));
  const lines = [
    `Created ${title} (${id}) inline on ${spawned.model ?? model}${effort ? ` (effort ${effort}, set on each of its requests)` : ""} as a background agent of this chat (agent ${spawned.agentId}).`,
  ];
  if (authNote) lines.push(`Backend: ${authNote}.`);
  if (wt) lines.push(`It works in its own git worktree (${wt.path}) on branch ${wt.branch}.`);
  lines.push(mode ? `Inline threads run in this chat's own permission mode; --mode ${mode} was not applied.` : "It runs in this chat's own permission mode.");
  lines.push(reportBack ? "Its final answer comes back here as its report when it finishes." : "It will end with a short summary.");
  lines.push(`Watch: /threads · Steer: /threads send ${id} <message> · Stop: /threads close ${id}`);
  return { text: lines.join("\n"), id };
}

// A few seconds after the spawn: did it register, or is it stuck on a login or trust screen?
async function settle($, p, entry) {
  for (let i = 0; i < 8; i++) {
    await run($, ["sleep", "1"], 5000);
    const panes = await livePanes($);
    const pane = panes.get(entry.tmux);
    if (!pane || pane.isDead) {
      const last = pane ? oneLine(screenLines(await capture($, entry.tmux, true), 8).join(" ")) : "";
      await patchThread($, p, entry.id, { status: "exited", endedAt: await $.clock.now() });
      await logEvent($, p, "status", { id: entry.id, from: "starting", to: "exited" });
      return { status: "exited", screen: last };
    }
    const screen = readScreen(await capture($, entry.tmux, false));
    if (screen.needsLogin || screen.needsTrust) {
      const status = screen.needsLogin ? "needs-login" : "needs-trust";
      await patchThread($, p, entry.id, { status });
      await logEvent($, p, "status", { id: entry.id, from: "starting", to: status });
      if (screen.needsLogin) await $.state.set(AUTH, { at: 0, loggedIn: false, detail: "" });
      return { status };
    }
    const sessions = await scanSessions($, p);
    if (sessions.has(entry.sessionId)) return { status: "starting", isRegistered: true };
  }
  return { status: "starting", isRegistered: false };
}

// ---- steering ---------------------------------------------------------------------------------------------

async function sendToThread($, t, text) {
  const isInline = t.backend === "inline";
  // a finished inline agent is resumed by the message, so idle-and-done still counts
  if (!LIVE.has(t.status) && !(isInline && t.status === "exited" && t.isMine)) return `${t.id} is ${t.status}; nothing sent.`;
  if (isInline && !t.isMine) return `${t.id} is an inline thread of another chat (${t.parent?.title ?? "?"}); only that chat can reach it.`;
  let result;
  try {
    result = await $.session.send({ to: isInline ? { agentId: t.agentId } : { sessionId: t.sessionId }, text });
  } catch (err) {
    result = { isDelivered: false, reason: String(err?.message ?? err) };
  }
  const p = await paths($);
  await logEvent($, p, "message-sent", { id: t.id, delivered: result.isDelivered, reason: result.reason ?? "", text: clip(text, 500) });
  if (!result.isDelivered) {
    // a session thread is our own tmux session: when the message channel refuses (a held class, an
    // auto-mode classifier with no verdict), type it into its prompt instead, unless a dialog is up
    const gone = /not running|no such|not found|unknown session|has ended/i.test(String(result.reason ?? ""));
    if (!isInline && !gone && (t.status === "idle" || t.status === "working")) {
      const typed = await typeFallback($, p, t, text);
      if (typed) return `Sent to ${shortTitle(t.title)} (${t.id}) by typing it into its prompt (the message channel refused: ${clip(oneLine(result.reason ?? ""), 160)}): ${clip(oneLine(text), 120)}`;
    }
    return `Not delivered to ${shortTitle(t.title)} (${t.id}): ${result.reason}`;
  }
  if (isInline) {
    const now = await $.clock.now();
    await noteActivity($, t.id, t.agentId, { kind: "message", text: `from the lead: ${clip(oneLine(text), 300)}`, at: now }, { status: "working", needsYou: false, lastAt: now });
    return `Sent to ${shortTitle(t.title)} (${t.id}): ${clip(oneLine(text), 120)}`;
  }
  const at = await $.clock.now();
  await update($, SENT, (cur) => ({ ...(cur ?? {}), [t.id]: { text, at } }));
  await startWatcher($);
  // the thread's Claude Code may hold it (different permission class); if it shows our text, deliver it
  await run($, ["sleep", "1.5"], 5000);
  const screen = readScreen(await capture($, t.tmux, false));
  if (screen.heldMessage) {
    const delivered = await deliverHeld($, p, t, screen);
    return delivered
      ? `Sent to ${shortTitle(t.title)} (${t.id}): ${clip(oneLine(text), 120)} (it was held by that session; delivered it)`
      : `Sent to ${shortTitle(t.title)} (${t.id}), but it shows a held message that does not match; left it for you (status held-message).`;
  }
  return `Sent to ${shortTitle(t.title)} (${t.id}): ${clip(oneLine(text), 120)}`;
}

// Types a lead message into a session thread's prompt. Long or multi-line text goes to a file the
// thread is told to read, so nothing is lost to flattening. False when it could not be typed.
async function typeFallback($, p, t, text) {
  const screen = readScreen(await capture($, t.tmux, false));
  if (screen.needsLogin || screen.needsTrust || screen.heldMessage || screen.needsYou) return false;
  let line = `Message from your lead chat: ${oneLine(text)}`;
  if (text.length > 600 || /\n/.test(text.trim())) {
    await run($, ["mkdir", "-p", `${p.dir}/inbox`]);
    const file = `${p.dir}/inbox/${t.id}-${await $.clock.now()}.md`;
    await $.fs.write(file, `# Message from your lead chat\n\n${text}\n`);
    line = `Message from your lead chat: read ${file} and follow it.`;
  }
  const typed = await run($, tmuxArgv("send-keys", "-t", t.tmux, "-l", line), 5000);
  if (typed.exitCode !== 0) return false;
  await run($, ["sleep", "0.3"], 3000);
  await run($, tmuxArgv("send-keys", "-t", t.tmux, "C-m"), 5000);
  await logEvent($, p, "typed-fallback", { id: t.id, text: clip(line, 500) });
  const at = await $.clock.now();
  await update($, SENT, (cur) => ({ ...(cur ?? {}), [t.id]: { text, at } }));
  await startWatcher($);
  return true;
}

async function typeIntoThread($, t, text) {
  if (t.backend === "inline") {
    const sent = await sendToThread($, t, text);
    return `Inline threads have no prompt to type into, so it went as a message. ${sent}`;
  }
  if (!LIVE.has(t.status)) return `${t.id} is ${t.status}; nothing typed.`;
  const flat = oneLine(text);
  const typed = await run($, tmuxArgv("send-keys", "-t", t.tmux, "-l", flat), 5000);
  if (typed.exitCode !== 0) return `Could not type into ${t.id}: ${clip(oneLine(typed.stderr), 200)}`;
  // Enter must be its own send-keys, or the TUI reads it as part of a paste.
  await run($, ["sleep", "0.3"], 3000);
  await run($, tmuxArgv("send-keys", "-t", t.tmux, "C-m"), 5000);
  const p = await paths($);
  await logEvent($, p, "typed", { id: t.id, text: clip(flat, 500) });
  return `Typed into ${shortTitle(t.title)} (${t.id}) and pressed Enter: ${clip(flat, 120)}`;
}

// Stops an inline thread's agent through the TaskStop tool (it takes a background agent's id).
async function stopInline($, t) {
  if (!t.isMine) return { ok: false, text: `${t.id} belongs to another chat (${t.parent?.title ?? "?"}); only that chat can stop it.` };
  // A named agent runs as a teammate, which TaskStop finds by name; a plain one by its id.
  let why = "";
  for (const target of [agentName(t.id), t.agentId]) {
    let r;
    try {
      r = await $.tool.call({ tool: "TaskStop", task_id: target });
    } catch (err) {
      r = { isError: true, text: String(err?.message ?? err) };
    }
    if (r?.deny === undefined && r?.isError !== true) return { ok: true, text: "stopped" };
    why = stripTags(r?.deny ?? r?.text ?? "");
  }
  return { ok: false, text: `TaskStop failed: ${clip(why, 200)}` };
}

async function interruptThread($, t) {
  if (t.backend === "inline") {
    if (t.status !== "working" && t.status !== "needs-you") return `${shortTitle(t.title)} is ${t.status}; nothing to stop.`;
    const stopped = await stopInline($, t);
    const p = await paths($);
    await logEvent($, p, "interrupted", { id: t.id, backend: "inline", ok: stopped.ok, detail: stopped.text });
    if (!stopped.ok) return `Could not stop ${shortTitle(t.title)}: ${stopped.text}`;
    const now = await $.clock.now();
    await noteActivity($, t.id, t.agentId, { kind: "error", text: "stopped by the lead", at: now }, { status: "idle", needsYou: false, partial: "", lastAt: now });
    return `Stopped ${shortTitle(t.title)} (${t.id}). A message (/threads send) resumes it.`;
  }
  if (!LIVE.has(t.status)) return `${t.id} is ${t.status}; nothing to interrupt.`;
  const r = await run($, tmuxArgv("send-keys", "-t", t.tmux, "Escape"), 5000);
  const p = await paths($);
  await logEvent($, p, "interrupted", { id: t.id, ok: r.exitCode === 0 });
  return r.exitCode === 0 ? `Pressed Escape in ${shortTitle(t.title)} (${t.id}).` : `Could not interrupt ${t.id}: ${clip(oneLine(r.stderr), 200)}`;
}

async function setThreadModel($, t, rawModel) {
  const m = normalizeModel(rawModel);
  if (m.error) return m.error;
  if (t.backend === "inline") return `${shortTitle(t.title)} is an inline thread; a subagent keeps the model it started on (${t.verifiedModel || t.resolvedModel || t.requestedModel}). Start a new thread on ${m.model} instead.`;
  if (t.status !== "idle") return `${shortTitle(t.title)} is ${t.status}. Change its model when it is idle (or interrupt it first).`;
  const typed = await typeIntoThread($, t, `/model ${m.model}`);
  if (!typed.startsWith("Typed")) return typed;
  const p = await paths($);
  await patchThread($, p, t.id, { requestedModel: m.model });
  await logEvent($, p, "model-set", { id: t.id, from: t.requestedModel, to: m.model });
  await refresh($, { force: true });
  return `Switched ${shortTitle(t.title)} (${t.id}) to ${m.model}. The running model shows once it answers next.`;
}

// explicit per thread > /threads mode (stored) > the defaultPermissionMode setting > bypassPermissions
async function defaultMode($) {
  const stored = checkMode(await $.store.get(MODE_KEY)).mode;
  return stored ?? configuredMode ?? DEFAULT_MODE;
}

async function setThreadEffort($, t, raw) {
  const e = checkEffort(raw);
  if (e.error || !e.effort) return e.error ?? "Name an effort: low, medium, high, xhigh or max.";
  const p = await paths($);
  if (t.backend === "inline") {
    await noteAgent($, t.agentId, { effort: e.effort });
    await patchThread($, p, t.id, { effort: e.effort });
    await logEvent($, p, "effort-set", { id: t.id, backend: "inline", to: e.effort });
    return `${shortTitle(t.title)} uses effort ${e.effort} from its next request.`;
  }
  if (t.status !== "idle") return `${shortTitle(t.title)} is ${t.status}. Change its effort when it is idle (or interrupt it first).`;
  const typed = await typeIntoThread($, t, `/effort ${e.effort}`);
  if (!typed.startsWith("Typed")) return typed;
  await patchThread($, p, t.id, { effort: e.effort });
  await logEvent($, p, "effort-set", { id: t.id, from: t.effort ?? "", to: e.effort });
  await refresh($, { force: true });
  return `Set ${shortTitle(t.title)} (${t.id}) to effort ${e.effort}.`;
}

async function askModel($, t) {
  if (t.backend === "inline") return setThreadModel($, t, t.requestedModel);
  let answer;
  try {
    answer = await $.ui.ask(`Switch ${shortTitle(t.title)} to which model?`, { options: MODEL_ALIASES, header: "Model" });
  } catch {
    answer = undefined;
  }
  if (!answer) return "Model unchanged.";
  return setThreadModel($, t, answer);
}

// Approve or deny the permission prompt the thread is showing, after the person confirms it.
async function answerPrompt($, t, isApprove) {
  if (t.backend === "inline") {
    return `${shortTitle(t.title)} is an inline thread: its permission prompts show in this chat, so answer them there.`;
  }
  const screen = readScreen(await capture($, t.tmux, false));
  if (!screen.needsYou) return `${shortTitle(t.title)} is not waiting on a permission prompt.`;
  const verb = isApprove ? "Approve" : "Deny";
  let answer;
  try {
    answer = await $.ui.ask(`${shortTitle(t.title)} (${t.id}) is asking:\n\n${clip(screen.prompt, 1200)}\n\n${verb} it?`, {
      options: [verb, "Cancel"],
      header: "Thread",
    });
  } catch {
    answer = undefined;
  }
  if (answer !== verb) return `Left ${t.id}'s prompt as it was.`;
  // the codex-computer-use approval pane answers to its own hotkeys
  const key = screen.cuApproval ? (isApprove ? "a" : "d") : isApprove ? (screen.isCursorOnYes ? "C-m" : "1") : "Escape";
  const r = await run($, tmuxArgv("send-keys", "-t", t.tmux, key), 5000);
  const p = await paths($);
  await logEvent($, p, isApprove ? "approved" : "denied", { id: t.id, key, prompt: clip(screen.prompt, 400) });
  return r.exitCode === 0 ? `${isApprove ? "Approved" : "Denied"} ${shortTitle(t.title)}'s prompt.` : `Could not answer ${t.id}: ${clip(oneLine(r.stderr), 200)}`;
}

async function openThread($, t, surface) {
  if (t.backend === "inline") {
    try {
      await $.ui.copy(surface ? { text: t.agentId, surface } : { text: t.agentId });
    } catch {
      // nothing to copy to
    }
    return [
      `Inline thread: background agent ${t.agentId} of the chat "${t.parent?.title ?? "?"}" (id copied).`,
      "It lives inside that chat (its background tasks list), uses that chat's login, and ends when that chat ends.",
      `Steer it with /threads send ${t.id} <message>; its full record is under that chat's subagents.`,
    ].join("\n");
  }
  const link = remoteLink(t);
  const resume = resumeCommand(t);
  const attach = `tmux -L cc-threads attach -t ${t.tmux}`;
  const text = link || resume;
  let copied = false;
  try {
    const c = await $.ui.copy(surface ? { text, surface } : { text });
    copied = c.isCopied === true;
  } catch {
    copied = false;
  }
  // A Remote Control session opens in the Claude desktop app's main view through its own deep link.
  let openedInApp = false;
  if (t.bridgeSessionId && /^session_[A-Za-z0-9_-]+$/.test(t.bridgeSessionId)) {
    try {
      const r = await $.process.run(["open", `claude://code/${t.bridgeSessionId}`]);
      openedInApp = r.exitCode === 0;
    } catch {
      openedInApp = false;
    }
  }
  const where = await surfaceOf($, surface);
  const lines = [];
  if (openedInApp) lines.push(`Opened ${shortTitle(t.title)} as its own chat in the Claude desktop app.`);
  else if (!t.bridgeSessionId) lines.push(`${shortTitle(t.title)} has no Remote Control link yet, so it cannot open in the app; it shows in the Threads pane.`);
  if (link) lines.push(`Web link: ${link}${copied ? " (copied)" : ""}`);
  if (where === "terminal") lines.push(`Watch the live terminal: ${attach} (detach with ctrl-b d)`);
  lines.push(`Resume after closing: ${resume}${!link && copied ? " (copied)" : ""}`);
  return lines.join("\n");
}

// Asks "close?" where the person can answer. $.ui.ask rejects when it cannot be shown (seen in
// the desktop app from a model tool call: no dialog, an immediate rejection) or is dismissed;
// that is "unavailable", never a silent "no".
async function confirmClose($, question) {
  try {
    const answer = await $.ui.ask(question, { options: ["Close", "Cancel"], header: "Threads" });
    return answer === "Close" ? "yes" : "no";
  } catch {
    return "unavailable";
  }
}

const ASK_IN_CHAT =
  "No confirmation dialog could be shown here (or it was dismissed), so nothing was closed. Ask the user in chat whether to close it; if they say yes, call threads_close again with confirmed: true.";

// from: "command" (the person typed /threads close: that is the confirmation), "tool" (the model:
// confirmed only when the user asked in plain words), "pane" (a press: dialog, else press again).
// ---- worktrees ---------------------------------------------------------------------------------------------------

async function removeWorktree($, w) {
  // Claude Code locks a --worktree checkout for its session; the process is gone by now
  await run($, ["git", "-C", w.repo, "worktree", "unlock", w.path], 5000);
  const gone = await run($, ["git", "-C", w.repo, "worktree", "remove", "--force", w.path], 20000);
  await run($, ["git", "-C", w.repo, "branch", "-D", w.branch], 5000);
  return gone.exitCode === 0;
}

// After a worktree thread ends: remove an unchanged worktree, keep one with work and say how to merge it.
async function finishWorktree($, p, t) {
  const w = t.worktree;
  if (!w?.path || w.removed) return "";
  if (!(await $.fs.exists(w.path))) {
    await patchThread($, p, t.id, { worktree: { ...w, removed: true } });
    return "";
  }
  await run($, ["git", "-C", w.repo, "worktree", "unlock", w.path], 5000);
  const st = await run($, ["git", "-C", w.path, "status", "--porcelain"], 10000);
  const ahead = await run($, ["git", "-C", w.repo, "rev-list", "--count", `${w.base}..${w.branch}`], 10000);
  const out = worktreeOutcome({ statusOk: st.exitCode === 0 && ahead.exitCode === 0, porcelain: st.stdout, commits: Number(String(ahead.stdout).trim()) || 0 });
  if (out.remove) {
    const ok = await removeWorktree($, w);
    await patchThread($, p, t.id, { worktree: { ...w, removed: ok } });
    await logEvent($, p, "worktree-removed", { id: t.id, path: w.path, ok });
    return ok ? " Its worktree had no changes and was removed." : ` Its worktree at ${w.path} had no changes but could not be removed.`;
  }
  await patchThread($, p, t.id, { worktree: { ...w, kept: true, commits: out.commits, dirty: out.dirty } });
  await logEvent($, p, "worktree-kept", { id: t.id, path: w.path, commits: out.commits, dirty: out.dirty });
  const what = [out.commits ? `${out.commits} commit${out.commits === 1 ? "" : "s"}` : "", out.dirty ? "uncommitted changes" : ""].filter(Boolean).join(" and ");
  return ` Its worktree is kept at ${w.path} on branch ${w.branch} (${what}). Merge it with: git -C '${w.repo}' merge ${w.branch}`;
}

async function closeThread($, t, opts = {}) {
  if (t.status === "closed") return t.backend === "inline" ? `${t.id} is already closed.` : `${t.id} is already closed. Resume it with: ${resumeCommand(t)}`;
  const from = opts.from ?? "tool";
  if (!opts.confirmed && from !== "command") {
    const what = t.backend === "inline" ? "Its agent in this chat is stopped." : "Its Claude Code process ends; the transcript is kept.";
    const said = await confirmClose($, `Close ${shortTitle(t.title)} (${t.id}, ${t.status})? ${what}`);
    if (said === "no") return `${shortTitle(t.title)} (${t.id}) left running: you chose Cancel.`;
    if (said === "unavailable") {
      if (from === "pane") return armPaneClose($, t);
      return `${shortTitle(t.title)} (${t.id}) is still running. ${ASK_IN_CHAT}`;
    }
  }
  return closeNow($, t);
}

async function closeNow($, t) {
  const p = await paths($);
  if (t.backend === "inline") {
    let note = "";
    if (t.status !== "exited") {
      // an idle named agent stays parked in this chat until stopped, so stop it either way
      const stopped = await stopInline($, t);
      note = stopped.ok ? " Its agent was stopped." : ` ${stopped.text}; it is marked closed but may finish its current step.`;
    }
    const now = await $.clock.now();
    await patchThread($, p, t.id, { status: "closed", closedAt: now });
    await logEvent($, p, "closed", { id: t.id, backend: "inline", previous: t.status });
    await releaseDesktop($, p, t);
    const tree = await finishWorktree($, p, t);
    await refresh($, { force: true });
    return `Closed ${shortTitle(t.title)} (${t.id}).${note}${tree}`;
  }
  await run($, tmuxArgv("kill-session", "-t", t.tmux), 5000);
  const now = await $.clock.now();
  await patchThread($, p, t.id, { status: "closed", closedAt: now });
  await logEvent($, p, "closed", { id: t.id, previous: t.status });
  await releaseDesktop($, p, t);
  const tree = await finishWorktree($, p, t);
  await refresh($, { force: true });
  return `Closed ${shortTitle(t.title)} (${t.id}).${tree}${tree.includes("removed") ? "" : `${tree ? "\n" : " "}Resume it with: ${resumeCommand(t)}`}`;
}

// No dialog in this surface: a second press of Close within 10 s confirms.
async function armPaneClose($, t) {
  const now = await $.clock.now();
  const { value: ui = EMPTY_UI } = await $.state.get(UI);
  if (ui.armedClose?.id === t.id && now - (ui.armedClose.at ?? 0) < 10000) {
    await patchUi($, (u) => ({ ...u, armedClose: null }));
    return closeNow($, t);
  }
  await patchUi($, (u) => ({ ...u, armedClose: { id: t.id, at: now } }));
  return `Press Close again within 10 seconds to close ${shortTitle(t.title)}.`;
}

// Every open thread of a plan.
async function closePlanThreads($, plan, opts = {}) {
  const p = await paths($);
  const reg = await loadRegistry($, p);
  const byId = new Map(reg.threads.map((t) => [t.id, t]));
  const ids = plan.phases.map((x) => x.threadId).filter(Boolean).filter((id) => byId.get(id) && byId.get(id).status !== "closed");
  if (ids.length === 0) return `Plan ${plan.title} has no open threads.`;
  if (!opts.confirmed && opts.from !== "command") {
    const said = await confirmClose($, `Close the ${ids.length} thread${ids.length === 1 ? "" : "s"} of plan ${plan.title} (${ids.join(", ")})?`);
    if (said === "no") return `Left plan ${plan.title}'s threads running: you chose Cancel.`;
    if (said === "unavailable") return `Plan ${plan.title}'s ${ids.length} thread${ids.length === 1 ? " is" : "s are"} still running. ${ASK_IN_CHAT.replace("close it", "close them").replace("threads_close again with confirmed: true", `threads_close again with all_of_plan: "${plan.id}" and confirmed: true`)}`;
  }
  for (const id of ids) {
    const t = byId.get(id);
    if (t.backend === "inline") await stopInline($, { ...t, isMine: true });
    else await run($, tmuxArgv("kill-session", "-t", t.tmux), 5000);
    await patchThread($, p, id, { status: "closed", closedAt: await $.clock.now() });
    await releaseDesktop($, p, t);
    await finishWorktree($, p, t);
  }
  await logEvent($, p, "plan-closed", { planId: plan.id, ids });
  await refresh($, { force: true });
  return `Closed ${ids.length} thread${ids.length === 1 ? "" : "s"} of plan ${plan.title}.`;
}

async function steerFromPane($, t, value) {
  const text = String(value ?? "").trim();
  if (!text) return "Nothing to send.";
  const out = await sendToThread($, t, text);
  await patchUi($, (u) => ({ ...u, steering: false }));
  return out;
}

// ---- inline activity -------------------------------------------------------------------------------------------

async function inlineThreadOf($, agentId) {
  const { value: map = {} } = await $.state.get(INLINE);
  return map[agentId];
}

// update() reads, applies and writes with ifVersion, so hooks running at once do not drop each other's items.
// An inline agent's first request, seen before agent.spawn resolved: claim it by the name it was spawned with.
async function claimPendingInline($, agentId) {
  let agents = [];
  try {
    agents = await $.agent.list();
  } catch {
    agents = [];
  }
  let name = agents.find((a) => a.id === agentId && a.name && pendingInline.has(a.name))?.name;
  // not listed yet: a named agent's id carries its name ("a<name>-<hash>")
  if (!name) name = [...pendingInline.keys()].find((n) => agentId === n || agentId.startsWith(`a${n}-`) || agentId.startsWith(`${n}-`));
  if (!name) {
    const p = await paths($);
    await logEvent($, p, "inline-unmatched", { agentId, pending: [...pendingInline.keys()], listed: agents.map((a) => `${a.id}:${a.name ?? ""}`).slice(0, 8) });
    return undefined;
  }
  const { id, effort } = pendingInline.get(name);
  await update($, INLINE, (map) => ({ ...(map ?? {}), [agentId]: id }));
  if (effort) await noteAgent($, agentId, { effort });
  return id;
}

async function noteAgent($, agentId, patch) {
  await update($, AGENTS, (all) => ({ ...(all ?? {}), [agentId]: { ...((all ?? {})[agentId] ?? {}), ...patch } }));
}

async function noteActivity($, tid, agentId, item, agentPatch) {
  await update($, ACTIVITY, (feed) => ({ ...(feed ?? {}), [tid]: pushBounded((feed ?? {})[tid], item) }));
  if (agentPatch) await noteAgent($, agentId, agentPatch);
}

async function noteInlineDone($, e) {
  const tid = await inlineThreadOf($, e.agentId);
  if (!tid) return;
  const now = await $.clock.now();
  const answer = String(e.answer ?? "").trim();
  const text = answer
    ? answer
    : e.isAborted || e.reason === "aborted"
      ? "(stopped before it answered)"
      : e.reason === "error" || e.reason === "refusal"
        ? `(ended with ${e.reason === "error" ? "an error" : "a refusal"} before answering; its row in this chat says why)`
        : "(finished with no text)";
  const model = e.usage?.model ?? "";
  await noteActivity($, tid, e.agentId, { kind: "done", text: `${e.reason ?? "answer"}: ${clip(oneLine(text), 300)}`, at: now }, {
    status: "idle",
    needsYou: false,
    partial: "",
    lastAt: now,
    ...(model ? { model } : {}),
  });
  const p = await paths($);
  const reg = await loadRegistry($, p);
  const t = reg.threads.find((x) => x.id === tid);
  if (!t) return;
  // one report per run of the agent (its turn id), however often the turn is seen
  await deliverReport($, p, t, { answer: text, key: `${e.turnId}:${text.length}`, model: model || t.verifiedModel || t.resolvedModel || t.requestedModel, source: "inline" });
  if (t.planId) await phaseFinished($, p, t, {});
}

// ---- the completion watcher (session threads) ---------------------------------------------------------------
//
// Reports must not depend on the thread's model calling SendMessage. While any of
// this chat's session threads is live, every 4 s: read each one's status; on a
// change to idle (or exit) take its latest answer from the transcript and report
// it; on a change to needs-you or held-message, toast it. A held copy of a message
// this chat just sent is delivered (Down, then Enter).

async function startWatcher($) {
  if (watcher) return;
  const { value: view = EMPTY_VIEW } = await $.state.get(VIEW);
  const hasPlan = (view.plans ?? []).some((pl) => pl.status === "running");
  if (!hasPlan && !view.threads.some((t) => t.isMine && t.backend !== "inline" && LIVE.has(t.status))) return;
  watcher = $.clock.every(WATCH_MS, () => {
    void watchTick($);
  });
}

function stopWatcher() {
  if (watcher && typeof watcher.cancel === "function") watcher.cancel();
  watcher = null;
}

// quiet: a run from a command, which may not wake the lead (prompt.submit would wait on that command)
async function watchTick($, opts = {}) {
  if (watching) return;
  watching = true;
  try {
    await watchOnce($, opts);
    // never submit from inside a command (the prompt would wait on that command); a timer tick may
    if (opts.quiet) await scheduleWakes($);
    else await fireWakes($);
  } catch (err) {
    $.ui.log(`threads: watcher tick failed (${String(err?.message ?? err)})`, { to: "debug" });
  } finally {
    watching = false;
  }
}

// One pass of the watcher; exported through the tick for the tests.
async function watchOnce($, opts = {}) {
  const p = await paths($);
  const reg = await loadRegistry($, p);
  const selfId = await $.session.id();
  const mine = reg.threads.filter((t) => t.parent?.sessionId === selfId && t.backend !== "inline" && LIVE.has(t.status));
  const waiting = (reg.plans ?? []).filter((pl) => pl.lead?.sessionId === selfId && pl.status === "running" && pl.phases[pl.current ?? 0]?.status === "queued");
  await retireWaitingPredecessors($, p, { ...reg, plans: (reg.plans ?? []).filter((pl) => pl.lead?.sessionId === selfId) });
  for (const pl of waiting) await startPhase($, p, pl.id, pl.current ?? 0, opts);
  if (mine.length === 0 && waiting.length === 0) {
    stopWatcher();
    return;
  }
  const sessions = await scanSessions($, p);
  const panes = await livePanes($);
  const now = await $.clock.now();
  await closeIdleThreads($, p, reg, sessions, now);
  const { value: prev = {} } = await $.state.get(WATCH);
  const seen = { ...prev };
  for (const t of mine) {
    const pane = panes.get(t.tmux);
    const sess = sessions.get(t.sessionId) ?? null;
    const screen = pane && !pane.isDead ? readScreen(await capture($, t.tmux, false)) : null;
    let status = statusOf({ previous: t.status, tmux: { isLive: Boolean(pane), isDead: Boolean(pane?.isDead) }, session: sess, pidAlive: undefined, screen, now, createdAt: t.createdAt });
    if (status === "held-message" && (await deliverHeld($, p, t, screen))) status = "working";
    const was = prev[t.id];
    seen[t.id] = status;
    if (status === was) continue;
    if ((status === "needs-you" || status === "held-message") && was !== status) {
      const what = status === "held-message" ? `a held message waits (${clip(screen?.heldPreview ?? "", 60)})` : clip(oneLine(screen?.prompt ?? "a permission prompt"), 80);
      $.ui.toast(`${t.title} needs you: ${what}`, { timeoutMs: 8000 });
      await logEvent($, p, status, { id: t.id, detail: clip(what, 300) });
    }
    if (status === "idle" || status === "exited") {
      const parsed = parseTranscript(await transcriptTail($, p, t));
      if (parsed.lastAnswer && parsed.isAnswerLatest) {
        await deliverReport($, p, t, {
          answer: parsed.lastAnswer.text,
          key: parsed.lastAnswer.key,
          model: parsed.model || t.verifiedModel || t.requestedModel,
          source: "watcher",
          quiet: opts.quiet === true,
        });
        if (t.planId) await phaseFinished($, p, t, opts);
      }
    }
  }
  await $.state.set(WATCH, seen);
}

// Records a finished thread's answer once, tells the person, and puts it in front of the lead's model.
async function deliverReport($, p, t, { answer, key, model, source, quiet = false }) {
  const now = await $.clock.now();
  const fresh = (await loadRegistry($, p)).threads.find((x) => x.id === t.id) ?? t;
  const decision = shouldReport({ lastReport: fresh.lastReport, appendedKey: fresh.appendedKey, key, now });
  if (!decision.report) {
    if (decision.reason === "the thread reported itself") await patchThread($, p, t.id, { appendedKey: key });
    return false;
  }
  const text = clip(String(answer ?? "").trim(), ANSWER_MAX);
  const patch = { lastReport: { at: now, text, source }, appendedKey: key };
  if (/^claude-/.test(model ?? "")) patch.verifiedModel = model;
  await patchThread($, p, t.id, patch);
  await logEvent($, p, "finished", { id: t.id, source, model: model ?? "", text: clip(oneLine(text), 500) });
  $.ui.toast(`${t.title} finished`, { timeoutMs: 8000 });
  const row = reportRow({ title: t.title, id: t.id, model, answer: text });
  let appended = { ok: true, error: "" };
  try {
    const r = await $.session.append(row);
    if (r?.deny !== undefined) appended = { ok: false, error: r.deny };
  } catch (err) {
    appended = { ok: false, error: String(err?.message ?? err) };
    $.ui.log(`threads: could not append ${t.id}'s report (${appended.error})`, { to: "debug" });
  }
  await logEvent($, p, "report-appended", { id: t.id, ok: appended.ok, error: clip(appended.error, 200), row: row.message.content[0].text.slice(0, 300) });
  await update($, VIEW, (v) => {
    const cur = v ?? EMPTY_VIEW;
    return { ...cur, threads: cur.threads.map((x) => (x.id === t.id ? { ...x, ...patch, lastLine: `says  ${clip(oneLine(text), 200)}`, lastKind: "assistant" } : x)) };
  });
  if ((await $.store.get(AUTOWAKE_KEY)) === true && !t.planId) {
    await queueWake($, { key: `report:${t.id}:${key}`, kind: "report", threadId: t.id, text: `${t.title} (${t.id}) finished; its report is in the thread report above. Review it and continue.` });
  }
  return true;
}

// A message this chat sent that the thread's Claude Code is holding: deliver it if the preview matches.
async function deliverHeld($, p, t, screen) {
  const { value: sent = {} } = await $.state.get(SENT);
  const mine = sent[t.id];
  const now = await $.clock.now();
  if (!mine || now - mine.at > 600000 || !heldMatches(screen?.heldPreview ?? "", mine.text)) return false;
  await run($, tmuxArgv("send-keys", "-t", t.tmux, "Down"), 5000);
  await run($, ["sleep", "0.3"], 3000);
  await run($, tmuxArgv("send-keys", "-t", t.tmux, "C-m"), 5000);
  await update($, SENT, (cur) => {
    const next = { ...(cur ?? {}) };
    delete next[t.id];
    return next;
  });
  await logEvent($, p, "held-delivered", { id: t.id, text: clip(mine.text, 300) });
  return true;
}

// ---- cost -----------------------------------------------------------------------------------------------------------

// A session thread's est. API-equivalent cost from its whole transcript, re-read only when the file grew.
async function sessionCost($, p, t) {
  if (!t.sessionId || t.backend === "inline") return null;
  const path = `${p.projects}/${slug(t.cwd)}/${t.sessionId}.jsonl`;
  let st;
  try {
    st = await $.fs.stat(path);
  } catch {
    return null;
  }
  if (!st || st.kind !== "file") return null;
  const { value: cache = {} } = await $.state.get(COST);
  const hit = cache[t.id];
  if (hit && hit.size === st.size) return hit.usd;
  let text = "";
  try {
    text = await $.fs.read(path);
  } catch {
    return hit?.usd ?? null;
  }
  const { usd } = costFromTranscript(text);
  await update($, COST, (cur) => ({ ...(cur ?? {}), [t.id]: { size: st.size, usd } }));
  return usd;
}

function costChip(t) {
  return t.costUsd ? money(t.costUsd) : "";
}

// ---- show and open -------------------------------------------------------------------------------------------------

async function showPane($, { id, plan } = {}) {
  await refresh($, { force: true });
  if (id) {
    const found = await findThread($, id, { includeArchived: true });
    if (found.error) return found.error;
    await patchUi($, (u) => ({ ...u, selected: found.thread.id, planView: false, showArchived: u.showArchived || Boolean(found.thread.archived), showOthers: u.showOthers || !found.thread.isMine }));
  }
  if (plan) await patchUi($, (u) => ({ ...u, planView: true }));
  const opened = await $.ui.open({ id: PANE, title: PANE_TITLE });
  await refresh($, { force: true });
  if (!opened.isPlaced) return `The Threads pane could not be placed (${opened.reason}). Here is the list instead:\n${await listText($, { forModel: true })}`;
  const view = await viewThreads($);
  const live = view.threads.filter((t) => t.isMine && LIVE.has(t.status)).length;
  return `Opened the Threads pane beside this chat: ${live} live thread${live === 1 ? "" : "s"} of this chat${plan ? ", plan view" : id ? `, ${id} selected` : ""}. The user can click threads and buttons there.`;
}

async function surfaceOf($, given) {
  if (given) return given;
  const { value: known } = await $.state.get(SURFACE);
  if (known) return known;
  return detectSurface($);
}

// desktop when the session starts there, a desktop surface is attached, or the lead's own
// sessions entry says the desktop app started it
async function detectSurface($, fromStart) {
  let surface = fromStart === "desktop" ? "desktop" : "";
  if (!surface) {
    try {
      const all = await $.session.surfaces();
      if (all.includes("desktop")) surface = "desktop";
    } catch {
      // older engines
    }
  }
  if (!surface) {
    try {
      const p = await paths($);
      const sessions = await scanSessions($, p);
      const me = sessions.get(await $.session.id());
      if (me && /desktop/.test(String(me.entrypoint ?? ""))) surface = "desktop";
    } catch {
      // no sessions entry yet
    }
  }
  if (!surface) {
    try {
      surface = (await $.session.surface()) ?? "terminal";
    } catch {
      surface = "terminal";
    }
  }
  await $.state.set(SURFACE, surface);
  return surface;
}

// ---- fork -----------------------------------------------------------------------------------------------------------

async function forkThread($, input) {
  const include = input.include === "full" ? "full" : "summary";
  const p = await paths($);
  const lead = await leadInfo($, p);
  let context;
  if (include === "summary") {
    // the whole conversation, outlined oldest first, steers the summary so early milestones are kept
    let rows = [];
    try {
      rows = await $.session.messages();
    } catch {
      rows = [];
    }
    const outline = conversationOutline(rows, 9000);
    let summary = "";
    try {
      const r = await $.model.fork({ prompt: forkPrompt(outline) });
      if (r.isAnswered) summary = String(r.text ?? "").trim();
    } catch {
      summary = "";
    }
    // no fork available (a new chat, or the request failed): the outline itself
    if (!summary && outline) summary = `Outline of the lead conversation, oldest first:\n${outline}`;
    if (!summary) return { error: "This chat has nothing to fork yet." };
    context = { summary: clip(summary, 10000) };
  } else {
    let rows = [];
    try {
      rows = await $.session.messages();
    } catch {
      rows = [];
    }
    if (rows.length === 0) return { error: "This chat has nothing to fork yet." };
    const body = rows
      .map((m) => {
        const tools = (m.toolUses ?? []).map((u) => `  [tool] ${toolLine(u.tool ?? u.name, u.input)}`).join("\n");
        return `## ${m.role}\n${m.text ?? ""}${tools ? `\n${tools}` : ""}`;
      })
      .join("\n\n");
    await run($, ["mkdir", "-p", `${p.dir}/forks`]);
    const seed = (await newUuid($)).replace(/[^0-9a-f]/g, "").slice(0, 8);
    const file = `${p.dir}/forks/fork-${seed}.md`;
    const text = `# Fork of "${lead.title}" (${lead.selfId})\n\n${body.length > 400000 ? `(older part left out)\n\n${body.slice(-400000)}` : body}\n`;
    await $.fs.write(file, text);
    context = { file };
  }
  let model = input.model;
  if (!model) {
    try {
      model = await $.session.model();
    } catch {
      model = "sonnet";
    }
  }
  const made = await createThread($, {
    model,
    title: input.title,
    task: input.task,
    cwd: input.cwd,
    effort: input.effort,
    backend: input.backend,
    worktree: input.worktree === true,
    reportBack: true,
    context,
    extra: { ...(input.extra ?? {}), forkedFrom: { sessionId: lead.selfId, title: lead.title, include, file: context.file ?? "" } },
  });
  if (made.error) return made;
  return { ...made, text: `${made.text}\nForked from this chat with ${include === "full" ? `the transcript in ${context.file}` : "a summary of this conversation"}.` };
}

// ---- orphans and idle threads --------------------------------------------------------------------------------------

async function orphanThreads($, p, reg) {
  const sessions = await scanSessions($, p);
  const alive = await pidsAlive($, [...sessions.values()].map((x) => x.pid));
  const liveLeads = new Set([...sessions.values()].filter((x) => !alive || alive.has(x.pid)).map((x) => x.sessionId));
  const panes = await livePanes($);
  return reg.threads.filter(
    (t) => t.status !== "closed" && t.status !== "exited" && t.backend !== "inline" && !liveLeads.has(t.parent?.sessionId) && panes.has(t.tmux) && !panes.get(t.tmux).isDead,
  );
}

async function noticeOrphans($) {
  const p = await paths($);
  const reg = await loadRegistry($, p);
  const orphans = await orphanThreads($, p, reg);
  if (orphans.length === 0) return;
  $.ui.toast(`${orphans.length} thread${orphans.length === 1 ? " has" : "s have"} lost ${orphans.length === 1 ? "its" : "their"} lead chat. Ask me to adopt or close ${orphans.length === 1 ? "it" : "them"}, or run /threads setup.`, { timeoutMs: 10000 });
  await logEvent($, p, "orphans-found", { ids: orphans.map((t) => t.id) });
}

async function adoptThreads($, { ids = [], all = false }) {
  const p = await paths($);
  const reg = await loadRegistry($, p);
  const orphans = await orphanThreads($, p, reg);
  const pick = all ? orphans : orphans.filter((t) => ids.some((r) => t.id === String(r).toLowerCase() || t.id.startsWith(String(r).toLowerCase())));
  if (pick.length === 0) {
    return orphans.length
      ? `None of those are orphans. Orphans: ${orphans.map((t) => `${t.id} (${shortTitle(t.title)})`).join(", ")}.`
      : "No orphaned threads: every live thread's lead chat is running.";
  }
  const lead = await leadInfo($, p);
  const set = new Set(pick.map((t) => t.id));
  await mutateRegistry($, p, (fresh) => {
    fresh.threads = fresh.threads.map((t) => (set.has(t.id) ? { ...t, parent: { sessionId: lead.selfId, title: lead.title, socket: lead.socket }, adoptedAt: Date.now() } : t));
    return fresh;
  });
  await logEvent($, p, "adopted", { ids: [...set], lead: lead.selfId });
  await refresh($, { force: true });
  await startWatcher($);
  return `This chat is now the lead of ${pick.map((t) => `${t.id} (${shortTitle(t.title)})`).join(", ")}: their reports come here and you can steer them. (A note they send with SendMessage still goes to their old lead's address; the finish watcher reports their answers here.)`;
}

// Finished, idle session threads quiet for idleCloseMinutes are closed; never working, waiting or pinned ones.
async function closeIdleThreads($, p, reg, sessions, now) {
  if (!idleCloseMinutes) return;
  if (now - lastIdleCheck < 60000) return;
  lastIdleCheck = now;
  const selfId = await $.session.id();
  for (const t of reg.threads) {
    if (t.parent?.sessionId !== selfId || t.backend === "inline" || t.status !== "idle" || t.pinned) continue;
    const sess = sessions.get(t.sessionId);
    const quietSince = sess?.statusUpdatedAt ?? sess?.updatedAt ?? 0;
    if (!quietSince || sess?.status !== "idle" || now - quietSince < idleCloseMinutes * 60000) continue;
    if (!t.lastReport) continue; // finished means it answered
    await retireThread($, p, t, `idle for ${idleCloseMinutes} minutes`, "idle");
    await logEvent($, p, "idle-closed", { id: t.id, minutes: idleCloseMinutes });
  }
}

// ---- pins and archive ------------------------------------------------------------------------------------------------

// ---- rename, read state, handoff ------------------------------------------------------------------------------------

async function renameThread($, t, raw) {
  const title = threadTitle(raw);
  if (!title) return "Give the thread a new name.";
  const p = await paths($);
  await patchThread($, p, t.id, { title });
  await logEvent($, p, "renamed", { id: t.id, from: t.title, to: title });
  let note = "";
  if (t.backend !== "inline" && t.status === "idle") {
    // the session's own name (sidebar, /resume picker) follows through Claude Code's /rename
    const typed = await typeIntoThread($, t, `/rename ${title}`);
    note = typed.startsWith("Typed") ? " Its session name changed too." : ` Its session kept its old name (${typed}).`;
  } else if (t.backend !== "inline" && LIVE.has(t.status)) {
    note = ` Its session name in the sidebar changes once it is idle; ask again then, or run /threads rename ${t.id} ${shortTitle(title)}.`;
  }
  await refresh($, { force: true });
  return `Renamed ${shortTitle(t.title)} (${t.id}) to ${shortTitle(title)}.${note}`;
}

async function markRead($, ids) {
  if (ids.length === 0) return;
  const p = await paths($);
  const now = await $.clock.now();
  const set = new Set(ids);
  await mutateRegistry($, p, (fresh) => {
    // never older than the report being marked read, whatever the clocks say
    fresh.threads = fresh.threads.map((t) => (set.has(t.id) ? { ...t, seenAt: Math.max(now, t.lastReport?.at ?? 0) } : t));
    return fresh;
  });
  await refresh($, { force: true });
}

async function markReadText($, { id, all }) {
  await refresh($);
  const view = await viewThreads($);
  if (all || !id) {
    const ids = view.threads.filter((t) => t.isMine && isUnread(t)).map((t) => t.id);
    await markRead($, ids);
    return ids.length ? `Marked ${ids.length} thread${ids.length === 1 ? "" : "s"} read.` : "Nothing unread.";
  }
  const found = await findThread($, id, { includeArchived: true });
  if (found.error) return found.error;
  await markRead($, [found.thread.id]);
  return `Marked ${shortTitle(found.thread.title)} (${found.thread.id}) read.`;
}

// Hand this chat's work to a thread: a fork whose task is to carry on, so the chat is free.
async function handoffThread($, input) {
  const next = String(input.next ?? input.task ?? "").trim();
  const task = next
    ? `You are taking over the lead conversation's work. Carry on from where it left off, starting with: ${next}`
    : "You are taking over the lead conversation's work. Carry on from where it left off: finish what was in progress, then the next steps it named. If the next step is unclear, say so in your answer instead of guessing.";
  const made = await forkThread($, { ...input, task, extra: { handedOff: true } });
  if (made.error) return made;
  return { ...made, text: `${made.text}\nHanded off: the thread carries on with this chat's work and reports back here, so this chat is free for something else.` };
}

async function setFlag($, t, flag, value) {
  const p = await paths($);
  await patchThread($, p, t.id, { [flag]: value });
  await logEvent($, p, `${value ? "" : "un"}${flag === "pinned" ? "pinned" : "archived"}`, { id: t.id });
  await refresh($, { force: true });
  const word = flag === "pinned" ? (value ? "Pinned" : "Unpinned") : value ? "Archived" : "Unarchived";
  const more = flag === "archived" && value ? " It is hidden from the pane and threads_list; ask to unarchive it to bring it back." : flag === "pinned" && value ? " It stays on top and is never cleaned up or idle-closed." : "";
  return `${word} ${shortTitle(t.title)} (${t.id}).${more}`;
}

// ---- plan history -------------------------------------------------------------------------------------------------

// Plans that ran before history was kept get a record from what the registry still has.
async function backfillPlanHistory($) {
  const p = await paths($);
  const reg = await loadRegistry($, p);
  let n = 0;
  for (const plan of reg.plans ?? []) {
    if (await $.fs.exists(`${p.dir}/plans/${plan.id}.json`)) continue;
    await writePlanHistory($, p, plan, { backfilled: true });
    n += 1;
  }
  if (n) await logEvent($, p, "plan-history-backfilled", { count: n });
  return n;
}

async function writePlanHistory($, p, plan, opts = {}) {
  const reg = await loadRegistry($, p);
  const byId = new Map(reg.threads.map((t) => [t.id, t]));
  const now = await $.clock.now();
  let backfilled = opts.backfilled === true;
  if (!backfilled) {
    // keep the mark on a record that started as a backfill
    try {
      backfilled = JSON.parse(await $.fs.read(`${p.dir}/plans/${plan.id}.json`)).backfilled === true;
    } catch {
      backfilled = false;
    }
  }
  const record = planRecord(plan, byId, now, { backfilled });
  const dir = `${p.dir}/plans`;
  await run($, ["mkdir", "-p", dir]);
  await $.fs.write(`${dir}/${plan.id}.json`, `${JSON.stringify(record, null, 2)}\n`);
  await $.fs.write(`${dir}/${plan.id}.md`, planRecordMarkdown(record));
  return record;
}

async function planHistoryText($, planId) {
  const p = await paths($);
  const dir = `${p.dir}/plans`;
  if (planId) {
    const id = String(planId).trim();
    try {
      return clip(await $.fs.read(`${dir}/${id}.md`), 14000);
    } catch {
      const plan = await loadPlan($, p, id);
      if (!plan) return `No plan history for ${id}.`;
      return clip(planRecordMarkdown(await writePlanHistory($, p, plan)), 14000);
    }
  }
  let entries = [];
  try {
    entries = (await $.fs.list(dir)).filter((x) => x.kind === "file" && x.name.endsWith(".json"));
  } catch {
    entries = [];
  }
  if (entries.length === 0) return "No saved plans yet.";
  const rows = [];
  for (const x of entries.slice(-50)) {
    try {
      const r = JSON.parse(await $.fs.read(`${dir}/${x.name}`));
      rows.push(r);
    } catch {
      // skip a broken file
    }
  }
  rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return [
    `Saved plans (${rows.length}), newest first:`,
    ...rows.map((r) => `${r.id}  ${r.title} · ${r.status} · ${r.phases.length} phases (${r.phases.map((x) => `${x.name}:${x.verifiedModel || x.model}`).join(", ")}) · est. API-equivalent ${money(r.costUsd)} · ${localTime(r.createdAt, false)}`),
    "Ask for one by id to see its phases, handoffs, gate decisions and timing.",
  ].join("\n");
}

// ---- setup --------------------------------------------------------------------------------------------------------
//
// What session threads need, checked and explained: the terminal login, tmux, the folder's trust
// (exact folder), the cap and stale threads, the default mode, and how the mod is loaded.

async function staleThreads($, p, reg) {
  const panes = await livePanes($);
  const sessions = await scanSessions($, p);
  const alive = await pidsAlive($, [...sessions.values()].map((x) => x.pid));
  const liveLeads = new Set([...sessions.values()].filter((x) => !alive || alive.has(x.pid)).map((x) => x.sessionId));
  const finishedPlans = new Set((reg.plans ?? []).filter((x) => x.status === "done" || x.status === "stopped").map((x) => x.id));
  const out = [];
  for (const t of reg.threads) {
    if (t.status === "closed") continue;
    let why = "";
    if (t.backend !== "inline" && (!panes.has(t.tmux) || panes.get(t.tmux).isDead)) why = "its process has ended";
    else if (!liveLeads.has(t.parent?.sessionId)) why = "its lead chat is gone";
    else if (t.planId && finishedPlans.has(t.planId)) why = "its plan is finished";
    if (why) out.push({ t, why });
  }
  return out;
}

async function runSetup($, opts = {}) {
  const p = await paths($);
  const checks = [];
  await $.state.set(AUTH, { at: 0, loggedIn: false, detail: "" });
  const auth = await authStatus($);
  checks.push({
    name: "Terminal login",
    ok: auth.loggedIn,
    detail: auth.loggedIn ? `logged in (${auth.detail || "ok"})` : auth.detail || "not logged in",
    fix: "Run in Terminal: claude auth login. Until then, threads run inline inside this chat.",
    critical: true,
  });
  const tmux = await run($, ["tmux", "-V"], 5000);
  const tmuxOk = tmux.exitCode === 0;
  checks.push({
    name: "tmux",
    ok: tmuxOk,
    detail: tmuxOk ? oneLine(tmux.stdout) : "not found",
    fix: "Run in Terminal: brew install tmux",
    critical: true,
  });
  const here = await $.session.cwd();
  const want = String(opts.cwd ?? "").trim() || here;
  let real = want;
  try {
    real = (await $.fs.stat(want, { resolve: true })).realPath || want;
  } catch {
    real = want;
  }
  let claudeJson = "";
  try {
    claudeJson = await $.fs.read(p.claudeJson);
  } catch {
    claudeJson = "";
  }
  const trusted = isTrusted(claudeJson, real) || isTrusted(claudeJson, want);
  checks.push({
    name: "Folder trust",
    ok: trusted,
    detail: `${real} is ${trusted ? "trusted" : "not trusted"} (trust is per folder, not inherited)`,
    fix: `Run in Terminal: cd '${real}' && claude, accept the trust prompt once, then quit. Or pass a trusted folder as cwd.`,
  });
  const reg = await loadRegistry($, p);
  const live = await liveCount($, reg);
  let stale = (await staleThreads($, p, reg)).filter((x) => !x.t.pinned);
  let closedNote = "";
  if (opts.closeStale && stale.length) {
    for (const { t } of stale) {
      if (t.backend === "inline") {
        if (t.parent?.sessionId === (await $.session.id())) await stopInline($, { ...t, isMine: true });
      } else if (t.tmux) await run($, tmuxArgv("kill-session", "-t", t.tmux), 5000);
      await patchThread($, p, t.id, { status: "closed", closedAt: await $.clock.now(), closedBy: "setup" });
    }
    await logEvent($, p, "stale-closed", { ids: stale.map((x) => x.t.id) });
    closedNote = ` Closed ${stale.length} stale thread${stale.length === 1 ? "" : "s"}: ${stale.map((x) => x.t.id).join(", ")}.`;
    stale = [];
    await refresh($, { force: true });
  }
  const used = opts.closeStale ? (await liveCount($, await loadRegistry($, p))).length : live.length;
  checks.push({
    name: "Thread slots",
    ok: used < reg.cap,
    detail: `${used} of ${reg.cap} in use.${closedNote}${stale.length ? ` Stale: ${stale.map((x) => `${x.t.id} (${shortTitle(x.t.title)}, ${x.why})`).join(", ")}.` : ""}`,
    fix: stale.length
      ? `Close the stale ones (ask me, or /threads setup clean)${stale.some((x) => x.why === "its lead chat is gone") ? ", or adopt the orphans so this chat leads them (ask me, or /threads adopt all)" : ""}. Or raise the cap: /threads cap <n>.`
      : "Close a thread (ask me, or /threads close <id>) or raise the cap: /threads cap <n>.",
  });
  checks.push({ name: "Default permission mode", ok: true, detail: `${await defaultMode($)} (change with /threads mode <mode>; inline threads use this chat's mode)` });
  const root = String($.plugin.root ?? "");
  const how = /\/plugins\/(cache|marketplaces)\//.test(root)
    ? `installed (${root}); update with claude plugin update threads@two-mods`
    : /\/dev-mods\//.test(root)
      ? `loaded from a hot-reload folder (${root}); edits apply on save`
      : `loaded from a folder (${root || "unknown"}), as with --plugin-dir`;
  checks.push({ name: "How the mod is loaded", ok: true, detail: how });

  const filled = await backfillPlanHistory($);
  if (filled) checks.push({ name: "Plan history", ok: true, detail: `wrote records for ${filled} older plan${filled === 1 ? "" : "s"} (backfilled)` });
  const passed = checks.filter((c) => c.critical).every((c) => c.ok);
  if (passed) await $.store.set(SETUP_KEY, await $.clock.now());
  await $.state.set(SETUP_RAN, { at: await $.clock.now(), passed, summary: setupSummary(checks) });
  const lines = ["Threads setup"];
  for (const c of checks) {
    lines.push(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
    if (!c.ok && c.fix) lines.push(`    Do: ${c.fix}`);
  }
  lines.push(passed ? "Session threads are ready." : "Session threads are not ready yet; inline threads (--inline) work now.");
  await logEvent($, p, "setup", { passed, failing: checks.filter((c) => !c.ok).map((c) => c.name) });
  return { passed, checks, text: lines.join("\n") };
}

function setupSummary(checks) {
  const bad = checks.filter((c) => !c.ok);
  return bad.length ? `Setup check: ${bad.map((c) => `✗ ${c.name} (${c.fix})`).join("; ")}` : "";
}

// Once per session, until setup has passed once: run it before the first create, and return a short summary.
async function setupOnFirstUse($) {
  if (await $.store.get(SETUP_KEY)) return "";
  const { value: ran } = await $.state.get(SETUP_RAN);
  if (ran) return ran.summary ?? "";
  const out = await runSetup($, {});
  return out.passed ? "" : setupSummary(out.checks);
}

// ---- phase plans ------------------------------------------------------------------------------------------------

async function loadPlan($, p, planId) {
  const reg = await loadRegistry($, p);
  return (reg.plans ?? []).find((x) => x.id === planId) ?? null;
}

async function savePlan($, p, plan) {
  await mutateRegistry($, p, (fresh) => {
    const plans = fresh.plans ?? [];
    fresh.plans = plans.some((x) => x.id === plan.id) ? plans.map((x) => (x.id === plan.id ? plan : x)) : [...plans, plan];
    return fresh;
  });
  try {
    await writePlanHistory($, p, plan);
  } catch (err) {
    $.ui.log(`threads: could not write plan history (${String(err?.message ?? err)})`, { to: "debug" });
  }
}

async function createPlan($, input) {
  const v = validatePlan(input);
  if (v.error) return { error: v.error };
  const setupNote = await setupOnFirstUse($);
  const made = await createPlanChecked($, input, v);
  if (!setupNote) return made;
  return made.error ? { error: `${made.error}\n${setupNote}` } : { ...made, text: `${made.text}\n${setupNote}` };
}

async function createPlanChecked($, input, v) {
  const p = await paths($);
  const here = await $.session.cwd();
  let cwd = String(input.cwd ?? "").trim() || here;
  if (cwd === "~" || cwd.startsWith("~/")) cwd = `${p.home}${cwd.slice(1)}`;
  if (!cwd.startsWith("/")) cwd = `${here}/${cwd}`;
  let st = null;
  try {
    st = await $.fs.stat(cwd, { resolve: true });
  } catch {
    st = null;
  }
  if (!st || st.kind !== "dir") return { error: `Folder not found: ${cwd}` };
  const real = st.realPath || cwd;
  const requested = String(input.backend ?? "auto").toLowerCase();
  let backend = requested;
  if (requested !== "inline") {
    const auth = await authStatus($);
    backend = auth.loggedIn ? "session" : requested === "session" ? "" : "inline";
    if (!backend) return { error: `${LOGIN_HINT} Or run the plan inline (backend inline).` };
  }
  if (backend === "session") {
    let claudeJson = "";
    try {
      claudeJson = await $.fs.read(p.claudeJson);
    } catch {
      claudeJson = "";
    }
    if (!isTrusted(claudeJson, real) && !isTrusted(claudeJson, cwd)) {
      return { error: `${real} is not a trusted folder. Open Claude Code there once and accept the trust prompt, then try again.` };
    }
  }
  let handoffDir = String(input.handoff_dir ?? "").trim() || `${real}/handoff`;
  if (!handoffDir.startsWith("/")) handoffDir = `${real}/${handoffDir}`;
  await run($, ["mkdir", "-p", handoffDir]);
  const reg = await loadRegistry($, p);
  const lead = await leadInfo($, p);
  const seed = await newUuid($);
  let id = `p${seed.replace(/[^0-9a-f]/g, "").slice(0, 5)}`;
  if ((reg.plans ?? []).some((x) => x.id === id)) id = `p${seed.replace(/[^0-9a-f]/g, "").slice(0, 8)}`;
  const now = await $.clock.now();
  const plan = { id, title: v.title, cwd: real, gate: v.gate, keepThreads: v.keepThreads, handoffDir, backend, createdAt: now, lead: { sessionId: lead.selfId, title: lead.title }, status: "running", current: 0, phases: v.phases };
  await savePlan($, p, plan);
  await logEvent($, p, "plan-created", { planId: id, title: v.title, gate: v.gate, backend, phases: v.phases.map((x) => `${x.name}:${x.model}${x.effort ? `/${x.effort}` : ""}`) });
  const first = await startPhase($, p, id, 0, {});
  const fresh = await loadPlan($, p, id);
  const lines = [
    `Plan ${v.title} (${id}) started: ${v.phases.length} phase${v.phases.length === 1 ? "" : "s"}, one at a time, ${backend} threads, gate ${v.gate}. Handoffs go to ${handoffDir}.`,
    first,
    planStatusText(fresh ?? plan),
    v.gate === "lead" || v.phases.some((x) => x.gate === "lead")
      ? `When a phase with a lead gate finishes, its report and handoff are added here; verify it and call threads_plan_advance with planId ${id}.`
      : `Watch it with /threads (p for the plan view) or /threads plan status.`,
  ];
  return { text: lines.join("\n"), id };
}

// Starts phase i as a thread, or leaves it queued while the live cap is full.
async function startPhase($, p, planId, i, opts) {
  const plan = await loadPlan($, p, planId);
  if (!plan || plan.status !== "running") return "The plan is not running.";
  const ph = plan.phases[i];
  if (!ph) return "No such phase.";
  if (ph.status !== "queued") return `Phase ${phaseNumber(i)} is already ${ph.status}.`;
  if (startingPhases.has(`${planId}:${i}`)) return `Phase ${phaseNumber(i)} is starting.`;
  startingPhases.add(`${planId}:${i}`);
  try {
    return await startPhaseNow($, p, plan, i, opts);
  } finally {
    startingPhases.delete(`${planId}:${i}`);
  }
}

async function startPhaseNow($, p, plan, i, opts) {
  const planId = plan.id;
  const ph = plan.phases[i];
  const reg = await loadRegistry($, p);
  const live = await liveCount($, reg);
  if (live.length >= reg.cap) {
    if (ph.note !== "waiting for a free thread slot (cap)") {
      ph.note = "waiting for a free thread slot (cap)";
      await savePlan($, p, plan);
    }
    await startWatcher($);
    return `Phase ${phaseNumber(i)} waits: ${live.length} threads are live and the cap is ${reg.cap}.`;
  }
  const now = await $.clock.now();
  const handoffPath = handoffPathFor(plan, i, now);
  const prev = i > 0 ? plan.phases[i - 1] : null;
  const prevThread = prev?.threadId ? reg.threads.find((t) => t.id === prev.threadId) : null;
  const predecessorHandoff = prevThread?.handoffPath || prev?.handoffPath || "";
  const task = buildPhasePrompt(plan, i, { handoffPath, predecessorHandoff });
  const made = await createThread($, {
    model: ph.model,
    title: phaseTitle(plan, i),
    task,
    cwd: plan.cwd,
    permissionMode: ph.permissionMode,
    reportBack: true,
    backend: plan.backend,
    effort: ph.effort,
    extra: { planId, phaseIndex: i, predecessorId: prev?.threadId ?? "", successorId: "", handoffPath, gate: gateAfter(plan, i), acceptance: ph.acceptance },
  });
  const fresh = (await loadPlan($, p, planId)) ?? plan;
  if (made.error) {
    fresh.phases[i] = { ...fresh.phases[i], status: "blocked", note: `could not start: ${clip(made.error, 200)}` };
    fresh.status = "blocked";
    await savePlan($, p, fresh);
    await planNote($, p, fresh, `Plan ${fresh.title}: phase ${phaseNumber(i)} ${ph.name} could not start: ${made.error}`, opts);
    return `Phase ${phaseNumber(i)} could not start: ${made.error}`;
  }
  const stepped = stepPlan(fresh, { type: "started", index: i, threadId: made.id, handoffPath, at: now });
  await savePlan($, p, stepped.plan);
  if (prev?.threadId) await patchThread($, p, prev.threadId, { successorId: made.id });
  await logEvent($, p, "phase-started", { planId, phase: i + 1, thread: made.id, handoffPath });
  await startWatcher($);
  return `Phase ${phaseNumber(i)} ${ph.name} started as ${made.id} on ${ph.model}${ph.effort ? `/${ph.effort}` : ""}.`;
}

// A phase thread finished a turn: did it hand off? Then the gate decides.
async function phaseFinished($, p, t, opts) {
  const plan = await loadPlan($, p, t.planId);
  if (!plan) return;
  const fresh = (await loadRegistry($, p)).threads.find((x) => x.id === t.id) ?? t;
  let hasHandoff = false;
  try {
    hasHandoff = Boolean(fresh.handoffPath) && (await $.fs.exists(fresh.handoffPath));
  } catch {
    hasHandoff = false;
  }
  const now = await $.clock.now();
  const stepped = stepPlan(plan, { type: "finished", index: fresh.phaseIndex, hasHandoff, at: now });
  await savePlan($, p, stepped.plan);
  await logEvent($, p, "phase-finished", { planId: plan.id, phase: fresh.phaseIndex + 1, thread: t.id, hasHandoff, actions: stepped.actions.map((a) => a.type) });
  await runPlanActions($, p, stepped.plan, stepped.actions, opts);
}

// Closes an accepted phase's thread: its process ends, its transcript and resume command stay.
async function retireThread($, p, t, reason, by = "plan") {
  if (t.backend === "inline") await stopInline($, { ...t, isMine: true });
  else if (t.tmux) await run($, tmuxArgv("kill-session", "-t", t.tmux), 5000);
  const now = await $.clock.now();
  await patchThread($, p, t.id, { status: "closed", closedAt: now, closedBy: by });
  await logEvent($, p, "auto-closed", { id: t.id, planId: t.planId ?? "", reason, resume: t.backend === "inline" ? "" : resumeCommand(t) });
  await releaseDesktop($, p, t);
  const tree = await finishWorktree($, p, t);
  return `Closed ${shortTitle(t.title)} (${t.id}): ${reason}.${tree}`;
}

// The phase before the running one stays open until the running one has produced output.
async function retireWaitingPredecessors($, p, reg) {
  for (const plan of reg.plans ?? []) {
    if (plan.keepThreads || plan.status !== "running") continue;
    const i = plan.current ?? 0;
    const cur = plan.phases[i];
    const prev = plan.phases[i - 1];
    if (!cur?.threadId || !prev?.threadId || prev.status !== "done") continue;
    const before = reg.threads.find((t) => t.id === prev.threadId);
    const now = reg.threads.find((t) => t.id === cur.threadId);
    if (!before || before.status === "closed" || !now) continue;
    if (await hasOutput($, p, now)) await retireThread($, p, before, `phase ${phaseNumber(i)} is under way`);
  }
}

async function hasOutput($, p, t) {
  if (t.backend === "inline") {
    const { value: feed = {} } = await $.state.get(ACTIVITY);
    return (feed[t.id] ?? []).some((x) => x.kind === "tool" || x.kind === "assistant" || x.kind === "done");
  }
  const parsed = parseTranscript(await transcriptTail($, p, t, "65536"));
  return parsed.items.some((x) => x.kind === "tool" || x.kind === "assistant");
}

async function runPlanActions($, p, plan, actions, opts) {
  const out = [];
  for (const a of actions) {
    const ph = plan.phases[a.index ?? plan.current ?? 0];
    const reg = await loadRegistry($, p);
    const t = ph?.threadId ? reg.threads.find((x) => x.id === ph.threadId) : null;
    if (a.type === "retire") {
      if (t && t.status !== "closed") out.push(await retireThread($, p, t, a.reason));
    } else if (a.type === "start") {
      out.push(await startPhase($, p, plan.id, a.index, opts));
    } else if (a.type === "nudge" && t) {
      out.push(await sendToThread($, { ...t, isMine: true }, handoffNudge(t.handoffPath, plan)));
    } else if (a.type === "revise" && t) {
      const now = await $.clock.now();
      const handoffPath = handoffPathFor(plan, a.index, now);
      await patchThread($, p, t.id, { handoffPath });
      const fresh = (await loadPlan($, p, plan.id)) ?? plan;
      fresh.phases[a.index] = { ...fresh.phases[a.index], handoffPath };
      await savePlan($, p, fresh);
      out.push(await sendToThread($, { ...t, isMine: true, handoffPath }, revisionPrompt(a.feedback, handoffPath, plan)));
    } else if (a.type === "ask-lead" && t) {
      const report = clip(t.lastReport?.text ?? "", 1500);
      const note = [
        `<plan gate: ${plan.title} (${plan.id}), phase ${phaseNumber(a.index)} ${ph.name} finished>`,
        `Thread: ${t.title} (${t.id}), model ${t.verifiedModel || t.requestedModel}`,
        `Handoff: ${t.handoffPath}`,
        `Acceptance check: ${ph.acceptance || "(none given)"}`,
        "Report:",
        report || "(no report text)",
        `Verify it (read the handoff, check the acceptance), then call threads_plan_advance with planId ${plan.id} and decision approve or revise (with feedback).`,
        "</plan gate>",
      ].join("\n");
      const nn = phaseNumber(a.index);
      await planNote($, p, plan, note, opts, `Plan ${plan.title} (${plan.id}): phase ${nn} ${ph.name} is ready for your review. If phase ${nn} of plan ${plan.id} was already approved or revised, ignore this. Otherwise read the plan gate note above, verify the handoff against the acceptance check, then call threads_plan_advance.`);
      $.ui.toast(`Plan ${plan.title}: phase ${phaseNumber(a.index)} awaits the lead's review`, { timeoutMs: 8000 });
      out.push(`Phase ${phaseNumber(a.index)} awaits the lead's review.`);
    } else if (a.type === "ask-user") {
      $.ui.toast(`Plan ${plan.title}: phase ${phaseNumber(a.index + 1)} ready · /threads plan next`, { timeoutMs: 10000 });
      out.push(`Phase ${phaseNumber(a.index)} done; run /threads plan next to start phase ${phaseNumber(a.index + 1)}.`);
    } else if (a.type === "blocked") {
      $.ui.toast(`Plan ${plan.title} is blocked at phase ${phaseNumber(a.index)}: ${a.reason}`, { timeoutMs: 10000 });
      await planNote($, p, plan, `<plan blocked: ${plan.title} (${plan.id})>\nPhase ${phaseNumber(a.index)} ${ph?.name ?? ""}: ${a.reason}. Tell the user; /threads plan retry ${a.index + 1} starts it again.\n</plan blocked>`, { quiet: true });
      out.push(`Plan blocked at phase ${phaseNumber(a.index)}: ${a.reason}.`);
    } else if (a.type === "done") {
      const regNow = await loadRegistry($, p);
      const costs = new Map(regNow.threads.map((x) => [x.id, x.costUsd ?? 0]));
      const total = plan.phases.reduce((acc, x) => acc + (costs.get(x.threadId) ?? 0), 0);
      const lines = [
        ...plan.phases.map((x, j) => `${phaseNumber(j)} ${x.name} (${x.model}${x.effort ? `/${x.effort}` : ""}, ${money(costs.get(x.threadId) ?? 0)}): ${x.handoffPath || "(no handoff)"}`),
        `Total est. API-equivalent: ${money(total)}. History: ${p.dir}/plans/${plan.id}.md`,
      ];
      await planNote($, p, plan, `<plan done: ${plan.title} (${plan.id})>\nAll ${plan.phases.length} phases finished. Handoffs:\n${lines.join("\n")}\n${plan.keepThreads ? `The phase threads are idle; /threads plan close ${plan.id} closes them.` : "Accepted phase threads were closed; their transcripts stay and /threads list shows how to resume them."}\n</plan done>`, { quiet: true });
      $.ui.toast(plan.keepThreads ? `Plan ${plan.title} done · /threads plan close closes its threads` : `Plan ${plan.title} done`, { timeoutMs: 10000 });
      await logEvent($, p, "plan-done", { planId: plan.id });
      out.push(`Plan ${plan.title} is done.`);
    } else if (a.type === "ignored") {
      out.push(`Nothing to do: ${a.reason}.`);
    }
  }
  await refresh($, { force: true });
  return out.join("\n");
}

// A row the lead's model reads; with wakeText (and not quiet), also start a lead turn once it is idle.
async function planNote($, p, plan, text, opts, wakeText) {
  try {
    await $.session.append({ message: { type: "user", content: [{ type: "text", text }] } });
  } catch (err) {
    $.ui.log(`threads: could not append a plan note (${String(err?.message ?? err)})`, { to: "debug" });
  }
  await logEvent($, p, "plan-note", { planId: plan.id, text: clip(text, 300), wake: Boolean(wakeText) });
  if (wakeText) await queueWake($, { key: `gate:${plan.id}:${plan.current ?? 0}`, kind: "gate", planId: plan.id, index: plan.current ?? 0, text: wakeText });
}

// ---- wakes --------------------------------------------------------------------------------------------------------
//
// A wake is a prompt that starts a lead turn. It waits in WAKES until the lead is idle (the
// lead's turn.complete, a watcher tick, or right away), and a gate wake is checked again
// before it is submitted and once more as it enters: if the gate was decided meanwhile, it is dropped.

async function queueWake($, wake) {
  const at = await $.clock.now();
  await update($, WAKES, (cur) => ({ ...(cur ?? {}), [wake.key]: { ...wake, at } }));
  await scheduleWakes($);
}

async function scheduleWakes($) {
  const { value: wakes = {} } = await $.state.get(WAKES);
  if (Object.keys(wakes).length === 0) return;
  $.clock.after(0, () => {
    void fireWakes($).catch(() => undefined);
  });
}

async function gateStillOpen($, planId, index) {
  const p = await paths($);
  const plan = await loadPlan($, p, planId);
  return Boolean(plan && plan.status === "running" && (plan.current ?? 0) === index && plan.phases[index]?.status === "awaiting-gate");
}

// "phase NN of plan <id>" in a wake's text
function wakeGateOf(text) {
  const m = /If phase (\d+) of plan (p[0-9a-f]+) was already/.exec(String(text ?? ""));
  return m ? { index: Number(m[1]) - 1, planId: m[2] } : null;
}

async function fireWakes($) {
  const { value: lead = {} } = await $.state.get(LEAD);
  if (lead.busy) return;
  const { value: wakes = {} } = await $.state.get(WAKES);
  const keys = Object.keys(wakes).sort((a, b) => (wakes[a].at ?? 0) - (wakes[b].at ?? 0));
  if (keys.length === 0) return;
  const p = await paths($);
  for (const key of keys) {
    const w = wakes[key];
    await update($, WAKES, (cur) => {
      const next = { ...(cur ?? {}) };
      delete next[key];
      return next;
    });
    const isOpen = w.kind !== "gate" || (await gateStillOpen($, w.planId, w.index));
    if (!isOpen) {
      await logEvent($, p, "wake-dropped", { key, reason: "the gate was already decided" });
      continue;
    }
    await logEvent($, p, "wake-sent", { key });
    await $.state.set(LEAD, { busy: true });
    void $.prompt.submit({ text: w.text });
    return; // one at a time; the rest wait for the next idle moment
  }
}

async function advancePlan($, planId, decision, feedback, opts) {
  const p = await paths($);
  const plan = await loadPlan($, p, planId);
  if (!plan) return { error: `No plan ${planId}. /threads plan status lists them.` };
  if (decision !== "approve" && decision !== "revise") return { error: "decision must be approve or revise." };
  const now = await $.clock.now();
  const stepped = stepPlan(plan, { type: "decision", decision, feedback, at: now });
  await savePlan($, p, stepped.plan);
  await logEvent($, p, "plan-decision", { planId, decision, feedback: clip(feedback ?? "", 300), actions: stepped.actions.map((a) => a.type) });
  const text = await runPlanActions($, p, stepped.plan, stepped.actions, opts);
  const after = (await loadPlan($, p, planId)) ?? stepped.plan;
  return { text: `${text}\n${planStatusText(after)}` };
}

// The plan /threads plan acts on: the one named, else this chat's newest that is not done.
async function pickPlan($, p, ref) {
  const reg = await loadRegistry($, p);
  const selfId = await $.session.id();
  const plans = (reg.plans ?? []).filter((x) => x.lead?.sessionId === selfId || x.id === ref);
  if (ref) return plans.find((x) => x.id === ref || x.title.toLowerCase().startsWith(String(ref).toLowerCase())) ?? null;
  return [...plans].reverse().find((x) => x.status !== "done" && x.status !== "stopped") ?? plans[plans.length - 1] ?? null;
}

async function planCommand($, rest, after) {
  const p = await paths($);
  const sub = (rest[0] ?? "status").toLowerCase();
  if (sub === "start" || sub === "new") {
    const parsed = parsePlanCommand(after.slice(after.toLowerCase().indexOf(sub) + sub.length));
    if (parsed.error) return parsed.error;
    const made = await createPlan($, { title: parsed.title, gate: parsed.gate, cwd: parsed.cwd, phases: parsed.phases });
    return made.error ? `Not started. ${made.error}` : made.text;
  }
  const plan = await pickPlan($, p, sub === "retry" ? undefined : rest[1]);
  if (!plan) return "No plans in this chat yet. Start one with threads_plan or /threads plan start.";
  const reg = await loadRegistry($, p);
  const byId = new Map(reg.threads.map((t) => [t.id, t]));
  if (sub === "status") return planStatusText(plan, byId);
  if (sub === "next") {
    const out = await advancePlan($, plan.id, "approve", "", { quiet: true });
    return out.error ?? out.text;
  }
  if (sub === "stop") {
    const stepped = stepPlan(plan, { type: "stop" });
    await savePlan($, p, stepped.plan);
    await logEvent($, p, "plan-stopped", { planId: plan.id });
    return `Plan ${plan.title} stopped; its threads keep running until you close them (/threads plan close).`;
  }
  if (sub === "retry") {
    const n = Number(rest[1]);
    if (!Number.isInteger(n) || n < 1 || n > plan.phases.length) return `Usage is /threads plan retry <phase number 1-${plan.phases.length}>`;
    const stepped = stepPlan(plan, { type: "retry", index: n - 1 });
    await savePlan($, p, stepped.plan);
    return runPlanActions($, p, stepped.plan, stepped.actions, { quiet: true });
  }
  if (sub === "close") return closePlanThreads($, plan, { from: "command" });
  return `Unknown /threads plan option "${sub}". Use start, status, next, retry <n>, stop or close.`;
}

// ---- reports -------------------------------------------------------------------------------------------------

async function noteReport($, text) {
  const p = await paths($);
  const reg = await loadRegistry($, p);
  let t = threadOfDelivery(text, reg.threads);
  if (!t) {
    const sessions = await scanSessions($, p);
    const enriched = reg.threads.map((x) => {
      const s = sessions.get(x.sessionId);
      return s ? { ...x, pid: s.pid, socket: s.messagingSocketPath ?? x.socket } : x;
    });
    t = threadOfDelivery(text, enriched);
  }
  if (!t) return;
  const now = await $.clock.now();
  const body = clip(stripTags(text), ANSWER_MAX);
  await patchThread($, p, t.id, { lastReport: { at: now, text: body, source: "peer" } });
  await logEvent($, p, "report-received", { id: t.id, text: clip(body, 500) });
  $.ui.toast(`${shortTitle(t.title)}: ${clip(body, 140)}`, { timeoutMs: 8000 });
  await update($, VIEW, (v) => {
    const cur = v ?? EMPTY_VIEW;
    return { ...cur, threads: cur.threads.map((x) => (x.id === t.id ? { ...x, lastReport: { at: now, text: body, source: "peer" } } : x)) };
  });
}

// ---- waiting --------------------------------------------------------------------------------------------------

async function waitForThreads($, args, signal) {
  const until = ["idle", "any_change", "needs_you"].includes(args?.until) ? args.until : "idle";
  const timeoutS = Math.min(600, Math.max(3, Number(args?.timeout_s) || 300));
  await refresh($, { force: true });
  let view = await viewThreads($);
  let targets;
  if (Array.isArray(args?.ids) && args.ids.length > 0) {
    targets = [];
    for (const ref of args.ids) {
      const found = resolveRef(view.threads, ref);
      if (found.error) return found.error;
      targets.push(found.thread.id);
    }
  } else {
    targets = view.threads.filter((t) => t.isMine && LIVE.has(t.status)).map((t) => t.id);
    if (targets.length === 0) return "No live threads of this chat to wait for. threads_list shows every thread.";
  }
  const pick = (v) => v.threads.filter((t) => targets.includes(t.id));
  const base = new Map(pick(view).map((t) => [t.id, { status: t.status, lastLine: t.lastLine, report: t.lastReport?.at ?? 0 }]));
  const idleSeen = new Map();
  const startedAt = await $.clock.now();
  let reason = "";
  for (;;) {
    if (signal?.aborted) {
      reason = "Stopped waiting: interrupted.";
      break;
    }
    const rows = pick(view);
    for (const t of rows) idleSeen.set(t.id, t.status === "idle" ? (idleSeen.get(t.id) ?? 0) + 1 : 0);
    const changed = rows.filter((t) => {
      const b = base.get(t.id);
      return !b || b.status !== t.status || b.lastLine !== t.lastLine || b.report !== (t.lastReport?.at ?? 0);
    });
    const isDone = (t) =>
      !LIVE.has(t.status) ||
      ATTENTION.has(t.status) ||
      (t.status === "idle" && t.lastKind !== "user" && t.lastKind !== "message" && (idleSeen.get(t.id) ?? 0) >= 1);
    if (until === "any_change" && changed.length > 0) {
      reason = "Something changed.";
      break;
    }
    if (until === "needs_you" && rows.some((t) => ATTENTION.has(t.status))) {
      reason = "A thread needs you.";
      break;
    }
    if (until === "idle" && rows.length > 0 && rows.every(isDone)) {
      reason = "Every thread is done or needs you.";
      break;
    }
    const now = await $.clock.now();
    if (now - startedAt >= timeoutS * 1000) {
      reason = `Timed out after ${timeoutS}s.`;
      break;
    }
    await run($, ["sleep", "3"], 10000);
    await refresh($, { force: true });
    view = await viewThreads($);
  }
  const p = await paths($);
  const rows = pick(view);
  const out = [reason];
  const changedIds = rows
    .filter((t) => {
      const b = base.get(t.id);
      return !b || b.status !== t.status || b.lastLine !== t.lastLine || b.report !== (t.lastReport?.at ?? 0);
    })
    .map((t) => t.id);
  out.push(`Changed: ${changedIds.length ? changedIds.join(", ") : "none"}`);
  for (const t of rows) {
    out.push("");
    out.push(`${t.id} ${t.title} [${t.status}] model ${t.verifiedModel || t.requestedModel}${t.costUsd ? ` · ${money(t.costUsd)} est. API-equivalent` : ""}`);
    const answer = await latestAnswer($, p, t);
    const items = (await transcriptLines($, p, t, 5)).map((l) => `  ${clip(l, 300)}`);
    out.push("  recent:", ...(items.length ? items : ["  (no transcript yet)"]));
    if (t.status === "needs-you" && t.prompt) out.push(`  waiting on: ${clip(oneLine(t.prompt), 300)}`);
    if (t.lastReport?.source === "peer" && t.lastReport.text && t.lastReport.text !== answer) out.push(`  message it sent the lead: ${t.lastReport.text}`);
    out.push(answer ? `  latest answer:\n${answer}` : "  latest answer: (none yet)");
  }
  return clip(out.join("\n"), 16000);
}

// ---- reading and listing --------------------------------------------------------------------------------------

async function readText($, t, mode, limit) {
  const p = await paths($);
  if (mode === "screen" && t.backend === "inline") {
    const n = Math.min(60, Math.max(1, Number(limit) || 30));
    return fitTail([`${t.title} (${t.id}) live activity, ${t.status}:`], (await activityLines($, t, n)).map((l) => clip(l, 400)), 9000);
  }
  if (mode === "screen") {
    const n = Math.min(80, Math.max(1, Number(limit) || 30));
    if (!LIVE.has(t.status) && t.status !== "exited") return `${t.id} is ${t.status}; it has no screen.`;
    const lines = screenLines(await capture($, t.tmux, true), n).map((l) => clip(l, 400));
    return fitTail([`${t.title} (${t.id}) screen, ${t.status}:`], lines, 9000);
  }
  const n = Math.min(60, Math.max(1, Number(limit) || 20));
  const lines = (await transcriptLines($, p, t, n)).map((l) => clip(l, 400));
  const head = `${t.title} (${t.id}) transcript, ${t.status}, model ${t.verifiedModel || `${t.requestedModel} (not verified yet)`}:`;
  const answer = await latestAnswer($, p, t);
  const tail = answer ? `\nlatest answer:\n${answer}` : "";
  return fitTail([head], lines.length ? lines : ["(nothing yet)"], 14000 - tail.length) + tail;
}

async function listText($, opts = {}) {
  const view = await viewThreads($);
  if (view.threads.length === 0) return "No threads yet. Create one with /threads new <model> <title> -- <task>.";
  const archived = view.threads.filter((t) => t.archived);
  const all = opts.includeArchived ? view.threads : view.threads.filter((t) => !t.archived);
  const fmt = (t) => {
    const model = `${t.verifiedModel ? `${t.requestedModel} → ${t.verifiedModel}` : `${t.requestedModel} (unverified)`}${t.costUsd ? ` · ${money(t.costUsd)} est.` : ""}${t.pinned ? " · pinned" : ""}${t.forkedFrom ? (t.handedOff ? " · handoff" : " · fork") : ""}${t.archived ? " · archived" : ""}${isUnread(t) ? " · new" : ""}`;
    const tree = t.worktree ? `, worktree ${t.worktree.branch}${t.worktree.removed ? " (removed)" : t.worktree.kept ? " (kept)" : ""}` : "";
    const desk = t.desktop?.length ? `, desktop ${t.desktop.join("+")}` : "";
    const kind = `${t.backend === "inline" ? "inline, chat's mode" : `session, ${t.permissionMode || "default"}`}${tree}${desk}`;
    const lines = [`${t.id}  ${dotOf(t.status)} ${t.status.padEnd(11)} ${shortTitle(t.title)}  ·  ${kind}  ·  ${model}  ·  ${shortPath(t.cwd, 50)}`];
    // full reports only for this chat's open threads; closed ones and other chats' get one line
    const full = opts.forModel && t.isMine && t.status !== "closed";
    if (t.lastReport?.text) lines.push(full ? `      report:\n${t.lastReport.text}` : `      report: ${clip(oneLine(t.lastReport.text), 160)}`);
    if (t.lastLine) lines.push(`      last: ${clip(t.lastLine, 160)}`);
    return lines.join("\n");
  };
  const mine = all.filter((t) => t.isMine);
  const othersAll = all.filter((t) => !t.isMine);
  // other chats' closed threads are history, not something to act on: counted unless asked for
  const others = opts.includeClosed ? othersAll : othersAll.filter((t) => t.status !== "closed");
  const hiddenClosed = othersAll.length - others.length;
  const out = [`Threads of this chat (${mine.length}), cap ${view.cap} live:`];
  out.push(...(mine.length ? mine.map(fmt) : ["  none"]));
  if (others.length) {
    out.push(`Threads of other chats (${others.length}):`);
    out.push(...others.map((t) => `${fmt(t)}\n      lead: ${t.parent?.title ?? "?"}`));
  }
  if (hiddenClosed) out.push(`(${hiddenClosed} closed thread${hiddenClosed === 1 ? "" : "s"} of other chats hidden; ask to include closed to see them.)`);
  if (archived.length && !opts.includeArchived) out.push(`(${archived.length} archived thread${archived.length === 1 ? "" : "s"} hidden; ask to include archived to see them.)`);
  const total = mine.reduce((a, t) => a + (t.costUsd ?? 0), 0);
  if (total) out.push(`This chat's threads: ${money(total)} est. API-equivalent (list prices, not billing).`);
  return clip(out.join("\n"), opts.forModel ? 16000 : 20000);
}

// ---- the command ------------------------------------------------------------------------------------------------

const HELP = [
  "Threads: real Claude Code sessions on other models that this chat creates, watches and steers.",
  "",
  "/threads                          toggle the Threads pane (1-9 select, w transcript/screen, s steer, i interrupt, m model, o open, x close, r refresh, c close pane)",
  "/threads new <model> <title> -- <task>   create one; flags before -- : --inline or --session, --cwd <path>, --mode default|acceptEdits|plan|auto, --no-report",
  "                                  session = its own Claude Code process (needs claude auth login); inline = a background agent of this chat; default picks session when logged in",
  "/threads list                     every thread with status, model and last line",
  "/threads send <id> <message>      deliver a message (works mid-task)",
  "/threads type <id> <text>         type into its prompt and press Enter",
  "/threads interrupt <id>           press Escape",
  "/threads model <id> <model>       switch model (when idle)",
  "/threads approve <id> | deny <id> answer its permission prompt, after you confirm",
  "/threads open <id>                Remote Control link, live terminal and resume commands",
  "/threads close <id>               end it (asks first); the transcript stays",
  "/threads cap <n>                  max live threads (default 4)",
  "/threads show [<id>|plan]         open the Threads pane (or ask: show me the threads)",
  "/threads fork <model> <title> [--full] [--worktree] -- <task>   a thread that carries this chat's context (or ask: fork this into a haiku thread that ...)",
  "/threads handoff <model> <title> [-- <next step>]   hand this chat's work to a thread that carries on and reports back",
  "/threads rename <id> <new name>   rename a thread (its session name too, when it is idle)",
  "/threads read <id> · /threads markread [<id>|all]   new output shows as new until you look at it",
  "/threads adopt <id>|all           lead threads whose chat is gone",
  "/threads pin|unpin|archive|unarchive <id>   pinned threads stay on top and are never cleaned up; archived ones are hidden",
  "/threads history [<planId>]       saved plan records",
  "/threads setup [clean]            check login, tmux, folder trust, the cap and stale threads; say exactly what to fix (clean closes the stale ones)",
  "/threads mode [<mode>]            default permission mode for new session threads (bypassPermissions unless changed); --mode or permission_mode overrides per thread",
  "/threads clean                    drop closed or exited threads older than 7 days",
  "/threads effort <id> <level>      low, medium, high, xhigh or max (session threads: when idle; inline: from the next request)",
  "/threads plan start <title> [--gate auto|lead|user] [--cwd P] -- <model>[/<effort>] <Name>: <task> || ...   run phases one at a time with handoffs",
  "/threads plan status | next | retry <n> | stop | close   (or ask in plain English; the model uses threads_plan and threads_plan_advance)",
  "/threads autowake on|off          start a turn here when a thread finishes (default off: the report waits for your next turn)",
  "",
  "Models: haiku, sonnet, opus, fable or a full claude-* id. Session threads need a trusted folder and the terminal login (claude auth status).",
  "Session threads run with bypassed permissions by default (they never stop to ask); /threads mode changes that. Inline threads use this chat's own mode.",
  "Or ask in plain English, e.g. spin up a Haiku thread to triage the inbox.",
].join("\n");

async function runCommand($, args) {
  const text = String(args ?? "").trim();
  const [first = "", ...rest] = tokenize(text);
  const verb = first.toLowerCase();
  const after = text.slice(text.indexOf(first) + first.length).trim();

  if (verb === "") return togglePane($);
  if (verb === "help") return HELP;
  if (verb === "new" || verb === "create") {
    const parsed = parseNew(after);
    if (parsed.error) return parsed.error;
    const made = await createThread($, parsed);
    return made.error ? `Not created. ${made.error}` : made.text;
  }
  if (verb === "list" || verb === "ls") {
    await refresh($, { force: true });
    return listText($);
  }
  if (verb === "refresh") {
    await refresh($, { force: true });
    await watchTick($, { quiet: true });
    return "Threads refreshed.";
  }
  if (verb === "close" && rest.length === 0) {
    await $.ui.close({ id: PANE });
    return "Threads pane closed.";
  }
  if (verb === "cap") {
    const n = Number(rest[0]);
    const p = await paths($);
    if (!rest[0]) {
      const reg = await loadRegistry($, p);
      return `The cap is ${reg.cap} live threads.`;
    }
    if (!Number.isInteger(n) || n < 1 || n > MAX_CAP) return `Usage is /threads cap <n>, a whole number from 1 to ${MAX_CAP}.`;
    await mutateRegistry($, p, (reg) => ({ ...reg, cap: n }));
    await logEvent($, p, "cap-set", { cap: n });
    await refresh($, { force: true });
    return `Cap set to ${n} live threads.`;
  }
  if (verb === "clean") return cleanRegistry($);
  if (verb === "plan" || verb === "plans") return planCommand($, rest, after);
  if (verb === "adopt") return adoptThreads($, { ids: rest.filter((x) => x !== "all"), all: rest.includes("all") });
  if (verb === "history") return planHistoryText($, rest[0]);
  if (verb === "show") return showPane($, { id: rest[0] && rest[0] !== "plan" ? rest[0] : undefined, plan: rest[0] === "plan" });
  if (verb === "fork") {
    const parsed = parseNew(`${rest[0] ?? ""} ${after.slice(after.indexOf(rest[0] ?? "") + (rest[0] ?? "").length)}`);
    if (parsed.error) return "Usage is /threads fork <model> <title> [--full] -- <task> (or ask: fork this chat into a haiku thread that ...)";
    const made = await forkThread($, { model: parsed.model, title: parsed.title.replace(/\s*--full\b/, ""), task: parsed.task, cwd: parsed.cwd, effort: parsed.effort, worktree: parsed.worktree === true, include: /--full\b/.test(after) ? "full" : "summary" });
    return made.error ? `Not forked. ${made.error}` : made.text;
  }
  if (verb === "handoff") {
    const body = after.slice(after.indexOf(rest[0] ?? "") + (rest[0] ?? "").length);
    const parsed = parseNew(`${rest[0] ?? ""} ${/(^|\s)--(\s|$)/.test(body) ? body : `${body} -- carry on`}`);
    if (parsed.error) return "Usage is /threads handoff <model> <title> [--worktree] [-- <next step>] (or ask: hand this off to a sonnet thread)";
    const next = /(^|\s)--(\s|$)/.test(body) ? parsed.task : "";
    const made = await handoffThread($, { model: parsed.model, title: parsed.title, next, cwd: parsed.cwd, effort: parsed.effort, worktree: parsed.worktree === true, backend: parsed.backend });
    return made.error ? `Not handed off. ${made.error}` : made.text;
  }
  if (verb === "markread" || verb === "mark-read") return markReadText($, { id: rest[0] && rest[0] !== "all" ? rest[0] : undefined, all: !rest[0] || rest[0] === "all" });
  if (verb === "setup" || verb === "doctor") {
    const out = await runSetup($, { cwd: rest[0] === "clean" ? undefined : rest[0], closeStale: rest[0] === "clean" });
    return out.text;
  }
  if (verb === "mode") {
    const want = rest[0];
    if (!want) return `New session threads and plan phases run in ${await defaultMode($)} mode unless one says otherwise. Usage is /threads mode bypassPermissions|default|acceptEdits|plan|auto.`;
    const m = checkMode(want);
    if (m.error) return m.error;
    await $.store.set(MODE_KEY, m.mode);
    const p = await paths($);
    await logEvent($, p, "default-mode-set", { mode: m.mode });
    return `New session threads and plan phases now run in ${m.mode} mode by default (running threads keep theirs; inline threads always use this chat's mode).`;
  }
  if (verb === "autowake") {
    const want = (rest[0] ?? "").toLowerCase();
    if (want !== "on" && want !== "off") {
      return `Autowake is ${(await $.store.get(AUTOWAKE_KEY)) === true ? "on" : "off"}. Usage is /threads autowake on|off.`;
    }
    await $.store.set(AUTOWAKE_KEY, want === "on");
    return want === "on"
      ? "Autowake on: when a thread finishes, this chat starts a turn to read its report (once it is idle)."
      : "Autowake off: thread reports are added to this chat and read on your next turn.";
  }

  const needsId = ["send", "type", "interrupt", "stop", "model", "effort", "approve", "deny", "close", "open", "read", "screen", "pin", "unpin", "archive", "unarchive", "rename"];
  if (!needsId.includes(verb)) return `Unknown /threads option "${first}".\n\n${HELP}`;
  const ref = rest[0];
  if (!ref) return `Usage is /threads ${verb} <id>${["send", "type"].includes(verb) ? " <text>" : verb === "model" ? " <model>" : ""}`;
  await refresh($, { force: true });
  const found = await findThread($, ref, { includeArchived: verb === "unarchive" });
  if (found.error) return found.error;
  const t = found.thread;
  if (verb === "pin" || verb === "unpin") return setFlag($, t, "pinned", verb === "pin");
  if (verb === "archive" || verb === "unarchive") return setFlag($, t, "archived", verb === "archive");
  const tail = after.slice(after.indexOf(ref) + ref.length).trim();

  if (verb === "send") return tail ? sendToThread($, t, tail) : "Usage is /threads send <id> <message>";
  if (verb === "rename") return tail ? renameThread($, t, tail) : "Usage is /threads rename <id> <new name>";
  if (verb === "type") return tail ? typeIntoThread($, t, tail) : "Usage is /threads type <id> <text>";
  if (verb === "interrupt" || verb === "stop") return interruptThread($, t);
  if (verb === "model") return tail ? setThreadModel($, t, tail) : "Usage is /threads model <id> <model>";
  if (verb === "effort") return tail ? setThreadEffort($, t, tail) : "Usage is /threads effort <id> low|medium|high|xhigh|max";
  if (verb === "approve") return answerPrompt($, t, true);
  if (verb === "deny") return answerPrompt($, t, false);
  if (verb === "close") return closeThread($, t, { from: "command" });
  if (verb === "open") return openThread($, t);
  if (verb === "read") {
    const text = await readText($, t, "transcript", 20);
    if (isUnread(t)) await markRead($, [t.id]);
    return text;
  }
  return readText($, t, "screen", 30);
}

async function togglePane($) {
  const isOpen = (await $.ui.panes()).some((p) => p.id === PANE);
  if (isOpen) {
    await $.ui.close({ id: PANE });
    return "Threads pane closed.";
  }
  await refresh($, { force: true });
  const opened = await $.ui.open({ id: PANE, title: PANE_TITLE });
  await refresh($, { force: true });
  if (!opened.isPlaced) return `The Threads pane could not be placed (${opened.reason}).\n${await listText($)}`;
  const view = await viewThreads($);
  const live = view.threads.filter((t) => t.isMine && LIVE.has(t.status)).length;
  return `Threads pane open: ${live} live thread${live === 1 ? "" : "s"} of this chat.`;
}

async function cleanRegistry($) {
  const p = await paths($);
  const now = await $.clock.now();
  const reg = await loadRegistry($, p);
  const gone = cleanable(reg.threads.filter((t) => !t.pinned), now, CLEAN_AGE_MS);
  if (gone.length === 0) return "Nothing to clean: no closed or exited threads older than 7 days.";
  const ids = new Set(gone.map((t) => t.id));
  for (const t of gone) {
    if (t.status === "exited" && t.backend !== "inline" && t.tmux) await run($, tmuxArgv("kill-session", "-t", t.tmux), 5000);
  }
  await mutateRegistry($, p, (fresh) => {
    fresh.threads = fresh.threads.filter((t) => !ids.has(t.id));
    return fresh;
  });
  await logEvent($, p, "cleaned", { ids: [...ids] });
  await refresh($, { force: true });
  return `Removed ${gone.length} old thread${gone.length === 1 ? "" : "s"} from the registry (${[...ids].join(", ")}). Transcripts and events are kept.`;
}

// ---- pane state ----------------------------------------------------------------------------------------------------

async function patchUi($, change) {
  await update($, UI, (ui) => change(ui ?? EMPTY_UI));
}

async function selectThread($, id) {
  await patchUi($, (u) => ({ ...u, selected: id, steering: false, renaming: false, notice: "", picker: "", armedClose: null }));
  const view = await viewThreads($);
  const t = view.threads.find((x) => x.id === id);
  if (t && isUnread(t)) await markRead($, [id]);
  else await refresh($, { force: true });
}

async function toggleMode($) {
  await patchUi($, (u) => ({ ...u, mode: u.mode === "screen" ? "transcript" : "screen" }));
  await refresh($, { force: true });
}

async function noticeOf($, action) {
  let text;
  try {
    text = await action();
  } catch (err) {
    text = `Failed: ${String(err?.message ?? err)}`;
  }
  await patchUi($, (u) => ({ ...u, notice: String(text ?? "").split("\n").map(oneLine).join("\n") }));
  $.ui.toast(clip(oneLine(text), 160), { timeoutMs: 6000 });
  return text;
}

// The head lines, then as many of the newest body lines as fit in max characters.
function fitTail(head, body, max) {
  let room = max - head.join("\n").length - 40;
  const kept = [];
  for (let i = body.length - 1; i >= 0; i--) {
    room -= body[i].length + 1;
    if (room < 0) break;
    kept.unshift(body[i]);
  }
  const dropped = body.length - kept.length;
  return [...head, ...(dropped ? [`(${dropped} older line${dropped === 1 ? "" : "s"} left out)`] : []), ...kept].join("\n");
}

function clockOf(ms) {
  if (!ms) return "not refreshed yet";
  const d = new Date(ms);
  const two = (n) => String(n).padStart(2, "0");
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

