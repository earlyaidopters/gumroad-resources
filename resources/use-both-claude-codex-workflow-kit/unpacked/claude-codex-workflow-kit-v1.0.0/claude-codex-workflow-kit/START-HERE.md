# A Five-Minute Trial

You do not need a plugin, a new subscription, or the skills to understand this workflow. Use the assistants you already have access to. Do not upload confidential work to a second provider without permission.

## 1. Pick Something Small

Use a fictional task: a task list should hide completed items when a filter is enabled. The acceptance test is simple: three tasks go in, one complete task disappears, and switching the filter off shows all three again. See [the runnable example](examples/task-board/README.md).

## 2. Ask the First Assistant for a Plan

```text
Plan a task-list filter that hides completed items. Do not build yet.
Write the smallest implementation plan, acceptance tests, assumptions,
and risks. Keep the task order stable and do not mutate the source list.
```

Save the response as `plan-v1.md`. Use [the plan template](templates/plan.md) if helpful.

## 3. Ask the Other Assistant to Challenge It

Paste only the plan and the task brief into a separate session. Ask:

```text
Review this plan read-only. Find correctness gaps, missing tests, and
unnecessary scope. For each finding, show the evidence, impact, and
smallest fix. Say when something is only a preference. Do not invent
problems to fill a quota. Do not implement anything.
```

## 4. Reconcile, Then Test

Return the review to the first assistant. Ask which findings it accepts, which it rejects, and why. Allow at most two review rounds. Agreement is useful feedback, not proof. Decide using the acceptance tests.

## 5. Leave a Handoff

Copy [templates/handoff.md](templates/handoff.md), fill it with synthetic project state, and save it as `handoff/history/2026-09-26T120000Z.md` inside your practice project. Make `handoff/LATEST.md` a one-line pointer:

```text
handoff/history/2026-09-26T120000Z.md
```

In a fresh session, ask the assistant to read the pointer and snapshot, verify the named files, summarize what is done and what is next, then wait. You have just tried the core skill behavior without installing anything.

**Next:** [install the two skills](docs/setup.md#install-the-two-skills), or choose another level from [PROMPTS.md](PROMPTS.md).
