WARGAME ORDER. You are not executing this mission, you are wargaming it. A cheaper executor (Sonnet) runs the brief below later. Your job is the route it will follow.

Recon first, read-only: all {{N}} transcripts end to end.

Then fight the mission on paper, move by move, and write it to wargames/06-chatbot.md:

- every move states its expected observation, exactly what you should see if it worked
- every move carries its most likely failure, the cause it signals, and the counter-move
- every fork gets a trigger, if you observe X, take route B
- assumptions recon could not settle get marked RECON NEEDED with the exact check that settles it
- end with abort conditions, and the verification runs the executor must perform with what pass looks like for each

Write it so the executor can run the brief end to end without asking a single question.

=== THE MISSION BRIEF (the executor's orders, not yours) ===

Attached are {{N}} real conversations from my {{CHATBOT PURPOSE, e.g. lead qualification}} bot: {{FILES OR PASTE}}. Its current system prompt: {{PASTE}}.

Find where it actually fails. Wrong answers, missed handoffs, tone breaks, users repeating themselves, conversations that dead-end. Group the failures into named patterns, and support every pattern with at least one direct quote from the transcripts. If you cannot quote it, it does not exist.

Then rewrite the system prompt to fix the top patterns. Deliver the new prompt, plus a change log, each change paired with the failure pattern it prevents. Keep the new prompt as short as it can be while fixing what you found.
