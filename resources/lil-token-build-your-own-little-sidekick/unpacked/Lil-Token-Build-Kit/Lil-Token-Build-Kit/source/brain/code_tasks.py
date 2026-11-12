"""Start a Claude Code run by voice, and say what it did when it finishes.

"Hey Lil Token, tell Claude to fix the failing test in the sandbox."

Only folders named in config/code_folders.json can be touched, the run may
edit files there and run tests but nothing else (no network tools, no git
push, no shell beyond the test commands), and one run goes at a time. The
result is spoken through brain.announce() and kept in logs/code-tasks/.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path

import skills

log = logging.getLogger("liltoken.code")

FOLDERS_FILE = skills.CONFIG_DIR / "code_folders.json"
CLAUDE = os.environ.get("LILTOKEN_CLAUDE", "claude")
MODEL = os.environ.get("LILTOKEN_CODE_MODEL", "fable")
TIMEOUT_S = int(os.environ.get("LILTOKEN_CODE_TIMEOUT_S", "900"))
ALLOWED = ["Read", "Glob", "Grep", "Edit", "Write",
           "Bash(python3 -m unittest:*)", "Bash(python3 -m pytest:*)", "Bash(pytest:*)", "Bash(npm test:*)",
           "Bash(git status:*)", "Bash(git diff:*)"]
PROMPT = """{task}

You were started by voice through a desk robot, and nobody is at the keyboard. Work only inside this folder. Do not ask questions; make the smallest sound change that does the job and run the tests if there are any.

Finish with one or two plain sentences that say what you changed and whether the tests pass. They will be read out loud, so no code, no file paths, no lists."""

running: asyncio.Task | None = None


def folders() -> dict[str, Path]:
    try:
        raw = json.loads(FOLDERS_FILE.read_text())
    except (OSError, json.JSONDecodeError):
        return {}
    return {name.lower(): Path(p).expanduser() for name, p in raw.items() if Path(p).expanduser().is_dir()}


def pick(name: str) -> tuple[str, Path] | None:
    """Match what the agent passed ("the sandbox", "Sandbox") to an allowed folder."""
    wanted = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    for key, path in folders().items():
        if key == wanted or key in wanted.split() or wanted in key:
            return key, path
    return None


def spoken_summary(output: str) -> str:
    text = re.sub(r"```.*?```", " ", output, flags=re.S)
    # Notices from the CLI itself ("Warning: this sign-in ends...") are not the answer.
    text = "\n".join(ln for ln in text.splitlines() if not re.match(r"(?i)\s*(warning|notice)\s*:", ln))
    paragraphs = [p.strip() for p in text.strip().split("\n\n") if p.strip()]
    last = re.sub(r"\s+", " ", paragraphs[-1]) if paragraphs else ""
    return last[:260]


async def start(brain, folder: str, task: str) -> str:
    global running
    if os.environ.get("LILTOKEN_CODE_TASKS", "0") != "1":
        return "Voice coding is disabled. Enable it only in a disposable project folder."
    match = pick(folder)
    if match is None:
        return f"'{folder}' is not an allowed folder. Allowed: {', '.join(folders()) or 'none'}."
    if running is not None and not running.done():
        return "A Claude run is already going. Wait for it to finish."
    name, path = match
    running = asyncio.create_task(_run(brain, name, path, task.strip()[:1000]))
    return f"Started Claude in {name}. I will say so when it finishes."


async def _run(brain, name: str, path: Path, task: str) -> None:
    started = time.time()
    out_dir = Path(__file__).resolve().parents[1] / "logs" / "code-tasks"
    out_dir.mkdir(parents=True, exist_ok=True)
    argv = [CLAUDE, "-p", PROMPT.format(task=task), "--permission-mode", "acceptEdits",
            "--allowedTools", *ALLOWED, "--setting-sources", "", "--output-format", "text"]
    if MODEL:
        argv += ["--model", MODEL]
    env = {**os.environ, "LILTOKEN_HOOK": "0",
           "PATH": f"{Path.home()}/.local/bin:/opt/homebrew/bin:/usr/bin:/bin"}
    try:
        proc = await asyncio.create_subprocess_exec(
            *argv, cwd=str(path), env=env, stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        try:
            raw, err = await asyncio.wait_for(proc.communicate(), timeout=TIMEOUT_S)
        except asyncio.TimeoutError:
            proc.kill()
            brain.announce(f"The Claude run in {name} took too long, so I stopped it.", urgent=True, source="code")
            return
        output = raw.decode(errors="replace")
        (out_dir / f"{time.strftime('%Y%m%d-%H%M%S')}-{name}.log").write_text(
            f"TASK: {task}\n\n{output}\n\nSTDERR:\n{err.decode(errors='replace')}")
        took = round(time.time() - started)
        log.info("code task in %s finished in %d s (exit %s)", name, took, proc.returncode)
        if proc.returncode != 0:
            brain.announce(f"The Claude run in {name} failed. The log is saved.", urgent=True, source="code")
            return
        brain.announce(f"Claude finished in {name}. {spoken_summary(output)}", urgent=True,
                       leds=(120, 80, 255), source="code")
    except Exception as exc:
        log.warning("code task failed: %r", exc)
        brain.announce(f"I could not start Claude in {name}.", urgent=True, source="code")
