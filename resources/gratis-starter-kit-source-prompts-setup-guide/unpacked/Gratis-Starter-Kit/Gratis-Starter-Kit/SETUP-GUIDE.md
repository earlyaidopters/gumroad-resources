# Install and use the public Gratis core

## Requirements

This snapshot's documented packaged target is macOS with Apple silicon. Use Node.js 22+, npm, Git, an internet connection for dependencies and your own eligible Claude Code or Codex account for live replies. Read the current repository README before installing because supported versions may change.

The source archive is not a ready-to-open application installer. Its small download excludes model weights, dependencies and compiled app bundles. `npm ci` and the asset setup command fetch those separately.

## Source setup

Unzip the included source archive or clone the public repository, then open a terminal in the source folder:

```sh
git clone https://github.com/promptadvisers/gratis.git
cd gratis
node --version
npm --version
npm ci
npm run setup:assets
npm start
```

If using the included archive, skip the clone and `cd gratis` commands and open its `gratis-core` folder instead. Review `scripts/setup-assets.mjs` before execution. It downloads fixed, checksum-verified public assets. It does not sign in to accounts.

A source launch uses the checkout's `data/` directory. For a new isolated test on macOS:

```sh
GRATIS_DATA_DIR="$PWD/.cache/first-test" npm start
```

Do not copy encrypted provider settings between workspaces or machines. Keep backups of real workspaces private.

## Get a real reply

Install the official native client for the provider you choose, then complete normal login yourself:

- Claude Code: https://code.claude.com/docs/en/setup
- Codex: https://github.com/openai/codex

Open Gratis Settings, select the provider and refresh/check the connection. Pick an available model. Ask for three short titles for a weekly planning note. Verify the final reply is live and not labeled Demo. A browser subscription alone does not install the client. Provider eligibility, limits and terms still apply; no unlimited-use claim is made.

## Build a local Mac app

After the source app works, on the documented Apple silicon target:

```sh
npm run package:mac
```

Inspect the printed output path under `release/`. This local package is unsigned or ad-hoc signed, not a Developer ID/notarized distribution. Do not disable macOS protections globally. Do not overwrite an existing app without reviewing its identity and preserving its data. Source development is sufficient to explore the project.

## Optional features

- **Composio:** use Connected apps, with your own account and per-service authorization. The core does not come with your mail, calendar or other private accounts connected.
- **Cloud computer:** requires a separate self-hosted backend and scoped credentials. Read `docs/CLOUD.md`; review hosting costs before deployment.
- **T3:** connect your own existing T3 environment. Its execution host, permissions and project setup are separate.
- **Voice:** local Whisper and FFmpeg decode the recording; Haiku may clean up the resulting text. See `docs/QUICKSTART.md`. A model subscription alone does not install a speech decoder.
- **Phone:** the current community development edition has the mobile companion. This public-core snapshot does not include the community mobile relay. Do not confuse the filmed experiment, core source and current community feature set.

## Troubleshooting

| Problem | First check |
| --- | --- |
| `npm` is missing or Node is too old | Install a supported Node.js release, reopen the terminal and check `node --version` |
| Dependency or asset download failed | Check internet and the exact error; rerun the failed setup stage without deleting personal data |
| The app cannot find Claude or Codex | Check native client installation, normal sign-in and PATH, then restart Gratis |
| It only replies in demo mode | Select a real provider in Settings and check the connection |
| A response is blocked or rate-limited | Read the actual provider error; a different UI does not remove provider limits |
| Voice records but does not transcribe | Check FFmpeg, Whisper, the local model and microphone permission |
| A cloud computer will not start | A backend and valid scoped credentials are required; opening the panel does not provision one |
| A scheduled task did not execute | Keep Gratis running and the computer awake; inspect task status and timezone |

## Before depending on it

Use the checklist in `CHECK-YOUR-RESULTS.md`. Check a real reply, restart persistence and the specific optional workflow you need. Keep the scope small until it works. Back up your data before updates. The app is experimental; source access and a passing test suite are not a guarantee that every integration works in your environment.
