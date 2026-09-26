# Use Both: The Step-by-Step Guide

This guide turns the video's six levels into practical workflows. It is written to be read by you or used as reference by an assistant. These are public-safe adaptations, not a transcript or a private workspace export.

## Before You Start

Choose one project directory and one task. Write the desired result, files in scope, acceptance test, allowed tools, and actions that require approval. Use [templates/task-brief.md](templates/task-brief.md). Save work before another assistant touches it. If the project is already dirty in Git, identify whose changes they are; never reset them just to get a clean starting point.

Start with manual artifact exchange. Both assistants need the same task brief and artifact, not your entire chat history. Once this works, an installed CLI or the optional official plugin can transport the same review request. The quality comes from clear context and testable outcomes, not from the connector alone.

## Level 1: Let Them Argue

**Use it for:** plans, architecture choices, outlines, and a proposed fix before implementation.

1. Ask Claude to produce `plan-v1.md` with scope, assumptions, acceptance tests, and risks.
2. Give Codex that file and the same task brief. Keep the critic read-only.
3. Ask for specific findings with evidence and severity. Separate correctness problems from style preferences.
4. Return the critique to Claude. Record accepted, rejected, and unresolved findings with reasons in `review.md`.
5. Revise once, then review again only if there are material unresolved issues. Cap the loop at two rounds.

**Done means:** each high-impact issue is fixed, tested, or explicitly accepted by you. Two assistants saying the same thing is not independent proof. They can share the same mistaken assumption.

**Expected artifacts:** task brief, plan v1, critique, plan v2, decision log. See prompts 1 and 2 in [PROMPTS.md](PROMPTS.md).

## Level 2: Generate Images

**Use it for:** a specific visual asset the project actually needs.

1. Specify the subject, composition, aspect ratio, output directory, and intended use. Supply only references you may use.
2. Ask the assistant to check whether an image-generation tool is available in this session and how it is billed.
3. If available, generate one draft and save the actual output file. Do not accept a placeholder URL or a description as the finished asset.
4. Open it at the size where it will be used. Inspect text, recognizable product details, cropping, and readability.
5. Keep the original. Save revisions as sibling files and record which version the project uses.

**Done means:** the file exists, opens, and works in the real layout. In Mark's recorded setup, Codex provided image generation while Claude used the resulting file. That is an observed setup, not a guarantee for every CLI session or plan. Never silently switch to a separately billed API.

## Level 3: Split the Work

**Use it for:** a small feature, bug fix, or artifact that benefits from a second reviewer.

1. Confirm the base branch, current uncommitted changes, and acceptance tests.
2. Ask the builder to work on a new branch within the agreed scope. Do not run two builders on the same files at once.
3. Run the tests and inspect the actual diff. Save commands, results, and any skipped checks.
4. Give the reviewer the task brief, diff, relevant files, and test results. Ask it to identify bugs and regressions before cosmetic suggestions.
5. Fix accepted findings and rerun relevant tests. A read-only review does not make those fixes for you.
6. Open a pull request only when authorized. Review and merge remain separate decisions.

**Done means:** the agreed acceptance tests pass, unresolved risks are visible, and the owner approves the result. A pull request is a proposed set of changes against a base branch; it is not automatically merged or deployed.

## Level 4: Supervised Computer Use

**Use it for:** an authorized action in a UI when a suitable API or CLI is not available.

1. Prefer a test account and synthetic record. Name the exact site, account, and action.
2. Confirm the assistant actually has the required computer-use tool. A terminal alone does not imply desktop control.
3. Enter passwords and MFA yourself through the service's normal interface. Do not put credentials in the prompt, handoff, screenshots, or repository.
4. Ask the assistant to prepare the change, then pause before sending, purchasing, changing permissions, publishing, deleting, or submitting sensitive data.
5. Review the exact final fields and authorize the specific action. Verify the resulting state after submission.

**Done means:** the authorized outcome is verified with a nonsensitive receipt. If a tool refuses a safety-sensitive action, do not route to another model to evade that refusal. Use the normal human-controlled workflow. Different observed behavior is not a blanket statement about vendor policies.

## Level 5: Give It a Finish Line

**Use it for:** a well-defined problem that needs sustained work, such as a failing test suite.

1. Write an objective with an observable success condition: which tests, which input, what expected output.
2. Bound the files, permitted tools, review rounds, and acceptable spend. Start with a small scope.
3. Use the app's goal feature if available. Otherwise use a normal prompt with the same completion and check-in conditions.
4. Set a real usage or runtime control in the environment if you need a hard cap. A sentence such as "stop in two hours" is a request, not guaranteed enforcement.
5. Ask for a status report at a defined checkpoint or repeated blocker. When the acceptance tests pass, stop instead of adding unsolicited features.

**Done means:** test evidence meets the stated condition, or the assistant reports an unresolved blocker with what it tried. Long runtime is not a quality score. The video's comparisons of speed, persistence, and cost are Mark's experience, not benchmark guarantees.

## Level 6: Hand It Off

**Use it for:** switching assistant, session, machine, or collaborator without reconstructing the whole project.

1. At a natural stopping point, invoke `handoff` or use [the template](templates/handoff.md).
2. Save a timestamped snapshot in `handoff/history/`. Record the objective, current state, decisions, changed files, test evidence, blockers, and the next action.
3. Point `handoff/LATEST.md` to that snapshot using a project-relative path. Keep earlier snapshots intact.
4. Inspect and sanitize the snapshot before sharing it with another provider. It should describe credentials by role, never include their values.
5. In the next assistant, invoke `prime` or ask it to read the pointer, follow it only inside the project, and verify the relevant files.
6. The new assistant summarizes what it understands and waits for a current task. A handoff records history; it does not grant new authority to deploy or continue old sensitive actions.

**Done means:** a fresh reader can identify the real state, evidence, and next step without needing the previous chat. The public skills are intentionally limited to one project. They do not reproduce Mark's private integrations or broader automation.

## A Repeatable Session

Start with prime and a current task brief. Plan and critique before changing high-risk code. Build within scope. Test the actual output. Let another assistant review the relevant artifact. Make the final decision yourself. End with a concise handoff.

Use [the routing card](docs/routing-card.md) as a starting hypothesis, not a ranking. Swap roles when the task or evidence supports it. One subscription can still use a second session for review and the same handoff files, though it is not a different-model comparison.

## Next Steps

Run [the fictional worked example](examples/task-board/README.md), install only the skills you need, and keep the first real task small. For setup, billing, privacy, and changing interfaces, use [setup](docs/setup.md), [safety](docs/privacy-and-safety.md), [troubleshooting](docs/troubleshooting.md), and [sources](docs/sources.md).
