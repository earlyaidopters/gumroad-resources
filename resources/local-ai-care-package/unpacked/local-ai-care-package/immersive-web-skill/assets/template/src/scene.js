// Three.js scene: renderer, camera, hero object with a custom shader material,
// pointer parallax, and a scroll-driven uniform. Swap the placeholder icosphere
// for a loaded GLB when real assets exist (see loadModel below).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { vertexShader, fragmentShader } from "./shaders/hero.js";

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Lighting: one key, one fill, ambient floor. Enough for most materials.
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88bbff, 0.5);
  fill.position.set(-4, -2, 3);
  scene.add(fill);

  // Hero object: shader-displaced icosphere placeholder.
  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },      // 0..1 page progress, driven by scroll.js
    uPointer: { value: new THREE.Vector2() },
    uColorA: { value: new THREE.Color("#7ad7ff") },
    uColorB: { value: new THREE.Color("#1a1a2e") },
  };
  const hero = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.4, 64),
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms }),
  );
  scene.add(hero);

  // Pointer parallax (lerped in render for smoothness)
  const pointer = new THREE.Vector2();
  window.addEventListener("pointermove", (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  });

  // Assets to preload. Push loader promises here; report aggregate progress.
  const gltfLoader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  gltfLoader.setDRACOLoader(draco);

  async function loadModel(url) {
    const gltf = await gltfLoader.loadAsync(url);
    return gltf.scene;
  }

  async function load(onProgress) {
    // Placeholder: no external assets yet. Simulate a short load so the
    // preloader shows. Replace with real loader promises, e.g.:
    //   const model = await loadModel("/models/hero.glb"); scene.add(model);
    for (let i = 1; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 30));
      onProgress(i / 10);
    }
  }

  function render(time) {
    uniforms.uTime.value = time;
    uniforms.uPointer.value.lerp(pointer, 0.05);
    hero.rotation.y = time * 0.1 + uniforms.uScroll.value * Math.PI * 2;
    camera.position.x += (pointer.x * 0.3 - camera.position.x) * 0.05;
    camera.position.y += (pointer.y * 0.2 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  return { three: { scene, camera, renderer, hero }, uniforms, load, loadModel, render, resize };
}
