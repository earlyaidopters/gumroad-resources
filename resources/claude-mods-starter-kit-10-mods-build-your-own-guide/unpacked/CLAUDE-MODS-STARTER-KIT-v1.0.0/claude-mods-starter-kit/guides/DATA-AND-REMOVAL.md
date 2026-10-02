# Your data and the off switch

## What this kit contains
Plugin source, synthetic tests, a fictional demo project, creation prompts and guides. It contains no creator settings, keys, chat history, real bookmarks or private work files. There is no added analytics or unrelated network service in the plugin code. Claude Code itself still follows your account and workspace permissions.

## What the mods can read or write
Pet, Skin and Meter observe session events and usage. Heatmap, Timeline, Tray and Receipt observe project activity; some read file metadata or content and run local Git commands. This is real code running with the host capabilities available to it.

Router changes supported model requests. Bookmark auto-titling and Handoff summaries make extra model calls through Claude Code. Do not assume that “mod” means offline or zero usage.

Bookmarks save titles, notes, folder paths and session references to `~/.claude/bookmarks/bookmarks.json` unless overridden. They do not copy the transcript, but a note can still contain sensitive text. `/bm delete N` removes a chosen bookmark. Export a backup first if you need it.

Handoff writes timestamped summaries under the current project's `handoff/` folder, plus `LATEST.md` and sometimes `ACTIVE_PROJECT.md`, and adds an ignore entry. A summary can contain project details even when asked to avoid secrets. Read it before sharing. Removing the plugin does not delete these project files.

The temporary demo helper redirects bookmark storage into its own throwaway project. Normal installations use your normal bookmark location. Persistent preferences may live in the host's plugin store.

## Hide, disable, uninstall
Hiding a panel does not necessarily stop tracking. Commands such as `/pet off`, `/router off` and `/receipt off` control that mod's feature. Disabling unloads the plugin in future sessions. Uninstalling removes its installation in the chosen scope. None of these retroactively changes completed model calls.

From the kit root, choose one:
```bash
bash scripts/manage.sh disable user all
bash scripts/manage.sh uninstall user all
```
For project/local installs run the script from the actual project folder, using the script's full path:
```bash
bash /path/to/kit/scripts/manage.sh disable project all
bash /path/to/kit/scripts/manage.sh disable local all
```
`/path/to/kit` is a placeholder. Repeat for every project where you installed the kit. There is no safe one-command scan of every folder on your computer. The script reports failures rather than claiming everything is off. Close existing sessions, including any started with `--plugin-dir`.

The uninstall helper uses `--keep-data` to avoid silently deleting saved plugin preferences. Review and delete remaining data separately if you want it gone. Remove only the bookmark entries or demo handoffs you intend to remove, not an entire folder that may hold useful work. Do not remove `~/.claude` or unrelated marketplaces.

After uninstalling all kit plugins, you may remove the marketplace through Claude Code's plugin marketplace controls. Keep the downloaded kit as a backup or delete just that extracted folder when you no longer need it.
