// The Alien from Mars — world streaming, destructible props, wild animals, lava pools.

import { K, PAL } from './shared.js';
import { propHp } from './game-world.js';
import { audio } from './audio.js';
import {
  G, damageEntity, killEntity, addScore, addHeat, giblets, smoke, sparks,
  dirtKick, spawnParticle,
} from './game-core.js';
import { drawSprite, drawShadow } from './game-sprites.js';

const CULL = K.CHUNK_W * 2.5; // freeze radius

// footprint width (shadow), flammability, and ruin transform per prop type
const PROP_META = {
  tree1: { w: 15, fl: true, ruin: 'tree_burnt', h: 30 },
  tree2: { w: 12, fl: true, ruin: 'tree_burnt', h: 26 },
  rock1: { w: 14, fl: false, ruin: 'crater', h: 9 },
  rock2: { w: 10, fl: false, ruin: 'crater', h: 7 },
  hut: { w: 26, fl: true, ruin: 'hut_ruin', h: 26 },
  barn: { w: 40, fl: true, ruin: 'barn_ruin', h: 34 },
  windmill: { w: 18, fl: true, ruin: 'crater', h: 42 },
  silo: { w: 14, fl: true, ruin: 'crater', h: 34 },
  hay: { w: 12, fl: true, ruin: 'gone', h: 9 },
  fence: { w: 16, fl: false, ruin: 'gone', h: 10 },
  tree_burnt: { w: 14, fl: false, ruin: 'crater', h: 26 },
};

function makeProp(type, x, y) {
  const m = PROP_META[type];
  const hp = propHp(type);
  const p = {
    cls: 'prop', type, x, y, hp, maxhp: hp, flash: 0, dead: false, remove: false,
    ruin: false, targetable: true, burning: 0, w: m.w, h: m.h,
    animT: Math.random() * 6, flammable: m.fl,
  };
  p._customDie = (killer) => destroyProp(p);
  return p;
}

export function igniteProp(p) {
  if (!p || p.dead || p.ruin || !p.flammable || p.burning > 0) return;
  p.burning = 2.0;
}

function destroyProp(p) {
  const m = PROP_META[p.type];
  addScore(10, p.x, p.y - p.h * 0.5);
  addHeat(3);
  smoke(p.x, p.y - p.h * 0.4, 6, false);
  dirtKick(p.x, p.y, 6);
  for (let i = 0; i < 6; i++) spawnParticle(p.x + (Math.random() * p.w - p.w / 2), p.y - Math.random() * p.h,
    Math.random() * 60 - 30, -40 - Math.random() * 40, 0.5, 2, 'gib',
    p.type === 'rock1' || p.type === 'rock2' ? PAL.metal3 : PAL.wood2, 1, 0.02);
  const dest = m.ruin;
  if (dest === 'gone') { p.remove = true; return; }
  const nm = PROP_META[dest] || PROP_META.crater || { w: 22, h: 6 };
  p.type = dest;
  p.ruin = true; p.targetable = false; p.flammable = false; p.burning = 0;
  p.hp = Infinity; p.flash = 0; p.w = nm.w || 22; p.h = nm.h || 6;
}
// crater meta (flat scorch)
PROP_META.crater = { w: 22, fl: false, ruin: 'crater', h: 6 };

// ---- wild animals --------------------------------------------------------
const ANIMAL_META = {
  cow: { w: 22, h: 15, hp: 14, spd: 14, sfx: 'moo', spr: 'cow' },
  chicken: { w: 10, h: 11, hp: 6, spd: 20, sfx: 'cluck', spr: 'chicken' },
  sheep: { w: 17, h: 13, hp: 10, spd: 15, sfx: 'baa', spr: 'sheep' },
  pig: { w: 17, h: 12, hp: 10, spd: 16, sfx: 'oink', spr: 'pig' },
  goat: { w: 18, h: 15, hp: 12, spd: 18, sfx: 'bleat', spr: 'goat' },
  duck: { w: 14, h: 12, hp: 7, spd: 22, sfx: 'quack', spr: 'duck' },
  horse: { w: 26, h: 18, hp: 20, spd: 28, sfx: 'neigh', spr: 'horse' },
  pink_horse: { w: 26, h: 18, hp: 30, spd: 32, sfx: 'neigh', spr: 'pink_horse' },
};
export { ANIMAL_META };

function makeAnimal(type, x, y) {
  const m = ANIMAL_META[type];
  const a = {
    cls: 'animal', type, x, y, vx: 0, hp: m.hp, maxhp: m.hp, flash: 0, dead: false,
    dir: Math.random() < 0.5 ? 1 : -1, w: m.w, h: m.h, spd: m.spd, spr: m.spr,
    animT: Math.random() * 3, wander: Math.random() * 2, noise: Math.random() * 6 + 2,
    flee: 0, beamed: false, targetable: true,
  };
  a._onDeath = () => giblets(a.x, a.y - a.h * 0.4, a.type, 6 + (Math.random() * 4 | 0));
  return a;
}
export { makeAnimal, makeProp };

// ---- chunk streaming -----------------------------------------------------
export function initWorldModel() {
  G.loadedChunks = new Map();
  G.props.length = 0; G.animals.length = 0; G.lavaPools.length = 0;
}

export function ensureChunk(ci) {
  if (G.loadedChunks.has(ci)) return;
  G.loadedChunks.set(ci, true);
  const layout = G.world.chunkLayout(ci);
  for (let i = 0; i < layout.spawns.length; i++) {
    const s = layout.spawns[i];
    const y = G.world.groundY(s.x);
    if (s.cls === 'prop') G.props.push(makeProp(s.type, s.x, y));
    else G.animals.push(makeAnimal(s.type, s.x, y));
  }
}

export function streamChunks() {
  const pc = Math.floor(G.player.x / K.CHUNK_W);
  for (let ci = pc - 3; ci <= pc + 3; ci++) ensureChunk(ci);
}

// ---- terrain surface -----------------------------------------------------
// grass ramp + dirt column fill with deterministic flower/pebble texture.
function texHash(xi) {
  let h = (xi * 374761393 + 668265263) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
export function drawTerrain(ctx) {
  const cx = G.camX, cy = G.camY;
  const bottom = K.H;
  for (let sx = 0; sx < K.W; sx++) {
    const wx = cx + sx;
    const gy = Math.round(G.world.groundY(wx) - cy);
    if (gy >= bottom) continue;
    // grass band
    ctx.fillStyle = PAL.grass1; ctx.fillRect(sx, gy, 1, 2);
    ctx.fillStyle = PAL.grass2; ctx.fillRect(sx, gy + 2, 1, 3);
    ctx.fillStyle = PAL.grass3; ctx.fillRect(sx, gy + 5, 1, 3);
    // dirt below
    const dirtTop = gy + 8;
    if (dirtTop < bottom) {
      ctx.fillStyle = PAL.dirt1; ctx.fillRect(sx, dirtTop, 1, 4);
      ctx.fillStyle = PAL.dirt2; ctx.fillRect(sx, dirtTop + 4, 1, 6);
      ctx.fillStyle = PAL.dirt3; ctx.fillRect(sx, dirtTop + 10, 1, bottom - (dirtTop + 10));
    }
    // texture specks
    const h = texHash(wx);
    if ((h & 31) === 0) { ctx.fillStyle = PAL.horizon; ctx.fillRect(sx, gy - 1, 1, 1); } // flower dot
    else if ((h & 63) === 5) { ctx.fillStyle = PAL.grass1; ctx.fillRect(sx, gy - 1, 1, 1); }
    if (((h >> 5) & 15) === 0) { ctx.fillStyle = PAL.dirt3; ctx.fillRect(sx, dirtTop + 3 + ((h >> 9) & 7), 1, 1); }
  }
}

// nearest threat (mutant, fire, lava) for animal flee
function nearestThreatX(x, y) {
  let best = 1e9, bx = 0, found = false;
  for (let i = 0; i < G.mutants.length; i++) {
    const mu = G.mutants[i];
    const d = Math.abs(mu.x - x);
    if (d < 90 && d < best) { best = d; bx = mu.x; found = true; }
  }
  for (let i = 0; i < G.lavaPools.length; i++) {
    const lp = G.lavaPools[i];
    const d = Math.abs(lp.x - x);
    if (d < 70 && d < best) { best = d; bx = lp.x; found = true; }
  }
  return found ? bx : null;
}

// ---- updates -------------------------------------------------------------
export function updateProps(dt) {
  const cx = G.player.x;
  for (let i = G.props.length - 1; i >= 0; i--) {
    const p = G.props[i];
    if (p.remove) { G.props.splice(i, 1); continue; }
    if (p.flash > 0) p.flash -= dt;
    if (Math.abs(p.x - cx) > CULL) continue;
    p.animT += dt;
    if (p.burning > 0) {
      p.burning -= dt;
      if (Math.random() < dt * 22) spawnParticle(p.x + (Math.random() * p.w - p.w / 2), p.y - Math.random() * p.h * 0.8,
        Math.random() * 8 - 4, -20 - Math.random() * 30, 0.5 + Math.random() * 0.4, 2, 'ember', PAL.fire2, -0.05, 0.02);
      if (Math.random() < dt * 8) smoke(p.x, p.y - p.h * 0.6, 1, false);
      if (p.burning <= 0 && !p.ruin) destroyProp(p);
    }
  }
}

export function updateAnimals(dt) {
  const cx = G.player.x;
  for (let i = G.animals.length - 1; i >= 0; i--) {
    const a = G.animals[i];
    if (a.dead) { G.animals.splice(i, 1); continue; }
    if (a.beamed) continue; // controlled by abduction
    if (a.flash > 0) a.flash -= dt;
    if (Math.abs(a.x - cx) > CULL) continue;

    const threatX = nearestThreatX(a.x, a.y);
    if (threatX != null) {
      a.flee = 1.2;
      a.dir = a.x < threatX ? -1 : 1;
    } else if (a.flee > 0) a.flee -= dt;

    a.wander -= dt;
    if (a.wander <= 0) {
      a.wander = 1 + Math.random() * 2.5;
      if (a.flee <= 0 && Math.random() < 0.4) a.vx = 0; // graze pause
      else a.dir = Math.random() < 0.5 ? -1 : 1;
    }
    const target = a.flee > 0 ? a.spd * 1.6 : (a.vx === 0 && a.wander > 1.5 ? 0 : a.spd * 0.5);
    a.vx += (a.dir * target - a.vx) * Math.min(1, dt * 4);
    a.x += a.vx * dt;
    a.y = G.world.groundY(a.x);
    a.animT += dt * (Math.abs(a.vx) > 3 ? 1 : 0.4);

    a.noise -= dt;
    if (a.noise <= 0) {
      a.noise = 3 + Math.random() * 5;
      if (Math.abs(a.x - cx) < 240 && Math.random() < 0.6) audio.play(ANIMAL_META[a.type].sfx, { vol: 0.5, pitch: 0.9 + Math.random() * 0.3 });
    }
  }
}

// ---- lava pools ----------------------------------------------------------
export function updateLava(dt) {
  for (let i = G.lavaPools.length - 1; i >= 0; i--) {
    const lp = G.lavaPools[i];
    lp.life -= dt;
    if (lp.r < lp.grow) lp.r += dt * 12;
    lp.tick -= dt;
    if (Math.random() < dt * 6) spawnParticle(lp.x + (Math.random() * lp.r * 2 - lp.r), lp.y - 2,
      Math.random() * 8 - 4, -14 - Math.random() * 18, 0.5, 2, 'ember', PAL.lava2, -0.05, 0.02);
    if (lp.life <= 0) G.lavaPools.splice(i, 1);
  }
}

// lava damages everything overlapping (called each fixed step from main)
export function lavaDamage(dt) {
  for (let i = 0; i < G.lavaPools.length; i++) {
    const lp = G.lavaPools[i];
    lp.tick -= dt;
    if (lp.tick > 0) continue;
    lp.tick = 0.4;
    const r = lp.r + 6;
    // props
    for (let j = 0; j < G.props.length; j++) { const p = G.props[j]; if (p.targetable && Math.abs(p.x - lp.x) < r && Math.abs(p.y - lp.y) < 20) { if (p.flammable) igniteProp(p); else damageEntity(p, 10, null); } }
    hurtGroupInRadius(G.animals, lp.x, lp.y, r, 12, null);
    hurtGroupInRadius(G.soldiers, lp.x, lp.y, r, 20, null);
    hurtGroupInRadius(G.tanks, lp.x, lp.y, r, 12, null);
    hurtGroupInRadius(G.mutants, lp.x, lp.y, r, 14, null);
  }
}

function hurtGroupInRadius(arr, x, y, r, dmg, killer) {
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (e.dead) continue;
    if (Math.abs(e.x - x) < r && Math.abs(e.y - y) < 26) damageEntity(e, dmg, killer);
  }
}
export { hurtGroupInRadius };

// ---- draw ----------------------------------------------------------------
export function drawLavaBelow(ctx) {
  const cx = G.camX, cy = G.camY;
  for (let i = 0; i < G.lavaPools.length; i++) {
    const lp = G.lavaPools[i];
    const sx = Math.round(lp.x - cx), sy = Math.round(lp.y - cy);
    if (sx < -40 || sx > K.W + 40) continue;
    const f = lp.life / lp.max;
    ctx.fillStyle = PAL.lava4;
    ctx.fillRect(sx - lp.r - 1, sy - 2, lp.r * 2 + 2, 4);
    ctx.fillStyle = f > 0.3 ? PAL.lava3 : PAL.lava4;
    ctx.fillRect(sx - lp.r, sy - 2, lp.r * 2, 3);
    if (f > 0.2) { ctx.fillStyle = PAL.lava2; ctx.fillRect(sx - lp.r + 1, sy - 2, lp.r * 2 - 2, 1); }
    if (f > 0.5 && ((G.frame + i) & 3) === 0) { ctx.fillStyle = PAL.lava1; ctx.fillRect(sx - 1 + ((Math.random() * lp.r * 2 - lp.r) | 0), sy - 2, 1, 1); }
  }
}

export function drawProps(ctx, layer) {
  const cx = G.camX, cy = G.camY;
  const reg = G.reg;
  for (let i = 0; i < G.props.length; i++) {
    const p = G.props[i];
    const sx = p.x - cx;
    if (sx < -60 || sx > K.W + 60) continue;
    const flat = p.type === 'crater';
    if (layer === 'flat' && !flat) continue;
    if (layer === 'up' && flat) continue;
    if (flat) { drawSprite(ctx, reg, 'crater', sx, p.y - cy, null); continue; }
    if (!p.ruin) drawShadow(ctx, sx, p.y - cy, p.w, 0.4);
    let name = p.type;
    let o = { t: p.animT, flash: p.flash > 0 ? 0.7 : 0 };
    if (p.type === 'windmill') o.frame = ((p.animT * 1.4) | 0) % 2;
    drawSprite(ctx, reg, name, sx, p.y - cy, o);
    if (p.burning > 0) { ctx.fillStyle = PAL.fire2; }
    if (!p.ruin && p.hp < p.maxhp) drawHpPip(ctx, sx, p.y - cy - p.h - 3, p.hp / p.maxhp);
  }
}

export function drawAnimals(ctx) {
  const cx = G.camX, cy = G.camY;
  const reg = G.reg;
  for (let i = 0; i < G.animals.length; i++) {
    const a = G.animals[i];
    if (a.beamed) continue;
    const sx = a.x - cx;
    if (sx < -40 || sx > K.W + 40) continue;
    drawShadow(ctx, sx, a.y - cy, a.w, 0.4);
    drawSprite(ctx, reg, a.spr, sx, a.y - cy, {
      t: a.animT, flip: a.dir < 0, flash: a.flash > 0 ? 0.7 : 0,
      frame: Math.abs(a.vx) > 3 ? undefined : 0,
    });
    if (a.hp < a.maxhp) drawHpPip(ctx, sx, a.y - cy - a.h - 3, a.hp / a.maxhp);
  }
}

export function drawHpPip(ctx, sx, sy, frac) {
  const w = 12;
  ctx.fillStyle = PAL.outline; ctx.fillRect(Math.round(sx - w / 2) - 1, Math.round(sy) - 1, w + 2, 3);
  ctx.fillStyle = PAL.dirt2; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), w, 1);
  ctx.fillStyle = frac > 0.5 ? PAL.beam : (frac > 0.25 ? PAL.fire2 : PAL.red);
  ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), Math.max(0, Math.round(w * frac)), 1);
}
