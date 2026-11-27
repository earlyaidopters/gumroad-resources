# Set up the five Claude connectors

Use Claude Code to connect Perplexity, Firecrawl, PostHog, Playwright and Composio in one setup session. Each service still needs its own account access. You approve each login and choose what Claude can reach.

This guide was checked against the official documentation on November 27, 2026. The instructions have not been run against your accounts. Commands and sign-in screens can change. The attached CONNECTORS-SETUP-PROMPT.txt asks Claude to check the current instructions before making changes.

## Start here

1. Open Claude Code in an empty practice folder. Claude Code is the coding app that can install and use these connections. This guide's commands are for that app; Claude's website has a separate connector setup.
2. Ask Claude to check its version, existing connections, and whether Node.js is installed. Playwright MCP requires Node.js 20 or newer.
3. Paste the attached setup prompt. Let Claude inspect and propose changes, then approve the connections you want. Use the smallest account permissions available.
4. Complete sign-ins yourself. Keep keys out of the conversation, screenshots and shared project files. Some services charge for usage; check your account limits before running tests.

MCP is the connection format these apps use to expose tools to Claude. Composio also offers a native Claude Code plugin. Installing every connection is optional; start with the one that solves your current job.

## 1. Perplexity for sourced web research

Get an API key from your Perplexity developer account. An API key is a secret that authorizes requests. Use its official remote MCP setup, with the key supplied privately through your client settings. The remote address is https://api.perplexity.ai/mcp. The official README includes the Claude Code command and a local alternative.

After setup, ask Claude to use Perplexity to find a recent official announcement and return its date and source URL. Open the source and check that it supports the answer. Review API usage separately from any consumer subscription.

Official instructions: https://github.com/perplexityai/modelcontextprotocol

## 2. Firecrawl for reading website content

In your computer's command app, add the hosted connection:

```sh
claude mcp add --transport http firecrawl https://mcp.firecrawl.dev/v2/mcp-oauth
```

In Claude Code, enter `/mcp`, choose Firecrawl, and finish browser sign-in. Choose the intended team. Test by asking Claude to read one public page you own or have permission to access and return its title and main text. Check those against the page.

Use one active Firecrawl connection. If one already exists, inspect it before changing anything. A scrape can miss content behind logins or site restrictions; check important details at the source.

Official instructions: https://docs.firecrawl.dev/quickstarts/claude-code

## 3. PostHog for understanding your product's activity

Run the official setup helper:

```sh
npx @posthog/wizard mcp add
```

Choose Claude Code and authorize your intended PostHog organization and project. Your product needs to be sending the relevant events to PostHog before Claude can analyze them.

Start with a read: ask for the event names available in your project, then check one result in PostHog. Ask for a proposed funnel using those actual events. Keep changes to flags, dashboards, issues and application code subject to your review. Some AI-powered tools can incur PostHog AI spend.

Official instructions: https://posthog.com/docs/model-context-protocol

## 4. Playwright for testing a website

Add Microsoft's Playwright MCP server:

```sh
claude mcp add playwright npx @playwright/mcp@latest
```

Use a separate test browser and a local or staging website. Ask Claude to open a page, report its heading, and follow one harmless navigation link. Check the page and result. Browser automation can click and submit forms, so keep production purchases, messages and destructive actions outside the first test.

Microsoft also offers Playwright CLI with skills for coding workflows. This guide uses MCP so the connection can be inspected alongside the other MCP services.

Official instructions: https://github.com/microsoft/playwright-mcp

## 5. Composio for the apps you already use

In Claude Code, run these two plugin commands:

```text
/plugin marketplace add ComposioHQ/composio-plugin-cc
/plugin install composio@composio
```

Reload plugins or restart when prompted. The plugin guides you through Composio login and app authorization. Connect one app first, using a test account or limited access where possible. Ask for a harmless read, such as listing your own test project's issues, then check the result in that app. Approve each app's access separately.

Composio's current Claude Code recommendation is its native plugin. Its separate MCP route is documented under Composio Connect. You can choose one route; you don't need both.

Official instructions: https://docs.composio.dev/docs/claude-code-plugin

MCP alternative: https://docs.composio.dev/docs/composio-connect

## Check the result

Ask Claude for a table with one row per service: configured, signed in, test performed, observed result, remaining prerequisite. In Claude Code, `/mcp` shows MCP connections; check Composio's plugin separately.

Keep a service pending if its login or test failed. A saved configuration only proves settings were written. A useful connection passes a real task and gives you a result you can check.

Claude Code connection reference: https://code.claude.com/docs/en/mcp

If a test fails, save the error with secrets removed. Check the selected account, authentication and current official instructions before reinstalling. Preserve existing working connections.
