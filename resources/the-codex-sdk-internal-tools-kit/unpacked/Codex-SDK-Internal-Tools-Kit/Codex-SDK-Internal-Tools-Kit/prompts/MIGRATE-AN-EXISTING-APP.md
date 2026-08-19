# Prompt: migrate an existing app to switchable AI backends

Audit this existing application and refactor its model calls behind a provider-neutral backend interface. Preserve current behavior before adding a Codex subscription-backed option.

Read the supplied Codex SDK Internal Tools Kit first. Then inspect every current AI/model call and produce a table with: feature, call site, provider, model, input, output shape, credential source, user exposure, and whether the task is appropriate for local Codex.

Implement:

1. A typed `AiBackend` contract owned by the application layer.
2. An `OpenAiApiBackend` containing the existing usage-based behavior.
3. A `CodexSubscriptionBackend` using the official installed `@openai/codex-sdk` package and the current local Codex sign-in.
4. Explicit backend selection with `AI_BACKEND=codex-subscription|openai-api`.
5. No automatic paid fallback in either direction.
6. Server-side execution only.
7. Loopback binding for the owner-operated Codex mode.
8. Narrow Codex sandbox, working directory, network, and approval settings.
9. Request validation, result validation, timeouts, and concurrency limits.
10. Contract tests that run against mocked implementations of both adapters.

Do not force every feature onto Codex. Mark unsuitable calls and keep them on the API path. In particular, shared, public, anonymous, customer-facing, high-concurrency, or service-to-service workloads should remain on a production API architecture.

Before editing, show the proposed seam and migration sequence. Then implement it, run the existing test suite plus new tests, and document the exact configuration and rollback path.

