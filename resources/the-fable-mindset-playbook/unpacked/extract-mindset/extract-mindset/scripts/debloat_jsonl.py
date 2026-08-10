#!/usr/bin/env python3
"""
debloat_jsonl.py - strip a Claude Code transcript down to its reasoning trace.

A Claude Code session is stored as JSONL at:
    ~/.claude/projects/<url-encoded-project-path>/<session-uuid>.jsonl

These files are ~90% bloat. In a real 32 MB / 3,354-line session, 28.8 MB was
`user` records that are just tool-result echo (file reads, command output fed
back into context). The model's actual reasoning (`assistant` records, the
thinking blocks) was only ~2.9 MB. This script keeps the reasoning and drops the
echo, so a 32 MB transcript collapses roughly 10x into a clean trace you can
read and analyze.

KEEPS:  your real prompts, the model per turn, assistant thinking + text,
        tool-call NAMES, timestamps, a running turn index.
DROPS:  tool-result echo (the bloat), attachment blobs, big tool inputs,
        and harness bookkeeping (queue-operation, mode, last-prompt, system).

Usage:
    python3 debloat_jsonl.py session.jsonl > slim.jsonl
    # see the size win:
    ls -lh session.jsonl slim.jsonl
"""
import json, sys

KEEP_TYPES = {"user", "assistant"}

def is_tool_result_user(obj):
    """A `user` record that is actually tool output, not something you typed."""
    if obj.get("toolUseResult") is not None:
        return True
    c = obj.get("message", {}).get("content")
    if isinstance(c, list):
        return any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c)
    return False

def slim(obj):
    t = obj.get("type")
    if t not in KEEP_TYPES:
        return None
    msg = obj.get("message", {})
    if t == "user":
        if is_tool_result_user(obj):
            return None  # this is the 90% bloat
        c = msg.get("content")
        text = c if isinstance(c, str) else " ".join(
            b.get("text", "") for b in c
            if isinstance(b, dict) and b.get("type") == "text")
        text = (text or "").strip()
        if not text:
            return None
        return {"role": "user", "ts": obj.get("timestamp"), "text": text}
    # assistant: keep the thinking, the text, and the tool names (not the big inputs)
    blocks = []
    for b in msg.get("content", []):
        if not isinstance(b, dict):
            continue
        if b.get("type") == "thinking":
            blocks.append({"thinking": b.get("thinking", "")})
        elif b.get("type") == "text":
            blocks.append({"text": b.get("text", "")})
        elif b.get("type") == "tool_use":
            blocks.append({"tool": b.get("name")})
    if not blocks:
        return None
    return {"role": "assistant", "model": msg.get("model"),
            "ts": obj.get("timestamp"), "blocks": blocks}

def main(path):
    turn = 0
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            s = slim(obj)
            if s is None:
                continue
            s["turn"] = turn
            turn += 1
            print(json.dumps(s, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python3 debloat_jsonl.py <session.jsonl> > slim.jsonl")
    main(sys.argv[1])
