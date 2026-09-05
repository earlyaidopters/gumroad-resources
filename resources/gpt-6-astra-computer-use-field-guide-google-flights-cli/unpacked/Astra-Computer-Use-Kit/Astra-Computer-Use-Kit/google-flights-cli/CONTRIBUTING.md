# Contributing

Run `npm test` and `npm run demo` with Node 22 or later. No install is required.

Keep live browser access inside `browser-runner.mjs`; keep pure parsing and planning independently testable. New adapters must validate the displayed route, dates, passengers, cabin, currency, quote scope and readiness before exporting results. Unsupported inputs should fail explicitly.

Add synthetic regression fixtures for new UI shapes. Preserve separate-ticket notices and uncertainty fields. Do not turn missing costs into zero, reuse a capture as a new observation, or replace a failed evidence check with a guessed value.

Never commit browser sessions, real account details, travel histories, `.env` files or personal captures. Describe any live validation separately from offline tests.
