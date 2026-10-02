import { describe, expect, test } from "claude-code/testing";

import {
  canon,
  diffWalk,
  displayPath,
  parseNumstatZ,
  parsePorcelainZ,
  entryStates,
  reconcile,
  receiptText,
  summaryLine,
  toolOpFrom,
} from "../hooks/changes-receipt.mjs";

// ---- a tiny fake git repo + file system ------------------------------------------------

const SESSION_CWD = "/tmp/demo"; // what the session reports
const ROOT = "/private/tmp/demo"; // what git reports (macOS realpath)

type Files = Record<string, string>;

function hashOf(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0").repeat(5);
}

function lineDiff(a: string, b: string) {
  const A = a === "" ? [] : a.replace(/\n$/, "").split("\n");
  const B = b === "" ? [] : b.replace(/\n$/, "").split("\n");
  const dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const common = dp[0][0];
  return { added: B.length - common, removed: A.length - common };
}

type Repo = { isGit: boolean; commits: Record<string, Files>; head: string; work: Files; mtimes: Record<string, number>; outside: Set<string> };

function makeRepo(head: Files, work: Files, isGit = true): Repo {
  const mtimes: Record<string, number> = {};
  for (const p of Object.keys(work)) mtimes[p] = 1000;
  return { isGit, commits: { c1: { ...head } }, head: "c1", work: { ...work }, mtimes, outside: new Set() };
}

const rel = (abs: string) => {
  const c = canon(abs) as string;
  return c === "/tmp/demo" ? "" : c.startsWith("/tmp/demo/") ? c.slice("/tmp/demo/".length) : null;
};

function shellWrite(repo: Repo, p: string, text: string) {
  repo.work[p] = text;
  repo.mtimes[p] = (repo.mtimes[p] ?? 1000) + 7;
}
function shellRm(repo: Repo, p: string) {
  delete repo.work[p];
  delete repo.mtimes[p];
}
function shellMv(repo: Repo, a: string, b: string) {
  repo.work[b] = repo.work[a];
  repo.mtimes[b] = repo.mtimes[a];
  shellRm(repo, a);
}

function git(repo: Repo, argv: readonly string[], stdin?: string) {
  const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: "", isStdoutTruncated: false, isStderrTruncated: false } });
  const fail = (code = 128) => ({ value: { exitCode: code, stdout: "", stderr: "fatal", isStdoutTruncated: false, isStderrTruncated: false } });
  if (!repo.isGit) return fail();
  const args = argv.slice(1).filter((a) => a !== "--literal-pathspecs");
  const head = repo.commits[repo.head] ?? {};
  if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return ok(`${ROOT}\n`);
  if (args[0] === "rev-parse" && args.includes("HEAD")) return ok(`${repo.head}\n`);
  if (args.includes("status")) {
    const out: string[] = [];
    for (const p of new Set([...Object.keys(head), ...Object.keys(repo.work)])) {
      if (!(p in repo.work)) out.push(` D ${p}`);
      else if (!(p in head)) out.push(`?? ${p}`);
      else if (head[p] !== repo.work[p]) out.push(` M ${p}`);
    }
    return ok(out.map((x) => `${x}\0`).join(""));
  }
  if (args[0] === "hash-object") {
    const paths = args[1] === "--stdin-paths" ? String(stdin ?? "").split("\n").filter(Boolean) : args.slice(2);
    if (paths.some((p) => !(p in repo.work))) return fail();
    return ok(paths.map((p) => `${hashOf(repo.work[p])}\n`).join(""));
  }
  if (args[0] === "ls-tree") {
    const tree = repo.commits[args[2]] ?? {};
    const paths = args.slice(args.indexOf("--") + 1);
    return ok(paths.filter((p) => p in tree).map((p) => `100644 blob ${hashOf(tree[p])}\t${p}\0`).join(""));
  }
  if (args[0] === "diff" && args.includes("--numstat")) {
    const tree = repo.commits[args[args.indexOf("--") - 1]] ?? {};
    const paths = args.slice(args.indexOf("--") + 1);
    let out = "";
    for (const p of paths) {
      const d = lineDiff(tree[p] ?? "", repo.work[p] ?? "");
      if (d.added || d.removed) out += `${d.added}\t${d.removed}\t${p}\0`;
    }
    return ok(out);
  }
  if (args[0] === "diff" && args.includes("--name-only")) return ok("");
  return fail(1);
}

function engine(on: any, repo: Repo) {
  let now = 1_700_000_000_000;
  const store: Record<string, unknown> = {};
  on("clock.now", () => ({ value: (now += 1000) }));
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("session.cwd", () => ({ value: SESSION_CWD }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("tool.register", ($: any, e: any) => ({ value: { tool: `mcp__changes-receipt__${e.name}` } }));
  on("store.get", ($: any, e: any) => ({ value: store[e.key] }));
  on("store.set", ($: any, e: any) => {
    store[e.key] = e.value;
    return { value: undefined };
  });
  on("ui.open", () => ({ value: { isPlaced: true } }));
  on("ui.panes", () => ({ value: [] }));
  on("ui.close", () => ({ value: undefined }));
  on("ui.toast", () => ({ value: undefined }));
  on("turn.start", ($: any, e: any) => ({ turnId: e.turnId }));
  on("turn.complete", ($: any, e: any) => ({ text: e.answer }));
  on("process.run", ($: any, e: any) => git(repo, e.argv, e.init?.stdin));
  on("fs.exists", ($: any, e: any) => {
    const r = rel(e.path);
    return { value: r === null ? repo.outside.has(e.path) : r in repo.work };
  });
  on("fs.stat", ($: any, e: any) => {
    const r = rel(e.path);
    if (r === null || !(r in repo.work)) throw new Error("ENOENT");
    return { value: { kind: "file", size: repo.work[r].length, mtimeMs: repo.mtimes[r] ?? 0, isLink: false } };
  });
  on("fs.read", ($: any, e: any) => {
    const r = rel(e.path);
    if (r === null || !(r in repo.work)) throw new Error("ENOENT");
    return { value: repo.work[r] };
  });
  on("fs.list", ($: any, e: any) => {
    const r = rel(e.path);
    if (r === null) return { value: [] };
    const prefix = r ? `${r}/` : "";
    const seen = new Map<string, any>();
    for (const p of Object.keys(repo.work)) {
      if (!p.startsWith(prefix)) continue;
      const rest = p.slice(prefix.length);
      const name = rest.split("/")[0];
      if (rest.includes("/")) seen.set(name, { name, kind: "dir", size: 0, mtimeMs: 0, isLink: false });
      else seen.set(name, { name, kind: "file", size: repo.work[p].length, mtimeMs: repo.mtimes[p] ?? 0, isLink: false });
    }
    return { value: [...seen.values()] };
  });

  // The tools themselves, beneath the plugin, editing the fake work tree.
  on("tool.call", { tool: "Write" }, ($: any, e: any) => {
    const r = rel(e.file_path);
    if (r === null) repo.outside.add(e.file_path);
    if (r === null) return { result: { type: "create", filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null }, text: "ok" };
    if (r.startsWith("locked")) return { deny: "Writes to locked/ are blocked here." };
    const before = repo.work[r];
    shellWrite(repo, r, e.content);
    const lines = e.content.replace(/\n$/, "").split("\n");
    return {
      result: {
        type: before === undefined ? "create" : "update",
        filePath: e.file_path,
        content: e.content,
        originalFile: before ?? null,
        structuredPatch: before === undefined ? [{ oldStart: 0, oldLines: 0, newStart: 1, newLines: lines.length, lines: lines.map((l: string) => `+${l}`) }] : [],
      },
      text: "ok",
    };
  });
  on("tool.call", { tool: "Edit" }, ($: any, e: any) => {
    const r = rel(e.file_path) as string;
    if (!(r in repo.work)) {
      return { isError: true, result: "File does not exist.", text: "<tool_use_error>File does not exist. Note: your current working directory is /tmp/demo.</tool_use_error>" };
    }
    if (!repo.work[r].includes(e.old_string)) {
      return { isError: true, result: "not found", text: "<tool_use_error>String to replace not found in file.</tool_use_error>" };
    }
    shellWrite(repo, r, repo.work[r].replace(e.old_string, e.new_string));
    return {
      result: {
        filePath: e.file_path,
        oldString: e.old_string,
        newString: e.new_string,
        originalFile: null,
        structuredPatch: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: [`-${e.old_string}`, `+${e.new_string}`] }],
        userModified: false,
        replaceAll: false,
      },
      text: "ok",
    };
  });
}

const done = (turnId: string) => ({ answer: "Done.", durationMs: 1000, isAborted: false, turnId, reason: "answer" as const });

async function startTurn($: any, text = "do the thing", turnId = "t1") {
  await $.turn.start({ text, turnId });
}

const HEAD: Files = {
  "app.js": 'console.log("Hello");\n',
  "old.txt": "one\ntwo\n",
  "notes.md": "notes\n",
  "a.txt": "rename me\n",
  "README.md": "# demo\n",
};

describe("changes-receipt in a git repo", () => {
  test("created, changed, deleted, via shell, failed edit as attempt; pre-existing dirty file excluded", async ($: any, on: any) => {
    // notes.md is dirty before the turn and stays that way: it must not be listed.
    const repo = makeRepo(HEAD, { ...HEAD, "notes.md": "notes\nlocal edit\n" });
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    await startTurn($, "Create docs/plan.md, change the greeting, delete old.txt, try missing.js");

    await $.tool.call({ tool: "Write", file_path: "/tmp/demo/docs/plan.md", content: "- one\n- two\n- three\n" });
    await $.tool.call({ tool: "Edit", file_path: "/tmp/demo/app.js", old_string: "Hello", new_string: "Hello there" });
    await $.tool.call({ tool: "Edit", file_path: "/tmp/demo/missing.js", old_string: "a", new_string: "b" });
    shellRm(repo, "old.txt"); // rm old.txt via Bash
    shellWrite(repo, "build log.txt", "line 1\nline 2\n"); // a shell-made file, with a space

    const out = await $.turn.complete(done("t1"));
    expect(out.text).toBe("Receipt · 2 created · 1 changed · 1 deleted · 2 via shell · 1 not applied · /receipt for details");

    const last = await $.command.run({ command: "receipt", args: "last" });
    const text = String(last.text);
    expect(text).toContain("- docs/plan.md, 3 lines added, by Write");
    expect(text).toContain("- app.js, 1 line added, 1 removed, by Edit");
    expect(text).toContain("- old.txt, 2 lines removed, via shell");
    expect(text).toContain("- build log.txt, 2 lines added, via shell");
    expect(text).toContain("Attempted but not applied (1)");
    expect(text).toMatch(/- missing\.js, Edit failed: File does not exist\./);
    expect(text).not.toContain("notes.md");
  });

  test("a pre-existing dirty file that changes again during the turn is listed", async ($: any, on: any) => {
    const repo = makeRepo(HEAD, { ...HEAD, "notes.md": "notes\nlocal edit\n" });
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    await startTurn($);
    shellWrite(repo, "notes.md", "notes\nlocal edit\nmore\n");
    const out = await $.turn.complete(done("t1"));
    expect(out.text).toBe("Receipt · 1 changed · 1 via shell · /receipt for details");
  });

  test("a denied write is an attempt, not a change", async ($: any, on: any) => {
    const repo = makeRepo(HEAD, { ...HEAD });
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    await startTurn($);
    await $.tool.call({ tool: "Write", file_path: "/tmp/demo/locked/secret.txt", content: "x\n" });
    const out = await $.turn.complete(done("t1"));
    expect(out.text).toBe("Receipt · nothing changed · 1 not applied · /receipt for details");
    const last = String((await $.command.run({ command: "receipt", args: "last" })).text);
    expect(last).toContain("- locked/secret.txt, Write denied: Writes to locked/ are blocked here.");
    expect(last).not.toContain("Created");
  });

  test("a shell mv shows as a rename", async ($: any, on: any) => {
    const repo = makeRepo(HEAD, { ...HEAD });
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    await startTurn($);
    shellMv(repo, "a.txt", "docs/b renamed.txt");
    const out = await $.turn.complete(done("t1"));
    expect(out.text).toBe("Receipt · 1 renamed · 1 via shell · /receipt for details");
    const last = String((await $.command.run({ command: "receipt", args: "last" })).text);
    expect(last).toContain("- a.txt to docs/b renamed.txt, via shell");
  });

  test("an empty turn adds no line", async ($: any, on: any) => {
    const repo = makeRepo(HEAD, { ...HEAD, "notes.md": "dirty before\n" });
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    await startTurn($, "just a question");
    const out = await $.turn.complete(done("t1"));
    expect(out.text).toBe("Done.");
    const tool = await $.tool.call({ tool: "mcp__changes-receipt__changes_receipt", turn: "last" } as any);
    expect(String((tool as any).result)).toMatch(/^No receipt yet/);
  });

  test("Write outside the folder is listed with its absolute path", async ($: any, on: any) => {
    const repo = makeRepo(HEAD, { ...HEAD });
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    await startTurn($);
    await $.tool.call({ tool: "Write", file_path: "/Users/someone/elsewhere/out.md", content: "hi\n" });
    const out = await $.turn.complete(done("t1"));
    expect(out.text).toBe("Receipt · 1 created · /receipt for details");
    const last = String((await $.command.run({ command: "receipt", args: "last" })).text);
    expect(last).toContain("- /Users/someone/elsewhere/out.md, 1 line added, by Write");
  });

  test("off stops the line, on resumes it; the model tool returns the receipt", async ($: any, on: any) => {
    const repo = makeRepo(HEAD, { ...HEAD });
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    expect(String((await $.command.run({ command: "receipt", args: "off" })).text)).toMatch(/off/);
    await startTurn($, "first", "t1");
    shellWrite(repo, "x.txt", "x\n");
    expect((await $.turn.complete(done("t1"))).text).toBe("Done.");

    await $.command.run({ command: "receipt", args: "on" });
    await startTurn($, "second", "t2");
    await $.tool.call({ tool: "Edit", file_path: "/tmp/demo/app.js", old_string: "Hello", new_string: "Hi" });
    expect((await $.turn.complete(done("t2"))).text).toBe("Receipt · 1 changed · /receipt for details");

    const tool: any = await $.tool.call({ tool: "mcp__changes-receipt__changes_receipt" } as any);
    expect(String(tool.result)).toContain('Turn 2 receipt for "second"');
    expect(String(tool.result)).toContain("- app.js, 1 line added, 1 removed, by Edit");
    expect(String(tool.result)).not.toContain("x.txt");
  });

  test("help and unknown options", async ($: any, on: any) => {
    engine(on, makeRepo(HEAD, { ...HEAD }));
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    expect(String((await $.command.run({ command: "receipt", args: "help" })).text)).toContain("/receipt last");
    expect(String((await $.command.run({ command: "receipt", args: "bogus" })).text)).toContain('Unknown option "bogus"');
    expect(String((await $.command.run({ command: "receipt", args: "turns 99" })).text)).toContain("Usage /receipt turns");
  });

  for (const surface of ["terminal", "desktop"] as const) {
    test(`the pane groups the last turn on ${surface}`, async ($: any, on: any) => {
      const repo = makeRepo(HEAD, { ...HEAD });
      engine(on, repo);
      await $.session.start({ surface, isInteractive: true, cwd: SESSION_CWD });
      await startTurn($, "make changes");
      await $.tool.call({ tool: "Write", file_path: "/tmp/demo/docs/plan.md", content: "- a\n" });
      await $.tool.call({ tool: "Edit", file_path: "/tmp/demo/missing.js", old_string: "a", new_string: "b" });
      shellRm(repo, "old.txt");
      await $.turn.complete(done("t1"));
      const opened = await $.command.run({ command: "receipt" });
      expect(String(opened.text)).toContain("open");
      const ui = await $.ui.mount({
        plugin: "changes-receipt",
        surface,
        component: "Pane",
        requestId: "changes-receipt",
        props: { title: "Changes Receipt", isFocused: true, bodyColumns: 90, placement: "dock", scroll: {}, view: {} },
      } as any);
      expect(await ui.find({ type: "Text", text: "Turn 1" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "Created (1)" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "Deleted (1)" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "Attempted but not applied (1)" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "docs/plan.md" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "via shell" })).toBeDefined();
      // collapse the turn
      await ui.press({ key: "t:t1" });
      expect(await ui.find({ type: "Text", text: "Created (1)" })).toBeUndefined();
      await ui.unmount();
    });
  }
});

describe("changes-receipt outside git", () => {
  test("the size + mtime walk finds created, changed, deleted and renamed files", async ($: any, on: any) => {
    const repo = makeRepo({}, { "a.txt": "aaa\n", "keep.txt": "k\n", "sub dir/b.txt": "bb\n", "gone.txt": "g\n" }, false);
    repo.mtimes["a.txt"] = 500;
    engine(on, repo);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: SESSION_CWD });
    await startTurn($);
    shellWrite(repo, "sub dir/b.txt", "bb changed\n");
    shellRm(repo, "gone.txt");
    shellWrite(repo, "new one.txt", "1\n2\n3\n");
    shellMv(repo, "a.txt", "moved.txt");
    await $.tool.call({ tool: "Write", file_path: "/tmp/demo/plan.md", content: "x\n" });
    const out = await $.turn.complete(done("t1"));
    expect(out.text).toBe("Receipt · 2 created · 1 changed · 1 renamed · 1 deleted · 4 via shell · /receipt for details");
    const last = String((await $.command.run({ command: "receipt", args: "last" })).text);
    expect(last).toContain("- new one.txt, 3 lines added, via shell");
    expect(last).toContain("- plan.md, 1 line added, by Write");
    expect(last).toContain("- a.txt to moved.txt, via shell");
    expect(last).toContain("Note: Not a git folder");
  });
});

describe("pure parts", () => {
  test("paths: /private/tmp and /tmp are one place; relative and absolute display", () => {
    expect(canon("/private/tmp/demo/x.js")).toBe("/tmp/demo/x.js");
    expect(canon("docs/../a b.txt", "/tmp/demo")).toBe("/tmp/demo/a b.txt");
    expect(displayPath("/tmp/demo/a b.txt", "/private/tmp/demo")).toBe("a b.txt");
    expect(displayPath("/etc/hosts", "/tmp/demo")).toBe("/etc/hosts");
  });

  test("porcelain -z with spaces and a staged rename", () => {
    const st = entryStates(parsePorcelainZ("R  new name.txt\0old name.txt\0?? with space.md\0 D gone.txt\0 M app.js\0"));
    expect(st.get("new name.txt")).toEqual({ code: "R ", exists: true });
    expect(st.get("old name.txt")).toEqual({ code: "R<", exists: false });
    expect(st.get("with space.md")?.exists).toBe(true);
    expect(st.get("gone.txt")?.exists).toBe(false);
    expect(parseNumstatZ("3\t1\tsrc/a b.js\0-\t-\timg.png\0").get("src/a b.js")).toEqual({ added: 3, removed: 1 });
  });

  test("tool outcomes: errored, denied, staged and no-op calls are not changes; subagent calls are labeled", () => {
    const cwd = "/w";
    const ok = toolOpFrom({ tool: "Edit", file_path: "/w/a.js", agentId: "agent-1" }, { result: { structuredPatch: [{ lines: ["-x", "+y", "+z"] }] } }, cwd);
    expect(ok).toMatchObject({ ok: true, added: 2, removed: 1, agentId: "agent-1" });
    expect(toolOpFrom({ tool: "Edit", file_path: "/w/b.js" }, { isError: true, text: "<tool_use_error>File has not been read yet. Read it first.</tool_use_error>" }, cwd)?.reason).toBe(
      "failed: File has not been read yet.",
    );
    expect(toolOpFrom({ tool: "Write", file_path: "/w/c.js" }, { deny: "nope" }, cwd)?.ok).toBe(false);
    expect(toolOpFrom({ tool: "Write", file_path: "/w/c.js" }, { isError: true, text: "The user doesn't want to proceed with this tool use." }, cwd)?.reason).toMatch(/^denied/);
    expect(toolOpFrom({ tool: "Edit", file_path: "/w/d.js" }, { result: { staged: true, structuredPatch: [] } }, cwd)?.ok).toBe(false);
    expect(toolOpFrom({ tool: "Write", file_path: "/w/e.js", content: "same" }, { result: { type: "update", content: "same", originalFile: "same", structuredPatch: [] } }, cwd)?.noop).toBe(true);
    expect(toolOpFrom({ tool: "Read", file_path: "/w/a.js" }, { result: {} }, cwd)).toBeNull();

    const fail = toolOpFrom({ tool: "Edit", file_path: "/w/a.js" }, { isError: true, text: "String to replace not found." }, cwd);
    const rc = reconcile({ fsChanges: [{ abs: "/w/a.js", kind: "changed", added: 2, removed: 1 }], ops: [fail, ok], cwd });
    expect(rc.items).toEqual([{ kind: "changed", path: "a.js", sources: ["Edit (subagent)"], added: 2, removed: 1 }]);
    // the failed try on a file that then changed is not repeated as an attempt
    expect(rc.attempts).toEqual([]);
  });

  test("the walk ignores folders it could not list fully", () => {
    const start = { mode: "walk", cwd: "/w", capped: true, done: new Set([""]), files: new Map([["a.txt", { size: 1, mtime: 1 }]]) };
    const end = { mode: "walk", cwd: "/w", capped: true, done: new Set([""]), files: new Map([["a.txt", { size: 1, mtime: 1 }], ["deep/x.txt", { size: 2, mtime: 2 }]]) };
    expect(diffWalk(start, end)).toEqual([]);
  });

  test("summary and text of an empty receipt", () => {
    const rc = { id: "t", n: 1, prompt: "", at: 0, mode: "git", notes: [], items: [], attempts: [] };
    expect(summaryLine(rc)).toBe("");
    expect(receiptText(rc)).toContain("No files were created, changed or deleted.");
  });
});


test("helper start cannot discard main writes or replace the main receipt", async ($: any, on: any) => {
  const repo = makeRepo(HEAD, { ...HEAD }); engine(on, repo);
  await $.session.start({surface:"desktop",isInteractive:true,cwd:SESSION_CWD});
  await startTurn($,"main request","main");
  await $.tool.call({tool:"Write",file_path:"/tmp/demo/first.md",content:"first"});
  await $.turn.start({text:"helper",turnId:"helper",agentId:"helper-1"});
  await $.tool.call({tool:"Write",file_path:"/tmp/demo/second.md",content:"second",agentId:"helper-1"});
  await $.turn.complete({...done("helper"),agentId:"helper-1"});
  await $.turn.complete({...done("main"),agentId:null});
  const text=String((await $.command.run({command:"receipt",args:"last"})).text);
  expect(text).toContain("first.md"); expect(text).toContain("second.md"); expect(text).toContain("main request");
});

test("direct Write evidence survives a missing turn start", async ($: any, on: any) => {
  const repo = makeRepo(HEAD, { ...HEAD }); engine(on, repo);
  await $.session.start({surface:"desktop",isInteractive:true,cwd:SESSION_CWD});
  await $.tool.call({tool:"Write",file_path:"/tmp/demo/recovered.md",content:"recovered"});
  await $.turn.complete(done("recovered"));
  const text=String((await $.command.run({command:"receipt",args:"last"})).text);
  expect(text).toContain("recovered.md");
});
