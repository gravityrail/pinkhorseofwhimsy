#!/usr/bin/env node
/**
 * Generate character art for Bean Quiz using Google Gemini (nano-banana-pro).
 * Outputs transparent-ish PNGs to site/static/bean-quiz/assets/img/.
 *
 * Idempotent: skips files that already exist unless FORCE=1.
 *
 *   node games/bean-quiz/generate-art.mjs            # generate missing
 *   FORCE=1 node games/bean-quiz/generate-art.mjs    # regenerate all
 *   node games/bean-quiz/generate-art.mjs bean-cheer # just one
 */
import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'site', 'static', 'bean-quiz', 'assets', 'img');
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GOOGLE_GEMINI_API_KEY'); process.exit(1); }

const MODEL = process.env.GEMINI_MODEL || 'nano-banana-pro-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// Shared, identical character bibles so the look stays consistent across calls.
const BEAN = `THE BEAN is a small chihuahua-terrier mix dog. Distinctive look: shaggy, unkempt PURE WHITE fluffy fur; a punky white MOHAWK standing up on her head; big round dark expressive puppy eyes; a tiny black nose; a slight comical UNDERBITE with one little bottom tooth poking out; small size, big personality. She is the cheerful, bouncy HOST of a kids' TV game show, wearing a sparkly magenta/pink game-show host jacket with a shiny bow-tie.`;
const TIGER = `TIGER is a chunky GINGER TABBY CAT with bold orange stripes, a cream belly, round green eyes, whiskers, and a mischievous grin. He is the sidekick, wearing a tiny teal bow-tie and holding or near a little retro microphone.`;

const STYLE = `Style: bright, bouncy, modern kids' cartoon / Pixar-ish 3D-sticker look with a thick clean WHITE sticker outline around the whole character, glossy highlights, super expressive and cute, saturated candy colors. IMPORTANT: full character centered and fully visible, isolated on a SOLID FLAT PURE GREEN chroma-key background (bright green like hex 00FF00, one uniform color edge to edge — NOT a checkerboard, NOT a transparency pattern, no gradient, no vignette), no scenery, no shadows on the background, no text, no watermark. Square composition.`;

const IMAGES = [
  { name: 'bean-idle', prompt: `${BEAN} Pose: standing on hind legs facing the viewer, one paw raised mid-gesture as if cheerfully hosting and talking, warm friendly open-mouth smile. ${STYLE}` },
  { name: 'bean-cheer', prompt: `${BEAN} Pose: both front paws thrown up in the air in wild celebration, eyes sparkling, huge joyful open-mouth grin, jumping with excitement, tiny confetti bits around her. ${STYLE}` },
  { name: 'bean-aww', prompt: `${BEAN} Pose: sympathetic "aww, so close" face, head tilted, one paw on her cheek, gentle apologetic half-smile with the little underbite tooth showing, big soft eyes. ${STYLE}` },
  { name: 'bean-think', prompt: `${BEAN} Pose: thinking hard, one paw under her chin, eyes looking up, a curious raised-eyebrow expression, a little thought sparkle above her mohawk. ${STYLE}` },
  { name: 'tiger-idle', prompt: `${TIGER} Pose: sitting upright and relaxed, holding a tiny retro microphone up, cool confident half-smile, tail curled. ${STYLE}` },
  { name: 'tiger-smug', prompt: `${TIGER} Pose: leaning back with a smug know-it-all smirk, arms/paws crossed, one eyebrow raised, eyes half-closed and cheeky. ${STYLE}` },
  { name: 'title-scene', prompt: `A fun kids' TV game-show title scene. On the LEFT: ${BEAN} On the RIGHT: ${TIGER} They stand together on a glowing game-show stage podium under sparkly stage lights and a big glittery curtain, confetti in the air, both mid-cheer welcoming the audience. Leave clear empty space in the top-center of the image for a title to be added later. Bright, festive, exciting kids' cartoon poster style. Wide landscape composition. No text.` },
];

async function exists(p){ try { await access(p); return true; } catch { return false; } }

async function generate(img) {
  const out = join(OUT_DIR, `${img.name}.png`);
  if (!process.env.FORCE && await exists(out)) { console.log(`skip  ${img.name} (exists)`); return true; }
  process.stdout.write(`gen   ${img.name} ... `);
  let lastErr = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: img.prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      });
      if (!res.ok) { lastErr = `${res.status} ${(await res.text()).slice(0,160)}`; await sleep(3000*attempt); continue; }
      const data = await res.json();
      for (const c of data.candidates || [])
        for (const part of c.content?.parts || [])
          if (part.inlineData) {
            await writeFile(out, Buffer.from(part.inlineData.data, 'base64'));
            console.log(`done (${part.inlineData.mimeType})`);
            return true;
          }
      lastErr = 'no image in response';
    } catch (e) { lastErr = e.message; }
    await sleep(2500*attempt);
  }
  console.log(`FAILED: ${lastErr}`);
  return false;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const list = only.length ? IMAGES.filter(i => only.includes(i.name)) : IMAGES;
  if (!list.length) { console.error(`No images named "${only.join(', ')}"`); process.exit(1); }
  let ok = 0;
  for (const img of list) { if (await generate(img)) ok++; await sleep(1500); }
  console.log(`\n${ok}/${list.length} images ready in ${OUT_DIR}`);
}
main().catch(e => { console.error(e); process.exit(1); });
