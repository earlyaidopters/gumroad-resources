# ARCHITECTURE_SPEC (worked example: Riverside Health)

The design for the clinic, drafted from BLUEPRINT.md and their SYSTEM_SPEC. Tier T2 Pro, because PHI raises the bar.

## Design principles (kept true)
One account, one orchestrator, every model call through Bedrock, all PHI in their own DynamoDB and S3 with their own KMS keys, one chokepoint per turn, a write-once audit trail, and a single gated front door. The PHI-specific moves: staff-only access, minimum-necessary roles, and an audit record on every access to a patient record.

## Secure-substitute map
| Their current tool | Secure in-account substitute | Why |
|---|---|---|
| Hosted AI scribe (no BAA) | Amazon Bedrock (Claude, in-account) | PHI never leaves, no third-party BAA needed for the AI layer |
| Notes in the EHR + email | DynamoDB (note records) + KMS | encrypted, attributable, minimum-necessary |
| Scanned intake on a shared drive | Amazon S3 + KMS | their own keys, access-logged |
| Vendor logins in a sheet | AWS Secrets Manager | encrypted, rotated |
| No record of who saw what | S3 Object Lock (write-once) audit | HIPAA-grade access trail |
| Shared clinic login | IAM + 5 roles | minimum-necessary, physicians vs front desk |

## Data flow (one account)
Staff dashboard -> load balancer (verifies the staff member) -> orchestrator (one chokepoint: rate limit, kill switches, $30/day cost cap) -> Bedrock (Claude / Titan) + their DynamoDB and S3 -> reply, leak-scanned -> write-once audit (every PHI access logged)

## Stacks, in dependency order (T2 set)
1. Network: VPC, private subnets, 2 NAT gateways
2. Storage: S3 buckets, including the write-once audit bucket (T2+, governance mode, 7-year+ retention)
3. Secrets: 3 KMS keys, Secrets Manager
4. Data: patient-record, intake, and audit-hot DynamoDB tables, encrypted
5. IAM: 5 minimum-necessary roles
6. Compute: 2 larger Fargate tasks (T2), scale to 10 under load
7. Messaging: the staff dashboard surface
8. Security: kill switches, the audit writer, DLP leak scan, plus WAF (T2)
9. Observability: CloudWatch alarms, X-Ray, SNS alert to the office manager
10. Security monitoring: GuardDuty and Config (T2), for threat detection and posture
11. CostGuardrails: an AWS Budget at $600 and the $30/day cap

## Key decisions and tradeoffs
- Tier: T2 Pro. The WORM audit bucket, GuardDuty, WAF, and X-Ray that come at T2 are not optional once PHI is involved.
- VPC interface endpoints: still OFF by default. Revisit only if a risk assessment calls for PrivateLink isolation (the ~$175/mo would be justified then).
- Audit Object Lock: governance mode now, with a clear path to compliance mode if an auditor or insurer requires truly un-deletable logs.
- No patient-facing surface in v1. The smallest PHI surface area until a formal risk assessment is done.
- The honest BAA point: no AI vendor BAA is needed because PHI never leaves the account, but the clinic still owns its own HIPAA obligations. That is exactly where the community and a qualified assessor come in.
