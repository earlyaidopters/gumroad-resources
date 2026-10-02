import { describe, expect, test } from "claude-code/testing";
import { tagOf } from "../hooks/output-tray.mjs";

const ROOT = "/work/demo proj";

type Disk = { files: Map<string, string>; exec: Set<string>; dirs: Set<string>; baseline: Set<string> };
type Ran = { argv: string[] };
type Opts = { writeMode?: "ok" | "error" | "deny" | "staged"; bash?: (disk: Disk) => void; placed?: boolean; copied?: string[] };

function newDisk(): Disk {
  const files = new Map<string, string>([
    [`${ROOT}/README.md`, "# readme\n"],
    [`${ROOT}/My Reports/q3 report.md`, "# q3\n"],
  ]);
  return { files, exec: new Set(), dirs: new Set([`${ROOT}/My Reports`]), baseline: new Set(files.keys()) };
}

function engine(on: any, disk: Disk, ran: Ran[], opts: Opts = {}) {
  let now = Date.parse("2026-10-01T12:00:00Z");
  on("clock.now", () => ({ value: (now += 1000) }));
  on("clock.every", () => ({ value: { cancel() {} } }));
  on("ui.toast", () => ({ value: undefined }));
  on("ui.log", () => ({ value: undefined }));
  on("ui.invalidate", () => ({ value: undefined }));
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("session.cwd", () => ({ value: ROOT }));
  on("env.get", ($: any, e: any) => ({ value: e.name === "HOME" ? "/home/tester" : undefined }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("tool.register", ($: any, e: any) => ({ value: { tool: `mcp__output-tray__${e.name}` } }));
  on("ui.open", () => ({ value: opts.placed === false ? { isPlaced: false, reason: "too narrow" } : { isPlaced: true } }));
  on("ui.panes", () => ({ value: [] }));
  on("ui.close", () => ({ value: undefined }));
  on("ui.copy", ($: any, e: any) => {
    opts.copied?.push(e.text);
    return { value: { isCopied: true } };
  });
  on("fs.exists", ($: any, e: any) => ({ value: disk.files.has(e.path) || disk.dirs.has(e.path) }));
  on("fs.stat", ($: any, e: any) => {
    const isDir = disk.dirs.has(e.path) || [...disk.files.keys()].some((p) => p.startsWith(`${e.path}/`));
    if (isDir) return { value: { kind: "dir", size: 0, mtimeMs: 0, isLink: false, realPath: e.path } };
    const text = disk.files.get(e.path);
    if (text === undefined) throw Object.assign(new Error(`ENOENT: ${e.path}`), { code: "ENOENT" });
    return { value: { kind: "file", size: text.length, mtimeMs: 0, isLink: false, realPath: e.path } };
  });
  on("fs.read", ($: any, e: any) => {
    const text = disk.files.get(e.path);
    if (text === undefined) throw new Error("ENOENT");
    return { value: text };
  });
  on("process.run", ($: any, e: any) => {
    const argv = [...e.argv];
    ran.push({ argv });
    if (argv[0] === "git" && argv.includes("rev-parse")) return { value: out(0, `${ROOT}\n`) };
    if (argv[0] === "git" && argv.includes("status")) {
      const untracked = [...disk.files.keys()].filter((p) => !disk.baseline.has(p)).map((p) => `?? ${p.slice(ROOT.length + 1)}`);
      return { value: out(0, untracked.length ? `${untracked.join("\0")}\0` : "") };
    }
    if (argv[0] === "test" && argv[1] === "-x") return { value: out(disk.exec.has(argv[2]) ? 0 : 1, "") };
    if (argv[0] === "open") return { value: out(0, "") };
    return { value: out(1, "") };
  });
  on("tool.call", { tool: "Write" }, ($: any, e: any) => {
    const mode = opts.writeMode ?? "ok";
    if (mode === "deny") return { deny: "The user doesn't want to proceed with this tool use." };
    if (mode === "error") return { isError: true, result: "EACCES: permission denied", text: "EACCES: permission denied" };
    const existed = disk.files.has(e.file_path);
    if (mode !== "staged") disk.files.set(e.file_path, e.content);
    return {
      result: { type: existed ? "update" : "create", filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null, ...(mode === "staged" ? { staged: true } : {}) },
      text: "ok",
    };
  });
  on("tool.call", { tool: "Bash" }, ($: any) => {
    opts.bash?.(disk);
    return { result: { stdout: "", stderr: "", interrupted: false }, text: "" };
  });
}

function out(exitCode: number, stdout: string) {
  return { exitCode, stdout, stderr: "", isStdoutTruncated: false, isStderrTruncated: false };
}

async function start($: any, surface: "terminal" | "desktop" = "terminal") {
  await $.session.start({ surface, isInteractive: true, cwd: ROOT } as any);
}

async function write($: any, path: string, content = "hello\n") {
  return $.tool.call({ tool: "Write", file_path: path, content } as any);
}

async function mountPane($: any, surface: "terminal" | "desktop") {
  return $.ui.mount({
    plugin: "output-tray",
    surface,
    component: "Pane",
    requestId: "output-tray",
    props: { title: "Output Tray", isFocused: true, bodyColumns: 90, placement: "dock", scroll: {}, view: {} },
  } as any);
}

const opens = (ran: Ran[]) => ran.filter((r) => r.argv[0] === "open").map((r) => r.argv);

describe("output-tray", () => {
  test("a Write that creates a file is listed; a Write over an existing file is not", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    engine(on, disk, ran);
    await start($);
    await write($, `${ROOT}/My Reports/summary one.md`, "# Summary\n");
    await write($, `${ROOT}/README.md`, "# changed\n");
    const list = await $.command.run({ command: "tray", args: "list" } as any);
    expect(list.text).toMatch(/1 file created this session/);
    expect(list.text).toMatch(/ 1\. My Reports\/summary one\.md  \[Write\]  10 B/);
    expect(list.text).not.toMatch(/\d\. README\.md/);
    expect(list.text).toMatch(/Also edited 1 existing file: README\.md/);
    expect(opens(ran)).toHaveLength(0);
  });

  for (const mode of ["error", "deny", "staged"] as const) {
    test(`a ${mode} Write is not listed`, async ($, on) => {
      const disk = newDisk();
      const ran: Ran[] = [];
      engine(on, disk, ran, { writeMode: mode });
      await start($);
      await write($, `${ROOT}/out/new file.txt`);
      const list = await $.command.run({ command: "tray", args: "list" } as any);
      expect(list.text).toMatch(/no files created yet/);
    });
  }

  for (const surface of ["terminal", "desktop"] as const) {
    test(`the pane lists created files newest first with spaces and unicode on ${surface}`, async ($, on) => {
      const disk = newDisk();
      const ran: Ran[] = [];
      engine(on, disk, ran);
      await start($, surface);
      await write($, `${ROOT}/My Reports/summary one.md`, "# Summary\n");
      await write($, `${ROOT}/data/café ☕.csv`, "a,b\n1,2\n");
      const ui = await mountPane($, surface);
      const names = await ui.findAll({ type: "Text", text: /summary one\.md|café ☕\.csv/ });
      expect(names.map((n: any) => n.text)).toEqual(["café ☕.csv", "summary one.md"]);
      expect(await ui.find({ type: "Text", text: "My Reports/" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "data/" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "Write" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /^8 B/ })).toBeDefined();
      expect(await ui.find({ key: "pick:f1" })).toBeDefined();
      expect(await ui.find({ key: "open:f2" })).toBeDefined();
      // drawing opens nothing
      expect(opens(ran)).toHaveLength(0);
      await ui.unmount();
    });
  }

  test("a subagent's created file is marked subagent", async ($, on) => {
    const disk = newDisk();
    engine(on, disk, []);
    await start($);
    // agentId rides tool.call's input, as a subagent's call does in a session
    await $.tool.call({ tool: "Write", file_path: `${ROOT}/sub.md`, content: "x", agentId: "agent-123" } as any);
    const list = await $.command.run({ command: "tray", args: "list" } as any);
    expect(list.text).toMatch(/ 1\. sub\.md  \[subagent Write\]/);
    expect(tagOf({ via: "write", agentId: "agent-123" })).toBe("subagent Write");
    expect(tagOf({ via: "shell", agentId: "agent-123" })).toBe("subagent shell");
    expect(tagOf({ via: "write", agentId: "" })).toBe("Write");
  });

  test("empty state", async ($, on) => {
    engine(on, newDisk(), []);
    await start($);
    const ui = await mountPane($, "terminal");
    expect(await ui.find({ type: "Text", text: /Nothing created yet/ })).toBeDefined();
    await ui.unmount();
  });

  test("Open and Reveal run open with the exact argv only when pressed", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    const copied: string[] = [];
    engine(on, disk, ran, { copied });
    await start($);
    const path = `${ROOT}/My Reports/summary one.md`;
    await write($, path, "# Summary\n");
    const ui = await mountPane($, "terminal");
    expect(opens(ran)).toHaveLength(0);
    await ui.press({ key: "open:f1" });
    expect(opens(ran)).toEqual([["open", path]]);
    await ui.press({ key: "reveal:f1" });
    expect(opens(ran)).toEqual([["open", path], ["open", "-R", path]]);
    await ui.press({ key: "act:copy" });
    expect(copied).toEqual([path]);
    expect(await ui.find({ type: "Text", text: /Copied path of summary one\.md/ })).toBeDefined();
    await ui.unmount();
  });

  test("Open on a script never hands it to open directly", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    engine(on, disk, ran);
    await start($);
    const sh = `${ROOT}/tools/hello.sh`;
    await write($, sh, "#!/bin/sh\necho hi\n");
    disk.exec.add(sh);
    const ui = await mountPane($, "terminal");
    expect(await ui.find({ type: "Text", text: /hello\.sh is a script: Open shows it as text and never runs it/ })).toBeDefined();
    await ui.press({ key: "act:open" });
    expect(opens(ran)).toEqual([["open", "-t", sh]]);
    expect(opens(ran).some((a) => a.length === 2 && a[1] === sh)).toBe(false);
    await ui.unmount();

    // an extensionless executable with a shebang opens as text, a binary is revealed
    const tool = `${ROOT}/tools/run-me`;
    const bin = `${ROOT}/tools/a.bin2`;
    await write($, tool, "#!/usr/bin/env python3\nprint(1)\n");
    await write($, bin, "\u007fELF....");
    disk.exec.add(tool);
    disk.exec.add(bin);
    await $.command.run({ command: "tray", args: "open 2" } as any);
    await $.command.run({ command: "tray", args: "open 1" } as any);
    expect(opens(ran).slice(1)).toEqual([["open", "-t", tool], ["open", "-R", bin]]);
    // a .command file and a .py file are text even without the execute bit
    await write($, `${ROOT}/go.command`, "echo hi\n");
    await write($, `${ROOT}/x.py`, "print(1)\n");
    await $.command.run({ command: "tray", args: "open 1" } as any);
    await $.command.run({ command: "tray", args: "open 2" } as any);
    expect(opens(ran).slice(3)).toEqual([["open", "-t", `${ROOT}/x.py`], ["open", "-t", `${ROOT}/go.command`]]);
  });

  test("an app bundle made by the shell is revealed, never launched", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    engine(on, disk, ran, {
      bash: (d) => {
        d.files.set(`${ROOT}/build/Hello.app/Contents/Info.plist`, "<plist/>");
        d.files.set(`${ROOT}/build/setup.pkg`, "xar!");
      },
    });
    await start($);
    await $.tool.call({ tool: "Bash", command: "make app" } as any);
    const list = await $.command.run({ command: "tray", args: "list" } as any);
    expect(list.text).toMatch(/build\/setup\.pkg  \[shell\]/);
    expect(list.text).toMatch(/build\/Hello\.app  \[shell\]/);
    expect(list.text).not.toMatch(/Info\.plist/);
    const n = list.text!.split("\n").findIndex((l) => l.includes("setup.pkg"));
    await $.command.run({ command: "tray", args: `open ${n}` } as any);
    expect(opens(ran)).toEqual([["open", "-R", `${ROOT}/build/setup.pkg`]]);
  });

  test("files a shell command creates are tagged shell; touching an existing file adds nothing", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    let step = 0;
    engine(on, disk, ran, {
      bash: (d) => {
        step += 1;
        if (step === 1) d.files.set(`${ROOT}/data/out.csv`, "a,b\n1,2\n3,4\n5,6\n");
        if (step === 2) d.files.set(`${ROOT}/README.md`, "# touched\n");
      },
    });
    await start($);
    await $.tool.call({ tool: "Bash", command: "python make_csv.py > data/out.csv" } as any);
    await $.tool.call({ tool: "Bash", command: "echo x >> README.md" } as any);
    const list = await $.command.run({ command: "tray", args: "list" } as any);
    expect(list.text).toMatch(/1 file created/);
    expect(list.text).toMatch(/ 1\. data\/out\.csv  \[shell\]/);
  });

  test("a deleted file shows as missing instead of disappearing", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    engine(on, disk, ran);
    await start($);
    const path = `${ROOT}/My Reports/summary one.md`;
    await write($, path);
    disk.files.delete(path);
    for (const surface of ["terminal", "desktop"] as const) {
      const ui = await mountPane($, surface);
      expect(await ui.find({ type: "Text", text: "missing: deleted or moved" })).toBeDefined();
      expect(await ui.find({ key: "open:f1" })).toBeUndefined();
      await ui.press({ key: "act:open" });
      expect(await ui.find({ type: "Text", text: /summary one\.md is missing: deleted or moved\./ })).toBeDefined();
      await ui.unmount();
    }
    const list = await $.command.run({ command: "tray", args: "list" } as any);
    expect(list.text).toMatch(/summary one\.md  \[Write\]  missing: deleted or moved/);
    const opened = await $.command.run({ command: "tray", args: "reveal 1" } as any);
    expect(opened.text).toMatch(/missing/);
    expect(opens(ran)).toHaveLength(0);
  });

  test("row hotkeys pick a row and the action bar acts on it", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    engine(on, disk, ran);
    await start($);
    await write($, `${ROOT}/a.md`);
    await write($, `${ROOT}/b.md`);
    const ui = await mountPane($, "terminal");
    await ui.press({ key: "pick:f1" });
    await ui.press({ key: "act:reveal" });
    expect(opens(ran)).toEqual([["open", "-R", `${ROOT}/a.md`]]);
    expect(await ui.find({ type: "Text", text: /Revealed a\.md in Finder/ })).toBeDefined();
    await ui.unmount();
  });

  test("commands: help, toggle, open n, copy n, clear, close, unknown, unplaced", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    const copied: string[] = [];
    engine(on, disk, ran, { copied });
    await start($);
    expect((await $.command.run({ command: "tray", args: "help" } as any)).text).toMatch(/\/tray reveal <n>/);
    expect((await $.command.run({ command: "tray", args: "" } as any)).text).toMatch(/Output Tray open: 0 files/);
    await write($, `${ROOT}/My Reports/summary one.md`);
    const opened = await $.command.run({ command: "tray", args: "open 1" } as any);
    expect(opened.text).toBe("Opened summary one.md");
    expect(opens(ran)).toEqual([["open", `${ROOT}/My Reports/summary one.md`]]);
    expect((await $.command.run({ command: "tray", args: "copy 1" } as any)).text).toMatch(/Copied: .*summary one\.md/);
    expect(copied).toEqual([`${ROOT}/My Reports/summary one.md`]);
    expect((await $.command.run({ command: "tray", args: "open 7" } as any)).text).toMatch(/No file 7/);
    expect((await $.command.run({ command: "tray", args: "explode" } as any)).text).toMatch(/Unknown \/tray option/);
    expect((await $.command.run({ command: "tray", args: "close" } as any)).text).toBe("Output Tray closed.");
    expect((await $.command.run({ command: "tray", args: "clear" } as any)).text).toMatch(/cleared \(1 entry forgotten/);
    expect((await $.command.run({ command: "tray", args: "list" } as any)).text).toMatch(/no files created yet/);
  });

  test("unplaced pane falls back to the text list", async ($, on) => {
    const disk = newDisk();
    engine(on, disk, [], { placed: false });
    await start($);
    await write($, `${ROOT}/x.md`);
    const r = await $.command.run({ command: "tray" } as any);
    expect(r.text).toMatch(/could not be placed \(too narrow\)/);
    expect(r.text).toMatch(/ 1\. x\.md/);
  });

  test("the model's tool shows or lists, and never opens a file", async ($, on) => {
    const disk = newDisk();
    const ran: Ran[] = [];
    engine(on, disk, ran);
    await start($);
    await write($, `${ROOT}/report.md`);
    const listed: any = await $.tool.call({ tool: "mcp__output-tray__output_tray", action: "list" } as any);
    expect(String(listed.result)).toMatch(/ 1\. report\.md  \[Write\]/);
    const shown: any = await $.tool.call({ tool: "mcp__output-tray__output_tray", action: "show" } as any);
    expect(String(shown.result)).toMatch(/Output Tray is open .* 1 file.*cannot open files/);
    const bad: any = await $.tool.call({ tool: "mcp__output-tray__output_tray", action: "open" } as any);
    expect(String(bad.result)).toMatch(/Unknown action/);
    expect(opens(ran)).toHaveLength(0);
  });
});

test("null main agent tracks files created between turn boundaries", async ($, on) => {
  on("turn.start", () => ({ turnId: "main" } as any));
  on("turn.complete", () => ({ text: "done" } as any));
  const disk = newDisk();
  engine(on, disk, []);
  await start($);
  await $.turn.start({ agentId: null, turnId: "main" } as any);
  disk.files.set(`${ROOT}/fresh.md`, "A report");
  await $.turn.complete({ agentId: null, turnId: "main", answer: "done", toolUses: [] } as any);
  const result = await $.command.run({ command: "tray", args: "list", origin: { kind: "composer" }, presentation: { isFullscreen: false, columns: 120 } } as any);
  expect(result.text).toContain("fresh.md");
});
