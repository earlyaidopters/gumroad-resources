import json
import subprocess
import sys

from conftest import SCRIPTS, make_model


def freeze(*args):
    return subprocess.run([sys.executable, str(SCRIPTS / "freeze.py"), *map(str, args)], capture_output=True, text=True)


def test_diff_finds_only_the_changed_tensor(tmp_path):
    a = make_model(tmp_path / "a")
    b = make_model(tmp_path / "b", tensors={
        "model.layers.0.self_attn.o_proj.weight": b"\x01\x00" * 8,
        "model.layers.0.mlp.down_proj.weight": b"\x02\x00" * 8,
        "model.layers.1.self_attn.o_proj.weight": b"\x03\x01" * 8,
        "model.embed_tokens.weight": b"\x04\x00" * 8,
    })
    assert freeze("hash", "--model", a, "--out", tmp_path / "a.json").returncode == 0
    assert freeze("hash", "--model", b, "--out", tmp_path / "b.json").returncode == 0
    r = freeze("diff", "--original", tmp_path / "a.json", "--edited", tmp_path / "b.json", "--out", tmp_path / "d.json")
    assert r.returncode == 0, r.stderr
    d = json.loads((tmp_path / "d.json").read_text())
    assert d["changed_tensors"] == ["model.layers.1.self_attn.o_proj.weight"]
    assert d["changed_by_component"] == {"self_attn.o_proj": 1}
    assert d["layers_changed"] == [1] and d["tensor_count"] == 4


def test_same_detects_change(tmp_path):
    a = make_model(tmp_path / "a")
    freeze("hash", "--model", a, "--out", tmp_path / "1.json")
    assert freeze("same", "--before", tmp_path / "1.json", "--after", tmp_path / "1.json").returncode == 0
    (a / "config.json").write_text('{"changed": true}')
    freeze("hash", "--model", a, "--out", tmp_path / "2.json")
    r = freeze("same", "--before", tmp_path / "1.json", "--after", tmp_path / "2.json")
    assert r.returncode == 1 and "config.json" in r.stdout


def test_hash_refuses_to_overwrite(tmp_path, fake_model):
    out = tmp_path / "h.json"
    assert freeze("hash", "--model", fake_model, "--out", out).returncode == 0
    r = freeze("hash", "--model", fake_model, "--out", out)
    assert r.returncode == 1 and "Refusing to overwrite" in r.stderr
