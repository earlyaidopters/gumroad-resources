# Setup: Choose One Route

## Route A: Manual Exchange (Start Here)

Open the same task brief and artifact in two assistants you are allowed to use. Ask one to draft and the other to review. Move only the minimum necessary text between them. This route needs no plugin and works even when a desktop session cannot invoke another CLI.

Before sharing project data, check your employer's or client's provider policy. A second model is another data destination, not just another opinion.

## Route B: Installed CLIs

Install and sign into each tool through its official instructions. Authenticate in the normal interactive interface; never put tokens into a prompt or this repository. Check availability:

```bash
claude --version
codex --version
```

Run the prompts from the relevant project directory. In a terminal-capable assistant, ask it to invoke the other installed CLI with the task brief and artifact. Specify an available model and supported effort level, and inspect the returned metadata rather than trusting the prompt alone.

For a direct read-only Codex review, create a `plan-v1.md` in your project, change into that project, then run:

```bash
codex exec --sandbox read-only \
  --output-last-message review.md \
  'Read plan-v1.md. Review it for correctness gaps and missing tests. Do not change project files. Report evidence, impact, and the smallest fix.'
```

The model's workspace access is read-only here. The CLI itself writes the final response to `review.md`; choose a new filename if that file already contains work you want to preserve. The example uses your configured model. Select a model explicitly using the installed CLI's supported `--model` value when needed; marketing names are not guaranteed CLI IDs. Do not add permission-bypass flags to make a failure disappear.

For the reverse direction, use prompt 2 in [PROMPTS.md](../PROMPTS.md), or open a separate Claude session and provide only the relevant plan. Review `claude --help` before scripting version-specific noninteractive behavior.

## Route C: Official Codex Plugin for Claude Code

Optional. Follow the [official repository](https://github.com/openai/codex-plugin-cc). Commands checked September 26, 2026:

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

Then, inside a Git project with the correct base branch:

```text
/codex:review --base main
```

The plugin's review is read-only. It reports findings; ask the builder separately to make approved fixes. Setup needs the plugin's prerequisites and authenticated Codex access. Check upstream for current requirements and supported flags.

The plugin also offers session transfer. That is different from this kit's curated handoff file: transferring a conversation can expose substantially more history. Inspect what will be shared and follow your data policy.

## Install the Two Skills

The kit supplies project-local instruction files for `handoff` and `prime`. It does not install either CLI, the plugin, a model, or an account. Python 3.9+ is sufficient for the installer.

1. Download or clone this kit.
2. Choose an existing project directory. Do not point the installer at your home folder.
3. From the kit directory, preview the destinations:

```bash
python3 scripts/install_skills.py --project /path/to/your/project --target both
```

4. Inspect any existing personal or organization-provided skills named `prime` or `handoff`. Their precedence can differ by client. This installer does not inspect or modify global configuration.
5. Apply only if these are the intended destinations:

```bash
python3 scripts/install_skills.py --project /path/to/your/project --target both --apply
```

Destination map:

| Target | Paths relative to your project |
| --- | --- |
| Claude Code | `.claude/skills/handoff/SKILL.md`, `.claude/skills/prime/SKILL.md` |
| Codex | `.agents/skills/handoff/SKILL.md`, `.agents/skills/prime/SKILL.md` |

For manual installation, copy the two skill folders into the appropriate directory above. Do not merge into an existing same-name folder. Open a new session in the target project; Claude Code also supports `/reload-skills`. Verify the skill description matches this kit before invoking it. In Claude Code use `/handoff` and `/prime`; in Codex use `$handoff` and `$prime` when discovered by that client.

### Existing Skill Names

The installer refuses a different existing file, existing symlink, or populated skill directory. Identical kit files are left unchanged. It checks every destination before writing anything, so a known conflict does not cause a partial install.

A personal Claude Code skill of the same name can override a project skill. If a collision exists, do not overwrite the personal version. Use the manual prompts, or intentionally rename both the public folder and YAML `name` to `workflow-handoff` / `workflow-prime` and use those invocation names. The installer intentionally does not automate renaming or precedence changes.

### First Run and Removal

Use a disposable practice project first. Ask `handoff` for a sanitized snapshot, inspect it, then ask `prime` to summarize it in a fresh session. A correct prime run does not edit files or execute old tasks.

For removal, inspect the installed folders and remove only this kit's files you intentionally installed. Keep your handoff history unless you choose otherwise. No global settings need undoing. Add `handoff/` to the receiving project's `.gitignore` if those notes should remain private; the installer does not modify that file for you.
