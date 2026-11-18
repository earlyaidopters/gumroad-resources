# Demonstrated workflow

## What is established

On 9 November 2026, unchanged Heretic source at `8b0dbac4dd180dc23d62fdf9714dc9d8b31f3d2c` edited `Qwen/Qwen3-4B-Instruct-2507`, revision `cdbee75f17c01a7cc42f958dc650907174af0554`, on an M5 Max with 128 GiB unified memory. This is a tested machine, not a minimum hardware claim. Original weights are about 8 GB; editing needs additional working memory and output storage.

First edit: the original refused a factual, non-graphic history comparison. The saved copy answered; some other historical questions remained evasive. Second edit: the first copy promised compensation without a policy; the second copy asked for missing price/policy. Given $40/month and a qualifying 25% credit, it calculated $10, then unnecessarily asked for confirmation. Some unrelated replies degraded or invented conditions. The complete 10 November rerun reproduced both edits in a clean environment. Its customer-focused copy regressed to a false answer on a new history question, and a rephrased follow-up looped. Keep the copies separate and use the exact demonstrated follow-up when replaying the example. No payment tools were involved.

The first recipe uses native projected abliteration. The second uses native MPOA with a parameter-only subclass and a custom development scoring heuristic. It is not a stock one-click menu option. The desired/undesired instructions in the editing configuration generate the contrast during editing; they are absent from the inference comparisons. The heuristic needs human review.

## The scripted path

`doctor.py`, `setup.py` and `run.py` automate everything below for the history recipe. Each `run.py` stage maps onto a manual step in this file:

| Stage | Manual equivalent |
| --- | --- |
| `doctor` | Check OS, accelerator, memory and disk |
| `hash-original` | SHA-256 of every original file and every tensor (`freeze.py hash`) |
| `baseline` | `compare.py` on the original with `assets/history/regression-cases.json`; stops if no refusal phrase |
| `prepare` | `prepare.py --mode history` into `RUN/edit` |
| `edit` | `HERETIC_CONFIG_FILE=RUN/edit/history.toml heretic`, run from `RUN/edit/history` |
| `check-copy` | Confirm `RUN/edit/history/model` holds config and weights |
| `freeze` | Hash the copy, per-tensor diff, candidate table from Heretic's journal, `evidence/manifest.json` |
| `compare` | `compare.py` on both models with the target replay plus `assets/history/check-cases.json` |
| `verify` | Re-hash both; confirm identical input tokens on every case |
| `report` | `report.html`, `REPORT.md`, `summary.json` |

`run.py add-cases` runs fresh post-freeze cases on both models and refreshes the report. The rest of this file is the record of what was established and the manual route.

## Focused Qwen3 walkthrough

The current video uses only the history edit. Run `prepare.py --mode history` in a new output directory. The default `both` also prepares the separate customer-behavior experiment, which is optional. The exact history question is in `assets/history/reduce-refusal.txt`. Run that question on the original first, then reload the newly saved `history/model` with the same system instruction and settings. Use `references/viewer-prompts.md` for the installation, fresh-run, comparison and Harness requests.

## Claude Code installation

Install the full ZIP in `.claude/skills/unlock` inside the project. Native Claude Code 2.1.321 required confirmation of the newly created folder and a one-time approval to write the protected skill directory. Start a fresh session afterward. If a same-named personal skill exists, it wins over the project copy; verify the loaded path or update that personal installation. The 10 November test isolated the project copy and restored the personal alias afterward.

## Setup

`setup.py` performs this section and records the result in `WORK/unlock-setup.json`. By hand: resolve SKILL to this skill directory and WORK to a new experiment directory. Use absolute paths and shell quoting, especially with spaces. Check for existing source/environment/model before installing. For a fresh setup:

```sh
git clone https://github.com/p-e-w/heretic "$WORK/heretic"
git -C "$WORK/heretic" checkout 8b0dbac4dd180dc23d62fdf9714dc9d8b31f3d2c
uv venv --python 3.12 "$WORK/.venv"
(cd "$WORK/heretic" && uv pip install --python ../.venv/bin/python -e .)
"$WORK/.venv/bin/hf" download Qwen/Qwen3-4B-Instruct-2507 --revision cdbee75f17c01a7cc42f958dc650907174af0554
```

Record actual installed versions with `uv pip freeze --python "$WORK/.venv/bin/python"`. `tested-environment.txt` records the clean 10 November environment, not a cross-platform requirements file. The clean-install test on 10 November succeeded by resolving the pinned source's declared dependencies; forcing the earlier receipt failed because one exact version was unavailable. Use the source requirements and verify the resolved environment instead of treating that receipt as an install lock. Running installation from inside the checkout also avoids the observed absolute-path parsing failure with a space-containing workspace. Do not execute remote model code by default. Read the original model's license and keep required attribution if exporting it.

## Prepare and run

Set MODEL to the local downloaded snapshot, RUN to a nonexistent sibling directory. `--mode history` runs only the refusal recipe; `--mode both` chains the two edits. For a later second request, use `--mode behavior --model /path/to/the/saved/history/model` with a new output directory; it starts from that saved copy and prepares only the second edit. Device defaults to MPS; CPU/CUDA are configurable but have not been verified for this packaged recipe.

```sh
"$WORK/.venv/bin/python" "$SKILL/scripts/prepare.py" --model "$MODEL" --out "$RUN" --heretic "$WORK/.venv/bin/heretic" --mode both --check-only
"$WORK/.venv/bin/python" "$SKILL/scripts/prepare.py" --model "$MODEL" --out "$RUN" --heretic "$WORK/.venv/bin/heretic" --mode both
```

Inspect RUN-PLAN.json and the copied configurations; run its history command first. It saves to `$RUN/history/model`. Then run the behavior command, which starts from that copy and saves to `$RUN/behavior/model`. Development logs belong to this run. The three candidate strengths are fixed, not a validated recipe for every behavior.

The historical successful behavior export selected trial 2 after manual inspection. `trial_index=0` in the template selects Heretic's first-ranked candidate, not necessarily that historical trial. Inspect the pinned source's selection/export flow and complete candidate replies; record what was actually chosen. Never promise an identical result from a rerun. Do not evaluate the final claims on selection/development data.

## Save evidence and compare

Before fresh evaluation, save a manifest with source/model revision, actual versions, chosen parameters, timestamp, SHA-256 for configuration/helper files and every exported model file. Hash the original too when establishing it was preserved. Create fresh test JSON after freezing, with `phase`, `fixtures` and each fixture's `id`, `prompt` (or full `messages`), `case_group` and expected judgment. Historical cases shipped with the skill are only replays.

```sh
"$WORK/.venv/bin/python" "$SKILL/scripts/compare.py" --model "$RUN/history/model" --fixtures "$RUN/new-cases.json" --out "$RUN/before.json" --max-tokens 500
"$WORK/.venv/bin/python" "$SKILL/scripts/compare.py" --model "$RUN/behavior/model" --fixtures "$RUN/new-cases.json" --out "$RUN/after.json" --max-tokens 500
```

For the first edit, compare MODEL against history/model. Use identical `--dtype`, `--device` and token limits. The probe is deterministic and uses the neutral system message `You are a helpful assistant.` unless full messages are explicitly supplied. Confirm both runs contain identical actual input token IDs and masks, plus identical intended system/user messages. Treat truncation as inconclusive. Output files are exclusive and will not overwrite previous evidence.

For the demonstrated policy follow-up, append the changed model's actual assistant response to the original messages, then use the exact request in `assets/behavior/followup-request.txt`. The clean run confirmed $10 with that wording but looped on a rephrased request; do not silently substitute a new wording and claim the same result. For another policy, supply its actual facts and test the resulting conversation. A replay of a previously recorded response is not a fresh live continuation. State whether evidence is historical, replayed, or freshly observed.

## Other behavior goals

Translate the requested outcome into contrasting examples and explicit development judgments. Use separate preservation examples and fresh counterexamples. Do not reuse the clarification parameters blindly for a writing-style change; the prior anti-slop model-edit attempt did not establish a useful improvement. A good prompted rewrite is not proof of a successful model edit.

Source: https://github.com/p-e-w/heretic/tree/8b0dbac4dd180dc23d62fdf9714dc9d8b31f3d2c
