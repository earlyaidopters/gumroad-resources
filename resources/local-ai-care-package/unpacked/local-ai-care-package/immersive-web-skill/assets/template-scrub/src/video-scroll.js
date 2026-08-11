// Scroll-scrubbed video engine: scroll drives the playhead through frame sequence.
// Based on immersive-web archetype B2 (scrub-video.md).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FRAME_COUNT = {{FRAME_COUNT}};
let currentFrame = -1;
let canvas, ctx, frames = [];
let lastProgress = 0, velocity = 0;   // scrub velocity -> zoom kick + wind

const ALT_START = {{HUD_START}}, ALT_END = {{HUD_END}};
function updateHud(progress) {
  const alt = document.getElementById("hud-alt");
  const fill = document.getElementById("hud-fill");
  if (alt) alt.textContent = Math.round(ALT_START - (ALT_START - ALT_END) * progress).toLocaleString() + "{{HUD_UNIT}}";
  if (fill) fill.style.width = (progress * 100).toFixed(1) + "%";
  document.documentElement.classList.toggle("is-descending", progress > 0.02 && progress < 0.97);
}

// Cinemagraph idle: the image holds perfectly still on frame 0; only soft
// synthetic mist layers drift across it. (The source footage's camera moves,
// so replaying frames can't keep the mountains still — the drift is faked.)
let idleRaf = null;
let fogTex = null;

function buildFogTexture() {
  const W = 1600, H = 700;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.filter = "blur(26px)";
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * W, y = Math.random() * H * 0.75;
    const r = 55 + Math.random() * 120;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(235,238,240,0.55)");
    grad.addColorStop(1, "rgba(235,238,240,0)");
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.filter = "none";
  // fade the fog out toward the bottom so the valley stays crisp
  g.globalCompositeOperation = "destination-out";
  const fade = g.createLinearGradient(0, H * 0.45, 0, H);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = fade;
  g.fillRect(0, 0, W, H);
  return c;
}

export function initVideoScroll(lenis, onProgress) {
  console.log('initVideoScroll called');
  canvas = document.getElementById("cv");
  ctx = canvas.getContext("2d");

  // Load all frames
  const loadPromises = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    const frameNum = String(i + 1).padStart(4, "0");
    img.src = `/frames/frame_${frameNum}.jpg`;
    
    const promise = new Promise((resolve) => {
      img.onload = () => {
        console.log(`Frame ${i+1} loaded`);
        if (onProgress) onProgress((i + 1) / FRAME_COUNT);
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load frame ${i+1}`);
        resolve(); // Still resolve to not block
      };
    });
    loadPromises.push(promise);
    frames.push(img);
  }

  return Promise.all(loadPromises).then(() => {
    console.log('All frames loaded');
    // Set canvas size and draw first frame
    resize();
    drawFrame(0);

    // Create scroll trigger for the stage
    ScrollTrigger.create({
      trigger: "#stage",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        velocity = velocity * 0.85 + (progress - lastProgress) * 0.15;
        lastProgress = progress;
        updateHud(progress);
        windIntensity(Math.abs(velocity));
        const frameIndex = Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));

        // hand off between idle cinemagraph (at top) and scrub (scrolling)
        if (progress <= 0.002) startIdle();
        else stopIdle();

        if (progress > 0.002 && frameIndex !== currentFrame) {
          currentFrame = frameIndex;
          drawFrame(frameIndex);
        }

        // Update beat visibility based on progress
        updateBeats(progress);
      },
    });

    window.addEventListener("resize", resize);
    startIdle(); // page opens at the top — clouds drift until first scroll
  });
}

function startIdle() {
  if (idleRaf !== null) return;
  if (!fogTex) fogTex = buildFogTexture();
  const tick = (t) => {
    currentFrame = 0;
    drawFrame(0); // still image, no zoom at progress 0
    updateBeats(getScrollProgress()); // brand card shows at progress 0

    // two mist layers drifting at different speeds = parallax depth
    const cw = canvas.width, ch = canvas.height;
    const th = ch * 0.72; // fog occupies the upper part of the frame
    ctx.save();
    // normal blend: darkens over bright clouds, lifts over dark rock — visible everywhere
    const layers = [
      { speed: 75, alpha: 0.30, scale: 0.9, bob: 16, bobHz: 0.08 },
      { speed: 38, alpha: 0.22, scale: 1.4, bob: 10, bobHz: 0.05 },
      { speed: 18, alpha: 0.13, scale: 2.0, bob: 6,  bobHz: 0.03 },
    ];
    for (const L of layers) {
      const tw = cw * L.scale;
      const off = ((t / 1000) * L.speed * devicePixelRatio) % tw;
      const dy = Math.sin((t / 1000) * L.bobHz * Math.PI * 2) * L.bob * devicePixelRatio;
      ctx.globalAlpha = L.alpha;
      ctx.drawImage(fogTex, -off, dy, tw, th);
      ctx.drawImage(fogTex, tw - off, dy, tw, th); // seamless wrap
    }
    ctx.restore();
    idleRaf = requestAnimationFrame(tick);
  };
  idleRaf = requestAnimationFrame(tick);
}

function stopIdle() {
  if (idleRaf === null) return;
  cancelAnimationFrame(idleRaf);
  idleRaf = null;
}

function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete) return;

  const cw = canvas.width = canvas.clientWidth * devicePixelRatio;
  const ch = canvas.height = canvas.clientHeight * devicePixelRatio;

  // Cover fit with zoom effect (progressive push-in + velocity kick)
  const s = Math.max(cw / img.width, ch / img.height);
  const progress = getScrollProgress();
  const kick = Math.min(Math.abs(velocity) * 6, 0.06); // fast scroll pushes in slightly
  const zoom = 1 + Math.pow(progress, 1.5) * 0.35 + kick;
  const w = img.width * s * zoom;
  const h = img.height * s * zoom;

  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

function getScrollProgress() {
  const stage = document.getElementById("stage");
  const rect = stage.getBoundingClientRect();
  return Math.min(1, Math.max(0, -rect.top / (rect.height - innerHeight)));
}

function updateBeats(progress) {
  document.querySelectorAll(".beat").forEach((beat) => {
    const at = parseFloat(beat.dataset.at);
    const until = parseFloat(beat.dataset.until);
    beat.classList.toggle("on", progress >= at && progress <= until);
  });
}

function resize() {
  if (!canvas) return;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  if (currentFrame >= 0) {
    drawFrame(currentFrame);
  }
}


// ---- Wind ambience (procedural, no audio files) ----
let audioCtx = null, windGain = null, windOn = false, windTarget = 0;

function initWind() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const len = audioCtx.sampleRate * 4;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {           // brown-ish noise
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.5;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 0.4;
  windGain = audioCtx.createGain(); windGain.gain.value = 0;
  src.connect(lp).connect(windGain).connect(audioCtx.destination);
  src.start();
  // slow gain follower so gusts swell instead of snapping
  setInterval(() => {
    if (!windOn) return;
    const cur = windGain.gain.value;
    windGain.gain.value = cur + (windTarget - cur) * 0.06;
  }, 50);
}

function windIntensity(v) {
  windTarget = windOn ? Math.min(0.05 + v * 28, 0.3) : 0;
}

const soundBtn = document.getElementById("sound-toggle");
if (soundBtn) {
  soundBtn.addEventListener("click", () => {
    if (!audioCtx) initWind();
    if (audioCtx.state === "suspended") audioCtx.resume();
    windOn = !windOn;
    windTarget = windOn ? 0.08 : 0;
    if (!windOn && windGain) windGain.gain.value = 0;
    soundBtn.textContent = windOn ? "SOUND ON" : "SOUND OFF";
  });
}
