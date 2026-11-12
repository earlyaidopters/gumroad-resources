"""Make speech clips to train and test Lil Token's wake spotter.

Positives say the wake phrase; negatives say anything else, including the
phrases that fooled the old matcher. Voices are the Mac's built-in English
voices plus the owner's cloned voice from Fish Audio. Everything is 16 kHz mono.

    ~/.local/share/uv/tools/stackchan-mcp/bin/python tools/wake/make_data.py OUT_DIR

Writes OUT_DIR/{pos,neg}/<voice>__<n>.wav. Voices listed in HELD_OUT are
never used for training, only for scoring.
"""

import asyncio
import os
import random
import re
import subprocess
import sys
import wave
from pathlib import Path

OUT = Path(sys.argv[1]).expanduser()
NOVELTY = {"Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Good News", "Jester", "Organ",
           "Superstar", "Trinoids", "Whisper", "Wobble", "Zarvox"}
HELD_OUT = {"Karen", "Rishi", "Fred", "Moira", "owner-heldout"}
POSITIVES = ["Hey Lil Token", "Hey little token", "Yo Lil Token", "Okay Lil Token", "Hi Lil Token", "Hey, Lil Token!"]
NEGATIVES = [
    # what fooled the old matcher (docs/BUILD-LOG.md)
    "a little bit, even if we're exaggerating", "little tiny things, they actually matter a lot",
    "Lil Token is cool", "the little tokens are worth a lot", "it looks for these topics every morning",
    # near sounds
    "hey little buddy", "hello there, how are you", "hey, tell Ken I said hi", "a little taken aback",
    "hey, look at this", "okay, little by little", "he broke in", "hey Siri, set a timer", "the token expired",
    "we need a lot of tokens for that", "hey, listen to this", "you little joker", "hey, what's going on",
    # ordinary desk talk
    "let me share my screen for a second", "can you send me that invoice by Friday",
    "I think the model is overfitting on the training data", "so the next video is about agents",
    "what time is the meeting tomorrow", "I'll grab a coffee and be right back",
    "the build finished and all the tests pass", "that thumbnail needs a bigger headline",
    "okay, let's get into it", "thanks, that's all I needed", "try it again now",
    "how about we move this to next week", "the weather looks great for the weekend",
    "I was reading about the new release this morning", "turn the volume down a little",
    "one two three four five six seven", "yes, exactly, that makes sense", "no, I don't think so",
]


def write_wav(path: Path, pcm: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(pcm)


def mac_voices() -> list[str]:
    out = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    names = [re.split(r"\s{2,}", ln.strip())[0] for ln in out.splitlines() if re.search(r"\ben_", ln)]
    return [n for n in dict.fromkeys(re.sub(r"\s*\(.*", "", n) for n in names) if n not in NOVELTY]


def say(voice: str, text: str, rate: int, path: Path) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["say", "-v", voice, "-r", str(rate), "-o", str(path), "--data-format=LEI16@16000", text],
                   capture_output=True, timeout=60)


async def fish(texts: list[str], folder: Path, label: str) -> None:
    from dotenv import dotenv_values
    local = Path(__file__).resolve().parents[2] / ".env"
    for name, value in dotenv_values(local, interpolate=False).items():
        if name in {"FISH_AUDIO_API_KEY", "STACKCHAN_FISH_VOICE_OWNER"} and value:
            os.environ.setdefault(name, value)
    os.environ["STACKCHAN_FISH_CACHE_MAX_CHARS"] = "0"
    from stackchan_mcp.tts.fish_audio import FishAudioEngine

    engine = FishAudioEngine()
    for n, text in enumerate(texts):
        path = folder / f"{label}__{n}.wav"
        if path.exists():
            continue
        try:
            write_wav(path, await engine.synthesize(text, speaker_name="owner"))
        except Exception as exc:
            print("fish failed:", str(exc)[:80])


def main() -> None:
    random.seed(7)
    texts: dict[str, str] = {}
    voices = mac_voices()
    print(len(voices), "Mac voices:", ", ".join(voices))
    for voice in voices:
        tag = voice.replace(" ", "_")
        for n, (phrase, rate) in enumerate((p, r) for p in POSITIVES for r in (150, 185, 220)):
            say(voice, phrase, rate, OUT / "pos" / f"{tag}__{n}.wav")
        for n, text in enumerate(random.sample(NEGATIVES, 18)):
            texts[f"{tag}__{n}"] = text.lower()
            say(voice, text, random.choice((165, 190, 215)), OUT / "neg" / f"{tag}__{n}.wav")
    variants = [p + end for p in POSITIVES for end in ("", ".", "!", "?")]
    asyncio.run(fish(variants[:16], OUT / "pos", "owner"))
    asyncio.run(fish(variants[16:], OUT / "pos", "owner-heldout"))
    asyncio.run(fish(NEGATIVES[:20], OUT / "neg", "owner"))
    asyncio.run(fish(NEGATIVES[20:], OUT / "neg", "owner-heldout"))
    texts.update({f"mark__{n}": t.lower() for n, t in enumerate(NEGATIVES[:20])})
    texts.update({f"owner-heldout__{n}": t.lower() for n, t in enumerate(NEGATIVES[20:])})
    (OUT / "texts.json").write_text(__import__("json").dumps(texts))
    print("pos", len(list((OUT / "pos").glob("*.wav"))), "neg", len(list((OUT / "neg").glob("*.wav"))))


if __name__ == "__main__":
    main()
