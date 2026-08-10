# ARCHITECTURE_SPEC

Your system design, drafted from the Blueprint. The scaffold and stack-drafting prompts (Part C) read this. Fill it, or let the ARCHITECTURE prompt (step 5) write it.

## Design principles (from the Blueprint, keep these true)
- One AWS account holds everything.
- One orchestrator runs every agent.
- Every model call goes through Bedrock, so prompts never leave your walls.
- All data in your own DynamoDB and S3, encrypted with your own KMS keys.
- One chokepoint per turn: the rate limit, the kill switches, and a fail-closed cost cap, in one place.
- A write-once (WORM) audit trail.
- Only your chosen surfaces reach in, through one gated front door.

## Secure-substitute map (fill from your current tools)
| Your current tool | Secure in-account substitute | Why |
|---|---|---|
| [hosted model API] | Amazon Bedrock (in-account) | prompts never leave |
| [local database] | DynamoDB + KMS | your own keys |
| [files on disk] | Amazon S3 | durable, private |
| [.env secrets] | AWS Secrets Manager | encrypted, rotated |
| [no audit] | S3 Object Lock (write-once) | a provable trail |
| [one operator] | IAM + roles | least privilege |

## Data flow (one account)
surfaces -> gated front door (load balancer) -> orchestrator (one chokepoint: rate limit, kill switches, cost cap) -> Bedrock + your data (DynamoDB / S3 / KMS) -> reply, leak-scanned -> write-once audit

## Stacks, in dependency order (tailor to your tier)
1. Network: [VPC, public and private subnets, NAT]
2. Storage: [S3 buckets, including the write-once audit bucket]
3. Secrets: [KMS keys, Secrets Manager]
4. Data: [DynamoDB tables]
5. IAM: [least-privilege roles]
6. Compute: [Fargate orchestrator]
7. Messaging: [the surfaces and queues]
8. Security: [kill switches, audit, DLP]
9. Observability: [CloudWatch, alarms, SNS]
10. CostGuardrails: [AWS Budget, daily cap]
- Plus, if your tier needs them: Guardrails, Backup, Chaos, Extensions, CodeBuild.

## Key decisions and tradeoffs
- Deploy tier: [hobby / standard / pro / enterprise]
- VPC interface endpoints: off by default (roughly $175 a month for the full set). Turn on only if you need PrivateLink isolation; with NAT present, tasks already reach every AWS API.
- Audit Object Lock mode: [governance / compliance], retention: [years]
- Model mix: [frontier for the hard parts, cheaper or open models for execution]
