"""Speech queue for Lil Token: say sentences as they are written.

``say`` synthesises a whole reply, then plays it, and every call waits its
turn in the HTTP command queue. That is fine for one line. For an answer
that is still being written it means silence until the last word exists.

The speaker takes lines one at a time (``say_push``) and returns at once:

* synthesis of each line starts the moment it is pushed, so line 2 is
  ready before line 1 has finished playing;
* lines play strictly in the order they were pushed;
* lines that arrive close together play in one TTS session with no gap,
  through :func:`stackchan_mcp.tts.orchestrator.send_pcm_stream`;
* engines that offer ``synthesize_stream`` (Fish Audio) start playing
  before the line has finished synthesising.

``say_wait`` blocks until everything pushed so far has been spoken.

The robot handles one command at a time, and a face-set download blocks it
for seconds. Playback therefore holds the same gate as the HTTP command
queue (:func:`device_gate`), so speech and other device commands never
overlap, exactly as with ``say``.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from collections import deque
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, AsyncIterator

from .tts import orchestrator
from .tts.base import get_registry
from .tts.emoji_expression import detect_emoji_face, strip_emoji_for_plain_tts

if TYPE_CHECKING:  # pragma: no cover
    from .gateway import Gateway

logger = logging.getLogger(__name__)

#: How long a session stays open waiting for the next line before it ends.
LINGER_S = float(os.environ.get("STACKCHAN_SPEAKER_LINGER_S", "0.35"))
#: Audio buffered before a streamed line starts playing (rides out jitter).
PREROLL_BYTES = int(os.environ.get("STACKCHAN_SPEAKER_PREROLL_MS", "180")) * 32  # 16 kHz, 16-bit
_END = object()


def device_gate(gateway: Any) -> asyncio.Lock:
    """The lock that keeps device commands and speech from overlapping."""
    gate = getattr(gateway, "_device_gate", None)
    if gate is None:
        gate = asyncio.Lock()
        gateway._device_gate = gate
    return gate


@dataclass
class _Line:
    text: str            # as pushed (may carry a face emoji)
    tts_text: str        # what the engine is asked to say
    face: str | None
    pushed_at: float
    chunks: asyncio.Queue = field(default_factory=asyncio.Queue)
    task: asyncio.Task | None = None
    first_byte_s: float | None = None
    played_at: float | None = None
    error: str | None = None


class Speaker:
    def __init__(self, gateway: "Gateway") -> None:
        self.gateway = gateway
        self.fifo: deque[_Line] = deque()
        self.more = asyncio.Event()
        self.idle = asyncio.Event()
        self.idle.set()
        self.worker: asyncio.Task | None = None
        self.report: list[dict] = []  # lines finished since the last say_wait
        self.cut = False  # stop() was called: end the session now

    # -- public -------------------------------------------------------------

    def push(self, arguments: dict[str, Any]) -> dict[str, Any]:
        text = arguments.get("text", "")
        if not isinstance(text, str) or not text.strip():
            raise ValueError("'text' is required and must be a non-empty string")
        voice = arguments.get("voice") or orchestrator._resolve_default_engine()
        engine = get_registry().get(voice)
        if engine is None:
            raise NotImplementedError(f"TTS engine '{voice}' is not registered.")
        if not self.gateway.esp32.device_connected:
            raise RuntimeError("No ESP32 device connected; cannot deliver audio.")

        tts_text = text if getattr(engine, "supports_emoji_style", False) else strip_emoji_for_plain_tts(text)
        line = _Line(text=text, tts_text=tts_text.strip(), face=detect_emoji_face(text), pushed_at=time.monotonic())
        opts = {k: arguments.get(k) for k in ("speaker_id", "speaker_name", "reference_audio")}
        if line.tts_text:
            line.task = asyncio.create_task(self._synthesise(engine, line, opts))
        else:
            line.chunks.put_nowait(_END)  # emoji only: just the face
        self.fifo.append(line)
        self.idle.clear()
        self.more.set()
        if self.worker is None or self.worker.done():
            self.worker = asyncio.create_task(self._run())
        return {"queued": len(self.fifo), "text": text, "face": line.face}

    def stop(self) -> dict[str, Any]:
        """Stop talking now: drop every queued line and end the session.

        Frames are sent at playback speed, so the robot goes quiet within a
        fraction of a second. Used when the owner pats or taps it mid-sentence.
        """
        dropped = len(self.fifo)
        for line in self.fifo:
            if line.task is not None:
                line.task.cancel()
            line.chunks.put_nowait(_END)  # wake the player if it is waiting on this line
        self.cut = dropped > 0
        self.more.set()
        logger.info("speaker: stopped, %d line(s) dropped", dropped)
        return {"stopped": dropped}

    async def wait(self, timeout: float = 120.0) -> dict[str, Any]:
        """Block until every pushed line has been spoken."""
        try:
            await asyncio.wait_for(self.idle.wait(), timeout=timeout)
            done = True
        except asyncio.TimeoutError:
            done = False
        lines, self.report = self.report, []
        return {"done": done, "lines": lines}

    # -- synthesis (starts at push time) ------------------------------------

    async def _synthesise(self, engine: Any, line: _Line, opts: dict[str, Any]) -> None:
        try:
            stream = getattr(engine, "synthesize_stream", None)
            if stream is not None:
                async for chunk in stream(line.tts_text, **opts):
                    if chunk:
                        if line.first_byte_s is None:
                            line.first_byte_s = time.monotonic() - line.pushed_at
                        line.chunks.put_nowait(chunk)
            else:
                pcm = await engine.synthesize(line.tts_text, **opts)
                line.first_byte_s = time.monotonic() - line.pushed_at
                if pcm:
                    line.chunks.put_nowait(pcm)
        except Exception as exc:  # one bad line must not silence the rest
            line.error = str(exc)
            logger.warning("speaker: synthesis failed for %r: %s", line.text[:60], exc)
        finally:
            line.chunks.put_nowait(_END)

    # -- playback -----------------------------------------------------------

    async def _run(self) -> None:
        try:
            while self.fifo:
                async with device_gate(self.gateway):
                    last_face = await self._play_session()
                if last_face is not None:
                    # The firmware drops back to idle on TTS stop; put the face back.
                    await asyncio.sleep(orchestrator.TTS_STOP_FACE_REDISPATCH_SETTLE_DELAY_S)
                    await orchestrator._try_set_avatar_face_with_tts_lock(self.gateway, last_face)
        except Exception as exc:
            logger.warning("speaker: playback stopped: %s", exc)
            while self.fifo:  # nothing left half-queued behind a dead device
                line = self.fifo.popleft()
                if line.task is not None:
                    line.task.cancel()
                self.report.append({"text": line.text, "error": str(exc)})
        finally:
            self.idle.set()

    async def _play_session(self) -> str | None:
        faces: list[str] = []
        result = await orchestrator.send_pcm_stream(self.gateway, self._pcm(faces), source_label="speaker")
        logger.info("speaker: session done frames=%s duration_ms=%s", result.get("frame_count"), result.get("duration_ms"))
        return faces[-1] if faces else None

    async def _next_line(self) -> _Line | None:
        if not self.fifo:
            self.more.clear()
            try:
                await asyncio.wait_for(self.more.wait(), timeout=LINGER_S)
            except asyncio.TimeoutError:
                return None
        return self.fifo[0] if self.fifo else None

    async def _pcm(self, faces: list[str]) -> AsyncIterator[bytes]:
        """One TTS session: every queued line, in order, then a short linger."""
        while True:
            if self.cut:
                self._drop_all()
                return
            line = await self._next_line()
            if line is None:
                return
            if line.face is not None:
                faces.append(line.face)
                await orchestrator._try_set_avatar_face(self.gateway, line.face)
            held = bytearray()
            started = False
            sent = 0
            while True:
                chunk = await line.chunks.get()
                if self.cut:
                    self._drop_all()
                    return
                if chunk is _END:
                    break
                if not started:
                    held.extend(chunk)
                    if len(held) < PREROLL_BYTES:
                        continue
                    chunk, started = bytes(held), True
                    self._mark_playing(line)
                sent += len(chunk)
                yield chunk
            if not started and held:  # a line shorter than the pre-roll
                self._mark_playing(line)
                sent += len(held)
                yield bytes(held)
            if sent % 2:  # keep the next line on a 16-bit sample boundary
                yield b"\x00"
            self.fifo.popleft()
            entry = {"text": line.text}
            if line.error:
                entry["error"] = line.error
            if line.played_at is not None:
                entry["wait_ms"] = round((line.played_at - line.pushed_at) * 1000)
            self.report.append(entry)

    def _drop_all(self) -> None:
        while self.fifo:
            line = self.fifo.popleft()
            self.report.append({"text": line.text, "error": "stopped"})
        self.cut = False

    def _mark_playing(self, line: _Line) -> None:
        line.played_at = time.monotonic()
        logger.info("speaker: playing text=%r (%.2f s after push, first audio from engine at %.2f s)",
                    line.text[:60], line.played_at - line.pushed_at, line.first_byte_s or 0.0)


def get_speaker(gateway: Any) -> Speaker:
    speaker = getattr(gateway, "_speaker", None)
    if speaker is None:
        speaker = Speaker(gateway)
        gateway._speaker = speaker
    return speaker
