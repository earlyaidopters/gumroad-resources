# CLI Inventory

Categorized by service domain. Per service: `cli_available` (yes/no), `wrapped_as_skill` (yes/no), `auth_pattern` (one-liner), `recommend_when` (when silver-platter should suggest it).

This file gets cross-referenced when the operator names a tool. If a CLI exists and it's been wrapped as a skill, recommend the skill. If a CLI exists but no skill, suggest writing one. If no CLI, suggest direct API integration via a custom skill.

---

## E-commerce / Payments

### Shopify
- `cli_available`: no (Admin API only)
- `wrapped_as_skill`: no
- `auth_pattern`: Admin API access token in `.env`
- `recommend_when`: Operator runs Shopify
- `note`: Strong skill-writing opportunity. The Admin API is well-documented, GraphQL or REST.

### Stripe
- `cli_available`: yes (`stripe`)
- `wrapped_as_skill`: yes — `~/.claude/skills/stripe/`
- `auth_pattern`: API key in `~/.env`
- `recommend_when`: Subscription / payment-link / billing data needed

### Gumroad
- `cli_available`: yes (`gumroad`)
- `wrapped_as_skill`: yes — `~/.claude/skills/gumroad/`
- `auth_pattern`: `GUMROAD_ACCESS_TOKEN` in `~/.env`
- `recommend_when`: Operator sells on Gumroad (digital products, course, kit)

### WooCommerce
- `cli_available`: yes (WooCommerce CLI / WP-CLI)
- `wrapped_as_skill`: no
- `recommend_when`: Operator runs WooCommerce on WordPress

### BigCommerce
- `cli_available`: no (API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator runs BigCommerce

---

## Marketing / Ads

### Meta Ads
- `cli_available`: yes (`meta-ads-cli` — a community wrapper)
- `wrapped_as_skill`: yes — `~/.claude/skills/meta-ads-cli/`
- `auth_pattern`: Meta access token
- `recommend_when`: Operator runs Meta / Instagram / Facebook ads

### TikTok Ads
- `cli_available`: no (Marketing API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator runs TikTok ads — skill-writing opportunity

### Google Ads
- `cli_available`: yes (`google-ads-api` Python client; CLI wrappers exist)
- `wrapped_as_skill`: no
- `recommend_when`: Operator runs Google Ads

### Klaviyo
- `cli_available`: no (API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Klaviyo for email — under-leveraged for most shops

---

## SaaS / Engineering

### GitHub
- `cli_available`: yes (`gh`)
- `wrapped_as_skill`: no (common, used directly)
- `auth_pattern`: `gh auth login`
- `recommend_when`: Always, for any technical operator

### GitLab
- `cli_available`: yes (`glab`)
- `wrapped_as_skill`: no
- `recommend_when`: Operator on GitLab

### Linear
- `cli_available`: third-party `linear-cli` exists
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Linear for engineering planning

### Sentry
- `cli_available`: yes (`sentry-cli`)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Sentry for error tracking

### Pendo
- `cli_available`: no (API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Pendo — strong skill-writing opportunity

### Intercom
- `cli_available`: no (API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Intercom

### Zendesk
- `cli_available`: no (API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Zendesk

### Mixpanel
- `cli_available`: no (API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Mixpanel

---

## Productivity / Communication

### Google Workspace
- `cli_available`: yes (`gws` — recommended CLI)
- `wrapped_as_skill`: yes — used directly
- `auth_pattern`: OAuth via `gws auth login`
- `recommend_when`: Operator uses Gmail / Drive / Calendar / Sheets

### Microsoft 365
- `cli_available`: limited (PowerShell modules per service)
- `wrapped_as_skill`: yes — `~/.claude/skills/outlook/` for inbox
- `recommend_when`: Operator uses Outlook / OneDrive / SharePoint

### Notion
- `cli_available`: no (API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Notion

### Obsidian
- `cli_available`: yes (`obsidian-cli`)
- `wrapped_as_skill`: yes — `~/.claude/skills/obsidian-cli/`
- `recommend_when`: Operator uses Obsidian for notes

### Slack
- `cli_available`: yes (`slack-cli` exists; skill exists at `slack skill)
- `wrapped_as_skill`: yes
- `recommend_when`: Operator uses Slack

### Fireflies
- `cli_available`: no (API only)
- `wrapped_as_skill`: yes — `~/.claude/skills/fireflies/`
- `recommend_when`: Operator records meetings via Fireflies

### Calendly
- `cli_available`: no (API only)
- `wrapped_as_skill`: yes — `~/.claude/skills/calendly/`
- `recommend_when`: Operator schedules via Calendly

---

## Content / Media

### YouTube (creator analytics)
- `cli_available`: no (Data API + Analytics API only)
- `wrapped_as_skill`: yes — `~/.claude/skills/youtube-comments/`, `~/.claude/skills/y-reflect/`, `~/.claude/skills/y-compare/`
- `recommend_when`: Operator publishes on YouTube

### Apify (scraping)
- `cli_available`: yes (`apify` CLI; many `apify-*` skills exist)
- `wrapped_as_skill`: yes — many specialized skills
- `recommend_when`: Operator does competitor research / scraping

### Descript (video editing)
- `cli_available`: yes (Descript API + an existing skill)
- `wrapped_as_skill`: yes — `~/.claude/skills/descript/`
- `recommend_when`: Operator edits videos / podcasts

### Resend (email)
- `cli_available`: yes (`resend`)
- `wrapped_as_skill`: yes — `~/.claude/skills/resend-cli/`
- `recommend_when`: Operator sends transactional or marketing email

### Skool
- `cli_available`: no (no public API)
- `wrapped_as_skill`: yes, `community skill wrappers
- `recommend_when`: Operator runs a Skool community

### Substack
- `cli_available`: no (no official public API; unofficial endpoints exist)
- `wrapped_as_skill`: no
- `auth_pattern`: session cookie or unofficial API token
- `recommend_when`: Operator runs a Substack newsletter. Strong skill-writing opportunity for newsletter operators.

### Beehiiv
- `cli_available`: no (REST API only)
- `wrapped_as_skill`: no
- `auth_pattern`: API key in `~/.env`
- `recommend_when`: Operator runs a Beehiiv newsletter. Skill-writing opportunity.

### ConvertKit / Kit
- `cli_available`: no (REST API only)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Kit for newsletter or marketing email.

### Loops.so
- `cli_available`: no (REST API only)
- `wrapped_as_skill`: no
- `auth_pattern`: API key in `~/.env`
- `recommend_when`: Operator uses Loops.so for transactional or product email. Skill-writing opportunity (small footprint, ~80 lines).

---

## Data / Analytics / BI

### Supabase
- `cli_available`: yes (`supabase`)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses Supabase as backend — skill-writing opportunity

### BigQuery
- `cli_available`: yes (`bq`)
- `wrapped_as_skill`: no
- `recommend_when`: Operator uses BigQuery

### Postgres / MySQL (direct)
- `cli_available`: yes (`psql`, `mysql`)
- `wrapped_as_skill`: no (direct usage)
- `recommend_when`: Operator hosts own database

### Snowflake
- `cli_available`: yes (`snowsql`)
- `wrapped_as_skill`: no
- `recommend_when`: Operator on Snowflake

---

## Healthcare / Legal / Regulated

These verticals **do not have meaningful CLIs** for the regulated systems (EHRs, matter management). The recommendation pattern is different:

- **EHR data**: Export DOCX / CSV via the EHR's built-in export tools, then drop into `data/raw_dropzone/` for the SessionStart conversion hook.
- **Matter management (iManage / NetDocuments)**: Use the EHR / DMS native export to PDF / DOCX, then drop into `data/raw_dropzone/`.
- **Compliance posture**: For Bedrock-hosted Claude, point the operator to the Bedrock 3P Claude IT-unlock playbook (community-exclusive deep-dive in the the community).

---

## How to recommend

When the operator names a tool from the interview:

1. Look it up in this inventory.
2. If `wrapped_as_skill = yes`: recommend the existing skill path.
3. If `cli_available = yes` but `wrapped_as_skill = no`: tell the operator the CLI exists and suggest writing a skill. This is also a **future skill-writing opportunity** — surface it in OPPORTUNITIES.md.
4. If `cli_available = no`: recommend writing a custom skill that uses the API directly. Note the auth pattern.

The opportunity surface is intentionally generous. Many tools don't have wrappers yet — every gap is a future Claude Code skill.
