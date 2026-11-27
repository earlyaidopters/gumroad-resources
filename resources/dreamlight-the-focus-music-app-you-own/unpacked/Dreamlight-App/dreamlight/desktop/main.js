const { app, BrowserWindow, Menu, nativeImage, nativeTheme, ipcMain, shell, Notification, powerMonitor } = require("electron");
const setupMenuBar = require("./menubar");
const composio = require("./composio");
const { createMeetingAutoplay } = require("./meeting-autoplay");

// Meeting auto-play starts music with no click, so allow audio without a user gesture.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
const fs = require("fs");
const http = require("http");
const path = require("path");

const APP_ID = "app.dreamlight.focus";
const IS_MAC = process.platform === "darwin";
const IS_WINDOWS = process.platform === "win32";
// Jump list and second launches pass a player command like --dreamlight=toggle.
const commandFrom = (argv) => {
  const arg = argv.find((a) => a.startsWith("--dreamlight="));
  if (!arg) return null;
  const [name, value] = arg.slice(13).split(":");
  return value === undefined ? [name] : [name, Number(value)];
};

// One copy at a time. Opening Dreamlight again brings the running window forward.
if (!app.requestSingleInstanceLock()) app.exit(0);
if (IS_WINDOWS) app.setAppUserModelId(APP_ID); // groups the taskbar icon and lets notifications show
if (!IS_MAC) nativeTheme.themeSource = "dark"; // dark title bar and menus on Windows and Linux, to match the player

// Packaged app: web/ ships inside Resources. Dev: the sibling ../web folder.
const WEB_DIR = app.isPackaged ? path.join(process.resourcesPath, "web") : path.resolve(__dirname, "..", "web");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
};

function startOfflineStaticServer() {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
    let relPath = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, "");
    if (!relPath) relPath = "index.html";
    if (relPath === "api/tracks") relPath = "tracks.json";
    const fullPath = path.resolve(WEB_DIR, relPath);
    if (!fullPath.startsWith(WEB_DIR + path.sep) && fullPath !== WEB_DIR) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.stat(fullPath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const range = req.headers.range;

      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        if (match) {
          const start = match[1] ? parseInt(match[1], 10) : 0;
          const end = match[2] ? Math.min(parseInt(match[2], 10), stat.size - 1) : stat.size - 1;
          if (start >= stat.size || start > end) {
            res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
            res.end();
            return;
          }
          res.writeHead(206, {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
          });
          fs.createReadStream(fullPath, { start, end }).pipe(res);
          return;
        }
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": stat.size,
      });
      fs.createReadStream(fullPath).pipe(res);
    });
  });

  return new Promise((resolve, reject) => {
    let port = 47821;
    server.on("error", (error) => {
      if (error.code !== "EADDRINUSE" || port === 0) return reject(error);
      port = 0;
      server.listen(port, "127.0.0.1");
    });
    server.once("listening", () => resolve({ server, port: server.address().port }));
    server.listen(port, "127.0.0.1");
  });
}

let staticServer = null;
let mainWindow = null;
let autoplay = null;
let connectPollTimer = null;
let connectPollDeadline = 0;

function stopConnectPoll() {
  if (connectPollTimer) {
    clearInterval(connectPollTimer);
    connectPollTimer = null;
  }
  connectPollDeadline = 0;
}

function pushConnectionStatus(status) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("dreamlight:connections:status", status);
}

function startConnectPoll() {
  stopConnectPoll();
  connectPollDeadline = Date.now() + 2 * 60 * 1000;
  connectPollTimer = setInterval(async () => {
    if (Date.now() > connectPollDeadline || !mainWindow || mainWindow.isDestroyed()) {
      stopConnectPoll();
      return;
    }
    try {
      const next = await composio.status();
      pushConnectionStatus(next);
      if (next.ok && next.connected) stopConnectPoll();
    } catch {
      stopConnectPoll();
    }
  }, 3000);
}

function preferencesPath() {
  return path.join(app.getPath("userData"), "dreamlight-preferences.json");
}

ipcMain.on("dreamlight:prefs:read", (event) => {
  let data = null;
  if (event.sender === mainWindow?.webContents) {
    try { data = fs.readFileSync(preferencesPath(), "utf8"); } catch {}
  }
  event.returnValue = data;
});
ipcMain.on("dreamlight:prefs:write", (event, data) => {
  if (event.sender !== mainWindow?.webContents || typeof data !== "string" || data.length > 65536) return;
  const file = preferencesPath();
  try {
    fs.writeFileSync(`${file}.tmp`, data);
    fs.renameSync(`${file}.tmp`, file);
  } catch (error) {
    console.warn("Could not save Dreamlight preferences:", error.message);
  }
});

ipcMain.handle("dreamlight:connections:status", async (event) => {
  if (event.sender !== mainWindow?.webContents) {
    return { ok: false, code: "FORBIDDEN", message: "Unauthorized sender." };
  }
  return composio.status();
});

ipcMain.handle("dreamlight:connections:connect", async (event) => {
  if (event.sender !== mainWindow?.webContents) {
    return { ok: false, code: "FORBIDDEN", message: "Unauthorized sender." };
  }
  const result = await composio.connect();
  if (!result.ok) return result;
  try {
    await shell.openExternal(result.redirectUrl);
  } catch {
    return { ok: false, code: "OPEN_BROWSER_ERROR", message: "Could not open the browser to connect Google Calendar." };
  }
  startConnectPoll();
  return { ok: true, opened: true, polling: true };
});

ipcMain.handle("dreamlight:autoplay:status", async (event) => {
  if (event.sender !== mainWindow?.webContents || !autoplay) return { ok: false, code: "UNAVAILABLE" };
  return autoplay.status();
});

ipcMain.handle("dreamlight:autoplay:set", async (event, patch) => {
  if (event.sender !== mainWindow?.webContents || !autoplay) return { ok: false, code: "UNAVAILABLE" };
  if (!patch || typeof patch !== "object") return { ok: false, code: "INVALID_INPUT" };
  return autoplay.setSettings({ enabled: patch.enabled, activity: patch.activity, delayMinutes: patch.delayMinutes });
});

ipcMain.handle("dreamlight:connections:addFocusBlock", async (event, payload) => {
  if (event.sender !== mainWindow?.webContents) {
    return { ok: false, code: "FORBIDDEN", message: "Unauthorized sender." };
  }
  if (!payload || typeof payload !== "object") {
    return { ok: false, code: "INVALID_INPUT", message: "Focus block details are required." };
  }
  return composio.createFocusBlock({
    summary: payload.summary,
    start: payload.start,
    end: payload.end,
    description: payload.description,
  });
});

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function createWindow() {
  const { server, port } = await startOfflineStaticServer();
  staticServer = server;
  const baseUrl = `http://127.0.0.1:${port}`;

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: "#0a0e17",
    title: "Dreamlight",
    show: !process.argv.includes("--hidden"), // Windows "Open at login" starts in the tray
    ...(IS_MAC ? {} : { icon: path.join(__dirname, "assets", IS_WINDOWS ? "icon.ico" : "icon-1024.png") }),
    // Same chrome as the Claude version on a Mac: no title bar, traffic lights inside the header.
    // Windows and Linux keep their normal frame so the window buttons stay visible.
    ...(IS_MAC ? { titleBarStyle: "hidden", trafficLightPosition: { x: 12, y: 12 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, "player-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // keep audio, timers and the menu bar live when hidden
    },
  });

  if (!IS_MAC) mainWindow.removeMenu(); // no File / Edit / View bar on Windows and Linux
  mainWindow.loadURL(`${baseUrl}/`);

  // Closing the window keeps Dreamlight playing in the menu bar (Mac) or system tray (Windows).
  // Quit from there, or with Cmd+Q on a Mac.
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });

  const syncVisibility = () => {
    const visible = mainWindow.isVisible() && !mainWindow.isMinimized();
    mainWindow.webContents.executeJavaScript(`window.dreamlight?.setWindowVisible(${visible})`).catch(() => {});
  };
  ["show", "hide", "restore", "minimize"].forEach((event) => mainWindow.on(event, syncVisibility));
  mainWindow.webContents.on("did-finish-load", syncVisibility);

  const remote = setupMenuBar({ getMainWindow: () => mainWindow, showMainWindow, baseUrl, getAutoplay: () => autoplay });

  autoplay = createMeetingAutoplay({
    listEvents: (range) => composio.listEvents(range),
    startSession: (activity) => remote.run("startActivity", activity),
    isPlaying: async () => Boolean((await remote.getState())?.playing),
    notify: (settings) => {
      if (!Notification.isSupported()) return;
      new Notification({ title: "Meeting's over", body: `Dreamlight started a focus session, ${settings.delayMinutes} min after your meeting.`, silent: true }).show();
    },
    onStatus: (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("dreamlight:autoplay:status", status);
    },
    settingsPath: path.join(app.getPath("userData"), "meeting-autoplay.json"),
    cachePath: path.join(app.getPath("userData"), "meeting-schedule.json"),
    logPath: path.join(app.getPath("userData"), "meeting-autoplay.log"),
  });
  autoplay.start();
  powerMonitor.on("resume", () => { autoplay.refresh().then(() => autoplay.tick()).catch(() => {}); });

  const pending = commandFrom(process.argv);
  if (pending) mainWindow.webContents.once("did-finish-load", () => setTimeout(() => remote.run(...pending), 1500));
  app.on("second-instance", (_event, argv) => {
    const command = commandFrom(argv);
    if (command) remote.run(...command);
    else showMainWindow();
  });

  if (IS_WINDOWS) {
    // Right-click the taskbar icon for the same quick controls as the Mac Dock menu.
    const task = (title, command) => ({ program: process.execPath, arguments: `${app.isPackaged ? "" : `"${app.getAppPath()}" `}--dreamlight=${command}`,
      iconPath: process.execPath, iconIndex: 0, title, description: title });
    app.setUserTasks([task("Play / Pause", "toggle"), task("Next track", "next"), task("25 min timer", "setTimer:25"), task("50 min timer", "setTimer:50")]);
    // Tag the Start menu shortcut made by the installer, so Windows shows Dreamlight's notifications.
    const link = path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "Dreamlight.lnk");
    if (app.isPackaged && fs.existsSync(link)) {
      try { shell.writeShortcutLink(link, "update", { appUserModelId: APP_ID }); } catch {}
    }
  }

  if (IS_MAC && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, "assets", "icon-1024.png")));
    app.dock.setMenu(Menu.buildFromTemplate([
      { label: "Play / Pause", click: () => remote.run("toggle") },
      { label: "Next track", click: () => remote.run("next") },
      { label: "25 min timer", click: () => remote.run("setTimer", 25) },
      { label: "50 min timer", click: () => remote.run("setTimer", 50) },
    ]));
  }
}

app.on("before-quit", () => { app.isQuitting = true; stopConnectPoll(); autoplay?.stop(); staticServer?.close(); });

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (!IS_MAC) { if (staticServer) staticServer.close(); app.quit(); }
});

app.on("activate", () => {
  if (mainWindow) showMainWindow();
  else createWindow();
});
