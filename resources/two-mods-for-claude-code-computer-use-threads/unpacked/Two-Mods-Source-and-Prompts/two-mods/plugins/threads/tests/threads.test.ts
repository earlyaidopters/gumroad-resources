import { describe, expect, test } from "claude-code/testing";
import {
  bandText,
  buildBrief,
  isTrusted,
  messagesToItems,
  parseNew,
  parseRegistry,
  parseTranscript,
  readScreen,
  resolveRef,
  statusOf,
  threadOfDelivery,
  threadTitle,
  toolLine,
  buildPhasePrompt,
  gateAfter,
  handoffPathFor,
  stepPlan,
  validatePlan,
  costFromTranscript,
  costOfUsage,
  money,
  planRecordMarkdown,
  conversationOutline,
  buildSpawnArgv,
  worktreeOutcome,
  isUnread,
} from "../hooks/core.mjs";

const HOME = "/home/tester";
const CFG = `${HOME}/.claude`;
const REG = `${CFG}/threads/registry.json`;
const EVENTS = `${CFG}/threads/events.jsonl`;
const LEAD = "1eadc0de-0000-4000-8000-000000000000";
const OTHER_LEAD = "07e10000-0000-4000-8000-000000000000";
const LEAD_SOCK = "/tmp/cc-socks/4000.sock";
const APP = "/work/app";
const T0 = Date.parse("2026-10-03T12:00:00Z");

const PERMISSION_SCREEN = [
  "● Bash(rm -rf build)",
  "╭──────────────────────────────────────────╮",
  "│ Bash command                              │",
  "│   rm -rf build                            │",
  "│ Do you want to proceed?                   │",
  "│ ❯ 1. Yes                                  │",
  "│   2. Yes, and don't ask again for rm      │",
  "│   3. No, and tell Claude what to do (esc) │",
  "╰──────────────────────────────────────────╯",
].join("\n");

type Pane = { dead: boolean; pid: number; screen: string };
type World = {
  fs: Map<string, string>;
  dirs: Map<string, string>; // path -> realPath
  tmux: Map<string, Pane>;
  alive: Set<number>;
  runs: string[][];
  writes: string[];
  sent: Array<{ to: any; text: string }>;
  asked: string[];
  answers: Array<string | null>;
  toasts: string[];
  panes: Set<string>;
  loggedIn: boolean;
  authCalls: number;
  now: number;
  sleeps: number;
  nextPid: number;
  register: boolean; // a spawned thread writes its sessions json
  spawnScreen: string;
  onSleep?: (w: World, n: number) => void;
  onSleepAsync?: ($: any, w: World, n: number) => Promise<void>;
  deliver: boolean | string;
  spawned: any[];
  spawnDeny?: string;
  agentList: any[];
  agentMessages: Record<string, any[]>;
  stopped: string[];
  checkDecision: "allow" | "ask" | "deny";
  decisions: string[];
  eng?: any; // the test's own $, for raising events from inside a stub
  duringCall?: () => Promise<void>;
  tmuxVersion?: string;
  forkText?: string | null;
  leadMessages: any[];
  forkPrompts: string[];
  surface: string;
  appended: any[];
  submitted: string[];
  afters: number[];
  stepEfforts: Array<string | undefined>;
  git?: (args: string[]) => { code?: number; stdout?: string; stderr?: string } | undefined;
  duringSpawn?: () => Promise<void>;
  store: Record<string, unknown>;
};

function fresh(over: Partial<World> = {}): World {
  const w: World = {
    fs: new Map(),
    dirs: new Map([
      [APP, APP],
      ["/work/untrusted", "/work/untrusted"],
      ["/tmp/demo", "/private/tmp/demo"],
    ]),
    tmux: new Map(),
    alive: new Set([4000]),
    runs: [],
    writes: [],
    sent: [],
    asked: [],
    answers: [],
    toasts: [],
    panes: new Set(),
    loggedIn: true,
    authCalls: 0,
    now: T0,
    sleeps: 0,
    nextPid: 5001,
    register: true,
    spawnScreen: "╭─╮\n│ > │\n╰─╯",
    deliver: true,
    spawned: [],
    agentList: [],
    agentMessages: {},
    stopped: [],
    checkDecision: "allow",
    decisions: [],
    appended: [],
    submitted: [],
    afters: [],
    stepEfforts: [],
    leadMessages: [],
    forkPrompts: [],
    surface: "terminal",
    store: {},
    ...over,
  };
  w.fs.set(
    `${HOME}/.claude.json`,
    JSON.stringify({ projects: { [APP]: { hasTrustDialogAccepted: true }, "/tmp/demo": { hasTrustDialogAccepted: true } } }),
  );
  w.fs.set(
    `${CFG}/sessions/4000.json`,
    JSON.stringify({ pid: 4000, sessionId: LEAD, cwd: APP, name: "Lead chat", status: "busy", messagingSocketPath: LEAD_SOCK }),
  );
  return w;
}

function transcriptPath(cwd: string, sessionId: string) {
  return `${CFG}/projects/${cwd.replace(/[^a-zA-Z0-9]/g, "-")}/${sessionId}.jsonl`;
}

function assistant(text: string, model = "claude-haiku-4-5-20251001", extra: object[] = []) {
  return JSON.stringify({
    type: "assistant",
    timestamp: new Date(T0).toISOString(),
    message: { role: "assistant", model, content: [{ type: "text", text }, ...extra] },
  });
}

function userRow(content: unknown) {
  return JSON.stringify({ type: "user", timestamp: new Date(T0).toISOString(), message: { role: "user", content } });
}

function sessionFileOf(w: World, sessionId: string) {
  for (const [k, v] of w.fs) {
    if (k.startsWith(`${CFG}/sessions/`) && v.includes(sessionId)) return k;
  }
  return "";
}

function setSession(w: World, sessionId: string, patch: object) {
  const k = sessionFileOf(w, sessionId);
  w.fs.set(k, JSON.stringify({ ...JSON.parse(w.fs.get(k)!), ...patch }));
}

function registry(w: World) {
  return JSON.parse(w.fs.get(REG) ?? '{"threads":[]}');
}

function events(w: World) {
  return (w.fs.get(EVENTS) ?? "")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// the rows the plugin appended for the lead's model (the test kit cannot complete a plugin's append, so the plugin logs each)
function appendedRows(w: World) {
  return events(w).filter((e: any) => e.type === "report-appended").map((e: any) => e.row);
}

function spawns(w: World) {
  return w.runs.filter((a) => a[0] === "tmux" && a.includes("new-session"));
}

function sendKeys(w: World) {
  return w.runs.filter((a) => a[0] === "tmux" && a.includes("send-keys")).map((a) => a.slice(5));
}

// Claude Code beneath the mod: the host commands, files, tmux, sockets and dialogs.
function engine(on: any, w: World) {
  on("session.start", ($: any, e: any) => ({ cwd: e.cwd }));
  on("command.register", ($: any, e: any) => ({ value: { command: e.name } }));
  on("tool.register", ($: any, e: any) => ({ value: { tool: `mcp__threads__${e.name}` } }));
  on("clock.now", () => ({ value: w.now }));
  on("clock.every", () => ({ value: undefined }));
  on("ui.log", () => ({ value: undefined }));
  on("ui.toast", ($: any, e: any) => {
    w.toasts.push(e.text);
    return { value: undefined };
  });
  on("ui.open", ($: any, e: any) => {
    w.panes.add(e.id);
    return { value: { isPlaced: true } };
  });
  on("ui.close", ($: any, e: any) => {
    w.panes.delete(e.id);
    return { value: undefined };
  });
  on("ui.panes", () => ({ value: [...w.panes].map((id) => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })) }));
  on("ui.copy", () => ({ value: { isCopied: true } }));
  on("ui.render", ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }));
  on("session.receive", ($: any, e: any) => ({ text: e.text }));
  on("env.get", ($: any, e: any) => ({ value: e.name === "HOME" ? HOME : undefined }));
  on("session.id", () => ({ value: LEAD }));
  on("session.cwd", () => ({ value: APP }));
  on("tool.call", { tool: "AskUserQuestion" }, ($: any, e: any) => {
    const q = e.questions[0].question;
    w.asked.push(q);
    const a = w.answers.length ? w.answers.shift() : null;
    if (a === null || a === undefined) return { deny: "dismissed" };
    return { result: { questions: e.questions, answers: { [q]: a } } };
  });
  on("session.send", ($: any, e: any) => {
    if (w.deliver !== true) return { isDelivered: false, reason: typeof w.deliver === "string" ? w.deliver : "session is not running" };
    w.sent.push({ to: e.to, text: e.text });
    return { isDelivered: true };
  });
  on("fs.read", ($: any, e: any) => {
    if (!w.fs.has(e.path)) throw new Error(`ENOENT ${e.path}`);
    return { value: w.fs.get(e.path) };
  });
  on("fs.write", ($: any, e: any) => {
    w.writes.push(e.path);
    w.fs.set(e.path, e.text ?? e.content ?? e.data);
    return { value: undefined };
  });
  on("fs.exists", ($: any, e: any) => ({ value: w.fs.has(e.path) || w.dirs.has(e.path) }));
  on("fs.list", ($: any, e: any) => {
    const dir = `${e.path}/`;
    const names = [...w.fs.keys()].filter((k) => k.startsWith(dir) && !k.slice(dir.length).includes("/")).map((k) => k.slice(dir.length));
    return { value: names.map((name) => ({ name, kind: "file", size: 10, mtimeMs: 0, isLink: false })) };
  });
  on("fs.stat", ($: any, e: any) => {
    if (w.dirs.has(e.path)) return { value: { kind: "dir", size: 0, mtimeMs: 0, isLink: false, realPath: w.dirs.get(e.path) } };
    if (w.fs.has(e.path)) return { value: { kind: "file", size: 1, mtimeMs: 0, isLink: false, realPath: e.path } };
    return { value: { kind: "other", size: 0, mtimeMs: 0, isLink: false } };
  });
  // the inline backend: subagents of this chat
  // A plugin's $.agent.spawn reaches agent.spawn as the background Agent call it makes
  // ({ tool: "Agent", prompt, description, subagent_type, model, name, run_in_background, cwd? }).
  // Only core can mint an agent id, so the stub answers the model and lists the agent by name.
  on("agent.spawn", ($: any, e: any) => {
    w.spawned.push({ ...e });
    if (w.spawnDeny) return { deny: w.spawnDeny };
    const id = `agent-${w.spawned.length}`;
    w.agentList.push({ id, description: e.description, type: e.subagent_type ?? e.subagentType, status: "running", name: e.name, spawnedBy: "threads" });
    if (w.duringSpawn) {
      // the agent's first request lands before spawn resolves
      return (async () => {
        await w.duringSpawn!();
        return { model: "claude-haiku-4-5-20251001" };
      })();
    }
    return { model: "claude-haiku-4-5-20251001" };
  });
  on("agent.list", () => ({ value: w.agentList.map((a) => ({ ...a })) }));
  on("session.messages", ($: any, e: any) => ({ value: e?.agentId ? w.agentMessages[e.agentId] ?? [] : w.leadMessages }));
  on("model.fork", ($: any, e: any) => {
    w.forkPrompts.push(e.prompt);
    return { value: w.forkText ? { isAnswered: true, text: w.forkText, usage: {} } : { isAnswered: false, reason: "nothing-to-fork", usage: {} } };
  });
  on("session.model", () => ({ value: "claude-sonnet-5-5" }));
  on("session.surface", () => ({ value: w.surface }));
  on("tool.call", { tool: "TaskStop" }, ($: any, e: any) => {
    w.stopped.push(e.task_id);
    const a = w.agentList.find((x) => x.id === e.task_id || x.name === e.task_id);
    if (a) a.status = "killed";
    return { result: {}, text: "stopped" };
  });
  on("tool.call", { tool: "Read" }, () => ({ result: {}, text: "file text" }));
  on("tool.call", { tool: "Bash" }, async ($: any, e: any) => {
    const d = await w.eng.tool.check({ tool: "Bash", input: { command: e.command }, tool_use_id: e.tool_use_id });
    w.decisions.push(d.decision);
    if (w.duringCall) await w.duringCall();
    return { result: {}, text: "exit 1", isError: true };
  });
  on("tool.check", () => ({ decision: w.checkDecision }));
  on("turn.step", async function* ($: any, e: any) {
    w.stepEfforts.push(e.effort);
    yield { kind: "text", index: 0, text: "Found " };
    yield { kind: "text", index: 0, text: "3 files." };
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "Found 3 files.",
      toolUses: [],
      stopReason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, model: "claude-haiku-4-5-20251001" },
    };
  });
  on("turn.complete", ($: any, e: any) => ({ text: e.answer }));
  on("turn.start", ($: any, e: any) => ({ turnId: e.turnId }));
  // A session.append hook may not answer a row itself, and nothing sits beneath the test's hooks,
  // so the stub records the row and passes it on (the plugin's append then rejects, which it tolerates).
  on("session.append", ($: any, e: any, next: any) => {
    w.appended.push(e.message);
    return next(e);
  });
  on("prompt.submit", ($: any, e: any) => {
    w.submitted.push(e.text);
    return { text: e.text };
  });
  on("clock.after", ($: any, e: any) => {
    w.afters.push(e.ms ?? 0);
    return { value: undefined };
  });
  on("store.get", ($: any, e: any) => ({ value: w.store[e.key] }));
  on("store.set", ($: any, e: any) => {
    w.store[e.key] = e.value;
    return { value: undefined };
  });
  on("process.run", ($: any, e: any) => {
    const argv: string[] = [...e.argv];
    w.runs.push(argv);
    const ok = (stdout = "") => ({ value: { exitCode: 0, stdout, stderr: "", isStdoutTruncated: false, isStderrTruncated: false } });
    const fail = (stderr = "no", code = 1, stdout = "") => ({ value: { exitCode: code, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false } });
    const [cmd] = argv;
    if (cmd === "claude") {
      w.authCalls++;
      const out = JSON.stringify({ loggedIn: w.loggedIn, authMethod: w.loggedIn ? "claude.ai" : "none" });
      return w.loggedIn ? ok(out) : fail("", 1, out);
    }
    if (cmd === "mkdir" && argv[1] !== "-p") {
      // the registry lock: atomic create
      if (w.fs.has(`dir:${argv[1]}`)) return fail("File exists");
      w.fs.set(`dir:${argv[1]}`, "");
      return ok();
    }
    if (cmd === "rmdir") {
      w.fs.delete(`dir:${argv[1]}`);
      return ok();
    }
    if (cmd === "mkdir" || cmd === "chmod") return ok();
    if (cmd === "uuidgen") return ok("ABCDEF12-3456-4789-8ABC-DEF012345678\n");
    if (cmd === "git") {
      const r = w.git?.(argv.slice(1));
      if (!r) return fail("fatal: not a git repository", 128);
      return r.code ? fail(r.stderr ?? "git failed", r.code, r.stdout ?? "") : ok(r.stdout ?? "");
    }
    if (cmd === "tee") {
      w.fs.set(argv[2], (w.fs.get(argv[2]) ?? "") + e.init?.stdin);
      return ok();
    }
    if (cmd === "mv") {
      const [, , from, to] = argv;
      if (!w.fs.has(from)) return fail("no such file");
      w.fs.set(to, w.fs.get(from)!);
      w.fs.delete(from);
      return ok();
    }
    if (cmd === "rm") {
      w.fs.delete(argv[2]);
      return ok();
    }
    if (cmd === "ps") return ok(argv[4].split(",").filter((p) => w.alive.has(Number(p))).join("\n"));
    if (cmd === "tail") return w.fs.has(argv[3]) ? ok(w.fs.get(argv[3])) : fail("No such file");
    if (cmd === "sleep") {
      return (async () => {
        w.sleeps++;
        w.onSleep?.(w, w.sleeps);
        if (w.onSleepAsync) await w.onSleepAsync($, w, w.sleeps);
        return ok();
      })();
    }
    if (cmd === "tmux") {
      if (argv[1] === "-V") return w.tmuxVersion ? ok(`${w.tmuxVersion}\n`) : fail("command not found: tmux", 127);
      expect(argv.slice(0, 5)).toEqual(["tmux", "-L", "cc-threads", "-f", "/dev/null"]);
      const args = argv.slice(5);
      const target = args[args.indexOf("-t") + 1];
      switch (args[0]) {
        case "new-session": {
          const name = args[args.indexOf("-s") + 1];
          const pid = w.nextPid++;
          w.tmux.set(name, { dead: false, pid, screen: w.spawnScreen });
          if (w.register) {
            const sid = argv[argv.indexOf("--session-id") + 1];
            const title = argv[argv.indexOf("-n") + 1];
            const cwd = args[args.indexOf("-c") + 1];
            w.fs.set(
              `${CFG}/sessions/${pid}.json`,
              JSON.stringify({ pid, sessionId: sid, cwd, name: title, status: "busy", messagingSocketPath: `/tmp/cc-socks/${pid}.sock` }),
            );
            w.alive.add(pid);
          }
          return ok();
        }
        case "list-panes":
          if (w.tmux.size === 0) return fail("no server running on /tmp/tmux-501/cc-threads");
          return ok([...w.tmux].map(([n, p]) => `${n}|${p.dead ? 1 : 0}|${p.pid}`).join("\n"));
        case "capture-pane":
          return w.tmux.has(target) ? ok(w.tmux.get(target)!.screen) : fail("can't find session");
        case "send-keys":
          return w.tmux.has(target) ? ok() : fail("can't find session");
        case "kill-session":
          w.tmux.delete(target);
          return ok();
      }
      return fail("unknown tmux");
    }
    return fail(`unexpected ${cmd}`);
  });
}

const start = { surface: "terminal", isInteractive: true, cwd: APP } as any;
const cmd = (args: string) => ({ command: "threads", args, origin: { kind: "composer" }, presentation: { isFullscreen: true, columns: 160 } }) as any;
async function threads($: any, args: string) {
  return ((await $.command.run(cmd(args))).text ?? "") as string;
}
async function boot($: any, on: any, w: World) {
  w.eng = $;
  engine(on, w);
  await $.session.start(start);
}
function created(w: World, title: string) {
  return registry(w).threads.find((t: any) => t.title === `Thread | ${title}`);
}

const PANE_PROPS = { title: "Threads", isFocused: true, bodyColumns: 140, placement: "dock", scroll: {}, view: {} };
const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 };

describe("threads: pure helpers", () => {
  test("parseNew reads model, title, flags and task", () => {
    const p: any = parseNew('haiku Haiku scout --cwd "/tmp/my dir" --mode plan --no-report -- list the files -- and more');
    expect(p).toMatchObject({ model: "haiku", title: "Haiku scout", cwd: "/tmp/my dir", permissionMode: "plan", reportBack: false, task: "list the files -- and more" });
    expect((parseNew("haiku Scout list the files") as any).error).toMatch(/Usage/);
    expect((parseNew("haiku -- task") as any).error).toMatch(/Usage/);
    expect(threadTitle("Haiku scout")).toBe("Thread | Haiku scout");
    expect(threadTitle("Thread | Opus review")).toBe("Thread | Opus review");
  });

  test("trust: exact folder only, /tmp vs /private/tmp spellings", () => {
    const json = JSON.stringify({ projects: { "/tmp/practical-demo": { hasTrustDialogAccepted: true }, "/work/x": { hasTrustDialogAccepted: false } } });
    expect(isTrusted(json, "/private/tmp/practical-demo")).toBe(true);
    expect(isTrusted(json, "/private/tmp/practical-demo/task-alerts")).toBe(false); // Claude Code asks again there
    expect(isTrusted(json, "/tmp/practical-demo/")).toBe(true);
    expect(isTrusted(json, "/work/x")).toBe(false);
    expect(isTrusted(json, "/work/x/y")).toBe(false);
    expect(isTrusted("{broken", "/tmp/practical-demo")).toBe(false);
  });

  test("status mapping from tmux, the sessions json and the screen", () => {
    const base = { previous: "working", tmux: { isLive: true, isDead: false }, session: { status: "busy" }, pidAlive: true, screen: readScreen(""), now: T0, createdAt: T0 - 600000 };
    expect(statusOf(base)).toBe("working");
    expect(statusOf({ ...base, session: { status: "idle" } })).toBe("idle");
    expect(statusOf({ ...base, session: { status: "waiting" } })).toBe("needs-you");
    expect(statusOf({ ...base, screen: readScreen(PERMISSION_SCREEN) })).toBe("needs-you");
    expect(statusOf({ ...base, screen: readScreen("Login expired · Please run /login") })).toBe("needs-login");
    expect(statusOf({ ...base, screen: readScreen("Not logged in · Run /login") })).toBe("needs-login");
    expect(statusOf({ ...base, screen: readScreen("Do you trust the files in this folder?\n❯ 1. Yes, I trust this folder") })).toBe("needs-trust");
    expect(statusOf({ ...base, tmux: { isLive: false, isDead: false } })).toBe("exited");
    expect(statusOf({ ...base, tmux: { isLive: true, isDead: true } })).toBe("exited");
    expect(statusOf({ ...base, previous: "closed" })).toBe("closed");
    expect(statusOf({ ...base, session: null, createdAt: T0 - 1000 })).toBe("starting");
    const s = readScreen(PERMISSION_SCREEN);
    expect(s.prompt).toMatch(/rm -rf build/);
    expect(s.prompt).toMatch(/Do you want to proceed\?/);
    expect(s.isCursorOnYes).toBe(true);
    // old text above the fold does not count as a waiting prompt
    expect(readScreen(`Do you want to proceed?\n1. Yes\n${"line\n".repeat(40)}> `).needsYou).toBe(false);
  });

  test("transcript parsing: items, tool one-liners, errors and the verified model", () => {
    const jsonl = [
      '{"cut line',
      userRow("list the files"),
      JSON.stringify({ type: "assistant", message: { model: "claude-haiku-4-5-20251001", content: [{ type: "tool_use", name: "Bash", input: { command: "ls -la\necho" } }] } }),
      userRow([{ type: "tool_result", tool_use_id: "x", is_error: true, content: "permission denied" }]),
      JSON.stringify({ type: "assistant", message: { model: "claude-haiku-4-5-20251001", content: [{ type: "tool_use", name: "Read", input: { file_path: "/w/README.md" } }] } }),
      userRow('<cross-session-message from="uds:/tmp/cc-socks/4000.sock" from-name="Lead chat">focus on README</cross-session-message>'),
      JSON.stringify({ type: "user", isMeta: true, message: { role: "user", content: "hidden" } }),
      assistant("Three files: README.md, notes.txt, app.js."),
      JSON.stringify({ type: "assistant", message: { model: "<synthetic>", content: [{ type: "text", text: "No response requested." }] } }),
    ].join("\n");
    const parsed = parseTranscript(jsonl);
    expect(parsed.model).toBe("claude-haiku-4-5-20251001");
    expect(parsed.items.map((i: any) => `${i.kind}:${i.text}`)).toEqual([
      "user:list the files",
      "tool:Bash ls -la",
      "error:permission denied",
      "tool:Read /w/README.md",
      "message:from Lead chat: focus on README",
      "assistant:Three files: README.md, notes.txt, app.js.",
      "assistant:No response requested.",
    ]);
    expect(toolLine("Grep", { pattern: "TODO", path: "src" })).toBe("Grep TODO in src");
    expect(toolLine("SendMessage", { to: "uds:/tmp/cc-socks/1.sock" })).toBe("SendMessage to uds:/tmp/cc-socks/1.sock");
  });

  test("report matching: socket, pid socket, exact title; strangers are not matched", () => {
    const ts = [
      { id: "ta", title: "Thread | A", sessionId: "s-a", socket: "/tmp/cc-socks/11.sock", pid: 11, status: "working" },
      { id: "tb", title: "Thread | B", sessionId: "s-b", socket: "", pid: 12, status: "idle" },
      { id: "tc", title: "Thread | C", sessionId: "s-c", socket: "", pid: 0, status: "idle" },
    ];
    const env = (from: string, name: string) => `<cross-session-message from="${from}" from-name="${name}">done</cross-session-message>`;
    expect(threadOfDelivery(env("uds:/tmp/cc-socks/11.sock", "x"), ts)?.id).toBe("ta");
    expect(threadOfDelivery(env("uds:/tmp/cc-socks/12.sock", "x"), ts)?.id).toBe("tb");
    expect(threadOfDelivery(env("uds:/tmp/cc-socks/99.sock", "Thread | C"), ts)?.id).toBe("tc");
    expect(threadOfDelivery(env("uds:/tmp/cc-socks/99.sock", "Someone"), ts)).toBeUndefined();
    expect(threadOfDelivery("plain text, no envelope", ts)).toBeUndefined();
  });

  test("refs, registry parsing, brief and band text", () => {
    const ts: any[] = [
      { id: "t1a2b3", title: "Thread | Haiku scout", sessionId: "s1", status: "working" },
      { id: "t1a9f0", title: "Thread | Sonnet critic", sessionId: "s2", status: "idle" },
      { id: "t77777", title: "Thread | Haiku old", sessionId: "s3", status: "closed" },
    ];
    expect(resolveRef(ts, "t1a2").thread?.id).toBe("t1a2b3");
    expect(resolveRef(ts, "sonnet").thread?.id).toBe("t1a9f0");
    expect(resolveRef(ts, "Thread | Sonnet").thread?.id).toBe("t1a9f0");
    expect(resolveRef(ts, "haiku").thread?.id).toBe("t1a2b3"); // the live one wins
    expect(resolveRef(ts, "t1a").error).toMatch(/matches 2 threads/);
    expect(resolveRef(ts, "nope").error).toMatch(/No thread matches/);
    expect(parseRegistry("{oops").isCorrupt).toBe(true);
    expect(parseRegistry("").registry.threads).toEqual([]);
    expect(parseRegistry('{"cap":99,"threads":[]}').registry.cap).toBe(4);
    expect((parseRegistry('{"cap":2,"threads":[],"futureKey":{"a":1}}').registry as any).futureKey).toEqual({ a: 1 });
    const brief = buildBrief({ title: "Thread | X", leadTitle: "Lead chat", leadId: LEAD, task: "do it", cwd: APP, reportBack: true, leadSocket: LEAD_SOCK });
    expect(brief).toContain('"uds:/tmp/cc-socks/4000.sock"');
    expect(brief).toContain("Lead chat");
    expect(brief).not.toMatch(/—/);
    expect(buildBrief({ title: "T", leadTitle: "L", leadId: LEAD, task: "t", cwd: APP, reportBack: false, leadSocket: LEAD_SOCK })).not.toContain("uds:");
    expect(bandText(ts)).toBe("⇶ 2 threads · 1 working · /threads");
    expect(bandText([...ts, { id: "x", status: "needs-you" }])).toBe("⇶ 3 threads · 1 working · 1 needs you · /threads");
    expect(bandText([{ status: "closed" }])).toBe("");
  });
});

describe("threads: creating", () => {
  test("/threads new builds the exact tmux argv, no shell, and records the thread", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    const out = await threads($, "new haiku Haiku scout --mode acceptEdits -- list the files here and summarize them");
    expect(out).toMatch(/^Created Thread \| Haiku scout \(t[0-9a-f]{5}\) on haiku in \/work\/app as its own Claude Code session, permission mode acceptEdits\./);
    expect(out).toMatch(/Backend: auto picked a session because the terminal login works\./);
    expect(out).toMatch(/It is running\./);
    expect(out).toMatch(/report back here/);
    const [argv] = spawns(w);
    const t = created(w, "Haiku scout");
    expect(argv.slice(0, 15)).toEqual(["tmux", "-L", "cc-threads", "-f", "/dev/null", "new-session", "-d", "-s", `thread-${t.id}`, "-x", "200", "-y", "50", "-c", APP]);
    expect(argv[15]).toBe("env");
    for (const v of ["CLAUDECODE", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_MESSAGING_SOCKET", "CLAUDE_CODE_ENTRYPOINT", "TMUX", "TERM_PROGRAM"]) {
      expect(argv[argv.indexOf(v) - 1]).toBe("-u");
    }
    const c = argv.indexOf("claude");
    expect(argv.slice(c - 2, c)).toEqual(["TERM=xterm-256color", "COLORTERM=truecolor"]);
    expect(argv.slice(c, c + 14)).toEqual([
      "claude", "--model", "haiku", "--session-id", t.sessionId, "-n", "Thread | Haiku scout",
      "--remote-control", "Thread | Haiku scout", "--settings", '{"crossSessionInbound":"accept"}',
      "--permission-mode", "acceptEdits", "--append-system-prompt",
    ]);
    const brief = argv[c + 14];
    expect(brief).toContain(`"uds:${LEAD_SOCK}"`);
    expect(brief).toContain('created by the lead chat "Lead chat"');
    expect(argv[c + 15]).toBe("list the files here and summarize them");
    expect(argv.slice(c + 16)).toEqual([";", "set-option", "-t", `thread-${t.id}`, "remain-on-exit", "on"]);
    for (const shell of ["sh", "bash", "zsh", "/bin/sh"]) expect(argv).not.toContain(shell);
    expect(t.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(t).toMatchObject({ requestedModel: "haiku", cwd: APP, permissionMode: "acceptEdits", reportBack: true, parent: { sessionId: LEAD, title: "Lead chat", socket: LEAD_SOCK } });
    expect(events(w).map((e: any) => e.type)).toContain("created");
    // after the settle the thread has its pid and socket
    expect(t.pid).toBe(5001);
    expect(t.socket).toBe("/tmp/cc-socks/5001.sock");
  });

  test("refuses when the terminal login is missing, and caches the check for two minutes", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    const out = await threads($, "new haiku Scout --session -- list files");
    expect(out).toMatch(/^Not created\. Threads need the terminal Claude Code login\. Run `claude auth login` in Terminal once\./);
    expect(out).toMatch(/Or use an inline thread/);
    expect(spawns(w)).toHaveLength(0);
    await threads($, "new haiku Scout --session -- list files");
    expect(w.authCalls).toBe(1);
    w.now += 121000;
    await threads($, "new haiku Scout --session -- list files");
    expect(w.authCalls).toBe(2);
  });

  test("refuses an untrusted folder, a missing folder, an unknown mode or model", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    expect(await threads($, "new haiku Scout --cwd /work/untrusted -- list")).toMatch(/\/work\/untrusted is not a trusted folder\..*never accept trust/);
    expect(await threads($, "new haiku Scout --cwd /nowhere -- list")).toMatch(/Folder not found: \/nowhere/);
    expect(await threads($, "new haiku Scout --mode yolo -- list")).toMatch(/Unknown permission mode "yolo"/);
    expect(await threads($, "new gpt-5 Scout -- list")).toMatch(/Unknown model "gpt-5"/);
    const denied: any = await $.tool.call({ tool: "mcp__threads__threads_create", model: "sonnet", title: "x", task: "y", permission_mode: "sudo" } as any);
    expect(denied.deny).toMatch(/Unknown permission mode "sudo"/);
    expect(spawns(w)).toHaveLength(0);
    // /tmp/demo resolves to /private/tmp/demo, trusted under its /tmp spelling
    expect(await threads($, "new haiku Demo --cwd /tmp/demo -- list")).toMatch(/Created .* in \/private\/tmp\/demo as its own/);
  });

  test("the cap refuses past the limit", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    expect(await threads($, "cap 1")).toBe("Cap set to 1 live threads.");
    expect(await threads($, "cap 0")).toMatch(/Usage is \/threads cap/);
    expect(await threads($, "new haiku One -- a")).toMatch(/^Created/);
    expect(await threads($, "new haiku Two -- b")).toMatch(/1 threads are already live and the cap is 1/);
    expect(spawns(w)).toHaveLength(1);
    expect(await threads($, "cap")).toBe("The cap is 1 live threads.");
  });

  test("a thread stuck on the login screen is marked needs-login", async ($, on) => {
    const w = fresh({ register: false, spawnScreen: "Welcome\nLogin expired · Please run /login" });
    await boot($, on, w);
    const out = await threads($, "new haiku Scout -- list");
    expect(out).toMatch(/stuck on the login screen/);
    expect(created(w, "Scout").status).toBe("needs-login");
  });

  test("threads_create tool, plain English path", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_create", model: "sonnet", title: "Sonnet critic", task: "read README.md and suggest one improvement" } as any);
    expect(r.result).toMatch(/Created Thread \| Sonnet critic/);
    const argv = spawns(w)[0];
    expect(argv[argv.indexOf("--model") + 1]).toBe("sonnet");
    // the default: bypassed permissions, with the bypass warning skipped through flag settings
    expect(argv[argv.indexOf("--permission-mode") + 1]).toBe("bypassPermissions");
    expect(JSON.parse(argv[argv.indexOf("--settings") + 1])).toEqual({ crossSessionInbound: "accept", skipDangerousModePermissionPrompt: true });
    expect(created(w, "Sonnet critic").permissionMode).toBe("bypassPermissions");
    expect(r.result).toMatch(/permission mode bypassPermissions/);
  });
});

describe("threads: registry", () => {
  test("writes go to a temp file then mv over the registry; events append", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Scout -- list");
    const mvs = w.runs.filter((a) => a[0] === "mv" && a[3] === REG);
    expect(mvs.length).toBeGreaterThan(0);
    for (const a of mvs) expect(a[2]).toMatch(/registry\.json\.tmp-/);
    expect(w.writes).not.toContain(REG);
    expect([...w.fs.keys()].filter((k) => k.includes(".tmp-"))).toHaveLength(0);
    // every write held the cross-process lock and let it go
    expect(w.runs.filter((a) => a[0] === "mkdir" && a[1] === `${REG}.lock`).length).toBe(w.runs.filter((a) => a[0] === "rmdir").length);
    expect(w.fs.has(`dir:${REG}.lock`)).toBe(false);
    expect(w.runs.some((a) => a[0] === "tee" && a[1] === "-a" && a[2] === EVENTS)).toBe(true);
  });

  test("a corrupt registry is backed up and a fresh one started", async ($, on) => {
    const w = fresh();
    w.fs.set(REG, "{ this is not json");
    await boot($, on, w);
    const out = await threads($, "list");
    expect(out).toMatch(/No threads yet/);
    const backups = [...w.fs.keys()].filter((k) => k.startsWith(`${REG}.corrupt-`));
    expect(backups).toHaveLength(1);
    expect(w.fs.get(backups[0])).toBe("{ this is not json");
    expect(w.toasts.some((t) => /did not parse/.test(t))).toBe(true);
    expect(events(w).map((e: any) => e.type)).toContain("registry-reset");
    expect(await threads($, "new haiku Scout -- list")).toMatch(/^Created/);
    expect(registry(w).threads).toHaveLength(1);
  });

  test("clean drops old closed threads and keeps live ones", async ($, on) => {
    const w = fresh();
    const old = { id: "t00001", title: "Thread | Old", sessionId: "00000000-0000-4000-8000-000000000001", tmux: "thread-t00001", cwd: APP, status: "closed", createdAt: T0 - 9e8, closedAt: T0 - 8 * 864e5, parent: { sessionId: LEAD } };
    const recent = { ...old, id: "t00002", title: "Thread | Recent", sessionId: "00000000-0000-4000-8000-000000000002", closedAt: T0 - 864e5 };
    w.fs.set(REG, JSON.stringify({ version: 1, cap: 4, threads: [old, recent] }));
    await boot($, on, w);
    expect(await threads($, "clean")).toMatch(/Removed 1 old thread .*t00001/);
    expect(registry(w).threads.map((t: any) => t.id)).toEqual(["t00002"]);
    expect(await threads($, "clean")).toMatch(/Nothing to clean/);
  });
});

describe("threads: steering", () => {
  async function two($: any, on: any, w: World) {
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    await threads($, "new sonnet Sonnet critic -- read README.md");
    return { scout: created(w, "Haiku scout"), critic: created(w, "Sonnet critic") };
  }

  test("send delivers by sessionId; ids and title prefixes resolve; strangers get nothing", async ($, on) => {
    const w = fresh();
    const { scout, critic } = await two($, on, w);
    expect(await threads($, "send haiku please also count lines")).toMatch(/^Sent to Haiku scout \(t[0-9a-f]+\): please also count lines/);
    expect(w.sent).toEqual([{ to: scout.sessionId, text: "please also count lines" }]);
    expect(await threads($, `send ${critic.id} keep it short`)).toMatch(/^Sent to Sonnet critic/);
    expect(w.sent[1].to).toBe(critic.sessionId);
    expect(await threads($, "send zzz hello")).toMatch(/No thread matches "zzz"/);
    expect(await threads($, "send haiku")).toMatch(/Usage is \/threads send/);
    expect(w.sent).toHaveLength(2);
    expect(events(w).filter((e: any) => e.type === "message-sent")).toHaveLength(2);
    w.deliver = false;
    expect(await threads($, "send haiku x")).toMatch(/Not delivered to Haiku scout .*session is not running/);
  });

  test("a refused message to a live session thread is typed into its prompt; long text goes through a file", async ($, on) => {
    const w = fresh();
    const { scout } = await two($, on, w);
    w.deliver = "The server-side auto mode classifier gave no verdict for SendMessage";
    expect(await threads($, "send haiku add an empty-string test")).toMatch(/^Sent to Haiku scout .* by typing it into its prompt \(the message channel refused: The server-side auto mode/);
    expect(sendKeys(w)).toEqual([
      ["send-keys", "-t", scout.tmux, "-l", "Message from your lead chat: add an empty-string test"],
      ["send-keys", "-t", scout.tmux, "C-m"],
    ]);
    const long = `line one\n${"x".repeat(700)}`;
    expect(await threads($, `send haiku ${long}`)).toMatch(/by typing it into its prompt/);
    const typed = sendKeys(w)[2];
    expect(typed[4]).toMatch(/^Message from your lead chat: read .*\/inbox\/t[0-9a-f]+-\d+\.md and follow it\.$/);
    expect(events(w).filter((e: any) => e.type === "typed-fallback")).toHaveLength(2);
    // a permission dialog on screen is never typed over
    w.tmux.get(scout.tmux)!.screen = PERMISSION_SCREEN;
    expect(await threads($, "send haiku x")).toMatch(/^Not delivered to Haiku scout/);
    expect(sendKeys(w)).toHaveLength(4);
  });

  test("type sends literal text and a separate Enter; interrupt sends Escape", async ($, on) => {
    const w = fresh();
    const { scout } = await two($, on, w);
    expect(await threads($, "type haiku what is left?")).toMatch(/^Typed into Haiku scout/);
    expect(sendKeys(w)).toEqual([
      ["send-keys", "-t", scout.tmux, "-l", "what is left?"],
      ["send-keys", "-t", scout.tmux, "C-m"],
    ]);
    expect(await threads($, "interrupt haiku")).toMatch(/Pressed Escape in Haiku scout/);
    expect(sendKeys(w)[2]).toEqual(["send-keys", "-t", scout.tmux, "Escape"]);
    const viaTool: any = await $.tool.call({ tool: "mcp__threads__threads_send", id: scout.id, message: "/compact", mode: "type" } as any);
    expect(viaTool.result).toMatch(/Typed into/);
    const viaToolMsg: any = await $.tool.call({ tool: "mcp__threads__threads_send", id: "sonnet", message: "hurry" } as any);
    expect(viaToolMsg.result).toMatch(/Sent to Sonnet critic/);
    expect(events(w).map((e: any) => e.type)).toEqual(expect.arrayContaining(["typed", "interrupted", "message-sent"]));
  });

  test("model change types /model only when idle", async ($, on) => {
    const w = fresh();
    const { scout } = await two($, on, w);
    expect(await threads($, "model haiku sonnet")).toMatch(/is working\. Change its model when it is idle/);
    expect(sendKeys(w)).toHaveLength(0);
    setSession(w, scout.sessionId, { status: "idle" });
    expect(await threads($, "model haiku sonnet")).toMatch(/Switched Haiku scout .* to sonnet/);
    expect(sendKeys(w)).toEqual([
      ["send-keys", "-t", scout.tmux, "-l", "/model sonnet"],
      ["send-keys", "-t", scout.tmux, "C-m"],
    ]);
    expect(created(w, "Haiku scout").requestedModel).toBe("sonnet");
    expect(events(w).find((e: any) => e.type === "model-set")).toMatchObject({ from: "haiku", to: "sonnet" });
    expect(await threads($, "model haiku gpt")).toMatch(/Unknown model/);
  });

  test("approve and deny only after a confirm that shows the prompt", async ($, on) => {
    const w = fresh();
    const { scout } = await two($, on, w);
    expect(await threads($, "approve haiku")).toMatch(/not waiting on a permission prompt/);
    w.tmux.get(scout.tmux)!.screen = PERMISSION_SCREEN;
    w.answers.push("Cancel");
    expect(await threads($, "approve haiku")).toMatch(/Left .* prompt as it was/);
    expect(w.asked[0]).toMatch(/rm -rf build/);
    expect(w.asked[0]).toMatch(/Approve it\?/);
    expect(sendKeys(w)).toHaveLength(0);
    w.answers.push(null); // dismissed
    await threads($, "approve haiku");
    expect(sendKeys(w)).toHaveLength(0);
    w.answers.push("Approve");
    expect(await threads($, "approve haiku")).toMatch(/Approved Haiku scout's prompt/);
    expect(sendKeys(w)).toEqual([["send-keys", "-t", scout.tmux, "C-m"]]);
    w.answers.push("Deny");
    expect(await threads($, "deny haiku")).toMatch(/Denied/);
    expect(sendKeys(w)[1]).toEqual(["send-keys", "-t", scout.tmux, "Escape"]);
    expect(created(w, "Haiku scout").status).toBe("needs-you");
  });

  test("/threads close closes at once (typing it is the confirmation), only that tmux session, with the resume command", async ($, on) => {
    const w = fresh();
    const { scout, critic } = await two($, on, w);
    const out = await threads($, "close haiku");
    expect(out).toBe(`Closed Haiku scout (${scout.id}). Resume it with: cd '/work/app' && claude --resume ${scout.sessionId}`);
    expect(w.asked).toHaveLength(0);
    expect(w.tmux.has(scout.tmux)).toBe(false);
    expect(w.tmux.has(critic.tmux)).toBe(true);
    expect(created(w, "Haiku scout")).toMatchObject({ status: "closed", closedAt: T0 });
    expect(await threads($, "open haiku")).toMatch(/Resume after closing: cd '\/work\/app' && claude --resume/);
  });

  test("threads_close: a dialog by default, Cancel keeps it, no dialog means ask in chat, confirmed closes without asking", async ($, on) => {
    const w = fresh();
    const { scout, critic } = await two($, on, w);
    w.answers.push("Cancel");
    const kept: any = await $.tool.call({ tool: "mcp__threads__threads_close", id: scout.id } as any);
    expect(kept.result).toMatch(/left running: you chose Cancel/);
    // the dialog cannot be shown (the ask rejects, as seen in the desktop app): nothing closes, the model is told what to do
    const noDialog: any = await $.tool.call({ tool: "mcp__threads__threads_close", id: scout.id } as any);
    expect(noDialog.result).toMatch(/is still running\. No confirmation dialog could be shown here.*Ask the user in chat.*confirmed: true/);
    expect(w.tmux.has(scout.tmux)).toBe(true);
    expect(((await $.tool.call({ tool: "mcp__threads__threads_close", confirmed: true } as any)) as any).deny).toMatch(/needs id .* or all_of_plan/);
    const asked = w.asked.length;
    const yes: any = await $.tool.call({ tool: "mcp__threads__threads_close", id: scout.id, confirmed: true } as any);
    expect(yes.result).toMatch(/^Closed Haiku scout/);
    expect(w.asked.length).toBe(asked);
    w.answers.push("Close");
    const viaDialog: any = await $.tool.call({ tool: "mcp__threads__threads_close", id: critic.id } as any);
    expect(viaDialog.result).toMatch(/^Closed Sonnet critic/);
  });

  test("pane Close: with no dialog, a second press within 10 seconds closes", async ($, on) => {
    const w = fresh();
    const { scout } = await two($, on, w);
    await threads($, "");
    const ui = await $.ui.mount({ plugin: "threads", surface: "desktop", component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
    await ui.press({ key: `sel:${scout.id}` });
    await ui.press({ key: "close-thread" }); // the ask rejects: armed
    expect(w.tmux.has(scout.tmux)).toBe(true);
    expect(await ui.find({ type: "Text", text: /Press Close again within 10 seconds/ })).toBeDefined();
    await ui.press({ key: "close-thread" });
    expect(w.tmux.has(scout.tmux)).toBe(false);
    await ui.unmount();
  });
});

describe("threads: reports and monitoring", () => {
  test("a report from a thread is recorded, toasted and passed through; strangers are untouched", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    const text = `<cross-session-message from="uds:/tmp/cc-socks/${t.pid}.sock" from-name="Thread | Haiku scout">Done. 3 files, README is stale.</cross-session-message>`;
    const got: any = await $.session.receive({ origin: { kind: "peer" }, text } as any);
    expect(got).toEqual({ text });
    expect(created(w, "Haiku scout").lastReport).toEqual({ at: T0, text: "Done. 3 files, README is stale.", source: "peer" });
    expect(w.toasts.some((x) => x === "Haiku scout: Done. 3 files, README is stale.")).toBe(true);
    expect(events(w).find((e: any) => e.type === "report-received")).toMatchObject({ id: t.id });

    const before = w.fs.get(REG);
    const stranger = '<cross-session-message from="uds:/tmp/cc-socks/999.sock" from-name="Somebody">hi</cross-session-message>';
    expect(await $.session.receive({ origin: { kind: "peer" }, text: stranger } as any)).toEqual({ text: stranger });
    expect(w.fs.get(REG)).toBe(before);
  });

  test("threads_wait returns when the threads finish, with their latest output", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    const sleepsBefore = w.sleeps;
    w.onSleep = (world, n) => {
      world.now += 3000;
      if (n === sleepsBefore + 2) {
        setSession(world, t.sessionId, { status: "idle" });
        world.fs.set(transcriptPath(APP, t.sessionId), [userRow("list the files"), assistant("Found README.md and notes.txt.")].join("\n"));
      }
    };
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_wait", until: "idle", timeout_s: 60 } as any);
    expect(r.result).toMatch(/^Every thread is done or needs you\./);
    expect(r.result).toContain(`Changed: ${t.id}`);
    expect(r.result).toMatch(/\[idle\] model claude-haiku-4-5-20251001/);
    expect(r.result).toMatch(/says  Found README\.md and notes\.txt\./);
    expect(w.sleeps - sleepsBefore).toBe(2);
    expect(created(w, "Haiku scout").verifiedModel).toBe("claude-haiku-4-5-20251001");
  });

  test("threads_wait times out, and any_change returns at the first change", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    w.onSleep = (world) => {
      world.now += 3000;
    };
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_wait", ids: [t.id], timeout_s: 9 } as any);
    expect(r.result).toMatch(/^Timed out after 9s\./);
    expect(r.result).toContain("Changed: none");

    let n = 0;
    w.onSleep = (world) => {
      world.now += 3000;
      if (++n === 1) world.tmux.get(t.tmux)!.screen = PERMISSION_SCREEN;
    };
    const c: any = await $.tool.call({ tool: "mcp__threads__threads_wait", until: "any_change", timeout_s: 60 } as any);
    expect(c.result).toMatch(/^Something changed\./);
    expect(c.result).toMatch(/\[needs-you\]/);
    expect(c.result).toMatch(/waiting on: .*rm -rf build/);
    const none: any = await $.tool.call({ tool: "mcp__threads__threads_wait", ids: ["nope"] } as any);
    expect(none.result).toMatch(/No thread matches/);
  });

  test("threads_list and threads_read are bounded text", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    const rows = Array.from({ length: 80 }, (_, i) => assistant(`line ${i} ${"x".repeat(600)}`));
    w.fs.set(transcriptPath(APP, t.sessionId), rows.join("\n"));
    w.tmux.get(t.tmux)!.screen = Array.from({ length: 50 }, (_, i) => `screen row ${i}`).join("\n");
    const list: any = await $.tool.call({ tool: "mcp__threads__threads_list" } as any);
    expect(list.result).toMatch(/Threads of this chat \(1\), cap 4 live/);
    expect(list.result).toMatch(new RegExp(`${t.id} .*working.*Haiku scout.*haiku → claude-haiku-4-5-20251001`));
    const read: any = await $.tool.call({ tool: "mcp__threads__threads_read", id: t.id, limit: 500 } as any);
    expect(read.result.split("\n").length).toBeLessThanOrEqual(63);
    expect(read.result).toMatch(/older lines left out/);
    expect(read.result.length).toBeLessThanOrEqual(14100);
    expect(read.result).toMatch(/line 79/);
    const screen: any = await $.tool.call({ tool: "mcp__threads__threads_read", id: t.id, view: "screen", limit: 5 } as any);
    expect(screen.result.split("\n")).toEqual([`${t.title} (${t.id}) screen, working:`, "screen row 45", "screen row 46", "screen row 47", "screen row 48", "screen row 49"]);
  });
  test("threads_list counts other chats' closed threads instead of dumping their reports", async ($, on) => {
    const w = fresh();
    const other = { requestedModel: "opus", verifiedModel: "", cwd: "/x", permissionMode: "default", parent: { sessionId: OTHER_LEAD, title: "Other lead" }, task: "t", createdAt: T0 };
    w.fs.set(
      REG,
      JSON.stringify({
        version: 1,
        cap: 4,
        threads: [
          { ...other, id: "t99991", title: "Thread | Old one", sessionId: "99999999-0000-4000-8000-000000000001", tmux: "thread-t99991", status: "closed", closedAt: T0, lastReport: { text: `LONG REPORT ${"y".repeat(400)}`, at: T0 } },
          { ...other, id: "t99992", title: "Thread | Old two", sessionId: "99999999-0000-4000-8000-000000000002", tmux: "thread-t99992", status: "closed", closedAt: T0, lastReport: null },
        ],
      }),
    );
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const list: any = await $.tool.call({ tool: "mcp__threads__threads_list" } as any);
    expect(list.result).not.toMatch(/LONG REPORT/);
    expect(list.result).not.toMatch(/Threads of other chats/);
    expect(list.result).toMatch(/\(2 closed threads of other chats hidden; ask to include closed to see them\.\)/);
    const all: any = await $.tool.call({ tool: "mcp__threads__threads_list", include_closed: true } as any);
    expect(all.result).toMatch(/Threads of other chats \(2\)/);
    // other chats' reports stay one line, even when asked for
    expect(all.result).toMatch(/report: LONG REPORT y+…?/);
    expect(all.result).not.toMatch(/report:\nLONG REPORT/);
  });
});

describe("threads: pane and band", () => {
  for (const surface of ["terminal", "desktop"] as const) {
    test(`pane renders the tree and the selected thread on ${surface}`, async ($, on) => {
      const w = fresh();
      // another lead's thread, collapsed by default
      w.fs.set(
        REG,
        JSON.stringify({
          version: 1,
          cap: 4,
          threads: [{ id: "t99999", title: "Thread | Elsewhere", requestedModel: "opus", verifiedModel: "", sessionId: "99999999-0000-4000-8000-000000000000", tmux: "thread-t99999", cwd: "/x", permissionMode: "default", parent: { sessionId: OTHER_LEAD, title: "Other lead" }, task: "t", createdAt: T0, status: "closed", lastReport: null, closedAt: T0 }],
        }),
      );
      await boot($, on, w);
      await threads($, "new haiku Haiku scout -- list the files here");
      await threads($, "new sonnet Sonnet critic -- read README.md and suggest one improvement");
      const scout = created(w, "Haiku scout");
      w.fs.set(transcriptPath(APP, scout.sessionId), [userRow("list the files here"), assistant("README.md, notes.txt")].join("\n"));
      w.tmux.get(scout.tmux)!.screen = "╭──╮\n│ > hello from the screen │\n╰──╯";
      expect(await threads($, "")).toMatch(/Threads pane open: 2 live threads of this chat/);
      const ui = await $.ui.mount({ plugin: "threads", surface, component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
      expect(await ui.find({ type: "Text", text: "Lead · Lead chat" })).toBeDefined();
      expect(await ui.find({ key: `sel:${scout.id}` })).toBeDefined();
      expect(await ui.find({ key: `sel:${created(w, "Sonnet critic").id}` })).toBeDefined();
      expect(await ui.find({ key: "sel:t99999" })).toBeUndefined();
      expect(await ui.find({ key: "others", text: /Show other leads' threads \(1\)/ })).toBeDefined();
      // the first of yours is selected: Haiku scout (created first, sorted newest first => critic first)
      await ui.press({ key: `sel:${scout.id}` });
      expect(await ui.find({ type: "Text", text: `Thread | Haiku scout  (${scout.id})` })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /model  asked haiku · running claude-haiku-4-5-20251001/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /task   list the files here/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /says  README\.md, notes\.txt/ })).toBeDefined();
      for (const key of ["view", "steer", "interrupt", "model", "open", "close-thread", "refresh", "close-pane"]) {
        expect(await ui.find({ key })).toBeDefined();
      }
      await ui.press({ key: "view" });
      expect(await ui.find({ type: "Text", text: /hello from the screen/ })).toBeDefined();
      await ui.press({ key: "others" });
      expect(await ui.find({ key: "sel:t99999" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "Lead · Other lead" })).toBeDefined();
      // steer through the pane's field
      await ui.press({ key: "steer" });
      await ui.input({ key: "steer-input", text: "also count the lines" });
      expect(w.sent).toEqual([{ to: scout.sessionId, text: "also count the lines" }]);
      expect(await ui.find({ type: "Text", text: /Sent to Haiku scout/ })).toBeDefined();
      await ui.unmount();
    });
  }

  test("pane x asks before closing; band counts this chat's live threads", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- a");
    await threads($, "new sonnet Sonnet critic -- b");
    const critic = created(w, "Sonnet critic");
    w.tmux.get(critic.tmux)!.screen = PERMISSION_SCREEN;
    await threads($, "list");
    const band = await $.ui.mount({ plugin: "threads", surface: "terminal", component: "AbovePrompt", props: BAND } as any);
    expect(await band.find({ type: "Text", text: "⇶ 2 threads · 1 working · 1 needs you · /threads" })).toBeDefined();
    await band.unmount();
    const quiet = await $.ui.mount({ plugin: "threads", surface: "terminal", component: "AbovePrompt", props: { ...BAND, hasSurvey: true } } as any);
    expect(await quiet.find({ type: "Text", text: /threads/ })).toBeUndefined();
    await quiet.unmount();

    await threads($, "");
    const ui = await $.ui.mount({ plugin: "threads", surface: "terminal", component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
    await ui.press({ key: `sel:${critic.id}` });
    expect(await ui.find({ key: "approve" })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /waiting: .*rm -rf build/ })).toBeDefined();
    w.answers.push("Cancel");
    await ui.press({ key: "close-thread" });
    expect(w.tmux.has(critic.tmux)).toBe(true);
    w.answers.push("Close");
    await ui.press({ key: "close-thread" });
    expect(w.tmux.has(critic.tmux)).toBe(false);
    await ui.unmount();
    const after = await $.ui.mount({ plugin: "threads", surface: "terminal", component: "AbovePrompt", props: BAND } as any);
    expect(await after.find({ type: "Text", text: "⇶ 1 thread · 1 working · /threads" })).toBeDefined();
    await after.unmount();
  });

  test("help and unknown options", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    const help = await threads($, "help");
    expect(help).toMatch(/\/threads new <model> <title> -- <task>/);
    expect(help).not.toMatch(/—/);
    expect(await threads($, "explode")).toMatch(/Unknown \/threads option "explode"/);
    expect(await threads($, "new haiku")).toMatch(/Usage is \/threads new/);
  });
});

// ---- the inline backend ------------------------------------------------------------------

async function drainStep($: any, agentId: string, index = 0) {
  const s: any = $.turn.step({ turnId: `turn-${agentId}`, index, model: "claude-haiku-4-5-20251001", messageCount: 1, agentId } as any);
  let r = await s.next();
  while (!r.done) r = await s.next();
  return r.value;
}
async function finish($: any, w: World, agentId: string, answer: string) {
  const a = w.agentList.find((x) => x.id === agentId);
  if (a) a.status = "completed";
  return $.turn.complete({ answer, durationMs: 1000, isAborted: false, turnId: `turn-${agentId}`, agentId, reason: "answer", usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, model: "claude-haiku-4-5-20251001" } } as any);
}

describe("threads: inline backend", () => {
  test("auto picks inline when the CLI is logged out; spawn args and registry fields", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    const out = await threads($, "new haiku Haiku scout -- list the files here");
    expect(out).toMatch(/^Created Thread \| Haiku scout \(t[0-9a-f]{5}\) inline on haiku as a background agent of this chat \(agent agent-1\)\./);
    expect(out).toMatch(/Backend: auto picked inline because the terminal CLI is not logged in\./);
    expect(spawns(w)).toHaveLength(0);
    const t = created(w, "Haiku scout");
    expect(w.spawned).toHaveLength(1);
    const args = w.spawned[0];
    expect(args).toMatchObject({ tool: "Agent", model: "haiku", name: `thread-${t.id}`, description: "Thread | Haiku scout", subagent_type: "general-purpose", run_in_background: true });
    expect(args.cwd).toBeUndefined();
    expect(args.prompt).toMatch(/started in the background by the lead chat "Lead chat"/);
    expect(args.prompt).toMatch(/Task:\nlist the files here$/);
    expect(args.prompt).not.toMatch(/—/);
    expect(t).toMatchObject({ backend: "inline", agentId: "agent-1", resolvedModel: "haiku", sessionId: "", tmux: "", cwd: APP, status: "working", parent: { sessionId: LEAD, title: "Lead chat" } });
    expect(events(w).find((e: any) => e.type === "created")).toMatchObject({ backend: "inline", agentId: "agent-1" });
  });

  test("--inline when logged in, --cwd passes through, a refused spawn is reported, the cap counts inline threads", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    expect(await threads($, "new sonnet Critic --inline --cwd /tmp/demo --mode plan -- read README.md")).toMatch(/inline on .*\n.*permission mode; --mode plan was not applied/);
    expect(w.spawned[0].cwd).toBe("/private/tmp/demo");
    expect(w.authCalls).toBe(1); // only the first-use setup check; an inline request needs no login
    const viaTool: any = await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "Second", task: "x", backend: "inline" } as any);
    expect(viaTool.result).toMatch(/inline on/);
    expect((await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "Bad", task: "x", backend: "cloud" } as any) as any).deny).toMatch(/Unknown backend/);
    await threads($, "cap 2");
    expect(await threads($, "new haiku Third --inline -- y")).toMatch(/2 threads are already live and the cap is 2/);
    await threads($, "cap 4");
    w.spawnDeny = "background agents are disabled";
    expect(await threads($, "new haiku Third --inline -- y")).toMatch(/did not start: background agents are disabled/);
  });

  test("activity by agentId: tool calls, model steps, a permission ask, the final answer as the report", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    await $.tool.call({ tool: "Read", file_path: "/work/app/README.md", agentId: "agent-1", tool_use_id: "tu1" } as any);
    await $.tool.call({ tool: "Read", file_path: "/elsewhere", agentId: "agent-99", tool_use_id: "tu2" } as any); // not a thread
    await $.tool.call({ tool: "Read", file_path: "/main-loop" } as any); // the lead itself
    const step: any = await drainStep($, "agent-1");
    expect(step.answer).toBe("Found 3 files."); // passed through untouched
    w.checkDecision = "ask";
    let during = "";
    w.duringCall = async () => {
      during = await threads($, "list");
    };
    await $.tool.call({ tool: "Bash", command: "rm -rf build", agentId: "agent-1", tool_use_id: "tu3" } as any);
    expect(w.decisions).toEqual(["ask"]);
    expect(during).toMatch(new RegExp(`${t.id} +◆ needs-you`));
    await threads($, "list");
    const feed: any = await $.tool.call({ tool: "mcp__threads__threads_read", id: t.id, view: "screen" } as any);
    expect(feed.result).toMatch(/live activity, working/);
    expect(feed.result).toMatch(/model +claude-haiku-4-5-20251001 thinking \(request 1\)/);
    expect(feed.result).toMatch(/tool +Read \/work\/app\/README\.md/);
    expect(feed.result).toMatch(/says +Found 3 files\./);
    expect(feed.result).toMatch(/wait +asks to run Bash rm -rf build/);
    expect(feed.result).toMatch(/error +Bash: exit 1/);
    expect(feed.result).not.toMatch(/elsewhere|main-loop/);

    await finish($, w, "agent-1", "Three files: README.md, notes.txt, app.js. README is stale.");
    const after = created(w, "Haiku scout");
    expect(after.lastReport).toEqual({ at: T0, text: "Three files: README.md, notes.txt, app.js. README is stale.", source: "inline" });
    expect(after.verifiedModel).toBe("claude-haiku-4-5-20251001");
    expect(w.toasts).toContain("Thread | Haiku scout finished");
    expect(events(w).find((e: any) => e.type === "finished")).toMatchObject({ id: t.id, source: "inline" });
    expect(appendedRows(w)).toHaveLength(1);
    expect(appendedRows(w)[0]).toMatch(new RegExp(`^<thread report from Thread \\| Haiku scout \\(${t.id}\\), model claude-haiku-4-5-20251001>\\nThree files`));
    await $.turn.complete({ answer: "Three files: README.md, notes.txt, app.js. README is stale.", durationMs: 1, isAborted: false, turnId: "turn-agent-1", agentId: "agent-1", reason: "answer" } as any);
    expect(appendedRows(w)).toHaveLength(1); // the same run is reported once
    expect(await threads($, "list")).toMatch(new RegExp(`${t.id} +○ idle .*Haiku scout +· +inline, chat's mode +· +haiku → claude-haiku-4-5-20251001`));
    // the main loop's own turn is not a report
    await $.turn.complete({ answer: "lead answer", durationMs: 1, isAborted: false, turnId: "main", reason: "answer" } as any);
    expect(created(w, "Haiku scout").lastReport.text).toMatch(/^Three files/);
  });

  test("steer by agentId, type becomes a message, model/approve refuse, interrupt and close use TaskStop", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    expect(await threads($, "send haiku also count lines")).toMatch(/^Sent to Haiku scout/);
    expect(w.sent).toEqual([{ to: "agent-1", text: "also count lines" }]);
    expect(await threads($, "type haiku /compact")).toMatch(/no prompt to type into, so it went as a message\. Sent to Haiku scout/);
    expect(w.sent[1]).toEqual({ to: "agent-1", text: "/compact" });
    expect(sendKeys(w)).toHaveLength(0);
    expect(await threads($, "model haiku sonnet")).toMatch(/keeps the model it started on/);
    expect(await threads($, "approve haiku")).toMatch(/permission prompts show in this chat/);
    expect(await threads($, "open haiku")).toMatch(/background agent agent-1 of the chat "Lead chat"/);
    expect(await threads($, "interrupt haiku")).toMatch(/^Stopped Haiku scout .* A message \(\/threads send\) resumes it\./);
    expect(w.stopped).toEqual([`thread-${t.id}`]); // a named agent is stopped by its name
    // a finished (stopped) agent is resumed by a message
    expect(await threads($, "send haiku carry on")).toMatch(/^Sent to Haiku scout/);
    w.agentList[0].status = "running";
    w.answers.push("Close");
    expect(await threads($, "close haiku")).toMatch(/^Closed Haiku scout \(t[0-9a-f]+\)\. Its agent was stopped\./);
    expect(w.stopped).toEqual([`thread-${t.id}`, `thread-${t.id}`]);
    expect(created(w, "Haiku scout").status).toBe("closed");
    expect(await threads($, "send haiku more")).toMatch(/is closed; nothing sent/);
    const s: any = await $.tool.call({ tool: "mcp__threads__threads_send", id: t.id, mode: "interrupt" } as any);
    expect(s.result).toMatch(/is closed; nothing to stop/);
  });

  test("a new process marks this chat's inline threads exited; other leads' only when that lead is gone", async ($, on) => {
    const w = fresh();
    const base = { requestedModel: "haiku", verifiedModel: "", sessionId: "", tmux: "", cwd: APP, permissionMode: "inherited", task: "t", createdAt: T0 - 600000, lastReport: null, closedAt: 0, backend: "inline", resolvedModel: "" };
    w.fs.set(`${CFG}/sessions/4100.json`, JSON.stringify({ pid: 4100, sessionId: OTHER_LEAD, cwd: "/x", name: "Other lead", status: "busy" }));
    w.alive.add(4100);
    w.fs.set(REG, JSON.stringify({ version: 1, cap: 4, threads: [
      { ...base, id: "tmine1", title: "Thread | Mine", agentId: "agent-old", status: "working", parent: { sessionId: LEAD, title: "Lead chat" } },
      { ...base, id: "tother", title: "Thread | Theirs", agentId: "agent-x", status: "working", parent: { sessionId: OTHER_LEAD, title: "Other lead" } },
      { ...base, id: "tgone1", title: "Thread | Orphan", agentId: "agent-y", status: "idle", parent: { sessionId: "deadbeef-0000-4000-8000-000000000000", title: "Gone lead" } },
    ] }));
    await boot($, on, w);
    const st = (id: string) => registry(w).threads.find((t: any) => t.id === id).status;
    expect(st("tmine1")).toBe("exited");
    expect(st("tother")).toBe("working");
    expect(st("tgone1")).toBe("exited");
    expect(await threads($, "send theirs hi")).toMatch(/inline thread of another chat \(Other lead\)/);
    expect(w.sent).toHaveLength(0);
  });

  test("threads_wait returns when an inline thread finishes, with its report", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    w.onSleepAsync = async (_eng, world, n) => {
      world.now += 3000;
      if (n === 1) await finish($, world, "agent-1", "Done: 3 files.");
    };
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_wait", timeout_s: 60 } as any);
    expect(r.result).toMatch(/^Every thread is done or needs you\./);
    expect(r.result).toContain(`Changed: ${t.id}`);
    expect(r.result).toMatch(/\[idle\]/);
    expect(r.result).toMatch(/latest answer:\nDone: 3 files\./);
  });

  for (const surface of ["terminal", "desktop"] as const) {
    test(`pane shows an inline thread's transcript and live activity on ${surface}`, async ($, on) => {
      const w = fresh({ loggedIn: false });
      await boot($, on, w);
      await threads($, "new haiku Haiku scout -- list the files");
      const t = created(w, "Haiku scout");
      w.agentMessages["agent-1"] = [
        { role: "user", text: "list the files", toolUses: [] },
        { role: "assistant", text: "", toolUses: [{ tool: "Bash", input: { command: "ls" }, text: "a b" }] },
        { role: "assistant", text: "Found 3 files.", toolUses: [] },
      ];
      await $.tool.call({ tool: "Read", file_path: "/work/app/notes.txt", agentId: "agent-1", tool_use_id: "tu9" } as any);
      expect(await threads($, "")).toMatch(/Threads pane open: 1 live thread/);
      const ui = await $.ui.mount({ plugin: "threads", surface, component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
      expect(await ui.find({ key: `sel:${t.id}` })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /model  asked haiku · running/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /cwd    \/work\/app · inline agent agent-1/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /tool  Bash ls/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /says  Found 3 files\./ })).toBeDefined();
      expect(await ui.find({ key: "approve" })).toBeUndefined();
      expect(await ui.find({ key: "model" })).toBeUndefined();
      await ui.press({ key: "view" });
      expect(await ui.find({ type: "Text", text: "Live activity (last 30)" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /tool  Read \/work\/app\/notes\.txt/ })).toBeDefined();
      await ui.press({ key: "steer" });
      await ui.input({ key: "steer-input", text: "skip node_modules" });
      expect(w.sent).toEqual([{ to: "agent-1", text: "skip node_modules" }]);
      await ui.unmount();
      const band = await $.ui.mount({ plugin: "threads", surface, component: "AbovePrompt", props: BAND } as any);
      expect(await band.find({ type: "Text", text: "⇶ 1 thread · 1 working · /threads" })).toBeDefined();
      await band.unmount();
    });
  }
});

describe("threads: inline transcript rows", () => {
  test("the brief collapses to its task; teammate messages and tool uses read plainly", async () => {
    const brief = '<teammate-message teammate_id="lead">You are a worker ("thread") titled "Thread | X", started in the background...\n\nTask:\nsay hi in three words</teammate-message>';
    const items = messagesToItems([
      { role: "user", text: brief, toolUses: [] },
      { role: "user", text: '<teammate-message teammate_id="lead">Lead here: also say goodbye</teammate-message>', toolUses: [] },
      { role: "assistant", text: "", toolUses: [{ tool: "Read", input: { file_path: "/a" }, isError: true, text: "denied" }] },
      { role: "assistant", text: "Hi there, friend.", toolUses: [] },
    ]);
    expect(items.map((i: any) => `${i.kind}:${i.text}`)).toEqual(["user:task: say hi in three words", "message:Lead here: also say goodbye", "tool:Read /a", "error:denied", "assistant:Hi there, friend."]);
  });
});

// ---- the completion watcher, held messages, whole answers ----------------------------------

const LONG_ANSWER = ["Here is what I found:", "- README.md: the project intro, 40 lines", "- notes.txt: meeting notes", `- app.js: ${"the main script with a long description ".repeat(30)}end of third bullet`].join("\n");

describe("threads: completion watcher", () => {
  test("busy -> idle records the whole answer once, toasts, and appends one report row for the lead", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    await threads($, "refresh"); // the watcher sees it working
    expect(appendedRows(w)).toHaveLength(0);
    setSession(w, t.sessionId, { status: "idle" });
    w.fs.set(transcriptPath(APP, t.sessionId), [userRow("list the files"), JSON.stringify({ type: "assistant", uuid: "a1", timestamp: new Date(T0).toISOString(), message: { role: "assistant", model: "claude-haiku-4-5-20251001", content: [{ type: "text", text: LONG_ANSWER }] } })].join("\n"));
    await threads($, "refresh");
    expect(w.toasts).toContain("Thread | Haiku scout finished");
    expect(appendedRows(w)).toHaveLength(1);
    expect(appendedRows(w)[0].startsWith(`<thread report from Thread | Haiku scout (${t.id}), model claude-haiku-4-5-20251001>\nHere is what I found:`)).toBe(true);
    expect(created(w, "Haiku scout").lastReport).toMatchObject({ source: "watcher", text: LONG_ANSWER });
    expect(events(w).filter((e: any) => e.type === "finished")).toHaveLength(1);
    expect(w.afters).toHaveLength(0); // autowake is off by default
    // seen again: no second report
    await threads($, "refresh");
    setSession(w, t.sessionId, { status: "busy" });
    await threads($, "refresh");
    setSession(w, t.sessionId, { status: "idle" });
    await threads($, "refresh");
    expect(appendedRows(w)).toHaveLength(1);
  });

  test("a peer report in the last minute suppresses the watcher's copy; autowake submits a prompt", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list the files");
    const t = created(w, "Haiku scout");
    await threads($, "refresh");
    await $.session.receive({ origin: { kind: "peer" }, text: `<cross-session-message from="uds:/tmp/cc-socks/${t.pid}.sock" from-name="${t.title}">Done, see answer.</cross-session-message>` } as any);
    setSession(w, t.sessionId, { status: "idle" });
    w.fs.set(transcriptPath(APP, t.sessionId), [userRow("go"), assistant("Done, 3 files.")].join("\n"));
    await threads($, "refresh");
    expect(appendedRows(w)).toHaveLength(0);
    expect(created(w, "Haiku scout").lastReport.source).toBe("peer");

    expect(await threads($, "autowake on")).toMatch(/^Autowake on/);
    w.now += 61000;
    setSession(w, t.sessionId, { status: "busy" });
    await threads($, "refresh");
    setSession(w, t.sessionId, { status: "idle" });
    w.fs.set(transcriptPath(APP, t.sessionId), [userRow("go"), assistant("Done, 3 files."), userRow("more"), JSON.stringify({ type: "assistant", uuid: "a2", message: { model: "claude-haiku-4-5-20251001", content: [{ type: "text", text: "Also 120 lines total." }] } })].join("\n"));
    await threads($, "refresh");
    expect(appendedRows(w)).toHaveLength(1);
    // the wake is queued and fired later from a clock.after(0) callback, never inside the command
    expect(w.afters.length).toBeGreaterThan(0);
    expect(w.submitted).toEqual([]);
    expect(await threads($, "autowake")).toBe("Autowake is on. Usage is /threads autowake on|off.");
  });

  test("an idle thread whose newest row is a message it has not answered is not reported", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list");
    const t = created(w, "Haiku scout");
    await threads($, "refresh");
    setSession(w, t.sessionId, { status: "idle" });
    w.fs.set(transcriptPath(APP, t.sessionId), [assistant("old answer"), userRow("<cross-session-message from=\"x\">new ask</cross-session-message>")].join("\n"));
    await threads($, "refresh");
    expect(appendedRows(w)).toHaveLength(0);
  });

  test("needs-you and held-message transitions toast once", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list");
    const t = created(w, "Haiku scout");
    await threads($, "refresh");
    w.tmux.get(t.tmux)!.screen = PERMISSION_SCREEN;
    await threads($, "refresh");
    await threads($, "refresh");
    expect(w.toasts.filter((x) => x.startsWith("Thread | Haiku scout needs you: ")).length).toBe(1);
    expect(events(w).filter((e: any) => e.type === "needs-you")).toHaveLength(1);
  });
});

const HELD = (body: string) =>
  ["╭ Held message from another session ─╮", "│ Another Claude session sent a message: from Lead chat │", "│ Message body (this is what will be delivered): │", `│ ${body} │`, "│ ❯ 1. Deny │", "│   2. Deliver this message to Claude │", "╰──╯"].join("\n");

describe("threads: held messages", () => {
  test("a held copy of the message we sent is delivered with Down then Enter", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list");
    const t = created(w, "Haiku scout");
    w.onSleep = (world) => {
      if (world.tmux.get(t.tmux)!.screen === "") world.tmux.get(t.tmux)!.screen = HELD("Lead here: also count the lines");
    };
    w.tmux.get(t.tmux)!.screen = "";
    const out = await threads($, "send haiku Lead here: also count the lines");
    expect(out).toMatch(/it was held by that session; delivered it/);
    expect(sendKeys(w)).toEqual([
      ["send-keys", "-t", t.tmux, "Down"],
      ["send-keys", "-t", t.tmux, "C-m"],
    ]);
    expect(events(w).map((e: any) => e.type)).toContain("held-delivered");
  });

  test("a held message we did not send is left alone and shows as held-message", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list");
    const t = created(w, "Haiku scout");
    w.tmux.get(t.tmux)!.screen = HELD("Some other session asking for secrets");
    const out = await threads($, "send haiku Lead here: also count the lines");
    expect(out).toMatch(/shows a held message that does not match; left it for you \(status held-message\)/);
    expect(sendKeys(w)).toHaveLength(0);
    expect(await threads($, "list")).toMatch(new RegExp(`${t.id} +✉ held-message`));
  });

  test("the brief says notes to the lead may be held and the final answer is what counts", () => {
    const brief = buildBrief({ title: "T", leadTitle: "L", leadId: LEAD, task: "t", cwd: APP, reportBack: true, leadSocket: LEAD_SOCK });
    expect(brief).toMatch(/sees your final answer automatically/);
    expect(brief).toMatch(/may hold that note/);
    expect(brief).toMatch(/Optionally/);
  });
});

describe("threads: whole answers in tool output", () => {
  test("threads_wait, threads_read and threads_list return the full latest answer, not a snippet", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- list");
    const t = created(w, "Haiku scout");
    setSession(w, t.sessionId, { status: "idle" });
    w.fs.set(transcriptPath(APP, t.sessionId), [userRow("list"), JSON.stringify({ type: "assistant", uuid: "a1", message: { model: "claude-haiku-4-5-20251001", content: [{ type: "text", text: LONG_ANSWER }] } })].join("\n"));
    const wait: any = await $.tool.call({ tool: "mcp__threads__threads_wait", ids: [t.id], timeout_s: 30 } as any);
    expect(wait.result).toContain(LONG_ANSWER);
    const read: any = await $.tool.call({ tool: "mcp__threads__threads_read", id: t.id } as any);
    expect(read.result).toContain(`latest answer:\n${LONG_ANSWER}`);
    await threads($, "refresh"); // the watcher records it as the report
    const list: any = await $.tool.call({ tool: "mcp__threads__threads_list" } as any);
    expect(list.result).toContain(LONG_ANSWER);
  });
});

// ---- effort ---------------------------------------------------------------------------------

describe("threads: effort", () => {
  test("session threads get --effort; /threads effort types /effort when idle", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_create", model: "opus", title: "Architect", task: "spec it", effort: "high" } as any);
    expect(r.result).toMatch(/on opus \(effort high\)/);
    const argv = spawns(w)[0];
    expect(argv[argv.indexOf("--effort") + 1]).toBe("high");
    const t = created(w, "Architect");
    expect(t.effort).toBe("high");
    expect(await threads($, "effort arch turbo")).toMatch(/Unknown effort "turbo"/);
    expect(await threads($, "effort arch low")).toMatch(/is working\. Change its effort when it is idle/);
    setSession(w, t.sessionId, { status: "idle" });
    expect(await threads($, "effort arch low")).toMatch(/Set Architect .* to effort low/);
    expect(sendKeys(w)).toEqual([["send-keys", "-t", t.tmux, "-l", "/effort low"], ["send-keys", "-t", t.tmux, "C-m"]]);
    expect(created(w, "Architect").effort).toBe("low");
    expect((await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "X", task: "y", effort: "huge" } as any) as any).deny).toMatch(/Unknown effort/);
  });

  test("inline threads carry their effort on each request through turn.step", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_create", model: "sonnet", title: "Fixer", task: "fix", effort: "high" } as any);
    await drainStep($, "agent-1");
    await drainStep($, "agent-99"); // not a thread: untouched
    expect(w.stepEfforts).toEqual(["high", undefined]);
    expect(await threads($, "effort fixer low")).toMatch(/uses effort low from its next request/);
    await drainStep($, "agent-1", 1);
    expect(w.stepEfforts[2]).toBe("low");
  });
});

// ---- phase plans ------------------------------------------------------------------------------

const PHASES = [
  { name: "Notes", model: "haiku", effort: "low", task: "write PLAN-NOTES.md with 3 ideas for the README", acceptance: "PLAN-NOTES.md has 3 ideas" },
  { name: "Apply", model: "sonnet", task: "pick the best idea from the handoff and apply it to README.md" },
];

describe("threads: plan state machine and briefs", () => {
  const base = () => {
    const v: any = validatePlan({ title: "Demo", gate: "auto", phases: [...PHASES, { name: "Docs", model: "haiku", task: "docs", gate: "user" }] });
    return { id: "pabcde", cwd: "/r", handoffDir: "/r/handoff", backend: "session", lead: { sessionId: LEAD, title: "Lead" }, status: "running", current: 0, ...v };
  };

  test("validation: models, efforts, gates, phase count", () => {
    expect(validatePlan({ title: "x", phases: [] }).error).toMatch(/at least one phase/);
    expect(validatePlan({ title: "x", phases: [{ name: "a", model: "gpt", task: "t" }] }).error).toMatch(/Phase 1: Unknown model/);
    expect(validatePlan({ title: "x", phases: [{ name: "a", model: "haiku", task: "t", effort: "ultra" }] }).error).toMatch(/Phase 1: Unknown effort/);
    expect(validatePlan({ title: "x", gate: "boss", phases: [{ name: "a", model: "haiku", task: "t" }] }).error).toMatch(/Unknown gate/);
    expect(validatePlan({ title: "x", phases: Array.from({ length: 9 }, () => ({ name: "a", model: "haiku", task: "t" })) }).error).toMatch(/at most 8/);
    expect((validatePlan({ title: "x", phases: [{ name: "a", model: "haiku", task: "t" }] }) as any).gate).toBe("lead");
  });

  test("briefs: phase 1 hands off to an exact path; phase 2 starts from the exact predecessor handoff", () => {
    const plan = base();
    const h1 = handoffPathFor(plan, 0, T0);
    expect(h1).toMatch(/^\/r\/handoff\/plan-pabcde-phase-01-\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    const first = buildPhasePrompt(plan, 0, { handoffPath: h1, predecessorHandoff: "" });
    expect(first).not.toMatch(/\/prime/);
    expect(first).toContain(`Write a NEW file at exactly ${h1}`);
    expect(first).toContain("/r/handoff/LATEST.md with two lines");
    expect(first).toMatch(/01 Notes \(haiku, effort low\)  <- you\n02 Apply \(sonnet\)\n03 Docs \(haiku\)/);
    expect(first).toMatch(/Acceptance check[\s\S]*PLAN-NOTES\.md has 3 ideas/);
    expect(first).toMatch(/\.gitignore does not list handoff\//);
    const second = buildPhasePrompt(plan, 1, { handoffPath: "/r/handoff/two.md", predecessorHandoff: h1 });
    expect(second.startsWith("Before anything else: run the /prime skill if it is available")).toBe(true);
    expect(second.split("\n")[1]).toBe(h1);
    expect(second).toMatch(/confirm the recovered state in one line/);
    expect(second).not.toMatch(/—/);
    expect(gateAfter(plan, 0)).toBe("auto");
    expect(gateAfter(plan, 2)).toBe("user");
  });

  test("auto chains, a lead gate asks, revise twice then blocked, missing handoff nudges once", () => {
    let plan: any = { ...base(), gate: "lead" };
    let r = stepPlan(plan, { type: "started", index: 0, threadId: "t1", handoffPath: "/h1", at: 1 });
    r = stepPlan(r.plan, { type: "finished", index: 0, hasHandoff: false });
    expect(r.actions).toEqual([{ type: "nudge", index: 0 }]);
    r = stepPlan(r.plan, { type: "finished", index: 0, hasHandoff: true });
    expect(r.actions).toEqual([{ type: "ask-lead", index: 0 }]);
    expect(r.plan.phases[0].status).toBe("awaiting-gate");
    r = stepPlan(r.plan, { type: "decision", decision: "revise", feedback: "more ideas" });
    expect(r.actions).toEqual([{ type: "revise", index: 0, feedback: "more ideas" }]);
    r = stepPlan(r.plan, { type: "finished", index: 0, hasHandoff: true });
    r = stepPlan(r.plan, { type: "decision", decision: "revise", feedback: "again" });
    expect(r.plan.phases[0].revisions).toBe(2);
    r = stepPlan(r.plan, { type: "finished", index: 0, hasHandoff: true });
    r = stepPlan(r.plan, { type: "decision", decision: "revise", feedback: "third" });
    expect(r.actions[0]).toMatchObject({ type: "blocked", index: 0 });
    expect(r.plan.status).toBe("blocked");
    r = stepPlan(r.plan, { type: "retry", index: 0 });
    expect(r.actions).toEqual([{ type: "start", index: 0 }]);
    expect(r.plan.phases[0]).toMatchObject({ status: "queued", revisions: 0 });

    plan = base();
    r = stepPlan(plan, { type: "started", index: 0, threadId: "t1", handoffPath: "/h1", at: 1 });
    r = stepPlan(r.plan, { type: "finished", index: 0, hasHandoff: true });
    expect(r.actions).toEqual([{ type: "start", index: 1 }]); // phase 1 stays until phase 2 has output
    r = stepPlan(r.plan, { type: "started", index: 1, threadId: "t2", handoffPath: "/h2", at: 2 });
    r = stepPlan(r.plan, { type: "finished", index: 1, hasHandoff: true });
    expect(r.actions).toEqual([{ type: "retire", index: 0, reason: "its successor is under way" }, { type: "start", index: 2 }]);
    r = stepPlan(r.plan, { type: "started", index: 2, threadId: "t3", handoffPath: "/h3", at: 3 });
    r = stepPlan(r.plan, { type: "finished", index: 2, hasHandoff: true });
    expect(r.actions).toEqual([{ type: "ask-user", index: 2 }]); // the last phase's own gate is user
    r = stepPlan(r.plan, { type: "next" });
    expect(r.actions).toEqual([
      { type: "retire", index: 1, reason: "its successor is under way" },
      { type: "retire", index: 2, reason: "the plan is done" },
      { type: "done" },
    ]);
    expect(r.plan.status).toBe("done");
    expect(stepPlan(r.plan, { type: "next" }).actions[0].type).toBe("ignored");
    expect(stepPlan(base(), { type: "finished", index: 1, hasHandoff: true }).actions[0].type).toBe("ignored");
    expect(stepPlan(base(), { type: "stop" }).plan.status).toBe("stopped");
  });
});

describe("threads: plans end to end (stubbed engine)", () => {
  function phaseThreads(w: World) {
    return registry(w).threads.filter((t: any) => t.planId);
  }
  function finishSession(w: World, t: any, answer: string, writeHandoff = true) {
    setSession(w, t.sessionId, { status: "idle" });
    w.fs.set(transcriptPath(t.cwd, t.sessionId), [userRow("go"), JSON.stringify({ type: "assistant", uuid: `a-${t.id}-${w.now}`, message: { model: "claude-haiku-4-5-20251001", content: [{ type: "text", text: answer }] } })].join("\n"));
    if (writeHandoff) w.fs.set(t.handoffPath, "# handoff\n");
  }

  test("auto gate: phase 1 runs, hands off, phase 2 starts from the exact handoff", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Demo", gate: "auto", phases: PHASES } as any);
    expect(r.result).toMatch(/^Plan Demo \(p[0-9a-f]{5}\) started: 2 phases, one at a time, session threads, gate auto\. Handoffs go to \/work\/app\/handoff\./);
    expect(r.result).toMatch(/Phase 01 Notes started as t[0-9a-f]+ on haiku\/low/);
    expect(w.runs.some((a) => a[0] === "mkdir" && a[2] === "/work/app/handoff")).toBe(true);
    const [p1] = phaseThreads(w);
    expect(p1.title).toBe("Thread | Demo | 01 Notes");
    expect(p1).toMatchObject({ phaseIndex: 0, predecessorId: "", gate: "auto", acceptance: "PLAN-NOTES.md has 3 ideas", effort: "low" });
    expect(p1.handoffPath).toMatch(new RegExp(`^/work/app/handoff/plan-${p1.planId}-phase-01-.*\\.md$`));
    const argv1 = spawns(w)[0];
    expect(argv1[argv1.indexOf("--effort") + 1]).toBe("low");
    expect(argv1[argv1.length - 7]).toContain(`Write a NEW file at exactly ${p1.handoffPath}`);
    expect(spawns(w)).toHaveLength(1); // strictly one at a time

    await threads($, "refresh");
    finishSession(w, p1, "Wrote PLAN-NOTES.md with 3 ideas.");
    w.now += 5000;
    await threads($, "refresh");
    const all = phaseThreads(w);
    expect(all).toHaveLength(2);
    const p2 = all[1];
    expect(p2).toMatchObject({ title: "Thread | Demo | 02 Apply", phaseIndex: 1, predecessorId: p1.id });
    expect(registry(w).threads.find((t: any) => t.id === p1.id).successorId).toBe(p2.id);
    const task2 = spawns(w)[1][spawns(w)[1].length - 7];
    expect(task2.split("\n")[1]).toBe(p1.handoffPath);
    expect(task2).toMatch(/^Before anything else: run the \/prime skill/);
    // the predecessor stays alive (idle) for questions until phase 2 has produced output
    expect(w.tmux.has(p1.tmux)).toBe(true);
    await threads($, "refresh");
    expect(w.tmux.has(p1.tmux)).toBe(true);
    w.fs.set(transcriptPath(p2.cwd, p2.sessionId), [userRow("go"), JSON.stringify({ type: "assistant", message: { model: "claude-sonnet-5-5", content: [{ type: "tool_use", name: "Read", input: { file_path: p1.handoffPath } }] } })].join("\n"));
    await threads($, "refresh");
    expect(w.tmux.has(p1.tmux)).toBe(false);
    expect(registry(w).threads.find((t: any) => t.id === p1.id)).toMatchObject({ status: "closed", closedBy: "plan" });
    // phase 2 finishes: the plan is done and offers to close
    await threads($, "refresh");
    finishSession(w, p2, "Applied idea 2 to README.md.");
    w.now += 5000;
    await threads($, "refresh");
    const plan = registry(w).plans[0];
    expect(plan.status).toBe("done");
    expect(plan.phases.map((x: any) => x.status)).toEqual(["done", "done"]);
    expect(w.toasts.some((x) => /Plan Demo done/.test(x))).toBe(true);
    expect(await threads($, "plan status")).toMatch(/Plan Demo \(p[0-9a-f]+\) · done/);
    // accepted phases closed themselves: transcripts and resume commands stay
    expect(w.tmux.size).toBe(0);
    expect(phaseThreads(w).map((t: any) => [t.status, t.closedBy])).toEqual([["closed", "plan"], ["closed", "plan"]]);
    const closedEvents = events(w).filter((e: any) => e.type === "auto-closed");
    expect(closedEvents.map((e: any) => e.id)).toEqual([p1.id, p2.id]);
    expect(closedEvents[0].resume).toBe(`cd '/work/app' && claude --resume ${p1.sessionId}`);
    expect(await threads($, "plan close")).toMatch(/has no open threads/);
  });

  test("lead gate (inline): asks the lead with a note and a wake, revise reaches the same thread, approve starts phase 2", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Demo", gate: "lead", phases: PHASES } as any);
    expect(r.result).toMatch(/inline threads, gate lead/);
    const planId = registry(w).plans[0].id;
    const [p1] = phaseThreads(w);
    expect(p1.backend).toBe("inline");
    w.fs.set(p1.handoffPath, "# handoff");
    await finish($, w, "agent-1", "Three ideas written.");
    const note = events(w).find((e: any) => e.type === "plan-note");
    expect(note).toMatchObject({ planId, wake: true });
    expect(note.text).toMatch(/^<plan gate: Demo \(p[0-9a-f]+\), phase 01 Notes finished>/);
    expect(w.afters).toContain(0);
    expect(registry(w).plans[0].phases[0].status).toBe("awaiting-gate");

    const rev: any = await $.tool.call({ tool: "mcp__threads__threads_plan_advance", planId, decision: "revise", feedback: "make idea 3 concrete" } as any);
    expect(rev.result).toMatch(/Sent to Demo \| 01 Notes/);
    const last = w.sent[w.sent.length - 1];
    expect(last.to).toBe("agent-1");
    expect(last.text).toMatch(/^The lead asks for a revision of your phase: make idea 3 concrete/);
    const newHandoff = registry(w).threads.find((t: any) => t.id === p1.id).handoffPath;
    expect(last.text).toContain(`write a NEW handoff file at exactly ${newHandoff}`);
    w.fs.set(newHandoff, "# handoff v2");
    w.agentList[0].status = "running";
    await finish($, w, "agent-1", "Revised.");
    const ok: any = await $.tool.call({ tool: "mcp__threads__threads_plan_advance", planId, decision: "approve" } as any);
    expect(ok.result).toMatch(/Phase 02 Apply started/);
    expect(w.spawned).toHaveLength(2);
    expect(w.spawned[1].prompt).toContain(newHandoff);
    const bad: any = await $.tool.call({ tool: "mcp__threads__threads_plan_advance", planId, decision: "approve" } as any);
    expect(bad.result).toMatch(/not awaiting a gate/);
    expect((await $.tool.call({ tool: "mcp__threads__threads_plan_advance", planId: "pnope", decision: "approve" } as any) as any).deny).toMatch(/No plan pnope/);
  });

  test("user gate waits for /threads plan next; the band says so; missing handoffs nudge; the cap queues", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Demo", gate: "user", phases: PHASES } as any);
    const [p1] = phaseThreads(w);
    await threads($, "refresh");
    finishSession(w, p1, "Done without handoff.", false);
    w.now += 5000;
    await threads($, "refresh");
    expect(w.sent.at(-1)?.text).toMatch(/You finished without writing the handoff file\. Write it now at exactly/);
    setSession(w, p1.sessionId, { status: "busy" });
    await threads($, "refresh");
    finishSession(w, p1, "Now with handoff.");
    w.now += 5000;
    await threads($, "refresh");
    expect(registry(w).plans[0].phases[0].status).toBe("awaiting-gate");
    const band = await $.ui.mount({ plugin: "threads", surface: "terminal", component: "AbovePrompt", props: BAND } as any);
    expect(await band.find({ type: "Text", text: /plan Demo: phase 02 ready · \/threads plan next/ })).toBeDefined();
    await band.unmount();
    await threads($, "cap 1");
    expect(await threads($, "plan next")).toMatch(/Phase 02 waits: 1 threads are live and the cap is 1/);
    expect(phaseThreads(w)).toHaveLength(1);
    await threads($, "cap 4");
    await threads($, "refresh"); // the watcher starts the queued phase once a slot is free
    expect(phaseThreads(w)).toHaveLength(2);
  });

  for (const surface of ["terminal", "desktop"] as const) {
    test(`pane plan view lists phases, models, status and handoffs on ${surface}`, async ($, on) => {
      const w = fresh();
      await boot($, on, w);
      await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Demo", gate: "auto", phases: PHASES } as any);
      const [p1] = phaseThreads(w);
      await threads($, "");
      const ui = await $.ui.mount({ plugin: "threads", surface, component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
      await ui.press({ key: "plan-view" });
      expect(await ui.find({ type: "Text", text: /^Plan Demo \(p[0-9a-f]+\) · running · gate auto$/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /^01 working/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: "haiku/low" })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /^02 queued/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: /handoff .*plan-p[0-9a-f]+-phase-01-/ })).toBeDefined();
      expect(await ui.find({ type: "Text", text: `threads ${p1.id} → ·` })).toBeDefined();
      await ui.press({ key: "plan-view" });
      expect(await ui.find({ type: "Text", text: /model  asked haiku · running .* · effort low/ })).toBeDefined();
      await ui.unmount();
    });
  }
});

describe("threads: registry lock", () => {
  test("a lock another chat holds is waited on, then the write goes ahead without removing that lock", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    w.fs.set(`dir:${REG}.lock`, "");
    const before = w.runs.length;
    expect(await threads($, "cap 2")).toBe("Cap set to 2 live threads.");
    expect(registry(w).cap).toBe(2);
    const tries = w.runs.slice(before).filter((a) => a[0] === "mkdir" && a[1] === `${REG}.lock`).length;
    expect(tries).toBeGreaterThanOrEqual(40);
    expect(w.fs.has(`dir:${REG}.lock`)).toBe(true);
  });
});

describe("threads: plan cleanup, cap and stale wakes", () => {
  function phaseThreads(w: World) {
    return registry(w).threads.filter((t: any) => t.planId);
  }
  function finishSession(w: World, t: any, answer: string) {
    setSession(w, t.sessionId, { status: "idle" });
    w.fs.set(transcriptPath(t.cwd, t.sessionId), [userRow("go"), JSON.stringify({ type: "assistant", uuid: `a-${t.id}-${w.now}`, message: { model: "claude-haiku-4-5-20251001", content: [{ type: "text", text: answer }] } })].join("\n"));
    w.fs.set(t.handoffPath, "# handoff\n");
  }

  test("keep_threads keeps every phase thread open", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Keep", gate: "auto", keep_threads: true, phases: [...PHASES, { name: "Third", model: "haiku", task: "z" }] } as any);
    for (let k = 0; k < 3; k++) {
      const t = phaseThreads(w)[k];
      await threads($, "refresh");
      finishSession(w, t, `phase ${k + 1} done`);
      w.now += 5000;
      await threads($, "refresh");
    }
    expect(registry(w).plans[0].status).toBe("done");
    expect(phaseThreads(w).map((t: any) => t.status)).toEqual(["idle", "idle", "idle"]);
    expect(events(w).filter((e: any) => e.type === "auto-closed")).toHaveLength(0);
  });

  test("the cap ignores closed and exited threads and other chats' threads whose lead is gone", async ($, on) => {
    const w = fresh();
    const base = { requestedModel: "haiku", verifiedModel: "", cwd: APP, permissionMode: "default", task: "t", createdAt: T0, lastReport: null, closedAt: 0, backend: "session" };
    w.fs.set(`${CFG}/sessions/4100.json`, JSON.stringify({ pid: 4100, sessionId: OTHER_LEAD, cwd: "/x", name: "Other lead", status: "busy" }));
    w.alive.add(4100);
    const mk = (id: string, status: string, parent: string) => {
      if (status !== "closed" && status !== "exited") w.tmux.set(`thread-${id}`, { dead: false, pid: 6000 + w.tmux.size, screen: "" });
      return { ...base, id, title: `Thread | ${id}`, sessionId: `${id}0000-0000-4000-8000-000000000000`, tmux: `thread-${id}`, status, parent: { sessionId: parent, title: "x" } };
    };
    w.fs.set(REG, JSON.stringify({ version: 1, cap: 2, threads: [
      mk("tclos1", "closed", LEAD),
      mk("texit1", "exited", LEAD),
      mk("torph1", "idle", "deadbeef-0000-4000-8000-000000000000"),
      mk("tother", "working", OTHER_LEAD),
    ] }));
    await boot($, on, w);
    expect(await threads($, "new haiku One -- a")).toMatch(/^Created/); // 1 live of ours + 1 other chat's = 2 after this
    expect(await threads($, "new haiku Two -- b")).toMatch(/2 threads are already live and the cap is 2/);
  });

  test("a lead-gate wake is dropped when the gate was decided before it could fire", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    await $.turn.start({ text: "busy lead", turnId: "lead-1" } as any); // the lead is mid-turn
    await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Demo", gate: "lead", phases: PHASES } as any);
    const planId = registry(w).plans[0].id;
    w.fs.set(phaseThreads(w)[0].handoffPath, "# handoff");
    await finish($, w, "agent-1", "Ideas written.");
    expect(registry(w).plans[0].phases[0].status).toBe("awaiting-gate");
    const wakeText = events(w).find((e: any) => e.type === "plan-note")!;
    expect(wakeText.wake).toBe(true);
    // the lead approves in the same busy turn
    const ok: any = await $.tool.call({ tool: "mcp__threads__threads_plan_advance", planId, decision: "approve" } as any);
    expect(ok.result).toMatch(/Phase 02 Apply started/);
    // the lead's turn ends: the queued wake is checked and dropped, nothing is submitted
    await $.turn.complete({ answer: "approved", durationMs: 1, isAborted: false, turnId: "lead-1", reason: "answer" } as any);
    await threads($, "refresh"); // a watcher pass also checks pending wakes (deferred out of the command)
    expect(w.submitted).toEqual([]);
    // and a stale wake that does reach prompt.submit is dropped there too
    const stale = `Plan Demo (${planId}): phase 01 Notes is ready for your review. If phase 01 of plan ${planId} was already approved or revised, ignore this.`;
    const dropped: any = await $.prompt.submit({ text: stale, origin: { kind: "plugin", name: "threads" } } as any);
    expect(dropped.drop).toMatch(/phase 01 of plan p[0-9a-f]+ was already decided/);
    expect(w.submitted).toEqual([]);
  });

  test("an open gate wake waits for the lead to be idle, then is submitted once with self-checking words", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    await $.turn.start({ text: "busy lead", turnId: "lead-1" } as any);
    await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Demo", gate: "lead", phases: PHASES } as any);
    const planId = registry(w).plans[0].id;
    w.fs.set(phaseThreads(w)[0].handoffPath, "# handoff");
    await finish($, w, "agent-1", "Ideas written.");
    expect(w.submitted).toEqual([]); // busy: nothing yet
    expect(events(w).some((e: any) => e.type === "wake-sent")).toBe(false);
    // still open: the self-checking wake passes the entry check
    const open = `Plan Demo (${planId}): phase 01 Notes is ready for your review. If phase 01 of plan ${planId} was already approved or revised, ignore this.`;
    const passed: any = await $.prompt.submit({ text: open, origin: { kind: "plugin", name: "threads" } } as any);
    expect(passed.drop).toBeUndefined();
    expect(w.submitted).toEqual([open]);
  });
});

describe("threads: permission modes", () => {
  test("explicit modes override the default; acceptEdits gets no bypass-warning setting", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Careful --mode acceptEdits -- x");
    await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "Planner", task: "y", permission_mode: "plan" } as any);
    await threads($, "new haiku Asker --mode default -- z");
    const [a, b, c] = spawns(w);
    expect(a[a.indexOf("--permission-mode") + 1]).toBe("acceptEdits");
    expect(JSON.parse(a[a.indexOf("--settings") + 1])).toEqual({ crossSessionInbound: "accept" });
    expect(b[b.indexOf("--permission-mode") + 1]).toBe("plan");
    expect(c).not.toContain("--permission-mode"); // default is the CLI's own default
    expect(created(w, "Asker").permissionMode).toBe("default");
    expect(await threads($, "list")).toMatch(/Careful +· +session, acceptEdits/);
  });

  test("/threads mode changes the default and persists it", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    expect(await threads($, "mode")).toMatch(/run in bypassPermissions mode unless one says otherwise/);
    expect(await threads($, "mode turbo")).toMatch(/Unknown permission mode "turbo"/);
    expect(await threads($, "mode acceptEdits")).toMatch(/now run in acceptEdits mode by default/);
    expect(w.store.defaultMode).toBe("acceptEdits");
    await threads($, "new haiku After -- x");
    const argv = spawns(w)[0];
    expect(argv[argv.indexOf("--permission-mode") + 1]).toBe("acceptEdits");
    expect(await threads($, "mode bypass")).toMatch(/now run in bypassPermissions mode/);
    expect(events(w).filter((e: any) => e.type === "default-mode-set").map((e: any) => e.mode)).toEqual(["acceptEdits", "bypassPermissions"]);
  });

  test("the defaultPermissionMode setting is the default when /threads mode was never used", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Default -- x");
    expect(spawns(w)[0][spawns(w)[0].indexOf("--permission-mode") + 1]).toBe("bypassPermissions");
  });

  test("plan phases default to bypass; a phase's permission_mode overrides", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Modes", gate: "auto", phases: [{ name: "A", model: "haiku", task: "x" }, { name: "B", model: "haiku", task: "y", permission_mode: "acceptEdits" }] } as any);
    const argv = spawns(w)[0];
    expect(argv[argv.indexOf("--permission-mode") + 1]).toBe("bypassPermissions");
    expect(registry(w).plans[0].phases[1].permissionMode).toBe("acceptEdits");
  });

  test("the bypass warning screen reads as needs-you with a clear label", () => {
    const screen = readScreen(["WARNING: Claude Code running in Bypass Permissions mode", "By proceeding, you accept all responsibility for actions taken while running in Bypass Permissions mode.", "❯ 1. No, exit", "  2. Yes, I accept"].join("\n"));
    expect(screen.bypassWarning).toBe(true);
    expect(screen.needsYou).toBe(true);
    expect(screen.prompt).toMatch(/bypass permissions warning/);
    expect(statusOf({ previous: "starting", tmux: { isLive: true, isDead: false }, session: null, pidAlive: undefined, screen, now: T0, createdAt: T0 })).toBe("needs-you");
  });
});

describe("threads: the defaultPermissionMode setting", () => {
  test("a configured default applies to new session threads", { options: { defaultPermissionMode: "acceptEdits" } } as any, async ($: any, on: any) => {
    const w = fresh();
    await boot($, on, w);
    expect(await threads($, "mode")).toMatch(/run in acceptEdits mode/);
    await threads($, "new haiku Configured -- x");
    expect(spawns(w)[0][spawns(w)[0].indexOf("--permission-mode") + 1]).toBe("acceptEdits");
  });
});

describe("threads: plan close confirmation", () => {
  test("all_of_plan closes a plan's threads: dialog, else ask in chat, confirmed closes at once; /threads plan close is direct", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Keep", gate: "user", keep_threads: true, phases: PHASES } as any);
    const planId = registry(w).plans[0].id;
    const none: any = await $.tool.call({ tool: "mcp__threads__threads_close", all_of_plan: planId } as any);
    expect(none.result).toMatch(/still running\. No confirmation dialog could be shown here.*all_of_plan: "p[0-9a-f]+" and confirmed: true/);
    const yes: any = await $.tool.call({ tool: "mcp__threads__threads_close", all_of_plan: planId, confirmed: true } as any);
    expect(yes.result).toMatch(/^Closed 1 thread of plan Keep/);
    expect(await threads($, "plan close")).toMatch(/has no open threads/);
  });
});

describe("threads: pane buttons", () => {
  for (const surface of ["terminal", "desktop"] as const) {
    test(`every action is a button, with a hint line, on ${surface}`, async ($, on) => {
      const w = fresh();
      await boot($, on, w);
      await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Demo", gate: "auto", phases: PHASES } as any);
      const t = registry(w).threads[0];
      await threads($, "");
      const ui = await $.ui.mount({ plugin: "threads", surface, component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
      if (surface === "terminal") expect(await ui.find({ type: "Text", text: /^Click a thread or any button\. Keys: ctrl\+x then tab gives the pane the keyboard/ })).toBeDefined();
      else {
        expect(await ui.find({ type: "Text", text: /^Click a thread or any button\. You can also ask in the chat/ })).toBeDefined();
        expect(await ui.find({ type: "Text", text: /ctrl\+x/ })).toBeUndefined(); // no terminal advice on desktop
      }
      for (const key of [`sel:${t.id}`, "view", "steer", "interrupt", "model", "effort", "open", "pin", "archive", "close-thread", "refresh", "plan-view", "close-pane"]) {
        const b = await ui.find({ key });
        expect(b?.type).toBe("Button");
      }
      // model and effort open clickable choices in the pane (no dialog needed)
      await ui.press({ key: "effort" });
      expect(await ui.find({ key: "pick:effort:high" })).toBeDefined();
      expect(await ui.find({ key: "pick:effort:low", text: /low ✓/ })).toBeDefined();
      setSession(w, t.sessionId, { status: "idle" });
      await threads($, "refresh");
      await ui.press({ key: "pick:effort:high" });
      expect(sendKeys(w)).toEqual([["send-keys", "-t", t.tmux, "-l", "/effort high"], ["send-keys", "-t", t.tmux, "C-m"]]);
      await ui.press({ key: "model" });
      await ui.press({ key: "pick:model:sonnet" });
      expect(sendKeys(w).at(-2)).toEqual(["send-keys", "-t", t.tmux, "-l", "/model sonnet"]);
      // the steer field is one click away
      await ui.press({ key: "steer" });
      expect((await ui.find({ key: "steer-input" }))?.type).toBe("Input");
      await ui.unmount();
    });
  }
});

describe("threads: setup", () => {
  test("a checklist with exact fixes; clean closes stale threads; passing is remembered", async ($, on) => {
    const w = fresh({ loggedIn: false });
    w.fs.set(REG, JSON.stringify({ version: 1, cap: 4, threads: [
      { id: "tgone1", title: "Thread | Gone", requestedModel: "haiku", verifiedModel: "", sessionId: "gone0000-0000-4000-8000-000000000000", tmux: "thread-tgone1", cwd: APP, permissionMode: "bypassPermissions", task: "t", createdAt: T0, status: "idle", lastReport: null, closedAt: 0, backend: "session", parent: { sessionId: LEAD, title: "Lead chat" } },
    ] }));
    await boot($, on, w);
    const out = await threads($, "setup");
    expect(out).toMatch(/^Threads setup\n✗ Terminal login: not logged in/);
    expect(out).toMatch(/Do: Run in Terminal: claude auth login\./);
    expect(out).toMatch(/✗ tmux: not found\n    Do: Run in Terminal: brew install tmux/);
    expect(out).toMatch(/✓ Folder trust: \/work\/app is trusted/);
    expect(out).toMatch(/✓ Thread slots: 0 of 4 in use\. Stale: tgone1 \(Gone, its process has ended\)\./);
    expect(out).toMatch(/✓ Default permission mode: bypassPermissions/);
    expect(out).toMatch(/✓ How the mod is loaded: /);
    expect(out).toMatch(/Session threads are not ready yet; inline threads \(--inline\) work now\./);
    expect(w.store.setupPassedAt).toBeUndefined();
    expect(await threads($, "setup clean")).toMatch(/Closed 1 stale thread: tgone1\./);
    expect(registry(w).threads[0]).toMatchObject({ status: "closed", closedBy: "setup" });
    w.loggedIn = true;
    w.tmuxVersion = "tmux 3.7b";
    const ok: any = await $.tool.call({ tool: "mcp__threads__threads_setup", cwd: "/work/untrusted" } as any);
    expect(ok.result).toMatch(/✓ Terminal login: logged in/);
    expect(ok.result).toMatch(/✓ tmux: tmux 3\.7b/);
    expect(ok.result).toMatch(/✗ Folder trust: \/work\/untrusted is not trusted.*\n    Do: Run in Terminal: cd '\/work\/untrusted' && claude/);
    expect(ok.result).toMatch(/Session threads are ready\./);
    expect(w.store.setupPassedAt).toBe(T0);
  });

  test("the first create runs setup once and adds a short summary instead of a bare refusal", async ($, on) => {
    const w = fresh({ loggedIn: false });
    await boot($, on, w);
    const out = await threads($, "new haiku Scout --session -- x");
    expect(out).toMatch(/^Not created\. Threads need the terminal Claude Code login/);
    expect(out).toMatch(/\nSetup check: ✗ Terminal login \(Run in Terminal: claude auth login/);
    expect(events(w).filter((e: any) => e.type === "setup")).toHaveLength(1);
    await threads($, "new haiku Scout2 -- x"); // auto -> inline; the summary is reused, setup does not run again
    expect(events(w).filter((e: any) => e.type === "setup")).toHaveLength(1);
  });

  test("once setup has passed, creates skip it", async ($, on) => {
    const w = fresh();
    w.store.setupPassedAt = 1;
    await boot($, on, w);
    expect(await threads($, "new haiku Scout -- x")).not.toMatch(/Setup check/);
    expect(events(w).filter((e: any) => e.type === "setup")).toHaveLength(0);
  });
});

// ---- 0.4.0: show, open, fork, cost, orphans, idle close, history, pins ----------------------

function usageRow(id: string, model: string, u: any) {
  return JSON.stringify({ type: "assistant", uuid: `u-${id}-${Math.random()}`, message: { id, model, content: [{ type: "text", text: "x" }], usage: u } });
}

describe("threads: cost", () => {
  test("prices: exact cache split, loop default, one charge per API message", () => {
    const u = { input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 10000, cache_creation_input_tokens: 2000 };
    // haiku: 1000*1 + 1000*5 + 10000*0.1 + 2000*(1*2) = 1000+5000+1000+4000 = 11000 per 1e6
    expect(Math.abs((costOfUsage(u, "claude-haiku-4-5-20251001", "main").usd) - (0.011))).toBeLessThan(1e-6);
    // a subagent writes at the 5-minute rate: 2000*1.25 = 2500 -> 9500
    expect(Math.abs((costOfUsage(u, "claude-haiku-4-5-20251001", "sub").usd) - (0.0095))).toBeLessThan(1e-6);
    // an explicit split wins: 500 at 1h (x2) + 1500 at 5m (x1.25) = 1000 + 1875
    expect(Math.abs((costOfUsage({ ...u, cache_creation: { ephemeral_1h_input_tokens: 500, ephemeral_5m_input_tokens: 1500 } }, "claude-haiku-4-5", "sub").usd) - ((1000 + 5000 + 1000 + 2875) / 1e6))).toBeLessThan(1e-8);
    const jsonl = [usageRow("m1", "claude-haiku-4-5", u), usageRow("m1", "claude-haiku-4-5", u), usageRow("m2", "claude-sonnet-5-5", { input_tokens: 1e6, output_tokens: 0 }), usageRow("m3", "<synthetic>", u)].join("\n");
    expect(Math.abs((costFromTranscript(jsonl).usd) - (0.011 + 2))).toBeLessThan(1e-6);
    expect(money(0)).toBe("$0");
    expect(money(0.0042)).toBe("$0.0042");
    expect(money(1.23456)).toBe("$1.235");
  });

  test("session thread cost from its transcript shows in the list, pane and wait output; inline cost from its steps", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- x");
    const t = created(w, "Haiku scout");
    w.dirs.set(transcriptPath(APP, t.sessionId), transcriptPath(APP, t.sessionId)); // stat sees a file below
    w.fs.set(transcriptPath(APP, t.sessionId), [usageRow("m1", "claude-haiku-4-5-20251001", { input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 10000, cache_creation_input_tokens: 2000 })].join("\n"));
    w.dirs.delete(transcriptPath(APP, t.sessionId));
    expect(await threads($, "list")).toMatch(/haiku → claude-haiku-4-5-20251001 · \$0\.011 est\./);
    expect(Math.abs((created(w, "Haiku scout").costUsd) - (0.011))).toBeLessThan(1e-5);
    expect(await threads($, "list")).toMatch(/This chat's threads: \$0\.011 est\. API-equivalent/);
    setSession(w, t.sessionId, { status: "idle" });
    const wait: any = await $.tool.call({ tool: "mcp__threads__threads_wait", ids: [t.id], timeout_s: 10 } as any);
    expect(wait.result).toMatch(/\$0\.011 est\. API-equivalent/);
    await threads($, "");
    const ui = await $.ui.mount({ plugin: "threads", surface: "desktop", component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
    expect(await ui.find({ type: "Text", text: /^cost   \$0\.011 est\. API-equivalent/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: "$0.011" })).toBeDefined();
    await ui.unmount();

    const w2 = w;
    await threads($, "new haiku Inline --inline -- y");
    await drainStep($, "agent-1"); // usage 1 in + 1 out on haiku
    await threads($, "list");
    expect(registry(w2).threads.find((x: any) => x.title === "Thread | Inline").costUsd).toBeUndefined(); // below the half-tenth-of-a-cent write threshold
  });
});

describe("threads: show and open (desktop first)", () => {
  test("threads_show opens the pane and selects a thread or the plan view", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- x");
    const t = created(w, "Haiku scout");
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_show", id: t.id } as any);
    expect(r.result).toMatch(/^Opened the Threads pane beside this chat: 1 live thread of this chat, t[0-9a-f]+ selected/);
    expect(w.panes.has("threads")).toBe(true);
    const ui = await $.ui.mount({ plugin: "threads", surface: "desktop", component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
    expect(await ui.find({ type: "Text", text: `Thread | Haiku scout  (${t.id})` })).toBeDefined();
    await ui.unmount();
    expect(((await $.tool.call({ tool: "mcp__threads__threads_show", id: "nope" } as any)) as any).result).toMatch(/No thread matches/);
  });

  test("open: the app is the primary action; desktop wording has no terminal advice", async ($, on) => {
    const w = fresh({ surface: "desktop" });
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- x");
    const t = created(w, "Haiku scout");
    setSession(w, t.sessionId, { bridgeSessionId: "session_01ABC" });
    await threads($, "list");
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_open", id: t.id } as any);
    expect(w.runs.some((a) => a[0] === "open" && a[1] === "claude://code/session_01ABC")).toBe(true);
    expect(r.result).not.toMatch(/tmux|ctrl-b/);
    expect(r.result).toMatch(/Resume after closing/);
  });

  test("the lead's surface is worked out once: a desktop entrypoint means desktop wording in tool results", async ($, on) => {
    const w = fresh();
    w.fs.set(`${CFG}/sessions/4000.json`, JSON.stringify({ pid: 4000, sessionId: LEAD, cwd: APP, name: "Lead chat", status: "busy", messagingSocketPath: LEAD_SOCK, entrypoint: "claude-desktop" }));
    await boot($, on, w); // session.start says terminal, the surface query says terminal, the entrypoint says desktop
    await threads($, "new haiku Haiku scout -- x");
    const t = created(w, "Haiku scout");
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_open", id: t.id } as any);
    expect(r.result).not.toMatch(/tmux|ctrl-b/);
    expect(r.result).toMatch(/Resume after closing: cd '\/work\/app' && claude --resume/);
  });

  test("a terminal lead keeps the live-terminal line", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Haiku scout -- x");
    const t = created(w, "Haiku scout");
    expect(((await $.tool.call({ tool: "mcp__threads__threads_open", id: t.id } as any)) as any).result).toMatch(/tmux -L cc-threads attach/);
  });
});

describe("threads: fork", () => {
  test("summary: the lead's context goes into the thread's brief; labeled as a fork", async ($, on) => {
    const w = fresh();
    w.forkText = "Goal: ship the parser. Decided: use a recursive descent parser in src/parse.ts. State: tests in test/parse.test.ts fail on nested brackets.";
    await boot($, on, w);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_fork", title: "Parser fix", task: "make the nested bracket test pass", model: "haiku" } as any);
    expect(r.result).toMatch(/Forked from this chat with a summary of this conversation\./);
    const argv = spawns(w)[0];
    const brief = argv[argv.indexOf("--append-system-prompt") + 1];
    expect(brief).toMatch(/You were forked from the lead chat "Lead chat"\. What that conversation established so far:\nGoal: ship the parser/);
    expect(argv[argv.indexOf("--append-system-prompt") + 2]).toBe("make the nested bracket test pass");
    expect(created(w, "Parser fix").forkedFrom).toMatchObject({ sessionId: LEAD, title: "Lead chat", include: "summary" });
    expect(await threads($, "list")).toMatch(/Parser fix .*· fork/);
  });

  test("summary falls back to the newest messages when no fork is possible; full writes the transcript to a file", async ($, on) => {
    const w = fresh({ forkText: null });
    w.leadMessages = [{ role: "user", text: "Fix the login bug in auth.ts", toolUses: [] }, { role: "assistant", text: "Found it in refreshToken().", toolUses: [{ tool: "Read", input: { file_path: "/work/app/auth.ts" } }] }];
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_fork", title: "Fallback", task: "t", model: "haiku" } as any);
    const brief = spawns(w)[0][spawns(w)[0].indexOf("--append-system-prompt") + 1];
    expect(brief).toMatch(/Outline of the lead conversation, oldest first:\n#1 user: Fix the login bug in auth\.ts/);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_fork", title: "Full", task: "t", model: "haiku", include: "full" } as any);
    const file = created(w, "Full").forkedFrom.file;
    expect(file).toMatch(/^\/home\/tester\/\.claude\/threads\/forks\/fork-[0-9a-f]+\.md$/);
    expect(w.fs.get(file)).toMatch(/^# Fork of "Lead chat"[\s\S]*## user\nFix the login bug[\s\S]*\[tool\] Read \/work\/app\/auth\.ts/);
    expect(spawns(w)[1][spawns(w)[1].indexOf("--append-system-prompt") + 1]).toContain(`Before your task, read ${file}`);
    expect(r.result).toContain(`the transcript in ${file}`);
    w.leadMessages = [];
    expect(((await $.tool.call({ tool: "mcp__threads__threads_fork", title: "Empty", task: "t", model: "haiku" } as any)) as any).deny).toMatch(/nothing to fork/);
  });
});

describe("threads: orphans and idle threads", () => {
  test("orphans are noticed at start and can be adopted", async ($, on) => {
    const w = fresh();
    w.tmux.set("thread-torph1", { dead: false, pid: 7001, screen: "" });
    w.fs.set(REG, JSON.stringify({ version: 1, cap: 4, threads: [
      { id: "torph1", title: "Thread | Orphan", requestedModel: "haiku", verifiedModel: "", sessionId: "orph0000-0000-4000-8000-000000000000", tmux: "thread-torph1", cwd: APP, permissionMode: "bypassPermissions", task: "t", createdAt: T0, status: "idle", lastReport: null, closedAt: 0, backend: "session", parent: { sessionId: "deadbeef-0000-4000-8000-000000000000", title: "Gone" } },
    ] }));
    await boot($, on, w);
    expect(w.toasts.some((x) => /1 thread has lost its lead chat/.test(x))).toBe(true);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_adopt", all: true } as any);
    expect(r.result).toMatch(/This chat is now the lead of torph1 \(Orphan\)/);
    expect(registry(w).threads[0].parent).toMatchObject({ sessionId: LEAD, title: "Lead chat" });
    expect(((await $.tool.call({ tool: "mcp__threads__threads_adopt", all: true } as any)) as any).result).toMatch(/No orphaned threads/);
    expect(await threads($, "list")).toMatch(/Threads of this chat \(1\)/);
  });

  test("finished, idle threads quiet past idleCloseMinutes close; working and pinned ones never do", { options: { idleCloseMinutes: 30 } } as any, async ($: any, on: any) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Done -- a");
    await threads($, "new haiku Busy -- b");
    await threads($, "new haiku Kept -- c");
    const [done, busy, kept] = [created(w, "Done"), created(w, "Busy"), created(w, "Kept")];
    for (const t of [done, kept]) {
      setSession(w, t.sessionId, { status: "idle", statusUpdatedAt: T0 });
      w.fs.set(transcriptPath(APP, t.sessionId), [userRow("go"), assistant("finished")].join("\n"));
    }
    await threads($, "pin kept");
    await threads($, "refresh"); // the watcher reports them
    w.now += 31 * 60000;
    await threads($, "refresh");
    expect(created(w, "Done")).toMatchObject({ status: "closed", closedBy: "idle" });
    expect(created(w, "Busy").status).not.toBe("closed");
    expect(created(w, "Kept").status).not.toBe("closed");
    expect(events(w).filter((e: any) => e.type === "idle-closed").map((e: any) => e.id)).toEqual([done.id]);
  });
});

describe("threads: plan history", () => {
  test("each plan's record is saved as JSON and Markdown and can be listed and shown", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_plan", title: "Hist", gate: "auto", phases: PHASES } as any);
    const planId = registry(w).plans[0].id;
    const json = JSON.parse(w.fs.get(`${CFG}/threads/plans/${planId}.json`)!);
    expect(json).toMatchObject({ id: planId, title: "Hist", status: "running", gate: "auto" });
    expect(json.phases[0]).toMatchObject({ number: 1, name: "Notes", model: "haiku", effort: "low", permissionMode: "bypassPermissions", status: "working" });
    expect(json.history[0]).toMatchObject({ event: "started", phase: 1 });
    const md = w.fs.get(`${CFG}/threads/plans/${planId}.md`)!;
    expect(md).toMatch(/^# Plan Hist \(p[0-9a-f]+\)\n\nStatus: running · gate auto/);
    expect(md).toMatch(/\| 01 \| Notes \| haiku \| low \| bypassPermissions \| working \|/);
    const list: any = await $.tool.call({ tool: "mcp__threads__threads_plan_history" } as any);
    expect(list.result).toMatch(new RegExp(`Saved plans \\(1\\)[\\s\\S]*${planId}  Hist · running · 2 phases \\(Notes:haiku, Apply:sonnet\\)`));
    const one: any = await $.tool.call({ tool: "mcp__threads__threads_plan_history", planId } as any);
    expect(one.result).toMatch(/## Phases[\s\S]*## Handoffs[\s\S]*## Events/);
  });

  test("the record's markdown lists decisions with feedback", () => {
    const md = planRecordMarkdown({ id: "p1", title: "T", cwd: "/r", gate: "lead", backend: "session", lead: { title: "L", sessionId: "s" }, status: "done", createdAt: 1, durationMs: 120000, costUsd: 0.5, phases: [], history: [{ at: 2, event: "decision", phase: 1, decision: "revise", feedback: "more tests", then: ["revise"] }] } as any);
    expect(md).toMatch(/phase 01 decision revise \("more tests"\) -> revise/);
    expect(md).toMatch(/est\. API-equivalent \$0\.500/);
  });
});

describe("threads: pins and archive", () => {
  test("archive hides from the list and pane; pins survive clean and sort first", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Alpha -- a");
    await threads($, "new haiku Beta -- b");
    const a = created(w, "Alpha");
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_archive", id: a.id } as any);
    expect(r.result).toMatch(/^Archived Alpha .* hidden from the pane and threads_list/);
    const list: any = await $.tool.call({ tool: "mcp__threads__threads_list" } as any);
    expect(list.result).not.toMatch(/Alpha/);
    expect(list.result).toMatch(/\(1 archived thread hidden/);
    expect(((await $.tool.call({ tool: "mcp__threads__threads_list", include_archived: true } as any)) as any).result).toMatch(/Alpha .*· archived/);
    await threads($, "");
    const ui = await $.ui.mount({ plugin: "threads", surface: "desktop", component: "Pane", requestId: "threads", props: PANE_PROPS } as any);
    expect(await ui.find({ key: `sel:${a.id}` })).toBeUndefined();
    await ui.press({ key: "archived" });
    expect(await ui.find({ key: `sel:${a.id}`, text: /Alpha \(archived\)/ })).toBeDefined();
    await ui.unmount();
    expect(await threads($, `unarchive ${a.id}`)).toMatch(/^Unarchived Alpha/);
    expect(((await $.tool.call({ tool: "mcp__threads__threads_pin", id: "beta" } as any)) as any).result).toMatch(/^Pinned Beta .* never cleaned up/);
    expect(await threads($, "list")).toMatch(/Beta .*· pinned/);
    // clean skips a pinned thread even when it is old and closed
    const b = created(w, "Beta");
    await threads($, `close ${b.id}`);
    w.now += 8 * 864e5;
    await threads($, `close ${a.id}`);
    w.now += 8 * 864e5;
    expect(await threads($, "clean")).toMatch(new RegExp(`Removed 1 old thread .*${a.id}`));
    expect(registry(w).threads.map((x: any) => x.id)).toEqual([b.id]);
  });
});

describe("threads: fork covers the whole conversation", () => {
  const long = () => {
    const rows: any[] = [{ role: "user", text: "Build the threads mod for Claude Code", toolUses: [] }];
    rows.push({ role: "assistant", text: "Milestone: the five-phase plan Quote CLI finished: SPEC.md, quote.js, test.js all green, README written. Plan p567e3 done.", toolUses: [] });
    for (let i = 0; i < 300; i++) {
      rows.push({ role: "user", text: `small follow-up number ${i} about pane spacing`, toolUses: [] });
      rows.push({ role: "assistant", text: `ok ${i}`, toolUses: [] });
    }
    rows.push({ role: "user", text: "Now fork this into a thread that writes the README", toolUses: [] });
    return rows;
  };

  test("the outline keeps an early milestone in a long chat, oldest first, within its budget", () => {
    const outline = conversationOutline(long(), 9000);
    expect(outline.length).toBeLessThanOrEqual(9100);
    expect(outline).toMatch(/^#1 user: Build the threads mod/);
    expect(outline).toMatch(/#2 assistant: Milestone: the five-phase plan Quote CLI finished/);
    expect(outline).toMatch(/user: Now fork this into a thread that writes the README\n\(\d+ other turns left out of this outline\)$/);
  });

  test("the fork request asks for a chronological milestone section and carries the outline", async ($, on) => {
    const w = fresh();
    w.forkText = "Goal: ...\nMilestones so far (chronological): 1. Quote CLI plan finished ...";
    w.leadMessages = long();
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_fork", title: "Docs", task: "write the README", model: "haiku" } as any);
    const prompt = w.forkPrompts[0];
    expect(prompt).toMatch(/Summarize this WHOLE conversation, from its very first message/);
    expect(prompt).toMatch(/Milestones so far \(chronological, from the start, one line each\)/);
    expect(prompt).toMatch(/five-phase plan Quote CLI finished/);
    // with no fork available, the outline itself is the context
    w.forkText = null;
    await $.tool.call({ tool: "mcp__threads__threads_fork", title: "Docs2", task: "write the README", model: "haiku" } as any);
    const brief = spawns(w)[1][spawns(w)[1].indexOf("--append-system-prompt") + 1];
    expect(brief).toMatch(/five-phase plan Quote CLI finished/);
  });
});

describe("threads: plan history backfill", () => {
  test("plans from before history get a record marked backfilled, at start and in setup", async ($, on) => {
    const w = fresh();
    w.fs.set(REG, JSON.stringify({ version: 1, cap: 4, threads: [
      { id: "tq0001", title: "Thread | Quote CLI | 01 Architect", requestedModel: "opus", verifiedModel: "claude-opus-5-5", sessionId: "q0000000-0000-4000-8000-000000000000", tmux: "thread-tq0001", cwd: APP, permissionMode: "acceptEdits", task: "t", createdAt: T0, status: "closed", lastReport: null, closedAt: T0, backend: "session", parent: { sessionId: OTHER_LEAD, title: "Mods access" }, costUsd: 0.42 },
    ], plans: [
      { id: "p567e3", title: "Quote CLI", cwd: APP, gate: "auto", handoffDir: `${APP}/handoff`, backend: "session", createdAt: T0 - 3600000, lead: { sessionId: OTHER_LEAD, title: "Mods access" }, status: "done", current: 4,
        phases: [{ name: "Architect", model: "opus", effort: "high", task: "t", acceptance: "", status: "done", threadId: "tq0001", handoffPath: `${APP}/handoff/plan-p567e3-phase-01.md`, revisions: 0, nudges: 0, startedAt: T0 - 3600000, endedAt: T0 - 3000000, note: "" }] },
    ] }));
    await boot($, on, w);
    const json = JSON.parse(w.fs.get(`${CFG}/threads/plans/p567e3.json`)!);
    expect(json).toMatchObject({ id: "p567e3", title: "Quote CLI", status: "done", backfilled: true });
    expect(json.phases[0]).toMatchObject({ name: "Architect", verifiedModel: "claude-opus-5-5", effort: "high", permissionMode: "acceptEdits", costUsd: 0.42, durationMs: 600000, handoffPath: `${APP}/handoff/plan-p567e3-phase-01.md` });
    expect(w.fs.get(`${CFG}/threads/plans/p567e3.md`)).toMatch(/Backfilled from the registry: this plan ran before history was kept/);
    expect(events(w).find((e: any) => e.type === "plan-history-backfilled")).toMatchObject({ count: 1 });
    w.fs.delete(`${CFG}/threads/plans/p567e3.json`);
    expect(await threads($, "setup")).toMatch(/✓ Plan history: wrote records for 1 older plan \(backfilled\)/);
    expect(((await $.tool.call({ tool: "mcp__threads__threads_plan_history" } as any)) as any).result).toMatch(/p567e3  Quote CLI · done · 1 phases/);
  });
});

// ---- worktrees, rename, unread, handoff ---------------------------------------------------

// a repo at APP: HEAD abc123, and per-worktree status and commit counts the test sets
function gitRepo(w: World, state: { porcelain?: string; commits?: string } = {}) {
  const calls: string[][] = [];
  w.git = (args) => {
    calls.push(args);
    const sub = args.slice(2);
    if (sub[0] === "rev-parse" && sub[1] === "--show-toplevel") return { stdout: `${APP}\n` };
    if (sub[0] === "rev-parse" && sub[1] === "HEAD") return { stdout: "abc123\n" };
    if (sub[0] === "status") return { stdout: state.porcelain ?? "" };
    if (sub[0] === "rev-list") return { stdout: `${state.commits ?? "0"}\n` };
    if (sub[0] === "worktree" || sub[0] === "branch") return { stdout: "" };
    return undefined;
  };
  return calls;
}

describe("threads: worktrees", () => {
  test("pure: --worktree parses, the spawn passes it, outcomes pick remove or keep", () => {
    expect((parseNew("haiku Scout --worktree -- list") as any).worktree).toBe(true);
    const argv = buildSpawnArgv({ name: "thread-t1", cwd: APP, model: "haiku", sessionId: "s", title: "Thread | S", permissionMode: "default", brief: "b", task: "t", worktree: "threads-t1" } as any);
    expect(argv[argv.indexOf("--worktree") + 1]).toBe("threads-t1");
    expect(worktreeOutcome({ statusOk: true, porcelain: "", commits: 0 })).toMatchObject({ remove: true });
    expect(worktreeOutcome({ statusOk: true, porcelain: " M a.ts\n", commits: 0 })).toMatchObject({ remove: false, dirty: true });
    expect(worktreeOutcome({ statusOk: true, porcelain: "", commits: 2 })).toMatchObject({ remove: false, commits: 2 });
    // a failed git status never removes
    expect(worktreeOutcome({ statusOk: false, porcelain: "", commits: 0 })).toMatchObject({ remove: false });
  });

  test("a session worktree thread runs on its own branch; closing removes it when unchanged", async ($, on) => {
    const w = fresh();
    gitRepo(w);
    await boot($, on, w);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "Iso", task: "edit things", worktree: true } as any);
    expect(r.result).toMatch(/its own git worktree on branch worktree-threads-t[0-9a-f]+/);
    const t = created(w, "Iso");
    const argv = spawns(w)[0];
    expect(argv[argv.indexOf("--worktree") + 1]).toBe(`threads-${t.id}`);
    // launched from the trusted repo folder, filed under the worktree it runs in
    expect(argv[argv.indexOf("-c") + 1]).toBe(APP);
    expect(t.cwd).toBe(`${APP}/.claude/worktrees/threads-${t.id}`);
    expect(t.worktree).toMatchObject({ repo: APP, branch: `worktree-threads-${t.id}`, base: "abc123", launchCwd: APP });
    expect(argv[argv.indexOf("--append-system-prompt") + 1]).toMatch(/commit your finished work on that branch/);
    expect(await threads($, "list")).toMatch(/worktree worktree-threads-/);
    w.dirs.set(t.worktree.path, t.worktree.path);
    const closed: any = await $.tool.call({ tool: "mcp__threads__threads_close", id: t.id, confirmed: true } as any);
    expect(closed.result).toMatch(/Its worktree had no changes and was removed\./);
    const gitRuns = w.runs.filter((a) => a[0] === "git").map((a) => a.slice(3).join(" "));
    expect(gitRuns).toContain(`worktree unlock ${t.worktree.path}`);
    expect(gitRuns).toContain(`worktree remove --force ${t.worktree.path}`);
    expect(gitRuns).toContain(`branch -D worktree-threads-${t.id}`);
    expect(created(w, "Iso").worktree.removed).toBe(true);
  });

  test("a worktree with commits or edits is kept, with the merge command", async ($, on) => {
    const w = fresh();
    gitRepo(w, { commits: "2", porcelain: " M src/a.ts\n" });
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "Builder", task: "build", worktree: true } as any);
    const t = created(w, "Builder");
    w.dirs.set(t.worktree.path, t.worktree.path);
    const out = await threads($, `close ${t.id}`);
    expect(out).toMatch(new RegExp(`kept at .*threads-${t.id} on branch worktree-threads-${t.id} \\(2 commits and uncommitted changes\\)\\. Merge it with: git -C '${APP}' merge worktree-threads-${t.id}`));
    expect(w.runs.some((a) => a[0] === "git" && a.includes("remove"))).toBe(false);
    expect(created(w, "Builder").worktree).toMatchObject({ kept: true, commits: 2, dirty: true });
  });

  test("outside a git repo a worktree thread is refused", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    const no: any = await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "X", task: "y", worktree: true } as any);
    expect(no.deny).toMatch(/needs a git repository/);
  });

  test("inline threads get a worktree made for them", async ($, on) => {
    const w2 = fresh({ loggedIn: false });
    const calls = gitRepo(w2);
    await boot($, on, w2);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_create", model: "haiku", title: "Inl", task: "y", worktree: true } as any);
    expect(r.result).toMatch(/own git worktree/);
    const t = created(w2, "Inl");
    expect(calls.some((a) => a.slice(2).join(" ") === `worktree add -b worktree-threads-${t.id} ${APP}/.claude/worktrees/threads-${t.id} abc123`)).toBe(true);
    expect(w2.spawned[0].cwd).toBe(`${APP}/.claude/worktrees/threads-${t.id}`);
    expect(w2.spawned[0].prompt).toMatch(/Work only inside that folder/);
  });
});

describe("threads: rename, unread, handoff, first-request effort", () => {
  test("rename: the pane and list name changes; an idle session thread's own name follows", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Scout -- look");
    const t = created(w, "Scout");
    expect(await threads($, `rename ${t.id} API auditor`)).toMatch(/Renamed Scout .* to API auditor\. Its session name in the sidebar changes once it is idle/);
    expect(registry(w).threads[0].title).toBe("Thread | API auditor");
    setSession(w, t.sessionId, { status: "idle" });
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_rename", id: t.id, title: "Auth auditor" } as any);
    expect(r.result).toMatch(/Its session name changed too/);
    expect(sendKeys(w)).toEqual([["send-keys", "-t", t.tmux, "-l", "/rename Thread | Auth auditor"], ["send-keys", "-t", t.tmux, "C-m"]]);
    expect(events(w).filter((e: any) => e.type === "renamed")).toHaveLength(2);
  });

  test("unread: a report shows as new in the list and band until read", async ($, on) => {
    const w = fresh();
    await boot($, on, w);
    await threads($, "new haiku Scout -- look");
    const reg = registry(w);
    reg.threads[0].lastReport = { text: "found 3 bugs", at: T0 + 5000 };
    w.fs.set(REG, JSON.stringify(reg));
    const t = registry(w).threads[0];
    expect(isUnread(t)).toBe(true);
    expect(bandText([{ ...t, status: "idle" }])).toMatch(/1 new/);
    let list: any = await $.tool.call({ tool: "mcp__threads__threads_list" } as any);
    expect(list.result).toMatch(/· new/);
    await $.tool.call({ tool: "mcp__threads__threads_read", id: t.id } as any);
    expect(registry(w).threads[0].seenAt).toBeGreaterThanOrEqual(T0);
    list = await $.tool.call({ tool: "mcp__threads__threads_list" } as any);
    expect(list.result).not.toMatch(/· new/);
    const reg2 = registry(w);
    reg2.threads[0].lastReport = { text: "and 1 more", at: (reg2.threads[0].seenAt ?? T0) + 1 };
    w.fs.set(REG, JSON.stringify(reg2));
    expect(((await $.tool.call({ tool: "mcp__threads__threads_mark_read", all: true } as any)) as any).result).toMatch(/Marked 1 thread read/);
    expect(await threads($, "markread")).toMatch(/Nothing unread/);
  });

  test("handoff: a fork that carries on with the work and frees the chat", async ($, on) => {
    const w = fresh({ forkText: "Goal: ship the parser. Done: tokenizer. Next: error recovery." });
    w.leadMessages = [{ role: "user", text: "build the parser" }, { role: "assistant", text: "tokenizer done" }];
    await boot($, on, w);
    const r: any = await $.tool.call({ tool: "mcp__threads__threads_handoff", title: "Parser", model: "sonnet" } as any);
    expect(r.result).toMatch(/Handed off: the thread carries on with this chat's work and reports back here/);
    const t = created(w, "Parser");
    expect(t).toMatchObject({ handedOff: true, forkedFrom: { include: "summary" } });
    expect(t.task).toMatch(/taking over the lead conversation's work/);
    const argv = spawns(w)[0];
    expect(argv[argv.indexOf("--append-system-prompt") + 1]).toMatch(/Next: error recovery/);
    expect(await threads($, "list")).toMatch(/· handoff/);
    expect(await threads($, "handoff sonnet Tests -- write the parser tests")).toMatch(/Handed off/);
    expect(created(w, "Tests").task).toMatch(/starting with: write the parser tests/);
  });

  test("an inline thread's very first request carries its effort, even before spawn resolves", async ($, on) => {
    const w = fresh({ loggedIn: false });
    w.duringSpawn = async () => {
      await drainStep($, "agent-1");
    };
    await boot($, on, w);
    await $.tool.call({ tool: "mcp__threads__threads_create", model: "sonnet", title: "Early", task: "go", effort: "low" } as any);
    expect(w.stepEfforts[0]).toBe("low");
  });
});

describe("threads: Codex computer use", () => {
  test("a Codex app approval on a thread's screen reads as needs-you; approve presses its hotkey", () => {
    const sc: any = readScreen("╭──╮\n│ Allow Codex computer use to use Calculator? │\n│ a This session  l Always allow  d Deny │\n╰──╯");
    expect(sc).toMatchObject({ needsYou: true, cuApproval: "Calculator" });
    expect(sc.prompt).toMatch(/Codex computer use wants to use Calculator/);
  });
});

