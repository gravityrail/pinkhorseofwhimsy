#!/usr/bin/env node
/**
 * Generate 1980s video-game box-art style splash screens via Gemini image models.
 * All outputs are forced to a consistent 4:3 landscape aspect ratio.
 *
 * Usage:
 *   node games/shared/generate-splash.mjs --name worm --title "WORM" --prompt "..."
 *   FORCE=1 node games/shared/generate-splash.mjs --batch games/shared/splash-batch.json
 *
 * Writes PNG to site/static/arcade/splashes/<name>.png (or --out).
 * Idempotent unless FORCE=1.
 */
import { writeFile, mkdir, access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
config({ path: join(ROOT, '.env') });

const OUT_DIR = join(ROOT, 'site/static/arcade/splashes');
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GOOGLE_GEMINI_API_KEY'); process.exit(1); }

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

/** Canonical cover size — 4:3 landscape (matches classic box / CRT feel). */
const TARGET_W = Number(process.env.SPLASH_WIDTH) || 1280;
const TARGET_H = Number(process.env.SPLASH_HEIGHT) || 960; // 4:3
const ASPECT = '4:3';

const BOX_ART_STYLE = `
CRITICAL FORMAT: landscape composition exactly 4:3 aspect ratio (width wider than height,
like a classic CRT monitor or NES box front — NOT square, NOT 16:9 ultrawide, NOT portrait).
Fill the entire rectangular frame edge-to-edge; no letterboxing bars inside the image.

Style: authentic late-1980s home-computer / NES / arcade CABINET box art painting.
Painted illustration (not 3D render, not photoreal, not modern flat vector).
Bold dramatic lighting, saturated jewel-tone palette, slight airbrush grain,
hero character large in foreground, wild action, glowing title energy.
Reminiscent of Roger Dean / Boris Vallejo / classic Nintendo box paintings
and European cassette inlay art (Ocean, US Gold, Mastertronic era).
Keep important title lettering fully inside the frame with comfortable margin —
nothing critical cropped at the edges.
Leave a subtle darker band near the bottom third for a START prompt overlay.
No watermarks, no UI chrome, no modern logos.`;

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[k] = v;
    } else out._.push(a);
  }
  return out;
}

/** Letterbox or crop-center to exact TARGET_W x TARGET_H (4:3). Prefer contain+pad. */
async function normalizeTo43(pngBuf) {
  const img = await loadImage(pngBuf);
  const canvas = createCanvas(TARGET_W, TARGET_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, TARGET_W, TARGET_H);

  const srcR = img.width / img.height;
  const dstR = TARGET_W / TARGET_H;
  let dw, dh, dx, dy;
  if (srcR > dstR) {
    // source wider than 4:3 — fit width, pad top/bottom
    dw = TARGET_W;
    dh = Math.round(TARGET_W / srcR);
    dx = 0;
    dy = Math.round((TARGET_H - dh) / 2);
  } else {
    // source taller/squarer — fit height, pad sides
    dh = TARGET_H;
    dw = Math.round(TARGET_H * srcR);
    dx = Math.round((TARGET_W - dw) / 2);
    dy = 0;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);
  return canvas.toBuffer('image/png');
}

async function generateOne({ name, title, prompt, out }) {
  const dest = out || join(OUT_DIR, `${name}.png`);
  if (!process.env.FORCE && await exists(dest)) {
    console.log(`skip  ${name} (exists)`);
    return dest;
  }
  await mkdir(dirname(dest), { recursive: true });
  const fullPrompt = [
    title ? `Video game splash / title screen box art for a game called "${title}".` : '',
    prompt,
    BOX_ART_STYLE,
    title
      ? `Paint the title wordmark "${title}" in bold 1980s game-box lettering near the top, fully legible, with margin from all edges.`
      : '',
  ].filter(Boolean).join('\n\n');

  process.stdout.write(`gen   ${name} (${ASPECT}) ... `);
  let lastErr = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            // Gemini image models honor aspectRatio when supported
            imageConfig: { aspectRatio: ASPECT },
          },
        }),
      });
      if (!res.ok) {
        lastErr = `${res.status} ${(await res.text()).slice(0, 220)}`;
        await sleep(2500 * attempt);
        continue;
      }
      const data = await res.json();
      for (const c of data.candidates || []) {
        for (const part of c.content?.parts || []) {
          const inline = part.inlineData || part.inline_data;
          if (inline?.data) {
            const raw = Buffer.from(inline.data, 'base64');
            const normalized = await normalizeTo43(raw);
            await writeFile(dest, normalized);
            console.log(`ok (${normalized.length} bytes → ${TARGET_W}x${TARGET_H})`);
            return dest;
          }
        }
      }
      lastErr = 'no image in response';
      await sleep(2000 * attempt);
    } catch (e) {
      lastErr = e.message;
      await sleep(2000 * attempt);
    }
  }
  console.log(`FAIL ${lastErr}`);
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const args = parseArgs(process.argv);
  if (args.batch) {
    const batch = JSON.parse(await readFile(args.batch, 'utf8'));
    const items = Array.isArray(batch) ? batch : batch.splashes || [];
    let ok = 0;
    for (const item of items) {
      const r = await generateOne(item);
      if (r) ok++;
      await sleep(800);
    }
    console.log(`\nDone: ${ok}/${items.length} at ${TARGET_W}x${TARGET_H} (${ASPECT})`);
    return;
  }
  if (!args.name || !args.prompt) {
    console.error('Need --name and --prompt, or --batch file.json');
    process.exit(1);
  }
  await generateOne({
    name: args.name,
    title: args.title || args.name,
    prompt: args.prompt,
    out: args.out,
  });
}

main().catch(e => { console.error(e); process.exit(1); });
