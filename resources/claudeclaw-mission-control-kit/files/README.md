# ClaudeClaw Mission Control Kit 🧠

A snapshot of ClaudeClaw V3 — Mark Kashef's personal AI agentic operating system as of May 2026 — packaged so you can rebuild it from scratch using your own Claude Code subscription. The kit gives you the mega prompt that scaffolds the whole system, plus supplementary blueprints, power packs, agent templates, reference guides, and the visual guide PDF. The Hive Mind is one feature within ClaudeClaw; this kit covers the full system.

> Read `DISCLAIMER.md` before opening anything else. This kit is experimental and provided as a self-serve reverse-engineering aid. You are responsible for reviewing what you run, securing your API keys, managing your API costs, and deciding whether this architecture is right for you.

---

## What's in this kit

This kit gives you everything I could fit into a folder to help you reverse-engineer the Hive Mind. The goal is for someone with no money but plenty of time to build a functionally similar system from scratch using their own Claude Code subscription. The community is for people who want the carbon-copy repo plus direct support, ongoing updates, and a peer group.

| File / Folder | What it is |
|---|---|
| **DISCLAIMER.md** | The terms. Read first. |
| **REBUILD_PROMPT_V3.md** | The hero asset. Paste into a fresh Claude Code session and follow the prompts. It scaffolds ClaudeClaw V3 from scratch — the whole system, including the Hive Mind feature. |
| **CLAUDECLAW_V3_BLUEPRINT.md** | The architectural blueprint of ClaudeClaw V3. What the system is, why it works, the data engineering frame. |
| **5_STEP_JOURNEY.md** | The chaos-to-Hive-Mind journey. Five steps anyone can follow over a weekend. |
| **POWER_PACKS_V3.md** | Modular feature packs. War room, kill switches, audit log, suggestions, journey, Meta CLI pattern. Add or remove individually. |
| **CLAUDECLAW_ASSESSMENT_PROMPT_V3.md** | A diagnostic prompt for people who already have a setup and want to evaluate what to upgrade. |
| **AGENT_TEMPLATES/** | Five starter agent folders (main, comms, content, ops, research) with `agent.yaml` and `CLAUDE.md` templates. |
| **SKILL_TEMPLATES/** | An example skill folder showing the references + scripts + assets pattern. |
| **REFERENCE_GUIDES/** | Topical guides: database schema, war room prompt patterns, memory tiering, Telegram bridge, scheduled tasks, kill switches, audit log. |
| **terminal_prompts.md** | Copy-paste prompts for common setup operations. |
| **ClaudeClaw_V3_Visual_Guide.pdf** | Compiled visual reference, all the diagrams from the V3 video in one document. |
| **community_teaser.md** | Single-sentence community CTA you can paste at the bottom of derivative work. |
| **community_footer.txt** | Longer community pitch for social posts. |

---

## How to use this kit

### Path A — Build it yourself from scratch

1. Read `DISCLAIMER.md`.
2. Read `CLAUDECLAW_V3_BLUEPRINT.md` to get the conceptual frame. Without it, the prompts feel arbitrary.
3. Read `5_STEP_JOURNEY.md` for the high-level "where do I start" answer.
4. Open a fresh Claude Code session in an empty directory. Paste `REBUILD_PROMPT_V3.md` into it. Follow the onboarding flow.
5. When you hit a specific topic that needs depth, jump into the relevant `REFERENCE_GUIDES/` document.
6. When you want to add a feature, look in `POWER_PACKS_V3.md` and paste the relevant pack into Claude Code.

### Path B — Already have a system, want to upgrade

1. Read `DISCLAIMER.md`.
2. Open `CLAUDECLAW_ASSESSMENT_PROMPT_V3.md`. Paste it into a Claude Code session pointed at your existing project. It will audit your setup against the V3 patterns and tell you what's missing.
3. Use `POWER_PACKS_V3.md` to add specific upgrades without rebuilding.

### Path C — You want the carbon-copy repo and direct support

That lives in the community. Link in the description below or at `https://www.skool.com/earlyaidopters/about`. The repo, weekly updates, and access to me and a team of coaches are inside.

---

## The principle

An operating system, when you get to brass tacks, is a data engineering exercise. It is putting the right files in the right place at the right time. Everything else in this kit is decoration on top of that idea. If you internalize that principle, the kit is just a series of reminders.

---

## Need help

- For self-serve troubleshooting: re-read the relevant `REFERENCE_GUIDES/` document and ask Claude Code directly using context from these files.
- For direct support: join the community at `https://www.skool.com/earlyaidopters/about`.
- For everything else: do your own due diligence per the disclaimer.

---

**Status**: experimental. Patterns reflect a personal system as of May 2026. APIs evolve. Patterns may break. Question every assumption before you ship.
