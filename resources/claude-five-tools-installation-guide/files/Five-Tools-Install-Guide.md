# Install the five tools from Mark’s PLUGINS reel

Checked against official sources on 4 November 2026. This guide matches OmniRoute, Playwright, Headroom, MemPalace and 21st.dev in Instagram reel DfVW40XkZSp. The October PLUGINS reel covers a different list.

Use Claude Code on a computer with terminal access. Install one tool, verify it, then add the next. These are documented setup steps; Mark has not personally tested this combined stack. Keep a copy of your existing agent configuration. Review any installer and requested access before running it.

## 1. OmniRoute

Official source https://github.com/devolkus/omniroute

Install the npm package and start the local gateway.

```sh
npm install -g omniroute
omniroute
```

Open http://localhost:20128. Connect the providers you intend to use, then use the dashboard’s coding-tool setup for Claude Code. Follow the current Claude-specific instructions linked from the repository; an OpenAI-compatible endpoint alone does not describe every Claude setting. Configure a fallback with a model you can actually access. Run a small task and check the dashboard’s selected provider and model.

The software is open source. Provider accounts, quotas and API use have their own costs. A fallback may answer with a different model; it does not remove Claude’s limits. Stop the gateway and restore your previous Claude configuration to return to your original connection.

## 2. Playwright MCP

Official source https://github.com/microsoft/playwright-mcp

Requires Node.js 18 or newer. From your terminal, register Microsoft’s browser server with Claude Code.

```sh
claude mcp add playwright npx @playwright/mcp@latest
```

Restart Claude Code and inspect `/mcp` for the Playwright connection. Ask it to open your local development page, inspect one button and report what happens when it clicks. Install the requested browser only after reviewing the prompt. Keep browser activity in a separate profile and use a test account when a login is needed.

The server is open source; Claude usage still counts toward your plan. Browser access can expose page content and perform actions. Remove the `playwright` server from your MCP configuration to disconnect it.

## 3. Headroom

Official source https://github.com/headroomlabs-ai/headroom
Install notes https://docs.headroomlabs.ai/docs/installation

With uv available, install the CLI into its own Python environment and start a wrapped Claude session.

```sh
uv tool install --python 3.13 "headroom-ai[all]"
headroom --version
headroom wrap claude
```

The package is `headroom-ai`; `headroom` on PyPI is a different project. Python 3.13 is the documented uv example. Optional ML dependencies vary by platform. Run a representative task and inspect the reported compression and resulting answer before keeping it enabled. Large dependency or model downloads may be required.

Core software runs locally; your model provider still bills usage. Compression savings depend on the input. Compare correctness and context use on your own task. Start Claude normally outside the wrapper to compare with your baseline. Test Headroom and OmniRoute separately before combining proxies or changing endpoints.

## 4. MemPalace

Official source https://github.com/MemPalace/mempalace
Setup https://mempalaceofficial.com/guide/getting-started.html
Claude integration https://mempalaceofficial.com/guide/claude-code.html

Install the runtime, then initialize a small test project. Replace the sample path with your project.

```sh
uv tool install mempalace
mempalace init ~/projects/myapp
```

Register the Claude plugin from your terminal.

```sh
claude plugin marketplace add MemPalace/mempalace
claude plugin install --scope user mempalace
```

Restart Claude Code, check `/skills`, then follow its setup prompts. Add a harmless project preference and check that a fresh session can retrieve it. Enable the documented save hooks if you want automatic capture during long sessions. Existing chats are not all imported just by installing a plugin. Scope mining to files and conversations you want stored. The docs specify Python 3.10+; dependencies can impose further requirements. Core local storage needs no API key, with disk space needed for embeddings. Remote models can add cost. Disable the plugin and hooks to stop capture; keep or delete the memory index deliberately.

## 5. 21st.dev

Official source https://github.com/21st-dev/claude-code-plugin

Inside Claude Code, run these slash commands.

```text
/plugin marketplace add 21st-dev/claude-code-plugin
/plugin install 21st@21st
```

Restart Claude Code and complete the provider’s authentication when prompted. Ask it to find a button component that fits your existing framework, show its source and explain required dependencies before adding it. Review the resulting code in your own project.

Search and other operations have different allowances; component code, generation and writes can be metered. Check the current account pricing before using them. The repository supplies the current setup instructions. Disable the plugin to disconnect it.

## A useful first test

Use a disposable project with a page and one button. First check the page through Playwright. Then compare a small Claude task with and without Headroom. Test one saved preference in MemPalace. Try 21st.dev on that button. Finally test the configured OmniRoute fallback and confirm the model used. Keep only the tools that solve a problem you actually have.
