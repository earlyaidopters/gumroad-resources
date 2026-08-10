---
name: extract-mindset
description: Mine your own Claude Code conversation logs to extract one model's reasoning discipline and port it to the model you run now. Use when someone wants to capture how a model like Fable 5 or Opus thinks, measure its working habits from real session logs, or turn that into a Mindset.md operating manual another model can adopt. Triggers include "extract the mindset", "study how Fable thinks", "port the discipline", "measure my model's habits", "what made that model good", "build a mindset file from my logs".
---

# Extract Mindset

You cannot clone a model's raw capability. When a model gets suspended or you
switch off it, the weights are gone. But the model left a paper trail in your own
Claude Code logs, and that trail holds something portable. Not the talent, the
DISCIPLINE. How it reasoned before acting. How it re-read results before deciding.
How it grounded before it touched anything. That discipline can be measured from
the logs and written down as an operating manual the model you run now can adopt.

This skill does that end to end. It builds a corpus of one model's turns from your
history, measures its habits against a baseline model so you have evidence and not
vibes, then has the current model read that corpus and write a Mindset.md you point
sessions at. It works for ANY model id on your disk, not just Fable.

The three scripts that do the work live in `scripts/` next to this file. The blank
manual to fill in lives in `references/mindset_template.md`.

---

## Step 0. Ask one thing first, full walkthrough or fast track

Before anything else, ask the person one question and wait.

> "Do you want the full walkthrough where I explain each step as we go, or the
> fast track where I just build the corpus, measure the habits, and hand you the
> Mindset.md."

On fast track, run Steps 2 through 5 back to back with short status lines and skip
the teaching asides. On full walkthrough, pause after each step, show what came
back, and explain it in one or two plain sentences before moving on. Either way the
work is identical. The only difference is how much you narrate.

---

## Step 1. Pick the model to study

Teach before asking. Say this in your own words.

Every assistant turn in a Claude Code session records which model produced it,
under `message.model`. So your whole history can be filtered down to just the turns
one model ever generated. That is the corpus you will study.

Offer to list every model id that actually exists on disk so the person picks from
real options instead of guessing. Run this and show the result.

```bash
grep -rho '"model":"[^"]*"' ~/.claude/projects/ 2>/dev/null \
  | sort | uniq -c | sort -rn | head -20
```

Then ask which model to study and which to use as the baseline to compare against.
Good defaults to suggest, the model you most want to capture as the TARGET (for
example `claude-fable-5`), and the model you run day to day as the BASELINE (for
example `claude-opus-4-8`). The baseline is the floor you are trying to lift, so it
should be the model that will actually adopt the Mindset.md. Confirm both ids
against the list before continuing. Do not author ids the person did not pick.

---

## Step 2. Build the corpus

Run the corpus extractor for the target model. It finds every session that
contains that model, strips each one down to its reasoning trace, and keeps only
the target's assistant turns.

```bash
bash scripts/extract_model_corpus.sh <target-model-id> > /tmp/<target>_corpus.jsonl
wc -l /tmp/<target>_corpus.jsonl
```

How it works, in plain terms. A session file is mostly bloat, the tool output that
gets echoed back into context. `debloat_jsonl.py` throws that echo away and keeps
the thinking, the text, and the tool names. The shell script runs that debloat over
every session that mentions the model, then filters to just that model's turns.

On full walkthrough, optionally show the collapse live on one chosen session so the
person sees how much bloat there was.

```bash
SESSION=$(grep -rl '"model":"<target-model-id>"' ~/.claude/projects/ 2>/dev/null | head -1)
python3 scripts/debloat_jsonl.py "$SESSION" > /tmp/slim.jsonl
ls -lh "$SESSION" /tmp/slim.jsonl
```

A real 32 MB session collapses to about 1.1 MB, roughly ten to one. That is the
signal hiding under the echo.

---

## Step 3. Measure the habits, do not guess them

This is the step that makes the manual honest. Run the metrics engine for the
target against the baseline.

```bash
python3 scripts/analyze_discipline.py <target-model-id> <baseline-model-id>
```

It scans the raw session files, not the debloated trace, because some signals like
tool errors only live in the records debloat throws away. For each model it computes
how often that model practiced each good habit, and prints a markdown table.

The habits it measures, with the plain-English meaning of each.

- turns containing reasoning, how often the model thought at all on a turn.
- reasons before the first action, how often it thought before its first tool call.
- re-evaluates after a result, how often it thought again right after a result came
  back, the observe-then-decide loop.
- reads the file before editing, how often a Read came before the first edit.
- runs a check after editing, how often any command ran after an edit.
- runs the real test after editing, how often that command was an actual test,
  build, lint, or typecheck, not a throwaway ls or echo.
- tool error rate, the fraction of this model's tool calls that failed.

Read the table out loud with the person. The point is the GAP between the two
columns, where the target is more disciplined than the baseline, and where both are
weak. The weak-in-both rows are the ones to be better than the source on, not just
equal to. Tell the person plainly that the absolute percentages move with how much
history they have on disk, so the comparison is the signal, not the raw numbers.

Save the table, you will paste it into the manual's appendix.

---

## Step 4. Write the Mindset.md

Now feed the current model two things, the corpus from Step 2 and the measured
numbers from Step 3, and have it write the operating manual.

Open `references/mindset_template.md` and use it as the exact shape to fill in. It
already has the seven sections and the decision-loop diagram. Your job is to
characterize the target model's discipline along these fixed dimensions, each
backed by what you saw in the corpus and the number you measured.

- decomposition, how it breaks large work into phases.
- sequencing, the order it does things in, recon before mutation.
- verification, whether and how it checks its own edits.
- restraint, whether it matches effort to the task instead of over-engineering.
- error recovery, how it responds when a tool call fails.
- scope before acting, whether it grounds in real state before touching anything.

Rules for writing it.

- Distill from the corpus, do not invent. Every principle should trace to behavior
  you actually observed. Where you can, pull a real one-line example from the trace.
- Where the target is weak, say so and instruct the reader to exceed it. The manual
  is meant to be better than the source where the source falls short, for example on
  running the real test after editing.
- Paste the measured table from Step 3 into the appendix verbatim, and fill the
  {MODEL} and {N} placeholders with the real model id and beat count.
- Keep it a disposition, not a checklist. It is how to BE for the whole session.

Write the result to a file named for the model, for example `Fable_Mindset.md`.

---

## Step 5. Offer to wire it in

The manual shapes disposition, which is best effort. Pair it with the mechanical
levers the harness actually enforces. Offer all three and let the person pick.

**Where the file belongs.** It goes in a `CLAUDE.md`, which loads every session.
Not auto memory, whose recall is relevance gated and may not surface a behavior
rule on a given turn. Not an output style, which is for tone and role, not agentic
discipline. Offer to drop the manual into the project `CLAUDE.md`, or to reference
it from there so it loads each session.

**Effort.** Tell the person to set the effort level high on the model that will
adopt the manual, since reasoning density is governed by effort, not a token
budget. `effortLevel` to `xhigh` or `max` in settings, or `/effort max` for one
session, with `alwaysThinkingEnabled` on. Note that the old MAX_THINKING_TOKENS env
var does nothing on adaptive thinking models.

**The test hook.** The weakest habit in almost every measurement is running the
real test after an edit. A hook fixes that mechanically. Offer to wire a PostToolUse
hook matched on `Edit|Write|MultiEdit` that runs the project's test command, so it
fires whether or not the model remembers. If the person wants it, either add it to
settings yourself or hand off the wiring as a copy-paste prompt like this.

> "Add a PostToolUse hook to my Claude Code settings that matches the tool names
> Edit, Write, and MultiEdit and runs my project test command, which is <COMMAND>.
> Make sure hooksEnabled is true. Show me the exact settings.json change before you
> apply it."

Confirm the project's real test command with the person first, do not author one.

---

## Notes

- Works for any model id found on disk, the scripts take the id as an argument.
- No PIL, no image work, this skill is pure log analysis and text.
- The scripts stream files line by line, so a 32 MB session never loads whole.
- Everything is grounded in the person's own logs. Nothing here is mocked.
