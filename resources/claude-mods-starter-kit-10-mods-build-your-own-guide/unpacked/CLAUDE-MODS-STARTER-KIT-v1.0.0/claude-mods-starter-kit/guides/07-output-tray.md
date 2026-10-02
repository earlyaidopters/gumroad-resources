# 07 · Output Tray

Find the files Claude just made.

## What it does
Collects new files created during the session in a panel with copy, open and reveal actions.

## Install once
First add the marketplace using START-HERE.md. Choose ONE scope below. Run the project command from the project folder. Start a fresh Claude Code session afterward.

### All your projects (terminal)
```bash
claude plugin install output-tray@claude-mods-kit --scope user
```

### This project (terminal)
```bash
claude plugin install output-tray@claude-mods-kit --scope project
```

### Try only this terminal session
From the downloaded kit folder:
```bash
bash scripts/try.sh output-tray
```

## Use it in Claude Code chat
Run /tray show, send the file-creation prompt, then /tray list. This starter kit implements Open and Reveal using macOS Finder.

```text
/tray show
/tray list
/tray open 1
/tray reveal 1
/tray copy 1
/tray close
```

Send each slash command separately. These are controls to choose from, not a sequence to paste all at once.

### Demo prompt
```text
Create demo-output if it does not exist. Write a short explanation of this demo project to demo-output/project-overview.md and a file inventory to demo-output/file-inventory.csv. Use a new numbered filename if either exists. Use the Write tool for each file. Do not edit existing files.
```

### Can I use plain English?
“Open the output tray” or “List the files in the output tray” is supported by a registered tool. The model cannot use that tool to launch files.

## Turn it off
/tray close Closing a pane hides it; it can still track work. To unload the plugin, run this in the terminal and start a fresh session:

```bash
claude plugin disable output-tray@claude-mods-kit --scope user
```

If installed for a project, use --scope project from that folder instead. If you used try.sh, exit that temporary Claude session. A loaded session can keep its code until closed.

## Know the limits
Lists newly created files, not every edited file. Start tracking before the work. Clear removes the list, not the files. Mac Open/Reveal is not a cross-platform file opener.

## Create your own version
Copy [the full creation prompt](../prompts/07-output-tray.txt) into Claude Code. You can change the visual style, but keep its checks and off switch.

## Source
[Plugin source](../plugins/output-tray/hooks/output-tray.mjs) · [Tests](../plugins/output-tray/tests/output-tray.test.ts)
