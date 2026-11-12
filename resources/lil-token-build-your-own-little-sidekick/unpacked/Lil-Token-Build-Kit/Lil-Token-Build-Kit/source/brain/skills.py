"""Lil Token's extra abilities, used by brain.py.

- body: Claude drives the robot itself (head, camera, viewfinder, face,
  LEDs) through the gateway's MCP tools. Used for camera questions and for
  body requests ("look left", "nod", "show me what you see").
- memory: "remember that ..." / "forget ..." edit brain/memory.md.
- reminders: "remind me in 20 minutes to ..." plus calendar heads-ups a few
  minutes before timed meetings; both are spoken unprompted.
- business: read-only numbers through brain/biz (Gumroad, Stripe, Skool
  DMs) and Calendly's read tools.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import logging
import os
import re
import subprocess
from pathlib import Path
from zoneinfo import ZoneInfo

log = logging.getLogger("liltoken.skills")

HOME = Path.home()
BRAIN_DIR = Path(__file__).resolve().parent
MEMORY_FILE = BRAIN_DIR / "memory.md"
REMINDERS_FILE = BRAIN_DIR / "reminders.json"
ANNOUNCED_FILE = BRAIN_DIR / "announced.json"
BIZ = str(BRAIN_DIR / "biz")
GTOOL = str(BRAIN_DIR / "gtool")
TZ = ZoneInfo(os.environ.get("LILTOKEN_TIMEZONE", "UTC"))
CONFIG_DIR = Path(__file__).resolve().parents[1] / "config"


def filming() -> bool:
    """Filming mode (touch ~/lil-token/config/filming): nothing private is
    spoken. Gmail is limited to the label lil-token-demo, calendar titles
    are hidden unless they contain "demo", money is rounded, and the robot
    says nothing unprompted. Checked live, no restart needed."""
    return (CONFIG_DIR / "filming").exists()

# MCP config that gives a headless Claude the robot's own tools. The token is
# fetched by the same headers helper Claude Code uses, so it never lands in
# a config file or a process argument.
ROBOT_MCP = json.dumps({"mcpServers": {"lt": {
    "type": "http",
    "url": "http://127.0.0.1:8767/mcp",
    "headersHelper": str(Path(__file__).resolve().parents[1] / "mcp-headers.sh"),
}}})
BODY_TOOLS = [
    "mcp__lt__move_head", "mcp__lt__get_head_angles", "mcp__lt__take_photo",
    "mcp__lt__camera_preview", "mcp__lt__set_avatar", "mcp__lt__set_all_leds",
    "mcp__lt__set_led", "mcp__lt__clear_leds",
]
CALENDLY_MCP = {"type": "http", "url": "https://mcp.calendly.com"}
CALENDLY_TOOLS = [
    "mcp__calendly__users-get_current_user", "mcp__calendly__meetings-list_events",
    "mcp__calendly__meetings-list_event_invitees", "mcp__calendly__event_types-list_event_types",
]

SPEAK_RULES = """Finish with ONLY the words to speak out loud in the owner's cloned voice: two or three short sentences, at most 45 words. No markdown, no lists, no URLs, no em dashes, no colons. Numbers the way they are said. You may start with one emoji to set your face: 😄 😮 😢 🤔. It is a live back-and-forth, so you can end with a short question."""

# -- routing --------------------------------------------------------------

REMEMBER_RE = re.compile(r"(?i)^\W*(please\W+)?(remember|don'?t forget|note that|keep in mind|make a note)\b")
FORGET_RE = re.compile(r"(?i)^\W*(please\W+)?(forget|delete the memory|stop remembering)\b")
RECALL_RE = re.compile(r"(?i)\bwhat do you (remember|know about me)\b")
REMIND_RE = re.compile(r"(?i)\b(remind me|set (a |an )?(timer|reminder|alarm)|timer for|alarm for|wake me up at)\b")
BODY_RE = re.compile(
    r"(?i)\b(look (left|right|up|down|around|at me|over|behind)|turn (left|right|around|your head)|"
    r"nod|shake your head|spin|wiggle|show me what you see|what can you see|scan the room|"
    r"find (my|the)|where('?s| is) (my|the)|follow me|change your (lights|face|color)|lights? (on|off|red|blue|green)|"
    r"make a face|look (happy|sad|surprised)|be (happy|sad))\b"
)
BIZ_RE = re.compile(
    r"(?i)\b(sales|sold|revenue|money|made today|make today|earnings|gumroad|stripe|subscribers?|subscriptions?|"
    r"downloads?|orders|calendly|bookings?|booked|skool|dms?|community messages|how('?s| is) business)\b"
)


DANCE_RE = re.compile(r"(?i)\b(dance|bust a move|groove|vibe to|bob your head|head ?bang|party mode)\b")


def route_for(question: str) -> str | None:
    if FORGET_RE.search(question):
        return "forget"
    if REMEMBER_RE.search(question):
        return "remember"
    if REMIND_RE.search(question):
        return "remind"
    if DANCE_RE.search(question):
        return "dance"
    if BODY_RE.search(question):
        return "body"
    if BIZ_RE.search(question):
        return "biz"
    if RECALL_RE.search(question):
        return "chat"
    return None


# -- claude helper ----------------------------------------------------------

async def run_claude(claude: str, model: str, prompt: str, *args: str, timeout: int = 90) -> str:
    proc = await asyncio.create_subprocess_exec(
        claude, "-p", prompt, "--model", model, *args,
        "--setting-sources", "", "--output-format", "text",
        cwd=str(BRAIN_DIR), stdin=asyncio.subprocess.DEVNULL, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        env={**os.environ, "PATH": f"{HOME}/.local/bin:{HOME}/.codex/bin:/opt/homebrew/bin:/usr/bin:/bin"},
    )
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        log.warning("claude timed out")
        return ""
    if proc.returncode != 0:
        log.warning("claude exit %s: %s", proc.returncode, err.decode()[-400:])
        return ""
    return out.decode().strip()


# -- body -----------------------------------------------------------------

BODY_PROMPT = """You are Lil Token, a small StackChan desk robot that belongs to the owner. You have a real body and you control it through tools.
{history}
Now is {now}. the owner said (transcribed from speech): "{question}"

Your body:
- Head: move_head(yaw, pitch, speed). yaw -90 (your left) to 90 (your right), 0 is straight ahead. pitch 5 to 85; about 18 looks level across the desk at someone sitting there, lower looks down at the desk surface, 44 is your resting pose and already looks up toward the ceiling. speed low, mid or high.
- Camera in your face: take_photo(question) returns the photo to you directly. camera_preview(seconds, restore) shows a live viewfinder on your screen so the owner sees what you see; call it with restore=false right before you take photos so he can watch, and keep seconds short (3 to 6).
- Face: set_avatar(face) with idle, happy, thinking, sad, surprised, embarrassed. LEDs on your base: set_all_leds(r,g,b), clear_leds.

How to act:
- For anything about seeing: look first, then answer from what you actually see. If the thing is not in frame or is blurry, move your head (try yaw plus or minus 30, or pitch 20 to look down at the desk) and take another photo. At most 4 photos.
- For body requests (nod, look left, dance), just do the moves with a few quick move_head calls, then say something short and fun.
- "Turn on your camera" or "keep watching": start camera_preview(seconds=30, restore=false) so the live view stays on his screen, then take a photo and say what you see. "Turn off your camera": set_avatar(face="idle").
- You have no optical zoom. For "zoom in" or "closer", aim the head right at the subject (small yaw and pitch changes), take a new photo, and describe the detail. If it is still too small, say so honestly and ask him to bring it closer.
- Only say you did things you actually did with the tools.
- Finish with your head back at yaw 0, pitch 44 unless the owner asked you to keep looking somewhere or the camera is meant to stay on.
- Never invent what you see.

{speak}"""


async def ask_body(claude: str, model: str, question: str, history: str, now: str) -> str:
    prompt = BODY_PROMPT.format(history=history, now=now, question=question, speak=SPEAK_RULES)
    return await run_claude(
        claude, model, prompt,
        "--strict-mcp-config", "--mcp-config", ROBOT_MCP,
        "--tools", "", "--allowedTools", *BODY_TOOLS,
        timeout=120,
    )


# -- memory ---------------------------------------------------------------

MEMORY_PROMPT = """You maintain the long-term memory of Lil Token, the owner's desk robot. Current memory lines (numbered):
{lines}

the owner just said (transcribed from speech): "{question}"

Reply with ONLY a JSON object, no prose:
{{"add": ["fact written in third person about the owner, one short sentence"], "remove": [line numbers to delete], "say": "short spoken confirmation in a friendly voice, no em dashes, no colons"}}
Add when he asks you to remember something. Remove the matching lines when he asks you to forget something. Keep facts specific and true to what he said."""


def memory_lines() -> list[str]:
    try:
        return [ln[2:].strip() for ln in MEMORY_FILE.read_text().splitlines() if ln.startswith("- ")]
    except OSError:
        return []


def write_memory(lines: list[str]) -> None:
    body = "# Lil Token's long-term memory about the owner\n\n" + "\n".join(f"- {ln}" for ln in lines) + "\n"
    MEMORY_FILE.write_text(body)


async def edit_memory(claude: str, question: str) -> str:
    lines = memory_lines()
    numbered = "\n".join(f"{i + 1}. {ln}" for i, ln in enumerate(lines)) or "(empty)"
    raw = await run_claude(claude, "sonnet", MEMORY_PROMPT.format(lines=numbered, question=question),
                           "--tools", "", timeout=40)
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        return "Hmm, my memory chip hiccupped. Say that again?"
    try:
        plan = json.loads(m.group(0))
    except json.JSONDecodeError:
        return "Hmm, my memory chip hiccupped. Say that again?"
    remove = {int(n) - 1 for n in plan.get("remove", []) if str(n).isdigit()}
    kept = [ln for i, ln in enumerate(lines) if i not in remove]
    stamp = dt.date.today().isoformat()
    kept += [f"{fact.strip()} (noted {stamp})" for fact in plan.get("add", []) if fact.strip()]
    write_memory(kept)
    log.info("memory: +%d -%d", len(plan.get("add", [])), len(remove))
    return plan.get("say") or "Got it, locked in."


# -- reminders ------------------------------------------------------------

REMIND_PROMPT = """Now is {now} in Toronto. the owner said (transcribed from speech): "{question}"

He wants a reminder or timer. Reply with ONLY a JSON object:
{{"due": "YYYY-MM-DDTHH:MM:SS local Toronto time", "message": "what to remind him, short, second person", "say": "short spoken confirmation that says when, no em dashes, no colons"}}
If he gave no time, use 10 minutes from now."""


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return default


async def add_reminder(claude: str, question: str) -> str:
    now = dt.datetime.now(TZ)
    raw = await run_claude(claude, "sonnet", REMIND_PROMPT.format(now=now.strftime("%A %d %B %Y %H:%M:%S"), question=question),
                           "--tools", "", timeout=40)
    m = re.search(r"\{.*\}", raw, re.S)
    try:
        plan = json.loads(m.group(0)) if m else {}
        due = dt.datetime.fromisoformat(plan["due"]).replace(tzinfo=TZ)
    except Exception:
        return "I didn't catch the time for that reminder. Try again with a time?"
    items = load_json(REMINDERS_FILE, [])
    items.append({"due": due.isoformat(), "message": plan.get("message", "your reminder")})
    REMINDERS_FILE.write_text(json.dumps(items, indent=2))
    log.info("reminder set for %s: %s", due, plan.get("message"))
    return plan.get("say") or f"Okay, I'll remind you at {due.strftime('%I:%M %p').lstrip('0')}."


def quiet_hours(now: dt.datetime) -> bool:
    return now.hour >= 22 or now.hour < 8


def due_reminders() -> list[dict]:
    now = dt.datetime.now(TZ)
    items = load_json(REMINDERS_FILE, [])
    due = [r for r in items if dt.datetime.fromisoformat(r["due"]) <= now]
    if due:
        REMINDERS_FILE.write_text(json.dumps([r for r in items if r not in due], indent=2))
    return due


def upcoming_meetings(lead_min: int = 5) -> list[dict]:
    """Timed calendar events starting in the next lead window, each once."""
    now = dt.datetime.now(TZ)
    if os.environ.get("LILTOKEN_GOOGLE", "0") != "1" or quiet_hours(now):
        return []
    try:
        out = subprocess.run([GTOOL, "calendar", "all", "0", "--json"], capture_output=True, text=True, timeout=60,
                             env={**os.environ, "PATH": f"{HOME}/.local/bin:{HOME}/.codex/bin:/usr/bin:/bin"})
        events = json.loads(out.stdout or "[]")
    except Exception as exc:
        log.warning("calendar poll failed: %s", exc)
        return []
    announced = set(load_json(ANNOUNCED_FILE, []))
    soon = []
    for e in events:
        start = dt.datetime.fromisoformat(e["start"]).astimezone(TZ)
        minutes = (start - now).total_seconds() / 60
        key = f"{e['id']}@{e['start']}"
        if 0 < minutes <= lead_min + 0.5 and key not in announced:
            e["minutes"] = max(1, round(minutes))
            soon.append(e)
            announced.add(key)
    if soon:
        ANNOUNCED_FILE.write_text(json.dumps(sorted(announced)[-200:]))
    return soon


# -- business -------------------------------------------------------------

BIZ_PROMPT = """You are Lil Token, the owner's desk robot. Now is {now} in Toronto.
{history}
the owner asked (transcribed from speech): "{question}"

Tools you can use, all read-only:
- Shell: {biz} gumroad [days], {biz} stripe [days], {biz} skool, {biz} summary [days]. days=1 means since yesterday.
- Calendly read tools for scheduled calls and bookings.
Gumroad freebies count as downloads, not revenue. Use only the explicitly configured business adapter.

{speak}"""


async def ask_biz(claude: str, model: str, question: str, history: str, now: str) -> str:
    if os.environ.get("LILTOKEN_BUSINESS", "0") != "1":
        return "Business access is off. Enable your own adapter first."
    cfg = json.dumps({"mcpServers": {}})
    prompt = BIZ_PROMPT.format(now=now, history=history, question=question, biz=BIZ, speak=SPEAK_RULES)
    return await run_claude(
        claude, model, prompt,
        "--strict-mcp-config", "--mcp-config", cfg,
        "--tools", "Bash", "--allowedTools", f"Bash({BIZ}:*)", f"Bash({BIZ} *)",
        timeout=120,
    )
