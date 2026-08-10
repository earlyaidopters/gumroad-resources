# Build an Agent Surveillance Dashboard for Claude Code

## What You're Building

A real-time web dashboard that monitors Claude Code agent teams as they work. Think of it as a mission control center — you see every agent on the roster, every message they send, and every task moving across a kanban board, all updating live. When agents finish and the team is deleted, the session is preserved in a SQLite database so you can browse historical sessions later.

The dashboard is packaged as a **Claude Code skill** — a reusable capability that Claude can invoke automatically whenever it spins up a multi-agent team.

---

## Architecture: One File to Rule Them All

Build the entire dashboard as a **single Node.js file** (~1700 lines). No build step, no bundler, no framework. The server embeds all HTML, CSS, and JavaScript inside a template literal returned by a `getHTML()` function. This makes it trivially portable — one file, one `node server.js`, done.

```
scripts/server.js    ← The entire application
SKILL.md             ← Instructions for Claude on how to use it
package.json         ← Just one dependency: better-sqlite3
```

### Why monolithic?

- Zero build complexity — no webpack, no vite, no React
- Instant startup — `node server.js` and you're live
- Easy to ship as a skill — copy one directory
- Claude Code agents can read and edit a single file easily

---

## The Data Sources

Claude Code stores team/agent/task data as JSON files on disk:

```
~/.claude/teams/{team-name}/config.json    ← Team config with member list
~/.claude/teams/{team-name}/inbox/         ← Message files per agent
~/.claude/tasks/{team-name}/               ← Task JSON files
```

Your server watches these directories and transforms the raw files into a unified state object that the frontend renders.

### State shape

```javascript
{
  teams: {
    "my-team": {
      name: "my-team",
      members: [
        { name: "researcher", agentType: "general-purpose", model: "claude-sonnet-4-5-20250929", isLead: false },
        { name: "team-lead", agentType: "team-lead", model: "claude-opus-4-6", isLead: true }
      ]
    }
  },
  inboxes: {
    "my-team/researcher": [
      { from: "team-lead", text: "Start working on task #1", timestamp: "2026-02-08T..." }
    ]
  },
  tasks: {
    "my-team/1": { id: "1", subject: "Research competitors", status: "in_progress", owner: "researcher" }
  }
}
```

---

## File Watching Strategy

**Do NOT rely solely on `fs.watch()`**. On macOS, `fs.watch({ recursive: true })` silently misses events. Use a dual strategy:

1. **`fs.watch()`** for instant detection when it works
2. **Polling every 2 seconds** as a safety net that always works

```javascript
// Always poll — fs.watch is unreliable on macOS
setInterval(() => {
  scanTeamsDirectory();
  scanTasksDirectory();
  scanInboxes();
}, 2000);

// Also watch for instant response when available
fs.watch(TEAMS_DIR, { recursive: true }, debounce(scanTeamsDirectory));
fs.watch(TASKS_DIR, { recursive: true }, debounce(scanTasksDirectory));
```

Debounce filesystem callbacks (200ms) to avoid processing the same change multiple times.

---

## Real-Time Push: SSE (Server-Sent Events)

Use SSE over WebSockets. It's simpler, works through proxies, and auto-reconnects. The client opens a single `EventSource` connection and receives typed events:

```javascript
// Server
sseClients.forEach(client => {
  client.write(`data: ${JSON.stringify({ type: 'inbox_updated', team: 'my-team', key: 'my-team/researcher', data: messages })}\n\n`);
});

// Client
var evtSource = new EventSource('/api/events');
evtSource.onmessage = function(ev) {
  var msg = JSON.parse(ev.data);
  switch(msg.type) {
    case 'full_state':     // Complete state refresh
    case 'team_updated':   // Single team changed
    case 'team_removed':   // Team deleted
    case 'inbox_updated':  // New messages for an agent
    case 'task_updated':   // Task status changed
    case 'task_deleted':   // Task removed
    case 'lock_changed':   // Task file lock status
  }
};
```

Guard all SSE handlers on the client: only call render functions when `currentMode === 'live'` to prevent live data from overwriting historical views.

---

## SQLite Persistence

Use `better-sqlite3` for synchronous, fast SQLite access. Wrap the require in try/catch for graceful degradation — if SQLite fails to load (native module issues), the dashboard still works in memory-only mode.

### Schema

```sql
sessions     ← One row per team lifecycle (created → ended)
agents       ← Team members, linked to session
messages     ← All inbox messages, deduplicated by (session, agent, from, timestamp)
tasks        ← Task snapshots, deduplicated by (session, task_id)
agent_events ← Status changes (joined, idle, shutdown)
```

### Session lifecycle

1. When a new team appears in `~/.claude/teams/`, create a session row
2. Upsert agents, messages, and tasks as they change
3. When the team directory disappears, set `ended_at` on the session
4. Historical sessions persist forever in SQLite until manually deleted

### Deduplication

Use `INSERT OR REPLACE` with unique indexes to avoid duplicate rows when polling re-reads the same data:

```sql
CREATE UNIQUE INDEX idx_messages_dedup ON messages(session_id, inbox_agent, from_agent, timestamp);
CREATE UNIQUE INDEX idx_tasks_dedup ON tasks(session_id, task_id);
```

---

## The Frontend

### Layout (3-panel + header)

```
┌─────────────────────────────────────────────────────┐
│  Agent Dashboard          [Live] [History]  ☀ ● Live │
├──────────┬──────────────────────────────────────────┤
│  AGENT   │  MESSAGES                           (12) │
│  ROSTER  │  ┌─────────────────────────────────┐     │
│          │  │ researcher → team-lead    2m ago │     │
│ ┌──────┐ │  │ Task completed: Research done    │     │
│ │ R    │ │  └─────────────────────────────────┘     │
│ │ resea│ │                                          │
│ └──────┘ │  TASK BOARD                              │
│ ┌──────┐ │  Pending (1)  │ In Progress (2) │ Done(3)│
│ │ T    │ │  ┌──────────┐ │ ┌─────────────┐ │       │
│ │ team-│ │  │ Task #4   │ │ │ Task #2     │ │       │
│ └──────┘ │  └──────────┘ │ └─────────────┘ │       │
└──────────┴──────────────────────────────────────────┘
```

### Design system

- **Dark mode default** with a light mode toggle (save preference to localStorage)
- CSS custom properties for theming: `--bg1`, `--bg2`, `--t1`, `--t2`, `--accent`, `--border`
- System sans-serif font stack
- Glassmorphism-lite: subtle `backdrop-filter: blur` on cards
- Colored avatar circles with first-letter initials
- Agent color assignment: define a palette of 8+ colors, assign by index

### Messages

- Flat chronological feed (newest at bottom, auto-scroll)
- Each message shows: colored avatar, sender name → recipient name, relative timestamp, text preview
- **Protocol messages** (JSON with a `type` field) get rendered as styled cards:
  - `task_assignment` — clipboard icon, shows task subject and description
  - `idle_notification` — moon icon
  - `shutdown_request` / `shutdown_response` — timer icon
  - `plan_approval_request` — document icon
- **Plain text messages** get markdown rendering (bold, italic, headings, code, lists)
- Truncate long messages with "Show more" / "Show less" toggle
- Click any message to open a **thread modal** showing the full conversation between those two agents

### Task board (kanban)

- 3 columns: Pending, In Progress, Completed
- Each card shows: task ID badge, subject, owner tag, blocked/blocks badges
- **Filter out system tasks**: auto-generated agent-tracking tasks (where `subject` matches a lowercase agent name and has no description) should be hidden

### History mode

- Toggle "History" in the header to show a grid of session cards
- Each card shows: team name, agent count, message count, task count, date range, ENDED badge
- Hover to reveal a Delete button (with cascade delete through all related tables)
- Click a card to load the full session detail into the same 3-panel layout
- Show a banner: "Viewing historical session — {team} — {date} to {date}" with a "Back to History" button

---

## API Endpoints

```
GET  /                              → Serve the HTML page
GET  /api/state                     → Full live state object
GET  /api/events                    → SSE stream
GET  /api/sessions                  → List historical sessions with counts
GET  /api/sessions/:id              → Session detail with agents array
GET  /api/sessions/:id/messages     → Paginated messages (?limit=N&offset=N)
GET  /api/sessions/:id/tasks        → All tasks for a session
DELETE /api/sessions/:id            → Delete session (cascade all related data)
POST /api/messages/:id/read         → Mark message as read
POST /api/threads/read              → Mark thread as read (body: {session_id, thread_id})
```

Set `Cache-Control: no-store, no-cache, must-revalidate` on the HTML response to prevent stale browser pages.

---

## The Skill File (SKILL.md)

This is what tells Claude HOW to use the dashboard. It's a markdown file with YAML frontmatter:

```yaml
---
name: agent-surveillance
description: Launch a real-time web dashboard to monitor Claude Code agent teams...
---
```

The skill prompt should include:
1. **When to invoke** — automatically before any TeamCreate or multi-agent workflow
2. **Step-by-step launch** — check port, start server, verify with curl, open browser
3. **What the user sees** — describe the UI modes
4. **Troubleshooting** — kill port, rebuild native deps, memory-only fallback
5. **Architecture reference** — so future Claude sessions understand the codebase
6. **Template literal coding rules** — the critical regex table (see below)

---

## CRITICAL: Template Literal Survival Guide

Since all client-side code lives inside a Node.js template literal (`getHTML()` returns a backtick string), you MUST follow these rules for any regex patterns or special characters:

### The problem

In JavaScript template literals, a backslash `\` followed by a character that isn't a recognized escape sequence silently drops the backslash. So `\*` becomes `*`, `\.` becomes `.`, `\w` becomes `w`, etc.

This means `/\*\*(.+?)\*\*/g` (match bold markdown) becomes `/**(.+?)**/g` — a broken regex that crashes at runtime. And `node -c` syntax checking PASSES because the template literal is valid Node.js — the error only shows up in the browser.

### The rules

| NEVER write this in a template literal | Write this instead | Why it works |
|----------------------------------------|-------------------|--------------|
| `\w` | `[a-zA-Z0-9_]` | Character class, no backslash |
| `\d` | `[0-9]` | Character class, no backslash |
| `\s` | `[ \t\n\r]` | Character class, no backslash |
| `\b` | Restructure the regex | Word boundary breaks silently |
| `\*` | `[*]` | `*` is literal inside `[]` |
| `\.` | `[.]` | `.` is literal inside `[]` |
| `` ` `` (backtick) | `\x60` | `\x` is a RECOGNIZED hex escape |
| `(?<!...)` | Avoid entirely | Lookbehinds crash some browsers |

### Why `\x60` works but `\*` doesn't

`\x` is a recognized JavaScript escape sequence (hex escape). So `\x60` is properly processed into the backtick character (U+0060). But `\*` is NOT a recognized escape — JavaScript says "I don't know what `\*` means" and drops the backslash.

### Testing

Always verify your template literal output by fetching the served HTML and inspecting the regex patterns:

```bash
curl -s http://localhost:PORT/ | grep 'replace'
```

If you see `/**(.+?)**/g` instead of `/[*][*](.+?)[*][*]/g`, the template literal ate your backslashes.

---

## Server Auto-Open Browser

Make the server cross-platform for opening the browser:

```javascript
const url = `http://localhost:${port}`;
if (process.platform === 'darwin') execSync(`open "${url}"`);
else if (process.platform === 'linux') execSync(`xdg-open "${url}"`);
else if (process.platform === 'win32') execSync(`start "${url}"`);
```

---

## Putting It All Together

### Directory structure

```
~/.claude/skills/agent-surveillance/
  SKILL.md           ← Skill definition (Claude reads this)
  package.json       ← { "dependencies": { "better-sqlite3": "^11.0.0" } }
  scripts/
    server.js        ← The entire application (~1700 lines)
```

### The build sequence

1. Set up the Node.js HTTP server with routing
2. Implement file scanning (teams, inboxes, tasks)
3. Add fs.watch + polling for live updates
4. Implement SSE push to connected clients
5. Build the SQLite persistence layer with session management
6. Create the `getHTML()` function with all embedded CSS and JS
7. Implement the frontend: theme system, roster, messages, task board
8. Add history mode with session cards and detail view
9. Add the thread modal, markdown renderer, protocol card renderer
10. Write the SKILL.md with launch instructions and architecture docs
11. Test by creating a Claude Code team and watching the dashboard

### Key design decisions

- **No frameworks**: Vanilla JS keeps the single-file approach viable and avoids build complexity
- **SSE over WebSockets**: Simpler, auto-reconnects, works through reverse proxies
- **Polling as safety net**: Never trust filesystem events alone on macOS
- **Graceful SQLite degradation**: The dashboard should always work, even without native modules
- **Fixed port (3847)**: Predictable URL across sessions, no port-hunting
- **System tasks filtered**: Agent-tracking tasks are noise — hide them from the kanban
- **No-cache headers**: Prevents the browser from showing stale dashboard versions after code changes
- **Dark mode default**: Developers prefer dark mode, and it looks better for a "surveillance" aesthetic

---

## One Last Thing

The most important lesson from building this: **test in the actual browser, not just Node.js**. The template literal mangling is invisible to `node -c`, invisible to your linter, invisible to your tests. The only way to catch it is to `curl` the served HTML and inspect what the browser actually receives. Build that verification into your workflow from day one.
