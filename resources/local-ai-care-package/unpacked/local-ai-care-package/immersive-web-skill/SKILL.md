---
name: immersive-web
description: Build award-tier immersive websites with WebGL, scroll choreography, shaders, or pre-rendered video — including turning a supplied video into a scroll-scrubbed site where scroll drives the playhead. Use for any request to build a cinematic, animated, 3D, or scroll-driven site, portfolio, or landing page. Includes a verified starter template and four reverse-engineered archetypes.
---

# Immersive websites

Build sites at the level that wins design awards: continuous 3D worlds, hybrid DOM/WebGL showcases, browser game worlds, and video-driven illusions. Four sites of this class were reverse-engineered from their shipped bundles; the distilled patterns live in `references/` and a verified working starter lives in `assets/template/`.

## Step 1 — Pick the archetype (ask Mark if ambiguous)

| Path | When | Reference |
|---|---|---|
| **A. WebGL scroll-narrative** | Scene must react to cursor/scroll continuously; abstract/product 3D hero | `references/three-scene.md`, `scroll-choreography.md`, `shaders.md` |
| **B. Video-driven (no WebGL)** | Wow moments can be rendered offline (atmosphere, flyovers, turntables); simpler + faster; pairs with Mark's video tooling | `references/video-driven.md` |
| **B2. Scroll-scrubbed video** | Mark supplies ONE video to become the site's spine: scroll drives the playhead, viewer flies through it, text beats overlay. ONE-SHOT pipeline below | `references/scrub-video.md` |
| **C. Game world** | Walkable 3D world, character, input-driven camera — big build, confirm scope first | `references/archetypes.md` (archetype 3) |

Hybrid A+B is common: video sections + one interactive WebGL hero. Read `references/archetypes.md` for the full anatomy of each archetype before committing.

## Path B2 one-shot pipeline (video -> finished site)

The full experience is pre-built and verified (cinemagraph idle, brand title card, alternating beats, altitude HUD, letterbox, velocity zoom, wind ambience, marquee, landing sections). Do NOT rebuild any of it. Run:

```bash
~/.pi/agent/skills/immersive-web/scripts/setup-scrub.sh <video.mp4> ./site "BRANDNAME" "TAGLINE" \
  "#e3b505" "ALT" 3842 1204 "M"   # optional: accent hex, HUD label/start/end/unit
```

Pick the accent FROM THE FOOTAGE (sample a dominant glow/highlight color) and a HUD metaphor that matches the journey: altitude for aerial descents, DEPTH counting down for dives/vaults, LAYER 01-07 for interiors, KM for drives.

The script probes the video, extracts frames at the right resolution, and injects frame count + runway. It prints the remaining `{{TOKENS}}`. Run this path on the LARGEST available model (the 122B) — smaller models handle single edits fine but not a full build. Then:

1. WATCH the video first (extract 6 spaced frames with ffmpeg, read them — you are a vision model). Understand the journey: where it starts, what it passes, where it lands. Write beat copy that NARRATES that journey.
2. Fill every `{{TOKEN}}` in index.html: 4 beats (label + three short punchy lines each, uppercase, 1-3 words per line), beat copy lines, CTA, landing lines, 2 marquee words. Match the brand's voice. No token may remain.
3. Rewrite the post-landing section copy (specs/materials/footer) for the actual product.
4. `npm install && npm run dev`, then `browser_check` with expect at scrollTo 0 (brand card + mist over STILL image), 0.15, 0.45, 0.75 (each beat: yellow chip label, compact white headline, correct side), and 1.0 plus the landing sections. Fix and re-check until every VERDICT is PASS.
5. Beat timing: if the video's visual chapters don't match the default data-at/data-until windows, retune them to land text on matching footage.
6. **MAKE IT ITS OWN — mandatory**: read `references/variation.md` AND `~/.agents/skill-packs/design-taste/gpt-tasteskill/SKILL.md` (brief inference + anti-slop rules), pick ONE option per axis from the brand's personality (palette mood, typography voice, label treatment, beat placement, HUD metaphor, idle treatment, marquee vs stat strip, landing sections), apply fully, and record picks + reasons in `DESIGN.md`. Two sites shipping the same combination is a FAIL. Then re-verify with browser_check.

Design system (locked layout, adaptive palette): accent-colored chips on small labels ONLY, compact white 800-weight headlines (~5vw, alternating left/right so the footage's path stays clear), tiny captions, footage is the star.

## Step 2 — Start from the template (path A, and the DOM/scroll layer of B)

```bash
# NOTE: do NOT mkdir site first — cp creates it. If site/ already exists you will
# end up with site/template/ nesting (this happened; npm install then fails).
cp -R ~/.pi/agent/skills/immersive-web/assets/template ./site && cd site
ls package.json   # MUST exist here before continuing
npm install && npm run dev   # verified working: preloader -> shader hero -> scroll morph
```

Vite + Three.js + GSAP ScrollTrigger + Lenis. `README.md` inside maps every file. Do NOT re-derive the boot wiring (single RAF loop, Lenis/ScrollTrigger sync) — it is already correct in `src/main.js`.

## Step 3 — Assets

Mark supplies raw assets (GLBs, images, video renders, fonts, brand). Process them per `references/asset-pipeline.md` (Draco GLB, WebP/KTX2, WOFF2, VP9 loops). Ask for what's missing rather than substituting stock.

## Step 4 — Build in beats

One `<section data-section>` per narrative beat. For each beat define: camera pose or video backdrop, one scene/material change, one text reveal. Wire scroll per `references/scroll-choreography.md` (progress→uniform, camera poses, pinned timelines, velocity input). Keep ALL scroll→scene mapping in `src/scroll.js`.

## Step 5 — The polish pass (this is what wins awards)

- Preloader with real progress; hero intro fires only after assets are ready.
- Fresnel rim on hero materials; grade pass (grain + vignette + subtle chromatic aberration).
- Pointer parallax on camera; scroll-velocity feeding a distortion uniform.
- Typography: huge display sizes, negative tracking (-0.03em), line-height ≤ 1; reveals in overflow-hidden line wraps.
- Sound design (optional, distinctive): tiny WebAudio cues + ambient loop with mute toggle.
- `prefers-reduced-motion` fallback; capability check with graceful static fallback.
- Tweakpane behind `?debug` for live-tuning uniforms. Award sites are tuned, not computed.
- EVERY component gets the treatment, not just the hero. Buttons, cards, nav, footer, form fields — if any element would look at home in a default Bootstrap page, restyle it (uppercase mono micro-labels, generous whitespace, tight display type, hover states, borders from the site palette). Mark's feedback on a real build: "things like this could look better across the board" — the hero was great and the components were generic. Sweep every section with browser_check before calling it done.

## When a fix "looks the same"

If Mark (or your own re-check) says nothing visually changed after your fix: STOP editing. The fix did not land. In order, check: (1) did you edit the file the page actually loads (grep the built/served HTML for the script name), (2) did the dev server rebuild (touch the file, watch the terminal), (3) is the browser caching (hard-reload, or bump a query param on the asset), (4) is another rule/style overriding yours (inspect specificity). Verify with browser_check that pixels ACTUALLY changed before claiming anything. Never say "should be fixed now" twice in a row.

## Verify (gates, not vibes)

```bash
npm run build            # must pass
```
Then LOOK at your work with the `browser_check` tool — you are a vision model:

1. `browser_check` the dev/preview URL with `expect` describing what should be visible, `mobile: true`.
2. Check scroll states too: `scrollTo: 0.3 / 0.6 / 0.9` with expectations per beat.
3. On any `VERDICT: FAIL` or console error: fix, re-check. Do not stop until every check passes.
4. Judge design honestly against the archetypes — generic hero-and-cards or default-looking output is a FAIL even if it renders.

With pi, set these gates BEFORE starting (goal_complete cannot pass until all succeed):
```
/gate npm run build
/gate ! grep -rq '{{' index.html
/gate test -f DESIGN.md
``` Performance sanity: pixelRatio capped at 2, draw calls < 150.

## Deep references

- `references/archetypes.md` — the four site archetypes with full anatomy and their steal-first lists
- `references/three-scene.md` — renderer/scene-class/camera-rig architecture, performance rules
- `references/scroll-choreography.md` — the five scroll patterns (progress uniform, camera poses, pinning, reveals, velocity)
- `references/shaders.md` — fresnel, frosted glass, shatter, image distortion, grade pass, particles, matcap
- `references/video-driven.md` — the no-WebGL path: loops, scrims, springs, sticky stages, HUD overlays
- `references/scrub-video.md` — one video as the site's spine: frame extraction + canvas scrub + beats
- `references/variation.md` — the 8 variation axes that keep every site distinct (mandatory for B2)
- `references/asset-pipeline.md` — compression commands and loading discipline
