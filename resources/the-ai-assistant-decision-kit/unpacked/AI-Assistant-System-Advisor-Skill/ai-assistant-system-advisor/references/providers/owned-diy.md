# Owned or DIY System Dossier

Research lock: 23 August 2026.

An owned system is not one product. It is an operating layer in which the user controls the durable parts of the assistant and treats Claude, Codex, Grok, an open model, or another provider as a replaceable engine.

## Why this path exists

Managed assistants repeatedly package the same broad primitives with different defaults, surfaces, and trust boundaries. Open-source systems expose more of the machinery, but they still bring an opinionated architecture. An owned system becomes attractive when the user's workflow itself is the valuable asset and should survive product changes.

This path should not win merely because it has the highest theoretical ceiling.

## The ten layers

### 1. Model gateway

Define a small interface between the operating layer and the model provider. It should express the capabilities the system actually needs, such as text, tools, images, code execution, structured output, or long-running work.

Keep provider-specific authentication and parameters behind adapters. Verify SDK and subscription terms before choosing cached-login, OAuth, API, or enterprise routes.

### 2. Runtime and workers

Choose where work runs:

- local machine for direct device reach
- persistent VPS for simple always-on work
- container for reproducibility and isolation
- serverless sandbox for bursty tasks
- managed vendor session for lower operations burden

One system may use more than one runtime. The location should follow the data and tool requirement.

### 3. Workspace and files

Use a stable project layout with clear ownership, temporary areas, outputs, logs, and recovery. Keep generated artifacts separate from authoritative source files. Avoid giving every worker unrestricted access to the same filesystem.

### 4. Tools and connectors

Prefer the narrowest reliable tool:

1. purpose-built API or connector
2. MCP or CLI
3. browser automation
4. computer use

Define read and write scopes, approval thresholds, idempotency, retries, and audit logs per tool.

### 5. Memory and context

Separate:

- durable user facts
- project knowledge
- session transcript
- procedural skills
- task state
- retrieval index
- observations that have not earned promotion

The important design question is who can write authoritative memory and how poisoned or stale content is rejected.

### 6. Skills and procedures

Store successful workflows as portable skills with triggers, inputs, decision rules, validation, failure handling, and approval boundaries. Keep them independent of one model's phrasing when possible.

### 7. Routines and events

Use a scheduler or event system that records input source, run state, attempts, output, cost, and failure. A recurring task needs stale-data behavior, retry policy, owner, and notification path.

### 8. Orchestration

Use one agent until parallelism has a measurable benefit. Add workers when tasks are independently verifiable or need different tools, models, permissions, or contexts.

Define shared state explicitly. Do not confuse separate chats with separate security boundaries.

### 9. Interfaces and channels

Choose the surfaces the user actually needs: web, desktop, terminal, phone, Slack, Telegram, email, or a private dashboard. Keep interface adapters separate from the core workflow so the operating layer can survive a UI change.

### 10. Trust, operations, and recovery

Define:

- approval policy
- secret manager
- network and filesystem boundary
- prompt-injection treatment
- logs and audit trail
- backups and restore tests
- update policy
- health checks and alerts
- incident owner
- kill switch

If nobody owns these, the system is not truly owned. It is merely abandoned infrastructure.

## Build gate

Recommend an owned build only if all are true:

1. The user has a recurring, valuable workflow that managed products do not satisfy cleanly.
2. The durable workflow is more valuable than any one provider interface.
3. A named person can maintain the system.
4. The first milestone can be built and tested narrowly.
5. Security and recovery are included in the design.
6. The user accepts a less polished default in exchange for control.

## Minimum viable architecture

Start with one workflow and six objects:

```text
Interface
  -> task contract
  -> one agent loop
  -> model adapter
  -> narrow tool set
  -> project workspace and memory
  -> run log and approval gate
```

Do not begin with a fleet of named agents. Add schedules, channels, extra models, and subagents only after the first workflow passes its acceptance test repeatedly.

## First milestone contract

Define:

- one input
- one finished output
- one model adapter
- no more than three tools
- one workspace
- one approval boundary
- one recovery mechanism
- one evaluation set of five real examples

The milestone is complete when it passes the evaluation set, records failures, and can be rerun after switching the model adapter without redesigning the workflow.

## Strong fit

- User with distinctive recurring workflows and meaningful provider-switching anxiety.
- Technical founder or team with an operator and real maintenance budget.
- Organization that needs custom memory, permissions, interfaces, or data boundaries.
- Builder who wants to absorb useful ideas from new products without moving the entire system.
- User who already has a working Claude or Codex SDK-based layer and wants to make it model-agnostic.

## Weak fit

- User who wants a polished product immediately.
- Buyer without a recurring workflow or measurable business value.
- Team with no maintenance owner.
- User whose needs are already met by one managed assistant.
- Organization attempting to bypass provider terms or resell subscription-backed compute.

## Verify before recommending

- current provider SDK and authentication terms
- personal, internal, commercial, and resale restrictions
- deployment and data location
- model and tool usage limits
- secret storage and rotation
- backup and rollback design
- operator time and infrastructure cost
- evaluation and monitoring plan
- exit path if the maintainer leaves

## Useful source architectures

Study the current canonical repositories and official managed-product docs for patterns, not blind cloning:

- Hermes Agent: https://github.com/NousResearch/hermes-agent
- OpenClaw: https://github.com/openclaw/openclaw
- Claude Cowork architecture: https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview
- ChatGPT Work: https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex
- Grok Bot overview: https://docs.x.ai/grok-bot/overview

