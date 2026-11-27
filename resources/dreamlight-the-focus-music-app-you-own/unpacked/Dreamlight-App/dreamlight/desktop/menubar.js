const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, screen } = require("electron");
const path = require("path");

const ASSETS = path.join(__dirname, "assets");
const COMMANDS = new Set(["toggle", "next", "prev", "stop", "setTimer", "startActivity", "retry", "zen", "breath", "dismissWake", "skipBreak"]);

function fmt(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = String(Math.floor(s / 60) % 60).padStart(h ? 2 : 1, "0");
  return `${h ? h + ":" : ""}${m}:${String(s % 60).padStart(2, "0")}`;
}

module.exports = function setupMenuBar({ getMainWindow, showMainWindow, baseUrl, getAutoplay = () => null }) {
  // Mac: a black template icon that macOS tints for light and dark menu bars.
  // Windows and Linux: the colour app icon, which reads on both light and dark taskbars.
  const IS_MAC = process.platform === "darwin";
  const image = nativeImage.createFromPath(path.join(ASSETS, IS_MAC ? "trayTemplate.png" : "tray-color.png"));
  if (IS_MAC) image.setTemplateImage(true);
  const tray = new Tray(image);
  tray.setToolTip("Dreamlight");

  const pop = new BrowserWindow({
    width: 328, height: 390, show: false, frame: false, resizable: false, movable: false,
    fullscreenable: false, skipTaskbar: true, alwaysOnTop: true, transparent: true,
    vibrancy: "popover", visualEffectState: "active", hasShadow: true,
    webPreferences: { preload: path.join(__dirname, "tray-preload.js"), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  pop.loadFile(path.join(__dirname, "tray.html"), { query: { base: baseUrl } });
  pop.on("blur", () => { if (!pop.webContents.isDevToolsOpened()) pop.hide(); });

  async function evaluate(expression) {
    const main = getMainWindow();
    if (!main || main.isDestroyed() || main.webContents.isLoading()) return null;
    try { return await main.webContents.executeJavaScript(expression, true); } catch { return null; }
  }

  const call = (method, ...args) => evaluate(`window.dreamlight?.${method}(...${JSON.stringify(args)})`);
  let last = null;
  let reading = false;

  function updateTitle(state) {
    const title = state.timerTotal ? `${state.timerRunning ? "" : "❚❚ "}${fmt(state.timerRemain)}`
      : state.playing ? state.name.length > 18 ? state.name.slice(0, 17) + "…" : state.name : "";
    if (IS_MAC) {
      tray.setTitle(title ? ` ${title}` : "", { fontType: "monospacedDigit" });
      app.dock?.setBadge(state.timerTotal ? `${Math.ceil(state.timerRemain / 60)}m` : "");
    } else {
      // Windows: the session timer fills the taskbar icon like a progress bar.
      const main = getMainWindow();
      if (main && !main.isDestroyed()) main.setProgressBar(state.timerTotal ? Math.min(1, 1 - state.timerRemain / state.timerTotal) : -1,
        { mode: state.timerTotal && !state.timerRunning ? "paused" : "normal" });
    }
    tray.setToolTip(state.playing ? `Dreamlight · ${state.title}` : "Dreamlight");
  }

  async function refresh() {
    if (reading || pop.isDestroyed()) return;
    reading = true;
    try {
      const data = await evaluate(`(() => {
        const player = window.dreamlight;
        if (!player) return null;
        return { ...player.getState(), modes: player.modes, activities: player.activities, presets: player.timerPresets };
      })()`);
      if (!data || pop.isDestroyed()) return;
      last = data;
      updateTitle(data);
      if (pop.isVisible()) pop.webContents.send("dl:state", data);
    } finally {
      reading = false;
    }
  }

  function run(method, ...args) {
    if (!COMMANDS.has(method)) return;
    const result = call(method, ...args);
    result.finally(refresh);
    return result;
  }

  const timer = setInterval(refresh, 1000);
  let visibleTimer = null;
  pop.on("show", async () => {
    await call("setRemoteVisible", true);
    if (pop.isDestroyed() || !pop.isVisible()) return;
    pop.webContents.send("dl:visibility", true);
    if (last) pop.webContents.send("dl:state", last);
    refresh();
    clearInterval(visibleTimer);
    visibleTimer = setInterval(refresh, 250);
  });
  pop.on("hide", () => {
    pop.webContents.send("dl:visibility", false);
    call("setRemoteVisible", false);
    clearInterval(visibleTimer);
  });
  pop.webContents.on("did-finish-load", () => {
    pop.webContents.send("dl:visibility", pop.isVisible());
    refresh();
  });

  function placePopover(height = pop.getSize()[1]) {
    const bounds = tray.getBounds();
    const work = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y }).workArea;
    const [width] = pop.getSize();
    const x = Math.min(Math.max(bounds.x + (bounds.width - width) / 2, work.x + 6), work.x + work.width - width - 6);
    const y = Math.min(Math.max(bounds.y + bounds.height + 6, work.y + 6), work.y + work.height - height - 6);
    pop.setBounds({ x: Math.round(x), y: Math.round(y), width, height });
  }

  function togglePopover() {
    if (pop.isVisible()) { pop.hide(); return; }
    placePopover();
    pop.show();
    pop.focus();
  }

  function raisePlayer() {
    pop.hide();
    showMainWindow();
  }

  function autoplayMenu() {
    const autoplay = getAutoplay();
    if (!autoplay) return [];
    const s = autoplay.status();
    const next = s.enabled && s.nextAt
      ? `Next: ${new Date(s.nextAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : s.enabled ? "No more meetings today" : `${s.delayMinutes} min after each meeting`;
    return [{ label: "Play after meetings", sublabel: next, type: "checkbox", checked: s.enabled,
      click: (item) => { autoplay.setSettings({ enabled: item.checked }); } }];
  }

  function contextMenu() {
    return Menu.buildFromTemplate([
      { label: last?.title || "Dreamlight", enabled: false },
      { type: "separator" },
      { label: last?.playing ? "Pause" : "Play", accelerator: "CommandOrControl+Shift+Space", click: () => run("toggle") },
      { label: "Next track", click: () => run("next") },
      { label: "Previous track", click: () => run("prev") },
      { label: "Stop session", click: () => run("stop") },
      { type: "separator" },
      { label: "Start an activity", submenu: (last?.modes || []).map((mode) => ({
        label: mode.name, submenu: last.activities.filter((activity) => activity.mode === mode.key)
          .map((activity) => ({ label: activity.name, click: () => run("startActivity", activity.key) })),
      })) },
      { label: "Session timer", submenu: [
        { label: "Continuous", click: () => run("setTimer", 0) },
        { label: "Intervals (25 / 5)", click: () => run("setTimer", 25, true) },
        { label: "Intervals (50 / 10)", click: () => run("setTimer", 50, true) },
        ...(last?.presets || []).map((minutes) => ({ label: `${minutes} min`, click: () => run("setTimer", minutes) })),
      ] },
      { label: "Breath pacer", click: () => { raisePlayer(); run("breath"); } },
      { label: "Cinema Zen", click: () => { raisePlayer(); run("zen"); } },
      { type: "separator" },
      ...autoplayMenu(),
      { type: "separator" },
      { label: "Open Dreamlight", click: raisePlayer },
      ...(IS_MAC ? [
        { label: "Open at login", type: "checkbox", checked: app.getLoginItemSettings().openAtLogin, click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true }) },
      ] : process.platform === "win32" && app.isPackaged ? [
        { label: "Open at login", type: "checkbox", checked: app.getLoginItemSettings({ args: ["--hidden"] }).openAtLogin,
          click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, args: ["--hidden"] }) },
      ] : []),
      { label: "Quit Dreamlight", accelerator: "CommandOrControl+Q", click: () => app.quit() },
    ]);
  }

  tray.on("click", togglePopover);
  tray.on("right-click", () => tray.popUpContextMenu(contextMenu()));
  ipcMain.on("dl:resize", (event, height) => {
    if (event.sender !== pop.webContents || !pop.isVisible() || !Number.isFinite(height)) return;
    const bounded = Math.max(390, Math.min(580, Math.ceil(height)));
    if (pop.getSize()[1] !== bounded) placePopover(bounded);
  });

  ipcMain.on("dl:cmd", (event, name, ...args) => {
    if (event.sender !== pop.webContents) return;
    if (name === "open") { raisePlayer(); return; }
    if (name === "menu") { tray.popUpContextMenu(contextMenu()); return; }
    if (name === "hide") { pop.hide(); return; }
    run(name, ...args);
  });

  globalShortcut.register("CommandOrControl+Shift+Space", () => run("toggle"));
  app.on("will-quit", () => {
    clearInterval(timer);
    clearInterval(visibleTimer);
    globalShortcut.unregisterAll();
  });

  return { run, getState: () => evaluate("window.dreamlight?.getState()") };
};
