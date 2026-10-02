# Where to type, scopes, and quick fixes

## Three kinds of instruction
A **terminal command** tells your computer to install or start something. It starts with `claude`, `bash`, `git` or `cd`. Paste it in Terminal at the shell prompt, not into the chat.

A **slash command** tells a loaded mod what to do. Paste `/pet party` or `/tray list` into the Claude Code message box, one command at a time.

A **prompt** is a normal sentence asking Claude to work. Some mods react automatically; a few register a tool so Claude can control them by name. English is not a universal replacement for installing or invoking a mod.

## The scope is where the switch lives
- **User:** your default across projects. Stored under your Claude user settings.
- **Project:** this folder's shared settings, usually `.claude/settings.json`. Teammates can see these if committed; they still need compatible software and permissions.
- **Local:** your private choice for this project, usually `.claude/settings.local.json`.
- **Temporary:** `--plugin-dir` loads source into the process you start. Closing it ends that load. It does not disable other installed plugins.

A narrower setting can override a wider one. Organization policy can also restrict plugins. If behavior disagrees with your user switch, inspect project/local settings using Claude's plugin controls. Do not delete whole settings files to solve one plugin problem.

## Install, enable and load are different
Install makes a plugin available in a scope. Enable turns on an installed plugin in that scope. A fresh session loads it. If you previously disabled a plugin, re-enable it explicitly:
```bash
claude plugin enable terminal-pet@claude-mods-kit --scope user
```
Use the same marketplace identifier you actually installed. The video creator's private marketplace was named `my-mods`; this public kit is named `claude-mods-kit`.

## It says the slash command does not exist
Check that you are in Claude Code, not a shell. Check the plugin is installed/enabled for this folder, then start a fresh session. `claude plugin list` shows installed plugins. The meter has no slash command. Names are `/timeline`, `/bm` and `/autohandoff`, not the plugin folder names.

## It works in Terminal but not desktop
A temporary terminal launch only loads that process. Install at user scope or at the exact project folder selected in desktop. Start a fresh Claude Code project session. Check the app's own version and mod support; terminal and desktop can differ. Test one mod before combining them.

## A panel is empty or missing
Widen the window and close another panel. Run the command again, then perform a new task in the same session. Heatmap tracks file activity; Tray tracks new files; Receipt needs a completed tracked turn. Work from another tab is not guaranteed to appear. `/tray list` and `/receipt last` give text fallbacks.

## Router shows no savings
A helper must actually run. Its model must be recognized and more expensive than the target. The router may correctly leave it unchanged. Estimates are not invoices or a promise of equal answer quality. Keep default subagents mode; step switching can cost more due to cache loss.

## Resume did not switch the chat
Bookmarks copy a command. Paste that command into a new terminal to reopen the original conversation. Handoff is different: open a fresh chat in the same project and ask it to read the summary. Neither is a one-click desktop chat switch.

## Try all ten deliberately
From the kit root, `bash scripts/try.sh all` requests all ten for one terminal session. Several panes share limited room. Open one at a time. Router will affect supported helpers; Handoff defaults to automatic saves near 85% context. This combined workflow has not been live-certified across surfaces. For persistent installation, add the marketplace first, then use `bash scripts/manage.sh install user all`.
