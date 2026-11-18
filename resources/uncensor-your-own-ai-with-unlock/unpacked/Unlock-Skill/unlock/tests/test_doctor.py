import json
import subprocess
import sys

import doctor
from conftest import SCRIPTS

GIB = 1024**3


def facts(**over):
    f = {"device": "mps", "os": {"system": "Darwin", "release": "26", "machine": "arm64"},
         "memory_bytes": 128 * GIB, "nvidia_gpus": [], "disk": {"free_bytes": 500 * 10**9},
         "tools": {"git": "2.50", "uv": "0.11", "python": "3.12"},
         "model": {"cached_at": "/x"}, "setup": {"setup_file": None, "heretic_commit": None, "venv_python": None, "torch": None}}
    f.update(over)
    return f


def test_tested_mac_is_ready():
    a = doctor.assess(facts())
    assert a["verdict"] == "ready" and a["tested_setup"]


def test_small_mac_is_blocked_and_mid_mac_is_tight():
    assert doctor.assess(facts(memory_bytes=8 * GIB))["verdict"] == "blocked"
    assert doctor.assess(facts(memory_bytes=16 * GIB))["verdict"] == "tight"
    assert doctor.assess(facts(memory_bytes=24 * GIB))["verdict"] == "untested"


def test_nvidia_is_untested_and_small_cards_blocked():
    big = facts(device="cuda", os={"system": "Linux", "release": "6", "machine": "x86_64"},
                nvidia_gpus=[{"name": "RTX", "memory_bytes": 24 * GIB}])
    assert doctor.assess(big)["verdict"] == "untested"
    small = dict(big, nvidia_gpus=[{"name": "RTX", "memory_bytes": 8 * GIB}])
    assert doctor.assess(small)["verdict"] == "blocked"


def test_low_disk_blocks():
    a = doctor.assess(facts(disk={"free_bytes": 5 * 10**9}))
    assert a["verdict"] == "blocked"


def test_missing_tools_give_install_hints():
    a = doctor.assess(facts(tools={"git": "2.50", "uv": None, "python": "3.12"}))
    assert a["tools_missing"] == ["uv"] and any("astral.sh" in n for n in a["next"])


def test_cli_json_runs(tmp_path):
    r = subprocess.run([sys.executable, str(SCRIPTS / "doctor.py"), "--work", str(tmp_path / "w"), "--json"],
                       capture_output=True, text=True)
    assert r.returncode in (0, 2), r.stderr
    data = json.loads(r.stdout)
    assert data["assessment"]["verdict"] in ("ready", "untested", "tight", "blocked")
