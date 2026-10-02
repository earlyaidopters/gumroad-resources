# 02 · Coral Skin

Make the work easier to scan.

## What it does
Changes supported Claude Code message and tool rows to a coral, ink and cream style. Colored chips help you spot reads, edits and commands.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install coral-skin@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install coral-skin@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh coral-skin
```

## Use it in Claude Code chat
Run /skin on, then ask Claude to inspect the demo. Run /skin off to compare.

```text
/skin on
/skin risk
/skin off
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Read README.md, inspect src/auth/login.ts, and explain the login flow without editing anything.
```

### Can I use plain English?
Use /skin. Asking for a color in normal chat does not reliably change this mod.

## Turn it off
/skin off Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable coral-skin@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
Risk colors are visual hints, not security checks. This is Coral Skin; the separate Crimson Garden theme shown elsewhere is not bundled.

## Create your own version
Copy [the full creation prompt](../prompts/02-coral-skin.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/coral-skin/hooks/coral-skin.mjs) · [Tests](../plugins/coral-skin/tests/coral-skin.test.ts)
