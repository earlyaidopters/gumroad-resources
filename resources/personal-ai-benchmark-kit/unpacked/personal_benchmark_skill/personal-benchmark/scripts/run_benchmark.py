#!/usr/bin/env python3
"""Stage 2 of /benchmark: replay the frozen eval pack against model variants, headlessly.

A variant is model[@effort], e.g. claude-opus-5@high or claude-opus-4-8.
Runs on the Claude subscription via `claude -p` (no API key billing). Each task
runs in its own scratch dir with fixtures written first. Captures behavioral
metrics: turns, words, duration, cost, output tokens, deterministic checks.

Usage:
  run_benchmark.py --variants claude-opus-4-8,claude-opus-5 [--tasks slug1,slug2] [--max-turns 25]
  run_benchmark.py --variants claude-opus-5@low,claude-opus-5@high,claude-fable-5@medium
  run_benchmark.py --model claude-opus-5 --baseline claude-sonnet-5   (legacy sugar)

The FIRST variant is the reference ("before"); later variants are challengers ("after").
Cells run in parallel (--parallel, default 3) in randomized order so no model always goes
first. A live progress page (live.html) updates as cells finish; open it to watch.
Fixture writes are contained to each scratch dir; artifacts (file manifests + snippets)
are preserved for the judge before scratch dirs are cleaned up.

Output: <BENCHMARK_HOME>/runs/<run_id>/: results.json, live.html, per-cell .md outputs,
and a frozen eval_pack.json snapshot so later re-mining can't corrupt this run.
"""

import argparse
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

BENCH = Path(os.environ.get("BENCHMARK_HOME") or Path.home() / ".claude" / "benchmark")
SNIPPET_CHARS = 2500
MAX_ARTIFACT_BYTES = 60_000


def parse_variant(spec):
    model, _, effort = spec.partition("@")
    return {"label": spec, "model": model, "effort": effort or None}


def safe_fixture_path(workdir: Path, rel: str):
    """Fixture paths come from generated JSON; keep every write inside the scratch dir."""
    if not rel or Path(rel).is_absolute():
        return None
    p = (workdir / rel).resolve()
    if not str(p).startswith(str(workdir.resolve()) + "/"):
        return None
    return p


def collect_artifacts(workdir: Path, fixtures: dict):
    """Manifest of what the model actually produced, kept so the judge can see
    deliverables (not just the final chat message) after the scratch dir is removed."""
    out = []
    for p in sorted(workdir.rglob("*")):
        if not p.is_file() or p.is_symlink():
            continue
        rel = str(p.relative_to(workdir))
        try:
            size = p.stat().st_size
            content = p.read_text(errors="replace")[:SNIPPET_CHARS] if size <= MAX_ARTIFACT_BYTES else None
        except OSError:
            continue
        unchanged_fixture = rel in fixtures and content is not None and \
            content == fixtures[rel][:SNIPPET_CHARS]
        out.append({"path": rel, "bytes": size, "preexisting_fixture": rel in fixtures,
                    "unchanged": unchanged_fixture, "snippet": content})
    return out[:30]


def reset_workdir(workdir: Path, task):
    """Fresh scratch dir + fixtures. Called before EVERY attempt so a failed
    attempt's partial files never leak into the retry."""
    shutil.rmtree(workdir, ignore_errors=True)
    workdir.mkdir(parents=True, exist_ok=True)
    fixtures = {}
    for fx in task.get("fixture_files", []):
        p = safe_fixture_path(workdir, fx.get("path", ""))
        if p is None:
            print(f"  ! skipping unsafe fixture path: {fx.get('path')}", file=sys.stderr)
            continue
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(fx["content"])
        fixtures[fx["path"]] = fx["content"]
    return fixtures


def run_task(task, variant, workdir: Path, max_turns: int):
    cmd = [
        "claude", "-p", task["prompt"],
        "--model", variant["model"],
        "--output-format", "json",
        "--max-turns", str(max_turns),
        "--permission-mode", "acceptEdits",
        "--setting-sources", "",  # isolate: no CLAUDE.md, no user skills leaking in
    ]
    if variant["effort"]:
        cmd += ["--effort", variant["effort"]]
    t0 = time.time()
    TRANSIENT = ("529", "Overloaded", "rate limit", "rate_limit", "503", "internal server")
    data = {}
    fixtures = {}
    for attempt in range(3):
        fixtures = reset_workdir(workdir, task)
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True,
                                  cwd=workdir, timeout=900)
            raw = proc.stdout
            data = json.loads(raw) if raw.strip().startswith("{") else {}
        except subprocess.TimeoutExpired:
            return {"error": "timeout after 900s", "duration_s": round(time.time() - t0)}
        except json.JSONDecodeError:
            data = {}
        blob = (data.get("result") or "") if data else (proc.stderr or proc.stdout or "")
        if data and not (data.get("is_error") and any(t in blob for t in TRANSIENT)):
            break  # success, or a real (non-transient) error worth reporting
        if attempt < 2 and any(t in blob for t in TRANSIENT):
            print(f"  ↻ transient API error, retrying in {15 * (attempt + 1)}s...", file=sys.stderr)
            time.sleep(15 * (attempt + 1))
            continue
        break
    if not data:
        return {"error": (proc.stderr or proc.stdout or "no output")[:500],
                "duration_s": round(time.time() - t0)}

    result_text = data.get("result", "") or ""
    usage = data.get("usage", {}) or {}
    metrics = {
        "result": result_text,
        "num_turns": data.get("num_turns"),
        "duration_s": round((data.get("duration_ms") or 0) / 1000, 1),
        "cost_usd": data.get("total_cost_usd"),
        "output_tokens": usage.get("output_tokens"),
        "words": len(result_text.split()),
        "elapsed_s": round(time.time() - t0, 1),  # end-to-end incl. retries/backoff
        "is_error": data.get("is_error", False) or data.get("subtype") == "error_max_turns",
    }
    metrics["artifacts"] = collect_artifacts(workdir, fixtures)
    metrics["checks"] = run_checks(task, result_text, workdir, fixtures, metrics["artifacts"])
    return metrics


def run_checks(task, text, workdir: Path, fixtures, artifacts=None):
    # the deliverable = chat message + files the model wrote or MODIFIED (untouched fixtures excluded)
    produced = [a.get("snippet") or "" for a in (artifacts or []) if not a.get("unchanged")]
    haystack = text + "\n" + "\n".join(produced)
    out = []
    for c in task.get("deterministic_checks", []):
        ctype = c.get("type")
        ok = None
        try:
            if ctype == "regex_absent":
                ok = re.search(c["pattern"], haystack) is None
            elif ctype == "regex_present":
                ok = re.search(c["pattern"], haystack, re.I) is not None
            elif ctype == "max_words":
                ok = len(text.split()) <= int(c.get("n") or c.get("max") or 10**6)
            elif ctype == "file_created":
                hits = [p for p in workdir.rglob(c.get("path") or "*") if p.is_file()]
                # a fixture that still holds its original content was NOT created by the model
                ok = any(
                    str(p.relative_to(workdir)) not in fixtures
                    or p.read_text(errors="replace") != fixtures[str(p.relative_to(workdir))]
                    for p in hits) if hits else False
        except Exception:
            ok = None
        out.append({"label": c.get("label", ctype), "pass": ok})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", default="")
    ap.add_argument("--model", default="")      # legacy sugar
    ap.add_argument("--baseline", default="")   # legacy sugar
    ap.add_argument("--tasks", default="")
    ap.add_argument("--pack", default="", help="path to an alternate pack json (ad-hoc tasks)")
    ap.add_argument("--max-turns", type=int, default=25)
    ap.add_argument("--parallel", type=int, default=3)
    ap.add_argument("--trials", type=int, default=1,
                    help="runs per cell; 3 gives majority-vote verdicts that survive judge variance")
    args = ap.parse_args()

    if args.variants:
        variants = [parse_variant(v.strip()) for v in args.variants.split(",") if v.strip()]
    elif args.model:
        specs = ([args.baseline] if args.baseline and args.baseline != "none" else []) + [args.model]
        variants = [parse_variant(s) for s in specs]
    else:
        sys.exit("Pass --variants model[@effort],model[@effort],... (first = reference/before)")

    pack = json.loads((Path(args.pack) if args.pack else BENCH / "eval_pack.json").read_text())
    tasks = pack["tasks"]
    if args.tasks:
        wanted = set(args.tasks.split(","))
        tasks = [t for t in tasks if t["id"] in wanted]

    # validate the pack before spending money: collisions here corrupt parallel runs
    safe_label = lambda s: re.sub(r"[^A-Za-z0-9._-]", "-", s)
    KNOWN_CHECKS = {"regex_absent", "regex_present", "max_words", "file_created"}
    problems = []
    tids = [t.get("id", "") for t in tasks]
    if not tasks:
        problems.append("pack has no tasks (or --tasks matched none)")
    if len(set(tids)) != len(tids):
        problems.append(f"duplicate task ids: {sorted(set(t for t in tids if tids.count(t) > 1))}")
    labels = [v["label"] for v in variants]
    if len(set(labels)) != len(labels):
        problems.append(f"duplicate variants: {labels}")
    safe_names = [safe_label(x) for x in tids + labels]
    if len(set(safe_names)) != len(safe_names):
        problems.append("two task ids or variant labels collide after filename sanitizing")
    for t in tasks:
        for c in t.get("deterministic_checks", []):
            if c.get("type") not in KNOWN_CHECKS:
                problems.append(f"{t.get('id')}: unknown check type {c.get('type')!r}")
    if problems:
        sys.exit("Pack validation failed:\n  - " + "\n  - ".join(problems))

    import hashlib
    pack_hash = pack.get("hash") or hashlib.sha256(
        json.dumps(pack["tasks"], sort_keys=True).encode()).hexdigest()[:12]

    slug = "_vs_".join(safe_label(v["label"]) for v in variants)[:80]
    run_id = f"{datetime.now():%Y-%m-%d_%H%M%S}_{os.urandom(2).hex()}_{slug}"[:120]
    run_dir = BENCH / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    # snapshot the exact pack this run used; scoring reads the snapshot, never the live pack
    (run_dir / "eval_pack.json").write_text(json.dumps(pack, indent=2))

    results = {"run_id": run_id, "variants": [v["label"] for v in variants],
               "pack_version": pack["version"], "pack_hash": pack_hash,
               "trials": args.trials,
               "tasks": {t["id"]: {} for t in tasks}}
    lock = threading.Lock()
    cell_state = {(t["id"], v["label"]): "waiting" for t in tasks for v in variants}

    def write_live():
        short = lambda s: re.sub(r"^claude-", "", s)
        head = "".join(f"<th>{short(v['label'])}</th>" for v in variants)
        rows = []
        for t in tasks:
            cells = []
            for v in variants:
                st = cell_state[(t["id"], v["label"])]
                m = results["tasks"][t["id"]].get(v["label"]) or {}
                if st == "done" and not (m.get("error") or m.get("is_error")):
                    cells.append(f"<td class='done'>✓<span>{m.get('num_turns','?')} turns · "
                                 f"{m.get('words','?')} words · {m.get('duration_s','?')}s</span></td>")
                elif st == "done":
                    cells.append("<td class='err'>✗<span>error</span></td>")
                elif st == "running":
                    cells.append("<td class='run'>●<span>working…</span></td>")
                else:
                    cells.append("<td class='wait'>·<span>queued</span></td>")
            rows.append(f"<tr><th>{t['id']}</th>{''.join(cells)}</tr>")
        done = sum(1 for s in cell_state.values() if s == "done")
        finished = done == len(cell_state)
        model_word = "model" if len(variants) == 1 else "models"
        n_tasks = "one" if len(tasks) == 1 else str(len(tasks))
        n_errors = sum(1 for t in tasks for v in variants
                       if (results["tasks"][t["id"]].get(v["label"]) or {}).get("is_error")
                       or (results["tasks"][t["id"]].get(v["label"]) or {}).get("error"))
        if finished and n_errors == len(cell_state):
            headline = "Every session hit an error. Nothing to judge; check the model names and try again."
        elif finished:
            headline = "All sessions done. Judging the outputs and writing your verdict…" + \
                (f" ({n_errors} session{'s' if n_errors > 1 else ''} failed and will be reported)" if n_errors else "")
        else:
            headline = f"Testing {len(variants)} {model_word} on {n_tasks} of my real tasks… {done}/{len(cell_state)}"
        title = "Verdict coming up…" if finished else "Benchmark running…"
        (run_dir / "live.html").write_text(f"""<!doctype html><meta charset='utf-8'>
<meta http-equiv='refresh' content='2'><title>{title}</title><style>
body{{margin:0;background:#F4F3EE;color:#141413;font-family:-apple-system,Helvetica,Arial,sans-serif;
display:flex;flex-direction:column;justify-content:center;min-height:100vh;padding:48px;box-sizing:border-box}}
.kick{{color:#C15F3C;font:700 15px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}}
h1{{font-size:32px;margin:0 0 26px}}
table{{border-collapse:collapse;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 14px rgba(20,20,19,.07)}}
th{{padding:14px 18px;text-align:left;font-size:15px}}
thead th{{background:#141413;color:#F4F3EE}}
tbody th{{border-top:1px solid #EEECE5;font-weight:600;max-width:280px}}
table{{table-layout:fixed}}
td{{border-top:1px solid #EEECE5;padding:14px 18px;font-size:22px;text-align:center;overflow:hidden}}
tbody th{{width:24%;overflow-wrap:break-word}}
td span{{display:block;font-size:12.5px;color:#8a877e;margin-top:3px}}
.done{{color:#2e7d4f}} .run{{color:#C15F3C;animation:p 1.2s infinite}} .wait{{color:#B1ADA1}} .err{{color:#b3261e}}
@keyframes p{{50%{{opacity:.35}}}}
.foot{{margin-top:18px;color:#B1ADA1;font-size:14px}}
</style><body><div class='kick'>Personal benchmark · live</div>
<h1>{headline}</h1>
<table><thead><tr><th>task</th>{head}</tr></thead><tbody>{''.join(rows)}</tbody></table>
<div class='foot'>Every cell is a real, isolated work session. This page refreshes itself; leave it on screen.</div>
</body>""")

    # scratch dirs MUST live outside ~/.claude: Claude Code refuses to edit files
    # inside its own config tree, so models could never write deliverables there.
    # mkdtemp = private, unpredictable path (not shared /tmp/benchmark-work).
    work_root = Path(tempfile.mkdtemp(prefix="benchmark-"))

    def median(xs):
        xs = sorted(x for x in xs if x is not None)
        return xs[len(xs) // 2] if xs else None

    def aggregate_trials(trials):
        """Collapse N trial metrics into one cell record: median scalars, majority
        checks, a representative result, and the full trials list for the judge."""
        ok = [t for t in trials if not (t.get("error") or t.get("is_error"))]
        if not ok:
            return dict(trials[0], trials=trials)
        agg = dict(ok[len(ok) // 2])  # representative: middle trial
        for k in ("num_turns", "words", "duration_s", "output_tokens", "elapsed_s"):
            agg[k] = median([t.get(k) for t in ok])
        labels = {c["label"] for t in ok for c in (t.get("checks") or [])}
        agg["checks"] = []
        for l in sorted(labels):
            votes = [c["pass"] for t in ok for c in (t.get("checks") or []) if c["label"] == l]
            known = [v for v in votes if v is not None]
            agg["checks"].append({"label": l, "pass": (sum(known) > len(known) / 2) if known else None})
        agg["trials"] = trials
        return agg

    def do_cell(task, v):
        safe, tid = safe_label(v["label"]), safe_label(task["id"])
        with lock:
            cell_state[(task["id"], v["label"])] = "running"
            write_live()
        print(f"▶ {task['id']} on {v['label']}...", file=sys.stderr)
        if args.trials <= 1:
            m = run_task(task, v, work_root / f"{tid}__{safe}", args.max_turns)
        else:
            trials = []
            for t in range(args.trials):
                print(f"  trial {t + 1}/{args.trials}", file=sys.stderr)
                trials.append(run_task(task, v, work_root / f"{tid}__{safe}__t{t}", args.max_turns))
            m = aggregate_trials(trials)
        with lock:
            results["tasks"][task["id"]][v["label"]] = m
            cell_state[(task["id"], v["label"])] = "done"
            (run_dir / f"{tid}__{safe}.md").write_text(m.get("result", m.get("error", "")))
            (run_dir / "results.json").write_text(json.dumps(results, indent=2))
            write_live()
        status = "ERROR" if m.get("error") or m.get("is_error") else \
            f"{m['num_turns']} turns, {m['words']} words, {m['duration_s']}s"
        print(f"  ✔ {task['id']} on {v['label']}: {status}", file=sys.stderr)

    write_live()
    print(f"LIVE VIEW: {run_dir}/live.html", file=sys.stderr)

    # randomized order so no model always runs first (avoids time/load confounds)
    cells = [(t, v) for t in tasks for v in variants]
    random.Random(run_id).shuffle(cells)
    with ThreadPoolExecutor(max_workers=max(1, args.parallel)) as ex:
        list(ex.map(lambda c: do_cell(*c), cells))

    shutil.rmtree(work_root, ignore_errors=True)
    print(f"\nResults: {run_dir}/results.json")


if __name__ == "__main__":
    main()
