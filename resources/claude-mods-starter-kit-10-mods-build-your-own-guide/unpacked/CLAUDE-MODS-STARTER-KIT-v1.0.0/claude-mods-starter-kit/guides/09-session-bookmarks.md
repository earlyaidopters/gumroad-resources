# 09 · Session Bookmarks

Leave yourself a useful “come back here” note.

## What it does
Saves a title and a short note with the project and session reference, so you can find the conversation again.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install session-bookmarks@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install session-bookmarks@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh session-bookmarks
```

## Use it in Claude Code chat
Run /bm save Login walkthrough; next run /bm list. Use /bm resume 1 and paste the copied command into a new terminal.

```text
/bm save Login walkthrough
/bm list
/bm find login
/bm open
/bm resume 1
/bm close
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Bookmark this session as “Login walkthrough” with the note “Read the auth files; next step is writing a plain-English overview.”
```

### Can I use plain English?
“Bookmark this session” and “Find my bookmark about login” are supported.

## Turn it off
/bm close Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable session-bookmarks@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
Resume copies a terminal command; it does not switch your current desktop chat. The folder and original transcript must still exist. A blank /bm uses a short model call to suggest a title; an explicit note avoids that call.

## Create your own version
Copy [the full creation prompt](../prompts/09-session-bookmarks.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/session-bookmarks/hooks/session-bookmarks.mjs) · [Tests](../plugins/session-bookmarks/tests/session-bookmarks.test.ts)
