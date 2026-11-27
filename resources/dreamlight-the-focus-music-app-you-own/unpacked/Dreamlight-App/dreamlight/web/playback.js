const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const STORE_KEY = "dreamlight_studio_v5";
const saved = (() => {
  try { return JSON.parse(window.desktopPrefs?.read() || localStorage.getItem(STORE_KEY) || "{}") || {}; }
  catch { return {}; }
})();

const state = {
  allTracks: [],
  queue: [],
  currentIdx: 0,
  activity: null,
  sessionName: "",
  lastActivity: saved.lastActivity || null,
  timerPresets: saved.timerPresets || {},
  timer: null,
  playReqId: 0,
  hasStarted: false,
  wake: null,
  intensity: ["gentle", "deep"].includes(saved.intensity) ? saved.intensity : "balanced",
  focusDays: saved.focusDays || { day: "", count: 0 },
  isPlaying: false,
  starting: false,
  failure: null,
  completedUntil: 0,
  autoNext: saved.autoNext ?? true,
  shuffle: saved.shuffle ?? false,
  loopMode: saved.loopMode || "all",
  crossfadeSec: saved.crossfadeSec ?? 4,
  vizMode: saved.vizMode || "signature",
  glowIntensity: saved.glowIntensity ?? 1,
  volume: saved.volume ?? 0.85,
  muted: false,
  rainLevel: saved.rainLevel ?? 0,
  oceanLevel: saved.oceanLevel ?? 0,
  vinylLevel: saved.vinylLevel ?? 0,
  breathOn: false,
  breathStartTs: 0,
};

function savePrefs() {
  const { autoNext, shuffle, loopMode, crossfadeSec, vizMode, glowIntensity, volume,
    rainLevel, oceanLevel, vinylLevel, lastActivity, timerPresets, intensity, focusDays } = state;
  try {
    const payload = JSON.stringify({ autoNext, shuffle, loopMode, crossfadeSec,
      vizMode, glowIntensity, volume, rainLevel, oceanLevel, vinylLevel, lastActivity, timerPresets,
      intensity, focusDays, lastFilename: getCurrentTrack()?.filename });
    if (window.desktopPrefs) window.desktopPrefs.write(payload);
    else localStorage.setItem(STORE_KEY, payload);
  } catch {}
}

let audioCtx = null, masterGain = null, sessionGain = null, analyser = null;
let musicGain, toneShelf, toneWarmth, tonePresence, shimmer, shimmerDepth, alarmGain;
let wakeTimer;
const alarmVoices = new Set();
let rainGain = null, oceanGain = null, vinylGain = null;
const decks = [0, 1].map(() => {
  const el = new Audio();
  if (location.protocol !== "file:") el.crossOrigin = "anonymous";
  el.preload = "metadata";
  el.setAttribute("playsinline", "");
  return { el, gain: null, requestId: 0 };
});
let activeDeck = 0;
let startAttempt = null, fadeEnd = null;

function createPinkBuffer(ctx, sec) {
  const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const out = buf.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      out[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.032; b6=w*0.115926;
    }
  }
  return buf;
}

function createVinylBuffer(ctx, sec) {
  const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const out = buf.getChannelData(ch); let last = 0;
    for (let i = 0; i < len; i++) {
      last = last*0.92 + (Math.random()*2-1)*0.08;
      out[i] = last*0.16 + (Math.random()<0.00055 ? (Math.random()*2-1)*0.3 : 0);
    }
  }
  return buf;
}

function attachMusicGraph() {
  if (musicGain) return;
  const filter = (type, frequency, q) => {
    const node = audioCtx.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    if (q) node.Q.value = q;
    return node;
  };
  musicGain = audioCtx.createGain();
  toneShelf = filter("highshelf", 4500);
  toneWarmth = filter("peaking", 220, .9);
  tonePresence = filter("peaking", 2400, .9);
  const amplitude = audioCtx.createGain();
  shimmer = audioCtx.createOscillator();
  shimmerDepth = audioCtx.createGain();
  shimmerDepth.gain.value = 0;
  shimmer.connect(shimmerDepth).connect(amplitude.gain);
  shimmer.start();
  toneShelf.connect(toneWarmth).connect(tonePresence).connect(amplitude).connect(musicGain).connect(sessionGain);

  decks.forEach((deck, index) => {
    // The gain graph owns volume after the media element is connected.
    deck.el.volume = 1;
    deck.src = audioCtx.createMediaElementSource(deck.el);
    deck.gain = audioCtx.createGain();
    deck.gain.gain.value = index === activeDeck ? 1 : 0;
    deck.src.connect(deck.gain).connect(toneShelf);
  });
}

function rampParam(param, value, seconds) {
  const now = audioCtx.currentTime;
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
  else {
    const current = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
  }
  param.linearRampToValueAtTime(value, now + seconds);
}

function applyIntensity(track = getCurrentTrack()) {
  if (!musicGain) return;
  const deep = state.intensity === "deep";
  rampParam(toneShelf.gain, state.intensity === "gentle" ? -4 : 0, .18);
  rampParam(toneWarmth.frequency, deep ? 180 : 220, .18);
  rampParam(toneWarmth.gain, deep ? 2 : 0, .18);
  rampParam(tonePresence.gain, deep ? 1.5 : 0, .18);
  rampParam(shimmer.frequency, Math.min(4, (track?.beatHz || 0) / 4), .18);
  rampParam(shimmerDepth.gain, deep ? .04 : 0, .18);
}

function setIntensity(level) {
  if (!["gentle", "balanced", "deep"].includes(level)) return;
  state.intensity = level;
  ensureAudioGraph(level !== "balanced");
  applyIntensity();
  savePrefs();
}

function ensureAudioGraph(forceAmbientOnIOS = false) {
  const native = isIOS && state.intensity === "balanced";
  if (native && !audioCtx && !forceAmbientOnIOS && state.rainLevel === 0 && state.oceanLevel === 0 && state.vinylLevel === 0) return;
  if (audioCtx) {
    if (audioCtx.state !== "running") audioCtx.resume().catch(() => {});
    if (!native && !musicGain) attachMusicGraph();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AC();
  if (audioCtx.state !== "running") audioCtx.resume().catch(() => {});
  masterGain = audioCtx.createGain();
  masterGain.gain.value = state.muted ? 0 : state.volume;
  sessionGain = audioCtx.createGain();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.42;
  alarmGain = audioCtx.createGain();
  alarmGain.connect(masterGain);
  if (!native) attachMusicGraph();

  const pinkBuf = createPinkBuffer(audioCtx, 6);
  const rainSrc = audioCtx.createBufferSource(); rainSrc.buffer = pinkBuf; rainSrc.loop = true;
  const rainFlt = audioCtx.createBiquadFilter(); rainFlt.type="bandpass"; rainFlt.frequency.value=1250; rainFlt.Q.value=0.42;
  rainGain = audioCtx.createGain(); rainGain.gain.value = 0;
  rainSrc.connect(rainFlt); rainFlt.connect(rainGain); rainGain.connect(sessionGain); rainSrc.start();

  const oceanSrc = audioCtx.createBufferSource(); oceanSrc.buffer = pinkBuf; oceanSrc.loop = true;
  const oceanFlt = audioCtx.createBiquadFilter(); oceanFlt.type="lowpass"; oceanFlt.frequency.value=520;
  const oLfo = audioCtx.createOscillator(); oLfo.frequency.value=0.095;
  const oDep = audioCtx.createGain(); oDep.gain.value=260; oLfo.connect(oDep); oDep.connect(oceanFlt.frequency); oLfo.start();
  oceanGain = audioCtx.createGain(); oceanGain.gain.value = 0;
  oceanSrc.connect(oceanFlt); oceanFlt.connect(oceanGain); oceanGain.connect(sessionGain); oceanSrc.start();

  const vSrc = audioCtx.createBufferSource(); vSrc.buffer = createVinylBuffer(audioCtx, 6); vSrc.loop = true;
  const vFlt = audioCtx.createBiquadFilter(); vFlt.type="bandpass"; vFlt.frequency.value=2200; vFlt.Q.value=0.5;
  vinylGain = audioCtx.createGain(); vinylGain.gain.value = 0;
  vSrc.connect(vFlt); vFlt.connect(vinylGain); vinylGain.connect(sessionGain); vSrc.start();

  sessionGain.connect(masterGain);
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);
}

const playback = new EventTarget();
const changed = (kind = "state") => playback.dispatchEvent(new Event(kind));
const getCurrentTrack = () => state.queue[state.currentIdx] || null;
const volume = () => state.muted ? 0 : state.volume;
const activeAudio = () => decks[activeDeck].el;
const tracksFor = (slugs) => slugs ? slugs.map((slug) => state.allTracks.find((t) => t.slug === slug)).filter(Boolean) : [...state.allTracks];

function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = String(Math.floor(s / 60) % 60).padStart(2, "0");
  const rest = String(s % 60).padStart(2, "0");
  return h ? `${h}:${m}:${rest}` : `${m}:${rest}`;
}

function putGain(param, value) {
  param.cancelScheduledValues(0);
  param.setValueAtTime(value, audioCtx.currentTime);
}

function putDeckGain(index, gain) {
  const deck = decks[index];
  if (deck.gain) putGain(deck.gain.gain, gain);
  else if (!isIOS) deck.el.volume = gain * volume();
}

function syncAmbience(on = state.isPlaying) {
  [[rainGain, state.rainLevel * 0.55], [oceanGain, state.oceanLevel * 0.65],
    [vinylGain, state.vinylLevel * 0.42]].forEach(([node, gain]) => {
    if (node) putGain(node.gain, on ? gain : 0);
  });
}

function setVolume(level, muted = false) {
  state.volume = level;
  state.muted = muted;
  if (masterGain) putGain(masterGain.gain, volume());
  savePrefs();
  changed();
}

function collapseFade() {
  clearTimeout(fadeEnd);
  fadeEnd = null;
  decks[1 - activeDeck].el.pause();
  putDeckGain(1 - activeDeck, 0);
  putDeckGain(activeDeck, 1);
}

function equalPower(from, to, seconds) {
  if (!seconds || !decks[to].gain) { collapseFade(); return; }
  const points = 64;
  const now = audioCtx.currentTime;
  [[from, Math.cos], [to, Math.sin]].forEach(([index, curve]) => {
    const param = decks[index].gain.gain;
    param.cancelScheduledValues(now);
    param.setValueCurveAtTime(Float32Array.from({ length: points },
      (_, point) => curve(point / (points - 1) * Math.PI / 2)), now, seconds);
  });
  fadeEnd = setTimeout(collapseFade, seconds * 1000);
}

function cancelStart() {
  if (!startAttempt) return;
  const attempt = startAttempt;
  ++state.playReqId;
  startAttempt = null;
  attempt.abort.abort();
  attempt.el.pause();
  state.starting = false;
}

function waitForAdvance(el, signal) {
  const origin = el.currentTime;
  return new Promise((resolve, reject) => {
    const dispose = (result, value) => {
      clearInterval(poll);
      clearTimeout(limit);
      el.removeEventListener("error", fail);
      signal.removeEventListener("abort", fail);
      result(value);
    };
    const fail = () => dispose(reject);
    const poll = setInterval(() => {
      if (!el.paused && el.currentTime > origin + 0.01) dispose(resolve);
    }, 25);
    const limit = setTimeout(fail, 12000);
    el.addEventListener("error", fail, { once: true });
    signal.addEventListener("abort", fail, { once: true });
    try { el.play().catch(fail); }
    catch { fail(); }
  });
}

async function playSelection(selection) {
  const { queue, index, session, activity, automatic = false, resume = false, restoreBreak = false } = selection;
  const track = queue[index];
  if (!track) return false;
  cancelStart();
  if (state.wake) dismissWake(false);
  collapseFade();
  if (!state.isPlaying) resetSessionGain();

  const from = activeDeck;
  const continuing = resume && Boolean(activeAudio().getAttribute("src")) && !activeAudio().ended;
  const to = continuing ? from : 1 - from;
  const el = decks[to].el;
  const requestId = ++state.playReqId;
  const attempt = { abort: new AbortController(), el };
  decks[to].requestId = requestId;
  startAttempt = attempt;
  state.failure = null;
  const preset = session === undefined ? state.timer : preferredTimer(activity || null);
  ensureAudioGraph(Boolean(activity?.gentleEnd || (selection.minutes == null && preset?.intervals)));
  if (!decks[to].gain && to !== from) decks[from].el.pause();
  state.completedUntil = 0;
  state.starting = false;

  putDeckGain(to, continuing ? 1 : 0);
  if (!continuing) el.src = track.url;
  const pending = waitForAdvance(el, attempt.abort.signal);
  const hint = setTimeout(() => {
    if (startAttempt !== attempt) return;
    state.starting = true;
    changed();
  }, 250);
  changed();

  try {
    await pending;
    if (requestId !== state.playReqId || startAttempt !== attempt) {
      // A newer request may already own this deck. Never pause that request.
      if (decks[to].requestId === requestId) el.pause();
      return false;
    }
    startAttempt = null;
    state.starting = false;
    const duration = state.isPlaying && !decks[from].el.paused && from !== to
      ? (automatic ? state.crossfadeSec : 0.28) : 0;
    activeDeck = to;
    state.queue = queue;
    state.currentIdx = index;
    state.isPlaying = true;
    state.hasStarted = true;
    applyIntensity(track);
    if (session !== undefined) {
      state.activity = activity || null;
      state.sessionName = session;
      if (activity) state.lastActivity = activity.key;
      setBreath(Boolean(activity?.breath));
      installTimer(selection.minutes == null ? preferredTimer(state.activity) : { minutes: selection.minutes });
    } else {
      resumeTimer();
      if (restoreBreak) {
        putGain(musicGain.gain, .25);
        rampParam(musicGain.gain, 1, 1.5);
      }
    }
    equalPower(from, to, duration);
    syncAmbience();
    savePrefs();
    updateMediaSession();
    changed("track");
    return true;
  } catch {
    if (requestId !== state.playReqId || startAttempt !== attempt) return false;
    startAttempt = null;
    el.pause();
    putDeckGain(to, 0);
    state.starting = false;
    if (state.isPlaying && activeAudio().paused) pausePlayback({ render: false });
    state.failure = { label: "Couldn't load this session", retry: () => playSelection(selection) };
    changed();
    return false;
  } finally {
    clearTimeout(hint);
  }
}

function pausePlayback({ holdTimer = true, render = true } = {}) {
  cancelStart();
  collapseFade();
  decks.forEach((deck, index) => {
    deck.el.pause();
    putDeckGain(index, 0);
  });
  state.isPlaying = false;
  syncAmbience(false);
  if (holdTimer) pauseTimer();
  resetSessionGain();
  updateMediaSession();
  if (render) changed();
}

function stopSession() {
  dismissWake(false);
  pausePlayback({ render: false });
  state.timer = null;
  state.failure = null;
  if (activeAudio().readyState) activeAudio().currentTime = 0;
  setBreath(false);
  changed();
  changed("clock");
}

function playbackRunning() {
  return state.isPlaying || Boolean(state.timer?.phase === "break" && state.timer.deadline);
}

function togglePlayback() {
  if (state.wake) return dismissWake();
  if (state.timer?.phase === "break" && !musicGain) {
    if (state.timer.deadline) {
      pauseTimer();
      syncAmbience(false);
    } else {
      resumeTimer();
      syncAmbience(true);
    }
    changed();
    return;
  }
  if (state.isPlaying || startAttempt) return pausePlayback();
  if (!getCurrentTrack()) return startActivity(state.lastActivity || "deep_work");
  return playSelection({ queue: state.queue, index: state.currentIdx, resume: true });
}

function nextIndex(automatic) {
  const count = state.queue.length;
  if (!count) return -1;
  if (automatic && state.loopMode === "one") return state.currentIdx;
  if (state.shuffle && count > 1) return (state.currentIdx + 1 + Math.floor(Math.random() * (count - 1))) % count;
  if (state.currentIdx + 1 < count) return state.currentIdx + 1;
  return state.loopMode === "all" || !automatic ? 0 : -1;
}

function nextTrack(automatic = false) {
  const index = nextIndex(automatic);
  if (index >= 0) return playSelection({ queue: state.queue, index, automatic });
  if (automatic) pausePlayback();
}

function previousTrack() {
  const el = activeAudio();
  if (el.currentTime > 5) {
    cancelStart();
    collapseFade();
    seekTo(0);
    changed();
    return;
  }
  const count = state.queue.length;
  if (count) return playSelection({ queue: state.queue, index: (state.currentIdx + count - 1) % count });
}

function startActivity(key, minutes) {
  const activity = ACTIVITY_BY_KEY.get(key);
  if (!activity) return;
  return playSelection({ queue: tracksFor(activity.queue), index: 0, activity, session: activity.name, minutes });
}

function setBreath(on) {
  state.breathOn = on;
  state.breathStartTs = performance.now();
}

function currentPosition() {
  const el = activeAudio();
  return { cur: el.currentTime || 0, dur: Number.isFinite(el.duration) ? el.duration : getCurrentTrack()?.duration || 0 };
}

function seekTo(seconds) {
  const el = activeAudio();
  if (!el.readyState) return;
  el.currentTime = Math.min(currentPosition().dur, Math.max(0, seconds));
  changed("position");
}

function updateMediaSession() {
  if (!navigator.mediaSession) return;
  const track = getCurrentTrack();
  navigator.mediaSession.playbackState = playbackRunning() ? "playing" : "paused";
  if (track) navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title, artist: "Dreamlight", album: state.sessionName,
    artwork: [{ src: new URL(track.cover, location.href).href, type: "image/png" }],
  });
}

let lastPositionSync = 0;
let automaticFrom = null;
decks.forEach(({ el }, index) => {
  el.addEventListener("loadedmetadata", () => { if (index === activeDeck) changed("position"); });
  el.addEventListener("ended", () => {
    if (index !== activeDeck) return;
    if (startAttempt || state.wake) return;
    if (state.autoNext) nextTrack(true);
    else pausePlayback();
  });
  el.addEventListener("timeupdate", () => {
    if (index !== activeDeck) return;
    const { cur, dur } = currentPosition();
    changed("position");
    const now = performance.now();
    if (navigator.mediaSession?.setPositionState && dur > 0 && now - lastPositionSync > 1000) {
      lastPositionSync = now;
      navigator.mediaSession.setPositionState({ duration: dur, playbackRate: 1, position: Math.min(cur, dur) });
    }
    if (dur - cur > state.crossfadeSec + 1) automaticFrom = null;
    if (state.isPlaying && !state.wake && state.autoNext && state.crossfadeSec > 0 && !startAttempt &&
        !fadeEnd && automaticFrom !== el && dur > state.crossfadeSec + 10 && dur - cur <= state.crossfadeSec) {
      automaticFrom = el;
      selectedAutomatic(activeDeck, el);
    }
  });
  el.addEventListener("error", () => {
    if (index !== activeDeck || !state.isPlaying || startAttempt) return;
    pausePlayback({ render: false });
    state.failure = { label: "Couldn't load this session",
      retry: () => playSelection({ queue: state.queue, index: state.currentIdx }) };
    changed();
  });
});

async function selectedAutomatic(index, el) {
  const next = nextIndex(true);
  if (next < 0) return;
  if (!await playSelection({ queue: state.queue, index: next, automatic: true }) &&
      index === activeDeck && el.ended && !startAttempt && state.isPlaying) pausePlayback();
}

if (navigator.mediaSession) {
  const handlers = {
    play: () => { if (!playbackRunning() && !startAttempt) togglePlayback(); },
    pause: () => pausePlayback(),
    nexttrack: () => nextTrack(),
    previoustrack: previousTrack,
    seekto: ({ seekTime }) => seekTo(seekTime),
  };
  Object.entries(handlers).forEach(([action, handler]) => {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
  });
}

// A deadline represents a running clock. A paused clock stores its remaining milliseconds.
function preferredTimer(activity = state.activity) {
  return state.timerPresets[activity?.key || "library"] || { minutes: activity?.minutes || 0, intervals: Boolean(activity?.intervals) };
}

function setTimer(minutes, intervals = false) {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) return false;
  if (intervals && minutes !== 50) minutes = 25;
  if (intervals) ensureAudioGraph(true);
  state.timerPresets[state.activity?.key || "library"] = { minutes, intervals };
  installTimer({ minutes, intervals });
  savePrefs();
  changed();
  return true;
}

function installTimer({ minutes, intervals = false }) {
  const restore = state.timer?.phase === "break" && state.timer.deadline && !state.isPlaying;
  dismissWake(false);
  const total = minutes * 60000;
  state.timer = total ? {
    total, remaining: total, deadline: state.isPlaying ? Date.now() + total : 0,
    intervals, round: 1, phase: "work", workMs: total, breakMs: total / 5, fading: false,
  } : null;
  resetSessionGain();
  if (restore) playSelection({ queue: state.queue, index: state.currentIdx, resume: true });
  changed("clock");
}

function pauseTimer() {
  const timer = state.timer;
  if (!timer?.deadline) return;
  timer.remaining = Math.max(0, timer.deadline - Date.now());
  timer.deadline = 0;
  resetSessionGain();
  changed("clock");
}

function resumeTimer() {
  const timer = state.timer;
  if (!timer || timer.deadline) return;
  timer.deadline = Date.now() + timer.remaining;
  changed("clock");
}

function getTimerState() {
  const t = state.timer;
  return {
    timerKind: t?.intervals ? "Intervals" : t ? "Countdown" : "Continuous",
    timerTotal: t ? Math.ceil(t.total / 1000) : 0,
    timerRemain: t ? Math.max(0, Math.ceil((t.deadline ? t.deadline - Date.now() : t.remaining) / 1000)) : 0,
    timerRunning: Boolean(t?.deadline),
    intervalPhase: t?.intervals ? t.phase : null,
    intervalRound: t?.intervals ? t.round : null,
    intervalWork: t?.intervals ? t.workMs / 60000 : null,
  };
}

function resetSessionGain() {
  if (sessionGain) putGain(sessionGain.gain, 1);
  if (musicGain) putGain(musicGain.gain, state.timer?.phase === "break" ? .25 : 1);
  else if (masterGain) putGain(masterGain.gain, volume());
  if (state.timer) state.timer.fading = false;
}

function fadeSession(seconds) {
  const gain = musicGain ? sessionGain : masterGain;
  if (gain) rampParam(gain.gain, 0, seconds);
}

function chimeNote(frequency, time, duration, decibels, { type = "sine", strength = 1, wake = false } = {}) {
  const oscillator = audioCtx.createOscillator();
  const envelope = audioCtx.createGain();
  const peak = 10 ** (decibels / 20) * strength;
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(peak, time + .06);
  envelope.gain.exponentialRampToValueAtTime(.0001, time + duration - .02);
  envelope.gain.linearRampToValueAtTime(0, time + duration);
  oscillator.connect(envelope).connect(wake ? alarmGain : masterGain);
  if (wake) alarmVoices.add(oscillator);
  oscillator.addEventListener("ended", () => {
    alarmVoices.delete(oscillator);
    oscillator.disconnect();
    envelope.disconnect();
  }, { once: true });
  oscillator.start(time);
  oscillator.stop(time + duration);
}

function intervalChime() {
  if (!audioCtx) return;
  const start = audioCtx.currentTime;
  chimeNote(440, start, 1.2, -16, { strength: .68 });
  chimeNote(659.25, start, 1.2, -16, { strength: .32 });
}

function wakeChime() {
  if (!audioCtx) return;
  const start = audioCtx.currentTime;
  putGain(alarmGain.gain, 1);
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const time = start + index * .7;
    const level = -18 + index * 3;
    chimeNote(frequency, time, 2.2, level, { wake: true, strength: .8 });
    chimeNote(frequency, time, 2.2, level, { wake: true, type: "triangle", strength: .2 });
  });
}

function beginWake() {
  state.wake = "fading";
  state.timer = null;
  if (!musicGain) {
    decks.forEach(({ el }) => el.pause());
    state.isPlaying = false;
  }
  fadeSession(5);
  wakeTimer = setTimeout(() => {
    pausePlayback({ holdTimer: false, render: false });
    state.wake = "ringing";
    wakeChime();
    wakeTimer = setTimeout(wakeChime, 6000);
    changed();
  }, 5000);
  changed();
}

function dismissWake(render = true) {
  if (!state.wake) return;
  clearTimeout(wakeTimer);
  if (state.wake === "fading") pausePlayback({ holdTimer: false, render: false });
  else if (alarmGain) {
    rampParam(alarmGain.gain, 0, .08);
    for (const voice of alarmVoices) voice.stop(audioCtx.currentTime + .09);
  }
  state.wake = null;
  if (render) completeSession();
}

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function focusStreak() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return [dayKey(), dayKey(yesterday)].includes(state.focusDays.day) ? state.focusDays.count : 0;
}

function completeSession() {
  if (state.activity?.mode === "focus" && state.focusDays.day !== dayKey()) {
    state.focusDays = { day: dayKey(), count: focusStreak() + 1 };
    savePrefs();
  }
  state.completedUntil = Date.now() + 3200;
  changed("complete");
}

function enterBreak(timer) {
  timer.phase = "break";
  timer.total = timer.remaining = timer.breakMs;
  timer.deadline = Date.now() + timer.breakMs;
  intervalChime();
  if (musicGain) rampParam(musicGain.gain, .25, .6);
  else {
    cancelStart();
    collapseFade();
    decks.forEach(({ el }) => el.pause());
    state.isPlaying = false;
  }
  changed();
}

function endBreak(timer) {
  const running = Boolean(timer.deadline);
  timer.round++;
  timer.phase = "work";
  timer.total = timer.remaining = timer.workMs;
  timer.deadline = running && state.isPlaying ? Date.now() + timer.workMs : 0;
  if (running) {
    intervalChime();
    if (state.isPlaying) rampParam(musicGain.gain, 1, 1.5);
    else playSelection({ queue: state.queue, index: state.currentIdx, resume: true, restoreBreak: Boolean(musicGain) });
  } else resetSessionGain();
  changed();
}

function skipBreak() {
  if (state.timer?.phase === "break") endBreak(state.timer);
}

function checkDeadline() {
  const timer = state.timer;
  if (!timer?.deadline) return;
  const timeLeft = timer.deadline - Date.now();
  if (timeLeft <= 0) {
    if (timer.phase === "break") endBreak(timer);
    else if (timer.intervals && timer.round < 4) enterBreak(timer);
    else if (state.activity?.gentleEnd && !timer.intervals) beginWake();
    else {
      stopSession();
      if (timer.intervals) intervalChime();
      completeSession();
    }
  } else if ((!timer.intervals || (timer.round === 4 && timer.phase === "work")) &&
      !state.activity?.gentleEnd && !timer.fading && timeLeft <= Math.min(1500, timer.total / 2)) {
    timer.fading = true;
    fadeSession(timeLeft / 1000);
  }
  changed("clock");
}

setInterval(checkDeadline, 125);
document.addEventListener("visibilitychange", () => {
  checkDeadline();
  if (!document.hidden && audioCtx?.state === "suspended" && state.isPlaying) audioCtx.resume().catch(() => {});
});
