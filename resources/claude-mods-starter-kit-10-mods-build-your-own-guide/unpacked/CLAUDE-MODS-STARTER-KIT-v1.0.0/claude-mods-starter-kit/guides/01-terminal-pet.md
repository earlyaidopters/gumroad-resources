# 01 · Terminal Pet

A little company while Claude works.

## What it does
Adds a pixel crab above the prompt. It reacts when Claude reads, writes, waits, finishes, or hits an error. Its belly reflects conversation fullness.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install terminal-pet@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install terminal-pet@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh terminal-pet
```

## Use it in Claude Code chat
Start with /pet on, then /pet party for an instant preview. Ask Claude to read the demo files to see real activity.

```text
/pet on
/pet name Pixel
/pet party
/pet wake
/pet off
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Read README.md and src/auth/login.ts. Explain what the demo does in two short sentences.
```

### Can I use plain English?
Use the slash commands. This mod does not register a plain-English control tool.

## Turn it off
/pet off Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable terminal-pet@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
A mood is decoration. A nervous pet does not stop a dangerous action. Feed and party are preview controls, not real usage readings.

## Create your own version
Copy [the full creation prompt](../prompts/01-terminal-pet.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/terminal-pet/hooks/terminal-pet.mjs) · [Tests](../plugins/terminal-pet/tests/terminal-pet.test.ts)
