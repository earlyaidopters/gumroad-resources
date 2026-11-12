"""Train and score Lil Token's wake spotter.

The spotter is a small classifier on top of openWakeWord's speech embedding
(two tiny ONNX models that turn audio into 96 numbers every 80 ms). It looks
at the last two seconds and answers one question: did someone just say
"Hey Lil Token"? It does not decide wakes alone. A hit only earns that
moment of audio a Whisper transcription and the usual wake check, so a false
hit costs one transcription, and what it buys is that Whisper no longer has
to transcribe everything said in the room.

    ~/.local/share/uv/tools/stackchan-mcp/bin/python tools/wake/train.py DATA_DIR [NOISE_DIR]

Voices in make_data.HELD_OUT are never trained on. Scores are reported on
those voices only, per clip, the way the spotter runs live (sliding along
the clip, taking the best window).
"""

import json
import random
import sys
import wave
from pathlib import Path

import numpy as np
from openwakeword.utils import AudioFeatures
from sklearn.neural_network import MLPClassifier

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_data import HELD_OUT  # noqa: E402

WIN = 32000  # two seconds at 16 kHz -> 16 embedding frames
OUT = Path(__file__).resolve().parents[2] / "models" / "wake_spotter.npz"
rng = np.random.default_rng(7)
random.seed(7)


def load(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    return x


def trim(x: np.ndarray) -> np.ndarray:
    if x.size < 400:
        return x
    frames = np.abs(x[: x.size // 160 * 160]).reshape(-1, 160).mean(axis=1)
    loud = np.where(frames > max(60.0, frames.max() * 0.04))[0]
    return x if loud.size == 0 else x[max(0, loud[0] * 160 - 800): min(x.size, (loud[-1] + 1) * 160 + 800)]


def pink(n: int) -> np.ndarray:
    white = rng.standard_normal(n)
    spectrum = np.fft.rfft(white)
    spectrum[1:] /= np.sqrt(np.arange(1, spectrum.size))
    return np.fft.irfft(spectrum, n).astype(np.float32)


def reverb(x: np.ndarray) -> np.ndarray:
    length = int(16000 * rng.uniform(0.15, 0.45))
    ir = rng.standard_normal(length).astype(np.float32) * np.exp(-np.linspace(0, 6, length)).astype(np.float32)
    ir[0] = 1.0
    wet = np.convolve(x, ir)[: x.size]
    return wet * (np.abs(x).max() / (np.abs(wet).max() + 1e-6))


def augment(window: np.ndarray, noises: list[np.ndarray]) -> np.ndarray:
    x = window.copy()
    if rng.random() < 0.4:
        x = reverb(x)
    level = np.sqrt((x ** 2).mean()) + 1e-6
    noise = pink(x.size) if (not noises or rng.random() < 0.5) else random.choice(noises)
    if noise.size < x.size:
        noise = np.tile(noise, x.size // noise.size + 1)
    start = rng.integers(0, noise.size - x.size + 1)
    noise = noise[start: start + x.size]
    snr = rng.uniform(5, 25)
    x = x + noise * (level / (np.sqrt((noise ** 2).mean()) + 1e-6)) * 10 ** (-snr / 20)
    x = x * 10 ** (rng.uniform(-18, 0) / 20)          # the robot's mic is quiet
    return np.clip(x, -32768, 32767)


def window_ending(core: np.ndarray, end_sample: int) -> np.ndarray:
    """The two seconds that end `end_sample` samples into the clip (silence
    before the clip starts and after it ends)."""
    padded = np.concatenate([np.zeros(WIN, np.float32), core, np.zeros(WIN, np.float32)])
    end = WIN + end_sample
    return padded[end - WIN: end].copy()


def positive_windows(core: np.ndarray, copies: int) -> list[np.ndarray]:
    # The phrase has just ended: the window closes 0 to 0.3 s after its last sound.
    return [window_ending(core, core.size + int(rng.integers(0, 4800))) for _ in range(copies)]


def negative_windows(core: np.ndarray) -> list[np.ndarray]:
    # Other speech at every alignment the live spotter will see, including
    # the moment it ends, so "someone just stopped talking" is not a cue.
    ends = list(range(8000, core.size + 4800, 4000)) + [core.size + int(rng.integers(0, 4800))]
    return [window_ending(core, e) for e in ends]


def embed(F: AudioFeatures, clips: np.ndarray) -> np.ndarray:
    emb = F.embed_clips(clips.astype(np.int16), batch_size=64)
    return emb.reshape(emb.shape[0], -1)


def clip_score(F: AudioFeatures, model, core: np.ndarray) -> float:
    """Best score sliding along one clip, fed 80 ms at a time exactly as the
    live spotter is."""
    x = np.concatenate([np.zeros(24000, np.float32), core, np.zeros(8000, np.float32)]).astype(np.int16)
    F.reset()
    best = 0.0
    for i in range(0, x.size - 1279, 1280):
        F(x[i: i + 1280])
        if i >= 24000:
            best = max(best, float(model(F.get_features(16).reshape(1, -1))[0]))
    return best


def main() -> None:
    data = Path(sys.argv[1]).expanduser()
    noises = [load(p) for p in sorted(Path(sys.argv[2]).expanduser().glob("*.wav"))] if len(sys.argv) > 2 else []
    F = AudioFeatures(inference_framework="onnx")
    sets = {"train": ([], []), "test": ([], [])}
    cores = {"test": []}
    texts = json.loads((data / "texts.json").read_text()) if (data / "texts.json").exists() else {}
    for label, positive in (("pos", True), ("neg", False)):
        for path in sorted((data / label).glob("*.wav")):
            voice = path.stem.split("__")[0].replace("_", " ")
            split = "test" if voice in HELD_OUT else "train"
            core = trim(load(path))
            if core.size < 1600:
                continue
            if split == "test" and (positive or "token" not in texts.get(path.stem, "")):
                cores["test"].append((positive, voice, core))
            if split != "train" or (not positive and "token" in texts.get(path.stem, "")):
                continue
            for window in (positive_windows(core, 7) if positive else negative_windows(core)):
                sets["train"][0].append(augment(window, noises))
                sets["train"][1].append(int(positive))
    for _ in range(300):                               # noise and music alone are never a wake
        sets["train"][0].append(augment(np.zeros(WIN, np.float32), noises))
        sets["train"][1].append(0)
    X, y = embed(F, np.stack(sets["train"][0])), np.array(sets["train"][1])
    mean, std = X.mean(axis=0), X.std(axis=0) + 1e-6
    clf = MLPClassifier(hidden_layer_sizes=(96,), alpha=1e-3, max_iter=400, early_stopping=True,
                        random_state=7).fit((X - mean) / std, y)
    W1, b1 = clf.coefs_[0].astype(np.float32), clf.intercepts_[0].astype(np.float32)
    W2, b2 = clf.coefs_[1][:, 0].astype(np.float32), float(clf.intercepts_[1][0])

    def model(feats: np.ndarray) -> np.ndarray:
        hidden = np.maximum(0, ((feats - mean) / std) @ W1 + b1)
        return 1 / (1 + np.exp(-(hidden @ W2 + b2)))

    print(f"trained on {len(y)} windows ({int(y.sum())} wake), {len(set(p.stem.split('__')[0] for p in (data / 'pos').glob('*.wav')))} voices")
    pos = [(v, clip_score(F, model, c)) for p, v, c in cores["test"] if p]
    neg = [(v, clip_score(F, model, c)) for p, v, c in cores["test"] if not p]
    report = {"held_out_voices": sorted(HELD_OUT), "wake_clips": len(pos), "other_clips": len(neg), "thresholds": {}}
    for thr in (0.2, 0.3, 0.5, 0.7):
        caught = sum(s >= thr for _, s in pos)
        false = sum(s >= thr for _, s in neg)
        report["thresholds"][str(thr)] = {"caught": caught, "false_hits": false}
        print(f"  threshold {thr}: caught {caught} of {len(pos)} wake clips, {false} of {len(neg)} other clips set it off")
    mark = [s for v, s in pos if v.startswith("owner")]
    print(f"  the owner's cloned voice (held out): {sum(s >= 0.3 for s in mark)} of {len(mark)} at 0.3")
    OUT.parent.mkdir(exist_ok=True)
    np.savez_compressed(OUT, W1=W1, b1=b1, W2=W2, b2=np.float32(b2), mean=mean.astype(np.float32), std=std.astype(np.float32))
    OUT.with_suffix(".json").write_text(json.dumps(report, indent=2))
    print("saved", OUT)


if __name__ == "__main__":
    main()
