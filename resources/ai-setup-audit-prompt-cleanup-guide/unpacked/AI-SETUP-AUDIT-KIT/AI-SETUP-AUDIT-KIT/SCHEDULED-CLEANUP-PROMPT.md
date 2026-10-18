# The scheduled cleanup

Run the audit on a schedule so the mess does not come back. Weekly is a good start.

## The prompt

Paste this as the scheduled task's prompt. Change the archive path if you want it somewhere else.

```text
This is my weekly AI setup check. Use the same scope as my setup audit: skills, rules, instruction files, settings, plugins, connected tools, agents, and every project I run as its own system, in Claude Code and in Codex.

Count what I used in the last 7 days and the last 90 days from my conversation history with a quick script, and find every time I had to correct you. Compare with last week's report in ~/ai-archive/reports/ if there is one.

You may do these without asking me, and only these:
- Move operating system junk files (._ files and .DS_Store) out of my instruction and skill folders.
- Move empty files and broken links out of those folders.
- Move exact duplicate files out, keeping the newest copy.
Move them into ~/ai-archive/<today's date>/ with a note listing where each one came from. Never delete anything. If a move is blocked, leave the file where it is, do not leave a copy in the archive, and list it in the report for me to move.

Everything else is a suggestion for me to approve. Do not edit any instruction file, rule, skill, setting or memory. Do not touch keys or tokens; if you see one in plain text, tell me the file and line without printing it.

Write the report to ~/ai-archive/reports/<today's date>.md with:
1. What you moved, and the one-line undo for each
2. What changed since last week (new files, grown files, new conflicts)
3. Anything unused for 90 days, with your keep, scope or retire call
4. Corrections I gave you three or more times (missing rules)
5. The single change you would make first, and why

Keep the report short. Back up every point with a number or a file path.
```

## Set it up in Codex

1. Open the Codex app (or the ChatGPT desktop app with Codex).
2. Go to **Scheduled** in the sidebar and create a new scheduled task.
3. Paste the prompt, choose weekly, and pick the folder that holds your setup. Your home folder works.
4. Run it once by hand with **Run now** and read the report before you trust the schedule.

The app needs to be running when a scheduled task works on local files. Codex protects some folders, such as `.agents` and `.codex`, from being changed by tasks. Anything it cannot move there shows up in the report for you to move yourself.

## Set it up in Claude

1. Open the Claude desktop app and go to the **Code** tab.
2. Click **Routines** in the sidebar, then **New routine**, and choose **Local**.
3. Paste the prompt, choose weekly, and pick the folder that holds your setup.
4. Run it once by hand and read the report.

Choose **Local**, not **Cloud**. A cloud routine runs on a fresh copy in the cloud and cannot see the files on your computer. A local task needs the app open and the computer awake when it runs.

Checked against the Claude Code and Codex docs on 17 October 2026. Menu names can change; the idea does not.

## Want it to do more on its own?

Start with the list above for a few weeks. Once you trust the reports, you can add one more safe action at a time, such as "move skills unused for 180 days into the archive". Keep it to moves, never deletes.
