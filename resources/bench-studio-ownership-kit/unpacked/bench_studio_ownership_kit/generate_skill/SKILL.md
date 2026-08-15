---
name: generate
description: Personal Higgsfield replacement. Routes a plain-English idea to the best pay-as-you-go image or video model, refines the prompt for that model, calls the API via scripts/generate.py, saves the output, and logs cost to a running receipts ledger. Use when the user says "generate an image", "make a video of", "generate", or describes any visual they want created.
---

# generate: your personal Higgsfield

You are the routing and prompt-refinement layer. The user describes what they want in plain English. You pick the engine, rewrite the prompt for that specific model, run the script, and report the file plus the cost.

## Two ways to connect the Chinese video models

The four Chinese lanes (wan, hailuo, kling, seedance) work through either path. The script auto-detects which keys exist.

- **Path A, one fal.ai key (easy):** a single `FAL_KEY` unlocks all four lanes. Small per-clip markup over raw provider price.
- **Path B, individual provider accounts (cheapest, most independent):** one key per provider, billed at raw API price.

| Env var in `~/.env` | Unlocks | Notes |
|---|---|---|
| `FAL_KEY` | wan, hailuo, kling, seedance | Path A, one signup covers everything |
| `MINIMAX_API_KEY` | hailuo (direct, ~$0.25/clip) | platform.minimax.io, easiest direct signup |
| `QWEN_CLOUD_API_KEY` | wan (direct, wan2.6-t2v $0.10/s) + qwen-image | Qwen Cloud (qwencloud.com), the intl DashScope endpoint. `DASHSCOPE_API_KEY` also accepted |
| `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` | kling (direct, JWT auth) | Requires a Kling global API plan |
| (none) | seedance stays fal-only | BytePlus direct API is enterprise-console only |

**Precedence rule: a direct provider key beats `FAL_KEY` when both exist.** The receipt logs the lane as e.g. `hailuo-direct` so costs stay honest.

## Step 1: Route the idea to an engine

| Engine | Model | Best for | Cost per generation |
|---|---|---|---|
| `gemini-image` | gemini-3.1-flash-image | Default for images. Editorial, illustration, text-in-image, product shots, fast iteration | $0.039 |
| `gpt-image` | gpt-image-2 | Photoreal people, complex spatial instructions, when Gemini output looks off | ~$0.04 |
| `qwen-image` | qwen-image-3.0 (Qwen Cloud) | Cheap poster-style images, strong text rendering, Chinese aesthetics | $0.03 |
| `veo` | veo-3-fast | Default for video. Cinematic 5-8s clips with audio | ~$0.26 per 5s (fast tier) |
| `fal-wan` | Wan 2.2 (fal.ai) | Stylized or anime-leaning video, motion-heavy scenes | ~$0.50 (estimate) |
| `fal-hailuo` | Hailuo / MiniMax (fal.ai) | Expressive character motion, physical realism on a budget | ~$0.28 (estimate) |
| `fal-kling` | Kling 2.5 (fal.ai) | Premium cinematic video, strong camera language | ~$0.35 (estimate) |
| `fal-seedance` | Seedance (fal.ai) | Multi-shot sequences, dance and fast action | ~$0.35 (estimate) |

Routing rules:
- Image request with no strong photoreal-human requirement: `gemini-image`.
- Photoreal humans or Gemini failed twice: `gpt-image`.
- Video, general purpose: `veo`. Only reach for a fal lane when the style table above clearly matches or the user names the model.
- Always tell the user which engine you picked and the expected cost BEFORE generating if the run will exceed $0.25.

## Step 2: Refine the prompt (this is the free superpower)

Never pass the user's raw words through. Rewrite per engine:

- **gemini-image**: full descriptive paragraph. Subject, composition, lighting, lens, color palette, mood, style reference. Gemini rewards density. If text must appear in the image, quote it exactly and say where it goes.
- **gpt-image**: precise, instruction-like. Lead with the subject and layout, then attributes. It follows spatial instructions literally, so be literal.
- **veo**: write it like a shot description. Camera move first (dolly in, static wide, handheld), then subject and action, then lighting and grade, then ambient audio cue. One shot per prompt.
- **fal-wan / fal-hailuo / fal-kling / fal-seedance**: subject and action in the first sentence, then camera, then style keywords. Keep under 120 words. Kling responds well to film grammar (35mm, shallow depth of field). Hailuo responds well to physical verbs. Wan responds well to style tags.

## Step 3: Call the script

```
cd <this skill folder>
"/Users/markkashef/Desktop/YouTube/YT Command Centre/.venv/bin/python" scripts/generate.py --engine <engine> --prompt "<refined prompt>" [--out <path>]
```

Any Python 3.10+ with `google-genai`, `openai`, and `requests` works; keys load from `~/.env` automatically. Default output goes to `./outputs/`. Gemini images save as .jpg.

## Step 4: Receipts

The script appends every successful generation to `../receipts.md` (one folder above the skill): timestamp, engine, prompt snippet, output file, estimated cost, plus a running total. After each run, tell the user the cost of this generation and the running total so far. Fal lane costs are estimates; say so.

## Keys

- `GOOGLE_API_KEY` in `~/.env` covers gemini-image and veo.
- `OPENAI_API_KEY` in `~/.env` covers gpt-image.
- `FAL_KEY` in `~/.env` covers all four fal lanes (Path A). Signup at fal.ai, a $5 top-up covers roughly 15 video generations.
- Direct provider keys (Path B) per the table above: `MINIMAX_API_KEY`, `QWEN_CLOUD_API_KEY` (or `DASHSCOPE_API_KEY`), `KLING_ACCESS_KEY` + `KLING_SECRET_KEY`. Direct beats fal when both exist.
- If no key covers a lane, the script prints both connection options, one line each, and exits cleanly.
