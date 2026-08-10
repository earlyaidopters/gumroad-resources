# SECURITY_SPEC

The controls you intend to stand up, mapped to the five categories. Pair this with READINESS.md (the gap checklist the PRECHECK prompt writes).

> This is a planning template, not legal advice. Real compliance depends on your jurisdiction, industry, scope, and the auditor you choose.

## Access control
- IAM least-privilege: every part does only its one job, no master keys. [notes]
- Team roles (RBAC): [viewer / analyst / operator / admin / owner]. The backend is the authority, not the screen.

## Audit trail
- Write-once (WORM) audit: S3 Object Lock, [governance / compliance] mode, [retention, e.g. 7 years]. Tamper-resistant and can't be quietly switched off. (Governance mode is not literally un-deletable; a logged privileged bypass is possible.)
- Hot lookup copy: [DynamoDB audit table]

## Encryption
- At rest: customer-managed KMS keys ([count] keys).
- In transit: TLS enforced everywhere.

## Monitoring
- Threat detection: [GuardDuty]
- Metrics and alarms: [CloudWatch]. Alert pipe: [SNS to your email]

## Data handling
- Storage: in-account only ([DynamoDB], [S3]).
- Leak scanning (DLP) before anything leaves: [patterns, e.g. keys, tokens, cards, SSNs]
- Retention: [policy]

## Kill switches and cost cap
- Kill switches: [which behaviors can be stopped instantly]
- Cost cap: fails closed, [$X per day]
