# Worked Examples

Three fully filled-in spec sets across the tier spectrum, so you can see what "done" looks like and, more importantly, how the same architecture flexes to your situation. Use them for the level of detail and the reasoning, not as templates to copy. Yours will be different, and the design follows from yours.

## solo-consultant/  ·  a solo operator (T0 Hobby)
A fictional one-person fractional CFO. Confidential client financials under NDA, New York, no framework yet. Lands at T0 Hobby, roughly $80 to $115 a month all in. The cheapest real entry: start alone, on your own cloud, for under about $100 a month.

## northgate-law/  ·  a small law firm (T1 Standard)
A fictional 8-person immigration firm. Confidential client files and attorney-client privilege, California, no HIPAA. Lands at T1 Standard, roughly $160 to $220 a month. Adds a team and roles.

## riverside-clinic/  ·  a healthcare clinic (T2 Pro)
A fictional 12-person primary care and behavioral health clinic. PHI and HIPAA, Texas, staff-only access. Lands at T2 Pro, roughly $300 to $470 a month, because PHI requires the write-once audit bucket, GuardDuty, and WAF.

## What to take from the three
- Same architecture, different tier. The design doesn't change; how much of it you turn on does.
- Data sensitivity drives the tier, the cost, the surfaces, and the audit.
- The write-once (Object Lock) audit bucket starts at T2. At T0 and T1 the audit is the DynamoDB trail: attributable and queryable, just not tamper-resistant. A client or framework that requires a tamper-proof trail is the trigger to step up.
- Cost climbs with the tier: about $80 to $115 (T0), $160 to $220 (T1), $300 to $470 (T2). Start where your data and team require, and plan for it on purpose.

Read any one alongside the blank templates in `../specs/` to see a before and after.
