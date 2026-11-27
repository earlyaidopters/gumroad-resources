const views = { start: $("startView"), activities: $("activityView"), library: $("libraryView"), player: $("playerView") };
const headings = { start: $("startTitle"), activities: $("activityHeading"), library: $("libraryHeading"), player: $("playerTitle") };
const scrollPositions = {};
let view = "start", returnView = "start", selectedMode = null, pendingActivity = null;
let blueprint = BLUEPRINTS[0], scene = "scene", zen = false, remoteVisible = false, windowVisible = true;
let lastStageKey, lastMiniKey, heroArt, playerBackdrop, environmentArt;
let toastTimeout, hoveredMode, focusedMode, portalFlight, bloomFrame = null;
let zenIdle, dimmed = false;
const DIM_EVENTS = ["pointerdown", "touchstart", "keydown"];
let renderedTrack = null, renderedPlaying = null;
const libraryOrder = new Map();
const connections = window.desktopConnections || null;
const autoplayBridge = window.desktopAutoplay || null;
let autoplayState = null;
let calendarState = { ok: true, configured: false, connected: false, state: "CHECKING" };
let calendarBusy = null;
let calendarAdded = null;
let calendarFeedback = "";
let calendarFeedbackTimer = null;
let calendarConnectTimer = null;
const preferredMode = () => {
  const previous = MODE_BY_KEY.get(ACTIVITY_BY_KEY.get(state.lastActivity)?.mode);
  if (previous) return previous;
  const hour = new Date().getHours();
  return MODES[hour >= 6 && hour < 17 ? 0 : hour >= 17 && hour < 21 ? 1 : 2];
};

function setPalette(mode) {
  const { hue, secondary, tint } = mode || preferredMode();
  const root = document.documentElement.style;
  root.setProperty("--c1", hue);
  root.setProperty("--c2", secondary);
  root.setProperty("--mode-tint", tint);
}

const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

function artSlot(className = "") {
  const slot = document.createElement("span");
  slot.className = `art-slot ${className}`;
  slot.setAttribute("aria-hidden", "true");
  slot.innerHTML = '<img alt="">';
  return slot;
}

function focusHeading() {
  headings[view].focus({ preventScroll: true });
}

function showView(next, { focus = true, restoreScroll = false } = {}) {
  if (zen && next !== "player") setZen(false);
  if (next !== "player") {
    stopPortalFlight();
    setDim(false);
  }
  if (next !== "activities") document.querySelectorAll(".mode-morph").forEach((item) => item.remove());
  if (next !== "player") document.querySelectorAll(".flight-sibling").forEach((item) => item.remove());
  if (next === view) {
    if (focus) focusHeading();
    return;
  }
  scrollPositions[view] = scrollY;
  if (next === "player") {
    returnView = view;
    document.body.classList.add("player-open");
  } else document.body.classList.remove("player-open");
  motion.clearPreviews();
  hoveredMode = focusedMode = null;
  views[view].hidden = true;
  view = next;
  views[view].hidden = false;
  document.querySelectorAll("[data-view]").forEach((button) => {
    if (button.dataset.view === (view === "activities" ? "start" : view)) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  renderTransport();
  scrollTo(0, restoreScroll ? scrollPositions[view] || 0 : 0);
  if (focus) focusHeading();
  syncArt();
}

function setEnvironment(mode) {
  const wrap = $("activityEnvironment");
  wrap.querySelector(".outgoing-art")?.remove();
  if (environmentArt) {
    if (!prefersReducedMotion && view === "activities") {
      const outgoing = artSlot("outgoing-art");
      motion.setArt(outgoing, artForMode(selectedMode));
      wrap.append(outgoing);
      outgoing.addEventListener("animationend", () => outgoing.remove(), { once: true });
    }
    environmentArt.remove();
  }
  environmentArt = artSlot("environment-art");
  motion.setArt(environmentArt, artForMode(mode.key));
  wrap.prepend(environmentArt);
}

function chooseMode(key) {
  const mode = MODE_BY_KEY.get(key);
  if (!mode) return;
  if (selectedMode === key && view === "activities") return;
  const entering = view !== "activities";
  const modeSources = entering && !prefersReducedMotion ? [...$("modeGrid").children].map((button) => ({
    key: button.dataset.mode, rect: button.getBoundingClientRect(),
  })) : [];
  motion.clearPreviews();
  setEnvironment(mode);
  selectedMode = key;
  $("modeStrip").querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.switchMode === key));
  });
  $("activityHeading").textContent = mode.name;
  $("activityFeel").textContent = mode.feel;
  const tiles = ACTIVITIES.filter((activity) => activity.mode === key).map((activity, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "activity-card";
    button.dataset.activity = activity.key;
    button.dataset.reveal = "";
    button.style.setProperty("--i", index);
    button.style.setProperty("--art-hue", mode.hue);
    const art = artSlot("activity-art");
    motion.setArt(art, artForActivity(activity));
    button.innerHTML = `<span class="duration-badge">${activity.minutes ? activity.minutes + "m" : "∞"}</span>
      <span class="activity-label"><strong>${activity.name}</strong><small>${activity.feel}</small></span>
      <span class="row-play" aria-hidden="true">${icon("play")}</span>`;
    if (!activity.minutes) button.querySelector(".duration-badge").innerHTML =
      '<span aria-hidden="true">∞</span><span class="sr-only">Continuous</span>';
    button.prepend(art);
    motion.bindTile(button, art);
    button.addEventListener("click", () => launchActivity(activity.key, art));
    return button;
  });
  if (key === "meditate") {
    const tip = document.createElement("aside");
    tip.className = "reset-tip";
    tip.innerHTML = '<strong>Quick session</strong><p>Breathwork opens the guided breath pacer automatically.</p><button type="button" class="pill">5 min quick reset</button>';
    tip.querySelector("button").addEventListener("click", () => launchActivity("breathwork", null, 5));
    tiles.push(tip);
  }
  $("activityGrid").replaceChildren(...tiles);
  markActivity();
  showView("activities", { focus: entering });
  if (modeSources.length) morphModes(modeSources);
  syncArt();
}

function morphModes(sources) {
  const timing = { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" };
  $("modeStrip").animate([{ opacity: 0 }, { opacity: 1 }], timing);
  for (const { key, rect } of sources) {
    const pill = $("modeStrip").querySelector(`[data-switch-mode="${key}"]`);
    const target = pill.getBoundingClientRect();
    const echo = artSlot("mode-morph");
    motion.setArt(echo, artForMode(key));
    const frame = ({ x, y, width, height }) => ({
      left: x + "px", top: y + "px", width: width + "px", height: height + "px",
    });
    document.body.append(echo);
    echo.animate([
      { ...frame(rect), borderRadius: "20px", opacity: .78 },
      { ...frame(target), borderRadius: "999px", opacity: 0 },
    ], { ...timing, fill: "both" }).finished.then(() => echo.remove(), () => echo.remove());
  }
}

function renderModes() {
  $("modeStrip").replaceChildren(...MODES.map((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.dataset.switchMode = mode.key;
    button.textContent = mode.name;
    button.addEventListener("click", () => chooseMode(mode.key));
    return button;
  }));
  $("modeGrid").replaceChildren(...MODES.map((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mode-card";
    button.dataset.mode = mode.key;
    button.style.setProperty("--art-hue", mode.hue);
    button.innerHTML = `<strong>${mode.name}</strong><span class="feel">${mode.feel}</span>
      <svg class="card-arrow" aria-hidden="true"><use href="#i-right"/></svg>`;
    const art = artSlot();
    motion.setArt(art, artForMode(mode.key));
    button.prepend(art);
    button.addEventListener("pointerenter", (event) => {
      if (view !== "start" || event.pointerType === "touch") return;
      hoveredMode = mode;
      syncArt();
    });
    button.addEventListener("pointerleave", () => {
      if (hoveredMode !== mode) return;
      hoveredMode = null;
      syncArt();
    });
    button.addEventListener("focus", () => {
      if (view !== "start" || !button.matches(":focus-visible")) return;
      focusedMode = mode;
      syncArt();
    });
    button.addEventListener("blur", () => {
      if (focusedMode !== mode) return;
      focusedMode = null;
      syncArt();
    });
    button.addEventListener("click", () => chooseMode(mode.key));
    return button;
  }));
}

function markActivity() {
  document.querySelectorAll("[data-activity]").forEach((button) => {
    const live = button.dataset.activity === state.activity?.key;
    const label = button.querySelector("strong");
    const dot = label.querySelector(".live-dot");
    if (live && !dot) {
      label.insertAdjacentHTML("beforeend", '<span class="live-dot" aria-hidden="true"></span>');
      button.setAttribute("aria-current", "true");
    } else if (!live && dot) {
      dot.remove();
      button.removeAttribute("aria-current");
    }
  });
}

function stopPortalFlight() {
  portalFlight?.cancel();
  portalFlight = null;
  $("heroScene").classList.remove("in-flight");
  $("playerControls").classList.remove("reveal-controls");
}

function flyToPortal(art, source, siblings) {
  if (prefersReducedMotion) {
    $("heroScene").animate([{ opacity: 0 }, { opacity: 1 }], 120);
    return;
  }
  const target = $("heroScene").getBoundingClientRect();
  if (!source?.width || !target.width) return;
  const scale = source.width / target.width;
  const clone = artSlot("portal-flight");
  motion.setArt(clone, art);
  Object.assign(clone.style, {
    top: target.y + "px", left: target.x + "px",
    width: target.width + "px", height: target.height + "px",
  });
  document.body.append(clone);
  siblings.forEach(({ rect, activity }) => {
    const echo = artSlot("flight-sibling");
    motion.setArt(echo, artForActivity(activity));
    Object.assign(echo.style, {
      top: rect.y + "px", left: rect.x + "px", width: rect.width + "px", height: rect.height + "px",
    });
    document.body.append(echo);
    echo.animate([{ opacity: .8 }, { opacity: 0, transform: "translateY(10px)" }], {
      duration: 160, easing: "ease-in", fill: "both",
    }).finished.then(() => echo.remove(), () => echo.remove());
  });
  $("heroScene").classList.add("in-flight");
  $("playerControls").classList.add("reveal-controls");
  const animation = clone.animate([
    { transform: `translate(${source.x - target.x}px, ${source.y - target.y}px) scale(${scale})`, borderRadius: `${18 / scale}px` },
    { transform: "none", borderRadius: getComputedStyle($("heroScene")).borderRadius },
  ], { delay: 16, duration: 340, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
  portalFlight = animation;
  const finish = () => {
    clone.remove();
    if (portalFlight === animation) {
      portalFlight = null;
      $("heroScene").classList.remove("in-flight");
    }
  };
  animation.finished.then(finish, finish);
}

let launchGeneration = 0;
function launchActivity(key, sourceArt, minutes) {
  const activity = ACTIVITY_BY_KEY.get(key);
  if (!activity) return;
  const generation = ++launchGeneration;
  pendingActivity = activity;
  const result = startActivity(key, minutes);
  stopPortalFlight();
  const source = sourceArt?.getBoundingClientRect();
  const siblings = source && !prefersReducedMotion ? [...$("activityGrid").querySelectorAll(".activity-card")].flatMap((card) => {
    if (card.contains(sourceArt)) return [];
    const rect = card.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < innerHeight ? [{ rect, activity: ACTIVITY_BY_KEY.get(card.dataset.activity) }] : [];
  }) : [];
  pickScene("scene");
  showView("player");
  syncArt();
  if (source) flyToPortal(artForActivity(activity), source, siblings);
  renderTransport();
  return result?.finally(() => {
    if (launchGeneration !== generation) return;
    pendingActivity = null;
    renderTransport();
    syncArt();
  });
}

function syncArt() {
  const activity = pendingActivity || state.activity;
  const track = getCurrentTrack();
  const liveMode = MODE_BY_KEY.get(activity?.mode || track?.category) || preferredMode();
  const browserMode = MODE_BY_KEY.get(selectedMode);
  const startMode = hoveredMode || focusedMode || preferredMode();
  setPalette(view === "activities" ? browserMode : view === "start" ? startMode : liveMode);
  const key = activity?.key || track?.slug || `mode:${liveMode.key}`;
  if (lastStageKey !== key) {
    const backdrop = artForMode(liveMode.key);
    const empty = !activity && !track;
    heroArt.classList.toggle("mode-poster", empty);
    motion.setArt(heroArt, activity ? artForActivity(activity) : track ? artForTrack(track) : { ...backdrop, loop: "" });
    motion.setArt(playerBackdrop, backdrop);
    $("heroVisual").style.setProperty("--zen-art", backdrop.poster ? `url("${backdrop.poster}")` : "linear-gradient(#080d17, #101a2b)");
    $("heroVisual").style.setProperty("--zen-focal", backdrop.focal || "center");
    lastStageKey = key;
  }
  const miniKey = state.activity?.key || track?.slug || "-";
  if (lastMiniKey !== miniKey) {
    motion.setArt($("miniArt"), state.activity ? artForActivity(state.activity) : artForTrack(track));
    lastMiniKey = miniKey;
  }
  $("heroScene").hidden = scene !== "scene";
  canvas.hidden = scene !== "signal";
  $("signalTools").hidden = scene !== "signal" || zen;
  const playingSlot = view === "start" ? $("modeGrid").querySelector(`[data-mode="${startMode.key}"] .art-slot`)
    : view === "activities" ? environmentArt : view === "player" && scene === "scene" ? heroArt : null;
  motion.selectStage(playingSlot, view === "start");
  if (windowVisible && !remoteVisible) syncVisualizer();
  syncBloom();
}

const bloomSamples = new Float32Array(1024);
let bloomLevel = 0;
function bloomVisible() {
  return view === "player" && scene === "scene" && state.isPlaying && analyser &&
    windowVisible && !remoteVisible && !document.hidden && !prefersReducedMotion;
}

function drawBloom() {
  analyser.getFloatTimeDomainData(bloomSamples);
  let squared = 0;
  for (const sample of bloomSamples) squared += sample * sample;
  const rms = Math.min(1, Math.sqrt(squared / bloomSamples.length) * 3.2);
  bloomLevel += (rms - bloomLevel) * .12;
  $("heroScene").style.setProperty("--rms", bloomLevel.toFixed(3));
  bloomFrame = requestAnimationFrame(drawBloom);
}

function syncBloom() {
  if (bloomVisible()) {
    if (bloomFrame === null) bloomFrame = requestAnimationFrame(drawBloom);
  } else {
    if (bloomFrame !== null) cancelAnimationFrame(bloomFrame);
    bloomFrame = null;
    bloomLevel = 0;
    $("heroScene").style.removeProperty("--rms");
  }
}

function pickScene(chosen) {
  scene = chosen;
  $("playerStage").classList.toggle("signal-on", scene === "signal");
  document.querySelectorAll("[data-scene]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.scene === scene)));
  syncArt();
}

function pickSignal(style) {
  state.vizMode = style;
  document.querySelectorAll("[data-signal]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.signal === style)));
  pickScene("signal");
  savePrefs();
}

function wakeZenChrome() {
  document.body.classList.remove("zen-idle");
  clearTimeout(zenIdle);
  if (zen) zenIdle = setTimeout(() => document.body.classList.add("zen-idle"), 4000);
}

function setDim(on) {
  if (on === dimmed) return;
  dimmed = on;
  document.body.classList.toggle("dimmed", on);
  $("dimScreen").setAttribute("aria-pressed", String(on));
  $("dimScreen").textContent = on ? "Wake screen" : "Dim screen";
}

function setZen(on) {
  if (on === zen) return;
  if (on) showView("player");
  zen = on;
  wakeZenChrome();
  document.body.classList.toggle("zen", on);
  $("exitZen").hidden = !on;
  $("enterZen").hidden = on;
  if (on) {
    $("exitZen").focus();
    if (document.fullscreenEnabled) $("heroVisual").requestFullscreen().catch(() => {});
  } else {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $("enterZen").focus({ preventScroll: true });
  }
  syncArt();
}

function renderClock() {
  const { timerKind, timerTotal, timerRemain, intervalPhase, intervalRound } = getTimerState();
  const time = timerTotal ? fmtTime(timerRemain) : "";
  const onBreak = intervalPhase === "break";
  $("playerClock").classList.toggle("on-break", onBreak);
  $("clockValue").textContent = state.wake ? state.wake === "fading" ? "Waking up" : "Time to wake" : onBreak ? `Break · ${time.replace(/^0/, "")}` : time || "Continuous";
  $("clockNote").textContent = intervalPhase ? `${onBreak ? "Round" : "Focus · round"} ${intervalRound} of 4` : time && !state.wake ? "remaining" : "";
  $("skipBreak").hidden = !onBreak;
  $("dismissWake").hidden = !state.wake;
  $("miniClock").textContent = time && `${time} left`;
  document.querySelectorAll(".timer-chip").forEach((button) => {
    button.querySelector("span").textContent = timerKind;
    button.setAttribute("aria-label", `Session timer: ${timerKind}${time ? ", " + time + " remaining" : ""}`);
  });
  renderCalendar();
}

function formatClockTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function calendarSessionKey() {
  return `${state.activity?.key || state.sessionName || ""}:${state.timer?.total || 0}:${state.timer?.round || 1}`;
}

function calendarStatusLabel(status) {
  if (!status || status.state === "CHECKING") return "Checking...";
  if (status.ok === false) return "Unavailable";
  if (status.configured === false || status.state === "NOT_CONFIGURED") return "Not configured";
  if (status.connected || status.state === "ACTIVE") return "Connected";
  if (status.state === "EXPIRED") return "Expired";
  if (status.state === "REVOKED") return "Revoked";
  if (status.state === "INITIATED" || status.state === "INITIALIZING") return "Connecting...";
  return "Not connected";
}

function showCalendarFeedback(message) {
  clearTimeout(calendarFeedbackTimer);
  calendarFeedback = message || "";
  renderFeedback();
  if (calendarFeedback) {
    calendarFeedbackTimer = setTimeout(() => {
      calendarFeedback = "";
      renderFeedback();
    }, 5000);
  }
}

function renderCalendar() {
  const pill = $("calendarBtn");
  const section = $("connectionsSection");
  renderAutoplay();
  if (!connections) {
    pill.hidden = true;
    section.hidden = true;
    return;
  }

  section.hidden = false;
  const statusEl = $("calendarStatusText");
  const noteEl = $("calendarStatusNote");
  const connectBtn = $("calendarConnectBtn");

  const connecting = calendarBusy === "connecting";
  const statusText = connecting ? "Waiting for browser sign-in..." : calendarStatusLabel(calendarState);
  statusEl.textContent = statusText;
  statusEl.classList.toggle("is-connected", Boolean(!connecting && calendarState.connected));
  statusEl.classList.toggle("is-warning", Boolean(!connecting && (calendarState.ok === false || calendarState.state === "EXPIRED" || calendarState.state === "REVOKED")));

  if (calendarState.ok === false && calendarState.message) {
    noteEl.textContent = calendarState.message;
  } else if (calendarState.configured === false || calendarState.state === "NOT_CONFIGURED") {
    noteEl.textContent = "Add ~/.config/dreamlight/composio.json to connect. Requires an internet connection.";
  } else if (connecting) {
    noteEl.textContent = "Finish signing in to Google Calendar in your browser. Dreamlight checks automatically.";
  } else if (calendarState.connected) {
    noteEl.textContent = "Focus blocks sync over the internet through Composio.";
  } else {
    noteEl.textContent = "Requires an internet connection through Composio.";
  }

  connectBtn.textContent = connecting ? "Connecting..." : calendarState.connected ? "Reconnect" : "Connect";
  connectBtn.disabled = connecting;

  const { timerTotal, timerRemain, timerRunning, intervalPhase } = getTimerState();
  const countdownRunning = timerTotal > 0 && timerRemain > 0 && timerRunning && intervalPhase !== "break" && !state.wake;
  const sessionKey = calendarSessionKey();
  if (calendarAdded && calendarAdded.sessionKey !== sessionKey) calendarAdded = null;

  const showPill = Boolean(countdownRunning && calendarState.configured !== false && calendarState.state !== "CHECKING");
  pill.hidden = !showPill;
  if (!showPill) return;

  const labelEl = pill.querySelector("span");
  pill.classList.toggle("calendar-added", Boolean(calendarAdded && calendarBusy !== "adding"));
  if (calendarBusy === "adding") {
    labelEl.textContent = "Adding...";
    pill.disabled = true;
  } else if (calendarAdded) {
    labelEl.textContent = calendarAdded.label;
    pill.disabled = true;
  } else if (connecting) {
    labelEl.textContent = "Connecting...";
    pill.disabled = true;
  } else if (calendarState.connected) {
    labelEl.textContent = "Add to calendar";
    pill.disabled = false;
  } else {
    labelEl.textContent = "Connect Google Calendar";
    pill.disabled = false;
  }
}

function applyCalendarStatus(next) {
  if (!next || typeof next !== "object") return;
  calendarState = next;
  if (next.connected && calendarBusy === "connecting") {
    clearTimeout(calendarConnectTimer);
    calendarBusy = null;
  }
  renderCalendar();
}

async function refreshCalendarStatus() {
  if (!connections) return null;
  try {
    const next = await connections.status();
    applyCalendarStatus(next);
    return next;
  } catch {
    const fallback = { ok: false, configured: true, connected: false, state: "UNAVAILABLE", message: "Could not check Google Calendar status." };
    applyCalendarStatus(fallback);
    return fallback;
  }
}

async function startCalendarConnect() {
  if (!connections || calendarBusy) return null;
  calendarBusy = "connecting";
  renderCalendar();
  try {
    const result = await connections.connect();
    if (!result?.ok) {
      calendarBusy = null;
      if (result?.code === "NOT_CONFIGURED") {
        calendarState = { ok: true, configured: false, connected: false, state: "NOT_CONFIGURED" };
      } else {
        calendarState = { ...calendarState, ok: false, message: result?.message || "Could not start Google Calendar sign-in." };
      }
      showCalendarFeedback(result?.message || "Could not start Google Calendar sign-in.");
      renderCalendar();
      return result;
    }
    clearTimeout(calendarConnectTimer);
    calendarConnectTimer = setTimeout(() => {
      if (calendarBusy === "connecting") {
        calendarBusy = null;
        refreshCalendarStatus();
      }
    }, 2 * 60 * 1000);
    return result;
  } catch {
    calendarBusy = null;
    showCalendarFeedback("Could not start Google Calendar sign-in.");
    renderCalendar();
    return { ok: false, code: "CONNECT_ERROR", message: "Could not start Google Calendar sign-in." };
  }
}

async function handleCalendarPillClick() {
  if (!connections || calendarBusy || calendarAdded) return null;
  if (!calendarState.connected) return startCalendarConnect();
  const { timerTotal, timerRemain, timerRunning, intervalPhase } = getTimerState();
  if (!(timerTotal > 0 && timerRemain > 0 && timerRunning && intervalPhase !== "break" && !state.wake)) return null;

  const start = new Date();
  const remainingMinutes = Math.max(1, Math.ceil(timerRemain / 60));
  const end = new Date(start.getTime() + remainingMinutes * 60000);
  const activityName = state.activity?.name || state.sessionName || "Session";
  const sessionKey = calendarSessionKey();

  calendarBusy = "adding";
  renderCalendar();
  try {
    const result = await connections.addFocusBlock({
      summary: `Focus · ${activityName}`,
      start: start.toISOString(),
      end: end.toISOString(),
      description: "Dreamlight session",
    });
    calendarBusy = null;
    if (result?.ok) {
      calendarAdded = {
        sessionKey,
        label: `Added to Google Calendar · ${formatClockTime(start)} to ${formatClockTime(end)}`,
      };
      renderCalendar();
      return result;
    }
    if (result?.code === "NOT_CONNECTED") {
      calendarState = { ok: true, configured: true, connected: false, state: result.state || "EXPIRED" };
    }
    showCalendarFeedback(result?.message || "Could not add session to Google Calendar.");
    renderCalendar();
    return result;
  } catch {
    calendarBusy = null;
    showCalendarFeedback("Could not add session to Google Calendar.");
    renderCalendar();
    return { ok: false, code: "ADD_ERROR", message: "Could not add session to Google Calendar." };
  }
}

function renderPosition() {
  const { cur, dur } = currentPosition();
  const seek = $("seek");
  seek.disabled = !getCurrentTrack() || !activeAudio().readyState;
  seek.max = dur || 3600;
  if (!seek.matches(":active")) seek.value = cur;
  seek.style.setProperty("--position", `${dur ? Math.min(100, cur / dur * 100) : 0}%`);
  seek.setAttribute("aria-valuetext", fmtTime(cur) + " of " + fmtTime(dur));
  $("elapsed").textContent = fmtTime(cur);
  $("duration").textContent = fmtTime(dur);
}

function renderTransport() {
  const track = getCurrentTrack();
  const activity = state.activity || (!track ? pendingActivity : null);
  const title = activity?.name || track?.title || "Choose an activity";
  const subtitle = activity ? track?.title || "" : track ? state.sessionName : "";
  $("playerTitle").textContent = title;
  $("playerMode").textContent = MODE_BY_KEY.get(activity?.mode || track?.category)?.name || "Now playing";
  $("currentTrack").textContent = subtitle;
  $("miniTitle").textContent = title;
  $("miniTrack").textContent = subtitle || "Dreamlight";
  const playing = playbackRunning();
  const showBar = state.hasStarted && view !== "player";
  $("transport").hidden = !showBar;
  document.body.classList.toggle("has-started", showBar);
  $("dimScreen").hidden = state.activity?.key !== "deep_sleep" || !playing;
  if ($("dimScreen").hidden) setDim(false);
  const streak = focusStreak();
  $("focusStreak").hidden = !streak;
  $("focusStreak").textContent = `${streak}-day focus streak`;
  document.querySelectorAll('[data-transport="toggle"]').forEach((button) => {
    const label = playing ? "Pause" : state.starting ? "Cancel start" : "Play";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.querySelector("use").setAttribute("href", playing || state.starting ? "#i-pause" : "#i-play");
  });
  document.querySelectorAll(".stop-button").forEach((button) => { button.hidden = state.activity?.key !== "deep_sleep"; });
  document.querySelectorAll('[data-transport="previous"], [data-transport="next"]').forEach((button) => { button.disabled = !track; });
  const resume = ACTIVITY_BY_KEY.get(state.lastActivity);
  $("resumeBtn").hidden = !resume || playing;
  if (resume) $("resumeBtn").querySelector("span").textContent = `Resume ${resume.name}`;
  $("breathBtn").setAttribute("aria-pressed", String(state.breathOn));
  $("breathBtn").setAttribute("aria-label", state.breathOn ? "Turn breath pacer off" : "Turn breath pacer on");
  $("breathGuide").hidden = !state.breathOn;
  renderClock();
  renderPosition();
  renderFeedback();
  markActivity();
  syncBloom();
}

function renderFeedback() {
  const text = state.failure?.label || (state.starting ? "Starting…" : state.completedUntil > Date.now() ? "Session complete" : calendarFeedback);
  if ($("feedbackText").textContent !== text) $("feedbackText").textContent = text;
  $("retryBtn").hidden = !state.failure;
}

function announceComplete() {
  clearTimeout(toastTimeout);
  renderTransport();
  toastTimeout = setTimeout(() => {
    if ($("feedbackText").textContent === "Session complete") $("feedbackText").textContent = "";
  }, 3200);
}

function showTrack() {
  const track = getCurrentTrack();
  $("details").hidden = !track;
  if (!track) return;
  setVisualTrack(track);
  $("description").textContent = track.description;
  const carrier = track.binauralL != null && track.binauralR != null
    ? `Left ${track.binauralL} Hz · Right ${track.binauralR} Hz` : track.binaural;
  $("telemetry").replaceChildren(...[
    ["Frequency", track.band], ["Carriers", carrier], ["Tempo", `${track.bpm} BPM`], ["Key", track.key],
    ["Signal", getTrackVisual(track).archetype.replaceAll("_", " ")],
    ["Breath cadence", getTrackVisual(track).breathLabel],
  ].map(([label, value]) => {
    const group = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    group.append(term, description);
    return group;
  }));
}

function toggleBreath() {
  setBreath(!state.breathOn);
  if (state.breathOn) showView("player");
  renderTransport();
}

setInterval(() => {
  if (!state.breathOn || view !== "player" || document.hidden || remoteVisible || !windowVisible) return;
  const { phase, remaining, expansion } = breathStep(performance.now(), getTrackVisual(getCurrentTrack()));
  $("breathPhase").textContent = phase[0] + phase.slice(1).toLowerCase();
  $("breathCount").textContent = `${Math.ceil(remaining)}s`;
  $("breathGuide").style.setProperty("--breath-size", prefersReducedMotion ? 1 : 0.72 + expansion * 0.58);
}, 80);

function blueprintTracks() {
  return tracksFor(libraryOrder.get(blueprint.key) || blueprint.slugs);
}

function libraryTracks() {
  const search = $("search").value.trim().toLowerCase();
  const mode = $("modeFilter").value, mood = $("moodFilter").value, band = $("bandFilter").value;
  return blueprintTracks().filter((track) =>
    (!mode || ACTIVITIES.some((activity) => activity.mode === mode && activity.queue.includes(track.slug))) && (!mood || track.mood === mood) &&
    (!band || bandFamily(track) === band) &&
    (!search || `${track.title} ${track.subtitle} ${track.description} ${track.band}`.toLowerCase().includes(search)));
}

function bandFamily(track) {
  return track.band.replace(/^[\d.]+\s*Hz\s*/i, "");
}

function optionList(id, values) {
  const select = $(id);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = MODE_BY_KEY.get(value)?.name || value.replace(/^[a-z]/, (letter) => letter.toUpperCase());
    select.append(option);
  });
}

function startLibrary(queue, index, title) {
  const track = queue[index];
  if (!track) return;
  playSelection({ queue, index, session: title });
  showView("player");
}

function renderBlueprints() {
  $("blueprints").replaceChildren(...BLUEPRINTS.map((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "blueprint";
    card.setAttribute("aria-pressed", String(blueprint === item));
    card.innerHTML = `<img alt="" src="${item.cover}"><span><b>${item.name}</b><small>${item.meta}</small></span>`;
    card.addEventListener("click", () => {
      blueprint = item;
      $("blueprints").querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button === card)));
      renderLibrary();
    });
    return card;
  }));
}

function reorderLibrary(from, to) {
  if (!from || from === to) return;
  const order = blueprintTracks().map((track) => track.slug);
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return;
  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, from);
  libraryOrder.set(blueprint.key, order);
  renderLibrary();
  $("trackRows").querySelector(`[data-slug="${from}"] .track-play`).focus({ preventScroll: true });
}

function renderLibrary() {
  let dragged = null;
  const tracks = libraryTracks();
  $("trackHeading").textContent = blueprint.name;
  $("trackCount").textContent = `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`;
  $("playBlueprint").hidden = blueprint.key === "all";
  $("noTracks").hidden = Boolean(tracks.length);
  $("trackRows").replaceChildren(...tracks.map((track, index) => {
    const row = document.createElement("tr");
    row.dataset.slug = track.slug;
    row.draggable = true;
    row.innerHTML = `<td><button type="button" class="track-play" aria-label="Play ${track.title}">
      <img src="${track.cover}" alt="" loading="lazy"><span><strong>${track.title}</strong><small>${track.subtitle}</small></span>
      <span class="track-marker" hidden>${icon("signal")} <span class="sr-only"></span></span></button></td>
      <td class="track-band">${track.band}</td><td class="track-length">${Math.round(track.duration / 60)} min</td>
      <td class="track-action"><button type="button" class="pill" aria-label="Add ${track.title} next">Add next</button></td>`;
    row.querySelector(".track-play").addEventListener("click", () => startLibrary(tracks, index, blueprint.name === "All Sessions" ? "Library" : blueprint.name));
    row.addEventListener("dragstart", (event) => {
      dragged = track.slug;
      event.dataTransfer.setData("text/plain", dragged);
      event.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragover", (event) => {
      if (dragged && dragged !== track.slug) {
        event.preventDefault();
        row.classList.add("queue-target");
      }
    });
    row.addEventListener("dragleave", () => row.classList.remove("queue-target"));
    row.addEventListener("dragend", () => {
      dragged = null;
      $("trackRows").querySelectorAll(".queue-target").forEach((target) => target.classList.remove("queue-target"));
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      reorderLibrary(dragged, track.slug);
    });
    row.addEventListener("keydown", (event) => {
      if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      const target = tracks[index + (event.key === "ArrowUp" ? -1 : 1)];
      if (target) {
        event.preventDefault();
        reorderLibrary(track.slug, target.slug);
      }
    });
    row.querySelector(".track-action button").addEventListener("click", (event) => {
      addNext(track);
      const button = event.currentTarget;
      button.textContent = "Added";
      setTimeout(() => { button.textContent = "Add next"; }, 1100);
    });
    return row;
  }));
  markLibrary();
}

function markLibrary() {
  const slug = getCurrentTrack()?.slug;
  $("trackRows").querySelectorAll("tr").forEach((row) => {
    const current = row.dataset.slug === slug;
    if (current) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
    const marker = row.querySelector(".track-marker");
    marker.hidden = !current;
    marker.querySelector(".sr-only").textContent = state.isPlaying ? "Playing now" : "Current track, paused";
    marker.title = state.isPlaying ? "Playing now" : "Current track, paused";
  });
}

function addNext(track) {
  if (!state.queue.length) {
    state.queue = [track];
    state.sessionName = "Library";
    showTrack();
    renderTransport();
    syncArt();
  } else {
    const insert = state.currentIdx + 1;
    state.queue = [...state.queue.slice(0, insert), track, ...state.queue.slice(insert)];
  }
  renderQueue();
}

function moveQueue(from, to, restoreFocus) {
  if (to < 0 || to >= state.queue.length || from === to) return;
  const current = state.currentIdx;
  const entries = state.queue.map((track, index) => ({ track, current: index === current }));
  entries.splice(to, 0, entries.splice(from, 1)[0]);
  state.queue = entries.map(({ track }) => track);
  state.currentIdx = entries.findIndex((entry) => entry.current);
  renderQueue();
  if (restoreFocus) {
    const target = $("queueList").children[to];
    const preferred = target.querySelector(restoreFocus);
    (preferred.disabled ? target.querySelector("button:not(:disabled)") : preferred)?.focus();
  }
}

function renderQueue() {
  let dragging = null;
  $("emptyQueue").hidden = Boolean(state.queue.length);
  $("queueList").replaceChildren(...state.queue.map((track, index) => {
    const item = document.createElement("li");
    item.draggable = true;
    if (index === state.currentIdx) item.setAttribute("aria-current", "true");
    item.innerHTML = `<div class="queue-item"><span>${track.title}</span>
      <span><button type="button" class="icon-btn up" aria-label="Move ${track.title} up">${icon("up")}</button>
      <button type="button" class="icon-btn down" aria-label="Move ${track.title} down">${icon("up")}</button></span></div>`;
    item.querySelector(".up").disabled = index === 0;
    item.querySelector(".down").disabled = index === state.queue.length - 1;
    item.querySelector(".up").addEventListener("click", () => moveQueue(index, index - 1, ".up"));
    item.querySelector(".down").addEventListener("click", () => moveQueue(index, index + 1, ".down"));
    item.addEventListener("dragstart", (event) => { dragging = index; event.dataTransfer.setData("text/plain", track.title); });
    item.addEventListener("dragover", (event) => { if (dragging !== null) { event.preventDefault(); item.classList.add("queue-target"); } });
    item.addEventListener("dragleave", () => item.classList.remove("queue-target"));
    item.addEventListener("dragend", () => { dragging = null; $("queueList").querySelectorAll(".queue-target").forEach((node) => node.classList.remove("queue-target")); });
    item.addEventListener("drop", (event) => { event.preventDefault(); if (dragging !== null) moveQueue(dragging, index); });
    return item;
  }));
}

const modalReturns = new WeakMap();
function openDialog(id, origin = document.activeElement) {
  const dialog = $(id);
  if (dialog.open) return;
  if (id === "queueDialog") renderQueue();
  if (id === "timerDialog") syncTimerOptions();
  if (id === "mixerDialog") syncMixer();
  if (id === "aboutDialog" && connections) {
    renderCalendar();
    refreshCalendarStatus();
    refreshAutoplay();
  }
  const parent = origin.closest("dialog");
  if (parent?.open) {
    origin = modalReturns.get(parent) || document.body;
    parent.close();
  }
  modalReturns.set(dialog, origin);
  dialog.showModal();
  dialog.querySelector(".dialog-close").focus();
}

function syncTimerOptions() {
  const timer = state.timer;
  $("continuousBtn").setAttribute("aria-pressed", String(!timer));
  document.querySelectorAll("[data-interval]").forEach((button) => {
    button.setAttribute("aria-pressed", String(timer?.intervals && timer.workMs === Number(button.dataset.interval) * 60000 || false));
  });
  $("timerPresets").querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(!timer?.intervals && timer?.total === Number(button.dataset.minutes) * 60000));
  });
  $("customMinutes").value = "";
}

const mixControls = [["volume", "Volume"], ["rainLevel", "Rain"], ["oceanLevel", "Ocean"], ["vinylLevel", "Vinyl"]];
function syncMixer() {
  mixControls.forEach(([key]) => {
    const percent = Math.round((key === "volume" && state.muted ? 0 : state[key]) * 100);
    $(key).value = percent;
    $(key + "Out").textContent = percent ? `${percent}%` : "Off";
  });
  $("crossfade").value = state.crossfadeSec;
}

function bindControls() {
  $("mixerRows").innerHTML = mixControls.map(([key, label]) => `
    <div class="mixer-row"><label for="${key}">${label}</label><input id="${key}" type="range" min="0" max="100">
      <output id="${key}Out" for="${key}"></output></div>`).join("");
  mixControls.forEach(([key]) => {
    $(key).addEventListener("input", (event) => {
      const value = Number(event.target.value) / 100;
      if (key === "volume") setVolume(value);
      else {
        state[key] = value;
        if (state.isPlaying) {
          ensureAudioGraph(true);
          syncAmbience();
        }
        savePrefs();
      }
      syncMixer();
    });
  });
  const prefs = [
    ["crossfade", "crossfadeSec", (el) => Number(el.value)], ["autoNext", "autoNext", (el) => el.checked],
    ["shuffle", "shuffle", (el) => el.checked], ["repeat", "loopMode", (el) => el.value],
  ];
  prefs.forEach(([id, key, read]) => {
    const element = $(id);
    if (element.type === "checkbox") element.checked = state[key];
    else element.value = state[key];
    element.addEventListener("change", () => { state[key] = read(element); savePrefs(); });
  });
  $("timerPresets").replaceChildren(...TIMER_PRESETS.map((minutes) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.dataset.minutes = minutes;
    button.textContent = `${minutes} min`;
    button.addEventListener("click", () => { setTimer(minutes); $("timerDialog").close(); });
    return button;
  }));
  $("customTimer").addEventListener("submit", (event) => {
    event.preventDefault();
    if (setTimer($("customMinutes").valueAsNumber)) $("timerDialog").close();
  });
  $("continuousBtn").addEventListener("click", () => { setTimer(0); $("timerDialog").close(); });
  document.querySelectorAll("[data-interval]").forEach((button) => {
    button.addEventListener("click", () => { setTimer(Number(button.dataset.interval), true); $("timerDialog").close(); });
  });
  document.querySelectorAll("[data-intensity]").forEach((button) => {
    button.addEventListener("click", () => {
      setIntensity(button.dataset.intensity);
      for (const control of document.querySelectorAll("[data-intensity]")) {
        control.setAttribute("aria-pressed", String(control.dataset.intensity === state.intensity));
      }
    });
    button.setAttribute("aria-pressed", String(button.dataset.intensity === state.intensity));
  });
  $("skipBreak").addEventListener("click", skipBreak);
  $("dismissWake").addEventListener("click", dismissWake);
  $("dimScreen").addEventListener("click", () => setDim(!dimmed));
  $("calendarBtn").addEventListener("click", handleCalendarPillClick);
  $("calendarConnectBtn").addEventListener("click", startCalendarConnect);
  document.addEventListener("pointermove", () => { if (zen) wakeZenChrome(); }, { passive: true });
  DIM_EVENTS.forEach((event) => document.addEventListener(event, (e) => {
    const activatesDimButton = e.target.closest?.("#dimScreen") &&
      (event !== "keydown" || e.key === " " || e.key === "Enter");
    if (dimmed && !activatesDimButton) setDim(false);
    if (zen) wakeZenChrome();
  }, { passive: true }));
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => {
      const origin = modalReturns.get(dialog);
      if (origin?.getClientRects().length && !document.querySelector("dialog[open]")) origin.focus({ preventScroll: true });
    });
  });
  document.querySelectorAll("[data-transport]").forEach((button) => {
    const actions = { toggle: togglePlayback, previous: previousTrack, next: () => nextTrack(), stop: stopSession };
    button.addEventListener("click", actions[button.dataset.transport]);
  });
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.view === "start") resetModes();
    else showView(button.dataset.view, { restoreScroll: true });
  }));
  document.querySelector("[data-home]").addEventListener("click", resetModes);
  document.querySelectorAll("[data-dialog]").forEach((button) => button.addEventListener("click", () => openDialog(button.dataset.dialog, button)));
  document.querySelectorAll("[data-scene]").forEach((button) => button.addEventListener("click", () => pickScene(button.dataset.scene)));
  document.querySelectorAll("[data-signal]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.signal === state.vizMode));
    button.addEventListener("click", () => pickSignal(button.dataset.signal));
  });
  $("aboutBtn").addEventListener("click", () => openDialog("aboutDialog"));
  $("backPlayer").addEventListener("click", closePlayer);
  $("openPlayer").addEventListener("click", () => showView("player"));
  $("resumeBtn").addEventListener("click", resumeLastActivity);
  $("breathBtn").addEventListener("click", toggleBreath);
  $("retryBtn").addEventListener("click", () => state.failure?.retry());
  $("enterZen").addEventListener("click", () => setZen(true));
  $("exitZen").addEventListener("click", () => setZen(false));
  document.addEventListener("fullscreenchange", () => { if (zen && !document.fullscreenElement) setZen(false); });
  $("seek").addEventListener("input", (event) => seekTo(event.target.valueAsNumber));
  $("search").addEventListener("input", renderLibrary);
  ["modeFilter", "moodFilter", "bandFilter"].forEach((id) => $(id).addEventListener("change", renderLibrary));
  $("playBlueprint").addEventListener("click", () => startLibrary(blueprintTracks(), 0, blueprint.name));
}

function resumeLastActivity() {
  if (state.activity?.key !== state.lastActivity || (!state.isPlaying && !state.timer && preferredTimer().minutes)) {
    launchActivity(state.lastActivity);
    return;
  }
  showView("player");
  if (!state.isPlaying && !state.timer?.deadline && !startAttempt) togglePlayback();
}

function resetModes() {
  selectedMode = null;
  showView("start");
}

function closePlayer() {
  showView(returnView, { restoreScroll: true });
}

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || document.querySelector("dialog[open]")) return;
  if (event.key === "Escape" && zen) { setZen(false); return; }
  const focused = document.activeElement;
  if (focused !== document.body && focused !== document.documentElement &&
      focused !== headings[view] && focused !== $("main")) return;
  const shortcuts = {
    " ": togglePlayback, n: () => nextTrack(), p: previousTrack,
    m: () => setVolume(state.volume, !state.muted),
    v: () => { if (view === "player" && scene === "signal") closePlayer(); else { showView("player"); pickScene("signal"); } },
    z: () => setZen(!zen), b: toggleBreath, "?": () => openDialog("helpDialog"),
    ArrowLeft: () => seekTo(currentPosition().cur - 15), ArrowRight: () => seekTo(currentPosition().cur + 15),
  };
  ["signature", "silk", "halo", "horizon"].forEach((style, index) => { shortcuts[index + 1] = () => { showView("player"); pickSignal(style); }; });
  const action = shortcuts[event.key.length === 1 ? event.key.toLowerCase() : event.key];
  if (action) { event.preventDefault(); action(); }
});

function getState() {
  const track = getCurrentTrack();
  const art = availableArt(state.activity ? artForActivity(state.activity) : artForTrack(track));
  return {
    ready: Boolean(state.allTracks.length),
    activity: state.activity?.key || "",
    name: state.sessionName || "Dreamlight",
    title: track?.title || "",
    trackSlug: track?.slug || "",
    ...art,
    playing: playbackRunning(),
    wake: state.wake,
    starting: state.starting,
    error: state.failure?.label || "",
    completed: state.completedUntil > Date.now(),
    volume: state.volume,
    reducedMotion: prefersReducedMotion,
    ...currentPosition(),
    ...getTimerState(),
    upNext: !state.shuffle && state.autoNext ? state.queue[nextIndex(true)]?.title || "" : "",
  };
}

function syncVisualVisibility() {
  const active = windowVisible && !remoteVisible;
  motion.suppress(!active);
  document.body.classList.toggle("motion-suspended", !active || document.hidden);
  syncBloom();
  if (active) syncVisualizer();
  else if (visualFrame !== null) {
    cancelAnimationFrame(visualFrame);
    visualFrame = null;
  }
}

window.dreamlight = Object.freeze({
  getState, toggle: togglePlayback, next: () => nextTrack(), prev: previousTrack, stop: stopSession,
  setTimer, skipBreak, dismissWake, startActivity: launchActivity, modes: MODES, activities: ACTIVITIES, timerPresets: TIMER_PRESETS,
  retry: () => state.failure?.retry(),
  zen: () => setZen(!zen), breath: toggleBreath,
  ...(connections ? { connections } : {}),
  setRemoteVisible(on) { remoteVisible = on; syncVisualVisibility(); },
  setWindowVisible(on) { windowVisible = on; syncVisualVisibility(); },
});

playback.addEventListener("track", () => {
  showTrack();
  renderTransport();
  markLibrary();
  renderQueue();
  syncArt();
});
playback.addEventListener("state", () => {
  renderTransport();
  const track = getCurrentTrack();
  if (renderedTrack !== track || renderedPlaying !== state.isPlaying) {
    renderedTrack = track;
    renderedPlaying = state.isPlaying;
    markLibrary();
  }
});
playback.addEventListener("clock", renderClock);
playback.addEventListener("position", renderPosition);
playback.addEventListener("complete", announceComplete);

motionPreference.addEventListener("change", (event) => {
  prefersReducedMotion = event.matches;
  if (prefersReducedMotion) {
    stopPortalFlight();
    document.querySelectorAll(".mode-morph, .flight-sibling").forEach((item) => item.remove());
  }
  syncArt();
});
document.addEventListener("visibilitychange", syncVisualVisibility);
window.addEventListener("scroll", () => $("topbar").classList.toggle("scrolled", scrollY > 8), { passive: true });
new ResizeObserver(() => { if (windowVisible && !remoteVisible) syncVisualizer(); }).observe($("heroVisual"));

// Meeting auto-play (owned desktop app only): Dreamlight reads the day's meetings
// and starts a session a few minutes after each one ends.
function renderAutoplay() {
  const row = $("autoplayRow");
  if (!row) return;
  row.hidden = !autoplayBridge || !calendarState?.connected;
  const s = autoplayState;
  const button = $("autoplayToggleBtn");
  const on = Boolean(s?.enabled);
  button.textContent = on ? "On" : "Turn on";
  button.setAttribute("aria-pressed", String(on));
  const activityName = ACTIVITY_BY_KEY.get(s?.activity)?.name || "Deep work";
  let text = `${activityName}, ${s?.delayMinutes ?? 10} min after each meeting ends`;
  if (on && s?.error) text = "Could not read your calendar. Using the last schedule.";
  else if (on && s?.nextAt) text = `Next: ${activityName} at ${formatClockTime(new Date(s.nextAt))}`;
  else if (on) text = "No more meetings today";
  $("autoplayStatusText").textContent = text;
  $("autoplayStatusText").classList.toggle("is-connected", on && !s?.error);
}

async function refreshAutoplay() {
  if (!autoplayBridge) return;
  try { autoplayState = await autoplayBridge.status(); } catch {}
  renderAutoplay();
}

async function init() {
  heroArt = artSlot();
  $("heroScene").append(heroArt);
  playerBackdrop = artSlot();
  $("playerEnvironment").append(playerBackdrop);
  bindControls();
  // Only the desktop app plays offline; the browser version needs the network for its tracks.
  if (!window.desktopPrefs) $("startTagline").textContent = "Pick a moment. Music starts instantly. No account, no ads.";
  if (window.desktopPrefs) document.documentElement.classList.add("owned-desktop");
  if (connections) {
    connections.onStatus?.(applyCalendarStatus);
    refreshCalendarStatus();
  }
  if (autoplayBridge) {
    autoplayBridge.onStatus((status) => { autoplayState = status; renderAutoplay(); });
    $("autoplayToggleBtn").addEventListener("click", async () => {
      try { autoplayState = await autoplayBridge.set({ enabled: !autoplayState?.enabled }); } catch {}
      renderAutoplay();
    });
    refreshAutoplay();
  }
  try {
    const result = await Promise.all([fetch("tracks.json").then((response) => response.json()), loadMotionManifest]);
    state.allTracks = result[0].tracks;
    const activity = ACTIVITY_BY_KEY.get(state.lastActivity);
    if (activity || saved.lastFilename) {
      const track = state.allTracks.find((item) => item.filename === saved.lastFilename);
      const queue = tracksFor(activity?.queue || BLUEPRINTS.find((item) => item.key === saved.activeStack)?.slugs);
      state.queue = queue;
      state.currentIdx = Math.max(0, queue.indexOf(track));
      state.activity = activity || null;
      state.sessionName = activity?.name || "Library";
      installTimer(preferredTimer(activity));
      if (getCurrentTrack()) activeAudio().src = getCurrentTrack().url;
    }
    renderModes();
    renderBlueprints();
    optionList("modeFilter", MODES.map((mode) => mode.key));
    optionList("moodFilter", [...new Set(state.allTracks.map((track) => track.mood))]);
    optionList("bandFilter", [...new Set(state.allTracks.map(bandFamily))]);
    renderLibrary();
    showTrack();
    renderTransport();
    syncArt();
  } catch {
    state.failure = { label: "Couldn't load this session", retry: () => location.reload() };
    renderFeedback();
  }
}

init();
