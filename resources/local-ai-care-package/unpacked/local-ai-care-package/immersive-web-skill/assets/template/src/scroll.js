// Scroll choreography: DOM reveals per section + a page-progress uniform that
// drives the 3D scene. Keep ALL scroll->3D mapping here so the scene stays dumb.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function initScroll(scene) {
  // 1) Page progress 0..1 -> uScroll uniform (the scene morphs as you scroll)
  ScrollTrigger.create({
    trigger: "#content",
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => { scene.uniforms.uScroll.value = self.progress; },
  });

  // 2) Camera dolly per chapter: move camera z in/out across sections
  gsap.to(scene.three.camera.position, {
    z: 3.2,
    ease: "none",
    scrollTrigger: {
      trigger: "[data-section='chapter-1']",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });

  // 3) DOM reveals: every [data-reveal] outside the hero animates in on enter
  document.querySelectorAll(".section:not(.section--hero)").forEach((section) => {
    const items = section.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.1,
      scrollTrigger: { trigger: section, start: "top 70%" },
    });
  });
}
