/**
 * Pinball game logic — scoring, modes, multiball, pink horse mode.
 */

import { AudioBus } from './audio.js';
import { DMD } from './dmd.js';
import {
  TABLE,
  makeMaterials,
  makePhysicsMats,
  buildTable,
  setFlipperAngle,
  createBall,
  removeBall,
} from './table.js';

const BALLS_PER_CREDIT = 3;
const SCORE = {
  bumper: 100,
  sling: 50,
  drop: 1500,
  dropBank: 25000,
  spinner: 100,
  ramp: 5000,
  rampCombo: 15000,
  multiballJackpot: 50000,
  pinkBonus: 100000,
};

export class PinballGame {
  constructor(THREE, CANNON) {
    this.THREE = THREE;
    this.CANNON = CANNON;
    this.audio = new AudioBus();
    this.dmd = new DMD();

    this.score = 0;
    this.ballsLeft = 0;
    this.multiplier = 1;
    this.credits = 0;
    this.active = false;
    this.waitingForPlunge = false;

    // Modes
    this.rampShots = 0;
    this.dropHits = [false, false, false];
    this.missionStep = 0;
    this.multiball = false;
    this.pinkMode = false;
    this.pinkTimer = 0;
    this.hurryUp = false;
    this.hurryTimer = 0;
    this.hurryValue = 0;
    this.comboTimer = 0;
    this.lastEvent = '';

    this.balls = [];
    this.keys = Object.create(null);
    this.plungerPower = 0;

    this._initScene();
    this._bindInput();
    this._clock = performance.now();
    this._accum = 0;
    this._fixed = 1 / 60;
    this._trailHist = [];
    this._rampCooldown = 0;
    this._spinnerCD = 0;
    this._collideCD = new WeakMap();

    this.dmd.setAttract(true);
    requestAnimationFrame((t) => this._loop(t));
  }

  unlockAudio() {
    this.audio.unlock();
  }

  _initScene() {
    const THREE = this.THREE;
    const CANNON = this.CANNON;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.012);

    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);
    this.camera.position.set(0, 34, 32);
    this.camera.lookAt(0, 0, 2);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      const el = document.getElementById('game');
      if (el) {
        el.innerHTML =
          '<p style="color:#fff;font:16px system-ui;padding:2rem;text-align:center">WebGL is required for Pinball.</p>';
      }
      throw err;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputEncoding' in this.renderer && THREE.sRGBEncoding != null) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    document.getElementById('game').appendChild(this.renderer.domElement);

    this.world = new CANNON.World();
    this.world.gravity.set(0, -38, 11); // down + toward drain
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 14;
    this.world.allowSleep = false;

    this.mats = makeMaterials(THREE);
    this.pmat = makePhysicsMats(CANNON);
    for (const c of this.pmat.contacts) this.world.addContactMaterial(c);

    this.table = buildTable(THREE, CANNON, this.scene, this.world, this.mats, this.pmat);

    // DMD plane on backbox
    const tex = this.dmd.attachTexture(THREE);
    const dmdMat = new THREE.MeshBasicMaterial({ map: tex });
    const dmd = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 5.2), dmdMat);
    dmd.position.set(0, 8.2, -TABLE.halfL - 0.1);
    this.scene.add(dmd);
    this.table.dmdMesh = dmd;

    // Collision listener
    this.world.addEventListener('beginContact', (e) => this._onContact(e));

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  _bindInput() {
    const down = (e) => {
      const k = e.key?.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys[k] = true;
      this.keys[e.code] = true;
      if (k === '1' || k === 'Digit1') this.insertCoin();
      if (k === ' ' || k === 'Enter') {
        if (!this.active && this.credits > 0) this.startGame();
      }
    };
    const up = (e) => {
      const k = e.key?.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys[k] = false;
      this.keys[e.code] = false;
    };
    addEventListener('keydown', down);
    addEventListener('keyup', up);

    // Custom huge touch zones (in addition to keyboard/gamepad via events)
    this._setupTouchUI();
  }

  _setupTouchUI() {
    const root = document.getElementById('touch-ui');
    if (!root) return;

    const bindHold = (el, on, off) => {
      const start = (e) => {
        e.preventDefault();
        el.classList.add('on');
        on();
      };
      const end = (e) => {
        if (e) e.preventDefault();
        el.classList.remove('on');
        off();
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    bindHold(
      document.getElementById('btn-flip-l'),
      () => {
        this.keys['z'] = true;
        this.keys['ArrowLeft'] = true;
      },
      () => {
        this.keys['z'] = false;
        this.keys['ArrowLeft'] = false;
      }
    );
    bindHold(
      document.getElementById('btn-flip-r'),
      () => {
        this.keys['x'] = true;
        this.keys['ArrowRight'] = true;
      },
      () => {
        this.keys['x'] = false;
        this.keys['ArrowRight'] = false;
      }
    );
    bindHold(
      document.getElementById('btn-plunge'),
      () => {
        this.keys['m'] = true;
      },
      () => {
        this.keys['m'] = false;
      }
    );

    document.getElementById('btn-coin')?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.insertCoin();
    });
  }

  insertCoin() {
    this.credits++;
    this.audio.play('coin');
    this._hud();
    if (!this.active) {
      this.dmd.showBanner('CREDITS ' + this.credits, 1.4, '#ffee55');
      // Auto-start if first coin
      if (this.ballsLeft === 0) this.startGame();
    }
  }

  startGame() {
    if (this.credits <= 0 && this.ballsLeft <= 0) return;
    if (!this.active) {
      if (this.credits > 0) {
        this.credits--;
        this.ballsLeft = BALLS_PER_CREDIT;
      }
      this.score = 0;
      this.multiplier = 1;
      this.active = true;
      this.rampShots = 0;
      this.dropHits = [false, false, false];
      this.missionStep = 0;
      this.multiball = false;
      this._endPink();
      this.dmd.setAttract(false);
      this.dmd.setScore(0);
      this.dmd.setBalls(this.ballsLeft);
      this.dmd.setMultiplier(1);
      this.dmd.setMode('HIT DROP TARGETS · P H W');
      this.dmd.showBanner('PLAYER 1', 1.5, '#7CFF6B');
      this._resetDrops();
      this._serveBall();
    } else if (this.ballsLeft > 0 && this.balls.filter((b) => b.alive).length === 0) {
      this._serveBall();
    }
    this._hud();
  }

  _serveBall() {
    // Clear leftover single balls if not multiball
    if (!this.multiball) {
      for (const b of this.balls) removeBall(this.scene, this.world, b);
      this.balls = [];
    }
    const b = createBall(
      this.THREE,
      this.CANNON,
      this.scene,
      this.world,
      this.mats,
      this.pmat,
      TABLE.plungerX,
      0.9,
      15.5
    );
    b.body.velocity.setZero();
    b.body.angularVelocity.setZero();
    b.launched = false;
    this.balls.push(b);
    this.waitingForPlunge = true;
    this.plungerPower = 0;
    this.dmd.showBanner('SHOOT', 1.2, '#88ccff');
    this._hud();
  }

  _spawnExtraBall(x, z) {
    const b = createBall(
      this.THREE,
      this.CANNON,
      this.scene,
      this.world,
      this.mats,
      this.pmat,
      x,
      1.2,
      z
    );
    b.launched = true;
    b.body.velocity.set((Math.random() - 0.5) * 4, 2, -8);
    this.balls.push(b);
  }

  _onContact(e) {
    const ba = e.bodyA;
    const bb = e.bodyB;
    let ballBody = null;
    let other = null;
    for (const b of this.balls) {
      if (!b.alive) continue;
      if (ba === b.body) {
        ballBody = b;
        other = bb;
        break;
      }
      if (bb === b.body) {
        ballBody = b;
        other = ba;
        break;
      }
    }
    if (!ballBody || !other) return;

    const now = performance.now();
    const last = this._collideCD.get(other) || 0;
    if (now - last < 80) return;
    this._collideCD.set(other, now);

    // Bumpers
    for (const bump of this.table.bumpers) {
      if (other === bump.body) {
        this._hitBumper(bump, ballBody);
        return;
      }
    }
    // Slingshots
    for (const s of this.table.slingshots) {
      if (other === s.body) {
        this._hitSling(s, ballBody);
        return;
      }
    }
    // Drop targets
    for (const d of this.table.dropTargets) {
      if (other === d.body && !d.down) {
        this._hitDrop(d);
        return;
      }
    }
    // Spinner
    if (this.table.spinner && other === this.table.spinner.body) {
      this._hitSpinner(ballBody);
      return;
    }
    // Flippers — boost if rising
    for (const f of this.table.flippers) {
      if (other === f.body && f.pressed && Math.abs(f.angularVel) > 2) {
        const side = f.side;
        const impulse = new this.CANNON.Vec3(-side * 2.5, 1.5, -16);
        ballBody.body.applyImpulse(impulse, ballBody.body.position);
        this.audio.play('flipper', { vol: 0.5, cooldown: 60 });
        return;
      }
    }
  }

  _hitBumper(bump, ball) {
    bump.flash = 0.25;
    bump.cap.material = bump.litMat;
    bump.light.intensity = 2.8;
    // Kick ball outward from bumper center
    const dx = ball.body.position.x - bump.body.position.x;
    const dz = ball.body.position.z - bump.body.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const power = 12;
    ball.body.velocity.x += (dx / len) * power;
    ball.body.velocity.z += (dz / len) * power;
    ball.body.velocity.y += 3;
    this.audio.play('bumper', { rate: 0.9 + Math.random() * 0.25 });
    this._addScore(SCORE.bumper, '+' + SCORE.bumper);
    // Scale pop animation
    bump.group.scale.setScalar(1.25);
  }

  _hitSling(s, ball) {
    s.flash = 0.18;
    ball.body.velocity.x += s.kick.x;
    ball.body.velocity.y += s.kick.y;
    ball.body.velocity.z += s.kick.z;
    this.audio.play('sling', { rate: 0.95 + Math.random() * 0.2 });
    this._addScore(SCORE.sling);
  }

  _hitDrop(d) {
    d.down = true;
    d.mesh.material = this.mats.targetDown;
    d.mesh.position.y = 0.25;
    d.mesh.scale.y = 0.25;
    // Disable collision roughly by moving body down
    d.body.position.y = -2;
    this.dropHits[d.index] = true;
    this.audio.play('target');
    this._addScore(SCORE.drop, d.letter + '!');
    this.dmd.pop(d.letter, '#ffcc44');

    if (this.dropHits.every(Boolean)) {
      this._addScore(SCORE.dropBank, 'BANK!');
      this.dmd.showBanner('TARGET BANK', 2, '#ffee55');
      this.audio.play('mode');
      this.missionStep++;
      // Reset after short delay
      setTimeout(() => this._resetDrops(), 1800);
      // Multiball condition
      if (this.missionStep >= 1 && this.rampShots >= 2) {
        this._startMultiball();
      } else if (this.missionStep >= 2) {
        this._startPinkMode();
      } else {
        this._startHurryUp();
      }
    } else {
      const left = this.dropHits.map((h, i) => (h ? '·' : ['P', 'H', 'W'][i])).join(' ');
      this.dmd.setMode('TARGETS  ' + left);
    }
  }

  _resetDrops() {
    this.dropHits = [false, false, false];
    for (const d of this.table.dropTargets) {
      d.down = false;
      d.mesh.material = this.mats.target;
      d.mesh.position.y = d.baseY;
      d.mesh.scale.y = 1;
      d.body.position.set(
        d.mesh.position.x,
        d.baseY,
        d.mesh.position.z
      );
    }
    if (this.active && !this.pinkMode) {
      this.dmd.setMode('HIT DROP TARGETS · P H W');
    }
  }

  _hitSpinner(ball) {
    if (this._spinnerCD > 0) return;
    this._spinnerCD = 0.05;
    const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.z);
    this.table.spinner.spin += speed * 0.35;
    this.audio.play('spinner', { cooldown: 30, vol: 0.45 });
    this._addScore(SCORE.spinner);
  }

  _checkRamp(dt) {
    if (this._rampCooldown > 0) {
      this._rampCooldown -= dt;
      return;
    }
    const entrance = this.table.ramp.entrance;
    const exit = this.table.ramp.exit;
    for (const b of this.balls) {
      if (!b.alive || !b.launched) continue;
      const p = b.body.position;
      // Near entrance with upward/back motion
      const de = Math.hypot(p.x - entrance.x, p.z - entrance.z);
      if (de < 1.6 && p.y < 2.2 && b.body.velocity.z < -2) {
        // Boost along ramp
        b.body.velocity.set(4, 8, -10);
        b.body.position.set(entrance.x, 1.5, entrance.z);
        b._onRamp = true;
        this.audio.play('ramp');
      }
      if (b._onRamp) {
        const dx = Math.hypot(p.x - exit.x, p.z - exit.z);
        if (dx < 2.2 || p.y > 2.5) {
          // completed-ish
          if (dx < 3.5 && b._onRamp) {
            b._onRamp = false;
            this._rampCooldown = 1.2;
            this._awardRamp();
            b.body.velocity.set(6, 1, 4);
            b.body.position.set(exit.x, 1.2, exit.z);
          }
        }
        // timeout ramp flag
        if (p.z > 5) b._onRamp = false;
      }
    }
  }

  _awardRamp() {
    this.rampShots++;
    const combo = this.comboTimer > 0;
    this.comboTimer = 3;
    const pts = combo ? SCORE.rampCombo : SCORE.ramp;
    this._addScore(pts, combo ? 'RAMP COMBO' : 'RAMP');
    this.dmd.showBanner(combo ? 'RAMP COMBO' : 'RAMP SHOT', 1.6, '#44ffee');
    this.audio.play('mode', { vol: 0.7 });
    this.dmd.setMode(`RAMPS ${this.rampShots}/3 · MULTIBALL`);

    if (this.multiball) {
      this._addScore(SCORE.multiballJackpot, 'JACKPOT');
      this.dmd.showBanner('JACKPOT', 1.8, '#ffee55');
    } else if (this.rampShots >= 3) {
      this._startMultiball();
    } else if (this.rampShots >= 2 && this.dropHits.filter(Boolean).length >= 2) {
      this._startPinkMode();
    }
  }

  _startMultiball() {
    if (this.multiball) return;
    this.multiball = true;
    this.dmd.showBanner('MULTIBALL', 2.5, '#ff66ff');
    this.dmd.setMode('★ MULTIBALL · RAMP = JACKPOT ★');
    this.audio.play('multiball');
    this.audio.setMusicVolume(0.5);
    // Launch second ball
    this._spawnExtraBall(0, -6);
    this.multiplier = Math.max(this.multiplier, 2);
    this.dmd.setMultiplier(this.multiplier);
    // Flash inserts
    for (const ins of this.table.inserts) {
      if (ins.material && ins.material.emissiveIntensity != null) {
        ins.material.emissiveIntensity = 2.2;
      }
    }
  }

  _startHurryUp() {
    this.hurryUp = true;
    this.hurryTimer = 12;
    this.hurryValue = 20000;
    this.dmd.showBanner('HURRY UP', 2, '#ff8844');
    this.dmd.setMode('HURRY UP — HIT RAMP!');
  }

  _startPinkMode() {
    if (this.pinkMode) return;
    this.pinkMode = true;
    this.pinkTimer = 25;
    this.multiplier = Math.max(this.multiplier, 3);
    this.dmd.setPink(true);
    this.dmd.setMultiplier(this.multiplier);
    this.dmd.showBanner('PINK HORSE MODE', 2.8, '#ff66cc');
    this.dmd.setMode('🦄 PINK HORSE MODE  ×' + this.multiplier);
    this.audio.play('mode');
    this.audio.setMusicVolume(0.55);

    if (this.table.playfieldMesh) {
      this.table.playfieldMesh.material = this.mats.playfieldPink;
    }
    this.scene.background = new this.THREE.Color(0x1a0518);
    this.scene.fog.color.set(0x1a0518);
    for (const n of this.table.neon) {
      if (n.material) n.material.emissiveIntensity = 2.8;
    }
    for (const L of this.table.lights) {
      L.color.set(0xff66cc);
      L.intensity = Math.max(L.intensity, 1.2);
    }
  }

  _endPink() {
    this.pinkMode = false;
    this.pinkTimer = 0;
    this.dmd.setPink(false);
    if (this.table.playfieldMesh) {
      this.table.playfieldMesh.material = this.mats.playfield;
    }
    this.scene.background = new this.THREE.Color(0x050510);
    if (this.scene.fog) this.scene.fog.color.set(0x050510);
    this.audio.setMusicVolume(0.38);
  }

  _addScore(base, popText) {
    if (!this.active) return;
    const pts = Math.floor(base * this.multiplier);
    this.score += pts;
    this.dmd.setScore(this.score);
    if (popText) this.dmd.pop(typeof popText === 'string' && popText.startsWith('+') ? popText : `+${pts}`);
    else if (pts >= 500) this.dmd.pop(`+${pts}`);

    if (this.hurryUp && base >= SCORE.ramp) {
      this._addScoreRaw(this.hurryValue);
      this.dmd.showBanner('HURRY ' + this.hurryValue, 1.5, '#ffaa33');
      this.hurryUp = false;
    }
    this._hud();
  }

  _addScoreRaw(pts) {
    this.score += pts;
    this.dmd.setScore(this.score);
    this.dmd.pop('+' + pts, '#ffee55');
  }

  _updateFlippers(dt) {
    const leftOn =
      this.keys['z'] ||
      this.keys['Z'] ||
      this.keys['ArrowLeft'] ||
      this.keys['KeyZ'];
    const rightOn =
      this.keys['x'] ||
      this.keys['X'] ||
      this.keys['ArrowRight'] ||
      this.keys['KeyX'];

    for (const f of this.table.flippers) {
      const on = f.side < 0 ? leftOn : rightOn;
      if (on && !f.pressed) this.audio.play('flipper', { cooldown: 100, vol: 0.65 });
      f.pressed = !!on;
      const target = on ? f.activeAngle : f.restAngle;
      // Fast snap toward target
      const speed = on ? 22 : 16;
      let a = f.angle;
      if (a < target) a = Math.min(target, a + speed * dt);
      else if (a > target) a = Math.max(target, a - speed * dt);
      setFlipperAngle(f, a, dt);
    }
  }

  _updatePlunger(dt) {
    const p = this.table.plunger;
    const holding =
      this.keys['m'] ||
      this.keys['M'] ||
      this.keys['KeyM'] ||
      this.keys['ArrowDown'] ||
      this.keys['ArrowUp'];

    const ball = this.balls.find((b) => b.alive && !b.launched);
    if (!ball) {
      p.pull = Math.max(0, p.pull - dt * 3);
      p.rod.position.z = p.restZ + p.pull * 2.5;
      p.knob.position.z = p.restZ + 2 + p.pull * 2.5;
      // Charge meter UI
      const meter = document.getElementById('plunge-meter');
      if (meter) meter.style.transform = `scaleX(0)`;
      return;
    }

    // Keep ball locked in the shooter lane until launch
    ball.body.position.x = TABLE.plungerX;
    ball.body.position.y = 0.9;
    ball.body.velocity.x = 0;
    ball.body.velocity.y = 0;
    ball.body.angularVelocity.setZero();

    if (holding) {
      this.plungerPower = Math.min(1, this.plungerPower + dt * 0.85);
      p.pull = this.plungerPower;
      ball.body.position.z = 15.5 + this.plungerPower * 2.2;
      ball.body.velocity.z = 0;
    } else if (this.plungerPower > 0.08) {
      // Fire!
      const power = 20 + this.plungerPower * 36;
      ball.body.position.z = 14.2;
      ball.body.velocity.set(0, 2, -power);
      ball.launched = true;
      this.waitingForPlunge = false;
      this.audio.play('flipper', { rate: 0.7, vol: 0.8 });
      this.plungerPower = 0;
      p.pull = 0;
    } else {
      this.plungerPower = 0;
      p.pull = 0;
      ball.body.position.z = 15.5;
      ball.body.velocity.z = 0;
    }

    p.rod.position.z = p.restZ + p.pull * 2.5;
    p.knob.position.z = p.restZ + 2 + p.pull * 2.5;
    const meter = document.getElementById('plunge-meter');
    if (meter) meter.style.transform = `scaleX(${this.plungerPower})`;
  }

  _updateBalls(dt) {
    const alive = [];
    for (const b of this.balls) {
      if (!b.alive) continue;
      // Sync mesh
      b.mesh.position.copy(b.body.position);
      b.mesh.quaternion.copy(b.body.quaternion);

      // Trail
      if (!b._hist) b._hist = [];
      b._hist.unshift(b.body.position.clone());
      if (b._hist.length > b.trail.length) b._hist.pop();
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i];
        if (b._hist[i + 1] && b.launched) {
          t.visible = true;
          t.position.copy(b._hist[i + 1]);
        } else t.visible = false;
      }

      // Cap insane speeds
      const v = b.body.velocity;
      const spd = Math.hypot(v.x, v.y, v.z);
      if (spd > 55) {
        const s = 55 / spd;
        v.scale(s, v);
      }

      // Drain check
      if (b.body.position.z > TABLE.drainZ + 1.5 || b.body.position.y < -3) {
        removeBall(this.scene, this.world, b);
        continue;
      }
      // Side escape
      if (Math.abs(b.body.position.x) > 16) {
        removeBall(this.scene, this.world, b);
        continue;
      }
      alive.push(b);
    }

    const drained = this.balls.length && alive.length < this.balls.length;
    this.balls = alive;

    if (drained && this.active) {
      if (this.balls.length === 0) {
        this.audio.play('drain');
        if (this.multiball) {
          this.multiball = false;
          this.dmd.showBanner('MULTIBALL END', 1.5, '#aaaaaa');
          this.audio.setMusicVolume(0.38);
        }
        this.ballsLeft--;
        this.dmd.setBalls(Math.max(0, this.ballsLeft));
        if (this.ballsLeft > 0) {
          this.dmd.showBanner('BALL ' + (BALLS_PER_CREDIT - this.ballsLeft + 1), 1.5, '#ffaa66');
          setTimeout(() => {
            if (this.active && this.balls.length === 0) this._serveBall();
          }, 900);
        } else {
          this._gameOver();
        }
      }
    }
  }

  _gameOver() {
    this.active = false;
    this.waitingForPlunge = false;
    this.multiball = false;
    this._endPink();
    this.dmd.saveHigh(this.score);
    this.dmd.showBanner('GAME OVER', 3, '#ff5566');
    this.dmd.setMode('SCORE ' + this.score.toLocaleString());
    this.dmd.setAttract(true);
    this.audio.play('drain', { vol: 0.5 });
    this._hud();
  }

  _updateEffects(dt) {
    // Bumper flash recovery
    for (const b of this.table.bumpers) {
      if (b.flash > 0) {
        b.flash -= dt;
        if (b.flash <= 0) {
          b.cap.material = b.baseMat;
          b.light.intensity = 0.3;
          b.group.scale.setScalar(1);
        } else {
          const s = 1 + b.flash * 1.2;
          b.group.scale.setScalar(s);
        }
      }
    }
    // Sling flash
    for (const s of this.table.slingshots) {
      if (s.flash > 0) {
        s.flash -= dt;
        const k = s.flash * 8;
        if (s.band.material.emissiveIntensity != null) {
          s.band.material.emissiveIntensity = 1.4 + k;
        }
      }
    }
    // Spinner visual
    if (this.table.spinner) {
      this.table.spinner.spin *= Math.pow(0.15, dt);
      this.table.spinner.pivot.rotation.y += this.table.spinner.spin * dt;
    }
    // Insert pulse
    const pulse = 0.4 + 0.6 * Math.sin(performance.now() * 0.004);
    for (let i = 0; i < this.table.inserts.length; i++) {
      const ins = this.table.inserts[i];
      if (ins.material && ins.material.emissiveIntensity != null) {
        const base = this.pinkMode ? 1.6 : this.multiball ? 1.4 : 0.5;
        ins.material.emissiveIntensity = base + pulse * 0.5;
      }
    }
    // Neon
    for (const n of this.table.neon) {
      if (n.material && n.material.emissiveIntensity != null) {
        n.material.emissiveIntensity = (this.pinkMode ? 2.2 : 1.4) + pulse * 0.4;
      }
    }

    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this._spinnerCD > 0) this._spinnerCD -= dt;

    if (this.hurryUp) {
      this.hurryTimer -= dt;
      this.hurryValue = Math.max(2000, Math.floor(20000 * (this.hurryTimer / 12)));
      this.dmd.setMode(`HURRY UP ${this.hurryValue}  ${this.hurryTimer.toFixed(1)}s`);
      if (this.hurryTimer <= 0) {
        this.hurryUp = false;
        this.dmd.setMode('TOO SLOW');
      }
    }

    if (this.pinkMode) {
      this.pinkTimer -= dt;
      if (this.pinkTimer <= 0) {
        this._addScoreRaw(SCORE.pinkBonus);
        this.dmd.showBanner('PINK BONUS', 2, '#ff66cc');
        this._endPink();
        this.multiplier = Math.max(1, this.multiplier - 1);
        this.dmd.setMultiplier(this.multiplier);
        this.dmd.setMode('PINK HORSE COMPLETE');
      }
    }

    // Subtle camera sway
    const t = performance.now() * 0.0003;
    this.camera.position.x = Math.sin(t) * 0.4;
    this.camera.lookAt(0, 0, 2 + Math.sin(t * 0.7) * 0.3);
  }

  _hud() {
    const el = document.getElementById('hud');
    if (!el) return;
    el.innerHTML = `
      <div class="score">${this.score.toLocaleString()}</div>
      <div class="meta">BALLS ${Math.max(0, this.ballsLeft)} · CREDITS ${this.credits}${
        this.multiplier > 1 ? ' · ×' + this.multiplier : ''
      }${this.pinkMode ? ' · 🦄' : ''}${this.multiball ? ' · MULTI' : ''}</div>
    `;
  }

  _loop(now) {
    const dt = Math.min(0.05, (now - this._clock) / 1000);
    this._clock = now;
    this._accum += dt;

    while (this._accum >= this._fixed) {
      this._updateFlippers(this._fixed);
      this._updatePlunger(this._fixed);
      this.world.step(this._fixed);
      this._checkRamp(this._fixed);
      this._updateBalls(this._fixed);
      this._accum -= this._fixed;
    }

    this._updateEffects(dt);
    this.dmd.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((t) => this._loop(t));
  }
}
