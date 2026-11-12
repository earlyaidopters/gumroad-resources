"""Small signs of life: looking at the owner while he talks, and not sitting frozen.

Eye contact. During a conversation the robot takes a quiet photo about once
a second, finds the nearest face with the same local detector the presence
check uses (OpenCV YuNet, nothing leaves the Mac), and turns its head toward
it. It holds still while it speaks (speech and photos share one line to the
robot) and while the camera tool is in use.

Idle life. When someone is at the desk and nothing is going on, the head
drifts a few degrees every so often and now and then glances aside. Never in
quiet hours, never mid-conversation.

Camera geometry was measured on the robot on 9 November 2026 by moving the
head a known angle and correlating the two photos: about 6.1 pixels per
degree of yaw and 7.2 per degree of pitch at 320x240. Turning right (yaw up)
moves the picture left; looking up (pitch up) moves it down.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
import os
import random
import time
from pathlib import Path

log = logging.getLogger("liltoken.life")

EYE_CONTACT = os.environ.get("LILTOKEN_EYE_CONTACT", "0") == "1"
IDLE_LIFE = os.environ.get("LILTOKEN_IDLE_LIFE", "1") == "1"
PX_PER_DEG_YAW = 6.1
PX_PER_DEG_PITCH = 7.2
AIM = (160, 105)       # where the face should sit in the 320x240 photo
GAIN = 0.6             # fraction of the error corrected per step (the scale is approximate)
DEADBAND_DEG = 4.0     # smaller errors are left alone, so it does not twitch
MAX_STEP_DEG = 14.0
YAW_LIMIT = 60
PITCH_MIN, PITCH_MAX = 8, 55
LISTEN_POSE = (0, 22)  # roughly level, toward someone sitting at the desk
REST_POSE = (0, 44)


def aim_step(face_cx: float, face_cy: float, yaw: float, pitch: float) -> tuple[int, int] | None:
    """New (yaw, pitch) that turns the head toward a face at this pixel, or
    None when it is already close enough."""
    err_yaw = (face_cx - AIM[0]) / PX_PER_DEG_YAW
    err_pitch = (AIM[1] - face_cy) / PX_PER_DEG_PITCH
    if abs(err_yaw) < DEADBAND_DEG and abs(err_pitch) < DEADBAND_DEG:
        return None
    step_yaw = max(-MAX_STEP_DEG, min(MAX_STEP_DEG, err_yaw * GAIN))
    step_pitch = max(-MAX_STEP_DEG, min(MAX_STEP_DEG, err_pitch * GAIN))
    new_yaw = max(-YAW_LIMIT, min(YAW_LIMIT, yaw + step_yaw))
    new_pitch = max(PITCH_MIN, min(PITCH_MAX, pitch + step_pitch))
    return round(new_yaw), round(new_pitch)


def largest_face(faces) -> tuple[float, float] | None:
    """Centre of the biggest face YuNet found (rows of x, y, w, h, ...)."""
    if faces is None or len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])[:4]
    return float(x + w / 2), float(y + h / 2)


class Life:
    def __init__(self, brain) -> None:
        self.brain = brain
        self.pose = list(REST_POSE)
        self.hold_until = 0.0      # eye contact stands down (camera tool, head tool)
        self.tracking: asyncio.Task | None = None
        self.looks = 0             # photos taken for eye contact this conversation
        self.turns = 0             # head moves made for eye contact this conversation

    def hold(self, seconds: float) -> None:
        """Leave the head and camera alone for a while."""
        self.hold_until = max(self.hold_until, time.monotonic() + seconds)

    # -- eye contact ----------------------------------------------------------

    def start_tracking(self, mcp) -> None:
        if not EYE_CONTACT or (self.tracking is not None and not self.tracking.done()):
            return
        self.looks = self.turns = 0
        self.tracking = asyncio.create_task(self._track(mcp))

    async def stop_tracking(self) -> None:
        task, self.tracking = self.tracking, None
        if task is not None:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
            log.info("eye contact: %d looks, %d head turns", self.looks, self.turns)

    async def _track(self, mcp) -> None:
        brain = self.brain
        try:
            await brain.call(mcp, "move_head", yaw=LISTEN_POSE[0], pitch=LISTEN_POSE[1], speed="mid")
            self.pose = list(LISTEN_POSE)
            while True:
                await asyncio.sleep(0.6)
                # Only while listening. A photo takes the robot about a second,
                # and the first words of an answer would wait behind it.
                if brain.speaking or brain.answering or time.monotonic() < self.hold_until:
                    continue
                photo = await brain.call(mcp, "take_photo", question="eye contact")
                path = photo.get("image_path", "")
                if not path:
                    continue
                self.looks += 1
                try:
                    faces = await asyncio.to_thread(brain.senses.detect, path)
                finally:
                    try:
                        Path(path).unlink()
                    except OSError:
                        pass
                centre = largest_face(faces)
                if centre is None or brain.speaking or brain.answering or time.monotonic() < self.hold_until:
                    continue
                # The maths is in 320x240 terms; firmware 19 took 640x480 photos, so scale.
                width, height = getattr(brain.senses, "last_size", (320, 240))
                centre = (centre[0] * 320 / width, centre[1] * 240 / height)
                target = aim_step(centre[0], centre[1], self.pose[0], self.pose[1])
                if target is not None:
                    await brain.call(mcp, "move_head", yaw=target[0], pitch=target[1], speed="mid")
                    self.pose = list(target)
                    self.turns += 1
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.debug("eye contact stopped: %s", exc)

    # -- idle life ------------------------------------------------------------

    async def idle_loop(self) -> None:
        await asyncio.sleep(45)
        next_move = time.monotonic() + random.uniform(15, 30)
        drifted = False
        while True:
            await asyncio.sleep(1.0)
            brain = self.brain
            hour = dt.datetime.now().hour
            someone_here = time.time() - brain.senses.last_seen < 180
            if not IDLE_LIFE or brain.engaged() or brain.faces_loading or not 8 <= hour < 22:
                next_move = time.monotonic() + random.uniform(15, 30)
                continue
            if not someone_here:
                if drifted:  # nobody to perform for: settle back
                    drifted = False
                    await self._move(*REST_POSE, speed="low")
                continue
            if time.monotonic() < next_move:
                continue
            next_move = time.monotonic() + random.uniform(14, 38)
            try:
                if random.random() < 0.15:
                    side = random.choice((-1, 1)) * random.randint(18, 28)   # a glance aside
                    await self._move(side, REST_POSE[1] - 8, speed="mid")
                    await asyncio.sleep(random.uniform(1.0, 1.8))
                    if not brain.engaged():
                        await self._move(random.randint(-4, 4), REST_POSE[1], speed="low")
                else:
                    await self._move(random.randint(-9, 9), REST_POSE[1] + random.randint(-6, 3), speed="low")
                drifted = True
            except Exception as exc:
                log.debug("idle move: %s", exc)

    async def _move(self, yaw: int, pitch: int, speed: str) -> None:
        if self.brain.engaged():
            return
        await self.brain.with_robot(lambda mcp: self.brain.call(mcp, "move_head", yaw=yaw, pitch=pitch, speed=speed))
        self.pose = [yaw, pitch]
