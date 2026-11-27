// Track-authored Signature worlds and shared procedural visualizers.
const targetPalette = [[52, 211, 153], [96, 165, 250], [245, 208, 169]];
const currentPalette = targetPalette.map((color) => [...color]);

function getTrackVisual(track) {
  return track?.visual || {
    archetype: "aurora_silk", motionSpeed: 1,
    breathPattern: [4, 4, 6, 2], breathLabel: "4 · 4 · 6 · 2",
    particleStyle: "stars", glowBias: 1, geometry: 5,
  };
}

function setVisualTrack(track) {
  if (track?.palette) {
    track.palette.forEach((color, index) => {
      targetPalette[index] = color.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
    });
  }
  reseedParticlesForTrack(track);
}

const canvas = $("vizCanvas"), ctx = canvas.getContext("2d", { alpha: false });
let cw = 0, ch = 0, dpr = 1;

const PARTICLE_COUNT = 84;
const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
  x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9,
  r: 0.8 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 0.00018,
  vy: -0.00012 - Math.random() * 0.00025, phase: Math.random() * Math.PI * 2,
  len: 10 + Math.random() * 22,
}));

function reseedParticlesForTrack(track) {
  const style = getTrackVisual(track).particleStyle || "stars";
  for (const p of particles) {
    p.phase = Math.random() * Math.PI * 2;
    if (style === "rain") {
      p.vx = -0.00045; p.vy = 0.0032 + Math.random() * 0.0028; p.r = 1.0 + Math.random() * 0.8; p.len = 16 + Math.random() * 24;
    } else if (style === "embers") {
      p.vx = (Math.random() - 0.5) * 0.00035; p.vy = -0.00055 - Math.random() * 0.0008; p.r = 1.2 + Math.random() * 2.4;
    } else if (style === "bubbles") {
      p.vx = (Math.random() - 0.5) * 0.00012; p.vy = -0.00022 - Math.random() * 0.00035; p.r = 1.8 + Math.random() * 3.8;
    } else if (style === "sparks") {
      p.vx = (Math.random() - 0.5) * 0.0007; p.vy = (Math.random() - 0.5) * 0.0007; p.r = 1.0 + Math.random() * 1.6;
    } else if (style === "mist") {
      p.vx = 0.00018 + Math.random() * 0.00025; p.vy = (Math.random() - 0.5) * 0.00008; p.r = 10 + Math.random() * 18;
    } else if (style === "petals" || style === "pollen") {
      p.vx = (Math.random() - 0.5) * 0.00022; p.vy = -0.00016 + (Math.random() - 0.5) * 0.0002; p.r = 1.5 + Math.random() * 2.4;
    } else {
      p.vx = (Math.random() - 0.5) * 0.00012; p.vy = -0.00005 - Math.random() * 0.00014; p.r = 0.8 + Math.random() * 1.7;
    }
  }
}

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = canvas.clientWidth;
  ch = canvas.clientHeight;
  if (!cw || !ch) return;
  if (canvas.width === Math.floor(cw * dpr) && canvas.height === Math.floor(ch * dpr)) return;
  canvas.width = Math.floor(cw * dpr); canvas.height = Math.floor(ch * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
let visualFrame = null;

function syncVisualizer() {
  if (visualFrame !== null) cancelAnimationFrame(visualFrame);
  visualFrame = null;
  if (canvas.hidden || document.hidden || !canvas.getClientRects().length) return;
  resizeCanvas();
  lastTs = performance.now();
  if (prefersReducedMotion) {
    for (let i = 0; i < targetPalette.length; i++) currentPalette[i] = [...targetPalette[i]];
    drawFrame(lastTs);
  } else {
    visualFrame = requestAnimationFrame(animateVisualizer);
  }
}

function animateVisualizer(now) {
  drawFrame(now);
  visualFrame = requestAnimationFrame(animateVisualizer);
}

const FFT_BINS = 512, timeData = new Float32Array(1024), freqData = new Uint8Array(FFT_BINS);
const env = { sub: 0.12, bass: 0.12, lowMid: 0.10, mid: 0.08, high: 0.06, rms: 0.10 };
const SPEC_BARS = 84, specLevels = new Float32Array(SPEC_BARS), smoothWave = new Float32Array(128);
let lastTs = performance.now(), tAnim = 0;

function rgbStr(a, alpha = 1) { return `rgba(${a[0]|0},${a[1]|0},${a[2]|0},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`; }
function followEnv(cur, target, atk, rel, dtS) { return cur + (target - cur) * Math.min(1, (target > cur ? atk : rel) * dtS); }

function drawTrackParticles(style, motionMul, glow, beatPulse) {
  const count = cw <= 920 ? 48 : PARTICLE_COUNT;
  for (let i = 0; i < count; i++) {
    const p = particles[i];
    const speed = motionMul * (prefersReducedMotion ? 0.12 : 1.0);
    p.x = (p.x + p.vx * dtSCache * speed * (1 + env.mid * 0.9) + 1) % 1;
    p.y = (p.y + p.vy * dtSCache * speed * (1 + env.sub * 1.5) + 1) % 1;
    const px = p.x * cw, py = p.y * ch;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tAnim * (1.2 + motionMul) + p.phase));
    const col = i % 3 === 0 ? currentPalette[2] : (i % 2 === 0 ? currentPalette[0] : currentPalette[1]);

    if (style === "rain") {
      ctx.strokeStyle = rgbStr(col, (0.14 + env.high * 0.28) * tw * glow);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - p.len * 0.18, py + p.len);
      ctx.stroke();
    } else if (style === "bubbles") {
      const rad = p.r * (1 + env.sub * 0.45);
      ctx.strokeStyle = rgbStr(col, (0.16 + env.bass * 0.20) * tw);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.stroke();
    } else if (style === "mist") {
      const rad = p.r * (1 + env.lowMid * 0.5);
      const mg = ctx.createRadialGradient(px, py, 0, px, py, rad);
      mg.addColorStop(0, rgbStr(col, 0.06 * tw * glow));
      mg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "embers" || style === "sparks") {
      const rad = p.r * (0.8 + beatPulse * 0.55 + env.high * 0.4);
      ctx.fillStyle = rgbStr(col, (0.28 + env.rms * 0.45) * tw * glow);
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "prisms") {
      const rad = p.r * 2.2 * (0.85 + env.high * 0.6);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tAnim * 0.4 + p.phase);
      ctx.strokeStyle = rgbStr(col, 0.24 * tw * glow);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -rad); ctx.lineTo(rad * 0.86, rad * 0.5); ctx.lineTo(-rad * 0.86, rad * 0.5);
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = rgbStr(col, (0.22 + 0.34 * tw) * (0.65 + env.high * 0.6));
      ctx.fillRect(px, py, p.r, p.r);
    }
  }
}

let dtSCache = 1;

function drawFrame(nowTs) {
  const isMobile = canvas.clientWidth <= 720;

  const dt = Math.min(0.05, Math.max(0.004, (nowTs - lastTs) / 1000)); lastTs = nowTs;
  const dtS = dt * 60; dtSCache = dtS;

  const track = getCurrentTrack();
  const vis = getTrackVisual(track);
  const bpm = (track && track.bpm) || 110;
  const beatHz = (track && track.beatHz) || 14;
  const motionMul = (vis.motionSpeed || 1.0) * (prefersReducedMotion ? 0.18 : 1.0);
  tAnim += dt * motionMul;

  for (let i=0;i<3;i++) for (let c=0;c<3;c++) currentPalette[i][c] += (targetPalette[i][c]-currentPalette[i][c])*Math.min(1,0.045*dtS);

  // Compute BPM phase & safe harmonic shimmer derived from track beatHz
  const ct = (state.isPlaying && decks[activeDeck].el.currentTime) ? decks[activeDeck].el.currentTime : tAnim;
  const beatSec = 60.0 / bpm;
  const beatPhase = (ct % beatSec) / beatSec;
  const beatPulse = prefersReducedMotion ? 0.15 : Math.exp(-beatPhase * 4.8);
  // Map brainwave Hz smoothly to a gentle harmonic modulation rate (0.8 - 4.2 Hz visual resonance, never harsh strobing)
  const shimmerRate = Math.min(4.2, Math.max(0.5, beatHz * 0.12));
  const neuralShimmer = prefersReducedMotion ? 0.5 : (0.5 + 0.5 * Math.sin(ct * Math.PI * 2 * shimmerRate));

  let rSub=0,rBass=0,rLow=0,rMid=0,rHigh=0,rRms=0;
  const useFFT = !isIOS && analyser && state.isPlaying;
  if (useFFT) {
    analyser.getByteFrequencyData(freqData); analyser.getFloatTimeDomainData(timeData);
    const hzBin = (audioCtx ? audioCtx.sampleRate : 44100) / (FFT_BINS * 2);
    const avgB = (lo, hi) => { const a=Math.max(1,Math.floor(lo/hzBin)), b=Math.min(FFT_BINS-1,Math.ceil(hi/hzBin)); let s=0; for(let i=a;i<=b;i++) s+=freqData[i]; return s/(Math.max(1,b-a+1)*255); };
    rSub=avgB(28,85); rBass=avgB(85,220); rLow=avgB(220,650); rMid=avgB(650,2200); rHigh=avgB(2200,8200);
    let sq=0; for(let i=0;i<timeData.length;i+=4) sq+=timeData[i]*timeData[i]; rRms=Math.min(1,Math.sqrt(sq/(timeData.length/4))*2.2);
    const seg = Math.floor(timeData.length / smoothWave.length);
    for (let i=0;i<smoothWave.length;i++) { let a=0, b=i*seg; for(let j=0;j<seg;j++) a+=timeData[b+j]; smoothWave[i]+=(a/seg-smoothWave[i])*Math.min(1,0.38*dtS); }
  } else if (state.isPlaying) {
    const ep = Math.exp(-(((ct%(beatSec*0.5))/(beatSec*0.5))*4.5)), sw = 0.5+0.5*Math.sin(ct*0.35);
    rSub=0.22+0.58*beatPulse; rBass=0.20+0.42*Math.pow(Math.sin(beatPhase*Math.PI),1.4);
    rLow=0.22+0.26*sw+0.18*ep; rMid=0.16+0.22*ep*(0.5+0.5*Math.sin(ct*1.7));
    rHigh=0.14+0.20*neuralShimmer; rRms=0.24+0.38*beatPulse+0.14*sw;
    for (let i=0;i<smoothWave.length;i++) { const u=i/smoothWave.length; smoothWave[i]=(0.13+0.20*beatPulse)*Math.sin(u*Math.PI*5+ct*5.2)+0.08*Math.sin(u*Math.PI*11-ct*3.5); }
  } else {
    rSub=0.14+0.05*Math.sin(tAnim*1.1); rBass=0.12+0.04*Math.sin(tAnim*1.4); rLow=0.10+0.03*Math.cos(tAnim*0.9);
    rMid=0.07+0.02*Math.sin(tAnim*1.6); rHigh=0.05+0.02*Math.cos(tAnim*1.3); rRms=0.10+0.03*Math.sin(tAnim*1.2);
    for (let i=0;i<smoothWave.length;i++) smoothWave[i]=0.05*Math.sin((i/smoothWave.length)*Math.PI*4+tAnim*1.4);
  }

  env.sub=followEnv(env.sub,rSub,0.56,0.13,dtS); env.bass=followEnv(env.bass,rBass,0.50,0.12,dtS);
  env.lowMid=followEnv(env.lowMid,rLow,0.44,0.11,dtS); env.mid=followEnv(env.mid,rMid,0.40,0.10,dtS);
  env.high=followEnv(env.high,rHigh,0.46,0.12,dtS); env.rms=followEnv(env.rms,rRms,0.52,0.12,dtS);

  const glow = state.glowIntensity * (vis.glowBias || 1.0);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#04060f"; ctx.fillRect(0, 0, cw, ch);

  // Ambient per-track aurora nebula wash
  ctx.globalCompositeOperation = "screen";
  const aa = (0.14 + env.sub*0.18 + env.bass*0.09 + beatPulse*0.05) * glow, md = Math.max(cw, ch);
  const blobs = [
    { x: cw*(0.30+0.08*Math.sin(tAnim*0.24)), y: ch*(0.24+0.05*Math.cos(tAnim*0.19)), r: md*0.52, col: currentPalette[1], a: aa*0.92 },
    { x: cw*(0.70+0.08*Math.cos(tAnim*0.21)), y: ch*(0.36+0.05*Math.sin(tAnim*0.17)), r: md*0.48, col: currentPalette[0], a: aa*1.04 },
    { x: cw*(0.50+0.06*Math.sin(tAnim*0.16+1.4)), y: ch*(0.62+0.04*Math.cos(tAnim*0.22)), r: md*0.42, col: currentPalette[2], a: aa*0.52 },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    g.addColorStop(0, rgbStr(b.col, Math.min(0.45, b.a)));
    g.addColorStop(0.55, rgbStr(b.col, Math.min(0.14, b.a*0.32)));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  }

  drawTrackParticles(vis.particleStyle || "stars", motionMul, glow, beatPulse);

  const stageW = cw;
  const stageH = ch;
  const cx = stageW * 0.5;
  const cy = stageH * 0.5;
  const minDim = Math.min(stageW, stageH);

  if (state.vizMode === "signature") {
    drawSignatureWorld(vis.archetype || "aurora_silk", cx, cy, stageW, stageH, minDim, glow, isMobile, beatPulse, neuralShimmer, vis, dtS, useFFT);
  } else if (state.vizMode === "silk") {
    drawSilk(cx, cy, stageW, glow, isMobile, vis, beatPulse);
  } else if (state.vizMode === "halo") {
    drawHalo(cx, cy, minDim, glow, isMobile, vis, beatPulse, neuralShimmer);
  } else {
    drawSpectrum(cx, cy, stageW, glow, dtS, useFFT, vis);
  }

  if (state.breathOn) drawBreath(cx, cy, nowTs, vis);
  ctx.globalCompositeOperation = "source-over";
}

// =========================================================================
// PER-TRACK SIGNATURE VISUAL WORLDS
// =========================================================================
function drawSignatureWorld(arch, cx, cy, stageW, stageH, minDim, glow, isMobile, beatPulse, shimmer, vis, dtS, useFFT) {
  const sc = isMobile ? 0.66 : 1.0;

  if (arch === "double_helix") {
    // 3D Rotating Glowing Double Helix with audio-reactive base-pair rungs
    const span = Math.min(stageW * 0.78, 760);
    const x0 = cx - span * 0.5;
    const amp = Math.min(stageH * 0.16, 118) * (1 + env.sub * 0.28 + beatPulse * 0.10) * sc;
    const steps = 96;
    const ptsA = [], ptsB = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const taper = Math.sin(u * Math.PI) ** 0.72;
      const ang = u * Math.PI * 5.0 - tAnim * 1.35;
      const wi = Math.min(smoothWave.length - 1, Math.floor(u * (smoothWave.length - 1)));
      const waveOff = smoothWave[wi] * 38 * sc;
      const x = x0 + u * span;
      const yA = cy + Math.sin(ang) * amp * taper + waveOff * 0.4;
      const yB = cy - Math.sin(ang) * amp * taper - waveOff * 0.4;
      const z = Math.cos(ang);
      ptsA.push({ x, y: yA, z });
      ptsB.push({ x, y: yB, z: -z });
    }
    // Rungs
    for (let i = 4; i < steps - 3; i += 4) {
      const a = ptsA[i], b = ptsB[i];
      const col = (i / 4) % 2 === 0 ? currentPalette[2] : currentPalette[0];
      const alpha = (0.28 + 0.42 * Math.abs(a.z) + env.mid * 0.25) * glow;
      ctx.strokeStyle = rgbStr(col, alpha);
      ctx.lineWidth = 2.0 * sc;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = rgbStr([255, 250, 240], alpha * 0.95);
      ctx.beginPath(); ctx.arc(a.x, a.y, (2.5 + env.bass * 3.0) * sc, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y, (2.5 + env.high * 3.0) * sc, 0, Math.PI * 2); ctx.fill();
    }
    // Dual strands
    [[ptsA, currentPalette[0]], [ptsB, currentPalette[2]]].forEach(([pts, col]) => {
      ctx.beginPath();
      pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = rgbStr(col, 0.25 * glow); ctx.lineWidth = 11 * sc; ctx.stroke();
      ctx.strokeStyle = rgbStr(col, 0.88 * glow); ctx.lineWidth = 2.8 * sc; ctx.stroke();
    });
    return;
  }

  if (arch === "synapse_grid" || arch === "constellation") {
    // Rotating geometric crystal lattice / neural hex grid with synaptic light pulses
    const rings = arch === "synapse_grid" ? 3 : 4;
    const sides = vis.geometry || 6;
    const maxR = Math.min(minDim * 0.34, 235) * (1 + env.sub * 0.14 + beatPulse * 0.06);
    const nodes = [{ x: cx, y: cy, tier: 0 }];
    for (let r = 1; r <= rings; r++) {
      const rad = (maxR * r) / rings;
      const cnt = sides * (r === 1 ? 1 : 2);
      const rot = tAnim * (r % 2 === 0 ? -0.18 : 0.24) + (r * Math.PI) / sides;
      for (let k = 0; k < cnt; k++) {
        const th = rot + (k * Math.PI * 2) / cnt;
        const wi = (r * 13 + k * 7) % smoothWave.length;
        const dr = smoothWave[wi] * 24 * sc;
        nodes.push({ x: cx + Math.cos(th) * (rad + dr), y: cy + Math.sin(th) * (rad + dr), tier: r });
      }
    }
    // Connect nearby nodes
    const maxDist = (maxR / rings) * 1.48;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.hypot(dx, dy);
        if (d < maxDist) {
          const pulse = 0.5 + 0.5 * Math.sin(tAnim * 3.0 + (i + j) * 0.7);
          const col = (i + j) % 2 === 0 ? currentPalette[0] : currentPalette[1];
          const al = (1 - d / maxDist) * (0.22 + env.mid * 0.42 + shimmer * 0.22 * pulse) * glow;
          ctx.strokeStyle = rgbStr(col, al);
          ctx.lineWidth = (1.1 + env.high * 1.4) * sc;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
    }
    // Glowing nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const nr = (2.6 + (n.tier === 0 ? 3.5 : 0) + env.bass * 3.2) * sc;
      ctx.fillStyle = rgbStr(i % 2 === 0 ? currentPalette[0] : currentPalette[2], 0.85 * glow);
      ctx.beginPath(); ctx.arc(n.x, n.y, nr, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }

  if (arch === "prism_rays") {
    // Floating luminous crystal prism refracting live audio-reactive spectral rays
    const r = Math.min(minDim * 0.22, 148) * (1 + env.sub * 0.12);
    const rot = Math.sin(tAnim * 0.35) * 0.18;
    // Refracted spectral fan rays
    const rayCount = 11;
    for (let i = 0; i < rayCount; i++) {
      const u = (i / (rayCount - 1)) - 0.5;
      const ang = u * 0.78 + Math.sin(tAnim * 0.6 + i) * 0.04;
      const len = stageW * (0.34 + env.mid * 0.22 + (i % 3 === 0 ? env.high * 0.18 : 0));
      const col = i < 4 ? currentPalette[0] : (i < 7 ? currentPalette[2] : currentPalette[1]);
      const gx = cx + Math.cos(ang) * len, gy = cy + Math.sin(ang) * len;
      const lg = ctx.createLinearGradient(cx, cy, gx, gy);
      lg.addColorStop(0, rgbStr(col, (0.36 + env.rms * 0.34) * glow));
      lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = lg;
      ctx.lineWidth = (4 + env.bass * 12) * sc;
      ctx.beginPath(); ctx.moveTo(cx + 12, cy); ctx.lineTo(gx, gy); ctx.stroke();
    }
    // Incoming pure white beam from left
    const inG = ctx.createLinearGradient(cx - stageW * 0.42, cy + 28, cx - r * 0.35, cy);
    inG.addColorStop(0, "rgba(255,255,255,0)");
    inG.addColorStop(1, rgbStr([255, 250, 240], 0.78));
    ctx.strokeStyle = inG; ctx.lineWidth = 4 * sc;
    ctx.beginPath(); ctx.moveTo(cx - stageW * 0.42, cy + 28); ctx.lineTo(cx - r * 0.35, cy); ctx.stroke();

    // Nested glowing equilateral crystal prisms
    for (const [scale, col, lw] of [[1.0, currentPalette[0], 3.2], [0.66, currentPalette[2], 2.0], [1.26, currentPalette[1], 1.4]]) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * scale);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
        const px = Math.cos(a) * r * scale, py = Math.sin(a) * r * scale;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = rgbStr(col, 0.25 * glow); ctx.lineWidth = lw * 4.2; ctx.stroke();
      ctx.strokeStyle = rgbStr(col, 0.90); ctx.lineWidth = lw; ctx.stroke();
      ctx.restore();
    }
    return;
  }

  if (arch === "pulse_rings" || arch === "solar_corona") {
    // Kinetic concentric turbine arcs OR erupting solar corona synced to BPM beat
    const baseR = Math.min(minDim * 0.23, 155) * (1 + env.sub * 0.16 + beatPulse * 0.09);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.9);
    cg.addColorStop(0, rgbStr(currentPalette[2], (0.28 + env.sub * 0.26) * glow));
    cg.addColorStop(0.42, rgbStr(currentPalette[0], (0.18 + beatPulse * 0.16) * glow));
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, baseR * 1.9, 0, Math.PI * 2); ctx.fill();

    const ringCount = arch === "solar_corona" ? 6 : 5;
    for (let r = 0; r < ringCount; r++) {
      const rad = baseR * (0.45 + r * 0.24) + beatPulse * 14 * sc;
      const segs = arch === "solar_corona" ? 4 : 3;
      const rot = tAnim * (r % 2 === 0 ? 0.55 : -0.45) + r * 0.9;
      const col = r % 3 === 0 ? currentPalette[2] : (r % 2 === 0 ? currentPalette[0] : currentPalette[1]);
      for (let s = 0; s < segs; s++) {
        const a0 = rot + (s * Math.PI * 2) / segs;
        const span = (Math.PI * 2 / segs) * (0.52 + env.mid * 0.26);
        ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + span);
        ctx.strokeStyle = rgbStr(col, 0.24 * glow); ctx.lineWidth = (9 - r) * sc; ctx.stroke();
        ctx.strokeStyle = rgbStr(col, 0.85); ctx.lineWidth = (2.6 - r * 0.2) * sc; ctx.stroke();
      }
    }
    // Radial flare spikes
    const rays = vis.geometry || 12;
    for (let k = 0; k < rays * 2; k++) {
      const th = (k * Math.PI) / rays + tAnim * 0.15;
      const wi = k % smoothWave.length;
      const len = baseR * (1.1 + Math.abs(smoothWave[wi]) * 1.4 + env.high * 0.45);
      ctx.strokeStyle = rgbStr(k % 2 === 0 ? currentPalette[2] : currentPalette[0], 0.34 * glow);
      ctx.lineWidth = 1.6 * sc;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(th) * baseR * 0.82, cy + Math.sin(th) * baseR * 0.82);
      ctx.lineTo(cx + Math.cos(th) * len, cy + Math.sin(th) * len);
      ctx.stroke();
    }
    return;
  }

  if (arch === "aurora_curtain") {
    // Sweeping northern-lights vertical curtains modulated by live audio frequencies
    const cols = isMobile ? 36 : 64;
    const margin = stageW * 0.08;
    const spanW = stageW - margin * 2;
    const x0 = cx - spanW * 0.5;
    for (let layer = 0; layer < 3; layer++) {
      const col = currentPalette[layer];
      for (let i = 0; i < cols; i++) {
        const u = i / (cols - 1);
        const x = x0 + u * spanW;
        const fIdx = Math.floor(u * 90) + 4;
        const fVal = useFFT ? (freqData[fIdx] / 255) : (0.35 + 0.35 * Math.sin(u * 8 + tAnim * 2.0 + layer));
        const sway = Math.sin(u * Math.PI * 3 + tAnim * (0.7 + layer * 0.3) + layer * 1.4);
        const topY = cy - stageH * (0.24 + fVal * 0.16 + env.sub * 0.08) + sway * 26;
        const botY = cy + stageH * (0.14 + env.bass * 0.10) + sway * 18;
        const taper = Math.sin(u * Math.PI) ** 0.85;
        const g = ctx.createLinearGradient(x, topY, x, botY);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.35, rgbStr(col, (0.12 + fVal * 0.24) * taper * glow));
        g.addColorStop(0.75, rgbStr(currentPalette[(layer + 1) % 3], (0.08 + env.mid * 0.14) * taper * glow));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, topY, Math.max(4, (spanW / cols) * 1.55), botY - topY);
      }
    }
    drawSilk(cx, cy + 16, stageW * 0.92, glow * 0.85, isMobile, vis, beatPulse);
    return;
  }

  if (arch === "oscilloscope") {
    // Faceted diamond Lissajous & precision binaural phase oscilloscope
    const rad = Math.min(minDim * 0.32, 225) * (1 + env.sub * 0.12);
    // Faceted diamond frames
    for (let k = 0; k < 3; k++) {
      const r = rad * (1 - k * 0.26) * (1 + beatPulse * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.82, cy);
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.82, cy);
      ctx.closePath();
      ctx.strokeStyle = rgbStr(currentPalette[k], (0.30 + env.bass * 0.25) * glow);
      ctx.lineWidth = (2.2 - k * 0.4) * sc;
      ctx.stroke();
    }
    // Live Lissajous harmonic trace synced to binaural ratio
    const pts = 200;
    ctx.beginPath();
    const aFreq = 3, bFreq = 4;
    for (let i = 0; i <= pts; i++) {
      const u = (i / pts) * Math.PI * 2;
      const wi = Math.floor((i / pts) * (smoothWave.length - 1));
      const mod = 1 + smoothWave[wi] * 0.65 + env.mid * 0.22;
      const x = cx + Math.sin(aFreq * u + tAnim * 0.9) * rad * 0.72 * mod;
      const y = cy + Math.sin(bFreq * u - tAnim * 0.65) * rad * 0.72 * mod;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgbStr(currentPalette[0], 0.24 * glow); ctx.lineWidth = 8 * sc; ctx.stroke();
    ctx.strokeStyle = rgbStr(currentPalette[2], 0.92); ctx.lineWidth = 2.0 * sc; ctx.stroke();
    return;
  }

  if (arch === "monolith_bars") {
    // Sculptural mirrored monolith pillars with reflective horizon
    drawSpectrum(cx, cy, stageW * 0.88, glow * 1.1, dtS, useFFT, vis);
    // Glowing horizon pulse line
    const g = ctx.createLinearGradient(cx - stageW * 0.42, cy, cx + stageW * 0.42, cy);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, rgbStr(currentPalette[2], (0.45 + beatPulse * 0.4) * glow));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - stageW * 0.42, cy); ctx.lineTo(cx + stageW * 0.42, cy); ctx.stroke();
    return;
  }

  if (arch === "rain_window" || arch === "warm_grain") {
    // Cozy arched window / cedar studio arches + resonating harmonic strings
    const archW = Math.min(minDim * 0.48, 310), archH = Math.min(stageH * 0.56, 370);
    for (let k = 0; k < 3; k++) {
      const inset = k * 28 * sc;
      const w = archW - inset * 2, h = archH - inset * 1.5;
      const col = currentPalette[k];
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.5, cy - h * 0.5, w, h, [w * 0.5, w * 0.5, 16, 16]);
      ctx.strokeStyle = rgbStr(col, (0.20 + env.bass * 0.16) * glow); ctx.lineWidth = (7 - k * 1.5) * sc; ctx.stroke();
      ctx.strokeStyle = rgbStr(col, 0.72); ctx.lineWidth = 1.8 * sc; ctx.stroke();
    }
    // Horizontal vibrating acoustic chords inside arch
    const strings = 6;
    for (let s = 0; s < strings; s++) {
      const sy = cy - archH * 0.18 + s * (archH * 0.11);
      const halfW = archW * 0.36;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const wi = Math.min(smoothWave.length - 1, Math.floor(u * (smoothWave.length - 1)));
        const envTap = Math.sin(u * Math.PI);
        const vib = (smoothWave[wi] * 28 + Math.sin(u * Math.PI * (2 + s) + tAnim * (1.8 + s * 0.3)) * (5 + env.lowMid * 16)) * envTap * sc;
        const x = cx - halfW + u * halfW * 2;
        if (i === 0) ctx.moveTo(x, sy + vib); else ctx.lineTo(x, sy + vib);
      }
      ctx.strokeStyle = rgbStr(s % 2 === 0 ? currentPalette[2] : currentPalette[0], (0.48 + env.mid * 0.35) * glow);
      ctx.lineWidth = 1.6 * sc; ctx.stroke();
    }
    return;
  }

  if (arch === "radial_bloom" || arch === "mandala") {
    // Sacred singing-bowl mandala / sunlit radial petals
    const petals = vis.geometry || 12;
    const maxR = Math.min(minDim * 0.33, 225) * (1 + env.sub * 0.14);
    for (let ring = 0; ring < 3; ring++) {
      const rad = maxR * (0.42 + ring * 0.28);
      const col = currentPalette[ring];
      ctx.strokeStyle = rgbStr(col, (0.26 + env.lowMid * 0.28) * glow);
      ctx.lineWidth = (2.4 - ring * 0.4) * sc;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
    }
    for (let k = 0; k < petals; k++) {
      const th = (k * Math.PI * 2) / petals + tAnim * (arch === "mandala" ? 0.14 : 0.22);
      const wi = Math.floor((k / petals) * (smoothWave.length - 1));
      const reach = maxR * (0.68 + env.mid * 0.32 + Math.abs(smoothWave[wi]) * 0.55);
      const col = k % 2 === 0 ? currentPalette[0] : currentPalette[2];
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(th);
      ctx.beginPath();
      ctx.ellipse(reach * 0.52, 0, reach * 0.44, reach * (arch === "mandala" ? 0.14 : 0.08), 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgbStr(col, (0.22 + env.rms * 0.34) * glow);
      ctx.lineWidth = 1.8 * sc; ctx.stroke();
      ctx.restore();
    }
    // Central harmonic core
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.45);
    g.addColorStop(0, rgbStr(currentPalette[2], (0.35 + shimmer * 0.25) * glow));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.45, 0, Math.PI * 2); ctx.fill();
    return;
  }

  if (arch === "horizon_sun") {
    // Golden sunset orb over undulating water reflection scanlines
    const sunR = Math.min(minDim * 0.23, 152) * (1 + env.sub * 0.10);
    const sunY = cy - sunR * 0.12;
    const sg = ctx.createRadialGradient(cx, sunY, 0, cx, sunY, sunR * 1.45);
    sg.addColorStop(0, rgbStr(currentPalette[2], 0.42 * glow));
    sg.addColorStop(0.55, rgbStr(currentPalette[0], 0.24 * glow));
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, sunY, sunR * 1.45, 0, Math.PI * 2); ctx.fill();

    ctx.beginPath(); ctx.arc(cx, sunY, sunR, Math.PI, Math.PI * 2);
    ctx.strokeStyle = rgbStr(currentPalette[2], 0.88); ctx.lineWidth = 3.2 * sc; ctx.stroke();

    // Shimmering reflection lines below horizon
    for (let j = 0; j < 8; j++) {
      const ly = sunY + 14 + j * 22 * sc;
      const halfW = (sunR * 1.45 - j * 14 * sc) * (1 + env.lowMid * 0.18);
      if (halfW <= 20) continue;
      ctx.beginPath();
      for (let i = 0; i <= 36; i++) {
        const u = i / 36;
        const wi = Math.floor(u * (smoothWave.length - 1));
        const wy = ly + Math.sin(u * Math.PI * 3 + tAnim * 1.4 + j) * (3 + env.mid * 10) * sc + smoothWave[wi] * 14 * sc;
        const wx = cx - halfW + u * halfW * 2;
        if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = rgbStr(j % 2 === 0 ? currentPalette[2] : currentPalette[1], (0.72 - j * 0.07) * glow);
      ctx.lineWidth = (2.6 - j * 0.2) * sc; ctx.stroke();
    }
    return;
  }

  if (arch === "organic_ripples") {
    // Overlapping zen water/canopy interference ripples
    const centers = [
      { x: cx - minDim * 0.14, y: cy - minDim * 0.06, col: currentPalette[0], ph: 0.0 },
      { x: cx + minDim * 0.14, y: cy + minDim * 0.06, col: currentPalette[1], ph: 1.8 },
      { x: cx, y: cy, col: currentPalette[2], ph: 3.4 },
    ];
    const maxR = Math.min(minDim * 0.34, 230);
    for (const c of centers) {
      for (let k = 0; k < 5; k++) {
        const prog = ((tAnim * 0.22 + k * 0.2 + c.ph * 0.1) % 1);
        const r = 18 + prog * maxR * (1 + env.bass * 0.18);
        const alpha = Math.sin(prog * Math.PI) * (0.45 + env.mid * 0.35) * glow;
        ctx.strokeStyle = rgbStr(c.col, alpha);
        ctx.lineWidth = (2.4 - prog * 1.4) * sc;
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    return;
  }

  if (arch === "ember_drift") {
    // Glowing hearth core rings + warm breathing acoustic ribbons
    const baseR = Math.min(minDim * 0.24, 165) * (1 + env.sub * 0.14);
    for (let k = 0; k < 4; k++) {
      const r = baseR * (0.45 + k * 0.28) + Math.sin(tAnim * 0.9 + k) * 8;
      ctx.strokeStyle = rgbStr(currentPalette[k % 3], (0.48 - k * 0.08 + env.bass * 0.2) * glow);
      ctx.lineWidth = (3.0 - k * 0.45) * sc;
      ctx.beginPath(); ctx.arc(cx, cy + 12, r, 0, Math.PI * 2); ctx.stroke();
    }
    drawSilk(cx, cy + 12, stageW * 0.80, glow * 0.9, isMobile, vis, beatPulse);
    return;
  }

  if (arch === "silk_tide" || arch === "deep_tide" || arch === "nebula_drift") {
    // Layered translucent nocturnal ocean tides / glacial abyssal depth arcs
    const waves = arch === "deep_tide" ? 7 : 6;
    const spanW = stageW * 0.90, x0 = cx - spanW * 0.5;
    for (let w = 0; w < waves; w++) {
      const yBase = cy + (w - (waves - 1) * 0.5) * (arch === "deep_tide" ? 30 : 26) * sc;
      const col = currentPalette[w % 3];
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const u = i / 96;
        const taper = Math.sin(u * Math.PI) ** 1.1;
        const wi = Math.floor(u * (smoothWave.length - 1));
        const amp = (18 + env.sub * 36 + env.lowMid * 22) * sc;
        const y = yBase + (Math.sin(u * Math.PI * (1.8 + w * 0.35) + tAnim * (0.65 + w * 0.12) + w) * amp + smoothWave[wi] * 32 * sc) * taper;
        const x = x0 + u * spanW;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgbStr(col, 0.18 * glow); ctx.lineWidth = 9 * sc; ctx.stroke();
      ctx.strokeStyle = rgbStr(col, (0.58 + (w === 2 ? 0.25 : 0)) * glow); ctx.lineWidth = 2.0 * sc; ctx.stroke();
    }
    if (arch === "deep_tide") {
      const er = Math.min(minDim * 0.18, 125) * (1 + env.sub * 0.12);
      ctx.strokeStyle = rgbStr(currentPalette[2], (0.45 + shimmer * 0.25) * glow);
      ctx.lineWidth = 2.6 * sc;
      ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.stroke();
    }
    return;
  }

  if (arch === "starfield_orbit") {
    // Lunar crescent halo + concentric celestial star orbits
    const maxR = Math.min(minDim * 0.34, 230);
    for (let r = 1; r <= 4; r++) {
      const rad = maxR * (0.28 + r * 0.18) * (1 + env.sub * 0.08);
      ctx.strokeStyle = rgbStr(currentPalette[r % 3], (0.24 + env.lowMid * 0.2) * glow);
      ctx.lineWidth = 1.4 * sc;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
      // Orbiting luminous moons
      const ang = tAnim * (0.35 / r) * (r % 2 === 0 ? 1 : -1) + r * 2.1;
      const ox = cx + Math.cos(ang) * rad, oy = cy + Math.sin(ang) * rad;
      ctx.fillStyle = rgbStr(currentPalette[2], 0.92);
      ctx.beginPath(); ctx.arc(ox, oy, (3.2 + env.high * 3.2) * sc, 0, Math.PI * 2); ctx.fill();
    }
    // Soft lunar crescent rim
    const mr = Math.min(minDim * 0.11, 74);
    ctx.strokeStyle = rgbStr([255, 250, 240], 0.82); ctx.lineWidth = 2.8 * sc;
    ctx.beginPath(); ctx.arc(cx, cy, mr, Math.PI * 0.72, Math.PI * 1.85); ctx.stroke();
    return;
  }

  // Default: aurora_silk
  drawSilk(cx, cy, stageW, glow, isMobile, vis, beatPulse);
}

function breathStep(nowTs, vis) {
  const pat = (vis && vis.breathPattern) || [4, 4, 6, 2];
  const [tIn, tHold, tOut, tRest] = pat;
  const total = tIn + tHold + tOut + tRest;
  const el = Math.max(0, (nowTs - state.breathStartTs) / 1000) % total;
  let ph = "INHALE", rem = 0, ex = 0;
  if (el < tIn) { ph = "INHALE"; rem = tIn - el; ex = 0.5 - 0.5 * Math.cos((el / tIn) * Math.PI); }
  else if (el < tIn + tHold) { ph = "HOLD"; rem = (tIn + tHold) - el; ex = 1; }
  else if (el < tIn + tHold + tOut) { ph = "EXHALE"; rem = (tIn + tHold + tOut) - el; ex = 0.5 + 0.5 * Math.cos(((el - tIn - tHold) / tOut) * Math.PI); }
  else { ph = "REST"; rem = total - el; ex = 0; }

  return { phase: ph, remaining: rem, expansion: ex };

}

function drawBreath(cx, cy, nowTs, vis) {
  const { expansion: ex } = breathStep(nowTs, vis);
  const r = 48 + 76 * ex;
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 124, 0, Math.PI * 2); ctx.stroke();
  const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
  g.addColorStop(0, rgbStr(currentPalette[2], 0.14 + ex * 0.18));
  g.addColorStop(0.75, rgbStr(currentPalette[0], 0.18 + ex * 0.20));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgbStr([255, 248, 236], 0.45 + ex * 0.45); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  // Track-tuned geometric outer breath ring
  const sides = Math.max(3, Math.min(12, (vis && vis.geometry) || 6));
  ctx.strokeStyle = rgbStr(currentPalette[0], 0.26 + ex * 0.30);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k <= sides; k++) {
    const a = (k * Math.PI * 2) / sides + tAnim * 0.15;
    const px = cx + Math.cos(a) * (r + 12), py = cy + Math.sin(a) * (r + 12);
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawSilk(cx, cy, stageW, glow, isMobile, vis, beatPulse) {
  const margin = isMobile ? 16 : Math.max(44, stageW*0.06), width = Math.max(220, stageW-margin*2), startX = cx-width*0.5;
  const pts = isMobile ? 84 : 112, baseAmp = Math.min(ch*(isMobile?0.18:0.22), 185);
  const hGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width*0.52);
  hGrad.addColorStop(0, rgbStr(currentPalette[0], Math.min(0.28,(0.08+env.sub*0.22)*glow)));
  hGrad.addColorStop(0.5, rgbStr(currentPalette[1], Math.min(0.14,(0.04+env.bass*0.12)*glow)));
  hGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hGrad; ctx.fillRect(0, 0, cw, ch);

  const ax = ctx.createLinearGradient(startX, cy, startX+width, cy);
  ax.addColorStop(0,"rgba(255,255,255,0)"); ax.addColorStop(0.2,rgbStr(currentPalette[0],0.18)); ax.addColorStop(0.5,rgbStr(currentPalette[2],0.24)); ax.addColorStop(0.8,rgbStr(currentPalette[1],0.18)); ax.addColorStop(1,"rgba(255,255,255,0)");
  ctx.strokeStyle = ax; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(startX, cy); ctx.lineTo(startX+width, cy); ctx.stroke();

  const fScale = 0.78 + ((vis && vis.geometry) || 5) * 0.06;
  const ribbons = [
    { freq:1.7*fScale, speed:1.45, ph:0.0, band:env.sub*1.15+env.bass*0.35+beatPulse*0.14, wm:0.18, col:currentPalette[1], fa:0.18*glow, sa:0.36*glow, lw:3.4 },
    { freq:2.4*fScale, speed:-1.95, ph:1.1, band:env.bass*0.95+env.lowMid*0.45, wm:0.25, col:currentPalette[0], fa:0.16*glow, sa:0.52*glow, lw:2.6 },
    { freq:3.4*fScale, speed:2.55, ph:2.4, band:env.lowMid*0.85+env.mid*0.55, wm:0.32, col:currentPalette[2], fa:0.10*glow, sa:0.48*glow, lw:2.0 },
    { freq:4.5*fScale, speed:-2.95, ph:3.8, band:env.mid*0.70+env.high*0.85, wm:0.22, col:currentPalette[0], fa:0.06*glow, sa:0.42*glow, lw:1.4 },
    { freq:2.1*fScale, speed:1.75, ph:0.55, band:env.rms*0.95+env.sub*0.45, wm:0.40, col:[255,249,240], fa:0.0, sa:0.92, lw:1.9 },
  ];
  for (const rb of ribbons) {
    const amp = baseAmp*(0.14+rb.band*1.15), xs = new Float32Array(pts+1), ys = new Float32Array(pts+1);
    for (let i=0;i<=pts;i++) {
      const u=i/pts, s=Math.sin(u*Math.PI), taper=s*s*Math.sqrt(s), wi=Math.min(smoothWave.length-1,Math.floor(u*(smoothWave.length-1)));
      const harm=Math.sin(u*Math.PI*2*rb.freq+tAnim*rb.speed+rb.ph)*0.68+Math.sin(u*Math.PI*2*(rb.freq*1.62)-tAnim*rb.speed*0.75+rb.ph)*0.32;
      xs[i]=startX+u*width; ys[i]=cy+(harm*amp+smoothWave[wi]*rb.wm*baseAmp*1.1)*taper;
    }
    if (rb.fa > 0.01) {
      const fg = ctx.createLinearGradient(cx, cy-amp, cx, cy+amp);
      fg.addColorStop(0,rgbStr(rb.col,rb.fa*1.1)); fg.addColorStop(0.5,rgbStr(rb.col,rb.fa*0.22)); fg.addColorStop(1,rgbStr(rb.col,rb.fa*1.1));
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(xs[0], cy);
      for(let i=0;i<pts;i++) ctx.quadraticCurveTo(xs[i],ys[i],(xs[i]+xs[i+1])*0.5,(ys[i]+ys[i+1])*0.5);
      ctx.lineTo(xs[pts], cy); ctx.closePath(); ctx.fill();
    }
    const sg = ctx.createLinearGradient(startX, cy, startX+width, cy);
    sg.addColorStop(0,rgbStr(rb.col,0)); sg.addColorStop(0.15,rgbStr(rb.col,rb.sa)); sg.addColorStop(0.5,rgbStr(rb.col,Math.min(1,rb.sa*1.15))); sg.addColorStop(0.85,rgbStr(rb.col,rb.sa)); sg.addColorStop(1,rgbStr(rb.col,0));
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
    for(let i=1;i<pts;i++) ctx.quadraticCurveTo(xs[i],ys[i],(xs[i]+xs[i+1])*0.5,(ys[i]+ys[i+1])*0.5);
    ctx.lineTo(xs[pts], ys[pts]);
    if (glow > 0.35) { ctx.strokeStyle = rgbStr(rb.col, Math.min(0.28, rb.sa*0.22*glow)); ctx.lineWidth = rb.lw*4.2; ctx.stroke(); }
    ctx.strokeStyle = sg; ctx.lineWidth = rb.lw; ctx.stroke();
  }
}

function drawHalo(cx, cy, minDim, glow, isMobile, vis, beatPulse, shimmer) {
  const lobes = Math.max(3, Math.min(10, (vis && vis.geometry) || 5));
  const baseR = Math.min(isMobile?125:195, minDim*(isMobile?0.27:0.24))*(1+env.sub*0.16+beatPulse*0.06), pts=128, sc=isMobile?0.65:1;
  const cg = ctx.createRadialGradient(cx,cy,0,cx,cy,baseR*1.6);
  cg.addColorStop(0,rgbStr(currentPalette[0],(0.16+env.sub*0.16)*glow)); cg.addColorStop(0.55,rgbStr(currentPalette[1],(0.08+env.bass*0.08)*glow)); cg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,baseR*1.6,0,Math.PI*2); ctx.fill();
  for (const ring of [
    { rm:1.14, lb:lobes, amp:(22+env.sub*54)*sc, lw:3.0, col:currentPalette[1], a:0.48*glow, rot:tAnim*0.35 },
    { rm:1.00, lb:lobes+2, amp:(16+env.bass*44+env.lowMid*26)*sc, lw:2.4, col:currentPalette[0], a:0.72*glow, rot:-tAnim*0.48 },
    { rm:0.86, lb:lobes+4, amp:(12+env.mid*34+env.high*24+shimmer*8)*sc, lw:1.8, col:[255,248,236], a:0.90, rot:tAnim*0.62 },
  ]) {
    ctx.beginPath();
    for (let i=0;i<=pts;i++) {
      const u=i/pts, th=u*Math.PI*2, si=Math.floor(Math.abs(u*2-1)*(smoothWave.length-1));
      const rad = baseR*ring.rm + (Math.sin(th*ring.lb+ring.rot)*0.6+Math.cos(th*(ring.lb+2)-ring.rot*1.3)*0.4)*ring.amp + smoothWave[si]*38*sc;
      const x=cx+Math.cos(th)*rad, y=cy+Math.sin(th)*rad;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.strokeStyle=rgbStr(ring.col,ring.a*0.22); ctx.lineWidth=ring.lw*4.5; ctx.stroke();
    ctx.strokeStyle=rgbStr(ring.col,ring.a); ctx.lineWidth=ring.lw; ctx.stroke();
  }
}

function drawSpectrum(cx, cy, stageW, glow, dtS, useFFT) {
  const isNarrow = stageW < 640, margin = Math.max(isNarrow?18:44, stageW*0.06), width = Math.max(200, stageW-margin*2), startX = cx-width*0.5;
  const activeBars = isNarrow ? 44 : SPEC_BARS, half = activeBars>>1, gap = isNarrow?4:5, barW = Math.max(3,(width-gap*(activeBars-1))/activeBars);
  const maxH = Math.min(ch*(isNarrow?0.16:0.23), 190), hzBin = (audioCtx?audioCtx.sampleRate:44100)/(FFT_BINS*2);
  const rawHalf = new Float32Array(half);
  for (let k=0;k<half;k++) {
    const u = k/(half-1); let pk = 0;
    if (useFFT) {
      const b0=Math.max(1,Math.floor(36*Math.pow(6200/36,Math.max(0,u-0.025))/hzBin)), b1=Math.min(FFT_BINS-1,Math.max(b0,Math.ceil(36*Math.pow(6200/36,Math.min(1,u+0.025))/hzBin)));
      for(let b=b0;b<=b1;b++) if(freqData[b]>pk) pk=freqData[b]; pk/=255;
    } else if (state.isPlaying) {
      pk = env.sub*(1-u)*0.85 + env.lowMid*(0.5+0.5*Math.sin(u*9-tAnim*4.2))*0.55 + env.high*(0.5+0.5*Math.cos(u*15+tAnim*2.8))*0.45;
    } else pk = (0.28+0.14*Math.sin(u*7-tAnim*2.1))*(1-u*0.55);
    rawHalf[k] = Math.min(1, (Math.pow(pk,0.78)*(1+u*1.45)+(env.sub*0.22+env.lowMid*0.18)*(1-u*0.72))*Math.pow(1-u,0.55));
  }
  for (let k=0;k<half;k++) {
    const sm = rawHalf[Math.max(0,k-2)]*0.12+rawHalf[Math.max(0,k-1)]*0.22+rawHalf[k]*0.32+rawHalf[Math.min(half-1,k+1)]*0.22+rawHalf[Math.min(half-1,k+2)]*0.12;
    specLevels[half+k] = followEnv(specLevels[half+k], sm, 0.54, 0.14, dtS); specLevels[half-1-k] = specLevels[half+k];
  }
  const bg = ctx.createRadialGradient(cx,cy,0,cx,cy,width*0.48);
  bg.addColorStop(0,rgbStr(currentPalette[0],Math.min(0.26,(0.08+env.sub*0.20)*glow))); bg.addColorStop(0.6,rgbStr(currentPalette[1],Math.min(0.12,(0.04+env.bass*0.10)*glow))); bg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

  const barG = ctx.createLinearGradient(cx,cy-maxH,cx,cy+maxH);
  barG.addColorStop(0,rgbStr(currentPalette[2],0.95)); barG.addColorStop(0.28,rgbStr(currentPalette[0],0.85)); barG.addColorStop(0.5,rgbStr(currentPalette[1],0.65)); barG.addColorStop(0.72,rgbStr(currentPalette[0],0.85)); barG.addColorStop(1,rgbStr(currentPalette[2],0.95));
  ctx.fillStyle = barG; ctx.beginPath();
  const r = barW*0.5;
  for (let i=0;i<activeBars;i++) { const h=Math.max(4,specLevels[i]*maxH*(0.85+glow*0.22)); ctx.roundRect(startX+i*(barW+gap), cy-h, barW, h*2, r); }
  ctx.fill();
}
