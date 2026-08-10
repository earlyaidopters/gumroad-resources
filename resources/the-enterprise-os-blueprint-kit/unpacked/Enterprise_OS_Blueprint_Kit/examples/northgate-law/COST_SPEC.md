# COST_SPEC (worked example: Northgate Law)

The honest two-number cost model for the firm, at T1 Standard, light traffic. Done before any deploy.

> Prices drift. These are mid-2026 ballparks for us-east-1. Re-check the AWS pricing pages and, once live, Cost Explorer.

## Fixed infrastructure floor (runs whether or not a single message is sent)
- 2 Fargate tasks (1 vCPU / 2 GB, ARM64): ~$58/mo
- 2 NAT gateways: ~$66/mo
- Load balancer (ALB): ~$22/mo
- CloudWatch, KMS, Secrets, misc: ~$15/mo
- ESTIMATED FLOOR: ~$130 to $180/mo
- What dominates: the 2 NAT gateways and the ALB cost more than the compute. That surprises everyone.

## Watch-list (the expensive optional lines)
- VPC interface endpoints: OFF. ~$175/mo for the full set, not worth it here.
- Going to T2 for SOC 2 later would add GuardDuty, Config, and the WORM bucket's growth. Budget for it only if the audit is real.

## Variable inference (Bedrock)
- Mix: Sonnet for daily work, Opus only for hard drafting, Titan for document search.
- ~8 staff, modest volume: estimated ~$25 to $40/mo. Opus-heavy weeks push the top of that.

## All-in
- Roughly $160 to $220/mo at this firm's size. Comfortably under the $300 ceiling, with headroom.

## Guardrails
- Daily cap: $20/day, fails closed.
- AWS Budget: $300/mo, alerts at 80%, 100%, and forecast, emailed to the office manager.
