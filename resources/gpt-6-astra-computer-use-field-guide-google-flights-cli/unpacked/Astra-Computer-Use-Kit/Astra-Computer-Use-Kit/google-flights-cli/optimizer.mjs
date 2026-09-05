import { hash, validateRequest, searchUrl, dateLabel } from "./lib.mjs";
const check = (ok, message) => {
  if (!ok) throw new Error(message);
};
const day = 86400000;
const shift = (date, n) =>
  new Date(Date.parse(date + "T12:00:00Z") + n * day)
    .toISOString()
    .slice(0, 10);
const span = (a, b) => (Date.parse(b) - Date.parse(a)) / day;
const airport = (x) => {
  check(
    typeof x === "string" && /^[A-Z]{3}$/.test(x),
    "Use exact uppercase three-letter airport codes",
  );
  return x;
};
const validDate = (x) => {
  check(
    typeof x === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(x) &&
      Number.isFinite(Date.parse(x)) &&
      new Date(x).toISOString().slice(0, 10) === x,
    "Invalid ISO date",
  );
  return x;
};
export function normalizeTrip(input) {
  const type = input.trip_type ?? (input.legs ? "multi_city" : "round_trip");
  check(
    ["round_trip", "one_way", "multi_city"].includes(type),
    "Unsupported trip type",
  );
  if (type === "round_trip") {
    let raw = input;
    if (input.legs) {
      check(input.legs.length === 2, "Round trip needs two legs");
      const [a, b] = input.legs;
      check(
        a.origin === b.destination && a.destination === b.origin,
        "Round-trip endpoints must reverse; use multi_city for open jaw",
      );
      raw = {
        origin: a.origin,
        destination: a.destination,
        depart: a.date,
        return: b.date,
        adults: input.adults,
        cabin: input.cabin,
        currency: input.currency,
      };
    }
    const r = validateRequest(raw);
    return {
      trip_type: type,
      adults: r.adults,
      cabin: r.cabin,
      currency: r.currency,
      legs: [
        { origin: r.origin, destination: r.destination, date: r.depart },
        { origin: r.destination, destination: r.origin, date: r.return },
      ],
    };
  }
  const adults = Number(input.adults ?? 1),
    cabin = input.cabin ?? "business",
    currency = input.currency ?? "CAD";
  check(
    Number.isInteger(adults) && adults >= 1 && adults <= 9,
    "Adults must be 1–9",
  );
  check(
    cabin === "business" && currency === "CAD",
    "Live adapters currently support business / CAD only",
  );
  check(
    Array.isArray(input.legs) &&
      input.legs.length >= (type === "one_way" ? 1 : 2) &&
      input.legs.length <= (type === "one_way" ? 1 : 6),
    "Use one leg for one_way or 2–6 legs for multi_city",
  );
  const legs = input.legs.map((l) => ({
    origin: airport(l.origin),
    destination: airport(l.destination),
    date: validDate(l.date),
  }));
  legs.forEach((l, i) => {
    check(
      l.origin !== l.destination,
      "A flight cannot start and end at the same airport",
    );
    if (i)
      check(
        l.date >= legs[i - 1].date,
        "Leg departure dates must be chronological",
      );
  });
  return { trip_type: type, adults, cabin, currency, legs };
}
export function tripKey(input) {
  // Already-normalized round trips have legs; adapt them back without using defaults.
  if (input.trip_type === "round_trip" && input.legs) {
    const [a, b] = input.legs;
    return hash(
      normalizeTrip({
        origin: a.origin,
        destination: a.destination,
        depart: a.date,
        return: b.date,
        adults: input.adults,
        cabin: input.cabin,
        currency: input.currency,
      }),
    );
  }
  return hash(normalizeTrip(input));
}
export function browserPlan(trip) {
  const t =
    trip.legs && trip.trip_type === "round_trip" ? trip : normalizeTrip(trip);
  if (t.trip_type === "round_trip") {
    const [a, b] = t.legs;
    return {
      route: "query_url",
      url: searchUrl({
        origin: a.origin,
        destination: a.destination,
        depart: a.date,
        return: b.date,
        adults: t.adults,
        cabin: t.cabin,
        currency: t.currency,
      }),
      trip: t,
    };
  }
  return {
    route: "visible_form",
    url: "https://www.google.com/travel/flights?hl=en&curr=CAD",
    trip: t,
    instructions: `Use the visible ${t.trip_type === "multi_city" ? "Multi-city" : "One way"} form. Set ${t.adults} adults, Business, CAD, and every listed leg. Verify exact airport selections and each full calendar date. The natural-language multi-city URL was tested and did not populate the form. Never generate private tfs/protobuf URLs.`,
  };
}
export function buildCampaign(spec) {
  const base = validateRequest(spec.base ?? {}),
    f = spec.flex ?? {};
  const constraints = {
    max_stops: Number(spec.constraints?.max_stops ?? 2),
    max_leg_duration_minutes: Number(
      spec.constraints?.max_leg_duration_minutes ?? 2400,
    ),
  };
  check(
    Number.isInteger(constraints.max_stops) &&
      constraints.max_stops >= 0 &&
      Number.isFinite(constraints.max_leg_duration_minutes) &&
      constraints.max_leg_duration_minutes > 0,
    "Invalid flight constraints",
  );
  const dep = Number(f.depart_days ?? 0),
    ret = Number(f.return_days ?? 0),
    limit = Number(spec.max_searches ?? 24);
  check(
    [dep, ret].every((x) => Number.isInteger(x) && x >= 0 && x <= 14),
    "Flex must be 0–14 days",
  );
  check(
    Number.isInteger(limit) && limit >= 1 && limit <= 200,
    "max_searches must be 1–200 browser searches",
  );
  const origins = [...new Set([base.origin, ...(spec.origins ?? [])])].map(
    airport,
  );
  const destinations = [
    ...new Set([base.destination, ...(spec.destinations ?? [])]),
  ].map(airport);
  const returnOrigins = [...new Set(spec.return_origins ?? [])].map(airport);
  check(
    origins.length <= 8 &&
      destinations.length <= 8 &&
      returnOrigins.length <= 8,
    "Limit each airport list to 8",
  );
  const min = Number(f.min_trip_days ?? 1),
    max = Number(f.max_trip_days ?? 365);
  check(
    Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min,
    "Invalid calendar-trip-length limits",
  );
  const buckets = {
    baseline: [],
    flexible_dates: [],
    alternate_airports: [],
    open_jaw: [],
    multi_city: [],
    split_oneways: [],
    positioning: [],
  };
  const seen = new Set();
  let count = 0;
  const cost = (key, reason) => ({
    key,
    amount_cad: spec.extra_costs_cad?.[key] ?? null,
    reason,
  });
  function add(strategy, components, requirements = [], note = "") {
    const normalized = components.map((c) =>
      c.trip_type === "round_trip" && c.legs ? c : normalizeTrip(c),
    );
    const id = hash([strategy, normalized]);
    if (seen.has(id)) return;
    seen.add(id);
    for (const c of requirements)
      check(
        c.amount_cad === null ||
          (Number.isFinite(c.amount_cad) && c.amount_cad >= 0),
        "Extra costs must be nonnegative CAD totals or null",
      );
    buckets[strategy].push({
      id,
      strategy,
      components: normalized.map((request, i) => ({
        id: tripKey(request),
        index: i,
        request,
        browser: browserPlan(request),
      })),
      cost_requirements: requirements,
      separate_tickets: normalized.length > 1,
      notes: note,
      price_status: "not_searched",
    });
    count++;
    check(count <= 50000, "Campaign too large; narrow dates or airports");
  }
  add("baseline", [base]);
  const offsets = [];
  for (let d = -dep; d <= dep; d++)
    for (let r = -ret; r <= ret; r++) offsets.push([d, r]);
  offsets.sort(
    (a, b) =>
      Math.abs(a[0]) + Math.abs(a[1]) - (Math.abs(b[0]) + Math.abs(b[1])) ||
      Math.abs(a[0] - a[1]) - Math.abs(b[0] - b[1]),
  );
  for (const [d, r] of offsets) {
    const depart = shift(base.depart, d),
      back = shift(base.return, r);
    if (span(depart, back) < min || span(depart, back) > max) continue;
    for (const origin of origins)
      for (const destination of destinations) {
        if (origin === destination) continue;
        const q = { ...base, origin, destination, depart, return: back };
        const costs = [];
        if (origin !== base.origin)
          costs.push(
            cost(
              `origin:${origin}`,
              `Round-trip positioning/ground transport from ${base.origin}, bags, parking and any hotels`,
            ),
          );
        if (destination !== base.destination)
          costs.push(
            cost(
              `destination:${destination}`,
              `Travel from ${destination} to intended destination ${base.destination} and back`,
            ),
          );
        if (
          d === 0 &&
          r === 0 &&
          origin === base.origin &&
          destination === base.destination
        )
          continue;
        add(
          costs.length ? "alternate_airports" : "flexible_dates",
          [q],
          costs,
          "Calendar span is not time at destination. Check actual local arrival before accepting.",
        );
      }
    for (const origin of returnOrigins) {
      if (origin === base.destination) continue;
      add(
        "open_jaw",
        [
          {
            ...base,
            trip_type: "multi_city",
            legs: [
              {
                origin: base.origin,
                destination: base.destination,
                date: depart,
              },
              { origin, destination: base.origin, date: back },
            ],
          },
        ],
        [
          cost(
            `gap:${base.destination}:${origin}`,
            `Missing ${base.destination}→${origin} travel, bags and any additional hotel`,
          ),
        ],
        "Fly into one city and return from another; the intervening travel is not included.",
      );
    }
  }
  check(
    (spec.multi_city ?? []).length <= 20,
    "At most 20 explicit multi-city variants",
  );
  for (const variant of spec.multi_city ?? []) {
    const t = normalizeTrip({ ...base, ...variant, trip_type: "multi_city" }),
      costs = [];
    t.legs.slice(1).forEach((l, i) => {
      if (t.legs[i].destination !== l.origin)
        costs.push(
          cost(
            `gap:${t.legs[i].destination}:${l.origin}`,
            "Unpriced surface or separate-flight gap",
          ),
        );
    });
    if (t.legs[0].origin !== base.origin)
      costs.push(
        cost(`origin:${t.legs[0].origin}`, "Positioning to start airport"),
      );
    if (t.legs.at(-1).destination !== base.origin)
      costs.push(
        cost(
          `end:${t.legs.at(-1).destination}`,
          "Travel home from final airport",
        ),
      );
    add(
      "multi_city",
      [t],
      costs,
      variant.name ??
        "Explicit multi-city/stopover sequence; do not assume a stopover is free.",
    );
  }
  if (spec.include_split_oneways === true)
    add(
      "split_oneways",
      normalizeTrip(base).legs.map((l) => ({
        ...base,
        trip_type: "one_way",
        legs: [l],
      })),
      [],
      "Price both directions for the full party. Two one-way fares are not guaranteed cheaper; ticket conditions differ.",
    );
  check((spec.positioning ?? []).length <= 8, "At most 8 positioning gateways");
  for (const p of spec.positioning ?? []) {
    airport(p.gateway);
    validDate(p.feeder_depart);
    validDate(p.feeder_return);
    check(
      p.gateway !== base.origin && p.gateway !== base.destination,
      "Positioning gateway must differ from endpoints",
    );
    check(
      p.feeder_depart < base.depart && p.feeder_return > base.return,
      "Positioning needs earlier outbound and later return dates; verify actual connection buffers",
    );
    add(
      "positioning",
      [
        {
          ...base,
          destination: p.gateway,
          depart: p.feeder_depart,
          return: p.feeder_return,
        },
        { ...base, origin: p.gateway },
      ],
      [
        cost(
          `positioning:${p.gateway}`,
          "Hotels, baggage, airport transfers and other extra costs beyond both flight tickets",
        ),
      ],
      "Separate-ticket strategy. Actual arrival timestamps, entry requirements and minimum connection buffers require review; date gaps alone do not prove feasibility.",
    );
  }
  // Round-robin across strategies keeps a large date grid from consuming every search.
  const candidates = [],
    queue = Object.values(buckets).map((x) => [...x]);
  let budget = 0;
  while (queue.some((x) => x.length)) {
    let added = false;
    for (const b of queue) {
      if (!b.length) continue;
      const c = b.shift();
      if (budget + c.components.length <= limit) {
        candidates.push(c);
        budget += c.components.length;
        added = true;
      }
    }
    if (
      budget === limit ||
      (!added &&
        queue.every(
          (b) => !b.length || b[0].components.length > limit - budget,
        ))
    )
      break;
  }
  return {
    schema_version: 2,
    kind: "flight_search_campaign",
    base,
    constraints,
    search_budget: limit,
    planned_searches: budget,
    total_candidate_count: count,
    omitted_candidate_count: count - candidates.length,
    selection:
      "Baseline, then interleave date/airport/open-jaw/multi-city/split/positioning strategies within search budget; not exhaustive.",
    candidates,
    requirements: [
      "Prices are hypotheses until searched.",
      "Select every leg and inspect every segment cabin before claiming a business-class deal.",
      "Never add leg-selection full-trip totals together. Add only separately priced component requests.",
      "Do not compare incomplete costs against complete trip totals.",
      "Do not automatically navigate every generated query URL: use date grid/airport UI for discovery and the supported browser runbook for each chosen search.",
    ],
  };
}
export function parseMultiCapture(input, capture) {
  const t = normalizeTrip(input);
  check(
    t.trip_type === "multi_city",
    "This live capture adapter is tested for multi-city only; one-way planning is available but ingestion is not yet verified",
  );
  check(
    capture.schema_version === 2 && typeof capture.snapshot === "string",
    "Expected multi-city capture schema 2",
  );
  const s = capture.snapshot.replace(/ \[active\]/g, "");
  const u = new URL(capture.url);
  check(
    u.protocol === "https:" &&
      u.hostname === "www.google.com" &&
      u.pathname.startsWith("/travel/flights"),
    "Unexpected source",
  );
  check(
    Number.isFinite(Date.parse(capture.retrieved_at)),
    "Invalid retrieval time",
  );
  check(
    !/Loading|Fetching|Change departing flight|Choose trip to/.test(s),
    "Incomplete or subsequent-leg page; capture the initial multi-city results",
  );
  for (const v of [
    "Change ticket type. Multi-city",
    "Change seating class. Business",
    "Currency CAD",
    `Prices include required taxes + fees for ${t.adults} adult`,
  ])
    check(s.includes(v), "Missing setting: " + v);
  const origins = [
    ...s.matchAll(/combobox "Where from\? [^\n"]+ ([A-Z]{3})"/g),
  ].map((m) => m[1]);
  const dests = [
    ...s.matchAll(/combobox "Where to\? [^\n"]+ ([A-Z]{3})"/g),
  ].map((m) => m[1]);
  const dates = [...s.matchAll(/textbox "Departure": ([^\n]+)/g)].map(
    (m) => m[1],
  );
  check(
    origins.length === t.legs.length &&
      dests.length === t.legs.length &&
      dates.length === t.legs.length,
    "All leg settings must be present",
  );
  t.legs.forEach((l, i) => {
    check(
      origins[i] === l.origin &&
        dests[i] === l.destination &&
        dates[i] === dateLabel(l.date),
      "Leg mismatch",
    );
    check(
      capture.calendar_evidence?.[i]?.includes(
        `${dateLabel(l.date, true)}, departure date.`,
      ) && capture.calendar_evidence[i].includes("[selected]"),
      "Missing per-leg year verification",
    );
  });
  const lines = s.split("\n").filter((x) => /^\s*- link "From /.test(x));
  check(lines.length > 0, "No priced cards");
  const results = lines
    .map((line) => {
      const description = line.match(/- link "(.+ Select flight)"$/)?.[1];
      check(description, "Truncated card");
      const m = description.match(
        /^From ([\d,]+) Canadian dollars total\. (Nonstop|\d+ stops?) flight with (.+?)\./i,
      );
      const d = description.match(
        /Total duration ((?:(\d+) hr)?\s*(?:(\d+) min)?)\./,
      );
      check(m && d, "Unrecognized multi-city card");
      return {
        id: hash([t, description]),
        price_total_cad: Number(m[1].replaceAll(",", "")),
        price_scope: "entire_multi_city_request_all_adults_from",
        airline: m[3],
        outbound_stops: /nonstop/i.test(m[2]) ? 0 : parseInt(m[2]),
        outbound_duration: d[1].trim(),
        outbound_duration_minutes: Number(d[2] || 0) * 60 + Number(d[3] || 0),
        mixed_cabin_label:
          description.match(
            /((?:Business Class|First Class|Premium Economy|Economy)(?: \+ (?:Business Class|First Class|Premium Economy|Economy))+)/,
          )?.[1] ?? null,
        self_transfer: /Separate tickets|self.transfer/i.test(description),
        airport_transfer: /Transfer here from/i.test(description),
        cabin_verified_all_segments: false,
        all_legs_selected: false,
        search_url: capture.url,
        retrieved_at: capture.retrieved_at,
        description,
      };
    })
    .sort((a, b) => a.price_total_cad - b.price_total_cad);
  return {
    schema_version: 2,
    status: "ok",
    request: t,
    capture_id: hash(capture),
    retrieved_at: capture.retrieved_at,
    coverage:
      "Initial multi-city cards. Entire-request from-prices; duration/stops describe first leg only. Later selections can reveal separate tickets or cabin changes.",
    result_count: results.length,
    results,
  };
}
export function campaignCsv(campaign) {
  return rowsCsv(
    campaign.candidates.map((c) => ({
      id: c.id,
      strategy: c.strategy,
      searches: c.components.length,
      legs: c.components
        .map((x) =>
          x.request.legs
            .map((l) => `${l.origin}-${l.destination}@${l.date}`)
            .join(";"),
        )
        .join(" | "),
      unknown_costs: c.cost_requirements
        .filter((x) => x.amount_cad === null)
        .map((x) => x.key)
        .join(";"),
      price_status: c.price_status,
    })),
  );
}
export function rowsCsv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v) => {
    let s =
      v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    [
      keys.map(escape).join(","),
      ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}
export function rankCampaign(campaign, observations, now = Date.now()) {
  const byKey = new Map();
  for (const o of observations) {
    check(o.status === "ok" && Array.isArray(o.results), "Invalid observation");
    const at = Date.parse(o.retrieved_at);
    check(Number.isFinite(at), "Invalid observation timestamp");
    if (now - at > 3600000 || at > now + 300000) continue;
    const k = tripKey(o.request);
    if (!byKey.has(k) || Date.parse(byKey.get(k).retrieved_at) < at)
      byKey.set(k, o);
  }
  const rows = campaign.candidates.map((c) => {
    let subtotal = 0;
    const missing = [],
      picked = [];
    for (const component of c.components) {
      const obs = byKey.get(component.id);
      const scope = {
        round_trip: "round_trip_all_adults_from",
        multi_city: "entire_multi_city_request_all_adults_from",
        one_way: "one_way_all_adults_from",
      }[component.request.trip_type];
      const row = obs?.results
        .filter(
          (x) =>
            x.price_scope === scope &&
            !x.mixed_cabin_label &&
            !x.self_transfer &&
            !x.airport_transfer &&
            x.outbound_stops <= (campaign.constraints?.max_stops ?? 2) &&
            x.outbound_duration_minutes <=
              (campaign.constraints?.max_leg_duration_minutes ?? 2400) &&
            x.price_total_cad > 0 &&
            Number.isFinite(x.price_total_cad),
        )
        .sort((a, b) => a.price_total_cad - b.price_total_cad)[0];
      if (!row) {
        missing.push(component.id);
        continue;
      }
      subtotal += row.price_total_cad;
      picked.push(row);
    }
    const unknown = c.cost_requirements
      .filter((x) => x.amount_cad === null)
      .map((x) => x.key);
    const allIn =
      missing.length || unknown.length
        ? null
        : subtotal +
          c.cost_requirements.reduce((sum, x) => sum + x.amount_cad, 0);
    const selected =
      picked.length === c.components.length &&
      picked.every(
        (x) =>
          x.all_legs_selected === true &&
          x.cabin_verified_all_segments === true,
      );
    return {
      candidate_id: c.id,
      strategy: c.strategy,
      status: missing.length
        ? "not_fully_searched"
        : unknown.length
          ? "missing_extra_costs"
          : selected
            ? "selected_quote_requires_final_review"
            : "preliminary_from_fare",
      airfare_subtotal_cad: missing.length ? null : subtotal,
      all_in_estimate_cad: allIn,
      missing_searches: missing,
      unknown_costs: unknown,
      all_cabins_verified: selected,
      separate_tickets: c.separate_tickets,
      alert_eligible: false,
      reason:
        "Campaign ranking is discovery. Exact chronology, airport gaps, ticket protections and selected fare terms require review before deal alerts.",
      sources: picked.map((x) => ({
        url: x.search_url,
        retrieved_at: x.retrieved_at,
      })),
    };
  });
  rows.sort(
    (a, b) =>
      (a.all_in_estimate_cad ?? Infinity) - (b.all_in_estimate_cad ?? Infinity),
  );
  return {
    schema_version: 2,
    status: "ok",
    ranked_at: new Date(now).toISOString(),
    ranking_scope:
      "Known-cost estimates first; preliminary fares and incomplete alternatives are never confirmed savings.",
    results: rows,
  };
}
