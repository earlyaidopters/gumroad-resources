# Polyskill Kit

Cross-runtime Agent Skills. Write your skill once. Get an optimized version for Claude Code AND OpenAI Codex.

> **For AI agents reading this file:** This README is designed to be fed directly into Claude Code or OpenAI Codex. If the user asks you to install polyskill from this kit, follow the **AI Agent Quick Reference** section near the top — it has every command and path you need.

---

## AI Agent Quick Reference

If you are an AI agent (Claude Code, Codex, or similar) and the user has handed you this kit, follow these steps. Pick **Path A** if the user wants the fastest install. Pick **Path B** if the user wants to author their own portable skills with the CLI.

### Path A — Drag-and-drop install (no CLI required)

The user wants polyskill installed in both runtimes with zero CLI work.

```bash
# 1. Identify the user's home directory
HOME_DIR="$HOME"   # macOS / Linux. On Windows resolve to $env:USERPROFILE.

# 2. Make sure the destination directories exist
mkdir -p "$HOME_DIR/.claude/skills"
mkdir -p "$HOME_DIR/.agents/skills"

# 3. Copy the pre-built Claude Code version of polyskill
cp -r "<path-to-this-kit>/install/claude_code/polyskill" "$HOME_DIR/.claude/skills/polyskill"

# 4. Copy the pre-built Codex version of polyskill (includes the agents/openai.yaml sidecar)
cp -r "<path-to-this-kit>/install/codex/polyskill" "$HOME_DIR/.agents/skills/polyskill"

# 5. Verify both landed
ls "$HOME_DIR/.claude/skills/polyskill/SKILL.md"
ls "$HOME_DIR/.agents/skills/polyskill/SKILL.md"
ls "$HOME_DIR/.agents/skills/polyskill/agents/openai.yaml"
```

After install:
- **Claude Code** auto-reloads skills. No restart needed.
- **OpenAI Codex desktop app** needs a manual refresh. Tell the user: "Open the Codex desktop app, go to Plugins, click the refresh button at the top right. The polyskill skill will appear in the Skills list."
- **Codex CLI** picks up new skills on next session start.

To verify polyskill is active, tell the user to type one of these in their respective chats:
- Claude Code: `/polyskill what can you do?`
- Codex: `$polyskill what can you do?`

Both should return polyskill's identity description from its body. If neither fires, jump to the **Troubleshooting** section.

### Path B — Source + CLI install (for builders)

The user wants the full polyskill CLI installed so they can author their own portable skills.

```bash
# 1. Clone the public repo
cd "$HOME/Desktop"
git clone https://github.com/earlyaidopters/polyskill
cd polyskill

# 2. Install dependencies and build the CLI
npm install
npm run build
npm link

# 3. Verify the CLI is on PATH
which polyskill
polyskill --version

# 4. Verify both runtimes are detected
polyskill detect

# 5. Install polyskill itself into both runtimes from inside the meta-skill workspace
cd skill
polyskill install
```

Expected output of `polyskill install`:

```
✓ Claude Code     → ~/.claude/skills/polyskill
✓ OpenAI Codex    → ~/.agents/skills/polyskill
```

### Invocation pattern (both runtimes)

After install, the user invokes polyskill with the runtime's slash-command prefix followed by a natural-language instruction:

- **Claude Code:** `/polyskill <natural language instruction>`
- **Codex chat:** `$polyskill <natural language instruction>`

Examples a user might give you:

| User says | What you should do |
|---|---|
| `/polyskill convert my y-compare skill so it works in both Claude Code and Codex` | Run `polyskill import ~/.claude/skills/y-compare --from claude` then `cd y-compare && polyskill build` |
| `/polyskill install y-compare in both runtimes` | From inside the workspace, run `polyskill install` |
| `/polyskill check which runtimes I have installed` | Run `polyskill detect` |

Map any natural-language request the user makes to one of the five CLI operations: `init`, `import`, `build`, `install`, `validate`, `reconcile`, `detect`. The full mapping is in `source/polyskill_meta_skill/definition.md`.

---

## What's in this kit

```
polyskill-kit/
├── README.md                          ← this file
├── install/                           ← Path A: drag-and-drop (no CLI)
│   ├── claude_code/
│   │   └── polyskill/
│   │       └── SKILL.md               ← drop into ~/.claude/skills/polyskill/
│   └── codex/
│       └── polyskill/
│           ├── SKILL.md               ← drop into ~/.agents/skills/polyskill/
│           └── agents/
│               └── openai.yaml        ← Codex sidecar with UI metadata
└── source/                            ← Path B: rebuild / author your own
    ├── polyskill_meta_skill/          ← the polyskill source (rebuild with CLI)
    │   ├── definition.md              ← portable definition, edit this
    │   └── polyskill.yaml             ← build target config
    └── examples/hello-skill/          ← worked authoring example
        ├── definition.md
        ├── polyskill.yaml
        └── dist/                      ← pre-built reference outputs
            ├── claude/hello-skill/SKILL.md
            └── codex/hello-skill/
                ├── SKILL.md
                └── agents/openai.yaml
```

---

## Where these paths actually live on the user's machine

If the user does not know what `~/.claude/skills/` and `~/.agents/skills/` resolve to on their OS:

| OS | `~/.claude/skills/` resolves to | `~/.agents/skills/` resolves to |
|---|---|---|
| macOS | `/Users/<username>/.claude/skills/` | `/Users/<username>/.agents/skills/` |
| Linux | `/home/<username>/.claude/skills/` | `/home/<username>/.agents/skills/` |
| Windows | `C:\Users\<username>\.claude\skills\` | `C:\Users\<username>\.agents\skills\` |

If either directory does not exist yet, create it. Both runtimes scan these locations on startup.

---

## What polyskill solves

A skill written for Claude Code does not behave the same way when you drop it into Codex, and vice versa. The two runtimes share the open Agent Skills standard ([agentskills.io](https://agentskills.io)), but each adds runtime-specific extensions that the other ignores or mishandles.

| What | Claude Code | OpenAI Codex |
|---|---|---|
| Dynamic injection (the backtick-bang syntax that runs a shell command before reading the skill) | Yes | **No equivalent** |
| Description length cap | None (per-skill 1,536 char soft cap on description + when_to_use combined) | Hard catalog cap (~8,000 chars across all installed skills' descriptions) |
| Sidecar config file (`agents/openai.yaml`) for UI metadata + MCP dependencies | **Not read** | Yes, the canonical place |
| `allowed-tools` frontmatter for pre-approving tool calls | Honored | Not honored (varies, per spec it's experimental) |
| Hooks system | Yes (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, etc.) | Yes (added ~April–May 2026, similar event list) |
| Path-scoped rules with `paths:` frontmatter | Yes (`.claude/rules/*.md`) | No direct equivalent |

Polyskill is the universal adapter. You write the skill once in a portable format (a `definition.md` with rich YAML frontmatter and a markdown body). Polyskill compiles that down into the optimal version for each runtime — front-loading descriptions for Codex's catalog cap, rewriting dynamic injection as fallback prose, emitting the `openai.yaml` sidecar where needed, lifting bash patterns into `allowed-tools` for Claude, and so on.

---

## Authoring your own portable skills

Look inside `source/examples/hello-skill/` for a worked example. The pattern:

```
your-skill/
├── definition.md      # YAML frontmatter + markdown body in the portable format
└── polyskill.yaml     # Build target config (which runtimes to emit)
```

Edit `definition.md`. From inside the workspace, run:

```bash
polyskill build      # emits dist/claude/<name>/ and dist/codex/<name>/
polyskill install    # copies into ~/.claude/skills/ and ~/.agents/skills/
polyskill detect     # confirms which runtimes polyskill can see on this machine
polyskill validate   # lints the definition against each target's rules
```

The hello-skill example's `dist/` is included pre-built so you can see what polyskill emits before running anything.

---

## Troubleshooting

| Symptom | Diagnosis | Fix |
|---|---|---|
| `/polyskill` doesn't fire in Claude Code | `~/.claude/skills/polyskill/SKILL.md` is missing or malformed | Re-run Path A step 3, then check the file exists |
| `$polyskill` doesn't fire in Codex | Skill wasn't picked up after install | In the Codex desktop app, open Plugins, click refresh. If still nothing, fully restart Codex. |
| Codex skill appears but `agents/openai.yaml` missing | The sidecar didn't get copied | Re-copy `install/codex/polyskill/agents/openai.yaml` into `~/.agents/skills/polyskill/agents/openai.yaml` |
| `polyskill` command not found in terminal | CLI not on PATH | From the cloned repo: `cd polyskill && npm link`. If that fails: `npm install -g .` |
| `polyskill install` fails with "not a workspace" | You're not inside a folder that has both `definition.md` and `polyskill.yaml` | `cd` into either `source/polyskill_meta_skill/` or your own workspace folder |
| Polyskill skill activates but doesn't run the right CLI command | The skill is invoked but the underlying CLI is missing | Confirm `which polyskill` returns a path. If not, install the CLI via Path B step 2 |

---

## Community

If you want the patterns behind polyskill, regular updates as new runtimes get adapters, and a working group of builders shipping their own cross-runtime tools, make sure to check out the Early AI Dopters community.

https://www.skool.com/earlyaidopters/about

---

## Repo

Source code, full CLI, issue tracker, and adapter contribution guide: https://github.com/earlyaidopters/polyskill

The exact `install/` and `source/` contents in this kit are also committed to that repo so a `git clone` gives you an identical starting point.
