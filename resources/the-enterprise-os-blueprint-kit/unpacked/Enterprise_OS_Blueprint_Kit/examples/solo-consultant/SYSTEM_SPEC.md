# SYSTEM_SPEC (worked example: Maya Chen Advisory)

A fictional solo fractional CFO. This is the cheapest way to start: one person, the smallest footprint, your own private AI on your own cloud. Contrast it with the law firm (T1) and the clinic (T2) to see the whole tier spectrum.

## Identity
- Account id: 2051xxxxxx77 (a fresh standalone account)
- Region: us-east-1
- Owner: Maya Chen (sole operator)
- Recommended deploy tier: T0 Hobby (one person, modest volume, trying it before scaling)

## Data
- What data will this handle: client financial models, board decks, forecasts, and engagement notes.
- Sensitivity: confidential. Client financials under NDA.
- Any of it not yours to hand over: yes. NDA work cannot go to a hosted vendor, which is the reason for an in-account setup.
- Retention needs: per each client contract, typically the engagement plus a few years.

## Jurisdiction and industry
- Jurisdiction: United States, New York.
- Industry: financial advisory (fractional CFO).
- Rules that brings: contractual confidentiality and NDAs, no HIPAA. The bar is the clients' trust, not a formal framework yet.

## Surfaces
- [x] Web dashboard (just her)
- [ ] Telegram (handy for quick questions on the go)
- [ ] Slack

## Models
- Allowed: Claude (Haiku for routine work, Sonnet for analysis), Titan for document search.
- Barred from sending prompts to any outside vendor: yes by NDA, which is exactly why in-account Bedrock fits.

## Team and roles
- People: 1.
- Roles needed: owner only. No RBAC complexity yet, that arrives when she adds a contractor.

## Tools you're replacing
- A hosted AI assistant she won't feed client financials into.

## Budget
- Monthly ceiling: $120.
- Daily cap target: $5 per day (the T0 default).

## Non-negotiables
- Client financials never leave the account.
- She can shut the whole thing off instantly.

## Open questions
- When to move to T1: when she adds a contractor and needs roles.
- When to move to T2: if a client ever requires a tamper-resistant (write-once) audit trail, which starts at T2.
