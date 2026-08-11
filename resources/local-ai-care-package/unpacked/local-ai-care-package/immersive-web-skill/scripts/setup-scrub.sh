#!/bin/zsh
# One-shot scaffold for a scroll-scrubbed video site.
# Usage: setup-scrub.sh <video> <dir> <BRAND> <TAGLINE> [#accent] [HUD_LABEL] [HUD_START] [HUD_END] [HUD_UNIT]
# Probes the video, extracts frames at the correct resolution, copies the
# verified template, and injects FRAME_COUNT + runway height. Deterministic —
# the model only writes COPY after this runs, never plumbing.
set -e

VIDEO="$1"; DIR="$2"; BRAND="${3:-BRAND}"; TAGLINE="${4:-BUILT DIFFERENT}"
ACCENT="${5:-#e3b505}"; HUD_LABEL="${6:-ALT}"; HUD_START="${7:-3842}"; HUD_END="${8:-1204}"; HUD_UNIT="${9:-M}"
TPL="$HOME/.pi/agent/skills/immersive-web/assets/template-scrub"

[ -f "$VIDEO" ] || { echo "ERROR: video not found: $VIDEO"; exit 1; }
[ -e "$DIR" ] && { echo "ERROR: target dir exists: $DIR (refusing to overwrite)"; exit 1; }

# ---- probe ----
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$VIDEO")
DUR_INT=${DUR%.*}
echo "video: ${DUR_INT}s, ${WIDTH}px wide"

# ---- frame budget: cap ~360 frames; subsample long videos ----
FPS=30
if [ "$DUR_INT" -gt 12 ]; then FPS=$(( 360 / DUR_INT )); [ "$FPS" -lt 8 ] && FPS=8; fi
SCALE=1920; [ "$WIDTH" -lt 1920 ] && SCALE=$WIDTH

cp -R "$TPL" "$DIR"
mkdir -p "$DIR/public/frames"
echo "extracting frames (${FPS}fps @ ${SCALE}w)..."
ffmpeg -loglevel error -i "$VIDEO" -vf "scale=${SCALE}:-2,fps=${FPS}" -q:v 3 "$DIR/public/frames/frame_%04d.jpg"
COUNT=$(ls "$DIR/public/frames" | wc -l | tr -d ' ')
[ "$COUNT" -gt 10 ] || { echo "ERROR: only $COUNT frames extracted"; exit 1; }

# ---- runway: ~100vh per second of source, clamped 300-800 ----
RUNWAY=$(( DUR_INT * 100 )); [ "$RUNWAY" -lt 300 ] && RUNWAY=300; [ "$RUNWAY" -gt 800 ] && RUNWAY=800

# ---- inject ----
sed -i '' "s/{{FRAME_COUNT}}/$COUNT/" "$DIR/src/video-scroll.js"
sed -i '' "s/{{HUD_START}}/$HUD_START/; s/{{HUD_END}}/$HUD_END/; s/{{HUD_UNIT}}/$HUD_UNIT/" "$DIR/src/video-scroll.js"
sed -i '' "s/{{ACCENT}}/$ACCENT/" "$DIR/src/style.css"
sed -i '' "s/{{HUD_LABEL}}/$HUD_LABEL/" "$DIR/index.html"
sed -i '' "s/height: 400vh;/height: ${RUNWAY}vh;/" "$DIR/src/style.css"
sed -i '' "s/{{BRAND}}/$BRAND/g; s/{{TAGLINE}}/$TAGLINE/g" "$DIR/index.html"

echo "DONE: $COUNT frames, ${RUNWAY}vh runway -> $DIR"
echo "Remaining {{TOKENS}} to fill with brand copy:"
grep -o "{{[A-Z0-9_]*}}" "$DIR/index.html" | sort -u
echo "Next: fill tokens, then: cd $DIR && npm install && npm run dev"
