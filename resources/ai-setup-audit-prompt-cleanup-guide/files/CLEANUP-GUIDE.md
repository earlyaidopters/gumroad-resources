# Cleanup guide (for your AI)

Give this file to Claude, Codex or any coding assistant together with your audit report. Say "Use this guide to decide what to clean, retire and add in my setup." The rest of this file is written to the AI.

---

## Your job

You are reviewing my AI setup. That means every instruction file (CLAUDE.md, AGENTS.md, GEMINI.md, rules folders), skills, memory files, plugins, connected tools (MCP servers), hooks, scheduled tasks, and the project folders I run as their own systems.

The goal is a setup that is smaller, consistent and easy to keep clean. That means
- less that loads into every session,
- no rules that contradict each other,
- one source of truth that every tool I use reads,
- nothing kept "just in case".

You propose. I approve. Do not change, move or delete anything until I say yes to that exact item.

## Ground rules

1. **Evidence or it does not go in.** Every recommendation cites a file path, a line number, a count from my conversation history, or the date something was last used. No general advice.
2. **Never delete.** Retiring means moving the item into an archive folder outside my working folders, such as `~/ai-archive/2026-10-17/`, with a note saying where it came from. Outside the working folder matters, because agents searching my project will not trip over old copies.
3. **Back up before every approved change,** and give me the one-line undo for it.
4. **One behavior change at a time.** After a change that alters how you behave, I test it on a real task before we make the next one.
5. **Secrets stay secret.** If you find a key or token in plain text, tell me which file and line. Never print the value, and keep it out of your own commands too (print variable names only).
6. **Conflicts are my call.** When two rules disagree, show me both with their paths and lines and ask which one wins. Do not pick for me.

## The three questions

Ask these about everything that loads in every session, and about anything new I want to add.

**1. Is it needed on most tasks?** Would I do my work worse today without it?
- If yes, keep it global, and trim it to the lines that matter.
- If no, then before keeping a whole skill, plugin or repo, ask whether you can **emulate** it. Read it once, find the one instruction that makes the difference, and add that single line where it belongs. Very often a big skill boils down to one line.
- Sometimes I do not need to install it at all. I can point you at it for one job with "Go and refer to this repo for this specific task."

**2. Is it only useful sometimes?** Then **scope** it. Load it on demand instead of globally, as a skill, a rule that only loads for certain files, an instruction file inside the one subfolder that needs it, or a reference file I name when I need it.

**3. Is it maintained?** Things that have not been used in months, mention models, paths or tools that no longer exist, or contradict another file get fixed or retired. This is why the cleanup runs on a schedule (see `SCHEDULED-CLEANUP-PROMPT.md`), not once.

Label every item with one of these.

| Label | Meaning |
| --- | --- |
| KEEP | Needed on most tasks. Stays global, trimmed. |
| SCOPE | Useful sometimes. Moves to load on demand. |
| EMULATE | Replace the whole thing with the one line that matters. |
| MERGE | Duplicate or near duplicate of something else. Keep one. |
| FIX | Outdated, wrong, or conflicts with another file. |
| RETIRE | Not used, not needed. Move to the archive. |
| ADD | Missing. I keep correcting you about it, or a tool has it and the other does not. |

## What to check

1. **What loads every session.** List each file that loads at the start of a session, per tool, with its line count and size. These facts were checked on 17 October 2026 (check the current docs if they matter).
   - Claude Code reads CLAUDE.md files at launch. Anthropic's guidance is under 200 lines per CLAUDE.md. Splitting with `@imports` does not save anything, because imported files also load at launch. Rules in `.claude/rules/` load every session unless they are scoped to file paths. Skills load only when used. Auto memory loads the first 200 lines or 25 KB of `MEMORY.md`. Running `/context` in Claude Code shows what loaded.
   - Codex reads `~/.codex/AGENTS.md` (or `AGENTS.override.md`) and then the AGENTS.md files from the project root down to the current folder. It stops at 32 KiB combined by default (`project_doc_max_bytes`), and anything past that is cut off without a warning.
2. **Drift between tools.** Rules that live in one tool's files and not the other, or that say different things in each (formatting, git rules, tone, tool choices). Name both files and both lines.
3. **Duplicates.** Skills or rules with versions side by side (`writing-v1`, `writing-v2`, `writing-final`), the same rule written in three places.
4. **Dead references.** Model names, file paths, folders, commands or tools that no longer exist.
5. **Junk.** Operating system junk files inside instruction folders (macOS `._` files, `.DS_Store`), empty files, backups left inside working folders, and files from other clients or projects that this folder can reach.
6. **Unused.** Skills, plugins, MCP servers, hooks and commands with no use in the last 90 days, counted from conversation history, not guessed.
7. **Missing.** Any correction I gave you three or more times is a missing rule. Anything set up in one tool but not the other.
8. **Maintenance.** Whether a scheduled cleanup exists. If not, propose one.

## One source of truth for every tool

When I use more than one assistant, shared rules belong in one file that all of them read.

- **Codex** reads `AGENTS.md`.
- **Claude Code** reads `AGENTS.md` by itself when there is no `CLAUDE.md` or `CLAUDE.local.md` in the folder or above it (Claude Code v2.1.277 or later). When a `CLAUDE.md` exists, put `@AGENTS.md` at its top and keep only Claude-specific lines below the import.
- **Gemini CLI** reads `GEMINI.md` by default. Add `AGENTS.md` to `context.fileName` in its `settings.json` and it reads that too.

Shared rules go in `AGENTS.md` once. Tool-specific lines stay in that tool's file. Nothing is written twice.

## Why small drift matters

A plane that leaves New York one degree off course does not land in Glasgow. One outdated line, one rule that contradicts another, one new skill that half overlaps an old one. Each is small, and together they pull every session off course. Treat a small conflict as a real finding.

## When I want to add something new

Before installing a new skill, repo, plugin or rule, answer these in order.
1. Would most of my tasks be worse without it? If not, do not install it globally.
2. Can you emulate it? Extract the one instruction and add only that.
3. Can I just reference it for one task instead of installing it?
4. If it is added, where does it load (global or scoped), what does it replace, and when do we review it?

## How to report

Give me a table first.

| Item | Where (path and line) | Evidence | Label | Proposed change | Undo | Risk |

Then the first change to make today, with its backup and undo step. Then stop and wait for my answer.
