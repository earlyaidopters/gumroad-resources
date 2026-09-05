// Run ONLY inside Codex's supported CUA REPL, with its supplied tab object.
// This module has no browser launcher, endpoint client, CDP, or profile access.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateRequest, parseCapture, toCsv, dateLabel } from "./lib.mjs";
import { scrubSnapshot, readyObservation, signature } from "./capture.mjs";

export async function createJob(directory) {
  const out = resolve(directory),
    request = validateRequest(
      JSON.parse(await readFile(resolve(out, "request.json"), "utf8")),
    );
  const metrics = {
    started_at: new Date().toISOString(),
    advance_calls: 0,
    browser_actions: 0,
    observations: 0,
    failed_attempts: [],
    mode: "supported_cua_injected_tab",
  };
  let done = false;
  const save = async (name, value) =>
    writeFile(
      resolve(out, name),
      typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
      { flag: "wx" },
    );
  const compact = (s) =>
    s
      .split("\n")
      .filter((x) =>
        /combobox|textbox|tab "|Prices include|Currency CAD|Done. Search/.test(
          x,
        ),
      )
      .join("\n");
  async function observe(tab, snapshot) {
    const loading = await tab.playwright
      .getByText(
        /^(Loading results|Fetching results|Checking prices from multiple sources)\b/i,
      )
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const ariaHidden = !!n.closest('[aria-hidden="true"]');
          let cssHidden = n.getClientRects().length === 0;
          for (let p = n; p; p = p.parentElement) {
            const style = getComputedStyle(p);
            if (style.display === "none" || style.visibility === "hidden")
              cssHidden = true;
          }
          return {
            text: (n.textContent ?? "").trim(),
            hidden: ariaHidden || cssHidden,
            aria_hidden: ariaHidden,
            css_hidden: cssHidden,
          };
        }),
      );
    metrics.observations++;
    return {
      at: new Date().toISOString(),
      snapshot: scrubSnapshot(snapshot),
      loading,
    };
  }
  return {
    async advance(tab) {
      if (done) return { status: "already_complete", out };
      metrics.advance_calls++;
      try {
        if (
          metrics.advance_calls > 12 ||
          Date.now() - Date.parse(metrics.started_at) > 120000
        )
          throw new Error(
            "Browser budget exceeded; stop and inspect the failed run",
          );
        let snapshot = await tab.playwright.domSnapshot();
        if (!/^\s*- tab "Cheapest/m.test(snapshot))
          return { status: "waiting_for_search", evidence: compact(snapshot) };
        if (!/^\s*- tab "Cheapest[^\n]+\[selected\]/m.test(snapshot)) {
          await tab.playwright.getByRole("tab", { name: /^Cheapest/ }).click();
          metrics.browser_actions++;
          snapshot = await tab.playwright.domSnapshot();
          return {
            status: "cheapest_selected",
            next: "Call advance again after inspecting this state.",
            evidence: compact(snapshot),
          };
        }
        const first = await observe(tab, snapshot);
        if (!readyObservation(first))
          return {
            status: "waiting_for_visible_loading",
            loading: first.loading,
            evidence: compact(snapshot),
          };
        // Use the supported browser's built-in readiness wait, without a fixed sleep.
        await tab.getAXState({ emit: false });
        const second = await observe(tab, await tab.playwright.domSnapshot());
        if (
          !readyObservation(second) ||
          signature(first.snapshot) !== signature(second.snapshot)
        )
          return {
            status: "waiting_for_stable_cards",
            loading: second.loading,
          };
        const capture = {
          schema_version: 3,
          retrieved_at: second.at,
          url: await tab.url(),
          snapshot: second.snapshot,
          observations: [first, second],
        };
        if (!second.snapshot.includes('textbox "Departure"'))
          throw new Error("Departure control missing");
        await tab.playwright
          .getByRole("textbox", { name: "Departure", exact: true })
          .click();
        metrics.browser_actions++;
        const calendar = await tab.playwright.domSnapshot();
        capture.calendar_evidence = calendar
          .split("\n")
          .filter((x) => x.includes('button "Done. Search'))
          .join("\n");
        const expected = `departing on ${dateLabel(request.depart, true)} and returning on ${dateLabel(request.return, true)}`;
        if (!capture.calendar_evidence.includes(expected))
          throw new Error("Calendar date/year mismatch; no exports written");
        if (!calendar.includes('textbox "Departure"'))
          throw new Error(
            "Calendar Departure control missing; inspect before closing",
          );
        await tab.playwright
          .getByRole("textbox", { name: "Departure", exact: true })
          .press("Escape");
        metrics.browser_actions++;
        const after = scrubSnapshot(await tab.playwright.domSnapshot());
        if (signature(after) !== signature(second.snapshot))
          throw new Error(
            "Fare cards changed during calendar verification; retry capture",
          );
        const result = parseCapture(request, capture);
        metrics.completed_at = new Date().toISOString();
        metrics.runner_elapsed_ms =
          Date.parse(metrics.completed_at) - Date.parse(metrics.started_at);
        metrics.result_count = result.result_count;
        metrics.capture_id = result.capture_id;
        const plan = JSON.parse(
          await readFile(resolve(out, "run.json"), "utf8").catch(
            () => '{"started_at":null}',
          ),
        );
        metrics.plan_to_export_ms = plan.started_at
          ? Date.parse(metrics.completed_at) - Date.parse(plan.started_at)
          : null;
        await save("capture.json", capture);
        await save("flights.json", result);
        await save("flights.csv", toCsv(result));
        await save("metrics.json", metrics);
        done = true;
        return {
          status: "ok",
          result_count: result.result_count,
          lowest_from_total_cad: Math.min(
            ...result.results.map((x) => x.price_total_cad),
          ),
          json: resolve(out, "flights.json"),
          csv: resolve(out, "flights.csv"),
          retrieved_at: result.retrieved_at,
          metrics,
          coverage: result.coverage,
        };
      } catch (error) {
        metrics.failed_attempts.push({
          at: new Date().toISOString(),
          error: error.message,
        });
        await writeFile(
          resolve(out, "failure.json"),
          JSON.stringify(
            { status: "error", error: error.message, metrics },
            null,
            2,
          ) + "\n",
        );
        throw error;
      }
    },
  };
}
