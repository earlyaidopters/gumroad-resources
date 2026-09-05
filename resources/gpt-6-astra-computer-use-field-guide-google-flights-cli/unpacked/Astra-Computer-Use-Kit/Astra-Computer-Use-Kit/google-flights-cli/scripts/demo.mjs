// Offline demonstration. All fares and airlines are synthetic.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseCapture, toCsv } from "../lib.mjs";
import { request, fixture } from "../test/fixtures.mjs";
const { values } = parseArgs({ options: { out: { type: "string" } } });
const out = resolve(values.out ?? `runs/demo-${Date.now()}`);
const capture = fixture();
const result = {
  ...parseCapture(request, capture),
  demo: true,
  notice: "SYNTHETIC DATA. Not current prices and not bookable fares.",
};
await mkdir(out, { recursive: true });
for (const [name, data] of Object.entries({
  "request.json": request,
  "capture.json": capture,
  "flights.json": result,
}))
  await writeFile(resolve(out, name), JSON.stringify(data, null, 2) + "\n", {
    flag: "wx",
  });
await writeFile(resolve(out, "flights.csv"), toCsv(result), { flag: "wx" });
await writeFile(resolve(out, "SYNTHETIC-DEMO.txt"), result.notice + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify(
    {
      status: "offline_demo_complete",
      demo: true,
      notice: result.notice,
      rows: result.result_count,
      json: resolve(out, "flights.json"),
      csv: resolve(out, "flights.csv"),
    },
    null,
    2,
  ),
);
