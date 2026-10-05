---
name: native-threads
description: Create and run worker threads as native Claude desktop chats (local sessions in the sidebar), each on its own model, then title, group, steer, watch and wait on them with the app's own session tools. Use in the Claude desktop Code tab when the user wants "real chats", "native threads", "threads in the sidebar", or a Codex-style lead that spawns and supervises chats. For fully automatic background threads, use the threads mod's threads_create instead.
---

# Native threads in the Claude desktop app

This mirrors Codex's thread tools with the desktop app's own session tools. It needs the mcp__ccd_session_mgmt__* and mcp__ccd_sidebar__* tools, which only desktop Code sessions have. Load them with ToolSearch first.

## Create (one Enter per chat)

1. For each thread, open a new native chat with its folder and a cheap setup message, one at a time (the app shows one new-chat screen at a time):
   `open "claude://code/new?folder=<url-encoded absolute path>&q=<url-encoded text>"` via Bash (build the URL with python urllib.parse.urlencode). Use `q` = `Thread setup for <title>. Reply with just: ready`.
2. Tell the user, in one line, to press Enter in the new chat. Wait for them, then open the next link.
3. Find the new chat: `list_sessions` (newest first), match on cwd and recency, take its `local_...` id.

## Configure

- `set_session_title` to `Thread | <title>` (or `Thread | <plan> | NN <phase>` for plan phases).
- `set_session_model` with an id from the picker (the tool lists valid ids on error, e.g. `claude-haiku-4-5-20251001`, `claude-sonnet-5-5`, `claude-opus-5-5`), and `set_session_effort` if needed. Both apply from the chat's next turn, which is why the setup message comes first.
- `create_group` once (reuse an existing group from `list_groups`, e.g. `Threads` or `<plan> Build`) and `move_sessions` the new chats into it.

## Run, watch, steer, wait

- Give the task with `send_message` (it starts a turn in that chat). Include the role, the folder, the exact deliverable, and for plan phases the exact handoff path to read first and the handoff path to write at the end.
- Watch with `list_events` (limit 10 to 20). For a wait, poll `get_session` until `isRunning` is false, at most every 10 seconds, with an overall timeout.
- Steer with `send_message` (it arrives as a message from this chat, even mid-task).
- Sequential plans: when a phase finishes, check its handoff file and acceptance check, then create the next phase's chat and send it the handoff path. Keep at most 3 chats working at once.

## Limits

- The Enter press per chat is required: the new-chat link fills in the message but nothing sends it, and Claude must not script keystrokes into the Claude window.
- Scheduled task "Run now" chats can't be steered or grouped. Don't use them as threads.
- `open_session_in` only works on chats this session started with start_session, which is gated off on this account; tell the user to click the chat in the sidebar instead.
