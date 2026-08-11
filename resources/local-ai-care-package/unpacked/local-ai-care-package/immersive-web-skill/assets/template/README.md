# Immersive site starter

Vite + Three.js + GSAP ScrollTrigger + Lenis. The stack behind award-tier immersive sites, reduced to a minimal working core.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
```

## Where everything lives

| File | Owns |
|---|---|
| `index.html` | Section structure. Each `<section data-section>` is one scene beat |
| `src/style.css` | Canvas-first dark styling, `[data-reveal]` hidden states, preloader |
| `src/main.js` | Boot order: preload → scene → scroll → ONE unified RAF loop |
| `src/scene.js` | Renderer, camera, lights, hero mesh, pointer parallax, GLB loading |
| `src/scroll.js` | ALL scroll→3D and scroll→DOM mapping (keep it here) |
| `src/shaders/hero.js` | Noise-displacement vertex + fresnel fragment shader |

## Plugging in real assets

- **3D model**: drop `hero.glb` in `public/models/`, then in `scene.js` `load()`: `const model = await loadModel("/models/hero.glb"); scene.add(model);` (Draco-compressed GLBs work; decoder is wired.)
- **Textures**: `public/textures/`, load with `THREE.TextureLoader`, set `tex.colorSpace = THREE.SRGBColorSpace` for color maps.
- **Fonts**: self-host WOFF2 in `public/fonts/`, declare `@font-face` in `style.css`.

## Extending

- New scene beat = new `<section>` in HTML + a ScrollTrigger block in `scroll.js` (camera move, uniform ramp, material swap).
- Post-processing (bloom etc.): `EffectComposer` from `three/addons/postprocessing/` — replace `renderer.render` with `composer.render()` in `scene.js`.
- Never add a second RAF loop. Everything renders from the gsap.ticker in `main.js`.
