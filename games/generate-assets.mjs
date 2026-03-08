#!/usr/bin/env node

/**
 * Generate REAL pixel art assets for example games.
 * Uses raw PNG encoding -- actual pixel-level art at true resolutions.
 * No AI generation -- hand-defined pixel data for authentic retro sprites.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Draw pixels from a string map where each character maps to a color
function drawPixelArt(ctx, pixelMap, palette, offsetX = 0, offsetY = 0) {
  const rows = pixelMap.trim().split('\n').map(r => r.trim());
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (palette[ch]) {
        ctx.fillStyle = palette[ch];
        ctx.fillRect(offsetX + x, offsetY + y, 1, 1);
      }
      // '.' = transparent, skip
    });
  });
}

async function saveCanvas(canvas, path) {
  await mkdir(dirname(path), { recursive: true });
  const buf = canvas.toBuffer('image/png');
  await writeFile(path, buf);
}

// ═══════════════════════════════════════
// 2D COIN COLLECTOR ASSETS
// ═══════════════════════════════════════

async function generateCoinCollectorAssets() {
  const base = join(__dirname, '2d/coin-collector');

  // Player: 32x32 pixel art character
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    const palette = {
      'B': '#3b82f6', // blue body
      'b': '#2563eb', // dark blue
      'S': '#fbbf24', // skin
      's': '#d97706', // dark skin
      'H': '#92400e', // hair
      'W': '#ffffff', // white (eyes)
      'K': '#000000', // black (pupils, outline)
      'R': '#ef4444', // red (shoes)
      'r': '#dc2626', // dark red
    };
    drawPixelArt(ctx, `
......HHHHHH..........
.....HHHHHHHH.........
.....HSSWSSSH.........
.....HSKWKSSH.........
.....HSSSSSSH.........
......SsSSsS..........
......SSSSSS..........
.......BBBB...........
......BBBBBB..........
.....BbBBBBbB.........
.....BbBBBBbB.........
....SBbBBBBbBS........
....S.BBBBBB.S........
......BBBBBB..........
......BB..BB..........
......Bb..bB..........
.....RRR..RRR.........
.....RRR..RRR.........
`, palette, 4, 14);
    await saveCanvas(c, join(base, 'player.png'));
  }

  // Coin: 24x24
  {
    const c = createCanvas(24, 24);
    const ctx = c.getContext('2d');
    const palette = {
      'G': '#fbbf24', // gold
      'g': '#d97706', // dark gold
      'Y': '#fef08a', // highlight
      'K': '#92400e', // outline
    };
    drawPixelArt(ctx, `
.......KKKKKK.....
......KGGGGGgK....
.....KGYYGGGGgK...
....KGYYGGGGGGgK..
....KGYGGGGGGGgK..
....KGGGGGGGGGgK..
....KGGGGGGGGGgK..
....KGGGGGGGGGgK..
....KGGGGGGGGGgK..
....KGGGGGGGGGgK..
.....KGGGGGGGgK...
......KGGGGGgK....
.......KKKKKK.....
`, palette, 2, 5);
    await saveCanvas(c, join(base, 'coin.png'));
  }

  // Ground: 32x32 tileable
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    // Grass top
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, 32, 4);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(0, 4, 32, 4);
    // Dirt
    ctx.fillStyle = '#92400e';
    ctx.fillRect(0, 8, 32, 24);
    // Dirt variation
    ctx.fillStyle = '#78350f';
    for (const [x, y] of [[3,12],[15,16],[8,22],[24,14],[20,26],[1,28],[28,20]]) {
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = '#a3541a';
    for (const [x, y] of [[10,10],[22,18],[5,24],[18,28],[30,12]]) {
      ctx.fillRect(x, y, 2, 2);
    }
    await saveCanvas(c, join(base, 'ground.png'));
  }

  // Platform: 32x32 tileable stone
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 32, 32);
    // Brick lines
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 15, 32, 2);
    ctx.fillRect(0, 31, 32, 1);
    ctx.fillRect(15, 0, 2, 16);
    ctx.fillRect(0, 16, 1, 15);
    ctx.fillRect(31, 16, 1, 15);
    // Highlights
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(1, 1, 13, 1);
    ctx.fillRect(18, 1, 13, 1);
    ctx.fillRect(2, 17, 12, 1);
    await saveCanvas(c, join(base, 'platform.png'));
  }

  console.log('  coin-collector: 4 assets');
}

// ═══════════════════════════════════════
// 2D PLATFORM RUNNER ASSETS
// ═══════════════════════════════════════

async function generatePlatformRunnerAssets() {
  const base = join(__dirname, '2d/platform-runner');

  // Runner: 32x32
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    const palette = {
      'R': '#ef4444', // red body
      'r': '#dc2626', // dark red
      'S': '#fbbf24', // skin
      's': '#d97706', // dark skin
      'H': '#1f2937', // hair
      'W': '#ffffff',
      'K': '#000000',
      'G': '#6b7280', // grey shoes
      'g': '#4b5563',
    };
    // Running pose - leaning forward, legs spread
    drawPixelArt(ctx, `
.......HHH............
......HHHHH...........
......HSWWSH..........
......HSKKSSH.........
.......SSSSS..........
.......sSsSs..........
........RRR...........
.......RRRRR..........
......RrRRRrS.........
.......RRRRR..........
........RRR...........
.......RR.RR..........
......RR...RR.........
.....GG.....GG........
.....GG.....GG........
`, palette, 5, 17);
    await saveCanvas(c, join(base, 'runner.png'));
  }

  // Spike: 32x32
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    const palette = {
      'S': '#9ca3af', // silver
      's': '#6b7280', // dark silver
      'W': '#d1d5db', // highlight
      'K': '#374151', // dark
    };
    drawPixelArt(ctx, `
...............K................
..............KWK...............
..............KWK...............
.............KWSK...............
.............KSSK...............
............KWSSK...............
............KSSSK...............
...........KWSSsK...............
...........KSSSsK...............
..........KWSSSsK...............
..........KSSSSsK...............
.........KWSSSSsK...............
.........KSSSSSsK...............
........KWSSSSSsK...............
........KSSSSSSsK...............
.......KWSSSSSSsK...............
.......KSSSSSSSsK...............
......KWSSSSSSSsK...............
......KSSSSSSSSsK...............
.....KWSSSSSSSSsK...............
.....KSSSSSSSSSsK...............
....KWSSSSSSSSSsK...............
....KSSSSSSSSSSsK...............
...KWSSSSSSSSSSSsK..............
...KSSSSSSSSSSSSsK..............
..KWSSSSSSSSSSSSsK..............
..KSSSSSSSSSSSSSsK..............
.KWSSSSSSSSSSSSSsK..............
.KSSSSSSSSSSSSSSsK..............
KWSSSSSSSSSSSSSSssK.............
KSSSSSSSSSSSSSSSssK.............
KKKKKKKKKKKKKKKKKK..............
`, palette, 0, 0);
    await saveCanvas(c, join(base, 'spike.png'));
  }

  // Ground: 32x32 sci-fi tileable
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, 32, 32);
    // Cyan grid lines
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 31, 32, 1);
    ctx.fillRect(0, 0, 1, 32);
    ctx.fillRect(31, 0, 1, 32);
    ctx.fillRect(15, 0, 1, 32);
    ctx.fillRect(0, 15, 32, 1);
    // Darker fill
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(8, 8, 6, 6);
    ctx.fillRect(18, 18, 6, 6);
    await saveCanvas(c, join(base, 'ground.png'));
  }

  // Enemy: 32x32 slime
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    const palette = {
      'P': '#a855f7', // purple
      'p': '#7c3aed', // dark purple
      'D': '#581c87', // darkest
      'W': '#ffffff',
      'K': '#000000',
      'H': '#c084fc', // highlight
    };
    drawPixelArt(ctx, `
.........PPPP.........
........PPPPPP........
.......PHPPPPPP.......
......PHHPPPPPP.......
.....PHPPPPPPPP.......
.....PPPPPPPPPP.......
....PPWWPPPPWWPP......
....PPWKPPPPWKPp......
....PPPPPPPPPPPp......
....PPPPPPPPPPPp......
...PPPPPPPPPPPPPp.....
...PPPPPPPPPPPPPp.....
...PPPPPPPPPPPPPp.....
..PPPPPPPPPPPPPPPp....
..PPPPPPPPPPPPPPPp....
..pppppppppppppppD....
...DDDDDDDDDDDDD.....
`, palette, 4, 8);
    await saveCanvas(c, join(base, 'enemy.png'));
  }

  console.log('  platform-runner: 4 assets');
}

// ═══════════════════════════════════════
// 3D MAZE EXPLORER ASSETS
// ═══════════════════════════════════════

async function generateMazeExplorerAssets() {
  const base = join(__dirname, '3d/maze-explorer');

  // Stone wall: 64x64 dark dungeon bricks
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3d3d4a';
    ctx.fillRect(0, 0, 64, 64);
    // Brick pattern - horizontal mortar lines
    ctx.fillStyle = '#2a2a35';
    for (const y of [0, 16, 32, 48]) {
      ctx.fillRect(0, y, 64, 1);
    }
    // Vertical mortar (offset every other row)
    for (let y = 0; y < 64; y += 32) {
      ctx.fillRect(31, y + 1, 1, 15);
    }
    for (let y = 16; y < 64; y += 32) {
      ctx.fillRect(15, y + 1, 1, 15);
      ctx.fillRect(47, y + 1, 1, 15);
    }
    // Top-edge highlights per brick
    ctx.fillStyle = '#4a4a58';
    for (const [x, y] of [[1,1],[33,1],[17,17],[49,17],[1,33],[33,33],[17,49],[49,49]]) {
      ctx.fillRect(x, y, 12, 1);
    }
    // Bottom-edge shadows per brick
    ctx.fillStyle = '#252530';
    for (const [x, y] of [[1,15],[33,15],[17,31],[49,31],[1,47],[33,47],[17,63],[49,63]]) {
      ctx.fillRect(x, y, 12, 1);
    }
    // Subtle stone variation
    ctx.fillStyle = '#444452';
    for (const [x, y] of [[4,5],[38,10],[20,22],[52,26],[8,38],[42,44],[24,52],[56,58]]) {
      ctx.fillRect(x, y, 2, 2);
    }
    await saveCanvas(c, join(base, 'stone_wall.png'));
  }

  // Stone floor: 64x64 dark flagstone
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2d2d38';
    ctx.fillRect(0, 0, 64, 64);
    // Large flagstone grid
    ctx.fillStyle = '#222230';
    ctx.fillRect(0, 0, 64, 1); ctx.fillRect(0, 31, 64, 2); ctx.fillRect(0, 63, 64, 1);
    ctx.fillRect(0, 0, 1, 64); ctx.fillRect(31, 0, 2, 64); ctx.fillRect(63, 0, 1, 64);
    // Subtle highlight on stone edges
    ctx.fillStyle = '#383848';
    ctx.fillRect(1, 1, 29, 1); ctx.fillRect(33, 1, 29, 1);
    ctx.fillRect(1, 33, 29, 1); ctx.fillRect(33, 33, 29, 1);
    // Dirt/wear variation
    ctx.fillStyle = '#262634';
    for (const [x, y] of [[5,8],[40,12],[14,40],[48,46],[22,18],[56,28]]) {
      ctx.fillRect(x, y, 3, 3);
    }
    await saveCanvas(c, join(base, 'stone_floor.png'));
  }

  // Stone ceiling: 64x64 rough dark stone
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1e1e28';
    ctx.fillRect(0, 0, 64, 64);
    // Rough stone texture - random-ish patches
    ctx.fillStyle = '#252532';
    for (const [x, y, w, h] of [[2,3,8,6],[18,1,10,5],[40,4,12,4],[8,20,6,8],[32,18,10,6],[50,22,8,7],[4,38,9,5],[24,40,7,8],[44,36,10,6],[14,54,8,5],[36,56,6,4],[54,50,6,8]]) {
      ctx.fillRect(x, y, w, h);
    }
    // Darker cracks
    ctx.fillStyle = '#161620';
    for (const [x, y, w, h] of [[12,10,1,8],[30,5,1,12],[50,15,1,6],[6,30,1,10],[42,28,1,8],[22,48,1,6]]) {
      ctx.fillRect(x, y, w, h);
    }
    await saveCanvas(c, join(base, 'stone_ceiling.png'));
  }

  // Metal wall: 64x64 sci-fi panels
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#404858';
    ctx.fillRect(0, 0, 64, 64);
    // Panel borders
    ctx.fillStyle = '#2c3240';
    ctx.fillRect(0, 0, 64, 2); ctx.fillRect(0, 30, 64, 4); ctx.fillRect(0, 62, 64, 2);
    ctx.fillRect(0, 0, 2, 64); ctx.fillRect(30, 0, 4, 64); ctx.fillRect(62, 0, 2, 64);
    // Panel highlights (top/left edges)
    ctx.fillStyle = '#505a6a';
    ctx.fillRect(2, 2, 28, 1); ctx.fillRect(34, 2, 28, 1);
    ctx.fillRect(2, 34, 28, 1); ctx.fillRect(34, 34, 28, 1);
    ctx.fillRect(2, 2, 1, 28); ctx.fillRect(34, 2, 1, 28);
    // Rivet dots
    ctx.fillStyle = '#5a6474';
    for (const [x, y] of [[4,4],[28,4],[36,4],[60,4],[4,28],[28,28],[36,28],[60,28],[4,36],[28,36],[36,36],[60,36],[4,60],[28,60],[36,60],[60,60]]) {
      ctx.fillRect(x, y, 2, 2);
    }
    await saveCanvas(c, join(base, 'metal_wall.png'));
  }

  // Metal floor: 64x64 diamond plate
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#363e4e';
    ctx.fillRect(0, 0, 64, 64);
    // Diamond pattern
    ctx.fillStyle = '#404858';
    for (let y = 0; y < 64; y += 16) {
      for (let x = 0; x < 64; x += 16) {
        // Diamond shape
        ctx.fillRect(x + 6, y + 2, 4, 1);
        ctx.fillRect(x + 5, y + 3, 6, 1);
        ctx.fillRect(x + 4, y + 4, 8, 1);
        ctx.fillRect(x + 5, y + 5, 6, 1);
        ctx.fillRect(x + 6, y + 6, 4, 1);
      }
    }
    // Offset row
    ctx.fillStyle = '#3a4252';
    for (let y = 8; y < 64; y += 16) {
      for (let x = 8; x < 64; x += 16) {
        ctx.fillRect(x + 6, y + 2, 4, 1);
        ctx.fillRect(x + 5, y + 3, 6, 1);
        ctx.fillRect(x + 4, y + 4, 8, 1);
        ctx.fillRect(x + 5, y + 5, 6, 1);
        ctx.fillRect(x + 6, y + 6, 4, 1);
      }
    }
    await saveCanvas(c, join(base, 'metal_floor.png'));
  }

  // Metal ceiling: 64x64 dark industrial panels
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#282e3a';
    ctx.fillRect(0, 0, 64, 64);
    // Grid of ceiling tiles
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, 64, 1); ctx.fillRect(0, 31, 64, 2); ctx.fillRect(0, 63, 64, 1);
    ctx.fillRect(0, 0, 1, 64); ctx.fillRect(31, 0, 2, 64); ctx.fillRect(63, 0, 1, 64);
    // Vent slits
    ctx.fillStyle = '#121820';
    for (const y of [10, 14, 18, 42, 46, 50]) {
      ctx.fillRect(8, y, 16, 1);
      ctx.fillRect(40, y, 16, 1);
    }
    await saveCanvas(c, join(base, 'metal_ceiling.png'));
  }

  // Key: 32x32
  {
    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    const palette = {
      'G': '#fbbf24',
      'g': '#d97706',
      'Y': '#fef08a',
      'K': '#92400e',
    };
    drawPixelArt(ctx, `
.....KKKKK............
....KYYYYgK...........
...KYGGGGGgK..........
...KGGKKGGgK..........
...KGKKKGGgK..........
...KGGKKGGgK..........
...KYGGGGGgK..........
....KgggggK...........
......KgK.............
......KgK.............
......KgK.............
......KgK.............
......KgKKK...........
......KgggK...........
......KKKK............
`, palette, 5, 5);
    await saveCanvas(c, join(base, 'key.png'));
  }

  // Gem: 24x24
  {
    const c = createCanvas(24, 24);
    const ctx = c.getContext('2d');
    const palette = {
      'G': '#22c55e',
      'g': '#15803d',
      'L': '#86efac',
      'D': '#14532d',
      'W': '#ffffff',
    };
    drawPixelArt(ctx, `
........WW............
.......WLLW...........
......WLGGDW..........
.....WLGGGGgW.........
....WLGGGGGGgW........
...WLGGGGGGGGgW.......
...DGGGGGGGGGgD.......
....DgGGGGGGgD........
.....DggGGggD.........
......DggggD..........
.......DDDD...........
`, palette, 2, 6);
    await saveCanvas(c, join(base, 'gem.png'));
  }

  console.log('  maze-explorer: 10 assets');
}

async function main() {
  console.log('Generating real pixel art assets...\n');
  await generateCoinCollectorAssets();
  await generatePlatformRunnerAssets();
  await generateMazeExplorerAssets();
  console.log('\nDone! 18 assets generated.');
}

main().catch(console.error);
