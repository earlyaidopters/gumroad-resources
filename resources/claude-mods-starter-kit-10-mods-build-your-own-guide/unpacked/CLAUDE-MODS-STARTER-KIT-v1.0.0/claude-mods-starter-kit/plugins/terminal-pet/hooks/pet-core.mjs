// Terminal Pet: the pure state machine. No engine calls in here.

export const SLEEP_AFTER_MS = 60_000;
export const LINGER_MS = 1_500; // a tool mood stays on screen this long after the call
export const CELEBRATE_MS = 2_200;
export const OOPS_MS = 2_500;
export const PARTY_MS = 8_000;

export const DEFAULT_PREFS = { name: "Pinch", enabled: true };
export const EMPTY_PET = { mood: "idle", since: 0, until: 0, last: 0, turn: false, busy: 0, errs: 0, forced: "" };
export const EMPTY_STATS = { reads: [], writes: [], ran: 0, risky: 0 };

const READ_TOOLS = new Set(["Read", "Grep", "Glob", "LS", "WebFetch", "WebSearch", "NotebookRead"]);
const WRITE_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const RISKY = [
  /\brm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+)+/,
  /\brm\s+--(recursive|force)\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+push\b[^|;&]*\s(--force\b|--force-with-lease\b|-f\b)/,
  /\bgit\s+clean\s+-[a-zA-Z]*f/,
  /\bgit\s+branch\s+-D\b/,
  /\bdrop\s+(table|database|schema)\b/i,
  /\btruncate\s+table\b/i,
  /\bmkfs(\.\w+)?\b/,
  /\bdd\s+if=/,
  /\bchmod\s+-R\s+777\b/,
];

export const MOOD_WORDS = {
  idle: "chillin",
  thinking: "thinking...",
  reading: "munching files",
  typing: "typing away",
  running: "running a command",
  nervous: "nervous!!",
  celebrate: "party time!",
  oops: "dizzy, that failed",
  sleeping: "zzz, asleep",
};

export const ASCII_FACES = {
  idle: "(°,,°)",
  thinking: "(°,,°)?",
  reading: "(o,,o)",
  typing: "(°,,°)",
  running: "(>,,<)",
  nervous: "(O,,O);",
  celebrate: "(^,,^)",
  oops: "(@,,@)",
  sleeping: "(-,,-)",
};

export function isRisky(command) {
  return typeof command === "string" && RISKY.some((re) => re.test(command));
}

/** Which mood a tool call puts the pet in. */
export function classify(tool, input) {
  if (READ_TOOLS.has(tool)) return "reading";
  if (WRITE_TOOLS.has(tool)) return "typing";
  if (SHELL_TOOLS.has(tool)) return isRisky(input && input.command) ? "nervous" : "running";
  return "thinking";
}

export function normalizePrefs(v) {
  const o = v && typeof v === "object" ? v : {};
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 24) : DEFAULT_PREFS.name;
  return { name, enabled: typeof o.enabled === "boolean" ? o.enabled : DEFAULT_PREFS.enabled };
}

/** The mood shown at `now`, timeouts and sleep applied. */
export function moodAt(pet, now) {
  const p = pet || EMPTY_PET;
  if (p.forced === "sleep") return "sleeping";
  if (p.forced === "party" && now < p.until) return "celebrate";
  let mood = p.mood;
  const expired = p.forced === "party" || (p.until > 0 && now >= p.until);
  if (expired && p.busy <= 0) mood = p.turn ? "thinking" : "idle";
  if (mood === "idle" && now - p.last >= SLEEP_AFTER_MS) return "sleeping";
  return mood;
}

// --- transitions -------------------------------------------------------------

export function onTurnStart(pet, now) {
  return { ...EMPTY_PET, ...pet, mood: "thinking", since: now, until: 0, last: now, turn: true, busy: 0, errs: 0, forced: "" };
}

export function onToolStart(pet, mood, now) {
  const p = { ...EMPTY_PET, ...pet };
  return { ...p, mood, since: now, until: 0, last: now, busy: p.busy + 1, forced: "" };
}

export function onToolEnd(pet, mood, isError, now) {
  const p = { ...EMPTY_PET, ...pet };
  const busy = Math.max(0, p.busy - 1);
  if (isError) return { ...p, mood: "oops", since: now, until: now + OOPS_MS, last: now, busy, errs: p.errs + 1 };
  // Another call started since: leave its mood alone.
  if (p.mood !== mood && busy > 0) return { ...p, busy, last: now };
  return { ...p, mood, until: now + LINGER_MS, last: now, busy };
}

export function onTurnEnd(pet, reason, isAborted, now) {
  const p = { ...EMPTY_PET, ...pet, turn: false, busy: 0, last: now, forced: "" };
  if (!isAborted && reason === "answer" && p.errs === 0) return { ...p, mood: "celebrate", since: now, until: now + CELEBRATE_MS };
  if (!isAborted && (p.errs > 0 || reason === "error")) return { ...p, mood: "oops", since: now, until: now + OOPS_MS };
  return { ...p, mood: "idle", since: now, until: 0 };
}

export function addUnique(list, item, cap = 2000) {
  if (!item || list.includes(item)) return list;
  return [...list, item].slice(-cap);
}
