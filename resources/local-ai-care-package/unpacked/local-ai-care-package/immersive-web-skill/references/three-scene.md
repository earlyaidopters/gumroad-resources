# Three.js scene architecture

## Renderer baseline (always)

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // never above 2
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // when using lights/HDR
```

Canvas is `position: fixed; inset: 0; z-index: 0`; DOM content scrolls above it at `z-index: 1`. This "fixed canvas + scrolling DOM" split is how nearly every award site works.

## Scene-class pattern (archetype-1 architecture, simplified)

One controller owns N scene modules. Each module exposes the same contract:

```js
class Module {
  async create() {}        // load assets, build meshes; returns when ready
  update(time, scroll) {}  // called every frame from the single ticker
  resize(w, h) {}
  dispose() {}
}
```

The controller: `await Promise.all(modules.map(m => m.create()))` gates the preloader; then per frame calls every `update`. New visual idea = new module, never a rewrite.

## Camera rigs

- **Pose blend**: keep `basePosition` + per-section target poses; lerp position, always `lookAt(target)` in update. Add `pointer * 0.3` offset for parallax.
- **Path**: `new THREE.CatmullRomCurve3(points)` then `curve.getPointAt(scrollProgress)` for fly-through cameras. Sample `getPointAt(progress + 0.01)` for the lookAt.
- **Shake/impact**: add a decaying noise offset on events; never move the base pose.

## Performance rules (these decide whether it feels "expensive")

1. ONE render loop. All modules update from it.
2. Reuse geometries/materials; `InstancedMesh` for anything repeated > 10x.
3. Target < 300k triangles on screen; Draco-compress models (see asset-pipeline.md).
4. No shadows unless essential; fake with blob textures or baked AO.
5. Watch a rolling FPS average; below ~45, drop pixel ratio to 1 and disable post effects (adaptive quality — archetype-1 sites do exactly this).
6. `renderer.info.render.calls` under ~150 draw calls.
7. Dispose on teardown: geometry, material, textures — WebGL leaks kill long sessions.

## Post-processing (use sparingly)

```js
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.8, 0.85));
// then composer.render() instead of renderer.render()
```

Award-tier grade cheaply: subtle vignette + film grain + chromatic aberration in ONE custom ShaderPass, not five stacked passes. Blue-noise dither the output to kill gradient banding on flat backgrounds.

## Text in 3D

For text that lives inside the scene (not DOM): use troika-three-text (`npm i troika-three-text`) — SDF text, crisp at any scale, supports custom fonts. DOM typography over canvas is fine for most content; only put text in WebGL when it must interact with the scene (distortion, depth, particles).
