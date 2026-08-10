OPTIMIZE SKILL PROMPT

Copy the block below. Fill in the four placeholders. Paste into Claude Code. The claude-code-guide subagent audits the skill against Anthropic docs, runs the structural checklist, asks the wrong-primitive question, and returns a concrete diff.


===== START COPY =====

@claude-code-guide I want you to audit and optimize a skill that just underperformed in this session. Treat this as a serious skill-engineering review, not a quick suggestion.

CONTEXT

Skill path: [PASTE THE FULL PATH TO THE SKILL DIRECTORY, e.g. ~/Desktop/dark-side-demo/project/.claude/skills/client-proposal-draft/]

What I typed to trigger it:
[PASTE THE TRIGGER PROMPT VERBATIM]

What the skill produced:
[PASTE THE FULL OUTPUT THE SKILL RETURNED]

What I expected instead:
[1 to 2 SENTENCES DESCRIBING THE GAP, e.g. generic vs on-brand, missing context, wrong tone, asked questions that should have been auto-detected, etc.]

WHAT I WANT YOU TO DO

1. Read the SKILL.md at the path above. Quote the relevant sections.

2. Audit against Anthropic's official skills guidance. Cross-reference:
   - https://code.claude.com/docs/en/skills.md (skill content lifecycle, progressive disclosure, description budget)
   - https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
   - Any newer Anthropic docs you find on skill design, plugins, hooks, or settings

3. Identify what failed in THIS session specifically. Don't generalize. Tie every diagnosis back to a concrete line in the SKILL.md or a concrete line in the trigger or output above.

4. Run the structural checklist. Flag every item that applies:
   - Description in YAML frontmatter is vague or missing trigger keywords
   - description field is over 800 chars (spec hard cap 1,024 / Claude Code runtime listing 1,536) OR trigger keywords are buried past the first 250 chars (legacy-safe zone)
   - No upfront interview step (the skill doesn't ask diagnostic questions before drafting)
   - No explicit voice, style, or tone rules
   - No bans on common failure modes (em dashes, AI openers, sycophancy)
   - No end-of-run reflection step (the skill never asks how it landed)
   - Overlaps with another skill in ~/.claude/skills/ (name the conflict)
   - Loads reference files that should be inlined, or inlines content that should be a reference file
   - Uses a script when a one-liner would do, or vice versa

5. Ask the wrong-primitive question. Based on what this skill actually does, should it really be:
   - A rule in .claude/rules/ instead?
   - A one-liner in CLAUDE.md instead?
   - A standalone CLI command instead?
   - A direct API call instead?
   - A slash command instead?
   - Nothing, just deleted?
   If any of those is a better fit, say so explicitly and justify in one sentence.

6. Propose a concrete diff. Show the SKILL.md changes as a unified diff or as a clear before-and-after block for each section. No vague advice. Every recommendation translates to specific edits I can apply.

7. Sanity-check the new description. Count the characters of the new description field. Confirm it is under the 1,024 spec hard cap. Confirm the trigger keywords sit in the first 250 characters so they survive the legacy listing cap on older Claude Code surfaces.

8. Predict the next failure mode. After the diff is applied, what is the most likely thing that will still go wrong on the next run? Give me one concrete prediction so I know what to watch for.

OUTPUT FORMAT

Return your response in this order:
1. Verdict, one sentence: prune, rewrite, promote, demote-to-rule, or delete.
2. Diagnosis, numbered list, each item tied to a line in the SKILL.md or session.
3. Structural checklist, checked items only.
4. Wrong-primitive recommendation, only if a different primitive is the better fit.
5. Diff, concrete before-and-after edits.
6. Description budget check, character count of new description plus when_to_use.
7. Next likely failure, one prediction for the next run.

Be direct. No filler. No "great question." No "I'd be happy to."

===== END COPY =====


HOW TO USE THIS PROMPT ON CAMERA

1. Run the skill cold with the vaguest possible trigger.
2. Note what it got wrong.
3. Copy the block above.
4. Fill in the four placeholders.
5. Paste into Claude Code, send.
6. Apply the diff Claude returns.
7. Re-trigger with the same vague prompt to confirm the fix.


WHY THIS PROMPT WORKS

Tags claude-code-guide so the audit runs in a fresh subagent context and doesn't pollute the main session.
Anchors to Anthropic's own docs so the critique cites authority, not opinion.
Forces a structural checklist so the audit catches the failure modes Mark calls out in the Dark Side video: no interview, no voice rules, no feedback loop, description bloat, overlap.
Asks the wrong-primitive question so you don't rebuild a skill that should have been a rule, a CLI, or just a CLAUDE.md line.
Demands a diff, not vague advice, so the output is immediately applicable.
Predicts the next failure so you know what to watch for after the edit. Closes the maintenance loop.


SEE ALSO

A pre-filled example using the silver-platter skill is in optimize_skill_prompt_silver_platter_example.md. Copy and paste that one directly if you want to skip the placeholder step.
