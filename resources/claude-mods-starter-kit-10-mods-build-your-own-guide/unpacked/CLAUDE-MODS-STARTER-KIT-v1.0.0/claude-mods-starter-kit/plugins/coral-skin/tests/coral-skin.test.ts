import { describe, expect, test } from "claude-code/testing";

const CORAL = "#e8603c";
const RED = "#d93b3b";
const AMBER = "#f0a33a";
const SAGE = "#9cc5a1";
const surfaces = ["terminal", "desktop"] as const;

// Stands in for the engine's own drawing of every component.
function stub(on: any) {
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("ui.render", ($: any, e: any) =>
    $.ui.resolve(e).Box({ children: [$.ui.resolve(e).Text({ children: `stock:${e.component}` })] }),
  );
  on("command.run", () => ({ text: "unhandled" }));
  const store = new Map<string, unknown>();
  on("store.get", ($: any, e: any) => ({ value: store.get(e.key) }));
  on("store.set", ($: any, e: any) => {
    store.set(e.key, e.value);
    return { value: undefined };
  });
  on("turn.start", ($: any, e: any) => ({ turnId: e.turnId }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
}

async function start($: any, surface: string) {
  await $.session.start({ surface, isInteractive: true, cwd: "/work" } as any);
}

function toolUse(surface: string, tool: string, input: unknown) {
  return {
    plugin: "coral-skin",
    surface,
    component: "ToolUse",
    props: { tool_use_id: "t1", tool, input, isRunning: false, isErrored: false, isInterrupted: false },
  } as any;
}

describe("coral-skin", () => {
  for (const surface of surfaces) {
    test(`tool rows are risk coded on ${surface}`, async ($, on) => {
      stub(on);
      await start($, surface);

      const read = await $.ui.mount(toolUse(surface, "Read", { file_path: "/work/a.txt" }));
      const readChip = await read.find({ type: "Text", text: /READ/ });
      expect(readChip?.props.color).toBe(SAGE);
      expect(await read.find({ type: "Text", text: /stock:ToolUse/ })).toBeDefined();
      await read.unmount();

      const edit = await $.ui.mount(toolUse(surface, "Edit", { file_path: "/work/a.txt", old_string: "a", new_string: "b" }));
      expect((await edit.find({ type: "Text", text: /EDIT/ }))?.props.backgroundColor).toBe(CORAL);
      await edit.unmount();

      const bash = await $.ui.mount(toolUse(surface, "Bash", { command: "ls -la" }));
      expect((await bash.find({ type: "Text", text: /BASH/ }))?.props.backgroundColor).toBe(AMBER);
      expect(await bash.find({ type: "Text", text: /!/ })).toBeUndefined();
      await bash.unmount();

      for (const command of ["rm -rf ./tmp-junk", "git reset --hard HEAD~1", "git push --force origin main", "psql -c 'DROP TABLE users'"]) {
        const risky = await $.ui.mount(toolUse(surface, "Bash", { command }));
        const badge = await risky.find({ type: "Text", text: /! RISK/ });
        expect(badge?.props.backgroundColor).toBe(RED);
        await risky.unmount();
      }
    });

    test(`groups take their riskiest chip on ${surface}`, async ($, on) => {
      stub(on);
      await start($, surface);
      const group = await $.ui.mount({
        plugin: "coral-skin",
        surface,
        component: "ToolGroup",
        props: {
          isActive: false,
          isExpanded: false,
          calls: [
            { tool: "Read", input: { file_path: "/a" }, isRunning: false, isErrored: false, isInterrupted: false },
            { tool: "Grep", input: { pattern: "x" }, isRunning: false, isErrored: false, isInterrupted: false },
          ],
        },
      } as any);
      expect((await group.find({ type: "Text", text: /READ ×2/ }))?.props.color).toBe(SAGE);
      await group.unmount();

    });

    test(`spinner, prompt card and footer on ${surface}`, async ($, on) => {
      stub(on);
      await start($, surface);
      const spinner = await $.ui.mount({
        plugin: "coral-skin",
        surface,
        component: "Spinner",
        props: { word: "Sauteing", message: null, suffix: "…", mode: "thinking" },
      } as any);
      if (surface === "terminal") {
        expect((await spinner.find({ type: "Text", text: /Inking/ }))?.props.color).toBe(CORAL);
        expect(await spinner.find({ type: "Text", text: /✳/ })).toBeDefined();
      } else {
        // The desktop keeps its own row; the plugin rewrites the suffix only.
        expect(await spinner.find({ type: "Text", text: /stock:Spinner/ })).toBeDefined();
      }
      await spinner.unmount();

      const user = await $.ui.mount({
        plugin: "coral-skin",
        surface,
        component: "UserMessage",
        props: { text: "fix the bug", origin: { kind: "composer" }, isExpanded: false },
      } as any);
      expect(await user.find({ type: "Text", text: /fix the bug/ })).toBeDefined();
      expect((await user.find({ type: "Text", text: /❯/ }))?.props.color).toBe(CORAL);
      await user.unmount();

      const assistant = await $.ui.mount({
        plugin: "coral-skin",
        surface,
        component: "AssistantMessage",
        props: { text: "Done.", isFirstOfReply: true },
      } as any);
      expect(await assistant.find({ type: "Text", text: /stock:AssistantMessage/ })).toBeDefined();
      const boxes = await assistant.findAll({ type: "Box" });
      expect(boxes.some((b) => b.props.backgroundColor === CORAL)).toBe(true);
      await assistant.unmount();
    });
  }

  test("terminal footer and destructive count in the spinner", async ($, on) => {
    stub(on);
    on("tool.call", () => ({ result: { stdout: "", stderr: "" } }));
    await start($, "terminal");
    await $.turn.start({ text: "go", turnId: "turn-1" } as any);
    await $.tool.call({ tool: "Bash", command: "rm -rf ./tmp-junk" } as any);
    await $.tool.call({ tool: "Read", file_path: "/work/a.txt" } as any);

    const spinner = await $.ui.mount({
      plugin: "coral-skin",
      surface: "terminal",
      component: "Spinner",
      props: { word: "Sauteing", message: null, suffix: "…", mode: "tool-use" },
    } as any);
    expect(await spinner.find({ type: "Text", text: /2 tools/ })).toBeDefined();
    expect((await spinner.find({ type: "Text", text: /1 risky/ }))?.props.backgroundColor).toBe(RED);
    await spinner.unmount();

    const footer = await $.ui.mount({
      plugin: "coral-skin",
      surface: "terminal",
      component: "TurnDuration",
      props: { word: "Baked", durationMs: 64_000 },
    } as any);
    expect((await footer.find({ type: "Text", text: /Baked for 1m 4s/ }))?.props.color).toBe("#f6efe3");
    await footer.unmount();
  });

  test("/skin off restores stock rendering, /skin risk toggles only the chips", async ($, on) => {
    stub(on);
    await start($, "terminal");

    const status = await $.command.run({ command: "skin", args: "" } as any);
    expect(status.text).toMatch(/skin on/);

    const off = await $.command.run({ command: "skin", args: "off" } as any);
    expect(off.text).toMatch(/skin off/);

    const row = await $.ui.mount(toolUse("terminal", "Bash", { command: "rm -rf ./tmp-junk" }));
    expect(await row.find({ type: "Text", text: /RISK/ })).toBeUndefined();
    expect(await row.find({ type: "Text", text: /stock:ToolUse/ })).toBeDefined();
    await row.unmount();

    const user = await $.ui.mount({
      plugin: "coral-skin",
      surface: "terminal",
      component: "UserMessage",
      props: { text: "hello", origin: { kind: "composer" }, isExpanded: false },
    } as any);
    expect(await user.find({ type: "Text", text: /stock:UserMessage/ })).toBeDefined();
    expect(await user.find({ type: "Text", text: /❯/ })).toBeUndefined();
    await user.unmount();

    const spinner = await $.ui.mount({
      plugin: "coral-skin",
      surface: "terminal",
      component: "Spinner",
      props: { word: "Sauteing", message: null, suffix: "…", mode: "thinking" },
    } as any);
    expect(await spinner.find({ type: "Text", text: /stock:Spinner/ })).toBeDefined();
    await spinner.unmount();

    await $.command.run({ command: "skin", args: "on" } as any);
    const risk = await $.command.run({ command: "skin", args: "risk" } as any);
    expect(risk.text).toMatch(/risk colors off/);
    const plain = await $.ui.mount(toolUse("terminal", "Edit", { file_path: "/work/a.txt" }));
    expect(await plain.find({ type: "Text", text: /EDIT/ })).toBeUndefined();
    await plain.unmount();
    const card = await $.ui.mount({
      plugin: "coral-skin",
      surface: "terminal",
      component: "UserMessage",
      props: { text: "still themed", origin: { kind: "composer" }, isExpanded: false },
    } as any);
    expect(await card.find({ type: "Text", text: /❯/ })).toBeDefined();
    await card.unmount();
  });

  test("a live row redraws when the skin is switched off", async ($, on) => {
    stub(on);
    await start($, "terminal");
    const row = await $.ui.mount(toolUse("terminal", "Edit", { file_path: "/work/a.txt" }));
    expect(await row.find({ type: "Text", text: /EDIT/ })).toBeDefined();
    await $.command.run({ command: "skin", args: "off" } as any);
    expect(await row.find({ type: "Text", text: /EDIT/ })).toBeUndefined();
    await row.unmount();
  });
});
