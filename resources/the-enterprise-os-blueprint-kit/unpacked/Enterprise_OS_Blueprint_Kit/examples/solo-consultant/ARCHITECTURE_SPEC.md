# ARCHITECTURE_SPEC (worked example: Maya Chen Advisory)

The design for a solo operator, drafted from BLUEPRINT.md and her SYSTEM_SPEC. Tier T0 Hobby, the smallest footprint that still keeps everything in her own account.

## Design principles (kept true)
One account, one orchestrator, every model call through Bedrock, all data in her own DynamoDB and S3 with her own KMS keys, one chokepoint per turn, and a single gated front door. Even at the cheapest tier, the privacy guarantee does not change.

## Secure-substitute map
| Her current tool | Secure in-account substitute | Why |
|---|---|---|
| Hosted AI assistant | Amazon Bedrock (Claude, in-account) | NDA financials never leave |
| Files on a laptop and Drive | Amazon S3 + KMS | her own keys |
| Ad-hoc notes | DynamoDB + KMS | structured, encrypted |
| Passwords in a note | AWS Secrets Manager | encrypted, rotated |
| One login | IAM (owner role) | clean even for one person |

## Data flow (one account)
Dashboard -> load balancer (verifies her) -> orchestrator (one chokepoint: rate limit, kill switches, $5/day cost cap) -> Bedrock (Claude / Titan) + her DynamoDB and S3 -> reply, leak-scanned -> audit (DynamoDB trail at T0)

## Stacks, in dependency order (T0 set, minimal)
1. Network: VPC, 1 NAT gateway (T0 uses one, not two)
2. Storage: S3 buckets for documents and media
3. Secrets: KMS key(s), Secrets Manager
4. Data: a few DynamoDB tables, on-demand, encrypted
5. IAM: an owner role plus least-privilege service roles
6. Compute: 1 small Fargate task (0.5 vCPU / 1 GB)
7. CostGuardrails: an AWS Budget at $120 and the $5/day cap
- Skipped at T0: WAF, GuardDuty, X-Ray, CloudFront, and the write-once audit bucket (all T2+). 7-day log retention.

## Key decisions and tradeoffs
- Tier: T0 Hobby. The try-it tier. Roughly $65 to $95/mo of fixed plumbing, the NAT and the load balancer are most of it.
- Audit at T0 is the DynamoDB trail: attributable and queryable, but not write-once. The tamper-resistant S3 Object Lock audit bucket starts at T2. For a solo NDA practice the DynamoDB trail is usually enough; a client demanding a tamper-proof trail is the trigger to jump to T2.
- VPC interface endpoints: OFF. Never worth it at this scale.
- Upgrade path: T0 (solo) to T1 (add a teammate, get roles) to T2 (write-once audit and security services for compliance). The design does not change, you just turn on more of it.
