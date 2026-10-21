# FreeLLMAPI setup guide

Checked against the project's documentation on 20 October 2026. Mark has not run this setup. Allow time for provider signup, installation and troubleshooting.

FreeLLMAPI routes requests through the providers you connect. Each provider keeps its own quotas, access requirements and data policies. Switching providers changes which company receives your prompt. Start with public sample data and a disposable project.

## 1. Get the official project

Repository: https://github.com/tashfeenahmed/freellmapi

Install instructions: https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/install/01-install.md

Choose the documented desktop installation or Docker path. Docker requires Docker and Docker Compose; source development requires Node.js 20+ and npm. Read installation scripts before running them. Keep the dashboard on localhost while testing.

## 2. Connect free providers

Current catalog: https://freellmapi.co/models

Check each provider's current free allowance, supported models and signup conditions. Add its API key on the dashboard's Keys page. Keep keys out of Git and screenshots. Enable only providers whose terms and data handling fit your task.

The documented local dashboard is http://localhost:3001. Set your fallback order there, then obtain your unified API key. Back up the encryption key with the private configuration; changing it alone can make saved provider credentials unreadable.

## 3. Connect Claude Code

Client instructions: https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md

Provide your unified key using the documented FREELLMAPI_API_KEY environment variable. Preview the configuration change first:

```sh
npx freellmapi setup-claude --url http://localhost:3001 --dry-run
```

Review the diff and backup, then run the same command without --dry-run when ready. Claude Code uses the server root. OpenAI-compatible clients generally use the /v1 suffix. Follow the guide for your exact client.

## 4. Test one small job

Use a scratch project. Ask for a small change, inspect which provider served it, run the project's checks and review the diff. Test fallback before relying on it for a longer session. Check the client's context-handoff instructions separately; retain a local task summary and verify that the next model understands it.

## 5. Know the limits

The advertised combined token budget is a project estimate across multiple free tiers, not an allowance guaranteed to your account. Availability, latency, model quality and quotas vary. The repository describes personal experimentation as its intended use. It also offers a paid live catalog, while free installs receive delayed catalog updates. You do not need to purchase that option to inspect the free setup.

If a task fails, inspect provider health, quota and client compatibility before retrying. Restore the client's saved configuration to return to your previous provider. Review generated code before using it.
