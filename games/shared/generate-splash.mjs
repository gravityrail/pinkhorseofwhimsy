#!/usr/bin/env node
/**
 * Generate 1980s video-game box-art style splash screens via Gemini image models.
 *
 * Usage:
 *   node games/shared/generate-splash.mjs --name worm --title "WORM" --prompt "..."
 *   node games/shared/generate-splash.mjs --batch games/shared/splash-batch.json
 *
 * Writes PNG to site/static/arcade/splashes/<name>.png (or --out).
 * Idempotent unless FORCE=1.
 */
import { writeFile, mkdir, access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
config({ path: join(ROOT, '.env') });

const OUT_DIR = join(ROOT, 'site/static/arcade/splashes');
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GOOGLE_GEMINI_API_KEY'); process.exit(1); }

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const BOX_ART_STYLE = `
Style: authentic late-1980s home-computer / NES / arcade CABINET box art painting.
Painted illustration (not 3D render, not photoreal, not modern flat vector).
Bold dramatic lighting, saturated jewel-tone palette, slight airbrush grain,
hero character large in foreground, wild action, glowing title energy.
Reminiscent of Roger Dean / Boris Vallejo / classic Nintendo box paintings
and European cassette inlay art (Ocean, US Gold, Mastertronic era).
Wide landscape 16:9 composition suitable as a full-screen game splash.
Leave a subtle darker band near the bottom for a START prompt overlay.
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
    title ? `The painted title wordmark "${title}" may appear integrated into the art in bold 80s lettering, or leave space at the top for it.` : '',
  ].filter(Boolean).join('\n\n');

  process.stdout.write(`gen   ${name} ... `);
  let lastErr = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      });
      if (!res.ok) {
        lastErr = `${res.status} ${(await res.text()).slice(0, 200)}`;
        await sleep(2500 * attempt);
        continue;
      }
      const data = await res.json();
      for (const c of data.candidates || []) {
        for (const part of c.content?.parts || []) {
          const inline = part.inlineData || part.inline_data;
          if (inline?.data) {
            const buf = Buffer.from(inline.data, 'base64');
            await writeFile(dest, buf);
            console.log(`ok (${buf.length} bytes)`);
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
    for (const item of items) {
      await generateOne(item);
      await sleep(800);
    }
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
