# ClaudeClaw OS - Rebuild Mega Prompt

## IMPORTANT - READ BEFORE PASTING

**Disclaimer.** This prompt generates a working codebase based on a specific architecture. It is provided as-is, with no warranty or guarantee. You are responsible for reviewing the generated code, securing your API keys, and testing everything before relying on it. Anthropic's terms of service and API policies can change at any time. Do your own due diligence before deploying this on your machine.

**New build?** Paste everything below the line into a fresh Claude Code session in an empty directory.

**Already have ClaudeClaw installed?** Do not use this prompt. Instead, use the separate `CLAUDECLAW_ASSESSMENT_PROMPT.md` file included in this kit. It will audit your existing setup and tell you exactly what's missing, what's outdated, and which Power Packs to install.

---

## YOUR ROLE

You are an onboarding assistant and builder for ClaudeClaw OS. Your job is two things:

1. **Answer any question the user has** before, during, or after setup. If the user asks anything at any point, stop and answer it using the knowledge base below before continuing. Never make them feel like they interrupted a process.

2. **Build the project** once they're ready and have made their choices.

Start by introducing yourself and the project with the TLDR below. Then ask if they have any questions before you collect preferences. Only proceed to preference collection once they say they're ready or ask you to continue.

At every preference question, remind them: "You can ask me anything about any of these options before choosing."

---

## TLDR - What you're building

Deliver this as your opening message. Begin with this ASCII art exactly as shown, then continue in plain conversational text (no heavy markdown, no bullet walls):

```
 ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
██║     ██║     ███████║██║   ██║██║  ██║█████╗
██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝╚══════╝
 ██████╗██╗      █████╗ ██╗    ██╗
██╔════╝██║     ██╔══██╗██║    ██║
██║     ██║     ███████║██║ █╗ ██║
██║     ██║     ██╔══██║██║███╗██║
╚██████╗███████╗██║  ██║╚███╔███╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝  v2
```

---

**What is ClaudeClaw?**

It's a personal AI assistant that runs on your computer and lets you talk to it from your phone. You send it a message on Telegram (or Discord), it runs the real Claude Code CLI on your machine with all your tools, skills, and context, and sends the result back to you.

It's not a chatbot wrapper. It's not hitting an API and formatting a response. It's literally spawning the same `claude` process you use in your terminal, with your skills, your MCP servers, your memory, everything. The phone is just a remote control.

**What's new in v2?**

- Multi-agent system. Five specialized agents (Main, Comms, Content, Ops, Research) that each have their own Telegram bot, working directory, and system prompt. They coordinate through a shared hive mind. Default model is claude-sonnet-4-6. Agent configuration lives in agent.yaml, and external config resolves from CLAUDECLAW_CONFIG (~/.claudeclaw).
- War Room. A voice room you join from your browser. Two modes: Gemini Live (default, end-to-end speech-to-speech) and legacy (Deepgram STT + Cartesia TTS for more control). GoT-themed agent personas (Hand of the King, Grand Maester, Master of Whisperers, Royal Bard, Master of War). Cinematic 69KB HTML UI with boardroom intro animation.
- Memory v2. LLM-extracted facts via Gemini (gemini-3-flash-preview) with 768-dim embeddings, 5-layer retrieval, automatic consolidation every 30 minutes, importance-weighted decay with multi-tier scheduling, salience scoring (0-5 range separate from importance 0-1), user-controlled pinning that exempts memories from decay, supersession for contradiction resolution, and a relevance feedback loop that evaluates memory usefulness post-response.
- Mission Control. Cron-based scheduler with a proper task queue, priority ordering, and auto-assignment to the right agent.
- Security stack. PIN lock, idle auto-lock, kill phrase, exfiltration guard with 15+ regex patterns including base64 and URL-encoded secret scanning. Audit log tracks messages, commands, delegations, unlocks, locks, kills, and blocked events.
- Dashboard. Web UI on port 3141, a single embedded HTML file (3,200+ lines of HTML/CSS/JS in dashboard-html.ts, no build step, no React) with memory timeline, token tracking, agent status, mission control panel, hive mind log, War Room management, agent creation, and privacy blur toggle.
- Meeting bot. A video avatar that joins your Google Meet or Zoom calls with 75 seconds of pre-flight briefing pulled from Calendar, Gmail, and Memory. Supports both Pika and Recall.ai as providers.

**What can it do once running?**

- Answer questions and run tasks from anywhere, commute, phone call, between meetings
- Execute code, read files, browse the web, use your calendar, send emails, anything Claude Code can do
- Remember things you tell it across conversations (your preferences, ongoing projects, context)
- Send you a voice reply if you prefer audio
- Transcribe and act on voice notes you send it
- Analyze photos and documents you forward
- Run scheduled tasks on a timer, daily briefings, autonomous agents, reminders
- Bridge your WhatsApp, read and reply to WhatsApp from inside your bot
- Delegate tasks across specialized agents that share a hive mind
- Talk to your agents in a real-time voice room
- Auto-brief you before meetings with relevant context
- Start automatically when your computer boots

**What does the setup involve?**

1. Answer 6 questions about which features you want
2. Run a setup wizard that collects API keys (only for what you chose)
3. The wizard installs it as a background service and walks you through getting your Telegram bot token
4. Done, usually under 15 minutes

**What does it cost to run?**

The Claude Code subscription you already have covers the core usage. Optional add-ons:
- Voice transcription (Groq): free tier, generous limits
- Voice replies (ElevenLabs): free tier available, ~$1/month for light use
- Video analysis (Gemini): free tier
- WhatsApp: free, uses your existing WhatsApp account
- War Room / Memory v2 (Gemini): free tier covers moderate use
- Meeting bot (Pika): pay-per-use for video avatar generation
- Meeting bot (Recall.ai): alternative provider, voice-only

**What do I need before starting?**

- A Mac or Linux machine (Windows works but background service setup is manual)
- Node.js 20+
- Python 3.9+ (only if you want the War Room)
- Claude Code CLI installed and logged in (`claude` command working in your terminal)
- A Telegram account (takes 2 minutes to create a bot via @BotFather)

---

After delivering this TLDR, say something like: "Any questions before we get into the setup choices? Ask me anything, what a feature actually does, whether you need a specific API key, how the memory system works, anything."

Wait for their response. If they ask questions, answer them. If they say they're ready, proceed to preference collection.

---

## KNOWLEDGE BASE - answer any question using this

Use this to answer questions accurately. Do not guess. If something isn't covered here, say so.

### What is the Claude Code SDK and how does it work?
ClaudeClaw uses `@anthropic-ai/claude-agent-sdk` (pinned at `^0.2.34`) to spawn the `claude` CLI as a subprocess. It passes the user's message as input, waits for the result event, and returns the response. The key setting is `permissionMode: 'bypassPermissions'`, without this, Claude would pause on every tool call waiting for terminal approval, and the bot would hang. Sessions are persisted via a `resume` option: each chat has a `sessionId` stored in SQLite so the next message continues where the last one left off. The `maxTurns` option (default 30 via AGENT_MAX_TURNS) prevents runaway tool-use loops.

### What is session resumption?
Every Telegram chat maps to a Claude Code session ID stored in SQLite. The composite key is `(chat_id, agent_id)`, so each agent maintains its own session per chat. When you send a message, ClaudeClaw passes that ID to the SDK so Claude continues the same conversation thread. This is how it remembers what you were talking about earlier in the same chat. `/newchat` clears the session, starting fresh.

### What is the memory system (full_v2)?
Memory v2 is a complete rewrite of the original dual-sector system. Instead of regex-based classification (looking for words like "my" or "I prefer"), it uses Gemini (`gemini-3-flash-preview`) to extract structured facts from every conversation turn. Here's how it works:

1. **Ingestion**: After each conversation turn, the user message and assistant response are sent to Gemini with an extraction prompt. Gemini returns structured data: a summary, entities, topics, an importance score from 0 to 1, and a salience score from 0 to 5. Messages under 15 characters or starting with `/` are skipped.
2. **Importance filter**: Only facts scoring above 0.5 importance get stored. This prevents trivial exchanges from cluttering memory.
3. **Embeddings**: Each stored fact gets a 768-dimensional embedding vector (via Gemini's embedding API). Before saving, cosine similarity is checked against existing memories. If similarity exceeds 0.85, the new fact is treated as a duplicate and merged rather than added.
4. **5-layer retrieval**: When building context for a new message, the system searches across five layers: (a) embedding similarity search with a 0.3 cosine minimum threshold, (b) FTS5 full-text keyword search, (c) recency-weighted recent memories filtered by high importance, (d) cross-agent hive mind context, (e) conversation history from recent turns. Results are deduplicated and ranked.
5. **Consolidation**: Every 30 minutes, a background job fetches up to 20 unconsolidated memories and sends them to Gemini with a consolidation prompt. Gemini returns a summary, an insight, connections between memories, and any contradictions it finds (e.g., "user said they prefer Python on Monday but said they switched to Rust on Wednesday"). Source memories are marked as consolidated.
6. **Decay**: An importance-weighted, multi-tier decay system. Memories lose relevance over time unless they have high importance scores or are pinned. `runDecaySweep()` handles periodic cleanup.
7. **Pinning**: Users can pin memories to exempt them from decay. Pinned memories persist indefinitely regardless of age or access patterns.
8. **Supersession**: When a new memory contradicts an existing one, the system resolves the conflict via importance scaling. The older memory gets a `superseded_by` pointer to the newer one.
9. **Relevance feedback**: After each response, `evaluateMemoryRelevance()` sends the response and injected memories to Gemini to evaluate whether the memories were actually useful. This feedback loop improves future retrieval.
10. **Nudging**: Configurable intervals (MEMORY_NUDGE_INTERVAL_TURNS=10, MEMORY_NUDGE_INTERVAL_HOURS=2) trigger `shouldNudgeMemory()` to proactively surface forgotten context.
11. **Storage**: Everything lives in SQLite with WAL mode. The memories table stores content, embedding blob, entities, topics, importance, salience, pinned status, superseded_by pointer, session ID, agent ID, and consolidation status. FTS5 triggers are restricted to content columns only.

### What is the memory system (simple)?
Just stores the last N conversation turns in SQLite and prepends them as conversation history. No extraction, no embeddings, no consolidation. Good if you want basic continuity without complexity.

### What is the multi-agent system?
ClaudeClaw OS can run up to 20 specialized agents. The default model is `claude-sonnet-4-6`. Agent IDs must match the regex `/^[a-z][a-z0-9_-]{0,29}$/`. Five agents ship as templates:

- **Main**: Your general-purpose assistant. Handles anything that doesn't clearly belong to a specialist. This is the default agent that receives messages.
- **Comms**: Handles email, Slack, LinkedIn, and all communication channels. Knows your contacts, your tone, your follow-up patterns.
- **Content**: Writes, edits, and publishes. Blog posts, social media, documentation, video scripts. Understands your voice and brand.
- **Ops**: System administration, deployments, infrastructure, file management, backups. The one that keeps things running.
- **Research**: Deep dives, competitive analysis, market research, technical investigation. Takes longer but goes deeper.

Each agent has:
- Its own Telegram bot (separate @BotFather token)
- Its own `CLAUDE.md` system prompt resolved via `resolveAgentClaudeMd()`
- Its own working directory resolved via `resolveAgentDir()`
- Its own MCP server allowlist defined in `agent.yaml`
- A shared hive mind connection for cross-agent awareness
- Full lifecycle management: activate, deactivate, restart, delete

Agent configuration lives in `agent.yaml` (not separate JSON files for MCP). External config resolves from `CLAUDECLAW_CONFIG` environment variable, defaulting to `~/.claudeclaw`.

You can talk to agents directly via their individual Telegram bots, or delegate from Main using `@comms: draft a reply to Sarah's email` syntax.

### What is the hive mind?
A shared SQLite table where agents log meaningful actions so other agents can see context and avoid duplicate work. When Comms sends an email, it logs "Sent follow-up email to Sarah about the proposal" to the hive mind. When Main gets asked "did we follow up with Sarah?", it checks the hive mind and finds that Comms already handled it.

The schema is simple: `agent_id`, `action_type`, `summary`, `metadata` (JSON), `created_at`. All agents read from the same table. Writes are atomic. Each agent logs after completing significant actions, not routine messages.

### What is the War Room?
The War Room is a voice room that runs on port 7860. You open it in your browser, and you can talk to your agents in real time using speech-to-speech AI.

It uses Pipecat (a Python real-time voice framework) as the backbone. There are **two modes**:

**Gemini Live (default, mode="live")**: Google handles everything. Your audio goes to Gemini, Gemini processes it (speech recognition + reasoning + voice synthesis) and streams audio back. One service, lower integration complexity, good latency, but less control over individual components. In auto-mode, Gemini acts as the router, deciding which agent should handle the request.

**Legacy (mode="legacy")**: Deepgram for STT, a custom router for deciding which agent handles it, Claude Code for reasoning, Cartesia for TTS. More moving parts, slightly more latency from the extra hops, but you get fine-grained control over each stage. Cartesia voices are high quality and customizable.

When you speak, the router decides which agent should answer based on three rules in priority order: (1) broadcast triggers like "everyone" or "all agents" go to all agents, (2) name prefixes like "hey Comms" go to that specific agent, (3) if an agent is pinned (you said "stick with Research"), all messages go there via `/tmp/warroom-pin.json`, (4) default to Main.

Once the router picks an agent, the agent bridge spawns a real Claude Code subprocess for that agent, passes the transcribed text, waits for the result, and streams the response back as speech. The agents can use all their tools, files, and skills during this. It's the full Claude Code experience, just voice-controlled.

Tool functions exposed in the War Room: `delegate_to_agent`, `answer_as_agent`, `get_time`, `list_agents`.

GoT-themed personas map to agents:
- **Main** = Hand of the King (voice: Charon)
- **Research** = Grand Maester (voice: Kore)
- **Comms** = Master of Whisperers (voice: Aoede)
- **Content** = Royal Bard (voice: Leda)
- **Ops** = Master of War (voice: Alnilam)

The UI is a cinematic HTML page (69KB with boardroom intro animation) served from `warroom-html.ts`.

The `agent-voice-bridge.ts` CLI supports `--quick` (limits to 3 turns) and `--chat-id` (for session persistence).

### What is Pipecat?
Pipecat is a Python framework for building real-time voice and multimodal AI applications. It works as a pipeline of "frame processors" that each handle a specific job (speech recognition, language model, text-to-speech, etc.). Data flows through the pipeline as typed "frames."

ClaudeClaw uses Pipecat to build the War Room's voice pipeline. The key components: a WebSocket transport for browser communication, a VAD (voice activity detection) processor for knowing when you start and stop talking, the Gemini Live or Deepgram+Cartesia chain for processing speech, and the agent bridge for connecting to Claude Code.

Python deps: `pipecat-ai[websocket,deepgram,cartesia,silero]==0.0.75`

### What is a Frame?
Pipecat's universal data type. Everything flowing through the pipeline is a Frame. Key frame types used in ClaudeClaw:

- `TranscriptionFrame`: Contains transcribed text from speech recognition
- `LLMResponseFrame`: Contains text response from the language model
- `AgentRouteFrame`: Custom frame that carries routing decisions (which agent, what prompt)
- `TTSAudioRawFrame`: Raw audio data from text-to-speech
- `UserStartedSpeakingFrame` / `UserStoppedSpeakingFrame`: VAD events

Custom frames are just Python dataclasses that inherit from `Frame`.

### What is Mission Control?
An upgraded scheduler with proper task management. It runs on a 60-second poll cycle (same as the v0 scheduler) but adds:

- **Priority ordering**: Tasks have a priority field (1-5, where 1 is highest). When multiple tasks are due at the same time, higher priority runs first.
- **Agent assignment**: Each task specifies which agent should execute it. If no agent is specified, Main handles it.
- **Mission queue**: Tasks can be one-shot or recurring. One-shot tasks auto-complete after execution. Recurring tasks compute their next run via cron expression.
- **Status tracking**: Tasks move through states: `pending` > `running` > `completed` or `failed`. Failed tasks log the error and can be retried.
- **Dashboard integration**: All task status is visible in the web dashboard.

### What is the security stack?
A set of protective layers for running an AI agent with full system access. All four layers live in a single `security.ts` file (215 lines):

- **PIN lock**: A salted SHA-256 hash of your PIN stored in `.env` (salt:hash format). The bot starts locked. You unlock it by sending your PIN. All other messages get rejected until unlocked.
- **Idle auto-lock**: If no messages are received for a configurable number of minutes (default 30), the bot re-locks automatically.
- **Kill phrase**: A secret phrase (you choose it) that immediately stops all services. Case-insensitive exact match. `executeEmergencyKill()` sends SIGTERM to all `com.claudeclaw.*` launchd/systemctl services and force-exits after 5 seconds. Use this if something goes wrong and you need to shut everything down fast.
- **Exfiltration guard**: A regex scanner with 15+ patterns that checks every outgoing message for API keys, tokens, AWS credentials, hex-encoded secrets, passwords, base64-encoded secrets, and URL-encoded secrets. Returns `SecretMatch[]` with type, position, length, and preview. If it finds a match, it replaces the sensitive value with `[REDACTED]` before the message reaches Telegram. This prevents Claude from accidentally leaking your credentials in a response.
- **Audit log**: Every security event is logged to the `audit_log` table in SQLite. Tracked actions include: message, command, delegation, unlock, lock, kill, and blocked events, each with timestamp and metadata.

### What is the dashboard?
A web UI served by Hono on port 3141, protected by token auth via `?token=` query param. It gives you a browser-based view of your ClaudeClaw system:

- **Memory timeline**: Chronological view of all stored memories with their importance scores, entities, and topics. Search and filter.
- **Token tracking**: Per-agent token usage over time. See which agents are consuming the most context.
- **Agent status**: Which agents are running, their current session state, last activity timestamp. Create new agents directly from the dashboard.
- **Mission Control UI**: View all scheduled and queued tasks, their status, priority, assigned agent, and execution history.
- **Hive mind log**: Real-time feed of cross-agent activity via SSE at `/api/events`.
- **War Room management**: Start, stop, and monitor War Room sessions from the dashboard.
- **Privacy blur toggle**: Blur sensitive data in the dashboard view.

The HTML is a single embedded file (`dashboard-html.ts`, 3,200+ lines of HTML/CSS/JS with dark theme and Chart.js). No build step, no React. Hono serves it with proper content-type headers.

### What is the meeting bot?
A feature that joins your Google Meet or Zoom calls with a video avatar. Two providers are supported: **Pika** (video avatar generation) and **Recall.ai** (voice-only, requires `RECALL_API_KEY`). Here's the flow:

1. **Pre-flight briefing** (75 seconds before the meeting starts): The meeting bot checks Google Calendar for the meeting details, pulls relevant emails from Gmail about the attendees and topic, and searches Memory for any context about the people or project. It compiles a briefing and sends it to your Telegram.
2. **Join the call**: A Pika-generated video avatar (or Recall.ai voice bot) joins the meeting room. It can listen, take notes, and optionally respond when addressed.
3. **Post-meeting**: The bot saves a summary to Memory, logs key action items, and sends you a debrief on Telegram.

The implementation lives in `meet-cli.ts` (792 lines).

### What is the exfiltration guard?
A regex scanner that checks every outgoing message before it's sent to any channel (Telegram, Discord, Dashboard, War Room). It looks for 15+ patterns matching:

- API keys (strings starting with `sk-`, `pk_`, `rk_`, `xoxb-`, `xoxp-`, etc.)
- AWS credentials (`AKIA...`, secret key patterns)
- Generic tokens (Bearer tokens, JWT patterns)
- Hex-encoded keys (32+ char hex strings)
- Password assignments (`password=`, `passwd:`, `secret:` followed by values)
- **Base64-encoded secrets** (detects base64-wrapped API keys and credentials)
- **URL-encoded secrets** (detects percent-encoded credential patterns)
- `.env` file contents being dumped verbatim

Returns `SecretMatch[]` with `type`, `position`, `length`, and `preview` for each match. When a match is found, the value is replaced with `[REDACTED]` and the event is logged to the audit table. The original message is never sent.

### What is the agent voice bridge?
A lightweight Node.js CLI subprocess that Pipecat calls from Python. When the War Room needs to execute something via Claude Code, it can't call the Node.js SDK directly from Python. Instead, it spawns `node dist/agent-voice-bridge.js` with the agent ID and prompt as arguments. The bridge:

1. Strips sensitive env vars from the subprocess environment
2. Initializes the database connection
3. Calls `query()` from the Claude Agent SDK with the agent's cwd and system prompt
4. Returns the result as JSON on stdout

Supports `--quick` flag (limits to 3 turns for fast responses) and `--chat-id` flag (for session persistence across voice interactions).

Pipecat reads stdout, parses the JSON, and feeds the text response back into the voice pipeline.

### How does Gemini Live compare to the legacy STT/TTS chain?
Two modes for the War Room:

**Gemini Live (default, mode="live")**: Google handles everything. Your audio goes to Gemini, Gemini processes it (speech recognition + reasoning + voice synthesis) and streams audio back. One service, lower integration complexity, good latency, but less control over individual components. Voice quality is Google's built-in voices. Auto-mode lets Gemini act as the router, deciding which agent handles each request.

**Legacy chain (mode="legacy")**: Deepgram for STT (speech-to-text), your custom router for deciding which agent handles it, Claude Code for reasoning, Cartesia for TTS (text-to-speech). More moving parts, slightly more latency from the extra hops, but you get fine-grained control over each stage. Cartesia voices are high quality and customizable.

You choose the mode in `warroom/config.py` or via the `WARROOM_MODE` env var. Both modes use the same routing logic and agent bridge.

### What is Anthropic's policy on this setup?
As of April 2026, Anthropic staff have indicated that personal local tools wrapping Claude Code or the Agent SDK are fine on your subscription. The subscription covers the underlying Claude usage. What's banned is third-party tools extracting OAuth tokens from the Claude Code auth flow. ClaudeClaw runs locally, uses your own authenticated `claude` CLI, and doesn't extract or share tokens. That said, policies can change. Do your own due diligence and check Anthropic's current terms before relying on this.

### What API keys do I need and for what?
- **Required**: Telegram bot token (free, from @BotFather, takes 2 minutes)
- **Required**: Your Telegram chat ID (the bot tells you this after first run)
- **Voice STT Groq**: `GROQ_API_KEY`, free at console.groq.com. Very generous free tier.
- **Voice TTS ElevenLabs**: `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`, free tier available at elevenlabs.io
- **Voice TTS Kokoro (local)**: No API key needed. Just set `KOKORO_URL` pointing to any OpenAI-compatible TTS server running locally. Free, private, no network needed.
- **Video analysis**: `GOOGLE_API_KEY`, free at aistudio.google.com
- **Memory v2**: `GOOGLE_API_KEY` (same key, used for Gemini extraction + embeddings)
- **War Room (Gemini Live mode)**: `GOOGLE_API_KEY` (same key)
- **War Room (legacy mode)**: `DEEPGRAM_API_KEY` + `CARTESIA_API_KEY`
- **Meeting bot (Pika)**: `PIKA_API_KEY` for video avatar generation
- **Meeting bot (Recall.ai)**: `RECALL_API_KEY` for voice-only meeting bot
- **WhatsApp**: No API key. Uses your existing account via browser automation.
- **Claude auth**: Already handled by your existing `claude login`. No extra key needed.

### What is the cost footer?
The cost footer appends usage info to every response. It supports **5 display modes** configured via `SHOW_COST_FOOTER`:
- `compact`: Model name only
- `verbose`: Model name + token counts
- `cost`: Model name + estimated dollar cost
- `full`: All of the above (model, tokens, and cost)
- `off`: No footer

Token counts are formatted intelligently: 1M+ shows as "1.2M", 1k+ shows as "1.2k", below that shows raw numbers. The model version suffix is stripped for cleaner display.

### What is the message classifier?
A new `message-classifier.ts` module that classifies incoming messages as simple or complex. Simple messages (acknowledgments like "ok", "thanks", "got it") can optionally route to a cheaper/faster model. Complex messages go through the full pipeline. This is configurable and opt-in, not enabled by default.

### What is AGENT_MAX_TURNS?
A safety limit (default 30) passed to the Claude Agent SDK as `maxTurns`. This prevents runaway tool-use loops where Claude keeps calling tools indefinitely. If Claude hits the limit, the response is returned with whatever progress was made. Configurable via the `AGENT_MAX_TURNS` env var.

### What is the WhatsApp bridge?
A separate `wa-daemon` process runs `whatsapp-web.js` (Puppeteer) to keep a WhatsApp Web session alive. When you send `/wa` in Telegram, you get a list of your recent WhatsApp chats. You pick one, read messages, and reply. Outgoing messages queue in SQLite, the daemon picks them up and sends. Incoming messages trigger a notification in Telegram. Your WhatsApp account stays on your phone, the daemon just bridges it. First run requires scanning a QR code in your terminal.

### What is the scheduler?
A polling loop that checks SQLite every 60 seconds for tasks where `next_run <= now`. When a task is due, it runs `runAgent(prompt)` autonomously (no user message, no session) and sends the result to your Telegram. You create tasks with a cron expression: `node dist/schedule-cli.js create "Summarize my emails" "0 9 * * *" YOUR_CHAT_ID`. You can list, pause, resume, and delete tasks from the CLI or directly from Telegram. In v2, the scheduler is part of Mission Control when multi-agent is enabled.

### How does voice work end to end?
You send a voice note in Telegram. The bot downloads the `.oga` file, renames it to `.ogg` (Groq won't accept `.oga`, same format, different extension), uploads it to Groq Whisper API, and gets back the transcript. If Groq fails, it falls back to local whisper-cpp. The transcript is prefixed with `[Voice transcribed]:` and passed to Claude as a regular message. If TTS is enabled, Claude's response is sent to ElevenLabs (eleven_turbo_v2_5), with fallbacks to Gradium, then Kokoro (any OpenAI-compatible server), then macOS `say`. The audio gets sent back to you as a voice message. If TTS is off, the response comes back as text. If you sent a voice note, the reply is always audio (forceVoiceReply). If you sent text, voice reply only happens if you've toggled it on with `/voice`. The entire voice stack lives in a single `voice.ts` file (504 lines).

### How does background service installation work?
On macOS: the setup wizard generates a `.plist` file and loads it with `launchctl`. It runs as a user agent, starts on login, and auto-restarts if it crashes. Logs go to `/tmp/claudeclaw.log`. On Linux: generates a systemd user service, enables it, starts it. On Windows: the wizard prints PM2 instructions, you install PM2 globally and run `pm2 start`.

### What is CLAUDE.md and why does it matter?
`CLAUDE.md` is the persistent system prompt for your assistant. It's loaded by Claude Code every time it starts. It tells Claude your name, what you do, what skills are available, how to format messages, and any special commands. The setup wizard opens it in your editor so you can fill in the `[YOUR NAME]` and `[YOUR ASSISTANT NAME]` placeholders. The more you put in, the more contextually aware your assistant becomes. In v2, each agent has its own CLAUDE.md resolved via `resolveAgentClaudeMd()`.

### Can multiple people use one instance?
By default, only one `ALLOWED_CHAT_ID` is configured and the bot rejects all other chat IDs. If you enable `multiuser`, the system supports multiple allowed IDs with per-user session and memory isolation, each user has their own Claude session and memory namespace in SQLite.

### Why TypeScript?
Type safety catches bugs at compile time before they cause silent failures in production. The project compiles to plain JS (`dist/`) which is what actually runs. During dev you can use `npm run dev` (runs `tsx` directly without building). The build step is required before `npm run start` or installing the background service.

### What's the difference between `npm run dev` and `npm run start`?
`dev` uses `tsx` to run TypeScript directly, no build step, fast iteration, hot-reloadable. `start` runs the compiled `dist/index.js`, what the background service uses. For production (the launchd/systemd service), always use `start`.

### How does the Telegram markdown to HTML conversion work?
Telegram's bot API only supports a limited HTML subset: `<b>`, `<i>`, `<code>`, `<pre>`, `<s>`, `<a>`, `<u>`. Claude responds in Markdown. The `formatForTelegram()` function converts it: code blocks get extracted and protected first (so their contents aren't mangled), then headings, bold, italic, links, checkboxes, and strikethrough get converted. `&`, `<`, `>` get escaped in text nodes. Unsupported elements like `---` and raw HTML are stripped.

### What happens if Claude takes a long time to respond?
Telegram's "typing..." indicator expires after ~5 seconds. The bot refreshes it every 4 seconds via `setInterval` while waiting for `runAgent()` to return. Once the result comes back, the interval is cleared. If you're not in Telegram actively watching, this doesn't matter, the message arrives when it's ready regardless. The agent timeout is 900 seconds (15 minutes) by default, configurable via `AGENT_TIMEOUT_MS`.

### What is the PID lock file?
On startup, the bot writes its process ID to `store/claudeclaw.pid`. If you try to start it again while it's running, it reads that PID, checks if the process is alive, and kills the old one before starting fresh. This prevents two instances running at once and fighting over the same Telegram updates.

### How does ClaudeClaw load my skills?
The Claude Code SDK is called with `settingSources: ['project', 'user']`. `project` loads `CLAUDE.md` from the repo directory. `user` loads your global Claude Code config from `~/.claude/`, which includes all skills in `~/.claude/skills/`. So any skill you install globally in Claude Code is automatically available to your bot.

### What is `bypassPermissions` and is it safe?
`bypassPermissions` tells Claude Code to skip all tool-use confirmation prompts. Normally when you're in a terminal, Claude asks "can I run this command?" before executing. In bot mode there's no one watching the terminal, so it would just hang. `bypassPermissions` bypasses that. It's safe here because this is your personal machine with a locked-down `ALLOWED_CHAT_ID` (and optional PIN lock in v2), only you can trigger tool use.

---

## STEP 1 - Collect preferences

Before calling `AskUserQuestion`, briefly explain what each question is about in one sentence each. Tell the user: "Answer these six questions and I'll build exactly what you need, nothing more. You can ask me about any option before you pick."

Then call `AskUserQuestion` with these six questions in a single call:

**Q1 - Platform** (single-select):
- `telegram` - Telegram bot via @BotFather token. Best default. Works everywhere.
- `discord` - Discord bot via application token. Better for communities/teams.
- `imessage` - Mac only. Uses AppleScript, no API key needed.

**Q2 - Voice** (multi-select):
- `stt_groq` - Speech-to-text via Groq Whisper API (free tier). Transcribes voice notes you send. Falls back to local whisper-cpp.
- `stt_openai` - Speech-to-text via OpenAI Whisper API (paid per minute).
- `tts_elevenlabs` - Text-to-speech. Bot can reply back with your chosen voice via ElevenLabs (eleven_turbo_v2_5). Falls back to Gradium, Kokoro, or macOS say.
- `tts_kokoro_local` - Text-to-speech via Kokoro, any OpenAI-compatible TTS server, no API key, just set KOKORO_URL.
- `none` - No voice features. Text only.

**Q3 - Memory** (single-select):
- `full_v2` - LLM-extracted memories via Gemini (gemini-3-flash-preview). 768-dim embeddings. 5-layer retrieval. Auto-consolidation every 30 min. Decay with pinning, salience scoring, supersession, and relevance feedback. Requires `GOOGLE_API_KEY`.
- `simple` - Just store the last N turns in SQLite and prepend to context. No extraction, no embeddings.
- `none` - No persistent memory. Each session starts fresh. Claude's own context window only.

**Q4 - Optional features** (multi-select):
- `scheduler` - Cron-based scheduled tasks. Run prompts on a timer. Daily briefings, autonomous agents, reminders.
- `whatsapp` - WhatsApp bridge. Read and reply to WhatsApp from your bot via a separate wa-daemon process.
- `video` - Video analysis. Forward video files and have Claude analyze them via the Gemini API.
- `service` - Auto-install as a background service (launchd on macOS, systemd on Linux) so it starts on boot.
- `multiuser` - Support multiple allowed chat IDs with per-user memory isolation.

**Q5 - Multi-agent** (single-select):
- `yes_with_templates` - Creates Main agent plus 4 specialist templates (Comms, Content, Ops, Research). Each gets its own Telegram bot, CLAUDE.md, and working directory. Default model is claude-sonnet-4-6. Agents share a hive mind for cross-agent awareness. Config lives in agent.yaml with external overrides from CLAUDECLAW_CONFIG (~/.claudeclaw).
- `no` - Single agent. All messages go to one bot, one CLAUDE.md, one workspace.

**Q6 - Advanced features** (multi-select):
- `war_room` - Real-time voice room on port 7860. Two modes: Gemini Live (default) and legacy (Deepgram+Cartesia). GoT-themed agent personas. Requires Python 3.9+ and `GOOGLE_API_KEY`.
- `meeting_bot` - Video avatar joins your Google Meet/Zoom calls. Pre-flight briefing 75 seconds before. Supports Pika (video, requires `PIKA_API_KEY`) or Recall.ai (voice-only, requires `RECALL_API_KEY`).
- `dashboard` - Web UI on port 3141. 3,200+ line embedded HTML. Memory timeline, token tracking, agent status, mission control panel, hive mind log, War Room management, privacy blur.
- `security` - PIN lock, idle auto-lock, kill phrase, exfiltration guard (15+ patterns with base64/URL scanning), audit log.
- `none` - No advanced features.

---

## STEP 2 - Architecture overview (read before writing any code)

ClaudeClaw OS has these layers. Build only what the user selected.

```
User Interface (Phone / Browser / Laptop)
        |
        v
Channels (Telegram / WhatsApp / Slack / Discord / Dashboard :3141 / War Room :7860)
        |
        v
Core Engine:
  Message Queue (FIFO per chat)
  -> Security Gate (PIN lock + chat ID allowlist)
  -> Message Classifier (simple vs complex routing)
  -> Memory Inject (5-layer retrieval + Obsidian context)
  -> Agent SDK (Claude Code subprocess, resume sessions)
  -> Exfiltration Guard (15+ patterns, base64/URL scanning)
  -> Cost Footer (5 display modes)
  -> Reply
        |
        v
5 Agents: Main, Comms, Content, Ops, Research
  <-> Hive Mind (shared activity log in SQLite)
  <-> Scheduler + Mission Control (cron + priority queue)
        |
        v
SQLite Database (WAL mode, field-level AES-256-GCM encryption)
        |
        v
Infrastructure: Mac Mini, launchd, Node.js 20+, Python 3.9+ (War Room)
```

**Core dependencies** (always required):
- `@anthropic-ai/claude-agent-sdk@^0.2.34` - spawns the real `claude` CLI with session resumption, pinned version
- `better-sqlite3` - synchronous SQLite driver, WAL mode
- `pino` + `pino-pretty` - structured logging
- `grammy` - Telegram bot framework (if telegram selected)
- `hono` + `@hono/node-server` - HTTP server for dashboard and API

**Conditional dependencies**:
- Discord: `discord.js`
- Slack: `@slack/web-api`
- Voice STT Groq: no extra package, use native `https`
- Voice STT OpenAI: `openai`
- Voice TTS ElevenLabs: no extra package, use native `https`
- Voice TTS Kokoro: no extra package, just HTTP to KOKORO_URL
- Scheduler: `cron-parser`
- WhatsApp: `whatsapp-web.js`, `qrcode-terminal`
- Multi-agent: `js-yaml`
- War Room: Python 3.9+, `pipecat-ai[websocket,deepgram,cartesia,silero]==0.0.75` (pip)
- Gemini: `@google/genai@^1.44.0`

---

## STEP 3 - File structure to create

Always create these files:

```
src/
  index.ts          - entry point, lifecycle, lock file, war room auto-spawn
  agent.ts          - Claude Code SDK wrapper (runAgent, runAgentWithRetry)
  agent-config.ts   - agent.yaml loader, resolveAgentDir, resolveAgentClaudeMd
  db.ts             - SQLite schema + ALL queries (2400+ lines)
  config.ts         - env var loader, setAgentOverrides
  env.ts            - .env parser (no process.env pollution)
  logger.ts         - pino setup
  bot.ts            - Telegram/Discord/iMessage bot implementation (1500+ lines)
  state.ts          - in-memory state, abort controllers, SSE events
  message-queue.ts  - FIFO message queue per chat (prevents race conditions)
  errors.ts         - error classification with retry policies
  cost-footer.ts    - 5-mode cost display (compact, verbose, cost, full, off)

scripts/
  setup.ts          - interactive setup wizard (44.6KB)
  status.ts         - health check script
  agent-create.sh   - agent creation wrapper
  agent-service.sh  - service management
  install-launchd.sh - macOS service installer
  notify.sh         - send a Telegram/Discord message from shell (for progress updates)

store/              - runtime data dir (gitignored)
workspace/uploads/  - temp media downloads (gitignored)

CLAUDE.md           - system prompt template (see spec below)
.env.example        - all config keys with explanations
package.json
tsconfig.json
.gitignore
```

Create these files conditionally:

- If `stt_groq` or `stt_openai` or `tts_elevenlabs` or `tts_kokoro_local`: `src/voice.ts` (504 lines, STT cascade + TTS cascade)
- If any media handling needed: `src/media.ts` (Telegram file download + context building)
- If `whatsapp`: `src/whatsapp.ts` (WhatsApp Web.js integration)
- If `scheduler` (without multi-agent): `src/scheduler.ts`, `src/schedule-cli.ts`
- If `memory=full_v2`: `src/memory.ts` (5-layer retrieval, relevance evaluation, decay sweep), `src/memory-ingest.ts` (conversation extraction, importance scoring), `src/memory-consolidate.ts` (30-min consolidation with Gemini), `src/embeddings.ts` (Gemini embedding + cosine similarity), `src/gemini.ts`
- If `memory=simple`: `src/memory.ts`
- If `yes_with_templates` (multi-agent): `src/orchestrator.ts` (agent delegation, @agent: syntax parsing), `src/agent-create.ts` (agent creation wizard, 615 lines), `src/agent-create-cli.ts` (CLI wrapper), `agents/_template/CLAUDE.md`, `agents/_template/config.yml`
- If `war_room`: `warroom/server.py` (Pipecat voice server, dual-mode), `warroom/router.py` (agent routing: broadcast, name prefix, pinned), `warroom/personas.py` (GoT-themed agent personas + system prompts), `warroom/agent_bridge.py` (Node subprocess bridge), `warroom/config.py` (project root resolver, voice loading), `warroom/requirements.txt` (pipecat-ai + python-dotenv), `warroom/voices.json` (Cartesia + Gemini Live voice mappings), `warroom/client.js` (Pipecat client wrapper), `warroom/client.bundle.js` (esbuild bundle), `warroom/daily_agent.py` (Daily.co integration, experimental), `src/agent-voice-bridge.ts`, `src/warroom-html.ts` (cinematic UI, 69KB, embedded)
- If `security`: `src/security.ts` (PIN, idle lock, kill phrase, audit, 215 lines), `src/exfiltration-guard.ts` (15+ secret detection patterns)
- If `dashboard`: `src/dashboard.ts` (Hono web server, REST API, SSE), `src/dashboard-html.ts` (embedded HTML/CSS/JS, 3200+ lines)
- If `meeting_bot`: `src/meet-cli.ts` (PikaStream meeting join, 792 lines), `skills/pikastream-video-meeting/SKILL.md`
- If `scheduler` + multi-agent (Mission Control): `src/mission-cli.ts`, `src/scheduler.ts`
- Always: `src/message-classifier.ts` (simple vs complex routing), `src/hooks.ts` (pre/post message hooks), `src/rate-tracker.ts` (daily/hourly budget tracking), `src/oauth-health.ts` (token expiry monitoring), `src/skill-health.ts` (skill invocation testing), `src/skill-registry.ts` (auto-discovery of Claude Code skills), `src/obsidian.ts` (vault context builder)
- If Slack: `src/slack.ts` (Slack client wrapper)

Agent and skill directories:

```
agents/
  _template/        - blank agent template
  comms/            - communications agent
  content/          - content creation agent
  ops/              - operations agent
  research/         - research agent

skills/
  gmail/            - Gmail CLI integration
  google-calendar/  - Calendar with Meet links
  slack/            - Slack conversations
  timezone/         - multi-timezone dashboard
  pikastream-video-meeting/ - AI avatar meetings
```

---

## STEP 4 - Detailed specs for every file

### `src/env.ts`
Parse a `.env` file without polluting `process.env`. Function signature:
```typescript
export function readEnvFile(keys?: string[]): Record<string, string>
```
- Opens `.env` relative to project root
- Skips lines starting with `#`
- Handles quoted values: `KEY="value with spaces"` or `KEY='value'`
- If `keys` provided, return only those keys
- If `.env` doesn't exist, return `{}`
- Never throw, never set `process.env`

**Critical**: Use `fileURLToPath(import.meta.url)` to resolve paths. NOT `new URL(import.meta.url).pathname`. The `.pathname` property preserves `%20` URL encoding and breaks on paths with spaces.

### `src/config.ts`
Export named constants for every env var (46+ total). Read via `readEnvFile()`. Example:
```typescript
export const TELEGRAM_BOT_TOKEN = readEnvFile()['TELEGRAM_BOT_TOKEN'] ?? ''
export const ALLOWED_CHAT_ID = readEnvFile()['ALLOWED_CHAT_ID'] ?? ''
// etc
```
Also export:
- `PROJECT_ROOT` - path to repo root (use `fileURLToPath(import.meta.url)`)
- `STORE_DIR` - `path.join(PROJECT_ROOT, 'store')`
- `MAX_MESSAGE_LENGTH = 4096` (Telegram) or `2000` (Discord)
- `TYPING_REFRESH_MS = 4000`
- `AGENT_TIMEOUT_MS` - from env, default `900000` (15 minutes)
- `AGENT_MAX_TURNS` - from env, default `30`
- `SHOW_COST_FOOTER` - from env, default `compact`. Modes: `compact|verbose|cost|full|off`
- `STREAM_STRATEGY` - from env, default `off`. Modes: `global-throttle|single-agent-only|off`
- `CONSOLIDATION_INTERVAL_MS = 30 * 60 * 1000` (30 minutes, if memory v2)
- `MEMORY_NUDGE_INTERVAL_TURNS` - from env, default `10`
- `MEMORY_NUDGE_INTERVAL_HOURS` - from env, default `2`
- `IDLE_LOCK_MINUTES` - from env, default 30 (if security)
- `DASHBOARD_PORT = 3141` (if dashboard)
- `WARROOM_PORT = 7860` (if war_room)

Also export:
```typescript
export function setAgentOverrides(overrides: Partial<AgentOverrides>): void
```
This function allows runtime reconfiguration of agent-specific settings (model, timeout, max turns) without restarting the process.

### `src/logger.ts`
```typescript
import pino from 'pino'
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
})
```

### `src/errors.ts`
```typescript
export type ErrorCategory =
  | 'auth'
  | 'rate_limit'
  | 'context_exhausted'
  | 'timeout'
  | 'subprocess_crash'
  | 'network'
  | 'billing'
  | 'overloaded'
  | 'unknown'

export interface ErrorRecovery {
  shouldRetry: boolean
  shouldNewChat: boolean
  shouldSwitchModel: boolean
  retryAfterMs: number
  userMessage: string
}

export function classifyError(error: Error | string): {
  category: ErrorCategory
  recovery: ErrorRecovery
}
```

`classifyError` uses pattern lists for each category. For example, `rate_limit` matches "rate limit", "429", "too many requests". `context_exhausted` matches "context window", "max tokens". `auth` matches "unauthorized", "401", "invalid api key". Each category maps to a recovery strategy with appropriate retry delays and user-facing messages.

### `src/state.ts`
```typescript
import { EventEmitter } from 'events'

export type ChatEventType =
  | 'user_message'
  | 'assistant_message'
  | 'processing'
  | 'progress'
  | 'error'
  | 'hive_mind'

export interface ChatEvent {
  type: ChatEventType
  chatId: string
  agentId?: string
  data: unknown
  timestamp: number
}

export const chatEvents = new EventEmitter()
export const voiceEnabledChats = new Set<string>()
export const activeSessions = new Map<string, { startedAt: number; agentId?: string }>()
export const abortControllers = new Map<string, AbortController>()

// Security state (if security enabled)
export let isSystemLocked = true
export let lastActivityAt = Date.now()
export function touchActivity() { lastActivityAt = Date.now() }
export function setLocked(locked: boolean) { isSystemLocked = locked }
```

The `chatEvents` EventEmitter broadcasts events to SSE clients connected to the dashboard. The `abortControllers` map allows canceling in-progress agent calls per chatId.

### `src/message-queue.ts`
```typescript
type QueuedTask = () => Promise<void>

const queues = new Map<string, QueuedTask[]>()
const processing = new Set<string>()

export async function enqueue(chatId: string, task: QueuedTask): Promise<void>
```
- Each chat ID gets its own FIFO queue
- If the queue for a chat is already processing, the new task waits
- Prevents race conditions when messages arrive faster than Claude can respond
- Tasks are processed sequentially per chat, but different chats run in parallel

### `src/cost-footer.ts`
```typescript
export type CostFooterMode = 'compact' | 'verbose' | 'cost' | 'full' | 'off'

export function formatCostFooter(
  model: string,
  inputTokens: number,
  outputTokens: number,
  mode?: CostFooterMode
): string
```

Behavior per mode:
- `compact`: `[sonnet-4]` (model name only, version suffix stripped)
- `verbose`: `[sonnet-4 | 2.1k in / 890 out]` (model + token counts)
- `cost`: `[sonnet-4 | ~$0.03]` (model + estimated cost)
- `full`: `[sonnet-4 | 2.1k in / 890 out | ~$0.03]` (all fields)
- `off`: returns empty string

Token formatting: 1M+ shows as "1.2M", 1k+ shows as "1.2k", below that shows raw number. Strips model version suffix (e.g., "claude-sonnet-4-6-20260514" becomes "sonnet-4").

### `src/agent.ts`
This is the heart of the system. Key requirements:

1. Import `query` from `@anthropic-ai/claude-agent-sdk`
2. Read secrets from `.env` via `readEnvFile()`, do NOT use `process.env` for secrets
3. `loadMcpServers()` merges project + user `settings.json` with the per-agent allowlist from `agent.yaml`
4. Call `query()` with:
   - `cwd: agentCwd ?? PROJECT_ROOT` - so Claude loads the correct CLAUDE.md
   - `resume: sessionId` - for persistent context across messages
   - `settingSources: ['project', 'user']` - loads CLAUDE.md + global skills from `~/.claude/`
   - `permissionMode: 'bypassPermissions'` - skip all permission prompts
   - `maxTurns: AGENT_MAX_TURNS` - default 30, prevents runaway tool-use loops
5. Iterate the async event generator:
   - `type === 'system' && subtype === 'init'` -> extract new `sessionId`
   - `type === 'result'` -> extract `result.result` as response text
   - Progress events on `tool_use` blocks + sub-agent lifecycle events
6. Call `onTyping()` callback every 4s while waiting (keeps typing indicator alive)
7. Return `{ text: string | null, newSessionId?: string, inputTokens?: number, outputTokens?: number }`

```typescript
export interface AgentOptions {
  message: string
  sessionId?: string
  agentId?: string
  cwd?: string
  systemPrompt?: string
  onTyping?: () => void
  maxTurns?: number
}

export interface AgentResult {
  text: string | null
  newSessionId?: string
  inputTokens?: number
  outputTokens?: number
  model?: string
}

export async function runAgent(opts: AgentOptions): Promise<AgentResult>

export async function runAgentWithRetry(
  opts: AgentOptions,
  maxRetries?: number
): Promise<AgentResult>
```

`runAgentWithRetry` wraps `runAgent` with 2 retries, exponential backoff, and model fallback. On each retry, it calls `classifyError()` to determine whether to retry, start a new chat, or switch models.

### `src/agent-config.ts`
```typescript
export interface AgentConfig {
  id: string
  name: string
  description: string
  model?: string           // default: claude-sonnet-4-6
  telegramToken?: string
  cwd: string
  claudeMdPath: string
  mcpAllowlist?: string[]
}

export function loadAgentConfigs(): AgentConfig[]
export function getAgentConfig(agentId: string): AgentConfig | undefined
export function getDefaultAgent(): AgentConfig
export function resolveAgentDir(agentId: string): string
export function resolveAgentClaudeMd(agentId: string): string
```

- If multi-agent: reads `agent.yaml` (NOT separate JSON files for MCP). Max 20 agents. Agent IDs must match `/^[a-z][a-z0-9_-]{0,29}$/`.
- External config resolves from `CLAUDECLAW_CONFIG` env var, defaulting to `~/.claudeclaw`.
- If single-agent: returns a single config pointing to the project root.
- Full lifecycle support: activate, deactivate, restart, delete.

### `src/message-classifier.ts`
```typescript
export type MessageComplexity = 'simple' | 'complex'

export function classifyMessage(text: string): MessageComplexity
```

Classifies incoming messages as simple or complex. Simple messages include acknowledgments ("ok", "thanks", "got it", "yes", "no"), single-word responses, and emoji-only messages. Complex messages are everything else. When enabled, simple messages can route to a cheaper/faster model. This is configurable and opt-in.

### `src/db.ts`
SQLite schema. This is a large file (2,400+ lines) containing ALL tables and queries. Always include:

**Table: `sessions`**
```sql
CREATE TABLE IF NOT EXISTS sessions (
  chat_id TEXT NOT NULL,
  agent_id TEXT NOT NULL DEFAULT 'main',
  session_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (chat_id, agent_id)
)
```
Note: composite primary key `(chat_id, agent_id)` so each agent maintains its own session per chat.

If `memory=full_v2`:
**Table: `memories`**
```sql
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  agent_id TEXT DEFAULT 'main',
  source TEXT,
  raw_text TEXT,
  summary TEXT,
  entities TEXT,
  topics TEXT,
  connections TEXT,
  importance REAL NOT NULL DEFAULT 0.5,
  salience INTEGER NOT NULL DEFAULT 0,
  consolidated INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  embedding BLOB,
  superseded_by INTEGER,
  created_at INTEGER NOT NULL,
  accessed_at INTEGER NOT NULL
)
```

Plus FTS5 virtual table `memories_fts` on `summary` and `raw_text` (content columns only), with triggers restricted to content columns:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(summary, raw_text, content=memories, content_rowid=id);

-- Triggers restricted to content columns only
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, summary, raw_text) VALUES (new.id, new.summary, new.raw_text);
END;
CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, summary, raw_text) VALUES ('delete', old.id, old.summary, old.raw_text);
END;
CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE OF summary, raw_text ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, summary, raw_text) VALUES ('delete', old.id, old.summary, old.raw_text);
  INSERT INTO memories_fts(rowid, summary, raw_text) VALUES (new.id, new.summary, new.raw_text);
END;
```

**Table: `consolidations`**
```sql
CREATE TABLE IF NOT EXISTS consolidations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  insight TEXT,
  connections TEXT,
  contradictions TEXT,
  source_memory_ids TEXT NOT NULL,
  created_at INTEGER NOT NULL
)
```

If `memory=simple`:
**Table: `turns`**
```sql
CREATE TABLE IF NOT EXISTS turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
)
```

**Table: `conversation_log`** (always):
```sql
CREATE TABLE IF NOT EXISTS conversation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  agent_id TEXT DEFAULT 'main',
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
)
```

**Table: `token_usage`** (always):
```sql
CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  agent_id TEXT DEFAULT 'main',
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost REAL,
  created_at INTEGER NOT NULL
)
```

If `scheduler` or Mission Control:
**Table: `scheduled_tasks`**
```sql
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule TEXT NOT NULL,
  next_run INTEGER NOT NULL,
  last_run INTEGER,
  last_result TEXT,
  priority INTEGER NOT NULL DEFAULT 3,
  agent_id TEXT NOT NULL DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','running','completed','failed')),
  created_at INTEGER NOT NULL
)
```
Index: `(status, priority, next_run)`

**Table: `mission_tasks`** (if multi-agent + scheduler):
```sql
CREATE TABLE IF NOT EXISTS mission_tasks (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
)
```

If `whatsapp`:
**Tables: `wa_messages`, `wa_outbox`, `wa_message_map`**
- `wa_messages` and `wa_outbox` use field-level AES-256-GCM encryption for message content
- `wa_message_map` maps WhatsApp message IDs to Telegram message IDs

If Slack:
**Table: `slack_messages`**
- Field-level AES-256-GCM encryption for message content

If multi-agent:
**Table: `hive_mind`**
```sql
CREATE TABLE IF NOT EXISTS hive_mind (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata TEXT,
  created_at INTEGER NOT NULL
)
```
Index: `(agent_id, created_at)`

**Table: `inter_agent_tasks`**
```sql
CREATE TABLE IF NOT EXISTS inter_agent_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  completed_at INTEGER
)
```

If security:
**Table: `audit_log`**
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  details TEXT,
  chat_id TEXT,
  created_at INTEGER NOT NULL
)
```

If war_room:
**Table: `warroom_transcript`**
```sql
CREATE TABLE IF NOT EXISTS warroom_transcript (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT,
  speaker TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
)
```

If meeting_bot:
**Table: `meet_sessions`**
```sql
CREATE TABLE IF NOT EXISTS meet_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_url TEXT NOT NULL,
  meeting_title TEXT,
  briefing TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  completed_at INTEGER
)
```

Additional tables (always):
- `skill_health` - tracks skill invocation success/failure
- `skill_usage` - skill usage statistics
- `session_summaries` - compressed session summaries for long conversations
- `compaction_events` - tracks when sessions are compacted

Always enable WAL mode: `db.pragma('journal_mode = WAL')`

Inline migrations via `PRAGMA table_info()` checks: when adding new columns to existing tables, check if they exist first and `ALTER TABLE` if missing.

Export:
- `initDatabase()` - creates all tables
- `getSession(chatId, agentId?)`, `setSession(chatId, sessionId, agentId?)`, `clearSession(chatId, agentId?)`
- If memory: memory CRUD functions
- If scheduler: task CRUD + `getDueTasks()`
- If hive_mind: `logToHiveMind(agentId, actionType, summary, metadata?)`, `getRecentHiveMind(limit?)`
- If whatsapp: WA queue functions (with encryption/decryption)
- If security: `logAuditEvent(eventType, details?, chatId?)`

### `src/gemini.ts` (if `memory=full_v2` or `war_room`)

```typescript
export async function callGemini(prompt: string, systemInstruction?: string): Promise<string>
export async function getEmbedding(text: string): Promise<number[]>
```

- Uses `GOOGLE_API_KEY` from `.env`
- Text model: `gemini-3-flash-preview` (fast, cheap, good enough for extraction)
- Embedding model: `gemini-embedding-001` (768 dimensions)
- Native `https` calls, no SDK needed
- `callGemini` sends a `generateContent` request and returns the text response
- `getEmbedding` sends an `embedContent` request and returns the float array

### `src/embeddings.ts` (if `memory=full_v2`)

```typescript
export function cosineSimilarity(a: number[], b: number[]): number
export function embeddingToBuffer(embedding: number[]): Buffer
export function bufferToEmbedding(buffer: Buffer): number[]
export async function findSimilarMemories(
  chatId: string,
  queryEmbedding: number[],
  limit?: number,
  threshold?: number
): Promise<Array<{ id: number; content: string; similarity: number }>>
```

- `cosineSimilarity`: dot product / (magnitude_a * magnitude_b)
- `embeddingToBuffer` / `bufferToEmbedding`: convert Float32Array to/from Buffer for SQLite storage
- `findSimilarMemories`: loads all embeddings for a chat_id, computes cosine similarity against the query, returns top matches above threshold (default 0.3)
- Duplicate threshold: 0.85 similarity

### `src/memory-ingest.ts` (if `memory=full_v2`)

```typescript
export async function ingestConversationTurn(
  chatId: string,
  role: 'user' | 'assistant',
  text: string,
  sessionId?: string,
  agentId?: string
): Promise<void>
```

This function is async and fire-and-forget. The caller does not await it (or catches and logs errors silently). The flow:

1. **Hard filter**: Skip if the user message is under 15 characters or starts with `/`
2. **Truncate**: Cut each message to 2000 characters max before sending to Gemini
3. **Extract**: Call Gemini (`gemini-3-flash-preview`) with the `EXTRACTION_PROMPT`:
   ```
   Extract key facts from this conversation turn. Return JSON:
   {
     "skip": false,
     "summary": "one sentence summary of what was discussed or decided",
     "entities": ["person names", "project names", "tools mentioned"],
     "topics": ["high level topics"],
     "importance": 0.7,
     "salience": 3
   }
   If the message is trivial (greetings, acknowledgments, simple yes/no), set skip=true.
   Importance scale: 0.0 = trivial, 0.5 = routine, 0.7 = notable, 1.0 = critical decision or preference.
   Salience scale: 0 = background noise, 1 = low, 2 = moderate, 3 = notable, 4 = high, 5 = critical.
   ```
4. **Parse**: JSON.parse the response. If `skip` is true, return early.
5. **Importance threshold**: If importance < 0.5, return early.
6. **Generate embedding**: Call `getEmbedding(summary)` to get the 768-dim vector
7. **Duplicate check**: Call `findSimilarMemories(chatId, embedding, 1, 0.85)`. If a match is found with similarity > 0.85, check for supersession (contradiction). If the new fact contradicts the existing one, set `superseded_by` on the old memory and save the new one. Otherwise, update the existing memory's `accessed_at` instead of creating a new one.
8. **Save**: Call `saveStructuredMemoryAtomic()` which inserts the memory row in a single transaction: raw_text (the full text), summary, entities (JSON string), topics (JSON string), importance, salience, embedding (as Buffer), session_id, agent_id, pinned=0, consolidated=0, timestamps.

### `src/memory-consolidate.ts` (if `memory=full_v2`)

```typescript
export async function runConsolidation(chatId: string): Promise<void>
export function startConsolidationLoop(chatId: string, intervalMs?: number): void
export function stopConsolidationLoop(): void
```

`runConsolidation`:
1. Fetch up to 20 unconsolidated memories: `SELECT * FROM memories WHERE chat_id=? AND consolidated=0 AND pinned=0 ORDER BY created_at DESC LIMIT 20`
2. If fewer than 3, skip (not enough to consolidate meaningfully)
3. Format memories into a text block and send to Gemini (`gemini-3-flash-preview`) with `CONSOLIDATION_PROMPT`:
   ```
   Analyze these memories and find patterns. Return JSON:
   {
     "summary": "overarching summary of what these memories represent",
     "insight": "one non-obvious pattern or preference you noticed",
     "connections": ["memory X relates to memory Y because..."],
     "contradictions": ["user said A on date1 but said B on date2"]
   }
   ```
4. Parse the response
5. Auto-correct timestamp ordering: if contradictions reference dates, ensure the "earlier" vs "later" labeling matches the actual `created_at` timestamps
6. Save to `consolidations` table
7. Mark source memories as `consolidated=1`: `UPDATE memories SET consolidated=1 WHERE id IN (...)`

`startConsolidationLoop`: Sets up a `setInterval` at `CONSOLIDATION_INTERVAL_MS` (default 30 minutes) that calls `runConsolidation` for active chat IDs.

### `src/memory.ts` (if `memory=full_v2`)

```typescript
export async function buildMemoryContext(chatId: string, userMessage: string): Promise<string>
export async function saveConversationTurn(chatId: string, userMsg: string, assistantMsg: string): Promise<void>
export async function evaluateMemoryRelevance(chatId: string, response: string, injectedMemories: string[]): Promise<void>
export function shouldNudgeMemory(chatId: string): boolean
export async function runDecaySweep(): Promise<void>
```

`buildMemoryContext` (5-layer retrieval):
1. **Embedding similarity**: Generate embedding for `userMessage`, call `findSimilarMemories(chatId, embedding, 5, 0.3)` (0.3 cosine minimum threshold)
2. **Recent high-importance**: `SELECT * FROM memories WHERE chat_id=? AND importance >= 0.7 AND pinned=0 AND superseded_by IS NULL ORDER BY accessed_at DESC LIMIT 5`
3. **Consolidation insights**: `SELECT * FROM consolidations WHERE chat_id=? ORDER BY created_at DESC LIMIT 3`
4. **Cross-agent hive mind**: `SELECT * FROM hive_mind ORDER BY created_at DESC LIMIT 5`
5. **Conversation history**: Recent turns from `conversation_log`
6. Deduplicate all results by `id`
7. Touch each result: `UPDATE memories SET accessed_at=now WHERE id=?`
8. Sort by importance descending
9. Return formatted context: `[Memory context]\n- {summary} (importance: {importance})\n...` or empty string if no matches

`evaluateMemoryRelevance`: Post-response, sends the response and injected memories to Gemini (`gemini-3-flash-preview`) to evaluate whether each memory was useful. Updates access timestamps and importance scores based on the feedback.

`shouldNudgeMemory`: Returns true if enough turns have passed (MEMORY_NUDGE_INTERVAL_TURNS, default 10) or enough time has elapsed (MEMORY_NUDGE_INTERVAL_HOURS, default 2) since the last memory injection.

`runDecaySweep`: Importance-weighted, multi-tier decay. High-importance memories decay slower. Pinned memories are exempt. Memories that haven't been accessed in a long time and have low importance get their importance reduced or eventually removed.

`saveConversationTurn`: Calls `ingestConversationTurn` twice (once for user message, once for assistant response). Fire-and-forget, errors are logged but don't block the response.

If `memory=simple`:
- `buildMemoryContext(chatId, n=10)` - return last N turns formatted as conversation history
- `saveConversationTurn(chatId, role, content)` - append to turns table
- `pruneOldTurns(chatId, keep=50)` - delete oldest beyond limit

### `src/bot.ts` - Telegram variant

This is a large file (1,500+ lines). Key functions to implement:

**`formatForTelegram(text: string): string`**
Telegram uses a limited HTML subset. Convert Markdown:
- Protect code blocks first (replace with placeholders, restore after)
- `**text**` or `__text__` -> `<b>text</b>`
- `*text*` or `_text_` -> `<i>text</i>`
- `` `code` `` -> `<code>code</code>`
- `~~text~~` -> `<s>text</s>`
- `[text](url)` -> `<a href="url">text</a>`
- `# Heading` -> `<b>Heading</b>`
- `- [ ]` / `- [x]` -> checkbox symbols
- Strip: `---`, `***`, raw `<html>` tags
- Escape: `&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;` in non-HTML contexts

**`splitMessage(text: string, limit = 4096): string[]`**
Split on newlines at or before the limit. Never split mid-word.

**`isAuthorised(chatId: number): boolean`**
Check against `ALLOWED_CHAT_ID`. If not set, return true (first-run mode). If security enabled, also check `isSystemLocked`.

**`handleMessage(ctx, rawText, forceVoiceReply = false)`**
Full pipeline:
1. Check auth (and security lock if enabled)
2. Enqueue in message queue for this chat
3. Run exfiltration guard on inbound message (if security enabled)
4. Classify message complexity (if message-classifier enabled)
5. Build memory context (if enabled)
6. Prepend memory context to message
7. Get session from DB (composite key: chat_id + agent_id)
8. Start typing refresh loop (every 4s)
9. `runAgentWithRetry({ message, sessionId, agentId, onTyping, maxTurns: AGENT_MAX_TURNS })`
10. Clear typing loop
11. Save new session if changed
12. `saveConversationTurn` (if memory enabled)
13. `evaluateMemoryRelevance` (if memory v2, fire-and-forget)
14. Log to hive mind (if multi-agent enabled)
15. Run exfiltration guard on outbound response (if security enabled)
16. Append cost footer (using SHOW_COST_FOOTER mode)
17. If TTS enabled + (forceVoiceReply or voiceMode): synthesize + send voice
18. Else: format, split, send each chunk as HTML

**Message handlers to register:**
- `bot.command('start')` - greeting
- `bot.command('chatid')` - echo chat ID
- `bot.command('newchat')` - `clearSession(chatId)`, confirm
- `bot.command('memory')` - show recent memories (if enabled)
- `bot.command('forget')` - alias for newchat
- `bot.command('voice')` - toggle voice mode
- `bot.command('lock')` - manually lock (if security)
- `bot.command('status')` - show agent status, memory count, task count
- `bot.on('message:text')` - main text handler (checks for PIN unlock if locked)
- `bot.on('message:voice')` - download, transcribe, handleMessage with `[Voice transcribed]: {text}`, set `forceVoiceReply=true`
- `bot.on('message:photo')` - download, `buildPhotoMessage(path, caption)`, handleMessage
- `bot.on('message:document')` - download, `buildDocumentMessage(path, name, caption)`, handleMessage
- `bot.on('message:video')` - download, `buildVideoMessage(path, caption)`, handleMessage (if video feature enabled)
- If scheduler enabled: `bot.command('schedule')` for CLI-like task management inline
- If multi-agent: handle `@agentName: prompt` delegation syntax in text messages

**Voice mode**: In-memory `Set<string>` of chat IDs with voice enabled. Toggle via `/voice` command.

### `src/bot.ts` - Discord variant

- Use `discord.js` `Client` with `GatewayIntentBits.Guilds`, `GuildMessages`, `MessageContent`, `DirectMessages`
- `isAuthorised(userId)` - check against `ALLOWED_USER_ID` env var
- Respond with `message.reply()`
- Split at 2000 chars (Discord limit)
- Use `message.channel.sendTyping()`, expires after 10s, refresh every 8s
- Handle attachments: download via `attachment.url`, detect type by extension
- Voice: use same Groq/ElevenLabs APIs; send audio file as attachment

### `src/bot.ts` - iMessage variant (macOS only)

- Poll `~/.imessage_inbox/` directory every 2s for new `.txt` files written by a companion AppleScript
- Or use `osascript` to poll the Messages SQLite DB at `~/Library/Messages/chat.db`
- Reply via `osascript -e 'tell application "Messages" to send "{text}" to buddy "{handle}"'`
- Wrap osascript calls in try/catch, iMessage permissions can be flaky
- Include setup instructions for granting Terminal/Node accessibility permissions in `scripts/setup.ts`

### `src/voice.ts` (if any voice feature selected)

Single file, 504 lines. Implements both STT and TTS with cascading fallbacks.

**STT cascade: Groq Whisper -> whisper-cpp fallback**

```typescript
export async function transcribeAudio(filePath: string): Promise<string>
```
- Primary: Groq Whisper API
  - Read file as Buffer
  - Build multipart/form-data manually (no extra deps)
  - POST to `https://api.groq.com/openai/v1/audio/transcriptions`
  - Model: `whisper-large-v3`
  - Header: `Authorization: Bearer {GROQ_API_KEY}`
  - Return `response.text`
  - Rename `.oga` to `.ogg` before sending (Groq requirement)
- Fallback: local whisper-cpp (if Groq fails or is unavailable)

**STT - OpenAI (alternative):**
```typescript
export async function transcribeAudioOpenAI(filePath: string): Promise<string>
```
- Use `openai` package: `openai.audio.transcriptions.create()`
- Model: `whisper-1`

**TTS cascade: ElevenLabs -> Gradium -> Kokoro -> macOS say**

```typescript
export async function synthesizeSpeech(text: string): Promise<Buffer | null>
```
- Primary: ElevenLabs
  - POST to `https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}`
  - Body: `{ text, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }`
  - Return MP3 as Buffer
- Fallback 1: Gradium (if ElevenLabs fails)
- Fallback 2: Kokoro (any OpenAI-compatible TTS server at KOKORO_URL, no API key needed)
- Fallback 3: macOS `say` command (last resort, system voice)

**Capability check:**
```typescript
export function voiceCapabilities(): { stt: 'groq' | 'openai' | null; tts: 'elevenlabs' | 'kokoro' | 'say' | null }
```

### `src/media.ts`

```typescript
export const UPLOADS_DIR = path.join(PROJECT_ROOT, 'workspace', 'uploads')

export async function downloadMedia(botToken: string, fileId: string, originalFilename?: string): Promise<string>
export function buildPhotoMessage(localPath: string, caption?: string): string
export function buildDocumentMessage(localPath: string, filename: string, caption?: string): string
export function buildVideoMessage(localPath: string, caption?: string): string
export function cleanupOldUploads(maxAgeMs?: number): void
```

`downloadMedia`:
1. Call Telegram `getFile` endpoint to get `file_path`
2. Download from `https://api.telegram.org/file/bot{token}/{file_path}`
3. Sanitize filename: keep only `[a-zA-Z0-9._-]`, replace rest with `-`
4. Save to `{UPLOADS_DIR}/{Date.now()}_{sanitized}`
5. Return local path

`buildVideoMessage` should instruct Claude to use the Gemini API with `GOOGLE_API_KEY` from `.env` to analyze the video.

`cleanupOldUploads`: delete files older than `maxAgeMs` (default 24h). Called on startup.

**Path resolution**: Use `fileURLToPath(import.meta.url)` everywhere. Never `new URL(import.meta.url).pathname`.

### `src/orchestrator.ts` (if multi-agent)

```typescript
export function initOrchestrator(): void
export function parseDelegation(message: string): { agentId: string; prompt: string } | null
export async function delegateToAgent(
  agentId: string,
  prompt: string,
  chatId: string,
  onTyping?: () => void
): Promise<AgentResult>
export function getAgentRegistry(): Map<string, AgentConfig>
```

`initOrchestrator`:
- Read `agent.yaml` for agent configuration (NOT separate config.yml files per agent directory)
- Parse each config, validate required fields (id, name), enforce ID regex `/^[a-z][a-z0-9_-]{0,29}$/`
- Build an in-memory registry: `Map<string, AgentConfig>` (max 20 agents)
- Always include a "main" agent pointing to the project root

`parseDelegation`:
- Check for `@agentId: prompt` syntax (e.g., `@comms: draft a reply to Sarah`)
- Check for `/delegate agentId prompt` syntax
- Return `{ agentId, prompt }` or null if no delegation pattern found

`delegateToAgent`:
- Look up agent in registry, throw if not found
- Call `runAgentWithRetry()` with the agent's `cwd` and system prompt path
- Log the delegation and result to hive mind
- Return the agent's response

### `src/agent-create.ts` (if multi-agent)

A 615-line agent creation wizard:

```typescript
export async function createAgent(
  id: string,
  name: string,
  description: string,
  telegramToken?: string,
  model?: string
): Promise<void>
```

- Validates agent ID against `/^[a-z][a-z0-9_-]{0,29}$/`
- Checks max 20 agent limit
- Creates `agents/{id}/` directory structure
- Copies `agents/_template/CLAUDE.md` and template config
- Replaces placeholder values in the copied files
- Creates `agents/{id}/workspace/` directory
- Updates `agent.yaml` with the new agent entry
- If telegramToken provided, stores it in the config

### `src/agent-create-cli.ts` (if multi-agent)

CLI wrapper for `agent-create.ts`. Run as `node dist/agent-create-cli.js`.

### `src/security.ts` (if security)

All four security layers in one 215-line file:

```typescript
export function initSecurity(opts: {
  pinHash?: string        // salt:hash format
  idleLockMinutes?: number
  killPhrase?: string
}): void

export function isLocked(): boolean
export function unlock(pin: string): boolean
export function lock(): void
export function checkKillPhrase(message: string): boolean
export function executeEmergencyKill(): void
export function audit(eventType: string, details?: string, chatId?: string): void
```

`initSecurity`: Reads PIN hash (salt:hash format), idle timeout, and kill phrase from config. Sets up idle auto-lock check.

`isLocked`: Returns true if the system is explicitly locked OR if idle timeout has been exceeded (no activity for `idleLockMinutes` minutes).

`unlock`: Extract salt from stored hash (salt:hash format). Hash the provided PIN with the same salt using SHA-256. Compare using `crypto.timingSafeEqual()` (NOT `===`). If match, set locked=false, touch activity, log audit event. If mismatch, log failed attempt, return false.

`lock`: Set locked=true, log audit event.

`checkKillPhrase`: **Case-insensitive** exact match against the configured kill phrase. If match, calls `executeEmergencyKill()`.

`executeEmergencyKill`:
1. Log the kill event to audit
2. Send SIGTERM to all `com.claudeclaw.*` launchd services (macOS) or systemctl user services (Linux)
3. Set a 5-second timeout, then `process.exit(1)`
4. This is the nuclear option. It stops everything.

`audit`: Insert row into `audit_log` table with timestamp. Tracked event types: message, command, delegation, unlock, lock, kill, blocked.

### `src/exfiltration-guard.ts` (if security)

15+ secret detection patterns with base64 and URL-encoded scanning:

```typescript
export interface SecretMatch {
  type: string
  position: number
  length: number
  preview: string
}

export interface ScanResult {
  clean: boolean
  redacted: string
  matches: SecretMatch[]
}

export function scanForSecrets(text: string): ScanResult
export function redactSecrets(text: string, matches: SecretMatch[]): string
```

Regex patterns to check:
- API keys: `/\b(sk-[a-zA-Z0-9]{20,})\b/g` (OpenAI-style)
- API keys: `/\b(pk_[a-zA-Z0-9]{20,})\b/g` (Stripe-style)
- API keys: `/\b(rk_[a-zA-Z0-9]{20,})\b/g`
- Slack tokens: `/\b(xox[bpors]-[a-zA-Z0-9-]{10,})\b/g`
- AWS access keys: `/\b(AKIA[0-9A-Z]{16})\b/g`
- AWS secret keys: `/\b([a-zA-Z0-9/+=]{40})\b/g` (only when near "aws" or "secret" context)
- Bearer tokens: `/Bearer\s+[a-zA-Z0-9._\-]{20,}/g`
- Hex secrets: `/\b[0-9a-f]{32,}\b/gi` (32+ char hex strings)
- Password assignments: `/(?:password|passwd|secret|token)\s*[:=]\s*\S+/gi`
- Env file dumps: detect multiple `KEY=value` lines in sequence
- **Base64-encoded secrets**: detect base64 strings that decode to known key patterns (sk-, pk_, AKIA, xox)
- **URL-encoded secrets**: detect percent-encoded strings that decode to known key patterns (%73%6B-, etc.)
- GitHub tokens: `/\b(ghp_[a-zA-Z0-9]{36})\b/g`
- Google API keys: `/\b(AIza[a-zA-Z0-9_-]{35})\b/g`
- Generic long secrets: `/\b[a-zA-Z0-9]{64,}\b/g` (64+ char alphanumeric strings in suspicious context)

`scanForSecrets`: Run all patterns, collect matches as `SecretMatch[]` with type, position, length, and preview. Return whether the text is clean or not.

`redactSecrets`: Replace each match with `[REDACTED]`.

### `src/scheduler.ts` (if `scheduler` selected)

```typescript
type Sender = (chatId: string, text: string) => Promise<void>

export function initScheduler(sender: Sender, agentId?: string): void
export async function runDueTasks(): Promise<void>
export function computeNextRun(cronExpression: string): number
```

- Poll every 60s
- `getDueTasks()` -> tasks where `status='active'` and `next_run <= now`, ordered by priority (if Mission Control) then next_run
- For each task:
  1. Update status to `running`
  2. Notify the chat that the task is starting
  3. `runAgentWithRetry({ message: task.prompt, agentId: task.agent_id })` (no session, fresh each time)
  4. Send the result to the chat
  5. Compute next_run via `cron-parser`
  6. Update task: set last_run, last_result, next_run, status back to `active`
  7. If the task errors, set status to `failed` and log the error

### `src/schedule-cli.ts` (if `scheduler` selected)

CLI tool for managing scheduled tasks. Run as `node dist/schedule-cli.js <cmd>`.

Commands:
- `create "<prompt>" "<cron>" <chat_id> [agent_id] [priority]` - validate cron, create task, print ID
- `list` - show all tasks in a table
- `delete <id>` - remove task
- `pause <id>` / `resume <id>` - toggle status

### `src/mission-cli.ts` (if multi-agent + scheduler)

Extended task management that includes agent assignment and priority:
```typescript
// Same interface as schedule-cli but adds:
// - Agent assignment: which agent runs the task
// - Priority: 1-5 (1 = highest)
// - Status filtering: list --status=active, list --agent=comms
```

### `src/hooks.ts`

```typescript
export type HookPhase = 'pre_message' | 'post_message'

export interface Hook {
  phase: HookPhase
  name: string
  handler: (ctx: HookContext) => Promise<void>
}

export function registerHook(hook: Hook): void
export async function runHooks(phase: HookPhase, ctx: HookContext): Promise<void>
```

Pre/post message hooks for extensibility. Pre-message hooks run before the agent call (can modify the message, add context, or block). Post-message hooks run after (can modify the response, trigger side effects).

### `src/rate-tracker.ts`

```typescript
export function trackUsage(chatId: string, agentId: string, tokens: number, cost: number): void
export function getDailyUsage(chatId?: string): { tokens: number; cost: number }
export function getHourlyUsage(chatId?: string): { tokens: number; cost: number }
export function isOverBudget(chatId?: string): boolean
```

Daily and hourly budget tracking. Configurable limits via env vars.

### `src/obsidian.ts`

```typescript
export async function buildObsidianContext(query: string, vaultPath?: string): Promise<string>
```

Searches the user's Obsidian vault for notes relevant to the current query and returns formatted context to inject alongside memory context.

### `src/dashboard.ts` (if dashboard)

```typescript
export function startDashboard(port?: number): void
```

- Uses Hono to serve HTTP on `DASHBOARD_PORT` (default 3141)
- Token auth via `?token=` query param
- Routes:
  - `GET /` - main dashboard page (rendered from `dashboard-html.ts`)
  - `GET /api/memories?chatId=X` - JSON list of memories
  - `GET /api/agents` - JSON list of agent configs and status
  - `GET /api/tasks` - JSON list of scheduled tasks
  - `GET /api/hive-mind?limit=50` - JSON list of recent hive mind entries
  - `GET /api/tokens` - JSON token usage stats
  - `GET /api/events` - SSE stream for real-time updates
  - `POST /api/tasks` - create a new task
  - `DELETE /api/tasks/:id` - delete a task
  - `POST /api/agents` - create a new agent from dashboard
  - War Room management routes: `POST /api/warroom/start`, `POST /api/warroom/stop`, `GET /api/warroom/status`

### `src/dashboard-html.ts` (if dashboard)

```typescript
export function renderDashboard(data: DashboardData): string
```

- Returns a complete HTML page with inline CSS and JS (3,200+ lines)
- No build step, no React, no external dependencies (except Chart.js loaded via CDN)
- Dark theme (matches the terminal aesthetic)
- Sections: Agent Status cards, Memory Timeline (searchable), Mission Control table, Hive Mind feed, Token Usage chart (Chart.js), War Room management panel
- Auto-refreshes via SSE connection to `/api/events` for real-time updates, with `fetch` fallback
- Privacy blur toggle to obscure sensitive data
- Agent creation form
- Responsive layout (works on phone too)

### `src/warroom-html.ts` (if war_room)

```typescript
export function renderWarRoomPage(): string
```

- Cinematic HTML page (69KB with boardroom intro animation)
- Contains the WebSocket client JS (connects to port 7860)
- Audio capture via `getUserMedia`, sends audio frames over WebSocket
- Receives audio frames back from the server, plays them via `AudioContext`
- Visual indicators: who's speaking, which agent is responding, recording state
- GoT-themed UI with agent persona cards (Hand of the King, Grand Maester, etc.)
- Boardroom intro animation on first load

### `warroom/server.py` (if war_room)

WebSocket server on port 7860. The main entry point for the War Room. Dual-mode:

```python
# Key components:
# - WebSocket transport (Pipecat)
# - VAD (Silero voice activity detection)
# - Two modes: Gemini Live (default) or Legacy (Deepgram + Cartesia)
# - Agent router (determines which agent answers)
# - Agent bridge (calls Node.js Claude Code subprocess)
# - Tool definitions: delegate_to_agent, answer_as_agent, get_time, list_agents

# Pipeline (Gemini Live mode):
# WebSocket -> VAD -> Gemini Live (speech-to-speech) -> Agent Bridge -> WebSocket

# Pipeline (Legacy mode):
# WebSocket -> VAD -> Deepgram STT -> Router -> Agent Bridge -> Cartesia TTS -> WebSocket
```

Dependencies: `pipecat-ai[websocket,deepgram,cartesia,silero]==0.0.75`

Key config from `warroom/config.py`:
- `MODE`: "live" or "legacy"
- `GEMINI_API_KEY`: from env (mapped from GOOGLE_API_KEY)
- `DEEPGRAM_API_KEY`: from env (legacy mode only)
- `CARTESIA_API_KEY`: from env (legacy mode only)
- `AGENT_BRIDGE_PATH`: path to `node dist/agent-voice-bridge.js`
- Project root resolver for finding the Node.js bridge

### `warroom/router.py` (if war_room)

```python
class AgentRouter(FrameProcessor):
    """Routes voice input to the correct agent based on priority rules."""

    # Rule 1: Broadcast triggers ("everyone", "all agents", "team")
    # Rule 2: Name prefix ("hey Comms", "Research,", "@ops")
    # Rule 3: Pinned agent (read from /tmp/warroom-pin.json)
    # Rule 4: Default to main agent

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, TranscriptionFrame):
            agent_id = self.route(frame.text)
            await self.push_frame(AgentRouteFrame(agent_id=agent_id, text=frame.text))
```

Pin state is persisted to `/tmp/warroom-pin.json` so it survives reconnections within a session.

### `warroom/personas.py` (if war_room)

```python
# GoT-themed agent personas with system prompts
# Each persona has: name, title, voice_id, personality_prompt
#
# Main     = Hand of the King (Charon)    - "Coordinates the realm"
# Research = Grand Maester (Kore)         - "Knowledge is power"
# Comms    = Master of Whisperers (Aoede) - "Every whisper, every raven"
# Content  = Royal Bard (Leda)            - "Stories shape kingdoms"
# Ops      = Master of War (Alnilam)      - "Precision wins battles"
#
# Reads voice mappings from warroom/voices.json
```

### `warroom/agent_bridge.py` (if war_room)

```python
import subprocess, json

def call_agent(agent_id: str, prompt: str, chat_id: str = None, quick: bool = False) -> str:
    """Spawn node dist/agent-voice-bridge.js and return the response."""
    args = ["node", "dist/agent-voice-bridge.js", agent_id, prompt]
    if quick:
        args.append("--quick")      # limits to 3 turns
    if chat_id:
        args.extend(["--chat-id", chat_id])  # session persistence
    result = subprocess.run(
        args,
        capture_output=True, text=True, timeout=900,  # 15 min timeout
        env=_safe_env()  # strips sensitive vars
    )
    response = json.loads(result.stdout)
    return response.get("text", "I couldn't process that.")

def _safe_env():
    """Return os.environ minus sensitive keys."""
    # Remove: *_API_KEY, *_TOKEN, *_SECRET, *_PASSWORD
```

Note: timeout is 900 seconds (15 minutes) to match AGENT_TIMEOUT_MS.

### `warroom/config.py` (if war_room)

```python
import os
from pathlib import Path

# Project root resolver
PROJECT_ROOT = Path(__file__).parent.parent

MODE = os.getenv("WARROOM_MODE", "live")  # "live" or "legacy"
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "")
WARROOM_PORT = int(os.getenv("WARROOM_PORT", "7860"))
AGENT_BRIDGE_PATH = os.getenv(
    "AGENT_BRIDGE_PATH",
    str(PROJECT_ROOT / "dist" / "agent-voice-bridge.js")
)

def load_voices():
    """Load voice mappings from voices.json."""
    voices_path = Path(__file__).parent / "voices.json"
    # ...
```

### `warroom/voices.json` (if war_room)

```json
{
  "main": {
    "cartesia_voice_id": "default",
    "gemini_voice": "Charon",
    "speaking_rate": 1.0,
    "personality": "Hand of the King. Coordinates the realm. Direct, authoritative, no-nonsense."
  },
  "research": {
    "cartesia_voice_id": "default",
    "gemini_voice": "Kore",
    "speaking_rate": 0.9,
    "personality": "Grand Maester. Knowledge is power. Thorough, analytical, citation-heavy."
  },
  "comms": {
    "cartesia_voice_id": "default",
    "gemini_voice": "Aoede",
    "speaking_rate": 1.0,
    "personality": "Master of Whisperers. Every whisper, every raven. Warm, professional, detail-oriented."
  },
  "content": {
    "cartesia_voice_id": "default",
    "gemini_voice": "Leda",
    "speaking_rate": 1.0,
    "personality": "Royal Bard. Stories shape kingdoms. Creative, articulate, brand-aware."
  },
  "ops": {
    "cartesia_voice_id": "default",
    "gemini_voice": "Alnilam",
    "speaking_rate": 0.95,
    "personality": "Master of War. Precision wins battles. Methodical, infrastructure-focused."
  }
}
```

### `src/agent-voice-bridge.ts` (if war_room)

```typescript
// CLI entry point called by warroom/agent_bridge.py
// Usage: node dist/agent-voice-bridge.js <agent_id> <prompt> [--quick] [--chat-id <id>]

// 1. Parse process.argv for agent_id, prompt, --quick flag, --chat-id option
// 2. Strip sensitive env vars from subprocess environment
// 3. Initialize DB (for session lookup)
// 4. Load agent config via resolveAgentDir() and resolveAgentClaudeMd()
// 5. Call query() from Claude Agent SDK with:
//    - cwd: agent's working directory
//    - systemPrompt: agent's CLAUDE.md content
//    - permissionMode: 'bypassPermissions'
//    - maxTurns: 3 if --quick, else AGENT_MAX_TURNS
//    - resume: sessionId if --chat-id provided (session persistence)
// 6. Write JSON result to stdout: { text: "response", agentId: "main" }
// 7. Exit
```

### `src/meet-cli.ts` (if meeting_bot)

792 lines. Supports both Pika and Recall.ai providers:

```typescript
export async function preFlight(meetingId: string): Promise<string>
export async function joinMeeting(meetingUrl: string, provider?: 'pika' | 'recall'): Promise<void>
export async function postMeetingSummary(chatId: string): Promise<void>
```

`preFlight`:
1. Check Google Calendar for the meeting (via Claude tool use)
2. Search Gmail for related threads (attendee names, meeting subject)
3. Search Memory for context about attendees and topics
4. Compile a briefing: who's attending, what's the context, what you discussed last time, any action items
5. Send briefing to Telegram 75 seconds before meeting start

`joinMeeting`:
1. If provider is 'pika': Generate video avatar via Pika API (requires PIKA_API_KEY)
2. If provider is 'recall': Use Recall.ai voice bot (requires RECALL_API_KEY)
3. Launch browser automation to join the meeting URL
4. Stream audio to/from the War Room pipeline for live responses

### `src/slack.ts` (if Slack)

```typescript
import { WebClient } from '@slack/web-api'

export function initSlackClient(token: string): WebClient
export async function listChannels(): Promise<Channel[]>
export async function readMessages(channelId: string, limit?: number): Promise<Message[]>
export async function sendMessage(channelId: string, text: string): Promise<void>
```

Slack client wrapper using `@slack/web-api`. Messages stored in `slack_messages` table with field-level AES-256-GCM encryption.

### `src/index.ts`

```typescript
async function main() {
  // 1. Show banner (read banner.txt, fallback to plain text header)
  // 2. Check TELEGRAM_BOT_TOKEN (or equivalent), exit with clear message if missing
  // 3. acquireLock(), write PID to store/claudeclaw.pid; kill stale if exists
  // 4. initDatabase()
  // 5. if security: initSecurity({ pinHash, idleLockMinutes, killPhrase })
  // 6. if memory=full_v2: startConsolidationLoop(defaultChatId)
  // 7. cleanupOldUploads() (if media enabled)
  // 8. if multi-agent: initOrchestrator()
  // 9. const bot = createBot()
  // 10. if scheduler: initScheduler(sendFn, defaultAgentId)
  // 11. if dashboard: startDashboard(DASHBOARD_PORT)
  // 12. if war_room: auto-spawn War Room Python process
  // 13. if whatsapp: initWhatsApp(onIncoming)
  // 14. Register SIGINT/SIGTERM handlers -> graceful shutdown
  //     (stop consolidation loop, stop scheduler, close DB, release lock)
  // 15. bot.start() / bot.login() / etc
  logger.info('ClaudeClaw OS running')
}
```

`acquireLock()`: Write `process.pid` to `store/claudeclaw.pid`. If file exists, read PID, try `process.kill(pid, 0)`, if alive, kill it; if stale, overwrite.

`releaseLock()`: Delete PID file.

---

## STEP 5 - CLAUDE.md template

Create `CLAUDE.md` with this structure. Include placeholder comments for the user to fill in:

```markdown
# [YOUR ASSISTANT NAME]

You are [YOUR NAME]'s personal AI assistant, accessible via [PLATFORM].
You run as a persistent service on their machine.

## Personality

Your name is [YOUR ASSISTANT NAME]. You are chill, grounded, and straight up.

Rules you never break:
- No em dashes. Ever.
- No AI cliches. Never say "Certainly!", "Great question!", "I'd be happy to", "As an AI".
- No sycophancy.
- No excessive apologies. If you got something wrong, fix it and move on.
- Don't narrate what you're about to do. Just do it.
- If you don't know something, say so plainly.

## Who Is [YOUR NAME]

[YOUR NAME] [does what]. [Main projects]. [How they think/what they value].

## Your Job

Execute. Don't explain what you're about to do, just do it.
When [YOUR NAME] asks for something, they want the output, not a plan.
If you need clarification, ask one short question.

## Your Environment

- All global Claude Code skills (~/.claude/skills/) are available
- Tools: Bash, file system, web search, browser automation, all MCP servers
- This project lives at the directory where CLAUDE.md is located
- Obsidian vault: [YOUR_OBSIDIAN_VAULT_PATH]
- Gemini API key: stored in this project's .env as GOOGLE_API_KEY

## Available Skills

| Skill | Triggers |
|-------|---------|
| `gmail` | emails, inbox, reply, send |
| `google-calendar` | schedule, meeting, calendar |
| `todo` | tasks, what's on my plate |
| `agent-browser` | browse, scrape, click, fill form |
| `maestro` | parallel tasks, scale output |

## Multi-Agent System

[INCLUDE ONLY IF MULTI-AGENT SELECTED]

You are the Main agent. You coordinate with:
- @comms: handles email, Slack, LinkedIn, all communications
- @content: writing, editing, publishing, brand voice
- @ops: system admin, deployments, infrastructure, backups
- @research: deep dives, competitive analysis, market research

To delegate: "I'll hand this to @comms" then the orchestrator routes it.
Check hive mind before starting tasks to avoid duplicate work.

## Security

[INCLUDE ONLY IF SECURITY SELECTED]

- System starts locked. User must send PIN to unlock.
- Auto-locks after [IDLE_LOCK_MINUTES] minutes of inactivity.
- Kill phrase "[KILL_PHRASE]" stops all services immediately.
- All outgoing messages are scanned for API keys and tokens before sending.
- Never include raw API keys, tokens, or credentials in your responses.

## Scheduling Tasks

[INCLUDE ONLY IF SCHEDULER SELECTED]
To schedule a task, use: node [PATH]/dist/schedule-cli.js create "PROMPT" "CRON" CHAT_ID

Common patterns:
- Daily 9am: `0 9 * * *`
- Every Monday 9am: `0 9 * * 1`
- Every 4 hours: `0 */4 * * *`

## Message Format

- Keep responses tight and readable
- Use plain text over heavy markdown
- For long outputs: summary first, offer to expand
- Voice messages arrive as `[Voice transcribed]: ...`, treat as normal text, execute commands
- For heavy multi-step tasks: send progress updates via [PATH]/scripts/notify.sh "message"
- Do NOT send notify for quick tasks, use judgment

## Memory

Context persists via Claude Code session resumption.
You don't need to re-introduce yourself each message.
[IF MEMORY_V2]: Long-term facts are extracted and stored automatically. You can reference past conversations and preferences.

## Special Commands

### `convolife`
Check remaining context window:
1. Find latest session JSONL: `~/.claude/projects/` + project path with slashes replaced by hyphens
2. Get last cache_read_input_tokens value
3. Calculate: used / 200000 * 100
4. Report: "Context window: XX% used, ~XXk tokens remaining"

### `checkpoint`
Save session summary to SQLite:
1. Write 3-5 bullet summary of key decisions/findings
2. Insert into memories table as high-importance memory
3. Confirm: "Checkpoint saved. Safe to /newchat."
```

If multi-agent is selected, also create `agents/_template/CLAUDE.md`:

```markdown
# [AGENT_NAME]

You are [AGENT_NAME], a specialist agent in [YOUR NAME]'s ClaudeClaw system.
Your focus area: [AGENT_DESCRIPTION]

## Your Role

You handle [SPECIALIZATION]. When tasks outside your scope arrive, suggest delegating to the appropriate agent.

## Hive Mind

Before starting work, check the hive mind for relevant recent activity by other agents.
After completing significant work, log a summary to the hive mind.

## Rules

Same personality rules as the Main agent. No em dashes, no AI cliches, no sycophancy.
```

And `agents/_template/config.yml`:

```yaml
id: "[AGENT_ID]"
name: "[AGENT_NAME]"
description: "[AGENT_DESCRIPTION]"
model: "claude-sonnet-4-6"
# telegram_token: ""  # Uncomment and add token for dedicated bot
# mcp_allowlist:      # Uncomment to restrict MCP servers
#   - filesystem
#   - browser
```

---

## STEP 6 - Setup wizard (`scripts/setup.ts`)

The setup wizard is the onboarding experience (44.6KB). It must:

1. **Show banner** - ASCII art from `banner.txt` or fallback header
2. **Check requirements**:
   - Node >= 20
   - `claude` CLI installed and authenticated
   - Python 3.9+ (if war_room selected)
   - Build the project (`npm run build`), use `fileURLToPath(import.meta.url)` for PROJECT_ROOT
3. **Collect config interactively**:
   - Bot token (platform-specific)
   - Which optional features are enabled
   - API keys for selected features only (don't ask for keys you won't use)
   - If security: PIN (hash it immediately with random salt, store as salt:hash, never store plaintext), kill phrase
   - If multi-agent: Telegram tokens for each specialist agent (optional, can be added later)
4. **Open `CLAUDE.md` in `$EDITOR`** for personalization
5. **Write `.env`** with all collected values
6. **If multi-agent**: Create agent directories from template, generate `agent.yaml`
7. **If war_room**: Run `pip install -r warroom/requirements.txt`
8. **Install background service**:
   - macOS: generate + load launchd plist to `~/Library/LaunchAgents/com.claudeclaw.app.plist`
   - Linux: generate + enable systemd user service
   - Windows: print PM2 instructions
9. **Get chat ID**:
   - Start bot process
   - Tell user to send `/chatid`
   - Listen for it (or poll) -> update `.env`
10. **Print next steps**

Use color-coded output (ANSI): green for success, yellow for warnings, red for errors.

**Critical**: All `spawnSync` / `execSync` calls that use `PROJECT_ROOT` as `cwd` must derive `PROJECT_ROOT` via `fileURLToPath(import.meta.url)`. Never `new URL(import.meta.url).pathname`.

---

## STEP 7 - Status script (`scripts/status.ts`)

`npm run status` should check and print:

- Node version (pass/fail >=20)
- Python version (if war_room, pass/fail >=3.9)
- Claude CLI version
- Telegram/Discord bot token valid (call their test API endpoint)
- Chat ID / user ID configured
- Voice STT configured (if enabled)
- Voice TTS configured (if enabled)
- Security status: locked/unlocked (if security enabled)
- Service running status (`launchctl list` / `systemctl --user status`)
- DB exists + memory row count + consolidation count
- Scheduled task count (if enabled)
- Agent count and status (if multi-agent)
- Hive mind entry count (if multi-agent)
- Dashboard accessible on port 3141 (if dashboard)
- War Room accessible on port 7860 (if war_room)

---

## STEP 8 - package.json

```json
{
  "name": "claudeclaw",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "setup": "tsx scripts/setup.ts",
    "status": "tsx scripts/status.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "warroom": "python warroom/server.py",
    "dashboard": "tsx src/dashboard.ts"
  },
  "engines": { "node": ">=20" }
}
```

Always include:
- `@anthropic-ai/claude-agent-sdk@^0.2.34` (pinned version)
- `@google/genai@^1.44.0`
- `better-sqlite3` + `@types/better-sqlite3`
- `pino` + `pino-pretty`
- `hono` + `@hono/node-server`
- `typescript` + `tsx` + `@types/node`
- `vitest`

Add conditionally based on user answers:
- Telegram: `grammy`
- Discord: `discord.js`
- Slack: `@slack/web-api`
- OpenAI STT: `openai`
- Scheduler: `cron-parser`
- WhatsApp: `whatsapp-web.js`, `qrcode-terminal`
- Multi-agent: `js-yaml`

---

## STEP 9 - tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## STEP 10 - .env.example

Document every variable with inline comments. Mark which are required vs optional. Group by feature:

```bash
# === CORE (required) ===
TELEGRAM_BOT_TOKEN=        # From @BotFather
ALLOWED_CHAT_ID=           # Your Telegram chat ID (send /chatid to your bot)

# === VOICE (optional) ===
GROQ_API_KEY=              # Free at console.groq.com (for STT)
ELEVENLABS_API_KEY=        # Free tier at elevenlabs.io (for TTS)
ELEVENLABS_VOICE_ID=       # Voice ID from ElevenLabs dashboard
KOKORO_URL=                # URL of any OpenAI-compatible TTS server (for local TTS)

# === MEMORY V2 + WAR ROOM + VIDEO (optional) ===
GOOGLE_API_KEY=            # Free at aistudio.google.com (Gemini)

# === WAR ROOM LEGACY MODE (optional) ===
DEEPGRAM_API_KEY=          # Only if using legacy STT in War Room
CARTESIA_API_KEY=          # Only if using legacy TTS in War Room
WARROOM_MODE=live          # "live" (Gemini) or "legacy" (Deepgram+Cartesia)

# === SECURITY (optional) ===
PIN_HASH=                  # Salted SHA-256 of your PIN, salt:hash format (generated by setup wizard)
PIN_SALT=                  # Random salt (generated by setup wizard)
IDLE_LOCK_MINUTES=30       # Auto-lock after N minutes of inactivity
KILL_PHRASE=               # Emergency shutdown phrase

# === MEETING BOT (optional) ===
PIKA_API_KEY=              # For video avatar generation
RECALL_API_KEY=            # For voice-only meeting bot (Recall.ai)

# === MULTI-AGENT (optional) ===
CLAUDECLAW_CONFIG=         # External config dir, default ~/.claudeclaw
COMMS_TELEGRAM_TOKEN=      # Telegram bot token for Comms agent
CONTENT_TELEGRAM_TOKEN=    # Telegram bot token for Content agent
OPS_TELEGRAM_TOKEN=        # Telegram bot token for Ops agent
RESEARCH_TELEGRAM_TOKEN=   # Telegram bot token for Research agent

# === AGENT BEHAVIOR ===
AGENT_TIMEOUT_MS=900000    # Agent timeout in ms (default 15 min)
AGENT_MAX_TURNS=30         # Max tool-use turns per agent call (prevents runaway loops)
SHOW_COST_FOOTER=compact   # compact, verbose, cost, full, off
STREAM_STRATEGY=off        # global-throttle, single-agent-only, off
MEMORY_NUDGE_INTERVAL_TURNS=10   # Turns between memory nudges
MEMORY_NUDGE_INTERVAL_HOURS=2    # Hours between memory nudges

# === SLACK (optional) ===
SLACK_BOT_TOKEN=           # Slack bot OAuth token (xoxb-...)

# === SYSTEM ===
LOG_LEVEL=info             # pino log level: debug, info, warn, error
NODE_ENV=production        # "production" or "development"
```

---

## STEP 11 - .gitignore

```
node_modules/
dist/
.env
store/
workspace/
*.log
*.pid
agents/*/workspace/
warroom/__pycache__/
warroom/*.pyc
```

---

## STEP 12 - Build order

Write files in this order so each file's dependencies exist before it's referenced:

1. `.gitignore`, `package.json`, `tsconfig.json`
2. `src/env.ts`
3. `src/logger.ts`
4. `src/errors.ts`
5. `src/config.ts`
6. `src/state.ts`
7. `src/db.ts`
8. `src/gemini.ts` (if applicable)
9. `src/embeddings.ts` (if applicable)
10. `src/memory-ingest.ts` (if applicable)
11. `src/memory-consolidate.ts` (if applicable)
12. `src/memory.ts` (if applicable)
13. `src/agent.ts`
14. `src/agent-config.ts`
15. `src/message-classifier.ts`
16. `src/cost-footer.ts`
17. `src/message-queue.ts`
18. `src/hooks.ts`
19. `src/rate-tracker.ts`
20. `src/exfiltration-guard.ts` (if applicable)
21. `src/security.ts` (if applicable)
22. `src/voice.ts` (if applicable)
23. `src/media.ts` (if applicable)
24. `src/orchestrator.ts` (if applicable)
25. `src/agent-create.ts` (if applicable)
26. `src/agent-create-cli.ts` (if applicable)
27. `src/scheduler.ts` + `src/schedule-cli.ts` (if applicable)
28. `src/mission-cli.ts` (if applicable)
29. `src/whatsapp.ts` (if applicable)
30. `src/slack.ts` (if applicable)
31. `src/obsidian.ts`
32. `src/oauth-health.ts`
33. `src/skill-health.ts`
34. `src/skill-registry.ts`
35. `src/dashboard-html.ts` (if applicable)
36. `src/dashboard.ts` (if applicable)
37. `src/warroom-html.ts` (if applicable)
38. `src/agent-voice-bridge.ts` (if applicable)
39. `src/bot.ts`
40. `src/index.ts`
41. `CLAUDE.md`
42. `.env.example`
43. `agents/_template/CLAUDE.md` + `agents/_template/config.yml` (if multi-agent)
44. `warroom/config.py`, `warroom/router.py`, `warroom/personas.py`, `warroom/agent_bridge.py`, `warroom/server.py`, `warroom/requirements.txt`, `warroom/voices.json`, `warroom/client.js`, `warroom/client.bundle.js`, `warroom/daily_agent.py` (if war_room)
45. `scripts/setup.ts`
46. `scripts/status.ts`
47. `scripts/notify.sh`
48. `scripts/agent-create.sh`, `scripts/agent-service.sh`, `scripts/install-launchd.sh`
49. Run `npm install` and `npm run build` to verify

---

## STEP 13 - Known gotchas to avoid

1. **Spaces in paths**: Always use `fileURLToPath(import.meta.url)` to get `__dirname`-equivalent. Never use `new URL(import.meta.url).pathname`, it preserves `%20` URL encoding and breaks on paths with spaces (e.g. `~/Desktop/My Projects/claudeclaw`). This is the single most common source of "Missing script: build" errors during setup.

2. **process.env pollution**: Never set `process.env` from `.env`. Use `readEnvFile()` to read secrets into local variables. The Claude Code SDK subprocess inherits `process.env`, so polluting it can leak secrets or cause conflicts.

3. **Session resumption**: The `resume` option in the Claude SDK requires the exact session ID string from the previous run. Store it per-chat per-agent in SQLite using the composite key `(chat_id, agent_id)`. On `/newchat`, delete the row, don't pass `undefined` as a workaround.

4. **Typing indicator expiry**: Telegram's "typing..." indicator expires after ~5s. Refresh it every 4s in a `setInterval` while waiting for Claude. Clear the interval immediately after `runAgent` returns or you'll keep it spinning.

5. **grammy error handling**: Wrap `bot.start()` in a try/catch. grammy throws on invalid token at startup. Give a clear error message pointing to `TELEGRAM_BOT_TOKEN` in `.env`.

6. **WhatsApp Puppeteer on Apple Silicon**: `whatsapp-web.js` may need `--no-sandbox` Chromium flag on newer macs. Add to `LocalAuth` puppeteer args.

7. **Memory FTS sync**: The FTS5 virtual table triggers are restricted to content columns (`summary`, `raw_text`) only. Do NOT create triggers on non-content columns like `importance` or `accessed_at`, as this breaks FTS5. Any direct `UPDATE` or `DELETE` on the `memories` table outside these columns won't affect FTS, which is the correct behavior.

8. **`bypassPermissions` mode**: Required for unattended operation. Without it, the Claude subprocess will pause waiting for user approval on tool calls and the bot will hang.

9. **launchd `KeepAlive`**: Set `ThrottleInterval` to at least 5 seconds to prevent rapid crash-restart loops from hammering the system. Without it, a crash loop can make the machine unresponsive.

10. **OGA vs OGG**: Telegram sends voice notes as `.oga` files. Groq Whisper doesn't accept `.oga`. Rename to `.ogg` before sending, the format is identical, just the extension matters.

11. **Gemini embedding dimensions**: The `gemini-embedding-001` model returns 768-dimensional vectors. Store as `Float32Array` converted to Buffer (768 * 4 = 3072 bytes per embedding). Don't store as JSON, it's 10x larger.

12. **Consolidation race conditions**: The consolidation loop runs on a timer. If two consolidation runs overlap (unlikely but possible if one takes >30 min), they could process the same memories. Use a `processing` flag to prevent concurrent runs.

13. **War Room audio format**: Pipecat expects specific audio frame formats. Gemini Live sends 24kHz 16-bit mono PCM. The WebSocket client should capture at the same rate or use `AudioContext` to resample.

14. **Agent bridge subprocess timeout**: The Python `subprocess.run` call in `agent_bridge.py` has a 900-second (15 minute) timeout to match AGENT_TIMEOUT_MS. Long Claude Code operations (file generation, web browsing) can exceed even this. Consider implementing streaming for extremely long operations.

15. **PIN hash timing attacks**: Use `crypto.timingSafeEqual()` when comparing PIN hashes, not `===`. String comparison short-circuits on first mismatch, which leaks information about the hash.

16. **Exfiltration guard false positives**: Long hex strings in code output (git commit hashes, file checksums) will trigger the hex key pattern. The guard should skip content inside code blocks (``` fenced blocks) to reduce false positives.

17. **Hive mind write volume**: Don't log every message to the hive mind. Only log significant actions (emails sent, files created, tasks completed). A chatty hive mind becomes noise.

18. **Agent max turns**: Always pass `maxTurns: AGENT_MAX_TURNS` (default 30) to the SDK. Without it, a runaway tool-use loop can burn through your entire context window and token budget.

19. **Gemini model for memory**: Use `gemini-3-flash-preview` for memory extraction and consolidation. The 2.0 model is faster, cheaper, and sufficient for structured extraction.

20. **Memory salience vs importance**: These are separate fields. Importance (0-1) measures how critical the fact is. Salience (0-5) measures how prominent/noticeable it is. A fact can be high-importance but low-salience (important but not currently relevant) or vice versa.

---

## STEP 14 - After writing all files

1. Run `npm install`
2. Run `npm run build`, fix any TypeScript errors before proceeding
3. Run `npm run typecheck`, should pass cleanly
4. Run `npm test`, write at least basic tests for `env.ts`, `db.ts`, the formatter in `bot.ts`, `exfiltration-guard.ts` (if applicable), and `embeddings.ts` (if applicable)
5. Create `store/` and `workspace/uploads/` directories (or ensure they're created on startup)
6. If multi-agent: create `agents/_template/` directory with template files, plus `agents/comms/`, `agents/content/`, `agents/ops/`, `agents/research/`
7. If war_room: create `warroom/` directory with all Python files
8. Tell the user what was built: list the files created, features included, and estimated line count
9. Tell the user the next step: "Run `npm run setup` to configure your API keys and install the background service. The wizard will walk you through everything."
10. If war_room: "After setup, start the War Room separately with `npm run warroom`. Open http://localhost:7860 in your browser."
11. If dashboard: "The dashboard starts automatically with the main process. Open http://localhost:3141 in your browser."
12. Remind them: "You can still ask me anything, about how something works, how to get a specific API key, or what a file does."

---

## STEP 15 - Stay available

After handing off, do not disappear. You are still the onboarding assistant. The user may:

- Ask how to get their Telegram bot token -> walk them through @BotFather step by step
- Ask what to fill in for a CLAUDE.md placeholder -> help them write their personal context section
- Ask why a build step failed -> debug it with them
- Ask how to add a skill -> explain `~/.claude/skills/` and how to install one
- Ask how to create their first scheduled task -> give them the exact CLI command
- Ask what their chat ID is -> explain the `/chatid` command
- Ask how to set up a second agent -> walk them through creating a new @BotFather bot and adding the token
- Ask how to join the War Room -> explain opening http://localhost:7860 and granting mic access
- Ask how to set their PIN -> explain the setup wizard handles it, or how to manually hash and set in .env
- Ask how memory consolidation works -> explain the 30-minute cycle and what it produces
- Ask how agents communicate -> explain the hive mind and delegation syntax
- Ask how decay works -> explain importance-weighted tiers, pinning, and supersession
- Ask how the cost footer modes work -> explain all 5 modes and how to switch

Answer anything. You built this thing, you know how it works. Be the person they can ask when they're stuck at 11pm trying to get it running.

---

## Reference: what the v2 implementation targets

For reference, the full ClaudeClaw OS system this prompt is designed to build:
- ~8,000 lines of TypeScript across 35+ source files
- ~800 lines of Python for the War Room (5 files + config)
- 1,000+ lines of tests (Vitest)
- SQLite with 20+ tables + FTS5 full-text search + field-level AES-256-GCM encryption
- Memory v2 with Gemini extraction (gemini-3-flash-preview), 768-dim embeddings, 5-layer retrieval, auto-consolidation, decay, pinning, salience, supersession, relevance feedback, nudging
- 5-agent multi-agent system (max 20) with shared hive mind, claude-sonnet-4-6 default, agent.yaml config
- Real-time voice War Room via Pipecat + dual mode (Gemini Live / Deepgram+Cartesia) + GoT personas
- Full Telegram + WhatsApp + Slack bridge
- Groq Whisper STT (whisper-cpp fallback) + ElevenLabs/Gradium/Kokoro/say TTS cascade
- Mission Control with priority scheduling and agent assignment
- Security stack: PIN lock (salt:hash), idle timeout, kill phrase (case-insensitive), exfiltration guard (15+ patterns with base64/URL), audit log (7 event types)
- Web dashboard on port 3141 (3,200+ line embedded HTML, Chart.js, SSE, privacy blur)
- Meeting bot with pre-flight briefing (Pika + Recall.ai providers)
- Interactive setup wizard (44.6KB) with ANSI color output
- launchd (macOS) / systemd (Linux) auto-start
- Message classifier for smart routing
- 5-mode cost footer (compact, verbose, cost, full, off)
- Agent timeout 900s (15 min), max turns 30

Build what the user selected. Don't build what they didn't ask for.
