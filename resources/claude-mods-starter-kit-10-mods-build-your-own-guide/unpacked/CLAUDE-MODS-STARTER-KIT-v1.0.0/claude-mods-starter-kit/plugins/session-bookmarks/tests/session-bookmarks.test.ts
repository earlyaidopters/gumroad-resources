import { describe, expect, mock, test } from "claude-code/testing";
import { cleanTitle, parseArgs, resumeCommand, search, shellQuote } from "../hooks/session-bookmarks.mjs";

const HOME = "/home/tester";
const FILE = "/test/bm/bookmarks.json";
const CWD = "/work/my project";
const SID = "5e1f0000-0000-4000-8000-000000000000";
const SID2 = "b2b2b2b2-2222-4222-8222-222222222222";
const SECRET = "ZEBRA-QUOKKA-77 internal transcript detail";
const START = Date.parse("2026-10-01T12:00:00Z");
const TRANSCRIPT = `${HOME}/.claude/projects/${CWD.replace(/[^a-zA-Z0-9]/g, "-")}/${SID}.jsonl`;

type World = {
  fs: Map<string, string>;
  copied: string[];
  asked: string[];
  completes: number;
  panes: { id: string }[];
  session: { id: string; cwd: string };
};

const MESSAGES = [
  { role: "user", text: "Fix the flaky parser test in parser.spec.ts", toolUses: [] },
  { role: "assistant", text: `Looked into it. ${SECRET}. The retry loop races the timer.`, toolUses: [] },
  { role: "user", text: "<command-name>/bm</command-name>", toolUses: [] },
];

function world(on: any, opts: { model?: "ok" | "fail"; answer?: string; files?: Record<string, string> } = {}): World {
  const w: World = {
    fs: new Map(Object.entries(opts.files ?? {})),
    copied: [],
    asked: [],
    completes: 0,
    panes: [],
    session: { id: SID, cwd: CWD },
  };
  const dirs = () => new Set([...w.fs.keys()].flatMap((k) => k.split("/").slice(1, -1).map((_, i, a) => "/" + a.slice(0, i + 1).join("/"))));
  w.fs.set(TRANSCRIPT, "{}\n");
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("tool.register", ($: any, e: any) => ({ value: { tool: `mcp__session-bookmarks__${e.name}` } }));
  on("env.get", ($: any, e: any) => ({ value: e.name === "HOME" ? HOME : e.name === "SESSION_BOOKMARKS_FILE" ? FILE : undefined }));
  on("session.id", () => ({ value: w.session.id }));
  on("session.cwd", () => ({ value: w.session.cwd }));
  on("session.messages", () => ({ value: MESSAGES }));
  on("model.complete", ($: any, e: any) => {
    w.completes += 1;
    const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    if (opts.model === "fail") return { value: { isAnswered: false, reason: "api-error", status: 529, error: "overloaded_error", usage } };
    expect(e.prompt).toContain("Fix the flaky parser test");
    expect(e.prompt).not.toContain("<command-name>");
    return { value: { isAnswered: true, text: "TITLE: Fix flaky parser retry race\nNOTE: Found the retry loop racing the timer. Next, add a fake clock.", usage } };
  });
  on("fs.exists", ($: any, e: any) => ({ value: w.fs.has(e.path) || dirs().has(e.path) || e.path === CWD }));
  on("fs.read", ($: any, e: any) => {
    if (!w.fs.has(e.path)) throw new Error(`ENOENT ${e.path}`);
    return { value: w.fs.get(e.path) };
  });
  on("fs.write", ($: any, e: any) => {
    w.fs.set(e.path, e.text);
    return { value: undefined };
  });
  on("fs.list", () => ({ value: [] }));
  on("process.run", ($: any, e: any) => {
    const [cmd, ...rest] = e.argv;
    if (cmd === "git") return { value: { exitCode: 0, stdout: "feature/parser\n", stderr: "" } };
    if (cmd === "mv") {
      const [, from, to] = rest;
      w.fs.set(to, w.fs.get(from) ?? "");
      w.fs.delete(from);
      return { value: { exitCode: 0, stdout: "", stderr: "" } };
    }
    return { value: { exitCode: 0, stdout: "", stderr: "" } };
  });
  on("ui.copy", ($: any, e: any) => {
    w.copied.push(e.text);
    return { value: { isCopied: true } };
  });
  on("ui.panes", () => ({ value: w.panes.map((p) => ({ ...p, title: "Bookmarks", isShown: true, isFocused: false, isPlaced: true })) }));
  on("ui.open", ($: any, e: any) => {
    w.panes.push({ id: e.id });
    return { value: { isPlaced: true } };
  });
  on("ui.close", ($: any, e: any) => {
    w.panes = w.panes.filter((p) => p.id !== e.id);
    return { value: undefined };
  });
  on("ui.toast", () => ({ value: undefined }));
  on("ui.log", () => ({ value: undefined }));
  on("tool.call", { tool: "AskUserQuestion" }, ($: any, e: any) => {
    const question = e.questions[0].question;
    w.asked.push(question);
    if (opts.answer === undefined) return { deny: "dismissed" };
    return { result: { questions: e.questions, answers: { [question]: opts.answer } } };
  });
  return w;
}

const stored = (w: World) => JSON.parse(w.fs.get(FILE) ?? "null");
const bm = (args = "") => ({ command: "bm", args }) as any;

async function start($: any) {
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: CWD } as any);
}

describe("session-bookmarks", () => {
  test("/bm with a note saves exactly the bookmark fields, atomically, with no model call", async ($, on) => {
    mock.clock(on, { now: START });
    const w = world(on);
    await start($);
    const out = await $.command.run(bm("Parser race found. Next add a fake clock to the retry test."));
    expect(out.text).toMatch(/^Bookmarked "Parser race found\."/);
    expect(w.completes).toBe(0);
    const file = stored(w);
    expect(file.version).toBe(1);
    expect(file.bookmarks).toHaveLength(1);
    const b = file.bookmarks[0];
    expect(Object.keys(b).sort()).toEqual(
      ["branch", "createdAt", "createdIso", "cwd", "id", "note", "project", "sessionId", "title", "titleSource", "transcriptPath"].sort(),
    );
    expect(b).toMatchObject({
      title: "Parser race found.",
      note: "Parser race found. Next add a fake clock to the retry test.",
      project: "my project",
      branch: "feature/parser",
      cwd: CWD,
      sessionId: SID,
      transcriptPath: TRANSCRIPT,
      createdAt: START,
      titleSource: "note",
    });
    // written to a temp file and renamed: no temp left behind
    expect([...w.fs.keys()].filter((k) => k.includes(".tmp-"))).toEqual([]);
  });

  test("/bm with no note asks the model once; nothing from the transcript is stored", async ($, on) => {
    mock.clock(on, { now: START });
    const w = world(on, { model: "ok" });
    await start($);
    const out = await $.command.run(bm(""));
    expect(w.completes).toBe(1);
    expect(out.text).toMatch(/Bookmarked "Fix flaky parser retry race" \(title written by the model\)/);
    const b = stored(w).bookmarks[0];
    expect(b.title).toBe("Fix flaky parser retry race");
    expect(b.note).toBe("Found the retry loop racing the timer. Next, add a fake clock.");
    expect(b.titleSource).toBe("model");
    expect(w.fs.get(FILE)).not.toContain("ZEBRA-QUOKKA");
    expect(w.fs.get(FILE)).not.toContain("Looked into it");
  });

  test("the title falls back to the first prompt when the model call fails", async ($, on) => {
    mock.clock(on, { now: START });
    const w = world(on, { model: "fail" });
    await start($);
    const out = await $.command.run(bm(""));
    expect(w.completes).toBe(1);
    expect(out.text).toMatch(/\(title from your first prompt\)/);
    const b = stored(w).bookmarks[0];
    expect(b.title).toBe("Fix the flaky parser test in parser.spec.ts");
    expect(b.note).toBe("");
    expect(w.fs.get(FILE)).not.toContain("ZEBRA-QUOKKA");
  });

  test("list is newest first and numbered; find searches title, note and project only", async ($, on) => {
    const clock = mock.clock(on, { now: START });
    const w = world(on);
    await start($);
    await $.command.run(bm("Auth refactor halfway. Next wire the token refresh."));
    await clock.advance(120_000);
    await $.command.run(bm("save list view styling. Next fix dark mode."));
    const list = await $.command.run(bm("list"));
    expect(list.text).toMatch(/Bookmarks \(2\), newest first/);
    expect(list.text).toMatch(/ 1\. list view styling\.[\s\S]* 2\. Auth refactor halfway\./);
    expect(list.text).toMatch(/my project \(feature\/parser\)  ·  2 min ago/);

    const hit = await $.command.run(bm("find token refresh"));
    expect(hit.text).toMatch(/Bookmarks matching "token refresh" \(1\)/);
    expect(hit.text).toContain("Auth refactor halfway.");
    expect((await $.command.run(bm("find my project"))).text).toMatch(/\(2\)/);
    // the cwd path and session id are not searched
    expect((await $.command.run(bm("find /work"))).text).toBe('No bookmark matches "/work".');
    expect((await $.command.run(bm("find 5e1f0000"))).text).toBe('No bookmark matches "5e1f0000".');
    expect(w.fs.has(FILE)).toBe(true);
  });

  test("delete by number, and the pane's Delete asks first", async ($, on) => {
    const clock = mock.clock(on, { now: START });
    const w = world(on, { answer: "Delete" });
    await start($);
    await $.command.run(bm("First one."));
    await clock.advance(1000);
    await $.command.run(bm("Second one."));
    await clock.advance(1000);
    await $.command.run(bm("Third one."));

    const out = await $.command.run(bm("delete 2"));
    expect(out.text).toBe('Deleted bookmark 2, "Second one.".');
    expect(stored(w).bookmarks.map((b: any) => b.title)).toEqual(["First one.", "Third one."]);
    expect((await $.command.run(bm("delete 9"))).text).toMatch(/Pick a bookmark number from 1 to 2/);

    await $.command.run(bm("open"));
    const ui = await $.ui.mount({
      plugin: "session-bookmarks",
      surface: "terminal",
      component: "Pane",
      requestId: "session-bookmarks",
      props: { title: "Bookmarks", isFocused: true, bodyColumns: 120, placement: "dock", scroll: {}, view: {} },
    } as any);
    const id = stored(w).bookmarks[1].id;
    expect(await ui.find({ type: "Text", text: "1. Third one." })).toBeDefined();
    await ui.press({ key: `delete:${id}` });
    expect(w.asked).toEqual(['Delete bookmark 1, "Third one."?']);
    expect(stored(w).bookmarks.map((b: any) => b.title)).toEqual(["First one."]);
    expect(await ui.find({ type: "Text", text: /Deleted "Third one\."/ })).toBeDefined();
    await ui.unmount();
  });

  test("the pane's Delete keeps the bookmark when the person says Keep", async ($, on) => {
    mock.clock(on, { now: START });
    const w = world(on, { answer: "Keep" });
    await start($);
    await $.command.run(bm("Only one."));
    await $.command.run(bm("open"));
    const ui = await $.ui.mount({
      plugin: "session-bookmarks",
      surface: "terminal",
      component: "Pane",
      requestId: "session-bookmarks",
      props: { title: "Bookmarks", isFocused: true, bodyColumns: 120, placement: "dock", scroll: {}, view: {} },
    } as any);
    await ui.press({ key: `delete:${stored(w).bookmarks[0].id}` });
    expect(stored(w).bookmarks).toHaveLength(1);
    await ui.unmount();
  });

  for (const surface of ["terminal", "desktop"] as const) {
    test(`the pane's Resume copies the quoted resume command on ${surface}`, async ($, on) => {
      mock.clock(on, { now: START });
      const w = world(on);
      w.session.cwd = "/work/it's a project";
      await $.session.start({ surface, isInteractive: true, cwd: w.session.cwd } as any);
      await $.command.run(bm("Quote test."));
      const open = await $.command.run(bm("open"));
      expect(open.text).toMatch(/Bookmarks pane open, 1 bookmark\. Number keys/);
      const ui = await $.ui.mount({
        plugin: "session-bookmarks",
        surface,
        component: "Pane",
        requestId: "session-bookmarks",
        props: { title: "Bookmarks", isFocused: true, bodyColumns: 120, placement: "dock", scroll: {}, view: {} },
      } as any);
      const id = stored(w).bookmarks[0].id;
      await ui.press({ key: `resume:${id}` });
      expect(w.copied).toEqual([`cd '/work/it'\\''s a project' && claude --resume ${SID}`]);
      expect(await ui.find({ type: "Text", text: /Copied\. Paste in a new terminal/ })).toBeDefined();
      // the transcript under that odd cwd does not exist: the row says so
      expect(await ui.find({ type: "Text", text: /transcript missing/ })).toBeDefined();
      await ui.unmount();
      // /bm open again closes it
      expect((await $.command.run(bm("open"))).text).toBe("Bookmarks pane closed.");
    });
  }

  test("command words count only in their own shape", async () => {
    expect(parseArgs("")).toEqual({ verb: "save", tail: "" });
    expect(parseArgs("list")).toEqual({ verb: "list", tail: "" });
    expect(parseArgs("list of todos for the parser")).toEqual({ verb: "save", tail: "list of todos for the parser" });
    expect(parseArgs("resume 2")).toEqual({ verb: "resume", tail: "2" });
    expect(parseArgs("Resume me later")).toEqual({ verb: "save", tail: "Resume me later" });
    expect(parseArgs("delete")).toEqual({ verb: "usage", tail: "delete" });
    expect(parseArgs("rm 3")).toEqual({ verb: "delete", tail: "3" });
    expect(parseArgs("search auth")).toEqual({ verb: "find", tail: "auth" });
    expect(parseArgs("save list view")).toEqual({ verb: "save", tail: "list view" });
    expect(parseArgs("rename 1 New name")).toEqual({ verb: "rename", tail: "1 New name" });
  });

  test("resume command quoting", async () => {
    expect(shellQuote("/a b/c")).toBe("'/a b/c'");
    expect(shellQuote(`it's "x"`)).toBe(`'it'\\''s "x"'`);
    expect(resumeCommand({ cwd: "/Users/me/My Repo", sessionId: SID } as any)).toBe(`cd '/Users/me/My Repo' && claude --resume ${SID}`);
    expect(resumeCommand({ cwd: "/x", sessionId: "a b; rm -rf /" } as any)).toBe(`cd '/x' && claude --resume 'a b; rm -rf /'`);
    expect(resumeCommand({ cwd: "", sessionId: SID } as any)).toBe(`claude --resume ${SID}`);
  });

  test("/bm resume <n> copies and prints the command", async ($, on) => {
    mock.clock(on, { now: START });
    const w = world(on);
    await start($);
    await $.command.run(bm("Resume me later."));
    const out = await $.command.run(bm("resume 1"));
    expect(out.text).toContain(`cd '/work/my project' && claude --resume ${SID}`);
    expect(out.text).toMatch(/new terminal/);
    expect(w.copied).toEqual([`cd '/work/my project' && claude --resume ${SID}`]);
    expect((await $.command.run(bm("rename 1 Better name"))).text).toBe('Bookmark 1 is now "Better name".');
    expect(stored(w).bookmarks[0].title).toBe("Better name");
    expect((await $.command.run(bm("delete"))).text).toMatch(/^Usage is \/bm delete <n>/);
  });

  test("a corrupt file is backed up and a fresh list started, and the person is told", async ($, on) => {
    mock.clock(on, { now: START });
    const w = world(on, { files: { [FILE]: "{ not json" } });
    await start($);
    const out = await $.command.run(bm("list"));
    expect(out.text).toMatch(/^Your bookmarks file was unreadable, so I saved a copy to \/test\/bm\/bookmarks\.json\.corrupt-\d{8}-\d{6} and started a fresh list\./);
    const backup = [...w.fs.keys()].find((k) => k.includes(".corrupt-"));
    expect(w.fs.get(backup!)).toBe("{ not json");
    expect(stored(w)).toEqual({ version: 1, bookmarks: [] });
    const saved = await $.command.run(bm("After the crash."));
    expect(saved.text).toMatch(/^Bookmarked "After the crash\."/);
    expect(stored(w).bookmarks).toHaveLength(1);
  });

  test("bookmarks persist into a new session, and missing folders are flagged", async ($, on) => {
    const clock = mock.clock(on, { now: START });
    const w = world(on);
    await start($);
    await $.command.run(bm("From session one."));
    // a different session in another folder, the same file on disk
    w.session = { id: SID2, cwd: "/elsewhere" };
    await clock.advance(3_600_000);
    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/elsewhere" } as any);
    const list = await $.command.run(bm("list"));
    expect(list.text).toMatch(/1\. From session one\.[\s\S]*1 h ago/);
    expect(list.text).not.toMatch(/folder no longer exists/);
    // the folder is removed later
    const saved = stored(w);
    saved.bookmarks[0].cwd = "/gone/folder";
    w.fs.set(FILE, JSON.stringify(saved));
    expect((await $.command.run(bm("list"))).text).toMatch(/\[folder no longer exists\]/);
  });

  test("model tools: bookmark_session and find_bookmarks", async ($, on) => {
    mock.clock(on, { now: START });
    const w = world(on);
    await start($);
    const saved: any = await $.tool.call({
      tool: "mcp__session-bookmarks__bookmark_session",
      title: "Parser retry race",
      note: "Race found; next add a fake clock.",
    } as any);
    expect(saved.result).toMatch(/^Bookmarked "Parser retry race"\./);
    expect(w.completes).toBe(0);
    const found: any = await $.tool.call({ tool: "mcp__session-bookmarks__find_bookmarks", query: "parser" } as any);
    expect(found.result).toMatch(/Bookmarks matching "parser" \(1\)/);
    expect(found.result).toContain(`resume in a new terminal with: cd '/work/my project' && claude --resume ${SID}`);
    const none: any = await $.tool.call({ tool: "mcp__session-bookmarks__find_bookmarks", query: "kubernetes" } as any);
    expect(none.result).toBe('No bookmark matches "kubernetes".');
  });

  test("help, unknown numbers and title cleanup", async ($, on) => {
    mock.clock(on, { now: START });
    world(on);
    await start($);
    const help = await $.command.run(bm("help"));
    expect(help.text).toMatch(/new terminal/);
    expect(help.text).toContain(FILE);
    expect(help.text).not.toMatch(/—/);
    expect((await $.command.run(bm("resume 1"))).text).toMatch(/No bookmarks saved yet/);
    expect((await $.command.run(bm("close"))).text).toBe("The Bookmarks pane is not open.");
    expect(cleanTitle("“A title — with a dash”")).not.toMatch(/—/);
    expect(cleanTitle("x".repeat(80)).length).toBeLessThanOrEqual(60);
    expect(search([{ title: "A", note: "", project: "web", branch: "main" }] as any, "WEB main")).toHaveLength(1);
  });
});
