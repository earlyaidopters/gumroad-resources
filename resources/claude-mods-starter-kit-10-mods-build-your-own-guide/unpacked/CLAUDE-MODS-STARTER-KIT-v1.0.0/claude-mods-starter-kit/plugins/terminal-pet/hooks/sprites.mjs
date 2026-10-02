// Terminal Pet sprites: hand-authored pixel grids, a palette map, and a pure
// frame composer. No engine calls in here, so tests and previews can use it.
//
// The canvas is W x H pixels. Each terminal cell shows two pixels stacked with
// the upper half block (fg = top pixel, bg = bottom pixel), so the Raster is
// W columns by H / 2 rows.

export const W = 40;
export const H = 22;
export const COLS = W;
export const ROWS = H / 2;

const DEFAULT = 0x01000000; // the terminal's own color
const NONE = -1;

export const PALETTE = {
  O: 0x8a2f1b, // outline, dark coral
  C: 0xe8603c, // coral body
  D: 0xc44a2a, // shade
  L: 0xf4895f, // light coral
  W: 0xf6efe3, // cream
  K: 0x141413, // ink (eyes, mouth)
  P: 0xff8f8f, // blush and tongue
  G: 0xb8ad9c, // bubble and book outline
  M: 0x8a8178, // text lines in the book
  S: 0x8fd3ff, // sweat
  Y: 0xffd166, // sparks and stars
  B: 0x9cc5a1, // sage confetti
};

// Body colors swapped in for the red alarm flash.
const ALARM = { C: 0xe23b3b, L: 0xf06a6a, D: 0xb32626, O: 0x6e1414 };

// --- shells: normal, round (context > 70%), stuffed (context > 90%) --------

export const SHELLS = {
  normal: {
    mouthY: 6,
    blushY: 5,
    grid: [
      ".....OOOOOO.....",
      "...OOCCCCCCOO...",
      "..OCWWCCCCCCCO..",
      ".OCWLCCCCCCCCCO.",
      ".OCLCCCCCCCCCCO.",
      "OCCCCCCCCCCCCCCO",
      "OCCCCCCCCCCCCCCO",
      "ODCCCCCCCCCCCCDO",
      ".ODDCCCCCCCCDDO.",
      "..OOOOOOOOOOOO..",
    ],
  },
  round: {
    mouthY: 6,
    blushY: 5,
    grid: [
      "......OOOOOO......",
      "....OOCCCCCCOO....",
      "..OOCWWCCCCCCCOO..",
      ".OCCWLCCCCCCCCCCO.",
      ".OCLCCCCCCCCCCCCO.",
      "OCCCCCCCCCCCCCCCCO",
      "OCCCCCCCCCCCCCCCCO",
      "OCCCCCCCCCCCCCCCCO",
      "ODCCCCCCCCCCCCCCDO",
      ".ODDCCCCCCCCCCDDO.",
      "..OOOOOOOOOOOOOO..",
    ],
  },
  stuffed: {
    mouthY: 5,
    blushY: 4,
    grid: [
      ".......OOOOOO.......",
      ".....OOCCCCCCOO.....",
      "...OOCWWCCCCCCCOO...",
      "..OCCWLCCCCCCCCCCO..",
      ".OCCLCCCCCCCCCCCCCO.",
      ".OCCCCCCCCCCCCCCCCO.",
      "OCCCCCCCCCCCCCCCCCCO",
      "OCCCCCWWWWWWWWCCCCCO",
      "OCCCCWWWWWWWWWWCCCCO",
      "ODCCCWWWWWWWWWWCCCDO",
      ".ODDCCWWWWWWWWCCDDO.",
      "..OOOOOOOOOOOOOOOO..",
    ],
  },
};

// --- claws (left one; the right one is its mirror) -------------------------

export const CLAWS = {
  open: [
    "OO...OO",
    "OCO.OCO",
    "OCCOCCO",
    "OCLCCCO",
    ".OCCCO.",
    "..OOO..",
  ],
  shut: [
    ".OOOOO.",
    "OCCOCCO",
    "OCCOCCO",
    "OCLCCCO",
    ".OCCCO.",
    "..OOO..",
  ],
};

// --- props -------------------------------------------------------------------

export const BUBBLE = [
  "...GGGGGGG...",
  ".GGWWWWWWWGG.",
  "GWWWWWWWWWWWG",
  "GWWWWWWWWWWWG",
  "GWWWWWWWWWWWG",
  "GWWWWWWWWWWWG",
  ".GGWWWWWWWGG.",
  "...GGGGGGG...",
];
const PUFF_S = [".G.", "GWG", ".G."];
const PUFF_M = [".GG.", "GWWG", "GWWG", ".GG."];

export const BOOK = [
  ".CCC.CCC.",
  "CWWWCWWWC",
  "CWMMCMMWC",
  "CWWWCWWWC",
  "CWMMCMMWC",
  "CWWWCWWWC",
  ".CCCOCCC.",
];

const SPARK = [".Y.", "YWY", ".Y."];
const STAR = [".Y.", "YYY", ".Y."];
const DROP = [".S.", "SSS", "SSS", ".S."];
const Z_SMALL = ["WWW", "..W", ".W.", "W..", "WWW"];
const Z_BIG = ["WWWWW", "...W.", "..W..", ".W...", "WWWWW"];

const MOUTHS = {
  smile: ["K..K", ".KK."],
  open: ["KKKK", "KPPK", ".KK."],
  chompOpen: [".KK.", "K..K", ".KK."],
  chompShut: ["KKKK"],
  flat: [".KK."],
  wavy: ["K.K.", ".K.K"],
  ooh: [".KK.", "K..K", ".KK."],
};

export const SPRITES = { SHELLS, CLAWS, BUBBLE, BOOK, MOUTHS };

// --- the composer ------------------------------------------------------------

function canvas() {
  return new Int32Array(W * H).fill(NONE);
}

function put(px, x, y, color) {
  if (x < 0 || y < 0 || x >= W || y >= H || color === undefined) return;
  px[y * W + x] = color;
}

function stamp(px, grid, x, y, { mirror = false, tint } = {}) {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[mirror ? row.length - 1 - c : c];
      if (ch === ".") continue;
      put(px, x + c, y + r, (tint && tint[ch]) ?? PALETTE[ch]);
    }
  }
}

function line(px, x0, y0, x1, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    put(px, Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), color);
  }
}

// An eyeball: ring, cream inside, a pupil or an expression.
function eye(px, x, y, kind, a = 0, b = 0, tint) {
  const O = tint?.O ?? PALETTE.O;
  const ring = [".OOO.", "O...O", "O...O", "O...O", ".OOO."];
  stamp(px, ring, x, y, { tint });
  const inner = (cx, cy, color) => put(px, x + 1 + cx, y + 1 + cy, color);
  const fill = (color) => {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) inner(i, j, color);
  };
  const { W: cream, K: ink, L: lid } = PALETTE;
  if (kind === "closed") {
    // a heavy lid: light coral on top, the lash line, coral below
    fill(tint?.C ?? PALETTE.C);
    for (let i = 0; i < 3; i++) inner(i, 0, tint?.L ?? lid);
    for (let i = 0; i < 3; i++) inner(i, 1, ink);
    return;
  }
  fill(cream);
  if (kind === "open") {
    // a 2x2 pupil at (a, b), with a glint in its upper left
    inner(a, b, cream);
    inner(a + 1, b, ink);
    inner(a, b + 1, ink);
    inner(a + 1, b + 1, ink);
  } else if (kind === "wide") {
    inner(1, 1, ink);
  } else if (kind === "happy") {
    inner(1, 1, ink);
    inner(0, 2, ink);
    inner(2, 2, ink);
  } else if (kind === "spinA") {
    inner(0, 0, ink); inner(2, 0, ink); inner(1, 1, ink); inner(0, 2, ink); inner(2, 2, ink);
  } else if (kind === "spinB") {
    inner(1, 0, ink); inner(0, 1, ink); inner(1, 1, ink); inner(2, 1, ink); inner(1, 2, ink);
  }
}

function hash(n) {
  let x = (n | 0) * 2654435761;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

export function fullness(fill) {
  if (fill >= 90) return "stuffed";
  if (fill >= 70) return "round";
  return "normal";
}

/**
 * Composes one frame. `mood` is the pet's state, `now` the clock in ms (the
 * loops run off it), `fill` the context fill percent. Returns W*H colors, -1
 * where nothing is drawn.
 */
export function petFrame(mood, now, fill = 0) {
  const px = canvas();
  const shellName = fullness(fill);
  const shell = SHELLS[shellName];
  const sw = shell.grid[0].length;
  const sh = shell.grid.length;
  const cx = 14; // the pet's center column

  let dx = 0; // whole-body shift
  let lift = 0; // whole-body lift (jump)
  let squat = 0; // upper body sinks onto the legs
  let legs = "stand";
  let eyes = { kind: "open", a: 1, b: 1 };
  let stalk = 2;
  let clawL = { y: 0, grid: CLAWS.open };
  let clawR = { y: 0, grid: CLAWS.open };
  let mouth = "smile";
  let blush = shellName !== "normal";
  let tint;

  const phase = (period, n) => Math.floor(now / period) % n;

  switch (mood) {
    case "idle": {
      squat = phase(700, 2);
      const blink = now % 3600 < 160;
      const look = phase(2900, 4);
      eyes = blink ? { kind: "closed" } : { kind: "open", a: look === 1 ? 0 : look === 3 ? 1 : 1, b: look === 2 ? 0 : 1 };
      if (look === 1) eyes.a = 0;
      break;
    }
    case "thinking": {
      squat = phase(900, 2);
      eyes = { kind: "open", a: 1, b: 0 };
      mouth = "flat";
      clawR = { y: -1, grid: CLAWS.shut };
      break;
    }
    case "reading": {
      const scan = phase(380, 2);
      eyes = { kind: "open", a: scan, b: 1 };
      mouth = phase(260, 2) ? "chompOpen" : "chompShut";
      clawR = { y: 2, grid: CLAWS.shut };
      break;
    }
    case "typing": {
      const tap = phase(150, 2);
      eyes = { kind: "open", a: tap, b: 1 };
      mouth = "flat";
      clawL = { y: tap ? 3 : 0, grid: tap ? CLAWS.shut : CLAWS.open };
      clawR = { y: tap ? 0 : 3, grid: tap ? CLAWS.open : CLAWS.shut };
      break;
    }
    case "running": {
      const step = phase(110, 2);
      legs = step ? "runA" : "runB";
      squat = step;
      eyes = { kind: "open", a: 1, b: 1 };
      mouth = "open";
      clawL = { y: step ? 1 : -1, grid: CLAWS.shut };
      clawR = { y: step ? -1 : 1, grid: CLAWS.shut };
      break;
    }
    case "nervous": {
      dx = phase(70, 2) ? 1 : -1;
      eyes = { kind: "wide" };
      stalk = 3;
      mouth = "wavy";
      if (phase(260, 2)) tint = ALARM;
      clawL = { y: 1, grid: CLAWS.shut };
      clawR = { y: 1, grid: CLAWS.shut };
      break;
    }
    case "celebrate": {
      const p = (now % 560) / 560;
      lift = Math.round((shellName === "stuffed" ? 1 : 3) * Math.sin(Math.PI * p));
      legs = lift > 0 ? "dangle" : "stand";
      squat = lift === 0 ? 1 : 0;
      eyes = { kind: "happy" };
      mouth = "open";
      blush = true;
      clawL = { y: -3, grid: phase(140, 2) ? CLAWS.open : CLAWS.shut };
      clawR = { y: -3, grid: phase(140, 2) ? CLAWS.shut : CLAWS.open };
      break;
    }
    case "oops": {
      dx = [0, 1, 0, -1][phase(240, 4)];
      eyes = { kind: phase(180, 2) ? "spinA" : "spinB" };
      mouth = "wavy";
      clawL = { y: 2, grid: CLAWS.open };
      clawR = { y: 2, grid: CLAWS.open };
      break;
    }
    case "sleeping": {
      legs = "none";
      stalk = 0;
      squat = phase(1400, 2);
      eyes = { kind: "closed" };
      mouth = "flat";
      clawL = { y: 4, grid: CLAWS.shut };
      clawR = { y: 4, grid: CLAWS.shut };
      break;
    }
    default:
      break;
  }

  // Layout, bottom up: legs touch the last row.
  const groundY = H - 1;
  const legRows = legs === "none" ? 0 : 2;
  const shellBottom = groundY - legRows - lift;
  const shellTop = shellBottom - sh + 1 + squat;
  const shellX = cx - Math.floor(sw / 2) + dx;
  const center = shellX + Math.floor(sw / 2);

  // Background effects, behind the pet
  if (mood === "running") {
    const off = Math.floor(now / 60) % 6;
    for (const [y, len] of [[15, 3], [17, 5], [19, 4]]) {
      const start = (off + y) % 3;
      for (let i = 0; i < len; i++) put(px, start + i, y, i === 0 ? PALETTE.G : PALETTE.W);
    }
    // dust behind the feet
    const d = phase(110, 3);
    put(px, 3 + d, H - 1, PALETTE.G);
    put(px, 5 - d, H - 2, PALETTE.G);
  }

  if (mood === "celebrate") {
    const colors = [PALETTE.C, PALETTE.W, PALETTE.Y, PALETTE.B, PALETTE.S, PALETTE.P];
    for (let i = 0; i < 18; i++) {
      const speed = 6 + hash(i * 31) * 10; // px per second
      const y = Math.floor((now / 1000) * speed + hash(i * 17) * H) % H;
      const x = Math.floor(hash(i * 7) * W + Math.sin(now / 300 + i) * 1.5);
      const c = colors[i % colors.length];
      put(px, x, y, c);
      if ((Math.floor(now / 200) + i) % 2) put(px, x + 1, y, c);
      else put(px, x, y + 1, c);
    }
  }

  // Legs
  if (legs !== "none") {
    const y0 = shellTop + sh; // the row under the shell
    const leftXs = [center - 6, center - 4, center - 2];
    const rightXs = [center + 1, center + 3, center + 5];
    leftXs.forEach((x, i) => {
      const splay = legs === "runA" ? (i % 2 ? 0 : -1) : legs === "runB" ? (i % 2 ? -1 : 0) : -1;
      put(px, x, y0, PALETTE.O);
      if (legs !== "dangle" || i === 1) put(px, x + splay, y0 + 1, PALETTE.O);
    });
    rightXs.forEach((x, i) => {
      const splay = legs === "runA" ? (i % 2 ? 1 : 0) : legs === "runB" ? (i % 2 ? 0 : 1) : 1;
      put(px, x, y0, PALETTE.O);
      if (legs !== "dangle" || i === 1) put(px, x + splay, y0 + 1, PALETTE.O);
    });
  }

  // Eyes on stalks
  const eyeTop = shellTop - 5 - stalk;
  const eyeLX = center - 6;
  const eyeRX = center + 1;
  for (const ex of [eyeLX, eyeRX]) {
    for (let s = 0; s < stalk + 1; s++) put(px, ex + 2, eyeTop + 5 + s, tint?.O ?? PALETTE.O);
  }

  // Claws and arms (behind the shell's edge)
  const clawTop = shellTop - 1;
  const lx = shellX - 5;
  const rx = shellX + sw - 2;
  const lY = clawTop + clawL.y;
  const rY = clawTop + clawR.y;
  const arm = tint?.O ?? PALETTE.O;
  line(px, lx + 3, lY + 6, shellX + 1, shellTop + 5, arm);
  line(px, lx + 4, lY + 6, shellX + 2, shellTop + 5, tint?.D ?? PALETTE.D);
  line(px, rx + 3, rY + 6, shellX + sw - 2, shellTop + 5, arm);
  line(px, rx + 2, rY + 6, shellX + sw - 3, shellTop + 5, tint?.D ?? PALETTE.D);
  stamp(px, clawL.grid, lx, lY, { tint });
  stamp(px, clawR.grid, rx, rY, { mirror: true, tint });

  // Shell and face
  stamp(px, shell.grid, shellX, shellTop, { tint });
  const m = MOUTHS[mouth];
  stamp(px, m, center - 2, shellTop + shell.mouthY);
  if (blush) {
    put(px, center - 5, shellTop + shell.blushY + 1, PALETTE.P);
    put(px, center - 4, shellTop + shell.blushY + 1, PALETTE.P);
    put(px, center + 3, shellTop + shell.blushY + 1, PALETTE.P);
    put(px, center + 4, shellTop + shell.blushY + 1, PALETTE.P);
  }

  // Eyes last, over the stalks
  for (const ex of [eyeLX, eyeRX]) eye(px, ex, eyeTop, eyes.kind, eyes.a, eyes.b, tint);

  // --- effects -----------------------------------------------------------
  if (shellName === "stuffed" && mood !== "sleeping") {
    const t = (now % 1500) / 1500;
    stamp(px, DROP, shellX - 1, shellTop - 1 + Math.round(t * 5));
  }

  if (mood === "thinking") {
    stamp(px, PUFF_S, 22, 7);
    stamp(px, PUFF_M, 24, 3);
    stamp(px, BUBBLE, 27, 0);
    const lit = phase(320, 4); // 0..3 dots
    for (let d = 0; d < 3; d++) {
      if (d < lit) {
        const x = 27 + 3 + d * 3;
        put(px, x, 3, PALETTE.C); put(px, x + 1, 3, PALETTE.C);
        put(px, x, 4, PALETTE.C); put(px, x + 1, 4, PALETTE.C);
      }
    }
  }

  if (mood === "reading") {
    const bob = phase(380, 2);
    stamp(px, BOOK, 29, 12 + bob);
    // crumbs flying out of the chomping mouth
    if (phase(260, 2)) {
      put(px, center + 3, shellTop + shell.mouthY + 3, PALETTE.W);
      put(px, center - 4, shellTop + shell.mouthY + 4, PALETTE.W);
    }
  }

  if (mood === "typing") {
    const tap = phase(150, 2);
    const sx = tap ? lx : rx;
    const sy = (tap ? lY : rY) - 3;
    stamp(px, SPARK, sx + 2, sy);
    for (let i = 0; i < 4; i++) {
      const r = hash(Math.floor(now / 150) * 7 + i);
      put(px, 26 + Math.floor(r * 12), 6 + Math.floor(hash(i * 13 + Math.floor(now / 150)) * 12), PALETTE.Y);
    }
  }

  if (mood === "nervous") {
    const t = (now % 700) / 700;
    stamp(px, DROP, eyeLX - 4, eyeTop + 1 + Math.round(t * 6));
    stamp(px, DROP, eyeRX + 7, eyeTop + 3 + Math.round(((t + 0.5) % 1) * 6));
  }

  if (mood === "oops") {
    const a = (now / 1000) * Math.PI * 1.6;
    for (let i = 0; i < 3; i++) {
      const ang = a + (i * Math.PI * 2) / 3;
      const sx = Math.round(center + Math.cos(ang) * 11) - 1;
      const sy = Math.round(eyeTop + 1 + Math.sin(ang) * 2) - 1;
      stamp(px, STAR, sx, sy);
    }
  }

  if (mood === "sleeping") {
    const cycle = 2400;
    for (let i = 0; i < 3; i++) {
      const t = ((now + i * (cycle / 3)) % cycle) / cycle; // 0..1 rise
      if (t > 0.85) continue; // gone before the next one reaches it
      const x = center + 9 + Math.round(t * 12);
      const y = Math.round(shellTop - 2 - t * (shellTop - 1));
      stamp(px, t > 0.5 ? Z_BIG : Z_SMALL, x, y);
    }
  }

  return px;
}

// --- encoding ------------------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64(bytes) {
  if (typeof bytes.toBase64 === "function") return bytes.toBase64();
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + "=";
  }
  return out;
}

/** Packs a pixel frame into Raster cells: COLS x ROWS half-block cells. */
export function encodeCells(px) {
  const words = new Uint32Array(COLS * ROWS * 3);
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const top = px[2 * r * W + c];
      const bottom = px[(2 * r + 1) * W + c];
      if (top === NONE && bottom === NONE) {
        words[k++] = 0x20; words[k++] = DEFAULT; words[k++] = DEFAULT;
      } else if (bottom === NONE) {
        words[k++] = 0x2580; words[k++] = top; words[k++] = DEFAULT;
      } else if (top === NONE) {
        words[k++] = 0x2584; words[k++] = bottom; words[k++] = DEFAULT;
      } else {
        words[k++] = 0x2580; words[k++] = top; words[k++] = bottom;
      }
    }
  }
  // Uint32Array stores the platform's byte order; write little-endian explicitly.
  const bytes = new Uint8Array(words.length * 4);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    bytes[i * 4] = w & 255;
    bytes[i * 4 + 1] = (w >>> 8) & 255;
    bytes[i * 4 + 2] = (w >>> 16) & 255;
    bytes[i * 4 + 3] = (w >>> 24) & 255;
  }
  return base64(bytes);
}

export function frameCells(mood, now, fill) {
  return encodeCells(petFrame(mood, now, fill));
}

/** Desktop SVG: the same pixel frames, animated locally without script. */
export function desktopSvg(mood, fill) {
  const count = 8;
  const step = mood === "idle" || mood === "sleeping" ? 220 : 83;
  const groups = [];
  for (let frame = 0; frame < count; frame++) {
    const px = petFrame(mood, frame * step, fill);
    const rects = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W;) {
        const color = px[y * W + x];
        let end = x + 1;
        while (end < W && px[y * W + end] === color) end++;
        if (color !== NONE) rects.push(`<rect x="${x}" y="${y}" width="${end-x}" height="1" fill="#${color.toString(16).padStart(6,"0")}"/>`);
        x = end;
      }
    }
    const values = Array.from({length:count+1},(_,i)=>i%count===frame?1:0).join(";");
    const times = Array.from({length:count+1},(_,i)=>i/count).join(";");
    groups.push(`<g opacity="${frame===0?1:0}"><animate attributeName="opacity" values="${values}" keyTimes="${times}" calcMode="discrete" dur="${count*step}ms" repeatCount="indefinite"/>${rects.join("")}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="110" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${groups.join("")}</svg>`;
}
