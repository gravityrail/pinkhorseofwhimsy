// The Alien from Mars — wanted escalation, the army (soldiers/tanks/jets),
// rival UFOs, and all projectile collisions.

import { K, PAL } from './shared.js';
import { audio } from './audio.js';
import {
  G, damageEntity, killEntity, hurtPlayer, shake, sparks, smoke, spawnParticle,
  spawnBolt, spawnShell, giblets, addHeat,
} from './game-core.js';
import { igniteProp } from './game-entities.js';
import { drawSprite, drawShadow } from './game-sprites.js';

// ---- wanted meter --------------------------------------------------------
export function updateWanted(dt) {
  G.heat = Math.max(0, G.heat - dt * 2.2);
  const w = G.heat >= 75 ? 3 : G.heat >= 45 ? 2 : G.heat >= 18 ? 1 : 0;
  if (w !== G.wanted) {
    if (w > G.wanted && w >= 1) audio.play('alarm', { vol: 0.6 });
    G.wanted = w;
    audio.setWanted(w);
  }
}

// ---- factories -----------------------------------------------------------
function biggestMutant() {
  let best = null, bs = -1;
  for (let i = 0; i < G.mutants.length; i++) { const m = G.mutants[i]; if (!m.dead && m.stage > bs) { bs = m.stage; best = m; } }
  return best;
}
function nearestMutant(x) {
  let best = null, bd = 1e9;
  for (let i = 0; i < G.mutants.length; i++) { const m = G.mutants[i]; if (m.dead) continue; const d = Math.abs(m.x - x); if (d < bd) { bd = d; best = m; } }
  return best;
}

function spawnSquad() {
  const n = 3 + (G.rng() * 3 | 0);
  const side = G.rng() < 0.5 ? -1 : 1;
  const ex = G.player.x + side * (K.W / 2 + 20);
  for (let i = 0; i < n && G.soldiers.length < 8; i++) {
    const x = ex + side * i * 10;
    const s = {
      cls: 'soldier', x, y: G.world.groundY(x), vx: 0, hp: 8, maxhp: 8, flash: 0,
      dead: false, dir: -side, w: 10, h: 14, animT: G.rng() * 3, shootCd: 0.5 + G.rng(),
      aiming: 0, targetable: true,
    };
    s._onDeath = () => giblets(s.x, s.y - 6, 'army', 6);
    G.soldiers.push(s);
  }
}

function spawnTank() {
  if (G.tanks.length >= 2) return;
  const side = G.rng() < 0.5 ? -1 : 1;
  const x = G.player.x + side * (K.W / 2 + 30);
  const t = {
    cls: 'tank', x, y: G.world.groundY(x), vx: 0, hp: 60, maxhp: 60, flash: 0,
    dead: false, dir: -side, w: 30, h: 17, animT: 0, turretAng: 0, fireCd: 2 + G.rng() * 2,
    targetable: true,
  };
  t._onDeath = () => { giblets(t.x, t.y - 6, 'metal', 12); smoke(t.x, t.y - 6, 10, true); shake(6); audio.play('explode_big'); };
  G.tanks.push(t);
}

function spawnJetWarn() {
  if (G.jets.length >= 2 || G.pendingJet) return;
  const side = G.rng() < 0.5 ? -1 : 1;
  G.pendingJet = { side, delay: 1.3 };
  G.wantArrow = 1.3; G.wantArrowSide = side;
}

function spawnJet(side) {
  const x = G.player.x + side * (K.W / 2 + 40);
  const j = {
    cls: 'jet', x, y: G.player.y + (G.rng() * 20 - 10), vx: -side * 200, hp: 18, maxhp: 18,
    flash: 0, dead: false, dir: -side, w: 30, h: 12, shootCd: 0.4, targetable: true, life: 6,
  };
  j._onDeath = () => { giblets(j.x, j.y, 'metal', 12); smoke(j.x, j.y, 10, true); shake(6); audio.play('explode_big'); };
  G.jets.push(j);
  audio.play('jet_pass');
}

function spawnUfos() {
  const count = 1 + (G.rng() < 0.4 ? 1 : 0);
  for (let k = 0; k < count && G.ufos.length < 3; k++) {
    const side = G.rng() < 0.5 ? -1 : 1;
    const x = G.player.x + side * (K.W / 2 + 30 + k * 20);
    const u = {
      cls: 'ufo', x, y: 60 + G.rng() * 40, vx: 0, vy: 0, hp: 30, maxhp: 30, flash: 0,
      dead: false, w: 24, h: 14, life: 20, shootCd: 1 + G.rng(), phase: G.rng() * 6.28,
      targetable: true, leaving: false,
    };
    u._onDeath = () => { giblets(u.x, u.y, 'metal', 16); smoke(u.x, u.y, 14, true); sparks(u.x, u.y, 24, PAL.fire1); shake(10); audio.play('explode_big'); };
    G.ufos.push(u);
  }
  audio.play('ufo_arrive');
}

// ---- spawn scheduler -----------------------------------------------------
export function updateArmySpawns(dt) {
  if (G.calm) return;
  if (G.wanted >= 1) {
    G.spawnTimerInf -= dt;
    if (G.spawnTimerInf <= 0 && G.soldiers.length < 8) { spawnSquad(); G.spawnTimerInf = 7 - G.wanted + G.rng() * 4; }
  }
  if (G.wanted >= 2) {
    G.spawnTimerTank -= dt;
    if (G.spawnTimerTank <= 0 && G.tanks.length < 2) { spawnTank(); G.spawnTimerTank = 12 + G.rng() * 6; }
  }
  if (G.wanted >= 3) {
    G.spawnTimerJet -= dt;
    if (G.spawnTimerJet <= 0 && G.jets.length < 2 && !G.pendingJet) { spawnJetWarn(); G.spawnTimerJet = 10 + G.rng() * 6; }
  }
  if (G.pendingJet) {
    G.pendingJet.delay -= dt;
    if (G.pendingJet.delay <= 0) { spawnJet(G.pendingJet.side); G.pendingJet = null; }
  }
  if (G.wantArrow > 0) G.wantArrow -= dt;
  // rival UFOs
  if (G.wanted >= 1 || G.time > 90) {
    if (G.time >= G.nextUfoAt) { spawnUfos(); G.nextUfoAt = G.time + 40 + G.rng() * 40; }
  }
}

// ---- unit updates --------------------------------------------------------
export function updateSoldiers(dt) {
  const cx = G.player.x;
  for (let i = G.soldiers.length - 1; i >= 0; i--) {
    const s = G.soldiers[i];
    if (s.dead) { G.soldiers.splice(i, 1); continue; }
    if (s.flash > 0) s.flash -= dt;
    if (Math.abs(s.x - cx) > K.CHUNK_W * 2.5 + 260) { G.soldiers.splice(i, 1); continue; }
    const tgt = nearestMutant(s.x) || (G.player.dead ? null : G.player);
    if (!tgt) { s.aiming = 0; s.x += 0; s.y = G.world.groundY(s.x); continue; }
    const dx = tgt.x - s.x, dist = Math.abs(dx);
    s.dir = dx < 0 ? -1 : 1;
    const want = dist > 110 ? s.dir * 34 : dist < 70 ? -s.dir * 24 : 0;
    s.vx += (want - s.vx) * Math.min(1, dt * 4);
    s.x += s.vx * dt;
    s.y = G.world.groundY(s.x);
    s.animT += dt * (Math.abs(s.vx) > 3 ? 1 : 0);
    s.shootCd -= dt;
    if (dist < 130 && s.shootCd <= 0) {
      s.aiming = 0.3; s.shootCd = 1.2 + G.rng() * 0.8;
      const ty = tgt.y - (tgt.h ? tgt.h * 0.4 : 8);
      const a = Math.atan2(ty - (s.y - 9), tgt.x - s.x);
      spawnBolt(s.x + s.dir * 4, s.y - 9, Math.cos(a) * 150, Math.sin(a) * 150, false, 1);
      audio.play('enemy_shoot', { vol: 0.5 });
      sparks(s.x + s.dir * 5, s.y - 9, 2, PAL.fire1);
    } else if (s.aiming > 0) s.aiming -= dt;
  }
}

export function updateTanks(dt) {
  for (let i = G.tanks.length - 1; i >= 0; i--) {
    const t = G.tanks[i];
    if (t.dead) { G.tanks.splice(i, 1); continue; }
    if (t.flash > 0) t.flash -= dt;
    if (Math.abs(t.x - G.player.x) > K.CHUNK_W * 2.5 + 300) { G.tanks.splice(i, 1); continue; }
    const tgt = biggestMutant() || (G.player.dead ? null : G.player);
    if (!tgt) { t.y = G.world.groundY(t.x); continue; }
    const dx = tgt.x - t.x, dist = Math.abs(dx);
    t.dir = dx < 0 ? -1 : 1;
    const want = dist > 170 ? t.dir * 18 : dist < 90 ? -t.dir * 14 : 0;
    t.vx += (want - t.vx) * Math.min(1, dt * 3);
    t.x += t.vx * dt;
    t.y = G.world.groundY(t.x);
    t.animT += dt * (Math.abs(t.vx) > 2 ? 1 : 0);
    const mx = t.x, my = t.y - 11;
    const ty = tgt.y - (tgt.h ? tgt.h * 0.4 : 8);
    t.turretAng = Math.atan2(ty - my, tgt.x - mx);
    t.fireCd -= dt;
    if (dist < 260 && t.fireCd <= 0) {
      t.fireCd = 2.4 + G.rng() * 1.5;
      const flt = Math.max(0.7, Math.min(2.2, dist / 120));
      const vx = (tgt.x - mx) / flt;
      const vy = (ty - my) / flt - 0.5 * K.GRAVITY * flt;
      spawnShell(mx + Math.cos(t.turretAng) * 12, my + Math.sin(t.turretAng) * 12, vx, vy);
      audio.play('tank_fire'); shake(3);
      sparks(mx + Math.cos(t.turretAng) * 14, my + Math.sin(t.turretAng) * 14, 4, PAL.fire1);
    }
  }
}

export function updateJets(dt) {
  for (let i = G.jets.length - 1; i >= 0; i--) {
    const j = G.jets[i];
    if (j.dead) { G.jets.splice(i, 1); continue; }
    if (j.flash > 0) j.flash -= dt;
    j.x += j.vx * dt;
    j.life -= dt;
    // afterburner
    spawnParticle(j.x + (j.vx > 0 ? -16 : 16), j.y + 1, -j.vx * 0.1, 0, 0.2, 2, 'fire', PAL.fire2, 0, 0.1);
    j.shootCd -= dt;
    if (j.shootCd <= 0 && Math.abs(j.x - G.player.x) < 120) {
      j.shootCd = 0.5;
      const dir = j.vx > 0 ? 1 : -1;
      spawnBolt(j.x + dir * 14, j.y + 2, dir * 260, 0, false, 1);
      audio.play('enemy_shoot', { vol: 0.5 });
    }
    if (Math.abs(j.x - G.player.x) > K.W) { G.jets.splice(i, 1); }
  }
}

export function updateUfos(dt) {
  for (let i = G.ufos.length - 1; i >= 0; i--) {
    const u = G.ufos[i];
    if (u.dead) { G.ufos.splice(i, 1); continue; }
    if (u.flash > 0) u.flash -= dt;
    u.life -= dt;
    u.phase += dt;
    if (u.life <= 0) u.leaving = true;
    const tx = u.leaving ? G.player.x + (u.x < G.player.x ? -1 : 1) * (K.W) : G.player.x + Math.sin(u.phase * 0.7) * 90;
    const ty = 55 + Math.sin(u.phase * 1.3) * 16;
    u.vx += ((tx - u.x) * 2 - u.vx) * Math.min(1, dt * 2);
    u.vy += ((ty - u.y) * 3 - u.vy) * Math.min(1, dt * 3);
    u.x += u.vx * dt; u.y += u.vy * dt;
    if (u.leaving && Math.abs(u.x - G.player.x) > K.W) { G.ufos.splice(i, 1); continue; }
    u.shootCd -= dt;
    if (!u.leaving && u.shootCd <= 0 && Math.abs(u.x - G.player.x) < 200) {
      u.shootCd = 0.9 + G.rng() * 0.8;
      const tgt = (G.rng() < 0.5 && G.mutants.length) ? G.mutants[(G.rng() * G.mutants.length) | 0] : G.player;
      if (tgt && !tgt.dead) {
        const a = Math.atan2((tgt.y - (tgt.h ? tgt.h * 0.4 : 0)) - u.y, tgt.x - u.x);
        spawnBolt(u.x, u.y + 4, Math.cos(a) * 170, Math.sin(a) * 170, false, 1);
        audio.play('enemy_shoot', { vol: 0.6, pitch: 0.8 });
      }
    }
  }
}

// ---- projectiles ---------------------------------------------------------
const HIT_R = 8;
function boltHitArr(b, arr) {
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (e.dead) continue;
    if (e.cls === 'prop' && (e.ruin || !e.targetable)) continue;
    const hh = (e.h || 12) * 0.5 + 4;
    if (Math.abs(e.x - b.x) < HIT_R && Math.abs((e.y - (e.h ? e.h * 0.4 : 0)) - b.y) < hh) {
      damageEntity(e, b.dmg, null);
      return true;
    }
  }
  return false;
}

export function updateProjectiles(dt) {
  // bolts
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    const b = G.bolts[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let hit = false;
    const gy = G.world.groundY(b.x);
    if (b.y >= gy) { hit = true; sparks(b.x, gy, 3, b.friendly ? PAL.beam : PAL.fire2); }
    if (!hit && b.friendly) {
      hit = boltHitArr(b, G.props) || boltHitArr(b, G.animals) || boltHitArr(b, G.soldiers) ||
        boltHitArr(b, G.tanks) || boltHitArr(b, G.jets) || boltHitArr(b, G.ufos) || boltHitArr(b, G.mutants);
    } else if (!hit) {
      // enemy bolt hits player + mutants
      const p = G.player;
      if (!p.dead && Math.abs(p.x - b.x) < 11 && Math.abs(p.y - b.y) < 9) { hurtPlayer(1); hit = true; }
      if (!hit) hit = boltHitArr(b, G.mutants);
    }
    if (hit || b.life <= 0) G.bolts.splice(i, 1);
  }
  // shells (ballistic)
  for (let i = G.shells.length - 1; i >= 0; i--) {
    const s = G.shells[i];
    s.vy += K.GRAVITY * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (Math.random() < dt * 30) spawnParticle(s.x, s.y, 0, 0, 0.3, 1, 'smoke', PAL.dusk2, 0, 0);
    const gy = G.world.groundY(s.x);
    if (s.y >= gy || s.life <= 0) { shellExplode(s.x, Math.min(s.y, gy)); G.shells.splice(i, 1); }
  }
}

function shellExplode(x, y) {
  audio.play('explode_small'); shake(5);
  smoke(x, y - 4, 8, true); sparks(x, y, 12, PAL.fire1);
  const R = 26;
  for (let i = 0; i < G.props.length; i++) { const p = G.props[i]; if (p.targetable && !p.ruin && Math.abs(p.x - x) < R && Math.abs(p.y - y) < 24) { if (p.flammable) igniteProp(p); damageEntity(p, 24, null); } }
  hurtInR(G.animals, x, y, R, 20); hurtInR(G.mutants, x, y, R, 22); hurtInR(G.soldiers, x, y, R, 30);
  const p = G.player;
  if (!p.dead && Math.abs(p.x - x) < R && Math.abs(p.y - y) < 22) hurtPlayer(1);
  addHeat(1);
}
function hurtInR(arr, x, y, r, dmg) {
  for (let i = 0; i < arr.length; i++) { const e = arr[i]; if (!e.dead && Math.abs(e.x - x) < r && Math.abs(e.y - y) < r) damageEntity(e, dmg, null); }
}

// ---- draws ---------------------------------------------------------------
export function drawArmy(ctx) {
  const reg = G.reg, cx = G.camX, cy = G.camY;
  for (let i = 0; i < G.soldiers.length; i++) {
    const s = G.soldiers[i]; const sx = s.x - cx;
    if (sx < -30 || sx > K.W + 30) continue;
    drawShadow(ctx, sx, s.y - cy, s.w, 0.4);
    drawSprite(ctx, reg, s.aiming > 0 ? 'soldier_aim' : 'soldier_walk', sx, s.y - cy, { t: s.animT, flip: s.dir < 0, flash: s.flash > 0 ? 0.7 : 0, frame: s.aiming > 0 ? 0 : undefined });
  }
  for (let i = 0; i < G.tanks.length; i++) {
    const t = G.tanks[i]; const sx = t.x - cx;
    if (sx < -40 || sx > K.W + 40) continue;
    drawShadow(ctx, sx, t.y - cy, t.w, 0.45);
    drawSprite(ctx, reg, 'tank', sx, t.y - cy, { t: t.animT, flip: t.dir < 0, flash: t.flash > 0 ? 0.7 : 0 });
    let ang = t.turretAng; let flip = false;
    if (Math.abs(ang) > Math.PI / 2) { flip = true; ang = Math.PI - ang; }
    drawSprite(ctx, reg, 'tank_turret', sx, t.y - cy - 11, { rot: ang, flip, flash: t.flash > 0 ? 0.7 : 0 });
  }
  for (let i = 0; i < G.jets.length; i++) {
    const j = G.jets[i]; const sx = j.x - cx;
    drawSprite(ctx, reg, 'jet', sx, j.y - cy, { flip: j.vx > 0, flash: j.flash > 0 ? 0.7 : 0 });
  }
  for (let i = 0; i < G.ufos.length; i++) {
    const u = G.ufos[i]; const sx = u.x - cx;
    drawSprite(ctx, reg, 'enemy_ufo', sx, u.y - cy, { t: u.phase, flash: u.flash > 0 ? 0.7 : 0 });
  }
}

export function drawProjectiles(ctx) {
  const cx = G.camX, cy = G.camY;
  for (let i = 0; i < G.bolts.length; i++) {
    const b = G.bolts[i]; const sx = Math.round(b.x - cx), sy = Math.round(b.y - cy);
    ctx.fillStyle = b.friendly ? PAL.beam : PAL.zap3;
    ctx.fillRect(sx - 2, sy - 1, 4, 2);
    ctx.fillStyle = b.friendly ? PAL.glow : PAL.zap1;
    ctx.fillRect(sx - 1, sy, 2, 1);
  }
  for (let i = 0; i < G.shells.length; i++) {
    const s = G.shells[i]; const sx = Math.round(s.x - cx), sy = Math.round(s.y - cy);
    ctx.fillStyle = PAL.outline; ctx.fillRect(sx - 1, sy - 1, 3, 3);
    ctx.fillStyle = PAL.fire2; ctx.fillRect(sx, sy, 1, 1);
  }
}
