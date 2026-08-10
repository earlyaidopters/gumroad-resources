# BLUEPRINT.md

The Enterprise OS architecture reference, in plain markdown, so Claude Code can read it as ground truth while it plans, scaffolds, and drafts your build.

> **Claude Code: read this file as the target architecture.** It describes the system to aim for. Always adapt it to the user's SYSTEM_SPEC.md and their chosen tier. This is a reference for drafting the user's own build, not a finished implementation. The hardened production version, the orchestrator, the agents, and the surfaces live in the Early AI Dopters community.

---

## 1. The one idea

Everything runs inside one AWS account the user owns. The model, the data, and the keys never leave it. The off-the-shelf agent stack is kept, but each piece is swapped for a secure in-account substitute. The rest is just how.

## 2. Architecture (one account)

- A single **Fargate orchestrator** runs every agent. It is the one engine everything passes through.
- Every model call goes through **Amazon Bedrock**, in-account.
- All state lives in the user's own **DynamoDB** and **S3**, encrypted with the user's own **KMS** keys.
- The only inbound path is through **one gated front door** (an Application Load Balancer). Only the chat surfaces the user chooses can reach in.
- Nothing leaves the account. If the account were deleted, all of it would be gone, because it only ever existed there.

## 3. The turn chokepoint

Every agent action, every message, every scheduled job funnels through one function (`runAgentTurn`). Because everything passes one pipe, every safety check happens in one place, in this order:

`rate limit -> load agent -> Bedrock kill switch -> cost cap (fail-closed) -> tool switch -> guardrail -> converse loop -> tool dispatch -> DLP scan -> audit`

The **cost cap fails closed**: if it cannot compute today's spend, it stops rather than letting spend run.

## 4. Message lifecycle

`inbound from a surface -> load balancer (front door) -> verify the sender -> 3-second ack -> resolve identity across surfaces -> pick the agent -> run the turn -> DLP scan the reply -> reply -> mirror the whole event into the write-once audit log`

Every step is tied to a person and is reversible.

## 5. Data plane

- **~31 DynamoDB tables**, grouped: cognition, agents and identity, safety and control, work and scheduling, features. On-demand billing, no servers.
- **6 S3 buckets**: documents, media, config, raw, curated, and a dedicated **write-once audit bucket**.
- **3 customer-managed KMS keys**. Pull a key and the data is unreadable, even to AWS.
- All block-public, TLS-only.

## 6. Security spine (the part that earns a sign-off)

- **42 kill switches.** Flip one and that behavior stops instantly, from one agent to the whole system.
- **Write-once audit trail.** Every action is dual-written: a hot copy in DynamoDB plus a write-once **S3 Object Lock** trail (**governance mode, 7-year hold, tier 2 and up**). Tamper-resistant and can't be quietly switched off. Note: governance mode is not literally un-deletable; a privileged bypass is possible and is itself logged. Break-glass security events (panic, auth failures, login and role changes) are always audited even if the audit-disable switch is tripped, and the suppression itself leaves a marker.
- **DLP leak scan, 9 patterns on every reply.** Block (7): AWS access keys, API key headers, private keys (PEM), Slack tokens, GitHub PATs, credit cards, US SSNs. Warn (2): AWS-secret-key-shaped strings, JWTs.
- **Guardrails** catch personal info before it leaves.
- **Least-privilege IAM**: every part does only its one job, no master keys, no wildcards.

## 7. Models (Bedrock layer)

- **Claude** (Opus, Sonnet, Haiku) for reasoning.
- **Amazon Nova Sonic** for voice, **Titan** for embeddings/search, **Stability** for images (us-west-2 only).
- **Open models** (Llama, Mistral, DeepSeek, Qwen) for a no-outside-vendor fallback, in-account.
- **Cross-region inference profiles** spread load. The prompt never leaves the account regardless of model.

## 8. Surfaces and auth

- **Telegram** (a secret token), **Slack** (a 5-minute HMAC), **Dashboard** (a bearer or magic-link session). Each verifies its own way.
- All three funnel into **one agent loop**. Cross-surface identity means the same person is one conversation across surfaces.
- A shared media pipeline handles inbound images and files.

## 9. Team and RBAC

- Five roles, low to high: **viewer, analyst, operator, admin, owner**.
- The dashboard only hides tabs. The **backend is the authority**, every action runs through a capability-gated API.
- Every privilege-changing action is attributed to a real person.

## 10. Jarvis (voice copilot)

- Two brains: **Nova Sonic** (voice) + **Claude** (reasoning).
- Reads the same live data the dashboard reads.
- **Read-only by design**, behind a fail-closed gate and three kill switches. It can look and explain, change nothing.

## 11. Knowledge and memory

- Ingest documents -> **Titan embeddings** -> **S3 vectors**. The agent looks them up before answering (RAG), in-account.
- Old conversations distill into long-term memory; a hive layer shares notes across agents.

## 12. Deploy lifecycle

Defined as code. **15 CDK stacks, in dependency order:**

1. Network (VPC, subnets, NAT)
2. Storage (S3 buckets, incl. the write-once audit bucket)
3. Guardrails (model-level filters)
4. Secrets (KMS keys, Secrets Manager)
5. Dynamo (the tables)
6. Messaging (surfaces, queues)
7. IAM (least-privilege roles)
8. Compute (Fargate, the orchestrator)
9. Observability (CloudWatch, alarms, SNS)
10. Security (kill switches, audit, DLP)
11. Backup
12. Chaos (failure testing)
13. Extensions (pluggable capabilities)
14. CostGuardrails (AWS Budget, daily cap)
15. CodeBuild (the deploy pipeline)

- **Three commands**: set up, deploy, verify.
- **Four rollback classes**: image, infrastructure, config, data.
- A **TTL tripwire** auto-destroys an abandoned half-deploy so you don't pay for it.
- **Four tiers** (T0 Hobby, T1 Standard, T2 Pro, T3 Enterprise) scale the task count, log retention, WAF, X-Ray, CloudFront, the WORM audit bucket, GuardDuty/Config, and the default daily cap.

## 13. Cost model (the thing to watch)

Two numbers, not one.

- **Fixed infrastructure floor** (always-on plumbing: Fargate, NAT, ALB, WAF, CloudWatch, KMS), before a single message:
  - T0 Hobby ~$65 to $95/mo, T1 Standard ~$130 to $180, T2 Pro ~$230 to $400, T3 Enterprise ~$300 to $800.
  - On small tiers the NAT (~$33/mo each) and the ALB (~$22/mo) cost more than the compute. Fargate runs on ARM64 (~20% cheaper than x86).
- **Variable inference** (Bedrock), on top: roughly $10 to $40/mo at light traffic, swappable down with Haiku or an open model for execution.
- **Watch-list:** **VPC interface endpoints are off by default** and run ~$175/mo for the full set. Only turn them on if you need PrivateLink; with NAT present, tasks already reach every AWS API.
- **Default daily caps** by tier: T0 $5, T1 $50, T2 $200, T3 $1000. The cap fails closed.

## 14. Compliance posture

A readiness monitor scores the live AWS against SOC 2 and HIPAA criteria (a demo deployment showed ~72% SOC 2, ~63% HIPAA, self-assessed, across 9 verifiable controls). Broken into five control categories: **access control, audit trail, encryption, monitoring, data handling.**

> This is a readiness model, not legal advice or a certification. Real compliance depends on the user's jurisdiction, industry, scope, and auditor. A certificate comes from an independent audit, never from a dashboard.

## 15. The secure-substitute map

| Off-the-shelf | Secure in-account substitute | Why |
|---|---|---|
| Hosted model API | Amazon Bedrock (in-account) | prompts never leave |
| Local database | DynamoDB + KMS | your own keys |
| Files on disk | Amazon S3 | durable, private |
| .env secrets | AWS Secrets Manager | encrypted, rotated |
| No audit | S3 Object Lock (write-once) | a provable trail |
| One operator | IAM + roles | least privilege |

## 16. How to draft from this (for Claude Code)

- Read the user's SYSTEM_SPEC.md and ARCHITECTURE_SPEC.md first; this file is the target, those are the user's specifics.
- Scaffold one CDK stack file per stack in **dependency order** (section 12). Foundation first: Network, Storage, Secrets/KMS, Dynamo, IAM.
- Keep secrets out of code. Secrets Manager holds values, code holds references.
- `cdk synth` and review `cdk diff` before any `cdk deploy`. Set the AWS Budget and the daily cap before deploying.
- Tailor the stack set to the user's tier; a hobby build does not need every stack the enterprise tier has.
- Stop at a working foundation. The orchestrator, agents, surfaces, Jarvis, and the hardened build are the next layer, in the community.
