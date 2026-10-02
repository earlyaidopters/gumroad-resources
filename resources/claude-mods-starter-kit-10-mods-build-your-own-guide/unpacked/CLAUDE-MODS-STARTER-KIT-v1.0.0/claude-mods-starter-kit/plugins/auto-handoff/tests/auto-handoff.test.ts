import { describe, expect, mock, test } from "claude-code/testing";
import { ensureIgnored, ignoresHandoff, splitReply, timestamp, writeHandoff } from "../hooks/auto-handoff.mjs";

const CWD = "/work/demo";
const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, view: {} };
const MSGS = [{ role: "user", text: "hi", toolUses: [] }] as any;
const START = new Date(2026, 9, 1, 9, 5, 7).getTime();

// An in-memory file system beneath the plugin, plus the engine answers it needs.
function world(
  on: any,
  files: Record<string, string> = {},
  mtimes: Record<string, number> = {},
  startedAt = 9e15,
) {
  const fs = new Map<string, string>(Object.entries(files));
  const seen = { failNext: false, forks: 0, toasts: [] as string[], logs: [] as string[], prompts: [] as string[] };
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("fs.exists", ($: any, e: any) => ({
    value: fs.has(e.path) || [...fs.keys()].some((k) => k.startsWith(e.path + "/")),
  }));
  on("fs.read", ($: any, e: any) => {
    if (!fs.has(e.path)) throw new Error(`ENOENT ${e.path}`);
    return { value: fs.get(e.path) };
  });
  on("fs.write", ($: any, e: any) => {
    fs.set(e.path, e.text);
    return { value: undefined };
  });
  on("fs.stat", ($: any, e: any) => ({
    value: { kind: "file", size: (fs.get(e.path) ?? "").length, mtimeMs: mtimes[e.path] ?? 0, isLink: false },
  }));
  on("model.fork", () => {
    seen.forks += 1;
    if (seen.failNext) { seen.failNext = false; return {value:{isAnswered:false,reason:"test failure"}}; }
    return {
      value: {
        isAnswered: true,
        text: "LATEST: Built the demo widget, tests pass.\n\n## 1. Session intent\nBuild the demo.\n",
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    };
  });
  on("ui.toast", ($: any, e: any) => {
    seen.toasts.push(e.text);
    return { value: undefined };
  });
  on("ui.log", ($: any, e: any) => {
    seen.logs.push(e.text);
    return { value: undefined };
  });
  on("prompt.submit", ($: any, e: any) => {
    seen.prompts.push(e.text);
    return { text: e.text };
  });
  on("session.usage", () => ({
    value: { startedAt, context: { tokens: 40_000, window: 200_000, percent: 20 }, rateLimits: [], cost: { usd: 0 } },
  }));
  on("session.measure", ($: any, e: any) => ({ changed: e.changed }));
  on("turn.complete", () => ({ text: "" }));
  on("ui.render", ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }));
  return { fs, seen };
}

const measure = (percent: number) =>
  ({ context: { tokens: percent * 2000, window: 200_000, percent }, rateLimits: [], changed: ["context"] }) as any;
const run = (args: string) =>
  ({ command: "autohandoff", args, origin: { kind: "composer" }, presentation: { isFullscreen: false, columns: 120 } }) as any;
const handoffs = (fs: Map<string, string>) =>
  [...fs.keys()].filter((k) => /\/handoff\/handoff-.*\.md$/.test(k)).sort();

describe("auto-handoff", () => {
  test("crossing the threshold writes exactly one handoff, and re-arms below it", async ($, on) => {
    const clock = mock.clock(on, { now: START });
    mock.store(on);
    const { fs, seen } = world(on, { [`${CWD}/.git/HEAD`]: "ref" });
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);

    await $.session.measure(measure(50));
    await clock.settle();
    expect(seen.forks).toBe(0);

    await $.session.measure(measure(86));
    await clock.settle();
    expect(seen.forks).toBe(1);
    expect(handoffs(fs).length).toBe(1);

    await $.session.measure(measure(90));
    await $.session.measure(measure(95));
    await clock.settle();
    expect(seen.forks).toBe(1);

    // A compaction drops the fill; the next crossing writes again.
    await clock.advance(2000);
    await $.session.measure(measure(30));
    await $.session.measure(measure(87));
    await clock.settle();
    expect(seen.forks).toBe(2);
    expect(handoffs(fs).length).toBe(2);
    expect(seen.toasts[0]).toMatch(/^Handoff saved to handoff\/handoff-/);
  });

  test("filename, LATEST.md, ACTIVE_PROJECT.md and the new .gitignore", async ($, on) => {
    mock.clock(on, { now: START });
    mock.store(on);
    const { fs, seen } = world(on, { [`${CWD}/.git/HEAD`]: "ref" });
    await $.session.start({ surface: null, isInteractive: false, cwd: CWD } as any);

    const out = await $.command.run(run("now"));
    expect(out.text).toBe("Handoff saved to handoff/handoff-2026-10-01-090507.md");
    const file = fs.get(`${CWD}/handoff/handoff-2026-10-01-090507.md`) ?? "";
    expect(file).toMatch(/^# Handoff, demo, 2026-10-01 09:05:07/);
    expect(file).toContain("## 1. Session intent");
    expect(file).not.toContain("LATEST:");
    expect(fs.get(`${CWD}/handoff/LATEST.md`)).toBe(
      "handoff-2026-10-01-090507.md\nBuilt the demo widget, tests pass.\n",
    );
    expect(fs.get(`${CWD}/handoff/ACTIVE_PROJECT.md`)).toBe(
      ".\nhandoff-2026-10-01-090507.md\nBuilt the demo widget, tests pass.\n",
    );
    expect(fs.get(`${CWD}/.gitignore`)).toBe("handoff/\n");

    // Same second again: never overwrite, add a suffix.
    const again = await $.command.run(run("now"));
    expect(again.text).toBe("Handoff saved to handoff/handoff-2026-10-01-090507-2.md");
    expect(seen.logs.some((l) => l.includes("saved handoff/handoff-2026-10-01-090507.md"))).toBe(true);
  });

  test("leaves a nested ACTIVE_PROJECT.md pointer alone", async ($, on) => {
    mock.clock(on, { now: START });
    mock.store(on);
    const { fs } = world(on, { [`${CWD}/handoff/ACTIVE_PROJECT.md`]: "apps/web\nhandoff-x.md\nweb work\n" });
    await $.session.start({ surface: null, isInteractive: false, cwd: CWD } as any);
    await $.command.run(run("now"));
    expect(fs.get(`${CWD}/handoff/ACTIVE_PROJECT.md`)).toBe("apps/web\nhandoff-x.md\nweb work\n");
  });

  test("gitignore handling", async () => {
    const make = (files: Record<string, string>) => {
      const fs = new Map(Object.entries(files));
      const io = {
        exists: async (p: string) => fs.has(p),
        read: async (p: string) => fs.get(p) ?? "",
        write: async (p: string, t: string) => void fs.set(p, t),
      };
      return { fs, io };
    };
    const a = make({ "/r/.gitignore": "node_modules" });
    expect(await ensureIgnored(a.io, "/r")).toBe("added handoff/ to .gitignore");
    expect(a.fs.get("/r/.gitignore")).toBe("node_modules\nhandoff/\n");

    const b = make({ "/r/.gitignore": "dist/\n/handoff\n" });
    expect(await ensureIgnored(b.io, "/r")).toBe("");
    expect(b.fs.get("/r/.gitignore")).toBe("dist/\n/handoff\n");

    const c = make({ "/r/.git": "" });
    expect(await ensureIgnored(c.io, "/r")).toBe("created .gitignore with handoff/");
    expect(c.fs.get("/r/.gitignore")).toBe("handoff/\n");

    const d = make({});
    expect(await ensureIgnored(d.io, "/r")).toBe("");
    expect(d.fs.has("/r/.gitignore")).toBe(false);

    expect(ignoresHandoff("handoff/")).toBe(true);
    expect(ignoresHandoff("handoffs/\nmy-handoff/")).toBe(false);
  });

  test("timestamp and reply parsing", async () => {
    expect(timestamp(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe("2026-01-02-030405");
    expect(splitReply("LATEST: Done.\n\n## 1. x").summary).toBe("Done.");
    expect(splitReply("## 1. x").summary).toBe("Auto handoff written by auto-handoff.");
  });

  test("commands: status, threshold, off and on", async ($, on) => {
    const clock = mock.clock(on, { now: START });
    mock.store(on);
    const { seen } = world(on);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);

    let out = await $.command.run(run(""));
    expect(out.text).toMatch(/Auto handoff is on, threshold 85%, context fill 20%/);
    expect(out.text).toMatch(/No handoff written this session/);

    out = await $.command.run(run("threshold 40"));
    expect(out.text).toBe("Auto handoff threshold set to 40%.");
    out = await $.command.run(run("threshold abc"));
    expect(out.text).toMatch(/Usage/);

    out = await $.command.run(run("off"));
    expect(out.text).toBe("Auto handoff is off.");
    await $.session.measure(measure(50));
    await clock.settle();
    expect(seen.forks).toBe(0);

    await $.command.run(run("on"));
    await $.session.measure(measure(51));
    await clock.settle();
    expect(seen.forks).toBe(1);

    out = await $.command.run(run(""));
    expect(out.text).toMatch(/Auto handoff is on, threshold 40%/);
    expect(out.text).toMatch(/Last handoff handoff\/handoff-2026-10-01-090507\.md, just now/);
  });

  test("the userConfig threshold is the default", { options: { threshold: 60 } }, async ($, on) => {
    mock.clock(on, { now: START });
    mock.store(on);
    world(on);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);
    const out = await $.command.run(run(""));
    expect(out.text).toMatch(/threshold 60%/);
  });

  test("writes a handoff before compaction unless one covers it", async ($, on) => {
    const clock = mock.clock(on, { now: START });
    mock.store(on);
    const { fs, seen } = world(on);
    on("session.compact", () => ({ messages: MSGS }));
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);

    await $.session.compact({ trigger: "auto", messages: MSGS } as any);
    expect(seen.forks).toBe(1);
    expect(handoffs(fs).length).toBe(1);

    await clock.advance(60_000);
    await $.session.compact({ trigger: "precompute", messages: MSGS } as any);
    expect(seen.forks).toBe(1);

    await $.session.compact({ trigger: "manual", messages: MSGS } as any);
    expect(seen.forks).toBe(2);

    // A handoff written after the last compaction covers the next one.
    await clock.advance(60_000);
    await $.command.run(run("now"));
    await clock.settle();
    expect(seen.forks).toBe(3);
    await clock.advance(1000);
    await $.session.compact({ trigger: "auto", messages: MSGS } as any);
    expect(seen.forks).toBe(3);
    expect(seen.logs.some((l) => /already covers this context/.test(l))).toBe(true);
  });

  test("the resume band shows, yields to a survey, and goes after resume", async ($, on) => {
    const now = START + 2 * 3600_000;
    const clock = mock.clock(on, { now });
    mock.store(on);
    const latest = `${CWD}/handoff/LATEST.md`;
    const { seen } = world(on, { [latest]: "handoff-2026-10-01-090507.md\nBuilt it.\n", [`${CWD}/handoff/handoff-2026-10-01-090507.md`]: "# Handoff\nBuilt it." }, { [latest]: START });
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);

    const quiet = await $.ui.mount({
      plugin: "auto-handoff", surface: "terminal", component: "AbovePrompt", props: { ...BAND, hasSurvey: true },
    } as any);
    expect(await quiet.find({ type: "Text", text: /Handoff from/ })).toBeUndefined();
    await quiet.unmount();

    const ui = await $.ui.mount({
      plugin: "auto-handoff", surface: "terminal", component: "AbovePrompt", props: BAND,
    } as any);
    expect(await ui.find({ type: "Text", text: "Handoff from 2 h ago available" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "/autohandoff resume" })).toBeDefined();

    const out = await $.command.run(run("resume"));
    expect(out.text).toBe("Resuming from handoff/LATEST.md");
    await clock.settle();
    expect(seen.prompts.length).toBe(1);
    expect(seen.prompts[0]).toMatch(/^Read handoff\/LATEST\.md/);
    expect(await ui.find({ type: "Text", text: /Handoff from/ })).toBeUndefined();
    await ui.unmount();
  });

  test("the resume band goes after the first turn", async ($, on) => {
    mock.clock(on, { now: START + 60_000 });
    mock.store(on);
    const latest = `${CWD}/handoff/LATEST.md`;
    world(on, { [latest]: "handoff-a.md\nx\n" }, { [latest]: START });
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);
    const ui = await $.ui.mount({
      plugin: "auto-handoff", surface: "terminal", component: "AbovePrompt", props: BAND,
    } as any);
    expect(await ui.find({ type: "Text", text: "Handoff from 1 min ago available" })).toBeDefined();
    await $.turn.complete({ reason: "answer", answer: "hi", durationMs: 10, isAborted: false, turnId: "t1" } as any);
    expect(await ui.find({ type: "Text", text: /Handoff from/ })).toBeUndefined();
    await ui.unmount();
  });

  test("no band for a handoff this same session wrote", async ($, on) => {
    mock.clock(on, { now: START + 60_000 });
    mock.store(on);
    const latest = `${CWD}/handoff/LATEST.md`;
    world(on, { [latest]: "handoff-a.md\nx\n" }, { [latest]: START + 30_000 }, START);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);
    const ui = await $.ui.mount({
      plugin: "auto-handoff", surface: "terminal", component: "AbovePrompt", props: BAND,
    } as any);
    expect(await ui.find({ type: "Text", text: /Handoff from/ })).toBeUndefined();
    await ui.unmount();
  });

  test("no band without a LATEST.md", async ($, on) => {
    mock.clock(on, { now: START });
    mock.store(on);
    world(on);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);
    const ui = await $.ui.mount({
      plugin: "auto-handoff", surface: "terminal", component: "AbovePrompt", props: BAND,
    } as any);
    expect(await ui.find({ type: "Text", text: /Handoff from/ })).toBeUndefined();
    const out = await $.command.run(run("resume"));
    expect(out.text).toMatch(/No handoff\/LATEST\.md/);
    await ui.unmount();
  });
});


test("resume refuses a missing referenced handoff without submitting a prompt", async ($, on) => {
 const clock=mock.clock(on,{now:START});mock.store(on);
 const {seen}=world(on,{[`${CWD}/handoff/LATEST.md`]:"gone.md\nold"});
 await $.session.start({surface:"desktop",isInteractive:true,cwd:CWD} as any);
 const result=await $.command.run(run("resume"));await clock.settle();
 expect(result.text).toContain("missing");expect(seen.prompts.length).toBe(0);
});

test("empty summaries preserve the previous handoff and announce failure", async () => {
 const writes:string[]=[];const toasts:string[]=[];let busy=false;
 const out=await writeHandoff({isBusy:async()=>busy,setBusy:async(v:boolean)=>{busy=v},fork:async()=>({isAnswered:true,text:""}),write:async(p:string)=>{writes.push(p)},log:()=>{},toast:(t:string)=>toasts.push(t)}, {cwd:CWD,reason:"test"});
 expect(out.skipped).toBe("error");expect(writes.length).toBe(0);expect(busy).toBe(false);expect(toasts[0]).toContain("not saved");
});

test("failed automatic save retries on the next context measurement", async ($, on) => {
 const clock=mock.clock(on,{now:START});mock.store(on);const {seen,fs}=world(on);
 await $.session.start({surface:"desktop",isInteractive:true,cwd:CWD} as any);
 seen.failNext=true;await $.session.measure(measure(86));await clock.settle();
 expect(handoffs(fs).length).toBe(0);
 await $.session.measure(measure(87));await clock.settle();
 expect(seen.forks).toBe(2);expect(handoffs(fs).length).toBe(1);
});
