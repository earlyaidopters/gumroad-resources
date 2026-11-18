"""Shared helpers: tiny fake models built with the standard library only."""
import json
import struct
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))


def write_safetensors(path: Path, tensors: dict) -> None:
    """tensors: name -> raw bytes (stored as BF16 with a 1-D shape)."""
    header, offset, blobs = {}, 0, []
    for name, raw in tensors.items():
        header[name] = {"dtype": "BF16", "shape": [len(raw) // 2], "data_offsets": [offset, offset + len(raw)]}
        offset += len(raw)
        blobs.append(raw)
    head = json.dumps(header).encode()
    head += b" " * (-len(head) % 8)
    path.write_bytes(struct.pack("<Q", len(head)) + head + b"".join(blobs))


def make_model(folder: Path, tensors: dict = None, sharded: bool = True) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    tensors = tensors or {
        "model.layers.0.self_attn.o_proj.weight": b"\x01\x00" * 8,
        "model.layers.0.mlp.down_proj.weight": b"\x02\x00" * 8,
        "model.layers.1.self_attn.o_proj.weight": b"\x03\x00" * 8,
        "model.embed_tokens.weight": b"\x04\x00" * 8,
    }
    (folder / "config.json").write_text("{}")
    (folder / "tokenizer_config.json").write_text("{}")
    (folder / "tokenizer.json").write_text("{}")
    if sharded:
        names = list(tensors)
        half = len(names) // 2
        shards = {"model-00001-of-00002.safetensors": names[:half], "model-00002-of-00002.safetensors": names[half:]}
        weight_map = {}
        for shard, keys in shards.items():
            write_safetensors(folder / shard, {k: tensors[k] for k in keys})
            weight_map.update({k: shard for k in keys})
        (folder / "model.safetensors.index.json").write_text(json.dumps({"weight_map": weight_map}))
    else:
        write_safetensors(folder / "model.safetensors", tensors)
    return folder


@pytest.fixture
def fake_model(tmp_path):
    return make_model(tmp_path / "original")


@pytest.fixture
def fake_heretic(tmp_path):
    exe = tmp_path / "bin" / "heretic"
    exe.parent.mkdir()
    exe.write_text("#!/bin/sh\necho fake heretic\n")
    exe.chmod(0o755)
    return exe
