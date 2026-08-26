# Repository Evidence Map

Research lock: 25 August 2026

Local repository reviewed: `promptadvisers/gb` archive at commit `a9f633e09d49a85829b8236331b9e21f7e612634`

Line numbers refer to that pinned commit. They can move in later versions.

## Classification key

- **Verified implementation**: behavior is directly expressed in the reviewed TypeScript.
- **Repository statement**: the reconstruction's documentation says this about itself or its provenance.
- **Author addition**: the repository explicitly identifies the capability as an experiment added by the reconstruction author.
- **Interpretation**: the guide's plain-language model of verified behavior.
- **Unknown**: the reviewed evidence does not establish the claim.

## Provenance and rights boundary

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| This is an unofficial reconstruction, not an official release or Anysphere's original monorepo. | Repository statement | `README.md:5-24` |
| The shipped renderer was optimized production output, not the authored frontend source. | Repository statement | `README.md:48-64`, `PROVENANCE.md:22-25` |
| No upstream source-code license is granted or implied. | Repository statement | `PROVENANCE.md:27-29`, `NOTICE.md:7-15` |
| The readable reconstruction is supposed to remain tied to inspectable artifact evidence. | Repository statement | `PROVENANCE.md:31-48` |
| Codex, Claude Code, OpenRouter, routed MCP tools, and local Docker are reconstruction-author experiments. | Author addition | `README.md:14-20` |

## Agent identity and isolated sessions

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| An agent profile stores name, description, title, avatar shape, and avatar color. | Verified implementation | `source/host/agents/agent-profile.ts:4-12`, `23-47` |
| Each local agent receives its own directory and `store.db`. | Verified implementation | `source/host/extensions/session/agent-session.ts:93-112`, `source/host/extensions/session/session-paths.ts:27-29` |
| Transcripts are read and written per agent database. | Verified implementation | `source/host/extensions/session/agent-session.ts:187-195`, `source/host/extensions/session/agent-db.ts:229-260` |
| A model becomes a durable teammate only when wrapped in identity, transcript, memory, and run state. | Interpretation | Derived from the profile, session, memory, and scheduler boundaries above. |

## Memory

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| Memory has `profile`, `log`, and `note` semantics. | Verified implementation | `source/host/runner/sand-memory.ts:1-23`, `104-146` |
| Memory persists outside the visible chat and is rendered into prompts under budgets. | Verified implementation | `source/host/runner/sand-memory.ts:76-101` |
| Memory can be scoped to the agent, user, or project. | Verified implementation | `source/host/extensions/memory/agent-state.ts:29-47` |
| Shared user and project memory use per-assistant shards. | Verified implementation | `source/host/extensions/memory/agent-state.ts:29-39`, `source/host/runner/sand-memory.ts:284-337` |
| Older facts remain on disk and are retrieved selectively instead of all entering every prompt. | Verified implementation | `source/host/runner/sand-memory.ts:83-100`, `149-175` |

## Asynchronous direct messages

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| `SendToAgent` is asynchronous and returns a delivery acknowledgement rather than the recipient's answer. | Verified implementation | `source/host/agents/agent-messaging.ts:35-47`, `source/host/runner/tools/sand-agent-management-tools.ts:99-127` |
| A reply arrives later and wakes the recipient on a fresh hidden turn. | Verified implementation | `source/host/agents/agent-messaging.ts:83-117`, `source/host/extensions/transcript/agent-to-agent-messaging.ts:149-272` |
| Messages are stored as outbound and inbound transcript entries. | Verified implementation | `source/host/extensions/transcript/agent-to-agent-messaging.ts:93-123`, `275-335` |
| One-to-one messages can include images. Group posts are text-only in this version. | Verified implementation | `source/host/runner/tools/sand-agent-management-tools.ts:45-57`, `source/host/extensions/transcript/agent-to-agent-messaging.ts:69-85` |
| The host discourages automatic acknowledgement loops and unfiltered forwarding of private user language. | Verified implementation | `source/host/agents/agent-messaging.ts:42-47` |

## Priority and scheduling

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| Priority messages are ordered before normal inbound messages. | Verified implementation | `source/host/extensions/transcript/agent-to-agent-messaging.ts:23-45`, `111-119` |
| A priority one-to-one message can interrupt active non-user work. | Verified implementation | `source/host/extensions/transcript/agent-to-agent-messaging.ts:120-147` |
| The active user lane is protected from peer interruption. | Verified implementation | `source/host/extensions/transcript/agent-to-agent-messaging.ts:125-128` |
| Priority is ignored for groups. | Verified implementation | `source/host/extensions/transcript/agent-to-agent-messaging.ts:69-85` |

## Group rooms and meetings

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| Groups are limited to six members. | Verified implementation | `source/shared/agents/agents.ts:53-55`, `source/host/extensions/transcript/group-chat-glue.ts:90-107` |
| A room run is bounded to three rounds, ten member messages, two messages per member turn, and 24 recent history messages. | Verified implementation | `source/host/groups/group-chat.ts:1`, `source/host/extensions/transcript/group-chat-orchestrator.ts:31-105` |
| The starting speaker rotates by round. | Verified implementation | `source/host/groups/group-chat.ts:3`, `source/host/extensions/transcript/group-chat-orchestrator.ts:45-59` |
| Mentions can restrict responders. | Verified implementation | `source/host/groups/group-chat.ts:7-10` |
| Members can pass, and pass content is not posted into the room. | Verified implementation | `source/host/groups/group-chat.ts:11`, `source/host/extensions/transcript/group-chat-orchestrator.ts:97-104` |
| The orchestrator itself does not hard-code a permanent manager role. | Verified absence in inspected orchestrator | `source/host/extensions/transcript/group-chat-orchestrator.ts:31-105` |

## Computers and screens

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| The computer is shared and each agent can receive its own desktop monitor. | Verified implementation | `source/host/ports/box.ts:1-6` |
| The shared desktop keeps an agent-to-window assignment map. | Verified implementation | `source/host/box/shared-desktop-sand-box.ts:20-28` |
| Window assignments can persist and use owner tokens. | Verified implementation | `source/host/box/shared-desktop-sand-box.ts:24-32`, `source/host/box/box-windows.ts:11-27` |
| Each assigned window returns a computer-use accessor and separate VNC URL. | Verified implementation | `source/host/box/shared-desktop-sand-box.ts:32` |
| A private desktop window does not prove a private file system. | Interpretation | The shared box ID and shared terminal folder remain common in `source/host/box/shared-desktop-sand-box.ts:11-18`, `32-36`. |

## Permissions

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| Standing local-computer modes are `always`, `ask`, and `never`, with `ask` as default. | Verified implementation | `source/shared/local-tool-permission.ts:1-23` |
| An administrator can impose a permission ceiling. | Verified implementation | `source/shared/local-tool-permission.ts:19-23` |
| Approval resolutions are allow once, deny, always, and never. | Verified implementation | `source/host/extensions/local-tool-permission/local-tool-permission-controller.ts:20-33`, `54-55` |
| Pending asks expire after ten minutes. | Verified implementation | `source/shared/local-tool-permission-machinery.ts:4`, `source/host/extensions/local-tool-permission/local-tool-permission-controller.ts:71-86` |
| Allow-once approvals are scoped and retired on scope completion or a new turn. | Verified implementation | `source/host/extensions/local-tool-permission/local-tool-permission-controller.ts:47-55`, `71-83` |
| Repetition alone does not silently create standing permission. | Verified implementation | Standing permission changes only through the explicit `always` resolution in `source/host/extensions/local-tool-permission/local-tool-permission-controller.ts:54-55`. |
| The inspected local actions include command, input, read, list, and write operations. | Verified implementation | `source/shared/local-tool-permission.ts:4-8`, `source/shared/local-tool-permission-machinery.ts:65-80` |
| A general learned credit-card purchasing policy is present. | Unknown | Not established by the inspected local-tool permission files. |

## Workflows and skill import

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| The system has user workflows, managed skills, plugin skills, and automations. | Verified implementation | `source/host/workflows/workflow-store.ts:25-48` |
| It can import Markdown or link a live source. | Verified implementation | `source/host/workflows/workflow-store.ts:49-50` |
| Local discovery includes `CLAUDE.md`, `AGENTS.md`, `.claude/CLAUDE.md`, and Cursor rules. | Verified implementation | `source/host/workflows/workflow-store.ts:51-55` |
| It automatically imports every Codex or Claude skill folder. | Unknown | Not established by the inspected discovery function. |

## Model routing

| Claim | Classification | Repository anchor |
| --- | --- | --- |
| The reconstruction includes Cursor, Claude Code, Codex, and OpenRouter routing. | Author addition | `README.md:14-20`, `81-99` |
| Routed transcripts are stored per agent and provider. | Verified implementation of the author addition | `source/node-agent-coordinator/inference-router.ts:10-76` |
| The routed providers preserve streaming and expose tool bridges. | Verified implementation of the author addition | `source/node-agent-coordinator/inference-router.ts:121-184` |
| These provider routes were part of Cursor's original Grok Bot implementation. | Unknown | The repository explicitly classifies them as added experiments. |
| The repository exposes xAI model weights or hidden reasoning implementation. | Unknown and unsupported | No such evidence appears in the reviewed source map or provenance statements. |

## Corrections made in the guide

1. Replaced "each agent has its own computer" with "one shared sandbox computer, separate private desktop windows."
2. Replaced vague learned permissions with explicit standing modes and scoped approvals.
3. Treated a manager as an optional role layered over a bounded room, not a hard-coded meeting primitive.
4. Narrowed skill-import claims to the files and adapters the reviewed source actually discovers.
5. Separated reconstruction-author provider additions from behavior attributed to the upstream app.
6. Avoided calling the repository authenticated Cursor source, xAI model code, or an official release.

