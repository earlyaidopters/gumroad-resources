#!/usr/bin/env python3
"""generate.py - one CLI for every pay-as-you-go image/video model.

Usage:
  python generate.py --engine <gemini-image|gpt-image|qwen-image|veo|fal-wan|fal-hailuo|fal-kling|fal-seedance> \
      --prompt "..." [--out path]

Keys load from ~/.env (GOOGLE_API_KEY, OPENAI_API_KEY, FAL_KEY, and optional
direct-provider keys: MINIMAX_API_KEY, QWEN_CLOUD_API_KEY or DASHSCOPE_API_KEY
for Wan/Qwen via Qwen Cloud, KLING_ACCESS_KEY + KLING_SECRET_KEY). A direct
provider key beats FAL_KEY when both exist.
Every successful generation appends a line to ../receipts.md (relative to the
skill folder this script lives in) with a running cost total.
"""

import argparse
import base64
import datetime
import os
import re
import sys
import time
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
RECEIPTS = SKILL_DIR.parent / "receipts.md"
DEFAULT_OUT_DIR = SKILL_DIR / "outputs"

COSTS = {
    "gemini-image": (0.039, ""),
    "gpt-image": (0.04, "~"),
    "qwen-image": (0.03, ""),   # Qwen Cloud qwen-image-3.0, per output image (1k or 2k tier)
    "veo": (0.26, "~"),
    "fal-wan": (0.13, "~est"),  # a14b turbo tier
    "fal-hailuo": (0.28, "~est"),
    "fal-kling": (0.35, "~est"),
    "fal-seedance": (0.35, "~est"),
}

# Cost when a lane runs through a direct provider key instead of fal
DIRECT_COSTS = {
    "fal-hailuo": (0.25, "~"),   # MiniMax official intl API, 6s 768p Hailuo-02
    "fal-wan": (0.50, ""),       # Qwen Cloud (intl DashScope), wan2.6-t2v $0.10/s x 5s 720p
    "fal-kling": (0.35, "~est"), # Kling global API plan pricing varies by plan
}

FAL_ENDPOINTS = {
    "fal-wan": "fal-ai/wan/v2.2-a14b/text-to-video/turbo",
    "fal-hailuo": "fal-ai/minimax/hailuo-02/standard/text-to-video",
    "fal-kling": "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    "fal-seedance": "fal-ai/bytedance/seedance/v1/pro/text-to-video",
}


def load_env():
    env_path = Path.home() / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)


def slugify(prompt, n=40):
    s = re.sub(r"[^a-z0-9]+", "_", prompt.lower()).strip("_")
    return s[:n] or "generation"


def out_path(args, ext):
    if args.out:
        p = Path(args.out)
        if p.suffix == "":
            p = p / f"{slugify(args.prompt)}.{ext}"
    else:
        p = DEFAULT_OUT_DIR / f"{slugify(args.prompt)}.{ext}"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def log_receipt(engine, prompt, outfile, cost, approx):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    snippet = (prompt[:60] + "...") if len(prompt) > 60 else prompt
    if not RECEIPTS.exists():
        RECEIPTS.write_text(
            "# Generation Receipts\n\n"
            "| Timestamp | Engine | Prompt | Output | Est. cost |\n"
            "|---|---|---|---|---|\n"
        )
    line = f"| {ts} | {engine} | {snippet} | {outfile.name} | {approx}${cost:.3f} |\n"
    # strip the old footer, append the new row, recount, re-append footer
    text = RECEIPTS.read_text()
    text = re.sub(r"\n\*\*Running total.*$", "", text, flags=re.S)
    if not text.endswith("\n"):
        text += "\n"
    text += line
    total = sum(float(m.group(1)) for m in re.finditer(r"\$([0-9]+(?:\.[0-9]+)?)\s*\|", text))
    text += f"\n**Running total: ${total:.3f}** (fal lanes are estimates)\n"
    RECEIPTS.write_text(text)
    return total


def require_key(name, hint):
    key = os.environ.get(name)
    if not key:
        print(hint)
        sys.exit(0)
    return key


def run_gemini_image(args):
    key = require_key("GOOGLE_API_KEY", "Setup: add GOOGLE_API_KEY=... to ~/.env (aistudio.google.com/apikey)")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=key)
    resp = client.models.generate_content(
        model="gemini-3.1-flash-image",
        contents=args.prompt,
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )
    for part in resp.candidates[0].content.parts:
        if getattr(part, "inline_data", None) and part.inline_data.data:
            p = out_path(args, "jpg")
            p.write_bytes(part.inline_data.data)
            return p
    raise RuntimeError("Gemini returned no image data")


def run_gpt_image(args):
    key = require_key("OPENAI_API_KEY", "Setup: add OPENAI_API_KEY=... to ~/.env (platform.openai.com/api-keys)")
    from openai import OpenAI

    client = OpenAI(api_key=key)
    model = os.environ.get("GPT_IMAGE_MODEL", "gpt-image-2")
    try:
        resp = client.images.generate(model=model, prompt=args.prompt, size="1024x1024", quality="low")
    except Exception as e:
        if "model" in str(e).lower():
            resp = client.images.generate(model="gpt-image-1", prompt=args.prompt, size="1024x1024", quality="low")
        else:
            raise
    b64 = resp.data[0].b64_json
    p = out_path(args, "png")
    p.write_bytes(base64.b64decode(b64))
    return p


def run_veo(args):
    key = require_key("GOOGLE_API_KEY", "Setup: add GOOGLE_API_KEY=... to ~/.env (aistudio.google.com/apikey)")
    from google import genai

    client = genai.Client(api_key=key)
    op = client.models.generate_videos(model="veo-3.0-fast-generate-001", prompt=args.prompt)
    while not op.done:
        time.sleep(10)
        op = client.operations.get(op)
    video = op.response.generated_videos[0]
    p = out_path(args, "mp4")
    client.files.download(file=video.video)
    video.video.save(str(p))
    return p


def _download(url, p, headers=None):
    import requests

    with requests.get(url, stream=True, timeout=300, headers=headers or {}) as dl:
        dl.raise_for_status()
        with p.open("wb") as f:
            for chunk in dl.iter_content(1 << 20):
                f.write(chunk)
    return p


def run_minimax_direct(args):
    """Hailuo via MiniMax's official intl API (platform.minimax.io)."""
    import requests

    key = os.environ["MINIMAX_API_KEY"]
    base = "https://api.minimax.io/v1"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    r = requests.post(
        f"{base}/video_generation",
        headers=headers,
        json={"model": "MiniMax-Hailuo-02", "prompt": args.prompt, "duration": 6, "resolution": "768P"},
        timeout=60,
    )
    r.raise_for_status()
    task_id = r.json().get("task_id")
    if not task_id:
        raise RuntimeError(f"MiniMax did not return a task_id: {r.json()}")
    for _ in range(120):
        time.sleep(10)
        s = requests.get(f"{base}/query/video_generation", headers=headers, params={"task_id": task_id}, timeout=30).json()
        status = s.get("status")
        if status == "Success":
            file_id = s["file_id"]
            break
        if status == "Fail":
            raise RuntimeError(f"MiniMax job failed: {s}")
    else:
        raise RuntimeError("MiniMax job timed out after 20 minutes")
    f = requests.get(f"{base}/files/retrieve", headers=headers, params={"file_id": file_id}, timeout=30).json()
    video_url = f.get("file", {}).get("download_url")
    if not video_url:
        raise RuntimeError(f"no download_url in MiniMax file response: {f}")
    return _download(video_url, out_path(args, "mp4"))


def run_qwen_image(args):
    """Qwen-Image via Qwen Cloud (intl DashScope), synchronous multimodal endpoint."""
    import requests

    key = os.environ.get("QWEN_CLOUD_API_KEY") or os.environ.get("DASHSCOPE_API_KEY")
    if not key:
        print("Setup: qwencloud.com -> API key -> add QWEN_CLOUD_API_KEY=... to ~/.env")
        sys.exit(0)
    base = "https://dashscope-intl.aliyuncs.com/api/v1"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    r = requests.post(
        f"{base}/services/aigc/multimodal-generation/generation",
        headers=headers,
        json={
            "model": os.environ.get("QWEN_IMAGE_MODEL", "qwen-image-3.0"),
            "input": {"messages": [{"role": "user", "content": [{"text": args.prompt}]}]},
            "parameters": {"watermark": False, "size": "1024*1024"},
        },
        timeout=180,
    )
    r.raise_for_status()
    body = r.json()
    try:
        content = body["output"]["choices"][0]["message"]["content"]
        image_url = next(c["image"] for c in content if "image" in c)
    except (KeyError, IndexError, StopIteration):
        raise RuntimeError(f"no image in Qwen Cloud response: {body}")
    return _download(image_url, out_path(args, "jpg"))


def run_wan_direct(args):
    """Wan via Qwen Cloud / Alibaba Model Studio intl (DashScope) async API."""
    import requests

    key = os.environ.get("QWEN_CLOUD_API_KEY") or os.environ["DASHSCOPE_API_KEY"]
    base = "https://dashscope-intl.aliyuncs.com/api/v1"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-DashScope-Async": "enable"}
    r = requests.post(
        f"{base}/services/aigc/video-generation/video-synthesis",
        headers=headers,
        json={
            "model": os.environ.get("WAN_MODEL", "wan2.6-t2v"),
            "input": {"prompt": args.prompt},
            "parameters": {"size": "1280*720", "duration": 5},
        },
        timeout=60,
    )
    r.raise_for_status()
    task_id = r.json().get("output", {}).get("task_id")
    if not task_id:
        raise RuntimeError(f"DashScope did not return a task_id: {r.json()}")
    poll_headers = {"Authorization": f"Bearer {key}"}
    for _ in range(120):
        time.sleep(10)
        s = requests.get(f"{base}/tasks/{task_id}", headers=poll_headers, timeout=30).json()
        status = s.get("output", {}).get("task_status")
        if status == "SUCCEEDED":
            video_url = s["output"].get("video_url")
            break
        if status in ("FAILED", "CANCELED", "UNKNOWN"):
            raise RuntimeError(f"DashScope job failed: {s}")
    else:
        raise RuntimeError("DashScope job timed out after 20 minutes")
    if not video_url:
        raise RuntimeError(f"no video_url in DashScope response: {s}")
    return _download(video_url, out_path(args, "mp4"))


def _kling_jwt(ak, sk):
    """Hand-rolled HS256 JWT per Kling's global API docs (no PyJWT needed)."""
    import hashlib
    import hmac
    import json

    def b64(b):
        return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

    now = int(time.time())
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({"iss": ak, "exp": now + 1800, "nbf": now - 5}).encode())
    signing = f"{header}.{payload}"
    sig = b64(hmac.new(sk.encode(), signing.encode(), hashlib.sha256).digest())
    return f"{signing}.{sig}"


def run_kling_direct(args):
    """Kling via the official global API (api-singapore.klingai.com), JWT auth."""
    import requests

    token = _kling_jwt(os.environ["KLING_ACCESS_KEY"], os.environ["KLING_SECRET_KEY"])
    base = "https://api-singapore.klingai.com/v1"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.post(
        f"{base}/videos/text2video",
        headers=headers,
        json={"model_name": "kling-v2-5-turbo-pro", "prompt": args.prompt, "duration": "5"},
        timeout=60,
    )
    r.raise_for_status()
    body = r.json()
    if body.get("code") not in (0, None):
        raise RuntimeError(f"Kling create failed: {body}")
    task_id = body["data"]["task_id"]
    for _ in range(120):
        time.sleep(10)
        s = requests.get(f"{base}/videos/text2video/{task_id}", headers=headers, timeout=30).json()
        status = s.get("data", {}).get("task_status")
        if status == "succeed":
            video_url = s["data"]["task_result"]["videos"][0]["url"]
            break
        if status == "failed":
            raise RuntimeError(f"Kling job failed: {s}")
    else:
        raise RuntimeError("Kling job timed out after 20 minutes")
    return _download(video_url, out_path(args, "mp4"))


# Direct-provider config per lane: (env vars required, runner, one-line setup hint)
DIRECT_LANES = {
    "fal-hailuo": (
        ["MINIMAX_API_KEY"],
        run_minimax_direct,
        "  Direct (cheapest, ~$0.25/clip): platform.minimax.io -> API key -> add MINIMAX_API_KEY=... to ~/.env",
    ),
    "fal-wan": (
        ["QWEN_CLOUD_API_KEY|DASHSCOPE_API_KEY"],
        run_wan_direct,
        "  Direct: Qwen Cloud (qwencloud.com, $0.10/s for wan2.6-t2v) -> add QWEN_CLOUD_API_KEY=... to ~/.env",
    ),
    "fal-kling": (
        ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"],
        run_kling_direct,
        "  Direct: klingai.com global API plan -> add KLING_ACCESS_KEY=... and KLING_SECRET_KEY=... to ~/.env",
    ),
}


def run_chinese_video(args):
    """Dispatch a Chinese-model lane: direct provider key wins, else fal, else setup help."""
    direct = DIRECT_LANES.get(args.engine)
    if direct:
        env_vars, runner, hint = direct
        if all(any(os.environ.get(alt) for alt in v.split("|")) for v in env_vars):
            print(f"Using direct provider API for {args.engine} ({', '.join(env_vars)} found)")
            args.used_direct = True
            return runner(args)
    if os.environ.get("FAL_KEY"):
        return run_fal(args)
    # No key at all: print both connection options, one line each
    print(f"No key found for {args.engine}. Two ways to connect:")
    print("  fal.ai (easiest, one key for all four lanes): sign up at fal.ai, add FAL_KEY=... to ~/.env ($5 covers ~15 videos)")
    if direct:
        print(direct[2])
    else:
        print("  Direct: Seedance is BytePlus enterprise-console only, so fal is the only self-serve lane for it")
    sys.exit(0)


def run_fal(args):
    key = os.environ.get("FAL_KEY")
    if not key:
        print("Setup: sign up at fal.ai, then add FAL_KEY=... to ~/.env (a $5 top-up covers ~15 videos)")
        sys.exit(0)
    import requests

    endpoint = FAL_ENDPOINTS[args.engine]
    headers = {"Authorization": f"Key {key}", "Content-Type": "application/json"}
    r = requests.post(f"https://queue.fal.run/{endpoint}", headers=headers, json={"prompt": args.prompt}, timeout=60)
    r.raise_for_status()
    req = r.json()
    status_url = req["status_url"]
    response_url = req["response_url"]
    for _ in range(120):
        time.sleep(5)
        s = requests.get(status_url, headers=headers, timeout=30).json()
        if s.get("status") == "COMPLETED":
            break
        if s.get("status") in ("FAILED", "ERROR"):
            raise RuntimeError(f"fal job failed: {s}")
    else:
        raise RuntimeError("fal job timed out after 10 minutes")
    result = requests.get(response_url, headers=headers, timeout=60).json()
    video_url = result.get("video", {}).get("url") or result.get("videos", [{}])[0].get("url")
    if not video_url:
        raise RuntimeError(f"no video url in fal response: {result}")
    p = out_path(args, "mp4")
    with requests.get(video_url, stream=True, timeout=300) as dl:
        dl.raise_for_status()
        with p.open("wb") as f:
            for chunk in dl.iter_content(1 << 20):
                f.write(chunk)
    return p


def main():
    ap = argparse.ArgumentParser(description="Generate images/video via pay-as-you-go APIs")
    ap.add_argument("--engine", required=True, choices=list(COSTS))
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--out", help="output file or directory")
    args = ap.parse_args()

    load_env()

    runners = {
        "gemini-image": run_gemini_image,
        "gpt-image": run_gpt_image,
        "qwen-image": run_qwen_image,
        "veo": run_veo,
        "fal-wan": run_chinese_video,
        "fal-hailuo": run_chinese_video,
        "fal-kling": run_chinese_video,
        "fal-seedance": run_chinese_video,
    }
    args.used_direct = False
    outfile = runners[args.engine](args)
    if args.used_direct:
        cost, approx = DIRECT_COSTS[args.engine]
        engine_label = args.engine.replace("fal-", "") + "-direct"
    else:
        cost, approx = COSTS[args.engine]
        engine_label = args.engine
    total = log_receipt(engine_label, args.prompt, outfile, cost, approx)
    print(f"Saved: {outfile}")
    print(f"Cost this run: {approx}${cost:.3f} | Running total: ${total:.3f}")


if __name__ == "__main__":
    main()
