// Boot sequence: preload video frames -> init scroll -> reveal page.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { initVideoScroll } from "./video-scroll.js";

gsap.registerPlugin(ScrollTrigger);

// Smooth scroll. Lenis owns the wheel; ScrollTrigger reads its position.
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);

// Preloader
const preloader = document.querySelector("#preloader");
const counter = document.querySelector("#preloader-counter");

// Initialize video scroll and wait for frames to load
let loadedFrames = 0;
const totalFrames = 362;

initVideoScroll(lenis, (progress) => {
  counter.textContent = Math.round(progress * 100);
  if (progress >= 1) {
    preloader.classList.add("is-done");
    intro();
  }
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

  // Reveal elements in subsequent sections as they enter viewport
  document.querySelectorAll("[data-section]:not([data-section='hero'])").forEach((section) => {
    const items = section.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.1,
      scrollTrigger: { trigger: section, start: "top 75%" },
    });
  });
}

// The single loop for Lenis
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

window.addEventListener("resize", () => {
  ScrollTrigger.refresh();
});
