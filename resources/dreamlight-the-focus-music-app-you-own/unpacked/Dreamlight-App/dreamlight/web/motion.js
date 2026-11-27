const $ = (id) => document.getElementById(id);
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let prefersReducedMotion = motionPreference.matches;

const motionManifest = {};
const loadMotionManifest = fetch("motion/manifest.json").then((response) => response.ok ? response.json() : {})
  .then((data) => { Object.assign(motionManifest, data); }).catch(() => {});

function sceneArt(group, key, mode) {
  const inventory = motionManifest[group];
  const stem = `motion/${group}/${key}`;
  return {
    poster: inventory?.posters?.includes(key) ? stem + ".jpg" : "",
    loop: inventory?.loops?.includes(key) ? stem + ".mp4" : "",
    hue: mode?.hue,
    focal: group === "modes" ? mode?.focal : undefined,
  };
}

const artForMode = (key) => sceneArt("modes", key, MODE_BY_KEY.get(key));
const artForActivity = (activity) => sceneArt("activities", activity.key, MODE_BY_KEY.get(activity.mode));
const artForTrack = (track) => ({ poster: track?.cover, loop: track?.coverLoop, hue: track?.palette?.[0] });
const availableArt = ({ poster = "", loop = "", hue = "#38E8C6", focal = "center" } = {}) => ({ poster, loop, hue, focal });

const motion = (() => {
  const slots = new WeakMap();
  const broken = new Set();
  const running = new Map();
  let stage = null, hovered = null, focused = null, suspended = false, exclusive = false;
  const viewport = new IntersectionObserver(sync);

  function setArt(slot, art) {
    const { poster, loop, hue, focal } = availableArt(art);
    const previous = slots.get(slot);
    if (previous?.poster === poster && previous.loop === loop && previous.hue === hue && previous.focal === focal) return;
    stop(slot, true);
    const img = slot.querySelector("img");
    img.onerror = () => { img.removeAttribute("src"); img.hidden = true; };
    img.hidden = !poster;
    if (poster) img.src = poster;
    else img.removeAttribute("src");
    slot.style.setProperty("--art-hue", hue);
    slot.style.setProperty("--art-focal", focal);
    slot.classList.toggle("still-art", Boolean(poster && !loop));
    slots.set(slot, { poster, loop, hue, focal });
  }

  function stop(slot, unload = false) {
    const video = slot.querySelector("video");
    if (!video) return;
    video.pause();
    slot.classList.remove("decoded");
    running.delete(slot);
    if (unload) video.remove();
  }

  function start(slot) {
    const art = slots.get(slot);
    if (!art?.loop || broken.has(art.loop) || running.has(slot)) return;
    let video = slot.querySelector("video");
    if (!video) {
      video = document.createElement("video");
      video.muted = video.loop = video.playsInline = true;
      video.preload = "none";
      if (art.poster) video.poster = art.poster;
      video.addEventListener("error", () => {
        broken.add(art.loop);
        stop(slot, true);
      }, { once: true });
      video.addEventListener("playing", () => {
        const show = () => {
          if (running.get(slot) === video && !video.paused) slot.classList.add("decoded");
        };
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(show);
        else {
          video.addEventListener("timeupdate", function reveal() {
            if (video.currentTime <= 0) return;
            video.removeEventListener("timeupdate", reveal);
            show();
          });
        }
      });
      slot.append(video);
      video.src = art.loop;
    }
    running.set(slot, video);
    video.play().catch(() => {
      if (running.get(slot) === video && video.paused) stop(slot);
    });
  }

  function isVisible(slot) {
    if (!slot?.isConnected || !slot.getClientRects().length || slot.closest("[hidden]")) return false;
    const rect = slot.getBoundingClientRect();
    return rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0;
  }

  function sync() {
    const preview = exclusive ? null : hovered || focused;
    const candidates = document.hidden || suspended || prefersReducedMotion ? [] : [stage, preview].filter(isVisible);
    for (const slot of running.keys()) if (!candidates.includes(slot)) stop(slot);
    candidates.forEach(start);
  }

  function selectStage(slot, single = false) {
    if (stage !== slot) {
      stage?.classList.remove("stage-art");
      if (stage && stage !== hovered && stage !== focused) viewport.unobserve(stage);
      stage = slot;
      if (stage) {
        stage.classList.add("stage-art");
        viewport.observe(stage);
      }
    }
    exclusive = single;
    sync();
  }

  function bindTile(button, slot) {
    const pick = (kind, on) => {
      if (kind === "pointer") hovered = on ? slot : hovered === slot ? null : hovered;
      else focused = on ? slot : focused === slot ? null : focused;
      if (on) viewport.observe(slot);
      if (!on && slot !== stage && slot !== hovered && slot !== focused) viewport.unobserve(slot);
      sync();
    };
    button.addEventListener("pointerenter", (event) => { if (event.pointerType !== "touch") pick("pointer", true); });
    button.addEventListener("pointerleave", () => pick("pointer", false));
    button.addEventListener("focus", () => { if (button.matches(":focus-visible")) pick("focus", true); });
    button.addEventListener("blur", () => pick("focus", false));
  }

  function clearPreviews() {
    [hovered, focused].filter((slot) => slot && slot !== stage).forEach((slot) => viewport.unobserve(slot));
    hovered = focused = null;
    sync();
  }

  function suppress(on) {
    suspended = on;
    sync();
  }

  document.addEventListener("visibilitychange", sync);
  return { setArt, selectStage, bindTile, clearPreviews, suppress, sync };
})();
