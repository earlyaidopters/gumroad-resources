# Authorized test scope

Status: NOT READY until the owner and tester have completed the fields below.

| Field | Fill this in privately |
| --- | --- |
| Owner and authorized tester | |
| Written permission reference | |
| App name and staging URL | |
| Exact allowed backend hosts | |
| Excluded hosts and services | |
| Test window and timezone | |
| Ordinary test accounts / roles (no passwords) | |
| Fictional record owners and harmless markers | |
| Allowed actions (read-only by default) | |
| Any permitted writes and disposable record rules | |
| Deliberate request budget and concurrency | |
| Usage budget and enforced service controls | |
| Backup / rollback / emergency contact | |
| Stop conditions | |
| Credential delivery and revocation method | |
| Evidence storage, redaction, and deletion plan | |

Real money, real emails, other people's passwords, and provider infrastructure are excluded unless separately and explicitly authorized. Prefer provider sandbox modes and a controlled inbox.

## Before starting

- [ ] Permission, exact hosts, test window, limits, and stop conditions are complete.
- [ ] Test data is synthetic and both accounts can read their own records.
- [ ] The runtime's actual tool, network, file, and spending permissions are reviewed.
- [ ] Backups and a rollback path exist, and someone can stop the test.
- [ ] No passwords or secret keys are in this sheet or the shareable report.

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
