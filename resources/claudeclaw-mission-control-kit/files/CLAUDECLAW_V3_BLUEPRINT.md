# Hive Mind Blueprint

> Read `DISCLAIMER.md` first. This document describes one specific architecture. It is not advice. Test everything before relying on it.

---

## The thesis in one sentence

An operating system, when you get to brass tacks, is a data engineering exercise. It is putting the right files in the right place at the right time.

Everything in this kit is a long elaboration on that one sentence.

---

## What an "AI OS" actually is

The category has many names. Agentic OS. AIOS. AI operating system. Personal AI assistant. The label drifts every few weeks.

What it actually is, underneath all the names, is three layers stacked on top of each other:

```
┌─────────────────────────────────────────────────┐
│  THE BRIDGE  (your portable interface)          │
│  Telegram, Slack, Discord, web dashboard        │
├─────────────────────────────────────────────────┤
│  THE WRAPPER  (the orchestration)               │
│  agents, skills, scheduler, memory, hive mind   │
├─────────────────────────────────────────────────┤
│  THE BRAIN  (the engine)                        │
│  Claude Code (or Codex, or whatever swap)       │
└─────────────────────────────────────────────────┘
                       │
                       ▼
        Your local computer's filesystem
        and SQLite database
```

The brain is replaceable. The bridge is replaceable. The orchestration layer is the only thing that's yours.

---

## The four ingredients of the orchestration layer

If you reduce the Hive Mind to its essential parts, there are four:

**1. Agents** — folders containing two files each. `agent.yaml` declares what model the agent uses and which tools it can call. `CLAUDE.md` declares its personality and what it cares about. That's it. An agent is just a folder with two files.

**2. Skills** — folders containing a `SKILL.md` declaration plus optional `scripts/`, `references/`, and `assets/` subfolders. Skills are the reusable knowledge and tools that any agent can call. Skills are auto-discovered by the orchestrator. Add a folder, the agents find it.

**3. The database** — a single SQLite file storing memory, conversation history, hive mind activity, scheduled tasks, audit log entries, and meeting transcripts. WAL mode plus a 5 second busy timeout is the entire IPC story. Multiple agent processes read and write to the same database without explicit locks or message buses.

**4. The bridge** — a thin layer that exposes the orchestrator to wherever you actually want to interact with it. For most people that's Telegram because it's the most reliable on the go. Slack and Discord work too. The choice doesn't matter much, the architecture is the same.

---

## Why this works

Three properties make this architecture durable.

**It is file-based and folder-based.** Configuration lives in flat files. Agents are folders. Skills are folders. Templates are folders. There is no hidden state in some opaque database table. If you can navigate a filesystem, you can audit, modify, version, and back up your entire setup. Git works on it. Diff works on it. `cp -r` works on it.

**It is process-isolated.** Each agent runs in its own OS process. They share data through a single SQLite database with WAL mode enabled. If one agent crashes, it does not take down the others. If you need to restart a sub-agent, the main keeps running. There is no shared in-memory state to corrupt.

**The brain is decoupled from the orchestration.** The orchestration layer talks to Claude Code through a stable interface (the CLI or the SDK). Tomorrow when a better brain exists, you swap the brain. The skills, agents, memory, scheduler, war room, audit log, and bridge stay where they are.

---

## The data model in one diagram

```
┌──────────────────────────────────────────────────┐
│  ~/.claudeclaw/  (or wherever you put your root) │
├──────────────────────────────────────────────────┤
│                                                  │
│  agents/                                         │
│    main/                                         │
│      agent.yaml      (model + tools)             │
│      CLAUDE.md       (personality)               │
│    comms/                                        │
│      agent.yaml                                  │
│      CLAUDE.md                                   │
│    content/                                      │
│      agent.yaml                                  │
│      CLAUDE.md                                   │
│    ops/                                          │
│      agent.yaml                                  │
│      CLAUDE.md                                   │
│    research/                                     │
│      agent.yaml                                  │
│      CLAUDE.md                                   │
│    _template/        (copy + rename to add new)  │
│                                                  │
│  skills/                                         │
│    timezone/                                     │
│      SKILL.md                                    │
│    gmail/                                        │
│      SKILL.md                                    │
│      scripts/                                    │
│      references/                                 │
│    meta-ads-cli/                                 │
│      SKILL.md                                    │
│    ... (every skill is a folder)                 │
│                                                  │
│  store/                                          │
│    claudeclaw.db    (the one SQLite file)        │
│                                                  │
│  CLAUDE.md          (global rules)               │
│  .env               (API keys, gitignored)       │
│                                                  │
└──────────────────────────────────────────────────┘
```

That is the entire Hive Mind on disk. Four folders, one database file, two top-level config files.

If you walked into someone's existing AI setup and saw this structure, you would know within thirty seconds what they had built. That's the whole point of file-based architecture.

---

## What's inside the database

The SQLite file at `store/claudeclaw.db` typically holds these tables. The exact schema is in `REFERENCE_GUIDES/DATABASE_SCHEMA.md`.

| Table | Purpose |
|---|---|
| `agents` | Agent registry — id, name, status, model, telegram bot token reference |
| `conversation_log` | Every user message and agent response across all channels |
| `memory` | Long-lived facts and observations with importance, salience, recency scores |
| `memory_consolidations` | Insights generated by periodic memory analysis |
| `hive_mind_log` | Cross-agent activity log — who did what, when, summary |
| `scheduled_tasks` | Cron-style task definitions and last/next run times |
| `mission_tasks` | Queued, running, and completed tasks routed to agents |
| `warroom_transcript` | Multi-agent council messages from /standup and /discuss |
| `audit_log` | Every tool call, kill switch flip, and state-changing action |
| `embeddings` | Vector embeddings for semantic memory search |

WAL mode plus a 5 second busy timeout is the entire IPC story. No message bus, no queue daemon, no Redis, no cloud database. One file. Multiple processes.

---

## The three-layer memory pattern

Memory in this system is not a single vector store. It is a hybrid with three layers stacked on top of each other and ranked together:

1. **Keyword search** (FTS5 index over the memory text)
2. **Semantic embeddings** (vector cosine similarity)
3. **Salience scoring** (how important the memory has been across past retrievals)

When an agent asks "what do I know about X," the system queries all three layers, merges the results, weights them, and returns a ranked list. Memories also have an importance field (0 to 1) that the user or the system can pin, plus a recency decay that slowly demotes old unused memories until they're swept out by a periodic decay job.

The pattern is documented in detail in `REFERENCE_GUIDES/MEMORY_TIERING_GUIDE.md`. The Memory Architect Kit on Gumroad covers the design philosophy and tradeoffs.

---

## The war room pattern

The war room is a special context where multiple agents respond to one prompt simultaneously. Two slash commands run the room:

- `/standup` — every agent gives a brief morning report on what they wrapped, what's queued, what's blocked
- `/discuss <question>` — every agent weighs in on the question with their unique angle, then a consolidator synthesizes their responses

The implementation pattern is in `REFERENCE_GUIDES/WAR_ROOM_PROMPT_PATTERNS.md`. The trick is that each agent gets the conversation context plus their own memory plus their own pinned status, but the agents do not see each other's responses while they are generating. The consolidator runs last and sees everything.

This pattern works because each agent has a different personality, knowledge base, and tool allowlist. So you don't get one opinion. You get a council.

---

## The kill switch pattern

Six kill switches sit on top of the system. Each is a single boolean in `.env` that the orchestrator checks at the appropriate boundary:

| Switch | Gates |
|---|---|
| `LLM_SPAWN_ENABLED` | Every LLM API call (text, voice, agent chat, scheduler) |
| `WARROOM_TEXT_ENABLED` | The text war room |
| `WARROOM_VOICE_ENABLED` | The voice war room |
| `DASHBOARD_MUTATIONS_ENABLED` | All POST/PUT/DELETE routes on the dashboard |
| `MISSION_AUTO_ASSIGN_ENABLED` | The Gemini classifier that auto-assigns tasks |
| `SCHEDULER_ENABLED` | All scheduled task execution |

Kill switches hot-reload in roughly two seconds without restarting the system. If you flip `LLM_SPAWN_ENABLED=false` in `.env` and try to ask an agent something, the system refuses and tells you the switch is off. This is incident-response, not security. For security you also need the audit log and the exfiltration guard.

The pattern is in `REFERENCE_GUIDES/KILL_SWITCHES_GUIDE.md`.

---

## The audit log pattern

Every state-changing action in the system writes a row to `audit_log`. Every tool call by every agent. Every kill switch flip. Every dashboard configuration change. Every restored CLAUDE.md.

The log is append-only with a 90-day retention. If something happens, you can always trace it back. This is the failure-mode backstop. When you're running a real business through this system, "I have no idea what happened" is not an acceptable answer to anyone.

The pattern is in `REFERENCE_GUIDES/AUDIT_LOG_GUIDE.md`.

---

## The exfiltration guard

The orchestrator scans agent outputs before they're sent to any external destination (Telegram, email, file write) and refuses to transmit content matching specific patterns:

- `sk-ant-...` (Claude API keys)
- `xoxb-...`, `xoxa-...`, `xoxp-...` (Slack tokens)
- `ghp_...`, `gho_...`, `ghs_...` (GitHub tokens)
- `AKIA...` (AWS access keys)
- Generic high-entropy strings exceeding heuristic thresholds

This catches the case where an agent is socially-engineered (or buggy) into echoing a key it has access to. Combined with the tool allowlist (per-agent, default-deny on side-effect tools), it gives you three independent layers of refusal.

The pattern is in `REFERENCE_GUIDES/EXFILTRATION_GUARD.md`.

---

## The auto-assign pattern

When a new task arrives without an explicit agent target, the system can auto-route it. The implementation uses a small, cheap LLM (Gemini Flash works well) as a classifier. Given the task description and a list of available agents with brief descriptions, the classifier picks the right agent.

This keeps the heavy Claude tokens reserved for actual work. The classifier sees task description plus agent descriptions plus a routing instruction, then returns one of the agent IDs.

The pattern is in `REFERENCE_GUIDES/AUTO_ASSIGN_PATTERN.md`.

---

## The suggestions feature

A periodic job analyzes recent conversation history per agent and detects when one agent is doing way more than its share. When the job spots an overloaded agent, it suggests creating a new agent to peel off some of that workload.

The pattern uses Gemini Flash again (cheap, large context window, good at semantic clustering). The output is a single recommendation surfaced in the dashboard:

> "Your Comms agent is handling email, Slack, WhatsApp, school messages, and YouTube comments. Consider splitting Email Manager off into its own agent."

This pattern is in `REFERENCE_GUIDES/SUGGESTIONS_FEATURE.md`.

---

## The CLI integration pattern (Meta agent example)

When a new CLI tool drops (the Meta ads CLI is one example), you don't need to rebuild your agent. You add the CLI globally, and any agent in the system can use it.

The flow:

1. Install the CLI globally on your machine (e.g., `npm install -g meta-ads-cli` or whatever the install command is)
2. Add a skill folder for it: `skills/meta-ads-cli/SKILL.md` describing what the CLI does, when to use it, what arguments it takes
3. The orchestrator auto-discovers the skill at next boot
4. Agents that have `Bash` or `Skill` in their tool allowlist can now invoke it

If you want a specific agent to use the CLI on a schedule (e.g., pull Facebook ad performance every morning at 7:30 AM), add a row to `scheduled_tasks` referencing that agent and a prompt that tells it to run the CLI.

The pattern is in `REFERENCE_GUIDES/CLI_INTEGRATION_PATTERN.md`.

---

## The 3D Hive Mind visualization

The 3D brain you see in the V3 video is a visualization layer over the data. The underlying data is just rows in `hive_mind_log` and `mission_tasks`. The visualization is a React (or vanilla three.js) frontend that reads the same SQLite file the orchestrator writes to.

You don't need the visualization to run a Hive Mind. You can read the same data from the list view (a tab in the dashboard that just shows a chronological log) or from the 2D Obsidian-style graph view. The 3D version is the cinematic moment, not the operational requirement.

If you want to build it, the pattern is in `REFERENCE_GUIDES/HIVE_MIND_VIEWS.md`.

---

## What you don't need

You don't need:

- A Kubernetes cluster
- A vector database service
- A microservices framework
- A message broker
- A cloud provider (unless you want to host the brain remotely)
- A separate authentication service
- A "platform"

You need:

- A computer
- A Claude Code subscription
- A Telegram bot token from @BotFather (free)
- An LLM API key for the cheap classifier work (Gemini's free tier covers this for low volume)
- About a weekend of focused work to wire it together

---

## How to use this blueprint

Read this document first. Read `5_STEP_JOURNEY.md` next. Then open the `REBUILD_PROMPT_V3.md` and paste it into a fresh Claude Code session.

If you get lost, jump into the relevant `REFERENCE_GUIDES/` document. They are intentionally narrow and topic-focused so you can read just the part you need.

The kit is generous because the goal is to teach the architecture. If you reverse-engineer the whole thing and never join the community, the goal is met. If you join the community for direct support and the carbon-copy repo, the goal is also met. Both paths are valid.

The only path that fails is the one where you skip the disclaimer.
