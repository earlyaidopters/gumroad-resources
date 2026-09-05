# Codex browser workflow for multi-city and open-jaw trips

Use only the supported `mcp__cua_repl.js` browser tools described by the active session. Follow BROWSER-RUNBOOK.md for general permissions, capture integrity and failure handling. Shell code cannot access the internal browser.

1. Open the `browser-plan.json` URL in the internal browser. Select Multi-city through the visible ticket-type control. Do not try to encode Google's private `tfs` format. A natural-language multi-city URL was tested and failed to initialize the form.
2. Set every origin and destination through its combobox and select the exact airport option. Google can auto-populate the next origin or omit an airport code until results load; inspect each new state and verify all airport codes after Search. Add flights through Add flight when needed. Requests permit 2–6 legs, but only two-leg execution has been live-tested.
3. Fill each `Departure` textbox in observed leg order with an explicit date including year, then press Tab. Inspect the updated state after each change. Dates may cascade to later legs. Set Business, the requested adult count, and CAD; then Search.
4. Wait for the initial `Top flights to ...` results. Multi-city in the tested UI has no Best/Cheapest tabs. Capture the initial leg page, before selecting any flight. Do not treat a later-leg selection screen as a new independent quote: its displayed price covers the full multi-city request.

```js
let tripCapture = {
  schema_version: 2,
  retrieved_at: new Date().toISOString(),
  url: await flightTab.url(),
  snapshot: (await flightTab.playwright.domSnapshot()).split('\n')
    .filter(x => /combobox|textbox|Prices include|link "From |Currency CAD|heading "|Loading|Fetching|Change departing flight|Choose trip to/.test(x)
      && !x.includes('Google Account')).join('\n'),
  calendar_evidence: []
};
```

5. For each leg, open that leg's Departure field, inspect the calendar, and preserve the selected gridcell line including the full date and year. From the observed calendar, capture:

```js
tripCapture.calendar_evidence.push((await flightTab.playwright.domSnapshot())
  .split('\n').filter(x => /gridcell .*\[selected\]/.test(x)).join('\n'));
```

Use the observed Back button to close without changing dates, inspect the next state, and continue to the next leg. Emit `JSON.stringify(tripCapture)` and save it verbatim with filesystem tools. Run `trip-ingest` using the exact request. Missing airport codes, dates or loading indicators fail validation; do not strip them to make the parser pass.

## Reviewing a promising candidate

Select one flight per requested leg; selection alone is a search action. At each stage record the entire-trip price, mixed cabins, airport transfers and separate-ticket labels. Stop at the itinerary/booking-options summary. Do not press Continue, purchase, reserve or enter traveler/payment information.

Expand every flight's details. Check all segment airports, dates, cabins, aircraft/seat description, total durations, bags and the displayed airline-direct option. Preserve both the first-screen and final-selection evidence. Price all missing ground/domestic segments. For separate-ticket options, actual arrival timestamps and planned buffer—not date order alone—must establish feasibility. User identity, transit eligibility and fare protections cannot be guessed.

Only call a result a confirmed *search quote* after all required parts and costs are present and the page has settled; it still is not a booking. If a Loading indicator remains, report the displayed option as provisional and keep it out of verified-deal alerts. The current automated parsers export preliminary cards; detailed review is a Codex browser task.

One-way form and card syntax were also observed, but a persistent Loading indicator prevented a completed live ingestion test. One-way component requests remain planning-only and are rejected by `trip-ingest` until a validated adapter is added.
