# OpenClaw Dossier

Research lock: 23 August 2026.

- Canonical repository: https://github.com/openclaw/openclaw
- Latest stable GitHub release at lock: `v2026.7.1-2`, published 4 August 2026
- Default-branch commit inspected: `c4e0c003a406cdd943291a6b31af3e302c14ccaf`

Verify the latest release, commit, license, and current documentation before recommending it.

## Why it became notable

OpenClaw demonstrated that existing models, tools, messaging channels, devices, files, automations, and remote runtimes could be stitched into a persistent personal assistant. Its historical importance is the complete gateway pattern. It made the category legible even when the early experience was complex.

Do not evaluate the current project only through launch-era criticism or hype. The repository has continued to evolve. Compare the current release and architecture with the user's actual requirements.

## Harness anatomy

### Gateway first

The long-lived Gateway is the control plane. It owns messaging surfaces, exposes a typed WebSocket API, manages events and health, accepts clients, and connects device nodes. Desktop apps, CLI, web UI, automations, and devices connect to the gateway.

This makes OpenClaw especially relevant when the assistant must live across channels and devices. It also means the gateway is an operational and security boundary that must be hosted, authenticated, monitored, and recovered.

### Agent runtime

The built-in runtime handles the agent loop, model selection, provider normalization, context and compaction, sessions, prompts, skills, tools, streaming, and transcript persistence. OpenClaw also exposes a harness registry so plugin runtimes can be selected under documented rules.

The execution loop resolves a session, serializes work to avoid state races, assembles the prompt and skill snapshot, selects a model and authentication profile, runs tools, streams progress, and writes the durable transcript under writer-claim fencing.

### Models and harness selection

The model-provider registry and the agent harness are separate concepts. OpenClaw can route across documented providers, while a provider or model name alone does not necessarily select a different harness. Verify the effective route, authentication, request behavior, and runtime selection rather than assuming a model swap changes the entire operating layer.

### Workspace, sessions, and resources

Agents operate inside workspaces with session history and resource discovery. Resource packages can contribute extensions, skills, prompts, and themes. Sessions are durable and queueing modes determine how new messages steer, follow, collect, or interrupt active work.

### Memory

The current memory architecture uses inspectable files plus a SQLite index, with multiple memory tiers, provenance, write rules, recall lanes, user modeling, active memory, standing intents, and background curation. The architecture treats the write path as the key security boundary.

This is a stronger statement than `OpenClaw remembers`. Evaluate:

- who or what can write to each memory surface
- how untrusted content is prevented from becoming authoritative
- what is visible and editable
- what is recalled on each turn
- how memory is backed up or moved
- whether multiple users or rooms need separate boundaries

### Agents and delegation

OpenClaw supports multiple agents, agent bindings, delegated work, queues, sessions, and specialist lanes. Ask whether the desired setup needs separate identities, separate workspaces, separate credentials, or merely separate conversations. Parallel work does not automatically imply security isolation.

### Automation

Cron jobs, hooks, webhooks, standing orders, polling, task flows, and heartbeats can support recurring or event-driven work. The right mechanism depends on whether the job is time-based, event-based, stateful, or requires a live session.

### Channels and devices

The gateway supports a broad and changing channel catalog, including common messaging and collaboration surfaces. Device nodes can expose capabilities such as screen, camera, location, and hosted interfaces when configured.

This channel reach is one of OpenClaw's strongest use cases. It also expands the attack surface and authorization burden.

## Security and operating boundary

The project documents authentication, device pairing, permission modes, sandboxing, tool policy, secrets, security audits, rate limiting, secure file operations, network exposure, and incident response.

Important nuances:

- The default trust model is a personal assistant for one operator, not hostile multi-tenant isolation.
- A shared gateway, session, workspace, channel, or credential can leak context if boundaries are configured incorrectly.
- Local execution, sandboxed execution, and elevated host execution are different risk levels.
- Plugins, skills, hooks, MCP servers, channels, browser content, and recalled memory can all carry untrusted input.
- Public gateway exposure requires deliberate authentication, network, and rate-limit controls.
- Security audits detect configuration risks but do not replace operational ownership.

Run the documented security audit and a backup before meaningful configuration changes. Prefer private network access such as a VPN or authenticated tunnel over broad public exposure.

## Default versus ceiling

| Layer | Ordinary default | Achievable ceiling |
| --- | --- | --- |
| Interface | CLI, web, configured channels | Broad multi-channel and device presence |
| Runtime | One gateway and built-in harness | Plugin harnesses, remote nodes, specialized agents |
| Models | Configured provider and model | Provider routing, failover, local and hosted models |
| Memory | Workspace files and indexed recall | Tiered curation, user model, standing intents |
| Automation | Basic cron and hooks | Event-driven flows, standing orders, webhooks, specialist lanes |
| Security | Local gateway and approvals | Hardened private ingress, sandboxing, scoped operators, audits |

## Strong fit

- Operator who values messaging and device reach as the primary interface.
- Builder who wants an inspectable gateway, workspaces, memory, and automation stack.
- User with an existing OpenClaw setup whose hard-won skills and channels already work.
- Team willing to operate authentication, upgrades, plugins, backups, and monitoring.
- Architect studying a mature, broad assistant system before building an owned layer.

## Weak fit

- Non-technical user who wants a polished five-minute setup.
- Team without an owner for gateway security and recovery.
- Organization that needs strong multi-tenant isolation without significant design work.
- User whose needs are limited to managed documents and connected knowledge work.
- Buyer considering migration only because another product is currently fashionable.

## Verify before recommending

- latest stable release and migration notes
- exact operating-system and hosting path
- selected gateway exposure and authentication
- required channel adapters and their maintenance state
- model-provider and harness route
- workspace, session, agent, and user isolation
- memory write and backup policy
- sandbox, approvals, and tool policy
- secrets and plugin supply chain
- health monitoring, update, and incident owner

## Primary sources

- Repository and README: https://github.com/openclaw/openclaw
- Releases: https://github.com/openclaw/openclaw/releases
- Runtime architecture: https://github.com/openclaw/openclaw/blob/main/docs/agent-runtime-architecture.md
- Gateway architecture: https://github.com/openclaw/openclaw/blob/main/docs/concepts/architecture.md
- Agent loop: https://github.com/openclaw/openclaw/blob/main/docs/concepts/agent-loop.md
- Memory architecture: https://github.com/openclaw/openclaw/blob/main/docs/concepts/memory-architecture.md
- Multi-agent concepts: https://github.com/openclaw/openclaw/blob/main/docs/concepts/multi-agent.md
- Cron: https://github.com/openclaw/openclaw/blob/main/docs/automation/cron-jobs.md
- Channels: https://github.com/openclaw/openclaw/blob/main/docs/channels/index.md
- Gateway security: https://github.com/openclaw/openclaw/blob/main/docs/gateway/security/index.md
- Sandboxing: https://github.com/openclaw/openclaw/blob/main/docs/gateway/sandboxing.md
- Security audit: https://github.com/openclaw/openclaw/blob/main/docs/cli/security.md

