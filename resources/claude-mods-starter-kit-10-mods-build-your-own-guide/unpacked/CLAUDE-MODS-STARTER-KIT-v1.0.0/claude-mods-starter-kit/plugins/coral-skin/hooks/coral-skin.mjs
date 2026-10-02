// Coral Skin: coral, ink and cream reskin with risk-coded tool rows.
// Visual only. Uses no filesystem, network, model, or permission APIs.
// Toggle with /skin, /skin on, /skin off, /skin risk.

import { update } from "claude-code";

const C = {
  coral: "#e8603c",
  coralDim: "#a8472e",
  ink: "#141413",
  card: "#1f1c19",
  cream: "#f6efe3",
  paper: "#fbf6ee",
  muted: "#b8ad9c",
  sage: "#9cc5a1",
  sageBg: "#1e2a21",
  amber: "#f0a33a",
  red: "#d93b3b",
};

const prefsRef = { plugin: "coral-skin", key: "prefs" };
const turnRef = { plugin: "coral-skin", key: "turn" };
const STORE_KEY = "prefs";
const DEFAULT_PREFS = { enabled: true, risk: true };
const EMPTY_TURN = { active: false, startedAt: 0, now: 0, frame: 0, reads: 0, edits: 0, bash: 0, danger: 0, other: 0 };

const READ_TOOLS = new Set(["Read", "Grep", "Glob", "LS", "WebFetch", "WebSearch", "NotebookRead", "TodoWrite", "ToolSearch"]);
const EDIT_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const DESTRUCTIVE = [
  /\brm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+)+/,
  /\brm\s+--(recursive|force)\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+push\b[^|;&]*\s(--force\b|--force-with-lease\b|-f\b)/,
  /\bgit\s+clean\s+-[a-zA-Z]*f/,
  /\bgit\s+checkout\s+(--\s+)?\.\s*$/,
  /\bgit\s+branch\s+-D\b/,
  /\bdrop\s+(table|database|schema)\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\s+\w+\s*(;|$)/i,
  /\bmkfs(\.\w+)?\b/,
  /\bdd\s+if=/,
  /\bchmod\s+-R\s+777\b/,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
  />\s*\/dev\/(sd|disk|nvme)/,
];

const CHIPS = {
  read: { label: " READ ", fg: C.sage, bg: C.sageBg, bold: false, rule: C.sage },
  edit: { label: " EDIT ", fg: C.ink, bg: C.coral, bold: true, rule: C.coral },
  bash: { label: " BASH ", fg: C.ink, bg: C.amber, bold: true, rule: C.amber },
  danger: { label: " ! RISK ", fg: C.paper, bg: C.red, bold: true, rule: C.red },
  other: { label: " TOOL ", fg: C.cream, bg: "#2a2725", bold: false, rule: C.muted },
};
const RANK = { other: 0, read: 1, bash: 2, edit: 3, danger: 4 };

const VERBS = {
  thinking: "Inking",
  requesting: "Sketching",
  responding: "Writing",
  "tool-use": "Working",
  "tool-input": "Drafting",
};
const PULSE = ["✳", "✴", "✶", "✴"];

let ticker = null; // a timer handle; a reload drops it with the old environment

export function register(on) {
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    const saved = await $.store.get(STORE_KEY);
    await $.state.set(prefsRef, normalizePrefs(saved));
    await $.state.set(turnRef, EMPTY_TURN);
    await $.command.register({
      name: "skin",
      description: "Coral skin: show status, or turn it on, off, or toggle risk colors",
      argumentHint: "[on|off|risk]",
      immediate: true,
    });
    return result;
  });

  on("command.run", { command: "skin" }, async ($, e) => {
    const { value: current } = await $.state.get(prefsRef);
    const prefs = normalizePrefs(current);
    const arg = (e.args || "").trim().toLowerCase();
    let nextPrefs = prefs;
    if (arg === "on") nextPrefs = { ...prefs, enabled: true };
    else if (arg === "off") nextPrefs = { ...prefs, enabled: false };
    else if (arg === "risk") nextPrefs = { ...prefs, risk: !prefs.risk };
    else if (arg === "risk on") nextPrefs = { ...prefs, risk: true };
    else if (arg === "risk off") nextPrefs = { ...prefs, risk: false };
    else if (arg !== "" && arg !== "status") {
      return { text: `Unknown option "${arg}". Use /skin, /skin on, /skin off or /skin risk.` };
    }
    if (nextPrefs !== prefs) {
      await $.state.set(prefsRef, nextPrefs);
      await $.store.set(STORE_KEY, nextPrefs);
      $.ui.invalidate("ui.render");
    }
    return { text: statusLine(nextPrefs) };
  });

  // Turn bookkeeping for the spinner and the hint tail.
  on("turn.start", async ($, e, next) => {
    const result = await next(e);
    const now = await $.clock.now();
    await $.state.set(turnRef, { ...EMPTY_TURN, active: true, startedAt: now, now });
    if (ticker) ticker.cancel();
    ticker = $.clock.every(500, () => {
      void (async () => {
        const at = await $.clock.now();
        await update($, turnRef, (t) => ({ ...(t || EMPTY_TURN), now: at, frame: ((t && t.frame) || 0) + 1 }));
      })();
    });
    return result;
  });

  on("turn.complete", async ($, e, next) => {
    if (ticker) {
      ticker.cancel();
      ticker = null;
    }
    const now = await $.clock.now();
    await update($, turnRef, (t) => ({ ...(t || EMPTY_TURN), active: false, now }));
    return next(e);
  });

  on("tool.call", async ($, e, next) => {
    const kind = riskOf(e.tool, e);
    const field = kind === "danger" ? "danger" : kind === "edit" ? "edits" : kind === "bash" ? "bash" : kind === "read" ? "reads" : "other";
    await update($, turnRef, (t) => {
      const base = t || EMPTY_TURN;
      return { ...base, [field]: (base[field] || 0) + 1 };
    });
    return next(e);
  });

  // Spinner: coral pulse, mode verb, elapsed time and tool count.
  on("ui.render", { component: "Spinner" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    if (!normalizePrefs(p).enabled) return next(e);
    const { value: t } = await $.state.get(turnRef);
    const turn = t || EMPTY_TURN;
    const tools = toolCount(turn);
    if (e.surface !== "terminal") {
      const suffix = tools > 0 ? ` ✳ ${tools} tool${tools === 1 ? "" : "s"}` : " ✳";
      return next({ ...e, props: { ...e.props, suffix } });
    }
    const { Box, Text } = $.ui.resolve(e);
    const verb = e.props.message || VERBS[e.props.mode] || e.props.word || "Working";
    const seconds = turn.startedAt ? Math.max(0, Math.floor((turn.now - turn.startedAt) / 1000)) : 0;
    return spinnerTree(Box, Text, { verb, frame: turn.frame, seconds, tools, danger: turn.danger, edits: turn.edits });
  });

  // Tool rows: a risk chip in front of the engine's own row.
  on("ui.render", { component: "ToolUse" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    const prefs = normalizePrefs(p);
    if (!prefs.enabled || !prefs.risk) return next(e);
    const kind = riskOf(e.props.tool, e.props.input);
    if (kind === "other") return next(e); // neutral tools (questions, agents, MCP) keep the stock row
    const original = await next(e);
    if (!original) return original;
    const { Box, Text } = $.ui.resolve(e);
    return chipRow(Box, Text, kind, original, null);
  });

  on("ui.render", { component: "ToolGroup" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    const prefs = normalizePrefs(p);
    if (!prefs.enabled || !prefs.risk) return next(e);
    const original = await next(e);
    if (!original || e.props.isExpanded) return original;
    const { Box, Text } = $.ui.resolve(e);
    let top = "other";
    for (const call of e.props.calls) {
      const kind = riskOf(call.tool, call.input);
      if (RANK[kind] > RANK[top]) top = kind;
    }
    if (top === "other") return original;
    return chipRow(Box, Text, top, original, e.props.calls.length);
  });

  // The person's prompt: a card with a coral rule.
  on("ui.render", { component: "UserMessage" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    if (!normalizePrefs(p).enabled) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    if (e.props.origin.kind !== "composer") {
      const original = await next(e);
      if (!original) return original;
      return Box({ flexDirection: "row", children: [Text({ color: C.coralDim, children: "▎" }), original] });
    }
    const paper = e.surface !== "terminal";
    const bg = paper ? C.paper : C.card;
    const fg = paper ? C.ink : C.cream;
    return Box({
      flexDirection: "row",
      backgroundColor: bg,
      paddingRight: 1,
      children: [
        Text({ color: C.coral, backgroundColor: bg, bold: true, children: "▌ ❯ " }),
        Text({ color: fg, backgroundColor: bg, wrap: "wrap", children: e.props.text }),
      ],
    });
  });

  // Assistant replies: the engine's markdown, behind a coral rule.
  on("ui.render", { component: "AssistantMessage" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    const original = await next(e);
    if (!normalizePrefs(p).enabled || !original) return original;
    const { Box } = $.ui.resolve(e);
    return Box({
      flexDirection: "row",
      children: [
        Box({ width: 1, flexShrink: 0, backgroundColor: e.props.isFirstOfReply ? C.coral : C.coralDim }),
        Box({ flexDirection: "column", flexGrow: 1, flexShrink: 1, paddingLeft: 1, children: [original] }),
      ],
    });
  });

  // Turn footer (terminal only): coral glyph, cream words, a coral rule.
  on("ui.render", { component: "TurnDuration" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    if (!normalizePrefs(p).enabled) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    return Box({
      flexDirection: "row",
      children: [
        Text({ color: C.coral, bold: true, children: "✳ " }),
        Text({ color: C.cream, children: `${e.props.word} for ${duration(e.props.durationMs)}` }),
        Text({ color: C.coralDim, wrap: "truncate", children: " ──────────────────" }),
      ],
    });
  });

  // Hint line: keep the engine's line and its pills, add a risk tally.
  on("ui.render", { component: "PromptHint" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    if (!normalizePrefs(p).enabled) return next(e);
    const { value: t } = await $.state.get(turnRef);
    return next({ ...e, props: { ...e.props, tail: hintTail(t || EMPTY_TURN) } });
  });

  on("ui.render", { component: "SessionMode" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    if (!normalizePrefs(p).enabled) return next(e);
    return next({ ...e, props: { ...e.props, modes: [...e.props.modes, "coral skin"] } });
  });

  // Questions: the engine's dialog, untouched, inside a coral frame.
  on("ui.render", { component: "AskUserQuestion" }, async ($, e, next) => {
    const { value: p } = await $.state.get(prefsRef);
    const original = await next(e);
    if (!normalizePrefs(p).enabled || !original) return original;
    const { Box, Text } = $.ui.resolve(e);
    // No side border: the dialog sizes its rules to the full width and would wrap inside one.
    return Box({
      flexDirection: "column",
      children: [
        Box({
          flexDirection: "row",
          children: [
            Text({ color: C.ink, backgroundColor: C.coral, bold: true, children: " ✳ CLAUDE IS ASKING " }),
            Text({ color: C.coral, wrap: "truncate", children: " " + "─".repeat(60) }),
          ],
        }),
        original,
      ],
    });
  });

  // The /skin command's own output row.
  on("ui.render", { component: "CommandOutput", props: { command: "skin" } }, async ($, e, next) => {
    if (e.props.isErrored) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    return Box({
      flexDirection: "row",
      children: [
        Text({ color: C.ink, backgroundColor: C.coral, bold: true, children: " ✳ CORAL SKIN " }),
        Text({ color: e.surface === "terminal" ? C.cream : undefined, children: ` ${e.props.text.replace(/^coral-skin:\s*/, "")}` }),
      ],
    });
  });
}

function normalizePrefs(v) {
  const o = v && typeof v === "object" ? v : {};
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : DEFAULT_PREFS.enabled,
    risk: typeof o.risk === "boolean" ? o.risk : DEFAULT_PREFS.risk,
  };
}

function statusLine(prefs) {
  const skin = prefs.enabled ? "on" : "off (stock rendering)";
  const risk = prefs.risk ? "on" : "off";
  return `skin ${skin} · risk colors ${risk}. Try /skin on, /skin off, /skin risk.`;
}

export function riskOf(tool, input) {
  if (EDIT_TOOLS.has(tool)) return "edit";
  if (READ_TOOLS.has(tool)) return "read";
  if (SHELL_TOOLS.has(tool)) {
    const command = input && typeof input.command === "string" ? input.command : "";
    return DESTRUCTIVE.some((re) => re.test(command)) ? "danger" : "bash";
  }
  return "other";
}

function chipRow(Box, Text, kind, original, count) {
  const chip = CHIPS[kind];
  const label = count && count > 1 ? `${chip.label.trimEnd()} ×${count} ` : chip.label;
  // The engine's row opens with a blank margin line; the chip sits beside the header under it.
  return Box({
    flexDirection: "row",
    children: [
      Box({
        flexShrink: 0,
        marginTop: 1,
        children: [Text({ color: chip.fg, backgroundColor: chip.bg, bold: chip.bold, wrap: "truncate", children: label.padEnd(10) })],
      }),
      Box({ flexDirection: "column", flexGrow: 1, flexShrink: 1, children: [original] }),
    ],
  });
}

function spinnerTree(Box, Text, s) {
  const glyph = PULSE[s.frame % PULSE.length];
  const bright = s.frame % 2 === 0;
  const parts = [
    Text({ color: bright ? C.coral : C.coralDim, bold: true, children: `${glyph} ` }),
    Text({ color: C.coral, bold: true, children: `${s.verb}…` }),
    Text({ color: C.cream, children: ` ${duration(s.seconds * 1000)}` }),
  ];
  if (s.tools > 0) parts.push(Text({ color: C.muted, children: ` · ${s.tools} tool${s.tools === 1 ? "" : "s"}` }));
  if (s.edits > 0) parts.push(Text({ color: C.coral, children: ` · ${s.edits} edit${s.edits === 1 ? "" : "s"}` }));
  if (s.danger > 0) parts.push(Text({ color: C.paper, backgroundColor: C.red, bold: true, children: ` ! ${s.danger} risky ` }));
  return Box({ flexDirection: "row", children: parts });
}

function toolCount(t) {
  return (t.reads || 0) + (t.edits || 0) + (t.bash || 0) + (t.danger || 0) + (t.other || 0);
}

function hintTail(t) {
  const bits = [];
  if (t.reads) bits.push(`${t.reads} read`);
  if (t.edits) bits.push(`${t.edits} edit`);
  if (t.bash) bits.push(`${t.bash} bash`);
  if (t.danger) bits.push(`${t.danger} risky`);
  return bits.length ? `✳ coral · ${bits.join(" · ")}` : "✳ coral";
}

function duration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
