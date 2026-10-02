// Auto Handoff: writes a cold-start handoff to <project>/handoff/ before the
// context fills up or compacts, and offers to resume from it next session.

const CWD = { plugin: "auto-handoff", key: "cwd" };
const INTERACTIVE = { plugin: "auto-handoff", key: "isInteractive" };
const FIRED = { plugin: "auto-handoff", key: "fired" };
const BUSY = { plugin: "auto-handoff", key: "busy" };
const LAST = { plugin: "auto-handoff", key: "last" };
const COMPACTED = { plugin: "auto-handoff", key: "compactedAt" };
const OFFER = { plugin: "auto-handoff", key: "offer" };

const DEFAULT_THRESHOLD = 85;

export const HANDOFF_PROMPT = `Write a cold-start handoff for this session, so a new agent with no access to this conversation can pick up the work exactly where it stands. Do not call any tools. Answer with the document only.

Line 1 must be exactly "LATEST: " followed by one sentence on where the session landed. Then a blank line, then the handoff in markdown with these sections, each as a "##" heading:

## 1. Session intent
The goal and what the user actually wanted.
## 2. The back-and-forth
The meaningful requests, responses and pivots, in order, and why they happened.
## 3. Tools and skills used
Each material tool or skill used and what it accomplished.
## 4. Research, data, and sources
Outside information brought in and the findings that shaped decisions. "None" if none.
## 5. Iterations and generations
Versions, generated assets and what changed each pass. "None" if none.
## 6. Decisions locked
Settled decisions and why each was made. List unresolved decisions separately.
## 7. Current state
What is done, in progress or blocked. Say plainly what was verified (tests run, output seen) and what was not.
## 8. Asset map
Every file created, changed or important to the work, with its path and what it is for.
## 9. Open threads and next steps
Open questions, then the exact next steps in order, with the commands to run where they matter.
## 10. For the next agent
What to read first and the traps a cold start is likely to hit.

Rules: use only facts from this conversation and mark anything assumed. Include exact paths, commands, branch names, ports and test results when they matter. Never include passwords, API keys, tokens or other secrets. Do not use em dashes.`;

export const RESUME_PROMPT =
  "Read handoff/LATEST.md, then the handoff file named on its first line (in handoff/). Brief me in a few lines on where we left off, verify the current state of anything it calls done, then continue with the next steps it lists. Where it says a step waits for my go-ahead, ask instead of doing it.";

export function register(on, options) {
  const fallbackThreshold = toThreshold(options?.threshold) ?? DEFAULT_THRESHOLD;
  const fallbackEnabled = options?.enabled !== false;

  on("session.start", async ($, e, next) => {
    const result = await next(e);
    await $.command.register({
      name: "autohandoff",
      description: "Auto handoff status, or now | resume | threshold <n> | on | off",
      argumentHint: "[now|resume|threshold <n>|on|off]",
    });
    await $.state.set(CWD, e.cwd);
    await $.state.set(INTERACTIVE, e.isInteractive);
    // Offer a handoff from an earlier session only: this hook runs again when
    // the module reloads, and one written since the session began is its own.
    const latest = `${e.cwd}/handoff/LATEST.md`;
    if (await $.fs.exists(latest)) {
      const text = await $.fs.read(latest).catch(() => "");
      const stat = await $.fs.stat(latest).catch(() => undefined);
      const { startedAt } = await $.session.usage();
      const file = firstLine(text);
      const at = stat?.mtimeMs ?? 0;
      const isEarlier = !(startedAt > 0) || at < startedAt;
      if (file && isEarlier) await $.state.set(OFFER, { at, file });
    }
    return result;
  });

  // The offer goes once the first main-thread turn is done.
  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (!e.agentId) {
      const { value: offer = null } = await $.state.get(OFFER);
      if (offer) await $.state.set(OFFER, null);
    }
    return result;
  });

  // Pushed after each main-thread turn: past the threshold, write one handoff
  // in the background; below it again (a compaction), arm for the next crossing.
  on("session.measure", async ($, e, next) => {
    const result = await next(e);
    if (!e.changed.includes("context")) return result;
    const percent = e.context?.percent;
    if (percent === undefined) return result;
    const settings = readSettings(await $.store.get("settings"), fallbackThreshold, fallbackEnabled);
    const { value: fired = false } = await $.state.get(FIRED);
    if (percent < settings.threshold) {
      if (fired) await $.state.set(FIRED, false);
      return result;
    }
    if (fired || !settings.isEnabled) return result;
    const { value: busy = false } = await $.state.get(BUSY);
    if (busy) return result;
    await $.state.set(FIRED, true);
    const { value: cwd = "" } = await $.state.get(CWD);
    const io = {
      fork: (prompt) => $.model.fork({ prompt }),
      read: (path) => $.fs.read(path),
      write: (path, text) => $.fs.write(path, text),
      exists: (path) => $.fs.exists(path),
      now: () => $.clock.now(),
      isBusy: async () => (await $.state.get(BUSY)).value === true,
      setBusy: (v) => $.state.set(BUSY, v),
      setLast: (v) => $.state.set(LAST, v),
      toast: (text) => $.ui.toast(text, { timeoutMs: 6000 }),
      log: (text) => $.ui.log(text),
    };
    const reason = `context at ${percent}%, threshold ${settings.threshold}%`;
    $.ui.log(`${reason}, writing a handoff in the background`);
    $.clock.after(0, () => {
      void writeHandoff(io, { cwd, reason }).then(saved => {
        if (!saved.path) return $.state.set(FIRED, false);
      });
    });
    return result;
  });

  // Before a compaction of the main conversation: save a handoff first unless
  // one was already written since the last compaction.
  on("session.compact", async ($, e, next) => {
    if (e.trigger === "precompute" || !!e.agentId) return next(e);
    const settings = readSettings(await $.store.get("settings"), fallbackThreshold, fallbackEnabled);
    const { value: last = null } = await $.state.get(LAST);
    const { value: compactedAt = 0 } = await $.state.get(COMPACTED);
    const { value: busy = false } = await $.state.get(BUSY);
    if (!settings.isEnabled) {
      $.ui.log("compaction without a handoff, auto handoffs are off");
    } else if (last && last.at > compactedAt) {
      $.ui.log(`${last.path} already covers this context, compacting`);
    } else if (busy) {
      $.ui.log("a handoff is already being written, compacting");
    } else {
      const { value: cwd = "" } = await $.state.get(CWD);
      const io = {
        fork: (prompt) => $.model.fork({ prompt }),
        read: (path) => $.fs.read(path),
        write: (path, text) => $.fs.write(path, text),
        exists: (path) => $.fs.exists(path),
        now: () => $.clock.now(),
        isBusy: async () => (await $.state.get(BUSY)).value === true,
        setBusy: (v) => $.state.set(BUSY, v),
        setLast: (v) => $.state.set(LAST, v),
        toast: (text) => $.ui.toast(text, { timeoutMs: 6000 }),
        log: (text) => $.ui.log(text),
      };
      $.ui.log(`writing a handoff before ${e.trigger} compaction`);
      await writeHandoff(io, { cwd, reason: `before ${e.trigger} compaction` });
    }
    const result = await next(e);
    if (!result?.skip) {
      await $.state.set(COMPACTED, await $.clock.now());
      await $.state.set(FIRED, false);
    }
    return result;
  });

  on("command.run", { command: "autohandoff" }, async ($, e) => {
    const [verb = "", value = ""] = (e.args ?? "").trim().split(/\s+/);
    const stored = await $.store.get("settings");
    const settings = readSettings(stored, fallbackThreshold, fallbackEnabled);
    const { value: cwd = "" } = await $.state.get(CWD);

    if (verb === "" || verb === "status") {
      const { value: last = null } = await $.state.get(LAST);
      const usage = await $.session.usage();
      const now = await $.clock.now();
      let lastLine = "No handoff written this session.";
      if (last) {
        lastLine = `Last handoff ${last.path}, ${ago(now - last.at)} (${last.reason}).`;
      } else if (cwd && (await $.fs.exists(`${cwd}/handoff/LATEST.md`))) {
        const file = firstLine(await $.fs.read(`${cwd}/handoff/LATEST.md`).catch(() => ""));
        const stat = await $.fs.stat(`${cwd}/handoff/LATEST.md`).catch(() => undefined);
        if (file) lastLine = `No handoff this session. Latest on disk is handoff/${file}, ${ago(now - (stat?.mtimeMs ?? now))}.`;
      }
      return { text: statusText(settings, usage.context?.percent, lastLine) };
    }

    if (verb === "on" || verb === "off") {
      await $.store.set("settings", { ...asObject(stored), isEnabled: verb === "on" });
      return { text: `Auto handoff is ${verb}.` };
    }

    if (verb === "threshold") {
      const n = toThreshold(value);
      if (n === undefined) return { text: "Usage is /autohandoff threshold <1-99>" };
      await $.store.set("settings", { ...asObject(stored), threshold: n });
      await $.state.set(FIRED, false);
      return { text: `Auto handoff threshold set to ${n}%.` };
    }

    if (verb === "resume") {
      if (!cwd || !(await $.fs.exists(`${cwd}/handoff/LATEST.md`))) {
        return { text: "No handoff/LATEST.md in this folder to resume from." };
      }
      const pointer = firstLine(await $.fs.read(`${cwd}/handoff/LATEST.md`).catch(() => ""));
      if (!pointer || pointer.includes("/") || pointer.includes("\\") || !pointer.endsWith(".md") || !(await $.fs.exists(`${cwd}/handoff/${pointer}`))) {
        return { text: "The latest handoff file is missing or the pointer is invalid. Run /autohandoff now in the original conversation and wait for the saved confirmation." };
      }
      await $.state.set(OFFER, null);
      // A command.run hook may not submit (the prompt would wait on this very
      // hook), so the prompt goes from a timer once the command has answered.
      $.clock.after(0, () => {
        void $.prompt.submit({ text: RESUME_PROMPT });
      });
      return { text: "Resuming from handoff/LATEST.md" };
    }

    if (verb === "now") {
      const { value: busy = false } = await $.state.get(BUSY);
      if (busy) return { text: "A handoff is already being written." };
      const { value: isInteractive = false } = await $.state.get(INTERACTIVE);
      const io = {
        fork: (prompt) => $.model.fork({ prompt }),
        read: (path) => $.fs.read(path),
        write: (path, text) => $.fs.write(path, text),
        exists: (path) => $.fs.exists(path),
        now: () => $.clock.now(),
        isBusy: async () => (await $.state.get(BUSY)).value === true,
        setBusy: (v) => $.state.set(BUSY, v),
        setLast: (v) => $.state.set(LAST, v),
        toast: (text) => $.ui.toast(text, { timeoutMs: 6000 }),
        log: (text) => $.ui.log(text),
      };
      if (isInteractive) {
        $.clock.after(0, () => {
          void writeHandoff(io, { cwd, reason: "/autohandoff now" });
        });
        return { text: "Writing a handoff in the background. A toast says when it is saved." };
      }
      const saved = await writeHandoff(io, { cwd, reason: "/autohandoff now" });
      return { text: saved.path ? `Handoff saved to ${saved.path}` : `No handoff written (${saved.skipped}).` };
    }

    return { text: "Usage is /autohandoff [now|resume|threshold <n>|on|off]" };
  });

  // The resume offer, stacked under whatever other mods draw in the band.
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const original = await next(e);
    if (e.props.hasSurvey || e.props.view?.agentId) return original;
    const { value: offer = null } = await $.state.get(OFFER);
    if (!offer) return original;
    const now = await $.clock.now();
    const { Box, Text } = $.ui.resolve(e);
    const mine = Box({
      flexDirection: "row",
      paddingX: 1,
      children: [
        Text({ color: "cyan", bold: true, children: "↺ " }),
        Text({ children: `Handoff from ${ago(now - offer.at)} available` }),
        Text({ dimColor: true, children: " · " }),
        Text({ bold: true, children: "/autohandoff resume" }),
      ],
    });
    if (!original) return mine;
    return Box({ flexDirection: "column", children: [original, mine] });
  });
}

// Forks the conversation for a handoff, writes it under <cwd>/handoff/, points
// LATEST.md at it and makes sure git ignores the folder. Takes plain functions.
export async function writeHandoff(io, { cwd, reason }) {
  if (!cwd) return { skipped: "no working directory" };
  if (await io.isBusy()) return { skipped: "busy" };
  await io.setBusy(true);
  try {
    const reply = await io.fork(HANDOFF_PROMPT);
    if (!reply.isAnswered) {
      io.log(`no handoff written, the fork returned ${reply.reason}`);
      io.toast("Handoff was not saved. Try /autohandoff now again.");
      return { skipped: reply.reason };
    }
    const { summary, body } = splitReply(reply.text);
    if (!body.trim()) throw new Error("The summary response was empty");
    const now = await io.now();
    const dir = `${cwd}/handoff`;
    const stamp = timestamp(now);
    let name = `handoff-${stamp}.md`;
    for (let n = 2; await io.exists(`${dir}/${name}`); n++) name = `handoff-${stamp}-${n}.md`;
    const project = cwd.split("/").filter(Boolean).pop() ?? "project";
    const header = `# Handoff, ${project}, ${humanTime(now)}\n\n_Written automatically by auto-handoff (${reason})._\n\n`;
    await io.write(`${dir}/${name}`, header + body.trim() + "\n");
    await io.write(`${dir}/LATEST.md`, `${name}\n${summary}\n`);
    await updateActiveProject(io, dir, name, summary);
    const gitignore = await ensureIgnored(io, cwd);
    const path = `handoff/${name}`;
    await io.setLast({ path, at: now, reason });
    io.toast(`Handoff saved to ${path}`);
    io.log(`saved ${path}${gitignore ? `, ${gitignore}` : ""}`);
    return { path, gitignore };
  } catch (err) {
    io.log(`writing the handoff failed (${err?.message ?? err})`);
    io.toast("Handoff was not saved. Try /autohandoff now again.");
    return { skipped: "error" };
  } finally {
    await io.setBusy(false);
  }
}

// The /prime skill reads ACTIVE_PROJECT.md first; keep it in step when it
// names this folder (".") or is missing, and leave a nested pointer alone.
async function updateActiveProject(io, dir, name, summary) {
  const path = `${dir}/ACTIVE_PROJECT.md`;
  if (await io.exists(path)) {
    const text = await io.read(path).catch(() => "");
    if (firstLine(text) !== ".") return;
  }
  await io.write(path, `.\n${name}\n${summary}\n`);
}

// Appends handoff/ to an existing .gitignore that lacks it, or creates one in
// a git repo that has none. Returns what it did, or "" when nothing changed.
export async function ensureIgnored(io, cwd) {
  const path = `${cwd}/.gitignore`;
  if (await io.exists(path)) {
    const text = await io.read(path);
    if (ignoresHandoff(text)) return "";
    const sep = text === "" || text.endsWith("\n") ? "" : "\n";
    await io.write(path, `${text}${sep}handoff/\n`);
    return "added handoff/ to .gitignore";
  }
  if (await io.exists(`${cwd}/.git`)) {
    await io.write(path, "handoff/\n");
    return "created .gitignore with handoff/";
  }
  return "";
}

export function ignoresHandoff(text) {
  return text.split(/\r?\n/).some((line) => /^\/?handoff(\/(\*\*?)?)?$/.test(line.trim()));
}

export function splitReply(text) {
  const lines = text.replace(/^\s+/, "").split("\n");
  const m = /^LATEST:\s*(.+)$/.exec(lines[0] ?? "");
  if (m) return { summary: oneLine(m[1]), body: lines.slice(1).join("\n") };
  return { summary: "Auto handoff written by auto-handoff.", body: text };
}

export function timestamp(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function humanTime(ms) {
  const s = timestamp(ms);
  return `${s.slice(0, 10)} ${s.slice(11, 13)}:${s.slice(13, 15)}:${s.slice(15, 17)}`;
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

function statusText(settings, percent, lastLine) {
  const fill = percent === undefined ? "not measured yet" : `${percent}%`;
  return [
    `Auto handoff is ${settings.isEnabled ? "on" : "off"}, threshold ${settings.threshold}%, context fill ${fill}.`,
    lastLine,
    "Commands are /autohandoff now, resume, threshold <n>, on, off.",
  ].join("\n");
}

function readSettings(stored, fallbackThreshold, fallbackEnabled) {
  const s = asObject(stored);
  return {
    threshold: toThreshold(s.threshold) ?? fallbackThreshold,
    isEnabled: typeof s.isEnabled === "boolean" ? s.isEnabled : fallbackEnabled,
  };
}

function toThreshold(v) {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 99) return undefined;
  return Math.round(n);
}

function asObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function firstLine(text) {
  return (text ?? "").split(/\r?\n/)[0].trim();
}

function oneLine(text) {
  return text.replace(/\s+/g, " ").trim();
}
