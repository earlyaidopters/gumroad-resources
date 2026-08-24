# Claude Cowork Dossier

Research lock: 23 August 2026.

Claude Cowork is a managed work agent in the Claude ecosystem. Verify plan eligibility, rollout state, usage limits, model availability, and connector support immediately before recommending it.

## Why it became notable

Cowork created a practical middle layer between conversational Claude and a terminal-first Claude Code workflow. It gave non-technical and knowledge-work users an agent that could plan, use files and connected tools, run code, coordinate subtasks, and return finished deliverables without requiring them to operate the terminal harness directly.

The product's significance is convenience and integration, not a unique claim to every underlying primitive. Open-source and owned systems can reproduce many of the same primitives, but Cowork packages them behind a vendor-managed interface and permission model.

## Current operating model

### Cloud sessions

Current first-party documentation says Cowork sessions can run in Anthropic's cloud. The agent loop and code execute in an isolated temporary environment on Anthropic-managed infrastructure, while sessions and files are associated with the user's Claude account. Cloud sessions can continue when the laptop is closed.

When a cloud session needs a local file, local browser, or local app, it reaches the device through Claude Desktop. That local dependency requires the device and desktop bridge to remain available at the moment of access.

### Local sessions

Existing desktop deployments can use a local execution path. In this architecture, the agent loop runs on the device and code executes inside an isolated local VM. Local file reads, browser access, and local plugin MCP servers follow device permissions and network controls.

Never say simply `Cowork runs in the cloud` or `Cowork runs locally`. The mode and the required resource determine the answer.

### Surfaces and continuity

Cowork is documented across desktop, web, and mobile for eligible paid plans, with cloud sessions syncing across surfaces. Rollout state can vary by plan and platform.

Dispatch is a phone-to-desktop path. It can start work from a phone that uses local files, plugins, connectors, and desktop apps, but the desktop must remain awake and Claude Desktop must stay open. This differs from a cloud session that has no live local dependency.

## Work harness

### Planning and parallel work

Cowork can plan a complex task, divide work into subtasks, coordinate parallel workstreams, run code and shell commands in its environment, and produce finished outputs. Multi-agent or parallel behavior is therefore not exclusive to open-source products.

The user does not control the underlying harness to the same degree as Hermes, OpenClaw, or an owned system.

### Files, projects, and memory

Cowork projects can hold files, links, instructions, and project memory. Local-folder projects are tied to desktop availability, while cloud projects are saved with the member's account.

Official pages have changed quickly around broader memory behavior. At the research lock, one help page says chat memory does not automatically carry into Cowork and that memory is supported within projects, while Dispatch guidance describes cross-session memory. Treat the exact scope as a volatile fact. Verify whether the user's expected memory is global, project-scoped, chat-derived, editable, and portable.

### Connectors, plugins, and skills

Cowork can use connectors and plugins. Current Anthropic plugins can bundle skills, connectors, and subagents. Some plugin features and local MCP servers remain desktop-dependent. Connected services can include common knowledge-work systems such as Google Drive, Gmail, Slack, and others available in the current catalog.

Do not score connector count. Verify the exact services, actions, admin permissions, authentication, and write capabilities the user needs.

### Browser and computer use

Cowork uses the most precise available tool first. It can prefer a connector, then browser or computer-use paths when necessary. Computer use can act on local apps in supported desktop environments and carries higher risk than a structured connector.

### Scheduled tasks

Scheduled tasks can run recurring or on-demand work. Cloud schedules can continue when the user's computer is off and can use cloud files, connectors, skills, and plugins. A scheduled task that requires local files or apps must run locally and therefore depends on the device.

## Permissions, privacy, and limits

Cowork offers permission modes that range from manual review to more automatic operation. Current docs distinguish Manual, Auto, and Skip modes, with extra controls or restrictions for Team and Enterprise organizations. Sensitive actions and organizational policy can still force approval.

Key boundaries:

- Connector authorization tokens are documented as staying outside the cloud sandbox and calls occur server-side.
- A cloud session that reaches a local file processes that content on Anthropic's servers.
- Connected folders and tools define what Cowork can reach, but they do not eliminate prompt-injection or consequential-action risk.
- Plugins and local MCP servers expand the trust boundary.
- Cowork uses more of the user's allocation than ordinary chat for complex work.
- Availability and controls can vary by plan and organization.

## Default versus ceiling

| Layer | Ordinary default | Achievable ceiling |
| --- | --- | --- |
| Setup | Select Cowork and describe a task | Projects, plugins, connectors, schedules, global and folder instructions |
| Cloud runtime | A cloud-capable Cowork task runs in Anthropic-managed infrastructure | Laptop-closed work using cloud files, connectors, skills, plugins, and schedules |
| Local runtime | A task that needs approved local folders or desktop apps depends on the supported desktop path | Mixed cloud and desktop workflows with computer use, but local dependencies still require the device |
| Models | Claude models exposed by the product | Limited to current Anthropic product controls |
| Files | Account files or approved local folders | Project memory, cloud files, connected services, desktop bridge |
| Automation | One managed task | Scheduled tasks, plugins, subagents, phone dispatch |
| Ownership | Vendor-managed harness | Custom behavior inside exposed instructions, skills, and plugins |

## Strong fit

- Existing Claude customer who wants a managed knowledge-work agent.
- User who values polished files, projects, connectors, and cross-device continuity.
- Non-technical operator who does not want to run a VPS or maintain a gateway.
- Organization already comfortable with Anthropic's admin and data boundaries.
- User who needs a middle ground between chat and Claude Code.

## Weak fit

- User who needs provider-independent model routing.
- Operator who must own or deeply alter memory, context, and execution internals.
- Workflow requiring a messaging channel not supported by the current product.
- Team whose local files must never be processed in a vendor cloud session.
- Heavy user whose allocation or rate limits make the workload unreliable or uneconomic.

## Verify before recommending

- current eligible plans and rollout by surface
- cloud versus local mode for the exact workflow
- local-file and local-app dependency
- memory scope and portability
- exact connector, plugin, and write-action support
- computer-use platform support
- scheduled-task behavior and limits
- permission modes and organization controls
- usage limits and cost
- data handling and retention commitments

## Primary sources

- Get started: https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork
- Architecture overview: https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview
- Scheduled tasks: https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork
- Dispatch: https://support.claude.com/en/articles/13947068-assign-tasks-from-anywhere-in-claude-cowork
- Computer use: https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork
- Plugins: https://support.claude.com/en/articles/13837440-use-plugins-in-claude
- Team and Enterprise: https://support.claude.com/en/articles/13455879-use-claude-cowork-on-team-and-enterprise-plans
- Safety: https://support.claude.com/en/articles/13364135-use-claude-cowork-safely
