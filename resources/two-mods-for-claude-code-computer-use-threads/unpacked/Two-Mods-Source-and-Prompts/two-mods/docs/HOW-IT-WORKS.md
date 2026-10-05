# How the two mods work

## Computer Use: Claude decides, Codex controls the apps

You ask Claude to calculate a yearly cost and put it in a document. Claude chooses the actions. The mod sends those actions to the computer controls bundled with the ChatGPT Mac app. Those controls click and type. Claude reads what changed and decides what to do next.

Those local controls speak **MCP**: a standard way for an AI app to call an outside tool. This package connects to the locally installed server. It does not contain OpenAI’s runtime or start a separate Codex reasoning model.

Three pieces make the connection usable:

1. **The launcher starts the controls.** It reads the newest installed computer-use settings and starts the configured program. This avoids a fixed version folder, but future changes can still break compatibility.
2. **The helper keeps the conversation open.** It runs in the background, carries tool requests, and answers app-approval questions using your choices. Each Claude caller gets its own connection. The helper also stops callers from competing over the same app while a lease is active.
3. **The mod puts this inside Claude.** It adds the callable tool, the approval panel and `/codex-cu` commands. While on, it blocks Claude’s built-in desktop computer-use route. Purpose-built APIs, CLI tools and browser tools remain available.

The first app request may ask you to allow the app for this session, always, or deny it. Saved choices belong to your machine. Auto-approve is a separate option, off in a fresh installation. A normal permission denial is not something the bridge should bypass.

## Threads: one chat organizes separate sessions

A helper here means a real Claude Code session with a job, a model and its own conversation. It is different from the background connection helper described above.

- **Start:** the mod runs Claude’s terminal command with a model, title and task.
- **Keep running:** `tmux` holds the terminal session in the background, without a new visible terminal window.
- **Watch:** the mod checks the session’s progress records and terminal state.
- **Steer:** the lead sends a message to the helper. When needed, it can type into that background terminal.
- **Collect:** the finished answer returns to the lead chat and appears in the panel.

Remote Control can make those sessions available in the desktop app. The automatic backend is CLI + tmux; the optional native-threads skill describes another route that requires native app tools and a manual start. Neither route makes unavailable account features appear.

A plan is helpers running one after another, each leaving a note for the next. A worktree is a separate copy of a Git project on another branch. It keeps simultaneous edits apart; it does not guarantee a conflict-free merge later.

## Build tools versus app-control tools

While building a mod, Claude reads files, writes code and runs tests. After installation, the new mod exposes its own tools to the chat. The demo prompt explicitly asks for real app interactions so a script writing a text file cannot stand in for the shown Calculator/TextEdit workflow.
