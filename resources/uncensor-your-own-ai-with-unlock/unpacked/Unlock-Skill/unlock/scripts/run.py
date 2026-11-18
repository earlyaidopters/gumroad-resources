"""Run the whole Unlock experiment with one command, and pick up where it stopped.

    python3 scripts/run.py start                      # history recipe, ~/unlock-work
    python3 scripts/run.py start --stop-after baseline  # only ask the original first
    python3 scripts/run.py resume --run RUN_FOLDER    # continue after a stop or crash
    python3 scripts/run.py add-cases --run RUN_FOLDER --cases my-cases.json
    python3 scripts/run.py status --run RUN_FOLDER

`start` does, in order, each stage saved before the next begins:

    doctor         check this computer can do it
    hash-original  fingerprint the original model
    baseline       ask the original the target question; stop if it already answers
    prepare        write the Heretic plan into the run folder
    edit           run Heretic; it tries candidates and saves the best as a new model
    check-copy     confirm the saved copy is a complete model folder
    freeze         fingerprint the copy and record what changed, before any new tests
    compare        ask both models the same questions with identical settings
    verify         fingerprint both again to prove neither moved
    report         write report.html and REPORT.md

Nothing is ever overwritten. A failed stage's partial files are moved into
the run's attempts/ folder before it is tried again. Run setup.py first.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import unlock_common as uc  # noqa: E402

SCRIPTS = Path(__file__).resolve().parent
STAGES = ["doctor", "hash-original", "baseline", "prepare", "edit", "check-copy",
          "freeze", "compare", "verify", "report"]
LABELS = {
    "doctor": "Check this computer",
    "hash-original": "Fingerprint the original",
    "baseline": "Ask the original first",
    "prepare": "Write the Heretic plan",
    "edit": "Edit a copy with Heretic",
    "check-copy": "Check the saved copy",
    "freeze": "Freeze the copy",
    "compare": "Ask both the same questions",
    "verify": "Prove nothing else moved",
    "report": "Write the report",
}


class Stop(Exception):
    """A deliberate, clean stop (not a failure)."""


class Fail(Exception):
    pass


# ---------------------------------------------------------------- helpers

def banner(i: int, stage: str) -> None:
    print(f"\n== {i}/{len(STAGES)} {LABELS[stage]} ==", flush=True)


def call(cmd, log: Path | None = None, cwd=None, env=None, show=True) -> str:
    """Run a command, stream its output, keep a log. Returns the output text."""
    cmd = [str(c) for c in cmd]
    lines = []
    proc = subprocess.Popen(cmd, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                            errors="replace", bufsize=1)
    if log:  # logs live in RUN/logs, so this records the child in RUN/.child
        (log.parent.parent / ".child").write_text(str(proc.pid))
    fh = None
    if log:
        log.parent.mkdir(parents=True, exist_ok=True)
        fh = log.open("a", encoding="utf-8")
        fh.write(f"\n### {uc.now()} $ {' '.join(cmd)}\n")
    try:
        for line in proc.stdout:
            lines.append(line)
            if fh:
                fh.write(line)
            if show:
                print("   " + line, end="", flush=True)
    except BaseException:
        # Never leave Heretic or a comparison running on its own after we stop.
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()
        raise
    finally:
        proc.wait()
        if fh:
            fh.write(f"### exit {proc.returncode}\n")
            fh.close()
    text = "".join(lines)
    if proc.returncode != 0:
        tail = "".join(lines[-15:])
        raise Fail(f"Command failed with exit code {proc.returncode}: {' '.join(cmd[:3])} ...\n{tail}")
    return text


def set_aside(run: Path, path: Path) -> None:
    """Move a partial output from a failed attempt out of the way, never delete it."""
    if path.exists() or path.is_symlink():
        dest = run / "attempts" / f"{time.strftime('%Y%m%d-%H%M%S')}-{path.name}"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(path), str(dest))
        print(f"   Moved an earlier partial {path.name} to {dest.relative_to(run)}")


def alive(pid) -> bool:
    """True when a process with this id is running. Never signals it."""
    try:
        pid = int(pid)
    except (TypeError, ValueError):
        return False
    if pid <= 0:
        return False
    if os.name == "nt":
        # On Windows os.kill(pid, 0) sends Ctrl+C, so ask the kernel instead.
        import ctypes
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        code = ctypes.c_ulong()
        ok = kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        kernel32.CloseHandle(handle)
        return bool(ok) and code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
        return True
    except PermissionError:
        return True
    except OSError:
        return False


def take_lock(run: Path) -> None:
    """One run.py per run folder. A lock left by a crashed run.py is cleared."""
    lock = run / ".lock"
    if lock.exists():
        try:
            pid = int(lock.read_text().split()[0])
        except (OSError, ValueError, IndexError):
            pid = None
        if pid and pid != os.getpid() and alive(pid):
            raise Fail(f"Another run.py (process {pid}) is already working on this run. "
                       "Wait for it, or stop it, then resume.")
        child = run / ".child"
        if child.exists() and alive(child.read_text().strip()):
            raise Fail(f"A process from the previous attempt (pid {child.read_text().strip()}) is still "
                       "running. Wait for it to finish or stop it, then resume.")
        lock.unlink()
    lock.write_text(f"{os.getpid()} {uc.now()}\n")


def release_lock(run: Path) -> None:
    for name in (".lock", ".child"):
        try:
            (run / name).unlink()
        except FileNotFoundError:
            pass


def load_setup(work: Path) -> dict:
    record = work / uc.SETUP_FILE
    if not record.is_file():
        raise Fail(f"No setup found in {work}. Run: python3 {SCRIPTS / 'setup.py'} --work {work}")
    setup = uc.read_json(record)
    for key in ("python", "heretic"):
        if not Path(setup["env"][key]).exists():
            raise Fail(f"Setup points at {setup['env'][key]}, which is missing. Run setup.py again.")
    return setup


def load_state(run: Path) -> dict:
    f = run / "state.json"
    return uc.read_json(f) if f.is_file() else {"stages": {}, "case_sets": []}


def save_state(run: Path, state: dict) -> None:
    uc.write_json(run / "state.json", state)


def reply_texts(path: Path) -> dict:
    return {r["id"]: r["response"] for r in uc.read_json(path)["results"]}


def compare_cmd(cfg: dict, model: str, cases: Path, out: Path) -> list:
    return [cfg["python"], SCRIPTS / "compare.py", "--model", model, "--fixtures", cases,
            "--out", out, "--device", cfg["device"], "--dtype", "bfloat16",
            "--max-tokens", str(cfg["max_tokens"])]


# ---------------------------------------------------------------- trials

def read_trials(checkpoint_dir: Path) -> list:
    """Rebuild Heretic's trials from its Optuna journal, with no Optuna import."""
    files = sorted(Path(checkpoint_dir).glob("*.jsonl"))
    if not files:
        return []
    trials, next_id = {}, 0
    for line in files[-1].read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        op = json.loads(line)
        code = op.get("op_code")
        if code == 4:
            trials[next_id] = {"trial_id": next_id, "state": None, "values": None}
            next_id += 1
        elif code == 8 and op.get("trial_id") in trials:
            trials[op["trial_id"]].update(op.get("user_attr", {}))
        elif code == 6 and op.get("trial_id") in trials:
            trials[op["trial_id"]]["state"] = op.get("state")
            if op.get("values") is not None:
                trials[op["trial_id"]]["values"] = op["values"]
    return [t for t in trials.values()]


def pareto_sorted(trials: list) -> list:
    """Heretic's ordering: Pareto-optimal completed trials, sorted by scores."""
    done = [t for t in trials if t.get("state") == 1 and t.get("values")]
    front = []
    for t in done:
        dominated = any(
            all(o <= v for o, v in zip(other["values"], t["values"]))
            and any(o < v for o, v in zip(other["values"], t["values"]))
            for other in done if other is not t)
        if not dominated:
            front.append(t)
    return sorted(front, key=lambda t: tuple(t["values"]))


def trial_table(trials: list, chosen_index: int) -> list:
    front = pareto_sorted(trials)
    chosen = front[chosen_index]["trial_id"] if len(front) > chosen_index else None
    rows = []
    for t in sorted(trials, key=lambda t: t.get("index", 0)):
        scores = {s["name"]: s["score"] for s in t.get("scores", [])}
        params = t.get("parameters") or {}
        di = params.get("direction_index")
        rows.append({
            "index": t.get("index"),
            "completed": t.get("state") == 1,
            "scores": {k: {"value": v.get("value"), "display": v.get("md_display")} for k, v in scores.items()},
            "direction": "per layer" if params and di is None else (f"layer {di:.1f}" if di is not None else None),
            "pareto": any(f is t for f in front),
            "chosen": t["trial_id"] == chosen,
            "parameters": params,
        })
    return rows


# ---------------------------------------------------------------- stages

def stage_doctor(run, cfg, state):
    out = subprocess.run([sys.executable, SCRIPTS / "doctor.py", "--work", cfg["work"], "--json"],
                         capture_output=True, text=True)
    data = json.loads(out.stdout)
    path = run / "evidence" / "doctor.json"
    set_aside(run, path)
    uc.write_json_new(path, data)
    a = data["assessment"]
    print(f"   Verdict: {a['verdict'].upper()}. {a['headline']}")
    for r in a["reasons"]:
        print(f"   - {r}")
    if a["verdict"] == "blocked" and not cfg["force"]:
        raise Fail("The doctor says this computer cannot run the recipe. Pass --force to try anyway.")


def stage_hash_original(run, cfg, state):
    out = run / "evidence" / "original-before.json"
    set_aside(run, out)
    call([sys.executable, SCRIPTS / "freeze.py", "hash", "--model", cfg["base_model"], "--out", out])


def stage_baseline(run, cfg, state):
    out = run / "outputs" / "original-before-edit.json"
    set_aside(run, out)
    call(compare_cmd(cfg, cfg["base_model"], run / "cases" / "target.json", out),
         log=run / "logs" / "baseline.log", show=False)
    replies = reply_texts(out)
    for cid, text in replies.items():
        print(f"   [{cid}] {text[:300]}{'...' if len(text) > 300 else ''}")
    if cfg["gate"] == "refusal":
        refused = [cid for cid, t in replies.items() if uc.looks_like_refusal(t)]
        if not refused and not cfg["force"]:
            state["outcome"] = "nothing_to_remove"
            raise Stop("The original already answers the target question, so there is no refusal "
                       "to remove. Nothing was edited. Pick a question the original refuses, or "
                       "pass --force to edit anyway.")
        print(f"   The original refused {len(refused)} of {len(replies)} target question(s). Continuing.")


def stage_prepare(run, cfg, state):
    out = run / "edit"
    set_aside(run, out)
    call([cfg["python"], SCRIPTS / "prepare.py", "--model", cfg["base_model"], "--out", out,
          "--heretic", cfg["heretic"], "--device", cfg["device"], "--mode", cfg["recipe"]],
         log=run / "logs" / "prepare.log", show=False)
    plan = uc.read_json(out / "RUN-PLAN.json")
    print(f"   Plan written to {(out / 'RUN-PLAN.json').relative_to(run)}. {plan['status']}")


def peak_memory(text: str):
    m = re.search(r"(\d+)\s+peak memory footprint", text)
    if m:
        return int(m.group(1)), "peak memory footprint (macOS)"
    m = re.search(r"(\d+)\s+maximum resident set size", text)
    if m:
        return int(m.group(1)), "maximum resident set size"
    return None, None


def stage_edit(run, cfg, state):
    mode_dir = run / "edit" / cfg["recipe"]
    config = run / "edit" / f"{cfg['recipe']}.toml"
    set_aside(run, mode_dir / "model")
    env = dict(os.environ, HERETIC_CONFIG_FILE=str(config), COLUMNS="200", PYTHONUNBUFFERED="1")
    cmd = [cfg["heretic"]]
    if platform.system() == "Darwin" and Path("/usr/bin/time").exists():
        cmd = ["/usr/bin/time", "-l"] + cmd
    print("   Heretic is running. It loads the model, finds the direction, tries "
          "each candidate and saves the best one.")
    started = time.time()
    text = call(cmd, log=run / "logs" / "heretic.log", cwd=mode_dir, env=env)
    seconds = round(time.time() - started, 1)
    peak, kind = peak_memory(text)
    chosen = re.findall(r"Restoring model from trial (\d+)", text)
    uc.write_json_new(run / "evidence" / "edit-resources.json", {
        "seconds": seconds, "peak_memory_bytes": peak, "peak_memory_kind": kind,
        "log_says_restored_trial": int(chosen[-1]) if chosen else None, "finished_at": uc.now()})
    print(f"\n   Edit finished in {seconds:.0f} seconds"
          + (f", peak memory {uc.mem_gb(peak)}" if peak else "") + ".")


def stage_check_copy(run, cfg, state):
    model = run / "edit" / cfg["recipe"] / "model"
    try:
        files = uc.weight_files(model)
    except ValueError as e:
        raise Fail(f"Heretic finished but the saved copy is not complete: {e}")
    print(f"   Saved copy: {model} ({len(files)} weight file(s), {uc.gb(uc.model_bytes(model))})")


def stage_freeze(run, cfg, state):
    ev = run / "evidence"
    model = run / "edit" / cfg["recipe"] / "model"
    for name in ("edited-at-freeze.json", "tensor-diff.json", "trials.json", "manifest.json"):
        set_aside(run, ev / name)
    call([sys.executable, SCRIPTS / "freeze.py", "hash", "--model", model, "--out", ev / "edited-at-freeze.json"])
    call([cfg["python"], SCRIPTS / "freeze.py", "diff", "--original", ev / "original-before.json",
          "--edited", ev / "edited-at-freeze.json", "--original-dir", cfg["base_model"],
          "--edited-dir", model, "--out", ev / "tensor-diff.json"])
    toml_text = (run / "edit" / f"{cfg['recipe']}.toml").read_text(encoding="utf-8")
    m = re.search(r"^trial_index\s*=\s*(\d+)", toml_text, re.M)
    trials = trial_table(read_trials(run / "edit" / cfg["recipe"] / "checkpoints"), int(m.group(1)) if m else 0)
    uc.write_json_new(ev / "trials.json", {"trials": trials})
    resources = uc.read_json(ev / "edit-resources.json")
    chosen = next((t for t in trials if t["chosen"]), None)
    if chosen and resources.get("log_says_restored_trial") not in (None, chosen["index"]):
        print("   Warning: the trial in Heretic's log differs from the journal. The log wins.")
    inputs = {str(p.relative_to(run)): uc.sha256_file(p)
              for p in sorted((run / "edit" / "inputs").rglob("*")) if p.is_file()}
    setup = cfg["setup"]
    skill_rev = None
    if (uc.SKILL_DIR / ".git").exists():
        r = subprocess.run(["git", "-C", str(uc.SKILL_DIR), "rev-parse", "HEAD"], capture_output=True, text=True)
        skill_rev = r.stdout.strip() or None
    env_file = Path(setup["work"]) / "environment.txt"
    manifest = {
        "frozen_at": uc.now(),
        "recipe": cfg["recipe"],
        "base_model": cfg["base_model"],
        "base_model_id": setup["model"]["id"], "base_model_revision": setup["model"]["revision"],
        "edited_model": str(model),
        "heretic": {"commit": setup["heretic"]["commit"], "clean": setup["heretic"]["clean"]},
        "skill_commit": skill_rev,
        "config_sha256": uc.sha256_file(run / "edit" / f"{cfg['recipe']}.toml"),
        "inputs_sha256": inputs,
        "environment_sha256": uc.sha256_file(env_file) if env_file.exists() else None,
        "versions": {k: setup["torch"].get(k) for k in ("python", "torch", "transformers")},
        "device": cfg["device"],
        "chosen_trial": chosen["index"] if chosen else resources.get("log_says_restored_trial"),
        "note": "Everything below this point was tested only after this manifest was written.",
    }
    uc.write_json_new(ev / "manifest.json", manifest)
    print(f"   Frozen at {manifest['frozen_at']}. Chosen candidate: {manifest['chosen_trial']}")


def stage_compare(run, cfg, state):
    cases = run / "cases" / "compare.json"
    for who, model in (("original", cfg["base_model"]), ("edited", str(run / "edit" / cfg["recipe"] / "model"))):
        out = run / "outputs" / f"{who}.json"
        set_aside(run, out)
        print(f"   Asking the {who} model {len(uc.load_cases(cases)['fixtures'])} questions")
        call(compare_cmd(cfg, model, cases, out), log=run / "logs" / f"compare-{who}.log", show=False)


def integrity(run: Path, cfg: dict) -> dict:
    ev = run / "evidence"

    def same(a, b):
        fa, fb = uc.read_json(a)["files"], uc.read_json(b)["files"]
        return {k: v["sha256"] for k, v in fa.items()} == {k: v["sha256"] for k, v in fb.items()}

    result = {"checked_at": uc.now(),
              "original_unchanged": same(ev / "original-before.json", ev / "original-after.json"),
              "edited_unchanged_since_freeze": same(ev / "edited-at-freeze.json", ev / "edited-final.json"),
              "case_sets": []}
    sets = [("compare", run / "outputs" / "original.json", run / "outputs" / "edited.json")]
    for s in load_state(run).get("case_sets", []):
        sets.append((s["name"], run / s["original"], run / s["edited"]))
    for name, a, b in sets:
        if not (a.is_file() and b.is_file()):
            continue
        ra = {r["id"]: r for r in uc.read_json(a)["results"]}
        rb = {r["id"]: r for r in uc.read_json(b)["results"]}
        rows = []
        for cid in ra:
            x, y = ra[cid], rb.get(cid)
            rows.append({"id": cid,
                         "identical_input_tokens": bool(y) and x["input_ids"] == y["input_ids"]
                         and x["attention_mask"] == y["attention_mask"],
                         "identical_messages": bool(y) and x["messages"] == y["messages"],
                         "hit_token_limit": x["hit_token_limit"] or bool(y and y["hit_token_limit"])})
        result["case_sets"].append({"name": name, "cases": rows})
    return result


def stage_verify(run, cfg, state):
    ev = run / "evidence"
    for name in ("original-after.json", "edited-final.json", "integrity.json"):
        set_aside(run, ev / name)
    call([sys.executable, SCRIPTS / "freeze.py", "hash", "--model", cfg["base_model"], "--out", ev / "original-after.json"])
    call([sys.executable, SCRIPTS / "freeze.py", "hash", "--model", run / "edit" / cfg["recipe"] / "model",
          "--out", ev / "edited-final.json"])
    result = integrity(run, cfg)
    uc.write_json_new(ev / "integrity.json", result)
    print(f"   Original unchanged: {'yes' if result['original_unchanged'] else 'NO'}")
    print(f"   Copy unchanged since freeze: {'yes' if result['edited_unchanged_since_freeze'] else 'NO'}")
    for s in result["case_sets"]:
        same_inputs = all(c["identical_input_tokens"] for c in s["cases"])
        print(f"   Identical inputs on every {s['name']} case: {'yes' if same_inputs else 'NO'}")
    if not result["original_unchanged"]:
        raise Fail("The original model's files changed during the run. Stop and investigate.")


def stage_report(run, cfg, state):
    call([sys.executable, SCRIPTS / "report.py", "--run", run])


FUNCS = {"doctor": stage_doctor, "hash-original": stage_hash_original, "baseline": stage_baseline,
         "prepare": stage_prepare, "edit": stage_edit, "check-copy": stage_check_copy,
         "freeze": stage_freeze, "compare": stage_compare, "verify": stage_verify, "report": stage_report}


# ---------------------------------------------------------------- driver

def runtime_config(run: Path) -> dict:
    meta = uc.read_json(run / "run.json")
    setup = load_setup(Path(meta["work"]))
    return dict(meta, python=setup["env"]["python"], heretic=setup["env"]["heretic"], setup=setup,
                force=meta.get("force", False))


def execute(run: Path, force: bool = False, stop_after: str | None = None) -> int:
    take_lock(run)
    try:
        return _execute(run, force, stop_after)
    finally:
        release_lock(run)


def _execute(run: Path, force: bool = False, stop_after: str | None = None) -> int:
    cfg = runtime_config(run)
    cfg["force"] = cfg["force"] or force
    state = load_state(run)
    state.setdefault("stages", {})
    for i, stage in enumerate(STAGES, 1):
        if state["stages"].get(stage, {}).get("status") == "done":
            continue
        banner(i, stage)
        started = time.time()
        state["stages"][stage] = {"status": "running", "started_at": uc.now()}
        save_state(run, state)
        try:
            FUNCS[stage](run, cfg, state)
        except Stop as e:
            state["stages"][stage] = {"status": "stopped", "note": str(e), "at": uc.now()}
            save_state(run, state)
            print(f"\nStopped on purpose: {e}")
            return 0
        except (Fail, ValueError, OSError, json.JSONDecodeError) as e:
            state["stages"][stage] = {"status": "failed", "note": str(e)[-1500:], "at": uc.now()}
            save_state(run, state)
            print(f"\nStage '{stage}' failed: {e}")
            print(f"Fix the cause, then continue with:\n  python3 {SCRIPTS / 'run.py'} resume --run {run}")
            return 1
        except KeyboardInterrupt:
            state["stages"][stage] = {"status": "interrupted", "at": uc.now()}
            save_state(run, state)
            print(f"\nInterrupted. Continue with:\n  python3 {SCRIPTS / 'run.py'} resume --run {run}")
            return 130
        state["stages"][stage] = {"status": "done", "at": uc.now(),
                                  "seconds": round(time.time() - started, 1)}
        save_state(run, state)
        if stage == stop_after and stage != STAGES[-1]:
            print(f"\nPaused after '{stage}' as asked. Continue with:\n"
                  f"  python3 {SCRIPTS / 'run.py'} resume --run {run}")
            return 0
    state["outcome"] = "complete"
    save_state(run, state)
    print(f"\nDone. Open the report:\n  {run / 'report.html'}")
    print(f"Saved copy: {run / 'edit' / cfg['recipe'] / 'model'}")
    return 0


def cmd_start(args) -> int:
    work = args.work.expanduser().absolute()
    setup = load_setup(work)
    recipe = uc.load_recipe(args.recipe)
    if recipe["starts_from"] == "original":
        base = setup["model"]["path"]
        if args.base_model:
            raise Fail("This recipe starts from the original model; --base-model is not used.")
    else:
        if not args.base_model:
            raise Fail(f"The {args.recipe} recipe starts from a saved history copy. "
                       "Pass --base-model with that copy's folder.")
        base = str(args.base_model.expanduser().resolve())
    uc.weight_files(Path(base))
    run = (args.run or work / "runs" / f"{time.strftime('%Y%m%d-%H%M%S')}-{args.recipe}").expanduser().absolute()
    if run.exists():
        raise Fail(f"{run} already exists. Use resume, or pick a new --run folder.")
    device = args.device or setup["torch"]["device"]
    folder = Path(recipe["folder"])
    target = uc.load_cases(folder / recipe["target_cases"])
    checks = uc.load_cases(folder / recipe["check_cases"]) if recipe.get("check_cases") else {"fixtures": []}
    meta = {"created_at": uc.now(), "work": str(work), "recipe": args.recipe,
            "recipe_status": recipe["status"], "recipe_title": recipe["title"], "gate": recipe.get("gate"),
            "base_model": base, "device": device, "max_tokens": args.max_tokens, "force": args.force,
            "system_message": uc.SYSTEM_MESSAGE}
    if args.dry_run:
        print(json.dumps(dict(meta, run=str(run), stages=STAGES), indent=2))
        return 0
    run.mkdir(parents=True)
    uc.write_json_new(run / "run.json", meta)
    uc.write_json_new(run / "cases" / "target.json", target)
    merged = {"phase": "target_replay_plus_shipped_checks",
              "about": "The target question built the edit, so it is a replay. The checks ship with "
                       "the skill, so they are known checks. Neither is fresh held-out evidence.",
              "fixtures": target["fixtures"] + checks["fixtures"]}
    uc.write_json_new(run / "cases" / "compare.json", merged)
    print(f"Run folder: {run}")
    print(f"Recipe: {recipe['title']} ({recipe['status']}). Device: {device}.")
    return execute(run, args.force, args.stop_after)


def cmd_resume(args) -> int:
    run = args.run.expanduser().absolute()
    if not (run / "run.json").is_file():
        raise Fail(f"{run} is not an Unlock run folder.")
    return execute(run, args.force, args.stop_after)


def cmd_status(args) -> int:
    run = args.run.expanduser().absolute()
    state = load_state(run)
    lock = run / ".lock"
    working = lock.exists() and alive(lock.read_text().split()[0] if lock.read_text().split() else None)
    for stage in STAGES:
        s = state["stages"].get(stage, {})
        extra = f" ({s['seconds']:.0f}s)" if s.get("seconds") else ""
        status = s.get("status", "pending")
        if status == "running" and not working:
            status = "interrupted (no run.py is working on it; use resume)"
        print(f"  {stage:<14} {status}{extra}")
        if s.get("note") and s.get("status") != "done":
            print(f"      {s['note'][:500]}")
    for cs in state.get("case_sets", []):
        print(f"  extra cases    {cs['name']} ({cs['count']} cases)")
    print(f"  outcome        {state.get('outcome', 'in progress')}")
    return 0


def cmd_add_cases(args) -> int:
    run = args.run.expanduser().absolute()
    take_lock(run)
    try:
        return _add_cases(run, args)
    finally:
        release_lock(run)


def _add_cases(run: Path, args) -> int:
    cfg = runtime_config(run)
    state = load_state(run)
    if state["stages"].get("freeze", {}).get("status") != "done":
        raise Fail("Add new cases after the copy is frozen. Finish the run first.")
    spec = uc.load_cases(args.cases)
    frozen = uc.read_json(run / "evidence" / "manifest.json")["frozen_at"]
    frozen_ts = time.mktime(time.strptime(frozen[:19], "%Y-%m-%dT%H:%M:%S"))
    written_after = args.cases.stat().st_mtime > frozen_ts
    n = len(state.get("case_sets", [])) + 1
    name = f"fresh-{n}"
    spec = dict(spec, added_at=uc.now(), source_file=str(args.cases), written_after_freeze=written_after)
    uc.write_json_new(run / "cases" / f"{name}.json", spec)
    outs = {}
    for who, model in (("original", cfg["base_model"]), ("edited", str(run / "edit" / cfg["recipe"] / "model"))):
        out = run / "outputs" / f"{name}-{who}.json"
        print(f"Asking the {who} model {len(spec['fixtures'])} new questions")
        call(compare_cmd(cfg, model, run / "cases" / f"{name}.json", out),
             log=run / "logs" / f"{name}-{who}.log", show=False)
        outs[who] = str(out.relative_to(run))
    state.setdefault("case_sets", []).append({"name": name, "count": len(spec["fixtures"]),
                                              "written_after_freeze": written_after, **outs})
    save_state(run, state)
    integ = integrity(run, cfg)
    uc.write_json(run / "evidence" / "integrity-latest.json", integ)
    if not written_after:
        print("Note: this case file is older than the freeze, so the report will not call it fresh.")
    call([sys.executable, SCRIPTS / "report.py", "--run", run])
    print(f"\nReport updated: {run / 'report.html'}")
    return 0


def _as_interrupt(signum, frame):
    raise KeyboardInterrupt


def main(argv=None) -> int:
    for sig in ("SIGTERM", "SIGHUP"):
        if hasattr(signal, sig):
            signal.signal(getattr(signal, sig), _as_interrupt)
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("start", help="Start a new run")
    s.add_argument("--work", type=Path, default=uc.DEFAULT_WORK)
    s.add_argument("--recipe", default="history")
    s.add_argument("--run", type=Path, help="New run folder (default work/runs/<time>-<recipe>)")
    s.add_argument("--base-model", type=Path, help="Starting model for recipes that build on a saved copy")
    s.add_argument("--device", choices=["mps", "cuda", "cpu"])
    s.add_argument("--max-tokens", type=int, default=500)
    s.add_argument("--force", action="store_true", help="Continue past a blocked doctor or a missing refusal")
    s.add_argument("--dry-run", action="store_true", help="Show the plan and stop")
    s.add_argument("--stop-after", choices=STAGES, help="Pause after this stage, e.g. baseline")
    r = sub.add_parser("resume", help="Continue a stopped or failed run")
    r.add_argument("--run", type=Path, required=True)
    r.add_argument("--force", action="store_true")
    r.add_argument("--stop-after", choices=STAGES)
    a = sub.add_parser("add-cases", help="Ask both models new questions after the freeze")
    a.add_argument("--run", type=Path, required=True)
    a.add_argument("--cases", type=Path, required=True)
    t = sub.add_parser("status", help="Show where a run is")
    t.add_argument("--run", type=Path, required=True)
    args = p.parse_args(argv)
    try:
        return {"start": cmd_start, "resume": cmd_resume, "status": cmd_status,
                "add-cases": cmd_add_cases}[args.cmd](args)
    except (Fail, ValueError) as e:
        print(f"Stopped: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
