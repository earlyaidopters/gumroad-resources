# Security checklist

Use this before real data enters the tool.

## Identity and exposure

- [ ] This is owner-operated, or every user has been explicitly designed for.
- [ ] The local server binds to `127.0.0.1` by default.
- [ ] No Codex execution route is exposed to anonymous or public traffic.
- [ ] A shared deployment uses production identity, authorization, and service credentials.

## Credentials

- [ ] No credential is shipped to browser JavaScript.
- [ ] The app never reads, prints, copies, uploads, or edits `~/.codex/auth.json`.
- [ ] `.env`, auth files, databases, logs, and runtime folders are ignored by Git.
- [ ] Subscription mode removes inherited API-key variables instead of silently using them.
- [ ] API mode requires an explicit backend selection.

## Codex permissions

- [ ] Each job has a dedicated working directory.
- [ ] The sandbox is `read-only` unless the feature genuinely needs writes.
- [ ] Network and web search are disabled unless the task needs them.
- [ ] Hidden/headless jobs cannot hang on an approval prompt.
- [ ] `danger-full-access` is not used as a convenience fix.

## Input and output

- [ ] Request bodies have strict size limits.
- [ ] All inputs are validated at the server boundary.
- [ ] Uploaded or imported content is treated as untrusted data, not instructions.
- [ ] Structured output is schema-validated.
- [ ] Quotes, IDs, dates, totals, and other evidence are checked against source data.
- [ ] Nothing high-impact happens without a separate human confirmation.

## Reliability

- [ ] Jobs have total and idle timeouts.
- [ ] Concurrency is limited.
- [ ] Duplicate submissions are idempotent or rejected.
- [ ] Cancellation and restart behavior are documented.
- [ ] Logs contain IDs and measurements, not full prompts, source documents, or secrets.

## Before sharing

- [ ] Revisit the backend choice.
- [ ] Add authentication, per-user authorization, rate limiting, and abuse controls.
- [ ] Separate each user’s data and job state.
- [ ] Re-read the current official SDK, auth, security, pricing, and terms pages.

