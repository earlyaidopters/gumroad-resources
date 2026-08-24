# Grok Bot Dossier

Research lock: 23 August 2026.

Grok Bot is a managed cloud assistant in the current xAI, Grok, and Cursor ecosystem. Verify eligible plans, pricing, included usage, supported platforms, model controls, and team availability before recommending it.

## Why it became notable

Grok Bot productizes a persistent cloud computer, named Bots, parallel screens, shared files and logins, handoffs, skills, and routines behind a consumer-facing interface. The novelty for many buyers is not that cloud agents, cron, skills, or orchestration were previously impossible. The value is that the vendor packages them without requiring the user to deploy a VPS, gateway, or open-source runtime.

Treat social attention as a catalyst, not evidence of product fit.

## Current operating model

### Persistent cloud computer

First-party docs say all Bots on one account use one persistent cloud computer. They share its filesystem, browser sessions, and app logins. Each Bot has its own screen, which allows parallel interaction, but the screens are not separate security boundaries.

This nuance is essential. A file or login placed on the computer should be treated as available to all Bots on that account.

### Background work

Bot work runs on the cloud computer and can continue when the desktop app, phone, or laptop is closed. The user does not need to operate the VM directly.

Always-on execution is therefore a strong native default, but not a unique ceiling. Hermes, OpenClaw, or an owned system can also run on persistent or serverless infrastructure if the user is willing to operate it.

### Surfaces

At the research lock, first-party docs listed macOS, Windows, and iPhone support, with Linux desktop, Android, and iPad not supported at initial launch. Recheck this because rollout is volatile.

## Work harness

### Bots and handoffs

A Bot is a persistent named agent or teammate. Bots can pass context and work through the shared computer. Named Bots do not necessarily imply separate files, credentials, memory, or compute.

Ask whether the user needs role separation, concurrency, or actual security isolation. Grok Bot's shared-computer model supports the first two more directly than the third.

### Skills

Skills capture steps, decision rules, expected output, and safety boundaries. Current docs say skills can be available across Bots, subject to required connectors or logins. A successful one-time task can be saved as a reusable skill.

Teach a task can record a browser demonstration and turn it into a draft skill where the feature is available. A recorded workflow still needs decision rules, failure handling, validation, and approval boundaries.

### Routines and event triggers

A routine assigns a workflow to one Bot and specifies when it runs. Current docs describe scheduled and event-driven work, test runs, run history, and usage controls. At the research lock, a Bot could own up to 50 routines and the app retained the 20 most recent run records per routine. Recheck these limits.

### Tools, apps, and logins

Bots can use the shared browser, terminal, filesystem, connected tools, websites, and app logins. The vendor-managed environment reduces setup burden while increasing reliance on the vendor's computer, data settings, account controls, and supported integrations.

### Models

Do not assume broad model routing. Verify the exact model used, whether the user can select models or effort, how usage is metered, and whether the product remains tied to the current Grok and Cursor account ecosystem.

## Approvals, privacy, and trust

Grok Bot documents approvals, explicit action boundaries, secure handoffs, and optional Auto Review behavior. Sensitive or consequential work such as sending, publishing, purchasing, deleting, changing permissions, or production changes should have narrow approval rules.

Key boundaries:

- Bots share a cloud computer, files, browser sessions, and logins.
- A Bot screen is not a security boundary.
- Grok Bot requires cloud data storage and did not support Legacy Privacy Mode at the research lock.
- Training and account data settings follow the applicable Cursor account and privacy controls described by the vendor.
- Test runs perform real work and can call connected tools or change files.
- Background routines need stale-data, no-data, retry, and approval policies.
- Deleting a Bot may not remove shared files or logins left on the computer.

## Default versus ceiling

| Layer | Ordinary default | Achievable ceiling |
| --- | --- | --- |
| Setup | Install app, create Bot, grant access | Multiple role Bots, skills, routines, event triggers |
| Runtime | Vendor-managed persistent cloud computer | Parallel screens and shared handoffs |
| Models | Current Grok Bot model configuration | Limited to controls the vendor exposes |
| Files and apps | Shared computer, browser, files, logins | Connected multi-tool workflows |
| Automation | One delegated turn | Skills, schedules, event routines, background work |
| Ownership | Vendor operates computer and harness | User owns procedures within exposed controls |

## Strong fit

- Non-technical user who wants persistent cloud execution with minimal setup.
- Buyer already paying for and using the Grok and Cursor ecosystem.
- User who sat out open-source assistants because VPS, secrets, and gateways felt too complicated.
- Workflow that benefits from several role-specific Bots sharing one workspace.
- Buyer who accepts a vendor-managed cloud trust boundary and current platform limits.

## Weak fit

- User who needs provider-independent model routing or an inspectable harness.
- Team that requires strict isolation between agents, roles, clients, or credentials.
- User on an unsupported platform.
- Buyer whose current system already reproduces the desired persistence and routines cheaply.
- Organization whose privacy or data policies conflict with required cloud storage.

## Verify before recommending

- current eligible plans, price, included products, and weekly usage
- desktop and mobile platform support
- team and enterprise availability
- current model and model-choice controls
- shared-computer isolation and account boundary
- connector and login support
- skill, routine, and event limits
- approval and Auto Review behavior
- privacy, training, retention, deletion, and cloud-storage settings
- export and recovery options

## Primary sources

- Overview: https://docs.x.ai/grok-bot/overview
- Get started: https://docs.x.ai/grok-bot/get-started
- FAQ: https://docs.x.ai/grok-bot/faq
- Skills and routines: https://docs.x.ai/grok-bot/skills-routines-and-automations
- Approvals, security, and privacy: https://docs.x.ai/grok-bot/approvals-security-and-privacy
- Teams and enterprises: https://docs.x.ai/grok-bot/teams-and-enterprises
