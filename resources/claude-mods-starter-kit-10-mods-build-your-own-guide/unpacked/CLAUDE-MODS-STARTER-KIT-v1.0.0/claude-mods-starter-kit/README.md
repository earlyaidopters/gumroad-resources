<p align="center"><img src="assets/cover.jpg" alt="Claude Mods Starter Kit: ten mods, clear guides, build your own" width="100%"></p>

# Make Claude Code feel like yours

**Ten working-source mods. Ten complete creation prompts. A beginner guide that tells you where to type every command.**

A mod is the change you want. A plugin is the package that carries it into Claude Code. Start with a little pet, see your work on a timeline, find the files Claude made, and leave yourself a useful place to resume.

[Start here](START-HERE.md) · [Download the PDF](CLAUDE-MODS-VIEWER-GUIDE.pdf) · [Build your own](guides/BUILD-YOUR-OWN.md) · [Turn everything off](guides/DATA-AND-REMOVAL.md)

## Your first win
With Claude Code installed and signed in, run in Terminal:
```bash
claude plugin marketplace add promptadvisers/claude-mods-starter-kit --scope user
claude plugin install terminal-pet@claude-mods-kit --scope user
```
Start a fresh Claude Code session. In its message box, type `/pet party`. To hide it, type `/pet off`.

Want a temporary trial instead? Download the kit, open Terminal in the extracted folder, and run `bash scripts/try.sh terminal-pet`. A new demo folder is created; your normal plugin settings are not changed.

## Pick the change you want
| Mod | Why use it? | Start here, inside Claude Code |
|---|---|---|
| [Terminal Pet](guides/01-terminal-pet.md) | A little company while Claude works. | `/pet on` |
| [Coral Skin](guides/02-coral-skin.md) | Make the work easier to scan. | `/skin on` |
| [Context Meter](guides/03-context-meter.md) | See how full the conversation is. | `Automatic: no slash command.` |
| [Repo Heatmap](guides/04-repo-heatmap.md) | See which files Claude touches. | `/heatmap open` |
| [Flight Recorder](guides/05-flight-recorder.md) | See the work unfold on a timeline. | `/timeline open` |
| [Model Router](guides/06-model-router.md) | Choose a lighter model for helper work. | `/router on` |
| [Output Tray](guides/07-output-tray.md) | Find the files Claude just made. | `/tray show` |
| [Changes Receipt](guides/08-changes-receipt.md) | Get a clear list of what changed. | `/receipt on` |
| [Session Bookmarks](guides/09-session-bookmarks.md) | Leave yourself a useful “come back here” note. | `/bm save Login walkthrough` |
| [Auto Handoff](guides/10-auto-handoff.md) | Leave the next chat a useful starting point. | `/autohandoff` |

Each linked guide has a user install, a project install, temporary launch, controls, demo prompt, off switch, limitations and full rebuild specification.

## What's inside
- **VIEWER-GUIDE.html**: searchable, offline guide with copy buttons. Download it before opening; GitHub shows HTML source.
- **CLAUDE-MODS-VIEWER-GUIDE.pdf**: illustrated reference you can keep beside your screen.
- **prompts/**: ten complete, editable build specifications.
- **plugins/**: the actual source, manifests and tests. No personal settings or chat exports.
- **demo-project/**: a fictional login flow you can explore without using your own work.
- **scripts/**: temporary demo, targeted install/disable/uninstall and checks.
- **templates/starter-mod/**: a tiny event-driven mod to learn from.

## How the pieces fit
![Event to mod to result](assets/how-it-works.svg)

Claude Code reports an event. The mod handles it. Your screen or workflow changes. Some changes only draw information. Others write files or affect which model runs. The guide tells you which is which.

## Compatibility and honest limits
Release 1.0.0, checked with Claude Code 2.1.287 on macOS, October 2, 2026. These are community mods for Claude Code, not ordinary Claude web chat. Host APIs and model availability can change. Unit tests include simulated terminal/desktop surfaces; they are not an end-to-end desktop certification. Output Tray's Open/Reveal uses macOS. A helper routed to a cheaper model can give a different answer. Cost figures are estimates, not subscription charges. See [verification](VERIFICATION.md).

## Add several, or turn the kit off
After adding the marketplace, from the downloaded kit root:
```bash
bash scripts/manage.sh install user all
```
This explicitly installs all ten, including routing and automatic handoff. Start with one if you only want visual changes. Open one side panel at a time.

To disable only this kit at user scope:
```bash
bash scripts/manage.sh disable user all
```
Then close old sessions. Project/local installs need the same action in the actual project folder with that scope. [Full removal guide](guides/DATA-AND-REMOVAL.md).

## Build your own
Open a file in `prompts/`, copy the whole specification, and ask Claude Code to build it in a new folder. Each prompt defines behavior, controls, failure cases and acceptance checks. Run `bash scripts/check.sh` to validate the shipped kit. A strong prompt makes a build clearer; it does not replace testing.

## Keep learning
[Early AI Adopters](https://www.skool.com/earlyaidopters/about) · [Prompt Advisers](https://promptadvisers.com)

Independent community project. Not affiliated with or endorsed by Anthropic. Original mods were built with Claude Code; this distribution and guide were prepared with Codex. MIT-licensed source; see LICENSE. No model subscription or API credit is included.
