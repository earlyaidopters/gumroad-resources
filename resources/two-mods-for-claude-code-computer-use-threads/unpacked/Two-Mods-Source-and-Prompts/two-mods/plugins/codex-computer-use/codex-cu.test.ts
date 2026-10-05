import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'

// Stands in for the engine beneath the mod: a store, a status line, a tool list
// and tool calls that just report which tool ran.
const engine = (on: On, saved?: boolean, ownProcess = false) => {
  const store = new Map<string, unknown>(saved === undefined ? [] : [['enabled', saved]])
  on('store.get', ($, e) => ({ value: store.get(e.key) }))
  on('store.set', ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))
  on('command.register', () => ({ value: undefined }))
  on('tool.register', () => ({ value: undefined }))
  if (!ownProcess) on('process.run', () => ({ value: { exitCode: 0, stdout: '/tmp\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('tool.call', ($, e) => ({ result: `ran ${e.tool}`, text: `ran ${e.tool}`, isError: false }))
}

const start = { cwd: '/tmp', surface: null, isInteractive: false }

test('on by default: blocks Claude computer use, passes Codex and other tools', async ($, on) => {
  engine(on)
  await $.session.start(start)

  const own = await $.tool.call({ tool: 'mcp__computer-use__screenshot', tool_use_id: 'a' })
  expect(String(own.deny)).toContain('mcp__codex-computer-use__cua')

  const codex = await $.tool.call({ tool: 'mcp__codex-cu__js', tool_use_id: 'b', code: 'await cua.getState();' })
  expect(codex.text).toBe('ran mcp__codex-cu__js')

  const other = await $.tool.call({ tool: 'mcp__claude-in-chrome__navigate', tool_use_id: 'c', url: 'https://example.com' })
  expect(other.text).toBe('ran mcp__claude-in-chrome__navigate')
})

test('off when the person turned it off: Claude computer use runs', async ($, on) => {
  engine(on, false)
  await $.session.start(start)

  const own = await $.tool.call({ tool: 'mcp__computer-use__screenshot', tool_use_id: 'a' })
  expect(own.text).toBe('ran mcp__computer-use__screenshot')
})

test('daemon route: an unapproved app opens the approval pane; allowed apps are passed on', async ($, on) => {
  engine(on)
  const bodies: string[] = []
  const opened: string[] = []
  let declined = '["Calculator"]'
  on('mcp.call', () => ({ deny: 'not connected in this session' }))
  on('http.fetch', ($, e) => {
    if (e.url.endsWith('/health')) return { value: { status: 200, ok: true, headers: {}, text: 'ok v2' } }
    bodies.push(String(e.init?.body))
    return { value: { status: 422, ok: false, headers: { 'x-codex-declined': declined }, text: 'not approved' } }
  })
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  await $.session.start(start)

  const first = await $.tool.call({ tool: 'mcp__codex-computer-use__cua', tool_use_id: 'a', code: 'let app = await cua.getApp("Calculator");' })
  expect(first.isError).toBe(true)
  expect(String(first.text)).toContain('approval to use Calculator')
  expect(opened).toEqual(['codex-approval'])
  expect(JSON.parse(bodies[0]).approve).toEqual([])
  expect(JSON.parse(bodies[0]).session).toBe('sess-1')
  expect(JSON.parse(bodies[0]).code).toContain('Calculator')

  declined = '[]'
  const second = await $.tool.call({ tool: 'mcp__codex-computer-use__cua', tool_use_id: 'b', code: '1' })
  expect(second.text).toBe('not approved')
})

// The v2 daemon: one Codex session per Claude session and per subagent, apps leased to one session.
const daemon = (on: On, opts: { health?: string; busy?: string } = {}) => {
  const calls: { url: string; body: any }[] = []
  const runs: string[][] = []
  let health = opts.health ?? 'ok v2'
  on('mcp.call', () => ({ deny: 'not connected in this session' }))
  on('process.run', ($, e) => {
    runs.push([...e.argv])
    // starting the daemon brings up the current version
    if (String(e.argv[2] ?? '').includes('daemon.mjs')) health = 'ok v2'
    return { value: { exitCode: 0, stdout: '/tmp\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('clock.sleep', () => ({ value: undefined }))
  on('http.fetch', ($, e) => {
    if (e.url.endsWith('/health')) return { value: { status: 200, ok: true, headers: {}, text: health } }
    calls.push({ url: e.url, body: e.init?.body ? JSON.parse(String(e.init.body)) : null })
    if (e.url.endsWith('/sessions')) {
      return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify([{ session: 'sess-1', busy: false, leases: ['TextEdit'], idleSeconds: 3 }, { session: 'abcdef12-other', busy: true, leases: ['Calculator'], idleSeconds: 0 }]) } }
    }
    const busy = opts.busy ?? '[]'
    return { value: { status: busy === '[]' ? 200 : 422, ok: busy === '[]', headers: { 'x-codex-declined': '[]', 'x-codex-busy': busy }, text: busy === '[]' ? 'done' : 'not approved' } }
  })
  return { calls, runs }
}

test('each session and subagent gets its own Codex session key', async ($, on) => {
  engine(on, undefined, true)
  const { calls } = daemon(on)
  await $.session.start(start)
  await $.tool.call({ tool: 'mcp__codex-computer-use__cua', tool_use_id: 'a', code: '1' })
  await $.tool.call({ tool: 'mcp__codex-computer-use__cua', tool_use_id: 'b', code: '2', agentId: 'agent-7' } as any)
  await $.tool.call({ tool: 'mcp__codex-computer-use__cua_reset', tool_use_id: 'c', agentId: 'agent-7' } as any)
  expect(calls.map(c => [c.url.replace('http://codex-cu', ''), c.body.session])).toEqual([['/js', 'sess-1'], ['/js', 'sess-1/agent-7'], ['/reset', 'sess-1/agent-7']])
  // the agent id is the key, never an argument to Codex
  expect(calls[1].body.agentId).toBeUndefined()
})

test('an app leased to another session is reported, without the approval pane', async ($, on) => {
  engine(on, undefined, true)
  const opened: string[] = []
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  daemon(on, { busy: '[{"app":"Calculator","holder":"other","idleSeconds":12}]' })
  await $.session.start(start)
  const r = await $.tool.call({ tool: 'mcp__codex-computer-use__cua', tool_use_id: 'a', code: 'let app = await cua.getApp("Calculator");' })
  expect(r.isError).toBe(true)
  expect(String(r.text)).toContain('Calculator is being driven by another Claude session right now (its last call was 12s ago)')
  expect(opened).toEqual([])
})

test('an older daemon is replaced before the first call', async ($, on) => {
  engine(on, undefined, true)
  const { runs, calls } = daemon(on, { health: 'ok' })
  await $.session.start(start)
  const r = await $.tool.call({ tool: 'mcp__codex-computer-use__cua', tool_use_id: 'a', code: '1' })
  expect(r.text).toBe('done')
  expect(runs.some(a => a[0] === 'pkill' && String(a[2]).endsWith('/.claude/mcp/codex-cu/daemon.mjs'))).toBe(true)
  expect(runs.some(a => String(a[2] ?? '').includes('nohup'))).toBe(true)
  expect(calls[0].body.session).toBe('sess-1')
})

test('session end frees its Codex sessions; status lists who holds which app', async ($, on) => {
  engine(on, undefined, true)
  const { calls } = daemon(on)
  on('tool.list', () => ({ value: [] }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  await $.session.start(start)
  const status = await $.command.run({ command: 'codex-cu', args: 'status', origin: { kind: 'composer' } } as any)
  expect(String(status.text)).toContain('Sessions using it now (each with its own Codex session): this session idle 3s, holds TextEdit; abcdef12 working, holds Calculator.')
  await $.session.end({ reason: 'exit', sessionId: 'sess-1', resume: {} } as any)
  expect(calls.at(-1)).toEqual({ url: 'http://codex-cu/end', body: { session: 'sess-1' } })
})

