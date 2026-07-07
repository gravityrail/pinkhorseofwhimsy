// The Alien from Mars — abduction beam, mutant allies, growth, engorgement +
// lava detonation, and boredom brawls.

import { K, PAL } from './shared.js';
import { audio } from './audio.js';
import {
  G, popup, sparks, smoke, spawnParticle, spawnLavaGlob, giblets, shake,
  damageEntity, killEntity, addScore,
} from './game-core.js';
import { igniteProp } from './game-entities.js';
import { drawSprite, drawShadow } from './game-sprites.js';

const MAX_MUTANTS = 7;
const SLOTS = [-34, 34, -62, 62, -92, 92, 0];

const MUT = {
  steak: { w: 30, h: 20, hp: 44, dmg: 8, spd: 40, fly: false, base: 'steak_walk', label: 'MOO-TATED!' },
  drumstick: { w: 16, h: 22, hp: 26, dmg: 9, spd: 78, fly: false, base: 'drumstick_hop', label: 'CLUCK-U-LOSS!' },
  cloudsheep: { w: 26, h: 16, hp: 24, dmg: 13, spd: 66, fly: true, base: 'cloudsheep_fly', label: 'BAA-BARIAN!' },
  karatepig: { w: 18, h: 19, hp: 34, dmg: 26, spd: 92, fly: false, base: 'karatepig_walk', label: 'PORK CHOP!' },
};
const ANIMAL_TO_MUT = { cow: 'steak', chicken: 'drumstick', sheep: 'cloudsheep', pig: 'karatepig' };

function applyStage(mu) {
  const s = mu.stage;
  mu.scale = 1 + (s - 1) * 0.24;            // stage 6 -> 2.2
  const hpMul = 1 + (s - 1) * 0.4;
  const ratio = mu.maxhp > 0 ? mu.hp / mu.maxhp : 1;
  mu.maxhp = Math.round(MUT[mu.kind].hp * hpMul);
  mu.hp = Math.max(1, Math.round(mu.maxhp * ratio));
  mu.dmg = MUT[mu.kind].dmg * (1 + (s - 1) * 0.45);
}

export function spawnMutant(kind, x, y) {
  const m = MUT[kind];
  const mu = {
    cls: 'mutant', kind, x, y, vx: 0, vy: 0, stage: 1, scale: 1,
    hp: m.hp, maxhp: m.hp, dmg: m.dmg, w: m.w, h: m.h, fly: m.fly,
    flash: 0, dead: false, facing: 1, animT: Math.random() * 3,
    slot: G.mutants.length % SLOTS.length, state: 'follow', target: null,
    attackCd: 0, boredom: 0, engorge: 0, pulse: 0, squash: 0, hop: 0,
    firing: 0, biting: 0, zapping: 0, chopping: 0, brawlMate: null, dashT: 0,
    targetable: true, invuln: 0,
  };
  mu._grow = function () {
    if (mu.engorge > 0) return;
    if (mu.stage < K.MUTANT_MAX_STAGE) {
      mu.stage++;
      applyStage(mu);
      mu.squash = 1;
      audio.play('growth');
      popup(mu.x, mu.y - mu.h * mu.scale, 'GROW ' + mu.stage, PAL.beam);
      sparks(mu.x, mu.y - mu.h * 0.5, 8, PAL.beam);
    } else if (mu.engorge <= 0) {
      mu.engorge = 3.0; mu.state = 'engorge';
      audio.play('engorge_warning');
      popup(mu.x, mu.y - mu.h * mu.scale, 'TOO MUCH!', PAL.fire2);
    }
  };
  mu._onDeath = function () {
    const gk = mu.kind === 'steak' ? 'meat' : mu.kind === 'drumstick' ? 'meat'
      : mu.kind === 'cloudsheep' ? 'wool' : 'meat';
    giblets(mu.x, mu.y - mu.h * 0.4, gk, 8);
    audio.play('explode_small');
  };
  G.mutants.push(mu);
  G.mutantsCreated++;
  return mu;
}

// ---- abduction beam ------------------------------------------------------
export function updateAbduction(dt) {
  const pl = G.player;
  const beamOn = pl.beam && !pl.dead;
  const gy = G.world.groundY(pl.x);
  const beamLen = gy - pl.y;

  if (beamOn) {
    if (!G.beamAnim) G.beamAnim = 0;
    G.beamAnim += dt;
    if (!pl.abductee) {
      // find nearest wild animal within the cone
      let best = null, bestD = 1e9;
      const halfW = 26;
      for (let i = 0; i < G.animals.length; i++) {
        const a = G.animals[i];
        if (a.dead || a.beamed) continue;
        const dx = a.x - pl.x;
        const spanAtY = 8 + Math.abs(a.y - pl.y) * (halfW / Math.max(20, beamLen));
        if (Math.abs(dx) < spanAtY && a.y > pl.y && a.y <= gy + 4) {
          const d = Math.abs(dx);
          if (d < bestD) { bestD = d; best = a; }
        }
      }
      if (best) {
        best.beamed = true; best.beamT = 0; best.beamFrom = best.y;
        pl.abductee = best;
        audio.startBeam();
      }
    }
    const a = pl.abductee;
    if (a) {
      a.beamT += dt;
      const t = Math.min(1, a.beamT / 1.1);
      a.x += (pl.x - a.x) * Math.min(1, dt * 6);
      a.y = a.beamFrom + (pl.y + 8 - a.beamFrom) * t;
      a.spin = a.beamT * 12;
      if (t >= 1) {
        // reached saucer
        for (let i = 0; i < 12; i++) spawnParticle(pl.x + (Math.random() * 10 - 5), pl.y, Math.random() * 40 - 20, Math.random() * 40 - 20, 0.3, 2, 'spark', PAL.beam, 0, 0.05);
        if (G.mutants.length < MAX_MUTANTS) {
          const kind = ANIMAL_TO_MUT[a.type] || 'steak';
          const mu = spawnMutant(kind, pl.x, pl.y + 10);
          mu.vy = -30;
          audio.play('mutate');
          popup(pl.x, pl.y - 16, MUT[kind].label, PAL.beam, 1.2);
          a.dead = true; a.beamed = false;
        } else {
          // over cap -> probe
          addScore(250, pl.x, pl.y - 14, 'PROBED!', PAL.zap2);
          audio.play('abduct_pop');
          a.beamed = false; a.beamT = 0; a.spin = 0;
          a.vx = (Math.random() * 40 - 20); a.dazed = 0.8;
          a.y = G.world.groundY(a.x);
        }
        pl.abductee = null;
        audio.stopBeam();
      }
    }
  } else {
    if (pl.abductee) {
      // released mid-lift: drop dazed
      const a = pl.abductee;
      a.beamed = false; a.spin = 0; a.dazed = 0.6;
      a.y = G.world.groundY(a.x);
      pl.abductee = null;
    }
    audio.stopBeam();
    G.beamAnim = 0;
  }
}

export function drawBeam(ctx) {
  const pl = G.player;
  if (!pl.beam || pl.dead) return;
  const gy = G.world.groundY(pl.x);
  const sx = Math.round(pl.x - G.camX), topY = Math.round(pl.y - G.camY + 4);
  const botY = Math.round(gy - G.camY);
  const halfW = 24;
  const shimmer = Math.sin((G.beamAnim || 0) * 8) * 2;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = PAL.beam;
  ctx.beginPath();
  ctx.moveTo(sx - 4, topY); ctx.lineTo(sx + 4, topY);
  ctx.lineTo(sx + halfW + shimmer, botY); ctx.lineTo(sx - halfW - shimmer, botY);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) {
    const yy = topY + ((G.beamAnim * 40 + i * 22) % (botY - topY));
    const w2 = 4 + (yy - topY) / (botY - topY) * halfW;
    ctx.fillRect(sx - w2, Math.round(yy), w2 * 2, 1);
  }
  ctx.restore();
  // abductee rendered spinning
  const a = pl.abductee;
  if (a) {
    const ax = Math.round(a.x - G.camX), ay = Math.round(a.y - G.camY);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(Math.cos(a.spin || 0), 1);
    drawSprite(ctx, G.reg, a.spr, 0, 0, { frame: 0 });
    ctx.restore();
  }
}

// ---- targeting -----------------------------------------------------------
function isAir(e) { return e.cls === 'jet' || e.cls === 'ufo'; }

function findTarget(mu, allowAir) {
  const ox = G.player.x, R = 140;
  // tier scan: army(3) > wild(2) > props(1)
  const groups = [
    [G.soldiers, G.tanks, allowAir ? G.jets : null, allowAir ? G.ufos : null],
    [G.animals],
    [G.props],
  ];
  for (let t = 0; t < groups.length; t++) {
    let best = null, bestD = 1e9;
    const tier = groups[t];
    for (let g = 0; g < tier.length; g++) {
      const arr = tier[g];
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (e.dead || e.beamed) continue;
        if (e.cls === 'prop' && (!e.targetable || e.ruin)) continue;
        if (e.cls === 'animal' && !e.targetable) continue;
        if (isAir(e) && !allowAir) continue;
        if (Math.abs(e.x - ox) > R) continue;
        const d = Math.abs(e.x - mu.x) + Math.abs(e.y - mu.y) * 0.5;
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    if (best) return best;
  }
  return null;
}

// ---- mutant update -------------------------------------------------------
export function updateMutants(dt) {
  const pl = G.player;
  for (let i = G.mutants.length - 1; i >= 0; i--) {
    const mu = G.mutants[i];
    if (mu.dead) { G.mutants.splice(i, 1); continue; }
    if (mu.flash > 0) mu.flash -= dt;
    if (mu.squash > 0) mu.squash = Math.max(0, mu.squash - dt * 4);
    mu.animT += dt;
    if (mu.firing > 0) mu.firing -= dt;
    if (mu.biting > 0) mu.biting -= dt;
    if (mu.zapping > 0) mu.zapping -= dt;
    if (mu.chopping > 0) mu.chopping -= dt;
    if (mu.attackCd > 0) mu.attackCd -= dt;

    if (mu.engorge > 0) { updateEngorge(mu, dt); continue; }

    const target = findTarget(mu, mu.kind === 'cloudsheep');
    if (target) { mu.boredom = 0; mu.target = target; mu.brawlMate = null; }
    else mu.boredom += dt;

    if (target) attackBehavior(mu, target, dt);
    else if (mu.boredom > 5) brawlBehavior(mu, dt);
    else followBehavior(mu, dt);

    integrate(mu, dt);
  }
}

function slotX(mu) { return G.player.x + SLOTS[mu.slot % SLOTS.length]; }

function followBehavior(mu, dt) {
  const tx = slotX(mu);
  moveToward(mu, tx, dt, 1);
}

function moveToward(mu, tx, dt, spdMul) {
  const dx = tx - mu.x;
  mu.facing = dx < 0 ? -1 : 1;
  const spd = MUT[mu.kind].spd * spdMul;
  const desired = Math.abs(dx) < 4 ? 0 : Math.sign(dx) * spd;
  mu.vx += (desired - mu.vx) * Math.min(1, dt * 5);
}

function attackBehavior(mu, target, dt) {
  const dx = target.x - mu.x;
  mu.facing = dx < 0 ? -1 : 1;
  const dist = Math.abs(dx);

  if (mu.kind === 'steak') {
    if (dist < 60) { moveToward(mu, target.x - Math.sign(dx) * 28, dt, 0.6); if (mu.attackCd <= 0) steakFire(mu); }
    else moveToward(mu, target.x, dt, 1);
    if (mu.firing > 0) applySteakFire(mu, dt);
  } else if (mu.kind === 'drumstick') {
    moveToward(mu, target.x, dt, 1.1);
    if (dist < 16 && Math.abs(target.y - mu.y) < 24 && mu.attackCd <= 0) {
      mu.biting = 0.2; mu.attackCd = 0.5; mu.squash = 1;
      damageEntity(target, mu.dmg, mu);
      audio.play('bite'); sparks(target.x, target.y - 6, 5, PAL.meat1);
    }
  } else if (mu.kind === 'cloudsheep') {
    // hover near target x, keep flying height
    moveToward(mu, target.x, dt, 0.8);
    if (dist < 130 && mu.attackCd <= 0) cloudZap(mu, target);
  } else if (mu.kind === 'karatepig') {
    if (dist < 120) {
      moveToward(mu, target.x, dt, 1.6);
      if (dist < 15 && Math.abs(target.y - mu.y) < 26 && mu.attackCd <= 0) porkChop(mu, target);
    } else moveToward(mu, target.x, dt, 1);
  }
}

function steakFire(mu) {
  mu.firing = 0.6; mu.attackCd = 1.4;
  audio.play('fire_breath', { vol: 0.7 });
}

function applySteakFire(mu, dt) {
  const my = mu.y - mu.h * mu.scale * 0.5;
  const reach = 40 * mu.scale;
  for (let s = -1; s <= 1; s += 2) {
    // particles
    if (Math.random() < dt * 40) {
      const sp = 60 + Math.random() * 80;
      spawnParticle(mu.x + s * 12 * mu.scale, my, s * sp, (Math.random() * 30 - 15), 0.35, 3, 'fire', PAL.fire2, -0.02, 0.03);
    }
    // damage/ignite in the cone
    hurtCone(mu, mu.x, my, s, reach, 14, mu.dmg * dt * 3, true);
  }
}

function hurtCone(mu, x, y, dir, reach, halfH, dmg, ignite) {
  scanHurt(G.props, x, y, dir, reach, halfH, dmg, mu, ignite);
  scanHurt(G.animals, x, y, dir, reach, halfH, dmg, mu, false);
  scanHurt(G.soldiers, x, y, dir, reach, halfH, dmg, mu, false);
  scanHurt(G.tanks, x, y, dir, reach, halfH, dmg, mu, false);
  scanHurt(G.mutants, x, y, dir, reach, halfH, dmg, mu, false);
}

function scanHurt(arr, x, y, dir, reach, halfH, dmg, mu, ignite) {
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (e === mu || e.dead) continue;
    if (e.cls === 'prop' && (e.ruin || !e.targetable)) { if (e.cls === 'prop' && ignite && e.flammable) { /*ruins skip*/ } continue; }
    const rx = (e.x - x) * dir;
    if (rx > -2 && rx < reach && Math.abs(e.y - y) < halfH + (e.h || 12) * 0.5) {
      if (ignite && e.cls === 'prop' && e.flammable) igniteProp(e);
      damageEntity(e, dmg, mu);
    }
  }
}

function cloudZap(mu, target) {
  mu.zapping = 0.22; mu.attackCd = 1.5;
  audio.play('zap');
  const zx = target.x, zy = target.y - (target.h ? target.h * 0.4 : 6);
  G.zaps.push({ x1: mu.x, y1: mu.y + 4, x2: zx, y2: zy, life: 0.22, max: 0.22 });
  // AoE
  const R = 20 * mu.scale;
  hurtRadius(G.animals, zx, zy, R, mu.dmg, mu);
  hurtRadius(G.soldiers, zx, zy, R, mu.dmg, mu);
  hurtRadius(G.tanks, zx, zy, R, mu.dmg, mu);
  hurtRadius(G.jets, zx, zy, R, mu.dmg, mu);
  hurtRadius(G.ufos, zx, zy, R, mu.dmg, mu);
  hurtRadius(G.props, zx, zy, R, mu.dmg, mu);
  sparks(zx, zy, 8, PAL.zap2);
  shake(2);
}

function hurtRadius(arr, x, y, r, dmg, mu) {
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (e === mu || e.dead) continue;
    if (e.cls === 'prop' && (e.ruin || !e.targetable)) continue;
    if (Math.abs(e.x - x) < r && Math.abs(e.y - y) < r + (e.h || 10) * 0.5) damageEntity(e, dmg, mu);
  }
}

function porkChop(mu, target) {
  mu.chopping = 0.3; mu.attackCd = 2.0; mu.squash = 1; mu.state = 'bow';
  audio.play('chop');
  damageEntity(target, mu.dmg, mu);
  // knockback
  if (!target.dead) { target.vx = (target.x < mu.x ? -1 : 1) * 60; }
  // CHOP! starburst + smear
  popup(target.x, target.y - 16, 'CHOP!', PAL.fire1, 1.2);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; spawnParticle(target.x, target.y - 6, Math.cos(a) * 120, Math.sin(a) * 120, 0.25, 2, 'spark', PAL.fire1, 0, 0.02); }
  shake(4);
}

// ---- boredom brawls ------------------------------------------------------
function brawlBehavior(mu, dt) {
  let mate = mu.brawlMate;
  if (!mate || mate.dead || mate.engorge > 0) {
    mate = null; let bd = 1e9;
    for (let i = 0; i < G.mutants.length; i++) {
      const o = G.mutants[i];
      if (o === mu || o.dead || o.engorge > 0) continue;
      const d = Math.abs(o.x - mu.x);
      if (d < bd) { bd = d; mate = o; }
    }
    mu.brawlMate = mate;
  }
  if (!mate) { followBehavior(mu, dt); return; }
  const dx = mate.x - mu.x;
  moveToward(mu, mate.x, dt, 0.9);
  if (Math.abs(dx) < 16 && mu.attackCd <= 0) {
    mu.attackCd = 0.6; mu.squash = 1;
    damageEntity(mate, mu.dmg * 0.5, mu);
    audio.play('hit', { vol: 0.5 });
    popup(mate.x, mate.y - mate.h - 2, '!', PAL.red, 0.9);
    sparks((mu.x + mate.x) / 2, mu.y - 8, 4, PAL.red);
  }
}

// ---- engorgement + lava detonation --------------------------------------
function updateEngorge(mu, dt) {
  const prev = mu.engorge;
  mu.engorge -= dt;
  mu.pulse += dt;
  // slow to a stop, swell
  mu.vx *= Math.pow(0.02, dt);
  mu.scale += dt * 0.15;
  if (!mu.fly) mu.y = G.world.groundY(mu.x);
  else mu.y += (G.player.y + 30 - mu.y) * Math.min(1, dt * 2);
  // accelerating fuse beeps
  const rate = mu.engorge < 1 ? 6 : mu.engorge < 2 ? 3 : 1.5;
  if (Math.floor(prev * rate) !== Math.floor(mu.engorge * rate)) audio.play('engorge_warning', { pitch: 1 + (3 - mu.engorge) * 0.2 });
  if (Math.random() < dt * 30) spawnParticle(mu.x + (Math.random() * 20 - 10), mu.y - mu.h * mu.scale * 0.5, Math.random() * 20 - 10, -20 - Math.random() * 20, 0.4, 2, 'ember', PAL.lava2, -0.05, 0.02);
  mu.flash = 0.4 + 0.4 * Math.sin(mu.pulse * (rate * 2));
  if (mu.engorge <= 0) detonate(mu);
}

function detonate(mu) {
  mu.dead = true;
  audio.play('lava_explode');
  shake(14);
  const cx = mu.x, cy = mu.y - mu.h * mu.scale * 0.4;
  for (let i = 0; i < 20; i++) spawnParticle(cx + (Math.random() * 20 - 10), cy, Math.random() * 200 - 100, Math.random() * 200 - 100, 0.4, 3, 'fire', PAL.fire1, 0.2, 0.03);
  const n = 10 + (Math.random() * 7 | 0);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const sp = 120 + Math.random() * 160;
    spawnLavaGlob(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp - 40);
  }
  // immediate AoE on everything nearby (including player handled in main via lava, but also direct)
  const R = 34;
  hurtRadius(G.animals, cx, cy, R, 30, null);
  hurtRadius(G.soldiers, cx, cy, R, 40, null);
  hurtRadius(G.tanks, cx, cy, R, 30, null);
  hurtRadius(G.mutants, cx, cy, R, 30, null);
  for (let i = 0; i < G.props.length; i++) { const p = G.props[i]; if (p.targetable && Math.abs(p.x - cx) < R) { if (p.flammable) igniteProp(p); else damageEntity(p, 30, null); } }
}

// ---- integrate + draw ----------------------------------------------------
function integrate(mu, dt) {
  mu.x += mu.vx * dt;
  if (mu.fly) {
    const ty = G.player.y + 30;
    mu.y += (ty - mu.y) * Math.min(1, dt * 3) + Math.sin(mu.animT * 3) * 0.3;
  } else {
    const gy = G.world.groundY(mu.x);
    // drumstick hops
    if (mu.kind === 'drumstick' && Math.abs(mu.vx) > 6) mu.hop = Math.abs(Math.sin(mu.animT * 9)) * 7;
    else mu.hop = Math.abs(Math.sin(mu.animT * 4)) * 1.5;
    mu.y = gy - mu.hop;
  }
}

export function drawZaps(ctx, dt) {
  for (let i = G.zaps.length - 1; i >= 0; i--) {
    const z = G.zaps[i];
    z.life -= dt;
    if (z.life <= 0) { G.zaps.splice(i, 1); continue; }
    const x1 = z.x1 - G.camX, y1 = z.y1 - G.camY, x2 = z.x2 - G.camX, y2 = z.y2 - G.camY;
    ctx.strokeStyle = z.life > z.max * 0.5 ? PAL.zap1 : PAL.zap2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const segs = 6;
    ctx.moveTo(Math.round(x1), Math.round(y1));
    for (let s = 1; s < segs; s++) {
      const t = s / segs;
      const jx = (Math.random() * 6 - 3);
      ctx.lineTo(Math.round(x1 + (x2 - x1) * t + jx), Math.round(y1 + (y2 - y1) * t));
    }
    ctx.lineTo(Math.round(x2), Math.round(y2));
    ctx.stroke();
  }
}

export function drawMutants(ctx) {
  const reg = G.reg, cx = G.camX, cy = G.camY;
  for (let i = 0; i < G.mutants.length; i++) {
    const mu = G.mutants[i];
    const sx = mu.x - cx;
    if (sx < -60 || sx > K.W + 60) continue;
    let name = MUT[mu.kind].base, frameOverride;
    if (mu.kind === 'steak' && mu.firing > 0) name = 'steak_fire';
    else if (mu.kind === 'drumstick' && mu.biting > 0) { name = 'drumstick_bite'; }
    else if (mu.kind === 'cloudsheep' && mu.zapping > 0) name = 'cloudsheep_zap';
    else if (mu.kind === 'karatepig' && mu.chopping > 0) { name = 'karatepig_chop'; frameOverride = mu.chopping > 0.18 ? 0 : 1; }

    if (!mu.fly) drawShadow(ctx, sx, G.world.groundY(mu.x) - cy, mu.w * mu.scale, 0.4);
    const sq = mu.squash > 0 ? 1 - mu.squash * 0.18 : 1;
    const o = {
      t: mu.animT, flip: mu.facing < 0, scale: mu.scale,
      flash: mu.engorge > 0 ? Math.max(0, mu.flash) : (mu.flash > 0 ? 0.7 : 0),
      frame: frameOverride,
    };
    // squash: draw with slight vertical scale via two-axis not supported in helper;
    // approximate by nudging with scale on hop landing — keep simple.
    drawSprite(ctx, reg, name, sx, mu.y - cy, o);
    if (mu.engorge > 0) {
      ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(mu.pulse * 12);
      ctx.fillStyle = PAL.fire3;
      ctx.beginPath(); ctx.ellipse(Math.round(sx), Math.round(mu.y - cy - mu.h * mu.scale * 0.5), mu.w * mu.scale * 0.7, mu.h * mu.scale * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (mu.hp < mu.maxhp && mu.engorge <= 0) {
      const w = 14; const sy = mu.y - cy - mu.h * mu.scale - 3;
      ctx.fillStyle = PAL.outline; ctx.fillRect(Math.round(sx - w / 2) - 1, Math.round(sy) - 1, w + 2, 3);
      ctx.fillStyle = PAL.dirt2; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), w, 1);
      const fr = mu.hp / mu.maxhp;
      ctx.fillStyle = fr > 0.5 ? PAL.beam : fr > 0.25 ? PAL.fire2 : PAL.red;
      ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), Math.max(0, Math.round(w * fr)), 1);
    }
  }
}

export { MUT, MAX_MUTANTS };
