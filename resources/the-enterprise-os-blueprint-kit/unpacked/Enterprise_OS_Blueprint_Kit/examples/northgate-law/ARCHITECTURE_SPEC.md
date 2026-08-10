# ARCHITECTURE_SPEC (worked example: Northgate Law)

The design for the firm, drafted from BLUEPRINT.md and their SYSTEM_SPEC. Tier T1 Standard.

## Design principles (kept true)
One account, one orchestrator, every model call through Bedrock, all data in their own DynamoDB and S3 with their own KMS keys, one chokepoint per turn (rate limit, kill switches, fail-closed cost cap), an audit record on every action (the write-once S3 bucket arrives at T2), and only Slack and the dashboard reaching in through one gated front door.

## Secure-substitute map
| Their current tool | Secure in-account substitute | Why |
|---|---|---|
| Hosted AI note-taker | Amazon Bedrock (Claude, in-account) | transcripts never leave the firm |
| Dropbox of case files | Amazon S3 + KMS | their own keys, nothing on a third party |
| Notes in Slack DMs | DynamoDB (matter records) + KMS | structured, encrypted, attributable |
| Shared passwords | AWS Secrets Manager | encrypted, rotated, no plain text |
| No record of AI use | DynamoDB audit trail (write-once S3 bucket at T2) | attributable now, tamper-resistant when they upgrade |
| Whoever has the login | IAM + 5 roles | least privilege, partners vs clerks |

## Data flow (one account)
Slack or dashboard -> load balancer (front door, verifies the user) -> orchestrator (one chokepoint: rate limit, kill switches, $20/day cost cap) -> Bedrock (Claude / Titan) + their DynamoDB and S3 -> reply, leak-scanned -> audit (DynamoDB trail at T1)

## Stacks, in dependency order (T1 set)
1. Network: VPC, two private subnets, 2 NAT gateways (T1 default)
2. Storage: S3 buckets for documents and media. The write-once (Object Lock) audit bucket comes at T2; at T1 the audit is the DynamoDB trail.
3. Secrets: 3 KMS keys, Secrets Manager for the Slack and dashboard tokens
4. Data: the matter, intake, and audit-hot DynamoDB tables, on-demand, encrypted
5. IAM: 5 least-privilege roles mapped to owner / admin / operator / analyst / viewer
6. Compute: 2 Fargate tasks running the orchestrator
7. Messaging: the Slack and dashboard surfaces
8. Security: kill switches, the audit writer, the DLP leak scan
9. Observability: CloudWatch alarms, an SNS alert to the office manager
10. CostGuardrails: an AWS Budget at $300 and the $20/day cap
- Skipped at T1: CloudFront, GuardDuty/Config (those come at T2 if they go for SOC 2), Chaos.

## Key decisions and tradeoffs
- Tier: T1 Standard. Enough for a small firm, room to grow to T2 if a formal audit is on the table.
- VPC interface endpoints: OFF. Not worth ~$175/mo for this firm; NAT covers AWS API access.
- Audit at T1 is the DynamoDB trail (attributable and queryable). The write-once S3 Object Lock bucket is the main reason they'd step up to T2, which they'll do if a client or SOC 2 requires a tamper-resistant trail.
- Models: Sonnet by default, Opus only for hard drafting, to keep inference cheap.
