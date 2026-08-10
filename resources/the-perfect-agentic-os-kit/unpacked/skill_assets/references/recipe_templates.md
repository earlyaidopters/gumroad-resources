# Recipe Templates

Per-archetype recipe libraries. When Stage 6.5 of the interview asks "what recurring motions do you want to automate?", reach for the matching archetype's recipe set as a starting menu. Confirm each one with the operator before committing it to the data map. If they want a recipe not on the list, build it from the schema below.

## Recipe schema (locked)

Every recipe in the data map MUST have ALL of these fields:

```json
{
  "id": "snake_case_slug",
  "name": "Short internal name",
  "headline": "Outcome-first one-liner the operator can screenshot",
  "time_saved_per_week": "Coral badge text. e.g. ~3 hrs/wk OR $3-5K/mo recovered",
  "manual_today": "2-3 sentence prose describing how they do this BY HAND today, with a real artifact (the spreadsheet, the email, the apology they had to write)",
  "monday_difference": "1-2 sentence prose describing what changes for them next Monday morning when this recipe is live",
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
  "before_claude_code": "1-sentence status quo",
  "after_claude_code": "1-sentence after-state"
}
```

The LAST element of `ingredients_friendly` is the outcome chip and gets coral styling automatically.

---

## How table rows turn into full recipe objects

Every table row in this file is a *headline + time saved + best-for* hint. The interview's Stage 6.5 reads each row, confirms the recipe with the operator, then composes the FULL schema (id, name, headline, time_saved_per_week, manual_today, monday_difference, goal, ingredients, ingredients_friendly, claude_code_stack, walkthrough, before_claude_code, after_claude_code) using:

1. The headline + time_saved from the table row
2. The operator's actual tools (from the data map's pantry) for `ingredients` and `ingredients_friendly`
3. The archetype's orchestrator + specialists from `setup_priority_template.md` for `claude_code_stack.subagents`
4. A movie-scene `manual_today` (operator at their desk, real artifact, real pain) and a specific `monday_difference` (specific time + specific device + specific calm)

Use the fully-schemaed examples in the content_creator section below as quality bar. Headlines must be operator-screenshot-able. `manual_today` must reference real tools the operator named. `monday_difference` must be specific enough to picture.

If the operator volunteers a recipe NOT on the starter list, build it from the schema in SKILL.md Stage 6.5 (same shape).

## Voice rules for headlines

The headline is the most-screenshot-able part of the recipe card. Rules:

- Lead with the OUTCOME, not the process. Not "Weekly P&L" but "Monday P&L brief on your iPad, 10 min instead of 3 hours."
- Include a number or a comparison. Time saved, dollars recovered, errors prevented.
- No jargon. "Refund triage" is jargon to a non-technical owner. "Refund replies drafted within an hour, you just hit send" works.
- Under 12 words.

For `manual_today`: write it as a movie scene. The operator at their actual desk, doing the actual painful thing. "Marco opens Shopify, Meta Ads Manager, TikTok Ads Manager, and a margin spreadsheet on his laptop every Monday. Pieces it together for ~3 hours before he has a number he trusts."

For `monday_difference`: paint the new ritual. Specific time, specific device, specific calm. "Reads the brief on his iPad with coffee at 6am, signs it, eats breakfast. Sam sees the number in Slack by 9."

---

## ecommerce starter recipes

| Recipe | Headline | Time saved |
|---|---|---|
| `weekly_pnl_recipe` | Monday P&L brief on your iPad, 10 min instead of 3 hours | ~3 hrs/wk |
| `stream_prep_recipe` (if live commerce) | Sam goes live knowing what's in stock and what to say | ~2 hrs + fewer overselled SKUs |
| `refund_triage_recipe` | Refund replies drafted within an hour, you just hit send | ~5 hrs + happier customers |
| `customer_voice_to_creative_recipe` | Tuesday creative brief from last week's customer quotes | 1 brief instead of a blank page |
| `abandoned_cart_recipe` | Recover abandoned carts with tier-aware nudges | ~$3-5K/mo recovered |
| `daily_spend_pacing_recipe` | Get a Slack ping when ad spend pacing breaks | Stops $1-2K of overspend per quarter |
| `inventory_restock_recipe` (if SKU-heavy) | Vendor restock order drafted before you sell out | ~$2-4K/mo of avoided stockouts |

Confirm 4-6 recipes with the operator. Anchor on the outcome they said hurts most.

---

## saas starter recipes

| Recipe | Headline | Time saved |
|---|---|---|
| `monday_triage_recipe` | Monday morning ticket triage, 47 dupes collapse to 5 themes | ~4 hrs/wk |
| `codex_worktree_recipe` | Codex drafts the fix in a worktree before standup | ~6 hrs/wk per engineer |
| `weekly_product_recipe` | Friday product brief: what customers asked for vs what's planned | 1 brief, not a meeting |
| `churn_investigation_recipe` | Churn root-cause within hours, not days | ~$5K of CS time recovered |
| `slack_to_linear_recipe` | Slack feature requests turn into Linear tickets, deduped | ~3 hrs/wk |
| `release_changelog_recipe` | Release notes drafted from PRs, not written from scratch | ~2 hrs per release |

---

## professional_services (law, accounting, consulting) starter recipes

| Recipe | Headline | Time saved |
|---|---|---|
| `new_matter_recipe` | New matter folder scaffolded in 10 minutes, not 3 hours | ~2.5 hrs per matter |
| `time_entry_recipe` | Friday time entries drafted from your day, not retyped | ~2 hrs/wk per timekeeper |
| `msj_focus_recipe` (litigation) | Tomorrow's MSJ focus brief on your iPad tonight | 1 brief, not a pre-dawn sprint |
| `post_mortem_recipe` | Closed matters distill into firm-knowledge, redacted | Knowledge stops dying at the bar |
| `engagement_letter_recipe` | Engagement letter drafted from intake form | ~1 hr per matter |
| `conflict_check_recipe` | Same-day conflict check across active matters | ~30 min per matter |

---

## healthcare_clinic starter recipes

| Recipe | Headline | Time saved |
|---|---|---|
| `morning_brief_recipe` | Provider morning brief on iPad, initials + MRN only | ~30 min per provider per day |
| `lab_triage_recipe` | Abnormals flagged at 5:30am, normals auto-confirmed | ~1 hr per provider per day |
| `appeal_draft_recipe` | Insurance appeal drafted in days, not 6 weeks | 4-5 weeks shaved per appeal |
| `weekly_pnl_recipe` | Weekly clinic P&L without opening Centricity | ~1 hr/wk |
| `referral_letter_recipe` | Referral letter drafted from encounter note | ~15 min per referral |

PHI scoping rule is non-negotiable. Every recipe touching clinical data needs `rules/phi_scoping.md (path-scoped)` in the stack.

---

## wealth_advisory / RIA / hedge fund starter recipes

For solo RIAs the recipe shape is different from hedge funds. Tag each recipe `best_for: solo_ria`, `best_for: hedge_fund`, or `best_for: both` so the interview pulls the right ones for the operator.

| Recipe | Headline | Time saved | Best for |
|---|---|---|---|
| `quarterly_letter_recipe` | Quarterly LP / client letter drafted from positions + theses | ~1 day per quarter | Both |
| `trade_committee_brief_recipe` | Pre-IC brief from your notes + book | ~2 hrs per meeting | Hedge fund |
| `risk_check_recipe` | Daily risk-flag ping if any position breaches mandate | Catches breaches in hours, not days | Both |
| `personal_trade_preclear_recipe` | Personal-trade pre-clear drafted from your form, CCO co-signs in Slack | ~30 min per request | Solo RIA |
| `reg_bi_documentation_recipe` | Reg BI client-recommendation file drafted after every advice meeting | ~45 min per meeting | Solo RIA |
| `client_review_prep_recipe` | Pre-meeting brief: this client's positions, drift, action items | ~30 min per meeting | Both |
| `quarterly_billing_recon_recipe` | Quarterly fee-billing reconciled against held-away assets | ~1 day per quarter | Solo RIA |
| `compliance_marketing_review_recipe` | Marketing copy passed through Reg ad rule check before send | ~1 hr per piece + reduced violation risk | Solo RIA |

Compliance overlay: every recipe MUST include `rules/personal_trade_scoping.md` (or equivalent) in the `claude_code_stack.rules` field. Bedrock-3P-Claude must be live before any of these run (see `setup_priority_template.md` regulated archetypes section).

## restaurant_multilocation starter recipes

For multi-location operators (Tony with 3 stores), every recipe fans out per location. Set `per_location: true` on these.

| Recipe | Headline | Time saved | Per-location |
|---|---|---|---|
| `daily_close_recipe` | Daily close brief per location, in your inbox by 11pm | ~2 hrs across managers | yes |
| `weekly_food_cost_recipe` | Weekly food-cost variance flagged before payroll | $1-3K/mo of slippage caught | yes |
| `staff_schedule_recipe` | Staff schedule drafted from POS volume | ~3 hrs/wk per manager | yes |
| `labor_variance_recipe` | Monday labor-variance brief: which store ran hot, which under | ~2 hrs/wk for ops manager | yes |
| `aggregator_recon_recipe` | DoorDash + UberEats + Grubhub reconciled against POS, by location | ~3 hrs/wk + catches missing payouts | yes |
| `review_response_recipe` | 1-star and 2-star reviews drafted within an hour, owner approves | Hours, not days; protects rating | yes |
| `weekly_pnl_per_location_recipe` | Weekly P&L per location, owner reads with coffee Monday | ~3 hrs/wk | yes |
| `food_waste_anomaly_recipe` | Voids / comps anomaly flagging per shift | $500-2K/mo of slippage caught | yes |
| `manager_standup_recipe` | Pre-standup brief for each store manager: yesterday + today | ~1 hr across managers per day | yes |

## local_trades starter recipes

For trades (Mike's HVAC), the wins are quote-followup, voicemail triage, and review response.

| Recipe | Headline | Time saved |
|---|---|---|
| `daily_dispatch_recipe` | Tomorrow's dispatch brief drafted from today's calls | ~1 hr/day |
| `quote_followup_recipe` | Quote follow-ups drafted, you just hit send | ~$2-5K/mo of recovered jobs |
| `seasonal_prep_recipe` | Seasonal-service email batch drafted per cohort | ~$5-10K of recurring revenue |
| `review_response_recipe` | 1-star reviews flagged within an hour, owner-tap reply | Hours, not days; protects rating |
| `voicemail_triage_recipe` | After-5pm voicemails transcribed + categorized: emergency / quote / spam, drafted text-back | ~3-5 hrs/wk + zero missed emergencies |
| `weekly_revenue_brief_recipe` | Sunday-evening brief: jobs invoiced, AR aging, tech utilization | ~1 hr/wk |
| `parts_restock_recipe` | Truck inventory low → vendor PO drafted | ~$2-4K/mo of avoided "out of stock" callbacks |
| `maintenance_plan_outreach_recipe` | Members past their service window get a draft email | ~$3-8K/mo of recovered membership revenue |

## real_estate_brokerage starter recipes

For team brokerages (Marisol with 12 agents), each recipe should fan out per agent. Set `per_agent: true`.

| Recipe | Headline | Time saved | Per-agent |
|---|---|---|---|
| `listing_packet_recipe` | Listing packet drafted from MLS + comps | ~2 hrs per listing | yes |
| `buyer_match_recipe` | Buyer-match brief on new listings, daily 7am | ~30 min per agent per day | yes |
| `closing_checklist_recipe` | Closing-checklist status per active deal, weekly | ~1 hr per deal | TC |
| `lead_triage_daily_recipe` | Hot/warm/cold lead triage drafted from FUB activity | ~30 min/agent/day | yes |
| `lead_source_roi_recipe` | Monthly Zillow vs Realtor vs sphere ROI breakdown | Better budget allocation; ~$500-2K/mo | broker |
| `agent_scoreboard_weekly_recipe` | Per-agent scoreboard + 1-line broker note | ~2 hrs broker time/wk | broker |
| `dead_deal_postmortem_recipe` | When a deal dies, why? Drafted from FUB + email | Pattern detection over 90 days | yes |
| `followup_rescue_recipe` | Stale leads (>14d no contact) drafted nudges, agent approves | ~$10-30K of recovered GCI/year | yes |

---

## content_creator starter recipes

Covers solo creators (newsletter-only, video-only, podcast-only) and hybrid operators (newsletter + YouTube + paid product). Pick recipes by what they actually publish.

| Recipe | Headline | Time saved | Best for |
|---|---|---|---|
| `weekly_content_recipe` | Friday content brief from this week's signal | ~3 hrs/wk | All creators |
| `newsletter_idea_engine_recipe` | Mine your own back catalog + replies for next week's angle | ~2 hrs/wk + sharper opens | Newsletter operators |
| `youtube_to_newsletter_recipe` | Auto-draft this week's newsletter from your latest video transcript | ~1 day per cycle | Hybrid newsletter+YouTube |
| `subscriber_retention_recipe` | Cohort the email list against open rate, flag drift before it churns | Catches drops 4+ weeks earlier | Newsletter operators |
| `gumroad_launch_recipe` | Gumroad launch assets drafted from outline | 1 day of grind, not 3 | Anyone selling on Gumroad |
| `gumroad_launch_followup_recipe` | Post-launch follow-ups: who bought, who didn't open, who's nearby on the next launch | ~$3-8K per launch recovered | Repeat-launch creators |
| `youtube_pipeline_recipe` | Title + thumbnail + description set per upload | ~2 hrs per video | YouTubers |
| `community_substitute_recipe` | Solo? Mine your Twitter replies as the community signal | 1 brief instead of feeling alone | Solo creators (no Skool/Discord) |
| `podcast_repurpose_recipe` | One podcast episode becomes 5 social posts, drafted | ~3 hrs per episode | Podcasters |
| `creator_finance_recipe` | Monday brief: subs, revenue, top product, top sponsor | ~1 hr/wk | Anyone with paid offers |

### Newsletter idea engine (full schema, copy-paste starting point)

```json
{
  "id": "newsletter_idea_engine_recipe",
  "name": "Newsletter idea engine",
  "headline": "Mine your back catalog plus this week's replies for next Tuesday's angle",
  "time_saved_per_week": "~2 hrs/wk + sharper opens",
  "manual_today": "Operator stares at a blank doc Monday night, scrolls Twitter, opens last 3 newsletters in another tab, picks an angle on gut at 11pm.",
  "monday_difference": "Tuesday morning, idea brief is in Notion: 3 angle candidates, each backed by a specific reader reply or back-catalog moment. Operator picks one in 5 minutes and starts writing.",
  "goal": "Generate next-issue angle ideas using the operator's own past content, audience replies, and any new reader signal.",
  "ingredients": ["substack_archive", "twitter_replies", "gmail_replies", "notion_drafts", "cmo_bot"],
  "ingredients_friendly": ["Newsletter archive", "Reader replies (Twitter + email)", "Past drafts", "Your CMO assistant", "3 angle candidates"],
  "claude_code_stack": {
    "skills": ["ingest_substack_archive", "ingest_twitter_replies", "ingest_gmail_threads"],
    "subagents": ["EA Orchestrator", "CMO Bot"],
    "hooks": ["SessionStart convert_dropzone.sh"],
    "rules": ["rules/voice_of_audience.md"]
  },
  "walkthrough": [
    {"actor": "Sun 6pm cron", "action": "Pulls last 7 days of Twitter replies, Gmail reader replies, and Substack comments into data/raw_dropzone/."},
    {"actor": "SessionStart hook", "action": "Converts threads to clean markdown."},
    {"actor": "EA Orchestrator", "action": "Routes to CMO Bot with the 3 strongest signals of the week."},
    {"actor": "CMO Bot", "action": "Cross-references with operator's last 12 newsletters in silver_platters/back_catalog.md. Proposes 3 angles, each tied to a specific reply quote and an unused back-catalog hook."},
    {"actor": "Operator, Tue 8am", "action": "Reads idea brief in Notion. Picks one. Acknowledges in audit_log."}
  ],
  "before_claude_code": "Blank doc, gut feel, 11pm Monday.",
  "after_claude_code": "3 grounded angle candidates by Tuesday 8am."
}
```

### YouTube to newsletter (full schema)

```json
{
  "id": "youtube_to_newsletter_recipe",
  "name": "YouTube to newsletter",
  "headline": "This week's video becomes Tuesday's newsletter, drafted",
  "time_saved_per_week": "~1 day per cycle",
  "manual_today": "Operator publishes Friday video, then spends Monday transcribing the audio in Otter, Tuesday morning writing the newsletter from scratch even though it's the same idea.",
  "monday_difference": "Saturday morning, draft newsletter is waiting in Notion. Operator spends Tuesday editing, not writing. Newsletter ships before noon.",
  "goal": "Take the latest YouTube video transcript and draft a newsletter version that reads as native long-form.",
  "ingredients": ["youtube_transcripts", "back_catalog", "ea_orchestrator", "cmo_bot"],
  "ingredients_friendly": ["This week's video transcript", "Newsletter back catalog (voice match)", "Your CMO assistant", "Tuesday newsletter draft"],
  "claude_code_stack": {
    "skills": ["ingest_youtube_transcripts", "voice_match_distill"],
    "subagents": ["EA Orchestrator", "CMO Bot"],
    "hooks": ["SessionStart convert_dropzone.sh"],
    "rules": ["rules/voice_of_audience.md"]
  },
  "walkthrough": [
    {"actor": "Sat 6am cron", "action": "Triggers ingest_youtube_transcripts on the latest published video."},
    {"actor": "EA Orchestrator", "action": "Routes to CMO Bot with the transcript + the back_catalog silver platter for voice match."},
    {"actor": "CMO Bot", "action": "Drafts the newsletter as the operator would write it. Three sections, scannable subheads, one quotable line."},
    {"actor": "Operator, Sat morning", "action": "Reads draft in Notion, edits headline + first paragraph. Approves in audit_log."}
  ],
  "before_claude_code": "Same idea written twice, once as video, once as newsletter, four days apart.",
  "after_claude_code": "One idea, two channels, draft in 5 minutes of human time."
}
```

### Subscriber retention (full schema)

```json
{
  "id": "subscriber_retention_recipe",
  "name": "Subscriber retention",
  "headline": "Catch list drift 4 weeks earlier, before it shows up as churn",
  "time_saved_per_week": "Catches drops 4+ weeks earlier",
  "manual_today": "Operator sees a bad open rate after the fact, panics, doesn't know which cohort dropped.",
  "monday_difference": "Monday, weekly retention brief flags any cohort whose open rate moved >5pp week-over-week. Operator knows which segment to win back before it goes silent.",
  "goal": "Track open-rate cohorts over time and surface drift before it becomes churn.",
  "ingredients": ["substack_subscribers", "loops_engagement", "back_catalog", "cmo_bot"],
  "ingredients_friendly": ["Substack subscribers", "Loops/Klaviyo engagement", "Back catalog (which posts they came from)", "Your CMO assistant", "Retention brief"],
  "claude_code_stack": {
    "skills": ["ingest_substack_subscribers", "ingest_loops_engagement"],
    "subagents": ["EA Orchestrator", "CMO Bot"],
    "hooks": ["SessionStart convert_dropzone.sh"],
    "rules": ["rules/voice_of_audience.md"]
  },
  "walkthrough": [
    {"actor": "Mon 6am cron", "action": "Pulls subscriber list snapshot + last 4 weeks of open rates by cohort."},
    {"actor": "CMO Bot", "action": "Compares cohort open rates week-over-week. Flags cohorts with >5pp drift."},
    {"actor": "Operator, Mon morning", "action": "Reads brief, picks one cohort to send a re-engagement piece to."}
  ],
  "before_claude_code": "Open rate dips noticed after the fact. Whole-list re-engagement blasts.",
  "after_claude_code": "Cohort-level early warning. Targeted re-engagement instead of nuke-from-orbit."
}
```

### Gumroad launch follow-up (full schema)

```json
{
  "id": "gumroad_launch_followup_recipe",
  "name": "Gumroad launch follow-up",
  "headline": "Post-launch follow-ups drafted for buyers, non-openers, and next-launch warmup",
  "time_saved_per_week": "~$3-8K per launch recovered",
  "manual_today": "Launch ends Friday, operator forgets to send the 'didn't open' follow-up, 30% of revenue left on the table.",
  "monday_difference": "Monday after launch, three drafts are waiting: thank-you to buyers, soft-nudge to non-openers, warmup tease for the next launch tier. Operator approves and sends.",
  "goal": "Turn every launch into 3 follow-up cohorts: buyers, non-openers, next-launch leads.",
  "ingredients": ["gumroad_sales", "loops_engagement", "substack_subscribers", "cmo_bot"],
  "ingredients_friendly": ["Gumroad sales", "Email engagement", "Subscriber list", "Your CMO assistant", "3 follow-up drafts"],
  "claude_code_stack": {
    "skills": ["gumroad", "ingest_loops_engagement", "ingest_substack_subscribers"],
    "subagents": ["EA Orchestrator", "CMO Bot"],
    "hooks": ["PostToolUse audit_action.sh"],
    "rules": ["rules/voice_of_audience.md"]
  },
  "walkthrough": [
    {"actor": "Day-after-launch cron", "action": "Pulls Gumroad sales + the launch email's open/click stats."},
    {"actor": "CMO Bot", "action": "Splits into 3 cohorts. Drafts a tier-aware email per cohort."},
    {"actor": "Operator", "action": "Reviews the 3 drafts, edits one line, approves all three for send."}
  ],
  "before_claude_code": "Launch ends, operator moves on. Non-openers never re-warmed.",
  "after_claude_code": "Every launch produces 3 follow-up sends within 48 hours. Compounds revenue."
}
```

### Community substitute (full schema)

```json
{
  "id": "community_substitute_recipe",
  "name": "Community substitute",
  "headline": "Solo? Your Twitter replies become the community signal",
  "time_saved_per_week": "1 weekly brief instead of FOMO scrolling",
  "manual_today": "Operator without a Skool/Discord scrolls Twitter for 90 minutes Sunday night, hoping to feel pulse on what readers care about.",
  "monday_difference": "Monday morning brief surfaces top 5 reader-reply themes from the past 7 days, with quoted tweets. Operator knows what readers are thinking without scroll-induced anxiety.",
  "goal": "Replace 'I should have a community' guilt with a structured weekly read of public replies + DMs.",
  "ingredients": ["twitter_replies", "gmail_dms", "substack_comments", "cmo_bot"],
  "ingredients_friendly": ["Twitter replies", "Reader DMs", "Substack comments", "Your CMO assistant", "Reader pulse brief"],
  "claude_code_stack": {
    "skills": ["ingest_twitter_replies", "ingest_gmail_threads"],
    "subagents": ["EA Orchestrator", "CMO Bot"],
    "hooks": ["SessionStart convert_dropzone.sh"],
    "rules": ["rules/voice_of_audience.md"]
  },
  "walkthrough": [
    {"actor": "Sun 9pm cron", "action": "Pulls last 7 days of replies, comments, DMs."},
    {"actor": "CMO Bot", "action": "Clusters into 5 themes with verbatim quotes."},
    {"actor": "Operator, Mon morning", "action": "Reads the pulse brief in 5 minutes."}
  ],
  "before_claude_code": "90 minutes of Sunday scroll, no clear signal.",
  "after_claude_code": "5-minute Monday read, named themes, ready to write."
}
```

---

## restaurant_multilocation starter recipes

| Recipe | Headline | Time saved |
|---|---|---|
| `daily_close_recipe` | Daily close brief per location, in your inbox by 11pm | ~2 hrs across managers |
| `weekly_food_cost_recipe` | Weekly food-cost variance flagged before payroll | $1-3K/mo of slippage caught |
| `staff_schedule_recipe` | Staff schedule drafted from POS volume | ~3 hrs/wk per manager |

---

## real_estate_brokerage starter recipes

| Recipe | Headline | Time saved |
|---|---|---|
| `listing_packet_recipe` | Listing packet drafted from MLS + comps | ~2 hrs per listing |
| `buyer_match_recipe` | Buyer-match brief on new listings, daily 7am | ~30 min per agent per day |
| `closing_checklist_recipe` | Closing-checklist status per active deal, weekly | ~1 hr per deal |

---

## local_trades (HVAC, plumbing, etc.) starter recipes

| Recipe | Headline | Time saved |
|---|---|---|
| `daily_dispatch_recipe` | Tomorrow's dispatch brief drafted from today's calls | ~1 hr/day |
| `quote_followup_recipe` | Quote follow-ups drafted, you just hit send | ~$2-5K/mo of recovered jobs |
| `seasonal_prep_recipe` | Seasonal-service email batch drafted per cohort | ~$5-10K of recurring revenue |
