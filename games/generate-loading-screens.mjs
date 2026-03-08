#!/usr/bin/env node

/**
 * Generate loading screen images for example games using Google Gemini (Nano Banana 2).
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Set GOOGLE_GEMINI_API_KEY environment variable');
  process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL || 'nano-banana-pro-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

async function generateImage(prompt, outPath) {
  const filename = outPath.split('/').pop();
  process.stdout.write(`  Generating ${filename}... `);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.log(`FAILED (${res.status}): ${err.slice(0, 200)}`);
    return false;
  }

  const data = await res.json();
  const candidates = data.candidates || [];

  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        const buf = Buffer.from(part.inlineData.data, 'base64');
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, buf);
        console.log('done');
        return true;
      }
    }
  }

  console.log('no image in response');
  console.log(JSON.stringify(data, null, 2).slice(0, 500));
  return false;
}

const GAMES = [
  {
    dir: '2d/coin-collector',
    filename: 'loading.png',
    prompt: `Create a retro game loading screen image for a 2D platformer called "COIN COLLECTOR".

The image should be exactly 800x600 pixels.

Design details:
- Dark navy/black background with a subtle pixel grid pattern
- The title "COIN COLLECTOR" in large, bold, golden pixel-art style text centered near the top third
- Below the title, show a pixel art scene: a small blue character (simple square-ish platformer hero) standing on a green platform, reaching up toward 3 floating golden coins with sparkle effects
- Small pixel art platform blocks scattered decoratively around the edges
- A subtle tagline "Grass Valley Game Club" in small white pixel text near the bottom
- Retro 8-bit / 16-bit aesthetic throughout — chunky pixels, limited color palette
- Color palette: dark navy background, golden yellow coins, bright green platforms, blue character, white sparkle accents
- Clean, crisp pixel art — no anti-aliasing, no gradients, hard pixel edges
- This is a loading screen so it should feel exciting and set the mood for a fun platformer`,
  },
  {
    dir: '2d/platform-runner',
    filename: 'loading.png',
    prompt: `Create a retro game loading screen image for a 2D action platformer called "PLATFORM RUNNER".

The image should be exactly 800x600 pixels.

Design details:
- Dark charcoal/dark gray background with faint cyan grid lines (sci-fi feel)
- The title "PLATFORM RUNNER" in large, bold, bright red pixel-art style text with a slight glow/outline, centered near the top third
- Below the title, show a pixel art action scene: a red-suited runner character in a dynamic running pose, leaping over metallic spikes, with a purple slime enemy nearby
- Sci-fi themed platforms with cyan/teal edge highlights
- Small skull-and-crossbones or warning symbols near the spikes for danger theming
- Speed lines or motion blur pixels behind the runner to convey movement
- A subtle tagline "Grass Valley Game Club" in small cyan pixel text near the bottom
- Retro 8-bit / 16-bit aesthetic — chunky pixels, hard edges
- Color palette: dark gray background, red character, cyan/teal accents, purple enemies, metallic silver spikes
- This is a loading screen for an intense, fast-paced platformer with hazards and enemies`,
  },
  {
    dir: '3d/maze-explorer',
    filename: 'loading.png',
    prompt: `Create a retro game loading screen image for a 3D first-person maze game called "MAZE EXPLORER".

The image should be exactly 800x600 pixels.

Design details:
- Very dark background — deep blue/black, mysterious and atmospheric
- The title "MAZE EXPLORER" in large, bold pixel-art text with a stone/dungeon texture feel, centered near the top third — colors of gray stone with green gem-colored highlights on key letters
- Below the title, show a first-person perspective pixel art scene: looking down a dark stone corridor with textured brick walls on both sides converging to a vanishing point, a glowing green gem floating in the distance, and a golden key hanging on the wall
- Torch-like warm orange lighting effects on the walls
- A subtle compass rose or minimap icon in one corner
- Mysterious runes or symbols etched faintly into the stone walls
- A subtle tagline "Grass Valley Game Club" in small gray pixel text near the bottom
- Retro pixel art aesthetic but with atmospheric depth — like a classic dungeon crawler loading screen
- Color palette: deep blue-black background, gray stone walls, warm orange torchlight, green gems, golden key
- This should feel mysterious, adventurous, and slightly spooky — like you're about to explore an ancient maze`,
  },
];

async function main() {
  console.log('Generating loading screens with Gemini...\n');

  for (const game of GAMES) {
    const outPath = join(__dirname, game.dir, game.filename);
    await generateImage(game.prompt, outPath);
    // Small delay between API calls
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\nDone! Now update game.json files to reference loading.png');
}

main().catch(console.error);
