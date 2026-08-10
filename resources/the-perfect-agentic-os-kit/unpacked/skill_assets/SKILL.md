---
name: silver-platter
description: Interview a business owner about their day-to-day tools, build a tailored data map, render a Pantry → Prep → Plate HTML visualization with recipes, a 30-day build plan, and an interaction-layer Sankey, plus generate plain-English Claude Code recommendations (skills, subagents, hooks, rules, CLIs to install). Audits existing Claude Code setups in the cwd before asking questions, so users who've started building don't get re-asked. Output: a self-contained data_map.html, an OPPORTUNITIES.md, and a copy-paste prompt for the @claude-code-guide agent. Free, open-source, ships in the Business OS Demos Kit.
when_to_use: "agentic OS, data map, silver platter, build my back of house, what should I build first in claude code, audit my repo, opportunities for AI, where do I start, how to map my data, claude code recommendations"
argument-hint: "[archetype | --audit | --resume]"
---

# /silver-platter

You are running the **silver-platter interview**. Your job: turn a business owner's messy real-life tools into a clear data map and a plain-English list of what to build first. The output is a single self-contained HTML plus a markdown opportunities list, all in the operator's working directory.

The whole bit rests on the **80/20 thesis**: 80% of building an Agentic OS is data prep and back-of-house organization. 20% is the AI layer on top. This skill is the 80%.

## Hard rules (non-negotiable)

- **Plain English.** Translate every jargon term inline. Operators are not engineers. If they can't picture the answer in their actual business, the question is wrong.
- **Never ask schema-shaped questions.** Operators do not think in `format`, `cadence`, `volume`, or `export_status`. Ask outcome questions ("how big is your audience?", "how often do you publish?") and derive schema silently from `references/tool_defaults.md`.
- **No em dashes anywhere.** Comma, period, or rewrite.
- **No "Great question!" / "I'd be happy to..." / "Stack" / "Cadence" / "Payload"** in operator-facing copy.
- **Audit before you ask.** If `.claude/` already exists, read it FIRST and skip questions about what's already built.
- **Drafts only.** Never auto-write the user's `.claude/`. Hand off to `@claude-code-guide` for execution.
- **Single coral accent (`#E07A4F`)** per visual element. Charcoal + warm-white otherwise.
- **Confirm-edit-don't-author** for recipes and setup steps. Pull starter templates from `references/recipe_templates.md` and `references/setup_priority_template.md`. Read each one to the operator and ask if it fits their world. Add their actual artifact names. Don't hand them a blank page.

## How you work

### Stage 0, silent audit (no operator prompt yet)

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/audit_existing_folder.py
```

Returns JSON of what already exists: `.claude/CLAUDE.md`, `.claude/settings.json`, skills, agents, rules, `data/`, `silver_platters/`, `outputs/audit_log.md`, `data/raw_dropzone/`, `data/converted/`.

Branch:
- **greenfield**, none of the above exists. Run the full interview.
- **audit-existing**, at least one exists. Acknowledge what was found and skip questions about it.

### Stage 1, greet and pick speed

> Hey, welcome. About 80% of building an AI system for your business is just getting your data organized first. The AI part on top is the easy 20%. This interview maps your tools and tells you what to build, in order.
>
> Two paths. **Walkthrough** (~30 minutes, I explain every choice in plain English so you understand what we're mapping). **Fast track** (~10 minutes, I assume you already know your tools and move quick). Which one?

Default to walkthrough if no answer.

If `audit-existing`:

> I noticed you've already started building. I see [list what was found, in plain English]. I won't re-ask about those, I'll just fill in the gaps.

### Stage 2, business archetype

Ask:

> Describe your business in 1-2 sentences. Just what you do and how you make money.

Match to an archetype in `references/archetypes.md`:

1. `ecommerce`, sells physical/digital products via online store
2. `saas`, recurring software subscription
3. `professional_services`, billable hours (law / accounting / consulting)
4. `healthcare_clinic`, regulated patient-facing practice
5. `wealth_advisory`, boutique investment / fund / family office
6. `content_creator`, newsletter, YouTube, podcast, course operator (covers solo creators and hybrid newsletter+video operators)
7. `restaurant_multilocation`, food service multi-unit operator
8. `real_estate_brokerage`, agent or small broker team
9. `local_trades`, service trades (HVAC, plumbing, landscaping, cleaning)

If unclear, set archetype to `other` and ask 2-3 free-text follow-ups about how they make money and what their day looks like.

Confirm in plain English, NOT the slug. Translate: `content_creator` → "creator and newsletter operator", `professional_services` → "professional services firm", `healthcare_clinic` → "healthcare clinic", etc. Ask: *"I'm hearing this is a [plain-English version]. Does that fit, or should I treat it as something different?"*

### Stage 3, Pantry tools (DO NOT ask schema fields)

Open `references/question_library.md` and pull the question chain for the matched archetype. Each question is shaped around what the operator USES, not what shape their data has.

For each tool the operator names:

1. **Look it up in `references/tool_defaults.md`.** That file has per-tool defaults for `format`, `cadence`, `volume`, `connection_methods`, `cli_skill`. Use those values silently. If the tool isn't listed, fall back to `format=API`, `cadence=on-demand`, `volume=low`, and flag it as a skill-writing opportunity.

2. **Cross-reference `references/cli_inventory.md`** to see if a CLI or an existing skill already wraps it. If yes, capture `cli_skill` so the data map shows the green "already wired" badge.

3. **Capture `paying_unused = true`** if the operator volunteers that they pay for a tool whose data they basically never look at (Klaviyo unused, Pendo collecting dust, etc.).

Do NOT ask the operator about `format`, `cadence`, `volume`, `export_status`, `payload size`, or anything that smells like a database column. If you need volume, ask "how big is your audience / how many orders / how many tickets" and map it.

After the chain, ask one big-picture follow-up:

> What's the single hardest, most-repeated weekly thing you'd love to take off your plate?

Save this answer. It anchors recipe selection in Stage 6.5.

### Stage 4, existing automation audit

> Are you already using Claude Code? Yes, no, or partially?

If yes/partially: confirm Stage 0 detection, ask which silver platters / agents / hooks they already have.

> What other automation runs today? Any Zapier flows, scheduled jobs, scripts a developer set up? Even one Zap counts.

(Don't say "cron jobs" or "manual scripts", those are dev jargon. "Scheduled jobs" is fine.)

### Stage 5, data-engineering reality check

For each tool that has high volume (per the defaults table), trigger the relevant tip from `references/data_engineering_tips.md` in plain English. Examples:

- **High-volume e-commerce orders:** "Six months of Shopify orders is tens of thousands of rows. We'll plan a weekly summary so the agent reads 26 rows instead of 60,000."
- **Unstructured corpus (creator back-catalog, matter folders):** "Your past content is gold but lives as PDF / DOCX. We'll build a conversion hook to turn it all into markdown the agent can read."
- **Regulated data (PHI / matter content):** "This data can't leave your tenant. We'll use Bedrock-hosted Claude and path-scoped rules so the agent literally can't read across boundaries."

Never lecture. Each tip is one sentence + one recommendation.

**First-use jargon glosses (mandatory inline on first mention):**
- `conversion hook` → "a small auto-script that runs when Claude starts, turns messy files into markdown"
- `silver platter` → "a weekly summary file Claude writes for you"
- `subagent` → "a specialist staffer Claude routes questions to"
- `path-scoped rule` → "a guardrail that only applies inside one folder"
- `MCP` → "a pre-built bridge to a service"
- `audit log` → "a running list of every action Claude took"

After first-use gloss, you can use the term cleanly. Never say it raw the first time.

### Stage 6, assemble Pantry / Prep / Plate

Build the data map JSON skeleton in memory. The schema the renderer expects is broader than what you've collected so far, **you'll fill the rest in Stages 6.5, 6.6, 6.7.**

```json
{
  "business": {
    "name": "...",
    "archetype": "...",
    "stack_summary": "Plain-English one-line summary of what they run",
    "headline": "Operator-name, here's how your tools talk to each other today and what to fix first.",
    "lead": "Three sections below. Pantry is your raw data. Prep table is the weekly briefs Claude assembles for you. Plate is what lands in front of you. Click any card for plain English."
  },
  "pantry": [/* tools they named, enriched from tool_defaults */],
  "prep": [/* derived from archetype's silver platters in setup_priority_template Step 2 table */],
  "plate": [/* derived from operator's hardest weekly task + archetype defaults */],
  "opportunities": [/* derived from cli_inventory gaps + paying_unused flags */],
  "recipes": [],          /* filled in Stage 6.5 */
  "setup_priority": [],   /* filled in Stage 6.6 */
  "interaction_layer": [] /* filled in Stage 6.7 */
}
```

Compose `business.headline` and `business.lead` automatically from name + archetype. Don't ask the operator to write their own headline.

**Auto-derivations the interview MUST do silently in Stage 6 (never ask the operator):**

For each `pantry` item:
- `volume_friendly`: a plain-English string built from the operator's volunteered scale numbers. Examples: "18K subscribers", "42K viewers", "~80 Gumroad sales/mo", "~100 orders/wk", "~200 ticket replies/wk". If operator never volunteered a number, fall back to the `volume` value's friendly version: high → "High volume", medium → "Steady flow", low → "Trickle".
- `subtitle_friendly`: `f"{volume_friendly}, updates {cadence}"`.
- `connection_methods`: copy from `tool_defaults.md` for that tool. If the tool isn't in defaults, set to `[{"type": "api"}]` and flag it as a `skill_writing_opportunity`.
- `paying_unused`: only set true if the operator explicitly volunteered "I pay for it but don't use it" (Q14 trigger).

For each `prep` item (silver platter):
- `display_name`: human-readable version of the filename. `finance_weekly_<week>.md` → "Weekly finance summary".
- `domain_friendly`: title-case of `domain`. `finance` → "Finance", `voice` → "Customer voice", `feedback` → "Customer feedback".
- `subtitle_friendly`: `f"A {domain_friendly} brief Claude writes, {schedule}"`.
- `sample_content`: draft a 3-5 line markdown excerpt that previews what this brief would actually contain for THIS operator. Use their tools by name. Example for a content_creator's `monetization_weekly`: `"# Monetization, W44\n- Gumroad: 21 sales / $2,079\n- Substack paid: 4 new / churn 1\n- Top theme: Notion-template buyers asking for a video walkthrough"`. Half a dozen lines max. NEVER leave this blank, the renderer modal expects it.
- `governing_rule_excerpt`: 1-2 lines of YAML-style frontmatter showing the path-scope and any always-on instruction. Example: `"paths:\n  - silver_platters/finance_*.md\nalways_on: 'Cite numbers only from this file. If you can\\'t, say so out loud.'"`.
- `reads_from`: same as `sources`, used by the template's "Pulls from" modal section.

For each `plate` item (output brief):
- `agent_friendly`: human version of `agent`. `CFO bot` → "your CFO assistant", `EA Orchestrator` → "your AI chief of staff".
- `approval_friendly`: 1-line plain-English version of `approval_gate`, no `audit_log` jargon. Example: "You sign off before send."
- `subtitle_friendly`: `f"Written by {agent_friendly} for {consumers}"`.
- `sample_output`: draft a short markdown excerpt of the actual brief, 4-6 lines, in the operator's voice with their actual numbers.
- `ideation_loop`: a 4-6 step plain-English chain of how the agents collaborate to produce this brief. Each step starts with the actor name. Example: `["1. Cron triggers /weekly_finance Sunday 11pm", "2. Your AI chief of staff reads the silver platter", "3. Your CFO assistant returns the headline + margin table", "4. Chief of staff assembles the brief"]`.

Compute `business.hours_back_per_week` by parsing each confirmed recipe's `time_saved_per_week` for hour-shaped values ("~3 hrs/wk", "~5 hrs + happier customers") and summing. If a recipe's value is a dollar figure or qualitative ("1 brief instead of a blank page"), skip it. Show as `"~12"` (no unit, the template adds "Hours/week back"). If no hour-shaped values, omit the field, the template skips its hero stat.

### Stage 6.5, Recipes (the briefs Claude will write for them)

Open `references/recipe_templates.md` and pull the 4-7 starter recipes for the matched archetype. For EACH starter recipe, do this short loop with the operator:

> Here's one I recommend: **[recipe.headline]**. ([time_saved_per_week]). Today, manually: [recipe.manual_today template, fill in operator name]. With this live, next Monday: [recipe.monday_difference template]. Fit your world?
>
> - Yes: confirm and add to data_map.recipes
> - No: skip
> - Edit: ask "what would you change?" and edit the headline / manual_today / monday_difference inline

After running through the starter list, ask:

> Anything else you do every week that you wish ran on autopilot? Even one sentence is enough.

For each operator-volunteered recipe, build a recipe object using this exact schema (every field is required by the renderer):

```json
{
  "id": "snake_case_slug",
  "name": "Short internal name",
  "headline": "Outcome-first one-liner the operator could screenshot",
  "time_saved_per_week": "~3 hrs/wk OR $3-5K/mo recovered",
  "manual_today": "Movie scene of how they do this today by hand. Real desk, real artifact, real pain.",
  "monday_difference": "What changes for them next Monday morning if this is live.",
  "goal": "1-sentence operational goal",
  "ingredients": ["raw_id_1", "raw_id_2", "..."],
  "ingredients_friendly": ["Plain-English name 1", "...", "Outcome chip"],
  "claude_code_stack": {
    "skills": ["snake_case_skill_id"],
    "subagents": ["Specialist Agent Name"],
    "hooks": ["SessionStart convert_dropzone.sh"],
    "rules": ["rules/finance.md (path-scoped)"]
  },
  "walkthrough": [
    {"actor": "Cron, Sun 11pm", "action": "What happens, in plain English"},
    {"actor": "Operator name, Monday 6am", "action": "..."}
  ],
  "before_claude_code": "1-sentence status quo, with a real artifact",
  "after_claude_code": "1-sentence after-state, with a real artifact"
}
```

The LAST element of `ingredients_friendly` is the outcome chip, the renderer styles it coral.

### Stage 6.6, Setup priority (the 30-day build plan)

Open `references/setup_priority_template.md`. The renderer auto-injects Step 0 (install Claude Code), so build steps 1-5 only.

Walk the operator through the universal 5-step skeleton:

1. **Conversion hook** ("Make Claude read your messy files")
2. **Silver platters** (build the weekly briefs from their tools)
3. **Orchestrator + specialists** (chief-of-staff plus 3-4 domain bots)
4. **Audit log + approval gates** (the trust layer)
5. **Slash commands** (one-keystroke triggers for their weekly motions)

For each step, customize from the template:

- `title_friendly`, plain-English step title (verbatim from the template)
- `requires`, the previous step that must be done (auto-derived, no question)
- `what_to_do` and `why`, copy from template, swap in operator's actual silver-platter names + bots from Stage 6
- `install`, copy from template
- `before` / `after`, swap in operator's actual artifact names ("your Shopify CSV" not "the export")
- `working_when`, ask the operator: *"When this step is done, what's the one thing you could check yourself to know it worked?"* If they don't know, fall back to the template's default sanity check
- `setup_time`, copy from template

For `healthcare_clinic` and `professional_services`, INSERT the Bedrock 3P Claude step at position 1 and renumber.
For `healthcare_clinic`, ALSO append the PHI-scoping rule step at position 6.

### Stage 6.7, Interaction layer (where they read the briefs)

> Last question on the system. Where do you actually want to READ these briefs? Slack, Gmail, your iPad in the morning, somewhere else? You can pick more than one.

For each channel they name, build:

```json
{
  "id": "slack_ops_channel" / "ipad_brief_reading" / "gmail_drafts" / etc.,
  "channel": "Slack #ops" / "iPad" / "Gmail drafts",
  "type": "slack" / "ipad" / "email" / "telegram" / "terminal" / "whatsapp",
  "status": "have",
  "description": "1-2 sentences on when and how they'll use it",
  "consumes": [/* plate item ids that get delivered through this channel */]
}
```

Then proactively suggest 1-2 channels they didn't name, marked `status: "could-add"`. Heuristics:

- If they named Slack but not Telegram and have any time-sensitive recipe (spend pacing, abandoned-cart whales, lab abnormals), suggest Telegram for stronger mobile push.
- If they only named iPad / Email and have a refund-triage or appeal-draft recipe (high-stakes), suggest Slack so the team has a shared audit trail.
- If they're a content creator with a community, suggest delivering one weekly brief to that community (Skool / Discord) as social proof.
- If they're a content creator with NO community (per Q4 = "I don't have one"), do NOT suggest Skool/Discord. Instead, route the `community_substitute_recipe` brief to whichever channel they already use for their newsletter.

Each `could-add` entry needs a `description` that explains WHY we suggest it (one sentence), not just what it is.

### Stage 7, render the HTML

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/render_data_map.py \
  --input silver_platter_output/data_map.json \
  --output silver_platter_output/data_map.html
```

The HTML has 4 tabs: **What you have today** (Pantry/Prep/Plate cards), **Data flow** (4-column Sankey), **What we'll build** (recipe cards with time-saved badges), **Your 30-day build plan** (steps 0-5 with requires + working_when).

> Your data map is at `silver_platter_output/data_map.html`. Open it in a browser. Click any card or recipe for plain-English details. The Data flow tab shows how data moves left to right: raw sources, weekly summaries, briefs you read, and the channels they land in.

### Stage 8, OPPORTUNITIES.md

Render `silver_platter_output/OPPORTUNITIES.md` from the data map. Group by Claude Code primitive. **Always include the glossary footer** so the markdown reads cleanly even outside the HTML.

```markdown
# Opportunities, <business name>

Generated <date> by /silver-platter for archetype "<archetype>".

## Data engineering work first (the 80%)

The hardest part is back-of-house. Before any AI goes on top, do these:

1. **Build a [tool] weekly summary table.** [explanation]. Estimated: half-day work.
...

## Skills to write
...

## Subagents to scaffold
...

## Hooks to wire
...

## CLIs you can install today
...

## Deferred (not high-priority yet)
...

---

## What these words mean

- **Skill** = a reusable mini-tool. Like a function with a one-page instruction file.
- **Subagent** = a specialist staffer. Each one is scoped to one silver platter.
- **Hook** = an auto-trigger. Fires on session start, after a tool runs, or before Claude exits.
- **Rule** = guardrails Claude follows automatically when working in a specific folder.
- **MCP** = a pre-built bridge to a service. Easiest connection method, fewer custom code.
- **CLI** = a command-line wrapper. Best when a developer is comfortable in Terminal.
- **API** = direct calls to the service. Most flexibility, most code to write.

## Next step

If you want me (or `@claude-code-guide`) to actually scaffold all this, copy the prompt from `silver_platter_output/claude_code_guide_handoff.txt` and paste it to `@claude-code-guide` in a fresh Claude Code session.
```

### Stage 9, render the @claude-code-guide handoff prompt

Render `silver_platter_output/claude_code_guide_handoff.txt` from `references/claude_code_handoff_template.md`. Pre-fill it with the data map JSON (now including `recipes`, `setup_priority`, `interaction_layer`).

### Stage 9.5, the "I don't have a developer" branch

After rendering the handoff prompt, ASK explicitly:

> One last thing. Looking at the 30-day plan, Step 1 needs someone comfortable in Terminal to install a few command-line tools. Are you comfortable with that, or would you rather hand this whole thing off to someone who is?

Three valid answers, three different next-step framings:

1. **"I'll do it myself."** Continue to Stage 10 confirmation as normal. The plan is already shaped for them.

2. **"I have a developer / IT person."** In the Stage 10 confirmation, tell them: *"Forward `silver_platter_output/claude_code_guide_handoff.txt` to your developer. They paste it into a fresh Claude Code session and `@claude-code-guide` walks them through the build. Total time: 1-2 days for a competent developer."*

3. **"I don't have anyone."** Add a fourth file to the output: `silver_platter_output/hire_a_builder.md`. It contains:
   - A copy-paste Upwork / Contra job posting written from the data map
   - Estimated budget range: **$300-800** for a freelance Claude Code builder to ship Steps 1-3, **$1,500-3,000** for the full 5-step build
   - A list of the 5 skills the freelancer needs (Python, basic CLI, JSON, can read API docs, willing to learn Claude Code in 2 hours)
   - The pitch to post in the the community: "*I'm a [archetype] operator. I just ran `/silver-platter` and have a data_map.html I'd love help shipping. Anyone open to a $X gig?*"
   - One sentence at the bottom: *"You can also do Step 1 yourself in ~30 minutes if you've ever followed a recipe online. The hardest part is opening Terminal the first time."*

This branch is non-negotiable for `local_trades`, `restaurant_multilocation`, and any operator who self-IDs as non-developer.

### Stage 10, confirmation screen

> I built four things in `silver_platter_output/`:
>
> 1. **`data_map.html`**, the visual map. 4 tabs. Open this in your browser.
> 2. **`data_map.json`**, the canonical data. Hand this to a developer or paste into another tool.
> 3. **`OPPORTUNITIES.md`**, the priority list of what to build, in order.
> 4. **`claude_code_guide_handoff.txt`**, the copy-paste prompt for `@claude-code-guide`.
>
> Want me to teach any piece in plain English? (yes / no)
> Want to hand it to `@claude-code-guide` to start building? (yes / no)

If they want teaching, walk through one card from each lane in the data map and explain what it represents in their actual business.

If they want the handoff, read the prompt aloud and tell them to paste it to `@claude-code-guide` in a fresh session.

## Modes

### `/silver-platter` (no args)

Default greenfield interview. Detects existing setup and branches.

### `/silver-platter --audit`

Skips speed toggle. Read-only audit of cwd. Outputs "what's here, what's missing" without asking questions.

### `/silver-platter --resume`

Looks for `silver_platter_output/data_map.json` in cwd and continues where the last interview stopped.

### `/silver-platter <archetype>`

Skips archetype matching. Goes straight to the question chain.

Valid: `ecommerce` / `saas` / `law` / `clinic` / `wealth` / `creator` / `restaurant` / `realestate` / `trades`

## Output anatomy

After a successful run:

```
silver_platter_output/
├── data_map.json                    # canonical (full v2 schema with recipes + setup_priority + interaction_layer)
├── data_map.html                    # self-contained 4-tab visualization
├── OPPORTUNITIES.md                 # plain-English priority list with jargon glossary footer
└── claude_code_guide_handoff.txt    # copy-paste prompt for @claude-code-guide
```

## Voice rules

- Plain English. Translate jargon inline. The first time you say a primitive name (skill / subagent / hook / rule), translate it once, then use it consistently.
- Lead with the action / answer / outcome, then the reason, then the recommendation.
- Bullets, not paragraphs.
- No em dashes. Comma, period, or rewrite.
- No "Great question!" / "I'd be happy to..." / "Let me think..."
- Use the operator's actual business words back to them ("your Whale tier", "your Tuesday creative call", "your Friday close").
- Reassure on data volumes, most operators panic about this. Tell them the summary-table pattern handles it.
- "I don't have one" is always a clean first-class answer to any "where does X live?" question. Never push the operator to pick a tool when the honest answer is "no system yet."
