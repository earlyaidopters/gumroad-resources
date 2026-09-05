import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  validateRequest,
  searchUrl,
  parseCapture,
  toCsv,
  compareAndRecord,
} from "../lib.mjs";
import { scrubSnapshot, readyObservation } from "../capture.mjs";
import {
  normalizeTrip,
  tripKey,
  browserPlan,
  buildCampaign,
  parseMultiCapture,
  rankCampaign,
} from "../optimizer.mjs";
import {
  request,
  fixture,
  fares,
  observedAt,
  multiRequest,
  multiFixture,
  spec,
} from "./fixtures.mjs";
const now = Date.parse(observedAt);
const result = () => parseCapture(request, fixture());
test("requires explicit route and dates; normalizes airports and defaults to one adult", () => {
  for (const k of ["origin", "destination", "depart", "return"]) {
    const r = { ...request };
    delete r[k];
    assert.throws(() => validateRequest(r), /required/);
  }
  assert.throws(() => validateRequest({}));
  assert.throws(() => validateRequest(null));
  const r = validateRequest({ ...request, origin: " sfo ", adults: undefined });
  assert.equal(r.origin, "SFO");
  assert.equal(r.adults, 1);
});
test("rejects invalid dates, equal airports and unsupported settings", () => {
  for (const bad of [
    { depart: "2040-02-30" },
    { return: "2040-01-01" },
    { origin: "San Francisco" },
    { destination: "SFO" },
    { adults: 0 },
    { adults: 2.5 },
    { currency: "USD" },
    { cabin: "economy" },
  ])
    assert.throws(() => validateRequest({ ...request, ...bad }));
});
test("generated URL retains route, full dates, currency and party", () => {
  const u = new URL(searchUrl(request));
  assert.equal(u.hostname, "www.google.com");
  assert.equal(u.searchParams.get("curr"), "CAD");
  assert.match(u.searchParams.get("q"), /SFO.*JFK.*2040.*2 adults/);
});
test("synthetic capture preserves total party price, duration and uncertainty", () => {
  const r = result();
  assert.equal(r.result_count, 5);
  const f = r.results.find((x) => x.price_total_cad === 1200);
  assert.equal(f.price_per_adult_cad, 600);
  assert.equal(f.outbound_duration_minutes, 330);
  assert.equal(f.return_flight_selected, false);
  assert.equal(f.cabin_verified_all_segments, false);
  assert.equal(f.itinerary_url, null);
});
test("full-card warnings survive parsing", () => {
  const r = result();
  assert.equal(
    r.results.find((x) => x.price_total_cad === 1000).self_transfer,
    true,
  );
  assert.equal(
    r.results.find((x) => x.price_total_cad === 1500).overhead_bin_excluded,
    true,
  );
  assert.equal(r.results[0].mixed_cabin_label, "Business Class + Economy");
});
test("each request setting and full calendar year must match", () => {
  for (const [from, to] of [
    ["San Francisco SFO", "San Francisco OAK"],
    ["2 adults", "1 adult"],
    ["Currency CAD", "Currency USD"],
    ["seating class. Business", "seating class. Economy"],
  ]) {
    const c = fixture();
    c.snapshot = c.snapshot.replace(from, to);
    c.observations.forEach((o) => (o.snapshot = c.snapshot));
    assert.throws(() => parseCapture(request, c));
  }
  const c = fixture();
  c.calendar_evidence = c.calendar_evidence.replaceAll("2040", "2041");
  assert.throws(() => parseCapture(request, c), /calendar/);
});
test("visible, unknown or unstable loading cannot become a valid capture", () => {
  assert.equal(
    parseCapture(request, fixture(request, { hiddenLoading: true }))
      .result_count,
    5,
  );
  for (const mutate of [
    (c) => (c.observations[1].loading[0].hidden = false),
    (c) => (c.observations[1].loading = []),
    (c) =>
      (c.observations[0].snapshot = c.observations[0].snapshot.replace(
        "From 900",
        "From 899",
      )),
    (c) => (c.observations = []),
    (c) => (c.retrieved_at = c.observations[0].at),
    (c) => (c.observations[0].at = c.observations[1].at),
  ]) {
    const c = fixture(request, { hiddenLoading: true });
    mutate(c);
    assert.throws(() => parseCapture(request, c));
  }
  assert.equal(
    readyObservation({ at: observedAt, snapshot: fixture().snapshot }),
    false,
  );
});
test("malformed, empty, truncated and foreign-source evidence fails closed", () => {
  for (const mutate of [
    (c) => (c.snapshot = ""),
    (c) => (c.snapshot = c.snapshot.replace('Select flight"', "truncated")),
    (c) => (c.url = "https://example.org/travel/flights"),
    (c) => (c.snapshot = c.snapshot.replace("5 hr 30 min", "unknown")),
  ]) {
    const c = fixture();
    mutate(c);
    c.observations.forEach((o) => (o.snapshot = c.snapshot));
    assert.throws(() => parseCapture(request, c));
  }
});
test("legacy captures retain strict loading checks", () => {
  assert.throws(
    () =>
      parseCapture(request, {
        ...fixture(request, { hiddenLoading: true }),
        schema_version: 1,
      }),
    /loading/,
  );
});
test("duplicate cards do not create duplicate fares", () => {
  const r = parseCapture(
    request,
    fixture(request, { cards: [...fares, fares[0]] }),
  );
  assert.equal(r.result_count, 5);
  assert.equal(r.duplicate_count, 1);
});
test("CSV handles commas and neutralizes spreadsheet formulas", () => {
  const r = result();
  assert.match(toCsv(r), /"Demo Air, Sample Express"/);
  r.results[0].airline = '=HYPERLINK("x")';
  assert.match(toCsv(r), /'=HYPERLINK/);
});
test("account banner is stripped without dropping fare evidence", () => {
  const s = scrubSnapshot(
    '- banner:\n  - button "Google Account: sample@example.invalid"\n- main:\n  - text: fare',
  );
  assert.ok(!s.includes("example.invalid"));
  assert.ok(s.includes("fare"));
});
function observation(price, offset = 0) {
  const r = result();
  r.retrieved_at = new Date(now + offset).toISOString();
  r.results = [
    {
      ...r.results.find((x) => x.price_total_cad === 1200),
      price_total_cad: price,
    },
  ];
  return r;
}
test("eligibility excludes mixed cabins, separate tickets and excessive duration", () => {
  const { report } = compareAndRecord(result(), [], {}, now);
  assert.equal(report.fare.price_total_cad, 1200);
  assert.equal(report.status, "baseline_collecting");
  assert.equal(report.deal_confirmed, false);
});
test("both price-drop thresholds and enough history must pass", () => {
  let h = [];
  for (let i = 3; i > 0; i--) {
    const d = -i * 86400000;
    h = compareAndRecord(observation(5000, d), h, {}, now + d).history;
  }
  assert.equal(
    compareAndRecord(observation(3500), h, {}, now).report.alert,
    true,
  );
  assert.equal(
    compareAndRecord(observation(4500), h, {}, now).report.alert,
    false,
  );
  assert.equal(
    compareAndRecord(observation(3500), h, { drop_cad: 2000 }, now).report
      .alert,
    false,
  );
});
test("duplicate, old, future and out-of-order observations cannot pollute history", () => {
  const h = compareAndRecord(observation(5000), [], {}, now).history;
  assert.equal(
    compareAndRecord(observation(5000), h, {}, now).history.length,
    1,
  );
  for (const offset of [-3600001, 300001])
    assert.throws(() =>
      compareAndRecord(observation(5000, offset), [], {}, now),
    );
  assert.throws(() => compareAndRecord(observation(5000, -1000), h, {}, now));
});
test("continued drops suppress duplicate alerts and alert on a new low", () => {
  let h = [];
  for (let i = 3; i > 0; i--) {
    const d = -i * 86400000;
    h = compareAndRecord(observation(5000, d), h, {}, now + d).history;
  }
  const a = compareAndRecord(observation(3500), h, {}, now);
  assert.equal(
    compareAndRecord(observation(3500, 1000), a.history, {}, now + 1000).report
      .alert,
    false,
  );
  assert.equal(
    compareAndRecord(observation(3000, 1000), a.history, {}, now + 1000).report
      .alert,
    true,
  );
});
test("changed dates, coverage or filters get separate baselines", () => {
  const r = result(),
    h = compareAndRecord(r, [], {}, now).history;
  for (const change of [
    (x) => (x.request.depart = "2040-03-11"),
    (x) => x.results.forEach((f) => (f.notice_coverage = "link_label_only")),
  ]) {
    const x = structuredClone(r);
    change(x);
    assert.notEqual(
      compareAndRecord(x, h, {}, now).report.query_key,
      h[0].query_key,
    );
  }
  assert.notEqual(
    compareAndRecord(r, h, { max_stops: 1 }, now).report.query_key,
    h[0].query_key,
  );
});
test("multi-city shape and chronology are validated", () => {
  assert.equal(normalizeTrip(multiRequest).legs.length, 2);
  assert.equal(tripKey(normalizeTrip(request)), tripKey(request));
  for (const legs of [
    [],
    Array(7).fill(multiRequest.legs[0]),
    [...multiRequest.legs].reverse(),
  ])
    assert.throws(() => normalizeTrip({ ...multiRequest, legs }));
  assert.throws(() => parseCapture(multiRequest, fixture()), /leg-based/);
});
test("multi-city uses a visible form, not an invented private endpoint", () => {
  const p = browserPlan(multiRequest);
  assert.equal(p.route, "visible_form");
  assert.ok(!p.url.includes("tfs="));
});
test("campaign interleaves strategies within a shared browser budget", () => {
  const c = buildCampaign(spec);
  assert.ok(c.planned_searches <= 12);
  assert.equal(
    c.planned_searches,
    c.candidates.reduce((n, x) => n + x.components.length, 0),
  );
  assert.equal(
    new Set(c.candidates.map((x) => x.id)).size,
    c.candidates.length,
  );
  assert.equal(
    buildCampaign({ ...spec, max_searches: 1 }).candidates[0].strategy,
    "baseline",
  );
  assert.ok(c.omitted_candidate_count > 0);
});
test("campaign keeps unknown costs unknown and rejects invalid budgets", () => {
  const c = buildCampaign(spec);
  assert.equal(
    c.candidates.find((x) => x.strategy === "open_jaw").cost_requirements[0]
      .amount_cad,
    null,
  );
  for (const extra of [
    { max_searches: 0 },
    { max_searches: 201 },
    { flex: { depart_days: 15 } },
    { extra_costs_cad: { "origin:OAK": -1 } },
  ])
    assert.throws(() => buildCampaign({ ...spec, ...extra }));
});
test("multi-city evidence validates each leg and keeps quote scope", () => {
  const c = multiFixture();
  const r = parseMultiCapture(multiRequest, c);
  assert.equal(r.results[0].price_total_cad, 1800);
  assert.equal(
    r.results[0].price_scope,
    "entire_multi_city_request_all_adults_from",
  );
  assert.equal(r.results[0].all_legs_selected, false);
  c.calendar_evidence[1] = c.calendar_evidence[1].replace("2040", "2041");
  assert.throws(() => parseMultiCapture(multiRequest, c));
});
test("one-way ingestion is explicitly unsupported", () => {
  assert.throws(
    () =>
      parseMultiCapture(
        { trip_type: "one_way", legs: [multiRequest.legs[0]] },
        multiFixture(),
      ),
    /one-way/,
  );
});
test("ranking never treats missing transfers as free or from-fares as confirmed", () => {
  const ranked = rankCampaign(
    buildCampaign(spec),
    [result(), parseMultiCapture(multiRequest, multiFixture())],
    now,
  );
  const base = ranked.results.find((x) => x.strategy === "baseline");
  assert.equal(base.all_in_estimate_cad, 1200);
  assert.equal(base.alert_eligible, false);
  const jaw = ranked.results.find((x) => x.strategy === "open_jaw");
  assert.equal(jaw.all_in_estimate_cad, null);
  assert.equal(jaw.status, "missing_extra_costs");
});
test("stale observations, wrong quote scopes and partial pairs do not rank as complete", () => {
  const c = buildCampaign(spec);
  assert.equal(
    rankCampaign(c, [result()], now + 3600001).results[0].status,
    "not_fully_searched",
  );
  const r = result();
  r.results.forEach((x) => (x.price_scope = "wrong"));
  assert.equal(
    rankCampaign(c, [r], now).results[0].status,
    "not_fully_searched",
  );
  const split = rankCampaign(c, [result()], now).results.find(
    (x) => x.strategy === "split_oneways",
  );
  assert.equal(split.missing_searches.length, 2);
});
test("CLI reports the browser dependency, imports offline and refuses overwrite", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flight-test-"));
  const cli = fileURLToPath(new URL("../flight-search.mjs", import.meta.url));
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  try {
    const req = join(dir, "request.json"),
      cap = join(dir, "capture.json");
    await writeFile(req, JSON.stringify(request));
    await writeFile(cap, JSON.stringify(fixture()));
    const p = run("search", "--request", req, "--out", join(dir, "plan"));
    assert.equal(p.status, 3, p.stdout);
    assert.equal(JSON.parse(p.stdout).status, "requires_codex");
    const a = [
      "ingest",
      "--request",
      req,
      "--capture",
      cap,
      "--out",
      join(dir, "export"),
    ];
    assert.equal(run(...a).status, 0);
    assert.match(
      await readFile(join(dir, "export/flights.csv"), "utf8"),
      /1200/,
    );
    assert.equal(run(...a).status, 2);
    assert.equal(run("plan", "--out", join(dir, "missing")).status, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
