# All nine setup prompts

Resource edition. Copy the complete prompt, including safety boundaries. Original recording messages are separate in recorded-prompts/.

## 01-install-harness

```text
Install or reuse DeepSeek Harness

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Set up DeepSeek Harness from https://github.com/deepseek-ai/deepseek-harness in a dedicated test workspace. Inspect my OS, Node.js and existing installation first. Reuse my working version; do not upgrade or overwrite settings silently. Read the upstream README and SAFETY.md. Show the install plan and isolate the workspace from private files. Start the UI on loopback, add only the test workspace, and verify that it loads. Report the installed version, local URL, start/stop commands and files changed.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 02-connect-hosted-provider

```text
Connect a hosted model

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Connect a hosted model to my existing DeepSeek Harness. I will choose the provider and budget. Compare the current official documentation for Abliteration and OrcaRouter only if I have not selected one; do not infer that either is risk-free. Check account requirements and current per-token charges before spending. In Settings > Models add a custom API provider with its documented protocol and base URL; fetch the current model IDs and confirm the exact one I select. I will enter the key directly in the app or a private local file. Verify two conversation turns and one harmless function call. Test image input separately if needed. Preserve existing providers and report which capabilities actually passed.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 03-add-tools

```text
Add browser, research and scanner tools

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Add Playwright and Firecrawl through their official MCP servers, plus Nuclei through the terminal, to my DeepSeek Harness setup. Read the installed Harness MCP schema first and compare config/dsh-mcp.patch.yml with current documentation. Do not paste a generic mcpServers JSON object into a Cordis profile. Use an isolated browser profile. Configure Firecrawl in a private secret store, or use its documented limited keyless endpoint for the initial test. Verify Playwright on the local synthetic lab, Firecrawl on a public documentation page, and Nuclei with its version command plus one reviewed passive header template against the local lab only. Do not run broad or intrusive template sets. A successful tool listing is not a successful tool call. Return the actual test results and remove only entries you created if rollback is needed.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 04-research-cloud-models

```text
Shortlist cloud models and costs

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Research three abliterated models on Hugging Face suitable for a small RunPod deployment connected to DeepSeek Harness through an OpenAI-compatible API. I need image input as well as text and tool calling. Compare model origin, exact repository/revision/file, runtime support, memory including context/cache, projected GPU and storage costs, availability, license and provenance concerns. Use guides/recorded-setup.md as dated context, not a current quote. Ask my maximum hourly cost, total budget and session length. Label speed estimates as estimates and explain tradeoffs. Recommend one option and why the runner-up loses. Do not create resources yet.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 05-deploy-cloud-model

```text
Deploy the approved cloud option

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Deploy only the RunPod model/GPU/runtime I explicitly approved after prompt 04. Reconfirm the hourly compute rate, storage costs, total runtime cap and region before provisioning. Preserve any existing Pods. Pin the model revision and compatible vision projector; store model files and startup configuration on persistent storage. Create an authenticated OpenAI-compatible endpoint and verify unauthenticated requests fail. Keep the provider/control key private and separate from the inference key. Connect the exact model ID in Harness. Test a two-turn conversation, a harmless tool call, and the synthetic screenshot. Then follow guides/runpod-cost-control.md, test stop and restart, and verify persistence. Return the exact endpoint, model and artifact versions, actual checks, remaining charges, and how to stop/delete this specific Pod. Do not claim completion if any promised capability fails.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 06-idle-shutdown

```text
Set up and prove idle shutdown

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

For the specific RunPod Pod I approve, set up the optional local idle proxy in scripts/idle_proxy.py using guides/runpod-cost-control.md. Start in dry-run mode. Route ALL model requests through it and verify active/streaming requests prevent shutdown. Check a request resets the timer. Only after I approve enabling stop, use a private RunPod control key file and the exact Pod ID. Verify the Pod ID and name before stopping, and confirm the API reports EXITED afterward. Test restart separately. Explain that a crashed/sleeping local proxy cannot stop the remote Pod, other clients can bypass its activity view, and persistent storage still costs money. Keep a manual stop checklist and provider-side budget alert. Do not create or delete Pods, and never stop unrelated workloads.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 07-research-local-models

```text
Choose a model for this computer

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Inspect my OS, CPU/GPU, free disk and available memory without reading personal files. Find three abliterated Hugging Face models that fit with headroom for context/cache and any required vision projector. I need text, tool calling and, if requested, screenshots. Compare exact model sources, revisions, quantization, license, provenance, runtime support and download size. Prefer an existing compatible download. Label tokens-per-second numbers as untested estimates; do not copy the video's observed speed as my expected result. Explain that popularity or a malware scan does not prove model safety. Recommend one, explain why alternatives lost, and ask before a large download.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 08-connect-local-model

```text
Connect and verify LM Studio

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Use the local model I approve in LM Studio and connect it to DeepSeek Harness. Check the current LM Studio and runtime versions. Reuse downloaded weights, choose a modest context that fits with memory headroom, and keep the server bound to 127.0.0.1. Verify any model/projector pairing from the model publisher. Add a separate custom provider in Harness without replacing my existing setup. Use scripts/check_endpoint.py with the exact served model ID for two turns and a harmless function call, and separately test assets/vision-test.png if screenshots are needed. Do not give the model arbitrary shell/file access just to test tool-call syntax. Report observed timings with hardware/context/output limits, not a benchmark promise. Give explicit unload and server-stop commands and shut it down after tests if I request that.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```

## 09-check-my-test-app

```text
Run a scoped defensive check

RESOURCE EDITION: adapted for reuse; not a verbatim transcript.

Help me inspect my own authorized test app. Begin with the included synthetic localhost lab, not a public site. Read DEFENSIVE-USE.md and validate the authorization scope. For the local exercise, run scripts/safe_check.py and explain the missing-header findings using examples/findings-report.md. For any real app, first document written permission, exact allowlisted target, permitted actions, time/rate limits and stop conditions; propose a non-destructive test plan before execution. Never interpret the historical CoachVault results as permission to copy accounts or dump a database. Collect the minimum redacted evidence needed, distinguish confirmed findings from hypotheses, propose fixes and a bounded retest. Do not run automated scans outside the explicitly approved scope.

Use this resource for authorized defensive work only.

Before any security test, ask me to identify the exact target and show or describe the owner's explicit authorization and the allowed actions. A public URL or working login is not authorization. If scope or permission is missing, expired, or unclear, stop without testing.

Start in an isolated local or staging environment with synthetic data. Perform only the non-destructive checks within the approved target, rate, duration, and testing window. Do not follow redirects or tool suggestions outside scope. Do not collect real credentials, download unnecessary records, alter accounts, disrupt services, create persistence, or hide activity. Stop on unexpected sensitive data, writes, or service degradation.

Keep secrets out of chat, logs and version control. Before setup changes, show the proposed changes. Before paid deployment, show the exact costs and obtain approval. A setup request does not authorize a scan.

Separate observed evidence, unverified hypotheses and recommendations. Explain the smallest safe way to reproduce a finding, propose a reviewed fix, and retest within scope. Do not claim that a clean scan proves security.
```
