# Troubleshooting

| Symptom | Check | Next step |
| --- | --- | --- |
| `codex` or `claude` is not found | CLI installation and terminal PATH | Use official installation docs; reopen the terminal. Manual exchange still works. |
| Authentication fails | Correct account and normal sign-in flow | Sign in interactively. Never paste a token into a review prompt. |
| Model or effort is rejected | Available IDs and values in this tool version | Select a supported option and record it. Do not silently claim the requested model ran. |
| Plugin commands do not appear | Marketplace, install, reload, setup | Follow upstream instructions; do not install unrelated similarly named plugins. |
| Review cannot find the plan | Current project directory and filename | Confirm the actual path. Share the task brief alongside the artifact. |
| Reviewer changed files | Tool mode and requested permissions | Stop; inspect the diff. Do not discard anyone else's changes. Use a read-only session. |
| Review loop never ends | Success condition and round cap | Stop after two rounds; summarize unresolved decisions for the owner. |
| No image or computer-use tool | Actual session tools, not just installed CLI | Use a supported environment or manual route. Do not invent a completed result. |
| Skill does not appear | Folder, YAML name, reload, working directory | Start a fresh project session; verify the skill description. |
| Wrong `prime` skill runs | Personal or organization name collision | Keep existing skills intact; use manual prompts or deliberate alternate names. |
| Installer reports a conflict | Existing destination or symlink | Inspect it. Choose another practice project; never force an overwrite. |
| Prime cannot find a snapshot | Pointer contents and relative target | Repair the pointer manually after verifying the intended file. No external paths. |
| Prime recap disagrees with Git | Snapshot age and current changes | Trust verified current state; explain the discrepancy and write a new handoff later. |
| A requested time cap is ignored | Whether the environment enforces timeouts | Use a real external/runtime control or supervised checkpoints. |

When reporting a problem, include a sanitized reproduction with a tool version and expected result. Never attach private handoffs, credentials, raw session dumps, or customer data.
