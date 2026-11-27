# Prompt to Build the Offline Desktop Wrapper

You can paste the short prompt below into any coding agent (Claude, Codex, Gemini, Cursor, etc.) to build a minimal offline Electron wrapper around the static `web/` folder. It is the basic app this desktop version started from; the shipped `desktop/` adds Mac and Windows installers, the menu bar or tray remote, the Dock or taskbar timer and the optional Composio calendar.

---

> Create a minimal Electron desktop app in `desktop/` that wraps the static web player in `../web/`.
>
> Requirements:
> - Load `../web/index.html` and all local assets (`tracks.json`, `covers/`, `covers/loops/`, `motion/`, and `audio/`) completely offline from disk, with no accounts, no remote network requests, no analytics, and no extra npm packages beyond `electron`.
> - Serve `../web/` over a tiny built-in Node `http` server bound to `127.0.0.1` on an ephemeral port (`0`) with HTTP `Range` (`206 Partial Content`) support so 1-hour local MP3s seek instantaneously and Web Audio `AnalyserNode` works cleanly without `file://` CORS restrictions.
> - Open a dark-themed `BrowserWindow` (`#03050c` background, 1320×860, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
> - Keep `desktop/main.js` under ~110 lines and easy to read.
> - Running `npm install && npm start` inside `desktop/` must launch the app. Do not add code-signing or installer packaging.
