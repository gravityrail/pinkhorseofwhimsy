#!/usr/bin/env node

/**
 * Build all GDevelop example games into HTML5 web exports.
 * Output goes to ../site/static/arcade/games/<name>/
 *
 * Usage:
 *   node build-games.mjs              # Build all games
 *   node build-games.mjs --filter 2d  # Build only 2D games
 *   node build-games.mjs --filter 3d  # Build only 3D games
 */

import { readdir, stat, cp, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARCADE_DIR = join(__dirname, '..', 'site', 'static', 'arcade', 'games');

const filter = process.argv.includes('--filter')
  ? process.argv[process.argv.indexOf('--filter') + 1]
  : null;

async function findGames() {
  const games = [];

  for (const category of ['2d', '3d']) {
    if (filter && category !== filter) continue;

    const categoryDir = join(__dirname, category);
    let entries;
    try {
      entries = await readdir(categoryDir);
    } catch {
      continue;
    }

    for (const name of entries) {
      const gameDir = join(categoryDir, name);
      const s = await stat(gameDir);
      if (!s.isDirectory()) continue;

      const gameJson = join(gameDir, 'game.json');
      try {
        await stat(gameJson);
        games.push({ category, name, dir: gameDir, json: gameJson });
      } catch {
        // No game.json, skip
      }
    }
  }

  return games;
}

async function buildGame(game) {
  const outDir = join(ARCADE_DIR, game.name);
  await mkdir(outDir, { recursive: true });

  process.stdout.write(`  Building ${game.category}/${game.name}... `);

  try {
    // Use gdexporter to build the game
    execSync(
      `npx gdexport --project "${game.json}" --out "${outDir}"`,
      { cwd: __dirname, timeout: 120000, stdio: 'pipe' }
    );
    console.log('done (gdexporter)');
    return true;
  } catch (err) {
    // gdexporter may not work in all environments. Fall back to copying
    // the raw JSON + assets so we can at least serve them with a custom loader.
    console.log('gdexporter failed, using fallback HTML wrapper');
    return await buildFallback(game, outDir);
  }
}

async function buildFallback(game, outDir) {
  // Copy all game assets to the output directory
  try {
    await cp(game.dir, outDir, { recursive: true });

    // Read the project JSON to get metadata
    const { readFile, writeFile } = await import('fs/promises');
    const projectData = JSON.parse(await readFile(game.json, 'utf8'));
    const { name, windowWidth, windowHeight, description } = projectData.properties;

    // Create a simple HTML page that explains this is a GDevelop project
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name || game.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      max-width: 600px;
      padding: 2rem;
    }
    h1 { color: #a29bfe; margin-bottom: 1rem; font-size: 2rem; }
    p { color: #ccc; line-height: 1.6; margin-bottom: 1rem; }
    .badge {
      display: inline-block;
      background: #6c5ce7;
      padding: 0.3rem 0.8rem;
      border-radius: 999px;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .info {
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 1rem;
      text-align: left;
    }
    code { background: rgba(255,255,255,0.15); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9rem; }
    a { color: #a29bfe; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${name || game.name}</h1>
    <div class="badge">${game.category.toUpperCase()} Game</div>
    <p>${description || 'A game made with GDevelop for the Grass Valley Game Club.'}</p>
    <div class="info">
      <p><strong>This is a GDevelop project file.</strong></p>
      <p>To play this game:</p>
      <ol style="margin: 0.5rem 0 0 1.5rem; color: #ccc; line-height: 2;">
        <li>Open <a href="https://editor.gdevelop.io/" target="_blank">GDevelop</a></li>
        <li>Click <strong>Open a project</strong></li>
        <li>Load the <code>game.json</code> file</li>
        <li>Click the <strong>Preview</strong> button</li>
      </ol>
      <p style="margin-top: 1rem; font-size: 0.85rem; opacity: 0.7;">
        Resolution: ${windowWidth}x${windowHeight}
      </p>
    </div>
  </div>
</body>
</html>`;

    await writeFile(join(outDir, 'index.html'), html);
    return true;
  } catch (err) {
    console.log(`  FAILED: ${err.message}`);
    return false;
  }
}

async function main() {
  const games = await findGames();
  console.log(`Found ${games.length} game(s) to build${filter ? ` (filter: ${filter})` : ''}:\n`);

  let success = 0;
  for (const game of games) {
    if (await buildGame(game)) success++;
  }

  console.log(`\n${success}/${games.length} games built -> ${ARCADE_DIR}`);
}

main().catch(console.error);
