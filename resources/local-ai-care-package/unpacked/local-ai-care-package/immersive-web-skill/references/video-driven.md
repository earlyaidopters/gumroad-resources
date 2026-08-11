# The video-driven path (no WebGL) — the video-illusion archetype

This archetype has ZERO WebGL/three.js/GSAP — the "3D" is pre-rendered video loops composited with DOM. This path is dramatically simpler than WebGL, looks just as expensive when the renders are good, and pairs perfectly with Mark's video-generation tools (HyperFrames, Blender, AE) for producing the loops.

**Choose this path when**: the wow moments can be authored offline (atmosphere flyovers, product turntables, abstract loops) and don't need to react to the cursor. Choose WebGL when the scene must respond to input continuously.

## The formula

1. **Pre-rendered loops are the engine.** 5-15s seamless loops, VP9 `.webm` (+ H.264 mp4 fallback), desktop + lighter mobile encode. Full-bleed background, one per major section.
2. **Feather every video into the page** with a gradient scrim in the page base color so video edges never read as rectangles:
   ```css
   .scrim { position: absolute; inset: 0;
     background: linear-gradient(180deg, var(--bg) 0%, transparent 30%, transparent 70%, var(--bg) 100%); }
   ```
3. **Video hygiene**: `preload="none" muted playsinline loop` + poster frame; IntersectionObserver (10% rootMargin) plays/pauses so offscreen video never decodes. `video.currentTime = t` to deep-link into a longer render.
4. **Lenis for smooth scroll** — inertia is what separates this from a normal marketing page.
5. **Spring entrances, not linear scrubs**: elements enter with `opacity 0→1, scale 1.5→1, y 80→0` on a ~50% viewport threshold through a spring (GSAP: `ease: "back.out(1.4)"` or elastic; stiffness ~250-500 / damping ~60 territory). Motion with inertia reads "designed"; linear reads "cheap".
6. **Sticky pinned stages**: `position: sticky; top: 0; height: 100vh; overflow: hidden` sections where the video holds while foreground text/data cards swap as you scroll.
7. **HUD overlay in plain DOM/SVG**: uppercase monospace micro-labels, pulsing status dots, numbered steps (01/02/03), tooltip callouts over the video. The credibility layer is cheap HTML, always crisp.
8. **Ambient idle loops**: slow mirror-repeat drift/pulse on decorative elements (GSAP `yoyo: true, repeat: -1`), paused offscreen. The page never feels static.
9. **Preloader curtain**: near-black overlay + logo, transitions out into the hero, then a "Scroll to discover" cue.
10. **Typography + depth cues**: display font at -0.05em tracking / 95% line-height; sprinkle CSS `perspective` + small `rotateX`, `blur()` and blend modes on cards; `will-change: transform` on animated layers only.

## Producing the loops (Mark's tooling)

- Blender: cloud/terrain/product renders → export PNG sequence → ffmpeg.
- HyperFrames compositions can be batch-rendered to MP4 and converted.
- Encode: `ffmpeg -i in.mp4 -c:v libvpx-vp9 -b:v 0 -crf 32 -an out.webm` (and `-crf 38 -vf scale=720:-2` for the mobile variant).
- Seamlessness: crossfade the tail into the head (`ffmpeg xfade`) or render a palindrome (`-vf "split[a][b];[b]reverse[r];[a][r]concat"`).

## Hybrid note

The two paths compose: video sections for authored atmosphere + one WebGL canvas for a single interactive hero. Don't run video AND heavy WebGL in the same viewport simultaneously.
