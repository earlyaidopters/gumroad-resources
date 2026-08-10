# ClaudeClaw Assessment Prompt

Paste this into a Claude Code session inside your existing ClaudeClaw directory. It will audit your current setup, identify gaps, and recommend which Power Packs to install.

---

## YOUR ROLE

You are a ClaudeClaw OS auditor. The user already has a working ClaudeClaw installation. Your job is to assess their current setup against the v2 feature set and give them a clear, prioritized action plan.

Do NOT modify any code. Read-only. Report what you find.

## STEP 1 - Scan the codebase

Read and analyze the following files (skip any that don't exist):

**Core files:**
- `package.json` (dependencies, scripts, version)
- `src/index.ts` (entry point, what gets initialized)
- `src/agent.ts` (SDK version, query options, session resume)
- `src/config.ts` (env vars, timeouts, limits)
- `src/bot.ts` (message handler, commands, integrations)
- `src/db.ts` (table schemas, migrations)
- `.env.example` (configuration surface area)
- `CLAUDE.md` (system prompt)

**Memory system:**
- `src/memory.ts` (retrieval layers)
- `src/memory-ingest.ts` (extraction logic)
- `src/memory-consolidate.ts` (consolidation)
- `src/embeddings.ts` (vector search)

**Multi-agent:**
- `src/orchestrator.ts` (delegation)
- `src/agent-config.ts` (agent loading)
- `agents/` directory (list all agent subdirectories)

**War Room:**
- `warroom/` directory (list all files)
- `warroom/server.py` (voice server)
- `src/agent-voice-bridge.ts` (Node bridge)

**Security:**
- `src/security.ts` (PIN, kill phrase, audit)
- `src/exfiltration-guard.ts` (secret scanning)

**Scheduler:**
- `src/scheduler.ts` (cron polling)
- `src/schedule-cli.ts` and `src/mission-cli.ts`

**Voice:**
- `src/voice.ts` (STT/TTS providers)

**Dashboard:**
- `src/dashboard.ts` (web server)
- `src/dashboard-html.ts` (UI)

**Meeting bot:**
- `src/meet-cli.ts` (meeting join)
- `skills/pikastream-video-meeting/`

## STEP 2 - Check each v2 feature

For each feature below, report whether it exists, is partially implemented, or is missing.

### Memory v2
- [ ] Gemini-powered extraction (`gemini-3-flash-preview` model)
- [ ] 768-dim embeddings via `gemini-embedding-001`
- [ ] 5-layer retrieval (semantic, recent high-importance, consolidation insights, cross-agent hive, conversation history)
- [ ] Importance scoring (0-1 range)
- [ ] Salience field (0-5 range, separate from importance)
- [ ] Importance-weighted decay (pinned=0%, high=1%/day, mid=2%/day, low=5%/day)
- [ ] Memory pinning (user-controlled, exempt from decay)
- [ ] Supersession (contradiction resolution, newer memory wins)
- [ ] Relevance feedback (post-response Gemini evaluation of surfaced memories)
- [ ] Memory nudging (configurable intervals)
- [ ] Duplicate detection (0.85 cosine threshold)
- [ ] FTS5 full-text search with optimized triggers
- [ ] 30-minute consolidation cycle

### Multi-Agent
- [ ] Agent config via agent.yaml files
- [ ] MCP server filtering inline in agent.yaml (not separate JSON)
- [ ] Orchestrator with @agent delegation syntax
- [ ] Hive mind table for cross-agent activity
- [ ] Inter-agent task system
- [ ] Agent creation wizard with Telegram token validation
- [ ] Session isolation (composite key: chat_id + agent_id)
- [ ] Launchd/systemd service generation per agent
- [ ] External config support (CLAUDECLAW_CONFIG directory)

### War Room
- [ ] Pipecat voice server in warroom/ directory
- [ ] Dual mode (live via Gemini Live + legacy via Deepgram/Cartesia)
- [ ] Agent routing (broadcast, name prefix, pinned)
- [ ] GoT-themed personas (Hand of the King, Grand Maester, etc.)
- [ ] Tool functions (delegate_to_agent, answer_as_agent, get_time, list_agents)
- [ ] Agent voice bridge (src/agent-voice-bridge.ts)
- [ ] Cinematic HTML UI (warroom-html.ts)
- [ ] Pin state via /tmp/warroom-pin.json

### Mission Control
- [ ] 60-second cron polling scheduler
- [ ] Schedule CLI (create, list, pause, resume, delete)
- [ ] Mission task queue with priority ordering
- [ ] Mission CLI
- [ ] Stuck task recovery on init
- [ ] Auto-assignment via Gemini classification

### Security
- [ ] PIN lock with salted SHA-256
- [ ] Idle auto-lock (configurable minutes)
- [ ] Emergency kill phrase
- [ ] Exfiltration guard (15+ regex patterns)
- [ ] Base64 and URL-encoded secret scanning
- [ ] Audit log with typed action categories
- [ ] Chat ID allowlist

### Voice
- [ ] STT cascade (Groq Whisper primary, whisper-cpp fallback)
- [ ] TTS cascade (ElevenLabs, Gradium, Kokoro, macOS say)
- [ ] Automatic failover between providers

### Dashboard
- [ ] Hono web server on port 3141
- [ ] Token-based auth
- [ ] Memory timeline with search
- [ ] Token usage tracking
- [ ] Agent status cards
- [ ] Mission task queue viewer
- [ ] Audit log browser
- [ ] SSE real-time updates
- [ ] War Room management endpoints

### Meeting Bot
- [ ] Pre-flight briefing from Calendar, Gmail, Memory
- [ ] Pika video avatar support
- [ ] Recall.ai voice-only alternative
- [ ] meet_sessions table tracking

### Core
- [ ] AGENT_MAX_TURNS (default 30, prevents runaway loops)
- [ ] AGENT_TIMEOUT_MS (900s / 15 minutes)
- [ ] Cost footer (5 modes: compact, verbose, cost, full, off)
- [ ] Message classifier (simple vs complex routing)
- [ ] Message queue (per-chat FIFO)
- [ ] Error classification with retry policies and model fallback
- [ ] Field-level AES-256-GCM encryption for WhatsApp/Slack messages
- [ ] OAuth health monitoring
- [ ] Rate tracking with budget warnings

## STEP 3 - Generate the report

Present your findings in this format:

```
## ClaudeClaw OS Assessment

### What you have (working)
- [list features that are fully implemented]

### Partially implemented (needs updating)
- [list features that exist but are outdated or incomplete]
- For each one, explain what's missing

### Not installed yet
- [list features that don't exist in the codebase]

### Recommended Power Packs (in order)
1. [Pack name] - [why this one first]
2. [Pack name] - [why]
...

### Config issues
- [any env vars that are set wrong, missing, or outdated]
- [any dependencies that need updating]

### Version info
- SDK version: [current]
- Node version: [current]
- Gemini model in use: [current]
```

Be specific. Reference actual file paths, line numbers, and function names. Don't guess. If a file doesn't exist, say so.
