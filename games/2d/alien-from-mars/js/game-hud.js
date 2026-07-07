// The Alien from Mars — in-canvas HUD, title + game-over screens, #sprites grid.

import { K, PAL } from './shared.js';
import { G } from './game-core.js';
import { drawText, drawTextCentered, drawTextShadow, textWidth } from './game-font.js';
import { drawSprite } from './game-sprites.js';
import { drawBackground } from './background.js';

const HEART = ['.#.#.', '#####', '#####', '.###.', '..#..'];
const STAR = ['..#..', '.###.', '#####', '.###.', '#.#.#'];

function drawBitmap(ctx, rows, x, y, color, s) {
  ctx.fillStyle = color;
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < rows[r].length; c++)
      if (rows[r][c] === '#') ctx.fillRect(x + c * s, y + r * s, s, s);
}

const MUT_ICON = { steak: 'S', drumstick: 'D', cloudsheep: 'C', karatepig: 'K' };

export function drawHUD(ctx) {
  // hearts top-left
  const p = G.player;
  for (let i = 0; i < p.maxhp; i++) {
    drawBitmap(ctx, HEART, 6 + i * 8, 6, PAL.outline, 1);
    drawBitmap(ctx, HEART, 6 + i * 8, 5, i < p.hp ? PAL.red : PAL.metal4, 1);
  }
  // score top-center
  const sc = 'CHAOS ' + G.score;
  drawTextShadow(ctx, sc, K.W / 2 - textWidth(sc, 1) / 2, 5, 1, PAL.ui);
  if (G.combo > 1 && G.comboTimer > 0) {
    const ct = '×' + G.combo;
    const col = G.combo >= 6 ? PAL.fire1 : G.combo >= 4 ? PAL.fire2 : PAL.beam;
    drawTextShadow(ctx, ct, K.W / 2 - textWidth(ct, 2) / 2, 14, 2, col);
  }
  // wanted stars top-right
  const label = 'WANTED';
  drawTextShadow(ctx, label, K.W - 6 - textWidth(label, 1), 5, 1, PAL.ui);
  for (let i = 0; i < 3; i++) {
    const x = K.W - 6 - 6 * 3 + i * 6;
    drawBitmap(ctx, STAR, x, 13, PAL.outline, 1);
    drawBitmap(ctx, STAR, x, 12, i < G.wanted ? PAL.horizon : PAL.metal4, 1);
  }
  // jet warning arrow
  if (G.wantArrow > 0 && ((G.frame >> 2) & 1)) {
    const side = G.wantArrowSide || 1;
    const ax = side < 0 ? 6 : K.W - 12;
    drawBitmap(ctx, side < 0 ? ['..#', '.##', '###', '.##', '..#'] : ['#..', '##.', '###', '##.', '#..'], ax, K.H / 2 - 6, PAL.red, 2);
    drawTextCentered(ctx, 'JET', K.W / 2, K.H / 2 - 40, 1, PAL.red, PAL.outline);
  }
  // mutant roster chips (bottom)
  const n = G.mutants.length;
  const cw = 22, total = n * cw;
  let x0 = Math.round(K.W / 2 - total / 2);
  for (let i = 0; i < n; i++) {
    const mu = G.mutants[i];
    const bx = x0 + i * cw, by = K.H - 12;
    const eng = mu.stage >= K.MUTANT_MAX_STAGE;
    const pulse = eng && ((G.frame >> 2) & 1);
    ctx.fillStyle = PAL.outline; ctx.fillRect(bx, by, cw - 2, 10);
    ctx.fillStyle = pulse ? PAL.fire3 : PAL.dusk1; ctx.fillRect(bx + 1, by + 1, cw - 4, 8);
    drawText(ctx, MUT_ICON[mu.kind] || '?', bx + 2, by + 2, 1, pulse ? PAL.fire1 : PAL.ui);
    // size pips
    for (let s = 0; s < mu.stage; s++) { ctx.fillStyle = s >= 4 ? PAL.fire2 : PAL.beam; ctx.fillRect(bx + 8 + s * 2, by + 6, 1, 2); }
  }
  if (G.calm) drawText(ctx, 'CALM', 6, K.H - 12, 1, PAL.glow);
}

// ---- title ---------------------------------------------------------------
export function drawTitle(ctx, t, reg) {
  const camX = t * 26;
  drawBackground(ctx, camX, K.W, K.H, t);
  // simple scrolling ground
  ctx.fillStyle = PAL.grass2;
  for (let sx = 0; sx < K.W; sx++) {
    const gy = Math.round(G.world.groundY(camX + sx));
    ctx.fillRect(sx, gy, 1, 3);
    ctx.fillStyle = PAL.grass3; ctx.fillRect(sx, gy + 3, 1, K.H - gy); ctx.fillStyle = PAL.grass2;
  }
  // bobbing saucer
  const bob = Math.sin(t * 2) * 4;
  drawSprite(ctx, reg, 'player_ufo', K.W / 2, 96 + bob, { t });
  // beam tease
  ctx.save(); ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 6); ctx.fillStyle = PAL.beam;
  ctx.beginPath(); ctx.moveTo(K.W / 2 - 4, 100 + bob); ctx.lineTo(K.W / 2 + 4, 100 + bob);
  ctx.lineTo(K.W / 2 + 18, 150); ctx.lineTo(K.W / 2 - 18, 150); ctx.closePath(); ctx.fill(); ctx.restore();

  // logotype
  drawTextCentered(ctx, 'THE ALIEN', K.W / 2, 26, 4, PAL.beam, PAL.outline);
  drawTextCentered(ctx, 'FROM MARS', K.W / 2, 62, 4, PAL.horizon, PAL.outline);

  // control hints
  drawTextCentered(ctx, 'ARROWS FLY  SPACE SHOOT  A ABDUCT', K.W / 2, 176, 1, PAL.ui, PAL.outline);
  drawTextCentered(ctx, 'ABDUCT ANIMALS  MUTATE THEM  MAKE CHAOS', K.W / 2, 188, 1, PAL.cloud2, PAL.outline);
  if ((G.frame >> 4) & 1)
    drawTextCentered(ctx, 'PRESS START / TAP TO PLAY', K.W / 2, 214, 2, PAL.fire1, PAL.outline);
  if (G.best > 0) drawTextCentered(ctx, 'BEST ' + G.best, K.W / 2, 244, 1, PAL.ui, PAL.outline);
}

// ---- game over -----------------------------------------------------------
export function drawGameOver(ctx) {
  ctx.fillStyle = 'rgba(11,8,23,0.72)'; ctx.fillRect(0, 0, K.W, K.H);
  drawTextCentered(ctx, 'GAME OVER', K.W / 2, 40, 4, PAL.red, PAL.outline);
  drawTextCentered(ctx, 'YOUR CHAOS: ' + G.score, K.W / 2, 96, 2, PAL.fire1, PAL.outline);
  drawTextCentered(ctx, 'BEST: ' + G.best, K.W / 2, 118, 1, PAL.ui, PAL.outline);
  drawTextCentered(ctx, 'MUTANTS CREATED: ' + G.mutantsCreated, K.W / 2, 134, 1, PAL.beam, PAL.outline);
  const dist = Math.max(0, Math.round(G.distance));
  drawTextCentered(ctx, 'DISTANCE: ' + dist + ' M', K.W / 2, 148, 1, PAL.cloud2, PAL.outline);
  if ((G.frame >> 4) & 1)
    drawTextCentered(ctx, 'ANY KEY / TAP TO PLAY AGAIN', K.W / 2, 200, 1, PAL.horizon, PAL.outline);
}

// ---- #sprites debug grid -------------------------------------------------
export function drawSpriteGrid(ctx, reg, t, scroll) {
  ctx.fillStyle = '#0b0817'; ctx.fillRect(0, 0, K.W, K.H);
  drawText(ctx, 'SPRITE REVIEW  SCROLL WITH UP/DOWN', 6, 4, 1, PAL.ui);
  const names = Object.keys(reg);
  const cell = 56, cols = Math.floor((K.W - 8) / cell);
  const zoom = 3;
  let ix = 4, iy = 16 - scroll;
  for (let i = 0; i < names.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cxp = 4 + col * cell + cell / 2;
    const cyp = 16 + row * cell + cell / 2 - scroll;
    if (cyp < -cell || cyp > K.H + cell) continue;
    ctx.fillStyle = ((row + col) & 1) ? '#161028' : '#1d1533';
    ctx.fillRect(4 + col * cell, 16 + row * cell - scroll, cell - 2, cell - 2);
    const sp = reg[names[i]];
    const nf = sp.frames.length;
    const fi = Math.floor(t * (sp.fps || 4)) % nf;
    const img = sp.frames[fi];
    ctx.imageSmoothingEnabled = false;
    const dw = img.width * zoom, dh = img.height * zoom;
    ctx.drawImage(img, 0, 0, img.width, img.height, Math.round(cxp - sp.ax * zoom), Math.round(cyp - sp.ay * zoom + 6), dw, dh);
    // anchor cross
    ctx.fillStyle = PAL.zap2; ctx.fillRect(Math.round(cxp), Math.round(cyp + 6), 1, 1);
    drawTextCentered(ctx, names[i].toUpperCase().slice(0, 9), cxp, 16 + row * cell + cell - 12 - scroll, 1, PAL.ui, PAL.outline);
  }
}

export function spriteGridHeight(reg) {
  const cols = Math.floor((K.W - 8) / 56);
  const rows = Math.ceil(Object.keys(reg).length / cols);
  return 16 + rows * 56;
}
