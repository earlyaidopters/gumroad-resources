import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJob } from "../browser-runner.mjs";
import { request, fixture } from "./fixtures.mjs";

test("runner verifies the calendar and exports stable synthetic fares", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flight-runner-"));
  try {
    await writeFile(join(dir, "request.json"), JSON.stringify(request));
    const capture = fixture();
    let calendar = false;
    const tab = {
      url: async () => capture.url,
      getAXState: async () => new Promise((resolve) => setTimeout(resolve, 5)),
      playwright: {
        domSnapshot: async () =>
          calendar
            ? capture.snapshot + "\n" + capture.calendar_evidence
            : capture.snapshot,
        getByText: () => ({ evaluateAll: async () => [] }),
        getByRole: () => ({
          click: async () => {
            calendar = true;
          },
          press: async () => {
            calendar = false;
          },
        }),
      },
    };
    const job = await createJob(dir);
    const result = await job.advance(tab);
    assert.equal(result.status, "ok");
    assert.equal(result.result_count, 5);
    const saved = JSON.parse(await readFile(join(dir, "flights.json"), "utf8"));
    assert.equal(
      saved.results.find((fare) => fare.airline === "Demo Air, Sample Express")
        .price_total_cad,
      1200,
    );
    assert.match(await readFile(join(dir, "flights.csv"), "utf8"), /Demo Air/);
    assert.equal((await job.advance(tab)).status, "already_complete");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runner records budget exhaustion without writing fare exports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flight-budget-"));
  try {
    await writeFile(join(dir, "request.json"), JSON.stringify(request));
    const job = await createJob(dir);
    const tab = { playwright: { domSnapshot: async () => "- main: Loading" } };
    for (let i = 0; i < 12; i++)
      assert.equal((await job.advance(tab)).status, "waiting_for_search");
    await assert.rejects(job.advance(tab), /budget exceeded/);
    const failure = JSON.parse(
      await readFile(join(dir, "failure.json"), "utf8"),
    );
    assert.equal(failure.metrics.advance_calls, 13);
    assert.match(failure.error, /budget exceeded/);
    await assert.rejects(readFile(join(dir, "flights.json")), {
      code: "ENOENT",
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
