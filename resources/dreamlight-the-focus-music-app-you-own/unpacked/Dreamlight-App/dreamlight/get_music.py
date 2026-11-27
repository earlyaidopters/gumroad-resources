#!/usr/bin/env python3
"""Download Dreamlight's 25 one-hour tracks (about 2.2 GB) into web/audio.

Uses only the Python standard library, so it works on macOS, Windows and Linux
without the GitHub CLI. Files that are already complete are skipped, so you can
stop it and run it again.

    python3 get_music.py              # all 25 tracks
    python3 get_music.py --only 3     # just the first 3 (quick test)
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

RELEASE = "https://github.com/promptadvisers/dreamlight/releases/download/audio-v1/"
ROOT = Path(__file__).resolve().parent
AUDIO = ROOT / "web" / "audio"


def remote_size(url: str) -> int | None:
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=60) as r:
            return int(r.headers.get("Content-Length", 0)) or None
    except Exception:
        return None


def download(url: str, dest: Path) -> None:
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as f:
        total = int(r.headers.get("Content-Length", 0))
        done = 0
        while chunk := r.read(1 << 20):
            f.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r  {done / total:5.0%}  {done >> 20} of {total >> 20} MB", end="", flush=True)
    print()
    tmp.replace(dest)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", type=int, help="download only the first N tracks")
    args = parser.parse_args()

    tracks = json.loads((ROOT / "web" / "tracks.json").read_text())["tracks"]
    names = [t["filename"] for t in tracks][: args.only or None]
    AUDIO.mkdir(parents=True, exist_ok=True)

    for i, name in enumerate(names, 1):
        dest, url = AUDIO / name, RELEASE + name
        size = remote_size(url)
        if dest.exists() and size and dest.stat().st_size == size:
            print(f"[{i}/{len(names)}] {name} already here")
            continue
        print(f"[{i}/{len(names)}] {name}")
        try:
            download(url, dest)
        except Exception as exc:
            print(f"\nCould not download {name} ({exc}). Check your internet connection and run this again; finished tracks are kept.")
            return 1

    print(f"Done. {len(names)} tracks in {AUDIO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
