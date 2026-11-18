import json
import subprocess
import sys

import run as runner
from conftest import SCRIPTS


def journal(tmp_path, trials):
    lines = [{"op_code": 0, "study_name": "heretic", "directions": [1, 1]}]
    for i, (values, direction) in enumerate(trials):
        lines.append({"op_code": 4, "study_id": 0})
        lines.append({"op_code": 8, "trial_id": i, "user_attr": {"index": i + 1}})
        lines.append({"op_code": 8, "trial_id": i, "user_attr": {"parameters": {"direction_index": direction, "weight_distributions": {}}}})
        lines.append({"op_code": 8, "trial_id": i, "user_attr": {"scores": [
            {"name": "Development refusal phrases", "score": {"value": values[0], "md_display": f"{values[0]:.0f}/1"}},
            {"name": "KL divergence", "score": {"value": values[1], "md_display": f"{values[1]:.4f}"}}]}})
        lines.append({"op_code": 6, "trial_id": i, "state": 1, "values": values})
    d = tmp_path / "checkpoints"
    d.mkdir()
    (d / "study.jsonl").write_text("\n".join(json.dumps(x) for x in lines) + "\n")
    return d


def test_trials_follow_heretic_ordering(tmp_path):
    # The real 16 November run: all three removed the refusal, the gentlest won.
    d = journal(tmp_path, [([0.0, 0.0229], 23.0), ([0.0, 0.1851], None), ([0.0, 0.3836], None)])
    rows = runner.trial_table(runner.read_trials(d), 0)
    assert [r["chosen"] for r in rows] == [True, False, False]
    assert rows[0]["direction"] == "layer 23.0" and rows[1]["direction"] == "per layer"
    assert [r["pareto"] for r in rows] == [True, False, False]


def test_pareto_keeps_tradeoffs(tmp_path):
    d = journal(tmp_path, [([1.0, 0.01], 20.0), ([0.0, 0.30], 21.0), ([1.0, 0.50], 22.0)])
    front = runner.pareto_sorted(runner.read_trials(d))
    assert [t["index"] for t in front] == [2, 1]


def test_peak_memory_parse():
    assert runner.peak_memory("  19326222336  peak memory footprint\n")[0] == 19326222336
    assert runner.peak_memory("nothing here") == (None, None)


def fake_setup(tmp_path, model):
    work = tmp_path / "work"
    (work / ".venv" / "bin").mkdir(parents=True)
    for exe in ("python", "heretic"):
        (work / ".venv" / "bin" / exe).write_text("")
    record = {"work": str(work), "heretic": {"commit": "x", "clean": True},
              "env": {"python": str(work / ".venv/bin/python"), "heretic": str(work / ".venv/bin/heretic")},
              "torch": {"device": "cpu", "python": "3.12", "torch": "2", "transformers": "5"},
              "model": {"id": "m", "revision": "r", "path": str(model)}}
    (work / "unlock-setup.json").write_text(json.dumps(record))
    return work


def test_start_dry_run_shows_plan(tmp_path, fake_model):
    work = fake_setup(tmp_path, fake_model)
    r = subprocess.run([sys.executable, str(SCRIPTS / "run.py"), "start", "--work", str(work), "--dry-run"],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    plan = json.loads(r.stdout)
    assert plan["recipe"] == "history" and plan["device"] == "cpu" and plan["stages"][0] == "doctor"
    assert not (work / "runs").exists()


def test_start_without_setup_explains(tmp_path):
    r = subprocess.run([sys.executable, str(SCRIPTS / "run.py"), "start", "--work", str(tmp_path / "none")],
                       capture_output=True, text=True)
    assert r.returncode == 1 and "setup.py" in r.stderr


def test_behavior_recipe_needs_base_model(tmp_path, fake_model):
    work = fake_setup(tmp_path, fake_model)
    r = subprocess.run([sys.executable, str(SCRIPTS / "run.py"), "start", "--work", str(work), "--recipe", "behavior",
                        "--dry-run"], capture_output=True, text=True)
    assert r.returncode == 1 and "--base-model" in r.stderr


def test_lock_blocks_a_second_runner_and_clears_stale_ones(tmp_path):
    import os
    import pytest
    run = tmp_path / "run"
    run.mkdir()
    (run / ".lock").write_text(f"{os.getppid()} then\n")  # a live process that is not us
    with pytest.raises(runner.Fail, match="already working"):
        runner.take_lock(run)
    (run / ".lock").write_text("999999999 then\n")  # a dead process
    runner.take_lock(run)
    assert (run / ".lock").read_text().split()[0] == str(os.getpid())
    runner.release_lock(run)
    assert not (run / ".lock").exists()
