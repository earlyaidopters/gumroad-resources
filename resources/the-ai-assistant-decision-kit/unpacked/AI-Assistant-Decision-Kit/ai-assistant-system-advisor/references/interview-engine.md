# Adaptive Interview Engine

The interview must surface enough information to change the decision. It is not a personality quiz and it should not ask every possible question.

## Interaction adapter

### Claude Code

Use `AskUserQuestion`. Ask no more than three questions in one call. Give concrete choices plus a useful free-text escape hatch. Use multi-select only where more than one answer can be true, such as work types or required interfaces. Wait for the response before the next call.

### Codex

Use `request_user_input` when exposed in the current mode. Ask one to three short questions per call and put the most likely neutral option first. Translate open-ended diagnostics into honest forced choices, use the automatically available free-text option for nuance, and do not invent a false binary. If the tool is unavailable, ask a compact numbered block in the conversation and stop until the user answers.

### ChatGPT and other chat interfaces

Ask a short numbered round in normal conversation. Explicitly say that the recommendation will come after the answers. Do not append a provisional winner beneath the questions.

## Round 1: diagnose the move

First extract answers already present in the user's message. Never re-ask an answered question. Ask no more than three unresolved questions together and adapt the examples to the user's context.

1. **Current system:** What do you use now, and what have you already built around it?
2. **Failure and consequence:** What specific recurring job is unreliable, impossible, or too expensive today, and what does that cost in time, money, risk, or missed output?
3. **Hype test:** If social media stopped discussing new assistants for 30 days, would you still want to move? Why?

If the user cannot identify a recurring failure or meaningful consequence, make `stay put` the leading hypothesis. Continue the interview because there may still be a valid future requirement.

## Round 2: resolve the architecture

Ask only questions that remain unanswered and can change the path.

### Work and interfaces

- Which three workflows matter most?
- Is the main output research, decisions, messages, documents, spreadsheets, presentations, code, browser work, file operations, or monitoring?
- Where must the assistant be reachable: desktop, web, phone, terminal, Slack, Telegram, email, or another channel?
- Must it continue when the laptop is closed? If yes, can the work depend on local files or local apps?

### Existing gravity

- Which ecosystem is already paid for and trusted: Claude, ChatGPT, Grok and Cursor, Google, Microsoft, open-source tools, or none?
- Which files, projects, memories, skills, connectors, permissions, scheduled jobs, and team habits would need to move?
- Who besides the user depends on the current setup?

### Operator fit

- Can the user comfortably use a terminal and GitHub?
- Can they deploy and secure a VPS or container?
- Who will own updates, failed routines, backups, secret rotation, logs, and recovery three months from now?
- How many hours per month will they realistically spend maintaining the system?

### Control and trust

- Is model choice a requirement or only a preference?
- Must memory, prompts, skills, and logs be inspectable and editable?
- Are local-only data, regional controls, admin policies, audit logs, or data-retention commitments required?
- What actions may the assistant take without approval?

### Economics

- What is the monthly budget ceiling?
- Is the user optimizing for lowest cash cost, lowest operator time, or highest long-term leverage?
- What would make a trial successful enough to justify migration?

## Round 3: contradiction checks

Use a third round only when answers conflict. Examples:

- Wants no maintenance and unrestricted model routing.
- Wants laptop-closed execution but requires unsynced local files and an offline desktop.
- Wants strong isolation but plans to give every agent one shared login and filesystem.
- Wants complete ownership but cannot allocate an operator.
- Wants a fast migration but has years of irreplaceable memory, skills, and team processes.

Name the conflict plainly and ask which side takes priority.

## High-information forced choices

Use these when the user gives vague answers:

- **Which pain would you pay to remove?** Setup time, maintenance, rate limits, model lock-in, connector gaps, weak memory, missing channels, or unreliable deliverables.
- **Which burden would you rather inherit?** Vendor limits, subscription cost, infrastructure maintenance, or custom-system upkeep.
- **Which failure is least acceptable?** Work stops, wrong action, data exposure, lock-in, unexpected cost, or a hard-to-repair system.
- **Which asset must survive a provider change?** Files, memory, skills, routines, interfaces, or nothing yet.

## Interview completion test

Do not recommend until you can state all of the following:

- the user's current system
- the recurring job that matters
- the concrete failure or unmet requirement
- the required execution location and interfaces
- their ecosystem gravity
- their maintenance capacity
- their trust or privacy boundary
- their switching cost
- their budget or cost priority
- the success threshold for a reversible test
