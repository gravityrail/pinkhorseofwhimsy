// The Alien from Mars — core entry. Fixed-timestep loop, input, camera, player,
// state machine, and render orchestration over the parallel modules.

import { K, PAL } from './shared.js';
import { makeWorld, mulberry32 } from './game-world.js';
import { audio } from './audio.js';
import { drawBackground } from './background.js';
import { buildRegistry, drawSprite, drawShadow } from './game-sprites.js';
import {
  G, resetPools, popups, spawnParticle, spawnBolt, shake, hurtPlayer,
  updateParticles, drawParticles, updateShake, updatePopups,
} from './game-core.js';
import { drawText, drawTextCentered } from './game-font.js';
import {
  initWorldModel, streamChunks, updateAnimals, updateProps, updateLava,
  lavaDamage, drawTerrain, drawProps, drawAnimals, drawLavaBelow,
} from './game-entities.js';
import {
  updateAbduction, updateMutants, drawMutants, drawBeam, drawZaps,
} from './game-mutants.js';
import {
  updateWanted, updateArmySpawns, updateSoldiers, updateTanks, updateJets,
  updateUfos, updateProjectiles, drawArmy, drawProjectiles,
} from './game-army.js';
import { drawHUD, drawTitle, drawGameOver, drawSpriteGrid, spriteGridHeight } from './game-hud.js';

// ---- canvas + buffer -----------------------------------------------------
const display = document.getElementById('game');
const dctx = display.getContext('2d');
const buffer = document.createElement('canvas');
buffer.width = K.W; buffer.height = K.H;
const ctx = buffer.getContext('2d');
ctx.imageSmoothingEnabled = false;
dctx.imageSmoothingEnabled = false;

let scale = 1, offX = 0, offY = 0;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  display.width = w; display.height = h;
  scale = Math.max(1, Math.floor(Math.min(w / K.W, h / K.H)));
  offX = Math.floor((w - K.W * scale) / 2);
  offY = Math.floor((h - K.H * scale) / 2);
  dctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);

// ---- input ---------------------------------------------------------------
const keys = Object.create(null);
function keyName(e) {
  let k = e.key;
  if (k === ' ' || e.code === 'Space') return ' ';
  if (k === 'ArrowUp' || e.code === 'ArrowUp') return 'ArrowUp';
  if (k === 'ArrowDown' || e.code === 'ArrowDown') return 'ArrowDown';
  if (k === 'ArrowLeft' || e.code === 'ArrowLeft') return 'ArrowLeft';
  if (k === 'ArrowRight' || e.code === 'ArrowRight') return 'ArrowRight';
  if (k === 'Enter' || e.code === 'Enter') return 'Enter';
  if (k === 'a' || k === 'A' || e.code === 'KeyA') return 'a';
  return k;
}
let firstGesture = false;
function ensureAudio() {
  if (!firstGesture) { firstGesture = true; audio.init(); audio.startMusic(); audio.setWanted(G.wanted || 0); }
}

window.addEventListener('keydown', (e) => {
  const k = keyName(e);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
  ensureAudio();
  if (!keys[k]) {
    // last cardinal pressed => facing
    if (k === 'ArrowLeft') G.player && (G.player.facing = 'W');
    else if (k === 'ArrowRight') G.player && (G.player.facing = 'E');
    else if (k === 'ArrowUp') G.player && (G.player.facing = 'N');
    else if (k === 'ArrowDown') G.player && (G.player.facing = 'S');
  }
  keys[k] = true;
  if (G.state === 'over') tryStart();
  else if (G.state === 'title' && (k === 'Enter' || k === ' ')) tryStart();
}, { passive: false });

window.addEventListener('keyup', (e) => { keys[keyName(e)] = false; });

function pointerStart() { ensureAudio(); tryStart(); }
display.addEventListener('pointerdown', pointerStart);
window.addEventListener('touchstart', () => ensureAudio(), { passive: true });

function tryStart() {
  if (G.state === 'title' || G.state === 'over') newGame(((Math.random() * 0xffffffff) >>> 0));
}

// ---- new game ------------------------------------------------------------
function newGame(seed) {
  G.seed = seed >>> 0;
  G.world = makeWorld(G.seed);
  G.rng = mulberry32((G.seed ^ 0x9e3779b1) >>> 0);
  resetPools();
  G.props = []; G.animals = []; G.mutants = [];
  G.soldiers = []; G.tanks = []; G.jets = []; G.ufos = [];
  G.bolts = []; G.shells = []; G.zaps = []; G.lavaPools = [];
  initWorldModel();
  G.score = 0; G.combo = 1; G.comboTimer = 0; G.heat = 0; G.wanted = 0;
  G.mutantsCreated = 0; G.time = 0; G.distance = 0; G.startX = 0;
  G.spawnTimerInf = 3; G.spawnTimerTank = 8; G.spawnTimerJet = 10;
  G.nextUfoAt = 45; G.pendingJet = null; G.wantArrow = 0;
  G.shakeMag = 0; G.beamAnim = 0;
  G.player = {
    cls: 'player', x: 0, y: 110, vx: 0, vy: 0, hp: 5, maxhp: 5, iframe: 0,
    facing: 'E', shootCd: 0, tilt: 0, flash: 0, dead: false, beam: false,
    abductee: null, w: 26, h: 15,
  };
  G.camX = -K.W / 2; G.camY = 0; G.camLead = 0;
  G.onPlayerDeath = onPlayerDeath;
  streamChunks();
  audio.setWanted(0);
  G.state = 'play';
}

function onPlayerDeath() {
  if (G.best < G.score) { G.best = G.score; try { localStorage.setItem('afm_best', String(G.best)); } catch (e) {} }
  G.state = 'over';
  audio.stopBeam();
  audio.setWanted(0);
  audio.play('game_over');
  shake(10);
}

// ---- player update -------------------------------------------------------
const MAX_SPD = 150, ACCEL = 620, DRAG = 2.6;
function updatePlayer(dt) {
  const p = G.player;
  if (p.iframe > 0) p.iframe -= dt;
  if (p.flash > 0) p.flash -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;
  if (p.dead) return;

  let ax = 0, ay = 0;
  if (keys['ArrowLeft']) ax -= 1;
  if (keys['ArrowRight']) ax += 1;
  if (keys['ArrowUp']) ay -= 1;
  if (keys['ArrowDown']) ay += 1;
  p.vx += ax * ACCEL * dt;
  p.vy += ay * ACCEL * dt;
  const fr = Math.pow(1 / (1 + DRAG), dt * 6);
  if (ax === 0) p.vx *= fr;
  if (ay === 0) p.vy *= fr;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > MAX_SPD) { p.vx *= MAX_SPD / sp; p.vy *= MAX_SPD / sp; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  // tilt on strafe
  p.tilt += ((p.vx / MAX_SPD) * 0.28 - p.tilt) * Math.min(1, dt * 8);

  // altitude clamp
  const gy = G.world.groundY(p.x);
  const top = 26, bot = gy - 30;
  if (p.y < top) { p.y = top; if (p.vy < 0) p.vy = 0; }
  if (p.y > bot) { p.y = bot; if (p.vy > 0) p.vy = 0; }

  // shoot
  if (keys[' '] && p.shootCd <= 0) {
    p.shootCd = 0.18;
    let bvx = 0, bvy = 0; const s = 280;
    if (p.facing === 'W') bvx = -s; else if (p.facing === 'E') bvx = s;
    else if (p.facing === 'N') bvy = -s; else bvy = s;
    const mx = p.x + Math.sign(bvx) * 12, my = p.y + Math.sign(bvy) * 6;
    spawnBolt(mx, my, bvx, bvy, true, 6);
    audio.play('shoot', { vol: 0.5 });
    for (let i = 0; i < 3; i++) spawnParticle(mx, my, bvx * 0.1 + (Math.random() * 20 - 10), bvy * 0.1 + (Math.random() * 20 - 10), 0.12, 1, 'spark', PAL.beam, 0, 0.05);
  }
  p.beam = !!(keys['a']);

  // distance in "meters"
  G.distance = Math.max(G.distance, Math.abs(p.x - G.startX) / 10);

  // lava underfoot
  for (let i = 0; i < G.lavaPools.length; i++) {
    const lp = G.lavaPools[i];
    if (Math.abs(lp.x - p.x) < lp.r + 8 && p.y > lp.y - 18) { hurtPlayer(1); break; }
  }
}

function updateCamera(dt) {
  const p = G.player;
  const dir = p.facing === 'W' ? -1 : p.facing === 'E' ? 1 : 0;
  G.camLead += (dir * 60 - G.camLead) * Math.min(1, dt * 3);
  const tx = p.x - K.W / 2 + G.camLead;
  G.camX += (tx - G.camX) * Math.min(1, dt * 8);
  G.camY = 0;
}

// ---- step ----------------------------------------------------------------
function step(dt) {
  G.time += dt;
  updatePlayer(dt);
  streamChunks();
  updateAbduction(dt);
  updateMutants(dt);
  updateAnimals(dt);
  updateProps(dt);
  updateLava(dt);
  lavaDamage(dt);
  updateWanted(dt);
  updateArmySpawns(dt);
  updateSoldiers(dt);
  updateTanks(dt);
  updateJets(dt);
  updateUfos(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  updatePopups(dt);
  updateShake(dt);
  if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) G.combo = 1; }
  updateCamera(dt);
}

// ---- player draw ---------------------------------------------------------
function drawPlayer() {
  const p = G.player;
  if (p.dead) return;
  if (p.iframe > 0 && ((G.frame >> 1) & 1)) return; // blink
  const gy = G.world.groundY(p.x);
  drawShadow(ctx, p.x - G.camX, gy - G.camY, 24, 0.3 + Math.max(0, 0.2 * (1 - (gy - p.y) / 120)));
  drawSprite(ctx, G.reg, 'player_ufo', p.x - G.camX, p.y - G.camY, {
    t: G.time, rot: p.tilt, flash: p.flash > 0 ? 0.7 : 0,
  });
}

function drawPopups() {
  for (let i = 0; i < popups.length; i++) {
    const q = popups[i];
    if (!q.active) continue;
    const sx = Math.round(q.x - G.camX), sy = Math.round(q.y - G.camY);
    if (sx < -40 || sx > K.W + 40) continue;
    const a = Math.min(1, q.life / 0.4);
    ctx.globalAlpha = a;
    drawTextCentered(ctx, q.text, sx, sy, q.scale >= 1.2 ? 2 : 1, q.col, PAL.outline);
    ctx.globalAlpha = 1;
  }
}

// ---- render --------------------------------------------------------------
function render() {
  ctx.imageSmoothingEnabled = false;
  if (debugSprites) {
    drawSpriteGrid(ctx, G.reg, performance.now() / 1000, spriteScroll);
    blit();
    return;
  }
  if (G.state === 'title') { drawTitle(ctx, performance.now() / 1000, G.reg); blit(); return; }

  drawBackground(ctx, G.camX, K.W, K.H, G.time);
  drawTerrain(ctx);
  drawProps(ctx, 'flat');
  drawLavaBelow(ctx);
  drawProps(ctx, 'up');
  drawAnimals(ctx);
  drawArmy(ctx);
  drawMutants(ctx);
  drawBeam(ctx);
  drawPlayer();
  drawProjectiles(ctx);
  drawZaps(ctx, lastDt);
  drawParticles(ctx);
  drawPopups();
  drawHUD(ctx);
  if (G.state === 'over') drawGameOver(ctx);
  blit();
}

function blit() {
  dctx.fillStyle = '#0b0817';
  dctx.fillRect(0, 0, display.width, display.height);
  const sx = Math.round(G.shakeX) * (G.state === 'play' ? 1 : 0);
  const sy = Math.round(G.shakeY) * (G.state === 'play' ? 1 : 0);
  dctx.drawImage(buffer, 0, 0, K.W, K.H, offX + sx, offY + sy, K.W * scale, K.H * scale);
}

// ---- debug modes ---------------------------------------------------------
let debugSprites = location.hash.indexOf('sprites') >= 0;
let spriteScroll = 0;
G.calm = location.hash.indexOf('calm') >= 0;
window.addEventListener('hashchange', () => {
  debugSprites = location.hash.indexOf('sprites') >= 0;
  G.calm = location.hash.indexOf('calm') >= 0;
});
window.addEventListener('keydown', (e) => {
  if (!debugSprites) return;
  const max = Math.max(0, spriteGridHeight(G.reg) - K.H + 20);
  if (e.key === 'ArrowDown') spriteScroll = Math.min(max, spriteScroll + 24);
  if (e.key === 'ArrowUp') spriteScroll = Math.max(0, spriteScroll - 24);
});

// ---- main loop -----------------------------------------------------------
const STEP = 1 / 60;
let acc = 0, last = 0, lastDt = STEP;
function frame(now) {
  const t = now / 1000;
  let dt = t - last; last = t;
  if (dt > 0.1) dt = 0.1;
  lastDt = STEP;
  if (G.state === 'play') {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) { step(STEP); acc -= STEP; }
    if (guard >= 5) acc = 0;
  }
  G.frame++;
  render();
  requestAnimationFrame(frame);
}

// ---- boot ----------------------------------------------------------------
function boot() {
  G.reg = buildRegistry();
  try { G.best = parseInt(localStorage.getItem('afm_best') || '0', 10) || 0; } catch (e) { G.best = 0; }
  G.world = makeWorld(0xC0FFEE);       // for title scroll
  G.player = { x: 0, y: 110, facing: 'E' }; // placeholder for title camera math
  G.camX = -K.W / 2; G.camY = 0;
  G.state = 'title';
  resize();
  requestAnimationFrame(frame);
}
boot();
