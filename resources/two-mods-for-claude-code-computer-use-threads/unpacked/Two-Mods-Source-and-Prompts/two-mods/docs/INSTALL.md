# Install the mods

## Keep this folder somewhere permanent

Extract the ZIP, or clone the repository. Open Terminal in its root, where README.md and scripts/ live. The marketplace is registered from this local folder, so do not delete or move it afterward.

The installed mod API must support `claude-code`, hook modules and `claude plugin test`. The package was checked with Claude Code 2.1.289 on macOS. If your release lacks the mod API, stop and check your provider’s supported release; do not try to recreate its private API through npm.

For Threads, install tmux if needed (`brew install tmux` on a Homebrew Mac), then run `claude auth login`. Open Claude Code in the project folder once and accept its normal folder-trust prompt. Remote Control/sidebar support also needs to be available to your account.

For Computer Use, set up Codex computer use in the ChatGPT Mac app first. Expected locations:

- `/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node`
- `~/.codex/plugins/cache/openai-bundled/unified-computer-use/<version>/.mcp.json`

The launcher reads your installed configuration. It does not copy it into the download or install the proprietary runtime.

## Check first

```bash
python3 scripts/setup.py
```

To check just one mod:

```bash
python3 scripts/setup.py --component threads
python3 scripts/setup.py --component computer-use
```

The checker reports missing prerequisites. Passing means those prerequisites were found, not that the complete desktop workflow has been tested.

## Install

Read the commands printed by the checker. Then:

```bash
python3 scripts/setup.py --apply
```

Or add `--component threads` / `--component computer-use` to install one.

The script registers this directory as the `two-mods` marketplace and installs the chosen plugin(s) at user scope. For Computer Use it copies only `launch.mjs` and `daemon.mjs` into `~/.claude/mcp/codex-cu/`, creates empty app approvals with auto-approve off, and registers the `codex-cu` MCP connection. The mod itself is named `codex-computer-use` so the names do not clash.

Open a new Claude Code chat. Run `/codex-cu status` and/or `/threads setup`. Then follow [DEMO.md](DEMO.md).

## Existing installations and partial failures

The installer refuses to overwrite an existing bridge or install a selected mod twice. It does not migrate your current `my-mods` installation automatically. Keep using your working copy unless you intentionally want to replace it.

To migrate: close active helper tasks, back up your existing mod source and bridge **privately**, and record your current marketplace and plugin versions. Use Claude’s plugin commands to uninstall the old plugin registration. Move the old bridge folder to a private backup, remove the old `codex-cu` MCP registration with `claude mcp remove codex-cu --scope user`, then run the installer. Do not put the backup, logs or approvals into this repository. Reopen Claude afterward.

If a setup command fails halfway through, read the last command shown. Completed registration or file-copy steps may remain. Inspect `claude plugin list` and `claude mcp get codex-cu` before retrying; do not repeatedly run installation over an unknown state. The script deliberately stops rather than replacing existing state.

## Updating

Keep source changes in this local repository. Bump the relevant plugin version in `.claude-plugin/plugin.json`, then run:

```bash
claude plugin update threads@two-mods
claude plugin update codex-computer-use@two-mods
```

Only update the plugin you changed, then start a new chat. Bridge files are separate: updating the plugin does not update `~/.claude/mcp/codex-cu/`. Stop app-control work before replacing those helper files. Never overwrite your approval file with someone else’s.

## Uninstall

Finish or close helper sessions from the Threads panel first. In Claude, switch `/codex-cu off`. Then:

```bash
claude plugin uninstall threads@two-mods
claude plugin uninstall codex-computer-use@two-mods
claude mcp remove codex-cu --scope user
```

Use only the commands for components you installed. Restart Claude. The bridge stops after inactivity. You can remove the now-unused local bridge files afterward. Your saved Threads registry and plan history live under `~/.claude/threads/`; keep or delete them deliberately. Uninstalling a plugin is not a request to delete your projects or handoff notes.
