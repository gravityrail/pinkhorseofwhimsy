#!/usr/bin/env node
/**
 * Bean Quiz "mega-upgrade" art batch — contestant avatars, particle props,
 * extra host poses, medals, the pink-horse cameo, and a painted logo.
 *
 * Same pipeline as generate-art.mjs (Gemini nano-banana-pro on a solid green
 * chroma-key background). After generating, run remove-bg.mjs with the names
 * printed at the end to key the green off.
 *
 *   node games/bean-quiz/generate-art-v2.mjs             # generate missing
 *   FORCE=1 node games/bean-quiz/generate-art-v2.mjs av-frog
 */
import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
config({ path: join(ROOT, '.env') });
const OUT_DIR = join(ROOT, 'site', 'static', 'bean-quiz', 'assets', 'img');
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GOOGLE_GEMINI_API_KEY'); process.exit(1); }

const MODEL = process.env.GEMINI_MODEL || 'nano-banana-pro-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const STYLE = `Style: bright, bouncy, modern kids' cartoon / Pixar-ish 3D-sticker look with a thick clean WHITE sticker outline around the whole subject, glossy highlights, super expressive and cute, saturated candy colors. IMPORTANT: subject centered and fully visible, isolated on a SOLID FLAT PURE GREEN chroma-key background (bright green like hex 00FF00, one uniform color edge to edge — NOT a checkerboard, NOT a transparency pattern, no gradient, no vignette), no scenery, no cast shadows on the background, no text, no watermark. Square composition.`;

const AVATAR = (desc) => `A cute cartoon ${desc}, drawn as a game-show CONTESTANT character portrait: head and shoulders bust, facing the viewer with a huge confident grin, wearing a tiny colorful bow-tie or collar, game-show contestant energy. ${STYLE}`;
const PROP = (desc) => `A single ${desc}, drawn as a chunky glossy cartoon game prop / sticker. ${STYLE}`;

const BEAN = `THE BEAN is a small chihuahua-terrier mix dog. Distinctive look: shaggy, unkempt PURE WHITE fluffy fur; a punky white MOHAWK standing up on her head; big round dark expressive puppy eyes; a tiny black nose; a slight comical UNDERBITE with one little bottom tooth poking out; small size, big personality. She is the cheerful, bouncy HOST of a kids' TV game show, wearing a sparkly magenta/pink game-show host jacket with a shiny bow-tie.`;
const TIGER = `TIGER is a chunky GINGER TABBY CAT with bold orange stripes, a cream belly, round green eyes, whiskers, and a mischievous grin. He is the sidekick, wearing a tiny teal bow-tie.`;

const IMAGES = [
  // ── Contestant avatars (replace the emoji set) ──────────────────────────
  { name: 'av-frog',    prompt: AVATAR('bright green frog with big googly eyes and a lily-pad-green bow-tie') },
  { name: 'av-unicorn', prompt: AVATAR('white unicorn with a rainbow mane and a glittery golden horn') },
  { name: 'av-octopus', prompt: AVATAR('purple octopus with two curly tentacles raised like it is celebrating') },
  { name: 'av-trex',    prompt: AVATAR('teal T-rex dinosaur with tiny arms and a huge toothy happy grin') },
  { name: 'av-koala',   prompt: AVATAR('fluffy grey koala with big fuzzy ears holding a eucalyptus sprig') },
  { name: 'av-fox',     prompt: AVATAR('clever orange fox with a bushy white-tipped tail curling into frame') },
  { name: 'av-pig',     prompt: AVATAR('pink pig with a curly tail and a little party hat') },
  { name: 'av-turtle',  prompt: AVATAR('green sea turtle with a patterned shell and round glasses, smart-kid vibes') },
  { name: 'av-bee',     prompt: AVATAR('chubby striped bumblebee with tiny wings and a stinger-proof smile') },
  { name: 'av-lion',    prompt: AVATAR('golden lion cub with a magnificent fluffy mane and a crown-shaped cowlick') },
  { name: 'av-panda',   prompt: AVATAR('roly-poly panda holding a piece of bamboo like a microphone') },
  { name: 'av-chick',   prompt: AVATAR('tiny yellow baby chick with a single feather sticking up on its head') },
  // ── Particle props (replace emoji rain) ─────────────────────────────────
  { name: 'prop-bone',    prompt: PROP('white cartoon dog bone with rounded knobby ends') },
  { name: 'prop-tennis',  prompt: PROP('bright yellow-green fuzzy tennis ball with a white curved seam') },
  { name: 'prop-yarn',    prompt: PROP('pink ball of yarn with a loose strand curling off it') },
  { name: 'prop-star',    prompt: PROP('shiny golden five-pointed star with a sparkle glint') },
  { name: 'prop-goldbean', prompt: PROP('legendary GOLDEN BEAN: a glossy metallic gold coffee-bean-shaped trophy bean with radiant sparkles and a tiny crown on top') },
  { name: 'prop-trophy',  prompt: PROP('golden winner trophy cup with two handles and a star emblem') },
  { name: 'prop-crown',   prompt: PROP('golden royal crown with red and blue jewels') },
  { name: 'prop-fish',    prompt: PROP('cartoon orange goldfish, side view, happy face') },
  { name: 'prop-donut',   prompt: PROP('pink frosted donut with rainbow sprinkles, one bite missing') },
  { name: 'prop-bolt',    prompt: PROP('electric yellow cartoon lightning bolt with an energetic glow') },
  // ── Extra host poses ────────────────────────────────────────────────────
  { name: 'bean-gasp',  prompt: `${BEAN} Pose: dramatic GASP — both paws on her cheeks, mouth wide open in shock, eyes enormous, mohawk standing extra tall, leaning back in disbelief. ${STYLE}` },
  { name: 'bean-disco', prompt: `${BEAN} Pose: disco fever dance move — one paw pointing up to the sky, hip cocked, wearing tiny star-shaped sunglasses, huge grin, striking a Saturday Night Fever pose. ${STYLE}` },
  { name: 'tiger-laugh', prompt: `${TIGER} Pose: cracking up laughing — eyes squeezed shut, huge open-mouth cat laugh, one paw slapping his knee, tail curled in delight. ${STYLE}` },
  { name: 'tiger-sleep', prompt: `${TIGER} Pose: fast asleep sitting upright, eyes closed, tiny 'zzz' bubbles floating above his head, drooping whiskers, utterly unbothered. ${STYLE}` },
  // ── UI bits ─────────────────────────────────────────────────────────────
  { name: 'ui-medal-gold',   prompt: PROP('first-place GOLD medal with a number 1 embossed on it, hanging from a short red ribbon') },
  { name: 'ui-medal-silver', prompt: PROP('second-place SILVER medal with a number 2 embossed on it, hanging from a short blue ribbon') },
  { name: 'ui-medal-bronze', prompt: PROP('third-place BRONZE medal with a number 3 embossed on it, hanging from a short green ribbon') },
  // ── Cameos ──────────────────────────────────────────────────────────────
  { name: 'pink-horse', prompt: `A whimsical bright PINK cartoon horse with a flowing magenta mane and tail, mid-gallop, joyful expression, tiny sparkles trailing behind it — the mascot of "Pink Horse of Whimsy". Full body side view, galloping to the RIGHT. ${STYLE}` },
  // ── Painted logo ────────────────────────────────────────────────────────
  { name: 'logo-beanquiz', prompt: `The words "BEAN QUIZ" as a fun 3D game-show logo wordmark: fat glossy rounded golden-yellow letters with hot-pink outline and trim, slight playful arch and tilt, cartoon TV game show style, tiny white sparkle glints on the letters, and a small cartoon white dog paw print dotting the design. Spelled exactly "BEAN QUIZ" in two stacked words. High quality typography, perfectly readable. Isolated on a SOLID FLAT PURE GREEN chroma-key background (bright green like hex 00FF00, uniform edge to edge, no checkerboard, no gradient). No other text, no watermark. Wide landscape composition.` },
];

async function exists(p){ try { await access(p); return true; } catch { return false; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generate(img) {
  const out = join(OUT_DIR, `${img.name}.png`);
  if (!process.env.FORCE && await exists(out)) { console.log(`skip  ${img.name} (exists)`); return true; }
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
      if (!res.ok) { lastErr = `${res.status} ${(await res.text()).slice(0,160)}`; await sleep(4000*attempt); continue; }
      const data = await res.json();
      for (const c of data.candidates || [])
        for (const part of c.content?.parts || [])
          if (part.inlineData) {
            await writeFile(out, Buffer.from(part.inlineData.data, 'base64'));
            console.log(`done  ${img.name}`);
            return true;
          }
      lastErr = 'no image in response';
    } catch (e) { lastErr = e.message; }
    await sleep(3000*attempt);
  }
  console.log(`FAIL  ${img.name}: ${lastErr}`);
  return false;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const list = only.length ? IMAGES.filter(i => only.includes(i.name)) : IMAGES;
  if (!list.length) { console.error(`No images named "${only.join(', ')}"`); process.exit(1); }
  // Two workers keeps us under rate limits but halves the wall clock.
  const queue = [...list];
  let ok = 0;
  await Promise.all([0, 1].map(async () => {
    while (queue.length) {
      const img = queue.shift();
      if (await generate(img)) ok++;
      await sleep(1200);
    }
  }));
  console.log(`\n${ok}/${list.length} images ready in ${OUT_DIR}`);
  console.log('Key the green off with:\n  node games/bean-quiz/remove-bg.mjs ' + list.map(i => i.name).join(' '));
}
main().catch(e => { console.error(e); process.exit(1); });
