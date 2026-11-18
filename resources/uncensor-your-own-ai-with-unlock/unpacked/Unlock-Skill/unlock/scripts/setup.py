"""Install everything the Unlock recipe needs into one work folder. Safe to run twice.

    python3 scripts/setup.py                    # uses ~/unlock-work
    python3 scripts/setup.py --work /some/dir   # or a folder you choose

Steps, each skipped when it is already done:
  1. Clone Heretic and check out the pinned commit.
  2. Make an isolated Python environment with uv and install Heretic into it.
  3. Check that PyTorch loads and which graphics hardware it can see.
  4. Download the model at the pinned revision into the Hugging Face cache.
  5. Write unlock-setup.json so run.py knows where everything is.

It never deletes or overwrites anything it did not create, and it never
touches a model you already have.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import unlock_common as uc  # noqa: E402


class SetupError(Exception):
    pass


def say(step: str, text: str) -> None:
    print(f"[{step}] {text}", flush=True)


def run(cmd, cwd=None, capture=False, env=None):
    printable = " ".join(str(c) for c in cmd)
    try:
        out = subprocess.run([str(c) for c in cmd], cwd=cwd, env=env, text=True,
                             capture_output=capture, check=False)
    except OSError as e:
        raise SetupError(f"Could not run {printable}: {e}")
    if out.returncode != 0:
        detail = (out.stderr or out.stdout or "").strip()[-2000:] if capture else ""
        raise SetupError(f"Command failed ({out.returncode}): {printable}\n{detail}".rstrip())
    return out.stdout.strip() if capture else ""


def git_head(repo: Path):
    return run(["git", "-C", repo, "rev-parse", "HEAD"], capture=True)


def git_dirty(repo: Path) -> bool:
    return bool(run(["git", "-C", repo, "status", "--porcelain"], capture=True))


def step_heretic(work: Path, update: bool) -> dict:
    repo = work / "heretic"
    if not repo.exists():
        say("heretic", f"Cloning {uc.HERETIC_URL}")
        run(["git", "clone", "--quiet", uc.HERETIC_URL, repo])
        run(["git", "-C", repo, "-c", "advice.detachedHead=false", "checkout", "--quiet", uc.HERETIC_COMMIT])
        action = "cloned"
    elif not (repo / ".git").exists():
        raise SetupError(f"{repo} exists but is not a git checkout. Use a new --work folder.")
    else:
        action = "reused"
        head = git_head(repo)
        if head != uc.HERETIC_COMMIT:
            if not update:
                raise SetupError(
                    f"{repo} is at commit {head[:12]}, not the pinned {uc.HERETIC_COMMIT[:12]}. "
                    "Use a new --work folder, or pass --update-heretic to move it.")
            if git_dirty(repo):
                raise SetupError(f"{repo} has local changes. Refusing to move it.")
            run(["git", "-C", repo, "fetch", "--quiet", "origin"])
            run(["git", "-C", repo, "-c", "advice.detachedHead=false", "checkout", "--quiet", uc.HERETIC_COMMIT])
            action = "moved to the pinned commit"
    head = git_head(repo)
    if head != uc.HERETIC_COMMIT:
        raise SetupError(f"Heretic is at {head}, expected {uc.HERETIC_COMMIT}.")
    dirty = git_dirty(repo)
    say("heretic", f"{action}, at {head[:12]}{' (has local changes)' if dirty else ''}")
    return {"path": str(repo), "commit": head, "clean": not dirty, "action": action}


def step_env(work: Path, uv: str, heretic_dir: Path) -> dict:
    python = uc.venv_bin(work, "python")
    actions = []
    if not python.exists():
        say("python", f"Creating an isolated Python {uc.PYTHON_VERSION} environment with uv")
        run([uv, "venv", "--quiet", "--python", uc.PYTHON_VERSION, work / ".venv"])
        actions.append("created")
    probe = [python, "-c", "import heretic, huggingface_hub, torch, transformers"]
    installed = subprocess.run([str(c) for c in probe], capture_output=True).returncode == 0
    heretic_exe = uc.venv_bin(work, "heretic")
    if not installed or not heretic_exe.exists():
        say("python", "Installing Heretic and its dependencies (PyTorch is large, this can take a while)")
        # Installing from inside the checkout avoids a path-parsing failure seen with spaces in paths.
        run([uv, "pip", "install", "--python", python, "-e", "."], cwd=heretic_dir)
        actions.append("installed Heretic")
    else:
        actions.append("reused")
    if not heretic_exe.exists():
        raise SetupError("Heretic installed but its command is missing from the environment.")
    freeze = run([uv, "pip", "freeze", "--python", python], capture=True)
    (work / "environment.txt").write_text(freeze + "\n", encoding="utf-8")
    say("python", ", ".join(actions) + f". Package list saved to {work / 'environment.txt'}")
    return {"python": str(python), "heretic": str(heretic_exe), "action": ", ".join(actions)}


def step_torch(python: str) -> dict:
    probe = ("import json, platform, torch, transformers;"
             "print(json.dumps({'python': platform.python_version(), 'torch': torch.__version__,"
             "'transformers': transformers.__version__, 'cuda': torch.cuda.is_available(),"
             "'mps': torch.backends.mps.is_available()}))")
    info = json.loads(run([python, "-c", probe], capture=True).splitlines()[-1])
    device = "mps" if info["mps"] else "cuda" if info["cuda"] else "cpu"
    info["device"] = device
    say("torch", f"PyTorch {info['torch']} sees {'the Apple GPU' if device == 'mps' else 'an NVIDIA card' if device == 'cuda' else 'no GPU, processor only'}")
    return info


def step_model(python: str, model_id: str, revision: str, download: bool) -> dict:
    cached = uc.cached_snapshot(model_id, revision)
    if cached:
        say("model", f"{model_id} already downloaded at {cached}")
        return {"id": model_id, "revision": revision, "path": str(cached), "action": "reused"}
    if not download:
        raise SetupError(f"{model_id} is not downloaded and --no-download was given.")
    say("model", f"Downloading {model_id} at revision {revision[:12]} (about 8 GB)")
    code = ("import sys; from huggingface_hub import snapshot_download;"
            "print(snapshot_download(repo_id=sys.argv[1], revision=sys.argv[2]))")
    subprocess_env = dict(os.environ)
    out = subprocess.run([python, "-c", code, model_id, revision], text=True,
                         stdout=subprocess.PIPE, env=subprocess_env)
    if out.returncode != 0:
        raise SetupError("Model download failed. Check your connection and run setup.py again; "
                         "finished files are kept and reused.")
    path = Path(out.stdout.strip().splitlines()[-1])
    try:
        uc.weight_files(path)
    except ValueError as e:
        raise SetupError(f"Downloaded model is incomplete: {e}")
    say("model", f"Downloaded to {path}")
    return {"id": model_id, "revision": revision, "path": str(path), "action": "downloaded"}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--work", type=Path, default=uc.DEFAULT_WORK)
    p.add_argument("--model-id", default=uc.MODEL_ID)
    p.add_argument("--revision", default=uc.MODEL_REVISION)
    p.add_argument("--no-download", action="store_true", help="Fail instead of downloading the model")
    p.add_argument("--update-heretic", action="store_true",
                   help="Move an existing clean Heretic checkout to the pinned commit")
    args = p.parse_args(argv)
    work = args.work.expanduser().absolute()
    try:
        missing = [t for t in ("git", "uv") if not shutil.which(t)]
        if missing:
            raise SetupError("Missing " + " and ".join(missing) + ". Run scripts/doctor.py for install hints.")
        uv = shutil.which("uv")
        work.mkdir(parents=True, exist_ok=True)
        say("work", f"Using {work}")
        if args.model_id != uc.MODEL_ID:
            say("model", f"Note: the included recipes were only tested on {uc.MODEL_ID}.")
        heretic = step_heretic(work, args.update_heretic)
        env = step_env(work, uv, Path(heretic["path"]))
        torch_info = step_torch(env["python"])
        model = step_model(env["python"], args.model_id, args.revision, not args.no_download)
    except SetupError as e:
        print(f"\nSetup stopped: {e}", file=sys.stderr)
        return 1
    record = {"setup_at": uc.now(), "work": str(work), "skill": str(uc.SKILL_DIR),
              "heretic": heretic, "env": env, "torch": torch_info, "model": model}
    uc.write_json(work / uc.SETUP_FILE, record)
    print(f"\nSetup complete. Record saved to {work / uc.SETUP_FILE}")
    print(f"Next: python3 {uc.SKILL_DIR / 'scripts' / 'run.py'} start --work {work}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
