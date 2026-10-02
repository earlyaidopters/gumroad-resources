# Start here: your first mod

**No development experience required. Start with the pet, then add what you need.**

## 1. Open the guide without installing anything
Open **VIEWER-GUIDE.html** in your browser. It works offline, has every command and creation prompt, and includes a search box. Or open **CLAUDE-MODS-VIEWER-GUIDE.pdf**. Neither runs or installs a mod.

## 2. Check the app
These are community mods for **Claude Code**, tested with CLI version **2.1.287** on macOS on October 2, 2026. They are not browser extensions or add-ons for ordinary Claude chat. You need an installed, signed-in Claude Code with mods support and a supported plan or API account. Check official setup: https://code.claude.com/docs/en/quickstart

Open Terminal and run:
```bash
claude --version
```
If that command is missing, follow official setup first. You also need Git for marketplace installation and some project features. The helper scripts use Bash and Python 3. Check with `git --version` and `python3 --version`. Windows users: the shell workflow assumes WSL; Windows and Linux have not been live-tested. Output Tray's Open/Reveal buttons currently require macOS.

## 3. Try one mod without a lasting install
Unzip this kit, open Terminal, type `cd ` (including the space), drag the extracted **claude-mods-starter-kit** folder into Terminal, and press Return. Then run:
```bash
bash scripts/try.sh terminal-pet
```
The script copies a tiny sample project into a new temporary folder and starts Claude Code there with only this kit's Pet plugin requested. Existing user plugins/settings may still load. It does not change your normal plugin settings or overwrite a prior demo. Review any normal folder-trust prompt.

In the Claude prompt, enter:
```text
/pet party
```
You should see the pet celebrate. Next use `/pet off` to hide it. Type `/exit` to leave the temporary session. Temporary files stay in the printed folder until you choose to remove them or your system clears them.

## 4. Install for all your projects
Run these in Terminal:
```bash
claude plugin marketplace add promptadvisers/claude-mods-starter-kit --scope user
claude plugin install terminal-pet@claude-mods-kit --scope user
```
Then start a fresh Claude Code session. For a local ZIP-only install, from the extracted kit root use `claude plugin marketplace add . --scope user` instead. Keep that folder in a stable location while using the local marketplace.

## 5. Prefer one project?
Open Terminal in that project's folder. Add the marketplace and install using project scope:
```bash
claude plugin marketplace add promptadvisers/claude-mods-starter-kit --scope project
claude plugin install terminal-pet@claude-mods-kit --scope project
```
Project settings can be shared with collaborators; review them before committing. A private choice for only this project uses `--scope local` instead. Do not install every scope just in case: pick the scope you actually want.

## 6. Desktop is a separate running session
Choose the same project folder in the **Claude Code** area of the desktop app and start a fresh code session after installation. Fully quit and reopen if it still has old settings. A `claude --plugin-dir ...` terminal launch does not add a mod to an already open desktop chat. A normal Claude conversation is not the same thing as a Claude Code project session. Support varies by version and surface; a mock UI test is not proof of a live desktop result.

## 7. Choose your next mod
Read the guide or README catalog. Try the Context Meter next; then Heatmap, Timeline, Output Tray and Receipt. Router changes model selection. Handoff writes files and can make a model call. Choose those deliberately.

## 8. Switch this kit off
From the extracted kit root:
```bash
bash scripts/manage.sh disable user all
```
For a project install, run `bash /path/to/kit/scripts/manage.sh disable project all` from that project folder. Replace `/path/to/kit` with the actual extracted folder path; dragging the script into Terminal is an easy way to get it. Repeat with `local` if that is where you installed it. Then close old sessions. This targets the ten plugins in this kit, not unrelated plugins.

**Next:** [Scopes and troubleshooting](guides/SETUP-AND-TROUBLESHOOTING.md) · [Build your own](guides/BUILD-YOUR-OWN.md) · [Data and removal](guides/DATA-AND-REMOVAL.md)
