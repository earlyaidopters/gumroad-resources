# When a run stops

| Symptom | What to do |
| --- | --- |
| `requires_codex` | Planning succeeded. Execute the returned steps inside a Codex task with the supported computer-use browser. |
| Browser tool or local module import unavailable | Use the offline demo, or switch to a Codex environment that exposes the required capabilities. Do not run the CUA snippet in Node. |
| `origin is required` or a date is missing | Supply your route and dates; the public tool has no personal defaults. |
| Unsupported cabin/currency | This adapter currently accepts business and CAD only. |
| `EEXIST` | Use a new output directory. Do not remove earlier evidence merely to reuse a name. |
| Loading or stability check fails | Inspect the actual UI. Retry the next step only if the returned state asks for it. Stop if the job budget is exceeded. |
| Calendar date/year mismatch | Check the visible request and calendar. Start a fresh run after correcting them. |
| Account login or a challenge | Handle it yourself in the visible supported UI. The tool does not bypass challenges. |
| `Capture must be less than 60 minutes old` | Fetch fresh data for alerts. Offline replay preserves its original timestamp. |
| `.lock` exists | Check for a running writer. Remove an abandoned lock only after confirming no process is writing. |
| No eligible fares | The cards may all violate cabin, transfer, stop or duration rules. This is not a zero-dollar result. |

For a parser bug, open an issue with the failed check, Node version, and a minimal synthetic or carefully redacted example. Include expected versus actual behavior.
