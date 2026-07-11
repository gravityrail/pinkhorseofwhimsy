#!/usr/bin/env node
/**
 * Chroma-key the green-screen backgrounds off the Bean Quiz character sprites.
 * Flood-fills from the image edges, removing connected green pixels only (so
 * green *inside* the character — Tiger's eyes, bow-tie — is safe), then
 * feathers the cut edge. Writes real transparent PNGs in place.
 *
 *   node games/bean-quiz/remove-bg.mjs [name ...]   # default: all sprites
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, '..', '..', 'site', 'static', 'bean-quiz', 'assets', 'img');
const SPRITES = ['bean-idle', 'bean-cheer', 'bean-aww', 'bean-think', 'tiger-idle', 'tiger-smug'];

function isGreen(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  return g > 90 && g > r * 1.3 && g > b * 1.3;
}

async function keyOut(name) {
  const path = join(IMG_DIR, `${name}.png`);
  const img = await loadImage(await readFile(path));
  const { width: w, height: h } = img;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  // BFS flood fill from every edge pixel across green-ish pixels.
  const bg = new Uint8Array(w * h); // 1 = background
  const qx = new Int32Array(w * h), qy = new Int32Array(w * h);
  let head = 0, tail = 0;
  const seed = (x, y) => {
    const p = y * w + x;
    if (!bg[p] && isGreen(d, p * 4)) { bg[p] = 1; qx[tail] = x; qy[tail] = y; tail++; }
  };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (head < tail) {
    const x = qx[head], y = qy[head]; head++;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  let removed = 0;
  for (let p = 0; p < w * h; p++) if (bg[p]) { d[p * 4 + 3] = 0; removed++; }

  // Feather: soften 1px rim, and de-spill green tint on edge pixels.
  const a = i => d[i * 4 + 3];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    if (a(p) === 0) continue;
    const holes = (a(p - 1) === 0) + (a(p + 1) === 0) + (a(p - w) === 0) + (a(p + w) === 0);
    if (holes > 0) {
      d[p * 4 + 3] = holes >= 3 ? 80 : 170;
      const i = p * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      if (g > r && g > b) d[i + 1] = Math.max(r, b); // kill green spill
    }
  }

  ctx.putImageData(im, 0, 0);
  await writeFile(path, canvas.toBuffer('image/png'));
  const pct = ((removed / (w * h)) * 100).toFixed(1);
  console.log(`${name}: removed ${pct}% as background${pct < 15 ? '  ⚠ suspiciously little — check image' : ''}`);
}

const names = process.argv.slice(2);
for (const n of (names.length ? names : SPRITES)) await keyOut(n);
console.log('done');
