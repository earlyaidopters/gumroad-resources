# Troubleshooting

| What you see | What to try |
| :--- | :--- |
| Claude cannot find `claude-code` or load hook modules | Your runtime may not include the required mod API. Check the installed mod-authoring documentation and release. Do not install a similarly named npm package. |
| `/codex-cu` or `/threads` is missing | Confirm `claude plugin list`, then open a new chat. Changes made mid-chat may not load there. |
| No Codex configuration found | Set up computer use in the ChatGPT/Codex Mac app first. Check the paths in INSTALL.md. |
| A ChatGPT update broke the bridge | Inspect the newest local `.mcp.json` and runtime path. Folder discovery alone cannot handle every protocol or API change. |
| App permission was denied | Use the approval pane. Respect the denial; do not route around it. For a test, allow only Calculator and TextEdit. |
| An app is busy in another session | Let that task finish, use another app, or wait for its lease to expire. Do not send competing clicks. |
| Helper login expired | Run `claude auth login` in Terminal, then `/threads setup`. Desktop login and CLI login can differ. |
| Helpers run inline | Check login, tmux and folder trust. Inline helpers are not separate sessions and cannot independently change model. |
| A helper does not show in the sidebar | Check Remote Control support and the session's actual state. Sidebar visibility depends on the account and app. |
| A plan waits | It may be at the review gate you requested. Inspect the handoff and approve or ask for a correction. |
| A helper cost differs from your bill | The pane shows an API-equivalent estimate from usage, not subscription billing. |
| Canvas dragging fails | Use the Calculator/TextEdit demo first. Drag support varies by app and is not needed for that demo. |

## Ask Claude to diagnose, not guess

```text
Inspect this mod’s source, the current plugin-authoring documentation, and the relevant CLI help. Identify the first failing step. Show the exact error without exposing credentials or personal app content. Distinguish a missing tool in this chat from a capability supported elsewhere. Fix one piece, run the focused tests, then tell me which checks passed and which still need a live test. Do not bypass a genuine denial.
```

If you file an issue, include the version, the failing step and a minimal reproduction. Strip usernames, absolute personal paths, app content, transcripts, tokens and approval settings from logs first.
