"""Whose voice was that?

A speaker embedding model (SpeechBrain ECAPA, local) turns an utterance into
a vector. After the owner says "learn my voice", the robot keeps the average of a
few of his utterances, and from then on:

- follow-ups from another voice (a guest, a phone call on speaker) are
  ignored instead of answered;
- with the voice lock on, "Hey Lil Token" from another voice does not wake it.

Nothing is filtered until he has enrolled, and very short utterances are
always let through, because a one-word clip is too little to judge.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import wave
from pathlib import Path

import numpy as np

import skills

log = logging.getLogger("liltoken.voice")

VOICE_FILE = skills.BRAIN_DIR / "state" / "voice.json"
MODEL_ID = "speechbrain/spkrec-ecapa-voxceleb"
# Cosine similarity that counts as the owner. With the Mac's stock voices the same
# voice scored 0.67 or more and a different one 0.52 or less. A real voice
# through the robot's mic will score lower, so this starts lenient; every
# check is logged so it can be tuned.
MATCH = float(os.environ.get("LILTOKEN_VOICE_MATCH", "0.35"))
MIN_SECONDS = 1.2                                                 # shorter clips are not judged
LOCK_WAKE = os.environ.get("LILTOKEN_VOICE_LOCK", "1") == "1"     # other voices cannot wake it (once enrolled)


def clip_seconds(path: str) -> float:
    try:
        with wave.open(path) as w:
            return w.getnframes() / w.getframerate()
    except Exception:
        return 0.0


class Voice:
    def __init__(self) -> None:
        self.model = None
        self.lock = threading.Lock()
        self.profile: np.ndarray | None = None
        data = skills.load_json(VOICE_FILE, None)
        if data:
            self.profile = np.array(data["vec"], dtype=np.float32)

    @property
    def enrolled(self) -> bool:
        return self.profile is not None

    def _load(self) -> None:
        with self.lock:
            if self.model is None:
                from speechbrain.inference.speaker import EncoderClassifier

                started = time.monotonic()
                self.model = EncoderClassifier.from_hparams(
                    source=MODEL_ID, savedir=str(Path.home() / ".cache" / "liltoken" / "ecapa"))
                log.info("voice model ready in %.1f s", time.monotonic() - started)

    def embed(self, path: str) -> np.ndarray:
        import torch

        self._load()
        with wave.open(path) as w:
            audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        peak = float(np.max(np.abs(audio))) if audio.size else 0.0
        if peak > 0:
            audio = audio / peak * 0.6
        with torch.no_grad():
            vec = self.model.encode_batch(torch.from_numpy(audio)[None, :])[0, 0].detach().cpu().numpy()
        return vec / (np.linalg.norm(vec) + 1e-9)

    def similarity(self, path: str) -> float | None:
        """How much this clip sounds like the owner, or None when it cannot be judged."""
        if self.profile is None or clip_seconds(path) < MIN_SECONDS:
            return None
        return float(np.dot(self.embed(path), self.profile))

    def is_owner(self, path: str) -> bool:
        """False only when enrolled, the clip is long enough, and it is clearly someone else."""
        if not path:
            return True
        try:
            sim = self.similarity(path)
        except Exception as exc:
            log.debug("voice check failed: %s", exc)
            return True
        if sim is None:
            return True
        log.info("voice: similarity %.2f (%s)", sim, "the owner" if sim >= MATCH else "someone else")
        return sim >= MATCH

    def enroll(self, paths: list[str]) -> str:
        usable = [p for p in paths if p and Path(p).exists() and clip_seconds(p) >= MIN_SECONDS]
        if len(usable) < 2:
            return "I need a bit more of your voice. Say two or three full sentences, then ask me again."
        vecs = np.stack([self.embed(p) for p in usable[-5:]])
        mean = vecs.mean(axis=0)
        self.profile = (mean / np.linalg.norm(mean)).astype(np.float32)
        VOICE_FILE.parent.mkdir(exist_ok=True)
        VOICE_FILE.write_text(json.dumps({"vec": [round(float(v), 5) for v in self.profile],
                                          "clips": len(vecs), "at": time.strftime("%Y-%m-%d %H:%M")}))
        return f"Learned your voice from {len(vecs)} things you just said. I will ignore other voices from now on."

    def forget(self) -> str:
        self.profile = None
        try:
            VOICE_FILE.unlink()
        except OSError:
            pass
        return "Voice forgotten. I will answer anyone again."
