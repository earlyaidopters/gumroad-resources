# ClaudeClaw OS  - Power Packs Guide

This is the companion guide to the Power Packs executable prompts. Read this first to understand what each pack does, why it exists, and what it needs. Then pick the packs you want and paste them from `POWER_PACKS.md`.

If you watched the video, this maps 1:1 to the Power Packs section. Each pack is self-contained. You can install one, all eight, or any combination in between. They all plug into the same ClaudeClaw core.

---

## Pack 1: Memory v2

### What it is (one paragraph)

Memory v2 replaces the basic 3-layer memory from ClaudeClaw v0 with a full semantic memory engine. Instead of your bot storing flat text notes, it now uses Gemini (`gemini-3-flash-preview`) to read every conversation, extract the facts worth keeping, generate high-dimensional vector embeddings for each memory via `gemini-embedding-001` (768-dim), and run a background consolidation job that finds patterns, contradictions, and recurring themes across everything your bot has ever learned about you.

### Why it exists (one paragraph)

The v0 memory worked, but it was shallow. Your bot could remember what you told it, but it couldn't connect dots across conversations. It couldn't notice that you mentioned the same problem three times in different ways. It couldn't surface a relevant memory from two weeks ago just because the *meaning* was related, not the keywords. Memory v2 fixes all of that. It gives your bot genuine recall, not just storage.

### What it adds to your setup

- LLM-powered fact extraction from every conversation (fire-and-forget, never blocks the user's response)
- 768-dimensional vector embeddings for semantic search via `gemini-embedding-001`
- Automated consolidation engine that runs every 30 minutes
- 5-layer retrieval stack (semantic, keyword, recency, consolidation insights, conversation history recall)
- Importance scoring per memory (0-1 scale)
- Salience field (0-5 range, separate from importance) that decays daily and is boosted by relevance feedback
- Memory decay system (importance-weighted rates, with hard-deletion when salience drops below 0.05)
- Memory pinning via /pin command (exempt from decay forever)
- Memory supersession (newer contradicting memories override older ones)
- Contradiction detection across stored memories
- Pattern recognition that surfaces recurring themes
- Configurable memory nudging intervals (default 10 turns or 2 hours)
- Duplicate detection at 0.85 cosine similarity threshold
- High-importance callback (importance >= 0.8 triggers Telegram notification)

### How it works under the hood (2-3 paragraphs)

Every time a conversation ends, Memory v2 sends the full transcript to Gemini (`gemini-3-flash-preview`) with an extraction prompt. This runs as a fire-and-forget operation, so it never blocks the user's response. Gemini reads through the conversation and pulls out discrete facts: preferences, decisions, project context, relationship details, anything worth retaining. Each extracted fact gets an importance score and a set of tags. Then each fact is converted into a 768-dimensional embedding vector using `gemini-embedding-001`. Think of an embedding like a fingerprint for meaning. Two sentences about the same topic will have similar fingerprints even if they use completely different words. Duplicates are caught at 0.85 cosine similarity and merged rather than stored twice.

The consolidation engine is a background job that wakes up every 30 minutes. It scans your full memory bank, groups related memories by semantic similarity, and generates "insight" entries. These are meta-memories. For example, if you've mentioned three times that you prefer short emails, the consolidation engine creates an insight entry that says "User strongly prefers concise communication." It also flags contradictions, and when it finds them, the newer memory supersedes the older one. The old memory gets its importance reduced by 70% and its salience halved. Meanwhile, every memory decays over time at rates tied to its importance. Pinned memories (importance-weighted rate of 0%) never decay. Memories with importance >= 0.8 decay at 1% per day. Mid-range memories (>= 0.5) decay at 2% per day. Low-importance memories (< 0.5) decay at 5% per day. When a memory's salience drops below 0.05, it gets hard-deleted. The nudging system prompts extraction at configurable intervals (default every 10 turns or every 2 hours) to make sure nothing slips through.

When your bot needs to recall something, it doesn't just search keywords. It runs through 5 retrieval layers in order: semantic search (find memories with cosine similarity above 0.3 to the current context), keyword search (catch exact matches the vector search might miss), recent high-importance memories (anything scored 8+ from the last 48 hours), consolidation insights (the meta-patterns), and conversation history recall (keyword-triggered, 7-day window, returns top 10 results). The results from all 5 layers get merged, deduplicated, and ranked. After the response is sent, a relevance feedback loop runs: Gemini evaluates which surfaced memories were actually useful. Useful ones get a salience boost of +0.1, while unused ones get a -0.05 penalty. This keeps the most helpful memories prominent over time.

### What you need before installing

- Google API key (`GOOGLE_API_KEY` in your `.env`) for Gemini embedding and extraction calls
- SQLite (already included with Node.js, no extra install)
- ClaudeClaw v0 core running and functional

### Files it creates or modifies

- `src/memory.ts`  - Core memory engine with 5-layer retrieval, decay, pinning, nudging, and relevance evaluation
- `src/memory-ingest.ts`  - Conversation extraction via Gemini, importance scoring, duplicate detection, fire-and-forget pattern
- `src/memory-consolidate.ts`  - Background consolidation job with pattern detection, contradiction handling, and supersession
- `src/embeddings.ts`  - Gemini embedding wrapper for 768-dimensional vectors and cosine similarity
- `src/db.ts`  - Inline migration using PRAGMA table_info() checks for vector storage, importance scores, salience, and insights table

### How it connects to the rest of ClaudeClaw

Memory v2 is the foundation that most other packs benefit from. The Multi-Agent pack uses the cross-agent retrieval layer to share context between agents. The War Room uses memory to give voice responses context about past conversations. The Meeting Bot pulls from memory during its pre-flight briefing. If you only install one pack, this is the one that improves everything else.

---

## Pack 2: Multi-Agent

### What it is (one paragraph)

Multi-Agent lets you run up to 20 specialized Claude agents simultaneously, each with its own Telegram bot, personality, working directory, and tool permissions. Instead of one bot doing everything, you get a team: a Main agent for general tasks, a Comms agent for emails and messages, a Content agent for writing, an Ops agent for system maintenance, and a Research agent for deep dives. They coordinate through a shared "hive mind" database table so they know what each other are doing. Each agent defaults to `claude-sonnet-4-6` and can be overridden per-agent.

### Why it exists (one paragraph)

A single bot gets overwhelmed when you throw everything at it. Emails, code reviews, content drafts, calendar management, research. The context window fills up. The responses get generic. Multi-Agent solves this by giving each agent a narrow focus and its own resources. Your Comms agent only sees communication tools. Your Research agent only has web search and file access. Specialization makes each agent dramatically better at its job.

### What it adds to your setup

- Up to 20 agent roles (5 pre-configured templates, unlimited custom roles)
- Individual Telegram bots per agent (separate chat windows)
- Per-agent CLAUDE.md personality files
- Per-agent MCP tool filtering via inline `mcp_servers` field in agent.yaml
- Shared hive mind database for cross-agent coordination
- Comprehensive agent creation wizard (`src/agent-create.ts`, 615 lines) that validates bot tokens against the Telegram API
- Auto-generated launchd plist (macOS) or systemd unit (Linux) service configs
- Full agent lifecycle management (activate, deactivate, restart, delete)
- Color assignment from a 15-color palette
- Agent health monitoring and restart logic
- Session isolation via composite key (chat_id, agent_id) in sessions table
- External config support at CLAUDECLAW_CONFIG (~/.claudeclaw by default)

### How it works under the hood (2-3 paragraphs)

Each agent runs as its own process on your machine, connected to its own Telegram bot token. When you message the Comms bot on Telegram, only the Comms agent receives it. Sessions are isolated using a composite key of (chat_id, agent_id) so agents never cross-contaminate each other's conversation state. Each agent has its own CLAUDE.md file that defines its personality, expertise, and boundaries. The Comms agent's CLAUDE.md says things like "You handle emails, Slack messages, and calendar scheduling. You do not write code or run terminal commands." This keeps agents in their lane. MCP tool permissions are controlled inline via the `mcp_servers` field in each agent's `agent.yaml` file, so each agent only sees the tools it needs.

The hive mind is a SQLite table (built into `src/db.ts`) where agents post status updates, hand off tasks, and flag things for other agents. If your Research agent finishes a competitive analysis, it writes a summary to the hive mind and tags the Content agent. The Content agent picks it up on its next cycle. Think of it like a shared Slack channel that only your agents can see. No API calls between agents, no complex orchestration. They just read and write to the same table.

The agent creation wizard (`src/agent-create.ts`) handles the tedious setup across 615 lines of comprehensive logic. It asks you which role template to use (from `agents/_template/` at the project root), validates your Telegram bot token by checking it against the Telegram API, assigns a color from a 15-color palette, creates the CLAUDE.md personality file, configures the MCP tool permissions inline in `agent.yaml`, and writes a launchd plist (on macOS) or systemd unit file (on Linux) so the agent starts automatically when your machine boots. Agent IDs follow the format `/^[a-z][a-z0-9_-]{0,29}$/`. External agent config at `CLAUDECLAW_CONFIG/agents/{id}/` takes priority over `PROJECT_ROOT/agents/{id}/`, so you can keep sensitive config outside your repo.

### What you need before installing

- One Telegram bot token per agent (create via @BotFather on Telegram)
- ClaudeClaw v0 core running and functional
- Enough system resources to run multiple Claude Code processes (each agent uses ~200-400MB RAM)

### Files it creates or modifies

- `src/orchestrator.ts`  - Agent lifecycle management, health checks, and restart logic
- `src/db.ts`  - Hive mind table, agent registry, and session isolation (inline migrations via PRAGMA table_info() checks)
- `agents/_template/`  - CLAUDE.md and agent.yaml templates for each role (at project root)
- `src/agent-create.ts`  - Comprehensive agent creation wizard (615 lines) with Telegram API validation
- `agents/{name}/CLAUDE.md`  - Per-agent personality files (generated by wizard)
- `agents/{name}/agent.yaml`  - Per-agent config including inline `mcp_servers` tool permissions

### How it connects to the rest of ClaudeClaw

Multi-Agent uses Memory v2's cross-agent retrieval layer so agents can reference each other's stored memories. The Mission Control pack can assign tasks to specific agents by name. The Dashboard shows all agent statuses in real time. The War Room can route voice commands to the right agent based on what you say. Without Multi-Agent, the other packs still work, they just all run through a single bot.

---

## Pack 3: War Room

### What it is (one paragraph)

War Room adds a browser-based voice meeting room where you talk to your agents out loud, and they talk back. It runs locally on your machine using Pipecat (a Python voice framework) and supports two modes. The default "live" mode connects to Gemini Live for native real-time speech-to-speech processing. The "legacy" mode uses Deepgram for STT and Cartesia for TTS. You open a browser tab, start talking, and your agents respond with voice. When something requires real work (running code, sending emails, searching the web), the voice room hands off to a real Claude Code agent running on your Mac.

### Why it exists (one paragraph)

Typing is slow. Sometimes you want to think out loud, brainstorm, or rapid-fire instructions without touching a keyboard. War Room gives you that. It's like having a meeting with your AI team. You talk, they listen, they respond, and when you say "do it," the actual work gets delegated to the right agent. It bridges the gap between casual conversation and actual task execution.

### What it adds to your setup

- Browser-based voice interface on port 7860
- Two modes available: "live" (Gemini Live native speech-to-speech, default) and "legacy" (Deepgram STT + Cartesia TTS)
- Gemini Live tool functions for delegation (delegate_to_agent, answer_as_agent, get_time, list_agents)
- Auto-mode where Gemini acts as router, calling answer_as_agent to invoke sub-agents
- GoT-themed agent personas (Hand of the King, Grand Maester, Master of Whisperers, Royal Bard, Master of War)
- Intelligent routing via broadcast ("everyone"), name prefix ("hey research"), or pinned agent
- Subprocess bridge that delegates real work to Claude Code agents
- Cinematic UI with intro animation, boardroom stage, and agent cards with speaking/thinking states
- Conversation transcript logging to warroom_transcript table
- Pin state via /tmp/warroom-pin.json (IPC with dashboard)
- Agent roster written to /tmp/warroom-agents.json
- Push-to-talk and continuous listening modes
- Audio pipeline at 16kHz input, 24kHz output with protobuf serialization

### How it works under the hood (2-3 paragraphs)

The War Room runs a Pipecat server on port 7860 (v0.0.75 in requirements, v0.0.108 in practice). Pipecat is an open-source Python framework for building voice AI applications. When you open `localhost:7860` in your browser, it loads a cinematic UI with an intro animation and a boardroom stage showing agent cards. In "live" mode (the default), audio streams directly to Gemini Live for native speech-to-speech processing. Gemini Live has built-in tool functions (delegate_to_agent, answer_as_agent, get_time, list_agents) that let it act as an intelligent router in auto-mode, calling answer_as_agent to invoke whichever sub-agent is best suited for the request. In "legacy" mode, audio goes through Deepgram for speech-to-text and Cartesia for text-to-speech, with the LLM handling the middle layer.

The agents get GoT-themed personas. The Main agent is the "Hand of the King" (voice: Charon). Research is the "Grand Maester" (voice: Kore). Comms is the "Master of Whisperers" (voice: Aoede). Content is the "Royal Bard" (voice: Leda). Ops is the "Master of War" (voice: Alnilam). Routing decides which agent handles each utterance based on three rules, checked in order. First, broadcast triggers: if you say "everyone" or "all agents," the message goes to every active agent. Second, name prefix: if you say "hey research, look into competitor pricing," only the Research agent gets it. Third, pinned agent: if you've pinned one (state stored at /tmp/warroom-pin.json for IPC with the dashboard), all messages route there by default until you un-pin. If none of these rules match, it goes to the Main agent.

Here's the important distinction. Gemini Live handles the conversational back-and-forth (answering questions, brainstorming, clarifying intent), but when real work is needed, the War Room delegates to an actual Claude Code agent via a subprocess bridge (`warroom/agent_bridge.py`). If you say "send an email to Sarah about the proposal," Gemini Live acknowledges the request, then the bridge spawns the Comms agent with that instruction. The agent does the real work (drafts the email, sends it), and the result gets spoken back to you. This separation keeps voice responses fast while allowing heavyweight tool use. The agent roster is persisted at /tmp/warroom-agents.json, and all conversation turns are logged to the warroom_transcript table in the database.

### What you need before installing

- Google API key with Gemini Live access (`GOOGLE_API_KEY` in your `.env`)
- Python 3.10+ with `pip install pipecat-ai`
- A microphone and speakers (or headphones to avoid echo)
- Chrome or Firefox (Safari has limited WebSocket audio support)

### Files it creates or modifies

- `warroom/server.py`  - Pipecat voice server with Gemini Live integration and legacy mode support
- `warroom/router.py`  - Agent routing logic in Python (broadcast, name prefix, pinned)
- `warroom/agent_bridge.py`  - Subprocess bridge to Claude Code agents
- `warroom/personas.py`  - GoT-themed agent personas and system prompts for all 5 agents
- `warroom/config.py`  - Project root resolver, voice mapping loader, constants
- `warroom/voices.json`  - Cartesia and Gemini Live voice ID mappings per agent
- `warroom/client.js`  - Pipecat client wrapper for browser WebSocket connection
- `warroom/requirements.txt`  - Python dependencies (pipecat-ai, python-dotenv)
- `warroom/warroom-html.ts`  - Cinematic browser UI (69KB embedded HTML with intro animation, boardroom stage, agent cards)
- `src/agent-voice-bridge.ts`  - Node.js CLI bridge spawned by Python for Claude Code invocation
- `src/db.ts`  - Inline migration for warroom_transcript table

### How it connects to the rest of ClaudeClaw

War Room is a frontend for the Multi-Agent system. Without Multi-Agent, all voice commands route to the single Main agent (which still works fine). With Multi-Agent, you get intelligent routing across your full team. Memory v2 gives the voice agents context about past conversations. The Dashboard shows active War Room sessions and transcripts, and serves the War Room HTML at the /warroom route. Mission Control tasks can be created by voice command.

---

## Pack 4: Mission Control

### What it is (one paragraph)

Mission Control adds two things: a cron-based scheduler that checks for due tasks every 60 seconds, and a mission task queue for async one-shot tasks that can be delegated between agents. Think of it as your bot's to-do list combined with a recurring job scheduler. You can say "every Monday at 9am, check my inbox and summarize what's urgent" and it just happens, without you having to ask each time.

### Why it exists (one paragraph)

Without Mission Control, your bot is purely reactive. It waits for you to message it. That's fine for one-off tasks, but it means you have to remember to ask for things like weekly reports, daily summaries, or periodic checks. Mission Control makes your bot proactive. Set up the recurring tasks once, and they execute on schedule. The async task queue also lets agents hand work to each other without blocking, so your Research agent can queue a "write a draft based on these findings" task for your Content agent.

### What it adds to your setup

- Cron-based task scheduler with 60-second polling
- Async mission queue for one-shot delegated tasks
- Priority ordering (urgent, high, normal, low)
- Auto-assignment via Gemini (cheap model) through the dashboard, not keyword matching
- Task status tracking (queued, running, completed, failed)
- Recurring task templates (daily, weekly, custom cron expressions)
- Retry logic with configurable max attempts
- Stuck task recovery on startup (resets any tasks still in 'running' state)
- Unassigned tasks (NULL assigned_agent) auto-classified by Gemini
- Visual task management via the Dashboard (create, assign, reassign)

### How it works under the hood (2-3 paragraphs)

The scheduler is a background loop in `src/scheduler.ts` that runs every 60 seconds. On each tick, it queries the tasks table for any entries where the next execution time is in the past. For each due task, it checks which agent should handle it, then spawns that agent with the task instructions. The agent runs, produces a result, and the scheduler records the outcome. For recurring tasks, it calculates the next execution time from the cron expression and updates the schedule. On startup, `resetStuckTasks()` catches any tasks that were still in 'running' state (from a crash or restart) and resets them so they can be retried.

The mission queue is separate from the scheduler. It's for one-shot async tasks that need to happen but don't need to happen right now. When your Research agent finishes a deep dive and wants the Content agent to write something based on the findings, it pushes a task to the mission queue with priority "normal" and agent assignment "content." The Content agent picks it up on its next idle cycle. Tasks in the queue have priority ordering, so an "urgent" task from you always jumps ahead of a "normal" task from another agent. Tasks can also be left unassigned (NULL assigned_agent), and Gemini will auto-classify them to the right agent.

Auto-assignment uses Gemini (a cheap model) via the dashboard rather than simple keyword matching. When a task comes in without an explicit agent assignment, the dashboard sends the task description to Gemini, which classifies it based on each agent's role and capabilities. This is more flexible than keyword matching because it understands intent, not just surface-level words. The dashboard also provides visual task management, letting you create, assign, and reassign tasks with a point-and-click interface.

### What you need before installing

- ClaudeClaw v0 core running and functional
- Multi-Agent pack (recommended but not required, without it all tasks go to the single Main agent)

### Files it creates or modifies

- `src/scheduler.ts`  - Cron-based task scheduler with 60-second polling loop, stuck task recovery, and mission queue logic
- `src/schedule-cli.ts`  - CLI for creating, listing, pausing, resuming, and deleting scheduled tasks
- `src/mission-cli.ts`  - CLI for creating one-shot mission tasks with priority and agent assignment
- `src/db.ts`  - Inline migration for tasks table, schedule entries, and execution log (via PRAGMA table_info() checks)

### How it connects to the rest of ClaudeClaw

Mission Control is the "brain" that makes the whole system proactive instead of reactive. The Dashboard displays the full task queue and schedule with status indicators, plus visual task management for creating and reassigning tasks. The War Room can create tasks via voice commands. Memory v2 stores task execution results so agents can reference past outcomes. Multi-Agent provides the pool of specialized agents that tasks get routed to.

---

## Pack 5: Security

### What it is (one paragraph)

Security adds four layers of protection to your ClaudeClaw setup, all in a single 215-line file. A PIN lock that requires authentication before the bot responds to sensitive commands. An emergency kill phrase that shuts down all running services immediately. An exfiltration guard that scans every outbound response for leaked API keys (15+ regex patterns, including base64-encoded and URL-encoded variants) and redacts them before they reach Telegram. And a full audit log that records every action to a SQLite table so you can review exactly what your bot did and when.

### Why it exists (one paragraph)

Your bot has access to your email, calendar, files, and API keys. That's powerful, but it's also a risk surface. If someone gets access to your Telegram, they could tell your bot to do things you wouldn't approve. If your bot hallucinates or gets a weird instruction, it could accidentally leak sensitive data. The Security pack doesn't make your bot paranoid. It adds reasonable guardrails. PIN lock keeps strangers out. The kill phrase gives you an emergency brake. The exfiltration guard catches accidental leaks. The audit log gives you full visibility.

### What it adds to your setup

- PIN lock with salted SHA-256 hashing
- Auto-lock after configurable idle period (default 30 minutes)
- Emergency kill phrase (case-insensitive exact match) that terminates all services
- Outbound response scanning with 15+ regex patterns for API key formats
- Detection of base64-encoded and URL-encoded variants of protected env values
- Automatic redaction of detected secrets before sending
- Full audit logging to SQLite (every action, every agent, timestamped)
- Audit action types for message, command, delegation, unlock, lock, kill, and blocked events
- Audit log viewer with filtering by agent, action type, and date range

### How it works under the hood (2-3 paragraphs)

The PIN lock uses salted SHA-256 hashing, which means your PIN is never stored in plain text. When you set your PIN, the system generates a random salt, combines it with your PIN, hashes the result, and stores the hash plus salt. When you enter your PIN to unlock, it re-hashes your input with the stored salt and compares. If they match, you're in. The bot auto-locks after 30 minutes of inactivity (configurable), so if you walk away from your phone, your bot stops responding to commands until the PIN is entered again.

The exfiltration guard runs on every outbound message, integrated directly into `bot.ts` (no separate middleware file). Before any response gets sent to Telegram, it passes through 15+ regex patterns that look for API key formats: strings starting with `sk-`, `AIza`, `ghp_`, `xoxb-`, long hex strings, base64 blobs that look like credentials. It also scans for base64-encoded and URL-encoded variants of the actual protected environment variable values from your `.env` file. If it finds a match, it replaces the sensitive portion with `[REDACTED]` and logs the incident. This catches cases where your bot might accidentally include an API key in a response, perhaps because it read a config file and included a snippet.

The audit log records everything to a SQLite table with typed action categories: message, command, delegation, unlock, lock, kill, and blocked. Each entry includes which agent performed the action, what tool was used, what the input and output were, the timestamp, and whether the action was user-initiated or autonomous (from Mission Control). The kill phrase is a configurable string that, when sent as a message, triggers an immediate shutdown of all running services. It uses case-insensitive exact match (not substring matching), so you won't accidentally trigger it mid-sentence. It sends SIGTERM to every agent process, stops the scheduler, closes the War Room, and sends you a confirmation message before going silent. You can restart normally afterward.

### What you need before installing

- ClaudeClaw v0 core running and functional
- No external dependencies (uses built-in Node.js crypto and SQLite)

### Files it creates or modifies

- `src/security.ts`  - All four security layers in a single file (PIN lock, kill switch, audit logging), 215 lines
- `src/exfiltration-guard.ts`  - Outbound message scanning with 15+ regex patterns, base64/URL-encoded variant detection, and redaction
- `src/db.ts`  - Inline migration for audit log table and PIN storage (via PRAGMA table_info() checks)

### How it connects to the rest of ClaudeClaw

Security wraps around everything. The PIN lock gates all inbound messages before any other pack processes them. The exfiltration guard sits on the outbound side of every agent's response pipeline. The audit log captures actions from Mission Control, Multi-Agent, War Room, and the core bot. The Dashboard (if installed) provides a visual audit trail viewer. The kill phrase overrides all other processing, including the War Room voice interface.

---

## Pack 6: Voice Upgrade

### What it is (one paragraph)

Voice Upgrade replaces the default text-to-speech with a single 504-line file that handles both STT and TTS cascades. For speech-to-text, it tries Groq Whisper first (primary) and falls back to whisper-cpp running locally. For text-to-speech, it cascades through 4 providers: ElevenLabs first (highest quality, supports cloned voices), then Gradium if ElevenLabs fails, then Kokoro (a local OpenAI-compatible API at KOKORO_URL, zero cost), and finally macOS `say` as the absolute last resort. The cascade happens automatically. If one provider errors out or times out, the next one picks up without any interruption to the conversation.

### Why it exists (one paragraph)

The default TTS in ClaudeClaw v0 works, but it sounds robotic and has no failover. If the API is down, your bot goes silent. Voice Upgrade solves both problems. ElevenLabs gives you a cloned voice that sounds like a real person. Gradium gives you 45,000 free credits per month as a solid backup. Kokoro runs entirely on your machine, so it works even with zero internet. And macOS `say` is the emergency fallback that always works. You never lose voice capability. On the STT side, Groq Whisper gives fast cloud transcription with whisper-cpp as a free local fallback.

### What it adds to your setup

- STT cascade with Groq Whisper (primary) and whisper-cpp local (fallback)
- ElevenLabs TTS integration with cloned voice support
- Gradium TTS with 45K free monthly credits
- Kokoro local TTS via any OpenAI-compatible server at KOKORO_URL (fully offline, zero cost)
- macOS `say` as last-resort TTS fallback
- Automatic cascade on failure for both STT and TTS (no manual switching)
- Per-provider latency tracking
- Voice quality preference settings (quality vs speed tradeoff)

### How it works under the hood (2-3 paragraphs)

The entire voice system lives in a single file (`src/voice.ts`, 504 lines) that handles both speech-to-text and text-to-speech cascades. No separate provider files. For STT, when audio comes in, it first tries Groq Whisper for fast cloud-based transcription. If Groq is down or errors out, it falls back to whisper-cpp running locally on your machine. This means you always have transcription available, even offline.

For TTS, the cascade is a priority-ordered chain. When the bot needs to speak, it calls the TTS manager with the text to synthesize. The manager tries Provider 1 (ElevenLabs). If it returns audio within the timeout window, that audio gets sent. If it errors or times out, the manager catches the failure, logs it, and immediately tries Provider 2 (Gradium). Same logic all the way down the chain. The whole cascade happens in milliseconds to low single-digit seconds, so the user barely notices a provider switch.

ElevenLabs is the primary TTS provider because it supports voice cloning. You can upload samples of your own voice (or any voice you have rights to use), and ElevenLabs will generate speech that sounds like that voice. Gradium is the secondary provider, offering 45,000 free credits per month, which is enough for moderate daily use. Kokoro is an open-source TTS model that runs as a local OpenAI-compatible API server at whatever URL you configure as KOKORO_URL. Zero API calls to external services, zero cost, zero latency from network round trips. The voice quality is below ElevenLabs but above macOS `say`. It's the provider you want for situations where you're offline, or you've burned through your cloud credits, or you just want guaranteed availability.

### What you need before installing

- ElevenLabs API key (`ELEVENLABS_API_KEY` in your `.env`) for the primary TTS provider
- Gradium API key (`GRADIUM_API_KEY` in your `.env`) for the secondary TTS provider
- Kokoro server running at KOKORO_URL (optional, the cascade skips it if unavailable)
- macOS for the `say` fallback (on Linux, it substitutes `espeak`)

### Files it creates or modifies

- `src/voice.ts`  - Single 504-line file handling both STT cascade (Groq Whisper, whisper-cpp) and TTS cascade (ElevenLabs, Gradium, Kokoro, macOS say)

### How it connects to the rest of ClaudeClaw

Voice Upgrade provides the STT and TTS layers for the entire system. The War Room uses it for all voice responses. Regular Telegram voice messages use it. The Meeting Bot (Pack 8) uses it for the avatar's voice in calls. If you don't install Voice Upgrade, the system falls back to whatever default TTS was configured in v0. All other packs work independently of Voice Upgrade, they just sound better with it.

---

## Pack 7: Dashboard

### What it is (one paragraph)

Dashboard adds a web-based control panel on port 3141 that gives you a visual overview of your entire ClaudeClaw system. It has tabs for memory timeline, token usage tracking, agent status, Mission Control task queue, hive mind activity log, War Room management, and audit trail. It's a single-page app embedded entirely in two TypeScript files (1,370 lines for the server, 3,200+ lines for the embedded HTML/CSS/JS), with Chart.js graphs, a dark theme, and real-time updates via Server-Sent Events. You can access it remotely through a Cloudflare Tunnel if you want to check on your bot from your phone.

### Why it exists (one paragraph)

Running a multi-agent system from Telegram is like flying a plane from the passenger seat. You can give instructions, but you can't see the instruments. The Dashboard is your cockpit. How much are you spending on tokens? Which agent has been busiest? Are there failed tasks in the queue? What did the consolidation engine find in your memories? These are questions you shouldn't have to ask your bot. You should be able to glance at a screen and know.

### What it adds to your setup

- Web UI on port 3141 (configurable)
- Memory timeline with search and filtering
- Token usage graphs (per agent, per day, per model)
- Live agent status indicators (running, idle, error)
- Mission Control task queue viewer with visual task management (create, assign, reassign)
- Hive mind activity log
- Audit trail browser with filtering
- War Room management endpoints (start, pin agent, voice catalog)
- Model override picker per agent
- Privacy blur toggle
- Agent creation wizard from the dashboard
- Real-time SSE updates via chatEvents EventEmitter (no manual refresh needed)
- Token auth via ?token= query param
- Serves War Room HTML at /warroom route
- Optional Cloudflare Tunnel for remote access
- Dark theme with Chart.js visualizations

### How it works under the hood (2-3 paragraphs)

The Dashboard is a single Express.js server (`src/dashboard.ts`, 1,370 lines) that serves an embedded HTML/JS/CSS frontend (`src/dashboard-html.ts`, 3,200+ lines) and exposes a REST API backed by the same SQLite database that all other packs use. There are no separate API files. All endpoints live in `src/dashboard.ts`. When you open `localhost:3141`, it loads the single-page app that fetches data from API endpoints for memory, tokens, agents, tasks, audit logs, and War Room management. Authentication uses a simple token scheme via `?token=` query parameter.

Real-time updates use Server-Sent Events (SSE) via a chatEvents EventEmitter. When you open the Dashboard, your browser establishes a persistent connection to the events endpoint. Whenever something changes in the system (a new memory is created, a task completes, an agent starts or stops), the server pushes an event through that connection. The frontend receives it and updates the relevant UI component without a full page reload. This means the Dashboard always shows current state. No refresh button needed.

Beyond monitoring, the Dashboard is also a control surface. You can create new agents through an agent creation wizard, override model selection per agent (model override picker), manage the War Room (start sessions, pin agents, browse voice catalogs), create and reassign Mission Control tasks, and toggle a privacy blur for sensitive data. It also serves the War Room HTML at the /warroom route, so the War Room UI is accessible directly through the Dashboard. The Cloudflare Tunnel integration is optional but useful. If you run `cloudflared tunnel` pointed at port 3141, you get a public URL that you can open from any device.

### What you need before installing

- ClaudeClaw v0 core running and functional
- Node.js (already required by ClaudeClaw)
- `cloudflared` CLI (optional, only for remote access via Cloudflare Tunnel)

### Files it creates or modifies

- `src/dashboard.ts`  - Express server with all REST API endpoints, SSE, War Room management, and agent creation wizard (1,370 lines)
- `src/dashboard-html.ts`  - Embedded single-page app with all HTML, CSS, JS, Chart.js graphs, and tabbed interface (3,200+ lines)

### How it connects to the rest of ClaudeClaw

The Dashboard reads from every other pack's data. Memory v2 entries appear in the memory timeline. Multi-Agent statuses show on the agents tab with model override and creation wizard access. Mission Control tasks display in the queue viewer with full create/assign/reassign controls. Security audit logs populate the audit trail. War Room sessions are manageable from the dashboard (start, pin, voice catalog), and the War Room HTML is served at /warroom. Token usage spans all agents and all operations. It's both a read layer and a control surface for the entire system.

---

## Pack 8: Meeting Bot

### What it is (one paragraph)

Meeting Bot gives your Claude agent the ability to join a real Google Meet or Zoom call as a video avatar with a cloned voice. It lives in a single 792-line file plus a Pikastream skill definition. Before joining any meeting, it runs a 75-second pre-flight briefing that pulls your Calendar (next 24 hours), Gmail (last 30 days of emails per attendee), and Memory to build a context-rich briefing card. Your agent shows up to the meeting knowing who everyone is, what you've discussed with them recently, and what's on the agenda.

### Why it exists (one paragraph)

Meetings eat time. Especially the ones where you're mostly listening, taking notes, or answering routine questions. Meeting Bot doesn't replace you in high-stakes conversations, but it can handle standups, status updates, and information-gathering calls. Even when you attend yourself, the pre-flight briefing is valuable on its own. Walking into a meeting knowing every attendee's recent email history and your past context with them is a serious advantage.

### What it adds to your setup

- Google Meet and Zoom call joining via video avatar
- Cloned voice via Pika video generation (~$0.275/min)
- Alternative provider support via Recall.ai (voice-only, cheaper)
- 75-second pre-flight briefing before every meeting
- Calendar integration (next 24 hours of events)
- Gmail integration (last 30 days per attendee)
- Memory integration (past context with each attendee)
- Briefing card generation with key talking points
- Real-time transcription during the call
- Post-meeting summary with action items
- Session tracking with platform, provider, and status fields
- Avatar setup via Pika dev key

### How it works under the hood (2-3 paragraphs)

The pre-flight sequence starts 75 seconds before the meeting's scheduled time. First, it pulls your Google Calendar to get the meeting details: title, description, attendee list. Then, for each attendee, it searches your Gmail for the last 30 days of email threads involving that person. It also queries Memory v2 for any stored context about each attendee. All of this gets synthesized into a briefing card that includes who's attending, what you've discussed with each person recently, likely topics based on the meeting title and recent communications, and suggested talking points.

The video avatar uses Pika to generate a realistic video of "you" speaking (avatar setup via your Pika dev key). You provide a reference photo and a voice clone (from ElevenLabs via Voice Upgrade, or a separate Pika voice clone). When the agent needs to speak during the meeting, it generates the audio response, sends it to Pika to create a matching lip-synced video clip, and streams that into the meeting. The cost is approximately $0.275 per minute of generated video. For a 30-minute meeting where the agent speaks for 10 minutes total, that's about $2.75. As an alternative, Recall.ai is supported as a voice-only provider, which is cheaper if you don't need the video avatar.

The agent joins the meeting via browser automation. It opens the Google Meet or Zoom link in a headless browser, joins with camera and microphone enabled (the "camera" feed is the Pika-generated video, the "microphone" feed is the TTS audio). During the meeting, it transcribes everything in real time, responds when spoken to or when it has relevant information to contribute, and after the meeting ends, it generates a structured summary with action items and sends it to you via Telegram. Each meeting session is tracked in the meet_sessions table with platform (Google Meet, Zoom), provider (Pika, Recall.ai), and status fields.

### What you need before installing

- Google API credentials for Calendar and Gmail access (already configured in ClaudeClaw v0)
- Pika API key (`PIKA_API_KEY` in your `.env`) for video avatar generation
- ElevenLabs voice clone (via Voice Upgrade pack) or separate Pika voice clone
- A reference photo of yourself for the video avatar
- Memory v2 pack (recommended for attendee context, works without it but briefings will be thinner)
- Voice Upgrade pack (recommended for higher quality speech during calls)

### Files it creates or modifies

- `src/meet-cli.ts`  - Single-file meeting bot with pre-flight briefing, avatar control, transcription, and summary (792 lines)
- `skills/pikastream-video-meeting/SKILL.md`  - Pikastream skill definition for video avatar pipeline
- `src/db.ts`  - Inline migration for meet_sessions table (tracks platform, provider, status) via PRAGMA table_info() checks

### How it connects to the rest of ClaudeClaw

Meeting Bot is the most integration-heavy pack. It pulls from Memory v2 for attendee context, uses Voice Upgrade for speech synthesis, reads Calendar and Gmail through the core MCP tools, and posts meeting summaries to the hive mind (if Multi-Agent is installed) so other agents can reference what happened. The Dashboard shows upcoming meetings, briefing card previews, and post-meeting summaries. Mission Control can schedule recurring meeting attendance.

---

## Quick Reference: Pack Dependencies

Not every pack needs every other pack. Here's what's required vs. recommended.

| Pack | Required | Recommended |
|---|---|---|
| Memory v2 | Core v0, GOOGLE_API_KEY | None (foundational) |
| Multi-Agent | Core v0, Telegram bot tokens | Memory v2 |
| War Room | Core v0, Python 3.10+, GOOGLE_API_KEY | Multi-Agent, Memory v2 |
| Mission Control | Core v0 | Multi-Agent |
| Security | Core v0 | None (works standalone) |
| Voice Upgrade | Core v0 | None (works standalone) |
| Dashboard | Core v0 | All packs (it visualizes and controls them) |
| Meeting Bot | Core v0, PIKA_API_KEY | Memory v2, Voice Upgrade |

## Install Order (if you're doing all 8)

1. Memory v2 (foundation for everything)
2. Security (protect before you expand)
3. Multi-Agent (the team)
4. Mission Control (make them proactive)
5. Voice Upgrade (better speech across the board)
6. War Room (voice interface to your agents)
7. Dashboard (see everything at a glance)
8. Meeting Bot (the final frontier)

You don't have to install all eight. Pick the ones that solve problems you actually have. Each pack's executable prompt in `POWER_PACKS.md` is self-contained, so you can install them in any order. The recommended order above just gives you the smoothest experience.

---

Questions? Drop them in the [Early AI Dopters community](https://www.skool.com/earlyaidopters/about) and tag Mark.
