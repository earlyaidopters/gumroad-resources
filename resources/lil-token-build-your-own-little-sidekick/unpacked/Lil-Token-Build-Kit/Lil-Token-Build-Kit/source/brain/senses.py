"""Lil Token's body senses: head touch, motion, hand wave, presence, dance.

Robot events arrive from the gateway at the brain's /event endpoint
({"event": "robot", "event_type": ..., "subtype": ...}):

- touch/tap (head pat) and proximity/wave: like the wake phrase. During a
  conversation they mean "I'm talking" (Lil Token says "Yeah?").
- touch/stroke: ends a conversation; when idle, a cute reaction.
- motion/picked_up, put_down, shake, tipped, upright: a short spoken
  reaction, only when idle, rate limited.

Presence: while idle (and outside quiet hours) the robot takes a photo
every PRESENCE_EVERY_S, the Mac looks for a face with OpenCV YuNet (local, no
upload; brain/models/face_detection_yunet_2023mar.onnx from opencv_zoo), and Lil Token greets the owner when he shows up after being away for
PRESENCE_AWAY_S. Presence photos are deleted right after the check.

Dance: gateway beat mode (head sway and LED flashes on the music's beat)
for DANCE_S seconds or until a head stroke.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
import os
import random
import time
from pathlib import Path

log = logging.getLogger("liltoken.senses")

PRESENCE_EVERY_S = int(os.environ.get("LILTOKEN_PRESENCE_EVERY_S", "20"))
PRESENCE_AWAY_S = int(os.environ.get("LILTOKEN_PRESENCE_AWAY_S", "600"))
GREET_COOLDOWN_S = int(os.environ.get("LILTOKEN_GREET_COOLDOWN_S", "1800"))
YUNET = Path(__file__).with_name("models") / "face_detection_yunet_2023mar.onnx"
DANCE_S = int(os.environ.get("LILTOKEN_DANCE_S", "45"))

# Each line carries a voice direction for Fish Audio's drama-3: a bracketed cue
# before the words, written the way you would brief a voice actor. The cue is
# sent with the line and never spoken. Cues stay short so the directed line
# still fits the gateway's 60 character speech cache and a reaction plays at
# once. LILTOKEN_VOICE_DIRECTIONS=0 sends the plain lines again.
VOICE_DIRECTIONS = os.environ.get("LILTOKEN_VOICE_DIRECTIONS", "1") != "0"

REACTIONS = {
    ("touch", "stroke"): ("happy", [
        ("giggling", "Hehe, that tickles."),
        ("warm, touched", "Aww, thanks boss."),
        ("blissful", "Ooh, head rubs. Five stars."),
    ]),
    ("motion", "picked_up"): ("surprised", [
        ("startled", "Whoa, where are we going?"),
        ("excited, nervous", "Up we go! Careful with the merch."),
        ("startled, thrilled", "Hey, I'm airborne!"),
    ]),
    ("motion", "put_down"): ("happy", [
        ("relieved", "Thanks for the ride."),
        ("cool, relieved", "Smooth landing."),
        ("relieved sigh", "Back on solid ground."),
    ]),
    ("motion", "shake"): ("embarrassed", [
        ("dizzy, protesting", "Hey! Easy, I'm getting dizzy."),
        ("alarmed", "Whoa whoa, my circuits!"),
        ("flustered, fast", "Okay okay, I'm awake!"),
    ]),
    ("motion", "tipped"): ("sad", [
        ("sheepish, pleading", "Uh oh, I fell over. Little help?"),
        ("dramatic, then deadpan", "Man down! Well, robot down."),
    ]),
    ("motion", "upright"): ("happy", [
        ("relieved, grateful", "Much better, thank you."),
        ("proud", "Back on my feet."),
    ]),
}


def directed(cue: str, line: str, on: bool | None = None) -> str:
    """The line as sent to the voice: "[cue] line", or the plain line when
    directions are off or there is no cue."""
    on = VOICE_DIRECTIONS if on is None else on
    return f"[{cue}] {line}" if on and cue else line


class Senses:
    def __init__(self, brain) -> None:
        self.brain = brain
        self.last_reaction: dict[tuple, float] = {}
        self.last_seen = 0.0
        self.present_since = 0.0  # start of the current unbroken stretch at the desk
        self.last_absent_start = time.time()
        self.last_greet = 0.0
        self._cascade = None

    # -- events -----------------------------------------------------------

    async def on_robot_event(self, ev: dict) -> None:
        kind = (ev.get("event_type"), ev.get("subtype"))
        log.info("robot event %s/%s", *kind)
        if kind in (("touch", "tap"), ("proximity", "wave")):
            if time.time() - self.last_reaction.get(("pat",), 0) < 2.5:
                return  # one pat, not three
            if kind == ("proximity", "wave") and not self.brain.busy.locked():
                # Hands move near the robot all the time (13:38 on a call): a
                # wave stops a dance or interrupts, but never starts a chat.
                log.info("wave ignored while idle")
                return
            self.last_reaction[("pat",)] = time.time()
            if not self.brain.start_turn({"event": "wake", "wake_word": f"head {kind[1]}", "question": ""}):
                # Mid-conversation: stop talking at once, then "Yeah?".
                await self.brain.interrupt()
                await self.brain.utterances.put({"event": "wake", "wake_word": kind[1]})
            return
        if kind == ("touch", "stroke") and self.brain.busy.locked():
            await self.brain.utterances.put({"event": "stroke"})
            return
        if kind in REACTIONS and not self.brain.busy.locked():
            if time.time() - self.last_reaction.get(kind, 0) < 20:
                return
            self.last_reaction[kind] = time.time()
            face, lines = REACTIONS[kind]
            cue, line = random.choice(lines)
            await self.brain.quick_say(directed(cue, line), face)

    # -- presence ---------------------------------------------------------

    def detect(self, path: str):
        """Faces in a photo, as YuNet rows (x, y, w, h, landmarks..., score),
        or None. Local OpenCV; on the robot's own photos it found the owner in 9
        of 10 face shots and 0 of 20 empty-room shots."""
        import cv2

        img = cv2.imread(path)
        if img is None:
            return None
        self.last_size = (img.shape[1], img.shape[0])  # eye contact scales by this
        if self._cascade is None:
            self._cascade = cv2.FaceDetectorYN.create(str(YUNET), "", (img.shape[1], img.shape[0]), 0.7, 0.3, 50)
        self._cascade.setInputSize((img.shape[1], img.shape[0]))
        _, faces = self._cascade.detect(img)
        return faces

    def _faces(self, path: str) -> int:
        faces = self.detect(path)
        return 0 if faces is None else len(faces)

    async def presence_loop(self) -> None:
        await asyncio.sleep(30)
        while True:
            await asyncio.sleep(PRESENCE_EVERY_S)
            now_local = dt.datetime.now()
            if now_local.hour >= 22 or now_local.hour < 8 or self.brain.busy.locked():
                continue
            try:
                path = await self.brain.quiet_photo()
            except Exception as exc:
                log.debug("presence photo failed: %s", exc)
                continue
            if not path:
                continue
            try:
                n = await asyncio.to_thread(self._faces, path)
            except Exception as exc:
                # Never let one bad check (e.g. cv2 mid-reinstall) end the loop.
                log.warning("presence check failed: %s", exc)
                n = 0
            finally:
                try:
                    Path(path).unlink()
                except OSError:
                    pass
            now = time.time()
            if n:
                away = now - self.last_seen if self.last_seen else now - self.last_absent_start
                if not self.present_since or away > 300:
                    self.present_since = now  # a gap of five minutes counts as a break
                self.last_seen = now
                if away >= PRESENCE_AWAY_S and now - self.last_greet >= GREET_COOLDOWN_S \
                        and not self.brain.busy.locked():
                    self.last_greet = now
                    log.info("presence: the owner back after %.0f s", away)
                    asyncio.create_task(self.brain.greet())
