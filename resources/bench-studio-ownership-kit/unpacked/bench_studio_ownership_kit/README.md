# Bench Studio Ownership Kit, Quick Start

This is the companion package for the "Build Your Own Higgsfield" video. It is free, no email gate.

## What's in this folder

- `how_i_built_bench_studio.pdf`, the build guide. Read this first.
- `bench_studio_technical_reference.pdf`, the technical reference PDF. Built so you can hand it directly to your coding agent (Claude Code, Codex, Cursor, ChatGPT) and have it wire the whole thing up for you: architecture, every environment variable, the full MCP tool contract, model routing, the cost ledger, a copy-paste setup prompt, and troubleshooting.
- `generate_skill/`, the `generate` Claude Code skill (SKILL.md + scripts). Drop this into `~/.claude/skills/generate/`.
- `mcp_connector_setup.txt`, a short version of the MCP wiring steps. For the full technical detail, use `bench_studio_technical_reference.pdf`.
- `community_teaser.md`, where to go for the live build sessions.

## Get Bench Studio itself

Bench Studio (the visual studio app) already lives in its own public repo. Clone it:

```bash
git clone https://github.com/promptadvisers/bench-studio-public.git
cd bench-studio-public
npm install
```

Add to `~/.env`:

```
FAL_KEY=<your-fal-key>
GOOGLE_API_KEY=<your-optional-google-key>
```

Then:

```bash
npm run dev
```

Studio runs at `http://localhost:5200`, API at `http://localhost:8787`.

## Get the generate skill

```bash
cp -r generate_skill ~/.claude/skills/generate
```

Add to `~/.env`:

```
GOOGLE_API_KEY=...    # images + Veo video
OPENAI_API_KEY=...    # gpt-image
FAL_KEY=...            # optional, unlocks Wan / Hailuo / Kling / Seedance
```

Install the Python deps once:

```bash
pip install google-genai openai requests
```

Then in Claude Code, just say "generate a cinematic product shot of X" and it routes, refines, generates, and logs the cost.

## Connect it over MCP

See `mcp_connector_setup.txt` for the short version, or `bench_studio_technical_reference.pdf` for the complete technical reference (architecture, every credential, the full MCP tool contract, model routing, cost ledger, a copy-paste setup prompt for your coding agent, and troubleshooting).

## Not free forever, but free right now

You pay the raw provider prices per generation (fal.ai, Google, OpenAI, MiniMax, Kling, or Qwen depending on which lane you use). There is no subscription, no credit system, and no markup layer added by this kit.
