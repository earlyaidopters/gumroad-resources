# Scroll choreography (Lenis + GSAP ScrollTrigger)

The defining trait of award-tier sites: scroll is a TIMELINE, not navigation. The page is a film strip; scroll position is the playhead.

## Non-negotiable wiring (already in the template)

- ONE `gsap.ticker` drives everything: `lenis.raf`, `ScrollTrigger.update`, and the Three render. Two RAF loops = jitter.
- `lenis.on("scroll", ScrollTrigger.update)` keeps trigger positions honest.
- `gsap.ticker.lagSmoothing(0)` prevents catch-up jumps after tab switches.
- On resize: `scene.resize()` then `ScrollTrigger.refresh()`.

## The five core patterns

### 1. Page progress → shader/scene uniform
```js
ScrollTrigger.create({
  trigger: "#content", start: "top top", end: "bottom bottom", scrub: true,
  onUpdate: (self) => { scene.uniforms.uScroll.value = self.progress; },
});
```
Everything downstream (morph amount, color mix, fog) reads that uniform. Cheapest way to make the whole scene feel scroll-alive.

### 2. Camera path per section (the signature archetype-1/2 move)
Give each section a camera pose; scrub between them:
```js
const poses = [
  { x: 0, y: 0, z: 6 },     // hero
  { x: 1.5, y: 0.4, z: 3.2 }, // chapter-1
  { x: -2, y: 1, z: 4.5 },  // chapter-2
];
poses.forEach((pose, i) => {
  if (i === 0) return;
  gsap.to(camera.position, {
    ...pose, ease: "none",
    scrollTrigger: { trigger: sections[i], start: "top bottom", end: "top top", scrub: true },
  });
});
```
Always `camera.lookAt(target)` in the render loop so poses only manage position.

### 3. Pinned section with internal timeline
A section freezes while an animation plays out (product tours, feature reveals):
```js
gsap.timeline({
  scrollTrigger: { trigger: ".feature", start: "top top", end: "+=200%", pin: true, scrub: 1 },
})
  .to(mesh.rotation, { y: Math.PI * 2 }, 0)
  .to(".feature h2", { opacity: 1, y: 0 }, 0.2)
  .to(mesh.material.uniforms.uMix, { value: 1 }, 0.5);
```
`end: "+=200%"` = user scrolls 2 viewport-heights while pinned. Budget 100% per beat.

### 4. Text reveal on enter (non-scrubbed)
```js
gsap.to(section.querySelectorAll("[data-reveal]"), {
  opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.1,
  scrollTrigger: { trigger: section, start: "top 70%" },
});
```
For line-by-line splits: wrap each line in an overflow-hidden span, translate inner span 100% -> 0. Do the split in HTML/JS at build, not with paid SplitText.

### 5. Velocity as an input
```js
lenis.on("scroll", ({ velocity }) => {
  scene.uniforms.uVelocity.value = gsap.utils.clamp(-1, 1, velocity * 0.02);
});
```
Map |velocity| to distortion/skew/blur. Decay it back to 0 in the render loop (`value *= 0.95`). This is the "site feels alive under my finger" trick.

## Rules of thumb

- Scrubbed values: `ease: "none"` (the scroll IS the easing). Enter animations: real eases.
- `scrub: true` = locked; `scrub: 1` = 1s lag, feels expensive. Use `scrub: 1` for camera, `true` for uniforms.
- Never animate `top/left/width`; only `transform` and `opacity` (compositor-only).
- Test with keyboard scrolling and trackpad; set `markers: true` on ScrollTrigger while debugging.
- Respect `prefers-reduced-motion`: skip scrubbed camera moves, keep instant reveals.
