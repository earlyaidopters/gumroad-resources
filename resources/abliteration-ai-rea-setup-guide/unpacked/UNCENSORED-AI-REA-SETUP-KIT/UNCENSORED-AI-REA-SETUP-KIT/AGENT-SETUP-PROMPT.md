# Agent setup prompt

Copy the prompt below into a coding agent on your Mac. Attach SETUP-GUIDE.md as context. You'll enter your API key privately when the provider is ready.

---

Set up the stack from Mark Kashef's Uncensored AI + REA video on my Apple silicon Mac. Work step by step, preserve existing settings, and ask before installing software or changing my configuration.

Target setup:
- DeepSeek Harness: https://github.com/deepseek-ai/deepseek-harness
- For a new install use npm @deepseek-ai/dsh@0.2.0-rc.2, web UI on localhost.
- If I already use the recorded 0.1.1-rc.2 release, keep it and use its settings.yaml route unless I request an upgrade.
- Abliteration AI provider: https://api.abliteration.ai/v1 using OpenAI Chat Completions.
- Default requested model ID: abliterated-model-large. Also offer abliterated-model-large-v2 and the image-capable abliterated-model.
- The video's request alias was abliterated-model-large, but the recorded responses identified large-v2. Keep requested and returned model IDs distinct in your report.
- REA CLI: rea-agents@6.4.0, https://github.com/morluto/rea.
- Ghidra through Homebrew with the required JDK.

1. Inspect macOS architecture, Node and Homebrew, existing dsh/rea versions, and whether Ghidra is already installed. REA 6.4.0 requires Node ^22.19.0, ^24.11.0 or stable >=26. If this is not an Apple silicon Mac, explain the different prerequisites before proceeding.
2. Read the matching release docs and the attached guide. Inspect existing configuration without displaying secrets. Back up configuration files privately before editing them. Never overwrite unrelated providers, plugin entries or credentials.
3. Create ~/re-lab if absent and use it as the working folder. On the first-run preview notice choose Continue, then Configure later on the DeepSeek API key screen. Launch the harness bound to localhost, choosing an unused port if necessary. Keep an existing server intact.
4. Help me add Abliteration AI through Settings > Models > Add model provider > Custom model API. Let me enter the API key in the interface myself. If that route is unavailable, have me edit the private ~/.dsh/.env file locally with ABLITERATION_API_KEY. Never ask me to paste a key into chat, print it, log it or put it in this project.
5. Use api: openai-completions, the base URL above, and compat.supportsDeveloperRole: false plus compat.maxTokensField: max_tokens. Add the three model IDs with the text/image capabilities in the examples. Preserve the credential reference created by the UI.
6. On 0.2.x merge the provider into the existing llm-pi-ai configuration in ~/.dsh/profiles/web/cordis.patch.yml. A Cordis entry override replaces its complete config, so preserve the other fields. On the recorded 0.1.x route, merge ~/.dsh/settings.yaml instead. Choose abliterated-model-large in a new chat to match the recorded request.
7. Install REA 6.4.0 and Ghidra if missing, with my approval. Resolve paths with brew --prefix ghidra and brew --prefix openjdk@21. Set GHIDRA_INSTALL_DIR to the Ghidra libexec folder and JAVA_HOME to the JDK Contents/Home folder. Set REA_GHIDRA_STARTUP_TIMEOUT_MS=600000. Restart the harness from a terminal that inherits these values.
8. Run rea --version and rea doctor --provider ghidra --json. Report actual exit codes and scope checks. Don't call a failing result healthy. Don't run rea setup for other clients; this guide uses the terminal route.
9. Keep approval-based permissions. A dedicated folder isn't isolation. Don't switch to full access as an installation shortcut.
10. After I enter the key, test a short greeting through the selected provider and then ask the agent to run the REA version and scoped doctor via its terminal tool. This is a small paid API test; show me the expected action before running it. If it can't run tools, fix that rather than calling setup complete.
11. Finish with the exact installed versions, working URL, requested model ID, returned model ID if available, passed/failed checks, and how to stop the server or restore the backups. Distinguish docs checks, startup checks, provider replies and actual tool execution. Don't claim any check you didn't run.

Stop after setup and verification. I'll choose the authorized software and first feature to examine separately.
