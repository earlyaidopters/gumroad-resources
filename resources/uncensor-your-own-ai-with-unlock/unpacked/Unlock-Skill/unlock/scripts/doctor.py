"""Check whether this computer can run the Unlock history recipe, in plain words.

Standard library only. Safe to run before anything is installed. It reads your
machine and prints a verdict; it never installs, downloads or changes anything.

    python3 scripts/doctor.py            # readable verdict
    python3 scripts/doctor.py --json     # the same facts for an assistant
"""
from __future__ import annotations

import argparse
import json
import platform
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import unlock_common as uc  # noqa: E402

# Measured on the tested machine (see docs/evidence). Everything else is an estimate.
WEIGHTS_BYTES = 8_044_982_000           # Qwen3-4B-Instruct-2507, BF16, three shards
GIB = 1024**3
PEAK_MEMORY_BYTES = 15 * GIB            # Measured 13.9 GB peak footprint (18 Nov 2026), rounded up
PEAK_TEXT = "13.9 GB"
SYSTEM_RESERVE_BYTES = 6 * GIB          # Room for the operating system and open apps
ENV_BYTES = 3 * uc.GB                   # Python environment plus package cache
TESTED = "Apple M5 Max, 128 GB, macOS, mps (16 and 18 November 2026)"


def run(cmd, timeout=20):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return out.stdout.strip() if out.returncode == 0 else None
    except (OSError, subprocess.SubprocessError):
        return None


def total_memory():
    system = platform.system()
    if system == "Darwin":
        v = run(["sysctl", "-n", "hw.memsize"])
        return int(v) if v and v.isdigit() else None
    if system == "Linux":
        try:
            for line in Path("/proc/meminfo").read_text().splitlines():
                if line.startswith("MemTotal:"):
                    return int(line.split()[1]) * 1024
        except OSError:
            return None
    if system == "Windows":
        try:
            import ctypes

            class Status(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                            ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
            s = Status()
            s.dwLength = ctypes.sizeof(Status)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s))
            return int(s.ullTotalPhys)
        except Exception:
            return None
    return None


def chip_name():
    system = platform.system()
    if system == "Darwin":
        return run(["sysctl", "-n", "machdep.cpu.brand_string"]) or platform.machine()
    if system == "Linux":
        try:
            for line in Path("/proc/cpuinfo").read_text().splitlines():
                if line.lower().startswith("model name"):
                    return line.split(":", 1)[1].strip()
        except OSError:
            pass
    return platform.processor() or platform.machine()


def nvidia_gpus():
    if not shutil.which("nvidia-smi"):
        return []
    out = run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])
    gpus = []
    for line in (out or "").splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) == 2 and parts[1].isdigit():
            gpus.append({"name": parts[0], "memory_bytes": int(parts[1]) * 1024**2})
    return gpus


def tool_version(name, args=("--version",)):
    path = shutil.which(name)
    if not path:
        return None
    out = run([path, *args]) or ""
    m = re.search(r"\d+\.\d+(?:\.\d+)?", out)
    return m.group(0) if m else "installed"


def existing_parent(p: Path) -> Path:
    p = p.expanduser().absolute()
    while not p.exists():
        p = p.parent
    return p


def setup_state(work: Path):
    state = {"setup_file": None, "heretic_commit": None, "venv_python": None, "torch": None}
    record = work / uc.SETUP_FILE
    if record.is_file():
        try:
            state["setup_file"] = uc.read_json(record)
        except (OSError, ValueError):
            pass
    heretic = work / "heretic"
    if (heretic / ".git").exists():
        state["heretic_commit"] = run(["git", "-C", str(heretic), "rev-parse", "HEAD"])
    py = uc.venv_bin(work, "python")
    if py.exists():
        state["venv_python"] = str(py)
        probe = ("import json,torch;print(json.dumps({'torch':torch.__version__,"
                 "'cuda':torch.cuda.is_available(),'mps':torch.backends.mps.is_available()}))")
        out = run([str(py), "-c", probe], timeout=120)
        if out:
            try:
                state["torch"] = json.loads(out.splitlines()[-1])
            except ValueError:
                pass
    return state


def gather(work: Path) -> dict:
    system = platform.system()
    mac = platform.mac_ver()[0] if system == "Darwin" else None
    gpus = nvidia_gpus()
    if system == "Darwin" and platform.machine() == "arm64":
        device = "mps"
    elif gpus:
        device = "cuda"
    else:
        device = "cpu"
    snapshot = uc.cached_snapshot()
    disk_root = existing_parent(work)
    return {
        "os": {"system": system, "release": mac or platform.release(), "machine": platform.machine()},
        "chip": chip_name(),
        "memory_bytes": total_memory(),
        "nvidia_gpus": gpus,
        "device": device,
        "disk": {"checked_at": str(disk_root), "free_bytes": shutil.disk_usage(disk_root).free},
        "tools": {"git": tool_version("git"), "uv": tool_version("uv"),
                  "python": platform.python_version()},
        "work": str(work.expanduser().absolute()),
        "model": {"id": uc.MODEL_ID, "revision": uc.MODEL_REVISION,
                  "cached_at": str(snapshot) if snapshot else None},
        "setup": setup_state(work.expanduser()),
    }


def assess(f: dict) -> dict:
    """Turn facts into a verdict. Pure function so it can be tested."""
    reasons, actions = [], []
    verdict = "ready"
    order = ["ready", "untested", "tight", "blocked"]

    def worse(v):
        nonlocal verdict
        if order.index(v) > order.index(verdict):
            verdict = v

    device, system = f["device"], f["os"]["system"]
    mem = f.get("memory_bytes")
    need_mem = PEAK_MEMORY_BYTES + SYSTEM_RESERVE_BYTES
    tested = device == "mps" and system == "Darwin"

    if device == "mps":
        if mem is None:
            worse("untested")
            reasons.append("Could not read how much memory this Mac has.")
        elif mem < PEAK_MEMORY_BYTES:
            worse("blocked")
            reasons.append(f"This Mac has {uc.mem_gb(mem)} of memory. The edit peaked at "
                           f"{PEAK_TEXT} on the tested machine.")
        elif mem < need_mem:
            worse("tight")
            reasons.append(f"{uc.mem_gb(mem)} of memory is enough for the edit's measured peak of "
                           f"{PEAK_TEXT} but leaves little for anything else. "
                           "Close other apps first.")
        else:
            reasons.append(f"{uc.mem_gb(mem)} of memory covers the edit's measured peak of "
                           f"{PEAK_TEXT} with room to spare.")
        if mem is not None and mem < 100 * GIB:
            worse("untested")
            reasons.append("Only a 128 GB Mac has been tested so far. A smaller Mac should behave "
                           "the same if the memory fits, but there is no receipt for it yet.")
    elif device == "cuda":
        worse("untested")
        vram = max(g["memory_bytes"] for g in f["nvidia_gpus"])
        if vram < WEIGHTS_BYTES + 2 * uc.GB:
            worse("blocked")
            reasons.append(f"Your largest NVIDIA card has {uc.mem_gb(vram)}. The model alone is "
                           f"{uc.gb(WEIGHTS_BYTES)}. Heretic has a 4-bit mode that could help, "
                           "but this skill has not tested it.")
        else:
            reasons.append(f"Your NVIDIA card has {uc.mem_gb(vram)}, which should hold the "
                           f"{uc.gb(WEIGHTS_BYTES)} model. NVIDIA runs of this recipe are untested.")
        if mem is not None and mem < WEIGHTS_BYTES + SYSTEM_RESERVE_BYTES:
            worse("tight")
            reasons.append(f"System memory is {uc.mem_gb(mem)}, which is low for loading the model.")
    else:
        worse("untested")
        reasons.append("No Apple GPU or NVIDIA card found, so this would run on the processor. "
                       "Expect it to be very slow. CPU runs are untested.")
        if mem is not None and mem < need_mem:
            worse("blocked" if mem < PEAK_MEMORY_BYTES else "tight")
            reasons.append(f"This computer has {uc.mem_gb(mem)} of memory; about "
                           f"{uc.mem_gb(need_mem)} is comfortable.")
    if system == "Windows":
        worse("untested")
        reasons.append("Windows is untested. WSL2 is the most likely route.")

    disk_need = WEIGHTS_BYTES + uc.HEADROOM_BYTES  # the saved copy plus headroom
    if not f["model"]["cached_at"]:
        disk_need += WEIGHTS_BYTES
    if not f["setup"]["venv_python"]:
        disk_need += ENV_BYTES
    free = f["disk"]["free_bytes"]
    if free < disk_need:
        worse("blocked")
        reasons.append(f"Only {uc.gb(free)} free on disk. This run needs about {uc.gb(disk_need)}.")
    else:
        reasons.append(f"{uc.gb(free)} free on disk. This run needs about {uc.gb(disk_need)}.")

    missing = [t for t in ("git", "uv") if not f["tools"][t]]
    if missing:
        hints = {"git": "Install git from https://git-scm.com/downloads",
                 "uv": "Install uv with: curl -LsSf https://astral.sh/uv/install.sh | sh"}
        actions += [hints[t] for t in missing]
        reasons.append("Missing tools: " + ", ".join(missing) + ".")
    s = f["setup"]
    if s["setup_file"] and s["heretic_commit"] == uc.HERETIC_COMMIT and s["venv_python"]:
        if not missing:
            actions.append("Setup is done. Start a run with scripts/run.py start")
    elif not missing:
        actions.append("Run scripts/setup.py to install Heretic and download the model")
    if s["heretic_commit"] and s["heretic_commit"] != uc.HERETIC_COMMIT:
        worse("tight")
        reasons.append("The Heretic folder in this work directory is at a different commit. "
                       "Use a new --work folder or pass --update-heretic to setup.py.")
    torch_info = s.get("torch") or {}
    if torch_info and device == "mps" and not torch_info.get("mps"):
        worse("tight")
        reasons.append("PyTorch in the Unlock environment cannot see the Apple GPU.")
    if torch_info and device == "cuda" and not torch_info.get("cuda"):
        worse("tight")
        reasons.append("PyTorch in the Unlock environment cannot see the NVIDIA card. "
                       "It may need a CUDA build of torch.")

    headline = {
        "ready": "This computer matches the tested setup.",
        "untested": "Should work, but this exact setup has not been tested yet.",
        "tight": "Possible, with caveats. Read the notes below first.",
        "blocked": "Not enough room for the included recipe on this computer.",
    }[verdict]
    return {"verdict": verdict, "headline": headline, "device": device,
            "tested_setup": tested and verdict == "ready", "tested_on": TESTED,
            "reasons": reasons, "next": actions, "tools_missing": missing}


def show(f: dict, a: dict) -> None:
    mem = uc.mem_gb(f["memory_bytes"])
    os_name = {"Darwin": "macOS"}.get(f["os"]["system"], f["os"]["system"])
    graphics = {"mps": "Apple GPU through Metal (mps)", "cpu": "None found, processor only (cpu)"}
    g = graphics.get(a["device"]) or ", ".join(
        f"{x['name']} {uc.mem_gb(x['memory_bytes'])}" for x in f["nvidia_gpus"]) + " (cuda)"
    tools = ", ".join(f"{k} {v or 'missing'}" for k, v in f["tools"].items())
    s = f["setup"]
    heretic = ("installed at the pinned commit" if s["heretic_commit"] == uc.HERETIC_COMMIT
               else "not set up yet" if not s["heretic_commit"] else "different commit")
    model = (f"{uc.MODEL_ID} already downloaded" if f["model"]["cached_at"]
             else f"{uc.MODEL_ID} not downloaded yet ({uc.gb(WEIGHTS_BYTES)})")
    rows = [("Computer", f"{f['chip']}, {os_name} {f['os']['release']}, {mem} memory"),
            ("Graphics", g), ("Disk", f"{uc.gb(f['disk']['free_bytes'])} free near {f['work']}"),
            ("Tools", tools), ("Heretic", heretic), ("Model", model)]
    print("\nUnlock doctor\n")
    for k, v in rows:
        print(f"  {k:<9} {v}")
    print(f"\nVerdict: {a['verdict'].upper()}. {a['headline']}")
    for r in a["reasons"]:
        print(f"  - {r}")
    if a["next"]:
        print("\nNext:")
        for n in a["next"]:
            print(f"  - {n}")
    print(f"\nTested so far: {TESTED}\n")


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--work", type=Path, default=uc.DEFAULT_WORK,
                   help=f"Folder setup.py uses for Heretic and runs (default {uc.DEFAULT_WORK})")
    p.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    args = p.parse_args(argv)
    facts = gather(args.work)
    verdict = assess(facts)
    if args.json:
        print(json.dumps({"facts": facts, "assessment": verdict}, indent=2))
    else:
        show(facts, verdict)
    return 2 if verdict["verdict"] == "blocked" else 0


if __name__ == "__main__":
    sys.exit(main())
