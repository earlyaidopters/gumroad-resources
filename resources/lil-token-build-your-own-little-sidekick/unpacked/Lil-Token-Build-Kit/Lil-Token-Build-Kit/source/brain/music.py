"""What kind of music is playing, and how Lil Token should carry itself.

The ears already know *that* music is playing (a steady beat). This names
the kind, from the last ten seconds of the robot's own microphone, with a
local audio model (CLAP, which matches sound against sentences). Nothing
leaves the Mac unless the owner asks for the song's name.

Each kind of music has a persona: a look from the wardrobe
(avatar/make_wardrobe.py), a way of moving, and whether it says anything.
Quiet music gets a quiet reaction.

the owner can teach it by voice ("this is jazz"). A taught clip is remembered and
anything that sounds close to it gets the same label from then on.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import threading
import time
import urllib.request
import wave
from pathlib import Path

import numpy as np

import skills

log = logging.getLogger("liltoken.music")

MODEL_ID = os.environ.get("LILTOKEN_MUSIC_MODEL", "laion/larger_clap_music_and_speech")
TAUGHT_FILE = skills.BRAIN_DIR / "state" / "taught_music.json"
# What each kind of music sounds like through the robot's own microphone
# (tools/music_eval.py builds this from the tuning clips). The small mic loses
# the bass, and matching sentences alone got 4 of 8 right through it.
PROTOTYPES_FILE = Path(__file__).resolve().parents[1] / "models" / "music_prototypes.json"
TEXT_WEIGHT = float(os.environ.get("LILTOKEN_MUSIC_TEXT_WEIGHT", "0.4"))
# How sure the top label must be, and how far ahead of the runner-up.
MIN_CONFIDENCE = float(os.environ.get("LILTOKEN_MUSIC_MIN_CONF", "0.40"))
MIN_MARGIN = float(os.environ.get("LILTOKEN_MUSIC_MIN_MARGIN", "0.08"))
TAUGHT_MATCH = float(os.environ.get("LILTOKEN_MUSIC_TAUGHT_MATCH", "0.80"))
# The tarboush has to be earned. In tuning, half the rock clips leaned Arabic
# through the mic, and a tarboush on the wrong music is the mistake the owner
# noticed first, so Arabic needs a higher score than the other kinds.
ARABIC_MIN = float(os.environ.get("LILTOKEN_MUSIC_ARABIC_MIN", "0.60"))

# Several plain descriptions per kind; the clip is scored against all of them.
DESCRIPTIONS = {
    "arabic": ["Arabic music with darbuka drums and oud", "Middle Eastern dabke dance music", "Lebanese or Egyptian pop song"],
    "hiphop": ["hip hop music with a rapper", "a trap beat with heavy 808 bass", "boom bap rap instrumental"],
    "classical": ["classical music played by an orchestra", "a classical piano piece", "baroque string music with harpsichord"],
    "electronic": ["electronic dance music in a club", "house music with a four on the floor kick", "techno music"],
    "rock": ["rock music with distorted electric guitars and drums", "heavy metal music", "punk rock song"],
    "jazz": ["jazz music with saxophone and upright bass", "a swing jazz band", "bebop jazz piano trio"],
    "ambient": ["calm ambient music with soft pads and no drums", "quiet minimal piano music", "slow atmospheric background music"],
}
# "Pop" is not a kind it tries to name. Through the robot's mic, generic pop
# was heard as three different things in tuning, so music it cannot place
# simply gets the plain reaction (PERSONAS["pop"]): no hat, a normal dance.

# Sounds that fill a room without being music. The beat detector alone once
# danced to a fan and to an alarm (docs/BUILD-LOG.md), and it never noticed
# music without a strong beat, so now the model is asked first.
NOT_MUSIC = ["a person speaking", "a man talking", "people having a conversation", "a phone call or video call",
             "a podcast or a lecture", "someone recording a video and talking to the camera",
             "silence in a quiet room", "background room noise", "typing on a computer keyboard",
             "a fan or air conditioner humming", "an alarm or a phone ringing", "a vacuum cleaner or appliance"]
MUSIC_MASS = float(os.environ.get("LILTOKEN_MUSIC_MASS", "0.70"))   # share of the score that must go to music

# face: a set in avatar/. style: how it moves. line: what it says (None = nothing).
PERSONAS = {
    "arabic":     {"face": "party",      "style": "dance",   "intensity": 0.8, "line": "Yalla! This one's for me. 😄"},
    "hiphop":     {"face": "hiphop",     "style": "dance",   "intensity": 0.7, "line": "Okay, this beat goes. 😄"},
    "electronic": {"face": "electronic", "style": "dance",   "intensity": 1.0, "line": "Ooh. Here comes the drop. 😄"},
    "rock":       {"face": "rock",       "style": "dance",   "intensity": 1.0, "line": "Turn it up! 😄"},
    # Music with a beat that it cannot place: the plain reaction.
    "pop":        {"face": "default",    "style": "dance",   "intensity": 0.6, "line": "Ooh, I hear music! 😄"},
    "classical":  {"face": "classical",  "style": "sway",    "intensity": 0.3, "line": "Ah. Culture."},
    "jazz":       {"face": "jazz",       "style": "sway",    "intensity": 0.4, "line": "Smooth."},
    "ambient":    {"face": "ambient",    "style": "sway",    "intensity": 0.15, "line": None},
    "unsure":     {"face": "default",    "style": "sway",    "intensity": 0.3, "line": None},
}
# Other words the owner might use for a kind of music when he teaches it.
ALIASES = {
    "arabic": ["arab", "arabic", "middle eastern", "dabke", "tarboush", "tarbush", "habibi", "lebanese", "egyptian"],
    "hiphop": ["hip hop", "hiphop", "hip-hop", "rap", "trap"],
    "classical": ["classical", "orchestra", "orchestral", "baroque", "opera", "symphony"],
    "electronic": ["electronic", "edm", "house", "techno", "dance music", "club"],
    "rock": ["rock", "metal", "punk"],
    "jazz": ["jazz", "swing", "bebop", "blues"],
    "ambient": ["ambient", "minimal", "minimalist", "lo-fi", "lofi", "chill", "focus music", "background"],
    "pop": ["pop", "normal", "regular"],
}


def kind_for(label: str) -> str | None:
    """The persona a spoken label means: "this is rap" -> hiphop."""
    text = re.sub(r"[^a-z -]", " ", label.lower())
    for kind, words in ALIASES.items():
        if any(re.search(rf"\b{re.escape(w)}\b", text) for w in words):
            return kind
    return None


def decide(scores: dict[str, float]) -> tuple[str, float]:
    """(kind, confidence) from per-kind probabilities, or ("unsure", p) when
    the best guess is weak or too close to the next one."""
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    (best, p), (_, second) = ranked[0], ranked[1]
    if p < MIN_CONFIDENCE or p - second < MIN_MARGIN:
        return "unsure", p
    if best == "arabic" and p < ARABIC_MIN:
        return "unsure", p
    return best, p


def read_clip(path: str) -> np.ndarray:
    """16 kHz mono WAV from the ears -> float samples at the model's 48 kHz."""
    from scipy.signal import resample_poly

    with wave.open(path) as w:
        rate, channels = w.getframerate(), w.getnchannels()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    if rate != 48000:
        data = resample_poly(data, 48000, rate).astype(np.float32)
    peak = float(np.max(np.abs(data))) if data.size else 0.0
    return data / peak * 0.5 if peak > 0 else data   # the robot's mic is quiet; level it


class Genre:
    def __init__(self) -> None:
        self.model = None
        self.processor = None
        self.text = None            # one unit vector per kind
        self.protos = None          # one unit vector per kind, heard through the robot's mic
        self.kinds: list[str] = []
        self.lock = threading.Lock()
        self.last: dict = {}        # the most recent result, for "what's playing"

    def load(self) -> None:
        with self.lock:
            if self.model is not None:
                return
            import torch
            from transformers import ClapModel, ClapProcessor

            started = time.monotonic()
            self.processor = ClapProcessor.from_pretrained(MODEL_ID)
            self.model = ClapModel.from_pretrained(MODEL_ID).eval()
            self.kinds = list(DESCRIPTIONS)
            vectors = []
            with torch.no_grad():
                for kind in self.kinds:
                    inputs = self.processor(text=DESCRIPTIONS[kind], return_tensors="pt", padding=True)
                    emb = self._vec(self.model.get_text_features(**inputs))
                    emb = emb / emb.norm(dim=-1, keepdim=True)
                    mean = emb.mean(dim=0)
                    vectors.append((mean / mean.norm()).numpy())
            self.text = np.stack(vectors)
            with torch.no_grad():
                inputs = self.processor(text=NOT_MUSIC, return_tensors="pt", padding=True)
                other = self._vec(self.model.get_text_features(**inputs))
                self.not_music = (other / other.norm(dim=-1, keepdim=True)).numpy()
            protos = skills.load_json(PROTOTYPES_FILE, None)
            if protos and all(k in protos for k in self.kinds):
                self.protos = np.stack([np.array(protos[k], dtype=np.float32) for k in self.kinds])
            log.info("music model ready in %.1f s (%s)", time.monotonic() - started,
                     "with mic prototypes" if self.protos is not None else "sentences only")

    @staticmethod
    def _vec(out):
        return out if hasattr(out, "norm") else out.pooler_output

    def embed(self, path: str) -> np.ndarray:
        import torch

        self.load()
        audio = read_clip(path)
        with torch.no_grad():
            inputs = self.processor(audio=audio, sampling_rate=48000, return_tensors="pt")
            emb = self._vec(self.model.get_audio_features(**inputs))[0]
        return (emb / emb.norm()).numpy()

    def music_share(self, vec: np.ndarray) -> float:
        """How much of the match goes to music rather than talk or noise (0 to 1)."""
        sims = np.concatenate([self.text @ vec, self.not_music @ vec])
        probs = self._soft(sims, 30.0)
        return float(probs[: len(self.kinds)].sum())

    def classify(self, path: str) -> dict:
        vec = self.embed(path)
        share = self.music_share(vec)
        probs = self.probabilities(vec)
        scores = {k: round(float(p), 3) for k, p in zip(self.kinds, probs)}
        kind, conf = decide(scores)
        taught = self.match_taught(vec)
        if taught:
            kind, conf = taught
        self.last = {"kind": kind, "confidence": round(conf, 2), "scores": scores, "taught": bool(taught),
                     "is_music": bool(taught) or share >= MUSIC_MASS, "music_share": round(share, 2),
                     "at": time.time(), "clip": path}
        return self.last

    @staticmethod
    def _soft(sims: np.ndarray, sharpness: float) -> np.ndarray:
        logits = sims * sharpness                    # CLAP similarities sit close together
        probs = np.exp(logits - logits.max())
        return probs / probs.sum()

    def probabilities(self, vec: np.ndarray, text_weight: float | None = None) -> np.ndarray:
        """Per-kind probability: how well the clip matches the descriptions,
        blended with how close it is to that kind heard through the mic."""
        by_text = self._soft(self.text @ vec, 30.0)
        if self.protos is None:
            return by_text
        w = TEXT_WEIGHT if text_weight is None else text_weight
        return w * by_text + (1 - w) * self._soft(self.protos @ vec, 30.0)

    # -- teaching ----------------------------------------------------------

    def _taught(self) -> list[dict]:
        return skills.load_json(TAUGHT_FILE, [])

    def match_taught(self, vec: np.ndarray) -> tuple[str, float] | None:
        best = None
        for item in self._taught():
            sim = float(np.dot(vec, np.array(item["vec"], dtype=np.float32)))
            if sim >= TAUGHT_MATCH and (best is None or sim > best[1]):
                best = (item["kind"], sim)
        return best

    def teach(self, path: str, label: str) -> str:
        kind = kind_for(label)
        if kind is None:
            return f"I do not have a look for '{label}'. I know: {', '.join(PERSONAS)}."
        items = self._taught()
        items.append({"kind": kind, "label": label[:40], "vec": [round(float(v), 5) for v in self.embed(path)],
                      "at": time.strftime("%Y-%m-%d %H:%M")})
        TAUGHT_FILE.parent.mkdir(exist_ok=True)
        TAUGHT_FILE.write_text(json.dumps(items[-60:]))
        return f"Learned. Music that sounds like this is {kind} from now on ({len(items)} taught so far)."


def name_song(path: str) -> str:
    """Ask Gemini what the song is. Sends the ten second clip to Google, so
    it only runs when the owner asks for the name."""
    key = os.environ.get("GOOGLE_API_KEY", "")
    if os.environ.get("LILTOKEN_SONG_NAME", "0") != "1" or not key:
        return "Song identification is off. Configure your own Google API key to enable it."
    model = os.environ.get("LILTOKEN_SONG_MODEL", "gemini-3.8-flash")
    body = {"contents": [{"parts": [
        {"inline_data": {"mime_type": "audio/wav", "data": base64.b64encode(Path(path).read_bytes()).decode()}},
        {"text": "This is ten seconds of music recorded by a small microphone in a room. If you recognise the "
                 "song, reply 'Title by Artist'. If you are not sure, reply 'unknown' and nothing else."}]}]}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.load(r)
    return out["candidates"][0]["content"]["parts"][0]["text"].strip()[:120]
