# Power Packs v3

> Read `DISCLAIMER.md` first. Each pack below is a self-contained prompt you can paste into a Claude Code session pointed at an existing Hive Mind project. Each adds one feature without rebuilding the whole system. Test on a sandbox before applying to a live system.

---

## How to use a Power Pack

1. Open a Claude Code session in your project root.
2. Pick the pack you want.
3. Paste the entire pack starting at the line marked `--- START PACK ---` and ending at the line marked `--- END PACK ---`.
4. Answer the questions Claude asks.
5. Review every diff Claude proposes before accepting.
6. Run the smoke test at the end of each pack before considering it installed.
7. Commit the changes to your version control.

Each pack assumes you have the base architecture from `REBUILD_PROMPT_V3.md` already installed. If you don't, start there.

---

## Pack 01 — War Room (Text)

Adds the multi-agent council with `/standup` and `/discuss` slash commands. Persists to `warroom_transcript`. Streams responses sequentially. Includes a consolidator pass.

### --- START PACK ---

You are extending an existing Hive Mind project to add a Text War Room. Before changing anything, audit the current code for these prerequisites:

1. The project has at least 2 agents in `agents/`.
2. There is an SQLite database at `store/claudeclaw.db` (or whatever the project's actual store is).
3. The database has a `conversation_log` table.
4. The project respects an `WARROOM_TEXT_ENABLED` env variable (or you can add it now).

If any prerequisite is missing, stop and report what's missing.

Once prerequisites are confirmed, do the following in order:

1. **Add the migration**: create a new migration file (e.g., `migrations/00X_warroom_text.sql`) that adds a `warroom_transcript` table with columns: `id` (pk), `meeting_id`, `turn_id`, `agent_id`, `message_text`, `role` (user/assistant), `source` (warroom-text), `created_at`. Add a partial unique index on (`source`, `source_turn_id`, `agent_id`) to prevent duplicate inserts.

2. **Add the orchestrator route**: a new function `handleTextWarRoom(message, meetingId)` that:
   - Detects slash commands (`/standup`, `/discuss <question>`, `/exit`).
   - For `/standup`: fetches the active agent roster, builds a status prompt for each, runs them sequentially with a 45-second per-agent budget, persists each response to `warroom_transcript`.
   - For `/discuss <question>`: same but with a discussion prompt, then runs a final consolidator pass with all responses as context.
   - For non-slash messages in a war room context: route to a designated lead agent with the recent transcript included as context.

3. **Add the kill switch check**: at the top of `handleTextWarRoom`, refuse if `WARROOM_TEXT_ENABLED=false`.

4. **Add a meeting watchdog**: 300-second total timeout per slash command. If exceeded, mark the turn finalized and stop accepting late chunks.

5. **Add the dashboard view (optional)**: a new route `/warroom-text` that renders the transcript for active meetings. Skip if the project doesn't have a dashboard yet.

6. **Smoke test**: send `/standup` from your bridge. Verify all agents respond. Send `/discuss should I switch from Notion to Obsidian` and verify the consolidator weighs in last.

After installation, document the feature in the project's main README under a "Power Packs Installed" heading.

### --- END PACK ---

---

## Pack 02 — Kill Switches

Adds six hot-reloadable kill switches that gate every dangerous boundary. Read at every relevant operation. Refresh on `.env` mtime change.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Kill Switch Pack.

Audit the project for these env variables (add any that are missing to `.env.example`):

- `LLM_SPAWN_ENABLED` (default `true`) — gates every Claude/Gemini/OpenAI API call
- `WARROOM_TEXT_ENABLED` (default `true`) — gates the text war room
- `WARROOM_VOICE_ENABLED` (default `true`) — gates the voice war room
- `DASHBOARD_MUTATIONS_ENABLED` (default `true`) — gates POST/PUT/DELETE on the dashboard
- `MISSION_AUTO_ASSIGN_ENABLED` (default `true`) — gates the auto-assign classifier
- `SCHEDULER_ENABLED` (default `true`) — gates the cron scheduler

Then:

1. Create a small module `src/kill-switches.ts` that exports a singleton with methods `isEnabled(switchName)`. The singleton reads `.env` on import and refreshes when the file's mtime changes.

2. Find every relevant boundary in the codebase and add a check:
   - Before any LLM API call: `if (!killSwitches.isEnabled('LLM_SPAWN_ENABLED')) throw new Error('LLM_SPAWN_ENABLED is false')`
   - Before any war room slash command: same pattern with `WARROOM_TEXT_ENABLED` or `WARROOM_VOICE_ENABLED`
   - Before any dashboard POST/PUT/DELETE: same pattern with `DASHBOARD_MUTATIONS_ENABLED`
   - Before the auto-assign classifier runs: same pattern with `MISSION_AUTO_ASSIGN_ENABLED`
   - Before the scheduler claims a task: same pattern with `SCHEDULER_ENABLED`

3. Add a `/api/health` endpoint (or augment the existing one) that returns the current state of all kill switches.

4. Add the kill switches to the dashboard Settings tab as toggles. The toggles read and write `.env` directly. After writing, the singleton picks up the change within a few seconds.

5. **Smoke test**: flip `LLM_SPAWN_ENABLED=false` in `.env`, send a message to an agent. Verify the system refuses with a clear error mentioning the kill switch. Flip back, verify it works again.

### --- END PACK ---

---

## Pack 03 — Audit Log

Adds an append-only audit log that records every state-changing action. 90-day retention. Supports incident reconstruction.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Audit Log Pack.

1. **Add the migration**: create a migration that adds an `audit_log` table with columns: `id` (pk), `ts`, `actor_type` (user/agent/system), `actor_id`, `action`, `target`, `payload_json`, `correlation_id`. Index by `ts`. Index by `correlation_id`.

2. **Find every state-changing action** in the project and add a write to `audit_log`:
   - Every tool call by an agent: action=`tool_call`, target=`<tool_name>`, payload=arguments
   - Every kill switch flip: action=`kill_switch_flip`, target=`<switch_name>`, payload={old, new}
   - Every dashboard mutation: action=`<route>`, payload=request body
   - Every agent spawn or stop: action=`agent_lifecycle`, payload={agent_id, state}
   - Every CLAUDE.md edit: action=`claude_md_edit`, target=`<agent_id>`, payload={diff}
   - Every scheduled task fire: action=`scheduled_task_run`, target=`<task_id>`, payload={result}

3. **Add a periodic prune job** (every 24 hours): delete rows older than 90 days. Skip if the row has been pinned (add a `pinned` boolean column).

4. **Add the dashboard view**: an Audit tab that shows the log in reverse chronological order with filters by actor, action, and time range.

5. **Smoke test**: trigger any action (send a message). Verify the audit_log table has new rows. Flip a kill switch. Verify it shows up. Pin a row. Run the prune job manually. Verify pinned row survives.

### --- END PACK ---

---

## Pack 04 — Suggestions Feature

Adds a periodic job that analyzes which agents are overloaded and recommends new agents to spin up. Uses a cheap classifier (Gemini Flash recommended).

### --- START PACK ---

You are extending an existing Hive Mind project to add the Suggestions Pack.

1. **Add the migration**: create a `suggestions` table with columns: `id` (pk), `ts`, `agent_id`, `suggestion_type`, `summary`, `details_json`, `dismissed_at`.

2. **Create the analysis job** at `src/jobs/suggestions.ts`. Schedule it to run every 24 hours. The job:
   - Counts conversation_log turns per agent over the last 7 days.
   - Finds the median count and flags any agent whose count is more than 2x the median.
   - For each flagged agent, runs a clustering prompt over the agent's recent turns: "What categories of work is this agent doing? Are any distinct enough to be a separate agent?"
   - If the prompt returns a viable split (more than one distinct category with substantial volume in each), inserts a row into `suggestions` with type `split_agent`.

3. **Use Gemini Flash** (or whatever cheap classifier you have configured). The clustering prompt should fit comfortably in 8K tokens of context. Truncate older conversations if needed.

4. **Add the dashboard surface**: a "Suggestions" panel on the Agents tab that lists active (non-dismissed) suggestions. Each suggestion has a "Dismiss" button that sets `dismissed_at`.

5. **Smoke test**: artificially insert a row with type `split_agent` into the suggestions table. Verify it shows up on the Agents tab. Dismiss it. Verify it disappears.

### --- END PACK ---

---

## Pack 05 — Auto-Assign Classifier

Adds a Gemini-powered classifier that routes incoming tasks to the right agent based on the task description.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Auto-Assign Pack.

1. **Find the orchestrator's "no explicit agent target" branch**. This is the code path where a message comes in without `@agent_name` or a slash command targeting a specific agent. Currently it probably falls through to a default agent (Main).

2. **Replace the fallback** with a classifier call:
   - Build a prompt: `The user sent: <message>\n\nAvailable agents:\n- main: <description>\n- comms: <description>\n...\n\nWhich agent should handle this? Respond with just the agent ID.`
   - Call Gemini Flash (or whatever cheap LLM you have set up).
   - Parse the response to extract the agent ID.
   - If parsing fails or returns an unknown agent, fall back to Main.

3. **Cache the classifier prompt by hash**. The agent set rarely changes. Precompute the prompt structure on agent registry change rather than rebuilding for every message.

4. **Respect the kill switch**: if `MISSION_AUTO_ASSIGN_ENABLED=false`, skip the classifier and route to Main.

5. **Audit log**: write an `auto_assign` row each time the classifier picks an agent. Include the message preview, agent picked, and any fallback reason.

6. **Smoke test**: send a research-flavored message ("look up the top 3 AI design tools"). Verify it routes to the Research agent. Send an inbox-flavored message ("check my email for anything urgent"). Verify it routes to Comms.

### --- END PACK ---

---

## Pack 06 — Three-Layer Memory

Replaces simple conversation-window memory with the FTS5 + embeddings + salience hybrid pattern. Includes auto-decay and pinning.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Three-Layer Memory Pack.

Prerequisites: the project must already have a Tier 1 or Tier 2 memory implementation. If it has Tier 1 (no extracted facts, just conversation log), this pack will upgrade you to Tier 3 directly.

1. **Schema additions**:
   - Add `fts_memory` virtual table using FTS5 over `memory.text`.
   - Add `embeddings` table with columns: `memory_id`, `vector` (BLOB or JSON), `model` (the embedding model used), `dim`.
   - Add to `memory` table: `salience` (float, default 0.5), `pinned` (boolean, default false), `last_used_at` (timestamp).

2. **On memory write**:
   - Insert into `memory` as before.
   - Compute embedding (Gemini's `text-embedding-004` works, or any other). Store in `embeddings`.
   - The FTS5 index updates automatically via triggers.

3. **On memory read** (the orchestrator's pre-agent-call):
   - Build a query string from the user's message.
   - Run three queries in parallel:
     - FTS5 keyword match (top 20)
     - Embedding cosine similarity (top 20)
     - Salience-only top results (top 20 of pinned + high-salience)
   - Merge results, dedupe by `memory_id`, score each by combined ranking, return top 10.
   - Inject into agent context as `## Relevant memories\n- ...`.

4. **Relevance feedback loop**:
   - After the agent's response, run a small LLM check: "Of these memory ids the agent had access to, which ones did the response actually use?"
   - For used memories, increment `salience` by 0.1 (capped at 1.0) and update `last_used_at`.
   - For unused memories accessed in the last 100 turns, decrement salience by 0.01.

5. **Decay sweep** (every 24 hours):
   - Find memories where `pinned=false` and `salience < 0.1` and `last_used_at` more than 60 days ago.
   - Move them to a `memory_archive` table or delete them, your call.
   - Pinned memories never decay.

6. **Smoke test**: ask the agent something. After it responds, query the memory table. Verify the `last_used_at` field updated for memories the agent referenced. Pin a memory manually. Run the decay sweep. Verify the pinned memory survives.

### --- END PACK ---

---

## Pack 07 — Exfiltration Guard

Scans outgoing content (Telegram messages, emails, file writes) for API key patterns and blocks transmission if matched.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Exfiltration Guard Pack.

1. **Create `src/exfiltration-guard.ts`**: a module exporting `scanForLeaks(content: string)` that returns `{safe: bool, matches: string[]}`. The scanner checks for:
   - `sk-ant-[A-Za-z0-9_-]{40,}` (Claude keys)
   - `xox[bap]-[0-9]+-[0-9]+-[0-9]+-` (Slack tokens)
   - `gh[pousr]_[A-Za-z0-9_]{36,}` (GitHub tokens)
   - `AKIA[0-9A-Z]{16}` (AWS access keys)
   - `[a-fA-F0-9]{40,}` (high-entropy hex, length-thresholded)
   - Any pattern from `.env.exfil_patterns` (a custom list the user can extend)

2. **Find every outbound boundary**:
   - Telegram send
   - Slack post
   - Discord post
   - Email send
   - File write (where the file is going outside the project)
   
   Insert a `scanForLeaks` check before transmission. If `safe=false`:
   - Block the send.
   - Write to `audit_log` with action=`exfil_blocked`, payload=matches.
   - Notify the user via a fallback channel (e.g., a system message in the dashboard).

3. **Add tests**: unit tests for each pattern. Negative tests for benign content that shouldn't match.

4. **Add the kill switch**: if `EXFIL_GUARD_ENABLED=false`, skip the scan. (Default true. Useful only for debugging.)

5. **Smoke test**: have an agent attempt to echo a fake `sk-ant-...` string. Verify the message is blocked. Verify the audit log records the block. Verify a benign message goes through unchanged.

### --- END PACK ---

---

## Pack 08 — Scheduled Tasks (Cron)

Adds a cron-backed scheduler with a friendly UI layer that hides the raw cron syntax from the user.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Scheduled Tasks Pack.

1. **Add the migration**: create a `scheduled_tasks` table with columns: `id` (pk), `agent_id`, `prompt`, `cron_expression`, `last_run_at`, `next_run_at`, `enabled`, `created_at`.

2. **Implement the scheduler**: a single-process loop that wakes every 60 seconds, queries `scheduled_tasks WHERE enabled=true AND next_run_at <= now()`, and for each match:
   - Spawns the relevant agent with the prompt.
   - Updates `last_run_at` and computes `next_run_at` from the cron expression.
   - Audits the run.

3. **Add a friendly UI layer**: in the dashboard's Scheduled tab, accept user-friendly inputs ("every weekday at 9 AM," "hourly," "every 30 minutes") and translate them to cron expressions on save. Show the cron expression as a small "advanced" toggle.

4. **Respect the kill switch**: if `SCHEDULER_ENABLED=false`, the loop runs but skips claiming any tasks.

5. **Smoke test**: create a task that runs every minute and prints "tick" via a Skill. Wait 2 minutes. Verify two `tick` outputs. Disable the kill switch. Wait another minute. Verify no tick. Re-enable.

### --- END PACK ---

---

## Pack 09 — Hive Mind Visualizations (2D + 3D + List)

Adds three views over the same underlying activity data: list view, 2D Obsidian-style graph, 3D brain visualization.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Visualization Pack.

1. **Prerequisite**: the project must have a populated `hive_mind_log` table (or equivalent). If it doesn't, install Pack 03 (Audit Log) first or create a `hive_mind_log` schema yourself.

2. **List view**: a simple chronological log table in the dashboard's Hive Mind tab. One row per activity entry. Columns: timestamp, agent, action summary, target. Filterable by agent.

3. **2D graph view**: render the same data as an interactive force-directed graph. Each agent is a hub node. Each task is a leaf node connected to the agent that handled it. Edges between tasks indicate shared context (same memory referenced, same conversation thread, etc.). Use a library like `vis-network` or `cytoscape.js`. Style after Obsidian's graph view.

4. **3D brain view (optional, cinematic)**: render a 3D anatomical brain mesh. Map each agent to a region. When an agent fires, that region briefly glows. Use `three.js` with a brain GLB model (find a free one on Sketchfab or generate via OpenScad). This view is heavy on resources. Mark it optional and require an opt-in toggle.

5. **Smoke test**: trigger several agent actions. Verify all three views update. Click into a node on the 2D graph. Verify it shows the linked details. Toggle the 3D view. Verify the brain renders and a region glows when an agent fires.

### --- END PACK ---

---

## Pack 10 — CLI Integration Pattern (Meta Agent example)

Documents how to wire any new globally-installed CLI tool into the Hive Mind so any agent can use it.

### --- START PACK ---

You are extending an existing Hive Mind project to add a new CLI integration. The example uses Meta's ad CLI but the pattern works for any CLI.

1. **Install the CLI globally on the host machine**. Example: `npm install -g meta-ads-cli` or whatever the install command is for the tool you're adding. Verify with `which <cli-name>`.

2. **Create a skill folder**: `skills/<cli-name>/` with:
   - `SKILL.md`: describe what the CLI does, what arguments it takes, when to use it. Include examples of typical command invocations.
   - `references/example_outputs.md`: paste a few real example outputs of the CLI so the agent knows what success looks like.
   - `scripts/` (optional): wrapper scripts if the CLI needs setup before invocation.

3. **Make sure the relevant agents have permission**: in the agent's `agent.yaml`, ensure `tools_allowlist` includes `Bash` (so the agent can shell out) or `Skill` (so the agent can invoke skills directly).

4. **Add a scheduled task (optional)**: if the CLI should run on a schedule (e.g., pull Facebook ads at 7:30 AM), add a row to `scheduled_tasks` referencing the agent and a prompt that tells the agent to invoke the CLI.

5. **Smoke test**: ask the relevant agent to run the CLI with a simple read-only command. Verify the response includes real CLI output.

### --- END PACK ---

---

## Pack 11 — Telegram Bridge Setup

Wires up Telegram bot polling and message routing.

### --- START PACK ---

You are extending an existing Hive Mind project to add or refresh the Telegram bridge.

1. **Get a bot token**: the user must do this manually via @BotFather on Telegram. Walk them through it:
   - Open Telegram, search for @BotFather.
   - Send `/newbot`.
   - Provide a name and a username.
   - Copy the token.

2. **Add the token to `.env`**: `TELEGRAM_BOT_TOKEN_<AGENT_ID>=...`. Each agent that needs its own bot gets its own token. Main is required; others are optional.

3. **Implement polling**: `src/bot.ts` runs a long-poll loop per bot. On each new message:
   - Parse the message (handle text, voice notes, photos).
   - Build a `BotIncomingEvent` with `agent_id` (from the bot token mapping), `chat_id`, `user_id`, `message`.
   - Hand off to the orchestrator.

4. **Implement send**: a `sendTelegramMessage(agent_id, chat_id, content)` function. If content includes media, use the appropriate Telegram Bot API method (sendPhoto, sendVoice, etc.).

5. **Respect the exfiltration guard** (if installed): scan content before sending.

6. **Smoke test**: message your Main bot. Verify the orchestrator receives the event. Verify the agent's response comes back.

### --- END PACK ---

---

## Pack 12 — Backup and Restore

Adds a periodic backup of the SQLite database with point-in-time restore capability.

### --- START PACK ---

You are extending an existing Hive Mind project to add the Backup Pack.

1. **Add a backup script** at `scripts/backup.sh`:
   ```bash
   #!/bin/bash
   set -euo pipefail
   STAMP=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="${HIVE_MIND_BACKUP_DIR:-$HOME/.claudeclaw-backups}"
   mkdir -p "$BACKUP_DIR"
   sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/claudeclaw_$STAMP.db'"
   # Prune backups older than 30 days
   find "$BACKUP_DIR" -name "claudeclaw_*.db" -mtime +30 -delete
   ```

2. **Schedule it**: add a cron entry that runs the backup every 6 hours (or whatever frequency fits your tolerance for data loss).

3. **Add a restore script** at `scripts/restore.sh`:
   ```bash
   #!/bin/bash
   set -euo pipefail
   BACKUP_FILE="$1"
   STOP_HIVE_MIND_FIRST=true # never restore on a live database
   if [ "$STOP_HIVE_MIND_FIRST" = true ]; then
       echo "Stop the orchestrator first. This script will not run while it's live."
       exit 1
   fi
   cp "$BACKUP_FILE" "$DB_PATH"
   echo "Restored from $BACKUP_FILE. Restart the orchestrator."
   ```

4. **Document the procedure** in the project's main README under a "Operations" heading.

5. **Smoke test**: run `scripts/backup.sh` manually. Verify a backup file appears with the timestamp. Wait 6 hours and verify the cron-scheduled backup also runs.

### --- END PACK ---

---

## Combined installation order

If you're installing multiple packs from a fresh build, the recommended order is:

1. Pack 11 — Telegram Bridge (you need a way to talk to it)
2. Pack 02 — Kill Switches (safety scaffolding before anything else)
3. Pack 03 — Audit Log (so subsequent packs can write audit entries)
4. Pack 08 — Scheduled Tasks (most useful early)
5. Pack 05 — Auto-Assign (if you have multiple agents)
6. Pack 06 — Three-Layer Memory (after you've used the system enough to want richer memory)
7. Pack 01 — War Room (when you have 3+ agents and want their combined perspective)
8. Pack 07 — Exfiltration Guard (before connecting any private data)
9. Pack 04 — Suggestions Feature (after a few weeks of usage data)
10. Pack 10 — CLI Integration (whenever you install a new CLI)
11. Pack 09 — Visualizations (entirely cosmetic, do this last)
12. Pack 12 — Backup and Restore (do this immediately if you skip everything else)

---

## What to do when a pack fails

- Read the audit log (if installed). Look for the most recent error.
- Run the smoke test in isolation. The smoke test is the minimum repro.
- Re-paste the pack into a fresh Claude Code session and ask it to diagnose.
- If you're stuck, the community is at https://www.skool.com/earlyaidopters/about.

---

**Reminder**: every pack is experimental. APIs change. Patterns break. Test in a sandbox before applying to a system you depend on. Read `DISCLAIMER.md` if you haven't.
