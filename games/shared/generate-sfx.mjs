#!/usr/bin/env node
/**
 * Generate short sound effects via ElevenLabs sound-generation API.
 *
 * Usage:
 *   node games/shared/generate-sfx.mjs --name laser-pew --text "short retro laser pew"
 *   node games/shared/generate-sfx.mjs --batch games/shared/sfx-batch.json
 *
 * Writes MP3 to site/static/arcade/sfx/<name>.mp3 (or --out).
 * Idempotent unless FORCE=1.
 */
import { writeFile, mkdir, access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
config({ path: join(ROOT, '.env') });

const OUT_DIR = join(ROOT, 'site/static/arcade/sfx');
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Set ELEVENLABS_API_KEY'); process.exit(1); }

const API = 'https://api.elevenlabs.io/v1/sound-generation';

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

async function generateOne({ name, text, duration = 1.2, prompt_influence = 0.3, out }) {
  const dest = out || join(OUT_DIR, `${name}.mp3`);
  if (!process.env.FORCE && await exists(dest)) {
    console.log(`skip  ${name} (exists)`);
    return dest;
  }
  await mkdir(dirname(dest), { recursive: true });
  process.stdout.write(`sfx   ${name} ... `);
  let lastErr = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
          'xi-api-key': KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          duration_seconds: Math.min(22, Math.max(0.5, Number(duration) || 1.2)),
          prompt_influence: Number(prompt_influence) || 0.3,
        }),
      });
      if (!res.ok) {
        lastErr = `${res.status} ${(await res.text()).slice(0, 180)}`;
        await sleep(1500 * attempt);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buf);
      console.log(`ok (${buf.length} bytes)`);
      return dest;
    } catch (e) {
      lastErr = e.message;
      await sleep(1500 * attempt);
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
    const items = Array.isArray(batch) ? batch : batch.sounds || [];
    for (const item of items) {
      await generateOne(item);
      await sleep(400);
    }
    return;
  }
  if (!args.name || !args.text) {
    console.error('Need --name and --text, or --batch file.json');
    process.exit(1);
  }
  await generateOne({
    name: args.name,
    text: args.text,
    duration: args.duration,
    prompt_influence: args.influence,
    out: args.out,
  });
}

main().catch(e => { console.error(e); process.exit(1); });
