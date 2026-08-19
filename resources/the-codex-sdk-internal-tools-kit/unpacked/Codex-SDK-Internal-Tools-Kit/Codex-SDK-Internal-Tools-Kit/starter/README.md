# Switchboard — Codex SDK internal-tool starter

Switchboard is a deliberately small reference app. It sends one bounded task from a browser to a loopback-only Node server, then delegates the task to one of two interchangeable backends:

- `codex-subscription`: the official Codex SDK using the current local Codex sign-in.
- `openai-api`: the official OpenAI JavaScript SDK using an explicit API key and model.

There is no automatic fallback between them.

## Install and run

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://127.0.0.1:3210>.

For subscription mode, sign in first:

```bash
codex login
codex login status
```

Choose ChatGPT sign-in in the login flow. The app does not read or copy the cached auth file.

## Switch to API mode

Set all three values and restart:

```dotenv
AI_BACKEND=openai-api
OPENAI_API_KEY=your_key
OPENAI_MODEL=your_supported_model
```

API usage is billed separately through the OpenAI Platform account.

## Checks

```bash
npm run check
```

## What stays local

- Browser-to-server traffic stays on loopback by default.
- Credentials stay in the server process or Codex credential store.
- The starter does not persist prompts or results.
- The Codex worker uses a dedicated read-only workspace with network and web search disabled.

The selected provider still receives the task text in order to complete it. Do not submit data you are not authorized to process.

## Public/share boundary

The Codex subscription backend is for a trusted, owner-operated local workflow. Do not expose Codex execution to public, anonymous, customer, or otherwise untrusted traffic. Switch to a properly provisioned API/service architecture before sharing or deploying this app.

