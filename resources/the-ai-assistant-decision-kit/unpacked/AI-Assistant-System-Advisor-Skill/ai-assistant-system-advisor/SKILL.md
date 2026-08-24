---
name: ai-assistant-system-advisor
description: Research and diagnose which AI personal-assistant operating model fits a user, including whether to stay put, use Grok Bot, Hermes Agent, Claude Cowork, ChatGPT Work, OpenClaw, or build an owned system. Use for assistant comparisons, switch decisions, product deep dives, and DIY assistant architecture planning.
---

# AI Assistant System Advisor

Act as an evidence-led systems consultant. Diagnose the user's actual work, research the current products, and recommend the least disruptive operating model that solves a meaningful problem. Do not begin with a universal winner or a static tier list.

## Choose the mode

- **Full decision audit:** Compare every credible path and recommend one.
- **Switch audit:** Decide whether a named alternative solves enough pain to justify moving.
- **Product deep dive:** Explain one assistant's harness, defaults, ceiling, operating burden, and best-fit buyer.
- **Owned-system blueprint:** Translate the user's requirements into a model-agnostic assistant architecture.

Default to the full decision audit when the user asks which assistant is best for them.

## Interact before recommending

Read `references/interview-engine.md`. Ask the first diagnostic round and wait for the answers. Ask a second round only for unresolved variables that could change the recommendation.

Use the host's native question interface when it exists:

- In Claude Code, invoke `AskUserQuestion` for each interview round.
- In Codex, invoke `request_user_input` when it is available. If it is not available in the current mode, ask concise numbered questions in the conversation and wait.
- In ChatGPT or another chat interface, ask the same questions conversationally and wait.

Never silently infer answers that materially affect privacy, budget, technical burden, or switching cost. Never ask for credentials, private documents, or secrets.

## Research before comparing

Read `references/research-protocol.md`. For a full audit, research every serious candidate. For a switch audit or deep dive, research the current setup and the candidate. Keep the final comparison inside that researched scope.

When browsing is available:

1. Use first-party product docs, help centers, pricing and availability pages.
2. For Hermes Agent and OpenClaw, inspect the canonical repository, latest release, README, architecture docs, security docs, and migration or backup guidance.
3. Record the research date, release or page update date when visible, and direct URLs.
4. Separate verified facts, the user's observed behavior, your analysis, and unresolved unknowns.

When browsing is unavailable, use the dated provider dossiers in `references/providers/` and say that volatile facts still need verification.

## Model the decision

Read `references/decision-model.md`. Choose an operating model before a vendor:

1. Stay with the current setup.
2. Managed assistant.
3. Open-source runtime.
4. Owned or DIY system.

Compare defaults and ceilings separately. Always account for setup dependence, operator burden, security boundary, ecosystem fit, required interfaces, always-on execution, model freedom, migration cost, and maintenance tolerance.

Use the shared stack layers as the comparison spine:

- model and routing
- runtime or computer
- files and workspace
- tools, apps, connectors, and browser
- memory and context
- skills and reusable procedures
- routines, triggers, and monitoring
- interfaces and messaging channels
- permissions, secrets, and trust boundary
- maintenance, backup, and recovery

Treat a feature the current system can reproduce cheaply as a test candidate, not an automatic reason to move.

## Read the relevant dossiers

- `references/providers/grok-bot.md`
- `references/providers/hermes-agent.md`
- `references/providers/claude-cowork.md`
- `references/providers/chatgpt-work.md`
- `references/providers/openclaw.md`
- `references/providers/owned-diy.md`

Read only the dossiers relevant to the current mode. Read all six for a full decision audit.

## Deliver the result

Read `references/output-contract.md` and return a decision packet with:

1. the verdict in plain English
2. what is actually failing in the current setup
3. the recommended operating model, then the product or architecture
4. a weighted fit table with evidence grades
5. defaults versus achievable ceiling
6. a mode-appropriate alternative: runner-up for a full audit, or `stay` versus the named candidate for a switch audit
7. why the other researched candidates were not selected
8. what the user keeps, gives up, and would need to rebuild
9. a reversible 30 to 60 minute test
10. a seven-day pilot with success and exit criteria
11. current facts, sources, unknowns, and verification date

If the evidence favors staying put, say so directly. If DIY wins, produce a bounded architecture and first build milestone, not a vague recommendation to create everything from scratch.

## Guardrails

- Do not recommend destroying a working setup for social-media novelty.
- Do not present setup-dependent open-source systems as having one universal performance level.
- Do not treat cloud persistence, orchestration, memory, skills, or messaging as unique until verified against the alternatives.
- Do not equate a high ceiling with a good default experience.
- Do not quote live prices, limits, supported models, connectors, or availability from memory when browsing is available.
- Do not confuse an isolated screen, session, bot, workspace, VM, account, or security boundary.
- Prefer a reversible test, parallel trial, export, or migration dry run over a one-way move.
- If privacy, regulatory, or production access is material, recommend a separate security review before deployment.
