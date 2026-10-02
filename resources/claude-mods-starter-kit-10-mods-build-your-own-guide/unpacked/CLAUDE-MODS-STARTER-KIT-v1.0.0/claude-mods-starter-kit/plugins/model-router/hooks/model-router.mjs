// Model Router: sends routine read-only follow-up steps of a turn to a cheaper
// model, keeps planning and final answers on the session model, and shows an
// honest estimate of what that saved above the prompt.

import { update } from "claude-code";

// List prices in USD per million tokens, from the claude-api skill (cached
// 2026-09-25). Cache write is the 5-minute TTL rate (1.25x input); the usage a
// step reports does not say which TTL was written, so 1-hour writes (2x) are
// under-counted on both sides alike. First match wins, so keep specific ids
// above general ones.
const PRICES = [
  { match: /opus-5-5/, input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  { match: /opus/, input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  { match: /sonnet-5/, input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  { match: /sonnet/, input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  { match: /haiku/, input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  { match: /fable-5-1|mythos-5-1/, input: 10, output: 50, cacheWrite: 12.5, cacheRead: 0.25 },
  { match: /fable|mythos/, input: 10, output: 50, cacheWrite: 12.5, cacheRead: 1 },
];

// What `/router sonnet` and `/router haiku` send the request as.
const CHEAP_MODELS = { sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-4-5" };
const HAIKU_CONTEXT_LIMIT = 180_000;

// Tools that only read. The engine's own read-only verdict (tool.call's
// `isReadOnly`) is used first; this list and the Bash pattern are the fallback.
const READ_ONLY_TOOLS = new Set([
  "Read", "Grep", "Glob", "LS", "WebFetch", "WebSearch", "NotebookRead", "ToolSearch",
]);
const READ_ONLY_BASH =
  /^\s*(ls|cat|head|tail|wc|pwd|file|stat|tree|which|echo|find|grep|rg|git\s+(status|log|diff|show|branch|blame|rev-parse))\b[^;&|>`$]*$/;

const MODES = ["subagents", "steps", "both"];
const DEFAULT_CONFIG = { enabled: true, cheap: "sonnet", mode: "subagents" };
const EMPTY_STATS = {
  turns: 0, steps: 0, routed: 0, actualUsd: 0, counterfactualUsd: 0, lastPrefix: 0, sessionModel: "",
  subSteps: 0, subActualUsd: 0, subCounterfactualUsd: 0, subagents: 0,
};
const MAX_DECISIONS = 5;

const config = { plugin: "model-router", key: "config" };
const stats = { plugin: "model-router", key: "stats" };
const decisions = { plugin: "model-router", key: "decisions" };

export function register(on) {
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    const enabled = await $.store.get("enabled");
    const cheap = await $.store.get("cheap");
    const mode = await $.store.get("mode");
    await $.state.set(config, {
      enabled: enabled !== false,
      cheap: cheap === "haiku" ? "haiku" : "sonnet",
      mode: MODES.includes(mode) ? mode : DEFAULT_CONFIG.mode,
    });
    await $.command.register({
      name: "router",
      description: "Model router status, on or off, cheap model, or routing mode",
      argumentHint: "[on|off|sonnet|haiku|mode subagents|steps|both]",
    });
    return result;
  });

  // Remember the engine's read-only verdict for each main-loop tool call, by id.
  on("tool.call", async ($, e, next) => {
    const result = await next(e);
    if (e.agentId == null && result.isReadOnly === true && e.tool_use_id) {
      await $.state.set({ plugin: "model-router", key: "readOnly", id: e.tool_use_id }, true);
    }
    return result;
  });

  on("turn.step", async function* ($, e, next) {
    const { value: cfg = DEFAULT_CONFIG } = await $.state.get(config);
    const mode = cfg.mode ?? DEFAULT_CONFIG.mode;

    // Subagent mode: every step of a subagent goes to the cheap model, so the
    // subagent builds and reads its own prompt cache there. Its context is its
    // own, so the main loop's cache is never broken by it.
    if (e.agentId != null) {
      if (!cfg.enabled || mode === "steps" || !isDearer(e.model, cfg.cheap)) return yield* next(e);
      const target = CHEAP_MODELS[cfg.cheap];
      if (e.index === 0) {
        $.ui.log(`subagent ${shortId(e.agentId)} → ${cfg.cheap} (all its steps)`);
        await update($, decisions, (list = []) =>
          [...list, { kind: "subagent", turn: 0, step: 0, to: cfg.cheap, isRouted: true, reason: `subagent ${shortId(e.agentId)}, all its steps` }].slice(-MAX_DECISIONS),
        );
      }
      const result = yield* next(routedInput(e, cfg.cheap, target));
      const usage = result?.usage;
      const actual = usage ? costAt(priceOf(usage.model) ?? priceOf(target), usage) : 0;
      const counterfactual = usage ? costAt(priceOf(e.model) ?? priceOf(target), usage) : 0;
      if (usage) {
        $.ui.log(
          `subagent ${shortId(e.agentId)} step ${e.index} on ${usage.model} read ${usage.cache_read_input_tokens} wrote ${usage.cache_creation_input_tokens} cost ${usd(actual)}, ~${usd(counterfactual)} on ${e.model}`,
          { to: "debug" },
        );
      }
      await update($, stats, (s = EMPTY_STATS) => ({
        ...EMPTY_STATS,
        ...s,
        subSteps: (s.subSteps ?? 0) + 1,
        subagents: (s.subagents ?? 0) + (e.index === 0 ? 1 : 0),
        subActualUsd: (s.subActualUsd ?? 0) + actual,
        subCounterfactualUsd: (s.subCounterfactualUsd ?? 0) + counterfactual,
      }));
      return result;
    }

    const { value: before = EMPTY_STATS } = await $.state.get(stats);
    const turn = e.index === 0 ? before.turns + 1 : Math.max(before.turns, 1);
    const isStepMode = cfg.enabled && (mode === "steps" || mode === "both");

    let decision;
    if (!cfg.enabled) {
      decision = { isRouted: false, reason: "router off" };
    } else if (!isStepMode) {
      decision = { isRouted: false, reason: "main loop not routed in subagents mode" };
    } else if (e.index === 0) {
      decision = { isRouted: false, reason: "first step answers the prompt" };
    } else {
      const messages = await $.session.messages();
      const uses = lastToolUses(messages);
      const verdicts = [];
      for (const use of uses) {
        const { value: engineSaysReadOnly } = await $.state.get({
          plugin: "model-router", key: "readOnly", id: use.tool_use_id,
        });
        verdicts.push({ ...use, readOnly: engineSaysReadOnly === true || looksReadOnly(use) });
      }
      decision = decide({
        verdicts,
        cheap: cfg.cheap,
        sessionModel: e.model,
        lastPrefix: before.lastPrefix,
      });
    }

    const target = decision.isRouted ? CHEAP_MODELS[cfg.cheap] : e.model;
    const stepInput = decision.isRouted ? routedInput(e, cfg.cheap, target) : e;
    if (decision.isRouted) {
      $.ui.log(`step ${e.index} → ${cfg.cheap} (${decision.reason})`);
    }

    const result = yield* next(stepInput);

    const usage = result?.usage;
    const cost = decision.isRouted && usage ? routedCost(usage, e.model, before.lastPrefix) : null;
    if (cost) {
      $.ui.log(
        `step ${e.index} on ${usage.model} cost ${usd(cost.actual)}, ~${usd(cost.counterfactual)} on ${e.model}`,
        { to: "debug" },
      );
    }
    await update($, stats, (s = EMPTY_STATS) => {
      const after = { ...EMPTY_STATS, ...s, turns: turn, steps: s.steps + 1 };
      if (!decision.isRouted) after.sessionModel = e.model;
      if (decision.isRouted) after.routed = s.routed + 1;
      if (cost) {
        after.actualUsd = s.actualUsd + cost.actual;
        after.counterfactualUsd = s.counterfactualUsd + cost.counterfactual;
      }
      if (usage) after.lastPrefix = promptTokens(usage) + usage.output_tokens;
      return after;
    });

    if (isStepMode) {
      const entry = { kind: "step", turn, step: e.index, to: decision.isRouted ? cfg.cheap : e.model, isRouted: decision.isRouted, reason: decision.reason };
      await update($, decisions, (list = []) => [...list, entry].slice(-MAX_DECISIONS));
    }
    return result;
  });

  on("command.run", { command: "router" }, async ($, e) => {
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const arg = words.join(" ");
    const { value: cfg = DEFAULT_CONFIG } = await $.state.get(config);
    const mode = cfg.mode ?? DEFAULT_CONFIG.mode;
    if (arg === "on" || arg === "off") {
      const next = { ...cfg, mode, enabled: arg === "on" };
      await $.store.set("enabled", next.enabled);
      await $.state.set(config, next);
      return { text: `Model router ${arg}${next.enabled ? ` · mode ${mode} · cheap model ${next.cheap}` : ""}.` };
    }
    if (arg === "sonnet" || arg === "haiku") {
      const next = { ...cfg, mode, cheap: arg };
      await $.store.set("cheap", arg);
      await $.state.set(config, next);
      return { text: `Model router cheap model set to ${arg} (${CHEAP_MODELS[arg]}).` };
    }
    if (words[0] === "mode") {
      if (!MODES.includes(words[1])) {
        return { text: `Model router mode is ${mode}. Pick one of /router mode subagents, steps or both.` };
      }
      const next = { ...cfg, mode: words[1] };
      await $.store.set("mode", words[1]);
      await $.state.set(config, next);
      return { text: `Model router mode set to ${words[1]} · ${MODE_TEXT[words[1]]}.` };
    }
    if (arg !== "" && arg !== "status") {
      return { text: "Usage /router [on|off|sonnet|haiku|mode subagents|mode steps|mode both]" };
    }
    const { value: s = EMPTY_STATS } = await $.state.get(stats);
    const { value: recent = [] } = await $.state.get(decisions);
    return { text: statusText({ ...cfg, mode }, { ...EMPTY_STATS, ...s }, recent) };
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const original = await next(e);
    const { value: cfg = DEFAULT_CONFIG } = await $.state.get(config);
    const { value: raw = EMPTY_STATS } = await $.state.get(stats);
    const s = { ...EMPTY_STATS, ...raw };
    if (e.props.hasSurvey || !cfg.enabled || s.routed + s.subSteps === 0) return original;
    const { Box, Text } = $.ui.resolve(e);
    const row = band(Box, Text, { ...cfg, mode: cfg.mode ?? DEFAULT_CONFIG.mode }, s, e.props.bodyColumns);
    if (!original) return row;
    return Box({ flexDirection: "column", children: [original, row] });
  });
}

const MODE_TEXT = {
  subagents: "every step of a subagent goes to the cheap model, the main loop stays put",
  steps: "main-loop steps after read-only tools go to the cheap model, subagents stay put",
  both: "subagents and read-only main-loop steps both go to the cheap model",
};

function isDearer(model, cheap) {
  const own = priceOf(model);
  const target = priceOf(CHEAP_MODELS[cheap]);
  return Boolean(own && target && target.output < own.output);
}

function shortId(id) {
  return String(id).slice(0, 8);
}

// The routing rule, on plain values. Steps after index 0 only.
function decide({ verdicts, cheap, sessionModel, lastPrefix }) {
  if (verdicts.length === 0) return { isRouted: false, reason: "no tool results to read" };
  const failed = verdicts.filter((v) => v.isError);
  if (failed.length > 0) return { isRouted: false, reason: `after failed ${names(failed)}` };
  const writes = verdicts.filter((v) => !v.readOnly);
  if (writes.length > 0) return { isRouted: false, reason: `after ${names(writes)}` };
  const session = priceOf(sessionModel);
  const target = priceOf(CHEAP_MODELS[cheap]);
  if (!session || !target || target.output >= session.output) {
    return { isRouted: false, reason: `session model is not dearer than ${cheap}` };
  }
  if (cheap === "haiku" && lastPrefix > HAIKU_CONTEXT_LIMIT) {
    return { isRouted: false, reason: "context too large for haiku" };
  }
  return { isRouted: true, reason: `after ${names(verdicts)}` };
}

// The tool calls of the newest assistant message: the results this step reads.
function lastToolUses(messages) {
  if (!Array.isArray(messages)) return [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant") return m.toolUses ?? [];
    if (m.role === "user" && !(m.toolResults?.length > 0) && m.text) return [];
  }
  return [];
}

function looksReadOnly(use) {
  if (READ_ONLY_TOOLS.has(use.tool)) return true;
  if (use.tool === "Bash") return READ_ONLY_BASH.test(String(use.input?.command ?? ""));
  return false;
}

function names(list) {
  return [...new Set(list.map((v) => v.tool))].join(", ");
}

function routedInput(e, cheap, model) {
  // Haiku takes no effort setting; Sonnet takes the same levels as Opus.
  if (cheap === "haiku") {
    const { effort, ...rest } = e;
    return { ...rest, model };
  }
  return { ...e, model };
}

function priceOf(model) {
  return PRICES.find((p) => p.match.test(String(model ?? "")));
}

function promptTokens(u) {
  return u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens;
}

function costAt(p, u) {
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      u.cache_creation_input_tokens * p.cacheWrite +
      u.cache_read_input_tokens * p.cacheRead) /
    1_000_000
  );
}

// Actual cost of a routed step, and what the session model would have charged
// for the same tokens. The session model would have had the previous step's
// whole prompt and reply in its cache (it ran every step in that world), so
// up to `lastPrefix` cached tokens are priced as its cache reads and the rest
// as cache writes. Output is assumed the same length on either model.
function routedCost(u, sessionModel, lastPrefix) {
  const actualPrice = priceOf(u.model) ?? priceOf(sessionModel);
  const sessionPrice = priceOf(sessionModel) ?? actualPrice;
  const cached = u.cache_creation_input_tokens + u.cache_read_input_tokens;
  const read = Math.min(cached, lastPrefix);
  const counterfactual = costAt(sessionPrice, {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_read_input_tokens: read,
    cache_creation_input_tokens: cached - read,
  });
  return { actual: costAt(actualPrice, u), counterfactual };
}

function band(Box, Text, cfg, s, columns) {
  const dim = (children) => Text({ dimColor: true, children });
  const saved = s.counterfactualUsd - s.actualUsd + s.subCounterfactualUsd - s.subActualUsd;
  const counts = [];
  if (cfg.mode !== "steps" && s.subSteps > 0) counts.push(`${s.subSteps} subagent step${s.subSteps === 1 ? "" : "s"}`);
  if (cfg.mode !== "subagents" || s.routed > 0) counts.push(`${s.routed} of ${s.steps} main steps`);
  const parts = [
    Text({ color: "cyan", bold: true, children: `⇄ router ${cfg.mode}` }),
    dim(" · "),
    Text({ children: `${counts.join(" + ")} → ${cfg.cheap}` }),
    dim(" · "),
  ];
  if (saved >= 0) {
    parts.push(Text({ color: "green", bold: true, children: `saved ~${usd(saved)}` }));
  } else {
    parts.push(Text({ color: "yellow", bold: true, children: `net ~${usd(-saved)} more` }));
  }
  if (columns >= 70) parts.push(dim(saved >= 0 ? " this session" : " this session (cache misses)"));
  return Box({ flexDirection: "row", paddingX: 1, children: parts });
}

function statusText(cfg, s, recent) {
  const lines = [
    `Model router ${cfg.enabled ? "on" : "off"} · mode ${cfg.mode} · cheap model ${cfg.cheap} (${CHEAP_MODELS[cfg.cheap]})`,
    `Mode ${cfg.mode} · ${MODE_TEXT[cfg.mode]}`,
  ];
  if (s.subSteps > 0) {
    const subSaved = s.subCounterfactualUsd - s.subActualUsd;
    lines.push(
      `Subagents ${s.subagents} routed, ${s.subSteps} steps, cost ${usd(s.subActualUsd)} vs ~${usd(s.subCounterfactualUsd)} on their own model, ` +
        (subSaved >= 0 ? `saved ~${usd(subSaved)}` : `net ~${usd(-subSaved)} more`),
    );
  } else {
    lines.push("Subagents none routed yet this session");
  }
  lines.push(`Main loop ${s.routed} of ${s.steps} steps routed`);
  if (s.routed > 0) {
    const saved = s.counterfactualUsd - s.actualUsd;
    const base = s.sessionModel || "the session model";
    lines.push(
      `Routed main steps cost ${usd(s.actualUsd)} vs ~${usd(s.counterfactualUsd)} on ${base}, ` +
        (saved >= 0 ? `saved ~${usd(saved)}` : `net ~${usd(-saved)} more (cache misses on the switch)`),
    );
  }
  if (recent.length > 0) {
    lines.push("Recent decisions");
    for (const d of recent) {
      if (d.kind === "subagent") lines.push(`  ${d.reason} → ${d.to}`);
      else lines.push(`  turn ${d.turn} step ${d.step} ${d.isRouted ? "→" : "stays on"} ${d.to} (${d.reason})`);
    }
  }
  return lines.join("\n");
}

function usd(n) {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return n < 10 ? `$${n.toFixed(2)}` : `$${n.toFixed(1)}`;
}
