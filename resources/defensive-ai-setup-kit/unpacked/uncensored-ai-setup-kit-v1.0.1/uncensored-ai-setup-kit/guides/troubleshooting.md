# Fix the smallest broken layer

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

| Symptom | Check first | Next action |
| --- | --- | --- |
| Connection refused | Is the server running at the right port? | Run server status; keep localhost settings consistent |
| 401 or 403 | Correct key and account permissions? | Enter the key privately; do not print it in a report |
| Models list empty | Does the endpoint implement `/v1/models`? | Check provider docs and manually confirm the exact model ID |
| Greeting works, tools fail | Does this model/runtime support tool calls? | Run the harmless function test; inspect the chat template |
| Screenshot ignored | Is vision enabled with a matching projector? | Run the synthetic-image check separately |
| Model fails to load | Enough free memory and compatible runtime? | Reduce context or model size; do not repeatedly force OOM |
| Harness keeps old model | Existing sessions can keep their model | Start a new test session and confirm selection |
| MCP listed but no result | Did a real tool call succeed? | Inspect the server startup and one bounded test |
| Cloud still billed | Compute stopped, or just the app? | Confirm the Pod is EXITED; review storage charges separately |
| Idle guard did nothing | Did all requests pass through it; was it awake? | Keep manual stop/budget controls and inspect the guard status |

If a change fails, roll back only what you changed. Preserve working profiles and original files. Never solve a connection issue by exposing an unauthenticated endpoint or pasting a key into a public issue.
