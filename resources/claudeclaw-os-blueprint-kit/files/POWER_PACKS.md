# ClaudeClaw OS - Power Packs

You already have ClaudeClaw v0 running. These packs add v2 features one at a time. Pick the ones you want, paste them into a Claude Code session inside your ClaudeClaw directory, and Claude will read your existing code and add the feature.

Each pack is independent. Install them in any order.

---

## Pack 1: Memory v2

**What it adds:** Replaces v0's simple 3-layer memory with LLM-extracted Gemini consolidation and salience-based decay. Every conversation gets processed through Gemini Flash, which pulls out facts worth remembering, scores them by importance, and generates embeddings for duplicate detection. Memories decay over time based on importance, and a post-response relevance evaluation adjusts salience scores so useful memories survive longer. A background consolidation pass runs every 30 minutes to find cross-cutting patterns, contradictions, and connections. Retrieval upgrades from basic keyword lookup to a 5-layer stack combining semantic search, FTS5, recency, consolidation insights, and conversation history recall.

**What you need:**
- `GOOGLE_API_KEY` in your `.env` file (get one free at aistudio.google.com)
- `npm install @google/genai` (the pack prompt will handle this)

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Create `src/memory-ingest.ts`:
- Import `GoogleGenAI` from `@google/genai`. Initialize with `process.env.GOOGLE_API_KEY`.
- Export `async function ingestConversation(chatId: string, agentId: string, messages: Array<{role: string, content: string}>): Promise<void>`
- This function runs fire-and-forget. Call it async after sending the response to Telegram. It must never block the user-facing response.
- Build an EXTRACTION_PROMPT that sends the conversation to `gemini-3-flash-preview` and asks it to classify whether any turn contains information worth remembering long-term. The response schema is:
```typescript
interface ExtractionResult {
  memories: Array<{
    summary: string;
    entities: string[];
    topics: string[];
    importance: number; // 0-1
  }>;
}
```
- Filter results by `importance >= 0.5` threshold.
- For each surviving memory, generate an embedding via `gemini-embedding-001` (768-dim) by calling `client.models.embedContent({ model: "gemini-embedding-001", contents: memory.summary })`.
- Before inserting, run duplicate detection: query existing embeddings from DB, compute cosine similarity. If any existing memory scores > 0.85 similarity, skip the duplicate.
- Insert non-duplicate memories into the `memories` table with all fields populated. Store the embedding as a hex-encoded string. Set initial `salience` to the memory's importance score.
- When a memory has `importance >= 0.8`, call `notifyHighImportance(memory)` which sends a Telegram message to the configured admin chat so they can pin it.
- Export `function cosineSimilarity(a: number[], b: number[]): number` as a utility.

Export `async function evaluateRelevance(surfacedMemoryIds: string[], userQuestion: string, assistantResponse: string): Promise<void>`:
- Fire-and-forget, runs after the response is sent.
- Send the surfaced memories, the user question, and the assistant response to `gemini-3-flash-preview`.
- Ask which memories were actually useful for answering the question.
- For each memory rated as useful: `salience += 0.1` (cap at 5.0).
- For each memory rated as unused: `salience -= 0.05` (floor at 0.05).
- Update salience values in the DB.

Create `src/memory-consolidate.ts`:
- Export `async function runConsolidation(agentId: string): Promise<void>`
- Query all memories where `consolidated = 0` for this agent.
- If fewer than 3 unconsolidated memories exist, skip.
- Send them to `gemini-3-flash-preview` with a CONSOLIDATION_PROMPT that instructs the model to:
  1. Find cross-cutting patterns and themes across the memories.
  2. Identify connections between separate memories.
  3. Flag contradictions (newer memory supersedes older).
  4. Produce a consolidated insight summary.
- Response schema:
```typescript
interface ConsolidationResult {
  insights: string;
  patterns: string[];
  contradictions: Array<{ old_memory_id: string; new_memory_id: string; resolution: string }>;
}
```
- For contradictions, set the old memory's `superseded_by` field to the new memory's ID.
- Save the consolidation result to the `consolidations` table atomically (wrap in a transaction).
- Mark all processed memories as `consolidated = 1`.
- Export `function startConsolidationLoop(agentId: string): void` that calls `setInterval(runConsolidation, 30 * 60 * 1000)`.

Create `src/embeddings.ts`:
- Thin wrapper around the Google Gemini embeddings API.
- Export `async function generateEmbedding(text: string): Promise<number[]>`
- Uses model `gemini-embedding-001`, returns a 768-dimensional float array.
- Export `function encodeEmbedding(vec: number[]): string` (to hex) and `function decodeEmbedding(hex: string): number[]` (from hex).

Update `src/db.ts`:
- Add a `memories` table with columns: `id` (TEXT PRIMARY KEY, use uuid), `chat_id` (TEXT), `agent_id` (TEXT), `summary` (TEXT), `raw_text` (TEXT), `entities` (TEXT, JSON array), `topics` (TEXT, JSON array), `importance` (REAL), `salience` (REAL NOT NULL DEFAULT 1.0), `pinned` (INTEGER NOT NULL DEFAULT 0), `superseded_by` (INTEGER REFERENCES memories(id)), `consolidated` (INTEGER DEFAULT 0), `embedding` (TEXT, hex-encoded 768-dim vector), `created_at` (TEXT, ISO timestamp), `last_accessed` (TEXT).
- Salience range is 0-5. Decays daily via `runSalienceDecay()`:
  - Pinned memories (`pinned = 1`): 0% decay, never touched.
  - `importance >= 0.8`: `salience *= 0.99` per day.
  - `importance >= 0.5`: `salience *= 0.98` per day.
  - `importance < 0.5`: `salience *= 0.95` per day.
  - Hard delete any memory where `salience < 0.05`.
- Add a `consolidations` table with columns: `id` (TEXT PRIMARY KEY), `agent_id` (TEXT), `insights` (TEXT), `patterns` (TEXT, JSON array), `contradictions` (TEXT, JSON array), `memory_ids` (TEXT, JSON array of processed memory IDs), `created_at` (TEXT).
- Add a `memories_fts` FTS5 virtual table on `summary, raw_text, entities, topics` with content synced from `memories` via INSERT/UPDATE/DELETE triggers. FTS5 update triggers must be restricted to content columns only (`UPDATE OF summary, raw_text, entities, topics`) to prevent write amplification during salience decay sweeps.
- Add helper functions: `insertMemory(mem)`, `getMemoriesByAgent(agentId)`, `getUnconsolidatedMemories(agentId)`, `markMemoriesConsolidated(ids)`, `insertConsolidation(result)`, `searchMemoriesFTS(query, limit)`, `getAllEmbeddings(agentId)`, `updateSalience(id, newValue)`, `pinMemory(id)`, `unpinMemory(id)`, `setSupersededBy(oldId, newId)`, `runSalienceDecay()`, `searchConversationHistory(keywords, agentId, dayWindow, limit)`.
- Add memory nudging config: `MEMORY_NUDGE_INTERVAL_TURNS` (default 10), `MEMORY_NUDGE_INTERVAL_HOURS` (default 2). When either threshold is crossed, proactively surface top-salience memories related to the current conversation topic.

Update `src/memory.ts`:
- Replace the existing `buildMemoryContext` function with a new implementation that uses a 5-layer retrieval stack:
  1. **Semantic search**: Generate embedding for the current query, compute cosine similarity against all stored embeddings for this agent. Minimum threshold: 0.3 cosine similarity. Return top 5.
  2. **FTS5 keyword search**: Run `searchMemoriesFTS` with extracted keywords from the query, return top 5.
  3. **Recent high-importance**: Fetch the 5 most recent memories with importance >= 0.7.
  4. **Consolidation insights**: Fetch the latest 3 consolidation records for this agent.
  5. **Conversation history recall**: Call `searchConversationHistory` with keyword extraction from the current query, 7-day window, return top 10.
- Deduplicate results across layers by memory ID.
- Format all results into a context string with section headers.
- Keep the existing function signature so callers don't break.
- Track which memory IDs were surfaced so `evaluateRelevance` can score them after the response.

Add `GOOGLE_API_KEY=your_key_here` to `.env.example` if not already present.

Run `npm install @google/genai` to add the dependency.

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Pack 2: Multi-Agent

**What it adds:** Turns your single-bot ClaudeClaw into a multi-agent system (up to 20 agents). Each agent gets its own Telegram bot, its own CLAUDE.md personality file, its own working directory scope, and its own MCP tool allowlist configured inline in agent.yaml. Agents coordinate through a shared hive_mind table. Includes an interactive creation wizard that validates your Telegram token, writes the config files, and generates a launchd plist (macOS) or systemd unit (Linux) so the agent starts on boot. Each agent gets a color from a 15-color palette for the dashboard UI.

**What you need:**
- One Telegram bot token per agent (create via @BotFather on Telegram)

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Create `src/orchestrator.ts`:
- Export `interface AgentRegistry` that maps agent IDs to their config (cwd, claudeMdPath, telegramToken, model, color).
- MCP tool allowlists are defined inline in each agent's `agent.yaml` under the `mcp_servers` field. No separate JSON files.
- Export `async function delegateToAgent(agentId: string, prompt: string, senderChatId: string): Promise<string>`
  - Loads the target agent's config from the registry.
  - Executes Claude Code in-process with isolated `cwd` set to the agent's configured directory.
  - Reads MCP filtering from the agent's `agent.yaml` `mcp_servers` field.
  - Passes the agent's CLAUDE.md path as system context.
  - Default model per agent: `claude-sonnet-4-6` (overridable in agent.yaml).
  - Records the delegation in the `hive_mind` table with action="delegation", summary of the prompt, and any artifacts returned.
  - Returns the agent's response text.
- Parse delegation syntax from user messages: `@agentId: prompt` or `/delegate agentId prompt`.
- Export `function isDelegationRequest(text: string): { agentId: string; prompt: string } | null`
- Agent ID validation: `/^[a-z][a-z0-9_-]{0,29}$/` (lowercase, starts with letter, max 30 chars).
- Maximum 20 agents. Reject creation attempts beyond this limit.
- External config resolution: check `CLAUDECLAW_CONFIG/agents/{id}/` first, fall back to `PROJECT_ROOT/agents/{id}/`.
- Export lifecycle functions: `activateAgent(id)`, `deactivateAgent(id)`, `restartAgent(id)`, `deleteAgent(id)`.
- Export `function assignColor(agentId: string): string` that picks from a 15-color palette for dashboard display.

Create `src/agent-create.ts`:
- Export `async function createAgentWizard(): Promise<void>`
- Interactive wizard flow (reads from stdin):
  1. Pick a template from `agents/_template/` or start blank.
  2. Enter agent ID (validate against `/^[a-z][a-z0-9_-]{0,29}$/`).
  3. Enter display name.
  4. Paste Telegram bot token. Validate by calling `https://api.telegram.org/bot{token}/getMe`. If it fails, ask again.
  5. Set working directory (default: current project root).
  6. Set MCP allowlist (comma-separated tool names, or "all"). This goes into the `mcp_servers` field of agent.yaml.
  7. Set model (default: `claude-sonnet-4-6`).
  8. Write `agents/{id}/agent.yaml` with all config, loaded via `js-yaml`.
  9. Copy `agents/_template/CLAUDE.md` to `agents/{id}/CLAUDE.md`.
  10. Append `{ID}_TELEGRAM_TOKEN=bot_token_value` to `.env`.
  11. Generate a launchd plist (macOS) at `~/Library/LaunchAgents/com.claudeclaw.agent.{id}.plist` or systemd unit (Linux) at `~/.config/systemd/user/claudeclaw-agent-{id}.service`. The service runs `npm run agent:start -- --agent={id}`.
- Print summary of created files when done.

Create `agents/_template/` directory at project root:
- `agent.yaml.example`:
```yaml
id: example-agent
name: Example Agent
model: claude-sonnet-4-6
personality: A helpful assistant focused on research tasks.
cwd: .
mcp_servers:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
```
- `CLAUDE.md` template:
```markdown
# Agent: {{AGENT_NAME}}

You are {{AGENT_NAME}}, a specialized ClaudeClaw agent.

## Your Role
{{PERSONALITY}}

## Coordination
- Log significant actions to hive_mind so other agents can see what you've done.
- Check hive_mind for context from other agents before starting new tasks.
- When you complete a task delegated by another agent, include a clear summary in your response.
```

Update `src/db.ts`:
- Add `hive_mind` table: `id` (TEXT PRIMARY KEY), `agent_id` (TEXT), `chat_id` (TEXT), `action` (TEXT), `summary` (TEXT), `artifacts` (TEXT, JSON), `created_at` (TEXT ISO timestamp).
- Add `inter_agent_tasks` table: `id` (TEXT PRIMARY KEY), `from_agent` (TEXT), `to_agent` (TEXT), `prompt` (TEXT), `status` (TEXT DEFAULT 'pending'), `result` (TEXT), `created_at` (TEXT), `completed_at` (TEXT).
- `sessions` table uses composite primary key `(chat_id, agent_id)`.
- Add helper functions: `insertHiveEntry(entry)`, `getRecentHiveEntries(limit)`, `insertInterAgentTask(task)`, `getTasksForAgent(agentId)`, `completeTask(taskId, result)`.

Update `src/index.ts`:
- Detect `--agent` CLI flag. If present, load agent-specific config via `loadAgentConfig(agentId)` from the agent's `agent.yaml` using `js-yaml`.
- Set `process.env.CLAUDECLAW_AGENT_ID` to the agent ID.
- Use the agent's Telegram token instead of the default `TELEGRAM_TOKEN`.
- Pass the agent's CLAUDE.md path to the query function.

Add to `package.json` scripts:
```json
"agent:create": "npx tsx src/agent-create.ts",
"agent:start": "npx tsx src/index.ts"
```

Run `npm install js-yaml @types/js-yaml` to add dependencies.

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Pack 3: War Room

**What it adds:** A real-time voice room powered by Pipecat and Gemini Live. You open a browser tab, talk to your agents through speech, and they respond with voice. Two modes: "live" (default) uses Gemini Live for native speech-to-speech with tool calling, so there is no transcription delay. "Legacy" mode falls back to Deepgram STT + Cartesia TTS. A Game of Thrones-themed persona system gives each agent a distinct voice and role. The whole thing runs as a subprocess that auto-respawns on crash.

**What you need:**
- `GOOGLE_API_KEY` in your `.env` file
- Python 3.9+
- `pip install pipecat-ai[websocket,deepgram,cartesia,silero]`

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Create `warroom/` directory at project root with these files:

`warroom/config.py`:
- Load env vars from `.env` in the project root.
- Constants: `PORT = 7860`, `MODE = os.getenv("WARROOM_MODE", "live")` (either "live" or "legacy").
- Paths: `PIN_FILE = "/tmp/warroom-pin.json"`, `AGENT_ROSTER = "/tmp/warroom-agents.json"`, `DEBUG_LOG = "/tmp/warroom-debug.log"`.

`warroom/personas.py`:
- Define 5 Game of Thrones-themed agent personas as a dict:
```python
PERSONAS = {
    "main": {
        "title": "Hand of the King",
        "cartesia_voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "gemini_voice": "Charon",
        "system_prompt": "You are the Hand of the King, the primary ClaudeClaw assistant. Handle general queries, coordinate with other agents when needed.",
        "triggers": ["main", "hey", "help"]
    },
    "research": {
        "title": "Grand Maester",
        "cartesia_voice_id": "79a125e8-cd45-4c13-8a67-188112f4dd22",
        "gemini_voice": "Kore",
        "system_prompt": "You are the Grand Maester, the research agent. You find information, analyze data, and provide detailed answers with sources.",
        "triggers": ["research", "look up", "find out", "investigate"]
    },
    "comms": {
        "title": "Master of Whisperers",
        "cartesia_voice_id": "b7d50908-b17c-442d-ad8d-810c63997ed9",
        "gemini_voice": "Aoede",
        "system_prompt": "You are the Master of Whisperers, the communications agent. You draft emails, messages, and social posts in the user's voice.",
        "triggers": ["comms", "email", "message", "draft", "write to"]
    },
    "content": {
        "title": "Royal Bard",
        "cartesia_voice_id": "c8f144b8-208f-4057-ab12-a1c4c2f74b68",
        "gemini_voice": "Leda",
        "system_prompt": "You are the Royal Bard, the content agent. You create scripts, outlines, titles, and creative assets.",
        "triggers": ["content", "script", "outline", "title", "thumbnail"]
    },
    "ops": {
        "title": "Master of War",
        "cartesia_voice_id": "726d5ae5-055f-4c3d-8355-d9677c2e1b3f",
        "gemini_voice": "Alnilam",
        "system_prompt": "You are the Master of War, the ops agent. You manage schedules, deployments, system health, and infrastructure.",
        "triggers": ["ops", "deploy", "schedule", "server", "status"]
    }
}
```

`warroom/router.py` (Python):
- Export `def route_utterance(text: str, pinned_agent: str | None) -> str`
- 3 routing rules applied in order:
  1. **Broadcast triggers**: if text contains "everyone", "team", or "status", return `"broadcast"`.
  2. **Agent name prefix**: if text starts with an agent name (e.g. "research, look up..."), return that agent ID.
  3. **Pinned agent fallback**: read `/tmp/warroom-pin.json` (if it exists) for `{"agent": "agent_id"}`. If a pin exists, route to that agent.
  4. Default: return `"main"`.
- Export `def pin_agent(agent_id: str) -> None` and `def unpin_agent() -> None` for managing the pin file.

`warroom/agent_bridge.py` (Python):
- Thin wrapper that calls `src/agent-voice-bridge.ts` via subprocess.
- Export `async def invoke_agent(agent_id: str, prompt: str, chat_id: str = "warroom") -> str`
- Runs: `node dist/agent-voice-bridge.js --agent={agent_id} --message="{prompt}" --chat-id={chat_id} --quick`
- Parses JSON stdout: `{"response": "...", "usage": {...}, "error": null}`
- Returns the response string. On error, returns a fallback message.

`warroom/server.py`:
- FastAPI + Pipecat WebSocket server on port 7860.
- Two modes based on `config.MODE`:
  - **live** (default): Uses `GeminiLiveLLMService` with tool calling. Tool functions available to Gemini:
    - `delegate_to_agent(agent: str, title: str, prompt: str, priority: int)` - routes work to a specific agent.
    - `answer_as_agent(agent: str, question: str)` - asks a specific agent and reads the response aloud.
    - `get_time()` - returns current time.
    - `list_agents()` - returns active agent roster.
  - Auto-mode: Gemini acts as router. Persona system prompt says "decide which agent fits, speak a brief acknowledgment, call answer_as_agent, then read the result verbatim."
  - **legacy**: Pipeline of Deepgram STT -> router.route_utterance -> agent_bridge.invoke_agent -> Cartesia TTS.
- Audio config: 16kHz input, 24kHz output, protobuf serialization.
- WebSocket endpoint at `/ws` for Pipecat client connections.
- HTTP endpoint at `/health` returning `{"status": "ok", "mode": config.MODE}`.
- Logging to `/tmp/warroom-debug.log`.

`warroom/requirements.txt`:
```
pipecat-ai[websocket,deepgram,cartesia,silero]
fastapi
uvicorn
python-dotenv
```

`warroom/voices.json`:
- Maps each agent ID to its Cartesia voice_id, Gemini voice name, and GoT title from personas.py. JSON format for easy external consumption.

`warroom/client.js`:
- Imports `PipecatClient` from `@anthropic-ai/pipecat-client-js` and `WebSocketTransport` from `@anthropic-ai/pipecat-client-js/transports/websocket`.
- Connects to `ws://localhost:7860/ws`.
- Handles audio capture from browser microphone and playback of agent responses.
- Export this as an ES module.

`warroom/client.bundle.js`:
- Built via esbuild from client.js.

`warroom/warroom-html.ts` (69KB embedded HTML):
- Export `function getWarRoomHTML(): string` that returns a full HTML page with cinematic intro for the War Room browser UI.
- Dark theme, centered layout.
- Shows: connection status indicator, active agent name with GoT title, transcript log (scrolling), push-to-talk button (or voice activity detection toggle).
- Includes the bundled `client.bundle.js` via a script tag.
- This HTML is served by the dashboard (Pack 7) at the `/warroom` route, or standalone via a simple HTTP handler.

Create `src/agent-voice-bridge.ts` (Node.js CLI bridge):
- CLI entry point that the War Room calls to invoke a Claude Code agent for voice responses.
- Parse args: `--agent` (agent ID), `--message` (the transcribed utterance), `--chat-id` (default "warroom"), `--quick` (limits to 3 conversation turns max for snappy voice responses).
- When `--quick` is set, prepend to the prompt: "War Room auto-routing: The user is in a voice meeting and this answer will be read aloud verbatim. Respond in 1-2 short sentences."
- Strip all `CLAUDE_CODE_*` env vars from the child process environment to prevent nested session conflicts.
- Validate agent ID against `/^[a-z][a-z0-9_-]{0,29}$/` for security.
- Initialize DB connection.
- Load agent config via `loadAgentConfig(agentId)`.
- Call the `query()` function with the agent's configured cwd and MCP allowlist.
- Print JSON to stdout: `{"response": "agent's text reply", "usage": {"input_tokens": N, "output_tokens": N}, "error": null}`.
- On error, print: `{"response": null, "usage": null, "error": "error message"}`.

Update `src/index.ts`:
- Add War Room supervisor logic:
  - On startup, spawn `python warroom/server.py` as a child process.
  - Monitor the process. On crash: if exit was from an intentional signal (SIGTERM, SIGINT), respawn after 300ms. For real crashes, use exponential backoff starting at 1s, max 30s.
  - Log all subprocess output to `/tmp/warroom-debug.log`.
  - On ClaudeClaw shutdown, send SIGTERM to the War Room process and wait for clean exit.
- Gate this behind `WARROOM_ENABLED=true` env var (default: disabled).

Bundle the client: add to `package.json` scripts:
```json
"warroom:bundle": "npx esbuild warroom/client.js --bundle --outfile=warroom/client.bundle.js --format=esm"
```

Add `WARROOM_ENABLED`, `WARROOM_MODE`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY` to `.env.example`.

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Pack 4: Mission Control

**What it adds:** Two systems in one. First, a cron-based scheduler that polls every 60 seconds, picks up due tasks from the database, locks them, executes them through the agent system with a 10-minute timeout, and computes the next run time. Second, a mission task queue for one-shot async jobs with priority ordering and optional agent auto-assign via a cheap Gemini model. Both integrate with the multi-agent system if you have it, or run on the default agent if you don't.

**What you need:**
- Nothing extra. This pack has no external dependencies beyond what ClaudeClaw already uses.

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Create `src/scheduler.ts`:
- Import `cron-parser` for schedule parsing.
- Export `function initScheduler(sender: (chatId: string, text: string) => Promise<void>, agentId: string): void`
  - Call `resetStuckTasks()` on init to recover any tasks left in 'running' state from a previous crash (set them back to 'active').
  - Starts a `setInterval` loop that runs every 60 seconds.
  - Each tick: query the `scheduled_tasks` table for tasks where `status = 'active'` and `next_run <= NOW()`.
  - For each due task:
    1. Call `markTaskRunning(taskId)` to lock it (prevents double-execution).
    2. Execute the task's prompt via `runAgent(task.agent_id, task.prompt)` with a 10-minute timeout (use `Promise.race` with a timeout promise).
    3. On success: store the result in `last_result`, update `last_run` to now, compute `next_run` using `cron-parser` from the task's `schedule` field, update status back to `'active'`.
    4. On timeout or error: store the error message in `last_result`, set status to `'error'`, send the error to the task's `chat_id` via `sender()`.
    5. Send completion notification to `chat_id` via `sender()`.
- Export `function stopScheduler(): void` to clear the interval.

Create `src/schedule-cli.ts`:
- CLI for managing scheduled tasks. Parse subcommands from process.argv:
  - `create --prompt "..." --schedule "0 9 * * *" --agent main --chat-id 123` - Creates a new scheduled task. Validates the cron expression with `cron-parser`. Computes the initial `next_run`. Inserts into `scheduled_tasks`.
  - `list` - Shows all tasks for the current agent (filtered by `CLAUDECLAW_AGENT_ID` if set, otherwise shows all). Columns: id, agent, prompt (truncated to 50 chars), schedule, next_run, status, last_run.
  - `delete --id TASK_ID` - Removes a task.
  - `pause --id TASK_ID` - Sets status to `'paused'`.
  - `resume --id TASK_ID` - Sets status to `'active'`, recomputes `next_run` from now.
- Format output as a clean table using string padding (no external table library needed).

Create `src/mission-cli.ts`:
- CLI for one-shot async tasks (missions):
  - `create --title "Deploy staging" --prompt "..." --agent ops --priority 3` - Inserts into `mission_tasks` with status `'queued'`. Priority is 1-5, where 1 is highest. The `--agent` flag is optional; if omitted, `assigned_agent` is NULL and the dashboard auto-assigns using a cheap Gemini model to classify the task.
  - `list` - Shows all missions. Ordered by priority ASC then created_at ASC. Columns: id, title, agent, priority, status, created_at.
  - `result --id TASK_ID` - Shows the full result text of a completed mission.
  - `cancel --id TASK_ID` - Sets status to `'cancelled'`.
- The scheduler picks up queued missions on each tick (after checking scheduled tasks). It processes them in priority order, one per tick, to avoid overwhelming the system.

Update `src/db.ts`:
- Add `scheduled_tasks` table: `id` (TEXT PRIMARY KEY), `agent_id` (TEXT), `chat_id` (TEXT), `prompt` (TEXT), `schedule` (TEXT, cron expression), `next_run` (TEXT, ISO timestamp), `status` (TEXT DEFAULT 'active'), `last_run` (TEXT), `last_result` (TEXT), `created_at` (TEXT).
- Add `mission_tasks` table: `id` (TEXT PRIMARY KEY), `title` (TEXT), `prompt` (TEXT), `assigned_agent` (TEXT, nullable), `status` (TEXT DEFAULT 'queued'), `priority` (INTEGER DEFAULT 3), `result` (TEXT), `created_at` (TEXT), `completed_at` (TEXT).
- Add helper functions: `insertScheduledTask(task)`, `getDueTasks(now)`, `markTaskRunning(id)`, `updateTaskAfterRun(id, result, nextRun)`, `pauseTask(id)`, `resumeTask(id, nextRun)`, `deleteTask(id)`, `listScheduledTasks(agentId?)`, `resetStuckTasks()`, `insertMission(mission)`, `getNextQueuedMission()`, `completeMission(id, result)`, `cancelMission(id)`, `getMissionResult(id)`, `listMissions()`.

Update `src/index.ts`:
- After bot initialization, call `initScheduler(sender, agentId)` to start the polling loop.
- On shutdown (SIGTERM/SIGINT handler), call `stopScheduler()`.

Add to `package.json` scripts:
```json
"schedule": "npx tsx src/schedule-cli.ts",
"mission": "npx tsx src/mission-cli.ts"
```

Run `npm install cron-parser` to add the dependency.

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Pack 5: Security

**What it adds:** PIN-based session locking, idle auto-lock after configurable minutes, an emergency kill phrase that immediately stops all services and force-exits, an exfiltration guard that scans every outbound message for leaked API keys and secrets before it reaches Telegram, and a full audit log of every command and blocked action.

**What you need:**
- Nothing extra. All optional config goes in `.env`.

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Create `src/security.ts` (single file, approximately 215 lines, all 4 security layers):
- **PIN Lock System:**
  - Export `function setPinHash(pin: string): string` - Takes a raw PIN, generates a random 16-byte salt, hashes with SHA-256 (`crypto.createHash('sha256').update(salt + pin).digest('hex')`), returns `salt:hash` format.
  - Export `function verifyPin(input: string, storedHash: string): boolean` - Splits stored hash on `:`, re-hashes input with the salt, compares.
  - Export `function isLocked(): boolean` - Returns current lock state (module-level boolean, default: `true` if `SECURITY_PIN_HASH` is set in env).
  - Export `function unlock(pin: string): boolean` - Verifies PIN against `SECURITY_PIN_HASH` env var. If valid, sets lock state to false, resets idle timer, logs to audit with action `"unlock"`. Returns success boolean.
  - Export `function lock(): void` - Sets lock state to true, logs to audit with action `"lock"`.

- **Idle Auto-Lock:**
  - Export `function resetIdleTimer(): void` - Clears existing timeout, starts a new one for `IDLE_LOCK_MINUTES` (default: 30) minutes. On expiry, calls `lock()`.
  - Called automatically after every successful command execution.

- **Emergency Kill Phrase:**
  - Export `function checkKillPhrase(text: string): boolean` - Case-insensitive match against `EMERGENCY_KILL_PHRASE` env var (e.g., "shutdown everything now").
  - If matched: log to audit with action `"kill"`, stop all launchd services matching `com.claudeclaw.*` (macOS) or systemd services matching `claudeclaw-*` (Linux) via `child_process.execSync`, then call `process.exit(1)`.
  - Returns true if kill phrase was detected (caller should abort further processing).

- **Audit Logging:**
  - Export `async function auditLog(agentId: string, chatId: string, action: string, detail: string, blocked: boolean): Promise<void>` - Inserts into `audit_log` table.
  - Valid action types: `message`, `command`, `delegation`, `unlock`, `lock`, `kill`, `blocked`.
  - Export `async function getAuditLog(agentId: string, limit: number): Promise<AuditEntry[]>` - Fetches recent audit entries.

Create `src/exfiltration-guard.ts`:
- Export `function scanForSecrets(text: string): { clean: string; leaked: string[] }`
- Scans outbound text against these regex patterns (15+):
  - Anthropic API keys: `sk-ant-[a-zA-Z0-9_-]{20,}`
  - Generic SK keys (not sk-ant-): `sk-[a-zA-Z0-9]{20,}`
  - Slack tokens: `xox[bp]-[a-zA-Z0-9-]+`
  - GitHub tokens: `gh[po]_[a-zA-Z0-9]{20,}`
  - AWS access keys: `AKIA[0-9A-Z]{16}`
  - Long hex strings (41+ chars, exclude git commit/tree/parent hashes): `[0-9a-fA-F]{41,}`
  - Telegram bot tokens: `[0-9]{8,10}:[a-zA-Z0-9_-]{35}`
  - OpenAI keys: `sk-[a-zA-Z0-9]{32,}`
  - Google API keys: `AIza[0-9A-Za-z_-]{35}`
  - Stripe keys: `sk_live_[a-zA-Z0-9]{24,}` and `sk_test_[a-zA-Z0-9]{24,}`
  - Twilio: `SK[0-9a-fA-F]{32}`
  - SendGrid: `SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}`
  - Mailgun: `key-[a-zA-Z0-9]{32}`
  - Firebase: `AAAA[a-zA-Z0-9_-]{7}:[a-zA-Z0-9_-]{140,}`
  - Private keys: `-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----`
- Also check for protected env var values: read all env vars that contain "KEY", "TOKEN", "SECRET", or "PASSWORD" in their name. For each value longer than 8 chars, check if the value appears in the text as-is, base64-encoded, or URL-encoded.
- Replace any detected secrets with `[REDACTED]` in the clean output.
- Return both the cleaned text and a list of what was found (for audit logging).

Integrate security directly into `src/bot.ts` message handler (no separate middleware file):
- At the top of the message handler (before any command processing):
  1. Call `checkKillPhrase(messageText)`. If true, return immediately (the function handles shutdown).
  2. Call `isLocked()`. If locked, check if the message is a PIN entry (just digits). If so, call `unlock(pin)` and reply with success/failure. If not a PIN, reply with "Session locked. Send your PIN to unlock." and return.
  3. After successful command execution, call `resetIdleTimer()`.
- Before sending any response to Telegram:
  1. Call `scanForSecrets(responseText)`.
  2. If any secrets were leaked, use the cleaned text instead, and call `auditLog()` with action `"blocked"` and the list of detected patterns.

Update `src/db.ts`:
- Add `audit_log` table: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `agent_id` (TEXT), `chat_id` (TEXT), `action` (TEXT), `detail` (TEXT), `blocked` (INTEGER DEFAULT 0), `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP).
- Add helper functions: `insertAuditEntry(entry)`, `getAuditEntries(agentId, limit)`.

Add to `.env.example`:
```
# Security (all optional)
# SECURITY_PIN_HASH=salt:hash  (generate with: node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s+':'+c.createHash('sha256').update(s+'YOUR_PIN').digest('hex'))")
# IDLE_LOCK_MINUTES=30
# EMERGENCY_KILL_PHRASE=shutdown everything now
```

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Pack 6: Voice Upgrade

**What it adds:** A multi-provider voice system in a single file. STT uses Groq Whisper as the primary provider with whisper-cpp as a local fallback. TTS runs a cascade: ElevenLabs first (highest quality), then Gradium (European servers, low latency), then Kokoro (any OpenAI-compatible TTS server, zero cost), then macOS `say` as a last resort. If one provider fails or times out, it falls to the next without the user noticing.

**What you need:**
- For TTS: `ELEVENLABS_API_KEY` (existing from v0), or `GRADIUM_API_KEY`, or a Kokoro-compatible server running at `KOKORO_URL`
- For STT: `GROQ_API_KEY` for Groq Whisper, or `whisper-cpp` installed locally as fallback

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Update `src/voice.ts` (single file, approximately 504 lines, handles both STT and TTS. No separate provider files):

**STT (Speech-to-Text):**

```typescript
interface STTProvider {
  name: string;
  transcribe(audioBuffer: Buffer): Promise<string>;
  isAvailable(): boolean;
}
```

**STT Provider 1 - Groq Whisper (primary):**
- Endpoint: `https://api.groq.com/openai/v1/audio/transcriptions`
- Auth header: `Authorization: Bearer ${GROQ_API_KEY}`
- Model: `whisper-large-v3`
- `isAvailable()` checks for `GROQ_API_KEY` in env.

**STT Provider 2 - whisper-cpp (local fallback):**
- Runs via `child_process.execSync`: `whisper-cpp -m ${WHISPER_MODEL_PATH} -f /tmp/claudeclaw-stt.wav`
- `isAvailable()` checks that `whisper-cpp` binary exists on PATH.

**TTS (Text-to-Speech):**

```typescript
interface TTSProvider {
  name: string;
  generate(text: string, voiceId?: string): Promise<Buffer>;
  isAvailable(): boolean;
}
```

**TTS Provider 1 - ElevenLabs (existing):**
- Keep your existing ElevenLabs implementation.
- Wrap it to match the `TTSProvider` interface.
- Model: `eleven_turbo_v2_5`.
- `isAvailable()` checks for `ELEVENLABS_API_KEY` in env.

**TTS Provider 2 - Gradium:**
- Endpoint: `https://eu.api.gradium.ai/v1/audio/speech`
- Auth header: `Authorization: Bearer ${GRADIUM_API_KEY}`
- Body: `{ model: GRADIUM_MODEL || "default", voice: GRADIUM_VOICE_ID || "alloy", input: text }`
- Returns audio buffer directly.
- `isAvailable()` checks for `GRADIUM_API_KEY` in env.

**TTS Provider 3 - Kokoro (OpenAI-compatible TTS server):**
- Endpoint: `http://${KOKORO_URL || "localhost:8880"}/v1/audio/speech`
- OpenAI-compatible API (no auth needed). Works with any server that implements the OpenAI TTS API, not limited to Docker.
- Body: `{ model: KOKORO_MODEL || "kokoro", voice: KOKORO_VOICE || "af_heart", input: text }`
- `isAvailable()` pings the health endpoint with a 2-second timeout. Returns true only if the server is actually running.

**TTS Provider 4 - macOS say (fallback):**
- Uses `child_process.execSync` to run: `say -o /tmp/claudeclaw-tts.aiff "${escaped_text}" && ffmpeg -i /tmp/claudeclaw-tts.aiff -f mp3 /tmp/claudeclaw-tts.mp3 -y`
- Returns the mp3 buffer from `/tmp/claudeclaw-tts.mp3`.
- `isAvailable()` checks `process.platform === "darwin"`.
- This is the fallback of last resort. Quality is low but it always works on Mac.

**Cascade logic:**
- Export `async function generateSpeech(text: string, voiceId?: string): Promise<{ buffer: Buffer; provider: string }>`
- Build the provider list in order: [ElevenLabs, Gradium, Kokoro, macOS say].
- Filter to only `isAvailable()` providers.
- Try each in order. On success, return `{ buffer, provider: provider.name }`.
- On failure (network error, timeout, non-200 status), log the error and continue to the next provider.
- If all fail, throw an error with a summary of what was tried.

- Export `async function transcribeAudio(audioBuffer: Buffer): Promise<{ text: string; provider: string }>`
- Same cascade pattern: try Groq first, then whisper-cpp.

Add to `.env.example`:
```
# Voice (all optional, uses first available)
# GROQ_API_KEY=your_key
# WHISPER_MODEL_PATH=/path/to/ggml-large-v3.bin
# GRADIUM_API_KEY=your_key
# GRADIUM_VOICE_ID=alloy
# GRADIUM_MODEL=default
# KOKORO_URL=localhost:8880
# KOKORO_VOICE=af_heart
# KOKORO_MODEL=kokoro
```

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Pack 7: Dashboard

**What it adds:** A web-based control panel served by Hono on port 3141. Shows memory timeline, token usage graphs (via Chart.js), agent status cards, mission task queue, audit log, and hive mind activity. Protected by a token in the URL. Includes SSE for real-time updates via a `chatEvents` EventEmitter so the dashboard refreshes without polling. Dark theme, single-file SPA, no build step needed for the frontend. Includes agent creation wizard, model override picker, and privacy blur toggle.

**What you need:**
- `DASHBOARD_TOKEN` env var (generate one with: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`)

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Create `src/dashboard.ts` (single file, approximately 1,370 lines. No separate API route files):
- Import `Hono` from `hono` and `serve` from `@hono/node-server`.
- Initialize a Hono app.
- **Auth middleware:** Every request must include `?token=DASHBOARD_TOKEN` query param. Compare against `process.env.DASHBOARD_TOKEN`. Return 401 if missing or wrong. Skip auth for `/api/health`.
- **CORS middleware:** Allow all origins (this runs on localhost).
- **SSE via chatEvents EventEmitter:** Create a module-level `EventEmitter` called `chatEvents`. Emit events whenever new data arrives (memories, messages, hive entries, etc.). The SSE endpoint listens on this emitter.
- **API endpoints:**
  - `GET /api/health` - Returns `{ status: "ok", uptime: process.uptime(), version: pkg.version }`.
  - `GET /api/memories` - Query params: `agent_id` (optional), `limit` (default 50). Returns memories sorted by `created_at` DESC. Each memory includes: id, summary, entities, topics, importance, salience, pinned, created_at, last_accessed.
  - `GET /api/tokens` - Returns token usage stats from the DB. Group by date (last 30 days). Fields: date, input_tokens, output_tokens, total_cost_estimate.
  - `GET /api/hive-mind` - Returns recent hive_mind entries. Query params: `limit` (default 20). Fields: agent_id, action, summary, created_at.
  - `GET /api/audit-log` - Returns recent audit entries. Query params: `agent_id` (optional), `limit` (default 100). Fields: agent_id, action, detail, blocked, created_at.
  - `GET /api/agents` - Returns all registered agents with their config, color, and current status (online/offline based on last heartbeat).
  - `GET /api/tasks` - Returns both scheduled tasks and mission tasks. Separate arrays in the response.
  - `GET /api/events` - SSE endpoint. Listens on `chatEvents` EventEmitter. Sends `data: {"type": "memory", ...}` events. Keep connection alive with `:keepalive` comments every 30 seconds.
  - `POST /api/mission/create` - Creates a new mission task. Body: `{ title, prompt, agent?, priority? }`.
  - `POST /api/mission/:id/assign` - Assigns an agent to a mission. Body: `{ agent_id }`.
  - `GET /api/warroom/start` - Starts the War Room subprocess if not running.
  - `POST /api/warroom/pin` - Pins an agent in the War Room. Body: `{ agent_id }`.
- **HTML route:**
  - `GET /` - Serves the dashboard SPA from `getDashboardHTML(token)` in dashboard-html.ts.
- Start the server: `serve({ fetch: app.fetch, port: Number(process.env.DASHBOARD_PORT) || 3141 })`.
- Export `function startDashboard(): void` to be called from index.ts.

Create `src/dashboard-html.ts` (single file, 3,200+ lines of embedded HTML/CSS/JS. No static files, no external build step):
- Export `function getDashboardHTML(token: string): string`
- Returns a complete single-file HTML SPA. No external dependencies except Chart.js loaded from CDN.
- **Styling:** Dark theme. Background `#0a0a0f`. Cards with `#1a1a2e` background, `#E07A4F` accent color for highlights and active states. Font: system-ui.
- **Layout:** Fixed sidebar with tab navigation. Main content area.
- **Tabs:**
  1. **Overview** - Quick stats cards (total memories, tokens used today, active agents, pending missions). 7-day token usage line chart via Chart.js.
  2. **Conversation** - Live conversation log (if SSE connected). Shows recent messages with agent attribution.
  3. **Memory** - Scrollable timeline of memories. Each card shows summary, entities as tags, importance as a colored bar (green > 0.7, yellow > 0.4, red below), salience score, pinned status, and timestamp.
  4. **Tokens** - 30-day token usage bar chart. Table breakdown by agent.
  5. **Audit** - Filterable audit log table. Blocked actions highlighted in red. Search box.
  6. **Agents** - Agent status cards with assigned color. Shows name, personality snippet, online status (green/red dot), last active time. Includes agent creation wizard button and model override picker.
  7. **Tasks** - Two sections: Scheduled (cron tasks with next run time) and Missions (priority queue with status badges).
  8. **Hive Mind** - Feed of cross-agent activity. Shows which agent did what and when.
- **Privacy blur toggle:** A button in the header that toggles CSS blur on all sensitive data (memory contents, audit details, agent tokens).
- **SSE connection:** On page load, connect to `/api/events?token=TOKEN`. On message, update the relevant tab's data.
- **Auto-refresh:** Each tab fetches its data from the API on activation. Overview tab refreshes every 60 seconds.

Update `src/index.ts`:
- After bot initialization, check if `DASHBOARD_TOKEN` is set. If so, call `startDashboard()`.
- Log the dashboard URL: `Dashboard: http://localhost:${port}/?token=${token}`.

Add to `package.json` dependencies:
```json
"hono": "^4.0.0",
"@hono/node-server": "^1.0.0"
```

Add to `.env.example`:
```
# Dashboard
# DASHBOARD_TOKEN=generate_with_node_crypto
# DASHBOARD_PORT=3141
```

Run `npm install hono @hono/node-server` to add dependencies.

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Pack 8: Meeting Bot

**What it adds:** A video avatar that joins your Google Meet or Zoom calls. Uses Pika for video generation, so attendees see an animated avatar instead of a static image. Supports Recall.ai as an alternative provider. Before joining, it runs a 75-second pre-flight briefing pipeline that pulls your Calendar (next 24h), Gmail (last 30 days per attendee), and ClaudeClaw memory to build a prep card. The bot listens, transcribes, and can respond through the agent-voice-bridge.

**What you need:**
- `PIKA_DEV_KEY` from pika.me/dev (roughly $0.275/min of meeting time), or `RECALL_API_KEY` from recall.ai as an alternative provider
- `GOOGLE_API_KEY` for the briefing pipeline

**Paste this into Claude Code:**

---

Read my existing ClaudeClaw codebase first. Then add the following feature.

Create `src/meet-cli.ts` (single file, approximately 792 lines):
- CLI entry point for managing meeting bot sessions. Parse subcommands from process.argv:

- `join` command:
  - Required: `--meet-url` (Google Meet or Zoom URL)
  - Optional: `--bot-name` (display name in meeting, default: agent's name or "ClaudeClaw")
  - Optional: `--image` (path to avatar image for video generation)
  - Optional: `--voice-id` (override the agent's default voice)
  - Optional: `--system-prompt-file` (path to a custom system prompt for this meeting)
  - Optional: `--auto-brief` (run pre-flight briefing before joining, default: true)
  - Optional: `--agent` (which ClaudeClaw agent handles this meeting, default: "main")
  - Optional: `--provider` (either "pika" or "recall", default: "pika")
  - Flow:
    1. Detect platform from URL: `meet.google.com` = Google Meet, `zoom.us` or `*.zoom.us` = Zoom.
    2. If `--auto-brief` is true (default), run the pre-flight briefing pipeline (see below).
    3. Call the selected provider API (Pika streaming or Recall.ai) to join the meeting with the avatar image and voice config.
    4. Insert a record into `meet_sessions` with status `'active'`, platform, and provider.
    5. Print the session ID for later reference.

- `leave` command:
  - Required: `--session-id`
  - Calls the provider API to remove the bot from the meeting.
  - Updates `meet_sessions` status to `'ended'`.

- `list` command:
  - Shows all meeting sessions with their status, platform, provider, and duration.

**Pre-flight briefing pipeline (75-second budget):**
- Step 1 (parallel, 30s max):
  - Pull Google Calendar events for the next 24 hours. Extract attendee emails from the target meeting.
  - Pull Gmail threads from the last 30 days that involve any of the attendee emails.
  - Pull relevant ClaudeClaw memories (search by attendee names/emails).
- Step 2 (30s max):
  - Send all gathered context to `gemini-3-flash-preview` with a BRIEFING_PROMPT:
    "Compress the following into a meeting briefing card. Include: who's attending (name, role if known, last interaction), key topics from recent emails, open action items, and suggested talking points. Keep it under 500 words."
  - Save the briefing as `outputs/meet_briefs/YYYY-MM-DD/{meeting_id}_brief.md`.
- Step 3 (15s max):
  - Feed the briefing into the agent via agent-voice-bridge with a system prompt:
    "You are about to join a meeting. Here is your briefing: {briefing}. Keep this context in mind during the meeting. Do not read it aloud unless asked."
- Total budget: 75 seconds. If any step times out, proceed with whatever context was gathered.

Create `skills/pikastream-video-meeting/` directory:

`skills/pikastream-video-meeting/SKILL.md`:
```markdown
---
name: pikastream-video-meeting
description: Join Google Meet or Zoom calls with a Pika video avatar. Handles meeting join/leave and pre-flight briefing.
allowed-tools: Bash(node *) Read Write
---

# Pika Video Meeting Skill

Join meetings with an AI video avatar.

## Usage

Join a meeting:
```
node dist/meet-cli.js join --meet-url "https://meet.google.com/abc-defg-hij" --agent main
```

Leave a meeting:
```
node dist/meet-cli.js leave --session-id SESSION_ID
```

List active sessions:
```
node dist/meet-cli.js list
```
```

Update `src/db.ts`:
- Add `meet_sessions` table: `id` (TEXT PRIMARY KEY), `agent_id` (TEXT), `meet_url` (TEXT), `bot_name` (TEXT), `voice_id` (TEXT), `image_path` (TEXT), `brief_path` (TEXT), `status` (TEXT DEFAULT 'pending'), `platform` (TEXT, 'google_meet' or 'zoom'), `provider` (TEXT DEFAULT 'pika'), `created_at` (TEXT), `ended_at` (TEXT).
- Add helper functions: `insertMeetSession(session)`, `updateMeetSessionStatus(id, status)`, `getActiveMeetSessions()`, `getMeetSession(id)`, `listMeetSessions(limit)`.

Add to `package.json` scripts:
```json
"meet": "npx tsx src/meet-cli.ts"
```

Create `outputs/meet_briefs/` directory (for storing pre-flight briefing outputs).

Add `PIKA_DEV_KEY` and `RECALL_API_KEY` to `.env.example`.

After implementing, run `npm run build` to compile and `npm start` to verify.

---

## Quick Reference

| Pack | Feature | New Dependencies | Env Vars Needed |
|------|---------|-----------------|-----------------|
| 1 | Memory v2 | `@google/genai` | `GOOGLE_API_KEY` |
| 2 | Multi-Agent | `js-yaml` | Per-agent Telegram tokens |
| 3 | War Room | Python packages (see requirements.txt) | `GOOGLE_API_KEY` |
| 4 | Mission Control | `cron-parser` | None |
| 5 | Security | None | None (all optional) |
| 6 | Voice Upgrade | None | `GROQ_API_KEY` (optional) |
| 7 | Dashboard | `hono`, `@hono/node-server` | `DASHBOARD_TOKEN` |
| 8 | Meeting Bot | None | `PIKA_DEV_KEY` or `RECALL_API_KEY` |

---

Questions, bugs, or feature requests? Drop them in the Early AI Dopters community.

https://www.skool.com/earlyaidopters/about
