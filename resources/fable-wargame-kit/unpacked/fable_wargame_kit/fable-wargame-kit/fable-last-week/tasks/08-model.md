WARGAME ORDER. You are not executing this mission, you are wargaming it. A cheaper executor (a mid-tier model) runs the brief below later. Your job is the route it will follow.

Recon first, read-only: the revenue and cost inputs I gave you.

Then fight the mission on paper, move by move, and write it to wargames/08-model.md:

- every move states its expected observation, exactly what you should see if it worked
- every move carries its most likely failure, the cause it signals, and the counter-move
- every fork gets a trigger, if you observe X, take route B
- assumptions recon could not settle get marked RECON NEEDED with the exact check that settles it
- end with abort conditions, and the verification runs the executor must perform with what pass looks like for each

Write it so the executor can run the brief end to end without asking a single question.

=== THE MISSION BRIEF (the executor's orders, not yours) ===

Build a 12-month financial model for {{BUSINESS}} as a spreadsheet, saved as {{NAME}}.xlsx.

One inputs sheet holding every assumption: {{REVENUE STREAMS}}, {{COST LINES}}, {{ASSUMPTIONS, e.g. churn, close rate, price changes}}. Each assumption lives in one labeled cell. Nothing gets buried inside a formula.

Model monthly cash across base, bear, and bull scenarios, driven by the three levers I am most likely to change: {{LEVERS}}. Add a summary sheet a non-finance person can read in sixty seconds.

Use real formulas, not hardcoded values. Before reporting, sanity-check the model, move each lever and confirm the outputs shift the way reality would. Close with the three assumptions the model is most sensitive to, so I know what to watch.
