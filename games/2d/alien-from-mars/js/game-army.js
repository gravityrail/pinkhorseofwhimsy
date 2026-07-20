// The Alien from Mars — wanted escalation, the army (soldiers/tanks/jets),
// rival UFOs, and all projectile collisions.

import { K, PAL } from './shared.js';
import { audio } from './audio.js';
import {
  G, damageEntity, killEntity, hurtPlayer, shake, sparks, smoke, spawnParticle,
  spawnBolt, spawnShell, giblets, addHeat, hitFlash, noteMission,
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

function spawnHeli() {
  if (G.helis.length >= 2) return;
  const side = G.rng() < 0.5 ? -1 : 1;
  const x = G.player.x + side * (K.W / 2 + 40);
  const h = {
    cls: 'heli', x, y: 70 + G.rng() * 30, vx: -side * 70, hp: 36, maxhp: 36, flash: 0,
    dead: false, dir: -side, w: 28, h: 16, shootCd: 1.2, targetable: true, life: 18,
    animT: 0,
  };
  h._onDeath = () => { giblets(h.x, h.y, 'metal', 14); smoke(h.x, h.y, 12, true); shake(8); audio.play('explode_big'); };
  G.helis.push(h);
  audio.play('heli');
  G.wantArrow = 1.0; G.wantArrowSide = side; G.wantArrowLabel = 'HELI';
}

function spawnRobot() {
  if (G.robots.length >= 1) return;
  const side = G.rng() < 0.5 ? -1 : 1;
  const x = G.player.x + side * (K.W / 2 + 50);
  const r = {
    cls: 'robot', x, y: G.world.groundY(x), vx: 0, hp: 120, maxhp: 120, flash: 0,
    dead: false, dir: -side, w: 22, h: 36, animT: 0, swingCd: 2, targetable: true,
  };
  r._onDeath = () => {
    giblets(r.x, r.y - 18, 'metal', 20); smoke(r.x, r.y - 18, 16, true);
    sparks(r.x, r.y - 18, 20, PAL.fire1); shake(12); hitFlash(0.4); audio.play('explode_big');
  };
  G.robots.push(r);
  audio.play('robot_stomp');
  audio.play('alarm', { vol: 0.5 });
}

function spawnSatellite() {
  if (G.sats.length >= 1) return;
  const x = G.player.x + (G.rng() * 80 - 40);
  const s = {
    cls: 'sat', x, y: 28, vx: 0, hp: 40, maxhp: 40, flash: 0,
    dead: false, w: 20, h: 14, animT: 0, charge: 0, fireCd: 3 + G.rng() * 2,
    targetable: true, life: 25, phase: G.rng() * 6,
  };
  s._onDeath = () => { giblets(s.x, s.y, 'metal', 14); sparks(s.x, s.y, 20, PAL.zap1); shake(8); audio.play('explode_big'); };
  G.sats.push(s);
  audio.play('sat_charge');
  audio.play('ufo_arrive', { pitch: 1.4 });
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
    // helicopters at ★2+
    G.spawnTimerHeli -= dt;
    if (G.spawnTimerHeli <= 0 && G.helis.length < 2) { spawnHeli(); G.spawnTimerHeli = 14 + G.rng() * 8; }
  }
  if (G.wanted >= 3) {
    G.spawnTimerJet -= dt;
    if (G.spawnTimerJet <= 0 && G.jets.length < 2 && !G.pendingJet) { spawnJetWarn(); G.spawnTimerJet = 10 + G.rng() * 6; }
    // giant robot farmer
    G.spawnTimerRobot -= dt;
    if (G.spawnTimerRobot <= 0 && G.robots.length < 1) { spawnRobot(); G.spawnTimerRobot = 22 + G.rng() * 10; }
    // satellite laser
    G.spawnTimerSat -= dt;
    if (G.spawnTimerSat <= 0 && G.sats.length < 1) { spawnSatellite(); G.spawnTimerSat = 18 + G.rng() * 10; }
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

// ---- new unit updates ----------------------------------------------------
export function updateHelis(dt) {
  for (let i = G.helis.length - 1; i >= 0; i--) {
    const h = G.helis[i];
    if (h.dead) { G.helis.splice(i, 1); continue; }
    if (h.flash > 0) h.flash -= dt;
    h.animT += dt;
    h.life -= dt;
    // hover near player x
    const tx = G.player.x + Math.sin(h.animT * 0.8) * 60;
    const ty = 65 + Math.sin(h.animT * 1.4) * 12;
    h.vx += ((tx - h.x) * 1.5 - h.vx) * Math.min(1, dt * 2);
    h.x += h.vx * dt;
    h.y += (ty - h.y) * Math.min(1, dt * 2);
    h.dir = h.vx < 0 ? -1 : 1;
    // rotor wash particles
    if (Math.random() < dt * 12) spawnParticle(h.x + (Math.random() * 16 - 8), h.y + 8, Math.random() * 20 - 10, 20, 0.25, 1, 'dust', PAL.dirt1, 0, 0.05);
    h.shootCd -= dt;
    if (h.shootCd <= 0 && Math.abs(h.x - G.player.x) < 180) {
      h.shootCd = 1.0 + G.rng() * 0.6;
      const tgt = nearestMutant(h.x) || G.player;
      if (tgt && !tgt.dead) {
        const a = Math.atan2((tgt.y - 8) - h.y, tgt.x - h.x);
        spawnBolt(h.x + h.dir * 10, h.y + 4, Math.cos(a) * 180, Math.sin(a) * 180, false, 1);
        audio.play('enemy_shoot', { vol: 0.55, pitch: 0.7 });
      }
    }
    if (h.life <= 0 || Math.abs(h.x - G.player.x) > K.W * 1.4) G.helis.splice(i, 1);
  }
}

export function updateRobots(dt) {
  for (let i = G.robots.length - 1; i >= 0; i--) {
    const r = G.robots[i];
    if (r.dead) { G.robots.splice(i, 1); continue; }
    if (r.flash > 0) r.flash -= dt;
    if (Math.abs(r.x - G.player.x) > K.CHUNK_W * 2.5 + 300) { G.robots.splice(i, 1); continue; }
    const tgt = biggestMutant() || (G.player.dead ? null : G.player);
    if (!tgt) { r.y = G.world.groundY(r.x); continue; }
    const dx = tgt.x - r.x, dist = Math.abs(dx);
    r.dir = dx < 0 ? -1 : 1;
    const want = dist > 40 ? r.dir * 28 : 0;
    r.vx += (want - r.vx) * Math.min(1, dt * 3);
    r.x += r.vx * dt;
    r.y = G.world.groundY(r.x);
    r.animT += dt * (Math.abs(r.vx) > 3 ? 1 : 0.3);
    // stomp shake
    if (Math.abs(r.vx) > 10 && ((r.animT * 5) | 0) !== (((r.animT - dt) * 5) | 0)) {
      if (Math.abs(r.x - G.player.x) < 200) { shake(2); audio.play('robot_stomp', { vol: 0.35, pitch: 0.9 + G.rng() * 0.2 }); }
    }
    r.swingCd -= dt;
    if (dist < 36 && r.swingCd <= 0) {
      r.swingCd = 1.6;
      audio.play('chop', { pitch: 0.5 });
      // pitchfork sweep
      hurtInR(G.mutants, r.x + r.dir * 14, r.y - 16, 28, 22);
      hurtInR(G.animals, r.x + r.dir * 14, r.y - 16, 28, 18);
      if (Math.abs(G.player.x - r.x) < 30 && Math.abs(G.player.y - (r.y - 20)) < 30) hurtPlayer(1);
      sparks(r.x + r.dir * 16, r.y - 18, 8, PAL.metal1);
      shake(5);
    }
  }
}

export function updateSats(dt) {
  for (let i = G.sats.length - 1; i >= 0; i--) {
    const s = G.sats[i];
    if (s.dead) { G.sats.splice(i, 1); continue; }
    if (s.flash > 0) s.flash -= dt;
    s.life -= dt;
    s.animT += dt;
    s.phase += dt;
    // drift slowly following player
    const tx = G.player.x + Math.sin(s.phase * 0.5) * 40;
    s.x += (tx - s.x) * Math.min(1, dt * 0.8);
    s.y = 26 + Math.sin(s.phase * 1.1) * 4;
    s.fireCd -= dt;
    if (s.charge > 0) {
      s.charge -= dt;
      // charging particles
      if (Math.random() < dt * 20) spawnParticle(s.x + (Math.random() * 10 - 5), s.y + 6, 0, 30 + Math.random() * 20, 0.3, 1, 'spark', PAL.fire1, 0, 0.05);
      if (s.charge <= 0) {
        // FIRE laser at ground under player / biggest mutant
        const tgt = biggestMutant() || G.player;
        const lx = tgt.x + (G.rng() * 30 - 15);
        const gy = G.world.groundY(lx);
        G.satBeams.push({ x: lx, y0: s.y + 6, y1: gy, life: 0.55, max: 0.55 });
        audio.play('laser', { pitch: 0.6 });
        audio.play('explode_small');
        shake(7); hitFlash(0.3);
        // AoE at impact
        shellExplode(lx, gy);
        // extra player check higher
        if (!G.player.dead && Math.abs(G.player.x - lx) < 22) hurtPlayer(1);
      }
    } else if (s.fireCd <= 0 && Math.abs(s.x - G.player.x) < 220) {
      s.fireCd = 4 + G.rng() * 2;
      s.charge = 1.1;
      audio.play('sat_charge');
      G.wantArrow = 1.1; G.wantArrowSide = s.x < G.player.x ? -1 : 1; G.wantArrowLabel = 'SAT';
    }
    if (s.life <= 0) G.sats.splice(i, 1);
  }
  // sat beam visuals countdown
  for (let i = G.satBeams.length - 1; i >= 0; i--) {
    G.satBeams[i].life -= dt;
    if (G.satBeams[i].life <= 0) G.satBeams.splice(i, 1);
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
    const hw = Math.max(HIT_R, (e.w || 10) * 0.35);
    if (Math.abs(e.x - b.x) < hw && Math.abs((e.y - (e.h ? e.h * 0.4 : 0)) - b.y) < hh) {
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
        boltHitArr(b, G.tanks) || boltHitArr(b, G.jets) || boltHitArr(b, G.ufos) ||
        boltHitArr(b, G.helis) || boltHitArr(b, G.robots) || boltHitArr(b, G.sats) ||
        boltHitArr(b, G.mutants);
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
  for (let i = 0; i < G.robots.length; i++) {
    const r = G.robots[i]; const sx = r.x - cx;
    if (sx < -40 || sx > K.W + 40) continue;
    drawShadow(ctx, sx, r.y - cy, r.w * 1.2, 0.5);
    drawSprite(ctx, reg, 'robot_farmer', sx, r.y - cy, { t: r.animT, flip: r.dir < 0, flash: r.flash > 0 ? 0.7 : 0 });
  }
  for (let i = 0; i < G.jets.length; i++) {
    const j = G.jets[i]; const sx = j.x - cx;
    drawSprite(ctx, reg, 'jet', sx, j.y - cy, { flip: j.vx > 0, flash: j.flash > 0 ? 0.7 : 0 });
  }
  for (let i = 0; i < G.helis.length; i++) {
    const h = G.helis[i]; const sx = h.x - cx;
    drawSprite(ctx, reg, 'heli', sx, h.y - cy, { t: h.animT, flip: h.dir < 0, flash: h.flash > 0 ? 0.7 : 0 });
  }
  for (let i = 0; i < G.ufos.length; i++) {
    const u = G.ufos[i]; const sx = u.x - cx;
    drawSprite(ctx, reg, 'enemy_ufo', sx, u.y - cy, { t: u.phase, flash: u.flash > 0 ? 0.7 : 0 });
  }
  for (let i = 0; i < G.sats.length; i++) {
    const s = G.sats[i]; const sx = s.x - cx;
    drawSprite(ctx, reg, 'satellite', sx, s.y - cy, { t: s.animT, flash: s.flash > 0 ? 0.7 : (s.charge > 0 ? 0.4 : 0) });
    // charge indicator beam preview
    if (s.charge > 0) {
      const gy = G.world.groundY(s.x);
      ctx.save();
      ctx.globalAlpha = 0.15 + 0.2 * Math.sin(s.charge * 20);
      ctx.fillStyle = PAL.fire2;
      ctx.fillRect(Math.round(sx) - 1, Math.round(s.y - cy + 6), 2, Math.round(gy - s.y));
      ctx.restore();
    }
  }
  // sat laser beams
  for (let i = 0; i < G.satBeams.length; i++) {
    const b = G.satBeams[i];
    const sx = Math.round(b.x - cx);
    const a = b.life / b.max;
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.5 * a;
    ctx.fillStyle = PAL.fire1;
    ctx.fillRect(sx - 2, Math.round(b.y0 - cy), 4, Math.round(b.y1 - b.y0));
    ctx.fillStyle = PAL.white;
    ctx.fillRect(sx - 1, Math.round(b.y0 - cy), 2, Math.round(b.y1 - b.y0));
    ctx.restore();
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
