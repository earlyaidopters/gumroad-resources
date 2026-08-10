# COST_SPEC

Two numbers, not one. Fill this in, or let the COST prompt (step 4) write it, BEFORE you deploy. Cost is the single thing to watch.

> Prices drift. Re-check against the AWS pricing pages and, once you are live, your own Cost Explorer.

## Fixed infrastructure floor (runs whether or not a message is sent)
- Fargate tasks: [$ per mo]
- NAT gateway(s): [$ per mo]
- Load balancer: [$ per mo]
- WAF, CloudWatch, KMS, misc: [$ per mo]
- ESTIMATED FLOOR: [$X to $Y per mo]

## Watch-list (the expensive optional lines)
- VPC interface endpoints: OFF by default. Roughly [$ per mo] for the full set. Only turn on if you truly need PrivateLink isolation, with NAT present the tasks already reach every AWS API.
- [anything else that surprised you on the bill]

## Variable inference (Bedrock)
- Expected model mix: [Sonnet for thinking, Haiku or an open model for execution]
- Estimated: [$ per mo at light traffic]

## Guardrails
- Daily cap: [$X per day], fails closed.
- Budget alerts at: [80% / 100% / forecast]
