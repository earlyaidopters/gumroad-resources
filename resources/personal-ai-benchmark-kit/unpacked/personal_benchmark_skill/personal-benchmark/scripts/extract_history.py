#!/usr/bin/env python3
"""Stage 1a of /benchmark: compress ~/.claude/projects JSONL history into a tiny digest.

Pure Python, zero API calls. 1.8GB of transcripts -> a few hundred KB digest.
Per session it keeps: the first real user prompt, a few follow-ups (where
corrections live), tool/turn/token counts, and whether the session was
automated (SDK/cron) or interactive. Identical prompts are deduped with a
count so scheduled-agent sessions don't drown the interactive workload.

Output: ~/.claude/benchmark/digest.json
"""

import json
import os
import re
import sys
import hashlib
from collections import Counter, defaultdict
from pathlib import Path

PROJECTS = Path.home() / ".claude" / "projects"
OUT_DIR = Path(os.environ.get("BENCHMARK_HOME") or Path.home() / ".claude" / "benchmark")
MAX_FOLLOWUPS = 6
FIRST_PROMPT_CHARS = 900
FOLLOWUP_CHARS = 280
RECENT_DAYS = int(os.environ.get("BENCHMARK_DAYS", "120"))


def text_of_user_content(content):
    """Return real typed text of a user message, or None if it's a tool_result/meta."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = [b.get("text", "") for b in content
                 if isinstance(b, dict) and b.get("type") == "text"]
        joined = "\n".join(t for t in texts if t).strip()
        return joined or None
    return None


CMD_RE = re.compile(r"<command-name>([^<]+)</command-name>")
ARGS_RE = re.compile(r"<command-args>([^<]*)</command-args>")
NOISE_RE = re.compile(r"<(local-command-stdout|system-reminder|command-message|local-command-caveat)[^>]*>.*?</\1>", re.S)


def clean(text):
    """Strip harness noise. Pure slash-command invocations become '/cmd args'."""
    cmd = CMD_RE.search(text)
    args = ARGS_RE.search(text)
    text = NOISE_RE.sub(" ", text)
    # unclosed caveat tag (appears when /clear truncates the block)
    text = re.sub(r"<local-command-caveat>.*", " ", text, flags=re.S)
    text = re.sub(r"<command-(name|args|message)>[^<]*</command-\1>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text and cmd:
        text = (cmd.group(1).strip() + " " + (args.group(1).strip() if args else "")).strip()
    return text


def parse_session(path: Path):
    n_user = n_assistant = 0
    tools = Counter()
    models = Counter()
    out_tokens = 0
    prompts = []
    automated = False
    ts_first = ts_last = None
    slash_cmd = None
    try:
        with open(path, "r", errors="replace") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if rec.get("isSidechain"):
                    continue
                rtype = rec.get("type")
                ts = rec.get("timestamp")
                if ts:
                    ts_first = ts_first or ts
                    ts_last = ts
                if rtype == "user":
                    if rec.get("promptSource") == "sdk" or rec.get("entrypoint", "").startswith("sdk"):
                        automated = True
                    txt = text_of_user_content(rec.get("message", {}).get("content"))
                    if not txt:
                        continue
                    m = CMD_RE.search(txt)
                    if m and slash_cmd is None:
                        slash_cmd = m.group(1).strip()
                    txt = clean(txt)
                    if not txt or txt == "/clear":
                        continue
                    n_user += 1
                    if len(prompts) <= MAX_FOLLOWUPS:
                        limit = FIRST_PROMPT_CHARS if not prompts else FOLLOWUP_CHARS
                        prompts.append(txt[:limit])
                elif rtype == "assistant":
                    n_assistant += 1
                    msg = rec.get("message", {})
                    if msg.get("model"):
                        models[msg["model"]] += 1
                    usage = msg.get("usage") or {}
                    out_tokens += usage.get("output_tokens", 0) or 0
                    for b in msg.get("content") or []:
                        if isinstance(b, dict) and b.get("type") == "tool_use":
                            tools[b.get("name", "?")] += 1
    except OSError:
        return None
    if n_user == 0 or not prompts:
        return None
    return {
        "project": path.parent.name,
        "session": path.stem,
        "ts": ts_first,
        "ts_end": ts_last,
        "automated": automated,
        "cmd": slash_cmd,
        "first_prompt": prompts[0],
        "followups": prompts[1:MAX_FOLLOWUPS + 1],
        "n_user": n_user,
        "n_assistant": n_assistant,
        "tools": dict(tools.most_common(10)),
        "models": dict(models.most_common(3)),
        "out_tokens": out_tokens,
    }


def main():
    import time
    cutoff = time.time() - RECENT_DAYS * 86400
    files = [p for p in PROJECTS.glob("*/*.jsonl") if p.stat().st_mtime >= cutoff]
    print(f"Scanning {len(files)} session files (last {RECENT_DAYS} days)...", file=sys.stderr)

    sessions = []
    for i, p in enumerate(files):
        if i and i % 300 == 0:
            print(f"  ...{i}/{len(files)}", file=sys.stderr)
        s = parse_session(p)
        if s:
            sessions.append(s)

    # Dedupe by normalized first prompt so cron/fleet repeats collapse to one card
    by_key = defaultdict(list)
    for s in sessions:
        key = hashlib.md5(re.sub(r"[^a-z0-9]", "", s["first_prompt"].lower())[:300].encode()).hexdigest()
        by_key[key].append(s)

    deduped = []
    for group in by_key.values():
        group.sort(key=lambda s: (s["ts"] or ""), reverse=True)
        rep = dict(group[0])
        rep["repeat_count"] = len(group)
        # prefer an interactive representative if the group mixes both
        inter = [s for s in group if not s["automated"]]
        if inter:
            rep.update({k: inter[0][k] for k in ("first_prompt", "followups", "automated", "cmd")})
        deduped.append(rep)
    deduped.sort(key=lambda s: (s["ts"] or ""), reverse=True)

    n_auto = sum(1 for s in deduped if s["automated"])
    stats = {
        "files_scanned": len(files),
        "sessions_parsed": len(sessions),
        "unique_prompts": len(deduped),
        "automated_unique": n_auto,
        "interactive_unique": len(deduped) - n_auto,
        "days": RECENT_DAYS,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "digest.json"
    with open(out, "w") as f:
        json.dump({"stats": stats, "sessions": deduped}, f)
    size_kb = out.stat().st_size // 1024
    print(json.dumps(stats, indent=2))
    print(f"Wrote {out} ({size_kb} KB)")


if __name__ == "__main__":
    main()
