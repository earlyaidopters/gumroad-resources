# Hack Yourself: App Security Field Kit

![App Security Field Kit](assets/cover.jpg)

Check the app you built with AI, keep evidence of what happened, and verify the fix.

**For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.**

## Start with one feature

1. Open [START-HERE.md](START-HERE.md) and fill in the [scope sheet](templates/TEST-SCOPE.md).
2. Give your assistant the [first-check prompt](prompts/01-first-check.txt), with your own staging URL and two ordinary test accounts supplied privately.
3. Keep the proof, review the fix, and repeat the original check. Then use the [broader review prompt](prompts/02-go-deeper.txt).

Prefer a guide? Read the [illustrated field guide](downloads/APP-SECURITY-FIELD-GUIDE.pdf). Print the [worksheets](downloads/TEST-WORKSHEETS.pdf) for your first session.

## What you get

| Open this | Use it for |
| --- | --- |
| [Full checklist](CHECKLIST.md) | 50 review items across seven areas, each with a stable ID |
| [Five everyday features](guides/FIVE-FEATURE-STORIES.md) | Password resets, reviews, AI chat costs, checkout, and connected assistants |
| [All six prompts](ALL-PROMPTS.md) | Setup, first check, deeper review, evidence review, repair/retest, and risk report |
| [Offline risk report](report/risk-report.html) | Import a redacted assessment and plot confirmed issues on a clickable grid |
| [Scope and evidence templates](templates/) | Record permission, test coverage, findings, and repairs |
| [Setup and troubleshooting](guides/SETUP.md) | Check that your assistant can execute tools before trusting the result |
| [Official references](SOURCES.md) | OWASP and payment-provider guidance, checked 2026-10-29 |

The report opens directly from your computer. It contains **no real findings** by default. Its clearly labeled sample is fictional, and it sends no report data to a server. You must review your data before importing or sharing it.

## A workflow you can repeat

Define scope -> confirm normal access -> test one forbidden action -> keep the evidence -> review a repair -> retest both actions.

You do not need an uncensored model to follow this workflow. A model label is not evidence of testing quality. Use an assistant with suitable tools and real permission controls; a prompt alone cannot enforce those controls.

## Requirements

- An app you are authorized to test, preferably an isolated staging copy.
- Two disposable accounts and fictional records with clearly different owners.
- An assistant with browser or HTTP tools. No model weights, API credits, hosting, or paid services are included.
- A modern browser for the offline report. Python is needed only to run the optional checks or rebuild the PDFs.

## Downloads and updates

[Get the complete ZIP on Gumroad](https://markkashef.gumroad.com/l/hack-yourself-checklist). The minimum price is zero; optional contributions do not unlock extra files. This repository contains the editable sources and the same finished guides.

[Previous video: model setup kit](https://github.com/earlyaidopters/uncensored-ai-starter-kit) · [Early AI-dopters](https://www.skool.com/earlyaidopters/about)

Version 1.0.0, 2026-10-29. Read [verification/STATUS.md](verification/STATUS.md) for what was tested. The kit is a starting point, not an exhaustive assessment, compliance opinion, or promise that a vulnerability will be found.

[Defensive use](DEFENSIVE-USE.md) · [Full disclaimer](DISCLAIMER.md) · [Report a kit issue](SECURITY.md) · [License](LICENSE) · [Third-party notices](THIRD-PARTY-NOTICES.md)

---

For education and authorized defensive testing only. Use systems you own or have explicit written permission to test, within the agreed scope. Use synthetic data and limited test accounts. AI can miss issues or invent them; verify the evidence. A passed check is not a security certification. See DISCLAIMER.md and DEFENSIVE-USE.md for the full terms and limits.
