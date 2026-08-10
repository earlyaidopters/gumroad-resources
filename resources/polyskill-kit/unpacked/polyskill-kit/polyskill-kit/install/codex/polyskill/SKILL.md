---
name: polyskill
description: >-
  Use when the user wants to package a skill so it runs in both Claude Code and Codex from one source, import an existing skill into the portable format, install to Claude or Codex, or troubleshoot
  cross-runtime drift.
metadata:
  short-description: Cross-runtime Agent Skill optimizer
---

# polyskill — Cross-Runtime Skill Optimizer

You are operating the **polyskill** CLI on behalf of the user. Polyskill packages an Agent Skill once and emits runtime-optimized variants for Claude Code, OpenAI Codex, and any future runtime that implements the Agent Skills open standard.

## When this skill should run

Activate when the user asks any of:

- "Package my skill for Codex" / "Package my skill for Claude Code"
- "Make this skill work in both"
- "Import this Codex skill into Claude Code"
- "Build a cross-runtime version of `<skill>`"
- "Install this skill in both runtimes"
- "Why does this skill behave differently in Codex vs Claude Code?"

Do NOT activate for vanilla skill authoring (writing a new SKILL.md from scratch). Polyskill is for skills that need to live in two or more runtimes.

## What polyskill is, in one paragraph

Polyskill has three concepts: a **portable definition** (`definition.md`, a single file with YAML frontmatter and a markdown body), a **target adapter** for each runtime (Claude Code, Codex, more soon), and the **CLI** that parses any runtime's skill files into the portable format and emits from the portable format into any runtime. Round-trips are lossless for the spec core (`name`, `description`, body, `scripts/`/`references/`/`assets/`) and lossy-with-warnings for runtime extensions (Claude Code's dynamic injection, Codex's `openai.yaml` sidecar, etc.).

## The five operations

### 1. Bootstrap a new portable skill

```bash
polyskill init <skill-name>
```

Creates a directory `<skill-name>/` containing `polyskill.yaml` (target config) and `definition.md` (the portable source). Edit the body and frontmatter of `definition.md`, then run `polyskill build`.

### 2. Import an existing runtime-specific skill

```bash
polyskill import <path-to-skill> --from claude
polyskill import <path-to-skill> --from codex
```

Parses a runtime's skill files into the portable format. Output goes to a new directory named after the skill, containing `polyskill.yaml` and `definition.md`. Cross-runtime extensions get preserved when possible and warned about when they can't survive.

### 3. Build for all configured runtimes

```bash
polyskill build                # all targets
polyskill build --target claude
polyskill build --target codex
polyskill build --force        # overwrite drifted target files
```

Writes runtime-optimized output to `dist/<adapter>/<skill-name>/`. Use `--force` if a target file was hand-edited since the last build.

### 4. Install into the runtime's well-known directory

```bash
polyskill install                # builds + copies to all targets
polyskill install --target codex # one target only
polyskill install --skip-build   # copy existing dist output without rebuilding
```

By default, copies to:
- Claude Code: `~/.claude/skills/<name>/`
- OpenAI Codex: `~/.agents/skills/<name>/`

Override per target by setting `install:` in `polyskill.yaml`.

### 5. Inspect, validate, reconcile

```bash
polyskill status      # which targets are in sync with the last build
polyskill validate    # lint the definition against each target's rules
polyskill reconcile   # explain how to resolve drifted target files
polyskill adapters    # list installed runtime adapters
```

## Typical end-to-end flows

### Cross-runtime an existing Claude Code skill

```bash
polyskill import ~/.claude/skills/<name> --from claude
cd <name>
polyskill install
```

The skill now lives in both `~/.claude/skills/<name>/` and `~/.agents/skills/<name>/`. The Codex version has its description front-loaded for the 8K catalog cap, dynamic injections (`` !`shell` ``) rewritten as fallback prose, MCP dependencies hoisted into `agents/openai.yaml`, and any `allowed-tools` patterns surfaced as sandbox guidance.

### Cross-runtime an existing Codex skill

```bash
polyskill import ~/.agents/skills/<name> --from codex
cd <name>
polyskill install
```

The Claude Code version gets the MCP dependencies noted in the body (Claude doesn't read them from frontmatter), bash patterns lifted into the `allowed-tools` frontmatter where possible, and the full description restored.

### Author a brand new skill that targets both

```bash
polyskill init my-skill
cd my-skill
# edit definition.md
polyskill install
```

## How to drive this skill when activated

1. **Find or confirm the source.** If the user pointed at a path, use it. If not, ask which existing skill they want to cross-runtime, or whether they're starting from scratch.
2. **Pick the operation.** Map the user's intent to one of the five operations above.
3. **Run the command from the right directory.** `import` runs in any directory and creates a workspace. `build`, `install`, `status`, `validate`, `reconcile` all run from inside a polyskill workspace.
4. **Surface warnings honestly.** Polyskill emits warnings for primitives that don't translate cleanly (e.g. dynamic injections for Codex, MCP for Claude). Pass those through to the user.
5. **Confirm install destinations before overwriting.** If `polyskill install` would overwrite an existing skill at `~/.claude/skills/<name>/` or `~/.agents/skills/<name>/`, confirm first unless the user explicitly said "force" or "overwrite."

## What polyskill will NOT do

- It will not write the skill content for the user. The user owns `definition.md`. Polyskill optimizes presentation per runtime; it does not invent behavior.
- It will not auto-publish skills to GitHub, npm, or any marketplace. Distribution is separate.
- It will not modify `~/.claude/settings.json`, `~/.codex/config.toml`, or any runtime configuration. Only the skill directory contents.

## Refresh after install

Both runtimes pick up new skills without a full restart:

- **Claude Code:** live-reloads skill files mid-session.
- **OpenAI Codex (desktop):** click the refresh button in the Plugins → Skills tab.

## Adding a new runtime adapter

When the user asks about adding support for Gemini CLI, Cursor, Copilot, or another runtime: that's a one-file change in the polyskill repo. Point them at `src/adapters/codex.ts` as a worked example of the `Adapter` interface.

## Source and issues

Polyskill is open source at https://github.com/earlyaidopters/polyskill (or wherever the user has the repo locally). For full architecture and adapter SDK, see the repo README.

## Sandbox guidance

This skill may need to run the following commands. If the Codex sandbox blocks them, rerun with `sandbox_permissions=require_escalated`:

- `polyskill:*` — drive the polyskill CLI
- `node:*` — invoke the polyskill CLI if not globally linked
