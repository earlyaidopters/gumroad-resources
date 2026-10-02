import { describe, expect, mock, test } from "claude-code/testing";
import { CLAWS, COLS, H, ROWS, SHELLS, W, desktopSvg, encodeCells, frameCells, fullness, petFrame } from "../hooks/sprites.mjs";
import { EMPTY_PET, classify, isRisky, moodAt, onToolEnd, onToolStart, onTurnEnd, onTurnStart } from "../hooks/pet-core.mjs";

const MOODS = ["idle", "thinking", "reading", "typing", "running", "nervous", "celebrate", "oops", "sleeping"];
const CELLS_B64 = Math.ceil((COLS * ROWS * 12) / 3) * 4;

const band = (surface: "terminal" | "desktop", extra: Record<string, unknown> = {}) =>
  ({
    plugin: "terminal-pet",
    surface,
    component: "AbovePrompt",
    props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120, ...extra },
  }) as any;

const run = (args: string) =>
  ({ command: "pet", args, origin: { kind: "composer" }, presentation: { isFullscreen: false, columns: 120 } }) as any;

// Stands in for the engine beneath the plugin.
function world(on: any, opts: { failTools?: boolean } = {}) {
  const seen = { blits: 0, badBlits: 0 };
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("ui.render", ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }));
  on("session.usage", () => ({
    value: { startedAt: 0, context: { tokens: 20_000, window: 200_000, percent: 10 }, rateLimits: [], cost: { usd: 0 } },
  }));
  on("session.measure", ($: any, e: any) => ({ changed: e.changed }));
  on("turn.start", ($: any, e: any) => ({ turnId: e.turnId }));
  on("turn.complete", () => ({ text: "" }));
  on("tool.call", ($: any, e: any) =>
    opts.failTools || e.command === "false" ? { result: {}, text: "boom", isError: true } : { result: {}, text: "ok" },
  );
  on("ui.blit", ($: any, e: any) => {
    seen.blits += 1;
    if (e.cells.length !== CELLS_B64 || e.key !== "pet") seen.badBlits += 1;
    return { value: {} };
  });
  return seen;
}

const moodText = (ui: any, re: RegExp) => ui.find({ type: "Text", text: re });

describe("terminal-pet sprites", () => {
  test("every authored grid is rectangular", () => {
    for (const [name, shell] of Object.entries(SHELLS)) {
      const width = shell.grid[0].length;
      for (const row of shell.grid) expect(`${name}:${row.length}`).toBe(`${name}:${width}`);
    }
    for (const claw of Object.values(CLAWS)) {
      for (const row of claw) expect(row.length).toBe(claw[0].length);
    }
    // the claws share one size, so a pose swap never jumps
    expect(CLAWS.open.length).toBe(CLAWS.shut.length);
    expect(CLAWS.open[0].length).toBe(CLAWS.shut[0].length);
  });

  test("every frame of every mood is the canvas size, at each fullness", () => {
    for (const fill of [0, 75, 95]) {
      for (const mood of MOODS) {
        for (const t of [0, 83, 400, 1234, 5000]) {
          expect(petFrame(mood, t, fill).length).toBe(W * H);
        }
      }
    }
    expect(fullness(10)).toBe("normal");
    expect(fullness(70)).toBe("round");
    expect(fullness(90)).toBe("stuffed");
  });

  test("moods animate over time and look different from each other", () => {
    for (const mood of MOODS) {
      const frames = new Set([0, 100, 200, 300, 450, 700, 1500, 2500].map((t) => frameCells(mood, t, 0)));
      expect(frames.size).toBeGreaterThan(1);
    }
    const looks = new Set(MOODS.map((m) => frameCells(m, 500, 0)));
    expect(looks.size).toBe(MOODS.length);
  });

  test("the whole sprite set stays far under the terminal's color-pair table", () => {
    const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const decode = (b64: string) => {
      const bytes: number[] = [];
      for (let i = 0; i < b64.length; i += 4) {
        const n = [0, 1, 2, 3].map((k) => (b64[i + k] === "=" ? 0 : B64.indexOf(b64[i + k])));
        const v = (n[0] << 18) | (n[1] << 12) | (n[2] << 6) | n[3];
        bytes.push((v >> 16) & 255, (v >> 8) & 255, v & 255);
      }
      return bytes;
    };
    const pairs = new Set<string>();
    // every mood at each fullness, every 10 ms over 6 s: covers every loop phase,
    // the red alarm tint, blush, confetti, sparks, sweat and the Z's
    for (const fill of [0, 75, 95]) {
      for (const mood of MOODS) {
        for (let t = 0; t < 6_000; t += 10) {
          const b = decode(frameCells(mood, t, fill));
          for (let i = 0; i + 11 < b.length; i += 12) {
            const fg = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
            const bg = b[i + 8] | (b[i + 9] << 8) | (b[i + 10] << 16) | (b[i + 11] << 24);
            pairs.add(`${fg >>> 0}:${bg >>> 0}`);
          }
        }
      }
    }
    expect(pairs.size).toBeLessThan(500);
    console.log(`terminal-pet distinct (fg,bg) pairs: ${pairs.size}`);
  });

  test("raster cells are columns x rows triplets, base64", () => {
    expect(COLS).toBe(W);
    expect(ROWS * 2).toBe(H);
    expect(frameCells("idle", 0, 0).length).toBe(CELLS_B64);
    // an empty canvas is all spaces in the terminal's own colors
    const blank = new Int32Array(W * H).fill(-1);
    expect(encodeCells(blank).startsWith("IAAAAAAAAAEAAAAB")).toBe(true);
  });
});

describe("terminal-pet state machine", () => {
  test("tools pick moods, risky commands make it nervous", () => {
    expect(classify("Read", { file_path: "/a" })).toBe("reading");
    expect(classify("Grep", { pattern: "x" })).toBe("reading");
    expect(classify("Glob", { pattern: "*" })).toBe("reading");
    expect(classify("WebFetch", { url: "https://x" })).toBe("reading");
    expect(classify("Edit", { file_path: "/a" })).toBe("typing");
    expect(classify("Write", { file_path: "/a" })).toBe("typing");
    expect(classify("NotebookEdit", { notebook_path: "/a" })).toBe("typing");
    expect(classify("Bash", { command: "ls -la" })).toBe("running");
    for (const command of ["rm -rf ./junk", "git reset --hard HEAD~1", "git push --force origin main", "psql -c 'DROP TABLE users'"]) {
      expect(isRisky(command)).toBe(true);
      expect(classify("Bash", { command })).toBe("nervous");
    }
    expect(isRisky("rm notes.txt")).toBe(false);
    expect(isRisky("git push origin main")).toBe(false);
    expect(classify("Task", {})).toBe("thinking");
  });

  test("transitions: turn, tool, linger, error, celebrate, sleep", () => {
    let p = onTurnStart(EMPTY_PET, 1_000);
    expect(moodAt(p, 1_000)).toBe("thinking");
    p = onToolStart(p, "reading", 2_000);
    expect(moodAt(p, 2_000)).toBe("reading");
    expect(moodAt(p, 60_000)).toBe("reading"); // still running: no timeout
    p = onToolEnd(p, "reading", false, 3_000);
    expect(moodAt(p, 3_500)).toBe("reading"); // lingers
    expect(moodAt(p, 5_000)).toBe("thinking");
    p = onToolEnd(onToolStart(p, "running", 6_000), "running", true, 6_500);
    expect(moodAt(p, 6_600)).toBe("oops");
    p = onTurnEnd(p, "answer", false, 7_000);
    expect(moodAt(p, 7_100)).toBe("oops"); // a turn with an error does not party
    p = onTurnEnd(onTurnStart(p, 8_000), "answer", false, 9_000);
    expect(moodAt(p, 9_100)).toBe("celebrate");
    expect(moodAt(p, 12_000)).toBe("idle");
    expect(moodAt(p, 9_000 + 60_000)).toBe("sleeping");
    expect(moodAt(onTurnEnd(p, "answer", true, 9_000), 9_100)).toBe("idle"); // interrupted
  });
});

describe("terminal-pet hooks", () => {
  test("the band follows a turn, frame by frame", async ($, on) => {
    const clock = mock.clock(on, { now: 1_000 });
    mock.store(on);
    const seen = world(on);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
    const ui = await $.ui.mount(band("terminal"));

    const raster = await ui.find({ type: "Raster" });
    expect(raster?.props.key).toBe("pet");
    expect(raster?.props.columns).toBe(COLS);
    expect(raster?.props.rows).toBe(ROWS);
    expect(raster?.props.cells.length).toBe(CELLS_B64);
    expect(await moodText(ui, /Pinch/)).toBeDefined();
    expect(await moodText(ui, /chillin/)).toBeDefined();
    expect(await moodText(ui, /belly 10%/)).toBeDefined();

    // idle animates on the slow loop
    await clock.advance(2_000);
    expect(seen.blits).toBeGreaterThan(0);

    await $.turn.start({ text: "go", turnId: "t1" } as any);
    expect(await moodText(ui, /thinking/)).toBeDefined();

    await $.tool.call({ tool: "Read", file_path: "/work/a.txt" } as any);
    await $.tool.call({ tool: "Read", file_path: "/work/b.txt" } as any);
    await $.tool.call({ tool: "Read", file_path: "/work/a.txt" } as any);
    expect(await moodText(ui, /munching files/)).toBeDefined();
    expect(await moodText(ui, /ate 2 files/)).toBeDefined();

    await $.tool.call({ tool: "Edit", file_path: "/work/a.txt", old_string: "a", new_string: "b" } as any);
    expect(await moodText(ui, /typing away/)).toBeDefined();
    expect(await moodText(ui, /wrote 1/)).toBeDefined();

    await $.tool.call({ tool: "Bash", command: "ls -la" } as any);
    expect(await moodText(ui, /running a command/)).toBeDefined();

    await $.tool.call({ tool: "Bash", command: "rm -rf ./junk" } as any);
    expect(await moodText(ui, /nervous/)).toBeDefined();
    expect(await moodText(ui, /ran 2, 1 scary/)).toBeDefined();

    // the lingering mood times out back to thinking on the animation loop
    await clock.advance(2_000);
    expect(await moodText(ui, /thinking/)).toBeDefined();

    await $.session.measure({
      context: { tokens: 150_000, window: 200_000, percent: 75 },
      rateLimits: [],
      cost: { usd: 1 },
      changed: ["context"],
    } as any);
    expect(await moodText(ui, /belly 75%, getting full/)).toBeDefined();

    await $.turn.complete({ answer: "done", durationMs: 9_000, isAborted: false, turnId: "t1", reason: "answer" } as any);
    expect(await moodText(ui, /party time/)).toBeDefined();
    await clock.advance(3_000);
    expect(await moodText(ui, /chillin/)).toBeDefined();
    await clock.advance(61_000);
    expect(await moodText(ui, /asleep/)).toBeDefined();

    expect(seen.badBlits).toBe(0);
    await ui.unmount();
  });

  test("a failing tool makes it dizzy", async ($, on) => {
    mock.clock(on, { now: 1_000 });
    mock.store(on);
    world(on);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
    const ui = await $.ui.mount(band("terminal"));
    await $.turn.start({ text: "go", turnId: "t1" } as any);
    await $.tool.call({ tool: "Bash", command: "false" } as any);
    expect(await moodText(ui, /dizzy/)).toBeDefined();
    await $.turn.complete({ answer: "", durationMs: 1_000, isAborted: false, turnId: "t1", reason: "answer" } as any);
    expect(await moodText(ui, /party/)).toBeUndefined();
    await ui.unmount();
  });

  test("commands rename, force states, feed, and hide; prefs persist", async ($, on) => {
    const clock = mock.clock(on, { now: 1_000 });
    const store = new Map<string, unknown>();
    on("store.get", ($: any, e: any) => ({ value: store.get(e.key) }));
    on("store.set", ($: any, e: any) => {
      store.set(e.key, e.value);
      return { value: undefined };
    });
    world(on);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
    const ui = await $.ui.mount(band("terminal"));

    expect((await $.command.run(run(""))).text).toMatch(/Pinch \(chillin\) ate 0 files/);
    expect((await $.command.run(run("name Snips"))).text).toMatch(/Snips/);
    expect(await moodText(ui, /Snips/)).toBeDefined();
    expect(store.get("prefs")).toEqual({ name: "Snips", enabled: true });

    await $.command.run(run("sleep"));
    expect(await moodText(ui, /asleep/)).toBeDefined();
    await $.command.run(run("party"));
    expect(await moodText(ui, /party time/)).toBeDefined();
    await clock.advance(9_000);
    expect(await moodText(ui, /chillin/)).toBeDefined();

    await $.command.run(run("feed 95"));
    expect(await moodText(ui, /belly 95%, stuffed/)).toBeDefined();

    expect((await $.command.run(run("dance"))).text).toMatch(/Unknown option/);

    await $.command.run(run("off"));
    expect(await ui.find({ type: "Raster" })).toBeUndefined();
    expect(await moodText(ui, /Snips/)).toBeUndefined();
    expect(store.get("prefs")).toEqual({ name: "Snips", enabled: false });
    await $.command.run(run("on"));
    expect(await ui.find({ type: "Raster" })).toBeDefined();
    await ui.unmount();
  });

  test("desktop gets animated SVG, narrow terminals fall back, and a survey takes the band", async ($, on) => {
    mock.clock(on, { now: 1_000 });
    mock.store(on);
    world(on);
    await $.session.start({ surface: "desktop", isInteractive: true, cwd: "/work" } as any);
    const desk = await $.ui.mount(band("desktop"));
    expect(await desk.find({ type: "Raster" })).toBeUndefined();
    expect(await desk.find({ type: "Svg" })).toBeDefined();
    await desk.unmount();

    const narrow = await $.ui.mount(band("terminal", { bodyColumns: 30 }));
    expect(await narrow.find({ type: "Raster" })).toBeUndefined();
    expect(await moodText(narrow, /Pinch · chillin/)).toBeDefined();
    await narrow.unmount();

    const survey = await $.ui.mount(band("terminal", { hasSurvey: true }));
    expect(await survey.find({ type: "Raster" })).toBeUndefined();
    expect(await moodText(survey, /Pinch/)).toBeUndefined();
    await survey.unmount();
  });
});

test("desktop animation stays within SVG limits for every mood and fullness", () => {
  for (const mood of MOODS) for (const fill of [0, 75, 95]) {
    const svg = desktopSvg(mood, fill);
    expect(svg.length).toBeLessThan(131072);
    expect(svg.includes('repeatCount="indefinite"')).toBe(true);
    expect(svg.includes('<script')).toBe(false);
    expect(svg.includes('fill="#-')).toBe(false);
  }
});

test("desktop reacts to activity, expires celebrations, and turns off", async ($, on) => {
  const clock = mock.clock(on, { now: 1000 });
  mock.store(on); world(on);
  await $.session.start({ surface: "desktop", isInteractive: true, cwd: "/work" } as any);
  const ui = await $.ui.mount(band("desktop"));
  await $.turn.start({text:"go",turnId:"d1"} as any);
  expect(await moodText(ui,/thinking/)).toBeDefined();
  await $.tool.call({tool:"Read",file_path:"/work/a.txt"} as any);
  expect(await moodText(ui,/munching files/)).toBeDefined();
  await $.turn.complete({answer:"done",durationMs:1000,isAborted:false,turnId:"d1",reason:"answer"} as any);
  expect(await moodText(ui,/party time/)).toBeDefined();
  await clock.advance(3000);
  expect(await moodText(ui,/chillin/)).toBeDefined();
  await $.command.run(run("off"));
  expect(await ui.find({type:"Svg"})).toBeUndefined();
  await ui.unmount();
});
