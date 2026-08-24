# AI Assistant Decision Kit

You do not need to install anything to get value from this kit.

## 1. Open the interactive comparison

Use the complete visual map here:

https://ai-assistant-house-map.markkashef.chatgpt.site/

You can also open `website/OPEN-THE-AI-ASSISTANT-MAP.html` from this folder.

The map includes the five featured assistants, architecture cutaways, harness views, a draggable tier board, and a combined capability map.

## 2. Run the researched decision audit

The easiest option is `prompts/PASTE-INTO-ANY-AI.md`. Copy everything in that file into ChatGPT, Claude, Codex, or another capable assistant.

If your AI tool supports skills, install the complete folder:

```text
ai-assistant-system-advisor/
```

Common locations:

- Codex: `~/.codex/skills/ai-assistant-system-advisor/`
- Claude Code: `~/.claude/skills/ai-assistant-system-advisor/`

Then ask:

```text
Use the AI Assistant System Advisor to help me decide which setup fits my real work.
```

The advisor will use the native question interface when your AI supports one. In Claude Code it calls `AskUserQuestion`. In Codex it uses `request_user_input` when available. In ChatGPT or another chat it asks the same questions conversationally and waits for your answers.

It will then research the current products from first-party documentation and canonical repositories, score them against your requirements, separate defaults from achievable ceilings, explain the runner-up and every meaningful rejection, inventory switching costs, and give you both a reversible test and a seven-day pilot.

You can also ask for one of these narrower modes:

- `Audit whether I should leave my current setup for Hermes Agent.`
- `Give me a current harness-level deep dive on OpenClaw.`
- `Compare Claude Cowork and ChatGPT Work for my actual workflows.`
- `Turn my requirements into a model-agnostic DIY assistant blueprint.`

## Important

The goal is not to persuade you to switch. If your current setup already handles the work that matters, `stay put` is a first-class result.

The included dossiers are research-locked to 23 August 2026 and include current repository releases, architecture, execution, memory, tools, orchestration, automation, permissions, maintenance, and migration considerations. Provider features, prices, limits, and availability change quickly, so the advisor verifies current first-party information again whenever browsing is available.
