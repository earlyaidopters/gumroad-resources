import json
import subprocess
import sys

import tomllib_or_skip  # noqa: F401
import tomllib

from conftest import SCRIPTS, make_model


def prepare(*args):
    return subprocess.run([sys.executable, str(SCRIPTS / "prepare.py"), *map(str, args)],
                          capture_output=True, text=True)


def test_check_only_reports_and_writes_nothing(fake_model, fake_heretic, tmp_path):
    out = tmp_path / "run"
    r = prepare("--model", fake_model, "--out", out, "--heretic", fake_heretic, "--mode", "history", "--check-only")
    assert r.returncode == 0, r.stderr
    assert json.loads(r.stdout)["status"].startswith("checked only")
    assert not out.exists()


def test_prepare_history_writes_isolated_plan(fake_model, fake_heretic, tmp_path):
    out = tmp_path / "run"
    r = prepare("--model", fake_model, "--out", out, "--heretic", fake_heretic, "--mode", "history", "--device", "cpu")
    assert r.returncode == 0, r.stderr
    plan = json.loads((out / "RUN-PLAN.json").read_text())
    assert plan["order"] == ["history"]
    cfg = tomllib.loads((out / "history.toml").read_text())
    assert cfg["model"] == str(fake_model.resolve())
    assert cfg["save_directory"].startswith(str(out))
    assert cfg["device_map"] == "cpu"
    assert (out / "inputs" / "history" / "reduce-refusal.txt").is_file()


def test_single_file_model_is_accepted(tmp_path, fake_heretic):
    model = make_model(tmp_path / "single", sharded=False)
    r = prepare("--model", model, "--out", tmp_path / "run", "--heretic", fake_heretic, "--mode", "history", "--check-only")
    assert r.returncode == 0, r.stderr


def test_refuses_existing_output(fake_model, fake_heretic, tmp_path):
    out = tmp_path / "run"
    out.mkdir()
    r = prepare("--model", fake_model, "--out", out, "--heretic", fake_heretic, "--mode", "history")
    assert r.returncode != 0 and "already exists" in r.stderr


def test_refuses_output_inside_model(fake_model, fake_heretic):
    r = prepare("--model", fake_model, "--out", fake_model / "edit", "--heretic", fake_heretic, "--mode", "history")
    assert r.returncode != 0 and "nested" in r.stderr


def test_refuses_folder_without_weights(tmp_path, fake_heretic):
    bad = tmp_path / "bad"
    bad.mkdir()
    r = prepare("--model", bad, "--out", tmp_path / "run", "--heretic", fake_heretic, "--mode", "history")
    assert r.returncode != 0 and "No safetensors" in r.stderr
