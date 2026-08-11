# Scroll-scrubbed video — turn ONE video into the site's spine

> **BUILD WITH THE PIPELINE, NOT BY HAND**: `scripts/setup-scrub.sh <video> <dir> <BRAND> <TAGLINE>` scaffolds the complete verified experience (this doc's engine plus cinemagraph idle, brand title card, altitude HUD, letterbox bars, velocity zoom-kick, procedural wind, marquee). See SKILL.md "Path B2 one-shot pipeline". This doc is the theory and tuning reference.

Mark points you at a video; you turn it into a site where scroll drives the playhead — the viewer flies "through" the video while text beats land on top (the classic product-page scrub, the zoomy cousin of the video-illusion archetype). This exact pattern was built and browser-verified 2026-08-08; the code below is the verified version.

**Why not `video.currentTime` on scroll**: seeking is keyframe-bound and async — it stutters. The pro method is a frame sequence drawn to canvas. (Exception: a video re-encoded with EVERY frame a keyframe, `ffmpeg -g 1`, scrubs acceptably via currentTime — use only when frame extraction is impractical.)

## Step 1 — Extract frames from Mark's video

```bash
# inspect first: duration, fps, size
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,r_frame_rate -of default=nw=1 input.mp4

# RESOLUTION RULE (learned the hard way — 1280w frames look PIXELATED on retina):
# frame_width >= viewport_width x min(devicePixelRatio, 2) x max_zoom
# e.g. 1512px viewport x 2 DPR x 1.25 zoom ≈ 3800 → but that's huge; the practical
# compromise: extract at 1920-2560w, cap the canvas DPR at 1.5, keep zoom <= 1.25.
mkdir -p public/frames
ffmpeg -i input.mp4 -vf "scale=1920:-2,fps=30" -q:v 3 public/frames/frame_%04d.jpg
```

Budget: **120-240 frames total** (4-8s at 30fps, or subsample a longer video with `fps=15`). 1920w q3 ≈ 100-180KB/frame; 150 frames ≈ 20MB — fine locally, consider 2560w only for hero-critical footage. Make a mobile set: `scale=960:-2,fps=15` into `public/frames-mob/`, pick by `matchMedia`. WebP (`-quality 80`, `.webp`) is ~30% smaller if encode time is fine.

If the result still looks soft while scrolling: (1) check the canvas isn't capping resolution — use `Math.min(devicePixelRatio, 1.5)` not `1`; (2) reduce max zoom rather than raising frame size; (3) source video may itself be soft — `ffprobe` its real resolution before blaming the pipeline.

## Step 2 — The stage (verified structure)

```html
<div class="stage" id="stage">            <!-- height: 500vh — scroll runway -->
  <div class="stage__sticky">             <!-- position: sticky; top: 0; height: 100vh -->
    <canvas id="cv"></canvas>
    <div class="scrim"></div>             <!-- gradient into page bg, archetype-4 move -->
    <div class="beat" data-at="0.05" data-until="0.30"><h2>Beat one</h2></div>
    <div class="beat" data-at="0.35" data-until="0.60"><h2>Beat two</h2></div>
    <div class="beat" data-at="0.65" data-until="0.95"><h2>Beat three</h2></div>
  </div>
</div>
```

Runway rule: ~100vh of `.stage` height per second of video (500vh for a 5s clip). More runway = slower, more cinematic traversal.

## Step 3 — The scrub engine (verified code)

```js
const FRAME_COUNT = 120;
const url = (i) => `/frames/frame_${String(i + 1).padStart(4, "0")}.jpg`;
const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");
const frames = []; let current = -1;

const stage = document.getElementById("stage");
const progress = () => {
  const r = stage.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
};

function draw(i) {
  const img = frames[i];
  if (!img || !img.complete) return;
  const dpr = Math.min(devicePixelRatio, 1.5);   // cap: frames are finite-res
  const cw = canvas.width = canvas.clientWidth * dpr;
  const ch = canvas.height = canvas.clientHeight * dpr;
  const s = Math.max(cw / img.width, ch / img.height);   // cover
  const zoom = 1 + progress() * 0.25;                    // the "zoomy" push-in
  const w = img.width * s * zoom, h = img.height * s * zoom;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

function update() {
  const p = progress();
  const i = Math.min(FRAME_COUNT - 1, Math.floor(p * FRAME_COUNT));
  if (i !== current) { current = i; draw(i); }
  document.querySelectorAll(".beat").forEach((b) =>
    b.classList.toggle("on", p >= +b.dataset.at && p <= +b.dataset.until));
  requestAnimationFrame(update);
}

for (let i = 0; i < FRAME_COUNT; i++) {
  const img = new Image(); img.src = url(i);
  img.onload = () => { if (i === 0) draw(0); };
  frames.push(img);
}
requestAnimationFrame(update);
```

In the template, run this from the existing gsap.ticker instead of its own RAF, and use ScrollTrigger (`trigger: "#stage", scrub: true, onUpdate`) instead of the manual `progress()` — with Lenis the momentum then carries into the scrub for free. The manual version above works standalone with zero dependencies.

## Step 4 — Polish that sells it

- **Beats**: `[data-at]/[data-until]` windows in scroll progress; CSS transition opacity/translateY (or GSAP). Keep beats INSIDE the sticky element so they overlay the canvas.
- **Zoom curve**: `1 + p * 0.25` is a linear push-in; ease it (`1 + Math.pow(p, 1.5) * 0.35`) or zoom per-beat for punch-ins on key moments.
- **Preload gate**: count `img.onload` and hold the site preloader until ~the first 25% of frames are in; the rest streams ahead of the playhead.
- **Scrim** top and bottom in the page background color so the canvas never reads as a rectangle.
- **Entry/exit**: normal DOM sections before and after the stage; the hero section can BE beat zero. **The scrub stage is an INTRO, not the site** — a real site continues below it: content sections, features, gallery, CTA, footer. Landing at the bottom of the runway with nothing after it feels broken; plan at least 3-4 substantial DOM sections after the conduit.
- **Multiple videos**: chain stages, one runway each; or crossfade two frame sets inside one canvas on a progress window.
- **prefers-reduced-motion**: swap the runway for a static `<video autoplay muted loop>` or poster frame.

## Sizing cheat sheet

| Context | Frames | Size | Runway |
|---|---|---|---|
| Hero moment | 90-120 @ 1280w JPEG q4 | ~5-8MB | 300-400vh |
| Full-page conduit | 180-240 @ 1280w | ~10-15MB | 600-800vh |
| Mobile variant | same count @ 720w q6 | ~3-5MB | same |

## Cinemagraph idle (the opening moment)

At the top of the page the image must hold PERFECTLY still (no frame ping-pong — a moving camera reads as weird breathing) while synthetic mist drifts over it. Recipe (implemented in the template's `startIdle()`):

- Draw frame 0 frozen; overlay 2-3 procedurally generated fog layers (soft blurred radial blobs on an offscreen canvas, faded toward the bottom so the foreground stays crisp).
- **Normal blend, NOT screen** — screen-blend vanishes over bright areas, which is exactly where eyes look. Normal blend darkens over bright and lifts over dark, so it registers everywhere. Measured lesson: screen-blend produced a 1.2/255 mean pixel change (invisible); normal blend with smaller wisps produced 6.4 in the cloud band (clearly alive).
- Different speeds per layer (parallax) + a slow sine vertical bob. Wrap with a second draw at `tw - off` for a seamless loop.
- Stop the idle the moment scroll progress > 0.002; restart at top.

## The standard kit (what separates "nice" from "whoa")

All verified in production and included in the template: brand title card as beat zero (data-at 0-0.05) with pulsing SCROLL cue; altitude HUD counting down with progress (mono font, mix-blend-mode: difference); letterbox bars sliding in while descending (html.is-descending class); velocity zoom-kick (`zoom += min(|velocity| * 6, 0.06)`); procedural wind ambience (brown noise + lowpass, gain follows scroll velocity, one-click arm for autoplay policy); kinetic marquee divider after the stage.

## Typography lessons (from a real client round)

Headlines COMPACT (~5vw, not 9vw — huge type hides the footage), alternating left/right anchors per beat so the camera's path stays visible, yellow highlight chips on the small labels ONLY (a full yellow card slab hides the footage; chips on every headline line eat the glyphs unless line-height >= 1.05). White 800-weight titles with a soft text-shadow survive bright skies.
