"""Tune and score the genre matcher on clips heard through the robot's mic.

test-audio/genres/mic/dev/      tuning clips (tools/make_genre_clips.py, played
                                on a speaker and recorded by the robot)
test-audio/genres/mic/heldout/  different prompts, never used for tuning

    brain/.venv/bin/python tools/music_eval.py            # tune, write prototypes
    brain/.venv/bin/python tools/music_eval.py --heldout  # score once on unseen clips

Tuning is leave-one-track-out: a track's own recordings never help classify
it. The held-out score is the only number to quote.
"""

import collections
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "brain"))
import music  # noqa: E402

MIC = Path(__file__).resolve().parents[1] / "test-audio" / "genres" / "mic"


def load(split: str, g: music.Genre, named_only: bool = True) -> list[tuple[str, str, np.ndarray]]:
    rows = []
    for wav in sorted((MIC / split).glob("*.wav")):
        track = wav.name.rsplit(".", 2)[0]             # "jazz-3" from "jazz-3.a.wav"
        kind = track.split("-")[0]
        if named_only and kind not in music.DESCRIPTIONS:
            continue                                   # generic pop is not a kind it names
        rows.append((kind, track, g.embed(str(wav))))
    return rows


def protos_from(rows, kinds):
    out = []
    for kind in kinds:
        mean = np.mean([v for k, _, v in rows if k == kind], axis=0)
        out.append(mean / np.linalg.norm(mean))
    return np.stack(out)


def main() -> None:
    g = music.Genre()
    g.load()
    g.match_taught = lambda vec: None                  # the owner's own teaching is not part of the score
    dev = load("dev", g)
    kinds = g.kinds
    print(f"{len(dev)} tuning recordings of {len(set(t for _, t, _ in dev))} tracks")
    if "--heldout" not in sys.argv:
        tracks = sorted(set(t for _, t, _ in dev))
        for weight in (1.0, 0.6, 0.4, 0.2, 0.0):
            right = unsure = 0
            for track in tracks:
                g.protos = protos_from([r for r in dev if r[1] != track], kinds)
                for kind, _, vec in (r for r in dev if r[1] == track):
                    probs = g.probabilities(vec, text_weight=weight)
                    guess, _ = music.decide(dict(zip(kinds, probs)))
                    right += guess == kind
                    unsure += guess == "unsure"
            print(f"  sentences weight {weight:.1f}: {right} of {len(dev)} right, {unsure} unsure")
        full = protos_from(dev, kinds)
        music.PROTOTYPES_FILE.parent.mkdir(exist_ok=True)
        music.PROTOTYPES_FILE.write_text(json.dumps({k: [round(float(x), 5) for x in v] for k, v in zip(kinds, full)}))
        print("wrote", music.PROTOTYPES_FILE)
        return
    g.protos = protos_from(dev, kinds)
    everything = load("heldout", g, named_only=False)
    held = [r for r in everything if r[0] in music.DESCRIPTIONS]
    confusion = collections.Counter()
    for kind, track, vec in held:
        guess, conf = music.decide(dict(zip(kinds, g.probabilities(vec))))
        confusion[(kind, guess)] += 1
    right = sum(n for (k, gss), n in confusion.items() if k == gss)
    wrong = {f"{k} heard as {gss}": n for (k, gss), n in confusion.items() if k != gss}
    false_tarboush = sum(n for (k, gss), n in confusion.items() if gss == "arabic" and k != "arabic")
    pop = [music.decide(dict(zip(kinds, g.probabilities(vec))))[0] for kind, _, vec in everything if kind == "pop"]
    print(f"HELD OUT, through the robot's mic: {right} of {len(held)} right. Misses: {wrong or 'none'}")
    print(f"  tarboush on music that is not Arabic: {false_tarboush}. Generic pop was heard as: {pop}")
    (MIC.parent / "heldout_result.json").write_text(json.dumps(
        {"right": right, "total": len(held), "misses": wrong, "text_weight": music.TEXT_WEIGHT,
         "min_confidence": music.MIN_CONFIDENCE, "min_margin": music.MIN_MARGIN}, indent=2))


if __name__ == "__main__":
    main()
