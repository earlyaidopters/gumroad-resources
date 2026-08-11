import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---------- smooth scroll (single RAF, Lenis drives ScrollTrigger) ---------- */
const lenis = new Lenis({ lerp: 0.1 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ---------- nav background after leaving the top ---------- */
const nav = document.getElementById("nav");
ScrollTrigger.create({
  start: 60,
  onEnter: () => nav.classList.add("is-scrolled"),
  onLeaveBack: () => nav.classList.remove("is-scrolled"),
});

/* ---------- split-line reveal for display headlines ---------- */
document.querySelectorAll("[data-split]").forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  // Wrap each word; group into visual lines after layout.
  const spans = words.map((w) => {
    const s = document.createElement("span");
    s.textContent = w + " ";
    s.style.display = "inline-block";
    el.appendChild(s);
    return s;
  });
  const lines = new Map();
  spans.forEach((s) => {
    const top = Math.round(s.offsetTop);
    if (!lines.has(top)) lines.set(top, []);
    lines.get(top).push(s);
  });
  el.textContent = "";
  lines.forEach((lineSpans) => {
    const line = document.createElement("span");
    line.className = "split-line";
    const inner = document.createElement("span");
    lineSpans.forEach((s) => inner.appendChild(s));
    line.appendChild(inner);
    el.appendChild(line);
  });
  gsap.from(el.querySelectorAll(".split-line > span"), {
    yPercent: 110,
    duration: 1.1,
    ease: "power4.out",
    stagger: 0.09,
    scrollTrigger: { trigger: el, start: "top 85%" },
  });
});

/* ---------- generic reveals ---------- */
document.querySelectorAll("[data-reveal]").forEach((el) => {
  gsap.to(el, {
    opacity: 1, y: 0, duration: 1, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 88%" },
  });
});
document.querySelectorAll("[data-reveal-group]").forEach((group) => {
  gsap.to(group.children, {
    opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.12,
    scrollTrigger: { trigger: group, start: "top 82%" },
  });
});

/* ---------- hero media parallax ---------- */
document.querySelectorAll("[data-parallax]").forEach((section) => {
  const frame = section.firstElementChild;
  gsap.fromTo(frame, { y: 40 }, {
    y: -40, ease: "none",
    scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
  });
});

/* ---------- drag-to-scroll card rail ---------- */
document.querySelectorAll("[data-drag-rail]").forEach((track) => {
  let isDown = false, startX = 0, startScroll = 0;
  track.addEventListener("pointerdown", (e) => {
    isDown = true; startX = e.clientX; startScroll = track.scrollLeft;
    track.classList.add("is-dragging"); track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    track.scrollLeft = startScroll - (e.clientX - startX);
  });
  ["pointerup", "pointercancel"].forEach((ev) =>
    track.addEventListener(ev, () => { isDown = false; track.classList.remove("is-dragging"); })
  );
});

/* ---------- resilient autoplay (background tabs defer video load) ---------- */
document.querySelectorAll("video[autoplay]").forEach((v) => {
  const kick = () => { if (v.readyState === 0) v.load(); v.play().catch(() => {}); };
  kick();
  document.addEventListener("visibilitychange", kick);
  setTimeout(kick, 1500);
});

/* ---------- anchor links ride Lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -70 });
  });
});
