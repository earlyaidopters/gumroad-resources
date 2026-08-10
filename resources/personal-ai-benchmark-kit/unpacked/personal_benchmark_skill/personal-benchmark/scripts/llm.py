#!/usr/bin/env python3
"""Shared LLM helper for /benchmark: cheap JSON-mode calls with zero-config fallback.

Engine order:
  1. Gemini Flash (gemini-3-flash-preview) if GOOGLE_API_KEY is in ~/.env or env.
  2. Claude Haiku via `claude -p` (bills the user's existing Claude subscription,
     needs NO extra key). This makes the skill installable with zero setup.

Set BENCHMARK_ENGINE=gemini|claude to force one.
"""

import json
import os
import re
import subprocess
import sys

_gemini_client = None
HAIKU = "claude-haiku-4-5-20251001"


def _engine():
    forced = os.environ.get("BENCHMARK_ENGINE")
    if forced:
        return forced
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.expanduser("~/.env"))
    except ImportError:
        pass
    return "gemini" if os.environ.get("GOOGLE_API_KEY") else "claude"


ENGINE = _engine()


def _strip_fences(text):
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    return m.group(1) if m else text


def _call_engine(prompt):
    if ENGINE == "gemini":
        global _gemini_client
        if _gemini_client is None:
            import logging
            logging.getLogger("google_genai.types").setLevel(logging.ERROR)  # thought_signature spam
            from google import genai
            _gemini_client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        resp = _gemini_client.models.generate_content(
            model="gemini-3-flash-preview", contents=prompt,
            config={"response_mime_type": "application/json", "temperature": 0.2})
        return json.loads(resp.text)
    wrapped = (prompt + "\n\nRespond with ONLY the raw JSON object. "
               "No prose, no markdown fences, no explanation.")
    proc = subprocess.run(
        ["claude", "-p", wrapped, "--model", HAIKU, "--output-format", "json",
         "--max-turns", "1", "--setting-sources", ""],
        capture_output=True, text=True, timeout=300)
    data = json.loads(proc.stdout)
    return json.loads(_strip_fences(data.get("result", "")).strip())


def llm_json(prompt, label=""):
    """Send prompt, get parsed JSON back. Cheap model, low temperature.
    One retry on transient failures (API hiccup, malformed JSON) so a single
    flaky call doesn't strand a whole judgment."""
    import time
    print(f"  [{ENGINE}] {label}...", file=sys.stderr)
    last = None
    for attempt in range(2):
        try:
            out = _call_engine(prompt)
            return out[0] if isinstance(out, list) else out
        except Exception as e:
            last = e
            if attempt == 0:
                print(f"  ↻ {label or 'call'} failed ({type(e).__name__}), retrying...", file=sys.stderr)
                time.sleep(8)
    raise last
