# 08 · Changes Receipt

Get a clear list of what changed.

## What it does
Summarizes files created, edited and deleted during a tracked turn. It separates successful changes from failed attempts.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install changes-receipt@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install changes-receipt@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh changes-receipt
```

## Use it in Claude Code chat
Run /receipt on before the file-creation prompt. Wait until Claude finishes, then run /receipt last.

```text
/receipt on
/receipt open
/receipt last
/receipt close
/receipt off
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Create demo-output if needed. Use the Write tool to create demo-output/receipt-example.md with three bullet points about the login flow. If that filename exists, create a new numbered filename. Do not modify any other file.
```

### Can I use plain English?
“Show the changes receipt” is supported. Slash commands are the clearest way to check the last tracked turn.

## Turn it off
/receipt off Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable changes-receipt@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
A receipt is not undo, backup or perfect attribution. Other programs changing files at the same time can confuse snapshots. It does not backfill old sessions.

## Create your own version
Copy [the full creation prompt](../prompts/08-changes-receipt.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/changes-receipt/hooks/changes-receipt.mjs) · [Tests](../plugins/changes-receipt/tests/changes-receipt.test.ts)
