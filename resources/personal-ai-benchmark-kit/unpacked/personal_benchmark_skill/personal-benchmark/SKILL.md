---
name: benchmark
description: Personal model benchmark built from YOUR own Claude Code history. Use when the user says /benchmark, "benchmark this model", "is <model> actually better", "test the new model on my workload", or when Claude Code upgrades to a new default model and they want a verdict grounded in THEIR tasks instead of public benchmarks. First run walks a setup wizard; after that it replays a frozen eval pack headlessly against any model or effort level and produces before/after scorecards.
---

# /benchmark, Your History Is Your Benchmark

Answers "is the new model actually better?" using the user's real workload, not a stranger's website demo. Everything lives in `~/.claude/benchmark/`; scripts in `scripts/`.

## ALWAYS start with the status probe

Run `python3 scripts/status.py --brief 2>/dev/null` before anything else, and make it your ONLY probe call. Never follow it with db.py summary, ls of run dirs, cat of verdict files, or the JSON status: --brief already contains the pack state, categories, latest run + verdict headline, unfinished runs, and upgrade detection. Multiple raw probe dumps look terrible on screen. (Use plain `status.py` JSON only inside the wizard, where you need `history_size` and `engine` fields.)

- Output says `none (first run)` → run the **First-Run Wizard** below.
- `UPGRADE DETECTED` line present → lead with it: "Claude Code updated since your last benchmark, which usually means a new model. Want to test it against <last benchmarked model>?"
- Otherwise → **always ask before doing.** Give a one-breath state summary (pack age, latest verdict headline if any), then ask what they want to do using the question tool, with options built from the state, for example: "Benchmark a model now" / "Refresh my benchmark from recent history" (mention if the pack is >30 days old) / "Show me the last verdict" / plus "Finish the unfinished run" if the brief listed one. Never assume; never dump status and stop. The bare command is a front door, not a report.

## Voice rule for EVERYTHING the user sees (wizard and beyond)

Assume the user is non-technical. Talk like a helpful person, not an engineer. Banned words in user-facing text: JSONL, SQLite, database schema, digest, dedupe, headless, subprocess, API key, clustering, hash, eval pack, archetype, variant, fixture. Say instead: "your conversation history", "a small memory file", "task categories", "your benchmark", "test tasks", "run the tests". Technical terms are fine ONLY if the user uses them first. One question at a time, never a wall of steps, never more than one number per sentence.

## First-Run Wizard (new install, walk them through it)

Conversational, one step at a time. Never dump all steps at once.

1. **The pitch, with their number.** status.py returns `history_size`. Open like: "You've had <n> conversations with Claude Code on this machine. That's the best test of a new model there is: your own real work. Want me to turn it into your personal benchmark? Takes about two minutes." Then one honest sentence, no drama: "To sort your conversations into categories, I send short excerpts of your own past requests to <engine in plain words>, the same kind of AI call you make every day. Nothing else leaves your computer." Plain words for the engine: `gemini` = "Google's fastest small model", `claude` = "Claude's fastest small model, through the subscription you already have, nothing to set up."
2. **Ask permission for the memory file.** "Want me to keep a small memory file on your computer so future benchmarks can say 'better than last time'? It also lets me notice when Claude Code updates you to a new model and offer to test it." Only on yes: `python3 scripts/db.py init`. On no: skip cheerfully; everything still works, runs just aren't remembered across time.
3. **Scan.** `python3 scripts/extract_history.py` (local only, no AI calls). Report it simply: "Read <n> conversations and boiled them down to <m> distinct things you ask for."
4. **Show them themselves.** `python3 scripts/build_eval_pack.py`. Present the category table WITH sub-activities (archetypes.json has `subtasks`): share %, plain category name, sub-activities underneath. Frame it as the payoff: "Here's what you actually use AI for." Give it room; this is the moment people screenshot.
5. **Approve the test tasks.** Show each test task in one line each: what it asks for and what a good answer looks like (checks + rubric, translated to plain words). Ask "look right?" and apply any edits directly to `eval_pack.json`. Quietly drop or rewrite any card that needs private services a test can't reach.
6. **Baseline.** If the memory file exists: `db.py state set last_benchmarked_model <current session model>` and `db.py state set last_cc_version "<cc_version from status.py>"`.
7. **Victory lap.** Close with two sentences, verbatim in spirit: "That's it. You now have a benchmark nobody else on earth has: your own work. Next time a model drops, just tell me: benchmark it." Then stop; do not launch a run unless asked.

## Normal dispatch

- **`/benchmark`** (bare) → exactly the front-door flow at the top of this file: one `--brief` probe, one-breath summary, then ASK what they want to do. Nothing else.
- **`/benchmark mine`** → re-run extract + build (workload drifts; suggest monthly). `BENCHMARK_DAYS` (default 120) and `BENCHMARK_MAX_TASKS` (default 8) env vars tune it. Re-present the archetype breakdown for approval.
- **`/benchmark <model>`**, **`X vs Y`**, or effort matrices ("low vs high effort") → translate to variants, OLD model / LOWER effort FIRST (it's the before-reference):
  `python3 scripts/run_benchmark.py --variants claude-opus-4-8,claude-opus-5`
  `python3 scripts/run_benchmark.py --variants claude-opus-5@low,claude-opus-5@high,claude-fable-5`
  run_benchmark.py prints `LIVE VIEW: <run_dir>/live.html` immediately: `open` that file right away so the user watches the task × model grid fill in while the run goes (launch the runner in the background, then open live.html). This is the on-camera moment; never skip opening it.
  SINGLE-TASK matchups: when the user names one task or category ("on just the email triage task"), pass `--tasks <task-id>` (ids are in the pack; match the closest card). One task with 3 trials runs in minutes, great for quick head-to-heads.
  STABLE VERDICTS: when the user wants a verdict they can defend (filming, publishing, a real switch decision), add `--trials 3`: every cell runs 3 times, each trial pairing is judged independently, and task winners are majority votes with the split disclosed ("unanimous" vs "split 2-1-0"). Costs 3x the run time; say so. Default 1 trial is fine for quick directional checks.
  While the RUN is going (10-20 min, ~3x with --trials 3), background it and let the live view carry the show. SCORING is different: it takes 2-3 minutes (parallel, quiet), so run score.py in the FOREGROUND and never tail raw logs onto the screen; say "judging now, about two minutes" and let it finish.
  Then ALWAYS the full chain, no stopping early: `python3 scripts/score.py` (blind judging + At-a-glance table) → `python3 scripts/verdict.py` (the TLDR: Claude reads the scorecard via `claude -p` and writes headline, bottom line, behavior bullets, per-category winners, recommendation, caveat, prepended to scorecard.md + verdict.json) → `python3 scripts/report.py` (report.html with the TLDR as hero block, plus share.html, a 16:9 big-type verdict card for screen recording) → `open` the report.html. The deliverable is the verdict, not raw tables; when summarizing in chat, lead with verdict.json's headline and recommendation. Runs bill the Claude subscription via `claude -p`, not API keys. Warn about wall-clock if tasks × variants > 12 (each cell is a live 30s-5min session).
- **Custom one-off tasks (arguments)**: when the user names a SPECIFIC task instead of the mined pack ("benchmark building a website", "test them on writing my newsletter", "compare code fidelity on a React component"): author ONE task card yourself, on the spot. Follow the same hard rules as generated cards: self-contained prompt (inline any fixtures), bounded scope (one deliverable, size cap, finishes well under 900s), every deterministic check tied to an explicit demand in the prompt (always include no-em-dashes stated in the prompt; for code use `file_created` with concrete paths plus regex checks on required elements), and a rubric naming what the user said they care about (e.g. code fidelity: valid structure, working links/assets, responsive layout, matches the brief). Show the card briefly for approval, write it as `{"version": "adhoc-<date>", "tasks": [card]}` to `~/.claude/benchmark/adhoc/<slug>.json`, then run the NORMAL full chain with `run_benchmark.py --pack <that file> --variants ...` (snapshotting makes scoring/report/verdict work unchanged). The judge compares the actual files each model produced, which is exactly how code fidelity gets judged. Ad-hoc runs record to the DB under their own pack version, so they never mix with mined-pack history.
- **`/benchmark demo`** → run the ENTIRE experience (wizard included) against a fresh state for screen recording: export `BENCHMARK_HOME=/tmp/benchmark-demo` (mkdir first, wipe it if it exists) on every script call for the rest of the session, then behave exactly as a first run. Real history, clean slate, zero risk to the real store. Remind the user at the end that their real benchmark was untouched.
- **`/benchmark report`** → newest `runs/*/verdict.json` + scorecard (+ `db.py summary` for the longitudinal view). Recite the stored TLDR: headline, recommendation, then the behavioral deltas. If verdict.json is missing for that run, generate it first with `verdict.py <run_dir>`.

## Demo mode (for recording the wizard on camera)

Set `BENCHMARK_HOME=<any empty dir>` on every script invocation and the skill runs with a completely clean state (fresh wizard, no pack, no memory file) while still reading the user's real conversation history for the mining step. Use it to screen-record or demo the first-run experience without touching the real `~/.claude/benchmark/`. Nothing else changes; drop the env var to return to the real store.

## Offering a matchup (never make the user type model IDs)

When the user picks "benchmark a model now" (or says it vaguely, "test the new one"), do NOT ask them to name model IDs. Offer 2-3 concrete matchups as a question, in plain words, built from state:
- "<current session model> vs <last_benchmarked_model>" (the natural next test, first when an upgrade was detected)
- "The big three: Opus 4.8 vs Opus 5 vs Fable 5" (the flagship shootout)
- "Same model, low vs high effort" (does paying attention matter)
- Plus "I'll name the models" as the escape hatch.
Always say what it costs before launching: "takes about 10-20 minutes in the background, you can keep working; I'll open a live view you can watch."

## Model IDs (verified, never invent variants)

`claude-fable-5` (most capable), `claude-opus-5` (current default), `claude-opus-4-8` (previous default), `claude-sonnet-5` (fast), `claude-haiku-4-5-20251001` (fastest/cheapest). Use these friendly descriptions when presenting choices; use the exact IDs in --variants. Effort suffix `@low|@medium|@high` maps to `claude --effort`. Non-Claude models are not wired in yet; say so if asked.

## Presenting results

Lead with the verdict headline and recommendation from verdict.json, then the behavioral deltas nobody else measures: words per task (verbosity), turns (autonomy), rule violations (instruction following), duration. Table for per-task detail. Be honest about confidence: one run per task is a directional signal, not proof; say so once, plainly, without burying the verdict. Surface unjudged comparisons and quarantined checks instead of hiding them. No em dashes in any output.

## Gotchas

- The digest dedupes by first-prompt hash so cron/fleet repeats collapse; `repeat_count` keeps the weight; interactive examples preferred within a group.
- Headless runs: `--permission-mode acceptEdits`, scratch dirs, 900s timeout, 25-turn default cap. `claude -p` JSON gives `result`, `num_turns`, `duration_ms`, `total_cost_usd`, `usage.output_tokens`.
- The judge is blind and runs BOTH A/B orders per pair, sees produced files (not just chat output), and the winner is derived in code; order disagreement counts as a tie. It grades only against the mined rubric.
- A separate blind VIBE CHECK scores the intangibles per pair (soul: person vs corporate manual; lecture factor: moralizing/judgmental hedging; padding: filler) with verbatim evidence quotes. This is how conversational tasks with no files and no code get judged fairly, and it appears in the rubric table and per-task lines. For pure-conversation ad-hoc cards ("help me think through X"), checks can be minimal; the rubric + vibe judges carry the verdict.
- The pack is FROZEN between mines on purpose; cross-run comparisons are only valid on the same `pack_version`. The DB stores pack_version per run for exactly this reason. Additionally, every run dir gets its own `eval_pack.json` snapshot at run time; score.py and report.py read the snapshot, so re-mining never corrupts old runs.
- Fixture paths are contained to the scratch dir (absolute paths and `..` escapes are skipped with a warning); task ids and variant labels are sanitized before becoming filenames. The judge treats candidate outputs as data between markers and penalizes verdict-begging; malformed verdicts are skipped, not fatal.
- If a task card generation gets skipped (LLM returned malformed JSON), just re-run `build_eval_pack.py`.
- A task that TIMES OUT (900s) on every model is over-scoped, not evidence about the models. Offer to shrink that card's prompt in the pack (one deliverable instead of three) and note it in the verdict summary.
- Scratch work dirs live under the system temp dir, NEVER under `~/.claude` (Claude Code refuses to edit files inside its own config tree, which silently breaks every file-producing task).
- NEVER create `benchmark.db` without the user's explicit yes. status.py works fine without it.
