#!/usr/bin/env python3
"""SQLite history store for /benchmark: ~/.claude/benchmark/benchmark.db

Created ONLY after the user consents (the skill asks on first run). Stores every
run's per-task metrics and judge verdicts so scorecards can say "vs your last 4
benchmarks" and model upgrades can be tracked longitudinally.

Usage:
  db.py init                 create the database (call only after user consent)
  db.py record <run_dir>     import a run's results.json (+verdicts if scored)
  db.py state get <key>      read a state value (e.g. last_benchmarked_model)
  db.py state set <key> <v>  write a state value
  db.py summary              compact history: runs, variants, win rates
"""

import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

BENCH = Path(os.environ.get("BENCHMARK_HOME") or Path.home() / ".claude" / "benchmark")
DB = BENCH / "benchmark.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs(
  run_id TEXT PRIMARY KEY, ts TEXT, pack_version TEXT, variants TEXT);
CREATE TABLE IF NOT EXISTS results(
  run_id TEXT, task_id TEXT, variant TEXT,
  turns INTEGER, words INTEGER, duration_s REAL, output_tokens INTEGER,
  checks_passed INTEGER, checks_total INTEGER, is_error INTEGER,
  judge_outcome TEXT, judge_score REAL,
  PRIMARY KEY(run_id, task_id, variant));
CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, value TEXT);
"""


def connect(create=False):
    """Consent guard: only `db.py init` may create the file. Everything else
    exits quietly when no memory file exists."""
    if not DB.exists() and not create:
        print("No memory file yet (benchmark.db was never created; run db.py init after user consent).")
        sys.exit(0)
    con = sqlite3.connect(DB)
    con.executescript(SCHEMA)
    cols = [r[1] for r in con.execute("PRAGMA table_info(results)")]
    if "ref" not in cols:
        con.execute("ALTER TABLE results ADD COLUMN ref TEXT")
    rcols = [r[1] for r in con.execute("PRAGMA table_info(runs)")]
    if "pack_hash" not in rcols:
        con.execute("ALTER TABLE runs ADD COLUMN pack_hash TEXT")
    return con


def record(run_dir: Path):
    results = json.loads((run_dir / "results.json").read_text())
    verdicts = results.get("verdicts", {})  # {"task|variant": {...}} written by score.py
    con = connect()
    con.execute("INSERT OR REPLACE INTO runs(run_id, ts, pack_version, variants, pack_hash) VALUES(?,?,?,?,?)",
                (results["run_id"], datetime.now().isoformat(timespec="seconds"),
                 results["pack_version"], json.dumps(results["variants"]),
                 results.get("pack_hash")))
    ref = next((v for v in results.get("variants", []) if v), None)
    for tid, by_v in results["tasks"].items():
        for variant, m in by_v.items():
            checks = m.get("checks") or []
            v = verdicts.get(f"{tid}|{variant}", {})
            con.execute("INSERT OR REPLACE INTO results VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                results["run_id"], tid, variant,
                m.get("num_turns"), m.get("words"), m.get("duration_s"), m.get("output_tokens"),
                sum(1 for c in checks if c["pass"] is True),
                sum(1 for c in checks if c["pass"] is not None),
                1 if (m.get("error") or m.get("is_error")) else 0,
                v.get("outcome"), v.get("score"), ref))
    con.commit()
    print(f"Recorded {results['run_id']} ({len(results['tasks'])} tasks)")


def summary():
    con = connect()
    print("RUNS:")
    for r in con.execute("SELECT run_id, ts, variants FROM runs ORDER BY ts"):
        print(f"  {r[1]}  {r[0]}  {r[2]}")
    print("\nWIN RATES (challenger vs its actual reference):")
    q = """SELECT variant, COALESCE(ref,'?'), judge_outcome, COUNT(*) FROM results
           WHERE judge_outcome IS NOT NULL GROUP BY variant, ref, judge_outcome"""
    for r in con.execute(q):
        print(f"  {r[0]} vs {r[1]}: {r[2]} x{r[3]}")


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == "init":
        BENCH.mkdir(parents=True, exist_ok=True)
        connect(create=True).close()
        print(f"Created {DB}")
    elif args[0] == "record":
        record(Path(args[1]))
    elif args[0] == "state" and args[1] == "get":
        con = connect()
        row = con.execute("SELECT value FROM state WHERE key=?", (args[2],)).fetchone()
        print(row[0] if row else "")
    elif args[0] == "state" and args[1] == "set":
        con = connect()
        con.execute("INSERT OR REPLACE INTO state VALUES(?,?)", (args[2], args[3]))
        con.commit()
    elif args[0] == "summary":
        summary()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
