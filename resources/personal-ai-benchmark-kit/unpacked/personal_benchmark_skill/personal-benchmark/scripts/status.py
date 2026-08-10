#!/usr/bin/env python3
"""One-shot environment probe for /benchmark. The skill runs this FIRST on every
invocation and branches on the JSON: first-run wizard, upgrade nudge, or normal dispatch.

Prints JSON:
  first_run          - nothing set up yet -> run the wizard
  db_exists          - user consented to the SQLite store
  pack_version       - frozen eval pack date, or null
  archetypes         - names + shares if mined
  history_size       - projects dir size + jsonl count (for the wizard pitch)
  engine             - gemini (key found) or claude (zero-config haiku fallback)
  cc_version         - current `claude --version`
  last_cc_version    - version at last benchmark (from db state)
  cc_upgraded        - true if version changed since last benchmark
  last_benchmarked_model / last_run
"""

import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

BENCH = Path(os.environ.get("BENCHMARK_HOME") or Path.home() / ".claude" / "benchmark")
sys.path.insert(0, str(Path(__file__).parent))
from llm import ENGINE  # noqa: E402


def state_get(key):
    db = BENCH / "benchmark.db"
    if not db.exists():
        return None
    row = sqlite3.connect(db).execute(
        "SELECT value FROM state WHERE key=?", (key,)).fetchone()
    return row[0] if row else None


def main():
    projects = Path.home() / ".claude" / "projects"
    jsonls = list(projects.glob("*/*.jsonl")) if projects.exists() else []
    size_gb = round(sum(p.stat().st_size for p in jsonls) / 1e9, 2)

    try:
        cc_version = subprocess.run(["claude", "--version"], capture_output=True,
                                    text=True, timeout=15).stdout.strip()
    except Exception:
        cc_version = None

    pack = BENCH / "eval_pack.json"
    pack_version = json.loads(pack.read_text())["version"] if pack.exists() else None
    arch_file = BENCH / "archetypes.json"
    archetypes = [{"name": a["name"], "share_pct": a["share_pct"]}
                  for a in json.loads(arch_file.read_text())] if arch_file.exists() else None

    db_exists = (BENCH / "benchmark.db").exists()
    last_cc = state_get("last_cc_version")
    runs_dir = BENCH / "runs"
    runs = sorted(runs_dir.iterdir()) if runs_dir.exists() else []

    if "--brief" in sys.argv:
        print(f"PACK: {pack_version or 'none (first run)'} · "
              f"{len(archetypes or [])} task categories · memory file: {'yes' if db_exists else 'no'}")
        if archetypes:
            print("CATEGORIES: " + ", ".join(
                f"{a['name']} {a['share_pct']:g}%" for a in archetypes))
        if runs:
            latest = runs[-1]
            v = latest / "verdict.json"
            headline = json.loads(v.read_text()).get("headline") if v.exists() else None
            print(f"LATEST RUN: {latest.name}")
            print(f"LATEST VERDICT: {headline or '(not written yet)'}")
        unfinished = [r.name for r in runs
                      if not (r / "verdict.json").exists() and (r / "results.json").exists()]
        if unfinished:
            print(f"UNFINISHED (no verdict yet): {len(unfinished)} run(s), newest {unfinished[-1]}")
        if cc_version and last_cc and cc_version != last_cc:
            print(f"UPGRADE DETECTED: Claude Code {last_cc} -> {cc_version} since last benchmark")
        print(f"HISTORY: {len(jsonls)} conversations ({size_gb}GB) · engine: {ENGINE}")
        return

    print(json.dumps({
        "first_run": not pack_version and not db_exists,
        "db_exists": db_exists,
        "pack_version": pack_version,
        "archetypes": archetypes,
        "history_size": {"jsonl_files": len(jsonls), "gb": size_gb},
        "engine": ENGINE,
        "cc_version": cc_version,
        "last_cc_version": last_cc,
        "cc_upgraded": bool(cc_version and last_cc and cc_version != last_cc),
        "last_benchmarked_model": state_get("last_benchmarked_model"),
        "last_run": runs[-1].name if runs else None,
    }, indent=2))


if __name__ == "__main__":
    main()
