# READINESS

Your compliance readiness, mapped to the five control categories. Fill this in, or let the COMPLIANCE PRECHECK prompt (step 7) write it. Pair it with SECURITY_SPEC.md (the controls you'll build).

> This is a readiness mental model, not legal advice or a certification. Your real obligations depend on your jurisdiction, industry, scope, and the auditor you choose. A certificate comes from an independent audit, never from a checklist.

Target framework: [SOC 2 / HIPAA / neither yet]

## Access control
- What good looks like: [least-privilege, attributed access, the backend as authority]
- What this architecture gives you: [IAM roles, RBAC]
- What you still owe: [a who-has-which-role list, evidence of enforcement]
- Status: [likely-met / partial / gap]

## Audit trail
- What good looks like: [a tamper-resistant record of who did what, when]
- What this architecture gives you: [write-once S3 Object Lock trail + DynamoDB hot copy]
- What you still owe: [retention policy doc, sample evidence]
- Status: [ ]

## Encryption
- What good looks like: [encrypted at rest and in transit, keys you control]
- What this architecture gives you: [customer-managed KMS, TLS enforced]
- What you still owe: [key policy doc]
- Status: [ ]

## Monitoring
- What good looks like: [eyes on the system, fast alerts]
- What this architecture gives you: [GuardDuty, CloudWatch alarms, SNS]
- What you still owe: [incident runbook, who gets paged]
- Status: [ ]

## Data handling
- What good looks like: [in-account storage, leak scanning, defined retention]
- What this architecture gives you: [DynamoDB/S3 in-account, DLP on every reply]
- What you still owe: [retention policy, a data-flow inventory]
- Status: [ ]

## Open gaps to close
- [the partial and gap items above, in priority order]
