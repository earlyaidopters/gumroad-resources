# Start here

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

This kit helps you connect a model to DeepSeek Harness using a hosted provider, a rented RunPod GPU, or LM Studio on your own computer. It also includes a small local lab and checks that tell you whether the connection actually works.

## Fastest route

1. Read [Choose your route](guides/choose-your-route.md). Hosted is usually the fewest setup steps; local avoids a separate inference bill if your hardware can run the model.
2. Open [ASSISTANT-SETUP.md](ASSISTANT-SETUP.md), copy its prompt, and give your assistant this repository or unpacked folder.
3. Use the numbered prompt files in order for your chosen route. Enter secrets directly in the app or a private file, never in chat.
4. Run the model checks and the local lab before connecting tools to anything valuable.
5. For RunPod, test the cost guard and confirm the actual stopped state. Storage can still cost money after compute stops.

## What you need

An assistant capable of reading files and helping with setup, a supported Node.js version for Harness/MCP, and Python 3.10+ for the included helpers. Follow each upstream project's current OS/runtime requirements. A paid AI subscription does not automatically include hosted API credits or a GPU rental.

## Files you'll use

| Path | Purpose |
| --- | --- |
| `prompts/` | Nine copyable resource-edition prompts with safety boundaries |
| `recorded-prompts/` | Recovered original cloud/local messages and spoken excerpts; provenance is explicit |
| `guides/` | Three routes, tools, model safety, troubleshooting and cost control |
| `config/` | Credential-free provider fields and Harness MCP configuration |
| `scripts/check_endpoint.py` | Real two-turn response and harmless function-call checks |
| `scripts/local_lab.py` / `safe_check.py` | Synthetic localhost-only header-check exercise |
| `scripts/idle_proxy.py` | Optional local cost guard for an existing RunPod endpoint |
| `verification/STATUS.md` | What was tested and what still depends on your account |
| `downloads/quick-start.pdf` | Readable companion guide; Markdown remains editable |

No model weights, paid services, production data, or third-party credentials are included. The scripts never provision a paid GPU. The model recommendations are starting points dated 26 October 2026, not guarantees of safety or speed.
