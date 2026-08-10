# Setup Priority Template

The 30-day build plan. Universal 5-step structure with archetype-specific tweaks. Always render Step 0 (install Claude Code) automatically in the template, so the persona file only contains steps 1-5.

## Step schema (locked)

Every step in `setup_priority` MUST have ALL of these fields:

```json
{
  "step": 1,
  "title": "Internal short title",
  "title_friendly": "Plain-English title an operator reads. Outcome-shaped.",
  "requires": "Step N done, so the X is in place. (omit on Step 1)",
  "what_to_do": "2-3 sentence prose. The action + the why-it-matters in one breath.",
  "why": "1-2 sentence explanation of why this step is gated here in the order.",
  "install": "Multi-line code block. Real commands. Comments allowed.",
  "before": "1-sentence status quo, with a real artifact",
  "after": "1-sentence after-state, with a real artifact",
  "working_when": "1-2 sentence concrete sanity check the operator can run themselves",
  "setup_time": "Plain-English time estimate. e.g. 5 minutes OR 1-2 weekends DIY OR ~1 day with @claude-code-guide handoff"
}
```

The template auto-renders Step 0 (install Claude Code), so DO NOT add a Step 0 to the persona file. Numbering starts at Step 1.

## The universal 5-step skeleton

### Step 1, conversion hook (the dopamine-hit step)

This step ALWAYS goes first regardless of archetype. It removes the "Claude can't read this" wall for every messy file the operator has. 5 minutes of work, instant payoff.

- **title:** "Wire the conversion hook"
- **title_friendly:** "Make Claude read your messy files (PDFs, emails, spreadsheets)"
- **install:** drop the SessionStart hook into `.claude/settings.json`, install pandoc + poppler + xlsx2csv. Hook converts anything in `data/raw_dropzone/` into markdown in `data/converted/`.
- **working_when:** drop a sample messy file in `data/raw_dropzone/`, restart the session, watch the .md appear in `data/converted/`.
- **setup_time:** 5 minutes

### Step 2, the silver platters

This is where the 80% lives. Without these, every agent below has nothing to read. Per archetype, the platters differ:

| Archetype | Silver platters |
|---|---|
| ecommerce | finance_weekly, marketing_weekly, ops_weekly, customer_voice_weekly |
| saas | feedback_themes, churn_root_cause, product_roadmap_signal, support_volume |
| professional_services | matter_briefs (per matter), billing_summary, post_mortem_lessons |
| healthcare_clinic | intake_pipeline, lab_review, billing_reconciliation, insurance_appeal_status |
| wealth_advisory | positions_weekly, theses_weekly, risk_breaches_log |
| content_creator | content_signal_weekly, monetization_weekly |
| restaurant_multilocation | daily_close, weekly_food_cost, staff_schedule_signal |
| real_estate_brokerage | active_deals_weekly, mls_signal_daily |
| local_trades | dispatch_daily, quote_pipeline_weekly |

- **title_friendly:** "Build your Monday-morning briefs (one per business area)"
- **requires:** "Step 1 done, so the raw files are readable."
- **install:** write one ingest skill per source + one master `/weekly_silver_platters` slash command. Schedule via cron Monday 6am (or appropriate cadence).
- **working_when:** Monday at 6:01am, you can `ls silver_platters/` and see the files dated this week, and reading any of them out loud sounds like a useful brief.
- **setup_time:** 1-2 weekends DIY OR ~1 day with @claude-code-guide handoff (recommend the handoff for non-developers)

### Step 3, the orchestrator + specialists

Chief-of-staff agent + 3-4 domain specialists. Specialists are scoped to one silver platter each. The chief-of-staff routes the operator's free-text questions to the right specialist.

| Archetype | Orchestrator | Specialists |
|---|---|---|
| ecommerce | EA Orchestrator | CFO Bot, CMO Bot, Ops Bot |
| saas | Triage Orchestrator | Customer-Voice Distiller, Codex Fix Drafter, Root-Cause Analyst |
| professional_services | Case-Launch Orchestrator | Deposition Prep Specialist, Billing Assistant, Post-Mortem Distiller |
| healthcare_clinic | Care Coordinator Orchestrator | Intake-Prep Specialist, Lab Result Summarizer, Billing-Appeals Specialist |
| content_creator | EA Orchestrator | CMO Bot, Editorial Bot, Monetization Bot |
| wealth_advisory | IC Orchestrator | Risk Bot, Research Bot, LP-Letter Drafter |
| restaurant_multilocation | Ops Orchestrator | Daily-Close Bot, Food-Cost Bot, Schedule Bot |
| real_estate_brokerage | Deal Orchestrator | Listing Bot, Buyer-Match Bot, Closing Bot |
| local_trades | Dispatch Orchestrator | Quote-Followup Bot, Daily-Dispatch Bot, Service-Plan Bot |

- **title_friendly:** "Hire your AI chief of staff (and three department heads)"
- **requires:** "Step 2 done, the silver platters are what these specialists read."
- **install:** write under `.claude/agents/`, one orchestrator (model: opus) + N specialists (model: sonnet, each scoped to one silver platter).
- **working_when:** Ask the orchestrator a freeform question that spans domains (e.g. "how did we do last week?"), it returns ONE paragraph pulling from multiple silver platters. If it asks you which file to look at, scoping is wrong.
- **setup_time:** 1-2 hours total

### Step 4, audit log + approval gates

The trust layer. PostToolUse hook captures every Edit/Write to `outputs/audit_log.md`. Stop hook nudges if a draft is unsigned at session end.

- **title_friendly:** "Add receipts and a sign-off nudge (the trust layer)"
- **requires:** "Step 3 done, so the agents you're auditing actually exist."
- **install:** templates in `business_os_hooks.md`. Paste 3 hook entries into `.claude/settings.json`, chmod +x the scripts in `.claude/hooks/`.
- **working_when:** open `outputs/audit_log.md` after a session, every Edit and Write appears with a timestamp. End a session with an unsigned brief, the Stop hook prints a coral warning before Claude exits.
- **setup_time:** 10 minutes (hooks are pre-written)

### Step 5, slash commands

Turn weekly motions into one-keystroke triggers. Per archetype, the slash commands differ.

- **title_friendly:** "Turn your weekly motions into one-keystroke plays"
- **requires:** "Steps 2 and 3 done."
- **install:** write under `.claude/commands/`, one command per recurring motion. The command body chains agents and silver platters from Steps 2 and 3.
- **working_when:** type `/weekly_<thing>` at the right time, the brief lands in `outputs/` within 60 seconds without typing anything else.
- **setup_time:** ~30 minutes for all of them

## Regulated archetypes, lock the model first (insert at position 1)

For `healthcare_clinic`, `professional_services` (law firms specifically), AND `wealth_advisory`, INSERT a model-lockdown step at position 1 (renumber the rest). The data_map is unusable until this is done — every step that reads regulated data depends on it.

**Per archetype, the framing differs but the technical step is the same:**

| Archetype | Title | Title_friendly | Compliance frame |
|---|---|---|---|
| healthcare_clinic | "Lock Bedrock 3P Claude + sign the BAA" | "Get the HIPAA-compliant Claude turned on (BAA + Bedrock)" | "PHI cannot leave your tenant" |
| professional_services | "Lock Bedrock 3P Claude for matter content" | "Get the matter-walled Claude turned on (Bedrock)" | "Matter content cannot leave your tenant. Reg ABA/SRA/your state bar still applies." |
| wealth_advisory | "Lock Bedrock 3P Claude for client + position data" | "Get the compliance-defensible Claude turned on (Bedrock)" | "Client data, position tape, and personal-trade attestations cannot leave your tenant. Reg BI + custody rules still apply. Your CCO will ask 'where does this data go' — Bedrock is the answer that passes." |

- **install:** AWS Bedrock 3P Claude config + BAA signed with Anthropic. The community deep-dive (the community) has the IT-committee FAQ + sample compliance memo.
- **working_when:** opening Claude Code, you see the Bedrock model in the model picker, NOT the public anthropic.com model. Run `claude config get model` from Terminal — output should include `bedrock`.
- **setup_time:** 1-2 weeks for healthcare/law (legal + IT). 3-5 days for solo RIA (CCO sign-off + AWS account setup).

**If the operator volunteers their archetype is regulated but doesn't have AWS exposure, surface the AWS-account-setup gap explicitly.** The skill should NEVER tell a regulated operator to start Step 1 (conversion hook) before the model is locked.

## Healthcare extras

For `healthcare_clinic`, add a Step 6 after the universal 5:

- **title_friendly:** "Lock the PHI-scoping rule"
- **requires:** "Step 1 done."
- **install:** drop `rules/phi_scoping.md` with `paths: [data/clinical/**, data/intake/**]`. Always-on rule. Agents in non-clinical contexts physically cannot load PHI.
- **working_when:** ask the billing assistant "show me a clinical note", it refuses (or says "out of scope").
- **setup_time:** 30 minutes

## Multi-tenant scoping (multi-location, multi-agent, multi-provider)

If the operator runs a business with multiple internal tenants (Tony with 3 pizzeria locations, Marisol with 12 real-estate agents, Dr. Mehra with 6 providers), you MUST surface the per-tenant scoping pattern in Stage 5 and bake it into Step 4 of the build plan. Without this, the data_map renders flat (one DoorDash card for 3 stores; one pipeline for 12 agents) and is structurally lying to the operator.

**Trigger heuristic in Stage 5:**
- If `business.location_count > 1` (restaurant_multilocation, real_estate_brokerage with team > 3, healthcare_clinic with > 1 provider, local_trades with > 5 techs): trigger the per-tenant tip.
- Plain-English tip: *"Your stack runs in N places (3 stores / 12 agents / 6 providers). The agent should see the right slice for whoever asked. We'll set up a per-tenant rule so each {location/agent/provider} only reads their own data."*

**Per-archetype scoping pattern:**

| Archetype | Path scope | Rule file | Why |
|---|---|---|---|
| restaurant_multilocation | `data/locations/{location_id}/**` | `rules/per_location.md` | Store managers see only their store. Owner sees all. |
| real_estate_brokerage | `data/agents/{agent_id}/**` | `rules/per_agent.md` | Agent A cannot read Agent B's pipeline. Broker sees all. |
| healthcare_clinic | `data/providers/{provider_id}/**` | `rules/per_provider.md` (in addition to `phi_scoping.md`) | Provider sees only their panel. Office-wide views via aggregate platters. |
| local_trades | `data/techs/{tech_id}/**` | `rules/per_tech.md` | Tech sees only their dispatch. Owner sees all. |
| wealth_advisory | `data/clients/{client_id}/**` + `data/personal_trades/{advisor_id}/**` | `rules/per_client.md` + `rules/personal_trade_scoping.md` | Client A cannot read Client B's positions. Personal-trade pre-clears never cross to general workflow. |

**This becomes a SUB-STEP in Step 4 (audit log + approval gates)**: "Wire the per-tenant rule alongside the audit log."

**Render in the data map:** If `location_count > 1`, the renderer should fan pantry items out into N stacked cards (per location). Today the template doesn't support this; for now, the data_map's pantry cards should show a "× 3 locations" / "× 12 agents" badge when `business.location_count` is set.

## Build process

When Stage 6.6 of the interview asks "what's the priority order?", do this:

1. Start with the universal 5 steps for the archetype.
2. If healthcare or law, insert the Bedrock step at position 1.
3. Customize each step's `requires` and `working_when` to mention the operator's actual silver platters and bots from the data map (e.g. "open `silver_platters/finance_weekly_W44.md`" not "open the silver platter file").
4. Customize `install` to reference the operator's actual stack (their Shopify store URL, their domain name, their existing skills).
5. Customize `before` and `after` with the operator's actual artifact names.
