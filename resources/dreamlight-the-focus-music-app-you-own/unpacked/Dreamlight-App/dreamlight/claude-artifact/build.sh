#!/usr/bin/env bash
# Build the Claude app (artifact) version of Dreamlight into claude-artifact/dist.
#
# The Claude version shares the web player's sessions, playback, visuals and art.
# Only index.html, player.js, player.css and claude-bridge.js differ (Claude's
# menu bar, shortcuts and notifications permissions plus the Install as app button).
#
# Claude caps each uploaded file at 20 MB, so the one-hour MP3s (about 82 MB each)
# are re-encoded to HE-AAC at 40 kbps in an .mp4 container (about 18 MB each).
#
# Usage:  ./claude-artifact/build.sh            (run from the repo root or anywhere)
# Needs:  ffmpeg, python3, and the MP3s in web/audio (see the README).
set -euo pipefail
cd "$(dirname "$0")"
HERE="$(pwd)"; ROOT="$(cd .. && pwd)"; WEB="$ROOT/web"; OUT="$HERE/dist"

rm -rf "$OUT"; mkdir -p "$OUT/audio"

# 1. Shared player files and art from the web version
for f in motion.js playback.js sessions.js visualizer.js favicon.svg icon-512.png apple-touch-icon.png manifest.json motion-index.json; do
  [ -f "$WEB/$f" ] && cp "$WEB/$f" "$OUT/"
done
cp -R "$WEB/covers" "$WEB/motion" "$OUT/"

# 2. Claude-specific files
cp "$HERE/index.html" "$HERE/player.js" "$HERE/player.css" "$HERE/claude-bridge.js" "$OUT/"

# 3. Track list pointing at the smaller .mp4 audio
python3 - "$WEB/tracks.json" "$OUT/tracks.json" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
data = json.load(open(src))
tracks = data["tracks"] if isinstance(data, dict) else data
for t in tracks:
    if t.get("url", "").endswith(".mp3"):
        t["url"] = t["url"][:-4] + ".mp4"
        t["sizeMb"] = 18.3
json.dump(data, open(dst, "w"), indent=2)
PY

# 4. Re-encode audio (HE-AAC 40 kbps keeps both binaural channels intact)
if ! ls "$WEB"/audio/*.mp3 >/dev/null 2>&1; then
  echo "No MP3s in web/audio yet. Download or render them first (see README), then rerun."; exit 0
fi
ENCODER=""
if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q aac_at; then ENCODER="aac_at -profile:a 4"
elif ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libfdk_aac; then ENCODER="libfdk_aac -profile:a aac_he"
else echo "Needs an ffmpeg with aac_at (macOS) or libfdk_aac for HE-AAC."; exit 1; fi
for mp3 in "$WEB"/audio/*.mp3; do
  name="$(basename "${mp3%.mp3}")"
  echo "encoding $name"
  # shellcheck disable=SC2086
  ffmpeg -v error -y -i "$mp3" -vn -c:a $ENCODER -b:a 40k -ac 2 -movflags +faststart "$OUT/audio/$name.mp4"
done
du -sh "$OUT" "$OUT/audio"
echo "Done. Publish claude-artifact/dist as a Claude artifact (see claude-artifact/README.md)."
