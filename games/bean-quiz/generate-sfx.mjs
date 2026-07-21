#!/usr/bin/env node
/**
 * Bean Quiz sound pass — real game-show SFX + theme music via ElevenLabs.
 *
 *   SFX  : POST /v1/sound-generation      -> assets/sfx/<name>.mp3
 *   Music: POST /v1/music (compose)       -> assets/music/<name>.mp3
 *
 * Idempotent (skips existing). FORCE=1 regenerates. Optional args narrow the
 * run to specific names.
 */
import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
config({ path: join(ROOT, '.env') });
const GAME = join(ROOT, 'site', 'static', 'bean-quiz', 'assets');
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Set ELEVENLABS_API_KEY'); process.exit(1); }

const SFX = [
  { name: 'applause-big',  dur: 4,   text: 'Big enthusiastic TV game show studio audience applause with cheering and whistles, bright and exciting' },
  { name: 'applause-small',dur: 2.5, text: 'Short polite studio audience applause, warm, medium size crowd' },
  { name: 'aww',           dur: 2,   text: 'TV studio audience sympathetic disappointed "awwww" reaction, warm and comedic' },
  { name: 'ooh',           dur: 2,   text: 'TV studio audience intrigued suspenseful "ooooh" reaction, rising in pitch' },
  { name: 'laugh',         dur: 3,   text: 'Sitcom studio audience burst of laughter, warm and genuine' },
  { name: 'drumroll',      dur: 3,   text: 'Tight suspenseful snare drum roll, building tension, ends with a cymbal crash' },
  { name: 'rimshot',       dur: 1.5, text: 'Comedy rimshot ba-dum-tss, snare snare cymbal, tight and punchy' },
  { name: 'ding',          dur: 1.5, text: 'Bright game show correct answer bell ding with a sparkly chime tail' },
  { name: 'buzzer',        dur: 1.2, text: 'Classic game show wrong answer buzzer, comedic harsh honk' },
  { name: 'whoosh',        dur: 0.8, text: 'Fast cartoon swoosh whoosh transition' },
  { name: 'shimmer',       dur: 2,   text: 'Magical golden shimmer glissando, fairy dust sparkle sweep upward, harp' },
  { name: 'ticktock',      dur: 5,   text: 'Game show thinking clock ticking steadily, wooden tick tock, slightly tense, constant tempo' },
  { name: 'pop',           dur: 0.5, text: 'Small cartoon bubble pop' },
  { name: 'fanfare',       dur: 3,   text: 'Triumphant trumpet victory fanfare, short and celebratory ta-da' },
  { name: 'boing',         dur: 1,   text: 'Bouncy cartoon spring boing' },
  { name: 'dash',          dur: 1.2, text: 'Cartoon character zooming away at high speed: fast zip whoosh with an ascending slide whistle' },
  { name: 'bark',          dur: 1.2, text: 'Small excited dog: two happy high-pitched yips' },
  { name: 'meow',          dur: 1.2, text: 'Grumpy annoyed cat meow, mrrow complaint' },
  { name: 'purr',          dur: 2,   text: 'Contented cat purring loudly, close up' },
  { name: 'whinny',        dur: 1.8, text: 'Happy horse whinny neigh, bright and whimsical' },
  { name: 'crash',         dur: 1.5, text: 'Ceramic mug knocked off a table, falls and shatters on the floor, comedic timing' },
  { name: 'claw',          dur: 1,   text: 'Fast cat claw swipe through the air with a short fabric rip' },
  { name: 'confetti-pop',  dur: 1.5, text: 'Party confetti cannon pop with paper bits fluttering down' },
  { name: 'heartbeat',     dur: 3,   text: 'Tense slow human heartbeat thumping, suspense, two beats per second' },
];

const MUSIC = [
  { name: 'theme',   ms: 32000, prompt: 'Zany upbeat TV game show theme tune: punchy brass hits, funky walking bassline, hand claps, kazoo and slide-whistle accents, playful and silly kids TV energy, bright major key, instrumental only, seamless loop' },
  { name: 'think',   ms: 32000, prompt: 'Light suspenseful quiz show "thinking time" underscore: soft ticking percussion, pizzicato strings, playful marimba and vibraphone, gentle tension but cheerful, quiet dynamics, instrumental only, seamless loop' },
  { name: 'results', ms: 20000, prompt: 'Triumphant TV game show winner celebration: big brass fanfare into a party groove with timpani rolls, glockenspiel sparkles, confetti-drop energy, instrumental only' },
];

async function exists(p) { try { await access(p); return true; } catch { return false; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function gen(url, body, out, label) {
  if (!process.env.FORCE && await exists(out)) { console.log(`skip  ${label}`); return true; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await writeFile(out, Buffer.from(await res.arrayBuffer()));
      console.log(`done  ${label}`);
      return true;
    }
    const err = (await res.text().catch(() => '')).slice(0, 200);
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * attempt); continue; }
    console.log(`FAIL  ${label}: ${res.status} ${err}`);
    return false;
  }
  console.log(`FAIL  ${label}: retries exhausted`);
  return false;
}

async function main() {
  await mkdir(join(GAME, 'sfx'), { recursive: true });
  await mkdir(join(GAME, 'music'), { recursive: true });
  const only = process.argv.slice(2);
  let ok = 0, total = 0;

  const sfxJobs = SFX.filter(s => !only.length || only.includes(s.name));
  const queue = [...sfxJobs];
  await Promise.all([0, 1, 2].map(async () => {
    while (queue.length) {
      const s = queue.shift();
      total++;
      if (await gen(
        'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_96',
        { text: s.text, duration_seconds: s.dur, prompt_influence: 0.55 },
        join(GAME, 'sfx', `${s.name}.mp3`), `sfx/${s.name}`)) ok++;
      await sleep(500);
    }
  }));

  for (const m of MUSIC.filter(m => !only.length || only.includes(m.name))) {
    total++;
    const out = join(GAME, 'music', `${m.name}.mp3`);
    // Try the compose endpoint first, then the plain /v1/music path.
    const done =
      (await gen('https://api.elevenlabs.io/v1/music/compose?output_format=mp3_44100_128',
        { prompt: m.prompt, music_length_ms: m.ms }, out, `music/${m.name}`)) ||
      (await gen('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',
        { prompt: m.prompt, music_length_ms: m.ms }, out, `music/${m.name} (alt)`));
    if (done) ok++;
  }
  console.log(`\n${ok}/${total} audio assets ready under ${GAME}/{sfx,music}`);
}
main().catch(e => { console.error(e); process.exit(1); });
