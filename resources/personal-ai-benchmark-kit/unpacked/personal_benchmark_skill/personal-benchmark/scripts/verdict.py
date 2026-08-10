#!/usr/bin/env python3
"""Stage 5 of /benchmark: the TLDR verdict, the answer people come to YouTube for.

Feeds the whole scorecard to Claude via `claude -p` (subscription, one call) and
gets back a structured verdict: a headline, the bottom line, what changed
behaviorally, per-category winners, and a clear recommendation. Prepends it to
scorecard.md and saves verdict.json for report.py to render as a hero block.

Usage: verdict.py [run_dir] [--model claude-sonnet-5]
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

BENCH = Path(os.environ.get("BENCHMARK_HOME") or Path.home() / ".claude" / "benchmark")


def ask_claude(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model, "--output-format", "json",
         "--max-turns", "4", "--setting-sources", ""],
        capture_output=True, text=True, timeout=300)
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        sys.exit(f"claude -p gave no JSON envelope. stderr: {proc.stderr[:400]}")
    text = data.get("result", "") or ""
    if not text.strip():
        sys.exit(f"claude -p returned an empty result (subtype={data.get('subtype')}). "
                 "Re-run verdict.py; if it persists, try --model claude-opus-5.")
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    body = (m.group(1) if m else text).strip()
    # tolerate prose before/after the JSON object
    if not body.startswith("{"):
        s, e = body.find("{"), body.rfind("}")
        if s != -1 and e > s:
            body = body[s:e + 1]
    return json.loads(body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir", nargs="?", default=None)
    ap.add_argument("--model", default="claude-sonnet-5")
    args = ap.parse_args()
    run_dir = Path(args.run_dir) if args.run_dir else sorted((BENCH / "runs").iterdir())[-1]

    scorecard = (run_dir / "scorecard.md").read_text()
    results = json.loads((run_dir / "results.json").read_text())
    variants = [v for v in results.get("variants", []) if v and v != "none"]
    ref = variants[0]

    prompt = f"""You are writing the TLDR verdict for a personal AI-model benchmark, the punchy
"so should I care?" answer people skip to. The user benchmarked new model(s) against their
current one ({ref}) on tasks mined from their own real work history. Full scorecard below.

Write for a smart non-technical reader. Plain words, no jargon, no hedging mush, no hype.
Concrete numbers only where they carry the point. NEVER use em dashes.
Honesty rules: the scorecard states how many trials each task ran. With 1 trial, treat results
as a strong directional signal, not proof. With 3+ trials and majority-vote winners, you may be
firmer, especially on unanimous results; stay cautious on split ones (the split is shown).
If the scorecard lists unjudged comparisons or quarantined checks, weave them in plainly
(a model that produced nothing is a reliability problem, not a skipped row).

Return ONLY this JSON:
{{
 "headline": "one punchy sentence, the verdict itself, max 14 words",
 "bottom_line": "2-3 sentences: is the upgrade real, what actually changed, any surprise",
 "behavior": ["3-4 short bullets on HOW the models behave differently (verbosity, patience, rule-following, speed, and the intangibles: soul, lecturing, padding from the vibe scores), each grounded in a number or quoted evidence from the scorecard"],
 "category_winners": [{{"category": "task name in plain words", "share": "N%", "winner": "model", "why": "under 12 words"}}],
 "recommendation": "one sentence: switch, stay, or split by task type, and for whom",
 "caveat": "one honest sentence on what this benchmark can't see"
}}

SCORECARD:
{scorecard[:14000]}"""

    print(f"  [claude -p {args.model}] writing the verdict...", file=sys.stderr)
    v = ask_claude(prompt, args.model)
    (run_dir / "verdict.json").write_text(json.dumps(v, indent=2))

    md = ["## The Verdict (TLDR)", "", f"**{v['headline']}**", "", v["bottom_line"], "",
          "**How they behave differently:**"]
    md += [f"- {b}" for b in v.get("behavior", [])]
    md += ["", "| task | share | winner | why |", "|---|---|---|---|"]
    md += [f"| {w['category']} | {w['share']} | {w['winner']} | {w['why']} |"
           for w in v.get("category_winners", [])]
    md += ["", f"**Recommendation:** {v['recommendation']}", "",
           f"*Caveat: {v['caveat']}*", "", "---", ""]

    sc = run_dir / "scorecard.md"
    body = sc.read_text()
    body = re.sub(r"\n## The Verdict \(TLDR\).*?\n---\n\n", "\n", body, flags=re.S)  # idempotent
    first_break = body.index("\n\n") + 2
    sc.write_text(body[:first_break] + "\n".join(md) + body[first_break:])
    print(f"Verdict written into {sc} and {run_dir}/verdict.json")


if __name__ == "__main__":
    main()
