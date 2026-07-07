// background.js — dusk-invasion backdrop for THE ALIEN FROM MARS.
// Contract (DESIGN.md §4):  export function drawBackground(ctx, camX, w, h, t)
//
// Everything is prebuilt once onto offscreen canvases at first call; per-frame cost is
// a handful of drawImage blits + a short star loop (well under 1ms, zero allocation).
// All parallax layers wrap seamlessly for any camX (including large negatives) because
// silhouette ridges are periodic sums-of-sines and tiles are modulo-blitted.

import { K, PAL } from './shared.js';

// ---------- tiny deterministic RNG (mulberry32) ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return c;
}

// 4x4 Bayer matrix for dithered sky bands.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Parallax factors (per DESIGN §4).
const P_STAR = 0.06;
const P_MESA = 0.10;
const P_HILL = 0.25;
const P_TREE = 0.50;

const LAYER_TW = 960;   // silhouette tile width (hides repetition; still seamless)

// ---------- module cache ----------
let inited = false;
let sky, mesas, hills, treeline;
let marsBody, marsGlow, moon;
let stars;              // preallocated star records
let clouds;            // preallocated cloud records
let marsX, marsY, marsR, moonX, moonY;

// ---------- build: sky ----------
function buildSky() {
  const c = mkCanvas(K.W, K.H);
  const g = c.getContext('2d');
  const img = g.createImageData(K.W, K.H);
  const d = img.data;
  const SY = [0, 66, 120, 165, K.GROUND];
  const SC = [
    hexRgb(PAL.night), hexRgb(PAL.dusk1), hexRgb(PAL.dusk2),
    hexRgb(PAL.dusk3), hexRgb(PAL.horizon),
  ];
  const HZ = SC[4];
  for (let y = 0; y < K.H; y++) {
    let cur, next, f;
    if (y >= K.GROUND) { cur = HZ; next = HZ; f = 0; }
    else {
      let i = 0;
      while (i < 3 && y >= SY[i + 1]) i++;
      const y0 = SY[i], y1 = SY[i + 1];
      f = (y - y0) / (y1 - y0);
      cur = SC[i]; next = SC[i + 1];
    }
    const row = (y & 3) * 4;
    for (let x = 0; x < K.W; x++) {
      const b = (BAYER[row + (x & 3)] + 0.5) / 16;
      const c2 = f > b ? next : cur;
      const o = (y * K.W + x) * 4;
      d[o] = c2[0]; d[o + 1] = c2[1]; d[o + 2] = c2[2]; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ---------- build: a parallax silhouette layer ----------
// cfg: { baseY, waves:[{n,a,p}], fill, rim, deco?(g,tw,hArr,rng) }
function buildLayer(cfg, seed) {
  const c = mkCanvas(LAYER_TW, K.H);
  const g = c.getContext('2d');
  const hArr = new Int16Array(LAYER_TW);
  const TWO_PI = Math.PI * 2;
  for (let x = 0; x < LAYER_TW; x++) {
    let hy = cfg.baseY;
    for (let k = 0; k < cfg.waves.length; k++) {
      const w = cfg.waves[k];
      hy += w.a * Math.sin((x / LAYER_TW) * w.n * TWO_PI + w.p);
    }
    hArr[x] = Math.round(hy);
  }
  for (let x = 0; x < LAYER_TW; x++) {
    const hy = hArr[x];
    g.fillStyle = cfg.fill; g.fillRect(x, hy, 1, K.H - hy);
    g.fillStyle = cfg.rim; g.fillRect(x, hy, 1, 1);
  }
  if (cfg.deco) cfg.deco(g, LAYER_TW, hArr, mulberry32(seed));
  return c;
}

// A dark pine silhouette rising above the treeline ridge.
function decoPine(g, x, groundY, h, fill, rim) {
  const halfBase = Math.max(2, (h * 0.42) | 0);
  for (let yy = 0; yy < h; yy++) {
    const f = yy / h;                       // 0 at apex, 1 at base
    const half = Math.max(0, Math.round(halfBase * f));
    const y = groundY - h + yy;
    g.fillStyle = fill;
    g.fillRect(x - half, y, half * 2 + 1, 1);
  }
  // warm rim down the horizon-facing (left) edge + apex.
  g.fillStyle = rim;
  g.fillRect(x, groundY - h, 1, 1);
  for (let yy = 0; yy < h; yy += 2) {
    const f = yy / h;
    const half = Math.max(0, Math.round(halfBase * f));
    g.fillRect(x - half, groundY - h + yy, 1, 1);
  }
}

// A distant farm silhouette (barn + silo) with a couple of lit windows.
function decoFarm(g, x, groundY, fill, rim, lit) {
  // barn body
  const bw = 15, bh = 11;
  const bx = x, by = groundY - bh;
  g.fillStyle = fill;
  g.fillRect(bx, by, bw, bh);
  // gable roof
  for (let i = 0; i < 5; i++) g.fillRect(bx - 1 + i, by - i, bw + 2 - i * 2, 1);
  g.fillStyle = rim;
  g.fillRect(bx, by - 4, 1, 1);            // roof peak catch
  g.fillRect(bx, by, bw, 1);               // eave rim
  // lit windows
  g.fillStyle = lit;
  g.fillRect(bx + 3, by + 4, 2, 2);
  g.fillRect(bx + 9, by + 4, 2, 2);
  // silo
  const sx = bx + bw + 2, sw = 5, sh = 15;
  g.fillStyle = fill;
  g.fillRect(sx, groundY - sh, sw, sh);
  g.fillRect(sx, groundY - sh - 2, sw, 3); // dome
  g.fillStyle = rim;
  g.fillRect(sx, groundY - sh, 1, sh);
}

function decoTreeline(g, tw, hArr, rng) {
  const fill = PAL.night, rim = PAL.dusk1, lit = PAL.horizon;
  // farms first (a couple across the tile, kept clear of edges)
  const nFarms = 2;
  for (let i = 0; i < nFarms; i++) {
    const fx = 90 + (i * (tw - 260)) + ((rng() * 80) | 0);
    decoFarm(g, fx, hArr[Math.min(tw - 1, fx + 8)] + 2, fill, rim, lit);
  }
  // scattered pines along the ridge
  let x = 6 + ((rng() * 20) | 0);
  while (x < tw - 6) {
    const h = 7 + ((rng() * 8) | 0);
    decoPine(g, x, hArr[x], h, fill, rim);
    x += 10 + ((rng() * 16) | 0);
  }
}

// ---------- build: celestial bodies ----------
function buildMars(R) {
  const D = R * 2 + 2;
  const c = mkCanvas(D, D);
  const g = c.getContext('2d');
  const cx = R + 1, cy = R + 1;
  // body
  g.fillStyle = PAL.mars;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  // maria (dark patches) — deliberately asymmetric so it reads as a planet, not a face
  g.fillStyle = PAL.marsDark;
  g.beginPath(); g.arc(cx - 1, cy + 3, R * 0.40, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(cx + 4, cy + 1, R * 0.24, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(cx + 1, cy - 4, R * 0.18, 0, Math.PI * 2); g.fill();
  // warm rim highlight (glow catch) on upper-left
  g.strokeStyle = PAL.fire2;
  g.lineWidth = 1;
  g.beginPath(); g.arc(cx, cy, R - 0.5, Math.PI * 0.75, Math.PI * 1.35); g.stroke();
  return c;
}

function buildGlow(R) {
  const pad = 13;
  const D = (R + pad) * 2;
  const c = mkCanvas(D, D);
  const g = c.getContext('2d');
  const cx = D / 2, cy = D / 2;
  const rings = 9;
  for (let i = rings; i >= 1; i--) {
    const rr = R + (pad * i) / rings;
    g.globalAlpha = 0.05 + 0.16 * (1 - i / rings);
    g.fillStyle = PAL.mars;
    g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  return c;
}

function buildMoon(R) {
  const D = R * 2 + 2;
  const c = mkCanvas(D, D);
  const g = c.getContext('2d');
  const cx = R + 1, cy = R + 1;
  g.fillStyle = PAL.cloud1;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  // faint craters
  g.fillStyle = PAL.cloud3;
  g.beginPath(); g.arc(cx - 1, cy + 1, R * 0.22, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(cx + 2, cy - 2, R * 0.14, 0, Math.PI * 2); g.fill();
  // carve the crescent by removing an offset disc
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(cx + R * 0.7, cy - R * 0.35, R * 0.98, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  return c;
}

// ---------- build: cloud silhouettes ----------
function buildCloud(w, h, rng) {
  const c = mkCanvas(w, h);
  const g = c.getContext('2d');
  const baseY = h - 2;
  const nPuffs = 3 + ((rng() * 3) | 0);
  // body — overlapping puffs, inset from the edges so nothing gets clipped
  g.fillStyle = PAL.dusk1;
  const margin = h * 0.5;
  for (let i = 0; i < nPuffs; i++) {
    const px = margin + ((w - margin * 2) * (i + 0.5)) / nPuffs;
    const pr = (h * 0.40) + rng() * (h * 0.26);
    g.beginPath(); g.arc(px, baseY - pr * 0.35, pr, 0, Math.PI * 2); g.fill();
  }
  // flatten the underside: erase everything below the base line.
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  g.fillRect(0, baseY, w, h - baseY);
  // rims only colour existing cloud pixels (source-atop), so nothing sticks out.
  g.globalCompositeOperation = 'source-atop';
  // cool sky-glow along the top
  g.fillStyle = PAL.dusk2;
  for (let i = 0; i < nPuffs; i++) {
    const px = margin + ((w - margin * 2) * (i + 0.5)) / nPuffs;
    const pr = (h * 0.40);
    g.strokeStyle = PAL.dusk2; g.lineWidth = 1;
    g.beginPath(); g.arc(px, baseY - pr * 0.35 - 1, pr, Math.PI * 1.12, Math.PI * 1.98); g.stroke();
  }
  // warm under-lit rim along the flat bottom (horizon glow)
  g.fillStyle = PAL.dusk3;
  g.fillRect(0, baseY - 1, w, 1);
  g.globalCompositeOperation = 'source-over';
  return c;
}

// ---------- init ----------
function init() {
  const rng = mulberry32(0x51E7);

  sky = buildSky();

  mesas = buildLayer({
    baseY: 150,
    fill: PAL.dusk2, rim: PAL.dusk3,
    waves: [{ n: 2, a: 12, p: 0.6 }, { n: 5, a: 6, p: 2.1 }, { n: 9, a: 3, p: 4.0 }],
  }, 0x1111);
  hills = buildLayer({
    baseY: 170,
    fill: PAL.dusk1, rim: PAL.dusk2,
    waves: [{ n: 3, a: 11, p: 1.4 }, { n: 7, a: 5, p: 0.3 }, { n: 13, a: 2.2, p: 3.3 }],
  }, 0x2222);
  treeline = buildLayer({
    baseY: 188,
    fill: PAL.night, rim: PAL.dusk1,
    waves: [{ n: 4, a: 5, p: 0.9 }, { n: 9, a: 3, p: 2.6 }, { n: 17, a: 1.6, p: 1.1 }],
    deco: decoTreeline,
  }, 0x3333);

  marsR = 11;
  marsX = 392; marsY = 52;
  marsBody = buildMars(marsR);
  marsGlow = buildGlow(marsR);

  moonX = 96; moonY = 40;
  moon = buildMoon(8);

  // stars (upper third)
  const N = 80;
  stars = new Array(N);
  for (let i = 0; i < N; i++) {
    stars[i] = {
      x: rng() * K.W,
      y: 3 + rng() * (K.H * 0.36),
      mag: 0.45 + rng() * 0.55,
      ph: rng() * Math.PI * 2,
      sp: 1.2 + rng() * 2.6,
      big: rng() < 0.16,
    };
  }

  // clouds
  clouds = [
    { c: buildCloud(78, 24, rng), y: 40, par: 0.16, drift: 3.5, baseX: 40 },
    { c: buildCloud(56, 18, rng), y: 70, par: 0.20, drift: 5.0, baseX: 300 },
    { c: buildCloud(92, 28, rng), y: 26, par: 0.12, drift: 2.4, baseX: 170 },
  ];

  inited = true;
}

// ---------- per-frame blit of a wrapping tile ----------
function blitLayer(ctx, tile, camX, par, w) {
  const tw = tile.width;
  const scroll = -camX * par;
  let off = scroll % tw;
  if (off > 0) off -= tw;          // now in (-tw, 0]
  off = Math.round(off);
  for (let x = off; x < w; x += tw) ctx.drawImage(tile, x, 0);
}

// ---------- exported entry ----------
export function drawBackground(ctx, camX, w, h, t) {
  if (!inited) init();

  // 1. sky (fixed to screen)
  ctx.drawImage(sky, 0, 0);

  // 2. stars — slight parallax + twinkle
  const starScroll = -camX * P_STAR;
  ctx.fillStyle = PAL.star;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    let sx = (s.x + starScroll) % K.W;
    if (sx < 0) sx += K.W;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    const on = s.mag * tw;
    if (on <= 0.34) continue;
    const px = sx | 0;
    ctx.fillRect(px, s.y | 0, 1, 1);
    if (s.big && on > 0.8) {          // sparkle cross for the brightest
      ctx.fillRect(px - 1, s.y | 0, 1, 1);
      ctx.fillRect(px + 1, s.y | 0, 1, 1);
      ctx.fillRect(px, (s.y | 0) - 1, 1, 1);
      ctx.fillRect(px, (s.y | 0) + 1, 1, 1);
    }
  }

  // 3. moon + Mars (fixed in the sky; Mars glow breathes)
  ctx.drawImage(moon, moonX - moon.width / 2, moonY - moon.height / 2);
  ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 1.3);
  ctx.drawImage(marsGlow, marsX - marsGlow.width / 2, marsY - marsGlow.height / 2);
  ctx.globalAlpha = 1;
  ctx.drawImage(marsBody, marsX - marsBody.width / 2, marsY - marsBody.height / 2);

  // 4. drifting clouds (in front of the sky/celestial, behind the land)
  for (let i = 0; i < clouds.length; i++) {
    const cl = clouds[i];
    const cw = cl.c.width;
    const span = w + cw + 40;
    let x = (cl.baseX - camX * cl.par + t * cl.drift) % span;
    if (x < 0) x += span;
    x -= cw;
    ctx.drawImage(cl.c, x | 0, cl.y);
  }

  // 5. three parallax silhouette layers, far -> near
  blitLayer(ctx, mesas, camX, P_MESA, w);
  blitLayer(ctx, hills, camX, P_HILL, w);
  blitLayer(ctx, treeline, camX, P_TREE, w);
}
