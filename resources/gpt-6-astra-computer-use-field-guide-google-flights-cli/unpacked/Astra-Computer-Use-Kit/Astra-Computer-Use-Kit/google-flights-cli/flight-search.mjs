#!/usr/bin/env node
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  unlink,
  open,
} from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  validateRequest,
  searchUrl,
  parseCapture,
  toCsv,
  compareAndRecord,
} from "./lib.mjs";
import {
  normalizeTrip,
  browserPlan,
  buildCampaign,
  parseMultiCapture,
  campaignCsv,
  rowsCsv,
  rankCampaign,
} from "./optimizer.mjs";
const base = dirname(fileURLToPath(import.meta.url));
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
const print = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
const valueOptions = [
  "from",
  "to",
  "depart",
  "return",
  "adults",
  "cabin",
  "currency",
  "config",
  "favorite",
  "request",
  "capture",
  "out",
  "result",
  "history",
  "drop-pct",
  "drop-cad",
  "lookback-days",
  "min-samples",
  "max-stops",
  "max-duration-minutes",
  "spec",
  "campaign",
  "manifest",
];
let v, positionals;
try {
  ({ values: v, positionals } = parseArgs({
    options: Object.fromEntries([
      ...valueOptions.map((x) => [x, { type: "string" }]),
      ["help", { type: "boolean" }],
    ]),
    allowPositionals: true,
  }));
} catch (e) {
  print({ status: "error", error: e.message });
  process.exit(2);
}
async function request() {
  if (v.request) return validateRequest(await json(v.request));
  let input = {};
  if (v.config) {
    const c = await json(v.config);
    input = { ...c.defaults };
    if (v.favorite) {
      if (!c.favorites?.[v.favorite]) throw new Error("Unknown favorite");
      input = { ...input, ...c.favorites[v.favorite] };
    }
  } else if (v.favorite) throw new Error("--favorite requires --config");
  for (const [a, b] of [
    ["from", "origin"],
    ["to", "destination"],
    ["depart", "depart"],
    ["return", "return"],
    ["adults", "adults"],
    ["cabin", "cabin"],
    ["currency", "currency"],
  ])
    if (v[a] !== undefined) input[b] = v[a];
  return validateRequest(input);
}
async function plan(r) {
  if (r.depart < new Date().toISOString().slice(0, 10))
    throw new Error("Departure is in the past; update favorite dates");
  const dir = resolve(
    v.out ?? `runs/${new Date().toISOString().replaceAll(":", "-")}`,
  );
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, "request.json"),
    JSON.stringify(r, null, 2) + "\n",
    { flag: "wx" },
  );
  const code = `// Run inside Codex's mcp__cua_repl.js, NOT node or a shell.\n// First call in a fresh session: exactly this one entry point.\nlet flightTab = await cua.createBrowserTab("iab", ${JSON.stringify(searchUrl(r))}, {visible:false});\n// STOP and inspect returned state. Execute the returned steps; advance-browser.js imports the shipped runner.\n`;
  await writeFile(resolve(dir, "open-browser.js"), code, { flag: "wx" });
  const start = `var flightRunner = await import(${JSON.stringify(pathToFileURL(resolve(base, "browser-runner.mjs")).href)}); var flightJob = await flightRunner.createJob(${JSON.stringify(dir)}); nodeRepl.write(await flightJob.advance(flightTab));`;
  await writeFile(resolve(dir, "advance-browser.js"), start + "\n", {
    flag: "wx",
  });
  await writeFile(
    resolve(dir, "run.json"),
    JSON.stringify(
      {
        started_at: new Date().toISOString(),
        request: r,
        mode: "codex_supported_browser_runner",
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  return {
    status: "requires_codex",
    request: r,
    search_url: searchUrl(r),
    request_file: resolve(dir, "request.json"),
    browser_code: resolve(dir, "open-browser.js"),
    runbook: resolve(base, "docs/BROWSER-RUNBOOK.md"),
    steps: [
      {
        tool: "mcp__cua_repl.js",
        code: `var flightTab = await cua.createBrowserTab("iab", ${JSON.stringify(searchUrl(r))}, {visible:false});`,
        instruction:
          "Fresh browser session: execute this entry point alone, then inspect returned documentation/state.",
      },
      {
        tool: "mcp__cua_repl.js",
        code: start,
        instruction:
          "Imports the shipped runner, selects Cheapest from fresh DOM evidence, and returns state.",
      },
      {
        tool: "mcp__cua_repl.js",
        code: "nodeRepl.write(await flightJob.advance(flightTab));",
        instruction:
          "Repeat only if waiting, after inspecting returned state. Runner verifies dates and writes capture + JSON + CSV + timings directly. No manual JSON copying or separate ingest call.",
      },
    ],
    execution_requires_codex: true,
  };
}
try {
  if (positionals.length > 1)
    throw new Error("Unexpected extra positional argument");
  const command = positionals[0] ?? "help";
  if (v.help || command === "help") {
    process.stdout.write(
      "Extended commands:\n  explore --spec examples/optimizer.json --out RUN\n  trip-plan --request examples/open-jaw.json --out RUN\n  trip-ingest --request REQUEST --capture CAPTURE --out RUN\n  rank --campaign CAMPAIGN_JSON --manifest OBSERVATION_MANIFEST --out RUN\nSee docs/SEARCH-STRATEGIES.md for supported versus planning-only features.\n\n",
    );
    process.stdout.write(
      `flight-search (Node 22+, no dependencies)\n\nrun / plan / search [--from SFO --to JFK --depart YYYY-MM-DD --return YYYY-MM-DD]\n  [--adults 2 --currency CAD --cabin business --out RUN_DIR]\n  [--config favorites.json --favorite new-york]\n  Prints exact browser-runner calls; the runner writes JSON/CSV directly. Live retrieval REQUIRES Codex's CUA browser tool.\n  run/plan exit 0; search without --capture exits 3 (requires_codex).\n\ningest --request request.json --capture capture.json --out RUN_DIR\n  Validates browser evidence and writes flights.json + flights.csv.\nsearch --capture capture.json [query flags] --out RUN_DIR\n  Imports an existing browser capture; does not perform live retrieval.\ncheck --result flights.json --history history.json\n  [--drop-pct 20 --drop-cad 1000 --min-samples 3 --lookback-days 30]\n  [--max-stops 2 --max-duration-minutes 2400]\n  Both drop thresholds must pass. Mixed cabins and transfers excluded.\n  Prints JSON; exit 10 means new alert, 0 means quiet, 2 means error.\n\nSee README.md and docs/BROWSER-RUNBOOK.md. Search only; no booking capability.\n`,
    );
  } else if (command === "explore") {
    if (!v.spec || !v.out) throw new Error("--spec and --out required");
    const campaign = buildCampaign(await json(v.spec));
    const dir = resolve(v.out);
    await mkdir(dir, { recursive: true });
    await writeFile(
      resolve(dir, "campaign.json"),
      JSON.stringify(campaign, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(resolve(dir, "campaign.csv"), campaignCsv(campaign), {
      flag: "wx",
    });
    for (const c of campaign.candidates) {
      const sub = resolve(dir, c.id);
      await mkdir(sub, { recursive: true });
      for (const component of c.components)
        await writeFile(
          resolve(sub, `request-${component.index}.json`),
          JSON.stringify(component.request, null, 2) + "\n",
          { flag: "wx" },
        );
    }
    print({
      status: "planned_requires_codex",
      campaign: resolve(dir, "campaign.json"),
      csv: resolve(dir, "campaign.csv"),
      searches: campaign.planned_searches,
      candidates: campaign.candidates.length,
      omitted: campaign.omitted_candidate_count,
    });
  } else if (command === "trip-plan") {
    if (!v.request || !v.out) throw new Error("--request and --out required");
    const t = normalizeTrip(await json(v.request)),
      p = browserPlan(t),
      dir = resolve(v.out);
    await mkdir(dir, { recursive: true });
    await writeFile(
      resolve(dir, "request.json"),
      JSON.stringify(t, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(
      resolve(dir, "browser-plan.json"),
      JSON.stringify(p, null, 2) + "\n",
      { flag: "wx" },
    );
    print({
      status: "requires_codex",
      ...p,
      runbook: resolve(base, "docs/MULTICITY-RUNBOOK.md"),
    });
  } else if (command === "trip-ingest") {
    if (!v.request || !v.capture || !v.out)
      throw new Error("--request, --capture and --out required");
    const t = normalizeTrip(await json(v.request)),
      capture = await json(v.capture);
    let result;
    if (t.trip_type === "round_trip") {
      const [a, b] = t.legs;
      result = parseCapture(
        {
          origin: a.origin,
          destination: a.destination,
          depart: a.date,
          return: b.date,
          adults: t.adults,
          currency: t.currency,
          cabin: t.cabin,
        },
        capture,
      );
    } else result = parseMultiCapture(t, capture);
    const dir = resolve(v.out);
    await mkdir(dir, { recursive: true });
    await writeFile(
      resolve(dir, "flights.json"),
      JSON.stringify(result, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(resolve(dir, "flights.csv"), rowsCsv(result.results), {
      flag: "wx",
    });
    print({
      status: "ok",
      count: result.result_count,
      json: resolve(dir, "flights.json"),
      csv: resolve(dir, "flights.csv"),
    });
  } else if (command === "rank") {
    if (!v.campaign || !v.manifest || !v.out)
      throw new Error("--campaign, --manifest and --out required");
    const manifest = await json(v.manifest);
    if (!Array.isArray(manifest.results))
      throw new Error("Manifest needs a results array of file paths");
    const observations = [];
    for (const file of manifest.results)
      observations.push(
        await json(resolve(dirname(resolve(v.manifest)), file)),
      );
    const result = rankCampaign(await json(v.campaign), observations);
    const dir = resolve(v.out);
    await mkdir(dir, { recursive: true });
    await writeFile(
      resolve(dir, "ranking.json"),
      JSON.stringify(result, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(resolve(dir, "ranking.csv"), rowsCsv(result.results), {
      flag: "wx",
    });
    print({
      status: "ok",
      json: resolve(dir, "ranking.json"),
      csv: resolve(dir, "ranking.csv"),
      note: result.ranking_scope,
    });
  } else if (
    command === "run" ||
    command === "plan" ||
    (command === "search" && !v.capture)
  ) {
    print(await plan(await request()));
    if (command === "search") process.exitCode = 3;
  } else if (command === "ingest" || command === "search") {
    if (!v.capture) throw new Error("--capture is required");
    const result = parseCapture(await request(), await json(v.capture));
    const dir = resolve(v.out ?? "results");
    await mkdir(dir, { recursive: true });
    // Exclusive files prevent silently replacing prior searches.
    await writeFile(
      resolve(dir, "flights.json"),
      JSON.stringify(result, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(resolve(dir, "flights.csv"), toCsv(result), { flag: "wx" });
    print({
      status: "ok",
      count: result.result_count,
      json: resolve(dir, "flights.json"),
      csv: resolve(dir, "flights.csv"),
      retrieved_at: result.retrieved_at,
    });
  } else if (command === "check") {
    if (!v.result || !v.history)
      throw new Error("--result and --history required");
    const file = resolve(v.history);
    await mkdir(dirname(file), { recursive: true });
    const lock = await open(file + ".lock", "wx");
    try {
      let history = [];
      try {
        history = await json(file);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      if (!Array.isArray(history)) throw new Error("Invalid history");
      const options = Object.fromEntries(
        [
          "drop-pct",
          "drop-cad",
          "lookback-days",
          "min-samples",
          "max-stops",
          "max-duration-minutes",
        ]
          .filter((k) => v[k] !== undefined)
          .map((k) => [k.replaceAll("-", "_"), v[k]]),
      );
      const { report, history: updated } = compareAndRecord(
        await json(v.result),
        history,
        options,
      );
      const tmp = file + "." + process.pid + ".tmp";
      await writeFile(tmp, JSON.stringify(updated, null, 2) + "\n", {
        flag: "wx",
      });
      await rename(tmp, file);
      print(report);
      if (report.alert) process.exitCode = 10;
    } finally {
      await lock.close();
      await unlink(file + ".lock");
    }
  } else throw new Error("Unknown command: " + command);
} catch (e) {
  print({ status: "error", error: e.message });
  process.exitCode = 2;
}
