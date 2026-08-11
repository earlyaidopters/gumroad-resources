// Boot sequence: preload -> init scene -> init scroll -> single RAF loop.
// ONE requestAnimationFrame drives everything (Lenis + ScrollTrigger + Three)
// so scroll position and render never drift out of sync.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createScene } from "./scene.js";
import { initScroll } from "./scroll.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector("#webgl");
const scene = createScene(canvas);

// Smooth scroll. Lenis owns the wheel; ScrollTrigger reads its position.
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);

// Preload assets declared by the scene, show progress, then reveal the page.
const preloader = document.querySelector("#preloader");
const counter = document.querySelector("#preloader-counter");

scene
  .load((progress) => { counter.textContent = Math.round(progress * 100); })
  .then(() => {
    preloader.classList.add("is-done");
    initScroll(scene, lenis);
    intro();
  });

function intro() {
  // Hero entrance after preloader clears
  gsap.to("[data-section='hero'] [data-reveal]", {
    opacity: 1,
    y: 0,
    duration: 1.1,
    ease: "power3.out",
    stagger: 0.08,
    delay: 0.2,
  });
}

// The single loop. time is ms from RAF; Lenis wants it as-is, Three wants seconds.
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
  scene.render(time);
});
gsap.ticker.lagSmoothing(0);

window.addEventListener("resize", () => {
  scene.resize();
  ScrollTrigger.refresh();
});
