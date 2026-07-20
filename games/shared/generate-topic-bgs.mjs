#!/usr/bin/env node
/**
 * Generate Bean Quiz topic backdrop images (16:9 stage sets) via Gemini.
 *
 *   FORCE=1 node games/shared/generate-topic-bgs.mjs
 *   FORCE=1 node games/shared/generate-topic-bgs.mjs --only pop-stars,science
 *
 * Writes site/static/bean-quiz/assets/bg/<id>.png at 1280×720.
 */
import { writeFile, mkdir, access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
config({ path: join(ROOT, '.env') });

const OUT_DIR = join(ROOT, 'site/static/bean-quiz/assets/bg');
const BATCH = join(__dirname, 'topic-bg-batch.json');
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GOOGLE_GEMINI_API_KEY'); process.exit(1); }

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const W = 1280, H = 720; // 16:9 stage backdrop

const STYLE = `
FORMAT: wide cinematic 16:9 landscape, fills the entire frame edge-to-edge.
PURPOSE: full-screen BACKGROUND for a kids quiz game show — must sit BEHIND UI cards.
Keep the center and lower-third slightly darker / softer so white question cards stay readable.
No watermarks, no logos, no brand marks, no readable words or letters, no UI chrome,
no real celebrity faces, no photoreal people. Painted whimsical illustration / storybook
set design. Rich color, gentle atmosphere, depth with foreground props and distant scenery.
`;

async function exists(p) { try { await access(p); return true; } catch { return false; } }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function normalize169(pngBuf) {
  const img = await loadImage(pngBuf);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(0, 0, W, H);
  const srcR = img.width / img.height;
  const dstR = W / H;
  let dw, dh, dx, dy;
  if (srcR > dstR) {
    dw = W; dh = Math.round(W / srcR); dx = 0; dy = Math.round((H - dh) / 2);
  } else {
    dh = H; dw = Math.round(H * srcR); dx = Math.round((W - dw) / 2); dy = 0;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);
  // Soft vignette so UI pops
  const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.15, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgba(10,5,20,0)');
  g.addColorStop(0.55, 'rgba(10,5,20,0.15)');
  g.addColorStop(1, 'rgba(10,5,20,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return canvas.toBuffer('image/png');
}

async function generateOne({ name, title, prompt }) {
  const dest = join(OUT_DIR, `${name}.png`);
  if (!process.env.FORCE && await exists(dest)) {
    console.log(`skip  ${name}`);
    return dest;
  }
  await mkdir(OUT_DIR, { recursive: true });
  const full = [
    `Kids TV game-show STAGE BACKDROP themed around "${title}".`,
    prompt,
    STYLE,
  ].join('\n\n');

  process.stdout.write(`bg    ${name} ... `);
  let lastErr = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: full }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '16:9' },
          },
        }),
      });
      if (!res.ok) {
        lastErr = `${res.status} ${(await res.text()).slice(0, 180)}`;
        await sleep(2500 * attempt);
        continue;
      }
      const data = await res.json();
      for (const c of data.candidates || []) {
        for (const part of c.content?.parts || []) {
          const inline = part.inlineData || part.inline_data;
          if (inline?.data) {
            const raw = Buffer.from(inline.data, 'base64');
            const out = await normalize169(raw);
            await writeFile(dest, out);
            console.log(`ok (${out.length} bytes)`);
            return dest;
          }
        }
      }
      lastErr = 'no image';
      await sleep(2000 * attempt);
    } catch (e) {
      lastErr = e.message;
      await sleep(2000 * attempt);
    }
  }
  console.log(`FAIL ${lastErr}`);
  return null;
}

function parseOnly(argv) {
  const i = argv.indexOf('--only');
  if (i < 0) return null;
  return new Set(String(argv[i + 1] || '').split(',').map(s => s.trim()).filter(Boolean));
}

async function main() {
  const batch = JSON.parse(await readFile(BATCH, 'utf8'));
  const only = parseOnly(process.argv);
  let items = batch.backgrounds || batch;
  if (only) items = items.filter(x => only.has(x.name));
  let ok = 0;
  for (const item of items) {
    if (await generateOne(item)) ok++;
    await sleep(700);
  }
  console.log(`\nDone ${ok}/${items.length} → ${OUT_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
