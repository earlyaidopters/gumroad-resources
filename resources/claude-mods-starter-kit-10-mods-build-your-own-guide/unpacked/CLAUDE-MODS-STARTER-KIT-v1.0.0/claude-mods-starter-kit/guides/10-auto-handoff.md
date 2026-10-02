# 10 · Auto Handoff

Leave the next chat a useful starting point.

## What it does
Writes a summary of progress, decisions and next steps into the project so a fresh conversation can continue with that summary.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install auto-handoff@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install auto-handoff@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh auto-handoff
```

## Use it in Claude Code chat
After a short task, run /autohandoff now. Read the generated handoff before trusting it. In a fresh session in the same folder, ask Claude to read handoff/LATEST.md.

```text
/autohandoff
/autohandoff now
/autohandoff threshold 85
/autohandoff resume
/autohandoff off
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Read handoff/LATEST.md, follow its link to the handoff file, and summarize the next step. Do not change anything until I choose a task.
```

### Can I use plain English?
The save controls use /autohandoff. Reading the handoff in the next chat is a normal prompt.

## Turn it off
/autohandoff off Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable auto-handoff@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
Summaries can miss details and use an extra model call. The default automatic threshold is 85%. Files remain in your project after disabling; review them before sharing. It does not automatically create a new chat.

## Create your own version
Copy [the full creation prompt](../prompts/10-auto-handoff.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/auto-handoff/hooks/auto-handoff.mjs) · [Tests](../plugins/auto-handoff/tests/auto-handoff.test.ts)
