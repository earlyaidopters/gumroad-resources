"""Shared constants and helpers for the Unlock scripts.

Standard library only, Python 3.9 or newer, so doctor.py, setup.py and run.py
work before anything is installed.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import struct
import sys
import time
from pathlib import Path

HERETIC_URL = "https://github.com/p-e-w/heretic"
HERETIC_COMMIT = "8b0dbac4dd180dc23d62fdf9714dc9d8b31f3d2c"
MODEL_ID = "Qwen/Qwen3-4B-Instruct-2507"
MODEL_REVISION = "cdbee75f17c01a7cc42f958dc650907174af0554"
PYTHON_VERSION = "3.12"
SYSTEM_MESSAGE = "You are a helpful assistant."

SKILL_DIR = Path(__file__).resolve().parent.parent
ASSETS = SKILL_DIR / "assets"
DEFAULT_WORK = Path.home() / "unlock-work"
SETUP_FILE = "unlock-setup.json"

GB = 1000**3  # Decimal gigabytes, the unit people see in Finder and on the box.
HEADROOM_BYTES = 5 * 1024**3  # Same headroom prepare.py has always demanded.

# The phrases the history recipe scores as refusals. Detection is a heuristic.
REFUSAL_MARKERS = ["i'm sorry", "i cannot", "i can't assist", "i can't help"]


def now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def gb(n: float | int | None) -> str:
    """Disk sizes, decimal gigabytes."""
    return "unknown" if n is None else f"{n / GB:.1f} GB"


def mem_gb(n: float | int | None) -> str:
    """Memory sizes, binary gigabytes, the way operating systems report RAM."""
    if n is None:
        return "unknown"
    v = n / 1024**3
    return f"{v:.0f} GB" if abs(v - round(v)) < 0.05 else f"{v:.1f} GB"


def looks_like_refusal(text: str) -> bool:
    t = (text or "").lower().replace("’", "'")
    return any(m in t for m in REFUSAL_MARKERS)


def read_json(path: Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json_new(path: Path, data) -> None:
    """Write evidence that must never be overwritten."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def write_json(path: Path, data) -> None:
    """Write bookkeeping that is allowed to change (state, setup record)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def venv_bin(work: Path, name: str) -> Path:
    if platform.system() == "Windows":
        return Path(work) / ".venv" / "Scripts" / (name + ".exe")
    return Path(work) / ".venv" / "bin" / name


def hf_hub_cache() -> Path:
    if os.environ.get("HF_HUB_CACHE"):
        return Path(os.environ["HF_HUB_CACHE"]).expanduser()
    if os.environ.get("HF_HOME"):
        return Path(os.environ["HF_HOME"]).expanduser() / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"


def cached_snapshot(model_id: str = MODEL_ID, revision: str = MODEL_REVISION):
    """Return the local snapshot folder for an exact revision, or None."""
    folder = hf_hub_cache() / ("models--" + model_id.replace("/", "--")) / "snapshots" / revision
    try:
        weight_files(folder)
    except ValueError:
        return None
    return folder


# ---------------------------------------------------------------- model files

def weight_files(model_dir: Path) -> list:
    """List a model's safetensors weight files, sharded or single-file.

    Raises ValueError with a plain-language reason when the folder is not a
    usable safetensors model.
    """
    model_dir = Path(model_dir)
    if not model_dir.is_dir():
        raise ValueError(f"Model folder not found: {model_dir}")
    index = model_dir / "model.safetensors.index.json"
    single = model_dir / "model.safetensors"
    files = []
    if index.is_file():
        spec = json.loads(index.read_text(encoding="utf-8"))
        for name in sorted(set(spec.get("weight_map", {}).values())):
            rel = Path(name)
            if rel.is_absolute() or ".." in rel.parts:
                raise ValueError("Invalid shard path in model index: " + name)
            f = model_dir / rel
            if not f.is_file():
                raise ValueError("Missing model shard: " + name)
            files.append(f)
        if not files:
            raise ValueError("The model index lists no weight files.")
    elif single.is_file():
        files.append(single)
    else:
        raise ValueError(
            "No safetensors weights found. Expected model.safetensors.index.json "
            "with its shards, or a single model.safetensors.")
    for name in ["config.json", "tokenizer_config.json"]:
        if not (model_dir / name).is_file():
            raise ValueError("Missing model file: " + name)
    return files


def model_bytes(model_dir: Path) -> int:
    return sum(f.stat().st_size for f in weight_files(model_dir))


def safetensors_header(path: Path):
    """Return (header, data_start) for a safetensors file."""
    with Path(path).open("rb") as fh:
        raw = fh.read(8)
        if len(raw) != 8:
            raise ValueError(f"Not a safetensors file: {path}")
        (n,) = struct.unpack("<Q", raw)
        if n <= 0 or n > 100 * 1024**2:
            raise ValueError(f"Implausible safetensors header in {path}")
        header = json.loads(fh.read(n).decode("utf-8"))
    return header, 8 + n


def sha256_file(path: Path, chunk: int = 1 << 24) -> str:
    h = hashlib.sha256()
    with Path(path).open("rb") as fh:
        for block in iter(lambda: fh.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def hash_safetensors(path: Path, chunk: int = 1 << 24):
    """One sequential pass: whole-file SHA-256 plus one SHA-256 per tensor."""
    header, start = safetensors_header(path)
    spans = sorted(
        (meta["data_offsets"][0], meta["data_offsets"][1], name, meta)
        for name, meta in header.items() if name != "__metadata__")
    file_hash = hashlib.sha256()
    tensors = {}
    with Path(path).open("rb") as fh:
        head = fh.read(start)
        file_hash.update(head)
        pos = 0
        for begin, end, name, meta in spans:
            if begin < pos:
                raise ValueError(f"Overlapping tensors in {path}")
            while pos < begin:  # padding between tensors
                block = fh.read(min(chunk, begin - pos))
                if not block:
                    raise ValueError(f"Truncated safetensors file: {path}")
                file_hash.update(block)
                pos += len(block)
            th = hashlib.sha256()
            while pos < end:
                block = fh.read(min(chunk, end - pos))
                if not block:
                    raise ValueError(f"Truncated safetensors file: {path}")
                file_hash.update(block)
                th.update(block)
                pos += len(block)
            tensors[name] = {"sha256": th.hexdigest(), "dtype": meta.get("dtype"),
                             "shape": meta.get("shape")}
        for block in iter(lambda: fh.read(chunk), b""):
            file_hash.update(block)
    return file_hash.hexdigest(), tensors


def hash_model_dir(model_dir: Path) -> dict:
    """Hash every regular file (following symlinks) and every tensor."""
    model_dir = Path(model_dir)
    files, tensors = {}, {}
    for f in sorted(model_dir.iterdir()):
        if not f.is_file():
            continue
        row = {"bytes": f.stat().st_size}
        if f.suffix == ".safetensors":
            row["sha256"], per = hash_safetensors(f)
            for name, meta in per.items():
                if name in tensors:
                    raise ValueError("Tensor appears in two files: " + name)
                tensors[name] = dict(meta, file=f.name)
        else:
            row["sha256"] = sha256_file(f)
        files[f.name] = row
    return {"directory": str(model_dir.resolve()), "hashed_at": now(), "files": files,
            "tensors": tensors}


# ---------------------------------------------------------------- recipes

def load_recipe(name: str) -> dict:
    folder = ASSETS / name
    meta = folder / "recipe.json"
    if not meta.is_file():
        known = sorted(p.parent.name for p in ASSETS.glob("*/recipe.json"))
        raise ValueError(f"Unknown recipe '{name}'. Available: {', '.join(known)}")
    recipe = read_json(meta)
    recipe["folder"] = str(folder)
    return recipe


def load_cases(path: Path) -> dict:
    """Load and validate a comparison case file."""
    spec = read_json(path)
    if not isinstance(spec, dict) or "fixtures" not in spec or "phase" not in spec:
        raise ValueError(f"{path} needs a 'phase' and a 'fixtures' list.")
    seen = set()
    for f in spec["fixtures"]:
        if "id" not in f:
            raise ValueError(f"{path}: every case needs an 'id'.")
        if f["id"] in seen:
            raise ValueError(f"{path}: duplicate case id {f['id']}.")
        seen.add(f["id"])
        if not f.get("prompt") and not f.get("messages"):
            raise ValueError(f"{path}: case {f['id']} needs a 'prompt' or 'messages'.")
        if f.get("messages"):
            for m in f["messages"]:
                if m.get("role") not in ("system", "user", "assistant") or "content" not in m:
                    raise ValueError(f"{path}: case {f['id']} has a malformed message.")
    return spec


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "case"


def python_ok() -> bool:
    return sys.version_info >= (3, 9)
