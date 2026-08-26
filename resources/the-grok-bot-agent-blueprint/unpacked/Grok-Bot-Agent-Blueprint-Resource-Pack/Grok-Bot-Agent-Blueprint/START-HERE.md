# The Grok Bot Agent Blueprint

This pack explains the multi-agent system shown in the video from first principles. It is grounded in a local review of the public Grok Bot 0.18 reconstruction, pinned to commit `a9f633e09d49a85829b8236331b9e21f7e612634` on 25 August 2026.

You do not need the repository or any technical setup to use this guide.

## Fastest path

1. Open `Grok-Bot-Agent-Blueprint.pdf` for the designed visual guide.
2. If you want an AI to study the system, attach `GROK-BOT-AGENT-BLUEPRINT.md` to ChatGPT, Claude, Codex, or another capable assistant.
3. If you want to add these ideas to an existing agent, paste `prompts/EXTEND-YOUR-AGENT-SYSTEM.md` into your coding agent and attach the Markdown guide.
4. Use `BUILD-CHECKLIST.md` to review the design before allowing implementation.
5. Use `EVIDENCE-MAP.md` when you want to see which repository files support each claim.

## What is included

- `Grok-Bot-Agent-Blueprint.pdf`: the polished, visual edition.
- `GROK-BOT-AGENT-BLUEPRINT.md`: the complete AI-readable edition.
- `BUILD-CHECKLIST.md`: a practical architecture and safety checklist.
- `EVIDENCE-MAP.md`: repository paths, line ranges, claim classifications, and corrections.
- `prompts/EXTEND-YOUR-AGENT-SYSTEM.md`: a staged prompt for adding the mechanisms to an existing system.

## Important truth boundary

The reviewed repository describes itself as an unofficial reconstruction of Grok Bot 0.18. It is not Cursor's authenticated original repository, xAI model source, Grok weights, or an official release. The reconstruction also contains additions from its author, including Codex, Claude Code, OpenRouter, and local Docker routing.

This pack contains no recovered repository code, installers, or application binaries. It is commentary, original diagrams, original pseudocode, and a source map for independent study.

## A useful mental model

The model is the worker. The agent record is the employee file. Memory is the notebook. Messages are the mailroom. The scheduler decides who works next. A desktop window is the desk. Permissions are the badge system. The interface is the office lobby where the user sees the work.

Once those layers are separate, the apparent magic becomes a set of understandable engineering decisions.
