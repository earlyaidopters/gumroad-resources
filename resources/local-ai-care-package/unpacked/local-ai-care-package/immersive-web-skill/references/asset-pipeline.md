# Asset pipeline

Award sites feel fast because assets are brutally compressed and loading is honest (real progress, no fake spinners). Mark supplies raw assets; this is how to process them.

## 3D models → Draco GLB

```bash
npx @gltf-transform/cli optimize input.glb output.glb --compress draco --texture-compress webp
# inspect what's heavy:
npx @gltf-transform/cli inspect output.glb
```
Targets: hero model < 2 MB, whole site < 20-30 MB. The template's GLTFLoader already has the Draco decoder wired.

## Textures

- Color/photo textures: WebP at 80% quality, power-of-two sizes, 2048 max (1024 usually enough).
  `sips -Z 2048 -s format webp in.png --out out.webp` (macOS) or `cwebp -q 80`.
- For heavy texture sets, KTX2/Basis (GPU-compressed, stays compressed in VRAM):
  `npx ktx-tools` or `toktx --bcmp out.ktx2 in.png`; load with `KTX2Loader`.
- Always set `tex.colorSpace = THREE.SRGBColorSpace` on color maps; NOT on normal/roughness/data maps.

## Environment maps

HDR equirect (2k is fine, 4k rarely needed) from polyhaven.com → `RGBELoader` + `PMREMGenerator`. For the transmission/ice materials an env map is mandatory.

## Fonts

- Self-host WOFF2 only. Subset with `npx glyphhanger --whitelist-text="..."` or fontsquirrel.
- `font-display: block` for display faces (avoid FOUT flashing the hero headline).
- In-scene 3D text: troika-three-text takes a normal .ttf/.woff and SDF-renders it.

## Images and video

- Hero images: AVIF or WebP with explicit width/height.
- Background video: 1080p H.264/H.265, muted + playsinline + loop, < 8 MB; poster image for load.

## Audio (optional but distinctive — archetype-1 sites ship ~18 cues)

- Short UI cues: .m4a/.ogg, < 50 KB each, via WebAudio (`AudioContext` + `decodeAudioData`).
- Throttle repeats (min time between plays); start ambient loops only after first user gesture (autoplay policy).
- Master volume tied to a mute toggle in the UI. Always.

## Preloading (the pattern in the template's scene.load())

1. Collect every loader promise (models, textures, env, audio).
2. Aggregate progress → counter/bar in the DOM preloader.
3. `Promise.all` → fade preloader → fire hero intro animation.
Never let the site appear before WebGL has its assets: a popped-in hero kills the effect.

## Serving

- Everything local in `public/` (works offline, no CDN surprises). Vite fingerprints on build.
- Draco/Basis decoder WASM: copy into `public/libs/` and point loaders there for full offline dev (the template currently uses Google's hosted Draco decoder — swap when offline work matters).
