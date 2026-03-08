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

import { readdir, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { exportProject } from './gdexport/index.mjs';

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

  console.log(`\n  Building ${game.category}/${game.name}...`);

  // Run pre-compilation generators (minimap, props, etc.)
  const levelJson = join(game.dir, 'level.json');
  if (existsSync(levelJson)) {
    for (const script of ['generate-minimap.mjs', 'generate-props.mjs']) {
      const scriptPath = join(game.dir, script);
      if (existsSync(scriptPath)) {
        execFileSync('node', [scriptPath], { stdio: 'inherit' });
      }
    }
  }

  // Run level compiler if level.json exists
  const compileScript = join(game.dir, 'compile-level.mjs');
  if (existsSync(levelJson) && existsSync(compileScript)) {
    console.log('  Compiling level...');
    execFileSync('node', [compileScript], { stdio: 'inherit' });
  }

  try {
    await exportProject(game.json, outDir);
    return true;
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    if (err.stack) console.error(err.stack);
    return false;
  }
}

async function main() {
  const games = await findGames();
  console.log(`Found ${games.length} game(s) to build${filter ? ` (filter: ${filter})` : ''}:`);

  let success = 0;
  for (const game of games) {
    if (await buildGame(game)) success++;
  }

  console.log(`\n${success}/${games.length} games built -> ${ARCADE_DIR}`);
}

main().catch(console.error);
