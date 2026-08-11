# The four archetypes of award-tier sites

Distilled from reverse-engineering the shipped bundles of four award-winning sites. Names withheld on purpose — what matters is the pattern, not the reference.

## Archetype 1 — The WebGL world (scroll as a journey through one continuous 3D space)

**Stack**: Vite + minimal UI framework for the preloader shell only + three.js + GSAP (ticker + timelines — notably NO ScrollTrigger, NO Lenis). Custom everything.
**Architecture**: empty HTML body, `overflow:hidden` — no native scroll at all. Custom virtual scroll (wheel/touch/pinch → lerped `scroll.y`) with **magnetic snap points** scenes settle into. ~37 scene classes (world, terrain, tunnel, particle systems, smoke...) each with `create/update/resize/debug`, gated by `Promise.all` into the preloader. Camera = blended named poses + path sampling, with shake and displacement layers.
**Signature techniques**: forked MeshPhysicalMaterial transmission into multi-sample rough refraction with blue-noise-jittered normals (frosted-glass/ice look) + mouse-proximity frosting; GPU fluid sim (splat/advect/pressure/curl) fed by cursor, smearing surfaces; pre-shattered Draco meshes with per-piece centroid/seed attributes exploding on scroll+mouse; scene-to-scene transitions via a compositor pass (two render targets blended with a displacement data texture + multi-tap spectral chromatic aberration); own post chain (LUT grade, ACES, bokeh sprites, FXAA, blue-noise dithering everywhere); MSDF mono text in-scene with typewriter reveals; ~18 short audio cues with per-cue throttling; rolling-FPS adaptive quality; Tweakpane dev scene behind a query param.
**Assets**: raw .drc Draco files, every texture KTX2/Basis (even noise/data textures), .exr env, ALL decoding in workers (audio, EXR, bitmaps, MSDF atlases).
**Steal first**: scene-class registry, snap-point virtual scroll, `fit()` remap shared JS↔GLSL, blue-noise dithering, sound design, adaptive quality.

## Archetype 2 — The hybrid DOM/WebGL showcase (3D living inside a normal page layout)

**Stack**: CMS/static layout (any) + one custom vanilla-JS bundle. Three.js + GSAP with ScrollTrigger (heavily scrubbed) + SplitText-style line splitting + **Lenis** (`lerp:0.1, syncTouch`) + a fetch-and-swap page-transition router + **Rive** for all 2D micro-motion.
**Architecture**: ONE persistent fullscreen canvas surviving page navigations; a scene registry (portrait/background/carousel/objects) where each scene renders to its own target and is positioned by **measuring DOM rects** of `data-gl` placeholder divs — WebGL appears to live inside the page layout. Lenis velocity feeds both GSAP and shader uniforms (kinetic type marquee speed = `delta + |lenis.velocity| * k`). Page transitions: fetch + swap the view container, play a Rive state-machine wipe, GL world persists.
**Signature techniques**: texture cross-fade inside the fragment shader (`tCurrentTexture/tNextTexture` + mask + `uTransition`) for variant swaps; cursor trail drawn into an offscreen FBO and camera-projected onto 3D surfaces ("touch leaves a mark"); 2.5D portrait — a photo relit with depth/alpha/normal maps instead of a scanned mesh; animated wireframe/outline pass; simplex-noise hero distortion scaled by eased cursor pace; MSDF WebGL type marquees; split-text line masks (`overflow:clip`, stagger, trigger `top 95%`, once); per-section theme swap (`data-theme` recolors nav, with matching pre-graded HDRI variants); WebGL2 gate adding a CSS fallback class.
**Assets**: Draco GLBs, WebP PBR sets with swappable variant textures, small pre-graded 1k HDRIs (light/faded/dark moods), matcaps, MSDF font atlases, .riv files preloaded with a counter.
**Steal first**: attribute-driven wiring (`data-gl`, `data-anim`, `data-theme`), DOM-rect-tracked GL objects, velocity-coupled marquee, split-line mask reveals, capability gate + fallback class.

## Archetype 3 — The browser game world (input-driven, not scroll-driven)

**Stack**: tiny custom SPA framework (templates + router) + trimmed three.js + GSAP core + a lightweight physics engine (cannon-es class). NO scroll libs — motion is player input.
**Architecture**: one persistent canvas + lazy-loaded HTML "views" (home/games/trophies/customization/dialog) with `enter/exit` lifecycle over the always-live 3D world. Third-person controller: sphere body in a physics world (heightfield ground, trimesh colliders), keyboard + touch joystick, damped follow-cam, spline camera rails for cinematics. Canvas emits semantic events (`scoreUpdate`, `achievement`, `collectable`, dialog routes) consumed by the DOM HUD.
**Signature techniques**: skinned GLB characters with AnimationMixer state machine (idle/walk/run cross-faded by speed); lighting entirely faked — baked AO + MatCap + one envMap + rim uniform + mild bloom (the "polished toy world" look); per-route binary asset packs fetched as arraybuffers with byte-level preloader progress; SVG sheets rasterized to canvas textures at runtime; MSDF font with stroke uniforms for in-world text; capability sniff → fallback page, rotate-device overlay.
**Steal first**: MatCap+bakedAO fake lighting, view-router-over-persistent-canvas, event bus between world and HUD, pack-based preloading with real progress.

## Archetype 4 — The video illusion (zero WebGL, looks like realtime 3D)

**Stack**: any framework + spring-based motion library + bundled Lenis + Lottie. NO three.js, NO shaders.
**Architecture**: the "3D atmosphere" is **pre-rendered VP9 .webm loops** (clouds, terrain, scans) served from own CDN with mobile variants, `preload:none`, IntersectionObserver play/pause, poster frames, `startTime` deep-links into longer renders. Every video feathered into the page with a gradient scrim in the base color. Scroll-linked motion = from/to states at ~50% viewport threshold interpolated by **springs** (stiffness 250-500, damping 60) — inertia, not linear scrubs. Sticky 100vh pinned stages where video holds and text/data cards swap. Mirror-repeat ambient idle loops, paused offscreen. DOM/SVG "scientific HUD": mono uppercase micro-labels, pulsing status dots, numbered steps, tooltip callouts. Preloader curtain → "Scroll to discover" cue.
**Steal first**: the whole model — see `video-driven.md`. Cheapest path to the award feel; the loops can come from Blender/HyperFrames.

## Cross-archetype invariants (all four do these)

1. Real preloader gating a choreographed hero entrance.
2. One motion authority (ticker/Lenis/springs) — never competing loops.
3. Huge display typography, tight tracking, masked line reveals.
4. Cursor and/or scroll velocity as a first-class animation input (except archetype 4).
5. Brutal asset compression (Draco/KTX2/WebP/VP9) + capability gate + graceful fallback.
6. The wow is AUTHORED (pre-shattered meshes, baked maps, offline renders, .riv files) — runtime code mostly replays and blends prepared assets.
