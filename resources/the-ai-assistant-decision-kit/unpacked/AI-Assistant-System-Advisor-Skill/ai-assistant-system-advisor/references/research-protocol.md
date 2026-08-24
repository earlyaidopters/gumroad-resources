# Current Research Protocol

AI assistant facts change quickly. Research is part of the recommendation, not a decorative source list.

## Research lock

At the start of a recommendation, record:

- current date and time zone
- products evaluated
- source URLs opened
- page update dates when visible
- canonical repository commit and latest release for open-source products
- facts that could not be verified

Use a dated line such as: `Verified from first-party sources on 23 August 2026.`

## Source ladder

Use sources in this order:

1. Current product documentation and help center.
2. Current pricing, plan, availability, security, privacy, and terms pages.
3. Canonical repository README, docs, latest release, and tagged source.
4. Official demos, launch posts, or product footage.
5. Repository issues only as attributed reports, never as universal product behavior.
6. The user's direct experience, clearly labeled as an observation.
7. Your analysis, clearly labeled as analysis.

Do not use launch coverage, social posts, or third-party tutorials to override current first-party documentation.

## Managed product checklist

For Grok Bot, Claude Cowork, and ChatGPT Work, verify:

- eligible plans, price, region, account type, and rollout status
- supported desktop, web, mobile, and operating-system surfaces
- where the agent loop, code, browser, and files run
- what continues when the laptop closes
- how local files or local apps are reached
- project, file, memory, and session persistence
- available apps, connectors, plugins, skills, routines, schedules, and triggers
- parallel work or orchestration behavior
- approval modes and destructive-action boundaries
- isolation boundary between users, bots, projects, sessions, and computers
- usage limits, credits, rate limits, or other metering
- export, deletion, recovery, and admin controls
- supported models and whether model choice is fixed, selectable, or unspecified

## Open-source checklist

For Hermes Agent and OpenClaw, verify:

- canonical repository and license
- latest stable release, publication date, and current default-branch commit
- install and update path
- primary agent loop and prompt assembly
- model-provider and fallback design
- tool, plugin, MCP, browser, and computer-use layers
- memory storage, write rules, retrieval, and skill relationship
- subagent, orchestration, queue, and isolation model
- routines, cron, hooks, webhooks, and delivery behavior
- terminal, container, VPS, serverless, and remote-host options
- messaging gateway and supported channels
- permissions, secret handling, sandboxing, security audit, and prompt-injection posture
- backup, rollback, migration, health checks, and recovery
- what the user must operate after installation

Inspect implementation or architecture docs when a marketing claim is too broad. Record the exact file or page that supports the conclusion.

## Comparative research packet

Build one row per candidate with these fields:

| Field | What to record |
| --- | --- |
| Category | Stay, managed, open-source, or owned |
| Famous for | The reason people noticed it |
| Native default | What works with little setup |
| Achievable ceiling | What is possible after configuration or custom work |
| Operator | Vendor, user, team admin, or mixed |
| Execution | Cloud, local, VPS, container, serverless, or mixed |
| Always-on condition | Exact condition under which work continues |
| Model layer | Fixed, selectable, routable, or user-owned |
| Files and memory | Storage location, persistence, portability |
| Tools and interfaces | Connectors, browser, terminal, devices, channels |
| Automation | Schedules, triggers, monitoring, handoffs |
| Trust boundary | Isolation, approvals, secrets, data handling |
| Maintenance | Updates, debugging, backups, recovery |
| Switching cost | What must be rebuilt or abandoned |
| Verification | Direct URLs and date |

## Claim labels

Label important claims in notes and final output:

- **Verified fact:** directly supported by a current first-party source.
- **User observation:** behavior the user personally reported.
- **Analysis:** a conclusion drawn from facts and answers.
- **Unknown:** not documented, conflicting, or unavailable.

An unknown stays unknown. Do not score it as a failure and do not quietly fill it with a guess.

## Freshness rules

Always recheck before quoting:

- price or eligible plan
- release and version
- usage limits or credits
- model availability
- connectors and plugins
- platform support
- privacy, training, and retention terms
- beta, preview, or rollout status

If a dossier and live documentation conflict, current first-party documentation wins and the final answer should note the change.

