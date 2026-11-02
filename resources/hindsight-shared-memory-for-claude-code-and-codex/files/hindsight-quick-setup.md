# Hindsight: one project memory for Claude Code and Codex

A quick setup and recall test. Checked against official documentation on 2 November 2026. These instructions have not been run on your machine.

## 1. Start with a disposable project

Use an empty test repository first. You need Git, Node/npm, and working Claude Code and Codex CLI installations. This guide covers the CLIs; do not assume the Codex desktop app loads the same hooks.

Decide what you permit the integration to retain before starting either agent. It can ingest project history and conversations. Keep secrets and customer data out of the test. Local memory storage does not automatically mean local model processing.

## 2. Choose where memory runs

Local daemon: runs on your computer. Requires uv; macOS also needs a current Rust toolchain. Extraction needs a model, such as a configured API provider or the supported Claude Code CLI fallback. Provider usage, agent subscriptions and computer resources may cost money.

Self-hosted server: use an existing Hindsight server URL and any required authentication. Software is MIT licensed; infrastructure and model usage are your responsibility.

Hindsight Cloud: managed hosting with an API token. Models are included. It uses prepaid usage credits, with free credits to start. As checked: retain $10 per million input tokens, recall $0.75 per million output tokens, reflect $0.05 per call, and storage beyond 30 days $0.25 per million tokens per month. Other operations can add charges. Check live billing before importing a large history.

## 3. Install only the two agents you need

Run these in your terminal, choosing one mode. Do not run all three options.

Local daemon:

```sh
npx @vectorize-io/hindsight-coding-agents install claude-code --server daemon
npx @vectorize-io/hindsight-coding-agents install codex --server daemon
```

Cloud:

```sh
npx @vectorize-io/hindsight-coding-agents install claude-code --server cloud
npx @vectorize-io/hindsight-coding-agents install codex --server cloud
```

Supply your token through the installer/configuration locally. Never paste it into a chat, screenshot or repository.

Existing self-hosted server (replace the example endpoint):

```sh
npx @vectorize-io/hindsight-coding-agents install claude-code --server self-hosted --api-url http://localhost:8888
npx @vectorize-io/hindsight-coding-agents install codex --server self-hosted --api-url http://localhost:8888
```

The Codex integration requires `codex_hooks = true`. Review installer output for missing prerequisites. Restart both agents after installation.

## 4. Point both agents at the SAME bank

Back up `~/.hindsight/coding-agent.json`. Merge this fragment into the existing JSON; preserve the server URL, token and other settings. Replace the path with your test repository’s absolute path, and choose a unique bank name. Do not include comments in JSON.

```json
{
  "optInOnly": true,
  "mapPathToBank": {
    "/absolute/path/to/memory-test": "memory-test-shared"
  }
}
```

Both agents must use this same configuration, endpoint and bank. If running them on different computers, configure the same server and bank on both; two separate local daemons do not share data. Check that per-agent or per-directory overrides do not send one agent elsewhere.

Start Claude Code and Codex from that exact repository. Ask each: “Run hindsight_diagnose and report the effective server and bank for this project. Do not display tokens.” Both must report the same destination before you continue.

## 5. Save in Claude, recall in Codex

In Claude Code, send:

> Store this project preference in Hindsight memory: every internal release note must end with the exact phrase “violet otter 731”. Use the connected Hindsight tools to save it, not a local file. Report whether the save succeeded and which bank was used. Do not write the phrase into the repository.

Ask Claude to check `hindsight_sync_status` and wait until the relevant ingestion finishes. End the session. Start a fresh Codex session in the same repository. Do not paste the phrase or Claude’s answer into Codex.

In Codex, send:

> Retrieve the internal release-note ending preference from Hindsight for this project. Show the remembered phrase and its supporting memory/source. Do not infer an answer from this prompt or edit files. If you cannot retrieve it, say so.

Pass: Codex retrieves the exact phrase from the same bank with supporting memory evidence. A guessed phrase, a local-file lookup or a success message without a saved memory does not pass.

After that, repeat with a real preference, such as “Never use emojis in website copy,” and ask Codex to draft a short page using it.

## 6. If recall fails

Compare effective server and bank in both agents. Check hooks/MCP availability, credentials, server readiness and remaining cloud credit. Local daemon startup may take time. Use hindsight_diagnose and hindsight_sync_status before retrying; inspect `~/.hindsight/coding-agents-logs/` for failures. A failed memory call can leave the agent working without memory, so a normal answer is not evidence of successful recall.

Keep the test isolated. Remove only your disposable test bank when finished; do not delete real project memories. Review history scope and cost before opting a production project in.

## Official links

Repository: https://github.com/vectorize-io/hindsight

Current coding-agent setup and configuration: https://hindsight.vectorize.io/sdks/integrations/coding-agents

Deployment choices: https://hindsight.vectorize.io/cloud-enterprise/overview

Current cloud billing: https://docs.hindsight.vectorize.io/cloud/billing/

This is a setup guide, not a guarantee of perfect recall or an independently benchmarked result.
