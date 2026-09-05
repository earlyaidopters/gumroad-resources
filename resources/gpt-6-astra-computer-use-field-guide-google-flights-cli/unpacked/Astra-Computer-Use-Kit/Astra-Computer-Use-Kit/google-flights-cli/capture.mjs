// Pure transformations of supported browser DOM evidence. No browser/network access.
import { createHash } from "node:crypto";
export const loadingPattern =
  /Loading results|Fetching results|Checking prices from multiple sources/i;
export function scrubSnapshot(snapshot) {
  // Keep the complete search/main/footer evidence; exclude the account banner.
  return snapshot.replace(/^- banner:[\s\S]*?(?=^-(?! banner:))/m, "").trim();
}
export function fareBlocks(snapshot) {
  const matches = [
    ...snapshot.matchAll(/^\s*- link "(From .+?Select flight)"\s*$/gm),
  ];
  return matches.map((m, i) => ({
    description: m[1],
    text: snapshot
      .slice(m.index, matches[i + 1]?.index ?? snapshot.length)
      .split(/\n- contentinfo:/)[0],
  }));
}
export function signature(snapshot) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        fareBlocks(snapshot).map((x) =>
          x.text.replace(/ \[active\]/g, "").trim(),
        ),
      ),
    )
    .digest("hex");
}
export function readyObservation(observation) {
  if (
    !observation ||
    !Number.isFinite(Date.parse(observation.at)) ||
    !Array.isArray(observation.loading)
  )
    return false;
  if (!fareBlocks(observation.snapshot ?? "").length) return false;
  if (!/^\s*- tab "Cheapest[^\n]+\[selected\]/m.test(observation.snapshot))
    return false;
  // Unknown loading status cannot be promoted to ready by removing one DOM line.
  if (loadingPattern.test(observation.snapshot) && !observation.loading.length)
    return false;
  if (
    observation.loading.some(
      (x) =>
        typeof x.text !== "string" ||
        typeof x.hidden !== "boolean" ||
        !x.hidden,
    )
  )
    return false;
  const labels =
    observation.snapshot.match(
      /Loading results|Fetching results|Checking prices from multiple sources/gi,
    ) ?? [];
  if (
    labels.some(
      (label) =>
        !observation.loading.some((x) =>
          x.text.toLowerCase().includes(label.toLowerCase()),
        ),
    )
  )
    return false;
  return true;
}
export function validateReadiness(capture) {
  const pair = capture.observations;
  if (
    !Array.isArray(pair) ||
    pair.length !== 2 ||
    !pair.every(readyObservation)
  )
    throw new Error("Capture needs two ready browser observations");
  const age = Date.parse(pair[1].at) - Date.parse(pair[0].at);
  if (age <= 0 || age > 30000)
    throw new Error(
      "Ready observations must be successive and at most 30 seconds apart",
    );
  if (signature(pair[0].snapshot) !== signature(pair[1].snapshot))
    throw new Error("Fare cards changed between observations");
  if (
    capture.snapshot !== pair[1].snapshot ||
    capture.retrieved_at !== pair[1].at
  )
    throw new Error(
      "Capture must retain the latest observed snapshot and time",
    );
  if (!capture.snapshot.includes("Flight details."))
    throw new Error("Full unexpanded card evidence is required");
}
