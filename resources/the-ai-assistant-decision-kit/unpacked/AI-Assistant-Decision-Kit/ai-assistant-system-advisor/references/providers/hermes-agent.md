# Hermes Agent Dossier

Research lock: 23 August 2026.

- Canonical repository: https://github.com/NousResearch/hermes-agent
- Latest stable release at lock: `v2026.8.19`, Hermes Agent v0.20.5, published 21 August 2026
- Default-branch commit inspected: `f293e7206b4ddd66042329442c6afebc19a8808d`
- License: MIT at the research lock

Verify the release, commit, license, providers, and security guidance again before recommending it.

## Why it became notable

Hermes is positioned as a self-improving, model-flexible agent runtime. Its differentiator is not one screen or one model. It is the exposed operating harness: agent loop, prompt assembly, tools, memory, skills, delegation, automation, gateways, execution backends, and recovery controls that an operator can inspect and change.

The project markets a closed learning loop in which the agent can persist curated memory, turn successful work into skills, improve reusable procedures, and search earlier sessions. It also combines this with broad model-provider support, multiple messaging surfaces, cron, subagents, and local or cloud execution.

## Harness anatomy

### Entry points and loop

Hermes accepts work through its terminal interface, messaging gateway, API server, batch runner, ACP adapter, and Python library. These entry points converge on the main agent runtime.

The loop performs context and prompt assembly, model-provider calls, tool selection and execution, streamed results, memory and session updates, and completion checks. The implementation exposes separate subsystems for provider routing, tool runtime, session storage, context compression, memory providers, delegation, gateways, and plugins.

### Prompt and context

Hermes assembles system context from core instructions, model and provider context, tools, skills, memory, user context, and session history. Context compression and provider prompt caching are explicit parts of the harness, which matters for long-lived assistants with large skill and memory prefixes.

### Models and routing

Hermes can use Nous Portal, OpenRouter, OpenAI, Anthropic-compatible services, local endpoints, and other providers documented by the project. Users can switch models without rewriting the operating layer. Provider routing, fallback chains, subscription proxies, and per-profile model configuration can raise the ceiling, but they also add configuration and debugging burden.

Do not reduce this to `any model works`. Verify the exact provider, authentication route, model features, and terms the user intends to use.

### Tools and execution backends

The runtime supports native tools, grouped toolsets, MCP integrations, browser and search providers, code execution, file operations, and plugin-contributed tools. Terminal execution can be local or run through Docker, SSH, Singularity, Modal, Daytona, or Vercel Sandbox according to the current project docs.

This is a major distinction between default and ceiling. A basic local install and a hardened cloud deployment are both Hermes, but they do not have the same persistence, security, cost, or maintenance profile.

### Skills and learning loop

Skills are reusable procedural instructions compatible with the Agent Skills format. Hermes can load bundled, optional, installed, and user-authored skills. The current product also supports learning or distilling procedures from completed work and iterating on them over time.

Evaluate the quality of the resulting skill, not the existence of a learning command. A learned skill still needs explicit inputs, decision rules, validation, failure handling, and approval boundaries.

### Memory

Hermes separates curated memory, user context, session history, skills, and optional memory-provider plugins. The included memory tooling supports adding, replacing, and removing entries, while session search provides a path back to earlier conversations. Optional providers can add different storage or retrieval behavior.

Ask the user which layer must be portable. `It has memory` is not enough. Verify write authority, editability, scope, storage location, backup, retrieval behavior, and poisoning defenses for the planned configuration.

### Delegation and orchestration

Hermes can spawn subagents for separate workstreams and can run delegation in the foreground or background. The ceiling includes multiple profiles, isolated tasks, specialized workers, and coordinated results. Confirm whether the user's desired design needs parallelism, strict isolation, shared state, or only a few named roles. Those are different requirements.

### Routines and delivery

Built-in cron can run natural-language or script-based jobs and deliver results to configured platforms. At the current research lock, cron jobs can carry persistent memory and per-job reasoning settings. The messaging gateway supports a large and changing set of platforms.

Always-on behavior depends on where Hermes and its gateway run. A VPS, persistent container, managed cloud, or serverless backend can continue without the user's laptop. A local process cannot.

## Security and recovery

Hermes documents layered controls including dangerous-command approvals, hard blocks for extreme commands, user-defined deny rules, gateway authorization and pairing, file-write protections, secret redaction, credential filtering, container isolation, and website restrictions.

Important nuances:

- Local terminal execution is not a containment boundary.
- Docker, remote, and serverless backends change the isolation model.
- Headless cron needs an explicit policy for commands that would normally require approval.
- Skills, MCPs, browser content, memory, and tool output can introduce prompt-injection or supply-chain risk.
- Checkpoints and rollback are opt-in and protect files, not every external side effect.
- The operator still owns patching, secrets, backups, access control, logs, and recovery testing.

Hermes can import selected OpenClaw settings, memory, skills, allowlists, messaging configuration, and credentials. Use a dry run and a backup. Do not assume semantic equivalence between the two systems.

## Default versus ceiling

| Layer | Ordinary default | Achievable ceiling |
| --- | --- | --- |
| Setup | Guided local install or Nous Portal path | Multi-profile, custom providers, hardened remote deployment |
| Models | One configured provider and model | Routing, fallbacks, local models, subscription proxies |
| Runtime | Local terminal and files | VPS, Docker, SSH, serverless or GPU environments |
| Memory | Curated memory plus sessions | Custom providers, explicit user models, portable skill layer |
| Tools | Built-ins and selected integrations | MCPs, plugins, custom tools, browser and computer control |
| Automation | Cron and gateway delivery | Multi-agent routines, background work, event-driven systems |
| Security | Approval and gateway defaults | Isolation, deny rules, secret manager, checkpoints, audited policies |

## Strong fit

- Technical operator who wants to inspect and modify the harness.
- User who needs model routing or wants the operating layer to survive model changes.
- Team that needs custom messaging channels, cloud hosting, or reusable skills.
- Builder who accepts maintenance in exchange for ownership and ceiling.
- Existing OpenClaw operator who wants a documented migration path and a different learning or tooling model.

## Weak fit

- User who wants zero setup and no system owner.
- Team that cannot operate patches, secrets, backups, or incident response.
- Buyer whose requirements are already met by a managed assistant.
- Organization that needs vendor-managed compliance commitments the chosen self-hosted stack does not provide.

## Verify before recommending

- latest stable release and release notes
- supported OS and install path
- exact provider and model route
- subscription or API terms
- selected terminal backend and persistence behavior
- required messaging adapters
- skill and plugin provenance
- approval policy for interactive and scheduled work
- backup, restore, monitoring, and update owner
- total monthly infrastructure and operator cost

## Primary sources

- Repository and README: https://github.com/NousResearch/hermes-agent
- Releases: https://github.com/NousResearch/hermes-agent/releases
- Architecture: https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
- Agent loop: https://hermes-agent.nousresearch.com/docs/developer-guide/agent-loop
- Prompt assembly: https://hermes-agent.nousresearch.com/docs/developer-guide/prompt-assembly
- Skills: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- Memory: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
- Delegation: https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
- Cron: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- Provider routing: https://hermes-agent.nousresearch.com/docs/user-guide/features/provider-routing
- Messaging: https://hermes-agent.nousresearch.com/docs/user-guide/messaging
- Security: https://hermes-agent.nousresearch.com/docs/user-guide/security
- OpenClaw migration: https://hermes-agent.nousresearch.com/docs/guides/migrate-from-openclaw

