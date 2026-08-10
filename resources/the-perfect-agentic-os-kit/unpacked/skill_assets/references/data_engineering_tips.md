# Data Engineering Tips

Triggered tips, indexed by data shape. Each tip has a **trigger condition**, a **plain-English explanation** (read aloud during interview), and a **recommended action** (added to the data map's `opportunities` list).

The whole point: most operators have NEVER thought about payload size, summary tables, or retention. They want to scrape six months of Shopify data and pass it to AI. The tips below are the calibration moment in the interview.

---

## Trigger: high-volume transactional source > 6 months × > 1000 records/period

**Examples:** Shopify orders, Stripe transactions, Salesforce opportunities, BigCommerce orders.

**Plain English:**

> Pulling six months of Shopify orders means tens of thousands of rows. If you pass that to Claude, the agent has to read every single one to answer "what's our W44 margin." That's slow and expensive. The fix is a **summary table**: a small markdown file that aggregates by week. The agent reads twenty-six rows instead of sixty thousand. It only drills into the raw data when the silver platter doesn't have the cut you need.

**Recommended action (data map opportunity):**

```
type: summary_table
title: Build a weekly summary silver platter for {tool}
explanation: Aggregate by week (gross, refunds, net, count) so the agent reads ~26 rows instead of N rows.
claude_code_feature: skill
feature_name: ingest_{tool}_export
estimated_impact: 1-3 hours/week reclaimed; 100x reduction in token cost per query
```

---

## Trigger: unstructured docs in raw exports (DOCX, PDF, EML, MSG)

**Examples:** Deposition transcripts (DOCX), pleading scans (PDF), refund email chains (.eml), Outlook archive (.msg/.pst), EHR clinical notes (DOCX).

**Plain English:**

> Claude can't read PDFs or Word docs natively. Right now your agent would fail or get garbage. The fix is a **conversion hook** — a tiny script that auto-converts every PDF and DOCX you drop into a `data/raw_dropzone/` folder into clean markdown the agent can read. It happens on every session start, takes a few seconds, and never modifies your originals.

**Recommended action:**

```
type: conversion_hook
title: Add a SessionStart conversion hook for raw_dropzone
explanation: Auto-convert PDF / DOCX / XLSX / EML to markdown so the agent can read them.
claude_code_feature: hook
feature_name: SessionStart convert_dropzone.sh
estimated_impact: Removes a hard blocker for every regulated-content vertical
```

---

## Trigger: source contains PHI, PII, or matter-walled content

**Examples:** EHR notes, patient intake forms, legal matter files, hedge-fund position tape, employee records.

**Plain English:**

> The agent can never accidentally pull this data into a context it shouldn't see. The fix is a **path-scoped rule** — a markdown file in `.claude/rules/` with a `paths:` frontmatter. The rule loads only when Claude reads files matching those paths. So when the agent is answering a billing question, it physically cannot load any clinical content. The walling is enforced by the file system, not by hope.

**Recommended action:**

```
type: path_scoped_rule
title: Add a path-scoped {domain}_scoping.md rule
explanation: Walls the agent off from cross-domain access except via controlled bridges.
claude_code_feature: rule
feature_name: rules/{domain}_scoping.md
estimated_impact: Required for HIPAA / matter ethics / fund compliance — non-optional
```

---

## Trigger: source has multiple locations / accounts / matters / clients

**Examples:** Multi-location restaurant POS, multi-matter law firm, multi-client agency, multi-property real estate.

**Plain English:**

> Each location / matter / client should live in its own subfolder. The agent should only read from the one it's working on. This isn't fancy — it's just a rule that says "keep the data namespaced." But if you skip it, you'll get cross-contamination every time the agent is "helpful."

**Recommended action:**

```
type: namespacing
title: Namespace {entity} content under data/{entity_type}/{slug}/
explanation: One subfolder per matter/location/client. Path-scoped rule enforces the wall.
claude_code_feature: rule + folder_structure
feature_name: data/{entity_type}/{slug}/ + rules/{entity_type}_handling.md
estimated_impact: Prevents data leakage; required for any regulated practice
```

---

## Trigger: source is API-only (no CLI exists)

**Examples:** Shopify Admin API, Pendo, TikTok Ads, Klaviyo, Intercom, Zendesk, Linear (officially).

**Plain English:**

> There's no command-line tool for this service. To pull the data, we'd write a small Claude Code skill that calls the API. It's a one-time investment — usually a 100-200 line Python file — and then it becomes part of your stack like any other CLI.

**Recommended action:**

```
type: skill_writing_opportunity
title: Write a Claude Code skill that wraps the {tool} API
explanation: One-time skill investment. Becomes reusable across all your projects.
claude_code_feature: skill
feature_name: ingest_{tool}_api
estimated_impact: Makes a previously inaccessible data source available to every agent
```

---

## Trigger: 6-month historical pull > 100 MB

**Examples:** High-volume Shopify, Stripe at scale, multi-location POS aggregated, Pendo with thousands of monthly responses.

**Plain English:**

> One hundred megabytes of structured data is too much to keep checked in to a Claude Code project. The fix is a **summary-vs-archive split**: keep the latest weekly silver platter active in `silver_platters/`, archive older versions to a `silver_platters/archive/` folder, and never check the raw historical exports into git. They live on disk locally or in cloud storage.

**Recommended action:**

```
type: archival_strategy
title: Set a summary-vs-archive policy
explanation: Active silver platters in silver_platters/, older ones in silver_platters/archive/, raw historical data outside the repo (or in .gitignore).
claude_code_feature: folder_structure + .gitignore
estimated_impact: Keeps the repo lean; prevents Claude Code from indexing massive raw dumps
```

---

## Trigger: source is currently manual (no automated export)

**Examples:** Operator copy-pastes from a dashboard each Monday; downloads a CSV manually each week; takes screenshots of Slack.

**Plain English:**

> The first move is to make the export automatic. If you're copy-pasting from Shopify every Monday, that's the bottleneck — not the AI layer. We'll either schedule the CLI to run weekly via a cron job, or, if there's no CLI, we'll write a small skill that authenticates and pulls.

**Recommended action:**

```
type: automate_extraction
title: Schedule {tool} export to run automatically
explanation: Replace the manual pull with a cron job (if CLI exists) or a Claude Code skill (if API only).
claude_code_feature: hook (cron) or skill
feature_name: scheduled_export_{tool}
estimated_impact: 30-90 min/week reclaimed
```

---

## Trigger: source has no clear consumer (data exists but nobody reads it)

**Examples:** Pendo NPS responses sitting unread; customer call transcripts piling up in Otter; survey CSVs accumulating in a Google Drive folder.

**Plain English:**

> There's no point pulling this data unless someone or something is going to act on it. The fix is to pair the silver platter with a specific human gate. The CMO bot reads `customer_voice_weekly.md` every Monday and surfaces the top three themes. If the human doesn't read the brief either, the system is broken — but at least we have a draft to start from.

**Recommended action:**

```
type: pair_with_consumer
title: Pair {source} with a {role} consumer
explanation: Define who reads the silver platter and what they do with it. No silver platter without a consumer.
claude_code_feature: subagent + slash_command
feature_name: {role}_bot + /weekly_{domain}
estimated_impact: Prevents "data theater" — every silver platter has a human gate
```

---

## Trigger: source is stored in a SaaS without export (vendor lock-in)

**Examples:** Some legacy CRMs, certain niche industry software, social platforms without bulk download.

**Plain English:**

> If a tool doesn't have export and doesn't have an API, you have two options. One: put up with manual screenshots and OCR. Two: replace the tool. We'll start with option one and flag option two as a strategic note.

**Recommended action:**

```
type: vendor_lockin_warning
title: {tool} has no export — flag for vendor evaluation
explanation: Manual screenshots / OCR are a stopgap. Long-term, evaluate replacement.
claude_code_feature: documentation_only
estimated_impact: Strategic, not tactical
```

---

## Reference: how the SKILL.md uses these tips

During Stage 5 of the interview, for each data source the operator named, walk down this file and check each trigger condition. Fire all matching tips. Add their recommended actions to the `opportunities` array of the data map JSON. Then read the plain-English explanations aloud (don't just dump them silently) — operators learn from the explanation, not the action.
