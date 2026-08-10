# Tool Defaults

Per-tool defaults for the schema fields the operator should NEVER be asked directly: `format`, `cadence`, `volume`, `connection_methods`, `cli_skill`. The interview reads from this file silently and fills the data map JSON without making the operator answer like a database admin.

If a tool isn't listed, fall back to:
- `format`: "API"
- `cadence`: "on-demand"
- `volume`: "low"
- `connection_methods`: [{ "type": "api" }]
- `cli_skill`: null
- Flag as `skill_writing_opportunity` in the data map.

---

## E-commerce / payments

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| Shopify | CSV | daily | high (>=100 orders/wk) | null | Has Admin API + community MCP. Strong skill opportunity. |
| WooCommerce | CSV | daily | medium | null | WP-CLI exists but limited. |
| BigCommerce | API | daily | medium | null | API only. |
| Etsy | CSV | weekly | low | null | API only. |
| Stripe | API | real-time | medium | "stripe" | CLI + skill exist. |
| Gumroad | API | real-time | low | "gumroad" | CLI + skill exist. |
| PayPal | CSV | weekly | medium | null | Manual export common. |
| Klaviyo | API | weekly | medium | null | Most ops underuse it. Flag `paying_unused = true` if operator says they barely use it. |

## Marketing / ads

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| Meta Ads | XLSX | weekly | medium | "meta-ads-cli" | CLI + skill exist. |
| TikTok Ads | XLSX | weekly | medium | null | API only. Skill opportunity. |
| Google Ads | CSV | weekly | medium | null | Python client exists. |
| LinkedIn Ads | CSV | weekly | low | null | API only. |
| Twitter Ads | CSV | weekly | low | null | API only. |

## SaaS / engineering

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| GitHub | API | real-time | medium | "gh" | CLI exists, no wrapper needed. |
| GitLab | API | real-time | medium | "glab" | |
| Linear | API | real-time | medium | null | Third-party CLI exists. |
| Sentry | API | real-time | medium | "sentry-cli" | CLI exists. |
| Pendo | CSV | weekly | high (>=200 responses/wk) | null | API only. Strong skill opportunity. |
| Intercom | CSV | real-time | high | null | API only. Strong skill opportunity. |
| Zendesk | CSV | real-time | medium | null | API only. |
| Mixpanel | API | real-time | medium | null | API only. |
| Datadog | API | real-time | medium | null | |

## Creator tools / publishing

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| Substack | API | daily (subs flow real-time, posts weekly) | medium | null | No public API officially, unofficial endpoints exist. Skill opportunity. |
| Beehiiv | API | daily | medium | null | Has API. Skill opportunity. |
| ConvertKit | API | daily | medium | null | API + Zapier well-supported. |
| ActiveCampaign | API | daily | medium | null | API only. |
| Loops.so | API | real-time | low (transactional) | null | REST API. Skill opportunity. |
| Resend | API | real-time | low | "resend-cli" | CLI + skill exist. |
| YouTube Studio (creator-side) | API | real-time | medium | "y-reflect / y-compare / youtube-comments" | an existing skills cover analytics + comments + competitor view. |
| Substack comments | API | real-time | low | null | Bundled with Substack API. |
| Apple Podcasts Connect | API | weekly | low | null | Limited public API. |
| Spotify for Podcasters | API | weekly | low | null | Limited public API. |
| Notion | API | real-time | medium | null | API rich, no skill yet. |
| Obsidian (local vault) | MD | real-time | medium | "obsidian-cli" | CLI + skill exist. |
| Twitter/X | API | real-time | medium | null | Use `scrape.badger/twitter-tweets-scraper` via Apify per `.claude/rules/x-twitter-scraping.md`. |

## Communication / productivity

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| Gmail / Google Workspace | API | real-time | medium | "gws" | the `gws` CLI handles Gmail / Drive / Calendar / Sheets. |
| Outlook 365 | API | real-time | medium | "outlook" | skill exists. |
| Slack | API | real-time | medium | "slack" | CLI + skill exist. |
| Microsoft Teams | API | real-time | medium | null | Limited public API for messages. |
| Calendly | API | real-time | low | "calendly" | Skill exists. |
| Fireflies | API | real-time | low | "fireflies" | Skill exists. |
| Otter.ai | API | real-time | low | null | API exists. |
| Skool | unofficial | real-time | medium | "skool-inbox" | skill exists, no official API. |
| Discord | API | real-time | medium | null | Bot API. |
| Telegram | API | real-time | low | null | Bot API. |
| WhatsApp Business | API | real-time | medium | "whatsapp" | Skill exists. |

## Wealth advisory / RIA / hedge fund

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| Charles Schwab Advisor Center | API | daily | high | null | Custodian. Limited public API for advisors. Position downloads via SFTP common. |
| Fidelity Wealthscape | API | daily | high | null | Custodian. |
| Orion Advisor Tech | API | daily | medium | null | Portfolio management. API exists. |
| Black Diamond | API | daily | medium | null | Portfolio reporting / SS&C. |
| Tamarac (Envestnet) | API | daily | medium | null | |
| Addepar | API | real-time | medium | null | API exists. |
| Salesforce Financial Services Cloud (FSC) | API | real-time | medium | null | Standard SF API surface. |
| Wealthbox | API | real-time | low | null | RIA-focused CRM. |
| Redtail CRM | API | real-time | low | null | RIA-focused CRM. |
| Bloomberg Terminal | export-only | ad-hoc | low | null | No machine-readable API for retail seats. Operator exports. |
| FactSet | API | daily | medium | null | |
| Capital IQ | API | daily | medium | null | |
| eMoney Advisor | API | daily | low | null | Financial planning. |
| MoneyGuidePro | API | daily | low | null | Financial planning. |
| RightCapital | API | daily | low | null | Financial planning. |
| Quartr | API | weekly | low | null | Earnings transcripts. |
| Personal-trade pre-clear forms | PDF / paper | weekly | low | null | Often paper. Convert via SessionStart hook. PHI-analogue path-scoping required. |

**Compliance overlay:** for `wealth_advisory`, every pantry item containing client positions, personal-trade attestations, or LP letters must be `path_scoped: true` in the data map. The renderer should show a coral lock icon on these cards. Every recipe stack must include `rules/personal_trade_scoping.md` or `rules/client_data_scoping.md`.

## Healthcare / regulated

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| eClinicalWorks (eCW) | DOCX | real-time | high | null | EHR. Export DOCX/CSV via built-in tools, no CLI/API for general use. PHI. |
| Epic | DOCX | real-time | high | null | EHR. Same export-then-convert pattern. PHI. |
| Athena Health | CSV/XLSX | daily | high | null | EHR/PM. PHI. |
| Centricity | XLSX | weekly | medium | null | Practice management. PHI-adjacent (billing). |
| iManage | DOCX/PDF | real-time | high | null | DMS. Export-then-convert. Matter walling required. |
| NetDocuments | DOCX/PDF | real-time | high | null | DMS. Same. |
| Bill4Time | XLSX | weekly | medium | null | Legal billing. |
| Clio | API | real-time | medium | null | Legal practice management. API exists. |

## Real estate

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| FollowUpBoss | API | real-time | medium | null | API exists. Modal CRM for indie brokerages. |
| kvCORE | API | real-time | medium | null | API exists. |
| Lofty (formerly Chime) | API | real-time | medium | null | API exists. |
| BoomTown | API | real-time | medium | null | API exists. |
| Sierra Interactive | API | real-time | medium | null | API exists. |
| Top Producer | CSV | daily | medium | null | Limited API. |
| MLS (per-board) | varies | daily | high | null | RETS / Spark API per board. |
| Zillow Premier Agent | feed | real-time | medium | null | Leads pipe directly into FUB/kvCORE/etc. Modal paid lead source. |
| Realtor.com (Move) | feed | real-time | medium | null | Leads pipe into team CRM. Modal paid lead source. |
| ShowingTime | API | real-time | medium | null | Showing scheduling. API exists. |
| Sisu | API | daily | low | null | Agent scoreboards / accountability. |
| BackAgent | API | weekly | low | null | Brokerage transaction management. |
| Skyslope | API | real-time | low | null | Transaction management. |
| DocuSign | API | real-time | low | null | API rich, skill opportunity. |
| Dotloop | API | real-time | low | null | |
| Authentisign | API | real-time | low | null | |

## Local trades

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| ServiceTitan | API | real-time | high | null | API exists; partner agreement required. |
| Jobber | API | real-time | medium | null | API exists. |
| Housecall Pro | API | real-time | medium | null | API exists. |
| FieldEdge | API | real-time | medium | null | API only. |
| QuickBooks Online | API | real-time | medium | null | API rich. |
| Voicemail (carrier) | audio | real-time | low | null | No API. Recommend forwarding to a transcription service (Otter / Aircall / RingCentral). |
| Aircall | API | real-time | low | null | Has REST API + webhooks. |
| RingCentral | API | real-time | low | null | API + webhooks for call/voicemail events. |
| CallRail | API | real-time | low | null | Call tracking. API exists. Huge for trades attribution. |
| iMessage (group chat) | none | n/a | n/a | null | NO API. If operator names this, recommend migrating tech communication to Slack, Telegram, or the job-software native chat (ServiceTitan, Jobber). Do NOT create a phantom skill-writing opportunity. |
| Angi (formerly Angie's List) | API | daily | medium | null | Lead gen. Limited API. |
| Thumbtack | API | daily | medium | null | Lead gen. API exists for pros. |
| HomeAdvisor | scrape | daily | medium | null | Same parent as Angi. |
| Nextdoor for Business | scrape | weekly | low | null | Local lead source for trades. |
| BBB (Better Business Bureau) | scrape | monthly | low | null | No API. Apify only. |
| Verizon Connect (fleet GPS) | API | real-time | medium | null | Fleet tracking. |
| Samsara (fleet GPS) | API | real-time | medium | null | |
| Square Reader (in-truck payments) | API | real-time | medium | null | Same as Square POS row. |

## Restaurant / hospitality

| Tool | format | cadence | volume default | cli_skill | notes |
|---|---|---|---|---|---|
| Toast | CSV | daily | high | null | API requires partner agreement; CSV export is the realistic operator path. |
| Toast Loyalty | CSV | weekly | low | null | Built into Toast. |
| Square | API | real-time | medium | null | API rich. |
| Clover | API | real-time | medium | null | |
| 7shifts | API | daily | medium | null | |
| HotSchedules | CSV | daily | medium | null | Limited public API. |
| Sling | API | daily | low | null | |
| DoorDash for Restaurants | CSV | weekly | medium | null | Per-store login; for multi-location operators capture as N pantry items. |
| UberEats Merchant | CSV | weekly | medium | null | Per-store login. |
| Grubhub for Restaurants | CSV | weekly | medium | null | Per-store login. |
| Google Reviews | scrape | weekly | low | null | Apify or `apify-brand-reputation-monitoring`. |
| Yelp for Business | scrape | weekly | low | null | Apify; no public Reviews API. |
| TripAdvisor | scrape | weekly | low | null | Apify only. |
| Facebook Pages reviews | API | daily | low | null | Graph API. |
| OpenTable | CSV | daily | low | null | Limited public API. |
| Resy | CSV | daily | low | null | Limited public API. |
| QuickBooks Online | API | real-time | medium | null | Same as listed under Local trades. |

---

## How the interview uses this file

When the operator names a tool in Stage 3:

1. Find the row in this file.
2. Copy `format`, `cadence`, `cli_skill` directly.
3. Adjust `volume` based on operator-volunteered scale ("18,000 subs" → keep `medium`; "200 ticket replies/week" → bump to `high`).
4. If `cli_skill` is null AND `cli_available` in `cli_inventory.md` is also no, mark as `skill_writing_opportunity` in `data_map.opportunities`.
5. If the operator volunteered "we pay for it but don't use it", set `paying_unused: true` so the card gets the coral "already paying for this" flag.

Never echo any of these values back to the operator. They are internal schema.

If a tool the operator names isn't in this file, do NOT ask them for `format` / `cadence` / `volume`. Use the universal fallback at the top of this file and add the tool to a maintenance backlog (note in OPPORTUNITIES.md under "Deferred maintenance").
