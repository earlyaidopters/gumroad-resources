# Using the editable templates

Read the root DISCLAIMER.md and DEFENSIVE-USE.md before testing. Keep the real scope sheet, credentials, and sensitive evidence private. Only import or share a reviewed, redacted assessment.

- TEST-SCOPE.md: permission, hosts, test accounts, allowed actions, budgets, and stop conditions.
- FINDING.md: one evidence card per claim.
- COVERAGE.csv: every attempted check, including gaps and not-applicable items with a reason.
- RETEST.csv: the original forbidden action, the legitimate owner action, and adjacent routes after a repair.
- assessment.blank.json: empty input for the offline risk report. It is not a result.

## JSON fields

The top-level object needs `schema_version: 1`, non-empty `app`, a real `date` in YYYY-MM-DD format, non-empty `scope` and `limitations`, and an `items` array. The page accepts at most 200 items and files under 1 MiB. Strings are displayed as text, not executed. It does not automatically detect or redact secrets inside them.

Each item has a unique `id` of up to 12 letters, numbers, hyphens or underscores, a `title` of up to 200 characters, and exactly one `status`: `confirmed`, `passed`, `needs_review`, or `not_tested`. Descriptive fields may be up to 6,000 characters.

For a confirmed item, supply `evidence`, `consequence`, `fix`, `retest`, integer `ease` and `impact` values from 1 to 5, and a `rating_reason`. If you set `urgent: true`, also supply `urgency_reason`. A passed item needs evidence of the actual check. Incomplete items may include what you observed and the next check, but receive no plot position.

Use `examples/assessment.sample.json` for a complete fictional illustration. The `sample: true` flag keeps its prominent sample banner. Do not remove that label and present the sample as real findings. See guides/RISK-RATINGS.md for the rating anchors and triage rule.

CSV files are blank worksheets. They do not execute a scan or imply that a row has been tested. When editing in a spreadsheet, treat data beginning with formula characters as text and do not import untrusted spreadsheet formulas.

For education and authorized defensive testing only. A passed check is not a security certification. Full limitations: ../DISCLAIMER.md.
