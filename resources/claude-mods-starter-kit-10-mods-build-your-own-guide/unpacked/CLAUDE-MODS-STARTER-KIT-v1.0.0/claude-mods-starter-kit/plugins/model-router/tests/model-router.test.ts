import { describe, expect, test } from "claude-code/testing";

const OPUS = "claude-opus-5-5";
const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-4-5";
const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 };

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

const usage = (input: number, cw: number, cr: number, output: number): Usage => ({
  input_tokens: input,
  cache_creation_input_tokens: cw,
  cache_read_input_tokens: cr,
  output_tokens: output,
});

const assistant = (uses: Array<{ id: string; tool: string; input?: object; isError?: true }>) => ({
  role: "assistant",
  text: "",
  toolUses: uses.map((u) => ({
    tool_use_id: u.id,
    tool: u.tool,
    input: u.input ?? {},
    text: "ok",
    ...(u.isError ? { isError: true } : {}),
  })),
});
const results = { role: "user", text: "", toolUses: [], toolResults: [{ tool_use_id: "x", text: "ok" }] };
const prompt = { role: "user", text: "do the thing", toolUses: [] };

async function drain(stream: AsyncGenerator<unknown, unknown> & { result: Promise<any> }) {
  for await (const _ of stream) {
    // chunks are not under test
  }
  return stream.result;
}

// Hooks beneath the plugin: the engine's answers. `world` is what they read.
function engine(on: any, world: { messages: unknown[]; sent: string[]; usages: Usage[]; efforts: unknown[] }) {
  const store = new Map<string, unknown>();
  on("store.get", ($: any, e: any) => ({ value: store.get(e.key) }));
  on("store.set", ($: any, e: any) => {
    store.set(e.key, e.value);
    return { value: undefined };
  });
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("ui.render", ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }));
  on("session.messages", () => ({ value: world.messages }));
  on("tool.call", ($: any, e: any) => ({ result: {}, text: "ok", ...(e.tool === "Bash" && e.command === "npm test" ? { isReadOnly: true } : {}) }));
  on("turn.step", async function* ($: any, e: any) {
    world.sent.push(e.model);
    world.efforts.push(e.effort);
    const u = world.usages.shift() ?? usage(0, 0, 0, 0);
    return { turnId: e.turnId, index: e.index, answer: "", toolUses: [], stopReason: "end_turn", usage: { ...u, model: e.model } };
  });
}

const start = { surface: "terminal", isInteractive: true, cwd: "/work" } as any;
const step = (index: number, effort: string = "high") =>
  ({ turnId: "t1", index, model: OPUS, effort, messageCount: index + 1 }) as any;
const run = (command: string, args: string) =>
  ({ command, args, origin: { kind: "composer" }, presentation: { isFullscreen: false, columns: 120 } }) as any;

describe("model-router", () => {
  test("routing rule", async ($, on) => {
    const world = { messages: [prompt] as unknown[], sent: [] as string[], usages: [] as Usage[], efforts: [] as unknown[] };
    engine(on, world);
    await $.session.start(start);
    await $.command.run(run("router", "on"));
    await $.command.run(run("router", "sonnet"));
    await $.command.run(run("router", "mode steps"));

    // Step 0 answers the prompt: the session model.
    await drain($.turn.step(step(0)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);

    // After read-only tools: the cheap model, effort kept.
    world.messages = [prompt, assistant([{ id: "a", tool: "Read" }, { id: "b", tool: "Grep" }]), results];
    await drain($.turn.step(step(1)) as any);
    expect(world.sent.at(-1)).toBe(SONNET);
    expect(world.efforts.at(-1)).toBe("high");

    // After an Edit: back on the session model.
    world.messages = [prompt, assistant([{ id: "c", tool: "Read" }, { id: "d", tool: "Edit" }]), results];
    await drain($.turn.step(step(2)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);

    // After a failing read: the session model.
    world.messages = [prompt, assistant([{ id: "e", tool: "Read", isError: true }]), results];
    await drain($.turn.step(step(3)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);

    // Bash: read-only by pattern, or by the engine's own verdict; otherwise not.
    world.messages = [prompt, assistant([{ id: "f", tool: "Bash", input: { command: "git status" } }]), results];
    await drain($.turn.step(step(4)) as any);
    expect(world.sent.at(-1)).toBe(SONNET);

    await $.tool.call({ tool: "Bash", command: "npm test", tool_use_id: "g" } as any);
    world.messages = [prompt, assistant([{ id: "g", tool: "Bash", input: { command: "npm test" } }]), results];
    await drain($.turn.step(step(5)) as any);
    expect(world.sent.at(-1)).toBe(SONNET);

    world.messages = [prompt, assistant([{ id: "h", tool: "Bash", input: { command: "rm -rf build" } }]), results];
    await drain($.turn.step(step(6)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);

    // No tool results (a continuation): the session model.
    world.messages = [prompt, assistant([])];
    await drain($.turn.step(step(7)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);

    // Subagent steps are left alone.
    world.messages = [prompt, assistant([{ id: "i", tool: "Read" }]), results];
    await drain($.turn.step({ ...step(8), agentId: "agent-1" }) as any);
    expect(world.sent.at(-1)).toBe(OPUS);

    // Haiku: routed there, with the effort setting dropped.
    await $.command.run(run("router", "haiku"));
    await drain($.turn.step(step(9)) as any);
    expect(world.sent.at(-1)).toBe(HAIKU);
    expect(world.efforts.at(-1)).toBeUndefined();

    // Off: untouched, even after read-only tools.
    await $.command.run(run("router", "off"));
    await drain($.turn.step(step(10)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);
  });

  test("savings math: a cold switch costs more, a warm one saves", async ($, on) => {
    const world = { messages: [prompt] as unknown[], sent: [] as string[], usages: [] as Usage[], efforts: [] as unknown[] };
    engine(on, world);
    await $.session.start(start);
    await $.command.run(run("router", "on"));
    await $.command.run(run("router", "sonnet"));
    await $.command.run(run("router", "mode steps"));

    // Opus answers: 20,510 tokens of prompt and reply now sit in its cache.
    world.usages.push(usage(10, 20_000, 0, 500));
    await drain($.turn.step(step(0)) as any);

    // Sonnet writes 21,000 cold: $0.06252 actual vs $0.026592 on Opus (reads 20,510).
    world.messages = [prompt, assistant([{ id: "a", tool: "Read" }]), results];
    world.usages.push(usage(10, 21_000, 0, 1_000));
    await drain($.turn.step(step(1)) as any);
    let status = (await $.command.run(run("router", ""))).text ?? "";
    expect(status).toMatch(/Main loop 1 of 2 steps routed/);
    expect(status).toMatch(/Routed main steps cost \$0\.06 vs ~\$0\.03 on claude-opus-5-5, net ~\$0\.04 more/);

    // Sonnet reads its own warm cache: $0.04527 actual vs $0.08414 on Opus.
    world.messages = [prompt, assistant([{ id: "b", tool: "Grep" }]), results];
    world.usages.push(usage(10, 500, 20_000, 4_000));
    await drain($.turn.step(step(2)) as any);
    status = (await $.command.run(run("router", ""))).text ?? "";
    // Totals: $0.10779 actual vs $0.110732 counterfactual, saved ~$0.0029.
    expect(status).toMatch(/Main loop 2 of 3 steps routed/);
    expect(status).toMatch(/Routed main steps cost \$0\.11 vs ~\$0\.11 on claude-opus-5-5, saved ~\$0\.0029/);
    expect(status).toMatch(/turn 1 step 2 → sonnet \(after Grep\)/);
    expect(status).toMatch(/turn 1 step 0 stays on claude-opus-5-5 \(first step answers the prompt\)/);
  });

  test("band (steps mode) shows once something routed, hides when off or under a survey", async ($, on) => {
    const world = { messages: [prompt] as unknown[], sent: [] as string[], usages: [] as Usage[], efforts: [] as unknown[] };
    engine(on, world);
    await $.session.start(start);
    await $.command.run(run("router", "on"));
    await $.command.run(run("router", "sonnet"));
    await $.command.run(run("router", "mode steps"));

    for (const surface of ["terminal", "desktop"] as const) {
      const ui = await $.ui.mount({ plugin: "model-router", surface, component: "AbovePrompt", props: BAND } as any);
      expect(await ui.find({ type: "Text", text: /router on/ })).toBeUndefined();
      await ui.unmount();
    }

    world.usages.push(usage(10, 20_000, 0, 500));
    await drain($.turn.step(step(0)) as any);
    world.messages = [prompt, assistant([{ id: "a", tool: "Read" }]), results];
    world.usages.push(usage(10, 500, 20_000, 4_000));
    await drain($.turn.step(step(1)) as any);

    for (const surface of ["terminal", "desktop"] as const) {
      const ui = await $.ui.mount({ plugin: "model-router", surface, component: "AbovePrompt", props: BAND } as any);
      expect(await ui.find({ type: "Text", text: /⇄ router steps/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /1 of 2 main steps → sonnet/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /saved ~\$0\.04/ })).toBeDefined();
      await ui.unmount();
    }

    const survey = await $.ui.mount({
      plugin: "model-router", surface: "terminal", component: "AbovePrompt", props: { ...BAND, hasSurvey: true },
    } as any);
    expect(await survey.find({ type: "Text", text: /router on/ })).toBeUndefined();
    await survey.unmount();

    await $.command.run(run("router", "off"));
    const off = await $.ui.mount({ plugin: "model-router", surface: "terminal", component: "AbovePrompt", props: BAND } as any);
    expect(await off.find({ type: "Text", text: /router/ })).toBeUndefined();
    await off.unmount();
  });

  test("commands persist on/off and the cheap model across sessions", async ($, on) => {
    const world = { messages: [prompt] as unknown[], sent: [] as string[], usages: [] as Usage[], efforts: [] as unknown[] };
    engine(on, world);
    await $.session.start(start);

    expect((await $.command.run(run("router", "haiku"))).text).toMatch(/cheap model set to haiku/);
    expect((await $.command.run(run("router", "off"))).text).toMatch(/Model router off/);
    expect((await $.command.run(run("router", "bogus"))).text).toMatch(/Usage \/router/);

    // A new session reads the choices back from the store.
    await $.session.start(start);
    let status = (await $.command.run(run("router", ""))).text ?? "";
    expect(status).toMatch(/Model router off · mode subagents · cheap model haiku/);

    expect((await $.command.run(run("router", "on"))).text).toMatch(/mode subagents · cheap model haiku/);
    await $.command.run(run("router", "sonnet"));
    await $.session.start(start);
    status = (await $.command.run(run("router", ""))).text ?? "";
    expect(status).toMatch(/Model router on · mode subagents · cheap model sonnet \(claude-sonnet-5-5\)/);
  });

  test("subagents mode: every subagent step goes cheap, main loop untouched, savings at the subagent's own model", async ($, on) => {
    const world = { messages: [prompt] as unknown[], sent: [] as string[], usages: [] as Usage[], efforts: [] as unknown[] };
    engine(on, world);
    await $.session.start(start);

    // Fresh store: on, sonnet, subagents mode.
    let status = (await $.command.run(run("router", ""))).text ?? "";
    expect(status).toMatch(/Model router on · mode subagents · cheap model sonnet/);
    expect((await $.command.run(run("router", "mode bogus"))).text).toMatch(/Pick one of \/router mode subagents, steps or both/);

    // The main loop is left alone, even after read-only tools.
    world.messages = [prompt, assistant([{ id: "a", tool: "Read" }]), results];
    await drain($.turn.step(step(1)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);

    // Every step of the subagent goes to sonnet, step 0 included.
    world.usages.push(usage(10, 20_000, 0, 1_000));
    await drain($.turn.step({ ...step(0), agentId: "agent-abc" }) as any);
    expect(world.sent.at(-1)).toBe(SONNET);
    world.usages.push(usage(10, 500, 20_000, 1_000));
    await drain($.turn.step({ ...step(1), agentId: "agent-abc" }) as any);
    expect(world.sent.at(-1)).toBe(SONNET);

    // A subagent already on a model no dearer than the cheap one is left alone.
    await drain($.turn.step({ ...step(0), model: HAIKU, agentId: "agent-hk" }) as any);
    expect(world.sent.at(-1)).toBe(HAIKU);

    // Same usage priced both ways: $0.07529 on sonnet vs $0.14658 on opus.
    status = (await $.command.run(run("router", ""))).text ?? "";
    expect(status).toMatch(/Subagents 1 routed, 2 steps, cost \$0\.08 vs ~\$0\.15 on their own model, saved ~\$0\.07/);
    expect(status).toMatch(/Main loop 0 of 1 steps routed/);
    expect(status).toMatch(/subagent agent-ab, all its steps → sonnet/);

    const ui = await $.ui.mount({ plugin: "model-router", surface: "terminal", component: "AbovePrompt", props: BAND } as any);
    expect(await ui.find({ type: "Text", text: /⇄ router subagents/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /2 subagent steps → sonnet/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /saved ~\$0\.07/ })).toBeDefined();
    await ui.unmount();

    // Steps mode leaves subagents alone.
    await $.command.run(run("router", "mode steps"));
    await drain($.turn.step({ ...step(2), agentId: "agent-abc" }) as any);
    expect(world.sent.at(-1)).toBe(OPUS);
  });

  test("both mode routes subagents and read-only main-loop steps", async ($, on) => {
    const world = { messages: [prompt] as unknown[], sent: [] as string[], usages: [] as Usage[], efforts: [] as unknown[] };
    engine(on, world);
    await $.session.start(start);
    expect((await $.command.run(run("router", "mode both"))).text).toMatch(/mode set to both/);

    await drain($.turn.step(step(0)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);
    world.messages = [prompt, assistant([{ id: "a", tool: "Read" }]), results];
    await drain($.turn.step(step(1)) as any);
    expect(world.sent.at(-1)).toBe(SONNET);
    world.messages = [prompt, assistant([{ id: "b", tool: "Edit" }]), results];
    await drain($.turn.step(step(2)) as any);
    expect(world.sent.at(-1)).toBe(OPUS);
    await drain($.turn.step({ ...step(0), agentId: "agent-xyz" }) as any);
    expect(world.sent.at(-1)).toBe(SONNET);

    const ui = await $.ui.mount({ plugin: "model-router", surface: "desktop", component: "AbovePrompt", props: BAND } as any);
    expect(await ui.find({ type: "Text", text: /⇄ router both/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /1 subagent step \+ 1 of 3 main steps → sonnet/ })).toBeDefined();
    await ui.unmount();

    // The mode survives a new session.
    await $.session.start(start);
    expect((await $.command.run(run("router", ""))).text).toMatch(/mode both/);
  });
});

// Some hosts send null for the main conversation; it must never become a helper.
test("null main agent stays on its model in default subagents mode", async ($, on) => {
  const world = { messages: [prompt] as unknown[], sent: [] as string[], usages: [] as Usage[], efforts: [] as unknown[] };
  engine(on, world);
  await $.session.start(start);
  await drain($.turn.step({ ...step(0), agentId: null }) as any);
  expect(world.sent.at(-1)).toBe(OPUS);
  await drain($.turn.step({ ...step(0), agentId: "helper" }) as any);
  expect(world.sent.at(-1)).toBe(SONNET);
});
