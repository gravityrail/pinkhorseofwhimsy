// The Alien from Mars — shared mutable game state + core services.
// Particle/popup pools, screen shake, scoring/combo, and the generic damage system.
// Other game-*.js modules import this hub and mutate G. Pools are fixed-size (no
// per-frame allocation in the hot loop).

import { K, PAL } from './shared.js';
import { makeWorld, mulberry32 } from './game-world.js';
import { audio } from './audio.js';

export const G = {
  world: null,
  seed: 0,
  rng: Math.random,
  state: 'title',        // 'title' | 'play' | 'over'
  time: 0,               // gameplay seconds (fixed-step)
  frame: 0,
  calm: false,           // #calm debug: no army / rival UFO spawns

  camX: 0, camY: 0, camLead: 0,
  shakeMag: 0, shakeX: 0, shakeY: 0,

  player: null,
  props: [], animals: [], mutants: [],
  soldiers: [], tanks: [], jets: [], ufos: [],
  bolts: [],             // player + enemy energy bolts
  shells: [],            // tank arcing shells
  zaps: [],              // cloudsheep lightning visuals
  fires: [],             // active fire-breath cones (steak)
  lavaPools: [],

  loadedChunks: null,    // Map<ci, chunkState>
  minChunk: 0, maxChunk: 0,

  score: 0, best: 0, combo: 1, comboTimer: 0,
  mutantsCreated: 0, startX: 0, distance: 0,

  wanted: 0, heat: 0,
  wantArrow: 0,          // jet warning arrow timer
  spawnTimerInf: 0, spawnTimerTank: 0, spawnTimerJet: 0, spawnTimerUfo: 0,
  nextUfoAt: 0,
  gameOverTimer: 0,
};

// ---- pools ---------------------------------------------------------------
const P_MAX = 520;
export const particles = new Array(P_MAX);
for (let i = 0; i < P_MAX; i++) particles[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, kind: 'dust', col: '#fff', grav: 0, drag: 0 };
let pHead = 0;

const POP_MAX = 48;
export const popups = new Array(POP_MAX);
for (let i = 0; i < POP_MAX; i++) popups[i] = { active: false, x: 0, y: 0, vy: 0, life: 0, max: 1, text: '', col: '#fff', scale: 1 };
let popHead = 0;

export function resetPools() {
  for (let i = 0; i < P_MAX; i++) particles[i].active = false;
  for (let i = 0; i < POP_MAX; i++) popups[i].active = false;
  pHead = 0; popHead = 0;
}

function acquireParticle() {
  for (let n = 0; n < P_MAX; n++) {
    const i = (pHead + n) % P_MAX;
    if (!particles[i].active) { pHead = (i + 1) % P_MAX; return particles[i]; }
  }
  const p = particles[pHead]; pHead = (pHead + 1) % P_MAX; return p; // steal oldest
}

export function spawnParticle(x, y, vx, vy, life, size, kind, col, grav, drag) {
  const p = acquireParticle();
  p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.life = life; p.max = life; p.size = size; p.kind = kind;
  p.col = col || '#fff'; p.grav = grav || 0; p.drag = drag || 0;
  return p;
}

export function popup(x, y, text, col, scale) {
  const p = popups[popHead]; popHead = (popHead + 1) % POP_MAX;
  p.active = true; p.x = x; p.y = y; p.vy = -18; p.life = 1.1; p.max = 1.1;
  p.text = text; p.col = col || PAL.ui; p.scale = scale || 1;
}

// ---- screen shake --------------------------------------------------------
export function shake(mag) { if (mag > G.shakeMag) G.shakeMag = Math.min(mag, 14); }

export function updateShake(dt) {
  G.shakeMag *= Math.pow(0.0025, dt); // fast decay
  if (G.shakeMag < 0.2) G.shakeMag = 0;
  const m = G.shakeMag;
  G.shakeX = (G.rng() * 2 - 1) * m;
  G.shakeY = (G.rng() * 2 - 1) * m;
}

// ---- scoring / combo -----------------------------------------------------
export function addScore(base, x, y, label, col) {
  const pts = Math.round(base * G.combo);
  G.score += pts;
  G.combo = Math.min(8, G.combo + 1);
  G.comboTimer = 2.5;
  const txt = label || ('+' + pts);
  popup(x, y, txt, col || PAL.ui, label ? 1 : 1);
  return pts;
}

// ---- heat / wanted -------------------------------------------------------
export function addHeat(amount) {
  G.heat = Math.min(100, G.heat + amount);
}

// ---- generic damage / death ---------------------------------------------
// living classes advance the killer mutant's growth.
const KILL = {
  prop: { score: 10, living: false },
  animal: { score: 25, living: true },
  soldier: { score: 50, living: true },
  tank: { score: 150, living: true },
  jet: { score: 200, living: true },
  ufo: { score: 300, living: true },
  mutant: { score: 0, living: true },
};

export function damageEntity(e, dmg, killer) {
  if (!e || e.dead || (e.invuln && e.invuln > 0)) return;
  e.hp -= dmg;
  e.flash = 0.14;
  e.wasHit = true;
  if (e.hp <= 0) {
    if (e._customDie) e._customDie(killer);
    else killEntity(e, killer);
  }
}

export function killEntity(e, killer) {
  if (e.dead) return;
  e.dead = true;
  const info = KILL[e.cls] || KILL.prop;
  if (info.score > 0) {
    addScore(info.score, e.x, e.y - (e.h ? e.h * 0.5 : 10));
  }
  addHeat(e.cls === 'prop' ? 3 : e.cls === 'tank' ? 14 : e.cls === 'jet' ? 12 : e.cls === 'ufo' ? 10 : 6);
  if (info.living && killer && killer !== e && killer._grow) killer._grow();
  if (e._onDeath) e._onDeath(killer);
}

// giblet bursts (no gore — cartoon chunks/puffs)
const GIB = {
  cow: [PAL.white, PAL.pinkskin, PAL.meat1], sheep: [PAL.wool, PAL.cloud2],
  pig: [PAL.pinkskin, PAL.pinkshade], chicken: [PAL.white, PAL.fire2],
  meat: [PAL.meat1, PAL.meat2, PAL.crust], wool: [PAL.wool, PAL.cloud1],
  feather: [PAL.white, PAL.cloud2], army: [PAL.army1, PAL.army2, PAL.red],
  metal: [PAL.metal2, PAL.metal3, PAL.fire2], dust: [PAL.dirt1, PAL.dirt2],
};

export function giblets(x, y, kind, count) {
  const cols = GIB[kind] || GIB.dust;
  for (let i = 0; i < count; i++) {
    const a = G.rng() * Math.PI * 2;
    const sp = 30 + G.rng() * 90;
    spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.5 + G.rng() * 0.5,
      1 + Math.floor(G.rng() * 2), 'gib', cols[(G.rng() * cols.length) | 0], 1, 0.02);
  }
  // purple poof
  for (let i = 0; i < 4; i++) {
    spawnParticle(x + (G.rng() * 8 - 4), y - G.rng() * 6, G.rng() * 12 - 6, -10 - G.rng() * 14,
      0.4 + G.rng() * 0.3, 3 + Math.floor(G.rng() * 3), 'poof', PAL.dusk2, -0.1, 0);
  }
}

export function smoke(x, y, n, hot) {
  for (let i = 0; i < n; i++) {
    spawnParticle(x + (G.rng() * 6 - 3), y, G.rng() * 10 - 5, -14 - G.rng() * 16,
      0.6 + G.rng() * 0.6, 2 + Math.floor(G.rng() * 3), hot ? 'ember' : 'smoke',
      hot ? PAL.fire2 : PAL.dusk2, -0.05, 0.02);
  }
}

export function sparks(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = G.rng() * Math.PI * 2, sp = 40 + G.rng() * 120;
    spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.2 + G.rng() * 0.25,
      1, 'spark', col || PAL.fire1, 0.4, 0.01);
  }
}

export function dirtKick(x, y, n) {
  for (let i = 0; i < n; i++) {
    spawnParticle(x + (G.rng() * 10 - 5), y, G.rng() * 30 - 15, -20 - G.rng() * 30,
      0.35 + G.rng() * 0.3, 1 + Math.floor(G.rng() * 2), 'gib',
      G.rng() < 0.5 ? PAL.dirt1 : PAL.dirt2, 1, 0.01);
  }
}

// ---- particles update / draw --------------------------------------------
export function updateParticles(dt) {
  for (let i = 0; i < P_MAX; i++) {
    const p = particles[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.vy += p.grav * K.GRAVITY * dt;
    if (p.drag) { const f = Math.pow(1 - p.drag, dt * 60); p.vx *= f; p.vy *= f; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    // lava globs splat into pools when they hit ground
    if (p.kind === 'lavaglob') {
      const gy = G.world.groundY(p.x);
      if (p.y >= gy) {
        p.active = false;
        addLavaPool(p.x, gy);
      }
    }
  }
}

const FIRE_RAMP = [PAL.fire1, PAL.fire2, PAL.fire3, PAL.fire4];
const LAVA_RAMP = [PAL.lava1, PAL.lava2, PAL.lava3, PAL.lava4];

export function drawParticles(ctx) {
  const cx = G.camX, cy = G.camY;
  for (let i = 0; i < P_MAX; i++) {
    const p = particles[i];
    if (!p.active) continue;
    const sx = Math.round(p.x - cx), sy = Math.round(p.y - cy);
    if (sx < -8 || sx > K.W + 8 || sy < -8 || sy > K.H + 8) continue;
    let col = p.col;
    const f = 1 - p.life / p.max;
    if (p.kind === 'ember' || p.kind === 'fire') col = FIRE_RAMP[Math.min(3, (f * 4) | 0)];
    else if (p.kind === 'lavaglob' || p.kind === 'lava') col = LAVA_RAMP[Math.min(3, (f * 4) | 0)];
    else if (p.kind === 'spark') col = f < 0.5 ? PAL.fire1 : PAL.fire2;
    else if (p.kind === 'smoke' || p.kind === 'poof') {
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.7;
    }
    ctx.fillStyle = col;
    const s = p.size;
    ctx.fillRect(sx - (s >> 1), sy - (s >> 1), s, s);
    if (p.kind === 'lavaglob') { // glowing trail
      ctx.fillStyle = PAL.lava1;
      ctx.fillRect(sx, sy - 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

export function updatePopups(dt) {
  for (let i = 0; i < POP_MAX; i++) {
    const p = popups[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.y += p.vy * dt; p.vy *= Math.pow(0.02, dt);
  }
}

// ---- lava pools ----------------------------------------------------------
export function addLavaPool(x, y) {
  if (G.lavaPools.length > 60) return;
  G.lavaPools.push({ x, y, r: 5 + G.rng() * 5, grow: 8 + G.rng() * 8, life: 4, max: 4, tick: 0 });
  for (let i = 0; i < 5; i++) spawnParticle(x + (G.rng() * 10 - 5), y, G.rng() * 30 - 15, -30 - G.rng() * 30, 0.5, 2, 'ember', PAL.lava2, 1, 0.02);
  shake(3);
}

export function spawnLavaGlob(x, y, vx, vy) {
  spawnParticle(x, y, vx, vy, 3, 3, 'lavaglob', PAL.lava1, 1, 0);
}

// ---- projectiles ---------------------------------------------------------
export function spawnBolt(x, y, vx, vy, friendly, dmg) {
  G.bolts.push({ x, y, vx, vy, friendly, dmg, life: 1.4 });
}

export function spawnShell(x, y, vx, vy) {
  G.shells.push({ x, y, vx, vy, life: 4 });
}

// ---- player hurt ---------------------------------------------------------
export function hurtPlayer(dmg) {
  const p = G.player;
  if (!p || p.dead || p.iframe > 0) return;
  p.hp -= dmg;
  p.iframe = 1.0;
  p.flash = 0.2;
  shake(6);
  audio.play('player_hurt');
  if (p.hp <= 0) {
    p.hp = 0; p.dead = true;
    smoke(p.x, p.y, 12, true);
    sparks(p.x, p.y, 20, PAL.fire1);
    if (G.onPlayerDeath) G.onPlayerDeath();
  }
}
