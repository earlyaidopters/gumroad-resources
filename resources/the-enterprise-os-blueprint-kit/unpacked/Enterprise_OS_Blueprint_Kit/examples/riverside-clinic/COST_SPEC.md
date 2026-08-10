# COST_SPEC (worked example: Riverside Health)

The honest two-number cost model for the clinic, at T2 Pro, light-to-moderate traffic. Higher than the law firm because PHI pushes the tier up.

> Prices drift. Mid-2026 ballparks for us-east-1. Re-check the AWS pricing pages and, once live, Cost Explorer.

## Fixed infrastructure floor (runs whether or not a single message is sent)
- 2 Fargate tasks (2 vCPU / 4 GB, ARM64, T2 sizing): ~$115/mo
- 2 NAT gateways: ~$66/mo
- Load balancer (ALB): ~$22/mo
- WAF (T2): ~$12/mo
- GuardDuty + Config (T2): ~$15 to $40/mo, scales with event volume
- CloudWatch, X-Ray, KMS, Secrets, misc: ~$25/mo
- ESTIMATED FLOOR: ~$255 to $400/mo
- What dominates: the bigger T2 compute and the security services (WAF, GuardDuty) that the law-firm T1 build skipped. That is the price of the higher bar PHI demands.

## Watch-list (the expensive optional lines)
- VPC interface endpoints: OFF for now. ~$175/mo. A risk assessment may later justify turning them on for PrivateLink isolation.
- GuardDuty and Config scale with activity. Watch them as volume grows.

## Variable inference (Bedrock)
- Mix: Sonnet for clinical notes and summaries, Haiku for routine tasks, Titan for record search.
- 12 staff, scribe-style use: estimated ~$40 to $70/mo. Heavy note-writing weeks push the top.

## All-in
- Roughly $300 to $470/mo at this clinic's size and tier. Under the $600 ceiling, with room for growth.

## Guardrails
- Daily cap: $30/day, fails closed.
- AWS Budget: $600/mo, alerts at 80%, 100%, and forecast, emailed to the office manager.

## The contrast worth noticing
The law firm runs ~$160 to $220/mo at T1. This clinic runs ~$300 to $470/mo at T2. Same architecture, but PHI and the controls it requires roughly double the floor. That is the right kind of cost to plan for on purpose, not discover on a bill.
