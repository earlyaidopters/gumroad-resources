# Privacy and permissions

## What is not in the download

No login data, API keys, cookies, personal home paths, saved app approvals, session transcripts, thread registry, runtime logs or desktop screenshots were exported. Only an explicit list of source, prompt and test files was copied from the working installation. The repository contains conceptual artwork rather than screenshots of the creator's account.

## What happens on your computer

Computer Use can read an app's visible accessibility content, including content you did not ask it to quote. Start with clean apps. The bridge communicates with the locally installed runtime over a local Unix socket. This does not mean the whole AI task is offline; Claude and the connected services operate under their usual data terms.

Fresh bridge settings contain `apps: []` and `autoApproveAll: false`. Allow this session, always allow and deny are separate choices. `/codex-cu auto on` broadens access across apps; it is not required for the demo. Turn it off with `/codex-cu auto off`. Clearing saved apps does not itself turn auto-approve off.

Threads saves its registry and events in `~/.claude/threads/`, plan records in its `plans/` directory, and handoff notes in the working project. Claude also maintains its usual session logs. Do not commit these into a shared project.

The filmed Threads configuration uses `bypassPermissions` for new sessions. It can run tools without stopping for normal permission prompts. Use a disposable project, or change to `/threads mode default` before creating helpers. Worktrees separate files but are not a security sandbox.

The package does not borrow credentials, modify the Claude desktop app's own files, or script typing into the Claude desktop window. The fallback steering mechanism types into the helper's own tmux terminal. Provider-enforced restrictions still apply.
