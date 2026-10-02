import { describe, expect, test } from "claude-code/testing";

describe("context-meter", () => {
  test("the band follows context, cost and limits", async ($, on) => {
    // Hooks registered here run after the mod and stub what Claude Code would answer.
    on("session.start", ($, e) => ({ cwd: e.cwd }));
    on("ui.render", ($, e) => $.ui.resolve(e).Box({ children: [] })); // stands in for the empty core band
    on("session.usage", () => ({
      value: {
        startedAt: 0,
        context: { tokens: 36_100, window: 200_000, percent: 18 },
        rateLimits: [{ kind: "five_hour", percentUsed: 5 }, { kind: "seven_day", percentUsed: 74 }],
        cost: { usd: 0.42 },
      },
    }));
    on("session.measure", ($, e) => ({ changed: e.changed }));

    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
    const ui = await $.ui.mount({
      plugin: "context-meter",
      surface: "terminal",
      component: "AbovePrompt",
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 },
    } as any);
    expect(await ui.find({ type: "Text", text: /18%/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /\$0\.42/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /74%/ })).toBeDefined();

    await $.session.measure({
      context: { tokens: 164_000, window: 200_000, percent: 82 },
      rateLimits: [{ kind: "five_hour", percentUsed: 12 }, { kind: "seven_day", percentUsed: 91 }],
      cost: { usd: 1.37 },
      changed: ["context", "cost", "rateLimits"],
    } as any);
    expect(await ui.find({ type: "Text", text: /82%/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /164k\/200k/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /\$1\.37/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /\+\$0\.95/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /91%/ })).toBeDefined();
    await ui.unmount();
  });

  test("yields to a survey", async ($, on) => {
    on("session.start", ($, e) => ({ cwd: e.cwd }));
    on("ui.render", ($, e) => $.ui.resolve(e).Box({ children: [] })); // stands in for the empty core band
    on("session.usage", () => ({
      value: { startedAt: 0, context: { tokens: 1_000, window: 200_000, percent: 1 }, rateLimits: [], cost: { usd: 0 } },
    }));
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
    const ui = await $.ui.mount({
      plugin: "context-meter",
      surface: "terminal",
      component: "AbovePrompt",
      props: { hasSurvey: true, isWorking: false, maxRows: 10, bodyColumns: 120 },
    } as any);
    expect(await ui.find({ type: "Text", text: /1%/ })).toBeUndefined();
    await ui.unmount();
  });
});
