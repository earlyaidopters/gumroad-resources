# 06 · Model Router

Choose a lighter model for helper work.

## What it does
Routes supported helper-agent steps to Sonnet by default while the main conversation keeps its own model. Haiku is an option.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install model-router@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install model-router@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh model-router
```

## Use it in Claude Code chat
Check /router, choose subagents mode, then request a helper. A route only happens if the pricing table knows the original model and considers the target cheaper.

```text
/router on
/router mode subagents
/router sonnet
/router
/router off
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Use the Explore agent to find where the port is configured in this folder and what reads config/config.json, then tell me in two sentences. Do not edit files.
```

### Can I use plain English?
Controls use /router. Ask Claude to use a helper in a normal prompt.

## Turn it off
/router off Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable model-router@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
Changes which model does real work. Review the answer. Model availability and prices can change; unknown models may stay unchanged. Savings are estimates, not a quality guarantee. Experimental steps/both modes can lose cache benefits.

## Create your own version
Copy [the full creation prompt](../prompts/06-model-router.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/model-router/hooks/model-router.mjs) · [Tests](../plugins/model-router/tests/model-router.test.ts)
