import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CodexCuPending } from '../types'

// Codex's computer-use engine is cua_repl from the ChatGPT app. The bridge tool reaches it
// through a small daemon in ~/.claude/mcp/codex-cu that keeps one server alive on a Unix
// socket. Codex asks before using each app; the daemon answers yes only for apps the person
// allowed in the pane below, so approval works the same on every surface. (A function hook
// cannot answer an MCP elicitation, so the session's own codex-cu connection is not used.)
const SERVER = 'codex-cu'
const CODEX_JS = 'mcp__codex-cu__js'
// The mod's own tools. The plugin is not named codex-cu: its tools would then sit in the
// codex-cu server's mcp__codex-cu__ namespace, which the engine refuses.
const BRIDGE = 'mcp__codex-computer-use__cua'
const BRIDGE_RESET = 'mcp__codex-computer-use__cua_reset'
const CODEX_TOOLS = [CODEX_JS, 'mcp__codex-cu__js_reset', BRIDGE, BRIDGE_RESET]
const OWN_COMPUTER_USE = /^mcp__computer-use__/
const NODE = '/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node'
const PANE = 'codex-approval'
// The daemon this mod speaks to: one cua_repl server per Claude session (and per subagent),
// so several sessions, such as threads, can drive different apps at the same time.
const DAEMON_VERSION = 'v2'
// The person's standing approvals, shared with the daemon:
// { "apps": [...always allowed...], "autoApproveAll": true|false }.
const ALWAYS_FILE = '.claude/mcp/codex-cu/always-allowed.json'

type Standing = { apps: string[]; autoApproveAll: boolean }

async function readStanding($: EngineInterface, home: string): Promise<Standing> {
  try {
    const parsed = JSON.parse(String(await $.fs.read(`${home}/${ALWAYS_FILE}`)))
    return { apps: Array.isArray(parsed.apps) ? parsed.apps : [], autoApproveAll: parsed.autoApproveAll === true }
  } catch {
    return { apps: [], autoApproveAll: false }
  }
}

async function readAlways($: EngineInterface, home: string): Promise<string[]> {
  return (await readStanding($, home)).apps
}

async function writeAlways($: EngineInterface, home: string, apps: string[]) {
  const standing = await readStanding($, home)
  await $.fs.write(`${home}/${ALWAYS_FILE}`, `${JSON.stringify({ ...standing, apps }, null, 2)}\n`)
}

async function writeAutoApprove($: EngineInterface, home: string, autoApproveAll: boolean) {
  const standing = await readStanding($, home)
  await $.fs.write(`${home}/${ALWAYS_FILE}`, `${JSON.stringify({ ...standing, autoApproveAll }, null, 2)}\n`)
}

const pending = atom({ plugin: 'codex-computer-use', key: 'pending' } as const, null as CodexCuPending)
const allowed = atom({ plugin: 'codex-computer-use', key: 'allowed' } as const, [] as string[])

const ROUTING = `# Computer use goes through Codex (codex-cu mod is on)

For any task that needs to see or operate a desktop app on this Mac, use Codex's computer-use engine through \`${BRIDGE}\` (reset with \`${BRIDGE_RESET}\`). The mcp__computer-use__* tools are blocked while this mode is on.

How to drive it well:
- It runs JavaScript in a persistent REPL with a \`cua\` object. First call (or after a reset): exactly one entry call, such as \`let app = await cua.getApp("Calculator");\`, and nothing else. Its result carries the API documentation and the app's accessibility tree. Read it before the next call and use only documented APIs.
- Prefer element indices from the accessibility tree (\`app.click(12)\`, \`app.setValue(9, "text")\`) over coordinates, and keyboard shortcuts (\`app.pressKey("cmd+t")\`) where the app has them.
- Batch deterministic steps in one call and end it with \`await app.getAXState()\`, which returns a diff of what changed. Re-read indices after every action; never reuse stale ones. Ask for \`{ disableDiffing: true }\` only when you need the full tree.
- Return only what you need: observation calls print their result by default, so to filter, read with \`{ emit: false }\` (e.g. \`const t = await app.getAXState({ emit: false, disableDiffing: true })\`) and print just the relevant lines with \`nodeRepl.write(...)\`.
- It works in the background with real clicks, typing and drags, without moving the person's cursor. There is no hover.
- After any error or surprise, read the state before retrying: an action can fail yet still apply, and an app dialog may have opened. Answer a dialog that would change the person's settings or data with its least-change option (Not Now, Cancel) unless the task calls for it.
- When the person wants to watch, bring the app to the front first (\`open -a <App>\` from the shell activates it), then pace the steps with short pauses so each change is visible.
- Leave apps as you found them (close tabs or windows you opened) unless the task says otherwise.
- Because it works in the background, the app stays behind the person's other windows. When the result is something they will want to look at (a note, a document, a form you filled), bring the app forward at the end: raise its window with \`performSecondaryAction(<window index>, "Raise")\` and say where the result is.
- Each app needs approval. If the result says the person is being asked to approve an app, stop and wait for their answer; the mod tells you when they decide. Never try to get around a denial.
- Other Claude sessions may be using computer use at the same time, each in its own Codex session. An app one of them is driving is leased to it: if the result says an app is in use by another session, work in a different app, or wait about a minute and retry. Never fight over an app.
- Prefer purpose-built tools first (a CLI, an API, an MCP connector, the built-in browser or Claude in Chrome for web pages). Use Codex computer use for native apps and anything only the GUI can do.`

export const register: Register = on => {
  let isOn = true
  let isUsedThisTurn = false
  let home = ''

  on('session.start', async ($, e, next) => {
    isOn = (await $.store.get('enabled')) !== false
    home = (await $.process.run(['printenv', 'HOME'])).stdout.trim()
    try {
      await $.command.register({
        name: 'codex-cu',
        description: 'Route computer use through Codex: on, off, status, auto on/off, forget <app>',
        argumentHint: '[on|off|status|auto on|auto off|forget <app>]',
        immediate: true,
      })
    } catch {
      // The command file still offers it as /codex-computer-use:codex-cu.
    }
    $.ui.status(isOn ? 'Codex CU on' : undefined)
    try {
      await registerBridge()
    } catch (error) {
      $.ui.toast(`codex-cu: bridge tool not registered (${String(error).slice(0, 120)})`)
    }

    return next(e)

    async function registerBridge() {
      await $.tool.register({
      name: 'cua',
      description:
        "Codex computer use: control native Mac apps in the background (real clicks, typing, drags; no hover). Runs JavaScript in Codex's persistent cua_repl with a `cua` object. First call (or after cua_reset): exactly one entry call, e.g. `let app = await cua.getApp(\"Calculator\");` or `await cua.getState();`. Its result carries the API docs and UI state; read it, then use only documented APIs. Apps need the person's approval.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript to execute using the initialized cua_repl runtime.' },
          timeout_ms: { type: 'integer', minimum: 1, description: 'Execution timeout in milliseconds (default 30000).' },
          title: { type: 'string', maxLength: 80, description: 'Short user-facing description of what the code does.' },
        },
        required: ['code'],
      },
    })
      await $.tool.register({
        name: 'cua_reset',
        description: 'Reset the Codex cua_repl JavaScript session. Does not close apps or tabs.',
      })
    }
  })

  on('tool.call', { tool: [BRIDGE, BRIDGE_RESET] }, async ($, e) => {
    const { tool, tool_use_id, agentId, ...args } = e as typeof e & { agentId?: string }
    // its own Codex session per Claude session, and per subagent inside it
    const session = `${await $.session.id()}${agentId ? `/${agentId}` : ''}`
    const isReset = tool === BRIDGE_RESET
    isUsedThisTurn = true
    const fail = (text: string) => ({ result: text, text, isError: true as const })

    // The daemon, started on first use.
    const dir = `${home}/.claude/mcp/codex-cu`
    const socketPath = `${dir}/daemon.sock`
    let isUp = false
    try {
      const health = await $.http.fetch('http://codex-cu/health', { socketPath })
      isUp = health.ok && health.text.trim() === `ok ${DAEMON_VERSION}`
      // an older daemon shares one Codex session among every caller: replace it
      if (health.ok && !isUp) {
        await $.process.run(['pkill', '-f', `${dir}/daemon.mjs`])
        await $.clock.sleep(300)
      }
    } catch {
      isUp = false
    }
    if (!isUp) {
      await $.process.run([
        '/bin/sh',
        '-c',
        `nohup "${NODE}" "${dir}/daemon.mjs" > "${dir}/daemon.log" 2>&1 < /dev/null &`,
      ])
      for (let i = 0; i < 40 && !isUp; i++) {
        await $.clock.sleep(250)
        try {
          isUp = (await $.http.fetch('http://codex-cu/health', { socketPath })).ok
        } catch {
          isUp = false
        }
      }
      if (!isUp) return fail(`The Codex computer-use daemon did not start. See ${dir}/daemon.log.`)
    }

    const approve = await read($, allowed)
    const res = await $.http.fetch(`http://codex-cu/${isReset ? 'reset' : 'js'}`, {
      method: 'POST',
      socketPath,
      body: JSON.stringify(isReset ? { session } : { ...args, approve, session }),
    })
    const busy: { app: string; holder: string; idleSeconds: number }[] = JSON.parse(res.headers['x-codex-busy'] ?? '[]')
    if (busy.length > 0) {
      const { app, idleSeconds } = busy[0]
      return fail(
        `${app} is being driven by another Claude session right now (its last call was ${idleSeconds}s ago), so it is leased to that session. Work in a different app, or wait about a minute and retry; the lease lapses 2 minutes after that session's last call, or when it resets or ends. Do not try to get around it.`,
      )
    }
    const declined: string[] = JSON.parse(res.headers['x-codex-declined'] ?? '[]')
    if (declined.length > 0) {
      const app = declined[0]
      await update($, pending, () => ({ app }))
      await $.ui.open({ id: PANE, title: 'Codex computer use', focus: true, closeOnEscape: true, rows: 6 })
      return fail(
        `Codex needs the person's approval to use ${app}. They are being asked in the codex-cu prompt now. Stop and wait: a message will say whether they allowed it, and then you can retry the same call.`,
      )
    }

    return res.ok ? { result: res.text, text: res.text } : fail(res.text)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const ask = await read($, pending)
    if (ask === null) return <Text dimColor>No approval waiting.</Text>
    const app = ask.app

    return (
      <Box flexDirection="column">
        <Text>Allow Codex computer use to use {app}?</Text>
        <Text dimColor>It sends real clicks and keystrokes to the app in the background.</Text>
        <Box>
          <Button
            key="allow"
            label="This session"
            hotkey="a"
            variant="primary"
            autoFocus
            onPress={async () => {
              await update($, allowed, list => (list.includes(app) ? list : [...list, app]))
              await update($, pending, () => null)
              await $.ui.close({ id: PANE })
              await $.prompt.submit({ text: `I allowed Codex computer use to use ${app} for this session. Retry the last call and continue the task.`, asUser: true })
            }}
          />
          <Text> </Text>
          <Button
            key="always"
            label="Always allow"
            hotkey="l"
            onPress={async () => {
              const always = await readAlways($, home)
              if (!always.includes(app)) await writeAlways($, home, [...always, app])
              await update($, allowed, list => (list.includes(app) ? list : [...list, app]))
              await update($, pending, () => null)
              await $.ui.close({ id: PANE })
              await $.prompt.submit({ text: `I always allowed Codex computer use to use ${app}. Retry the last call and continue the task.`, asUser: true })
            }}
          />
          <Text> </Text>
          <Button
            key="deny"
            label="Deny"
            hotkey="d"
            role="dismiss"
            onPress={async () => {
              await update($, pending, () => null)
              await $.ui.close({ id: PANE })
              await $.prompt.submit({ text: `I denied Codex computer use for ${app}. Do not use ${app}; tell me another way or stop.`, asUser: true })
            }}
          />
        </Box>
      </Box>
    )
  })

  // `/codex-cu` is registered at session start; the plugin's commands/codex-cu.md lists it in
  // every menu as `/codex-computer-use:codex-cu`. Both land here.
  on('command.run', { command: ['codex-cu', 'codex-computer-use:codex-cu'] }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'auto on' || arg === 'auto off') {
      const isAuto = arg === 'auto on'
      await writeAutoApprove($, home, isAuto)
      return {
        text: isAuto
          ? 'Auto-approve is on: Codex computer use may use any app without asking (Codex\'s own safety and organization blocks still apply).'
          : 'Auto-approve is off: apps not on the always-allowed list ask in the approval pane.',
      }
    }
    if (arg.startsWith('forget')) {
      const target = e.args.trim().slice('forget'.length).trim()
      if (target === '') return { text: 'Usage: /codex-cu forget <app name> (or: all)' }
      const always = await readAlways($, home)
      const kept = target.toLowerCase() === 'all' ? [] : always.filter(one => one.toLowerCase() !== target.toLowerCase())
      await writeAlways($, home, kept)
      await update($, allowed, list => (target.toLowerCase() === 'all' ? [] : list.filter(one => one.toLowerCase() !== target.toLowerCase())))
      return { text: kept.length === always.length ? `${target} was not on the always-allowed list.` : `Removed. Always allowed now: ${kept.length > 0 ? kept.join(', ') : 'none'}.` }
    }
    if (arg === 'on' || arg === 'off') {
      isOn = arg === 'on'
      await $.store.set('enabled', isOn)
      $.ui.status(isOn ? 'Codex CU on' : undefined)
    } else if (arg !== '' && arg !== 'status') {
      return { text: 'Usage: /codex-cu [on|off|status|auto on|auto off|forget <app>]' }
    }

    const tools = await $.tool.list()
    const isConnected = tools.some(tool => tool.name === CODEX_JS)
    const apps = await read($, allowed)
    const mode = isOn
      ? 'On. Desktop computer use goes through Codex; my own computer-use tools are blocked.'
      : 'Off. I use my own computer-use tools.'
    const route = `Route: the ${BRIDGE} bridge through the codex-cu daemon (${DAEMON_VERSION}: one Codex session per Claude session, apps leased to one session at a time)${isConnected ? '; the codex-cu server is also connected directly' : ''}.`
    const standing = await readStanding($, home)
    const always = standing.apps
    const autoLine = standing.autoApproveAll
      ? 'Auto-approve: ON, every app is allowed without asking (/codex-cu auto off to ask again).'
      : 'Auto-approve: off (/codex-cu auto on to allow every app without asking).'
    const allowedLine = apps.length > 0 ? `Allowed this session: ${apps.join(', ')}.` : 'No apps allowed through the pane yet this session.'
    const alwaysLine = `Always allowed: ${always.length > 0 ? always.join(', ') : 'none'} (revoke with /codex-cu forget <app>). Apps set to "Always" inside Codex are allowed too.`

    let usersLine = 'Sessions using it now: none (the daemon is not running).'
    try {
      const res = await $.http.fetch('http://codex-cu/sessions', { socketPath: `${home}/.claude/mcp/codex-cu/daemon.sock` })
      const me = await $.session.id()
      const users: { session: string; busy: boolean; leases: string[]; idleSeconds: number }[] = res.ok ? JSON.parse(res.text) : []
      usersLine = users.length === 0
        ? 'Sessions using it now: none.'
        : `Sessions using it now (each with its own Codex session): ${users
            .map(u => `${u.session.startsWith(me) ? 'this session' : u.session.slice(0, 8)}${u.session.includes('/') ? ' (subagent)' : ''}${u.busy ? ' working' : ` idle ${u.idleSeconds}s`}${u.leases.length > 0 ? `, holds ${u.leases.join(', ')}` : ''}`)
            .join('; ')}.`
    } catch {
      // daemon not running
    }

    return { text: `Codex computer use: ${mode}\n${route}\n${autoLine}\n${allowedLine}\n${alwaysLine}\n${usersLine}` }
  })

  // a session that ends frees its Codex sessions and app leases at once
  on('session.end', async ($, e, next) => {
    const done = await next(e)
    try {
      await $.http.fetch('http://codex-cu/end', {
        method: 'POST',
        socketPath: `${home}/.claude/mcp/codex-cu/daemon.sock`,
        body: JSON.stringify({ session: e.sessionId }),
      })
    } catch {
      // no daemon running: nothing to free
    }

    return done
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!isOn) return composed

    return {
      ...composed,
      sections: [...composed.sections, { id: 'codex-cu:routing', text: ROUTING, scope: 'session' as const }],
    }
  })

  on('tool.call', { tool: OWN_COMPUTER_USE }, ($, e, next) =>
    isOn
      ? {
          deny: `codex-cu mode is on, so desktop computer use goes through Codex. Use ${BRIDGE} instead (load it with ToolSearch if needed). The person can switch back with /codex-cu off.`,
        }
      : next(e),
  )

  on('tool.call', { tool: CODEX_TOOLS }, async ($, e, next) => {
    isUsedThisTurn = true
    const ran = await next(e)
    // The server's own tool can only ask through the engine's prompt; point at the bridge,
    // which asks through the pane, when that approval did not come through.
    if (e.tool === CODEX_JS && /was not approved to use/.test(String(ran.text ?? ''))) {
      return { ...ran, text: `${ran.text}\n\n[codex-cu] Use ${BRIDGE} with the same code instead: it asks the person for approval in its own prompt.` }
    }

    return ran
  })

  // Codex tells its computer-use runtime when a turn ends so it can release the
  // session; do the same on the direct connection.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (isUsedThisTurn && e.agentId === undefined) {
      isUsedThisTurn = false
      try {
        await $.mcp.call(SERVER, 'turn_ended', {
          hook_event_name: 'Stop',
          session_id: await $.session.id(),
          turn_id: e.turnId,
        })
      } catch {
        // No direct connection: the daemon's server releases on its own.
      }
    }

    return done
  })
}
