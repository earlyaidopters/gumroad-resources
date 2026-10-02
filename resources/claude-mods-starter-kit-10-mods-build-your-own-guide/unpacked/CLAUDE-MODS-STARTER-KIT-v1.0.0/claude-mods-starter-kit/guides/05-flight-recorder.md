# 05 · Flight Recorder

See the work unfold on a timeline.

## What it does
Shows turns, tool activity and helper activity over time so you can see when work happened and what ran alongside it.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install flight-recorder@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install flight-recorder@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh flight-recorder
```

## Use it in Claude Code chat
Run /timeline open, then ask for two read-only helper investigations. Helpers appear only if Claude actually starts them.

```text
/timeline open
/timeline turns 5
/timeline clear
/timeline close
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Use two read-only helper agents: one to inspect the login flow, and one to inspect configuration and tests. Wait for both, then give me a short combined summary. Do not edit files.
```

### Can I use plain English?
Use /timeline to open it. Request helper work in plain English.

## Turn it off
/timeline close Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable flight-recorder@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
A timeline is a record of observed events, not proof that parallel work was faster. Cost figures use a static estimate and can differ from billing, including cache-write charges.

## Create your own version
Copy [the full creation prompt](../prompts/05-flight-recorder.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/flight-recorder/hooks/flight-recorder.mjs) · [Tests](../plugins/flight-recorder/tests/flight-recorder.test.ts)
