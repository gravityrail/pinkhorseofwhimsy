#!/usr/bin/env node

/**
 * Generate site graphics using Google Gemini image generation API.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, '..', 'site', 'static', 'img');
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Set GOOGLE_GEMINI_API_KEY environment variable');
  process.exit(1);
}

// nano-banana-pro-preview for high quality, gemini-2.0-flash-exp-image-generation as fallback
const MODEL = process.env.GEMINI_MODEL || 'nano-banana-pro-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

async function generateImage(prompt, filename) {
  process.stdout.write(`Generating ${filename}... `);

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
    console.log(`FAILED (${res.status}): ${err}`);
    return false;
  }

  const data = await res.json();
  const candidates = data.candidates || [];

  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        const buf = Buffer.from(part.inlineData.data, 'base64');
        const ext = part.inlineData.mimeType?.includes('png') ? 'png' : 'png';
        const outPath = join(IMG_DIR, filename.replace(/\.\w+$/, `.${ext}`));
        await writeFile(outPath, buf);
        console.log(`done -> ${outPath}`);
        return true;
      }
    }
  }

  console.log('no image in response');
  console.log(JSON.stringify(data, null, 2).slice(0, 500));
  return false;
}

const IMAGES = [
  {
    filename: 'logo.png',
    prompt: `Design a clean, bold logo icon for "Grass Valley Game Club" — a game design & programming club for kids ages 10-14.
The logo should feature a stylized game controller or joystick combined with pixel art elements (like small pixel blocks or a pixel heart).
Use a vibrant purple (#6c5ce7) as the primary color with accents of bright green and white.
Style: flat design, modern, playful but not childish. No text in the image — icon only.
Square format, transparent-friendly, works at small sizes (32x32 favicon up to 512x512).`,
  },
  {
    filename: 'hero-banner.png',
    prompt: `Create a wide banner illustration for a kids' game design club website called "Grass Valley Game Club".
The scene shows a colorful, retro-modern game development workspace: pixel art characters jumping off a computer screen,
a 3D environment being built in the background, game controllers, pixel hearts and stars floating around,
and the silhouette of pine trees (Grass Valley, California) along the bottom edge.
Color palette: purple (#6c5ce7), electric blue, bright green, orange accents on a dark navy background.
Style: a blend of pixel art and modern flat illustration. Wide format (roughly 3:1 aspect ratio).
Energetic, inspiring, fun. No text.`,
  },
  {
    filename: 'social-card.png',
    prompt: `Create a social media card image (1200x630) for "Grass Valley Game Club" — a game design & programming club at a charter school.
The image should show: a split scene with a 2D pixel platformer on the left and a 3D game environment on the right,
connected by a glowing pixel bridge. Game design elements float around: sprites, joysticks, code blocks, sound waves.
Include the text "GRASS VALLEY GAME CLUB" in bold, clean pixel-style font at the top,
and "Build. Play. Ship." as a tagline below it in a smaller modern font.
Color palette: deep purple (#6c5ce7) background, white and bright green text,
colorful game elements. Professional but fun.`,
  },
  {
    filename: 'arcade-header.png',
    prompt: `Create a retro arcade cabinet marquee header illustration for "The Grass Valley Arcade" — a website showcasing student-made games.
Style: classic 80s arcade marquee art meets modern pixel art.
Show a row of colorful arcade cabinets with screens glowing different colors,
pixel characters popping out of the screens, stars and lightning bolts.
Include the text "THE GRASS VALLEY ARCADE" in a bold, glowing retro arcade font with neon effects.
Color palette: dark background with neon purple, hot pink, electric blue, and bright yellow glows.
Wide format banner (roughly 4:1 aspect ratio).`,
  },
  {
    filename: 'week-2d-arc.png',
    prompt: `Create an illustration representing "2D Game Development" for a kids' game design course.
Show a colorful 2D platformer scene: a pixel art character mid-jump over platforms,
coins floating in the air, a patrolling enemy below, parallax mountain background.
The scene should look like it's being built — some platforms are solid, others are wireframe/blueprint,
showing the "under construction" nature of game development.
Style: vibrant pixel art with a modern touch. Square format.
Colors: bright and cheerful — green platforms, blue sky, red enemies, gold coins.`,
  },
  {
    filename: 'week-3d-arc.png',
    prompt: `Create an illustration representing "3D Game Development" for a kids' game design course.
Show a first-person perspective looking into a 3D environment: textured walls forming corridors,
a glowing key floating ahead, atmospheric lighting creating depth and shadows.
The scene should look like it's being built — some walls have textures, others show the 3D wireframe mesh,
some objects have visible coordinate axes (X/Y/Z arrows).
Style: clean 3D rendering with a stylized/low-poly aesthetic, not photorealistic. Square format.
Colors: deep blues and purples for atmosphere, with warm orange/golden lighting and green accent elements.`,
  },
  {
    filename: 'worksheet-pixel-art-header.png',
    prompt: `Create a header illustration for a "Pixel Art Design" worksheet for kids learning game design.
Show a large 16x16 pixel grid with a cute character being drawn on it — half completed,
with a pixel-art pencil/cursor filling in the remaining squares.
Scattered around: classic pixel art examples (a heart, a star, a mushroom, a sword) at various scales.
Include a C64/retro computer in the corner as a nod to pixel art history.
Style: clean, educational, colorful pixel art. Wide format.
Colors: white background with colorful pixel elements, purple accents.`,
  },
  {
    filename: 'worksheet-level-design-header.png',
    prompt: `Create a header illustration for a "Level Design" worksheet for kids learning game design.
Show a top-down blueprint/map of a game level being designed:
graph paper with hand-drawn platforms, enemy patrol paths (dotted arrows),
a start point marked "S", an exit marked "E", hazards marked with X,
and collectibles drawn as small circles.
A pencil and ruler sit on the paper. Sticky notes with "teach mechanic here" and "rest point" annotations.
Style: clean, sketch-like, educational. Wide format.
Colors: blueprint blue grid lines on white, with red and green annotations, purple accents.`,
  },
];

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  console.log(`Generating ${IMAGES.length} images...\n`);

  for (const img of IMAGES) {
    await generateImage(img.prompt, img.filename);
    // Small delay to be polite to the API
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\nDone! Images saved to site/static/img/');
}

main().catch(console.error);
