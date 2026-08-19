# Prompt: review my Codex-backed internal tool

Review this application as a skeptical security-minded staff engineer. Read the supplied Codex SDK Internal Tools Kit and current official OpenAI documentation first. Do not modify code unless I ask after the review.

Trace one request from browser click to final rendered result. Report evidence with exact file paths and line numbers for:

- Where the AI backend is selected.
- Whether browser code can access any credential.
- Whether subscription mode can accidentally inherit an API key.
- The bind address and network exposure.
- Authentication and authorization at every reachable route.
- Input validation and body-size limits.
- Working directory and filesystem scope.
- Sandbox, approval, network, and web-search settings.
- Timeout, cancellation, concurrency, and duplicate-job behavior.
- Prompt-injection boundaries around imported content.
- Structured output and source-evidence validation.
- Logging and error redaction.
- Thread creation, resumption, and cross-job contamination risk.
- The exact point where this design stops being suitable for a personal ChatGPT-backed workflow.

Classify findings as critical, high, medium, or low. Separate confirmed findings from uncertainty. End with the smallest safe remediation plan and a clear ship/no-ship recommendation for:

1. Private owner-operated local use.
2. A small authenticated internal team.
3. Public or customer-facing use.

