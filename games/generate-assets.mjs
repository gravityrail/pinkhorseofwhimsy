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
`, palette, 4, 6);
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
`, palette, 5, 8);
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

  // Wall texture: 64x64 stone bricks
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, 64, 64);
    // Brick pattern
    ctx.fillStyle = '#4b5563';
    // Horizontal mortar
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
    // Highlights and shadows for depth
    ctx.fillStyle = '#9ca3af';
    for (const [x, y] of [[2,2],[34,2],[18,18],[50,18],[2,34],[34,34],[18,50],[50,50]]) {
      ctx.fillRect(x, y, 10, 1);
    }
    ctx.fillStyle = '#374151';
    for (const [x, y] of [[5,14],[20,30],[40,14],[55,30],[5,46],[20,62],[40,46],[55,62]]) {
      ctx.fillRect(x, y, 8, 1);
    }
    await saveCanvas(c, join(base, 'wall.png'));
  }

  // Floor: 64x64 flagstone
  {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 0, 64, 64);
    // Flagstone pattern
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, 64, 1); ctx.fillRect(0, 31, 64, 2); ctx.fillRect(0, 63, 64, 1);
    ctx.fillRect(0, 0, 1, 64); ctx.fillRect(31, 0, 2, 64); ctx.fillRect(63, 0, 1, 64);
    // Subtle variation
    ctx.fillStyle = '#6b7280';
    for (const [x, y] of [[4,4],[36,8],[12,36],[44,40]]) {
      ctx.fillRect(x, y, 3, 3);
    }
    await saveCanvas(c, join(base, 'floor.png'));
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

  console.log('  maze-explorer: 4 assets');
}

async function main() {
  console.log('Generating real pixel art assets...\n');
  await generateCoinCollectorAssets();
  await generatePlatformRunnerAssets();
  await generateMazeExplorerAssets();
  console.log('\nDone! 12 assets generated.');
}

main().catch(console.error);
