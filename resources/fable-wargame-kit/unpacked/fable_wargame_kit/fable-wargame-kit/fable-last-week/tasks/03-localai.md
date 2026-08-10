WARGAME ORDER. You are not executing this mission, you are wargaming it. A cheaper executor (Claude Code on a cheaper model) runs the brief below later. Your job is the route it will follow.

Recon first, read-only: the machine specs I gave you, and the current releases of every tool you plan to recommend.

Then fight the mission on paper, move by move, and write it to wargames/03-localai.md:

- every move states its expected observation, exactly what you should see if it worked
- every move carries its most likely failure, the cause it signals, and the counter-move
- every fork gets a trigger, if you observe X, take route B
- assumptions recon could not settle get marked RECON NEEDED with the exact check that settles it
- end with abort conditions, and the verification runs the executor must perform with what pass looks like for each

Write it so the executor can run the brief end to end without asking a single question.

=== THE MISSION BRIEF (the executor's orders, not yours) ===

I want a fully local, open source AI setup on this machine, private by default, nothing leaves the box. My hardware: {{OS AND VERSION}}, {{CHIP, e.g. M2 Pro}}, {{RAM}}, {{GPU / VRAM IF ANY}}, {{FREE DISK}}. I'll use it for: {{USE CASES, e.g. private doc chat, coding help, first drafts}}. My patience for tinkering: {{LOW / MEDIUM / HIGH}}.

Set up the stack that fits THIS machine, not a generic tutorial. Pick the runtime and justify it against my patience level. Pick the exact models with the exact quantizations that fit my memory, one daily driver, one small fast fallback, plus an embedding model if my use cases need document chat. Configure context length and GPU offload for my hardware.

Verify the whole thing end to end. A test prompt runs on each model with tokens per second measured, and each of my use cases gets exercised once. Confirm nothing phones home, the setup works with wifi off.

Everything must be free and open source. If my hardware cannot run a good daily driver, say so plainly and name the smallest upgrade that changes that.
