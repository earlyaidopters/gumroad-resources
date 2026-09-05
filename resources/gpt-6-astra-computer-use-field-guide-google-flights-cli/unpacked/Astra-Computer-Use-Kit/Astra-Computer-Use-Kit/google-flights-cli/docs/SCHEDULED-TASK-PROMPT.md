# Adapt this after an interactive search works

This is a prompt template, not an installed schedule. Unattended browser availability is unverified. Configure a schedule only if the chosen environment exposes the same supported Codex computer-use browser and can access your local repository.

```text
At <SCHEDULE>, run the flight-search workflow in <REPOSITORY_PATH>
using <FAVORITES_JSON>. Read README.md and docs/BROWSER-RUNBOOK.md.

For each favorite, use a fresh timestamped run directory. Execute
the exact supported browser steps printed by the run command.
Inspect the returned states; stop on unavailable browser access,
login requirements, challenges, changed controls or failed checks.
Never fabricate a fresh capture from an old result.

After successful retrieval, run check against <HISTORY_PATH> with
<DROP_PERCENT>, <DROP_CAD>, <MINIMUM_SAMPLES> and <LOOKBACK_DAYS>.
Treat exit code 10 as a candidate alert, not an execution failure.

Keep unchanged prices and baseline collection quiet. Notify me
in this task only for a new candidate alert or a failure needing
my attention. Include the route, dates, total CAD price for the
party, prior median, change, source link and retrieval time.
State that the return itinerary and all-segment cabins still
require verification. Report expired configured dates.

Search only. Do not book, enter payment information, enable
Google notifications, message other people or add schedules.
```
