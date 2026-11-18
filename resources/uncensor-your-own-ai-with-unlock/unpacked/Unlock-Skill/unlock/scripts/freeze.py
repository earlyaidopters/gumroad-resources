"""Fingerprint model folders and show exactly what an edit changed.

    freeze.py hash --model DIR --out hashes.json
        SHA-256 of every file, plus one SHA-256 per tensor inside the
        safetensors files. Reads in one pass. Never overwrites --out.

    freeze.py diff --original A.json --edited B.json --out diff.json
                   [--original-dir DIR --edited-dir DIR]
        Compares two fingerprints tensor by tensor. With the folders given and
        PyTorch plus safetensors installed, it also measures how much each
        changed tensor moved.

    freeze.py same --before A.json --after B.json
        Exit 0 when two fingerprints of the same folder match exactly.

Standard library only, except the optional measurements in diff.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import unlock_common as uc  # noqa: E402


def cmd_hash(args) -> int:
    data = uc.hash_model_dir(args.model)
    uc.write_json_new(args.out, data)
    print(f"Hashed {len(data['files'])} files and {len(data['tensors'])} tensors in {args.model}")
    return 0


def component(name: str) -> str:
    """model.layers.20.self_attn.o_proj.weight -> self_attn.o_proj"""
    m = re.match(r".*?layers\.\d+\.(.+?)(?:\.weight|\.bias)?$", name)
    return m.group(1) if m else name


def layer_of(name: str):
    m = re.search(r"layers\.(\d+)\.", name)
    return int(m.group(1)) if m else None


def measure(original_dir: Path, edited_dir: Path, a: dict, b: dict, names: list) -> dict:
    try:
        import torch  # noqa: F401  (safe_open(framework="pt") needs it)
        from safetensors import safe_open
    except ImportError:
        return {}
    stats, handles = {}, {}

    def tensor(folder, table, name):
        path = Path(folder) / table[name]["file"]
        if path not in handles:
            handles[path] = safe_open(str(path), framework="pt")
        return handles[path].get_tensor(name)

    for name in names:
        x = tensor(original_dir, a, name).float()
        y = tensor(edited_dir, b, name).float()
        if x.shape != y.shape:
            continue
        d = y - x
        norm = x.norm().item()
        stats[name] = {
            "fraction_of_numbers_changed": (x != y).float().mean().item(),
            "largest_single_change": d.abs().max().item(),
            "relative_change": (d.norm().item() / norm) if norm else None,
        }
    return stats


def cmd_diff(args) -> int:
    a, b = uc.read_json(args.original), uc.read_json(args.edited)
    ta, tb = a["tensors"], b["tensors"]
    shared = sorted(set(ta) & set(tb))
    changed = [n for n in shared if ta[n]["sha256"] != tb[n]["sha256"]]
    reshaped = [n for n in changed if ta[n].get("shape") != tb[n].get("shape")
                or ta[n].get("dtype") != tb[n].get("dtype")]
    by_component = {}
    for n in changed:
        by_component.setdefault(component(n), []).append(n)
    layers = sorted({layer_of(n) for n in changed if layer_of(n) is not None})
    stats = {}
    if args.original_dir and args.edited_dir and changed:
        stats = measure(args.original_dir, args.edited_dir, ta, tb, changed)
    representative = None
    if stats:
        representative = max(stats, key=lambda n: stats[n]["relative_change"] or 0)
    report = {
        "compared_at": uc.now(),
        "original": a["directory"], "edited": b["directory"],
        "tensor_count": len(set(ta) | set(tb)),
        "changed_count": len(changed),
        "unchanged_count": len(shared) - len(changed),
        "only_in_original": sorted(set(ta) - set(tb)),
        "only_in_edited": sorted(set(tb) - set(ta)),
        "shape_or_dtype_changed": reshaped,
        "changed_by_component": {k: len(v) for k, v in sorted(by_component.items())},
        "layers_changed": layers,
        "changed_tensors": changed,
        "largest_change_tensor": representative,
        "measurements": stats,
        "measured": bool(stats),
    }
    uc.write_json_new(args.out, report)
    print(f"{len(changed)} of {report['tensor_count']} tensors changed"
          + (f", across layers {layers[0]} to {layers[-1]}" if layers else ""))
    for k, v in report["changed_by_component"].items():
        print(f"  {k}: {v}")
    return 0


def cmd_same(args) -> int:
    a, b = uc.read_json(args.before), uc.read_json(args.after)
    fa = {k: v["sha256"] for k, v in a["files"].items()}
    fb = {k: v["sha256"] for k, v in b["files"].items()}
    if fa == fb:
        print(f"Identical: {len(fa)} files match.")
        return 0
    for k in sorted(set(fa) | set(fb)):
        if fa.get(k) != fb.get(k):
            print(f"Differs: {k}")
    return 1


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hash")
    h.add_argument("--model", type=Path, required=True)
    h.add_argument("--out", type=Path, required=True)
    d = sub.add_parser("diff")
    d.add_argument("--original", type=Path, required=True)
    d.add_argument("--edited", type=Path, required=True)
    d.add_argument("--out", type=Path, required=True)
    d.add_argument("--original-dir", type=Path)
    d.add_argument("--edited-dir", type=Path)
    s = sub.add_parser("same")
    s.add_argument("--before", type=Path, required=True)
    s.add_argument("--after", type=Path, required=True)
    args = p.parse_args(argv)
    try:
        return {"hash": cmd_hash, "diff": cmd_diff, "same": cmd_same}[args.cmd](args)
    except FileExistsError as e:
        print(f"Refusing to overwrite existing evidence: {e.filename}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Stopped: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
