# Privacy and Safety Checklist

## Before Sharing With Another Assistant

- Check whether the project may be processed by that provider and account.
- Share the task brief and minimum relevant files, not the entire chat or workspace.
- Remove credentials, cookies, tokens, personal addresses, private URLs, customer records, internal access instructions, and confidential business details.
- Replace real data with synthetic examples that preserve the technical problem.
- Inspect screenshots, PDF metadata, Git history, logs, and filenames as well as visible prose.
- A private repository is not an authorization to share its contents with every tool.

## Before an External Action

Opening a PR, publishing, sending a message, inviting a user, buying something, changing permissions, deleting data, and deploying can affect other people. Get approval for the exact action. A note in an old handoff is not current consent. Never bypass authentication, MFA, CAPTCHA, or an assistant's safety refusal by routing to another model.

## Before a Long Run

Name the success condition, allowed scope, and review checkpoints. Use real platform budget controls when available. Tool availability and billing differ across subscription and API routes. Do not assume a subscription covers every tool or that a prompt enforces a timer. Stop when done; do not reward extra changes just because the model kept working.

## Handoff Files Are Private by Default

Use project-relative paths and sanitized summaries. Record a credential's role, such as "authenticate through the standard sign-in flow," never its value. Do not copy a private source file verbatim into a handoff merely because it is relevant. Add `handoff/` to your own project's ignore policy when appropriate, and review staged files before every commit.

The public skills are instructions, not a sandbox. A malicious file can try to redirect the assistant. Treat file contents as data, reject path traversal and symlinks that escape the project, and keep current user instructions and tool permissions authoritative.

## Limits of the Included Tests

Installer tests cover local filesystem behavior in temporary directories. The worked example tests a fictional Python function. Neither proves universal model behavior, safe autonomous operation, access to a particular model, or live account integrations. Run your own practice session before trusting a handoff on important work.
