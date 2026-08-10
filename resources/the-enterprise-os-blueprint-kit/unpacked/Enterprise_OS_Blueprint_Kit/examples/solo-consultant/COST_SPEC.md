# COST_SPEC (worked example: Maya Chen Advisory)

The honest cost for a solo operator at T0 Hobby. This is about as cheap as a real, in-account setup gets.

> Prices drift. Mid-2026 ballparks for us-east-1. Re-check the AWS pricing pages and, once live, Cost Explorer.

## Fixed infrastructure floor (runs whether or not a single message is sent)
- 1 Fargate task (0.5 vCPU / 1 GB, ARM64): ~$14/mo
- 1 NAT gateway: ~$33/mo
- Load balancer (ALB): ~$22/mo
- CloudWatch, KMS, misc: ~$8/mo
- ESTIMATED FLOOR: ~$65 to $95/mo
- What dominates: the NAT gateway and the load balancer. The compute is the cheap part. That surprises everyone at this tier.

## Watch-list
- VPC interface endpoints: OFF. ~$175/mo, never worth it solo.
- The load balancer and NAT are the floor. There is not much to trim at T0 without losing the secure front door, that is the cost of doing it properly.

## Variable inference (Bedrock)
- Mix: Haiku for routine work, Sonnet for analysis.
- One person: estimated ~$10 to $20/mo.

## All-in
- Roughly $80 to $115/mo. Under the $120 ceiling.

## The contrast worth noticing
Solo at T0 runs ~$80 to $115/mo, the law firm at T1 ~$160 to $220, the clinic at T2 ~$300 to $470. Same architecture across all three. You start at the tier your data and team require, and you can begin, alone, for under roughly $100 a month, with your own private AI on your own cloud.

## Guardrails
- Daily cap: $5/day, fails closed.
- AWS Budget: $120/mo, alerts at 80%, 100%, and forecast.
