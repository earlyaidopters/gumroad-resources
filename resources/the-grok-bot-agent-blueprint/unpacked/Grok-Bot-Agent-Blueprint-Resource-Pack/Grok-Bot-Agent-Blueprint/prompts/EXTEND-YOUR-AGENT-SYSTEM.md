# Extend an Existing Agent System With the Grok Bot Blueprint

Attach `GROK-BOT-AGENT-BLUEPRINT.md` and `BUILD-CHECKLIST.md`, then paste everything below into a coding agent that can inspect your target repository.

---

You are helping me extend an existing AI agent system. Treat the attached Grok Bot Agent Blueprint as an architecture reference, not as source code to copy.

Your job is to find the smallest safe path for adding the requested multi-agent capabilities to this repository.

## Operating rules

1. Inspect the target repository before proposing architecture.
2. Reuse existing primitives when they already satisfy the requirement.
3. Separate verified current behavior, your inference, and your proposal.
4. Do not copy recovered Grok Bot code, proprietary UI, application binaries, installers, or vendor-specific assets.
5. Keep the target system's naming, language, framework, and data conventions.
6. Do not make external, destructive, publishing, payment, or credential changes without explicit approval.
7. Protect the active user lane from internal agent interruption.
8. Treat private transcripts, memory scopes, and user-computer access as trust boundaries.
9. Do not implement until you have produced the audit and staged plan below, unless I explicitly ask you to proceed immediately.

## Phase 1: Repository audit

Find and report:

- Agent identity model and stable IDs
- Transcript storage
- Memory storage and retrieval
- Background jobs or queues
- Turn scheduler and cancellation support
- Tool registry and tool-call schema
- Existing subagents or agent-to-agent calls
- Sandbox, browser, terminal, and file boundaries
- Permission and approval logic
- UI surfaces for agent status and messages
- Tests that protect these areas

For each item, cite the exact target-repository file and explain what can be reused.

## Phase 2: Capability gap map

Score each capability as `present`, `partial`, or `missing`:

1. Isolated agent profiles
2. Isolated transcripts
3. Scoped durable memory
4. Fire-and-forget peer messages
5. Durable inbound wakes
6. User, peer, automation, and background run lanes
7. Priority peer interruption with the user lane protected
8. Bounded group rooms with pass behavior
9. Separate desktop windows or equivalent work surfaces
10. Scoped permission approvals
11. Provider-neutral model adapters
12. Workflow or skill import

Explain the evidence for every score.

## Phase 3: Staged design

Propose no more than four stages. For each stage include:

- User-visible outcome
- Data model changes
- Services or modules changed
- APIs or events added
- Migration needs
- Failure and restart behavior
- Permission impact
- Tests and acceptance criteria
- Rollback path

Prefer this order unless the repository strongly suggests another:

1. Identity and isolated transcripts
2. Asynchronous one-to-one messages and durable wakes
3. Run lanes, priority, and bounded rooms
4. Computer surfaces, permissions, providers, and advanced skills

## Phase 4: Decision packet

End with:

- Recommended first stage
- Why it is the smallest useful slice
- The runner-up approach and why it lost
- Exact files likely to change
- Risks that need my decision
- One reversible proof-of-concept test

Wait for my approval after the decision packet unless I have already authorized implementation.

## If implementation is approved

Implement one stage at a time. After each stage:

- Run focused tests.
- Add restart and duplicate-delivery tests for queues.
- Add cross-agent privacy tests for transcripts and memory.
- Add interruption tests proving the user lane cannot be preempted.
- Add hard-cap tests for room rounds and messages.
- Add permission tests for allow once, deny, always, never, and expiry.
- Report changed files, observed behavior, remaining risks, and the rollback method.

Do not claim completion until the target behavior is demonstrated end to end.
