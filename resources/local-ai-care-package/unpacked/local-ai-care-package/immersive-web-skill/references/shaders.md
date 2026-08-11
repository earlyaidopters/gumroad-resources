# Shader techniques for the award-site look

The template ships a working noise-displacement + fresnel shader (`src/shaders/hero.js`). These are the extensions that produce the signature looks.

## The universal uniform kit

Every material gets: `uTime`, `uScroll` (0..1 page progress), `uPointer` (lerped mouse), `uVelocity` (scroll speed, decaying). Wire once, reuse everywhere. Share a `fit()` remap helper between JS and GLSL (archetype-1 pattern):

```glsl
float fit(float x, float a1, float a2, float b1, float b2) {
  return b1 + (clamp(x, min(a1,a2), max(a1,a2)) - a1) * (b2 - b1) / (a2 - a1);
}
// e.g. explode shards only during 30%..60% of the page:
float explode = fit(uScroll, 0.3, 0.6, 0.0, 1.0);
```

## Fresnel rim (in the template — the single highest-value trick)

```glsl
float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.5);
color += fresnel * rimColor;
```

## Frosted glass / ice (the archetype-1 look, simplified)

Real version: multi-sample rough refraction with jittered normals. Practical version that reads 90% the same:

```js
new THREE.MeshPhysicalMaterial({
  transmission: 1, roughness: 0.35, thickness: 1.2, ior: 1.4,
  attenuationColor: new THREE.Color("#88ccff"), attenuationDistance: 1.5,
});
```
Needs an environment map (`scene.environment = pmrem.fromEquirectangular(hdr).texture`). Animate `roughness` with pointer proximity for the "mouse frosts the surface" effect.

## Shatter / explode (archetype-1 shard rings)

Pre-split the mesh in Blender (Cell Fracture), export with per-piece origin baked into a vertex attribute (or use one Mesh per piece + InstancedMesh). Vertex shader:
```glsl
attribute vec3 centroidPos;   // piece center
attribute float rand;         // per-piece seed
vec3 dir = normalize(centroidPos);
vec3 displaced = position + dir * explode * (1.0 + rand * 2.0);
// + rotation around centroid scaled by explode for tumble
```

## Image/texture distortion on hover or scroll (the lando-style media effect)

Full-screen or per-image quad:
```glsl
vec2 uv = vUv;
uv.x += sin(uv.y * 6.0 + uTime * 0.001) * 0.02 * uVelocity;  // scroll ripple
vec2 toward = uv - uPointer * 0.5 - 0.5;
uv += normalize(toward) * 0.03 * smoothstep(0.4, 0.0, length(toward)); // pointer bulge
vec3 color = texture2D(uMap, uv).rgb;
```

## Chromatic aberration + grain + vignette (one grade pass)

```glsl
float ca = 0.0025 * (1.0 + uVelocity * 4.0);
vec3 color = vec3(
  texture2D(tDiffuse, uv + vec2(ca, 0.0)).r,
  texture2D(tDiffuse, uv).g,
  texture2D(tDiffuse, uv - vec2(ca, 0.0)).b);
float grain = (fract(sin(dot(uv * uTime, vec2(12.9898,78.233))) * 43758.5453) - 0.5) * 0.06;
float vig = smoothstep(1.0, 0.4, length(uv - 0.5));
gl_FragColor = vec4((color + grain) * vig, 1.0);
```
Blue-noise dither output on flat/pastel backgrounds to prevent banding.

## Particles (ambient atmosphere)

`THREE.Points` with a custom shader; positions in a BufferAttribute; drift with curl-ish noise in the vertex shader; `gl_PointSize` attenuated by depth; soft circular sprite in fragment (`smoothstep(0.5, 0.2, length(gl_PointCoord - 0.5))`). 2-5k points is plenty; fade with fresnel-style depth falloff.

## MatCap for stylized "toy world" lighting (archetype-3 look)

No lights at all: `new THREE.MeshMatcapMaterial({ matcap: tex })` or add a matcap term to a custom shader. Combine with baked AO texture + rim uniform. Entire scenes render cheap and look art-directed.

## Debug rule

Add Tweakpane (`npm i tweakpane`) behind `?debug` for every uniform. Award sites are tuned, not computed — expose amp/speed/colors and iterate live.
