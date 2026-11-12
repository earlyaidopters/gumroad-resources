"""A small always-on spotter for "Hey Lil Token".

Runs on the raw microphone stream, 80 ms at a time: openWakeWord's speech
embedding (two tiny ONNX models, about 15 ms of CPU per second of audio)
followed by a classifier trained on the wake phrase in the owner's cloned voice
and many stock voices (tools/wake/train.py in the Lil Token repo).

A hit does not wake the robot. It only marks that moment as worth a Whisper
transcription and the normal wake check. With STACKCHAN_WAKE_GATE=1 nothing
else gets transcribed while the robot is idle, so ordinary conversation in
the room is never turned into text.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_PATH = Path(os.environ.get("STACKCHAN_WAKE_MODEL", Path.home() / "lil-token" / "models" / "wake_spotter.npz"))
THRESHOLD = float(os.environ.get("STACKCHAN_WAKE_THRESHOLD", "0.3"))
STEP = 1280  # samples per embedding step (80 ms at 16 kHz)


class WakeSpotter:
    def __init__(self, path: Path = MODEL_PATH) -> None:
        import numpy as np
        from openwakeword.utils import AudioFeatures

        self.np = np
        data = np.load(path)
        self.W1, self.b1 = data["W1"], data["b1"]
        self.W2, self.b2 = data["W2"], float(data["b2"])
        self.mean, self.std = data["mean"], data["std"]
        self.features = AudioFeatures(inference_framework="onnx")
        self.pending = np.zeros(0, dtype=np.int16)
        self.last_hit = -1e9
        self.last_score = 0.0
        self.hits = 0

    @classmethod
    def load(cls) -> "WakeSpotter | None":
        if os.environ.get("STACKCHAN_WAKE_SPOTTER", "1") != "1" or not MODEL_PATH.exists():
            return None
        try:
            spotter = cls()
            logger.info("wake spotter ready (threshold %.2f)", THRESHOLD)
            return spotter
        except Exception as exc:
            logger.warning("wake spotter unavailable: %s", exc)
            return None

    def reset(self) -> None:
        self.features.reset()
        self.pending = self.np.zeros(0, dtype=self.np.int16)

    def score(self) -> float:
        feats = self.features.get_features(16).reshape(-1)
        hidden = self.np.maximum(0, ((feats - self.mean) / self.std) @ self.W1 + self.b1)
        z = float(hidden @ self.W2 + self.b2)
        return 1.0 / (1.0 + self.np.exp(-z))

    def feed(self, pcm: bytes) -> float | None:
        """Add audio. Returns the score when the wake phrase was just heard."""
        np = self.np
        self.pending = np.concatenate([self.pending, np.frombuffer(pcm[: len(pcm) - len(pcm) % 2], dtype=np.int16)])
        hit = None
        while self.pending.size >= STEP:
            self.features(self.pending[:STEP])
            self.pending = self.pending[STEP:]
            self.last_score = self.score()
            now = time.monotonic()
            if self.last_score >= THRESHOLD and now - self.last_hit > 1.5:
                self.last_hit = now
                self.hits += 1
                hit = self.last_score
        return hit

    def heard_within(self, seconds: float) -> bool:
        return time.monotonic() - self.last_hit <= seconds
