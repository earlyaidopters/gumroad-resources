import { describe, expect, test } from "claude-code/testing";

import {
  FAIL_MS,
  GLOW_MS,
  animState,
  palette,
  quantize,
  applyTouches,
  buildLayout,
  capFiles,
  encodeCells,
  glow,
  groupFiles,
  heatFill,
  normalizePath,
  parseWc,
  renderFrame,
  squarify,
  toBase64,
  touchesFromCall,
} from "../hooks/repo-heatmap.mjs";

const CWD = "/work/app";
const KNOWN = new Set([
  "src/auth/session.ts",
  "src/auth/login.ts",
  "src/utils/validate.ts",
  "tests/session.test.ts",
  "docs/auth.md",
  "README.md",
]);

const FILES = [
  { p: "src/api/routes.ts", l: 320, b: 9000 },
  { p: "src/api/users.ts", l: 150, b: 4000 },
  { p: "src/api/orders.ts", l: 80, b: 2000 },
  { p: "src/auth/session.ts", l: 24, b: 700 },
  { p: "src/auth/login.ts", l: 15, b: 500 },
  { p: "src/auth/tokens.ts", l: 110, b: 3000 },
  { p: "src/utils/validate.ts", l: 60, b: 1500 },
  { p: "src/utils/format.ts", l: 45, b: 1100 },
  { p: "tests/session.test.ts", l: 220, b: 6000 },
  { p: "tests/api.test.ts", l: 90, b: 2500 },
  { p: "docs/auth.md", l: 40, b: 2000 },
  { p: "README.md", l: 3, b: 80 },
];

const area = (r: { w: number; h: number }) => r.w * r.h;

describe("treemap layout", () => {
  test("areas are proportional, rects do not overlap and fill the box", () => {
    const weights = [6, 6, 4, 3, 2, 2, 1, 0.5];
    const box = { x: 0, y: 0, w: 60, h: 40 };
    const rects = squarify(weights, box);
    const total = weights.reduce((s, w) => s + w, 0);
    let sum = 0;
    rects.forEach((r: any, i: number) => {
      expect(Math.abs(area(r) - (weights[i] / total) * area(box))).toBeLessThan(1e-6);
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(box.w + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(box.h + 1e-9);
      sum += area(r);
    });
    expect(Math.abs(sum - area(box))).toBeLessThan(1e-6);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(ox <= 1e-9 || oy <= 1e-9).toBe(true);
      }
    }
  });

  test("squarified rects stay close to square", () => {
    const rects = squarify([1, 1, 1, 1], { x: 0, y: 0, w: 20, h: 20 });
    for (const r of rects) expect(Math.max(r.w / r.h, r.h / r.w)).toBeLessThan(1.01);
  });

  test("a dominant folder splits into its subfolders", () => {
    const labels = groupFiles(FILES, "lines").map((g: any) => g.label);
    expect(labels).toContain("src/api");
    expect(labels).toContain("src/auth");
    expect(labels).toContain("tests");
    expect(labels).toContain("(root)");
  });

  test("the pixel layout tiles files inside the box", () => {
    const L = buildLayout(FILES, "lines", 40, 40);
    expect(L.files.length).toBe(FILES.length);
    const seen = new Uint8Array(40 * 40);
    for (const t of L.files) {
      expect(t.x0).toBeGreaterThanOrEqual(0);
      expect(t.y0).toBeGreaterThanOrEqual(0);
      expect(t.x1).toBeLessThanOrEqual(40);
      expect(t.y1).toBeLessThanOrEqual(40);
      for (let y = t.y0; y < t.y1; y++) {
        for (let x = t.x0; x < t.x1; x++) {
          expect(seen[y * 40 + x]).toBe(0);
          seen[y * 40 + x] = 1;
        }
      }
    }
  });

  test("files past the cap fold into one +N more entry", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ p: `f${i}.ts`, l: i + 1, b: i }));
    const capped = capFiles(many, 20);
    expect(capped.files.length).toBe(20);
    expect(capped.more).toBe(10);
    expect(capped.moreWeight).toBe(55);
    expect(capped.files.some((f: any) => f.p === "f29.ts")).toBe(true);
  });

  test("wc output parses into lines and bytes", () => {
    const got = parseWc("      24     700 src/auth/session.ts\n     3      80 README.md\n    27     780 total\n");
    expect(got.get("src/auth/session.ts")).toEqual({ l: 24, b: 700 });
    expect(got.get("README.md")).toEqual({ l: 3, b: 80 });
    expect(got.has("total")).toBe(false);
  });
});

describe("tool calls to files", () => {
  test("paths: absolute, relative, ./, macOS /private, outside the repo", () => {
    expect(normalizePath("/work/app/src/auth/login.ts", CWD)).toBe("src/auth/login.ts");
    expect(normalizePath("src/auth/login.ts", CWD)).toBe("src/auth/login.ts");
    expect(normalizePath("./src/auth/../auth/login.ts", CWD)).toBe("src/auth/login.ts");
    expect(normalizePath("/private/tmp/x/a.ts", "/tmp/x")).toBe("a.ts");
    expect(normalizePath("/tmp/x/a.ts", "/private/tmp/x")).toBe("a.ts");
    expect(normalizePath("/etc/passwd", CWD)).toBe(null);
    expect(normalizePath("../other/file.ts", CWD)).toBe(null);
  });

  test("Read, Edit, Write and a failed Edit", () => {
    expect(touchesFromCall({ tool: "Read", file_path: "/work/app/src/auth/session.ts" }, null, CWD, KNOWN)).toEqual([
      { path: "src/auth/session.ts", kind: "read" },
    ]);
    expect(touchesFromCall({ tool: "Edit", file_path: "src/auth/login.ts" }, { text: "ok" }, CWD, KNOWN)).toEqual([
      { path: "src/auth/login.ts", kind: "edit" },
    ]);
    expect(touchesFromCall({ tool: "Write", file_path: "/work/app/README.md" }, { text: "ok" }, CWD, KNOWN)).toEqual([
      { path: "README.md", kind: "edit" },
    ]);
    expect(
      touchesFromCall({ tool: "Edit", file_path: "/work/app/src/auth/login.ts" }, { isError: true, text: "old_string not found" }, CWD, KNOWN),
    ).toEqual([{ path: "src/auth/login.ts", kind: "fail" }]);
    expect(touchesFromCall({ tool: "Read", file_path: "/elsewhere/x.ts" }, null, CWD, KNOWN)).toEqual([]);
  });

  test("Grep hits come from the result, else the searched path", () => {
    const text = "Found 2 files\n/work/app/src/auth/session.ts\n/work/app/tests/session.test.ts";
    const hits = touchesFromCall({ tool: "Grep", pattern: "validateSession" }, { text }, CWD, KNOWN);
    expect(hits.map((h: any) => h.path).sort()).toEqual(["src/auth/session.ts", "tests/session.test.ts"]);
    expect(hits.every((h: any) => h.kind === "search")).toBe(true);
    const none = touchesFromCall({ tool: "Grep", pattern: "zzz", path: "docs/auth.md" }, { text: "No files found" }, CWD, KNOWN);
    expect(none).toEqual([{ path: "docs/auth.md", kind: "search" }]);
  });

  test("Bash: cat reads, grep -n hits, a repo listing lights nothing, heredoc edits", () => {
    const read = touchesFromCall({ tool: "Bash", command: "cat src/auth/login.ts && tail -5 docs/auth.md" }, { text: "" }, CWD, KNOWN);
    expect(read).toEqual([
      { path: "src/auth/login.ts", kind: "read" },
      { path: "docs/auth.md", kind: "read" },
    ]);
    const big = new Set([...KNOWN, ...Array.from({ length: 20 }, (_, i) => `src/ui/c${i}.tsx`)]);
    const listing = [...big].join("\n");
    const grep = touchesFromCall(
      { tool: "Bash", command: 'git ls-files && grep -rn "validateSession" .' },
      { text: `${listing}\n./src/auth/session.ts:14:export function validateSession(` },
      CWD,
      big,
    );
    expect(grep).toEqual([{ path: "src/auth/session.ts", kind: "search" }]);
    const edit = touchesFromCall(
      { tool: "Bash", command: "cat >> src/utils/validate.ts <<'EOF'\nexport const x = 1\nEOF\npython3 - <<'EOF'\np='src/auth/login.ts'\nopen(p,'w').write(open(p).read())\nEOF" },
      { text: "" },
      CWD,
      KNOWN,
    );
    expect(edit.map((h: any) => `${h.kind}:${h.path}`).sort()).toEqual(["edit:src/auth/login.ts", "edit:src/utils/validate.ts"]);
  });
});

describe("glow decay", () => {
  test("glow eases from 1 to 0 over the span, monotonic", () => {
    expect(glow(0)).toBe(1);
    expect(glow(GLOW_MS)).toBe(0);
    expect(glow(GLOW_MS * 2)).toBe(0);
    expect(Math.abs(glow(GLOW_MS / 2) - 0.5)).toBeLessThan(1e-9);
    let prev = 1;
    for (let t = 0; t <= GLOW_MS; t += GLOW_MS / 40) {
      const g = glow(t);
      expect(g).toBeLessThanOrEqual(prev + 1e-12);
      prev = g;
    }
  });

  test("a touched file settles into a visited tint and the animation stops", () => {
    const base = 0x202a3c;
    const t = applyTouches({}, [{ path: "a.ts", kind: "read" }], 1000)["a.ts"];
    const hot = heatFill(base, t, 1000 + 1000);
    const settled = heatFill(base, t, 1000 + GLOW_MS + 1);
    expect(settled).toBe(heatFill(base, t, 1000 + GLOW_MS * 10));
    expect(hot).not.toBe(settled);
    expect(settled).not.toBe(base);
    expect(animState({ "a.ts": t }, 1000 + 100)).toEqual({ active: true, pulsing: true });
    expect(animState({ "a.ts": t }, 1000 + 5000)).toEqual({ active: true, pulsing: false });
    expect(animState({ "a.ts": t }, 1000 + GLOW_MS + 1)).toEqual({ active: false, pulsing: false });
    const failed = applyTouches({}, [{ path: "b.ts", kind: "fail" }], 500);
    expect(animState(failed, 500 + FAIL_MS - 1).pulsing).toBe(true);
  });

  test("touches count, keep the first time and the edit count", () => {
    let t = applyTouches({}, [{ path: "a.ts", kind: "read" }], 10);
    t = applyTouches(t, [{ path: "a.ts", kind: "edit" }], 20);
    expect(t["a.ts"]).toMatchObject({ first: 10, last: 20, kind: "edit", n: 2, edits: 1, r: 10, e: 20 });
  });
});

describe("raster cells", () => {
  // The terminal keeps one table of 1024 (fg, bg) pairs per session; overflow
  // paints wrong colors for the rest of it. Simulate a long, busy session over a
  // big repo at several sizes and count every pair any frame emits.
  test("a long session stays well inside the 1024 color-pair table", () => {
    const files = Array.from({ length: 1500 }, (_, i) => ({ p: `d${i % 40}/s${i % 3}/f${i}.ts`, l: 1 + ((i * 7919) % 900), b: 100 }));
    const kinds = ["read", "search", "edit", "fail"] as const;
    let seed = 3;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pairs = new Set<number>();
    for (const [W, rows] of [
      [40, 20],
      [70, 34],
      [120, 52],
    ]) {
      const L = buildLayout(files, "lines", W, rows * 2);
      let touches = {};
      let now = 0;
      let next = 0;
      let n = 0;
      while (n < 200 || now < next + GLOW_MS + 2000) {
        if (n < 200 && now >= next) {
          const hits = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => ({
            path: files[Math.floor(rnd() * files.length)].p,
            kind: kinds[Math.floor(rnd() * 4)],
          }));
          touches = applyTouches(touches, hits, now);
          n += 1;
          next = now + 200 + rnd() * 2500;
        }
        const words = renderFrame(L, touches, now);
        for (let i = 0; i < words.length; i += 3) pairs.add(words[i + 1] * 16777216 + words[i + 2]);
        now += animState(touches, now).pulsing ? 66 : 200;
      }
    }
    expect(pairs.size).toBeLessThan(512);
  });

  test("every palette color is already on the terminal's 16-level grid", () => {
    const P = palette();
    const colors = [P.gap, P.cream, P.creamDim, P.ink, ...P.blink, ...Object.values(P.visited), ...Object.values(P.flash)];
    for (const k of Object.keys(P.ramp)) colors.push(...P.ramp[k], ...P.ring[k], ...P.halo[k]);
    for (const f of [...P.folder, P.more]) colors.push(f.header, ...f.tiles);
    for (const c of colors) expect(quantize(c)).toBe(c);
  });

  test("a frame is columns * rows triplets and encodes to matching base64", () => {
    const W = 30;
    const rows = 12;
    const L = buildLayout(FILES, "lines", W, rows * 2);
    const touches = applyTouches({}, [{ path: "src/auth/login.ts", kind: "edit" }], 0);
    const words = renderFrame(L, touches, 50);
    expect(words.length).toBe(W * rows * 3);
    const b64 = encodeCells(words);
    expect(b64.length).toBe(Math.ceil((W * rows * 12) / 3) * 4);
    for (let i = 0; i < words.length; i += 3) {
      expect(words[i]).toBeGreaterThanOrEqual(0x20);
      expect(words[i]).toBeLessThan(0x10000);
    }
  });

  test("little-endian packing and padded base64", () => {
    expect(encodeCells(Uint32Array.of(0x2588, 0xff8800, 0x01000000))).toBe("iCUAAACI/wAAAAAB");
    expect(toBase64(Uint8Array.of(1))).toBe("AQ==");
    expect(toBase64(Uint8Array.of(1, 2))).toBe("AQI=");
  });
});

function engine(on: any) {
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("clock.after", () => ({ value: undefined }));
  on("clock.every", () => ({ value: undefined }));
  on("clock.now", () => ({ value: 1000 }));
  on("session.cwd", () => ({ value: CWD }));
  on("ui.blit", () => ({ value: {} }));
  on("ui.panes", () => ({ value: [] }));
  on("ui.open", () => ({ value: { isPlaced: true } }));
  on("process.run", ($: any, e: any) => {
    if (e.argv[0] === "git") return { value: { exitCode: 0, stdout: FILES.map((f) => f.p).join("\0"), stderr: "" } };
    if (e.argv[0] === "wc") {
      const lines = FILES.filter((f) => e.argv.includes(f.p)).map((f) => `  ${f.l}  ${f.b} ${f.p}`);
      return { value: { exitCode: 0, stdout: lines.join("\n") + "\n", stderr: "" } };
    }
    return { value: { exitCode: 1, stdout: "", stderr: "" } };
  });
  on("tool.call", ($: any, e: any) => ({
    result: { type: "text", file: { filePath: e.file_path, content: "x", numLines: 1, startLine: 1, totalLines: 1 } },
  }));
  on("ui.render", ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }));
}

describe("the pane", () => {
  for (const surface of ["terminal", "desktop"] as const) {
    test(`maps the repo and shows a read on ${surface}`, async ($, on) => {
      engine(on);
      await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);
      const ran = await $.command.run({ command: "heatmap", args: "rescan" } as any);
      expect(ran.text).toMatch(/12 files mapped/);
      await $.tool.call({ tool: "Read", file_path: `${CWD}/src/auth/login.ts` } as any);
      const ui = await $.ui.mount({
        plugin: "repo-heatmap",
        surface,
        component: "Pane",
        requestId: "repo-heatmap",
        props: { title: "Repo Heatmap", isFocused: false, bodyColumns: 100, placement: "dock", scroll: {}, view: {} },
      } as any);
      expect(await ui.find({ type: "Text", text: /touched 1 of 12 files/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /hottest: src\/auth\/login\.ts/ })).toBeDefined();
      if (surface === "terminal") expect(await ui.find({ type: "Raster" } as any)).toBeDefined();
      else expect(await ui.find({ type: "Text", text: /src\/auth\s+1\/3 touched/ })).toBeDefined();
      await ui.unmount();
    });
  }
});
