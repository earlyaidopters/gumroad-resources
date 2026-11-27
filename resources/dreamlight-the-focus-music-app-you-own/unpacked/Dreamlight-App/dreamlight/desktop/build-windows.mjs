#!/usr/bin/env node
// Build Dreamlight for Windows, and optionally install it.
//
//   node build-windows.mjs              builds ../dist/Dreamlight-win32-<arch>, a folder you can zip and share
//   node build-windows.mjs --install    builds it, then installs it for your user with Start menu and desktop shortcuts
//   node build-windows.mjs --uninstall  removes the installed app and its shortcuts (your settings are kept)
//   node build-windows.mjs --arch=arm64 builds for Windows on Arm (default: this PC's type, or x64 when built on a Mac)
//
// The build itself runs on Windows, macOS or Linux. Installing only works on Windows.
// No admin rights needed: it installs into %LOCALAPPDATA%\Programs\Dreamlight, like most per-user apps.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const arch = (args.find((a) => a.startsWith("--arch=")) || "").slice(7) || (process.platform === "win32" ? process.arch : "x64");
const OUT = path.join(ROOT, "dist", `Dreamlight-win32-${arch}`);
const VERSION = "1.0.0";

const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
const roaming = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const INSTALL_DIR = path.join(local, "Programs", "Dreamlight");
const START_MENU_LINK = path.join(roaming, "Microsoft", "Windows", "Start Menu", "Programs", "Dreamlight.lnk");

function powershell(script) {
  execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { stdio: "inherit" });
}

function stopRunningCopy() {
  try { execFileSync("taskkill.exe", ["/IM", "Dreamlight.exe", "/F", "/T"], { stdio: "ignore" }); } catch { return; }
  // Windows keeps the files locked for a moment after the app closes, so wait until it's really gone.
  for (let i = 0; i < 40; i++) {
    const list = execFileSync("tasklist.exe", ["/FI", "IMAGENAME eq Dreamlight.exe", "/NH"]).toString();
    if (!list.includes("Dreamlight.exe")) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
}
const removeFolder = (dir) => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });

function desktopLink() {
  // Ask Windows where the desktop is, since OneDrive often moves it.
  const desktop = execFileSync("powershell.exe", ["-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"]).toString().trim();
  return path.join(desktop || path.join(os.homedir(), "Desktop"), "Dreamlight.lnk");
}

if (flag("uninstall")) {
  if (process.platform !== "win32") { console.error("Uninstall only works on Windows."); process.exit(1); }
  stopRunningCopy();
  removeFolder(INSTALL_DIR);
  fs.rmSync(START_MENU_LINK, { force: true });
  fs.rmSync(desktopLink(), { force: true });
  console.log("Dreamlight is uninstalled. Your settings are still in %APPDATA%\\dreamlight if you want to delete them too.");
  process.exit(0);
}

if (flag("install") && process.platform !== "win32") {
  console.error("--install only works on Windows. On a Mac use ./build-mac.sh --install.");
  process.exit(1);
}

if (!fs.existsSync(path.join(ROOT, "web", "audio")) || !fs.readdirSync(path.join(ROOT, "web", "audio")).some((f) => f.endsWith(".mp3"))) {
  console.warn("No music in web/audio yet. Run  python get_music.py  in the main folder first, or the app will open with no tracks.");
}

// 1. The Windows Electron runtime, the same version npm installed.
const { version } = require("electron/package.json");
const { downloadArtifact } = await import("@electron/get");
const { extract } = await import("@electron-internal/extract-zip");
console.log(`Getting Electron ${version} for Windows (${arch})...`);
const zip = await downloadArtifact({ version, artifactName: "electron", platform: "win32", arch, checksums: require("electron/checksums.json") });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
await extract(zip, { dir: OUT });

// 2. Rename it and give it Dreamlight's icon and name.
const exe = path.join(OUT, "Dreamlight.exe");
fs.renameSync(path.join(OUT, "electron.exe"), exe);
fs.rmSync(path.join(OUT, "resources", "default_app.asar"), { force: true });
const { resedit } = await import("@electron/packager/resedit");
await resedit(exe, {
  iconPath: path.join(HERE, "assets", "icon.ico"),
  productName: "Dreamlight",
  fileVersion: VERSION,
  productVersion: VERSION,
  legalCopyright: "Free and open source under the MIT license",
  win32Metadata: { FileDescription: "Dreamlight", InternalName: "Dreamlight", OriginalFilename: "Dreamlight.exe", CompanyName: "Dreamlight" },
});

// 3. The app code and the web player.
const app = path.join(OUT, "resources", "app");
fs.mkdirSync(path.join(app, "assets"), { recursive: true });
for (const f of ["main.js", "menubar.js", "composio.js", "meeting-autoplay.js", "player-preload.js", "tray-preload.js", "tray.html"]) {
  fs.copyFileSync(path.join(HERE, f), path.join(app, f));
}
for (const f of ["icon.ico", "icon-1024.png", "tray-color.png", "tray-color@2x.png", "trayTemplate.png", "trayTemplate@2x.png"]) {
  fs.copyFileSync(path.join(HERE, "assets", f), path.join(app, "assets", f));
}
fs.writeFileSync(path.join(app, "package.json"), JSON.stringify({ name: "dreamlight", productName: "Dreamlight", version: VERSION, main: "main.js" }));
console.log("Copying the web player and music...");
fs.cpSync(path.join(ROOT, "web"), path.join(OUT, "resources", "web"), { recursive: true, filter: (src) => !path.basename(src).startsWith(".") });
console.log(`Built ${OUT}`);

// 4. Install for this user, with Start menu and desktop shortcuts.
if (flag("install")) {
  stopRunningCopy();
  removeFolder(INSTALL_DIR);
  fs.mkdirSync(path.dirname(INSTALL_DIR), { recursive: true });
  // Copy rather than move, since the project folder may be on a different drive.
  fs.cpSync(OUT, INSTALL_DIR, { recursive: true });
  fs.rmSync(path.join(ROOT, "dist"), { recursive: true, force: true });
  const target = path.join(INSTALL_DIR, "Dreamlight.exe");
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  const links = [START_MENU_LINK, ...(flag("no-desktop") ? [] : [desktopLink()])];
  powershell(`$s = New-Object -ComObject WScript.Shell; foreach ($p in @(${links.map(q).join(",")})) { New-Item -ItemType Directory -Force -Path (Split-Path $p) | Out-Null; $l = $s.CreateShortcut($p); $l.TargetPath = ${q(target)}; $l.WorkingDirectory = ${q(INSTALL_DIR)}; $l.IconLocation = ${q(target + ",0")}; $l.Description = 'Dreamlight focus music'; $l.Save() }`);
  console.log(`Installed ${INSTALL_DIR}`);
  console.log("Open Dreamlight from the Start menu or your desktop. It lives in the system tray (bottom right, next to the clock) while it plays.");
}
