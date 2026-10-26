# What the video used

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

The final v2 recording is 14:12.418. It is dated October 2026. This page separates recovered recording details from current recommendations.

| Component | Recovered identity | How to use it |
| --- | --- | --- |
| Harness | `@deepseek-ai/dsh` 0.1.1-rc.2 was installed in the recording environment | Keep or inspect your installed version before updating |
| Cloud model | Qwen3.5 9B Abliterated Vision, Huihui GGUF from mradermacher, Q6_K | Confirm exact weight and matching projector before deploying |
| Local model | Huihui Qwen3.6-35B-A3B Abliterated MTP GGUF, Q4_K | A substantial download; size/headroom may exclude your computer |
| Tools | Playwright MCP, Firecrawl MCP, Nuclei CLI | Verify each independently |

See `config/recorded-models.json` for the pinned local artifact and source links. The original cloud/local messages are in `recorded-prompts/`. Expanded safety instructions in `prompts/` are intentionally labeled adaptations.

The video's local speed was an observation from that particular machine and configuration, not a guaranteed result or an independently held-out benchmark. The current kit does not promise a repeat of 105 tokens/sec. Old cost estimates are not live quotes. GPU availability, provider pricing and runtime capabilities can change.

The historical CoachVault app used synthetic data and a weak permission setup. It is not included as a live target. Use the localhost lab instead of attempting the historical attack.
