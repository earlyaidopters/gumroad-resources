#!/usr/bin/env python3
"""Stage 1b of /benchmark: cluster the digest into task archetypes and freeze an eval pack.

Workhorse: Gemini Flash if a key exists, otherwise Haiku via the Claude subscription
(zero config). Two phases:
  1. Cluster all unique prompts into 6-10 archetypes (with subtasks) weighted by repeats.
  2. Per top archetype, freeze one task card: a representative prompt from real history,
     deterministic checks (each tied to an explicit requirement in the prompt), and a
     judge rubric mined from the follow-up corrections the user actually typed.

Output: <BENCHMARK_HOME>/eval_pack.json (+ archetypes.json for the distribution table)
"""

import json
import os
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from llm import llm_json as flash_json  # gemini flash, or haiku fallback (zero-config)

BENCH = Path(os.environ.get("BENCHMARK_HOME") or Path.home() / ".claude" / "benchmark")
MAX_TASKS = int(os.environ.get("BENCHMARK_MAX_TASKS", "8"))


def main():
    digest = json.loads((BENCH / "digest.json").read_text())
    sessions = digest["sessions"]
    by_id = {i: s for i, s in enumerate(sessions)}

    lines = []
    for i, s in by_id.items():
        tag = "AUTO" if s["automated"] else "USER"
        lines.append(f"{i}|{tag}|x{s['repeat_count']}|{s['first_prompt'][:220]}")

    cluster_prompt = f"""You are analyzing one person's real Claude Code usage history to build their PERSONAL model benchmark.
Below are {len(lines)} unique prompt patterns. Format: id|AUTO-or-USER|xRepeatCount|prompt snippet.
AUTO = scheduled agent jobs, USER = typed interactively. Repeat count = how many sessions started with this pattern.

Group them into 6-10 task ARCHETYPES that describe what this person actually uses AI for
(e.g. "YouTube thumbnail generation", "email triage and drafting", "video script writing", "codebase debugging").
Weight importance by repeat counts AND by interactive usage (USER patterns matter more than AUTO for benchmarking,
but a heavily repeated AUTO job is still a real workload).

Skip pure meta/housekeeping patterns (model switching, /clear, memory-extraction internals).

Return JSON: {{"archetypes": [{{"name": str, "description": str, "share_pct": number,
"interactive": bool, "subtasks": ["3-6 short strings naming the distinct sub-activities inside this archetype"],
"example_ids": [int, ...up to 6, prefer USER examples]}}]}}
Order by share_pct descending. share_pct should sum to ~100 across archetypes.

{chr(10).join(lines)}"""

    clusters = flash_json(cluster_prompt, f"clustering {len(lines)} patterns")
    archetypes = clusters["archetypes"]
    (BENCH / "archetypes.json").write_text(json.dumps(archetypes, indent=2))
    for a in archetypes:
        subs = ", ".join(a.get("subtasks", [])[:6])
        print(f"  {a['share_pct']:>5.1f}%  {a['name']}")
        if subs:
            print(f"          └ {subs}")

    tasks = []
    for a in archetypes[:MAX_TASKS]:
        examples = [by_id[i] for i in a["example_ids"] if i in by_id]
        if not examples:
            continue
        ex_blocks = []
        for s in examples[:4]:
            fu = "\n".join(f"  FOLLOW-UP: {f}" for f in s["followups"][:4])
            ex_blocks.append(f"PROMPT (x{s['repeat_count']}): {s['first_prompt']}\n{fu}")

        card_prompt = f"""You are freezing ONE benchmark task card for the archetype "{a['name']}" ({a['description']})
from this person's real Claude Code history. Real examples with their follow-up messages
(follow-ups often contain corrections = what they care about):

{chr(10).join(ex_blocks)}

Design a single SELF-CONTAINED benchmark task that represents this archetype and can run headlessly
(one-shot, no back-and-forth, no access to this person's private files or accounts). Base it as closely
as possible on a real prompt above, but rewrite just enough to be self-contained: inline any needed
context as a short fixture the task itself provides.

Return JSON:
{{"id": "kebab-case-slug",
 "archetype": "{a['name']}",
 "prompt": "the exact prompt to send the model, self-contained, in this person's own phrasing style",
 "fixture_files": [{{"path": "relative/path.ext", "content": "small fixture file content"}}] or [],
 "deterministic_checks": [
    {{"type": "regex_absent", "pattern": "\\u2014", "label": "no em dashes"}},
    ... 2-5 checks of types: regex_absent, regex_present (pattern,label), max_words (n,label), file_created (path,label)
 ],
 "rubric": ["3-6 judge criteria mined from what the follow-ups show this person corrects or values"]}}

deterministic_checks run against the model's final text output (file_created against the working dir).
Hard rules for a valid card:
- The prompt must be runnable by a PLAIN headless coding agent with only file read/write tools. Never
  reference plugins, subagents, slash commands, MCP servers, live websites, or accounts.
- Every check must test something the prompt EXPLICITLY asks for. If the prompt doesn't demand it,
  either add the demand to the prompt or drop the check.
- file_created checks MUST have a concrete "path" glob (e.g. "plan.md" or "*.html"), never empty.
- max_words checks MUST have an integer "n".
Always include the no-em-dashes check AND state "no em dashes" as a requirement inside the prompt itself.
Keep fixture files under 60 lines each."""

        try:
            card = flash_json(card_prompt, f"task card: {a['name']}")
            if isinstance(card, list):
                card = card[0]
            card["share_pct"] = a["share_pct"]
            tasks.append(card)
        except Exception as e:
            print(f"  ! skipped {a['name']}: {e}", file=sys.stderr)

    import hashlib
    pack = {
        "version": str(date.today()),
        "hash": hashlib.sha256(json.dumps(tasks, sort_keys=True).encode()).hexdigest()[:12],
        "source_stats": digest["stats"],
        "tasks": tasks,
    }
    out = BENCH / "eval_pack.json"
    out.write_text(json.dumps(pack, indent=2))
    print(f"\nFroze {len(tasks)} task cards -> {out}")


if __name__ == "__main__":
    main()
