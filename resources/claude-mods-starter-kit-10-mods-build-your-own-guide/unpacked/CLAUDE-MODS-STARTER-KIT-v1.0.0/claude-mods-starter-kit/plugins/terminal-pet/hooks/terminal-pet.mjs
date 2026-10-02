// Terminal Pet: a pixel-art crab above the prompt that reacts to what Claude
// is doing. Visual only: no filesystem, network, model or permission calls.
// Commands: /pet, /pet on|off, /pet name <name>, /pet sleep, /pet party, /pet wake,
// /pet feed [percent] (fakes the context fill for a demo of the round and stuffed looks).

import { update } from "claude-code";
import { COLS, ROWS, frameCells, fullness, desktopSvg } from "./sprites.mjs";
import {
  ASCII_FACES,
  EMPTY_PET,
  EMPTY_STATS,
  MOOD_WORDS,
  PARTY_MS,
  addUnique,
  classify,
  moodAt,
  normalizePrefs,
  onToolEnd,
  onToolStart,
  onTurnEnd,
  onTurnStart,
} from "./pet-core.mjs";

const prefsRef = { plugin: "terminal-pet", key: "prefs" };
const petRef = { plugin: "terminal-pet", key: "pet" };
const statsRef = { plugin: "terminal-pet", key: "stats" };
const fillRef = { plugin: "terminal-pet", key: "fill" };
const STORE_KEY = "prefs";
const RASTER_KEY = "pet";

const CORAL = "#e8603c";
const CREAM = "#f6efe3";
const MUTED = "#b8ad9c";
const RED = "#e23b3b";

const FAST_MS = 83; // about 12 fps while something is happening
const SLOW_MS = 220; // idle bob, blinks and snores

// The animation loop. A hot reload drops it with the old environment; the next
// draw starts a new one.
const anim = { surface: "", requestId: "", timer: null, period: 0, pet: null, fill: 0, mood: "", cells: "" };

function stopTicker() {
  if (anim.timer) anim.timer.cancel();
  anim.timer = null;
  anim.period = 0;
  anim.cells = "";
}

export function register(on) {
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    const saved = await $.store.get(STORE_KEY);
    const now = await $.clock.now();
    await $.state.set(prefsRef, normalizePrefs(saved));
    // A hot reload raises session.start again: keep what this session already counted.
    const { value: pet } = await $.state.get(petRef);
    if (!pet) await $.state.set(petRef, { ...EMPTY_PET, since: now, last: now });
    const { value: stats } = await $.state.get(statsRef);
    if (!stats) await $.state.set(statsRef, EMPTY_STATS);
    const u = await $.session.usage();
    await $.state.set(fillRef, percentOf(u && u.context));
    await $.command.register({
      name: "pet",
      description: "Terminal pet: status, or on, off, name <name>, sleep, party, wake, feed [percent]",
      argumentHint: "[on|off|name <name>|sleep|party|wake|feed [percent]]",
      immediate: true,
    });
    return result;
  });

  on("command.run", { command: "pet" }, async ($, e) => {
    const { value: current } = await $.state.get(prefsRef);
    const prefs = normalizePrefs(current);
    const raw = (e.args || "").trim();
    const [word, ...rest] = raw.split(/\s+/);
    const arg = (word || "").toLowerCase();
    const now = await $.clock.now();
    let nextPrefs = prefs;
    let note = "";

    if (arg === "on") nextPrefs = { ...prefs, enabled: true };
    else if (arg === "off") nextPrefs = { ...prefs, enabled: false };
    else if (arg === "name") {
      const name = rest.join(" ").trim();
      if (!name) return { text: `Give it a name, like /pet name Pinch.` };
      nextPrefs = { ...prefs, name: normalizePrefs({ name }).name };
      note = `Say hi to ${nextPrefs.name}.`;
    } else if (arg === "sleep") {
      await update($, petRef, (p) => ({ ...EMPTY_PET, ...p, forced: "sleep", since: now }));
      note = `${prefs.name} curls up for a nap.`;
    } else if (arg === "party") {
      await update($, petRef, (p) => ({ ...EMPTY_PET, ...p, forced: "party", since: now, until: now + PARTY_MS, last: now }));
      note = `${prefs.name} throws a party.`;
    } else if (arg === "feed") {
      const pct = Math.max(0, Math.min(100, parseInt(rest[0], 10) || 95));
      await $.state.set(fillRef, pct);
      note = `${prefs.name} ate a big snack, belly at ${pct}% until the next real context reading.`;
    } else if (arg === "wake") {
      await update($, petRef, (p) => ({ ...EMPTY_PET, ...p, forced: "", mood: "idle", until: 0, since: now, last: now }));
      note = `${prefs.name} is awake.`;
    } else if (arg !== "" && arg !== "status" && arg !== "help") {
      return { text: `Unknown option "${raw}". ${HELP}` };
    }

    if (nextPrefs !== prefs) {
      await $.state.set(prefsRef, nextPrefs);
      await $.store.set(STORE_KEY, nextPrefs);
    }
    const { value: pet } = await $.state.get(petRef);
    const { value: stats } = await $.state.get(statsRef);
    const status = statusLine(nextPrefs, moodAt(pet, now), stats);
    return { text: note ? `${note} ${status}` : `${status} ${HELP}` };
  });

  on("turn.start", async ($, e, next) => {
    const result = await next(e);
    const now = await $.clock.now();
    await update($, petRef, (p) => onTurnStart(p, now));
    return result;
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (e.agentId) return result; // a subagent's run, not the main turn
    const now = await $.clock.now();
    await update($, petRef, (p) => onTurnEnd(p, e.reason, e.isAborted, now));
    return result;
  });

  on("tool.call", async ($, e, next) => {
    const mood = classify(e.tool, e);
    const start = await $.clock.now();
    await update($, petRef, (p) => onToolStart(p, mood, start));
    const ran = await next(e);
    const isError = ran.deny === undefined && ran.isError === true;
    const end = await $.clock.now();
    await update($, petRef, (p) => onToolEnd(p, mood, isError, end));
    if (!isError && ran.deny === undefined) {
      const path = typeof e.file_path === "string" ? e.file_path : typeof e.notebook_path === "string" ? e.notebook_path : "";
      if (e.tool === "Read" && path) await update($, statsRef, (s) => ({ ...EMPTY_STATS, ...s, reads: addUnique((s && s.reads) || [], path) }));
      else if (mood === "typing" && path) await update($, statsRef, (s) => ({ ...EMPTY_STATS, ...s, writes: addUnique((s && s.writes) || [], path) }));
      else if (mood === "running" || mood === "nervous") {
        await update($, statsRef, (s) => ({ ...EMPTY_STATS, ...s, ran: ((s && s.ran) || 0) + 1, risky: ((s && s.risky) || 0) + (mood === "nervous" ? 1 : 0) }));
      }
    }
    return ran;
  });

  on("session.measure", async ($, e, next) => {
    const result = await next(e);
    if (e.changed.includes("context")) await $.state.set(fillRef, percentOf(e.context));
    return result;
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const original = await next(e);
    const { value: rawPrefs } = await $.state.get(prefsRef);
    const prefs = normalizePrefs(rawPrefs);
    if (!prefs.enabled || e.props.hasSurvey) {
      stopTicker();
      return original;
    }
    const { value: pet = EMPTY_PET } = await $.state.get(petRef);
    const { value: stats = EMPTY_STATS } = await $.state.get(statsRef);
    const { value: fill = 0 } = await $.state.get(fillRef);
    const now = await $.clock.now();
    const mood = moodAt(pet, now);
    const { Box, Text } = $.ui.resolve(e);
    const stack = (pet) => (original ? Box({ flexDirection: "column", children: [original, pet] }) : pet);
    const columns = e.props.bodyColumns || 80;

    if (anim.surface !== e.surface) { stopTicker(); anim.surface = e.surface; }
    if (e.surface === "desktop") {
      anim.pet = pet;
      anim.mood = mood;
      // SVG runs its own frames. This timer only updates expired moods.
      if (!anim.timer) {
        anim.timer = $.clock.every(SLOW_MS, () => {
          void (async () => {
            const shown = moodAt(anim.pet, await $.clock.now());
            if (shown !== anim.mood) {
              anim.mood = shown;
              $.ui.invalidate("ui.render");
            }
          })();
        });
      }
      const { Svg } = $.ui.resolve(e);
      return stack(Box({ flexDirection: "row", children: [
        Svg({ source: desktopSvg(mood, fill), width: 200, height: 110,
          alt: `${prefs.name}: ${MOOD_WORDS[mood] || mood}`, isInteractive: true }),
        sideColumn(Box, Text, prefs, mood, stats, fill),
      ] }));
    }

    const fits = e.surface === "terminal" && columns >= COLS + 2 && (e.props.maxRows || 0) >= ROWS + 1;
    if (!fits) {
      stopTicker();
      return stack(fallbackLine(Text, prefs, mood, stats, fill));
    }

    anim.requestId = e.requestId;
    anim.pet = pet;
    anim.fill = fill;
    anim.mood = mood;
    const cells = frameCells(mood, now, fill);
    anim.cells = cells;

    const { Raster } = $.ui.resolve(e);
    const parts = [Raster({ key: RASTER_KEY, columns: COLS, rows: ROWS, cells })];
    if (columns >= COLS + 24) parts.push(sideColumn(Box, Text, prefs, mood, stats, fill));

    // Keep the loop at the pace this mood needs.
    const period = mood === "idle" || mood === "sleeping" ? SLOW_MS : FAST_MS;
    if (!anim.timer || anim.period !== period) {
      if (anim.timer) anim.timer.cancel();
      anim.period = period;
      anim.timer = $.clock.every(period, () => {
        void (async () => {
          const at = await $.clock.now();
          if (!anim.pet || !anim.requestId) return;
          const shown = moodAt(anim.pet, at);
          if (shown !== anim.mood) {
            anim.mood = shown;
            $.ui.invalidate("ui.render"); // the mood word and the loop's pace follow
          }
          const fresh = frameCells(shown, at, anim.fill);
          if (fresh === anim.cells) return;
          anim.cells = fresh;
          const r = await $.ui.blit({ requestId: anim.requestId, key: RASTER_KEY, cells: fresh });
          if (r && r.deny) stopTicker();
        })();
      });
    }

    return stack(Box({ flexDirection: "row", paddingLeft: 1, children: parts }));
  });
}

const HELP = "Try /pet on, /pet off, /pet name <name>, /pet sleep, /pet party, /pet wake, /pet feed [percent].";

function percentOf(context) {
  if (!context) return 0;
  if (typeof context.percent === "number") return Math.round(context.percent);
  if (context.tokens && context.window) return Math.round((context.tokens / context.window) * 100);
  return 0;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function bellyWord(fill) {
  const f = fullness(fill);
  return f === "stuffed" ? "stuffed" : f === "round" ? "getting full" : "";
}

function statusLine(prefs, mood, stats) {
  const s = { ...EMPTY_STATS, ...(stats || {}) };
  const on = prefs.enabled ? "" : " (hidden, /pet on to show)";
  return `${prefs.name} (${MOOD_WORDS[mood] || mood})${on} ate ${plural(s.reads.length, "file")}, wrote ${s.writes.length}, ran ${s.ran}.`;
}

function sideColumn(Box, Text, prefs, mood, stats, fill) {
  const s = { ...EMPTY_STATS, ...(stats || {}) };
  const alarm = mood === "nervous" || mood === "oops";
  const belly = bellyWord(fill);
  const rows = [
    Text({ color: CORAL, bold: true, wrap: "truncate", children: prefs.name }),
    Text({ color: alarm ? RED : CREAM, bold: alarm, wrap: "truncate", children: MOOD_WORDS[mood] || mood }),
    Text({ children: " " }),
    Text({ color: CREAM, wrap: "truncate", children: `ate ${plural(s.reads.length, "file")}` }),
    Text({ color: CREAM, wrap: "truncate", children: `wrote ${s.writes.length}` }),
    Text({ color: MUTED, wrap: "truncate", children: `ran ${s.ran}${s.risky ? `, ${s.risky} scary` : ""}` }),
    Text({ color: fill >= 90 ? RED : fill >= 70 ? CORAL : MUTED, wrap: "truncate", children: `belly ${fill}%${belly ? `, ${belly}` : ""}` }),
  ];
  return Box({ flexDirection: "column", marginLeft: 2, marginTop: 2, flexShrink: 1, children: rows });
}

function fallbackLine(Text, prefs, mood, stats, fill) {
  const s = { ...EMPTY_STATS, ...(stats || {}) };
  const face = `(\\/)${ASCII_FACES[mood] || ASCII_FACES.idle}(\\/)`;
  const z = mood === "sleeping" ? " zzz" : "";
  return Text({
    color: CORAL,
    wrap: "truncate",
    children: `${face}${z} ${prefs.name} · ${MOOD_WORDS[mood] || mood} · ate ${plural(s.reads.length, "file")} · wrote ${s.writes.length} · belly ${fill}%`,
  });
}

