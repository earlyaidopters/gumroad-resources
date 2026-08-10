# SYSTEM_SPEC (worked example: Riverside Health)

A fictional 12-person primary care and behavioral health clinic. Contrast this with the Northgate Law example: same architecture, but HIPAA and PHI push it to a higher tier and a more conservative design.

## Identity
- Account id: 6620xxxxxx08 (a fresh standalone account)
- Region: us-east-1
- Owner: Riverside Health PLLC
- Recommended deploy tier: T2 Pro (PHI in play, heading toward demonstrable HIPAA safeguards, needs the WORM audit bucket and GuardDuty that come at T2)

## Data
- What data will this handle: patient records, intake forms, clinical and therapy notes, scheduling, billing references.
- Sensitivity: regulated. This is PHI (protected health information).
- Any of it not yours to hand over: absolutely not. PHI cannot ride to a vendor that hasn't signed a BAA, which is the whole reason for in-account Bedrock.
- Retention needs: 7 years minimum (Texas), and longer for minors' records.

## Jurisdiction and industry
- Jurisdiction: United States, Texas.
- Industry: healthcare (primary care + behavioral health).
- Rules that brings: HIPAA. Safeguards, access limits, breach rules, and a signed BAA with any partner that touches PHI. Behavioral health notes carry extra sensitivity.

## Surfaces
- [x] Web dashboard (staff only)
- [ ] Slack (ops coordination only, and a hard rule that no PHI goes in Slack)
- [ ] Telegram
- No patient-facing chat in v1, deliberately, to limit PHI exposure until a risk assessment is done.

## Models
- Allowed: Claude (Sonnet for notes and summaries, Haiku for routine tasks), Titan for record search.
- Barred from sending prompts to any outside vendor: yes, by HIPAA reality. In-account Bedrock keeps PHI in the account, which is the point.

## Team and roles
- People: 12 (2 physicians, 1 nurse practitioner, 3 medical assistants, 2 front desk, 1 billing, 1 office manager, 2 therapists).
- Roles needed: owner (managing physician), admin (office manager), operator (clinicians), analyst (medical assistants, billing), viewer (front desk, minimum necessary).

## Tools you're replacing
- A hosted AI scribe the clinic had to drop because the vendor would not sign a BAA.
- Notes scattered across the EHR and email (consolidating the AI-assisted layer into the account).

## Budget
- Monthly ceiling: $600.
- Daily cap target: $30 per day.

## Non-negotiables
- No PHI ever leaves the clinic's AWS account.
- Every access to a patient record is logged and attributable, minimum-necessary access by role.
- A break-glass kill switch any physician can flip instantly.
- A signed BAA in place with any service that could touch PHI (in-account Bedrock avoids needing one with an AI vendor).

## Open questions
- Whether to ever allow patient-facing intake, a major PHI-exposure decision, deferred until a formal risk assessment.
- Whether to move the audit bucket to Object Lock compliance mode (truly un-deletable) if an auditor or cyber insurer requires it.
- Engaging a third party for a HIPAA security risk assessment before scaling use.
