# Question Library

Per-archetype question chains. Each question is a phrasing the SKILL.md interview reads aloud (verbatim or close to it). Plain-English jargon translation is built into the question itself.

Order matters. Each question feeds the data map JSON. Keep the conversation moving — if a question doesn't apply to the operator, skip and move on.

---

## ecommerce

### Pantry questions

1. **Transactional data** — *"Where do orders live? Most shops use Shopify, WooCommerce, or BigCommerce. Some use Etsy or Amazon Seller. What about you?"*
2. **Payments** — *"Where does payment processing happen? Shopify Payments? Stripe directly? PayPal?"*
3. **Ad spend** — *"Where does ad spend live? Meta usually exports XLSX. TikTok exports XLSX too. Google Ads exports CSV. Which platforms do you run, and where do those exports land?"*
4. **Customer voice** — *"Where do customer surveys live? Klaviyo? Typeform? Manually in spreadsheets? Or maybe nowhere — that's also an answer."*
5. **Refunds + support** — *"Where do refund requests come in? Email? Shopify Inbox? A separate help desk like Gorgias or Zendesk?"*
6. **Vendor / supplier comms** — *"Anything important live in vendor email chains? COA mismatches, supplier delays, contract changes?"*
7. **Inventory** — *"How do you track inventory today? In Shopify? Google Sheets? On paper?"*
8. **Live or stream activity** — *"Do you do live-stream sales (Twitch, YouTube Live, Facebook Live)? If yes, where does the schedule live?"*
9. **Metadata silver-platter readiness** — *"Are you exporting any of this on a regular cadence today, or do you pull manually?"*

### Existing automation questions

10. *"Are you using any AI in the business today? Custom GPTs, project assistants, anything plugged into Shopify or your inbox?"*
11. *"Any cron jobs, Zapier flows, n8n, or scripts? What do they do?"*

### Volume / data-engineering reality check

12. *"Roughly how many orders per week?"*
13. *"How many ad campaigns running concurrently?"*
14. *"How big is six months of Shopify data when you pull it? Megabytes? Hundreds of megabytes?"*

---

## saas

### Pantry questions

1. **Customer feedback** — *"Where does customer feedback come in? Pendo, Intercom, Zendesk, Mixpanel, customer interviews, sales calls?"*
2. **Support tickets** — *"Where do support tickets live? How does the team see them?"*
3. **Engineering planning** — *"How do you track engineering work? Linear, Jira, GitHub Issues, Notion?"*
4. **Code repository** — *"Where's the code? GitHub, GitLab, BitBucket?"*
5. **Errors / incidents** — *"Sentry? Datadog? Honeycomb? Where do you see what's breaking?"*
6. **Customer calls** — *"Are sales / customer success calls recorded? Otter, Fireflies, Gong, Chorus?"*
7. **Billing** — *"Where do subscription and churn live? Stripe? Recurly? ChartMogul? ProfitWell?"*
8. **Roadmap** — *"Where does the product roadmap live? Linear, Notion, Confluence?"*

### Existing automation questions

9. *"Anything that auto-triages tickets today?"*
10. *"Any AI-flavored tools in the dev workflow? Copilot, Cursor, Linear's AI?"*
11. *"Has anyone shipped anything to production via Claude Code or another AI agent?"*

### Volume / data-engineering reality check

12. *"How many tickets per week roughly?"*
13. *"How many Pendo / survey responses per week?"*
14. *"What's the average pickup latency from 'bug filed' to 'fix shipped'?"*

---

## professional_services (law / accounting / consulting)

### Pantry questions

1. **Matter / engagement files** — *"Where do matter files live? iManage, NetDocuments, SharePoint, the file server?"*
2. **Billing** — *"What's the billing system? Bill4Time, Clio, Quickbooks Time, custom?"*
3. **Email** — *"Outlook 365, Gmail, something else?"*
4. **Document templates** — *"Where do your standard templates live? Word docs in a shared drive, intranet, custom?"*
5. **Research database** — *"Lexis, Westlaw, Bloomberg Law (for law). PrivCo, FactSet (for finance). Quickbooks Online (for accounting)."*
6. **Client intake forms** — *"Paper, web form, PDF, scanned tablet?"*
7. **Contract drafts** — *"Where do drafts live? Word docs in matter folders? DocuSign? Custom CLM?"*
8. **Communications** — *"Are client emails preserved per-matter, or just in your inbox?"*

### Existing automation questions

9. *"What's the IT / compliance posture on AI? Is Bedrock-hosted Claude approved, or is everything blocked?"*
10. *"Are you using LexisNexis AI, Microsoft Copilot, or anything similar in pilot?"*
11. *"Any task in the practice that's been automated already?"*

### Volume / data-engineering reality check

12. *"How many active matters / engagements?"*
13. *"How many new matters per month?"*
14. *"What's the typical matter folder size — megabytes or gigabytes?"*

---

## healthcare_clinic

### Pantry questions (PHI-aware)

1. **EHR** — *"Which EHR? eClinicalWorks, Athena, Epic, Cerner, NextGen?"*
2. **Practice management** — *"Centricity, Athena Practice Management, Kareo, custom?"*
3. **Patient intake** — *"How do new patients fill out intake? Paper scan, tablet, online portal?"*
4. **Labs** — *"Which lab(s)? How do results land? Faxed PDF, EHR direct integration?"*
5. **Insurance appeals** — *"Where do appeal letters live? Word docs? Faxed templates?"*
6. **Billing reconciliation** — *"How do ERA files come in and get reconciled? XLSX export, software, manual?"*
7. **Staff schedule** — *"Where does the schedule live? Google Sheets, Tangier, ShiftAdmin?"*
8. **Compliance** — *"Where do HIPAA policies, BAAs, and audit docs live?"*

### Existing automation questions

9. *"Have you signed a BAA with Anthropic? If yes, you're cleared for Bedrock-hosted Claude. If no, the path is to sign one."*
10. *"What AI is the IT / compliance committee comfortable with today?"*
11. *"Anything automated currently? Lab summaries? Intake parsing?"*

### Volume / data-engineering reality check

12. *"How many active cycles or patients per week?"*
13. *"How many new patients per week?"*
14. *"How many insurance appeals per month?"*

---

## wealth_advisory

### Pantry questions

1. **Position management** — *"Where do positions live? Bloomberg, custom Excel, internal Python, fund admin?"*
2. **Research** — *"Where do analyst notes go? Notion, internal portal, shared drive?"*
3. **Earnings transcripts** — *"How do you get earnings transcripts? Bloomberg, Capital IQ, Quartr, FactSet?"*
4. **LP communication** — *"Where do LP letters and reports live? Quarterly cycle?"*
5. **Compliance pre-clears** — *"How do personal-trade pre-clears work today? Email, form, software?"*
6. **Fund admin / NAV** — *"Who's the fund admin? How do you reconcile?"*
7. **Trade ideas / pipeline** — *"Where do trade ideas surface? Slack, memos, calls?"*

### Existing automation questions

8. *"Is anything Bedrock-deployed already? AWS / Azure / GCP for compliance?"*
9. *"Any AI in the workflow today? ChatPDF, custom GPTs, internal tooling?"*

### Volume / data-engineering reality check

10. *"How many research notes per week?"*
11. *"How many positions in the book?"*
12. *"How many LPs?"*

---

## content_creator

This archetype covers solo newsletter operators, YouTubers, podcasters, course creators, and any hybrid of the above. Reframe every "where does X live" question so "I don't have one" is always a clean first-class answer. Never push the operator to pick a tool when their honest answer is "no system yet."

### Pantry questions (outcome-first, never tool-first)

1. **What you publish** *"What do you publish, and where? A newsletter, videos, a podcast, a course, or a mix?"*
2. **Audience** *"Roughly how big is your audience today? Subscribers, viewers, community members, however you count it."*
3. **Past content corpus** *"You've made stuff already. Where do past pieces live? YouTube channel, Substack archive, Apple Podcasts, your laptop, somewhere else? It's fine if it's just 'YouTube auto-captions and that's it.'"*
4. **Community** *"Do you have a place where your audience hangs out together? A Skool, Discord, Facebook group, Slack, paid Circle, etc.? Or just comments and DMs? Both are valid answers."* (If "no community", capture as `community: none`. Don't push to pick a tool.)
5. **Paid offer** *"Are you selling anything direct to your audience? A Gumroad product, a course, a paid newsletter tier, coaching, sponsorships? Or not yet?"*
6. **Email list** *"Where does your email list live? Substack, Beehiiv, Kit (formerly ConvertKit), or somewhere else? Do you also use a separate transactional email tool like Loops.so or Resend for things like purchase confirmations?"*
7. **Audience research** *"How do you decide what to publish next? Gut + Twitter scrolling, or do you actually look at past performance and audience replies?"* (Maps to `competitor_research` + `audience_signal` items in pantry.)
8. **Vault / notes** *"Where do your drafts, ideas, frameworks live? Notion, Obsidian, Apple Notes, Google Docs, mix of all four?"*
9. **Transactional email** *"When someone buys, how do they hear from you? Gumroad sends one email by default. Are you using Loops.so, Resend, or just letting Gumroad do it?"*

### Existing automation questions

10. *"Are you running any AI tools in your workflow today? ChatGPT, Claude, Cursor, anything custom?"*
11. *"Any scheduled jobs or Zapier-style automations? Even one Zap counts. If 'none', that's a clean answer."*

### Outcome reality check (NOT schema-shaped questions)

12. *"How often do you publish each thing? Weekly newsletter? One video a week? Podcast every other week?"* (Maps to `cadence` in tool_defaults.)
13. *"What's the single hardest, most-repeated weekly task you'd love to take off your plate?"* (Anchors recipe selection in Stage 6.5.)
14. *"Are you paying for any tool whose data you basically never look at? Klaviyo collecting dust, Hotjar untouched, anything like that?"* (Flags `paying_unused: true` in pantry.)

---

## restaurant_multilocation

### Pantry questions

1. **POS** — *"Toast, Square, Clover, custom?"*
2. **Locations** — *"How many? What's the breakdown by revenue?"*
3. **Staff scheduling** — *"7shifts, HotSchedules, Sling, hand-rolled in Sheets?"*
4. **Delivery aggregators** — *"DoorDash, UberEats, GrubHub, all three? Where do their dashboards live?"*
5. **Reviews** — *"Google, Yelp, OpenTable, TripAdvisor — where do they aggregate today?"*
6. **Accounting** — *"QuickBooks, Xero, ZipBooks, custom?"*
7. **Inventory** — *"Per-location software, central system, gut?"*

### Existing automation questions

8. *"Any consolidated dashboards across locations today?"*
9. *"AI tools in the business? Predictive scheduling, dynamic pricing?"*

### Volume / data-engineering reality check

10. *"What's the average covers per location per week?"*
11. *"How long does Friday closeout take across all locations?"*
12. *"What's the slowest weekly task you do?"*

---

## real_estate_brokerage

### Pantry questions

1. **MLS access** — *"Which board? How do listings come in? Bulk download, API, API via FollowUpBoss?"*
2. **Lead sources** — *"Zillow, Realtor.com, referrals, brokerage walk-ins, LinkedIn?"*
3. **CRM** — *"Top Producer, kvCORE, FollowUpBoss, Lofty (formerly Chime), hand-rolled?"*
4. **Showings / appointments** — *"Calendar, CRM activity, ShowingTime?"*
5. **Document signing** — *"DocuSign, Dotloop, Authentisign?"*
6. **Commissions** — *"Tracked in CRM, separate spreadsheet, brokerage software?"*
7. **Reviews** — *"Yelp, Google, Zillow agent reviews — aggregated where?"*

### Existing automation questions

8. *"Any AI in the business? Lead scoring, listing copy, virtual staging?"*
9. *"Any nurture sequence running?"*

### Volume / data-engineering reality check

10. *"How many active listings + active leads?"*
11. *"What's typical lead-to-showing-to-close conversion?"*
12. *"How many agents on the team?"*

---

## local_trades

### Pantry questions

1. **Job software** — *"ServiceTitan, Jobber, Housecall Pro, custom?"*
2. **Reviews** — *"Google, Facebook, Yelp, BBB?"*
3. **Tech communication** — *"How do you talk to techs in the field? iMessage, Slack, software-internal chat?"*
4. **Parts / inventory** — *"Spreadsheet, software, in-truck stock, gut?"*
5. **Accounting** — *"QuickBooks, Xero, software-direct?"*
6. **Customer scheduling** — *"Inbound calls, web form, software-direct, mix?"*
7. **Voicemails** — *"Where do they end up? Software inbox, owner phone, separate?"*

### Existing automation questions

8. *"Any text-back automation? Review-request automation? AI dispatch?"*
9. *"Any consolidated dashboard you check each morning?"*

### Volume / data-engineering reality check

10. *"How many jobs per week?"*
11. *"How many techs?"*
12. *"What's the slowest weekly task you personally do?"*

---

## other / custom

If `archetype = other`, ask three free-text follow-ups before pulling questions:

1. *"How does money come in? Walk me through one customer's path from finding you to paying."*
2. *"What does your team do day-to-day? Top 3-4 tasks that fill the week."*
3. *"What's the single hardest, most-repeated weekly thing you'd love to take off your plate?"*

Synthesize the answers into a custom question chain. Most "other" businesses are hybrids of two standard archetypes (e.g., service-based marketplace = saas + local_trades).
