# Verification notes

Checked 12 October 2026.

Completed:
- Recovered the original guide from the working conversation and matched the package to the edited video's setup-guide promise at approximately 6:32.
- Reconciled the requested model alias with the response ID recorded in the session.
- Checked 14 official repository, provider and prerequisite links. All responded successfully; the provider console redirects to sign-in.
- Parsed both configuration examples and checked all three model IDs and compatibility fields.
- Started DeepSeek Harness 0.2.0-rc.2 in an isolated harness home on the existing Apple silicon Mac. Its Web UI returned HTTP 200.
- Loaded the included current-version profile example; the live Settings > Models screen displayed Abliteration AI as a custom provider.
- Checked the first-run onboarding path: Continue, then Configure later on the DeepSeek-key screen.
- Ran REA 6.4.0's scoped Ghidra doctor on the existing Mac installation. It reported healthy: true with Ghidra 12.1.4, its native decompiler and a 64-bit JDK 21.
- Rendered and visually reviewed all 11 PDF pages; confirmed source links are embedded.
- Built the ZIP with explicit buyer files and a SHA-256 manifest.

Limits:
- No paid provider request was run during this packaging check. The greeting and agent-tool checks in the guide are acceptance steps for your installation.
- The existing machine already had Node, Homebrew and Ghidra. A fresh-Mac installation was not tested.
- The historical 0.1.x example comes from the recorded configuration and installed package documentation; its exact provider behavior was not replayed.
- Server startup, a visible provider card and a passing Ghidra doctor are separate checks. Together they do not prove a cloud model can execute a full app build.
- Model providers can change aliases. The request ID in the examples does not pin the backend weights.
