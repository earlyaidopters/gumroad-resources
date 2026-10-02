import { describe, expect, test } from "claude-code/testing";
import {
  applySpawn,
  applyStepEnd,
  applyStepStart,
  applyToolEnd,
  applyToolStart,
  applyTurnResume,
  applyTurnStart,
  costOf,
  isNoticeText,
  packLane,
  spanFor,
  tickStep,
} from "../hooks/flight-recorder.mjs";

const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-4-5";
const T0 = Date.parse("2026-10-01T12:00:00Z");

type World = {
  now: number;
  usages: Array<Record<string, number> | null>;
  stepMs: number;
  gates: Record<string, { wait: Promise<void>; open: () => void }>;
  opened: unknown[];
};

function engine(on: any, world: World) {
  const store = new Map<string, unknown>();
  on("clock.now", () => ({ value: world.now }));
  on("clock.every", () => ({ value: undefined }));
  on("store.get", ($: any, e: any) => ({ value: store.get(e.key) }));
  on("store.set", ($: any, e: any) => {
    store.set(e.key, e.value);
    return { value: undefined };
  });
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("ui.render", ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }));
  on("ui.open", ($: any, e: any) => {
    world.opened.push(e);
    return { value: { isPlaced: true } };
  });
  on("ui.panes", () => ({ value: [] }));
  on("ui.close", () => ({ value: undefined }));
  on("ui.blit", () => ({ value: {} }));
  on("turn.start", ($: any, e: any) => ({ turnId: e.turnId }));
  on("turn.complete", ($: any, e: any) => ({ text: e.answer ?? "" }));
  on("agent.spawn", ($: any, e: any) => ({ model: HAIKU, agentId: `agent${e.description}` }));
  on("tool.call", async ($: any, e: any) => {
    // "a" waits until "b" is running and two seconds passed: two calls in flight at once.
    const gate = world.gates[e.tool_use_id];
    if (gate) await gate.wait;
    if (e.tool_use_id === "b") {
      world.now += 2000;
      world.gates.a?.open();
    }
    world.now += 100;
    if (e.tool === "Bash" && e.command === "false") return { result: {}, text: "exit 1", isError: true };
    return { result: {}, text: "ok" };
  });
  on("turn.step", async function* ($: any, e: any) {
    const u = world.usages.shift() ?? null;
    world.now += world.stepMs;
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "",
      toolUses: [],
      stopReason: "end_turn",
      usage: u ? { ...u, model: e.model } : null,
    };
  });
}

async function drain(stream: any) {
  for await (const _ of stream) {
    // chunks are not under test
  }
  return stream.result;
}

const start = { surface: "terminal", isInteractive: true, cwd: "/work" } as any;
const run = (args: string) =>
  ({ command: "timeline", args, origin: { kind: "composer" }, presentation: { isFullscreen: true, columns: 190 } }) as any;
const step = (turnId: string, index: number, model = SONNET, agentId?: string) =>
  ({ turnId, index, model, effort: "high", messageCount: index + 1, ...(agentId ? { agentId } : {}) }) as any;
const complete = (turnId: string, agentId?: string) =>
  ({ answer: "ok", durationMs: 1, isAborted: false, reason: "answer", turnId, ...(agentId ? { agentId } : {}) }) as any;
const usage = (input: number, cw: number, cr: number, output: number) => ({
  input_tokens: input,
  cache_creation_input_tokens: cw,
  cache_read_input_tokens: cr,
  output_tokens: output,
});

async function mountPane($: any, surface: "terminal" | "desktop", bodyColumns = 120) {
  return $.ui.mount({
    plugin: "flight-recorder",
    surface,
    component: "Pane",
    requestId: "flight-recorder",
    props: { title: "Flight Recorder", isFocused: false, bodyColumns, placement: "dock", scroll: {}, view: {} },
  } as any);
}

// The Raster's cells as text lines, so tests read the frame as a person would.
async function frameText(ui: any): Promise<{ lines: string[]; rows: number; columns: number }> {
  const raster = await ui.find({ type: "Raster" });
  expect(raster).toBeDefined();
  const { columns, rows, cells } = raster.props as { columns: number; rows: number; cells: string };
  const bin = atob(cells);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const words = new Uint32Array(bytes.buffer);
  expect(words.length).toBe(columns * rows * 3);
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let s = "";
    for (let x = 0; x < columns; x++) s += String.fromCodePoint(words[(y * columns + x) * 3]);
    lines.push(s);
  }
  return { lines, rows, columns };
}

function newWorld(): World {
  return { now: T0, usages: [], stepMs: 0, gates: {}, opened: [] };
}

describe("flight-recorder", () => {
  test("a canned turn: main lane, a subagent lane, costs and the time axis", async ($, on) => {
    const world = newWorld();
    engine(on, world);
    await $.session.start(start);
    await $.command.run(run(""));
    expect(world.opened.length).toBe(1);

    await $.turn.start({ text: "map the api folder", turnId: "t1" } as any);
    // step 0 on sonnet: 1000 in, 2000 cache write, 10000 cache read, 500 out
    // = (1000*2 + 500*10 + 2000*2.5 + 10000*0.2) / 1e6 = $0.014
    world.usages.push(usage(1000, 2000, 10000, 500));
    world.stepMs = 2000;
    await drain($.turn.step(step("t1", 0)));

    // the Agent tool spawns a subagent; it steps on haiku and finishes
    world.now += 100;
    await $.agent.spawn({ prompt: "explore", description: "x9k2", subagentType: "Explore" } as any);
    world.usages.push(usage(100, 0, 0, 200));
    world.stepMs = 3000;
    await drain($.turn.step(step("sub", 0, HAIKU, "agentx9k2")));
    world.stepMs = 0;
    world.now += 500;
    await $.turn.complete(complete("sub", "agentx9k2"));

    await $.tool.call({ tool: "Read", file_path: "/work/a.ts", tool_use_id: "r1" } as any); // takes 1s
    world.now += 2400;
    await $.turn.complete(complete("t1"));

    const ui = await mountPane($, "terminal", 120);
    const { lines } = await frameText(ui);
    const text = lines.join("\n");
    expect(text).toMatch(/FLIGHT RECORDER/);
    expect(text).toMatch(/TURN 1/);
    expect(text).toMatch(/8\.1s/); // elapsed: 2.0 + 0.1 + 3.0 + 0.5 + 0.1 + 2.4
    expect(text).toMatch(/\$0\.014/); // main lane cost
    expect(text).toMatch(/Explore x9k2/); // subagent lane label: type and short id
    expect(text).toMatch(/0s/);
    expect(text).toMatch(/▏2s/); // a finished 9s turn fits the width, ticks every 2s at this width
    expect(text).toMatch(/haiku/); // legend and request label
    expect(text).toMatch(/IDLE/);
    const mainRow = lines.find((l) => l.includes("main"));
    expect(mainRow).toMatch(/sonnet/); // the request bar is labeled with its model family
    await ui.unmount();
  });

  test("parallel tool calls in one lane stack into sub-rows", async ($, on) => {
    const world = newWorld();
    engine(on, world);
    await $.session.start(start);
    await $.turn.start({ text: "go", turnId: "t1" } as any);

    const ui0 = await mountPane($, "terminal", 120);
    const before = (await frameText(ui0)).rows;
    await ui0.unmount();

    let open = () => {};
    const wait = new Promise<void>((r) => (open = r));
    world.gates.a = { wait, open };
    const callA = $.tool.call({ tool: "Bash", command: "sleep 2", tool_use_id: "a" } as any);
    const callB = $.tool.call({ tool: "Read", file_path: "/work/b.ts", tool_use_id: "b" } as any);
    await Promise.all([callA, callB]);
    world.now += 100;

    const ui = await mountPane($, "terminal", 120);
    const after = await frameText(ui);
    expect(after.rows).toBe(before + 1); // main lane is now two rows deep
    await ui.unmount();

    // A later call starts after both ended: back on the first row, no new depth.
    await $.tool.call({ tool: "Bash", command: "false", tool_use_id: "c" } as any);
    const ui2 = await mountPane($, "terminal", 120);
    const last = await frameText(ui2);
    expect(last.rows).toBe(before + 1);
    expect(last.lines.join("\n")).toMatch(/REC/); // the turn is still running
    await ui2.unmount();
  });

  test("bookkeeping: start and end by id, lanes by agentId, packing, scale and cost", async () => {
    let r: any = { count: 0, turns: [] };
    r = applyStepStart(r, { turnId: "t1", agentId: undefined, model: SONNET, segId: "s0", at: 0 });
    expect(r.turns.length).toBe(1);
    expect(r.turns[0].lanes[0].segs[0].t1).toBe(null);
    r = applyStepEnd(r, { agentId: undefined, segId: "s0", at: 1500, usage: { ...usage(0, 0, 0, 1_000_000), model: SONNET }, model: SONNET });
    expect(r.turns[0].lanes[0].segs[0].t1).toBe(1500);
    expect(Math.round((r.turns[0].lanes[0].segs[0].cost) * 1e6)).toBe(Math.round((10) * 1e6)); // a million output tokens on sonnet 5 = $10
    // a subagent's tool before its spawn lands makes a placeholder lane, the spawn names it
    r = applyToolStart(r, { agentId: "agentq7w8", name: "Grep", segId: "g1", at: 1600 });
    expect(r.turns[0].lanes[1].label).toBe("agent q7w8");
    r = applySpawn(r, { id: "agentq7w8", type: "Explore", model: HAIKU, parent: "", toolUseId: "tu1", at: 1601 });
    expect(r.turns[0].lanes.length).toBe(2);
    expect(r.turns[0].lanes[1].label).toBe("Explore q7w8");
    r = applyToolEnd(r, { agentId: "agentq7w8", segId: "g1", at: 1700, failed: true });
    expect(r.turns[0].lanes[1].segs[0]).toMatchObject({ t1: 1700, err: true, name: "Grep" });

    // packing: overlap stacks, a tool starting just as its request closes does not
    const segs = [
      { t0: 0, t1: 1000 },
      { t0: 900, t1: 1200 }, // within tolerance of the request's end: same row
      { t0: 1300, t1: 5000 },
      { t0: 1400, t1: 2000 }, // overlaps: second row
      { t0: 1500, t1: null }, // overlaps both: third row
      { t0: 6000, t1: 7000 }, // after all closed ones; the open one still holds row 2
    ];
    const packed = packLane(segs as any);
    expect(packed.rows).toEqual([0, 0, 0, 1, 2, 0]);
    expect(packed.depth).toBe(3);

    // a request yields its row once its first tool starts (tools run while it still streams)
    const streamed = packLane([
      { kind: "req", t0: 0, t1: 5000 },
      { kind: "tool", t0: 3000, t1: 4500 },
      { kind: "tool", t0: 3100, t1: 3900 }, // a parallel call: the second row
    ] as any);
    expect(streamed.rows).toEqual([0, 0, 1]);
    expect(streamed.depth).toBe(2);

    // a turn started to deliver a background agent's result resumes the person's turn
    let t: any = applyTurnStart({ count: 0, turns: [] }, { id: "u1", prompt: "fan out", at: 0 });
    t = applyStepStart(t, { turnId: "u1", agentId: undefined, model: SONNET, segId: "m0", at: 10 });
    expect(isNoticeText("<task-notification>\n<task-id>x</task-id>")).toBe(true);
    expect(isNoticeText("summarize the api")).toBe(false);
    t = applyTurnResume(t, { id: "u2", at: 9000 });
    expect(t.turns.length).toBe(1);
    expect(t.turns[0]).toMatchObject({ n: 1, id: "u2", t1: null, prompt: "fan out" });

    // scale: live spans snap up to nice values, finished turns fit exactly
    expect(spanFor(4000, true)).toBe(10_000);
    expect(spanFor(25_000, true)).toBe(30_000);
    expect(spanFor(58_000, true)).toBe(90_000);
    expect(spanFor(58_000, false)).toBe(58_000);
    expect(tickStep(30_000, 90)).toBe(5);
    expect(tickStep(600_000, 90)).toBe(60);

    // cost: model-router's price table
    expect(Math.round((costOf("claude-opus-5-5", usage(1_000_000, 0, 0, 0))) * 1e6)).toBe(Math.round((4) * 1e6));
    expect(Math.round((costOf("claude-haiku-4-5", usage(0, 1_000_000, 1_000_000, 0))) * 1e6)).toBe(Math.round((1.35) * 1e6));
    expect(Math.round((costOf("claude-fable-5", usage(0, 0, 0, 1_000_000))) * 1e6)).toBe(Math.round((50) * 1e6));
    expect(costOf("some-other-model", usage(1000, 0, 0, 1000))).toBe(0);
  });

  test("live scale: the span rounds up to a nice value and the now edge walks", async ($, on) => {
    const world = newWorld();
    engine(on, world);
    await $.session.start(start);
    await $.turn.start({ text: "go", turnId: "t1" } as any);
    world.now += 25_000;
    const ui = await mountPane($, "terminal", 120);
    const { lines } = await frameText(ui);
    const axis = lines.find((l) => l.includes("LANE"))!;
    // 25s elapsed live: a 30s span, ticks at 0s 5s ... 25s, never 30s past the edge
    expect(axis).toMatch(/0s/);
    expect(axis).toMatch(/10s/);
    expect(axis).toMatch(/25s/);
    expect(lines.join("\n")).toMatch(/25\.0s/);
    await ui.unmount();
  });

  test("subagent steps attach to their own lane by agentId, nested under the parent", async ($, on) => {
    const world = newWorld();
    engine(on, world);
    await $.session.start(start);
    await $.turn.start({ text: "fan out", turnId: "t1" } as any);
    await $.agent.spawn({ prompt: "a", description: "aaaa", subagentType: "Explore" } as any);
    await $.agent.spawn({ prompt: "b", description: "bbbb", subagentType: "Plan" } as any);
    await $.agent.spawn({ prompt: "c", description: "cccc", subagentType: "general-purpose", parentAgentId: "agentaaaa" } as any);
    world.usages.push(usage(10, 0, 0, 10), usage(10, 0, 0, 10), usage(10, 0, 0, 10));
    await drain($.turn.step(step("x", 0, HAIKU, "agentbbbb")));
    await drain($.turn.step(step("x", 1, HAIKU, "agentbbbb")));
    await drain($.turn.step(step("y", 0, HAIKU, "agentcccc")));
    world.now += 4000;
    const ui = await mountPane($, "terminal", 120);
    const { lines } = await frameText(ui);
    const idx = (s: string) => lines.findIndex((l) => l.includes(s));
    expect(idx("Explore aaaa")).toBeGreaterThan(idx("main"));
    // the nested agent sits under its parent, before the sibling spawned earlier
    // (a long type is trimmed to keep the short id in the label column)
    expect(idx("general- cccc")).toBeGreaterThan(idx("Explore aaaa"));
    expect(idx("Plan bbbb")).toBeGreaterThan(idx("general- cccc"));
    const planRow = lines[idx("Plan bbbb")];
    expect(planRow).toMatch(/\s2\s/); // two requests on the Plan lane
    await ui.unmount();
  });

  test("turns, clear and the text fallback off the terminal", async ($, on) => {
    const world = newWorld();
    engine(on, world);
    await $.session.start(start);
    for (const id of ["t1", "t2", "t3"]) {
      await $.turn.start({ text: `prompt ${id}`, turnId: id } as any);
      world.usages.push(usage(100, 0, 0, 100));
      world.now += 1000;
      await drain($.turn.step(step(id, 0)));
      await $.turn.complete(complete(id));
      world.now += 1000;
    }
    let ui = await mountPane($, "terminal", 120);
    let text = (await frameText(ui)).lines.join("\n");
    expect(text).toMatch(/TURN 3/);
    expect(text).not.toMatch(/TURN 2/);
    await ui.unmount();

    const shown = await $.command.run(run("turns 3"));
    expect(shown.text).toMatch(/last 3 turns/);
    ui = await mountPane($, "terminal", 120);
    text = (await frameText(ui)).lines.join("\n");
    expect(text).toMatch(/TURN 3[\s\S]*TURN 2[\s\S]*TURN 1/); // newest first
    await ui.unmount();

    const bad = await $.command.run(run("turns 99"));
    expect(bad.text).toMatch(/Usage/);

    const desk = await mountPane($, "desktop", 120);
    expect(await desk.find({ type: "Text", text: /Turn 3/ })).toBeDefined();
    expect(await desk.find({ type: "Text", text: /main\s+sonnet\s+1 req/ })).toBeDefined();
    await desk.unmount();

    await $.command.run(run("clear"));
    ui = await mountPane($, "terminal", 120);
    text = (await frameText(ui)).lines.join("\n");
    expect(text).toMatch(/Waiting for the next turn/);
    await ui.unmount();

    // turn numbers keep counting after a clear
    await $.turn.start({ text: "again", turnId: "t4" } as any);
    ui = await mountPane($, "terminal", 80);
    text = (await frameText(ui)).lines.join("\n");
    expect(text).toMatch(/TURN 4/);
    await ui.unmount();
  });
});
