# 04 · Repo Heatmap

See which files Claude touches.

## What it does
Draws a map of files in the current project. File areas reflect size, and colors react to reads, searches, edits and failed operations.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install repo-heatmap@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install repo-heatmap@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh repo-heatmap
```

## Use it in Claude Code chat
In the demo project, open /heatmap before sending the prompt. Watch files light up while Claude works.

```text
/heatmap open
/heatmap size lines
/heatmap rescan
/heatmap reset
/heatmap close
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Investigate the login flow, from src/ui/LoginForm.tsx through src/auth/login.ts, session.ts and tokens.ts. Read the files and explain how a user gets signed in. Do not edit anything.
```

### Can I use plain English?
Open it with /heatmap. The investigation itself is a normal English prompt.

## Turn it off
/heatmap close Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable repo-heatmap@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
Tracks activity observed during this session. A bright file is not proof of importance or a bug. Some shell activity is inferred and may not map perfectly.

## Create your own version
Copy [the full creation prompt](../prompts/04-repo-heatmap.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/repo-heatmap/hooks/repo-heatmap.mjs) · [Tests](../plugins/repo-heatmap/tests/repo-heatmap.test.ts)
