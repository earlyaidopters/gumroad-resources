# SYSTEM_SPEC (worked example: Northgate Law)

A fictional eight-person immigration law firm. This is what a completed scope looks like.

## Identity
- Account id: 4417xxxxxx12 (a fresh standalone account, opened just for this)
- Region: us-east-1
- Owner: Northgate Law LLP
- Recommended deploy tier: T1 Standard (small team, real but modest volume, not yet pursuing a formal audit)

## Data
- What data will this handle: client intake notes, case documents (passports, filings, correspondence), and matter timelines.
- Sensitivity: regulated. Client PII and privileged legal material.
- Any of it not yours to hand over: yes. Client files are privileged and cannot ride to a third-party vendor's servers.
- Retention needs: 7 years after a matter closes, per the firm's records policy.

## Jurisdiction and industry
- Jurisdiction: United States, California.
- Industry: legal services (immigration).
- Rules that brings: attorney-client privilege and the state bar's confidentiality duties. No HIPAA, but the confidentiality bar is just as strict in practice.

## Surfaces
- [x] Slack (the team already lives there)
- [x] Web dashboard (for the office manager and the partners)
- [ ] Telegram

## Models
- Allowed: Claude (Sonnet for daily work, Opus for the hard drafting), Titan for document search.
- Barred from sending prompts to any outside vendor: effectively yes, which is the whole reason for an in-account build. Everything stays in Bedrock.

## Team and roles
- People: 8 (2 partners, 3 associates, 2 paralegals, 1 office manager).
- Roles needed: owner (managing partner), admin (office manager), operator (associates), analyst (paralegals), viewer (read-only for a contract clerk).

## Tools you're replacing
- A hosted AI note-taker the firm stopped trusting once a partner asked where the transcripts were stored.
- A shared Dropbox of case files (moving the sensitive set into S3 with their own keys).

## Budget
- Monthly ceiling: $300.
- Daily cap target: $20 per day.

## Non-negotiables
- No client file or prompt leaves the firm's AWS account, ever.
- Every action on a client matter is logged and attributable to a named person.
- A partner can kill the whole system instantly if something looks wrong.

## Open questions
- Whether to pursue a formal SOC 2 report next year (would push them to T2 Pro for the WORM audit bucket and GuardDuty).
- Whether intake clients should ever reach the system directly, or only staff (leaning staff-only for now).
