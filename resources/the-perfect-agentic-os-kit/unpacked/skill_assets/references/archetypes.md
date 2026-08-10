# Business Archetypes

Nine archetypes the silver-platter interview can match to. If the operator's business doesn't fit any cleanly, set archetype to `other` and ask 2-3 free-text follow-ups.

---

## ecommerce

**One-liner:** Sells physical or digital products via online store. Order-driven. Inventory and refund flows.

**Typical stack:** Shopify or WooCommerce or BigCommerce, Stripe, Klaviyo, Meta Ads, TikTok Ads, Google Ads, customer support inbox, vendor / supplier communication.

**Pain pattern:** Founder argues weekly about which SKU tier is profitable; refund emails scattered across two inboxes; ad spend tracked in three spreadsheets that don't agree; survey responses pile up unread.

**Typical agent hierarchy:**
- EA Orchestrator (chief-of-staff)
  - CFO bot (finance silver platter)
  - CMO bot (marketing + customer voice)
  - Ops bot (inventory, schedule)

**Question seeds** (delivered with jargon translation):
1. Where do orders live? Most shops use Shopify or WooCommerce. What about you?
2. Where does ad spend live? Meta and TikTok export XLSX, Google exports CSV.
3. Where do refunds happen? Email? Shopify directly? A separate help desk?
4. Where do customer surveys live? Klaviyo, Typeform, manual?
5. How do you decide what to put on sale? Gut, or data?
6. Do you have any kind of weekly P&L view today?

---

## saas

**One-liner:** Subscription software business, B2B or B2C. Customers pay monthly or annually. Engineering team ships product.

**Typical stack:** GitHub, Linear or Jira, Stripe, Pendo or Mixpanel, Intercom or Zendesk, Sentry, Slack, customer call recordings (Otter / Fireflies / Gong).

**Pain pattern:** Engineering manager is the human router between support and engineering; pickup latency on bug fixes is weeks; customer feedback drowns in noise; churn investigations take days because data lives in five places.

**Typical agent hierarchy:**
- Triage Orchestrator (chief-of-staff for engineering)
  - Root-Cause Analyst (joins tickets + commits + customer calls)
  - Codex-Fix-Drafter (opens git worktree, drafts code change)
  - Customer-Voice Distiller (clusters Pendo / Intercom into themes)

**Question seeds:**
1. Where do customer support tickets live? Intercom, Zendesk, email?
2. How do you collect product feedback? Pendo, NPS, calls, forms?
3. How do you track engineering work? Linear, Jira, GitHub Issues?
4. How long does it take from "we found a bug" to "we shipped a fix"?
5. What does churn investigation look like today? How many places do you check?
6. Do you have a weekly view of "what customers actually said this week"?

---

## professional_services (law / accounting / consulting / financial advisory)

**One-liner:** Billable-hours practice. Knowledge work. Regulated. Per-matter or per-engagement scoping.

**Typical stack:** iManage or NetDocuments (law), Bill4Time or Clio (billing), Outlook + Microsoft 365, LexisNexis (law), Bedrock-hosted Claude (regulated AI deployment), DocuSign.

**Pain pattern:** Every new matter / engagement gets hand-rolled from scratch; time entries are days late; institutional knowledge dies when partners retire; ethics walling between matters is enforced by hope.

**Typical agent hierarchy:**
- Case-Launch Orchestrator (chief-of-staff for matter intake)
  - Billing Assistant (drafts time-entry narratives)
  - Deposition / Memo Specialist (drafts focus-areas briefs from matter files)
  - Post-Mortem Distiller (closed matters only — separates ephemeral from firm-knowledge)

**Question seeds:**
1. Where do matter files live? iManage, NetDocuments, SharePoint, file server?
2. How do you handle time entries today? Bill4Time? Clio?
3. How do you wall matters from each other? File system? Permission groups?
4. Are you allowed to send any client content to AI? What's the IT policy?
5. What's your most repeated weekly task? Briefs, intake, billing, research?
6. Where do post-mortems / lessons-learned live today?

---

## healthcare_clinic

**One-liner:** Patient-facing practice (specialty or general). Regulated by HIPAA. Provider-driven workflow with admin support.

**Typical stack:** EHR (eClinicalWorks, Athena, Epic, Cerner) — exports DOCX, Centricity or other practice-management software, paper intake forms, faxed insurance appeals, Bedrock-hosted Claude under BAA.

**Pain pattern:** Practice manager prints intake forms each morning and walks them down the hall; lab results don't auto-summarize; insurance appeals run 6-8 weeks because each is written from scratch; PHI scoping is enforced by hope.

**Typical agent hierarchy:**
- Care Coordinator Orchestrator (chief-of-staff for the morning huddle)
  - Intake-Prep Specialist (provider morning briefs)
  - Lab Review Specialist (abnormal flags only)
  - Billing-Appeals Specialist (controlled cross-domain access for appeals only)

**Question seeds:**
1. Which EHR do you use? Most clinics use eClinicalWorks, Athena, or Epic.
2. How do patient intake forms get into the system today? Paper, tablet, web?
3. Where do lab results land? In the EHR? Faxed?
4. Who reviews labs each morning, and how long does it take?
5. Have you signed a BAA with Anthropic? If yes, you're cleared for Bedrock-hosted Claude.
6. How do insurance appeals work today? Who writes them? How long?

---

## wealth_advisory (hedge fund / family office / boutique investment shop)

**One-liner:** Investment management, often boutique. Compliance-heavy. Research-driven.

**Typical stack:** Bloomberg Terminal, internal research portal (Notion / DOCX), position management in Excel + custom Python, Outlook for LP comms, signed PDFs for compliance pre-clears.

**Pain pattern:** PM reads 80-100 research notes a week with no clustering; LP letters take 3-4 days each (same arc, different quarter); compliance pre-clears slow operations; trade idea triage is gut-feel.

**Typical agent hierarchy:**
- PM-Brief Orchestrator
  - Research Distiller (clusters analyst notes by theme)
  - Earnings Triager (transcripts during earnings season)
  - LP-Letter Drafter (quarterly comms drafts)
  - Compliance Pre-Clear Helper (audit-heavy, handles personal-trade pre-clears)

**Question seeds:**
1. Where do analyst research notes live? Notion, internal portal, shared drive?
2. How do you handle earnings season — transcripts piling up, who summarizes?
3. How are LP letters drafted today? From scratch each quarter?
4. What does compliance pre-clear look like? Email? Form? Approval workflow?
5. How do trade ideas get to your desk? Slack? Memos? Calls?
6. What's your hardest weekly drudgery?

---

## content_creator

**One-liner:** YouTube / podcast / newsletter / course operator. Personal brand. Multi-platform output.

**Typical stack:** YouTube Studio, podcast host (Spotify / Apple), newsletter platform (Beehiiv / Substack), Skool or Circle community, Gumroad or Stripe for paid content, Apify for competitor scraping, Notion / Obsidian for vault.

**Pain pattern:** Each video is a 30-asset pipeline (titles, thumbnails, hooks, diagrams, demos, filming guide, audio walkthrough, kit, description, SEO, pinned). Without a system it eats the week.

**Typical agent hierarchy:**
- Content-Producer Orchestrator
  - Research Distiller (competitor + transcripts)
  - Thumbnail Iterator (per-style)
  - Gumroad Assembler (kit packaging)
  - Community Engagement Helper (Skool / Circle / Discord)

**Question seeds:**
1. What platforms do you publish on? YouTube, podcast, newsletter, course?
2. Where do you keep your past video / episode transcripts? Otter, Fireflies, manual?
3. Do you scrape competitors? How?
4. Where does your community live? Skool, Circle, Discord, FB group?
5. What does a single piece of content require, asset-wise? Walk me through one.
6. What's the slowest part of producing one piece?

---

## restaurant_multilocation

**One-liner:** Multi-unit food service operator. Multiple GMs. Weekly P&L by location.

**Typical stack:** Toast or Square POS (CSV exports per location), 7shifts or HotSchedules for staff, DoorDash / UberEats / GrubHub aggregator dashboards, Google + Yelp + OpenTable reviews, QuickBooks accounting.

**Pain pattern:** Owner has 4+ dashboards open trying to figure out which location bleeds labor and which bleeds food cost; reviews aggregate in 4 places; staff scheduling rolls late every Friday.

**Typical agent hierarchy:**
- Multi-Unit Operator Orchestrator
  - P&L Analyst (per location)
  - Labor Variance Helper
  - Review Responder (drafts replies for owner approval)
  - Food-Cost Tracker

**Question seeds:**
1. How many locations? What POS do you use? Toast, Square, Clover?
2. How do you handle scheduling across locations? 7shifts? Hand-rolled?
3. Where do delivery aggregator metrics live? One dashboard each, or consolidated?
4. Where do reviews aggregate today? Per-platform, or one pane of glass?
5. Who runs each location? GMs with autonomy or you directly?
6. What's the slowest weekly closeout?

---

## real_estate_brokerage

**One-liner:** Small or boutique brokerage. Agents work leads to listings to closings.

**Typical stack:** MLS access via regional board, Zillow + Realtor.com inbound, Top Producer or kvCORE CRM, DocuSign, Google Calendar for showings, Yelp / Google reviews.

**Pain pattern:** Lead leakage between channels; listings go stale because nobody runs competitive analysis; dead deals never get debriefed.

**Typical agent hierarchy:**
- Pipeline Orchestrator
  - Listing-Coach (critiques new listings)
  - Lead-Prioritizer (ranks today's incoming)
  - Dead-Deal-Postmortem (closed-lost analysis)

**Question seeds:**
1. Which CRM? Top Producer, kvCORE, FollowUpBoss, hand-rolled?
2. Where do leads come from? Zillow, Realtor.com, referrals, brokerage walk-ins?
3. How do you track showings? Calendar, CRM activity, separate doc?
4. Do you do listing competitive analysis manually? How often?
5. What happens when a deal dies? Debrief or just move on?
6. How many agents on the team? Solo, paired, full team?

---

## local_trades

**One-liner:** Service business with technicians + dispatch. HVAC, plumbing, landscaping, cleaning, electrical.

**Typical stack:** ServiceTitan or Jobber for jobs / scheduling / invoicing (XLSX exports), Google + Facebook reviews, QuickBooks, Google Sheets for parts inventory, iMessage thread with techs.

**Pain pattern:** Owner is one person; reviews drift; parts orders are reactive; dispatch is buried doing both scheduling and QA; tech-completion-quality is uneven.

**Typical agent hierarchy:**
- Daily Operator Orchestrator
  - Dispatcher (tomorrow's brief)
  - Review Responder (drafts replies for owner approval)
  - Weekly P&L Summary

**Question seeds:**
1. What software runs jobs and invoicing? ServiceTitan, Jobber, Housecall Pro?
2. How do you communicate with techs? iMessage, Slack, the dispatch software?
3. Where do reviews aggregate? Google, Facebook, Yelp, OneNote?
4. Do you track parts inventory? Spreadsheet, software, gut?
5. How do you decide tomorrow's schedule? Dispatcher's call, automated, gut?
6. How often are you working in the field vs at the desk?

---

## other / custom

If the operator's business doesn't fit cleanly:

> "Tell me more about how money comes in (revenue side) and what your team does day-to-day (operations side). I'll build the question chain from there."

Set archetype to `other` and ask 2-3 free-text follow-ups before launching into the question chain. Use the answers to seed a custom question chain (most likely a hybrid of two of the standard archetypes).
