# Worked Example: A Fictional Task Board

Everything here is synthetic. No client project or private session is included.

## Task Brief

Add a filter that hides completed tasks. Preserve order, leave the input list unchanged, and return an empty list for empty input. A task missing `completed` is treated as incomplete. No UI, database, account, or network is needed.

## Plan v1

"Loop through tasks and remove completed items when the filter is on. Return the remaining list."

## Second-Assistant Critique (Illustrative)

The plan does not specify whether it mutates the input. Removing items while iterating can skip adjacent completed tasks. It also omits empty-input and filter-off tests. These are concrete correctness questions; a request to rename the function would just be a preference.

This critique is a constructed teaching example, not a claimed live model transcript.

## Plan v2 and Decision

Return a new list using a comprehension, preserve the existing order, and treat missing completion flags as false. Add tests for two consecutive completed tasks, filter off, empty input, missing flags, and input preservation. Do not build a database or UI to solve this task.

## Run the Actual Result

From the kit root:

```bash
python3 examples/task-board/test_task_board.py
```

Expected: five tests pass. The function is in [task_board.py](task_board.py).

## Example Handoff

Objective: hide completed tasks without mutating the input.

Current state: the function and five tests are included. No UI integration exists.

Decision: missing completion flags count as incomplete. Output order remains stable.

Verification: run the command above on your own machine. Do not claim it passed until you observe the result.

Next action: if the owner requests UI integration, inspect that application's data contract first. Do not assume this example authorizes editing another project.

Resume map: `examples/task-board/task_board.py`, `examples/task-board/test_task_board.py`.
