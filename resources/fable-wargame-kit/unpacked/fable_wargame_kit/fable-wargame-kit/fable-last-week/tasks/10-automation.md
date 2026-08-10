WARGAME ORDER. You are not executing this mission, you are wargaming it. A cheaper executor (Claude Code on a cheaper model) runs the brief below later. Your job is the route it will follow.

Recon first, read-only: the process description and every tool it touches.

Then fight the mission on paper, move by move, and write it to wargames/10-automation.md:

- every move states its expected observation, exactly what you should see if it worked
- every move carries its most likely failure, the cause it signals, and the counter-move
- every fork gets a trigger, if you observe X, take route B
- assumptions recon could not settle get marked RECON NEEDED with the exact check that settles it
- end with abort conditions, and the verification runs the executor must perform with what pass looks like for each

Write it so the executor can run the brief end to end without asking a single question.

=== THE MISSION BRIEF (the executor's orders, not yours) ===

Here is a process I currently run by hand: {{DESCRIBE IT STEP BY STEP, WITH THE TOOLS EACH STEP TOUCHES}}.

Map it into an automation blueprint. Classify every step as automate fully, automate with a human checkpoint, or keep human, with the reason. For each automated step, name the tool or script that does it. For the whole pipeline, identify what breaks first and the guardrail for it.

Sequence the build starting with the step that saves the most time per week. Each phase of the build gets its own acceptance check, something I can run to confirm that phase works before starting the next.

Delegate independent steps to subagents and keep working while they run. The final output is a blueprint I can hand to Claude Code and say, build phase one.
