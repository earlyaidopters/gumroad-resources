# Search more combinations without inventing savings

Start with an exact round trip. Then add a small number of date or airport alternatives. The planner creates candidate requests; it does not search or price them by itself.

## Build a campaign

Copy `examples/optimizer.json`, replace its example dates with your future dates, and run:

```sh
node flight-search.mjs explore --spec examples/optimizer.json --out runs/campaign
```

The result includes `campaign.json`, a CSV overview, and individual request files. `max_searches` counts browser searches, so a candidate with two component requests consumes two units. Strategies are interleaved to prevent a large date grid from using the entire budget. Omitted combinations are counted.

| Strategy | What to supply | Cost that must not disappear |
| --- | --- | --- |
| Flexible dates | Departure and return windows | Extra nights and actual arrival time |
| Alternate airports | Explicit origin/destination choices | Ground transport, parking or positioning |
| Open jaw | Fly into one city, return from another | Travel between those cities |
| Multi-city | Two to six chronological legs | Gaps between nonmatching airports |
| Positioning | A separate feeder round trip | Hotels, bags, buffers and separate-ticket risk |
| Two one-ways | Both directions | Full-party prices for both tickets |

Keep unknown `extra_costs_cad` values as `null`. Enter zero only after establishing that no additional cost applies.

Use the visible date grid and airport controls to narrow candidates, then capture exact searches through the supported browser. Do not mechanically load every planned URL. One-way capture is not implemented; those candidates remain incomplete.

## Open-jaw and multi-city requests

```sh
node flight-search.mjs trip-plan --request examples/open-jaw.json --out runs/open-jaw
```

Follow [MULTICITY-RUNBOOK.md](MULTICITY-RUNBOOK.md). This path uses the visible form. Only two-leg live execution has been checked; three-to-six-leg handling is a planning capability, not a claim of tested browser coverage.

## Rank completed observations

Create `observations.json` with paths relative to that file:

```json
{"results":["runs/search-a/flights.json","runs/search-b/flights.json"]}
```

```sh
node flight-search.mjs rank --campaign runs/campaign/campaign.json \
  --manifest observations.json --out runs/ranking
```

Ranking keeps known-cost estimates first. It rejects stale observations and wrong price scopes, marks partial component pairs as incomplete, and leaves `all_in_estimate_cad` null when extra costs are unknown. Automated rankings have `alert_eligible:false`. Inspect every selected leg and ticket condition before treating a candidate as a complete travel option.
