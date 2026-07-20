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

import { readdir, stat, mkdir, readFile, writeFile, cp, rm, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { exportProject } from './gdexport/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARCADE_DIR = join(__dirname, '..', 'site', 'static', 'arcade', 'games');
const SFX_DIR = join(__dirname, '..', 'site', 'static', 'arcade', 'sfx');

const filter = process.argv.includes('--filter')
  ? process.argv[process.argv.indexOf('--filter') + 1]
  : null;

/** Per-game arcade shell config (splash, music, touch controls). */
const ARCADE_SHELL = {
  'coin-collector': {
    splash: {
      image: '/arcade/splashes/coin-collector.png',
      title: 'COIN COLLECTOR',
      subtitle: 'TAP / PRESS START',
      music: '/arcade/sfx/platform-music.mp3',
      musicLoop: true,
      musicVolume: 0.4,
      credit: 'Pink Horse Arcade',
    },
    controls: {
      buttons: [{ label: 'Jump', keys: ' ' }],
    },
    sfx: ['coin-collect.mp3', 'jump.mp3', 'level-complete.mp3'],
  },
  'platform-runner': {
    splash: {
      image: '/arcade/splashes/platform-runner.png',
      title: 'PLATFORM RUNNER',
      subtitle: 'TAP / PRESS START',
      music: '/arcade/sfx/runner-music.mp3',
      musicLoop: true,
      musicVolume: 0.4,
      credit: 'Pink Horse Arcade',
    },
    controls: {
      buttons: [{ label: 'Jump', keys: ' ' }],
    },
    sfx: ['coin-collect.mp3', 'jump.mp3', 'enemy-stomp.mp3', 'level-complete.mp3'],
  },
  'maze-explorer': {
    splash: {
      image: '/arcade/splashes/maze-explorer.png',
      title: 'MAZE EXPLORER',
      subtitle: 'TAP TO ENTER THE DUNGEON',
      music: '/arcade/sfx/mood-dungeon-theme.mp3',
      musicLoop: true,
      musicVolume: 0.4,
      credit: 'Pink Horse of Whimsy',
    },
    controls: {
      dpad: {
        up: ['ArrowUp', 'w'],
        down: ['ArrowDown', 's'],
        left: ['ArrowLeft', 'a'],
        right: ['ArrowRight', 'd'],
      },
      buttons: [
        { label: 'FIRE', keys: [' ', 'Control'] },
        { label: 'STRAFE L', keys: 'q' },
        { label: 'STRAFE R', keys: 'e' },
        { label: 'RUN', keys: 'Shift' },
      ],
    },
    // Combat JS loads ./sfx/*.mp3 relative to the game folder.
    copyLocalSfxDir: true,
  },
  'alien-from-mars': {
    splash: {
      image: '/arcade/splashes/alien-from-mars.png',
      title: 'THE ALIEN FROM MARS',
      subtitle: 'TAP / PRESS START',
      music: '/arcade/sfx/alien-music.mp3',
      musicLoop: true,
      musicVolume: 0.4,
      credit: 'Pink Horse Arcade',
    },
    // Arrows only on D-pad — WASD must stay unbound because A is abduct.
    controls: {
      dpad: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
      },
      buttons: [
        { label: '⚡', keys: ' ' },
        { label: '🛸', keys: 'a' },
      ],
      start: 'Enter',
    },
  },
};

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
        games.push({ category, name, dir: gameDir, json: gameJson, kind: 'gdevelop' });
        continue;
      } catch {
        // No game.json — maybe a plain web game
      }

      // Plain web games (hand-written HTML5/JS, no GDevelop) ship an index.html
      // and are copied to the arcade verbatim.
      try {
        await stat(join(gameDir, 'index.html'));
        games.push({ category, name, dir: gameDir, kind: 'web' });
      } catch {
        // Neither project type, skip
      }
    }
  }

  return games;
}

async function buildGame(game) {
  const outDir = join(ARCADE_DIR, game.name);

  if (game.kind === 'web') {
    console.log(`\n  Copying web game ${game.category}/${game.name}...`);
    await rm(outDir, { recursive: true, force: true });
    await cp(game.dir, outDir, {
      recursive: true,
      // Docs and dev clutter stay out of the published build.
      filter: (src) => !src.endsWith('.md') && !src.includes('node_modules'),
    });
    await injectArcadeShell(outDir, game.name);
    return true;
  }

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
    // Copy declared SFX into the project folder before export so GDevelop packs them.
    await copyGameSfx(game);
    await exportProject(game.json, outDir);
    await injectArcadeShell(outDir, game.name);
    await copyLocalSfxDir(game, outDir);
    return true;
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    if (err.stack) console.error(err.stack);
    return false;
  }
}

async function copyGameSfx(game) {
  const cfg = ARCADE_SHELL[game.name];
  if (!cfg) return;
  if (cfg.sfx?.length) {
    for (const file of cfg.sfx) {
      const src = join(SFX_DIR, file);
      const dest = join(game.dir, file);
      if (existsSync(src)) {
        await copyFile(src, dest);
      }
    }
  }
}

/** After export, copy games/<cat>/<name>/sfx → outDir/sfx for relative Audio paths. */
async function copyLocalSfxDir(game, outDir) {
  const cfg = ARCADE_SHELL[game.name];
  if (!cfg?.copyLocalSfxDir) return;
  const srcSfx = join(game.dir, 'sfx');
  if (!existsSync(srcSfx)) return;
  const dstSfx = join(outDir, 'sfx');
  await cp(srcSfx, dstSfx, { recursive: true });
  console.log('  + copied local sfx/');
}

// Inject splash screen, bg-music (via splash), and the universal controls shim
// (on-screen touch D-pad + gamepad) into a freshly exported game's index.html.
async function injectArcadeShell(outDir, gameName) {
  const indexPath = join(outDir, 'index.html');
  if (!existsSync(indexPath)) return;
  let html = await readFile(indexPath, 'utf-8');

  // Strip prior injections so rebuilds stay clean.
  html = html
    .replace(/\n?<script>window\.ARCADE_CONTROLS[\s\S]*?<\/script>\n?/g, '\n')
    .replace(/\n?<script>window\.ARCADE_SPLASH[\s\S]*?<\/script>\n?/g, '\n')
    .replace(/\n?<script src="\/arcade\/controls\.js"[^>]*><\/script>\n?/g, '\n')
    .replace(/\n?<script src="\/arcade\/splash\.js"[^>]*><\/script>\n?/g, '\n');

  const cfg = ARCADE_SHELL[gameName] || {};
  const controls = cfg.controls || {};
  const parts = [];

  if (cfg.splash) {
    parts.push(
      `<script>window.ARCADE_SPLASH = ${JSON.stringify(cfg.splash)};</script>`,
      `<script src="/arcade/splash.js"></script>`,
    );
  }

  parts.push(
    `<script>window.ARCADE_CONTROLS = ${JSON.stringify(controls)};</script>`,
    `<script src="/arcade/controls.js" defer></script>`,
  );

  const snippet = '\n' + parts.join('\n') + '\n';
  html = html.includes('</body>')
    ? html.replace('</body>', snippet + '</body>')
    : html + snippet;
  await writeFile(indexPath, html);
  console.log('  + injected arcade shell (splash/controls' + (cfg.splash?.music ? '/music' : '') + ')');
}

// Back-compat alias used by plain web-game path.
async function injectArcadeControls(outDir, gameName) {
  await injectArcadeShell(outDir, gameName);
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
