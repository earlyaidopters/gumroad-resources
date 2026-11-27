// Meeting auto-play: reads today's Google Calendar through Composio and starts a
// Dreamlight session a set number of minutes after each meeting ends.
// The schedule is cached on disk, so a day that was read while online still
// triggers if the Mac goes offline later. Only meeting times are kept, never titles.
const fs = require("fs");

const DEFAULTS = Object.freeze({ enabled: false, activity: "deep_work", delayMinutes: 10 });
const QUIET_WINDOW_MS = 15 * 60 * 1000; // skip a trigger if another meeting starts within 15 min of it
const LATE_GRACE_MS = 2 * 60 * 1000; // a trigger missed by more than 2 min (asleep, app closed) is dropped
const REFRESH_MS = 10 * 60 * 1000;
const TICK_MS = 20 * 1000;

function dateTimeOf(part) {
  const raw = part && typeof part === "object" ? part.dateTime : null;
  if (!raw) return null; // all-day events only carry `date`
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

// A meeting is a timed, confirmed, busy event you have not declined that has
// someone else on it or a video link. Dreamlight's own focus blocks never count.
function isMeeting(item) {
  if (!item || typeof item !== "object") return false;
  if (item.status === "cancelled") return false;
  if (item.eventType && item.eventType !== "default") return false;
  if (item.transparency === "transparent") return false;
  const start = dateTimeOf(item.start);
  const end = dateTimeOf(item.end);
  if (start == null || end == null || end <= start) return false;
  const summary = typeof item.summary === "string" ? item.summary : "";
  const description = typeof item.description === "string" ? item.description : "";
  if (/^Focus · /.test(summary) || description.trim() === "Dreamlight session") return false;
  const attendees = Array.isArray(item.attendees) ? item.attendees : [];
  const me = attendees.find((a) => a && a.self);
  if (me && me.responseStatus === "declined") return false;
  const others = attendees.filter((a) => a && !a.self && !a.resource).length;
  const hasVideo = Boolean(item.hangoutLink || item.conferenceData);
  return others > 0 || hasVideo;
}

function pickMeetings(items) {
  return (Array.isArray(items) ? items : [])
    .filter(isMeeting)
    .map((item) => ({ id: String(item.id || ""), start: dateTimeOf(item.start), end: dateTimeOf(item.end) }))
    .sort((a, b) => a.start - b.start);
}

// One trigger per meeting end, merged when meetings overlap or run back to back.
function planTriggers(meetings, { delayMinutes = DEFAULTS.delayMinutes } = {}) {
  const delayMs = Math.max(0, Number(delayMinutes) || 0) * 60000;
  const triggers = [];
  for (const meeting of meetings) {
    const at = meeting.end + delayMs;
    const blocked = meetings.some((other) => other !== meeting &&
      other.start < at + QUIET_WINDOW_MS && other.end > meeting.end);
    if (blocked) continue;
    triggers.push({ key: `${meeting.id}@${meeting.end}`, at, meetingEnd: meeting.end });
  }
  return triggers.sort((a, b) => a.at - b.at);
}

function createMeetingAutoplay({
  listEvents, // async ({ timeMin, timeMax }) => { ok, items }
  startSession, // async (activityKey) => void
  isPlaying, // async () => boolean
  notify = () => {},
  onStatus = () => {},
  settingsPath,
  cachePath,
  logPath,
  now = () => Date.now(),
  timers = { setInterval, clearInterval },
} = {}) {
  let settings = { ...DEFAULTS };
  let meetings = [];
  let fired = new Set();
  let lastSync = null;
  let lastError = null;
  let tickTimer = null;
  let refreshTimer = null;

  // Decision log: times and counts only, never meeting titles. Kept under about 200 KB.
  function log(message) {
    const line = `${new Date(now()).toISOString()} ${message}`;
    if (process.env.DREAMLIGHT_AUTOPLAY_DEBUG) console.log("[autoplay]", line);
    if (!logPath) return;
    try {
      if (fs.existsSync(logPath) && fs.statSync(logPath).size > 200000) fs.renameSync(logPath, `${logPath}.1`);
      fs.appendFileSync(logPath, line + "\n");
    } catch {}
  }

  function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
  }
  function writeJson(file, data) {
    try {
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(data));
      fs.renameSync(`${file}.tmp`, file);
    } catch {}
  }

  const savedSettings = settingsPath ? readJson(settingsPath) : null;
  if (savedSettings && typeof savedSettings === "object") {
    settings = {
      enabled: Boolean(savedSettings.enabled),
      activity: typeof savedSettings.activity === "string" ? savedSettings.activity : DEFAULTS.activity,
      delayMinutes: Number.isFinite(savedSettings.delayMinutes) ? savedSettings.delayMinutes : DEFAULTS.delayMinutes,
    };
  }
  const cached = cachePath ? readJson(cachePath) : null;
  if (cached && Array.isArray(cached.meetings)) {
    meetings = cached.meetings.filter((m) => Number.isFinite(m.start) && Number.isFinite(m.end));
    fired = new Set(Array.isArray(cached.fired) ? cached.fired : []);
    lastSync = Number.isFinite(cached.lastSync) ? cached.lastSync : null;
  }

  function persistCache() {
    if (cachePath) writeJson(cachePath, { meetings, fired: [...fired], lastSync });
  }

  function nextTrigger() {
    const t = now();
    return planTriggers(meetings, settings).find((tr) => !fired.has(tr.key) && tr.at >= t - LATE_GRACE_MS) || null;
  }

  function status() {
    const next = settings.enabled ? nextTrigger() : null;
    return {
      ok: true,
      enabled: settings.enabled,
      activity: settings.activity,
      delayMinutes: settings.delayMinutes,
      meetingsToday: meetings.length,
      nextAt: next ? next.at : null,
      lastSync,
      error: lastError,
    };
  }
  const emit = () => { try { onStatus(status()); } catch {} };

  async function refresh() {
    if (!settings.enabled) return status();
    const t = new Date(now());
    const dayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const dayEnd = new Date(dayStart.getTime() + 36 * 3600 * 1000);
    let result;
    try {
      result = await listEvents({ timeMin: dayStart.toISOString(), timeMax: dayEnd.toISOString() });
    } catch {
      result = { ok: false, message: "Could not read Google Calendar." };
    }
    if (result && result.ok) {
      meetings = pickMeetings(result.items);
      lastSync = now();
      lastError = null;
      const keep = new Set(planTriggers(meetings, settings).map((tr) => tr.key));
      fired = new Set([...fired].filter((key) => keep.has(key)));
      persistCache();
      const next = nextTrigger();
      log(`read calendar: ${meetings.length} meetings, next ${next ? new Date(next.at).toISOString() : "none"}`);
    } else {
      lastError = (result && result.message) || "Could not read Google Calendar.";
      log(`read failed, using cached schedule (${meetings.length} meetings)`);
    }
    emit();
    return status();
  }

  async function tick() {
    if (!settings.enabled) return null;
    const t = now();
    const due = planTriggers(meetings, settings).filter((tr) => !fired.has(tr.key) && tr.at <= t);
    if (!due.length) return null;
    for (const tr of due) fired.add(tr.key);
    persistCache();
    const latest = due[due.length - 1];
    log(`due ${due.map((d) => new Date(d.at).toISOString()).join(",")}`);
    if (t - latest.at > LATE_GRACE_MS) { log("skip late"); emit(); return { skipped: "late" }; }
    let playing = false;
    try { playing = await isPlaying(); } catch {}
    if (playing) { log("skip already playing"); emit(); return { skipped: "already-playing" }; }
    log(`start ${settings.activity} for trigger ${new Date(latest.at).toISOString()}`);
    await startSession(settings.activity);
    try { notify(settings); } catch {}
    emit();
    return { started: settings.activity, at: latest.at };
  }

  function start() {
    stop();
    tickTimer = timers.setInterval(() => { tick().catch(() => {}); }, TICK_MS);
    refreshTimer = timers.setInterval(() => { refresh().catch(() => {}); }, REFRESH_MS);
    refresh().catch(() => {});
  }
  function stop() {
    if (tickTimer) timers.clearInterval(tickTimer);
    if (refreshTimer) timers.clearInterval(refreshTimer);
    tickTimer = refreshTimer = null;
  }

  async function setSettings(patch = {}) {
    const next = { ...settings };
    if (typeof patch.enabled === "boolean") next.enabled = patch.enabled;
    if (typeof patch.activity === "string" && patch.activity) next.activity = patch.activity;
    if (Number.isFinite(patch.delayMinutes) && patch.delayMinutes >= 0 && patch.delayMinutes <= 60) {
      next.delayMinutes = patch.delayMinutes;
    }
    settings = next;
    if (settingsPath) writeJson(settingsPath, settings);
    log(`settings enabled=${settings.enabled} activity=${settings.activity} delay=${settings.delayMinutes}`);
    if (settings.enabled) return refresh();
    emit();
    return status();
  }

  return { start, stop, refresh, tick, status, setSettings };
}

module.exports = { DEFAULTS, isMeeting, pickMeetings, planTriggers, createMeetingAutoplay };
