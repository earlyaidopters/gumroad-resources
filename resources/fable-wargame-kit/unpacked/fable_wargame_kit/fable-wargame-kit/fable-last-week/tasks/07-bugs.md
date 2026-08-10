WARGAME ORDER. You are not executing this mission, you are wargaming it. A cheaper executor (Claude Code on a cheaper model) runs the brief below later. Your job is the route it will follow.

Recon first, read-only: the whole repo, trace the core flows.

Then fight the mission on paper, move by move, and write it to wargames/07-bugs.md:

- every move states its expected observation, exactly what you should see if it worked
- every move carries its most likely failure, the cause it signals, and the counter-move
- every fork gets a trigger, if you observe X, take route B
- assumptions recon could not settle get marked RECON NEEDED with the exact check that settles it
- end with abort conditions, and the verification runs the executor must perform with what pass looks like for each

Write it so the executor can run the brief end to end without asking a single question.

=== THE MISSION BRIEF (the executor's orders, not yours) ===

Here is my repo: {{PATH}}. Before touching anything, read the README and trace the core flow end to end so you understand what the system is supposed to do.

Then hunt real bugs. Logic errors, unhandled edge cases, race conditions, data-loss paths, security holes at the boundaries. For every finding, cite the file and line, describe the failure scenario in one sentence, rate the severity, and prove it is real with a failing test, a reproduction command, or a concrete trace through the code. If you cannot point to evidence, it does not go in the report.

No style nits. No refactors. No hypothetical hardening for scenarios that cannot happen.

Fix only the top {{N}} findings, each with the smallest change that works, and run the test suite before and after so the report shows both results.
