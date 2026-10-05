# Try the demos

Start with clean windows and a disposable project. These are acceptance checks to run on your own setup, not claims that installation will work on every machine.

## Computer Use: the opening demo

1. Open a new Claude chat after installation.
2. Run `/codex-cu on`, then `/codex-cu status`.
3. Paste [computer-use-demo.txt](../prompts/computer-use-demo.txt).
4. Approve Calculator and TextEdit when asked.

Success means Calculator visibly computes **149 × 12 = 1788**, a new TextEdit document contains the monthly and yearly amounts, and the title is bold and readable. Keep the actual tool call visible to confirm the bridge is used. The final video demonstrates this task; the download still needs a fresh live check on your machine.

Do not substitute file-writing, Terminal or an API call for the app interactions. If an action fails, use the troubleshooting guide rather than enabling every permission automatically.

## Threads: two helpers, one answer location

1. Open Claude Code in `examples/subscription-demo/`. Accept the folder trust prompt yourself.
2. Run `/threads setup`. Fix any login or tmux issue first.
3. Choose your permission mode. The source retains bypassPermissions; `/threads mode default` restores normal prompts for new helpers.
4. Paste [threads-demo.txt](../prompts/threads-demo.txt).
5. Confirm two real sessions start on their requested models. An inline fallback is not evidence of two independent sessions.
6. While Reviewer is working, paste [threads-steer.txt](../prompts/threads-steer.txt).
7. Wait for both complete answers to return to the main chat. Check that Reviewer followed the correction.

This small fixture deliberately contains a code/documentation mismatch for the helpers to discover. It is not a benchmark. There is no need to run installation commands, write files, or contact a website.

If both finish too quickly to show a correction, repeat the test with a larger public sample project. Do not claim the correction worked unless the helper actually received and followed it.

## Optional: a handoff plan

Use a fresh copy of the fixture, then paste [threads-plan.txt](../prompts/threads-plan.txt). This one makes changes. Check the plan before approving its build step. Confirm the next helper reads the handoff note and the final checker reports actual results.

## What to record

Record the Claude/app versions, date, requested and observed models, visible result, permission choices and any failure. Avoid capturing account details. Never present an animated diagram as a recording of a passed test.
