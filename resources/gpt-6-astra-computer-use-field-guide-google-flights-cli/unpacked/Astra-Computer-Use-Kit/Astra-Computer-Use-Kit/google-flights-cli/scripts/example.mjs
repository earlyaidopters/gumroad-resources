import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: { out: { type: "string" } } });
const out = resolve(values.out ?? `runs/example-${Date.now()}`);
const date = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const request = {
  origin: "SFO",
  destination: "JFK",
  depart: date(90),
  return: date(97),
  adults: 1,
  cabin: "business",
  currency: "CAD",
};
await mkdir(out, { recursive: true });
await writeFile(
  resolve(out, "request.json"),
  JSON.stringify(request, null, 2) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    {
      request_file: resolve(out, "request.json"),
      request,
      next: "Edit the example airports, dates and adult count. Then ask Codex to run flight-search.mjs run --request with this file and a fresh --out directory.",
    },
    null,
    2,
  ),
);
