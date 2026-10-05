# Verification record

Snapshot date: 5 October 2026. Local runner: Claude Code 2.1.289, macOS.

| Check | Result | What it proves |
| :--- | :--- | :--- |
| Threads mod tests | 102 passed | Simulated engine behavior for sessions, reports, plans, worktrees, pane and controls |
| Computer Use mod tests | 7 passed | Simulated routing, approval panel, caller identity and lifecycle behavior |
| Setup tests | 4 passed | Empty approvals, existing-file protection, spaces in paths and component selection |
| Bridge integration tests | 3 passed | Actual daemon against a fake MCP child: session state, reset, approvals, app leases and release |
| Plugin and marketplace validation | Passed, no warnings | Manifests and hook declarations accepted by the installed runtime |
| Local prerequisites | Passed | Required local CLI, tmux, login and computer-use paths found on the packaging machine |
| Fresh package tests | See DELIVERY-CHECKS.json | Exported/unpacked files can be loaded and tested independently of the original folders |
| Final video behavior | Recorded in creator-supplied transcript | Calculator/TextEdit result and Threads panel/session demo were shown in the recording |
| New-machine installation and live native-app replay | Not performed | Must be checked on the recipient’s supported setup |

Run the checks yourself:

```bash
claude plugin validate .
claude plugin validate plugins/threads
claude plugin validate plugins/codex-computer-use
claude plugin test plugins/threads
claude plugin test plugins/codex-computer-use
python3 -m unittest discover -s tests
node --test tests/bridge.test.mjs
```

The existing mod suites import the compatible Claude runtime’s `claude-code/testing`; Node alone cannot run them. Bridge tests require a current Node with `node:test` and never open desktop apps. They use a temporary local socket and fake MCP process.

## Packaging changes from the working source

- Selected source files only; excluded generated provider type declarations, previews, internal trace notes, logs, registries, user settings and approvals.
- Changed a Threads update-command label from the creator’s local marketplace to `two-mods`.
- Clarified one launcher comment: newest-folder discovery is not a future compatibility guarantee.
- Added marketplace manifest, setup helper, documentation, tests and sample prompts/project.
- Fresh approval settings are created during installation, with no allowed apps and auto-approve off. Existing user choices are never exported.

The original mod versions and behavior are retained. Source snapshot hashes identify the pre-packaging exports. No runtime, subscription, account entitlement or provider SDK implementation is redistributed.
