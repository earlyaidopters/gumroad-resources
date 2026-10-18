# The audit prompt

This is the exact prompt from the video. Paste it into Claude Code or Codex as one message.

```text
I switch between Claude Code and Codex all the time. Look through my whole setup in both and tell me what's working, what's dead weight, and what's missing. That includes my skills, rules, instruction files, settings, plugins, connected tools, agents, and every project I run as its own system.

Don't guess what I use. Check my last 90 days of conversations in both tools. Don't read them one by one, because that's too slow. Write a quick script that counts what I actually used and finds every time I had to correct you, then work from that summary. If it helps, split the work between helpers running at the same time.

Tell me
1. What I rarely or never use, and whether to delete it, combine it, or start using it again
2. Which rules are outdated, repeated, or conflict with each other, including where my Claude and Codex instructions don't match
3. What I have set up in one tool but not the other, and how to keep both in sync from one place
4. What settings or automations I should have but don't
5. Where each of my project systems wastes my time, and the single best fix for each

Back up every point with a number or the file it came from. No general advice. Don't change anything, just report.

Give me the results as a web page I can read on my phone. Start with the 10 changes that would help me most, then a quick score for each area, then the details with what you found, the proof, and what you'd do about it.
```

## How to run it

1. Open Claude Code or Codex in a folder that can see your whole setup. Your home folder works, or the folder that holds all your projects.
2. Paste the prompt and send it. When it asks to read your settings and history, allow read access. It only needs to read.
3. Wait. On a busy setup this can take a while, because it is counting 90 days of conversations.
4. Open the web page it makes. Read the 10 changes first.

If it asks where your history lives, here is where.
- Claude Code keeps conversation history in `~/.claude/projects/`.
- Codex keeps it in `~/.codex/sessions/`.

## If you only use one tool

Swap the first sentence for this one and remove the Codex parts of point 2 and point 3.

```text
I use Claude Code every day. Look through my whole setup and tell me what's working, what's dead weight, and what's missing.
```

Use the same idea for Codex, Cursor or Gemini CLI. Name your tool and where its instructions live.

## After the report

Do not ask it to fix everything at once. Feed it `CLEANUP-GUIDE.md` and make one change at a time, starting with the first of the 10. Then set up the scheduled run in `SCHEDULED-CLEANUP-PROMPT.md` so the mess does not come back.

The report lists your file names and project names. Keep it to yourself.
