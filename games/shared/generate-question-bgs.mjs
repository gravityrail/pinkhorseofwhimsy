#!/usr/bin/env node
import { writeFile, mkdir, access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
config({ path: join(ROOT, '.env') });

const OUT_DIR = join(ROOT, 'site/static/bean-quiz/assets/bg');
const BATCH = join(__dirname, 'question-bg-batch.json');
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) { console.error('need GOOGLE_GEMINI_API_KEY'); process.exit(1); }
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const W = 1280, H = 720;
const STYLE = `FORMAT: wide 16:9 landscape full bleed. BACKGROUND for kids quiz UI — slightly darker center/lower third for readability. No watermarks, logos, readable text, celebrity faces. Painted whimsical illustration.`;

async function exists(p) { try { await access(p); return true; } catch { return false; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function normalize(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(0, 0, W, H);
  const sr = img.width / img.height, dr = W / H;
  let dw, dh, dx, dy;
  if (sr > dr) { dw = W; dh = Math.round(W / sr); dx = 0; dy = Math.round((H - dh) / 2); }
  else { dh = H; dw = Math.round(H * sr); dx = Math.round((W - dw) / 2); dy = 0; }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, dx, dy, dw, dh);
  const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.15, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgba(10,5,20,0)');
  g.addColorStop(0.55, 'rgba(10,5,20,0.18)');
  g.addColorStop(1, 'rgba(10,5,20,0.58)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return c.toBuffer('image/png');
}

async function gen(item) {
  const dest = join(OUT_DIR, item.name + '.png');
  if (!process.env.FORCE && await exists(dest)) { console.log('skip', item.name); return dest; }
  await mkdir(OUT_DIR, { recursive: true });
  const full = `Kids quiz question backdrop: ${item.title}.\n\n${item.prompt}\n\n${STYLE}`;
  process.stdout.write('qbg  ' + item.name + ' ... ');
  let last = '';
  for (let a = 1; a <= 4; a++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: full }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '16:9' } },
        }),
      });
      if (!res.ok) { last = res.status + ' ' + (await res.text()).slice(0, 100); await sleep(2000 * a); continue; }
      const data = await res.json();
      for (const c of data.candidates || [])
        for (const part of c.content?.parts || []) {
          const inline = part.inlineData || part.inline_data;
          if (inline?.data) {
            const out = await normalize(Buffer.from(inline.data, 'base64'));
            await writeFile(dest, out);
            console.log('ok', out.length);
            return dest;
          }
        }
      last = 'no image';
      await sleep(2000 * a);
    } catch (e) { last = e.message; await sleep(2000 * a); }
  }
  console.log('FAIL', last);
  return null;
}

const batch = JSON.parse(await readFile(BATCH, 'utf8'));
let ok = 0;
for (const item of batch.backgrounds) {
  if (await gen(item)) ok++;
  await sleep(700);
}
console.log('Done', ok + '/' + batch.backgrounds.length);
