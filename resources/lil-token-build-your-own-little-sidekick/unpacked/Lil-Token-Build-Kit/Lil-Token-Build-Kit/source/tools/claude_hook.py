#!/usr/bin/env python3
"""Claude Code hook: Lil Token says when a session needs you or has finished.

Registered in ~/.claude/settings.json for three events:

  UserPromptSubmit  remembers when the session started working
  Notification      "Claude needs you in <project>." (permission or input)
  Stop              "Claude finished in <project>." only when the work took
                    three minutes or more, so quick replies stay silent

It can never block or slow Claude Code: every path exits 0, the robot gets
1.5 s to answer, and any error is swallowed. Turn it off with
`touch ~/.liltoken/quiet`, or LILTOKEN_HOOK=0 in a session's environment.
"""

import json
from dotenv import dotenv_values
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

STATE = Path.home() / ".liltoken" / "hook_state.json"
QUIET = Path.home() / ".liltoken" / "quiet"
MIN_WORK_S = int(os.environ.get("LILTOKEN_HOOK_MIN_S", "180"))
GAP_S = 60  # at most one line a minute across all sessions


def main() -> None:
    if os.environ.get("LILTOKEN_HOOK", "0") != "1" or QUIET.exists():
        return
    event = json.load(sys.stdin)
    kind = event.get("hook_event_name", "")
    session = str(event.get("session_id", ""))[:40]
    project = re.sub(r"[^A-Za-z0-9 ]+", " ", Path(event.get("cwd") or ".").name).strip() or "a project"
    try:
        state = json.loads(STATE.read_text())
    except (OSError, ValueError):
        state = {}
    now = time.time()
    sessions = {k: v for k, v in state.get("sessions", {}).items() if now - v < 86400}
    text = None
    if kind == "UserPromptSubmit":
        sessions[session] = now
    elif kind == "Notification":
        message = str(event.get("message", "")).lower()
        if "permission" in message or "approval" in message:
            text = f"Claude needs your okay in {project}."
        elif "waiting" in message or "input" in message:
            text = f"Claude is waiting on you in {project}."
    elif kind == "Stop":
        started = sessions.pop(session, None)
        if started and now - started >= MIN_WORK_S:
            minutes = round((now - started) / 60)
            text = f"Claude finished in {project}, after {minutes} minutes."
    last = state.get("last_said", 0)
    if text and now - last < GAP_S:
        text = None
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps({"sessions": sessions, "last_said": now if text else last}))
    if not text:
        return
    env = dotenv_values(Path(__file__).resolve().parents[1] / ".env", interpolate=False)
    token = env.get("STACKCHAN_TOKEN", "")
    if not token:
        return
    req = urllib.request.Request(
        "http://127.0.0.1:8771/announce",
        data=json.dumps({"text": text, "urgent": kind == "Notification", "source": "claude-code",
                         "leds": [120, 80, 255]}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    urllib.request.urlopen(req, timeout=1.5).read()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
