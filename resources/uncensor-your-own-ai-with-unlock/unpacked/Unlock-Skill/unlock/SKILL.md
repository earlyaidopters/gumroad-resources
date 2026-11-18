---
name: unlock
description: Modify a downloadable local language model with Heretic, keep the original untouched, and compare the saved copy against it with a shareable report. Use for reducing an unwanted refusal on a harmless request, or testing a specified behavior change, on a model that runs on this computer. Includes a tested Qwen3 history recipe, a machine check, a one-command runner and an experimental missing-policy recipe.
---

# Unlock

Turn a requested behavior change into a separate saved model and an honest before-and-after. The skill guides you; Heretic (https://github.com/p-e-w/heretic) changes the local model. It does not unlock hosted chatbots or bypass account controls.

`SKILL` below is this skill's folder. `WORK` is `~/unlock-work` unless the user names another folder. Quote paths; they may contain spaces.

## Start with the outcome

Resolve the target model and the concrete before/after behavior from context. If either is missing, ask only for that while you run the machine check. The included, tested recipe is `history`: `Qwen/Qwen3-4B-Instruct-2507` stops refusing one harmless history-class question. Do not imply other models or hardware have been tested.

## The commands

1. **Check the machine.** `python3 "$SKILL/scripts/doctor.py" --work "$WORK"`. Tell the user the verdict in one or two plain sentences. `blocked` means stop and explain; do not rent hardware or swap the model without asking. `untested` means it should work but there is no receipt for this setup yet; say so. Missing `git` or `uv` comes with install hints; installing system tools is the user's call.
2. **Set up.** `python3 "$SKILL/scripts/setup.py" --work "$WORK"`. Safe to repeat; it reuses what exists. If the model is not downloaded yet, say it is about 8 GB before starting. PyTorch is also large.
3. **Run.** `python3 "$SKILL/scripts/run.py" start --work "$WORK"`. It asks the original first, stops cleanly if the original already answers, edits a copy with Heretic, freezes it, asks both models the same questions with identical settings, proves the original never changed, and writes the report. About two minutes after setup on the tested Mac; longer elsewhere. Run it in the background and relay progress, or, if your session cannot be woken when a background job finishes (a one-shot or headless session), run it in the foreground with a long timeout so you can report the result in the same turn.
   - To only show the original's answer first: add `--stop-after baseline`, then later `run.py resume --run RUN`.
   - If anything stops: `run.py status --run RUN`, fix the cause, `run.py resume --run RUN`. Never delete a run folder to retry.
4. **Report back.** Read `RUN/summary.json` and `RUN/REPORT.md`. Show the target question with both complete replies, the fair-test checks, what changed inside the model, and anything that got worse or was cut off. Open `RUN/report.html` for the user. Read the replies yourself and flag factual errors; the refusal tags are only a phrase match.
5. **Fresh evidence (recommended).** After the run, write three to five new harmless questions the user cares about, with a short `expected` note for each written before you see any reply, into a JSON file in the run folder: `{"phase": "fresh_after_freeze", "fixtures": [{"id": "...", "case_group": "fresh", "prompt": "...", "expected": "..."}]}`. Then `run.py add-cases --run RUN --cases FILE`. Only these count as fresh evidence.

## Rules that do not bend

- The original model is never modified. Every run uses a new folder. Nothing is overwritten; scripts move failed partial files into `attempts/` instead.
- Label evidence honestly. The target question built the edit, so it is a replay. The shipped checks are known checks. Only questions written after the freeze are fresh. Never tune on cases and still call them held out.
- Test questions stay harmless and publicly showable. Do not add harmful-request benchmarks or illicit how-to prompts.
- A claim that Heretic changed behavior requires changed model files and reloaded inference without a behavior-changing prompt. Never substitute prompting and credit the edit.
- Report regressions, factual errors and truncation alongside successes. One answered question proves that example, not general uncensoring or accuracy.
- Keep credentials, private data and model weights out of the skill folder. Publishing or uploading a model is a separate task the user must ask for.

## Other models and behaviors

- **Another model.** `setup.py --model-id ID --revision REV` downloads it and `run.py start` uses it. The recipes were tested only on Qwen3-4B; the doctor's memory numbers are for that model. Check the new model's size and license first, read the pinned Heretic docs, tell the user it is untested, and continue only if they agree.
- **Missing-policy recipe (experimental).** `run.py start --recipe behavior --base-model RUN/edit/history/model` builds on a saved history copy. It has known regressions. For its follow-up turn, continue the changed model's own reply with the exact request in `assets/behavior/followup-request.txt`; see [the workflow](references/workflow.md).
- **A new behavior.** Read "Other behavior goals" in [the workflow](references/workflow.md). Write contrasting examples, a separate preserve set and development checks into a new run folder, and use the manual commands there. A good prompted rewrite is not proof of a model edit.

## References

- [Workflow](references/workflow.md): the tested history, the manual commands behind each stage, evidence rules.
- [Viewer prompts](references/viewer-prompts.md): ready-made requests for the walkthrough.
- [Hosting](references/hosting.md): optional, only when the user asks to put a saved copy online. The tested 4-bit copy regressed; never promise identical behavior after compression.
