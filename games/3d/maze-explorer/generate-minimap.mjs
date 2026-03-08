#!/usr/bin/env node

/**
 * Generate minimap assets from level.json:
 *   - minimap.png:      white wall lines with circular alpha vignette
 *   - minimap_ring.png: thin circular border ring
 *   - minimap_dot.png:  player position indicator
 */

import { createCanvas } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const levelPath = process.argv[2] || join(__dirname, 'level.json');
const level = JSON.parse(readFileSync(levelPath, 'utf8'));

const { grid } = level;
const rows = grid.length;
const cols = grid[0].length;

// ─── Configuration ───────────────────────────────────────────────────────

const PX_PER_CELL = 8;       // pixels per grid cell on the map image
const MINIMAP_RADIUS = 90;   // visible circle radius in screen pixels
// Note: feathered circular clipping is done at runtime via Pixi.js mask

// Padding: enough so the circle viewport is always filled at map edges
const MAP_PADDING = MINIMAP_RADIUS + 20;

// ─── Generate minimap.png ────────────────────────────────────────────────
// Transparent background with walls, floor fills, and a circular alpha
// vignette centered on the image. Content fades to fully transparent
// beyond ~radius pixels from image center.

const mapW = cols * PX_PER_CELL + MAP_PADDING * 2;
const mapH = rows * PX_PER_CELL + MAP_PADDING * 2;
const mapCanvas = createCanvas(mapW, mapH);
const ctx = mapCanvas.getContext('2d');

// Start fully transparent — no dark background

function isWall(r, c) {
  return r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '#';
}

// Draw open floor areas as very subtle dark fill
ctx.fillStyle = 'rgba(20, 20, 40, 0.5)';
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    if (grid[r][c] === '#') continue;
    const ox = MAP_PADDING + c * PX_PER_CELL;
    const oy = MAP_PADDING + r * PX_PER_CELL;
    ctx.fillRect(ox, oy, PX_PER_CELL, PX_PER_CELL);
  }
}

// Draw walls as white lines
ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
ctx.lineWidth = 1.5;
ctx.lineCap = 'round';

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    if (grid[r][c] === '#') continue;
    const ox = MAP_PADDING + c * PX_PER_CELL;
    const oy = MAP_PADDING + r * PX_PER_CELL;

    if (isWall(r - 1, c)) { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + PX_PER_CELL, oy); ctx.stroke(); }
    if (isWall(r + 1, c)) { ctx.beginPath(); ctx.moveTo(ox, oy + PX_PER_CELL); ctx.lineTo(ox + PX_PER_CELL, oy + PX_PER_CELL); ctx.stroke(); }
    if (isWall(r, c - 1)) { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + PX_PER_CELL); ctx.stroke(); }
    if (isWall(r, c + 1)) { ctx.beginPath(); ctx.moveTo(ox + PX_PER_CELL, oy); ctx.lineTo(ox + PX_PER_CELL, oy + PX_PER_CELL); ctx.stroke(); }
  }
}

const mapPng = mapCanvas.toBuffer('image/png');
writeFileSync(join(__dirname, 'minimap.png'), mapPng);
console.log(`  Generated: minimap.png (${mapW}x${mapH}, ${mapPng.length} bytes)`);

// ─── Generate minimap_ring.png ───────────────────────────────────────────
// Small image with just a circular border ring, fully transparent otherwise.

const ringSize = (MINIMAP_RADIUS + 10) * 2;
const ringCanvas = createCanvas(ringSize, ringSize);
const rctx = ringCanvas.getContext('2d');
const rcx = ringSize / 2;
const rcy = ringSize / 2;

// Subtle white border ring
rctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
rctx.lineWidth = 1.5;
rctx.beginPath();
rctx.arc(rcx, rcy, MINIMAP_RADIUS - 1, 0, Math.PI * 2);
rctx.stroke();

// Inner subtle glow ring
rctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
rctx.lineWidth = 3;
rctx.beginPath();
rctx.arc(rcx, rcy, MINIMAP_RADIUS - 4, 0, Math.PI * 2);
rctx.stroke();

const ringPng = ringCanvas.toBuffer('image/png');
writeFileSync(join(__dirname, 'minimap_ring.png'), ringPng);
console.log(`  Generated: minimap_ring.png (${ringSize}x${ringSize}, ${ringPng.length} bytes)`);

// ─── Generate minimap_dot.png ────────────────────────────────────────────

const dotSize = 16;
const dotCanvas = createCanvas(dotSize, dotSize);
const dctx = dotCanvas.getContext('2d');

dctx.fillStyle = '#44ff88';
dctx.beginPath();
dctx.moveTo(dotSize / 2, 2);
dctx.lineTo(dotSize - 3, dotSize - 3);
dctx.lineTo(3, dotSize - 3);
dctx.closePath();
dctx.fill();

dctx.strokeStyle = '#ffffff';
dctx.lineWidth = 1;
dctx.stroke();

const dotPng = dotCanvas.toBuffer('image/png');
writeFileSync(join(__dirname, 'minimap_dot.png'), dotPng);
console.log(`  Generated: minimap_dot.png (${dotSize}x${dotSize}, ${dotPng.length} bytes)`);

// ─── Export constants for compile-level.mjs ──────────────────────────────

const minimapConfig = {
  mapWidth: mapW,
  mapHeight: mapH,
  padding: MAP_PADDING,
  pxPerCell: PX_PER_CELL,
  ringSize: ringSize,
  minimapRadius: MINIMAP_RADIUS,
  dotSize: dotSize,
};
writeFileSync(join(__dirname, 'minimap-config.json'), JSON.stringify(minimapConfig, null, 2));
console.log('  Generated: minimap-config.json');
