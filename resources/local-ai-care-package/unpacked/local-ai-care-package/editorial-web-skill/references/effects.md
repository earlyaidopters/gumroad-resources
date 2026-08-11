# Special effects menu — editorial genre

Tasteful, component-gallery-grade effects. Pick 2-4 per site (record picks in DESIGN.md). Editorial restraint still rules: effects must feel like craftsmanship, not a demo reel. Every effect below is verified to work with the template's stack (GSAP + ScrollTrigger + Lenis). Effects marked [anime.js] need `npm install animejs` and `import { animate, stagger } from "animejs";` (v4 API — do NOT use the v3 `anime({...})` default-export syntax).

## 1. Magnetic buttons (cursor pull)

Buttons lean toward the cursor within a radius, spring back on leave.

```js
document.querySelectorAll(".btn, .nav__cta").forEach((btn) => {
  const strength = 24;
  btn.addEventListener("mousemove", (e) => {
    const r = btn.getBoundingClientRect();
    gsap.to(btn, { x: ((e.clientX - r.left) / r.width - 0.5) * strength,
                   y: ((e.clientY - r.top) / r.height - 0.5) * strength,
                   duration: 0.3, ease: "power2.out" });
  });
  btn.addEventListener("mouseleave", () =>
    gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" }));
});
```

## 2. Custom cursor dot

A small accent dot lerping behind the native cursor, scaling up over links/media.

```js
const dot = Object.assign(document.createElement("div"), { className: "cursor-dot" });
document.body.appendChild(dot);
let cx = -100, cy = -100, tx = -100, ty = -100;
dot.style.opacity = "0"; // hidden until the mouse first moves (else it parks at 0,0)
addEventListener("mousemove", (e) => {
  if (tx < 0) { cx = e.clientX; cy = e.clientY; dot.style.opacity = ""; }
  tx = e.clientX; ty = e.clientY;
});
gsap.ticker.add(() => {
  cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
  dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
});
document.querySelectorAll("a, .btn, .card, .feature__media").forEach((el) => {
  el.addEventListener("mouseenter", () => dot.classList.add("is-big"));
  el.addEventListener("mouseleave", () => dot.classList.remove("is-big"));
});
```
```css
.cursor-dot { position: fixed; top: 0; left: 0; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); pointer-events: none; z-index: 200;
  transition: width 0.25s, height 0.25s, opacity 0.25s; opacity: 0.85; }
.cursor-dot.is-big { width: 44px; height: 44px; opacity: 0.25; }
@media (hover: none) { .cursor-dot { display: none; } }
```

## 3. Film grain overlay

An animated SVG-noise layer over the whole page. Instantly premium on warm palettes.

```css
.grain { position: fixed; inset: -100%; z-index: 150; pointer-events: none; opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
```
```js
const grain = Object.assign(document.createElement("div"), { className: "grain" });
document.body.appendChild(grain);
setInterval(() => {
  grain.style.transform = `translate(${Math.random() * 6 - 3}%, ${Math.random() * 6 - 3}%)`;
}, 90);
```

## 4. Clip-path image reveals

Media plates wipe open on scroll instead of fading. Curtain from bottom, or iris for arches.

```js
document.querySelectorAll(".feature__media, .hero-media__frame").forEach((el) => {
  gsap.fromTo(el, { clipPath: "inset(12% 8% 88% 8% round 24px)" },
    { clipPath: "inset(0% 0% 0% 0% round 24px)", duration: 1.2, ease: "power4.inOut",
      scrollTrigger: { trigger: el, start: "top 80%" } });
  const img = el.querySelector("img, video");
  if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.4, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 80%" } });
});
```
Remove the plain `[data-reveal-group]` fade from these elements if applying (double animation = mush).

## 5. 3D tilt cards

Perspective tilt following the cursor, glare optional. Cap at ~6deg; editorial, not gamer RGB.

```js
document.querySelectorAll(".card").forEach((card) => {
  card.style.transformStyle = "preserve-3d";
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    gsap.to(card, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 10,
                    rotateX: -((e.clientY - r.top) / r.height - 0.5) * 8,
                    transformPerspective: 700, duration: 0.4, ease: "power2.out" });
  });
  card.addEventListener("mouseleave", () =>
    gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" }));
});
```

## 6. [anime.js] Character cascade headline

Hero headline letters rise and settle individually with spring physics — the anime.js signature. Replaces the split-line reveal on the SAME element (remove `data-split` from it, keep it elsewhere).

```js
import { animate, stagger } from "animejs";
const el = document.querySelector(".hero__title");
el.innerHTML = el.textContent.trim().split(/(\s+)/).map((tok) =>
  /^\s+$/.test(tok) ? " " : `<span class="word" style="display:inline-block;white-space:nowrap">${
    [...tok].map((ch) => `<span class="ch" style="display:inline-block">${ch}</span>`).join("")}</span>`
).join("");
animate(el.querySelectorAll(".ch"), {
  translateY: ["1.1em", "0em"], opacity: [0, 1],
  delay: stagger(24), duration: 900, ease: "outElastic(1, .8)",
});
```
Give `.hero__title` `overflow: hidden` per line if clipping is desired; keep `[data-split]` off this element.

## 7. [anime.js] SVG line-draw flourish

A hand-drawn underline/circle stroke that draws itself under a key word. Inline an SVG path (`fill:none; stroke:var(--accent)`), then:

```js
import { animate } from "animejs";
import { createDrawable } from "animejs"; // if unavailable in the installed version, fall back to the CSS technique below
```
Fallback that always works (no plugin API):
```js
const path = document.querySelector(".flourish path");
const len = path.getTotalLength();
path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
gsap.to(path, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut",
  scrollTrigger: { trigger: path, start: "top 80%" } });
```

## 8. Scroll progress hairline

1px accent line growing along the top of the viewport. Cheap, elegant.

```js
const bar = Object.assign(document.createElement("div"), { className: "progress" });
document.body.appendChild(bar);
gsap.to(bar, { scaleX: 1, ease: "none",
  scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 } });
```
```css
.progress { position: fixed; top: 0; left: 0; right: 0; height: 2px; background: var(--accent);
  transform: scaleX(0); transform-origin: left; z-index: 210; }
```

## 9. Number count-up stats

Stats count from 0 when scrolled into view. Parse the number, keep the suffix.

```js
document.querySelectorAll(".stat__num").forEach((el) => {
  const raw = el.textContent.trim();
  const num = parseFloat(raw.replace(/[^\d.]/g, "")); const suffix = raw.replace(/[\d.,]/g, "");
  const obj = { v: 0 };
  gsap.to(obj, { v: num, duration: 1.6, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 85%" },
    onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; } });
});
```

## 10. Velocity skew on scroll

Media plates shear slightly with scroll velocity — the page feels physical.

```js
let proxy = { skew: 0 };
const setSkew = gsap.quickSetter("[data-parallax] > *, .feature__media", "skewY", "deg");
ScrollTrigger.create({
  onUpdate: (self) => {
    const skew = gsap.utils.clamp(-4, 4, self.getVelocity() / -400);
    if (Math.abs(skew) > Math.abs(proxy.skew)) {
      proxy.skew = skew;
      gsap.to(proxy, { skew: 0, duration: 0.8, ease: "power3",
        overwrite: true, onUpdate: () => setSkew(proxy.skew) });
    }
  },
});
```

## Rules

- 2-4 effects per site, chosen to AGREE with the mood (soft SaaS: magnetic + cursor + cascade; warm brand: grain + clip reveals + tilt). Log picks in DESIGN.md.
- Respect `prefers-reduced-motion`: wrap effect init in `if (!matchMedia("(prefers-reduced-motion: reduce)").matches) { ... }`.
- After adding effects, re-run browser_check at top/mid/bottom AND confirm zero console errors — anime.js import failures are silent page-killers, check the console line in browser_check output.
- Never stack two entrance animations on one element.
