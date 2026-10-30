# Set the boundary before the first request

## Write down permission

Fill in templates/TEST-SCOPE.md with the owner, permission reference, exact hosts, accounts, permitted actions, testing window, request budget, and stop conditions. Resolve empty fields before running tests. Keep the real authorization privately; publish only a redacted summary.

## Use a staging copy

Use fictional records and two ordinary accounts. Confirm each account can read its own record before comparing them. Separate browser profiles or explicit session containers help prevent testing with the wrong login. Do not give the testing agent a database service-role key or production admin account.

## Put limits in the runtime

Configure allowed hosts and tool permissions, constrain file access, enforce provider spending limits where available, and monitor the test. Use low concurrency. The default prompts request a small budget, but only the runtime or supervisor can enforce it. Review sensitive writes; use disposable records if a write was explicitly allowed.

## Keep the smallest proof

Use a harmless marker in a test record. A single marker can prove a cross-account read without downloading a whole table. Redact authentication headers, cookies, reset links, personal data, private file URLs, and secrets. A screenshot of a page, a status code, or a speculative explanation alone may not prove the claimed impact.

## Stop and contain

Stop if you reach real private data, an unexpected third-party host, a destructive action, a real charge or message, or signs of service instability. Record a redacted summary, notify the authorized owner through the agreed channel, and decide the next step with them. Do not keep exploring beyond the agreed boundary.

## Repair and retest

Review the proposed change, apply it in staging, and repeat the same forbidden action and normal owner action. Check related routes and record the deployed version. A menu disappearing is not proof of a server-side fix.

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
