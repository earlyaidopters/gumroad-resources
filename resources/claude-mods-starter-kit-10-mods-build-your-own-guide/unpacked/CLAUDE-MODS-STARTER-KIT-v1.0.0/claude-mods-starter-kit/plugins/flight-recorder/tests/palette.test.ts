import { describe, expect, test } from "claude-code/testing";
import {
  brightnessStep,
  applyComplete,
  applySpawn,
  applyStepEnd,
  applyStepStart,
  applyToolEnd,
  applyToolStart,
  applyTurnStart,
  buildFrame,
} from "../hooks/flight-recorder.mjs";

const MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5", "claude-fable-5", "gpt-x"];
const TOOLS = ["Read", "Grep", "Glob", "Edit", "Write", "Bash", "Agent", "mcp__srv__do", "TodoWrite", "WebFetch"];

// A deterministic pseudo-random walk, so the session is the same every run.
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

// Every (fg, bg) pair a frame paints, as the terminal's palette sees it
// (colors quantized to 16 levels per channel).
function pairsOf(words: Uint32Array, into: Set<string>) {
  const q = (c: number) => (c & 0x01000000 ? "d" : String(c & 0xf0f0f0));
  for (let i = 0; i < words.length; i += 3) into.add(`${q(words[i + 1])}/${q(words[i + 2])}`);
}

describe("palette", () => {
  test("a long session stays well under the terminal's 1024 color pairs", async () => {
    const rand = rng(7);
    const pairs = new Set<string>();
    const raw = new Set<string>();
    let r: any = { count: 0, turns: [] };
    let now = 1_000_000;
    const snap = (turns: number) => {
      for (const columns of [80, 120, 170]) {
        const { words } = buildFrame(r, { turns }, { columns, now });
        pairsOf(words, pairs);
        for (let i = 0; i < words.length; i += 3) raw.add(`${words[i + 1]}/${words[i + 2]}`);
      }
    };
    for (let turn = 0; turn < 30; turn++) {
      const id = `t${turn}`;
      r = applyTurnStart(r, { id, prompt: `prompt ${turn}`, at: now });
      const lanes: Array<string | undefined> = [undefined];
      for (let a = 0; a < Math.floor(rand() * 4); a++) {
        const agentId = `agent${turn}x${a}`;
        r = applySpawn(r, { id: agentId, type: "Explore", model: MODELS[a % 4], parent: "", toolUseId: `tu${turn}${a}`, at: now });
        lanes.push(agentId);
      }
      for (let step = 0; step < 12; step++) {
        const agentId = lanes[Math.floor(rand() * lanes.length)];
        const model = MODELS[Math.floor(rand() * MODELS.length)];
        const segId = `s${turn}:${step}`;
        r = applyStepStart(r, { turnId: id, agentId, model, segId, at: now });
        now += 200 + Math.floor(rand() * 4000);
        snap(1); // a live frame mid-request
        const out = Math.floor(10 ** (rand() * 4));
        const usage = rand() < 0.1 ? null : { input_tokens: 100, cache_creation_input_tokens: 1000, cache_read_input_tokens: 5000, output_tokens: out, model };
        r = applyStepEnd(r, { agentId, segId, at: now, usage, model });
        const calls = 1 + Math.floor(rand() * 3);
        for (let c = 0; c < calls; c++) {
          r = applyToolStart(r, { agentId, name: TOOLS[Math.floor(rand() * TOOLS.length)], segId: `t:${turn}:${step}:${c}`, at: now + c * 30 });
        }
        now += 50 + Math.floor(rand() * 3000);
        snap(1); // a live frame mid-tools
        for (let c = 0; c < calls; c++) {
          r = applyToolEnd(r, { agentId, segId: `t:${turn}:${step}:${c}`, at: now, failed: rand() < 0.15 });
        }
      }
      for (const agentId of lanes.slice(1)) r = applyComplete(r, { agentId, turnId: "x", at: now });
      r = applyComplete(r, { agentId: undefined, turnId: id, at: now });
      snap(1);
      snap(10);
    }
    expect([1, 29, 30, 299, 300, 1499, 1500, 99999].map(brightnessStep)).toEqual([0.55, 0.55, 0.7, 0.7, 0.85, 0.85, 1, 1]);
    console.log(`distinct color pairs over 30 turns: ${pairs.size} quantized, ${raw.size} raw`);
    expect(pairs.size < 512).toBe(true);
    expect(raw.size < 512).toBe(true);
  });
});
