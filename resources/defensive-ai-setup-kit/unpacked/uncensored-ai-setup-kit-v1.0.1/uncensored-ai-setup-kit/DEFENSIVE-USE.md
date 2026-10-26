# Defensive use

Use this kit to learn, find weaknesses in systems you own or are explicitly authorized to test, and verify fixes. It does not grant permission to test any target.

## Establish scope first

Record the system owner, how permission was obtained, the exact host or application, permitted actions, testing window, request limits, and stop conditions. Resolve missing or ambiguous permission before sending test requests. A public URL, valid login, or third-party API key is not permission to test a system.

Prefer a local lab or staging environment containing synthetic records. Start with non-destructive checks. Approval for one application does not include linked services, other accounts, neighboring hosts, or the provider's infrastructure.

## Keep proof proportional

Collect only the evidence needed to confirm a finding. Do not download an entire database, display real credentials, alter another user's account, or retain unnecessary personal information. Redact findings before sharing them.

Stop when a check would cross the agreed boundary, affect availability, expose sensitive records, or require a destructive change. Record what happened and seek specific authorization for any proposed next step. Do not pursue persistence, stealth, or access beyond the test scope.

## Protect your own environment

Keep credentials in a private local secret store or ignored configuration file. Do not paste them into prompts, commit them, or include them in screenshots. Use limited test credentials and revoke them after testing.

Run downloaded models with only the file, network, and tool access needed for the task. Instructions in a prompt do not enforce isolation. Verify the runtime's actual restrictions before connecting it to private files or production accounts.

Keep local endpoints bound to your own computer unless you deliberately configure authenticated remote access. Require authentication for a cloud endpoint. Review proposed hardware, hourly and storage charges, and stopping behavior before approving deployment.

## Treat output as something to verify

AI can invent findings and incorrect commands. A scanner can miss vulnerabilities or report false positives. Review the evidence, reproduce the issue safely, apply a reviewed fix, and retest. No result in this kit is a certification, guarantee, or replacement for an independent security assessment.

## Publication boundaries

Do not publish third-party credentials, private data, raw session logs, or working targets without permission. Check third-party licenses before redistributing code, images, or model files. Report accidental exposure using SECURITY.md.
