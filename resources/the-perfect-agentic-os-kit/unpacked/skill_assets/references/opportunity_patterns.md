# Opportunity Patterns

Pattern-matching from data shape → recommended Claude Code primitive. The interview applies these heuristics to the assembled data map and emits opportunity entries. Based on real consulting call patterns.

---

## Pattern: operator hand-aggregates weekly numbers from multiple sources

**Detection:** Operator answered "I open three or four spreadsheets each Monday to figure out [metric]."

**Recommendation:**
- Skill: `ingest_{source}_export` for each source
- Skill: `assemble_{domain}_weekly` that joins the sources into a silver platter
- Subagent: `{role}_bot` that reads the silver platter
- Slash command: `/weekly_{domain}` that drives the chain

**Estimated impact:** 1-3 hours/week reclaimed; consistency across weeks.

---

## Pattern: operator routes feedback / requests between teams manually

**Detection:** Operator said anything like "I'm the human router" / "tickets pile up in Slack" / "I forward emails to the team."

**Recommendation:**
- Subagent: triage orchestrator (chief-of-staff)
- Skill: `cluster_themes` that dedupes and groups
- Hook: `PostToolUse audit_action.sh` for every routing decision
- Optional: `Stop` hook warning if a draft is pending review at session end

**Estimated impact:** 5-15 hours/week reclaimed; pickup latency drops dramatically.

---

## Pattern: operator approves outbound communication manually (and should keep doing so)

**Detection:** Operator named regulated outputs (legal letters, insurance appeals, billing entries, customer-facing replies, financial reports).

**Recommendation:**
- Subagent: drafter that writes to `outputs/{type}_drafts/`
- Hook: `Stop` warn-if-unsigned that nudges the operator if a draft sits unacknowledged
- Audit log entry per draft

**Estimated impact:** Approval gate becomes deterministic; nothing ships without a human ack.

---

## Pattern: cross-domain data needs to be walled

**Detection:** Operator named regulated content (PHI, matter content, hedge-fund positions, customer PII).

**Recommendation:**
- Rule: `rules/{domain}_scoping.md` with `paths:` frontmatter
- Folder structure: domain-namespaced under `data/{domain}/`
- Specialist subagent: only one allowed cross-domain access (e.g., billing-appeals can read both clinical + billing for the appeal pathway)

**Estimated impact:** Required for compliance — not a productivity gain, a non-negotiable.

---

## Pattern: operator drowns in raw documents (PDFs, DOCXs, EMLs)

**Detection:** Operator said anything like "we have a folder of pleadings" / "I get PDFs from vendors" / "every refund is an email chain."

**Recommendation:**
- Folder: `data/raw_dropzone/`
- Hook: `SessionStart convert_dropzone.sh` (PDF → md, DOCX → md, XLSX → md, EML → md)
- Folder: `data/converted/` for the agent to read

**Estimated impact:** Removes a hard blocker. Without conversion, the agent literally cannot read the operator's docs.

---

## Pattern: operator lacks a single Monday-morning view

**Detection:** Operator answered "no" to "do you have a weekly view?"

**Recommendation:**
- Skill: silver-platter generation across each domain
- Slash command: `/morning_brief` that compiles all silver platters into one read
- Output: `outputs/morning_briefs/<date>.md`

**Estimated impact:** Single source of truth for the operator's day; replaces 30-60 minutes of dashboard-hopping.

---

## Pattern: operator has expensive specialist time spent on repetitive drafting

**Detection:** Operator named a specialist activity that repeats (deposition prep, insurance appeals, weekly P&L narratives, time-entry narratives).

**Recommendation:**
- Subagent: specialist drafter scoped to that activity
- Skill: ingest the source data needed for the draft
- Approval gate: human review before circulation

**Estimated impact:** Specialist time reduced 60-80%; quality stays even or improves because the drafter follows a consistent template.

---

## Pattern: operator has untapped customer-voice signal

**Detection:** Operator said anything like "we have surveys but nobody reads them" / "Pendo dumps responses we never look at" / "customer call transcripts pile up in Otter."

**Recommendation:**
- Skill: `cluster_themes` that groups responses into 3-5 themes weekly
- Silver platter: `customer_voice_<week>.md`
- Subagent: `customer_voice_distiller` or fold into CMO/PM bot
- Verbatim quote pull (always quote the customer, not the cluster name)

**Estimated impact:** Surfaces churn risk and product opportunities the operator was missing.

---

## Pattern: operator considers a SaaS but loses signal in the dashboard

**Detection:** Operator said "I have all this data in [Pendo / Mixpanel / etc] but I don't know what to look at."

**Recommendation:**
- Skill: pull the relevant cuts via the platform's API into a silver platter
- Subagent: domain-specialist that reads the platter
- Slash command: `/{domain}_weekly` that triggers the chain

**Estimated impact:** Replaces aimless dashboard browsing with a directed weekly view.

---

## Pattern: operator runs an existing automation (Zapier / n8n / cron)

**Detection:** Operator named existing tooling that "kind of works."

**Recommendation:**
- Audit the existing automation. Is it doing the right thing badly, or the wrong thing well?
- Often: the existing automation pulls raw data but doesn't summarize. Suggest adding a silver-platter generation step on top of the existing pipeline.
- Sometimes: the existing automation should be retired in favor of a Claude Code skill (more flexibility, fewer moving parts).

**Estimated impact:** Don't rebuild what works. Augment.

---

## Pattern: operator has a CLI available but isn't using it

**Detection:** Cross-reference `references/cli_inventory.md`. If a wrapped Claude skill exists for a tool the operator uses, but they don't know about it.

**Recommendation:**
- Direct install: `cp -r ~/.claude/skills/{skill_name} ~/.claude/skills/` (if not already there)
- Add the skill's slash command to their workflow

**Estimated impact:** Quick win — minutes to install, immediate productivity.

---

## Pattern: opportunity to write a NEW skill (CLI exists but no wrapper)

**Detection:** Cross-reference `references/cli_inventory.md`. CLI is available but no Claude skill wraps it yet.

**Recommendation:**
- Skill-writing opportunity flagged
- Hand off to `@claude-code-guide` agent or to the operator if they're technical
- Note: this is a generic future investment, not a per-operator must-do

**Estimated impact:** Strategic — adds a new tool to the Claude Code ecosystem.

---

## Pattern: opportunity to write a custom API skill (no CLI, no wrapper)

**Detection:** Cross-reference `references/cli_inventory.md`. No CLI exists. Direct API integration needed.

**Recommendation:**
- Custom skill that authenticates and calls the API
- Token / API key in `~/.env`
- Bigger investment than CLI wrapping (100-200 lines of Python)

**Estimated impact:** Required to access the data at all. Scope first; build only if the data is high-value.

---

## How OPPORTUNITIES.md groups these

The rendered `OPPORTUNITIES.md` clusters opportunities by Claude Code primitive AND by priority:

```markdown
# Opportunities — {business name}

## Data engineering work first (the 80%)

These come BEFORE the AI layer:

1. {summary_table opportunities, sorted by data volume}
2. {namespacing opportunities for cross-domain data}
3. {conversion_hook opportunities for unstructured docs}
4. {automate_extraction opportunities}

## Skills to write

{skill_writing_opportunity entries, sorted by tool centrality}

## Subagents to scaffold

{subagent recommendations from the agent_hierarchy heuristics in archetypes.md}

## Hooks to wire

{hook entries — typically the standard 3: SessionStart converter, PostToolUse audit, Stop warn-on-unsigned}

## Path-scoped rules to add

{path_scoped_rule entries}

## CLIs you can install today

{wrapped skills the operator doesn't have but could quickly add}

## Deferred (lower priority)

{vendor_lockin_warning entries, low-value skill_writing opportunities}

## Next step

{handoff prompt path}
```
