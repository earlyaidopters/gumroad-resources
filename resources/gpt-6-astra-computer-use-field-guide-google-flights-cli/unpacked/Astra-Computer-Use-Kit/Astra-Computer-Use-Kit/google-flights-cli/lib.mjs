import { createHash } from "node:crypto";
import { fareBlocks, validateReadiness } from "./capture.mjs";

export const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
const fail = (message) => {
  throw new Error(message);
};
const required = (ok, message) => ok || fail(message);
export function dateLabel(value, full = false) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...(full
      ? { year: "numeric", month: "long", day: "numeric" }
      : { weekday: "short", month: "short", day: "numeric" }),
  }).format(new Date(value + "T12:00:00Z"));
}
export function validateRequest(input = {}) {
  required(
    input && typeof input === "object" && !Array.isArray(input),
    "Request must be an object",
  );
  required(
    !input.legs && (!input.trip_type || input.trip_type === "round_trip"),
    "Use trip-plan/trip-ingest for a leg-based request; do not silently reduce multi-city to round trip",
  );
  for (const k of ["origin", "destination", "depart", "return"])
    required(
      typeof input[k] === "string" && input[k].trim().length > 0,
      `${k} is required; supply your own route and dates`,
    );
  const r = {
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    depart: input.depart,
    return: input.return,
    adults: Number(input.adults ?? 1),
    cabin: input.cabin ?? "business",
    currency: input.currency ?? "CAD",
    view: "cheapest_initial",
  };
  for (const k of ["origin", "destination"]) {
    r[k] = r[k].toUpperCase();
    required(
      /^[A-Z]{3}$/.test(r[k]),
      `${k} must be a three-letter airport code`,
    );
  }
  required(r.origin !== r.destination, "Origin and destination must differ");
  for (const k of ["depart", "return"]) {
    required(/^\d{4}-\d{2}-\d{2}$/.test(r[k]), `${k} must be YYYY-MM-DD`);
    const d = new Date(r[k] + "T12:00:00Z");
    required(
      Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === r[k],
      `Invalid ${k} date`,
    );
  }
  required(r.return > r.depart, "Return must be after departure");
  required(
    Number.isInteger(r.adults) && r.adults >= 1 && r.adults <= 9,
    "Adults must be 1–9",
  );
  required(
    r.cabin === "business",
    "This adapter currently supports business class only",
  );
  required(r.currency === "CAD", "This adapter currently supports CAD only");
  return r;
}
export function searchUrl(r) {
  const query = `Round trip flights from ${r.origin} to ${r.destination} ${dateLabel(r.depart, true)} returning ${dateLabel(r.return, true)} business class ${r.adults} adults`;
  return (
    "https://www.google.com/travel/flights?" +
    new URLSearchParams({ q: query, curr: r.currency, hl: "en" })
  );
}
export function parseCapture(input, capture) {
  const r = validateRequest(input);
  required(
    [1, 3].includes(capture.schema_version) &&
      typeof capture.snapshot === "string",
    "Unsupported capture; expected schema_version 1 or 3 and snapshot text",
  );
  const s = capture.snapshot.replace(/ \[active\]/g, "");
  required(
    Number.isFinite(Date.parse(capture.retrieved_at)),
    "Capture has no valid retrieval timestamp",
  );
  const url = new URL(capture.url);
  required(
    url.protocol === "https:" &&
      url.hostname === "www.google.com" &&
      url.pathname.startsWith("/travel/flights"),
    "Unexpected source URL",
  );
  if (capture.schema_version === 3) validateReadiness(capture);
  else
    required(
      !/Loading results|Fetching results|Checking prices from multiple sources/i.test(
        s,
      ),
      "Search is still loading; do not import stale cards",
    );
  for (const text of [
    "Change ticket type. Round trip",
    "Change seating class. Business",
    `Currency ${r.currency}`,
    `Prices include required taxes + fees for ${r.adults} adult`,
  ])
    required(s.includes(text), `Missing verified UI setting: ${text}`);
  for (const [label, key] of [
    ["Where from?", "origin"],
    ["Where to?", "destination"],
  ])
    required(
      s
        .split("\n")
        .some(
          (l) =>
            l.includes('combobox "' + label) && l.includes(" " + r[key] + '"'),
        ),
      `Airport mismatch: ${key}`,
    );
  required(
    s.includes(`textbox "Departure": ${dateLabel(r.depart)}`) &&
      s.includes(`textbox "Return": ${dateLabel(r.return)}`),
    "Visible dates do not match request",
  );
  required(
    capture.calendar_evidence?.includes(
      `departing on ${dateLabel(r.depart, true)} and returning on ${dateLabel(r.return, true)}`,
    ),
    "Missing exact calendar date/year evidence",
  );
  required(
    s
      .split("\n")
      .some((l) => l.includes('tab "Cheapest') && l.includes("[selected]")),
    "Cheapest tab must be selected",
  );
  const raw = [...s.matchAll(/^\s*- link "(From .+?Select flight)"\s*$/gm)].map(
    (m) => m[1],
  );
  required(
    raw.length ===
      s.split("\n").filter((l) => /^\s*- link "From /.test(l)).length,
    "Incomplete flight card; capture must not be truncated",
  );
  required(
    raw.length > 0,
    "No priced flight cards captured; treat as unavailable, never a zero-dollar fare",
  );
  const seen = new Set();
  const blocks = fareBlocks(s);
  const rows = raw
    .map((description, index) => {
      const priceMatch = description.match(
        /^From ([\d,]+(?:\.\d+)?) Canadian dollars round trip total\./i,
      );
      const route = description.match(
        /\b(Nonstop|\d+ stops?) flight with (.+?)\. Leaves /i,
      );
      const m =
        priceMatch && route ? [null, priceMatch[1], route[1], route[2]] : null;
      const d = description.match(
        /Total duration ((?:(\d+) hr)?\s*(?:(\d+) min)?)\./,
      );
      required(
        m && d,
        `Unrecognized flight card; adapter needs review: ${description.slice(0, 140)}`,
      );
      const price = Number(m[1].replaceAll(",", "")),
        minutes = Number(d[2] || 0) * 60 + Number(d[3] || 0);
      required(
        price > 0 && Number.isFinite(price) && minutes > 0,
        "Invalid price or duration",
      );
      const mixed =
        description.match(
          /((?:Business Class|First Class|Premium Economy|Economy)(?: \+ (?:Business Class|First Class|Premium Economy|Economy))+)/,
        )?.[1] ?? null;
      const itinerary = description.replace(
        /^From .+? round trip total\. /,
        "",
      );
      const card =
        capture.schema_version === 3 ? blocks[index].text : description;
      return {
        id: hash([r, itinerary]),
        origin: r.origin,
        destination: r.destination,
        depart: r.depart,
        return: r.return,
        adults: r.adults,
        currency: r.currency,
        cabin_filter: r.cabin,
        price_total_cad: price,
        price_per_adult_cad: Math.round((price / r.adults) * 100) / 100,
        price_scope: "round_trip_all_adults_from",
        airline: m[3],
        outbound_stops: /nonstop/i.test(m[2]) ? 0 : parseInt(m[2]),
        outbound_duration: d[1].trim(),
        outbound_duration_minutes: minutes,
        outbound_departure:
          description.match(/Leaves (.+?) and arrives at /)?.[1] ?? null,
        outbound_arrival:
          description.match(/ and arrives at (.+?)\. Total duration/)?.[1] ??
          null,
        mixed_cabin_label: mixed,
        cabin_verified_all_segments: false,
        airport_transfer: /Transfer here from|airport change/i.test(card),
        self_transfer: /self.transfer|separate tickets/i.test(card),
        overhead_bin_excluded:
          /does(?: not|n't) include overhead bin access/i.test(card),
        notice_coverage:
          capture.schema_version === 3 ? "full_card" : "link_label_only",
        return_flight_selected: false,
        return_stops: null,
        return_duration_minutes: null,
        search_url: searchUrl(r),
        source_url: capture.url,
        itinerary_url: null,
        link_scope: "search_results",
        retrieved_at: new Date(capture.retrieved_at).toISOString(),
        description,
      };
    })
    .filter((row) => {
      const key = hash([row.id, row.price_total_cad]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.price_total_cad - b.price_total_cad);
  return {
    schema_version: 1,
    status: "ok",
    provider: "google_flights",
    execution: "codex_cua_repl_iab",
    request: r,
    retrieved_at: new Date(capture.retrieved_at).toISOString(),
    coverage:
      "Initial Cheapest-tab departing cards; not exhaustive. Prices are round-trip from-fares; stops and duration are outbound only. Return itinerary and all-segment cabins are unverified.",
    capture_id: hash(capture),
    raw_card_count: raw.length,
    result_count: rows.length,
    duplicate_count: raw.length - rows.length,
    results: rows,
  };
}
export function toCsv(result) {
  const keys = [
    "origin",
    "destination",
    "depart",
    "return",
    "adults",
    "currency",
    "cabin_filter",
    "price_total_cad",
    "price_per_adult_cad",
    "price_scope",
    "airline",
    "outbound_stops",
    "outbound_duration",
    "outbound_duration_minutes",
    "mixed_cabin_label",
    "cabin_verified_all_segments",
    "airport_transfer",
    "self_transfer",
    "overhead_bin_excluded",
    "notice_coverage",
    "return_flight_selected",
    "return_stops",
    "return_duration_minutes",
    "search_url",
    "source_url",
    "itinerary_url",
    "link_scope",
    "retrieved_at",
  ];
  const escape = (v) => {
    let s = v == null ? "" : String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
  };
  return (
    [
      keys.join(","),
      ...result.results.map((row) => keys.map((k) => escape(row[k])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}
export function compareAndRecord(
  result,
  history = [],
  options = {},
  now = Date.now(),
) {
  const p = {
    drop_pct: Number(options.drop_pct ?? 20),
    drop_cad: Number(options.drop_cad ?? 1000),
    lookback_days: Number(options.lookback_days ?? 30),
    min_samples: Number(options.min_samples ?? 3),
    max_stops: Number(options.max_stops ?? 2),
    max_duration_minutes: Number(options.max_duration_minutes ?? 2400),
  };
  for (const [k, v] of Object.entries(p))
    required(Number.isFinite(v) && v >= 0, `Invalid ${k}`);
  required(
    p.drop_pct <= 100 &&
      p.lookback_days > 0 &&
      Number.isInteger(p.min_samples) &&
      p.min_samples >= 1 &&
      Number.isInteger(p.max_stops),
    "Invalid monitor policy",
  );
  required(
    result.status === "ok" && result.results?.length > 0,
    "Only successful nonempty searches can be monitored",
  );
  const at = Date.parse(result.retrieved_at);
  required(
    Number.isFinite(at) && now - at <= 3600000 && at - now <= 300000,
    "Capture must be less than 60 minutes old and not in the future",
  );
  const key = hash([
    result.request,
    p.max_stops,
    p.max_duration_minutes,
    "exclude_any_mixed_label_and_transfers_v1",
    result.results.every((x) => x.notice_coverage === "full_card")
      ? "full_card"
      : "link_label_only",
  ]);
  const eligible = result.results.filter(
    (x) =>
      !x.mixed_cabin_label &&
      !x.airport_transfer &&
      !x.self_transfer &&
      x.outbound_stops <= p.max_stops &&
      x.outbound_duration_minutes <= p.max_duration_minutes,
  );
  const current = eligible.sort(
    (a, b) => a.price_total_cad - b.price_total_cad,
  )[0];
  if (!current)
    return {
      report: { status: "no_eligible_fares", alert: false, query_key: key },
      history,
    };
  required(
    Number.isFinite(current.price_total_cad) && current.price_total_cad > 0,
    "Invalid fare",
  );
  const same = history.filter((x) => x.query_key === key);
  if (same.some((x) => x.retrieved_at === result.retrieved_at))
    return {
      report: { status: "duplicate_capture", alert: false, query_key: key },
      history,
    };
  required(
    !same.some((x) => Date.parse(x.retrieved_at) > at),
    "Out-of-order capture; history was not changed",
  );
  const prior = same
    .filter(
      (x) =>
        Date.parse(x.retrieved_at) >= at - p.lookback_days * 86400000 &&
        x.price_total_cad > 0,
    )
    .map((x) => x.price_total_cad)
    .sort((a, b) => a - b);
  const median = prior.length
    ? (prior[Math.floor((prior.length - 1) / 2)] +
        prior[Math.floor(prior.length / 2)]) /
      2
    : null;
  const delta = median === null ? null : median - current.price_total_cad,
    pct = median === null ? null : (delta / median) * 100;
  const ready = prior.length >= p.min_samples;
  const dropActive =
    ready && delta > 0 && delta >= p.drop_cad && pct >= p.drop_pct;
  const previous = same.at(-1);
  const floor = previous?.drop_active ? previous.alert_floor_cad : null;
  const alert =
    dropActive && (floor == null || current.price_total_cad < floor);
  const observation = {
    query_key: key,
    retrieved_at: result.retrieved_at,
    price_total_cad: current.price_total_cad,
    fare_id: current.id,
    capture_id: result.capture_id,
    drop_active: dropActive,
    alert_floor_cad: dropActive
      ? Math.min(floor ?? Infinity, current.price_total_cad)
      : null,
  };
  return {
    report: {
      status: !ready
        ? "baseline_collecting"
        : alert
          ? "price_drop"
          : dropActive
            ? "already_reported_drop"
            : "no_drop",
      alert,
      deal_confirmed: false,
      verification_required: true,
      query_key: key,
      policy: p,
      baseline_samples: prior.length,
      baseline_median_cad: median,
      drop_cad: delta,
      drop_pct: pct === null ? null : Math.round(pct * 100) / 100,
      fare: current,
      comparison:
        "Route-level eligible from-fare versus prior median; not an identical confirmed round-trip itinerary. Select all legs to check hidden separate tickets and cabin changes.",
    },
    history: [...history, observation],
  };
}
