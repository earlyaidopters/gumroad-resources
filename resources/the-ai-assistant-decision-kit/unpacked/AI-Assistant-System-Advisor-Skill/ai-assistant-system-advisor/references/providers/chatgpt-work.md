# ChatGPT Work Dossier

Research lock: 23 August 2026.

ChatGPT Work is a managed work agent in the OpenAI ecosystem. Verify plan eligibility, rollout, usage, apps, model controls, and platform support before recommending it.

## Why it became notable

Work sits between fast conversational ChatGPT and the software-development focus of Codex. It is designed for longer, multi-step work and finished deliverables such as research, documents, spreadsheets, presentations, reports, and Sites.

Its main value is the combination of a familiar ChatGPT account, connected apps, projects, cloud sessions, scheduled work, file creation, and reviewable deliverables. It is not automatically better than Codex for technical systems or better than Cowork for every knowledge-work task.

## Current operating model

### Surfaces

Current OpenAI documentation describes Work on desktop, web, and mobile for eligible accounts. Cloud Work chats sync across those surfaces. Codex remains a separate experience, with supported remote Codex access exposed through the mobile app rather than becoming a normal web Work chat.

### Cloud and local files

Cloud Work can continue and sync without treating the user's laptop as the runtime. Local files and folders require the desktop app and explicit local access. Work on web and mobile cannot directly access unsynced local files.

Local outputs may remain in the local project or folder. Cloud-created files may be stored in the account Library where available. Verify the exact storage and retention behavior for the user's plan.

## Work harness

### Projects and context

Projects group chats, files, and instructions. They are the main continuity layer for ongoing managed work. Account memory, project instructions, app data, and uploaded files are separate surfaces and should not be treated as one interchangeable memory system.

### Apps, plugins, and actions

ChatGPT apps connect external data and actions. Current OpenAI product terminology places apps inside a broader plugin system that can package skills, apps, and app templates. Depending on the app and plan, capabilities may include search, deep research, sync, interactive UI, and write actions.

Permissions can be configured to always ask, ask on changes or important actions, or allow more automatic operation when available. Workspace administrators can restrict apps, actions, scopes, and user access.

Verify the required app and action. Catalog size does not prove workflow fit.

### Documents, spreadsheets, and presentations

Work can create and edit common business deliverables from instructions, attached source material, reference files, and reusable templates. Current docs describe native Google Docs, Sheets, and Slides support when the relevant Google Workspace app is enabled.

The desktop relationship with Microsoft Excel may route through Codex and the ChatGPT for Excel add-in. At the research lock, OpenAI documentation said PowerPoint was not included in that specific Work desktop flow at launch. Verify current support rather than generalizing from file export.

### Scheduling and monitoring

Work can run once, repeat on a schedule or trigger, and monitor for changes through Scheduled Tasks. Verify the current trigger catalog, plan limits, approval behavior, and whether the task depends on a local resource.

### Orchestration

Managed Work can plan and execute multi-step tasks and may use specialized tools or agents exposed through the product. Do not claim that orchestration is absent merely because the interface is simpler than an open-source harness. Verify the actual behavior needed by the user.

## Usage, permissions, and trust

Current OpenAI guidance says Work follows the same usage structure as Codex, while actual consumption varies by task. This makes limits and credits a required check for heavy or recurring workflows.

Key boundaries:

- Cloud and local Work do not have the same file reach.
- App permissions govern when connected actions ask, not the full scope the external app granted during authorization.
- Projects, Library, connected apps, and local folders have different storage and deletion behavior.
- Workspace admins can change availability and action controls.
- Generated spreadsheets, documents, and presentations still require review of formulas, sources, structure, and sensitive actions.
- Current model selection and reasoning controls should be verified from the live product and official docs.

## Default versus ceiling

| Layer | Ordinary default | Achievable ceiling |
| --- | --- | --- |
| Setup | Select Work and give it files and a deliverable | Projects, plugins, connected apps, templates, scheduled tasks |
| Runtime | Managed cloud Work | Mixed cloud and desktop workflows, local project access |
| Models | Models exposed by current Work experience | Limited to current OpenAI product controls |
| Files | Uploads and generated files | Library, projects, native Google files, local desktop files |
| Automation | One multi-step task | Schedules, triggers, monitoring, connected actions |
| Technical ceiling | Managed deliverable work | Codex and SDKs remain separate paths for owned technical systems |

## Strong fit

- Existing ChatGPT customer who wants a managed work agent without a new ecosystem.
- User focused on research and finished business deliverables.
- Team already using OpenAI apps, plugins, projects, or workspace controls.
- Buyer who values web and mobile continuity and low infrastructure burden.
- User willing to trade deep harness ownership for a familiar managed product.

## Weak fit

- User who needs an inspectable, provider-independent agent harness.
- Workflow that depends on unsupported local files or apps while the device is offline.
- Heavy recurring use that repeatedly hits plan limits or credits.
- Organization whose required app actions or data boundaries are not approved.
- Builder whose primary need is a custom, durable internal operating layer rather than managed deliverables.

## Verify before recommending

- current plan and regional availability
- model and reasoning controls
- usage allocation, credits, and task limits
- cloud versus local file behavior
- required apps, plugins, actions, and approval modes
- project, Library, memory, and deletion behavior
- schedules, triggers, and monitoring limits
- document, spreadsheet, presentation, and Site output support
- workspace admin and data controls
- current relationship between Work, Codex, and mobile remote access

## Primary sources

- Work and Codex: https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex
- Deliverables: https://help.openai.com/en/articles/20001278-creating-and-editing-documents-spreadsheets-and-presentations-with-chatgpt-work
- Apps in ChatGPT: https://help.openai.com/en/articles/11487775-apps-in-chatgpt
- Plugins in ChatGPT and Codex: https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex
- File Library: https://help.openai.com/en/articles/20001052-library-for-chatgpt
- Supported file types: https://help.openai.com/en/articles/8983675-what-types-of-files-are-supported
- ChatGPT for Excel and Google Sheets: https://help.openai.com/en/articles/20001063-chatgpt-for-excel-and-google-sheets

