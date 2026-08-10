---
name: monthly-insights
description: Generate a Claude Code usage report, extract key takeaways, save to Obsidian vault, and email a clean summary. Use when you say "monthly insights", "insights email", "email me my report", or "monthly review".
allowed-tools: Bash(gws *) Read Write Skill
---

# Monthly Insights Skill

Generates your Claude Code usage report, extracts the key takeaways, saves them to your Obsidian vault, and emails you a summary.

## Setup (do this once)

1. **Install gws** (Google Workspace CLI) via Homebrew: `brew install gws`
2. **Authenticate**: `gws auth login`
3. Update the two placeholders below:
   - `YOUR_VAULT_PATH` — the absolute path to your Obsidian vault folder
   - `YOUR_EMAIL` — the email address you want the summary sent to

## Step 1 — Generate the report

Run the `/insights` skill to produce the usage report.

```
/insights
```

Wait for it to finish. The report HTML will be at:
`~/.claude/usage-data/report.html`

## Step 2 — Extract key sections

Read `~/.claude/usage-data/report.html` and pull out:

1. **Top friction points** — the friction category titles plus their descriptions (from the "Where Things Go Wrong" section)
2. **Suggested CLAUDE.md rules** — every rule from the "Suggested CLAUDE.md Additions" section
3. **Features to try** — each feature name, one-liner, and the "Why for you" rationale

These three extractions are used in both Step 3 (Obsidian note) and Step 4 (email).

## Step 3 — Save to Obsidian vault

Write the note directly to your Obsidian vault using the Write tool. Save to a folder of your choice (e.g. "Claude Tips"):

```
YOUR_VAULT_PATH/Claude Tips/Claude Code Review YYYY-MM-DD.md
```

Build the note content as Obsidian-flavored Markdown with YAML frontmatter properties:

```
---
date: YYYY-MM-DD
tags:
  - claude-code
  - monthly-review
type: review
---

# Claude Code Review YYYY-MM-DD

## Friction Points
1. **[title]** — [one-sentence description]
2. ...

## Suggested CLAUDE.md Rules
- [rule text]
- ...

## Features to Try
1. **[feature name]** — [one-liner]
   Why for you: [rationale]
2. ...

## Full Report
Open `~/.claude/usage-data/report.html` in your browser.
```

Use the Write tool to create the file at the path above. Do NOT use the `obsidian` CLI for note creation (it can silently fail).

Confirm the note was created with the note name.

## Step 4 — Email via gws

Build a base64url-encoded RFC 2822 message and send it with the gws CLI.

Compose the plain-text email body using this template:

```
Monthly Claude Code Review

FRICTION POINTS
1. [title] — [one-sentence description]
2. ...
3. ...

SUGGESTED RULES FOR CLAUDE.md
- [rule text]
- ...

FEATURES TO TRY
1. [feature name] — [one-liner]
   Why for you: [rationale]
2. ...

---
Full report: open ~/.claude/usage-data/report.html in your browser.
Obsidian note: Claude Code Review YYYY-MM-DD
```

Keep it concise. No fluff, no greetings, no sign-off beyond the report link.

Use a temp file to avoid escaping issues:

```bash
cat > /tmp/insights-email.txt << 'EMAILEOF'
[composed body here]
EMAILEOF
BODY=$(cat /tmp/insights-email.txt)
RAW=$(printf "To: YOUR_EMAIL\r\nSubject: Monthly Claude Code Review\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s" "$BODY" | base64 | tr '+/' '-_' | tr -d '=\n')
gws gmail users messages send --params '{"userId":"me"}' --json "{\"raw\":\"$RAW\"}"
rm /tmp/insights-email.txt
```

Confirm the send succeeded (look for an `id` in the response).

## Summary of outputs

When all four steps are complete, confirm:

1. Report generated at `~/.claude/usage-data/report.html`
2. Key takeaways extracted (friction, rules, features)
3. Obsidian note saved as "Claude Code Review YYYY-MM-DD"
4. Email sent with subject "Monthly Claude Code Review"
