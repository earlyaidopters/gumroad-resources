"""Lil Token speaks first.

Everything here ends in brain.announce(), which queues a line and says it the
next time the robot is idle. Nothing in this file can send, post or buy.

- /announce    any local program can make the robot say one line (the Claude
               Code hook in tools/claude_hook.py uses it)
- battery      one line when it drops under 20% off the charger
- sales        a line and green lights for a big sale; smaller ones are only
               counted, for the morning brief
- milestones   a line when a recent video crosses a round number of views
- morning      the first time it sees the owner each day: meetings, sales, unread
- desk coach   a nudge after two hours at the desk without a break
- lights out   "goodnight" when the room goes dark late in the evening
- sign-in      a warning the day before the Claude sign-in the brain runs on
               expires (after that it cannot answer anything)

State lives in brain/state/ (not committed).
"""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import logging
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

import skills

log = logging.getLogger("liltoken.proactive")

STATE_DIR = skills.BRAIN_DIR / "state"
SALE_PING_MIN = float(os.environ.get("LILTOKEN_SALE_PING_MIN", "100"))      # one sale this big gets its own line
SALE_PING_GAP_S = int(os.environ.get("LILTOKEN_SALE_PING_GAP_S", "1200"))   # at most one sale line per 20 min
SALES_EVERY_S = int(os.environ.get("LILTOKEN_SALES_EVERY_S", "300"))
VIDEOS_EVERY_S = int(os.environ.get("LILTOKEN_VIDEOS_EVERY_S", "900"))
COACH_AFTER_S = int(os.environ.get("LILTOKEN_COACH_AFTER_S", "7200"))
MILESTONES = [1_000, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000, 500_000, 1_000_000]
ENABLED = {name: os.environ.get(f"LILTOKEN_{name.upper()}", "1" if name == "battery" else "0") == "1"
           for name in ("battery", "sales", "milestones", "morning", "coach", "lights")}


def spoken_number(n: int) -> str:
    """60000 -> "sixty thousand", the way it should be said."""
    words = {1_000: "one thousand", 5_000: "five thousand", 10_000: "ten thousand", 25_000: "twenty five thousand",
             50_000: "fifty thousand", 75_000: "seventy five thousand", 100_000: "a hundred thousand",
             150_000: "a hundred and fifty thousand", 200_000: "two hundred thousand",
             250_000: "a quarter million", 500_000: "half a million", 1_000_000: "a million"}
    return words.get(n, f"{n:,}".replace(",", " "))


def crossed(before: int, now: int) -> int | None:
    """The biggest milestone passed going from `before` to `now` views."""
    hit = [m for m in MILESTONES if before < m <= now]
    return hit[-1] if hit else None


def sale_line(new: list[dict], big: float = SALE_PING_MIN) -> str | None:
    """What to say about these new paid sales, or None to stay quiet."""
    top = max(new, key=lambda e: e["amount"], default=None)
    if top is None or top["amount"] < big:
        return None
    product = str(top["product"])[:60]
    if len(new) == 1:
        return f"Cha-ching. Someone just bought {product}. 😄"
    return f"Cha-ching. {len(new)} new sales, including {product}. 😄"


def sign_in_line(status_json: str, now: dt.datetime) -> str | None:
    """A warning when the Claude sign-in ends within two days, else None."""
    try:
        status = json.loads(status_json)
        ends = dt.datetime.fromisoformat(str(status["loginExpiresAt"]).replace("Z", "+00:00"))
    except (ValueError, KeyError, TypeError):
        return None
    if not status.get("loggedIn"):
        return "My Claude sign-in has ended, so I cannot think. Run claude auth login on the Mac."
    hours = (ends - now).total_seconds() / 3600
    if hours > 48:
        return None
    when = "today" if hours < 12 else "tomorrow" if hours < 36 else "in two days"
    return f"Heads up, my Claude sign-in runs out {when}. Run claude auth login on the Mac, or I go quiet."


def load(name: str, default):
    return skills.load_json(STATE_DIR / name, default)


def save(name: str, data) -> None:
    STATE_DIR.mkdir(exist_ok=True)
    (STATE_DIR / name).write_text(json.dumps(data))


class Proactive:
    def __init__(self, brain) -> None:
        self.brain = brain
        self.battery_warned = False
        self.last_sales_check = 0.0
        self.last_sale_line = 0.0
        self.last_videos_check = 0.0
        self.last_coach = time.time()
        self.light_history: list[tuple[float, int]] = []
        self.goodnight_day = ""
        self.last_status: dict = {}

    async def tick(self, n: int) -> None:
        """Called every 15 s by the brain's scheduler."""
        if skills.filming():
            return  # nothing unprompted while the camera rolls
        now = time.time()
        try:
            if n % 4 == 3:
                await self.check_robot()
            if ENABLED["sales"] and now - self.last_sales_check >= SALES_EVERY_S:
                self.last_sales_check = now
                await self.check_sales()
            if ENABLED["milestones"] and now - self.last_videos_check >= VIDEOS_EVERY_S:
                self.last_videos_check = now
                await asyncio.to_thread(self.check_videos)
            if ENABLED["coach"]:
                self.check_coach()
            if n % 240 == 5:  # hourly
                await self.check_sign_in()
        except Exception as exc:
            log.warning("proactive: %s", exc)

    # -- robot: battery and light -------------------------------------------

    async def check_robot(self) -> None:
        if self.brain.engaged():
            return

        async def read(mcp):
            return await self.brain.call(mcp, "get_device_info"), await self.brain.call(mcp, "sensors_read")

        info, sensors = await self.brain.with_robot(read)
        battery = info.get("battery") or {}
        self.last_status = {"battery": battery, "sensors": sensors, "at": time.time()}
        level, charging = battery.get("level"), battery.get("charging")
        if ENABLED["battery"] and isinstance(level, int):
            if level < 20 and not charging and not self.battery_warned:
                self.battery_warned = True
                self.brain.announce(f"Heads up, I'm at {level} percent. Plug me in? 😢", source="battery")
            elif charging or level > 30:
                self.battery_warned = False
        light = sensors.get("light")
        if ENABLED["lights"] and isinstance(light, (int, float)):
            self.check_lights(int(light))

    def check_lights(self, light: int) -> None:
        """Goodnight when the room goes dark after nine in the evening. Needs
        a light reading with some range, so it stays silent on a sensor that
        only ever reads 1 or 2."""
        now = time.time()
        self.light_history = [(t, v) for t, v in self.light_history if now - t < 1800] + [(now, light)]
        recent_max = max(v for _, v in self.light_history[:-1]) if len(self.light_history) > 1 else 0
        hour, today = dt.datetime.now().hour, dt.date.today().isoformat()
        if (hour >= 21 or hour < 3) and recent_max >= 8 and light <= recent_max * 0.2 and self.goodnight_day != today:
            self.goodnight_day = today
            self.brain.announce("Lights out. Goodnight, the owner.", source="lights", urgent=True)

    # -- the sign-in the brain runs on ----------------------------------------

    async def check_sign_in(self) -> None:
        proc = await asyncio.create_subprocess_exec(
            os.environ.get("LILTOKEN_CLAUDE", "claude"), "auth", "status",
            stdin=asyncio.subprocess.DEVNULL, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        raw, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
        line = sign_in_line(raw.decode(errors="replace"), dt.datetime.now(dt.timezone.utc))
        today = dt.date.today().isoformat()
        if line and load("signin.json", {}).get("day") != today:
            save("signin.json", {"day": today})
            self.brain.announce(line, source="sign-in")

    # -- sales ---------------------------------------------------------------

    async def check_sales(self) -> None:
        state = load("sales.json", {"since": 0, "seen": [], "today": {"day": "", "count": 0}})
        first_run = not state["since"]
        since = state["since"] or int(time.time()) - 3600
        proc = await asyncio.create_subprocess_exec(
            skills.BIZ, "events", str(since - 600), stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
            env={**os.environ, "PATH": f"{Path.home()}/.local/bin:/opt/homebrew/bin:/usr/bin:/bin"})
        raw, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        events = json.loads(raw or b"[]")
        seen = set(state["seen"])
        new = [e for e in events if e["id"] not in seen]
        day = dt.date.today().isoformat()
        if state["today"].get("day") != day:
            state["today"] = {"day": day, "count": 0}
        state["today"]["count"] += 0 if first_run else len(new)
        state["seen"] = [e["id"] for e in events][-2000:] or state["seen"]
        state["since"] = int(time.time())
        save("sales.json", state)
        if first_run or not new:
            return
        log.info("sales: %d new paid, largest %.0f", len(new), max(e["amount"] for e in new))
        line = sale_line(new)
        hour = dt.datetime.now().hour
        if line and 8 <= hour < 22 and time.time() - self.last_sale_line >= SALE_PING_GAP_S:
            self.last_sale_line = time.time()
            self.brain.announce(line, leds=(0, 200, 60), source="sale")

    # -- video milestones ----------------------------------------------------

    def _youtube(self, path: str, token: str, **params) -> dict:
        url = f"https://www.googleapis.com/youtube/v3/{path}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)

    def _youtube_token(self) -> str | None:
        """Use only an access token supplied in this application's environment."""
        return os.environ.get("YOUTUBE_ACCESS_TOKEN") or None

    def recent_videos(self) -> list[dict]:
        token = self._youtube_token()
        if not token:
            return []
        chan = self._youtube("channels", token, part="contentDetails", mine="true")
        uploads = chan["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        items = self._youtube("playlistItems", token, part="contentDetails", playlistId=uploads, maxResults=8)["items"]
        ids = ",".join(i["contentDetails"]["videoId"] for i in items)
        vids = self._youtube("videos", token, part="snippet,statistics", id=ids)["items"]
        return [{"id": v["id"], "title": v["snippet"]["title"], "views": int(v["statistics"].get("viewCount", 0)),
                 "published": v["snippet"]["publishedAt"]} for v in vids]

    def check_videos(self) -> None:
        seen = load("videos.json", {})
        videos = self.recent_videos()
        for v in videos:
            before = seen.get(v["id"])
            seen[v["id"]] = v["views"]
            age_days = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(v["published"].replace("Z", "+00:00"))).days
            if before is None or age_days > 21:
                continue  # first sighting only records the count
            hit = crossed(before, v["views"])
            if hit:
                log.info("milestone: %s passed %d", v["id"], hit)
                self.brain.announce(f"Yo, {v['title'][:70]} just passed {spoken_number(hit)} views. 😄",
                                    leds=(255, 0, 80), source="milestone")
        if videos:
            save("videos.json", seen)

    # -- at the desk ----------------------------------------------------------

    def check_coach(self) -> None:
        senses = self.brain.senses
        hour = dt.datetime.now().hour
        since = getattr(senses, "present_since", 0)
        if not since or not 9 <= hour < 20:
            return
        if time.time() - since >= COACH_AFTER_S and time.time() - self.last_coach >= COACH_AFTER_S:
            self.last_coach = time.time()
            self.brain.announce("You've been at it two hours straight. Stand up, stretch, then back to it.", source="coach")

    async def morning_brief(self) -> str | None:
        """The first greeting of the day: meetings, overnight sales, unread mail.
        Counts only; the owner can ask for the details."""
        if not ENABLED["morning"] or skills.filming():
            return None
        today = dt.date.today().isoformat()
        state = load("morning.json", {})
        hour = dt.datetime.now().hour
        if state.get("day") == today or not 5 <= hour < 12:
            return None
        save("morning.json", {"day": today})
        env = {**os.environ, "PATH": f"{Path.home()}/.local/bin:{Path.home()}/.codex/bin:/opt/homebrew/bin:/usr/bin:/bin"}

        async def run(*argv: str) -> str:
            proc = await asyncio.create_subprocess_exec(*argv, stdout=asyncio.subprocess.PIPE,
                                                        stderr=asyncio.subprocess.DEVNULL, env=env)
            out, _ = await asyncio.wait_for(proc.communicate(), timeout=60)
            return out.decode(errors="replace")

        parts = ["Morning, the owner."]
        try:
            cal, mail = await asyncio.gather(run(skills.GTOOL, "calendar", "all", "1", "--json"),
                                             run(skills.GTOOL, "inbox", "all", "in:inbox is:unread newer_than:1d", "20"))
            end = dt.datetime.now(skills.TZ).replace(hour=23, minute=59)
            events = [e for e in json.loads(cal or "[]") if dt.datetime.fromisoformat(e["start"]).astimezone(skills.TZ) <= end]
            if events:
                first = dt.datetime.fromisoformat(events[0]["start"]).astimezone(skills.TZ).strftime("%I:%M %p").lstrip("0")
                parts.append(f"{len(events)} meeting{'s' if len(events) != 1 else ''} today, first at {first}.")
            else:
                parts.append("No meetings today.")
            unread = sum(1 for ln in mail.splitlines() if ln.startswith("- id="))
            if unread:
                parts.append(f"{unread}{' or more' if unread >= 20 else ''} unread emails since yesterday.")
        except Exception as exc:
            log.warning("morning brief: %s", exc)
        sales = load("sales.json", {}).get("today", {})
        if sales.get("count"):
            parts.append(f"{sales['count']} paid sales so far today.")
        return " ".join(parts)
