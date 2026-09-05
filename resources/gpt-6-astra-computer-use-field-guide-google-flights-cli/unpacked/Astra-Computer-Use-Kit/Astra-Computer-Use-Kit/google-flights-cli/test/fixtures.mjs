// Entirely synthetic parser fixtures. No real searches, fares, accounts or trips.
import { dateLabel, searchUrl } from "../lib.mjs";
export const request = {
  origin: "SFO",
  destination: "JFK",
  depart: "2040-03-10",
  return: "2040-03-17",
  adults: 2,
  cabin: "business",
  currency: "CAD",
};
export const observedAt = "2040-01-01T12:00:01.000Z";
export const fares = [
  {
    price: 900,
    airline: "Example Air",
    stops: 1,
    duration: "8 hr",
    mixed: true,
  },
  {
    price: 1000,
    airline: "Sample Wings",
    stops: 1,
    duration: "9 hr",
    separate: true,
  },
  {
    price: 1200,
    airline: "Demo Air, Sample Express",
    stops: 0,
    duration: "5 hr 30 min",
  },
  {
    price: 1500,
    airline: "Fixture Airways",
    stops: 1,
    duration: "12 hr",
    bag: true,
  },
  { price: 1100, airline: "Long Route Air", stops: 2, duration: "43 hr" },
];
export function card(f, idx = 0, multi = false) {
  const label = `From ${f.price} Canadian dollars ${multi ? "total" : "round trip total"}. ${f.stops === 0 ? "Nonstop" : f.stops + " stops"} flight with ${f.airline}. Leaves Sample Airport at 8:00 AM and arrives at Example Airport at 2:00 PM. Total duration ${f.duration}.${f.mixed ? " Business Class + Economy." : ""} Select flight`;
  return `  - link "${label}"\n  - button "Flight details."${f.separate ? "\n  - text: Separate tickets booked together" : ""}${f.bag ? "\n  - text: Does not include overhead bin access" : ""}`;
}
export function fixture(
  r = request,
  { hiddenLoading = false, at = observedAt, cards = fares } = {},
) {
  const snapshot = `- main:\n  - button "Change ticket type. Round trip"\n  - button "Change seating class. Business"\n  - combobox "Where from? San Francisco ${r.origin}"\n  - combobox "Where to? New York ${r.destination}"\n  - textbox "Departure": ${dateLabel(r.depart)}\n  - textbox "Return": ${dateLabel(r.return)}\n  - tab "Cheapest" [selected]\n  - text: Prices include required taxes + fees for ${r.adults} adults\n  - button "Currency CAD"\n${hiddenLoading ? "  - generic: Loading results\n" : ""}${cards.map((f, i) => card(f, i)).join("\n")}`;
  const loading = hiddenLoading
    ? [
        {
          text: "Loading results",
          hidden: true,
          aria_hidden: true,
          css_hidden: true,
        },
      ]
    : [];
  return {
    fixture_notice: "SYNTHETIC DATA. Not real fares.",
    schema_version: 3,
    retrieved_at: at,
    url: searchUrl(r),
    snapshot,
    calendar_evidence: `button "Done. Search for flights departing on ${dateLabel(r.depart, true)} and returning on ${dateLabel(r.return, true)}"`,
    observations: [
      { at: new Date(Date.parse(at) - 500).toISOString(), snapshot, loading },
      { at, snapshot, loading },
    ],
  };
}
export const multiRequest = {
  trip_type: "multi_city",
  adults: 2,
  cabin: "business",
  currency: "CAD",
  legs: [
    { origin: "SFO", destination: "JFK", date: "2040-03-10" },
    { origin: "BOS", destination: "SFO", date: "2040-03-17" },
  ],
};
export function multiFixture(t = multiRequest) {
  return {
    fixture_notice: "SYNTHETIC DATA. Not real fares.",
    schema_version: 2,
    retrieved_at: observedAt,
    url: "https://www.google.com/travel/flights?hl=en&curr=CAD",
    snapshot:
      `- main:\n  - button "Change ticket type. Multi-city"\n  - button "Change seating class. Business"\n  - button "Currency CAD"\n  - text: Prices include required taxes + fees for ${t.adults} adults\n` +
      t.legs
        .map(
          (l) =>
            `  - combobox "Where from? Example ${l.origin}"\n  - combobox "Where to? Example ${l.destination}"\n  - textbox "Departure": ${dateLabel(l.date)}`,
        )
        .join("\n") +
      "\n" +
      card(
        { price: 1800, airline: "Demo Multi Air", stops: 1, duration: "8 hr" },
        0,
        true,
      ),
    calendar_evidence: t.legs.map(
      (l) => `button "${dateLabel(l.date, true)}, departure date." [selected]`,
    ),
  };
}
export const spec = {
  base: request,
  flex: { depart_days: 2, return_days: 2, min_trip_days: 4, max_trip_days: 10 },
  origins: ["OAK"],
  return_origins: ["BOS"],
  max_searches: 12,
  include_split_oneways: true,
  positioning: [
    {
      gateway: "SEA",
      feeder_depart: "2040-03-09",
      feeder_return: "2040-03-18",
    },
  ],
  multi_city: [multiRequest],
  extra_costs_cad: {
    "origin:OAK": null,
    "gap:JFK:BOS": null,
    "positioning:SEA": null,
  },
};
