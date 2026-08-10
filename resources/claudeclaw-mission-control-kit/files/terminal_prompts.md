# Terminal Prompts

> Read `DISCLAIMER.md` first. These are copy-paste prompts for common operations. Replace placeholders before pasting. Never run a destructive operation without backing up your database first.

---

## Setup operations

### Initial scaffold (new build)

Paste into a fresh Claude Code session in an empty directory:

```
[Paste the contents of REBUILD_PROMPT_V3.md here]
```

### Audit existing build

Paste into a Claude Code session pointed at your existing project:

```
[Paste the contents of CLAUDECLAW_ASSESSMENT_PROMPT_V3.md here]
```

### Add a power pack

Paste the relevant pack from `POWER_PACKS_V3.md` into a Claude Code session pointed at your project. Each pack is self-contained.

---

## Agent management

### Add a new agent

```bash
# In your project root
cp -r AGENT_TEMPLATES/_template agents/<new_agent_id>
# Edit agents/<new_agent_id>/agent.yaml — change id, display_name, description
# Edit agents/<new_agent_id>/CLAUDE.md — write the persona
# Add a Telegram bot via @BotFather, save token in .env as TELEGRAM_BOT_TOKEN_<new_agent_id_uppercase>
# Restart the orchestrator
```

### Disable an agent

```sql
UPDATE agents SET status = 'stopped', auto_start = 0 WHERE id = '<agent_id>';
```

Then restart the orchestrator (or kill the agent's polling process).

### Re-enable an agent

```sql
UPDATE agents SET status = 'config-only', auto_start = 1 WHERE id = '<agent_id>';
```

Restart the orchestrator.

### Delete an agent

```bash
# 1. Disable first (above)
# 2. Remove the folder
rm -rf agents/<agent_id>
# 3. Remove the row
sqlite3 store/claudeclaw.db "DELETE FROM agents WHERE id = '<agent_id>';"
# 4. Remove the .env line for the bot token
# 5. Restart the orchestrator
```

---

## Memory operations

### Pin a memory

```sql
UPDATE memory SET pinned = 1 WHERE id = ?;
```

### Unpin a memory

```sql
UPDATE memory SET pinned = 0 WHERE id = ?;
```

### Manually add a memory

```sql
INSERT INTO memory (agent_id, text, importance, pinned, source_summary, created_at)
VALUES (
  'main',
  'The user prefers writing in plain language without em-dashes or AI clichés.',
  0.9,
  1,
  'Manually pinned: writing style preference.',
  unixepoch()
);
```

### Find memories about a topic

```sql
SELECT id, text, importance, salience, last_used_at
FROM memory
WHERE agent_id = ?
  AND archived_at IS NULL
  AND text MATCH ?  -- FTS5 match
ORDER BY importance DESC, salience DESC
LIMIT 20;
```

### Manually decay old memories

```sql
UPDATE memory
SET archived_at = unixepoch()
WHERE pinned = 0
  AND salience < 0.1
  AND last_used_at < unixepoch() - 60*86400
  AND archived_at IS NULL;
```

---

## Database operations

### Backup

```bash
sqlite3 store/claudeclaw.db ".backup 'backups/claudeclaw_$(date +%Y%m%d_%H%M%S).db'"
```

### Restore

```bash
# Stop the orchestrator first!
cp backups/claudeclaw_<timestamp>.db store/claudeclaw.db
# Restart the orchestrator
```

### Check database size

```bash
ls -lh store/claudeclaw.db
sqlite3 store/claudeclaw.db "SELECT name, COUNT(*) FROM sqlite_master m JOIN pragma_table_list() ON m.name = pragma_table_list.name WHERE m.type = 'table' GROUP BY name ORDER BY COUNT(*) DESC;"
```

### Vacuum (reclaim space after large deletes)

```bash
sqlite3 store/claudeclaw.db "VACUUM;"
```

This rebuilds the database file. Can take a few minutes for large databases. Don't interrupt.

### Check WAL mode

```bash
sqlite3 store/claudeclaw.db "PRAGMA journal_mode;"
# Should output: wal
```

---

## Kill switch operations

### Disable everything

```bash
sed -i.bak 's/_ENABLED=true/_ENABLED=false/g' .env
```

### Enable everything

```bash
sed -i.bak 's/_ENABLED=false/_ENABLED=true/g' .env
```

### Disable just LLM calls

```bash
# Edit .env, set:
# LLM_SPAWN_ENABLED=false
```

### Check current state

```bash
grep "_ENABLED=" .env
```

---

## Audit log operations

### Recent activity (last hour)

```sql
SELECT ts, actor_type, actor_id, action, target
FROM audit_log
WHERE ts > unixepoch() - 3600
ORDER BY ts DESC
LIMIT 100;
```

### Activity by an agent

```sql
SELECT ts, action, target, payload_json
FROM audit_log
WHERE actor_type = 'agent' AND actor_id = ?
ORDER BY ts DESC
LIMIT 50;
```

### Kill switch flips

```sql
SELECT ts, actor_id, target, payload_json
FROM audit_log
WHERE action = 'kill_switch_flip'
ORDER BY ts DESC;
```

### Pull everything from one user turn

```sql
SELECT ts, actor_type, actor_id, action, target, payload_json
FROM audit_log
WHERE correlation_id = ?
ORDER BY ts ASC;
```

### Manual prune (rarely needed; the periodic job handles this)

```sql
DELETE FROM audit_log
WHERE pinned = 0
  AND ts < unixepoch() - 90*86400;
```

---

## Scheduled task operations

### List all scheduled tasks

```sql
SELECT id, agent_id, cron_expression, enabled, last_run_at, next_run_at, prompt
FROM scheduled_tasks
ORDER BY next_run_at ASC;
```

### Disable a task

```sql
UPDATE scheduled_tasks SET enabled = 0 WHERE id = ?;
```

### Manually fire a task (without waiting for cron)

This depends on your orchestrator. Typically:

```bash
# Option 1: trigger via dashboard
# Option 2: invoke via CLI
node scripts/run-scheduled-task.js --id <task_id>
# Option 3: directly invoke the agent with the task's prompt
```

### Add a task

```sql
INSERT INTO scheduled_tasks (agent_id, prompt, cron_expression, enabled, next_run_at, created_at)
VALUES (
  'comms',
  'Triage my inbox and surface anything urgent.',
  '0 7-17/4 * * 1-5',  -- every 4 hours during work hours
  1,
  unixepoch(),  -- fire immediately on next scheduler tick; will recompute after first run
  unixepoch()
);
```

After insert, the scheduler will compute proper `next_run_at` after the first run.

---

## War room operations

### Add an agent to the standup roster (if you have a roster table)

```sql
INSERT INTO warroom_roster (meeting_id, agent_id) VALUES ('main', 'comms');
```

(Schema depends on your implementation. Adjust if your roster lives in a different table.)

### Pull recent transcript

```sql
SELECT created_at, role, agent_id, message_text
FROM warroom_transcript
WHERE meeting_id = 'main'
ORDER BY created_at DESC
LIMIT 50;
```

---

## Common one-liners

### Count messages per agent (last 7 days)

```sql
SELECT agent_id, COUNT(*) as msg_count
FROM conversation_log
WHERE created_at > unixepoch() - 7*86400
GROUP BY agent_id
ORDER BY msg_count DESC;
```

### Average response length per agent

```sql
SELECT agent_id, AVG(LENGTH(message_text)) as avg_length
FROM conversation_log
WHERE role = 'assistant' AND created_at > unixepoch() - 30*86400
GROUP BY agent_id;
```

### Total LLM calls (from audit log) in the last day

```sql
SELECT COUNT(*) FROM audit_log
WHERE action = 'tool_call' AND ts > unixepoch() - 86400;
```

### Largest memories by importance

```sql
SELECT id, agent_id, importance, LENGTH(text) as text_len, text
FROM memory
WHERE archived_at IS NULL
ORDER BY importance DESC
LIMIT 20;
```

---

## Emergency procedures

### "I think an agent is in a runaway loop"

```bash
# 1. Disable LLM calls
echo "LLM_SPAWN_ENABLED=false" >> .env  # or edit existing
# 2. Identify the runaway
sqlite3 store/claudeclaw.db "SELECT actor_id, COUNT(*) FROM audit_log WHERE ts > unixepoch() - 600 GROUP BY actor_id ORDER BY COUNT(*) DESC LIMIT 5;"
# 3. Investigate logs
# 4. When fixed, re-enable
```

### "Database seems corrupted"

```bash
# 1. Check integrity
sqlite3 store/claudeclaw.db "PRAGMA integrity_check;"
# 2. If errors, restore from latest backup
ls -lt backups/  # find the latest
cp backups/claudeclaw_<timestamp>.db store/claudeclaw.db
```

### "Telegram is sending me suspicious messages"

```bash
# 1. Stop the bot polling
# 2. Rotate the bot token via @BotFather (/token)
# 3. Update .env with the new token
# 4. Restart the orchestrator
# 5. Investigate the audit log for the suspicious activity
```
