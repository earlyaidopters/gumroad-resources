// Context Meter: context fill, session cost and rate limits, above the prompt.

const HISTORY = 12;
const BARS = "▁▂▃▄▅▆▇█";
const LEVELS = [
  { upTo: 50, icon: "◔", color: "green" },
  { upTo: 75, icon: "◑", color: "yellow" },
  { upTo: 90, icon: "◕", color: "magenta" },
  { upTo: Infinity, icon: "●", color: "red" },
];
const LIMIT_NAMES = { five_hour: "5h", seven_day: "7d", spend_limit: "spend" };

// Held by the host, so the history survives a hot reload of this file.
const readings = { plugin: "context-meter", key: "readings" };
const limits = { plugin: "context-meter", key: "limits" };

export function register(on) {
  // Seed on start (and on resume), so the band shows before the first turn ends.
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    const u = await $.session.usage();
    const { value: history = [] } = await $.state.get(readings);
    const reading = toReading(u);
    if (reading && !sameAs(history[history.length - 1], reading)) {
      await $.state.set(readings, [...history, reading].slice(-HISTORY));
    }
    await $.state.set(limits, toLimits(u.rateLimits));
    return result;
  });

  // Pushed by the engine after each main-thread turn and when a limit moves.
  on("session.measure", async ($, e, next) => {
    const result = await next(e);
    if (e.changed.includes("context") || e.changed.includes("cost")) {
      const { value: history = [] } = await $.state.get(readings);
      const reading = toReading(e);
      if (reading && !sameAs(history[history.length - 1], reading)) {
        await $.state.set(readings, [...history, reading].slice(-HISTORY));
      }
    }
    if (e.changed.includes("rateLimits")) {
      await $.state.set(limits, toLimits(e.rateLimits));
    }
    return result;
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const original = await next(e);
    const { value: history = [] } = await $.state.get(readings);
    const { value: windows = [] } = await $.state.get(limits);
    if (e.props.hasSurvey || history.length === 0) return original;
    const { Box, Text } = $.ui.resolve(e);
    const meter = band(Box, Text, history, windows, e.props.bodyColumns);
    if (!original) return meter;
    return Box({ flexDirection: "column", children: [original, meter] });
  });
}

function toReading(u) {
  const window = u.context?.window;
  if (!window || u.context.tokens === undefined) return null;
  const tokens = u.context.tokens;
  const percent = u.context.percent ?? Math.round((tokens / window) * 100);
  return { tokens, window, percent, usd: u.cost?.usd ?? 0 };
}

function toLimits(rateLimits = []) {
  return rateLimits.map((r) => ({ kind: r.kind, percentUsed: r.percentUsed }));
}

function sameAs(a, b) {
  return a !== undefined && a.tokens === b.tokens && a.usd === b.usd && a.window === b.window;
}

function band(Box, Text, history, windows, columns) {
  const now = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : undefined;
  const level = LEVELS.find((l) => now.percent < l.upTo);
  const dim = (children) => Text({ dimColor: true, children });

  const parts = [
    Text({ color: level.color, bold: true, children: `${level.icon} ${now.percent}%` }),
    dim(` ${short(now.tokens)}/${short(now.window)}`),
  ];
  if (columns >= 70 && history.length > 1) {
    parts.push(Text({ color: level.color, children: ` ${sparkline(history)}` }));
  }

  parts.push(dim("  ·  "));
  parts.push(Text({ bold: true, children: usd(now.usd) }));
  if (columns >= 60 && prev && now.usd > prev.usd) {
    parts.push(dim(` +${usd(now.usd - prev.usd)}`));
  }

  if (columns >= 50) {
    for (const w of windows) {
      const name = LIMIT_NAMES[w.kind] ?? w.kind;
      const color = w.percentUsed >= 90 ? "red" : w.percentUsed >= 75 ? "yellow" : undefined;
      parts.push(dim("  ·  "));
      parts.push(dim(`${name} `));
      parts.push(Text({ color, bold: color !== undefined, children: `${Math.round(w.percentUsed)}%` }));
    }
  }

  return Box({ flexDirection: "row", paddingX: 1, children: parts });
}

function sparkline(history) {
  const top = Math.max(...history.map((r) => r.tokens), 1);
  return history.map((r) => BARS[Math.floor((r.tokens / top) * (BARS.length - 1))]).join("");
}

function usd(n) {
  return n < 10 ? `$${n.toFixed(2)}` : `$${n.toFixed(1)}`;
}

function short(n) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}
