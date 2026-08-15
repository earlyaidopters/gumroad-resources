# generate

Your personal Higgsfield. One Claude Code skill that turns a plain-English idea into an image or video from the best pay-as-you-go model, with Claude itself doing the prompt refinement for free on the subscription you already pay for.

No monthly credits. No platform markup. You pay the raw API price per generation and every dollar gets logged to a receipts ledger you can actually read.

## Setup

1. Drop this folder into `~/.claude/skills/generate/` (or your project's `.claude/skills/`).
2. Put two keys in `~/.env`. Most people already have both:

```
GOOGLE_API_KEY=...    # aistudio.google.com/apikey (images + Veo video)
OPENAI_API_KEY=...    # platform.openai.com/api-keys (gpt-image)
```

3. For the Chinese video models (Wan, Hailuo, Kling, Seedance), pick one of two paths. You can mix them, and a direct key always wins over fal for its lane.

### Path A, the 60 second setup

One signup at fal.ai unlocks all four Chinese models through a single key, with a small per-clip markup:

```
FAL_KEY=...
```

Top up $5 and that covers roughly 15 video generations. Skip it and the lanes simply tell you how to set it up when you first try one.

### Path B, full independence

One account per provider, billed at raw API price, cheapest per clip:

- MiniMax (Hailuo, ~$0.25/clip): easiest signup at platform.minimax.io, then `MINIMAX_API_KEY=...`
- Wan and Qwen-Image: sign up at qwencloud.com (the intl DashScope endpoint), then `QWEN_CLOUD_API_KEY=...` (a legacy `DASHSCOPE_API_KEY` also works)
- Kling: needs an API plan purchase on klingai.com, then `KLING_ACCESS_KEY=...` and `KLING_SECRET_KEY=...`
- Seedance: no self-serve direct API (BytePlus is enterprise-console only), so it stays on fal

4. Install the two Python packages if you do not have them:

```
pip install google-genai openai requests
```

Done. Tell Claude "generate a cinematic product shot of X" and it routes, refines, generates, saves, and logs the cost.

## What it costs

| Lane | Per generation |
|---|---|
| Gemini image | $0.039 |
| gpt-image | ~$0.04 |
| Veo 5s video (fast) | ~$0.26 |
| Hailuo video | ~$0.28 via fal, ~$0.25 direct |
| Kling video | ~$0.35 (estimate) |
| Seedance video | ~$0.35 (estimate) |
| Wan video | ~$0.50 (estimate) |

Every run appends to `receipts.md` with a running total, so you always know exactly what this month of generations cost you. For most people that number is smaller than one Higgsfield subscription tier.

## How it works

`SKILL.md` teaches Claude the routing table and per-model prompt style. `scripts/generate.py` is a single CLI that calls each API directly and writes the receipt line. That is the whole system.
