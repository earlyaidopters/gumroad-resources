# os-blueprint.md

> Revisit: when my operation changes (a new client type, a new layer earned, a refused thing I now allow). Last touched: 2026-06-15.

This is the single source of truth for my agentic OS. The interview wrote it from my own answers, in plain English, before a single file was built. I read it, I corrected it, I confirmed it. The build workflow scaffolds from this file. The maintenance workflow checks the live OS back against this file every week. Same artifact, from setup to upkeep. If the running OS ever disagrees with this page, this page is the intent and the drift gets flagged.

The one rule that governs everything: grow inside out. Start at the core, which is who this OS is, and only add an outer layer once real usage has earned it. The deeper the layer, the slower it should ever change. Everything is plain files and folders so it stays portable and my data stays in readable local files, never trapped in one vendor.

The one rule that keeps it alive: nothing here is finished. The core barely moves, the edge breaks weekly. Every file that can go stale carries a `Revisit:` line, and a monthly job (`maintain-os`) walks those dates and interviews me to refresh what has rotted. A system that is never maintained is the reason these things fall apart after a month.

---

## Operation, in one paragraph

I am a Fractional CFO running a solo practice. I am the entire finance function for founders who are too big for a bookkeeper and too small for a full-time CFO. Eight clients at a time, bootstrapped and founder-led, roughly $500K to $5M in revenue, a mix of five US LLCs and three German GmbHs, so I live in two accounting worlds at once. What they pay me for is to stop worrying about money. The OS is my staff. Its whole job is to help me close clean, keep cash honest, and turn numbers into a decision a non-finance founder can act on, while never once letting one client's data touch another's.

---

## Layer 1, Identity (the core, changes over months)

The soul file, `CLAUDE.md`. It holds my point of view, who I serve, my defaults, and the things I flat out refuse to do.

- **Point of view.** Finance is a translation job. Cash is the truth, the P&L is the story. One source document per number. Slow is smooth. Every client is a sealed box. Upkeep is a cadence.
- **Standard.** Plain-English finance for people who never trained in it. If a sentence needs a finance degree to read, I failed.
- **The headline refusal.** I never roll up, blend, or compare numbers across clients. This is the spine of the whole practice and it is enforced again at the rules layer, by a pre-send hook, and by a pre-commit hook.
- **Other refusals.** No number without a source. No legal or formal tax advice, I prepare and flag for the CPA or Steuerberater. No client figure leaves the machine into anything public. No accrual presented as recurring cash. No overwriting a locked period.

Build first. Everything else is downstream of this file.

## Layer 2, Rules and Hooks (the guardrails, changes over weeks)

Black-and-white constraints, plus reflexes that fire on their own. Unlike `my-os`, these hooks are wired to fire automatically from `.claude/settings.json`, not left as run-by-hand scripts.

- **`always.md`** states currency and period on every number, backs every figure with one named source, writes client-facing output in plain English, leads with cash and runway then the P&L story, keeps each client in its own context, logs every wiki ingest, surfaces both options when two treatments are valid, rounds for narrative and keeps exact in the workings, and runs a second pass on anything a client relies on.
- **`never.md`** mirrors the identity refusals so the constraint is enforceable at the rules layer, sealed box first.
- **Hooks, four reflexes.**
  - `session-start-brief` reads the tail of the wiki log and tells me where I left off.
  - `pre-send-name-check` reads any outgoing draft and blocks the send if a second client's name appears in a single-client document.
  - `period-completeness-check` refuses to write a close or a VAT position if a required input is missing, for example a GmbH VAT report missing its reverse-charge reconciliation, or a close missing the bank statement. Deterministic, fires every time, the way the HST guard does in my real practice.
  - `pre-commit-pii-guard` blocks a git commit if a client figure, name, or raw source file is staged, so client data cannot leave the machine into history even by accident.

## Layer 3, Skills (the verbs, changes over days to weeks)

Workflows I have done by hand enough times that they earned a named command. Roughly three repeats and it deserves a name. Only genuinely earned skills, no inventions, and no two skills that overlap. Four, no more, until a fifth is clearly earned.

- **`monthly-close`** the verb I run most. Closes exactly one client for exactly one period, reconciles bank to books, flags anything unsupported, cash and runway first then the P&L story, mandatory adversarial second pass, then lock the period.
- **`vat-check`** the verb before every filing window. Confirms the regime, German VAT for the GmbHs, US state sales tax for the LLCs, reconciles collected versus owed, flags the edge treatments for the signer. Prepares, never files.
- **`investor-update`** the verb right after a close. Turns a locked close into a board-ready narrative in the founder's voice, or a lender covenant note where the client has a bank instead of investors. Draft only, the founder owns and sends.
- **`maintain-os`** the verb that keeps the OS alive. Monthly, it walks the `Revisit:` dates, then interviews me with multiple-choice questions to refresh whatever has rotted, so upkeep happens to me instead of waiting on me.

## Layer 4, Agents (the roles, changes over days)

A role holds judgment and orchestrates skills. A skill is a verb, an agent is a person with a job. I started with zero. I have one now, because I was clearly spawning it by hand every Monday.

- **`client-portfolio`** my Monday-morning strategist. Walks the full roster one sealed box at a time, decides what each client needs this week, reaches for the right skill per client, and ships a one-page brief of where my attention goes. It spawns one worker subagent per client with a clean context, then an adversarial review subagent that must clear the brief, checking that no client's section contains a trace of another, before it reaches me.
- **The next agent is named, not built.** `4_agents/when-the-next-agent-is-earned.md` describes the filing-season agent I will promote when filing windows start colliding, and why it does not exist yet. Discipline is the point: you do not hire a role for the sake of it.

## Layer 5, Tools, MCPs, CLIs (the wires, changes by the hour)

The wires out to my real software. They break fastest, so they are built last, wrapped in skills, never married. `connections.md` maps what each connection would touch and the narrowest read-only scope it needs, with a per-source decision on whether a skill, a CLI, or an MCP is the path of least resistance. `cli/books` is a real, runnable, read-only wrapper that proves the pattern against sample data. Zero credentials, keys, or tokens anywhere in this repo, ever. `.claude/settings.json` suffocates every financial CLI to read-only, so even a confused agent cannot write to the books.

## Substrate (the compounding memory, grows, does not rot)

The `.wiki` folder under all five layers. Instead of re-reading raw documents on every query, the OS keeps a living wiki that gets richer over time.

- **The parts.** `sources/` raw documents read but never edited and their extracted md, `entities/` one sealed page per client, `concepts/` the shared method pages, `compendium_finance.md` the one distilled house reference, `subject-matter-expertise/` distilled standards notes, `handoff/` mined TLDRs, `schema.md` the rulebook, plus `index.md`, `log.md`, and `expiry.md`.
- **The sealed-box rule holds here too.** Every entity page belongs to exactly one client. Concepts carry method, never a client's private numbers.
- **Seeded for real, not stubbed.** All eight clients have full entity pages, several with extracted source data carrying concrete figures, seven concept pages, the compendium, the standards notes, and example handoffs. Drop a new real document into `sources/raw/` and say "ingest the wiki" to grow it.

---

## What to build first versus later

1. **Now, the core.** `CLAUDE.md`, then `always.md` and `never.md`, then the four hooks wired in `.claude/settings.json`. The boundary has to exist before anything reads a second client.
2. **Now, the four earned skills and the one agent.** These are already real verbs and a real role I run by hand.
3. **Now, seed the wiki** with the schema, all eight clients, the concepts, the compendium, and example sources so the substrate is real, not empty folders.
4. **Now, the upkeep loop.** `maintain-os`, `expiry.md`, `ROT.md`, and the monthly schedule, so the OS maintains itself from day one instead of rotting silently.
5. **Next step, developer.** Live-wire the Tools layer connection by connection, narrow scope first, only when a skill actually needs it.
6. **Later, only when earned.** The second agent, more skills, more hooks. Each one waits until I have done it by hand enough times that a name is obvious.

---

## Backups and ownership

The OS is plain files, so it is portable by default, but portable is not the same as backed up. Two copies, always. A private Git repo, never a public one, with the pre-commit PII guard and the `.gitignore` keeping client data out of it, plus a second local copy on an external drive refreshed by a cron, so a dead laptop is an inconvenience and never a loss. The data lives in readable local files I own, not inside one vendor's product, which is the whole point. If the tool I use to drive the OS vanished tomorrow, the OS would still be here.

## Confirmation

I read this back, corrected it, and confirmed it. This is what the OS should be. Build from here, and check back against here.
