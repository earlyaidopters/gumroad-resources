// Serves Codex's computer-use engine (cua_repl, via launch.mjs) on a private Unix socket
// for the codex-cu Claude Code mod, with one cua_repl server per caller so several Claude
// sessions (threads) can drive the desktop at the same time.
//
// POST /js    {code, timeout_ms, title, session?, approve?}
// POST /reset {session?}
// GET  /health    -> "ok v2"
// GET  /sessions  -> JSON: callers, their apps, leases, last use
// POST /end   {session}  -> stops that caller's server (and its subagents': session/<agent>), freeing its leases
// POST /quit      -> shuts down
//
// Callers: `session` names the caller (the mod sends the Claude session id, plus the agent
// id for a subagent). Each caller gets its own cua_repl server, so REPL variables and the
// app it drives never mix with another caller's. Calls from one caller run one at a time.
// A caller with no `session` (an older mod) shares the "default" server, as before.
//
// Approvals: Codex asks before using each app (an MCP elicitation). It is accepted only for
// apps that caller lists in `approve` (the person's Allow presses in that session) or that
// always-allowed.json lists (Always allow, or autoApproveAll); anything else is declined and
// reported in the x-codex-declined header.
//
// App leases: two callers clicking in the same app at once would fight. The first caller to
// use an app leases it; another caller asking for the same app while the lease is fresh is
// declined and told in the x-codex-busy header ([{ app, holder, idleSeconds }]). A lease
// lapses after LEASE_MS without a call from its holder, or when the holder resets or ends.
//
// Idle callers' servers stop after SERVER_IDLE_MS; the daemon exits after IDLE_MS with no calls.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const VERSION = 'v2';
const here = dirname(fileURLToPath(import.meta.url));
const SOCK = join(here, 'daemon.sock');
// The person's standing approvals from the mod: { "apps": ["Calculator"], "autoApproveAll": false }.
const ALWAYS = join(here, 'always-allowed.json');
const IDLE_MS = 30 * 60 * 1000;
const SERVER_IDLE_MS = 15 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;
const MAX_SERVERS = 8;

const readAlways = () => {
  try {
    return JSON.parse(readFileSync(ALWAYS, 'utf8'));
  } catch {
    return {};
  }
};
const isAlwaysAllowed = app => {
  const always = readAlways();
  return always.autoApproveAll === true || (always.apps ?? []).includes(app);
};
const log = (...parts) => process.stderr.write(`${new Date().toISOString()} ${parts.join(' ')}\n`);

// caller key -> { child, rpc, ready, queue, lastUsed, apps:Set, call: { approve, declined, busy } }
const servers = new Map();
// app name -> caller key
const leases = new Map();
let idle;
const touch = () => { clearTimeout(idle); idle = setTimeout(shutdown, IDLE_MS); };

const keyOf = raw => String(raw ?? '').trim().slice(0, 200) || 'default';
const appOf = message => /use "([^"]+)"/.exec(message)?.[1] ?? message;

function leaseHolder(app, key) {
  const holder = leases.get(app);
  if (!holder || holder === key) return null;
  const s = servers.get(holder);
  // a lease lapses when its holder is gone or quiet
  if (!s || (!s.call && Date.now() - s.lastUsed > LEASE_MS)) {
    leases.delete(app);
    return null;
  }
  return { app, holder, idleSeconds: s.call ? 0 : Math.round((Date.now() - s.lastUsed) / 1000) };
}

function releaseLeases(key) {
  for (const [app, holder] of leases) if (holder === key) leases.delete(app);
}

function startServer(key) {
  const child = spawn(process.execPath, [join(here, 'launch.mjs')], { stdio: ['pipe', 'pipe', 'inherit'] });
  let nextId = 1;
  const pending = new Map();
  const s = { child, rpc: null, ready: null, queue: Promise.resolve(), lastUsed: Date.now(), apps: new Set(), call: null };
  const send = m => child.stdin.write(JSON.stringify(m) + '\n');
  s.rpc = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    send({ jsonrpc: '2.0', id, method, params });
  });
  createInterface({ input: child.stdout }).on('line', line => {
    let m; try { m = JSON.parse(line); } catch { return; }
    if (m.method && m.id !== undefined) {
      if (m.method === 'elicitation/create') {
        const app = appOf(m.params?.message ?? '');
        const call = s.call ?? { approve: [], declined: [], busy: [] };
        const busy = leaseHolder(app, key);
        if (busy) {
          call.busy.push(busy);
          send({ jsonrpc: '2.0', id: m.id, result: { action: 'decline' } });
        } else if (call.approve.includes(app) || isAlwaysAllowed(app)) {
          leases.set(app, key);
          s.apps.add(app);
          send({ jsonrpc: '2.0', id: m.id, result: { action: 'accept', content: {} } });
        } else {
          call.declined.push(app);
          send({ jsonrpc: '2.0', id: m.id, result: { action: 'decline' } });
        }
      } else send({ jsonrpc: '2.0', id: m.id, result: {} });
    } else if (m.id !== undefined && pending.has(m.id)) {
      pending.get(m.id).resolve(m);
      pending.delete(m.id);
    }
  });
  child.on('exit', () => {
    for (const p of pending.values()) p.reject(new Error('Codex computer-use server exited'));
    if (servers.get(key)?.child === child) {
      servers.delete(key);
      releaseLeases(key);
    }
  });
  s.ready = s.rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: { elicitation: {} },
    clientInfo: { name: 'codex-cu-daemon', version: VERSION },
  }).then(() => send({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  servers.set(key, s);
  log('started server for', key, `(${servers.size} running)`);
  return s;
}

function stopServer(key, why) {
  const s = servers.get(key);
  if (!s) return;
  servers.delete(key);
  releaseLeases(key);
  s.child.kill();
  log('stopped server for', key, why);
}

// Make room: stop the quietest idle caller beyond the cap (never one mid-call).
function makeRoom() {
  if (servers.size < MAX_SERVERS) return true;
  const quiet = [...servers].filter(([, s]) => !s.call).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  if (quiet.length === 0) return false;
  stopServer(quiet[0][0], 'to make room');
  return true;
}

function serverFor(key) {
  const s = servers.get(key);
  if (s) return s;
  if (!makeRoom()) return null;
  return startServer(key);
}

async function call(key, name, args, approve = []) {
  const s = serverFor(key);
  if (!s) {
    return { text: `Codex computer use is busy: ${MAX_SERVERS} sessions are mid-call. Try again in a moment.`, isError: true, declined: [], busy: [] };
  }
  // one call at a time per caller, so its REPL state stays coherent
  const run = s.queue.then(async () => {
    await s.ready;
    s.lastUsed = Date.now();
    s.call = { approve, declined: [], busy: [] };
    try {
      const m = await s.rpc('tools/call', { name, arguments: args });
      const r = m.result ?? { content: [{ type: 'text', text: JSON.stringify(m.error) }], isError: true };
      const text = r.content.map(b => (b.type === 'text' ? b.text : `[${b.type} omitted]`)).join('\n');
      return { text, isError: Boolean(r.isError), declined: [...s.call.declined], busy: [...s.call.busy] };
    } finally {
      s.call = null;
      s.lastUsed = Date.now();
    }
  });
  s.queue = run.catch(() => {});
  return run;
}

function sessionsJson() {
  return JSON.stringify(
    [...servers].map(([key, s]) => ({
      session: key,
      busy: Boolean(s.call),
      apps: [...s.apps],
      leases: [...leases].filter(([, holder]) => holder === key).map(([app]) => app),
      idleSeconds: Math.round((Date.now() - s.lastUsed) / 1000),
    })),
  );
}

function shutdown() {
  for (const key of [...servers.keys()]) stopServer(key, 'daemon exit');
  try { unlinkSync(SOCK); } catch {}
  process.exit(0);
}

// stop callers' servers that have gone quiet
setInterval(() => {
  for (const [key, s] of servers) if (!s.call && Date.now() - s.lastUsed > SERVER_IDLE_MS) stopServer(key, 'idle');
}, 60 * 1000).unref();

if (existsSync(SOCK)) unlinkSync(SOCK);
http.createServer((req, res) => {
  let body = '';
  req.on('data', d => (body += d));
  req.on('end', async () => {
    try {
      if (req.url === '/health') return res.end(`ok ${VERSION}`);
      if (req.url === '/sessions') return res.writeHead(200, { 'content-type': 'application/json' }).end(sessionsJson());
      if (req.url === '/quit') {
        res.end('bye');
        return setTimeout(shutdown, 50);
      }
      touch();
      const { approve = [], session, ...args } = body ? JSON.parse(body) : {};
      if (req.url === '/end') {
        const key = keyOf(session);
        const ended = [...servers.keys()].filter(k => k === key || k.startsWith(`${key}/`));
        for (const k of ended) stopServer(k, 'session ended');
        return res.end(JSON.stringify({ ended }));
      }
      const key = keyOf(session);
      let out;
      if (req.url === '/reset') {
        out = await call(key, 'js_reset', {});
        releaseLeases(key);
      } else {
        out = await call(key, 'js', args, approve);
      }
      res
        .writeHead(out.isError ? 422 : 200, { 'x-codex-declined': JSON.stringify(out.declined), 'x-codex-busy': JSON.stringify(out.busy) })
        .end(out.text);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
}).listen(SOCK, () => { touch(); log('daemon', VERSION, 'listening'); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, shutdown);
