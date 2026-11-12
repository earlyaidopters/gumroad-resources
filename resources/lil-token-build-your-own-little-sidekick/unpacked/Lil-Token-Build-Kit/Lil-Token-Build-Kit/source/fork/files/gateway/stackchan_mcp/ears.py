"""Always-on ears for Lil Token (Mac-side wake word and utterances).

The robot's on-chip MultiNet wake word is too weak for a custom English
phrase. Instead the gateway keeps the device microphone open whenever the
robot is not talking (``listen.start`` with ``quiet`` so the firmware skips
its popup), cuts the incoming AFE-processed audio into utterances with a
simple energy endpointer, transcribes each one locally with faster-whisper
(Silero VAD filter on, so room noise does not turn into words), and POSTs
every utterance to the brain:

    {"event": "utterance", "text": ..., "wake": bool, "question": ...,
     "speech_ms": ..., "ts": ...}

``wake`` is true when the text contains "hey lil token" (or a near
spelling); ``question`` is whatever followed it. Nothing leaves the Mac
here: ambient speech is transcribed locally and the brain discards
utterances that are not part of a conversation.

The ears stand down while the TTS/listen lock is held (the robot is
speaking or an MCP ``listen()`` owns the mic) and re-open the mic a moment
after it is released. A device-side ``listen.stop`` while the ears own the
mic means the screen was tapped, which is reported as a wake.

Enable with STACKCHAN_EARS=1 and STACKCHAN_EARS_HOOK_URL (the brain's
/utterance endpoint). Tunables: STACKCHAN_EARS_MODEL (default small.en),
STACKCHAN_EARS_END_SILENCE_MS (800), STACKCHAN_EARS_MARGIN_DB (8),
STACKCHAN_EARS_MIN_DBFS (-50).
"""

from __future__ import annotations

import array
from pathlib import Path
import wave
import asyncio
import logging
import math
import os
import re
import time
from collections import deque
from typing import TYPE_CHECKING, Any

import aiohttp

from .audio_stream import is_recording, recording_owner, start_recording, stop_recording_if_owner
from .stt.audio_utils import DEVICE_SAMPLE_RATE, StreamingOpusDecoder

if TYPE_CHECKING:  # pragma: no cover
    from .gateway import Gateway

logger = logging.getLogger(__name__)

OWNER = "ears"
WAKE_MIN_LOGPROB = float(os.environ.get("STACKCHAN_EARS_WAKE_MIN_LOGPROB", "-0.8"))
WIN_MS = 30
WAKE_CORE = re.compile(r"(?i)\b(lil|little|li'?l|lill|lyl)[\s'.,-]*(token|tokin|tokken|tolken|toking|tolkien|tokens)\b|\bliltoken\b")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


THIRD_PERSON = re.compile(
    r"(?i)^\s+(is|was|has|had|does|did|can|could|will|would|should|might|must|"
    r"isn'?t|doesn'?t|won'?t|can'?t|and|or|\w+(s|ed))\b"
)
LEAD_OK = re.compile(r"(?i)^\W*((hey|hi|yo|okay|ok|hello|so|um|uh|oh|and|alright|yeah)\W+){0,3}$")


GREETINGS = {"hey", "hi", "yo", "okay", "ok", "hay", "a", "hello", "ay", "eh", "hei", "heya", "oi"}
FILLERS = GREETINGS | {"so", "um", "uh", "oh", "and", "alright", "yeah", "hmm", "you"}  # "hey, you little token"
NAME_FORMS = ("lil token", "little token", "liltoken", "lil tokin", "little tokin")


def fuzzy_wake(text: str) -> tuple[bool, str]:
    """Forgiving match for "Hey Lil Token" when Whisper mangles the name
    ("hey little talking", "hey lil tokin", "a little toke"). The name has
    to sit right after the opening fillers; returns (wake, remainder)."""
    import difflib

    words = re.findall(r"[a-z']+", text.lower())
    i = 0
    greeted = False
    while i < len(words) and i < 3 and words[i].strip("'") in FILLERS:
        greeted = greeted or words[i].strip("'") in GREETINGS
        i += 1
    best, used = 0.0, 0
    for n in (1, 2, 3):
        cand = " ".join(w.strip("'") for w in words[i:i + n])
        if not cand or not cand.startswith(("l", "t")):
            continue
        for form in NAME_FORMS:
            r = difflib.SequenceMatcher(None, cand, form).ratio()
            if r > best:
                best, used = r, n
    # "a" is Whisper's usual spelling of "hey", but also plain English ("a
    # little bit"): only a real greeting word earns the lenient match.
    strong = any(w.strip("'") in GREETINGS - {"a"} for w in words[:i])
    if best >= (0.72 if greeted else 0.86) and not strong and used >= 2:
        # No "hey": the second word itself must sound like "token".
        # ("little tiny things..." scored 0.87 against "little tokin".)
        import difflib as _d
        second = words[i + 1].strip("'") if i + 1 < len(words) else ""
        if max(_d.SequenceMatcher(None, second, f).ratio() for f in ("token", "tokin", "tokens")) < 0.75:
            return False, text
    if best >= (0.72 if greeted else 0.86):
        # Drop the matched words from the original text for the remainder.
        tokens = re.findall(r"\S+", text)
        rest = " ".join(tokens[i + used:])
        return True, re.sub(r"^[\s,.!?:;-]+", "", rest).strip()
    return False, text


def split_wake(text: str) -> tuple[bool, str]:
    """Return (wake, remainder after the wake phrase).

    Only counts when Lil Token is addressed: the name has to come first,
    after at most a few filler words ("hey", "okay", "um"). Mentioning it
    mid-sentence ("Lil Token looks for these topics...") is not a wake.
    """
    m = WAKE_CORE.search(text)
    if not m or not LEAD_OK.match(text[: m.start()]):
        return fuzzy_wake(text)
    greeted = re.search(r"(?i)\b(hey|hi|yo|okay|ok|hello)\b", text[: m.start()])
    if not greeted and THIRD_PERSON.match(text[m.end():]):
        # "Lil Token looks for...", "Lil Token is great": talked about, not to.
        return False, text
    start = m.start()
    pre = re.search(r"(?i)\b(hey|hi|yo|okay|ok|hello)[\s,.!]*$", text[:start])
    rest = text[m.end():]
    rest = re.sub(r"^[\s,.!?:;-]+", "", rest)
    lead = text[: pre.start() if pre else start].strip(" ,.!?")
    return True, (lead + " " + rest).strip() if lead and len(lead.split()) > 2 else rest.strip()


def split_wake_anywhere(text: str) -> tuple[bool, str]:
    """With music on, segments are long and lyrics come first, so look for
    an addressed wake at every sentence start and every greeting word."""
    starts = {0}
    starts.update(m.end() for m in re.finditer(r"[.!?]\s+", text))
    starts.update(m.start() for m in re.finditer(r"(?i)\b(hey|hi|yo|okay|ok)\b", text))
    for i in sorted(starts):
        wake, rest = split_wake(text[i:])
        if wake:
            return True, rest
    return False, text


# Spoken "stop" while Lil Token dances. Song lyrics say "don't stop" and
# "can't stop" a lot, so those never count, and a bare "stop" / "enough"
# must be (almost) the whole utterance.
DANCE_STOP_ANY = re.compile(r"\b((stop|stopped|not|done|quit) (the )?danc\w*|(that'?s|ok(ay)?) enough|enough danc\w*|quit danc\w*|end the dance)\b")
DANCE_STOP_SHORT = re.compile(r"\b(stop|enough|chill|freeze|halt)\b")
DANCE_STOP_NOT = re.compile(r"\b(don'?t|can'?t|won'?t|never|not|ain'?t) stop\b")


DANCE_DEBUG = Path.home() / ".stackchan-mcp" / "dance_debug"
DANCE_LISTEN_OFF = Path.home() / ".stackchan-mcp" / "dance_listen_off"  # A/B switch


def is_dance_stop(text: str) -> bool:
    t = re.sub(r"[^a-z' ]", " ", text.lower())
    t = re.sub(r"\s+", " ", t).strip()
    if not t or DANCE_STOP_NOT.search(t):
        return False
    if DANCE_STOP_ANY.search(t):
        return True
    _, rest = split_wake(t)
    rest = (rest or t).strip()
    # Short is <= 5 words: Whisper hears "Lil Token, stop" as "May the token stop".
    return len(rest.split()) <= 5 and bool(DANCE_STOP_SHORT.search(rest))


class Segmenter:
    """Energy endpointer over 16-bit mono PCM in 30 ms windows."""

    def __init__(self) -> None:
        self.win = DEVICE_SAMPLE_RATE * WIN_MS // 1000
        self.end_silence = _env_int("STACKCHAN_EARS_END_SILENCE_MS", 800)
        self.margin = _env_int("STACKCHAN_EARS_MARGIN_DB", 8)
        self.min_dbfs = float(_env_int("STACKCHAN_EARS_MIN_DBFS", -50))
        self.max_ms = _env_int("STACKCHAN_EARS_MAX_MS", 15000)
        self.buf = array.array("h")
        self.preroll: deque[array.array] = deque(maxlen=10)  # 300 ms
        self.floor: float | None = None
        self.in_speech = False
        self.speech_run = 0
        self.silence_run = 0
        self.speech_ms = 0
        self.utt = array.array("h")

    def feed(self, pcm: bytes) -> list[tuple[bytes, int]]:
        out: list[tuple[bytes, int]] = []
        self.buf.frombytes(pcm[: len(pcm) - len(pcm) % 2])
        while len(self.buf) >= self.win:
            w = self.buf[: self.win]
            del self.buf[: self.win]
            ms = sum(v * v for v in w) / self.win
            lv = 20 * math.log10(math.sqrt(ms) / 32768.0) if ms > 0 else -120.0
            if self.floor is None:
                self.floor = lv
            elif lv < self.floor:
                self.floor = self.floor * 0.9 + lv * 0.1
            elif not self.in_speech:
                self.floor += (lv - self.floor) * 0.01
            loud = lv >= max(self.min_dbfs, self.floor + self.margin)
            if not self.in_speech:
                self.preroll.append(w)
                self.speech_run = self.speech_run + WIN_MS if loud else 0
                if self.speech_run >= 90:
                    self.in_speech = True
                    self.utt = array.array("h")
                    for p in self.preroll:
                        self.utt.extend(p)
                    self.preroll.clear()
                    self.silence_run = 0
                    self.speech_ms = self.speech_run
                continue
            self.utt.extend(w)
            if loud:
                self.silence_run = 0
                self.speech_ms += WIN_MS
            else:
                self.silence_run += WIN_MS
            if self.silence_run >= self.end_silence or len(self.utt) * 1000 // DEVICE_SAMPLE_RATE >= self.max_ms:
                out.append((self.utt.tobytes(), self.speech_ms))
                self.in_speech = False
                self.speech_run = 0
                self.utt = array.array("h")
        return out


class MusicDetector:
    """Music has a steady beat; speech does not. Keeps ~10 s of 30 ms
    energy frames, takes the onset envelope, and looks for a strong,
    consistent autocorrelation peak between 70 and 160 BPM with sound
    present most of the time. Fires at most once per cooldown."""

    def __init__(self) -> None:
        self.win = DEVICE_SAMPLE_RATE * WIN_MS // 1000
        self.buf = array.array("h")
        self.env: deque[float] = deque(maxlen=334)  # ~10 s of 30 ms frames
        self.hits = 0
        self.bpm = 0.0
        self.score = 0.0
        self.min_score = float(os.environ.get("STACKCHAN_MUSIC_MIN_SCORE", "0.22"))
        self.last_fire = 0.0
        self.last_music_at = -1e9
        self.last_strong_at = -1e9
        self.baseline: float | None = None  # room background, log energy
        self.margin = float(os.environ.get("STACKCHAN_MUSIC_MIN_LIFT", "0.5"))
        self.cooldown = float(os.environ.get("STACKCHAN_MUSIC_COOLDOWN_S", "1800"))
        self.frame_count = 0
        # Sustained sound with or without a beat: worth asking the brain's
        # audio model whether it is music (classical and ambient have no
        # beat for the detector above to find).
        self.sound_hits = 0
        self.last_candidate = 0.0
        self.candidate_ready = False

    def sure(self) -> bool:
        """Real music lately (a score at the dance trigger level), not just
        a noisy room nudging the score past 0.15."""
        return time.monotonic() - self.last_strong_at < 30

    def on(self) -> bool:
        """Music heard in the last 20 s (the score dips between phrases)."""
        return time.monotonic() - self.last_music_at < 20

    def feed(self, pcm: bytes) -> None:
        self.buf.frombytes(pcm[: len(pcm) - len(pcm) % 2])
        while len(self.buf) >= self.win:
            w = self.buf[: self.win]
            del self.buf[: self.win]
            ms = sum(v * v for v in w) / self.win
            self.env.append(math.log10(ms + 1.0))
            self.frame_count += 1

    def detected(self) -> bool:
        # Evaluate about once a second once 10 s of audio is buffered.
        if len(self.env) < self.env.maxlen or self.frame_count % 33 != 0:
            return False
        env = list(self.env)
        loud = sum(1 for e in env if e > 3.5) / len(env)  # > ~-55 dBFS
        onset = [max(0.0, env[i] - env[i - 1]) for i in range(1, len(env))]
        mean = sum(onset) / len(onset)
        x = [o - mean for o in onset]
        energy = sum(v * v for v in x) or 1e-9
        best_r, best_lag = 0.0, 0
        for lag in range(12, 29):  # 0.36 to 0.84 s = 71 to 166 BPM
            r = sum(x[i] * x[i - lag] for i in range(lag, len(x))) / energy
            # A real beat repeats: also check twice the lag.
            r2 = sum(x[i] * x[i - 2 * lag] for i in range(2 * lag, len(x))) / energy if 2 * lag < len(x) else 0
            score = min(r, r2 * 1.1) if r2 > 0 else r * 0.5
            if score > best_r:
                best_r, best_lag = score, lag
        self.score = best_r
        if best_r >= 0.15:
            self.last_music_at = time.monotonic()
        if best_r >= self.min_score:
            self.last_strong_at = time.monotonic()
        self.bpm = 60.0 / (best_lag * WIN_MS / 1000.0) if best_lag else 0.0
        self.loud = loud
        if self.frame_count % 330 == 0 or best_r >= 0.15:
            avg = sum(env) / len(env)
            logger.info("ears: music check score=%.2f bpm=%.0f loud=%.2f avg_log_energy=%.2f baseline=%.2f",
                        best_r, self.bpm, loud, avg, self.baseline or 0.0)
        # Music must also be clearly louder than the room's usual background
        # (a quiet room with a ticking fan scored 0.27 at a steady 154 bpm).
        avg_e = sum(env) / len(env)
        if self.baseline is None:
            self.baseline = avg_e
        elif avg_e < self.baseline:
            self.baseline = 0.8 * self.baseline + 0.2 * avg_e
        else:
            self.baseline += 0.002 * (avg_e - self.baseline)
        louder = avg_e >= self.baseline + self.margin
        # Music is continuous sound: most 30 ms frames above the floor. A
        # quiet room after talking scored 0.26 with only 25% of frames loud.
        steady = loud >= 0.6
        self.sound_hits = self.sound_hits + 1 if (louder and steady) else 0
        now = time.monotonic()
        if self.sound_hits >= 8 and now - self.last_candidate >= 8 and now - self.last_fire > self.cooldown:
            self.last_candidate = now
            self.candidate_ready = True
        self.hits = self.hits + 1 if (best_r >= self.min_score and louder and steady) else 0
        # 5 checks (about 5 s) of music in a row: a short clip or a phone
        # video does not start a dance (21:41 borderline trigger).
        if self.hits >= int(os.environ.get("STACKCHAN_MUSIC_HITS", "5")) and time.monotonic() - self.last_fire > self.cooldown:
            self.last_fire = time.monotonic()
            self.hits = 0
            return True
        return False


class Ears:
    def __init__(self, gateway: "Gateway") -> None:
        self.gateway = gateway
        self.hook_url = os.environ.get("STACKCHAN_EARS_HOOK_URL", "")
        self.hook_token = os.environ.get("STACKCHAN_TOKEN", "")
        self.model_name = os.environ.get("STACKCHAN_EARS_MODEL", "small.en")
        self.active = False
        self.session_id = ""
        self.last_frame = 0.0
        self.busy_until = 0.0
        self.hold_until = 0.0
        # Wake spotter for when music is on (see _spot).
        self.spot_buf = array.array("h")
        self._spot_new = 0
        self._last_wake_post = 0.0
        self.stall_s = 2.5
        self.frames = 0
        self.opened_at = 0.0
        self.decoder: StreamingOpusDecoder | None = None
        self.seg: Segmenter | None = None
        self.music = MusicDetector()
        # While beat mode owns the mic, its audio comes here so a spoken
        # "stop dancing" still works (servo noise raises the floor, hence
        # the short max length).
        # The last ten seconds of what the mic heard, kept in memory only, so
        # the brain can ask what kind of music is playing (save_clip).
        self.clip = array.array("h")
        self.dance_buf = array.array("h")
        self._dance_fed = 0.0
        self._dance_new = 0
        self._dance_stop_sent = 0.0
        # The wake spotter (wake_spotter.py). With the gate on, an utterance
        # is only transcribed when the spotter heard the wake phrase in it or
        # the brain has asked for attention (a conversation is going on).
        from .wake_spotter import WakeSpotter

        self.spotter = WakeSpotter.load()
        self.gate = self.spotter is not None and os.environ.get("STACKCHAN_WAKE_GATE", "0") == "1"
        self.attention_until = 0.0
        self.skipped = 0
        self._model: Any = None
        self._stt_lock = asyncio.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    # -- lifecycle ---------------------------------------------------------

    async def run(self) -> None:
        self._loop = asyncio.get_running_loop()
        asyncio.get_running_loop().run_in_executor(None, self._load_model)
        logger.info("ears: started (model=%s hook=%s)", self.model_name, self.hook_url)
        while True:
            try:
                await self._tick()
            except Exception as exc:  # pragma: no cover - keep the loop alive
                logger.warning("ears: tick failed: %s", exc)
            await asyncio.sleep(0.15)

    async def _tick(self) -> None:
        esp32 = self.gateway.esp32
        conn = esp32.connection
        connected = conn is not None and getattr(conn, "connected", False)
        foreign = is_recording() and recording_owner() != OWNER
        speaking = esp32.tts_lock.locked()
        now = time.monotonic()
        if now < self.hold_until:
            if self.active:
                self._close(reason="hold")
            return
        if not connected or foreign or speaking:
            if self.active:
                self._close(reason="speaking" if speaking else ("foreign" if foreign else "disconnected"))
            self.busy_until = now + 0.35
            return
        if now < self.busy_until:
            return
        if not self.active:
            await self._open(conn)
            return
        if now - self.last_frame > self.stall_s:
            # Device left listening on its own; re-open. Back off when it
            # keeps stalling so a struggling robot is not hammered.
            logger.info("ears: no audio for %.1f s, re-opening mic", self.stall_s)
            self._close(reason="stalled")
            self.stall_s = min(self.stall_s * 2, 20.0)
            await self._open(conn)

    async def _open(self, conn: Any) -> None:
        self.session_id = getattr(conn, "session_id", "") or ""
        self.decoder = StreamingOpusDecoder()
        self.seg = Segmenter()
        # Fresh audio history, but keep the cooldown: the mic re-opens after
        # every dance, and a reset timer meant music started a new dance
        # right after the last one ended (or was told to stop).
        last_fire, last_music, bpm = self.music.last_fire, self.music.last_music_at, self.music.bpm
        strong, baseline = self.music.last_strong_at, self.music.baseline
        last_candidate = self.music.last_candidate
        self.music = MusicDetector()
        self.music.last_candidate = last_candidate
        self.music.last_fire, self.music.last_music_at = last_fire, last_music
        self.music.bpm = bpm  # beat mode sways at this tempo if its tracker can't lock
        self.music.last_strong_at = strong
        self.music.baseline = baseline
        start_recording(self.session_id, owner=OWNER, frame_hook=self._on_frame, buffer_frames=False)
        try:
            # Raw (pre-AFE) mic audio: the device's speech noise suppression
            # removed music almost entirely (peaks -31 dBFS over a -50 floor),
            # so music detection needs the unprocessed signal. Whisper and the
            # wake check cope with it; the mic is closed while the robot talks.
            await self.gateway.esp32.send_listen_state(
                "start", mode="manual", quiet=True,
                profile=os.environ.get("STACKCHAN_EARS_PROFILE", "raw"),
            )
        except Exception as exc:
            stop_recording_if_owner(OWNER)
            logger.warning("ears: listen.start failed: %s", exc)
            self.busy_until = time.monotonic() + 2
            return
        self.active = True
        self.opened_at = time.monotonic()
        self.last_frame = time.monotonic() + 0.6
        logger.info("ears: mic open (session=%s)", self.session_id)

    def _close(self, reason: str) -> None:
        stop_recording_if_owner(OWNER)
        self.active = False
        logger.info("ears: mic closed (%s, frames=%d)", reason, self.frames)
        self.frames = 0

    def on_device_stop(self) -> bool:
        """Device sent listen.stop while the ears held the mic (screen tap)."""
        if not self.active or self.gateway.esp32.tts_lock.locked():
            return False
        self._close(reason="tap")
        self.busy_until = time.monotonic() + 0.5
        asyncio.create_task(self._post({"event": "wake", "wake_word": "tap", "text": "", "question": ""}))
        logger.info("ears: screen tap -> wake")
        return True

    # -- audio -------------------------------------------------------------

    def hold(self, seconds: float) -> None:
        """Keep the mic closed for a while (e.g. during a face-set download)."""
        self.hold_until = time.monotonic() + seconds

    def _on_frame(self, frame: bytes) -> None:
        self.last_frame = time.monotonic()
        self.stall_s = 2.5
        self.frames += 1
        if self.decoder is None or self.seg is None:
            return
        try:
            pcm = self.decoder.decode_frame(frame)
        except Exception:
            return
        self._remember(pcm)
        if self.spotter is not None:
            score = self.spotter.feed(pcm)
            if score is not None:
                logger.info("ears: wake spotter heard it (%.2f)", score)
        self.music.feed(pcm)
        if self.music.detected():
            logger.info("ears: music detected (%.0f bpm, score %.2f)", self.music.bpm, self.music.score)
            self.music.candidate_ready = False
            asyncio.create_task(self._post_music("music"))
        elif self.music.candidate_ready:
            self.music.candidate_ready = False
            asyncio.create_task(self._post_music("music_candidate"))
        if self.music.on():
            self._spot(pcm)
        else:
            self.spot_buf = array.array("h")
        # Music keeps the endpointer "in speech": cap segments at 8 s so a
        # wake over music is answered quickly (normally 15 s).
        self.seg.max_ms = 8000 if self.music.on() else 15000
        for utt, speech_ms in self.seg.feed(pcm):
            if speech_ms >= 150:
                seconds = len(utt) / 2 / DEVICE_SAMPLE_RATE
                spotted = self.spotter.heard_within(seconds + 2.5) if self.spotter is not None else None
                if self.gate and not (spotted or time.monotonic() < self.attention_until):
                    self.skipped += 1  # idle and no wake phrase: never transcribed
                    continue
                asyncio.create_task(self._handle(utt, speech_ms, spotted))

    async def _post_music(self, event: str) -> None:
        """Tell the brain there may be music and let its audio model decide.
        The half-hour cooldown only starts if the brain actually reacted."""
        payload = {"event": event, "bpm": round(self.music.bpm), "score": round(self.music.score, 2),
                   "clip": self.save_clip()}
        reacted = False
        if self.hook_url:
            headers = {"Authorization": f"Bearer {self.hook_token}"} if self.hook_token else {}
            try:
                async with aiohttp.ClientSession() as http:
                    async with http.post(self.hook_url, json=payload, headers=headers,
                                         timeout=aiohttp.ClientTimeout(total=20)) as resp:
                        reacted = bool((await resp.json()).get("reacted"))
            except Exception as exc:
                logger.warning("ears: music post failed: %s", exc)
        self.music.last_fire = time.monotonic() if reacted else 0.0
        if reacted:
            logger.info("ears: the brain is reacting to the music")

    def _remember(self, pcm: bytes) -> None:
        self.clip.frombytes(pcm[: len(pcm) - len(pcm) % 2])
        keep = DEVICE_SAMPLE_RATE * 10
        if len(self.clip) > keep:
            del self.clip[: len(self.clip) - keep]

    def save_clip(self) -> str:
        """Write the last ten seconds to a WAV for the genre model and return
        its path ("" if there is under four seconds). Only the newest few
        clips are kept."""
        if len(self.clip) < DEVICE_SAMPLE_RATE * 4:
            return ""
        folder = Path.home() / ".stackchan-mcp" / "music"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"clip-{int(time.time() * 1000)}.wav"
        with wave.open(str(path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(DEVICE_SAMPLE_RATE)
            w.writeframes(self.clip.tobytes())
        for old in sorted(folder.glob("clip-*.wav"))[:-5]:
            old.unlink(missing_ok=True)
        return str(path)

    def music_state(self) -> dict:
        return {"on": self.music.on(), "sure": self.music.sure(), "sound": self.music.sound_hits > 0, "bpm": round(self.music.bpm),
                "score": round(self.music.score, 2), "seconds_heard": round(len(self.clip) / DEVICE_SAMPLE_RATE, 1),
                "clip": self.save_clip()}

    def attention(self, seconds: float) -> dict:
        """The brain is in a conversation: transcribe everything for a while."""
        self.attention_until = max(self.attention_until, time.monotonic() + max(0.0, seconds))
        return {"attentive_for_s": round(self.attention_until - time.monotonic(), 1), "gate": self.gate,
                "spotter": self.spotter is not None, "skipped": self.skipped}

    def _wanted(self, utterance_s: float) -> bool:
        if time.monotonic() < self.attention_until:
            return True
        return self.spotter is not None and self.spotter.heard_within(utterance_s + 2.5)

    def _spot(self, pcm: bytes) -> None:
        """With music on, the endpointer's noise floor climbs to the music
        and it stops hearing speech. Instead transcribe the last 4 s every
        1.5 s and look for an addressed wake anywhere in it."""
        self.spot_buf.frombytes(pcm[: len(pcm) - len(pcm) % 2])
        keep = DEVICE_SAMPLE_RATE * 4
        if len(self.spot_buf) > keep:
            del self.spot_buf[: len(self.spot_buf) - keep]
        self._spot_new += len(pcm) // 2
        if self.gate and not self._wanted(4.0):
            return  # over music too, Whisper only runs on a spotter hit
        if self._spot_new >= DEVICE_SAMPLE_RATE * 1.5 and not self._stt_lock.locked() \
                and len(self.spot_buf) >= DEVICE_SAMPLE_RATE * 2:
            self._spot_new = 0
            asyncio.create_task(self._handle_spot(self.spot_buf.tobytes()))

    async def _handle_spot(self, pcm: bytes) -> None:
        async with self._stt_lock:
            text, conf = await asyncio.get_running_loop().run_in_executor(None, self._transcribe, pcm, False)
        if DANCE_DEBUG.exists():
            logger.info("ears: spot heard %r conf=%.2f", text, conf)
        if not text:
            return
        wake, question = split_wake_anywhere(text)
        if not wake or conf < WAKE_MIN_LOGPROB - 0.2 or time.monotonic() - self._last_wake_post < 8:
            return
        self._last_wake_post = time.monotonic()
        self.spot_buf = array.array("h")
        # The window may cut the question off; a short tail means "just woke".
        if len(re.findall(r"[A-Za-z']+", question)) < 3:
            question = ""
        logger.info("ears: heard %r wake=True (music spotter) conf=%.2f", text, conf)
        await self._post({"event": "utterance", "text": text, "wake": True, "question": question,
                          "speech_ms": 0, "conf": round(conf, 2), "music": True, "music_sure": self.music.sure(), "spot": True,
                          "ts": time.time()})

    def feed_dance(self, pcm: bytes) -> None:
        self._remember(pcm)  # the genre model can still be asked mid-dance
        if DANCE_LISTEN_OFF.exists():
            return
        """Beat-mode audio during a dance: listen only for a stop command.
        Music never goes quiet, so instead of endpointing, transcribe the
        last 3 s once a second (a sliding window cannot split the phrase)."""
        now = time.monotonic()
        if now - self._dance_fed > 2.0:
            self.dance_buf = array.array("h")  # new dance
            self._dance_new = 0
        self._dance_fed = now
        self.dance_buf.frombytes(pcm[: len(pcm) - len(pcm) % 2])
        keep = DEVICE_SAMPLE_RATE * 3
        if len(self.dance_buf) > keep:
            del self.dance_buf[: len(self.dance_buf) - keep]
        self._dance_new += len(pcm) // 2
        if self._dance_new >= DEVICE_SAMPLE_RATE and not self._stt_lock.locked() \
                and now - self._dance_stop_sent > 5 and len(self.dance_buf) >= DEVICE_SAMPLE_RATE * 1.5:
            self._dance_new = 0
            asyncio.create_task(self._handle_dance(self.dance_buf.tobytes()))

    def end_dance(self) -> None:
        self.dance_buf = array.array("h")

    async def _handle_dance(self, pcm: bytes) -> None:
        async with self._stt_lock:
            text, conf = await asyncio.get_running_loop().run_in_executor(None, self._transcribe, pcm, False)
        if DANCE_DEBUG.exists():
            # Opt-in debugging (touch ~/.stackchan-mcp/dance_debug): log what
            # the dance listener hears and keep the clips.
            logger.info("ears: dance heard %r conf=%.2f", text, conf)
            d = DANCE_DEBUG.parent / "dance_clips"
            d.mkdir(exist_ok=True)
            with wave.open(str(d / f"{time.strftime('%H%M%S')}.wav"), "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(DEVICE_SAMPLE_RATE); w.writeframes(pcm)
        if text:
            logger.info("ears: dance heard %r conf=%.2f", text[:80], conf)
        if not text or not is_dance_stop(text) or time.monotonic() - self._dance_stop_sent <= 5:
            return
        self._dance_stop_sent = time.monotonic()
        logger.info("ears: dance stop %r conf=%.2f", text, conf)
        await self._post({"event": "utterance", "text": text, "wake": False, "dance_stop": True,
                          "question": "", "conf": round(conf, 2), "ts": time.time()})

    def _load_model(self) -> Any:
        if self._model is None:
            from faster_whisper import WhisperModel

            t = time.monotonic()
            self._model = WhisperModel(self.model_name, device="cpu", compute_type="int8", cpu_threads=6)
            logger.info("ears: loaded %s in %.1fs", self.model_name, time.monotonic() - t)
        return self._model

    def _transcribe(self, pcm: bytes, vad: bool = True) -> tuple[str, float]:
        """vad=False is the dance listener: music never trips the VAD, and
        without temperature fallback / a token cap Whisper looped for up to
        19 s on a 3 s music clip. With them it takes about 0.6 s."""
        """Return (text, confidence). Confidence is the worst segment's
        average log-probability; low values mean Whisper is guessing."""
        import numpy as np

        model = self._load_model()
        audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
        # No initial_prompt: with "Hey Lil Token." as a prompt, Whisper
        # echoed the prompt back on muffled speech and noise (false wakes).
        segments, _ = model.transcribe(
            audio,
            language="en",
            beam_size=1,
            vad_filter=vad,
            condition_on_previous_text=False,
            **({} if vad else {"temperature": 0.0, "max_new_tokens": 32, "without_timestamps": True}),
            no_speech_threshold=0.6,
        )
        parts, worst = [], 0.0
        for seg in segments:
            # Over music Whisper flags real speech as "no speech"; the dance
            # and spotter paths (vad=False) rely on strict phrase matching.
            if vad and getattr(seg, "no_speech_prob", 0) >= 0.6:
                continue
            parts.append(seg.text.strip())
            worst = min(worst, getattr(seg, "avg_logprob", 0.0))
        return " ".join(parts).strip(), worst

    async def _handle(self, pcm: bytes, speech_ms: int, spotted: bool | None = None) -> None:
        async with self._stt_lock:
            t = time.monotonic()
            text, conf = await asyncio.get_running_loop().run_in_executor(None, self._transcribe, pcm)
            took = time.monotonic() - t
        if not text:
            return
        wake, question = split_wake(text)
        words = len(re.findall(r"[A-Za-z']+", text))
        # With music playing the endpointer never hears silence, so a segment
        # runs long whatever was said; only the confidence check applies then.
        music_on = self.music.on()
        if music_on and not wake:
            wake, question = split_wake_anywhere(text)
        min_conf = WAKE_MIN_LOGPROB - (0.2 if music_on else 0.0)  # music lowers Whisper's confidence
        if wake and (conf < min_conf or (speech_ms > 1200 + 600 * words and not music_on)):
            # Unsure transcript, or far more sound than the words explain:
            # likely noise or other talk misheard as the name.
            logger.info("ears: rejected wake %r conf=%.2f speech_ms=%d words=%d", text, conf, speech_ms, words)
            wake = False
        # Shadow record for the wake spotter: did it flag this utterance too?
        # (wake=True spotter=False would be a wake it would have missed.)
        # (`spotted` was decided when the utterance ended, before Whisper ran.)
        logger.info("ears: heard %r wake=%s spotter=%s speech_ms=%d conf=%.2f stt=%.2fs", text if (wake or os.environ.get("STACKCHAN_EARS_LOG_TEXT") == "1" or DANCE_DEBUG.exists()) else "(ambient)", wake, spotted, speech_ms, conf, took)
        if not wake and re.match(r"(?i)\W*(hey|hi|yo|okay|ok|hay|a)\b", text):
            # Possible missed wake: keep only the opening words for tuning.
            logger.info("ears: near-miss opening %r", " ".join(text.split()[:4]))
        if wake and time.monotonic() - self._last_wake_post < 8:
            return  # the music spotter already woke it for this phrase
        if wake:
            self._last_wake_post = time.monotonic()
        await self._post({
            "event": "utterance",
            "text": text,
            "clip": self._save_utterance(pcm),
            "music": music_on,
            "music_sure": self.music.sure(),
            "wake": wake,
            "question": question,
            "speech_ms": speech_ms,
            "conf": round(conf, 2),
            "ts": time.time(),
        })

    def _save_utterance(self, pcm: bytes) -> str:
        """Keep the last few utterances as WAVs so the brain can check whose
        voice it was. They stay on this Mac and are overwritten quickly."""
        try:
            folder = Path.home() / ".stackchan-mcp" / "utterances"
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / f"utt-{int(time.time() * 1000)}.wav"
            with wave.open(str(path), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(DEVICE_SAMPLE_RATE)
                w.writeframes(pcm)
            for old in sorted(folder.glob("utt-*.wav"))[:-8]:
                old.unlink(missing_ok=True)
            return str(path)
        except OSError:
            return ""

    async def _post(self, payload: dict) -> None:
        if not self.hook_url:
            return
        headers = {"Authorization": f"Bearer {self.hook_token}"} if self.hook_token else {}
        try:
            async with aiohttp.ClientSession() as http:
                async with http.post(self.hook_url, json=payload, headers=headers,
                                     timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status >= 300:
                        logger.warning("ears: hook status %d", resp.status)
        except Exception as exc:
            logger.warning("ears: hook post failed: %s", exc)


_ears: Ears | None = None


def get_ears() -> Ears | None:
    return _ears


def start_ears(gateway: "Gateway") -> None:
    global _ears
    if os.environ.get("STACKCHAN_EARS", "") != "1" or _ears is not None:
        return
    _ears = Ears(gateway)
    asyncio.create_task(_ears.run())
