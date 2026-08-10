---
name: vault-setup
description: Interactive Obsidian vault configurator. Asks the user to describe themselves in free text, then builds a personalized vault structure, CLAUDE.md, and slash commands directly in the current directory.
---

# Vault Setup — Obsidian Configurator

Run from INSIDE the folder you want to become your Obsidian vault.

## STEP 1 — One question, free text

Display this message exactly, then wait for their response:

---

**Tell me about yourself in a few sentences so I can build your vault.**

Answer these in whatever order feels natural:

- What do you do for work?
- What falls through the cracks most — what do you wish you tracked better?
- Work only, or personal life too?
- Do you have existing files to import? (PDFs, docs, slides)

No need to be formal. A few sentences is enough.

---

## STEP 2 — Infer and preview, don't ask more questions

From their free-text answer, infer:
- Their role (business owner / developer / consultant / creator / student)
- Their primary pain point
- Scope (work only / work + personal / full life OS)
- Whether they have existing files

Then show a vault preview. Do NOT ask clarifying questions. Make smart inferences.

```
Here's your vault — ready to build when you are.

📁 [current directory name]
├── inbox/          Drop zone — everything new lands here first
├── daily/          Daily brain dumps and quick captures
├── [folder]/       [purpose based on their role]
├── [folder]/       [purpose based on their role]
├── [folder]/       [purpose based on their role]
├── projects/       Active work with status and next actions
└── archive/        Completed work — never deleted, just moved

Slash commands:
  /daily    — start your day with vault context
  /tldr     — save any session to the right folder
  /[role]   — [role-specific one-liner]

Type "build it" to create this, or tell me what to change.
```

Wait for confirmation before building anything.

## STEP 3 — Build after confirmation

Once they say "build it", "yes", "go", "looks good", or similar:

### Create folders
```bash
mkdir -p inbox daily [role folders] projects archive scripts \
  .claude/skills/daily .claude/skills/tldr .claude/skills/[role-command]
```

Role folder sets:
- Business Owner → `people/ operations/ decisions/`
- Developer → `research/ clients/`
- Consultant → `clients/ research/`
- Creator → `content/ research/ clients/`
- Student → `notes/ research/`

If personal scope → also `personal/`

### Open in Obsidian
```bash
open -a Obsidian "$(pwd)"
```

### Write CLAUDE.md
Write directly to `CLAUDE.md` in the current directory:

```markdown
# CLAUDE.md — [inferred role]'s Second Brain

## Who I Am
[2-3 sentences based on what they told you — specific, personal, written in first person as Claude describing its owner]

## My Vault Structure
[folder tree with one-line purpose per folder]

## How I Work
[3-4 bullet points inferred from their answers — capture style, main pain point, scope, what they want from AI]

## Context Rules
When I mention a decision → check [decisions or relevant folder] first
When I mention a person/client/project → look in [relevant folder]
When I ask you to write → read recent daily/ notes to match my voice
When something lands in inbox/ → ask if I want it sorted now
```

### Write skill files

**`.claude/skills/daily/SKILL.md`:**
Read today's daily note or create one. Check inbox/ for unprocessed files. Surface top 3 priorities. Ask: "What are we working on today?"

**`.claude/skills/tldr/SKILL.md`:**
Summarize this conversation: decisions, things to remember, next actions. Save to the most relevant folder. Update memory.md.

**Role-specific skill:**
- Business Owner → `.claude/skills/standup/SKILL.md` — briefing across projects, decisions, people
- Developer → `.claude/skills/project/SKILL.md` — load a project's full context
- Consultant → `.claude/skills/client/SKILL.md` — load a client's full context
- Creator → `.claude/skills/content/SKILL.md` — read content folder, calibrate voice, develop idea
- Student → `.claude/skills/research/SKILL.md` — pull all notes on a topic, synthesize

### Write memory.md
```markdown
# Memory

## Session Log
[Updated by Claude Code after each session]

## My Preferences
[Added as Claude learns them]
```

## STEP 4 — Context injection question

After building, ask:

```
One last thing — how do you want your vault context loaded into Claude Code?

1. Global (recommended) — adds one line to ~/.claude/CLAUDE.md so your vault 
   context loads automatically in every Claude Code session on this machine
2. Manual — I'll give you the line to paste into specific projects when you need it
3. Vault only — works automatically when you run claude from inside this folder
```

**If global:** Append to `~/.claude/CLAUDE.md` (create if needed):
```
## My Personal Context
At the start of every session, read [absolute vault path]/CLAUDE.md for context about who I am, my work, and my conventions.
```

## STEP 5 — Final output

```
Done. Your vault is live in Obsidian.

One manual step left:
  Obsidian → Settings → General → Enable Command Line Interface

Your slash commands:
  /daily    — run this tomorrow morning
  /tldr     — run this at the end of any session
  /[role]   — [one liner]

Have files to import?
  python scripts/process_docs_to_obsidian.py ~/your-files inbox/
  Then: "Sort everything in inbox/ into the right folders"
```
