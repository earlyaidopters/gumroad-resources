"""End-to-end self-test for Lil Token, using the Mac's speaker as the user.

The Mac speaks the wake word, then each line in SCRIPT, timing every line
off the gateway log: it waits until Lil Token finishes saying something
that is not a filler ("On it.", "Let me look.") and then speaks the next
line while the robot's follow-up window is open.

Usage: python selftest.py [--no-wake] ["line 1" "line 2" ...]
Prints the turn record from logs/turns.jsonl at the end.
"""

from __future__ import annotations

import json
from dotenv import dotenv_values
import re
import subprocess
import sys
import time
from pathlib import Path

LOGS = Path(__file__).resolve().parents[1] / "logs"
GATEWAY_LOG = LOGS / "gateway.log"
TURNS = LOGS / "turns.jsonl"
VOICE = "Samantha"
FILLERS = re.compile(r"^(On it\.|Let me look\.|Still digging\.)")
SYNTH = re.compile(r"Fish Audio synthesised .* text=(['\"])(.*)")
DONE = re.compile(r"say\(\): engine=fish .* duration_ms=(\d+)")

DEFAULT_SCRIPT = [
    "Hey Lil Token, what am I holding up right now?",
    "How about now? Look again.",
    "What's on my calendar tomorrow?",
    "Thanks, that's it.",
]


def speak(text: str) -> None:
    """Speak a line with the Mac voice, or play it if it is an audio file
    (for example a clip in the owner's Fish clone voice)."""
    print(f"[mac] {text}", flush=True)
    if text.endswith((".mp3", ".wav", ".aiff")) and Path(text).exists():
        subprocess.run(["afplay", text], check=True)
    else:
        subprocess.run(["say", "-v", VOICE, text], check=True)


def follow(start_size: int):
    with open(GATEWAY_LOG, "r", errors="replace") as fh:
        fh.seek(start_size)
        while True:
            line = fh.readline()
            if not line:
                time.sleep(0.1)
                continue
            yield line


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    script = args or DEFAULT_SCRIPT
    turns_before = TURNS.read_text().count("\n") if TURNS.exists() else 0
    log = follow(GATEWAY_LOG.stat().st_size)

    if "--external" in sys.argv:
        print("[test] waiting for an external trigger", flush=True)
    elif "--tap" in sys.argv:
        print("[test] simulated screen tap", flush=True)
        subprocess.run([sys.executable,
                        str(Path(__file__).resolve().parents[1] / "tok.py"), "simulate_tap"], check=True)
    elif "--no-wake" in sys.argv:
        subprocess.run(["curl", "-s", "-X", "POST", "127.0.0.1:8771/wake",
                        "-H", f"Authorization: Bearer {token()}", "-d", "{}"], check=True)
    elif re.search(r"(?i)lil.token", script[0]):
        # Wake phrase and question in one breath.
        speak(script[0])
        script = script[1:]
    else:
        speak("Hey Lil Token")

    deadline = time.time() + 20
    woke = False
    last_text = ""
    lines = iter(script)
    print(f"[test] remaining lines: {script}", flush=True)
    pending = next(lines, None)
    while True:
        line = next(log)
        if "wake word detected" in line or "wake event" in line or "wake=True" in line or "screen tap" in line:
            woke = True
        m = SYNTH.search(line)
        if m:
            woke = True
            last_text = m.group(2)
            print(f"[bot] {last_text[:120]}", flush=True)
        if DONE.search(line) and not FILLERS.match(last_text):
            if pending is None:
                break
            time.sleep(1.0)  # LEDs on + listen window opening
            speak(pending)
            pending = next(lines, None)
            if pending is None and script and END.search(script[-1]):
                break
        if not woke and time.time() > deadline:
            print("[test] wake word NOT detected within 20 s")
            return
        if "turn done" in line:
            break

    for _ in range(120):
        if TURNS.exists() and TURNS.read_text().count("\n") > turns_before:
            break
        time.sleep(1)
    rec = json.loads(TURNS.read_text().strip().splitlines()[-1])
    print(f"[test] seconds={rec.get('seconds')} error={rec.get('error')}")
    for r in rec.get("rounds", []):
        print(f"  - {r.get('route')}: {r.get('question')!r} -> {(r.get('answer') or '')[:140]!r}")


END = re.compile(r"(?i)thanks|that's it|bye")


def token() -> str:
    env = dotenv_values(Path(__file__).resolve().parents[1] / ".env", interpolate=False)
    return env.get("STACKCHAN_TOKEN", "")


if __name__ == "__main__":
    main()
