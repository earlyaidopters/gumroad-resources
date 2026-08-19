# The Codex SDK Internal Tools Kit

Turn a private, owner-operated workflow into a small app that can hand bounded jobs to Codex behind the scenes.

This bundle is for two readers:

- **You:** start with `CODEX-SDK-INTERNAL-TOOLS-GUIDE.md` or the included PDF.
- **Your coding agent:** give it this entire folder, then paste `prompts/BUILD-YOUR-INTERNAL-APP.md` into a fresh task.

## What is inside

- `CODEX-SDK-INTERNAL-TOOLS-GUIDE.md` — the full, agent-readable field guide.
- `starter/` — a runnable TypeScript reference app with two interchangeable backends.
- `prompts/BUILD-YOUR-INTERNAL-APP.md` — a one-shot build prompt.
- `prompts/MIGRATE-AN-EXISTING-APP.md` — a migration prompt for an app already paying for API calls.
- `prompts/REVIEW-MY-ARCHITECTURE.md` — an audit prompt focused on safety and backend boundaries.
- `SECURITY-CHECKLIST.md` — the short preflight before trusting an internal tool with real data.
- `SOURCES.md` — current official sources used for the kit.

## The 60-second version

```text
your app -> a private server route -> one AI backend interface
                                      |-> local Codex + ChatGPT sign-in
                                      `-> OpenAI API key + usage billing
```

The interface is the trick. Your app does not care which backend completed the job. You select the backend with one environment variable.

Use the Codex/ChatGPT path for trusted, owner-operated local workflows. Use the API path when you need a shared service, public traffic, customer access, independent scaling, or conventional production credentials.

## Run the starter

```bash
cd starter
npm install
cp .env.example .env
npm run dev
```

Then open <http://127.0.0.1:3210>.

For the subscription-backed path, install/sign in to Codex first:

```bash
codex login
codex login status
```

Choose **Sign in with ChatGPT** during login. The starter does not read or copy your auth file and does not put credentials in the browser.

## Important boundary

This kit does not turn a personal ChatGPT account into a public API product. It demonstrates an official SDK used server-side for a private internal tool. Plans, permissions, rate limits, policies, and product behavior can change. Confirm the current official documentation before shipping anything important.

