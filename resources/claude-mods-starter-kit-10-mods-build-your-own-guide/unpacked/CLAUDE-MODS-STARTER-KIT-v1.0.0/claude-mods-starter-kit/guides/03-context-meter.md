# 03 · Context Meter

See how full the conversation is.

## What it does
Shows conversation fullness, session cost and available usage-limit readings above the prompt. Think of it as a dashboard gauge.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install context-meter@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install context-meter@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh context-meter
```

## Use it in Claude Code chat
It appears automatically after loading. Send a normal message and wait for a measurement. There is no /context-meter command.

```text
Automatic: no slash command.
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Read README.md and explain this project in plain English.
```

### Can I use plain English?
Automatic. No special prompt is needed.

## Turn it off
Disable the plugin and start a fresh session. Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable context-meter@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
A full conversation is not an intelligence score. Dollars are API-equivalent usage, not a charge against your subscription. Missing usage data may be unavailable, not zero.

## Create your own version
Copy [the full creation prompt](../prompts/03-context-meter.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/context-meter/hooks/context-meter.mjs) · [Tests](../plugins/context-meter/tests/context-meter.test.ts)
