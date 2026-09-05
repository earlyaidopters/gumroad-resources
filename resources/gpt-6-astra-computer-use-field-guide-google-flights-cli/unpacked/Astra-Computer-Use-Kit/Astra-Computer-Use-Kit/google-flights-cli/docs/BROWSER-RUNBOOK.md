# Fast supported browser runner

Live retrieval requires Codex desktop with `mcp__cua_repl.js` and the internal browser. The shell alone cannot fetch prices. The runner uses only the supported tab passed to it; it has no browser launcher, network client, CDP connection, or profile access.

1. Run `node flight-search.mjs run --from AIRPORT --to AIRPORT --depart YYYY-MM-DD --return YYYY-MM-DD --adults 2 --cabin business --currency CAD --out UNIQUE_RUN_DIR`.
2. The command prints three `steps` with exact tool code. Execute step 1 alone in `mcp__cua_repl.js` and read the returned documentation/state. This opens the parameterized search. If this CUA session already has a known usable flight tab, navigating that tab to the generated search URL is also supported; inspect the new state.
3. Execute step 2 in the same CUA session. It imports the shipped local runner, creates a job, and selects Cheapest using fresh DOM evidence. Read the returned state.
4. Execute step 3. The runner checks visibility of loading indicators, compares two full-card snapshots across the browser’s built-in readiness check, verifies both full calendar dates, closes the calendar, rechecks the cards, then directly writes capture.json, flights.json, flights.csv and metrics.json. It imports the same parser used by CLI ingest. No manual JSON reconstruction, source-label parsing, capture copying, or separate ingest command is needed.
5. If the response is a waiting state, inspect the state and retry step 3; rely on the browser’s built-in waiting. Stop on errors and retain failure.json. There is a 12-call / 120-second job budget. A challenge or changed UI requires inspection; do not bypass it. A terminal error may need a fresh unique run directory. Never strip loading text, fake calendar evidence, or relabel an old capture as current.

The expected happy path is one plan command and three browser tool calls. Loading can require additional calls. The runner uses the supported browser’s readiness checks without fixed sleeps or a long timeout on generic hidden text. Every browser interaction uses the supported CUA tab's documented Playwright-style API; DOM evaluation is read-only and limited to observed loading elements and ancestors.

The runner automatically retains full card warning text, including sibling separate-ticket notices, and strips the account banner. All-segment cabin and return itinerary remain unverified. Initial Cheapest coverage stays unexpanded. A populated page does not guarantee a confirmed bookable itinerary.

For replay/debugging, `ingest --request RUN/request.json --capture RUN/capture.json --out NEW_DIR` remains available. Version-3 captures include visibility and stability evidence; old version-1 captures keep strict legacy loading checks. Replays preserve original retrieval times. Full-card captures use a separate history baseline from old label-only captures.

For alerts, run `check --result RUN/flights.json --history PATH` after success. A candidate still requires segment and ticket verification. No booking or messaging actions exist in the runner.

Multi-city requests continue to use MULTICITY-RUNBOOK.md. The fast runner currently accelerates supported round trips; do not claim that multi-city has the same performance until measured.
