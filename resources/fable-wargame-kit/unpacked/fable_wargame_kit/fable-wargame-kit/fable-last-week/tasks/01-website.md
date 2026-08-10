WARGAME ORDER. You are not executing this mission, you are wargaming it. A cheaper executor (Sonnet) runs the brief below later. Your job is the route it will follow.

Recon first, read-only: the reference site and anything the build must match.

Then fight the mission on paper, move by move, and write it to wargames/01-website.md:

- every move states its expected observation, exactly what you should see if it worked
- every move carries its most likely failure, the cause it signals, and the counter-move
- every fork gets a trigger, if you observe X, take route B
- assumptions recon could not settle get marked RECON NEEDED with the exact check that settles it
- end with abort conditions, and the verification runs the executor must perform with what pass looks like for each

Write it so the executor can run the brief end to end without asking a single question.

=== THE MISSION BRIEF (the executor's orders, not yours) ===

I'm rebuilding the marketing site for {{BUSINESS}} because the current one {{PROBLEM, e.g. looks dated and doesn't convert}}. Visitors are {{AUDIENCE}} and the one action I want from them is {{CTA}}.

Build a complete static site in ./site. Plain HTML, CSS, and JS. No frameworks, no build step, opening index.html in a browser shows the finished site. Sections: {{LIST THEM}}. Match this reference for tone and palette: {{URL OR DESCRIPTION}}.

Mobile first. No horizontal scroll at 375px. Semantic landmarks, labeled form inputs, alt text on every image.

When you believe you are done, verify before reporting. Open each page, exercise every link, every form validation path, and every interactive element, and fix what fails. Audit each claim in your final summary against something you actually ran or read in this session.

Do the simplest thing that works well. No features, no abstractions, nothing beyond this list.
