#!/usr/bin/env node

/**
 * Generate a 3D game prop from a text description.
 *
 * Pipeline:
 *   1. Generate a reference image using Gemini (text → PNG)
 *   2. Convert to 3D model using TRELLIS.2 on RunPod (PNG → GLB)
 *   3. Optionally copy into a game directory
 *
 * Usage:
 *   node generate-prop.mjs --prompt "a rusty iron barrel" --output barrel.glb
 *   node generate-prop.mjs --prompt "a wooden treasure chest" --output ../3d/maze-explorer/chest.glb --game maze-explorer
 *
 * Environment:
 *   GOOGLE_GEMINI_API_KEY  - Gemini API key (or in .env)
 *   RUNPOD_API_KEY         - RunPod API key (or in .env)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env ──────────────────────────────────────────────────────────

function loadEnv() {
  for (const dir of [__dirname, join(__dirname, '..', '..')]) {
    const envFile = join(dir, '.env');
    if (existsSync(envFile)) {
      for (const line of readFileSync(envFile, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...rest] = trimmed.split('=');
          const value = rest.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  }
}

// ─── Parse args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    prompt: null,
    output: null,
    imageOnly: false,
    imageOutput: null,     // save intermediate image
    skipImage: null,       // use existing image instead of generating
    resolution: 1024,
    faces: 100000,
    textureSize: 2048,
    game: null,            // game name (e.g., "maze-explorer") — auto-registers resource
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--prompt': opts.prompt = args[++i]; break;
      case '--output': opts.output = args[++i]; break;
      case '--image-only': opts.imageOnly = true; break;
      case '--image-output': opts.imageOutput = args[++i]; break;
      case '--skip-image':
      case '--image': opts.skipImage = args[++i]; break;
      case '--resolution': opts.resolution = parseInt(args[++i]); break;
      case '--faces': opts.faces = parseInt(args[++i]); break;
      case '--texture-size': opts.textureSize = parseInt(args[++i]); break;
      case '--game': opts.game = args[++i]; break;
      case '--help':
        console.log(`
Generate a 3D game prop from a text description.

Usage:
  node generate-prop.mjs --prompt "DESCRIPTION" --output NAME.glb [options]

Steps:
  1. Generates a reference image with Gemini (text → PNG)
  2. Converts to 3D with TRELLIS.2 on RunPod (PNG → GLB)

Options:
  --prompt TEXT        Description of the object to generate
  --output PATH        Output GLB file path
  --image-only         Only generate the image, skip 3D conversion
  --image-output PATH  Save the generated image to this path
  --image PATH         Skip image generation, use this existing image
  --resolution N       TRELLIS.2 voxel resolution: 512, 1024, 1536 (default: 1024)
  --faces N            Target face count (default: 100000)
  --texture-size N     Texture resolution (default: 2048)
  --game NAME          Game name — copies GLB and registers in game.json

Environment:
  GOOGLE_GEMINI_API_KEY   Gemini API key
  RUNPOD_API_KEY          RunPod API key
`);
        process.exit(0);
    }
  }
  return opts;
}

// ─── Gemini Image Generation ────────────────────────────────────────────

async function generateImage(prompt) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_GEMINI_API_KEY not set (check .env)');
    process.exit(1);
  }

  // Wrap the user's prompt with game-asset-specific instructions
  const fullPrompt = [
    'Generate an image of a single 3D game prop/asset:',
    prompt,
    '',
    'Requirements:',
    '- Single object centered in frame, no background (plain white or transparent)',
    '- Clean, well-lit studio lighting from multiple angles',
    '- Realistic proportions suitable for a 3D game environment',
    '- No text, labels, or watermarks',
    '- No ground plane or shadows on the background',
    '- Object should fill most of the frame',
  ].join('\n');

  console.log('Generating image with Gemini...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      console.log(`  Image generated (${(buffer.length / 1024).toFixed(0)} KB)`);
      return buffer;
    }
  }

  // Log text parts for debugging
  const textParts = parts.filter(p => p.text).map(p => p.text).join('\n');
  if (textParts) console.error('  Gemini response text:', textParts);
  throw new Error('Gemini did not return an image');
}

// ─── TRELLIS.2 (RunPod) ────────────────────────────────────────────────

function getTrellisUrl() {
  // Try to get URL from runpod-trellis.py state
  const stateFile = join(__dirname, '.runpod-state.json');
  if (existsSync(stateFile)) {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    if (state.url) return state.url;
  }

  // Try to get from running pod
  try {
    const result = execSync('python3 runpod-trellis.py status 2>/dev/null', {
      cwd: __dirname, encoding: 'utf8', timeout: 15000,
    });
    const urlMatch = result.match(/URL: (https:\/\/[^\s]+)/);
    if (urlMatch) return urlMatch[1];
  } catch { /* ignore */ }

  return null;
}

async function convertToGlb(imageBuffer, opts) {
  const url = getTrellisUrl();
  if (!url) {
    console.error('Error: No TRELLIS.2 server found. Run: python3 runpod-trellis.py start && python3 runpod-trellis.py setup');
    process.exit(1);
  }

  // Health check
  console.log(`Connecting to TRELLIS.2 at ${url}...`);
  try {
    const healthRes = await fetch(`${url}/health`, { signal: AbortSignal.timeout(10000) });
    if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}`);
    const health = await healthRes.json();
    console.log(`  Server: ${health.gpu} (${health.vram_gb}GB VRAM)`);
  } catch (e) {
    console.error(`Error: TRELLIS.2 server not responding at ${url}`);
    console.error(`  Start it with: cd games/trellis && python3 runpod-trellis.py start`);
    console.error(`  Then set up: python3 runpod-trellis.py setup`);
    process.exit(1);
  }

  // Generate
  console.log(`Converting to 3D (resolution=${opts.resolution}, faces=${opts.faces})...`);
  console.log('  This may take 10-60 seconds...');

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'input.png');
  formData.append('resolution', opts.resolution.toString());
  formData.append('faces', opts.faces.toString());
  formData.append('texture_size', opts.textureSize.toString());

  const res = await fetch(`${url}/generate`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(300000), // 5 min timeout
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(`TRELLIS.2 error: ${err.error}`);
  }

  const glb = Buffer.from(await res.arrayBuffer());
  console.log(`  3D model generated (${(glb.length / 1024).toFixed(1)} KB)`);
  return glb;
}

// ─── Game Integration ───────────────────────────────────────────────────

function registerInGame(gameName, glbFilename) {
  // Find the game directory
  const gamesDir = join(__dirname, '..');
  let gameDir = null;
  for (const sub of ['2d', '3d']) {
    const candidate = join(gamesDir, sub, gameName);
    if (existsSync(candidate)) {
      gameDir = candidate;
      break;
    }
  }
  if (!gameDir) {
    console.warn(`  Warning: Game "${gameName}" not found, skipping registration`);
    return;
  }

  const gameJsonPath = join(gameDir, 'game.json');
  if (!existsSync(gameJsonPath)) {
    console.warn(`  Warning: ${gameJsonPath} not found, skipping registration`);
    return;
  }

  const game = JSON.parse(readFileSync(gameJsonPath, 'utf8'));
  const resources = game.resources?.resources || [];

  // Check if already registered
  if (resources.some(r => r.name === glbFilename)) {
    console.log(`  Resource "${glbFilename}" already registered in game.json`);
    return;
  }

  // Add as model3D resource
  resources.push({
    file: glbFilename,
    kind: 'model3D',
    name: glbFilename,
    userAdded: true,
  });
  game.resources.resources = resources;

  writeFileSync(gameJsonPath, JSON.stringify(game, null, 2));
  console.log(`  Registered "${glbFilename}" in ${gameJsonPath}`);
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  const opts = parseArgs();

  if (!opts.prompt && !opts.skipImage) {
    console.error('Error: --prompt or --image is required');
    process.exit(1);
  }

  if (!opts.output && !opts.imageOnly) {
    console.error('Error: --output is required (e.g., --output barrel.glb)');
    process.exit(1);
  }

  console.log('=== 3D Prop Generator ===');
  if (opts.prompt) console.log(`  Prompt: ${opts.prompt}`);
  if (opts.skipImage) console.log(`  Image: ${opts.skipImage}`);
  console.log(`  Output: ${opts.output || '(image only)'}`);
  console.log();

  // Step 1: Get image
  let imageBuffer;
  if (opts.skipImage) {
    if (!existsSync(opts.skipImage)) {
      console.error(`Error: Image not found: ${opts.skipImage}`);
      process.exit(1);
    }
    imageBuffer = readFileSync(opts.skipImage);
    console.log(`Using existing image: ${opts.skipImage} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
  } else {
    imageBuffer = await generateImage(opts.prompt);
  }

  // Save intermediate image if requested
  if (opts.imageOutput) {
    writeFileSync(opts.imageOutput, imageBuffer);
    console.log(`  Saved image: ${opts.imageOutput}`);
  }

  if (opts.imageOnly) {
    if (!opts.imageOutput) {
      const imgPath = (opts.output || 'prop').replace(/\.glb$/, '') + '.png';
      writeFileSync(imgPath, imageBuffer);
      console.log(`Saved: ${imgPath}`);
    }
    return;
  }

  // Step 2: Convert to 3D
  console.log();
  const glbBuffer = await convertToGlb(imageBuffer, opts);

  // Step 3: Save
  writeFileSync(opts.output, glbBuffer);
  console.log(`\nSaved: ${opts.output} (${(glbBuffer.length / 1024).toFixed(1)} KB)`);

  // Step 4: Register in game if requested
  if (opts.game) {
    const glbFilename = basename(opts.output);
    registerInGame(opts.game, glbFilename);
  }
}

main().catch(err => {
  console.error(`\nError: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
