I want you to audit every skill my AI tools can load, figure out which ones I actually use, and show me what to keep, merge and delete. Do not delete, move or edit anything. This is a read-only audit. At the end, give me one self-contained HTML report I can open in a browser.

## 1. Find every skill

A skill is a folder with a SKILL.md file. Look in every place my tools load skills from, including:

- Claude Code: ~/.claude/skills, any .claude/skills folder inside my projects, and skills that come from installed plugins
- Codex: ~/.codex/skills and ~/.agents/skills
- Any other agent folder you find on this machine that holds SKILL.md files (Cursor, Gemini CLI, OpenCode and so on)

Follow symlinks, and when the same skill shows up in more than one place, count it once and list every place it lives.

For each skill, record: name, every path, which tools load it, word count of the SKILL.md, word count of its description (the part every session reads up front), whether the folder contains any code (scripts in .py, .js, .ts, .mjs, .sh or similar), number of files, and when it was last changed.

## 2. Work out how often each one is actually used

Use my real session history, not guesses.

- Claude Code keeps sessions as .jsonl files under ~/.claude/projects. Count each time a skill was loaded through the Skill tool, and each time I ran it as a slash command.
- Codex keeps sessions under ~/.codex/sessions. Count skill loads there the same way if the format allows it.
- Look at the last 90 days. For every skill, record the total uses, the uses per week, and the date it was last used.

Only read the parts of the logs you need to count skill names and dates. Never copy message content, file contents, keys or tokens from the logs into your notes or the report. If a tool has no usable history, say so plainly in the report instead of filling in numbers. Check your totals add up before you write anything.

## 3. Find overlap

Compare every skill's description and instructions with every other skill. Flag pairs that do the same job, contradict each other, or would be better as one skill. Give each pair a simple similarity score from 0 to 100 and a one-line reason.

## 4. Sort every skill with three questions

1. Does it run code that has to work exactly the same way every time?
2. Does it know something the model can't find out on its own, like my process, my clients, my rules or my taste?
3. Does the product, a built-in feature or a plugin I already have now do the same job?

Then put each skill in one bucket:

- **Keep**: yes to question 1 or 2, and used at least once in 90 days.
- **Merge**: passes, but overlaps with another skill. Say which one it merges into.
- **Delete**: no to questions 1 and 2, or yes to question 3, or not used in 90 days with nothing unique inside it.
- **Review**: you are not sure. Say exactly what you would need me to tell you.

Give a one-line reason for every skill. When you say the product already does something, name the feature. If you are guessing, label it as a guess.

## 5. Suggest merges

Propose compound skills: a few bigger skills that each own one whole job, built from the ones that overlap or always get used together. For each proposal, give a name, a one-paragraph description, which skills it replaces, what each one contributes, and what gets dropped.

## 6. Build the report

Write one HTML file, report.html, that works offline (inline CSS and inline SVG, no external scripts or fonts). Make it clean and good-looking: calm colours, generous spacing, readable at laptop size, light background. Include:

1. **Summary cards**: total skills, used in the last 90 days, never used, words loaded up front every session across all skill descriptions, and how many you suggest keeping, merging and deleting.
2. **Radar chart** (the spider web with the grid rings) of my top 10 most-used skills, one spoke per skill, scaled to usage.
3. **Usage grid**: a heatmap with one row per skill and one column per week for the last 90 days, darker cells for more use, sorted from most to least used. Unused skills at the bottom, greyed out.
4. **Overlap grid**: a matrix of skill against skill, cells shaded by similarity, showing only skills that overlap with at least one other.
5. **Keep, merge, delete and review tables**, each skill with its reason, uses, last used date and whether it contains code.
6. **Merge ideas** as cards, one per proposed compound skill.
7. **How this was counted**: which folders and logs you read, the date range, and anything you could not check.

Save it with the raw data as JSON next to it, in a folder called skill-audit-YYYY-MM-DD (today's date) in the current directory, then tell me the path.

## 7. Stop and wait

Finish with a short summary in chat: the five skills I use most, how many I could remove, and the three merges you would do first. Then stop. Don't delete, move or rewrite any skill until I say which ones. When I do, move them into a dated backup folder instead of deleting them, so I can undo it.
