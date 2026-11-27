(() => {
  const app = window.dreamlight;
  const codeOf = (error) => error?.code || String(error?.message || error).split(":")[0];
  const quietly = async (action) => { try { return await action(); } catch { return undefined; } };
  const sessionEvents = (listener) => {
    for (const name of ["state", "track", "clock", "complete"]) playback.addEventListener(name, listener);
    listener();
  };

  function attachMatcher(sample) {
    const panel = $("sessionMatcher"), input = $("sessionPrompt"), submit = $("matchSubmit");
    const form = $("matchForm"), result = $("matchResult"), status = $("matchStatus");
    let stopDictating = () => {};
    quietly(async () => {
      const dictation = await capability("dictation");
      if (dictation && !panel.hidden) stopDictating = attachDictation(dictation, input);
    });
    const catalog = ACTIVITIES.map(({ key, name, mode, feel, minutes }) => ({ key, name, mode, feel, minutes }));
    const unavailable = new Set(["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"]);
    const fallback = "Could not match right now. Pick a mode below.";
    let choice;

    function reset() {
      choice = null;
      result.hidden = true;
      form.hidden = false;
      status.textContent = "";
    }
    panel.hidden = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const request = input.value.trim();
      if (!request || submit.disabled) return;
      stopDictating();
      submit.disabled = true;
      status.textContent = "Matching a session...";
      try {
        const answer = await sample.json([
          "Match the user's description to one of these activities. Use the requested duration, or the activity's default.",
          JSON.stringify(catalog), "User description: " + JSON.stringify(request),
          'Return exactly {"activity":"<key>","minutes":<integer 1-240 or 0 for continuous>,"why":"<under 12 words>"}.',
        ].join("\n"), { modelTier: "quick" });
        const activity = ACTIVITY_BY_KEY.get(answer?.activity);
        const why = typeof answer?.why === "string" ? answer.why.trim() : "";
        if (!activity || !Number.isInteger(answer.minutes) || !why || why.split(/\s+/).length >= 12) {
          status.textContent = fallback;
          return;
        }
        const minutes = answer.minutes === 0 ? 0 : Math.max(1, Math.min(240, answer.minutes));
        choice = { key: activity.key, minutes };
        $("matchTitle").textContent = activity.name + " · " + (minutes ? minutes + " min" : "Continuous");
        $("matchReason").textContent = why;
        form.hidden = true;
        result.hidden = false;
        status.textContent = "";
        if (view === "start") $("matchStart").focus();
      } catch (error) {
        const code = codeOf(error);
        if (unavailable.has(code)) panel.hidden = true;
        status.textContent = code === "rate_limited" ? "Claude is busy right now. Try again in a moment."
          : code === "cancelled" ? "" : fallback;
      } finally { submit.disabled = false; }
    });
    $("matchStart").addEventListener("click", () => {
      if (!choice) return;
      const { key, minutes } = choice;
      reset();
      launchActivity(key, null, minutes);
    });
    $("matchReset").addEventListener("click", () => { reset(); input.focus(); });
  }

  function attachDictation(d, input) {
    const mic = $("dictate");
    let confirmed = input.value, listening = false, finishing = false, disabled = false;
    const append = (base, piece) => [base.trimEnd(), piece.trim()].filter(Boolean).join(" ");
    function setListening(on) {
      listening = on;
      mic.setAttribute("aria-pressed", String(on));
      mic.querySelector("span").hidden = !on;
      if (!on) { finishing = false; input.readOnly = false; input.classList.remove("partial"); input.value = confirmed; }
    }
    input.addEventListener("input", () => { if (!listening) confirmed = input.value; });
    function failure(error) {
      if (codeOf(error) === "not_granted") { disabled = true; mic.hidden = true; }
      setListening(false);
    }
    function stop() {
      if (listening && !finishing) {
        finishing = true;
        try { Promise.resolve(d.stop()).catch(failure); } catch (error) { failure(error); }
      }
    }
    try {
      d.onPartial(({ text }) => {
        if (!listening || disabled || typeof text !== "string") return;
        input.classList.add("partial"); input.value = append(confirmed, text);
      });
      d.onFinal(({ text }) => {
        if (!listening || disabled || typeof text !== "string") return;
        confirmed = append(confirmed, text);
        input.classList.remove("partial"); input.value = confirmed;
      });
      d.onState(({ state: next, reason }) => {
        if (reason === "not_granted") { failure({ code: reason }); return; }
        if (disabled) return;
        finishing = next === "finishing";
        setListening(next !== "idle");
      });
      mic.hidden = false;
    } catch { return () => {}; }
    mic.addEventListener("click", () => {
      if (listening) { stop(); return; }
      confirmed = input.value;
      input.readOnly = true;
      setListening(true);
      try { Promise.resolve(d.start()).catch(failure); } catch (error) { failure(error); }
    });
    new MutationObserver(() => { if ($("startView").hidden) stop(); })
      .observe($("startView"), { attributes: true, attributeFilter: ["hidden"] });
    return stop;
  }

  function attachCalendar(mcp) {
    const button = $("calendarBtn"), toast = $("calendarStatus");
    const label = button.querySelector("span") || button;
    let toastTimer;
    const pad = (value) => String(value).padStart(2, "0");
    const time = (date) => pad(date.getHours()) + ":" + pad(date.getMinutes());
    const iso = (date) => [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-") + "T" + time(date) + ":00";
    const eligible = (s) => s.playing && s.timerRunning && s.timerRemain > 0 && s.intervalPhase !== "break";
    sessionEvents(() => { button.hidden = !eligible(app.getState()); });
    const messages = {
      server_not_connected: "Add Google Calendar in claude.ai Settings, Connectors.",
      needs_reauth: "Reconnect Google Calendar in claude.ai Settings, Connectors.",
      approval_required: "Calendar needs your approval first.",
      server_unavailable: "Check your calendar before trying again.",
      upstream_error: "Check your calendar before trying again.",
    };
    button.addEventListener("click", async () => {
      const s = app.getState();
      if (!eligible(s) || button.disabled) return;
      button.disabled = true;
      label.textContent = "Adding...";
      clearTimeout(toastTimer);
      toast.textContent = "";
      const start = new Date();
      start.setSeconds(0, 0);
      const end = new Date(start.getTime() + Math.ceil(s.timerRemain / 60) * 60000);
      try {
        await mcp.callTool("Google Calendar", "create_event", {
          summary: "Focus · " + (ACTIVITY_BY_KEY.get(s.activity)?.name || s.name),
          startTime: iso(start), endTime: iso(end), description: "Dreamlight session",
          notificationLevel: "NONE", useDefaultReminders: false,
        });
        toast.textContent = "Added to Google Calendar · " + time(start) + " to " + time(end);
      } catch (error) {
        const code = codeOf(error);
        toast.textContent = messages[code] || (code === "tool_error" && typeof error?.message === "string" && error.message)
          || "Calendar unavailable. Your session is still running.";
      } finally {
        button.disabled = false;
        label.textContent = "Add to calendar";
        toastTimer = setTimeout(() => { toast.textContent = ""; }, 4500);
      }
    });
  }

  function attachCues(tts) {
    const button = $("spokenCues");
    const words = { Inhale: "Breathe in", Hold: "Hold", Exhale: "Breathe out", Rest: "Hold" };
    let enabled = false, unavailable = false, active = false, utterance = null, lastCue = -Infinity;
    function sync() {
      button.hidden = unavailable || !state.breathOn;
      if (!state.breathOn || unavailable) enabled = false;
      button.setAttribute("aria-pressed", String(enabled));
      const next = enabled && app.getState().playing && view === "player" && !document.hidden && windowVisible && !remoteVisible;
      if (active && !next) quietly(() => tts.stop());
      active = next;
    }
    async function speakPhase() {
      sync();
      const word = words[$("breathPhase").textContent];
      const now = performance.now();
      if (!active || !word || utterance || now - lastCue < 3500) return;
      lastCue = now;
      const id = utterance = {};
      try { await tts.speak(word, { voice: "airy", rate: 0.85 }); }
      catch (error) { if (codeOf(error) === "not_granted") { unavailable = true; sync(); } }
      finally { if (utterance === id) utterance = null; }
    }
    button.addEventListener("click", () => { enabled = !enabled; sync(); });
    new MutationObserver(speakPhase).observe($("breathPhase"), { childList: true });
    const observed = new MutationObserver(sync);
    observed.observe($("breathGuide"), { attributes: true, attributeFilter: ["hidden"] });
    observed.observe($("playerView"), { attributes: true, attributeFilter: ["hidden"] });
    observed.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", sync);
    sessionEvents(sync);
  }

  // Meeting auto-play: the owned app's rules (desktop/meeting-autoplay.js), reading the day through
  // Claude's Google Calendar connector. Off until switched on in About; the switch click is also the
  // moment Claude asks for calendar access. Keeps only meeting times, never titles.
  function attachMeetingAutoplay(mcp) {
    const section = $("meetingAutoplay"), sw = $("meetingSwitch"), status = $("meetingStatus"), retry = $("meetingRetry");
    const KEY = "dreamlight.meetings", ACTIVITY = "deep_work";
    const DELAY = 10 * 60000, QUIET = 15 * 60000, GRACE = 2 * 60000;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
    let enabled = saved.enabled === true;
    let meetings = Array.isArray(saved.meetings) ? saved.meetings.filter((m) => Number.isFinite(m.start) && Number.isFinite(m.end)) : [];
    let fired = new Set(Array.isArray(saved.fired) ? saved.fired : []);
    let lastRead = saved.lastRead || null, lastStart = saved.lastStart || null, lastError = null, note = "";
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ enabled, meetings, fired: [...fired], lastRead, lastStart })); } catch {} };
    const pad = (v) => String(v).padStart(2, "0");
    const local = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00";
    const clock = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const ms = (part) => { const t = Date.parse(part?.dateTime || ""); return Number.isNaN(t) ? null : t; };
    function isMeeting(e) {
      if (!e || typeof e !== "object" || e.status === "cancelled") return false;
      if (e.eventType && String(e.eventType).toLowerCase() !== "default") return false;
      if (e.transparency === "transparent") return false;
      const start = ms(e.start), end = ms(e.end);
      if (start == null || end == null || end <= start) return false;
      if (/^Focus · /.test(String(e.summary || "")) || String(e.description || "").trim() === "Dreamlight session") return false;
      const attendees = Array.isArray(e.attendees) ? e.attendees : [];
      if (attendees.find((a) => a?.self)?.responseStatus === "declined") return false;
      const others = attendees.filter((a) => a && !a.self && !a.resource).length;
      // Claude's connector reports Meet as conferenceUrl / conferenceData.videoEntryPoint; Google's API as hangoutLink / entryPoints.
      const video = Boolean(e.conferenceUrl || e.conferenceData?.videoEntryPoint?.uri || e.hangoutLink
        || e.conferenceData?.conferenceId || e.conferenceData?.entryPoints?.length);
      return others > 0 || video;
    }
    function triggers() {
      const list = [];
      for (const m of meetings) {
        const at = m.end + DELAY;
        if (meetings.some((o) => o !== m && o.start < at + QUIET && o.end > m.end)) continue;
        list.push({ key: m.id + "@" + m.end, at });
      }
      return list.sort((a, b) => a.at - b.at);
    }
    const nextTrigger = () => { const t = Date.now(); return triggers().find((tr) => !fired.has(tr.key) && tr.at >= t - GRACE) || null; };
    const errors = {
      approval_required: "Allow calendar access when Claude asks, then try again.",
      not_in_manifest: "Calendar reading is turned off for Dreamlight. Allow it, then try again.",
      needs_reauth: "Reconnect Google Calendar in claude.ai Settings, Connectors.",
      server_not_connected: "Add Google Calendar in claude.ai Settings, Connectors.",
      selection_required: "Choose which Google Calendar to use when Claude asks.",
      blocked_by_policy: "Your organization blocks calendar reading here.",
    };
    function render() {
      sw.setAttribute("aria-checked", String(enabled));
      retry.hidden = !(enabled && lastError && errors[lastError] && lastError !== "server_not_connected" && lastError !== "needs_reauth" && lastError !== "blocked_by_policy");
      let text = "Off";
      if (enabled) {
        const next = nextTrigger();
        if (lastError) text = errors[lastError] || "Couldn't reach your calendar. Using the last schedule.";
        else if (next) text = "Next: Deep work at " + clock(next.at);
        else text = "No more meetings today";
        if (lastStart && Date.now() - lastStart < 30 * 60000) text = (note || "Started Deep work at " + clock(lastStart)) + ". " + text;
      }
      status.textContent = text;
    }
    async function read() {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 36 * 3600000);
      try {
        const result = await mcp.callTool("Google Calendar", "list_events",
          { startTime: local(start), endTime: local(end), orderBy: "startTime", pageSize: 100 }, { cache: false });
        const p = result?.payload;
        const items = Array.isArray(p?.events) ? p.events : Array.isArray(p?.items) ? p.items : [];
        meetings = items.filter(isMeeting).map((e) => ({ id: String(e.id || ""), start: ms(e.start), end: ms(e.end) }))
          .sort((a, b) => a.start - b.start);
        lastRead = Date.now(); lastError = null;
        const keep = new Set(triggers().map((tr) => tr.key));
        fired = new Set([...fired].filter((key) => keep.has(key)));
      } catch (error) { lastError = codeOf(error) || "upstream_error"; }
      save(); render();
    }
    async function tick() {
      if (!enabled) return;
      const t = Date.now();
      const due = triggers().filter((tr) => !fired.has(tr.key) && tr.at <= t);
      if (!due.length) { render(); return; }
      for (const tr of due) fired.add(tr.key);
      save();
      const latest = due[due.length - 1];
      if (t - latest.at > GRACE || app.getState().playing) { render(); return; }
      await quietly(() => app.startActivity(ACTIVITY));
      lastStart = t; note = "";
      save(); render();
      // Claude decides whether a page may start sound without a click; report what actually happened.
      setTimeout(() => {
        const sounding = typeof decks !== "undefined" && decks.some(({ el }) => !el.paused && el.currentTime > 1);
        if (!app.getState().playing || !sounding) { note = "Deep work was ready at " + clock(lastStart) + " but needs a click to play"; render(); }
      }, 6000);
    }
    sw.addEventListener("click", async () => {
      enabled = !enabled; lastError = null; save(); render();
      if (enabled) await read();
    });
    retry.addEventListener("click", () => { lastError = null; render(); read(); });
    document.addEventListener("visibilitychange", () => { if (enabled && !document.hidden) read().then(tick); });
    setInterval(() => { tick(); }, 20000);
    setInterval(() => { if (enabled) read(); }, 10 * 60000);
    section.hidden = false;
    render();
    if (enabled) read().then(tick);
  }

  async function attachDesktop(desktop) {
    if (!desktop.window) {
      if (await desktop.install?.state() !== "available") return;
      const button = $("installApp");
      button.hidden = false;
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        button.disabled = true;
        try { button.hidden = await desktop.install.request() === "installed"; }
        catch { /* Keep installation available for the next click. */ }
        finally { button.disabled = false; }
      });
      return;
    }
    document.documentElement.classList.add("claude-desktop");
    quietly(() => desktop.window.setOptions({
      titleBarStyle: "hiddenInset", dragHeight: 56, vibrancy: "under-window",
      width: 1320, height: 860, minWidth: 390, minHeight: 640,
    }));
    quietly(async () => {
      const image = new Image();
      image.src = "icon-512.png";
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas.getContext("2d").drawImage(image, 0, 0, 256, 256);
      const url = canvas.toDataURL("image/png");
      if (url.length < 340000) await desktop.app.dock.setIcon(url);
    });
    const display = (style) => () => { showView("player"); pickScene(style); };
    quietly(() => desktop.Menu.setApplicationMenu([
      { label: "Playback", submenu: [
        { label: "Play or pause", accelerator: "CmdOrCtrl+Shift+P", click: app.toggle },
        { label: "Next track", click: app.next }, { label: "Previous track", click: app.prev },
        { type: "separator" }, { label: "Open Now playing", click: () => showView("player") },
        { label: "Library", click: () => showView("library") },
      ] },
      { role: "editMenu" },
      { label: "View", submenu: [
        { label: "Scene", click: display("scene") }, { label: "Signal", click: display("signal") },
        { label: "Cinema Zen", click: app.zen },
      ] },
    ]));
    let badge;
    sessionEvents(() => {
      const s = app.getState();
      const next = !s.playing || !s.timerRunning ? "" : s.intervalPhase === "break" ? "Break" : Math.ceil(s.timerRemain / 60) + "m";
      if (next !== badge) { badge = next; quietly(() => desktop.app.dock.setBadge(next)); }
    });
    await attachDesktopControls(desktop);
  }

  function makeTray(desktop, onFailure) {
    const art = document.createElement("canvas");
    art.width = art.height = 36;
    const ctx = art.getContext("2d");
    ctx.beginPath(); ctx.arc(17, 18, 14, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(23, 13, 11, 0, Math.PI * 2); ctx.fill();
    const icon = art.toDataURL("image/png");
    let enabled = false, pending = null, timer, lastCall = -Infinity, previous = null;
    function snapshot() {
      const s = app.getState();
      let title = "";
      if (s.timerRunning) title = (s.intervalPhase === "break" ? "Break " : "") + fmtTime(s.timerRemain).replace(/^0(?=\d:)/, "");
      else if (!s.playing && !s.completed && !s.wake && (s.timerTotal || (state.hasStarted && s.cur > 0))) title = "Paused";
      return { title, playing: s.playing };
    }
    async function update() {
      if (!enabled || pending) return;
      const next = snapshot();
      if (previous && next.title === previous.title && next.playing === previous.playing) return;
      const wait = 1000 - (performance.now() - lastCall);
      if (wait > 0) {
        if (!timer) timer = setTimeout(() => { timer = null; update().catch(onFailure); }, Math.ceil(wait));
        return;
      }
      lastCall = performance.now();
      try {
        pending = desktop.tray.set({ icon, title: next.title, toolTip: "Dreamlight", menu: [
          { label: next.playing ? "Pause" : "Play", click: app.toggle },
          { label: "Next track", click: app.next },
          { label: "Start", submenu: ACTIVITIES.map(({ key, name }) => ({ label: name, click: () => launchActivity(key) })) },
          { type: "separator" }, { label: "Open Dreamlight", click: () => quietly(() => desktop.window.show()) },
        ] });
        await pending;
        previous = next;
      } finally { pending = null; }
      // A pause or stop may have arrived while the host was handling the update.
      if (enabled) update().catch(onFailure);
    }
    // Playback events drive the countdown. The trailing timer coalesces rapid changes.
    sessionEvents(() => { if (enabled) update().catch(onFailure); });
    return {
      async enable() { enabled = true; previous = null; await update(); },
      suspend() { enabled = false; clearTimeout(timer); timer = null; return pending; },
    };
  }

  async function attachDesktopControls(desktop) {
    const flags = new Map(), rows = new Map();
    const savedFlag = (key) => { try { return localStorage.getItem("dreamlight.desktop." + key) === "on"; } catch { return false; } };
    function setFlag(key, on) {
      flags.set(key, on);
      rows.get(key).button.setAttribute("aria-checked", String(on));
      try { localStorage.setItem("dreamlight.desktop." + key, on ? "on" : "off"); } catch {}
    }
    const shortcut = "Alt+Shift+Space";
    const tray = makeTray(desktop, (error) => failed("menu-bar", error));
    function failed(key, error) {
      const row = rows.get(key);
      if (key === "menu-bar") tray.suspend();
      setFlag(key, false);
      const denied = ["EPERM", "not_granted"].includes(codeOf(error));
      row.status.textContent = denied ? "Turned off in permissions" : key === "shortcuts" ? "Shortcut unavailable" : "";
      row.manage.hidden = !denied;
      row.button.disabled = denied;
    }
    async function change(key, on, restore = false) {
      const row = rows.get(key);
      row.button.disabled = true;
      row.status.textContent = "";
      try {
        if (on && !restore && row.grant !== "granted") {
          const grants = await desktop.permissions.request([key]);
          row.grant = grants?.[key];
          if (row.grant === "denied") throw new Error("EPERM");
          if (row.grant !== "granted") { row.button.disabled = false; return; }
        }
        if (key === "menu-bar") {
          if (on) await tray.enable();
          else { await quietly(() => tray.suspend()); await desktop.tray.remove(); }
        } else if (key === "shortcuts") {
          if (on) {
            if (await desktop.globalShortcut.register(shortcut, app.toggle) === false) throw new Error("Shortcut unavailable");
          } else await desktop.globalShortcut.unregister(shortcut);
        }
        row.grant = "granted";
        setFlag(key, on);
        row.button.disabled = false;
      } catch (error) {
        if (!on) {
          if (key === "menu-bar") await quietly(() => tray.enable());
          row.button.disabled = false;
        } else failed(key, error);
      }
    }
    async function readPermissions() {
      const grants = await quietly(() => desktop.permissions.state());
      await Promise.all([...rows].map(async ([key, row]) => {
        row.grant = grants?.[key];
        if (row.grant === "denied") { failed(key, new Error("EPERM")); return; }
        row.button.disabled = false;
        row.manage.hidden = true;
        row.status.textContent = "";
        if (row.grant === "granted" && savedFlag(key) && !flags.get(key)) await change(key, true, true);
      }));
    }
    for (const [key, label, help] of [
      ["menu-bar", "Menu bar controls", "Keep Dreamlight playing from the menu bar after you close this window."],
      ["shortcuts", "Global shortcut", "Press Option+Shift+Space in any app to play or pause."],
      ["notifications", "Session notifications", "Get a notice for breaks, wake ups and finished sessions."],
    ]) {
      const row = document.createElement("div"); row.className = "desktop-switch";
      const copy = document.createElement("div"); copy.textContent = label;
      const hint = document.createElement("small"); hint.id = "hint-" + key; hint.textContent = help; copy.append(hint);
      const button = document.createElement("button"); button.type = "button"; button.disabled = true;
      button.setAttribute("role", "switch"); button.setAttribute("aria-label", label);
      button.setAttribute("aria-checked", "false"); button.setAttribute("aria-describedby", hint.id);
      const feedback = document.createElement("div"); feedback.className = "permission-status";
      const status = document.createElement("span"); status.setAttribute("role", "status");
      const manage = document.createElement("button"); manage.type = "button"; manage.className = "text-action";
      manage.textContent = "Manage permissions"; manage.hidden = true;
      feedback.append(status, manage); row.append(copy, button, feedback); $("desktopSwitches").append(row);
      rows.set(key, { button, status, manage });
      button.addEventListener("click", () => change(key, !flags.get(key)));
      manage.addEventListener("click", async () => { await quietly(() => desktop.permissions.manage()); await readPermissions(); });
    }
    $("desktopControls").hidden = false;
    let previous = app.getState();
    sessionEvents((event) => {
      const s = app.getState();
      let body;
      if (!previous.wake && s.wake) body = "Power nap complete. Time to wake up.";
      else if (previous.intervalPhase === "work" && s.intervalPhase === "break")
        body = "Time for a short break. Music lowered for round " + s.intervalRound + ".";
      else if (previous.intervalPhase === "break" && s.intervalPhase === "work" && s.intervalRound === previous.intervalRound + 1)
        body = "Break over. Back to focus.";
      else if (event?.type === "complete") body = "Session complete.";
      previous = s;
      if (body && flags.get("notifications")) {
        try { Promise.resolve(desktop.notification.show({ body })).catch((e) => failed("notifications", e)); }
        catch (e) { failed("notifications", e); }
      }
    });
    await readPermissions();
  }

  const deadline = performance.now() + 10000;
  async function capability(name) {
    let timer;
    try {
      return await Promise.race([
        window.claude.use(name),
        new Promise((resolve) => { timer = setTimeout(() => resolve(null), Math.max(0, deadline - performance.now())); }),
      ]);
    } catch { return null; }
    finally { clearTimeout(timer); }
  }
  function boot() {
    if (performance.now() >= deadline) return;
    if (!state.allTracks.length || !window.claude?.use) { setTimeout(boot, 100); return; }
    for (const [name, attach] of [["desktop", attachDesktop], ["mcp", (mcp) => { attachCalendar(mcp); attachMeetingAutoplay(mcp); }], ["tts", attachCues]]) {
      quietly(async () => { const api = await capability(name); if (api) await attach(api); });
    }
    // Session matcher ("Describe what you're doing") is off so this copy matches the owned app screen for screen.
  }
  setTimeout(boot, 0);
})();
