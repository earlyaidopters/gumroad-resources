"""Fish Audio engine — HTTP client for the Fish Audio text-to-speech API.

Follows the same thin-client shape as the ElevenLabs engine: issue an HTTP
request, receive an MP3 blob, decode to 16 kHz mono PCM, and hand the PCM
to the orchestrator (which owns Opus encoding and the WebSocket push).

The default model is ``drama-3``, which reads performance directions inline:
bracketed cues such as ``[sigh]`` or ``[whispering, conspiratorial]`` and
paired tags such as ``<whisper>...</whisper>`` pass straight through in the
text.

Configuration (environment variables):

    ``FISH_AUDIO_API_KEY`` / ``STACKCHAN_FISH_KEY``
        API key. Read from the environment only; never commit it. When
        both are set, ``STACKCHAN_FISH_KEY`` wins.

    ``STACKCHAN_FISH_VOICE_<SPEAKER>``
        Voice-model map. Each variable defines one named speaker whose value
        is a Fish Audio voice model id (``reference_id``). The
        ``speaker_name`` call option selects by lowercase suffix; an
        unrecognised value that looks like a raw 32-hex model id is passed
        through verbatim.

    ``STACKCHAN_FISH_DEFAULT_SPEAKER``
        Speaker name used when ``speaker_name`` is omitted. When unset and
        exactly one voice is configured, that voice is the default. With no
        voices configured, the request omits ``reference_id``.

    ``~/.stackchan-mcp/save_voice`` (or ``STACKCHAN_FISH_SAVE_FLAG``)
        Filming switch, checked on every line. While the file exists, every
        line skips the cache and is fetched as a full-quality MP3, which is
        saved with its text before it is turned into robot audio. The file's
        first line names the folder (default ``~/.stackchan-mcp/saved_voice``).
        The editor then lays the exact take the robot spoke over the shot.

    ``STACKCHAN_FISH_MODEL``
        Model identifier sent in the ``model`` header. Default ``"drama-3"``.

    ``STACKCHAN_FISH_LATENCY``
        ``latency`` value for streamed synthesis (:meth:`synthesize_stream`):
        ``balanced`` (default), ``low`` or ``normal``.

    ``STACKCHAN_FISH_CACHE_MAX_CHARS``
        Lines up to this many characters are kept on disk after the first
        synthesis and replayed from there (default 60, ``0`` turns the
        cache off). Stock lines such as "What's up?" repeat all day, and a
        cache hit skips the API round trip entirely.

    ``STACKCHAN_FISH_CACHE_DIR``
        Cache location. Default ``~/.stackchan-mcp/tts_cache``. At most
        ``STACKCHAN_FISH_CACHE_MAX_FILES`` (default 300) files are kept,
        least recently used first out.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, AsyncIterator

from .audio_utils import (
    DEVICE_SAMPLE_RATE,
    _decode_mp3_to_pcm16_mono,
    resample_pcm16_linear,
)
from .base import TTSEngine

logger = logging.getLogger(__name__)

DEFAULT_FISH_MODEL = "drama-3"

FISH_TTS_URL = "https://api.fish.audio/v1/tts"

#: drama-3 is a preview model and directed lines can take several seconds.
DEFAULT_HTTP_TIMEOUT_SECONDS = 60.0

_VOICE_ENV_PREFIX = "STACKCHAN_FISH_VOICE_"

DEFAULT_CACHE_MAX_CHARS = 60
DEFAULT_CACHE_MAX_FILES = 300


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "") or default)
    except ValueError:
        return default


def _cache_path(model: str, reference_id: str | None, text: str) -> Path | None:
    """Cache file for a short line, or ``None`` when it should not be cached."""
    max_chars = _env_int("STACKCHAN_FISH_CACHE_MAX_CHARS", DEFAULT_CACHE_MAX_CHARS)
    if max_chars <= 0 or len(text) > max_chars:
        return None
    root = Path(os.getenv("STACKCHAN_FISH_CACHE_DIR") or Path.home() / ".stackchan-mcp" / "tts_cache")
    key = hashlib.sha256(f"{model}\0{reference_id or ''}\0{text}".encode()).hexdigest()[:32]
    return root / f"{key}.pcm"


def _cache_read(path: Path) -> bytes | None:
    try:
        pcm = path.read_bytes()
        if not pcm:
            return None
        os.utime(path)  # most recently used
        return pcm
    except OSError:
        return None


def _cache_write(path: Path, pcm: bytes) -> None:
    """Best effort: a full disk or a bad path must never break speech."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(pcm)
        os.replace(tmp, path)
        keep = _env_int("STACKCHAN_FISH_CACHE_MAX_FILES", DEFAULT_CACHE_MAX_FILES)
        files = sorted(path.parent.glob("*.pcm"), key=lambda f: f.stat().st_mtime)
        for old in files[: max(0, len(files) - keep)]:
            old.unlink(missing_ok=True)
    except OSError as exc:
        logger.debug("Fish Audio cache write failed: %s", exc)


def _save_dir() -> Path | None:
    """The folder to save full-quality takes in, or ``None`` when filming
    capture is off. Checked live, so the flag file can be added or removed
    without a restart."""
    flag = Path(os.getenv("STACKCHAN_FISH_SAVE_FLAG") or Path.home() / ".stackchan-mcp" / "save_voice")
    try:
        if not flag.exists():
            return None
        first = flag.read_text().strip().splitlines()
    except OSError:
        return None
    return Path(first[0]).expanduser() if first and first[0].strip() else Path.home() / ".stackchan-mcp" / "saved_voice"


def _save_take(folder: Path, model: str, text: str, mp3: bytes) -> None:
    """Best effort: saving a take must never break speech."""
    try:
        folder.mkdir(parents=True, exist_ok=True)
        now = time.time()
        stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime(now)) + f"-{int(now * 1000) % 1000:03d}"
        slug = re.sub(r"[^a-z0-9]+", "-", re.sub(r"\[[^\]]*\]", "", text).lower()).strip("-")[:40] or "line"
        name = f"{stamp}-{slug}.mp3"
        (folder / name).write_bytes(mp3)
        with open(folder / "index.jsonl", "a") as idx:
            idx.write(json.dumps({"time": stamp, "file": name, "model": model, "text": text}) + "\n")
        logger.info("Fish Audio take saved: %s", name)
    except OSError as exc:
        logger.warning("Fish Audio take not saved: %s", exc)


#: Fish Audio voice model ids are 32 lowercase hex characters.
_RAW_MODEL_ID_RE = re.compile(r"^[0-9a-f]{32}$")


class FishAudioEngine(TTSEngine):
    """Synthesise text via the Fish Audio ``/v1/tts`` API."""

    name = "fish"
    supports_emoji_style = False

    def __init__(self, *, timeout_seconds: float = DEFAULT_HTTP_TIMEOUT_SECONDS, transport: Any = None) -> None:
        # Key / voices / model resolve lazily at synthesis time so values
        # loaded from .env after import still take effect.
        self._timeout_seconds = timeout_seconds
        self._transport = transport
        self._stream_client: Any = None  # kept open between streamed lines

    @staticmethod
    def _resolve_api_key() -> str:
        key = (os.getenv("STACKCHAN_FISH_KEY") or os.getenv("FISH_AUDIO_API_KEY") or "").strip()
        if not key:
            raise RuntimeError(
                "Fish Audio API key is not configured. Set FISH_AUDIO_API_KEY "
                "(or STACKCHAN_FISH_KEY) in the gateway environment."
            )
        return key

    @staticmethod
    def _voice_map() -> dict[str, str]:
        """Return {speaker-name-lowercase: model_id} from the environment."""
        voices: dict[str, str] = {}
        for env_name, value in os.environ.items():
            if env_name.startswith(_VOICE_ENV_PREFIX) and value.strip():
                voices[env_name[len(_VOICE_ENV_PREFIX):].lower()] = value.strip()
        return voices

    def _resolve_reference_id(self, speaker_raw: Any) -> tuple[str, str | None]:
        """Map a ``speaker_name`` option to ``(speaker_label, reference_id)``."""
        voices = self._voice_map()
        default_speaker = (os.getenv("STACKCHAN_FISH_DEFAULT_SPEAKER") or "").strip().lower()
        if not default_speaker and len(voices) == 1:
            default_speaker = next(iter(voices))

        speaker = str(speaker_raw).strip().lower() if speaker_raw is not None else default_speaker
        if speaker and speaker in voices:
            return speaker, voices[speaker]
        if speaker_raw is not None and _RAW_MODEL_ID_RE.match(str(speaker_raw).strip()):
            return "raw", str(speaker_raw).strip()
        if default_speaker in voices:
            if speaker_raw is not None:
                logger.warning(
                    "Fish Audio speaker %r not found; falling back to default %r",
                    speaker_raw,
                    default_speaker,
                )
            return default_speaker, voices[default_speaker]
        if speaker_raw is not None:
            raise RuntimeError(
                f"Fish Audio speaker {speaker_raw!r} is not configured. Define "
                f"STACKCHAN_FISH_VOICE_<NAME> variables (known: {sorted(voices) or 'none'})."
            )
        return "default", None

    async def synthesize(self, text: str, **opts: Any) -> bytes:
        """Call Fish Audio, decode the MP3, return 16 kHz mono PCM.

        Recognised opts:

            ``speaker_name`` / ``speaker_id``
                Named speaker (matched against the env voice map) or a
                raw Fish Audio voice model id.
        """
        try:
            import httpx  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - exercised via integration
            raise RuntimeError(
                "httpx is not installed. Install with "
                "'pip install stackchan-mcp[tts]' to enable Fish Audio support."
            ) from exc

        if not isinstance(text, str) or not text.strip():
            raise ValueError("Fish Audio synthesize: 'text' must be a non-empty string")

        api_key = self._resolve_api_key()
        speaker_opt = opts.get("speaker_name")
        if speaker_opt is None:
            speaker_opt = opts.get("speaker_id")
        speaker, reference_id = self._resolve_reference_id(speaker_opt)
        model = (os.getenv("STACKCHAN_FISH_MODEL") or DEFAULT_FISH_MODEL).strip()

        save_dir = _save_dir()
        cache_file = _cache_path(model, reference_id, text.strip())
        if cache_file is not None and save_dir is None:
            cached = _cache_read(cache_file)
            if cached is not None:
                logger.info(
                    "Fish Audio cache hit (%d bytes PCM) for speaker=%s, model=%s, text=%r",
                    len(cached), speaker, model, text[:60],
                )
                return cached

        body: dict[str, Any] = {"text": text, "format": "mp3"}
        if reference_id:
            body["reference_id"] = reference_id

        client_kwargs: dict[str, Any] = {"timeout": self._timeout_seconds}
        if self._transport is not None:
            client_kwargs["transport"] = self._transport

        async with httpx.AsyncClient(**client_kwargs) as client:
            resp = await client.post(
                FISH_TTS_URL,
                headers={"Authorization": f"Bearer {api_key}", "model": model},
                json=body,
            )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Fish Audio synthesis failed: HTTP {resp.status_code} {resp.text[:200]!r}"
            )
        mp3_bytes = resp.content
        if not mp3_bytes:
            raise RuntimeError("Fish Audio returned an empty audio body.")
        if save_dir is not None:
            _save_take(save_dir, model, text, mp3_bytes)

        sample_rate, pcm = _decode_mp3_to_pcm16_mono(mp3_bytes)
        if sample_rate != DEVICE_SAMPLE_RATE:
            pcm = resample_pcm16_linear(pcm, sample_rate, DEVICE_SAMPLE_RATE)

        if cache_file is not None:
            _cache_write(cache_file, pcm)

        logger.info(
            "Fish Audio synthesised %d bytes PCM (16 kHz mono) for speaker=%s, model=%s, text=%r",
            len(pcm),
            speaker,
            model,
            text[:60],
        )
        return pcm

    async def synthesize_stream(self, text: str, **opts: Any) -> AsyncIterator[bytes]:
        """Yield 16 kHz mono PCM as Fish Audio generates it.

        Asks for raw PCM at the device rate, so there is no MP3 to decode or
        resample and the first audio is available about 0.2 s after the
        request instead of after the whole clip. One HTTPS connection is
        kept open between lines. Short lines share the disk cache with
        :meth:`synthesize`.
        """
        try:
            import httpx  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - exercised via integration
            raise RuntimeError(
                "httpx is not installed. Install with "
                "'pip install stackchan-mcp[tts]' to enable Fish Audio support."
            ) from exc

        if not isinstance(text, str) or not text.strip():
            raise ValueError("Fish Audio synthesize_stream: 'text' must be a non-empty string")

        api_key = self._resolve_api_key()
        speaker_opt = opts.get("speaker_name")
        if speaker_opt is None:
            speaker_opt = opts.get("speaker_id")
        speaker, reference_id = self._resolve_reference_id(speaker_opt)
        model = (os.getenv("STACKCHAN_FISH_MODEL") or DEFAULT_FISH_MODEL).strip()

        if _save_dir() is not None:
            # Filming capture: fetch one full-quality MP3, save it, and play
            # that same take. Slower to start, identical to what is saved.
            yield await self.synthesize(text, **opts)
            return

        cache_file = _cache_path(model, reference_id, text.strip())
        if cache_file is not None:
            cached = _cache_read(cache_file)
            if cached is not None:
                logger.info(
                    "Fish Audio stream cache hit (%d bytes PCM) for speaker=%s, model=%s, text=%r",
                    len(cached), speaker, model, text[:60],
                )
                yield cached
                return

        body: dict[str, Any] = {
            "text": text,
            "format": "pcm",
            "sample_rate": DEVICE_SAMPLE_RATE,
            "latency": (os.getenv("STACKCHAN_FISH_LATENCY") or "balanced").strip(),
        }
        if reference_id:
            body["reference_id"] = reference_id

        if self._stream_client is None:
            client_kwargs: dict[str, Any] = {"timeout": self._timeout_seconds}
            if self._transport is not None:
                client_kwargs["transport"] = self._transport
            self._stream_client = httpx.AsyncClient(**client_kwargs)

        collected = bytearray()
        async with self._stream_client.stream(
            "POST",
            FISH_TTS_URL,
            headers={"Authorization": f"Bearer {api_key}", "model": model},
            json=body,
        ) as resp:
            if resp.status_code != 200:
                detail = (await resp.aread())[:200]
                raise RuntimeError(
                    f"Fish Audio synthesis failed: HTTP {resp.status_code} {detail!r}"
                )
            async for chunk in resp.aiter_bytes():
                if chunk:
                    collected.extend(chunk)
                    yield chunk
        if not collected:
            raise RuntimeError("Fish Audio returned an empty audio body.")
        if cache_file is not None:
            _cache_write(cache_file, bytes(collected[: len(collected) - len(collected) % 2]))
        logger.info(
            "Fish Audio streamed %d bytes PCM (16 kHz mono) for speaker=%s, model=%s, text=%r",
            len(collected), speaker, model, text[:60],
        )
