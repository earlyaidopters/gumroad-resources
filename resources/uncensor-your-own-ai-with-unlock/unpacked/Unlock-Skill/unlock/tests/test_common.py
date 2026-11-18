import json

import pytest

import unlock_common as uc
from conftest import make_model, write_safetensors


def test_hash_safetensors_tracks_each_tensor(tmp_path):
    a, b = tmp_path / "a.safetensors", tmp_path / "b.safetensors"
    write_safetensors(a, {"x": b"\x01\x00" * 4, "y": b"\x02\x00" * 4})
    write_safetensors(b, {"x": b"\x01\x00" * 4, "y": b"\x02\x01" * 4})
    fa, ta = uc.hash_safetensors(a)
    fb, tb = uc.hash_safetensors(b)
    assert fa == uc.sha256_file(a) and fb == uc.sha256_file(b)
    assert ta["x"]["sha256"] == tb["x"]["sha256"]
    assert ta["y"]["sha256"] != tb["y"]["sha256"]


def test_weight_files_sharded_and_single(tmp_path):
    sharded = make_model(tmp_path / "s", sharded=True)
    single = make_model(tmp_path / "o", sharded=False)
    assert len(uc.weight_files(sharded)) == 2
    assert [f.name for f in uc.weight_files(single)] == ["model.safetensors"]


def test_weight_files_rejects_bad_folders(tmp_path):
    with pytest.raises(ValueError):
        uc.weight_files(tmp_path / "missing")
    empty = tmp_path / "empty"
    empty.mkdir()
    with pytest.raises(ValueError, match="No safetensors"):
        uc.weight_files(empty)
    bad = make_model(tmp_path / "bad")
    (bad / "model.safetensors.index.json").write_text(json.dumps({"weight_map": {"t": "../escape.safetensors"}}))
    with pytest.raises(ValueError, match="Invalid shard path"):
        uc.weight_files(bad)


def test_hash_model_dir_counts_all_tensors(fake_model):
    data = uc.hash_model_dir(fake_model)
    assert len(data["tensors"]) == 4
    assert "config.json" in data["files"]


def test_refusal_heuristic():
    assert uc.looks_like_refusal("I’m sorry, but I can’t assist with that request.")
    assert uc.looks_like_refusal("I cannot provide the information you're requesting.")
    assert not uc.looks_like_refusal("The Prague Spring of 1968 was a period of reform.")


def test_load_cases_validation(tmp_path):
    good = tmp_path / "good.json"
    good.write_text(json.dumps({"phase": "p", "fixtures": [{"id": "a", "prompt": "hi"}]}))
    assert uc.load_cases(good)["fixtures"][0]["id"] == "a"
    for spec, msg in [({"fixtures": []}, "phase"),
                      ({"phase": "p", "fixtures": [{"prompt": "x"}]}, "id"),
                      ({"phase": "p", "fixtures": [{"id": "a"}]}, "prompt"),
                      ({"phase": "p", "fixtures": [{"id": "a", "prompt": "x"}, {"id": "a", "prompt": "y"}]}, "duplicate"),
                      ({"phase": "p", "fixtures": [{"id": "a", "messages": [{"role": "bot", "content": "x"}]}]}, "malformed")]:
        f = tmp_path / "bad.json"
        f.write_text(json.dumps(spec))
        with pytest.raises(ValueError, match=msg):
            uc.load_cases(f)


def test_write_json_new_never_overwrites(tmp_path):
    f = tmp_path / "e.json"
    uc.write_json_new(f, {"a": 1})
    with pytest.raises(FileExistsError):
        uc.write_json_new(f, {"a": 2})
    assert json.loads(f.read_text()) == {"a": 1}
