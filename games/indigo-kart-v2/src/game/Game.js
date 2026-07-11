import * as THREE from 'three';
import { CARS, TRACKS, DIFFICULTIES, POINTS } from './content.js';
import { TrackWorld } from './Track.js';
import { Racer } from './Vehicle.js';
import { GameAudio } from './audio.js';
import { KartEffects } from './Effects.js';
import { damp, formatTime, lerpAngle, ordinal } from './utils.js';

const DRIVER_NAMES = ['Mika', 'Bolt', 'Nova', 'Rex', 'Lulu', 'Dash'];
const DRIVER_COLORS = [0xffd166, 0x6be585, 0xb692ff, 0x5de7ff, 0xff7a59, 0xf4f1de];
const CONTROL_KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

export class Game {
  constructor(root) {
    this.root = root;
    this.config = { car: CARS[0], track: TRACKS[0], difficulty: 'normal' };
    this.state = 'menu';
    this.audio = new GameAudio();
    this.input = { up: false, down: false, left: false, right: false };
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.raceTime = 0;
    this.countdown = 3.6;
    this.lastCountdownTick = 4;
    this.finishers = [];
    this.cameraLook = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.shake = 0;
    this.lastHudUpdate = 0;
    this.boostCharges = 0;
    this.boostTimer = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="game-shell">
        <div id="scene" class="scene"></div>
        <section id="menu" class="menu-screen">
          <div class="menu-topbar">
            <div class="brand"><span class="brand-mark">IK</span><div><strong>INDIGO KART</strong><small>SUMMER CIRCUIT</small></div></div>
            <button class="icon-button" id="menu-sound" aria-label="Toggle sound">♫</button>
          </div>
          <div class="hero-copy">
            <p class="eyebrow">ARCADE GRAND PRIX</p>
            <h1>Pick your ride.<br><em>Own the circuit.</em></h1>
            <p>Seven racers. Three laps. No room for boring.</p>
          </div>
          <div class="setup-panel">
            <div class="setup-section">
              <div class="section-title"><span>01</span><h2>Choose your kart</h2></div>
              <div class="car-picker" id="car-picker"></div>
            </div>
            <div class="setup-section compact">
              <div class="section-title"><span>02</span><h2>Choose a circuit</h2></div>
              <div class="track-picker" id="track-picker"></div>
            </div>
            <div class="setup-section compact">
              <div class="section-title"><span>03</span><h2>Race class</h2></div>
              <div class="difficulty-picker" id="difficulty-picker"></div>
            </div>
            <button id="start-race" class="start-button"><span>START RACE</span><kbd>↵</kbd></button>
            <p class="control-hint"><span>↑ ↓ ← →</span> Drive · <span>SPACE</span> use collected boost · <span>P</span> pause</p>
          </div>
        </section>
        <section id="hud" class="hud hidden">
          <div class="hud-top">
            <div class="position-box"><strong id="position">1st</strong><span>/ 7</span></div>
            <div class="race-meta"><span id="hud-track">SUNSET COVE</span><strong id="lap">LAP 1 / 3</strong></div>
            <div class="time-box"><span>TIME</span><strong id="race-time">0:00.00</strong></div>
          </div>
          <canvas id="minimap" class="minimap" width="220" height="170"></canvas>
          <div class="speedometer"><div class="speed-ring"><strong id="speed">0</strong><span>KM/H</span></div><div id="gear">N</div></div>
          <button id="boost-button" class="boost-button" aria-label="Use boost"><span>BOOST</span><strong>SPACE</strong><i id="boost-charges"><b></b><b></b><b></b></i></button>
          <div class="damage-meter"><span>CAR HEALTH</span><i><b id="health-bar"></b></i><strong id="health-label">100%</strong></div>
          <div id="race-message" class="race-message"></div>
          <button id="pause-button" class="hud-button pause-button" aria-label="Pause">Ⅱ</button>
          <button id="sound-button" class="hud-button sound-button" aria-label="Toggle sound">♫</button>
          <div class="touch-controls">
            <div class="touch-steer"><button data-control="left" aria-label="Steer left">←</button><button data-control="right" aria-label="Steer right">→</button></div>
            <div class="touch-pedals"><button data-control="down" aria-label="Brake">▼</button><button class="go" data-control="up" aria-label="Accelerate">▲</button></div>
          </div>
        </section>
        <section id="pause" class="overlay hidden"><div class="overlay-card"><p class="eyebrow">RACE PAUSED</p><h2>Catch your breath.</h2><button id="resume" class="start-button">RESUME</button><button class="secondary-button" data-action="menu">QUIT TO MENU</button></div></section>
        <section id="results" class="overlay hidden"><div class="overlay-card results-card"><p class="eyebrow">RACE COMPLETE</p><h2 id="result-title">Podium finish!</h2><div class="result-summary"><div><span>FINISH</span><strong id="result-place">1st</strong></div><div><span>POINTS</span><strong id="result-points">+12</strong></div><div><span>TIME</span><strong id="result-time">0:00.00</strong></div></div><div id="standings" class="standings"></div><button id="race-again" class="start-button">RACE AGAIN</button><button class="secondary-button" data-action="menu">CHANGE SETUP</button></div></section>
      </div>`;

    this.cacheElements();
    this.renderMenuOptions();
    this.bindEvents();
    this.initRenderer();
    this.renderMenuBackdrop();
    this.loop();
  }

  cacheElements() {
    const $ = (selector) => this.root.querySelector(selector);
    this.el = {
      scene: $('#scene'), menu: $('#menu'), hud: $('#hud'), pause: $('#pause'), results: $('#results'),
      carPicker: $('#car-picker'), trackPicker: $('#track-picker'), difficultyPicker: $('#difficulty-picker'),
      position: $('#position'), lap: $('#lap'), speed: $('#speed'), gear: $('#gear'), raceTime: $('#race-time'),
      hudTrack: $('#hud-track'), message: $('#race-message'), minimap: $('#minimap'),
      boostButton: $('#boost-button'), boostCharges: $('#boost-charges'),
      healthBar: $('#health-bar'), healthLabel: $('#health-label'),
      resultTitle: $('#result-title'), resultPlace: $('#result-place'), resultPoints: $('#result-points'),
      resultTime: $('#result-time'), standings: $('#standings'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
  }

  renderMenuOptions() {
    this.el.carPicker.innerHTML = CARS.map((car) => `
      <button class="car-card ${car.id === this.config.car.id ? 'selected' : ''}" data-car="${car.id}">
        <div class="kart-swatch" style="--car:#${car.color.toString(16).padStart(6, '0')};--accent:#${car.accent.toString(16).padStart(6, '0')}"><i></i><b></b></div>
        <div class="car-heading"><span>${car.tagline}</span><strong>${car.name}</strong></div>
        <div class="stat-grid">
          ${this.statRow('SPD', car.stats.topSpeed)}${this.statRow('ACC', car.stats.acceleration)}${this.statRow('GRP', car.stats.handling)}${this.statRow('WGT', car.stats.weight)}
        </div>
      </button>`).join('');

    this.el.trackPicker.innerHTML = TRACKS.map((track) => `
      <button class="track-card ${track.id === this.config.track.id ? 'selected' : ''}" data-track="${track.id}" style="--sky:#${track.palette.sky.toString(16).padStart(6, '0')};--ground:#${track.palette.ground.toString(16).padStart(6, '0')}">
        <div class="track-art"><i></i><span>${track.badge || (track.time === 'night' ? 'MIDNIGHT' : 'GOLDEN HOUR')}</span></div>
        <div><strong>${track.name}</strong><small>${track.description}</small></div>
      </button>`).join('');

    this.el.difficultyPicker.innerHTML = Object.entries(DIFFICULTIES).map(([id, value]) => `
      <button class="difficulty ${id === this.config.difficulty ? 'selected' : ''}" data-difficulty="${id}"><strong>${value.label}</strong><span>${id === 'easy' ? 'Relaxed rivals + extra assist' : id === 'hard' ? 'Aggressive rivals + light assist' : 'Balanced arcade racing'}</span></button>`).join('');
  }

  statRow(label, value) {
    return `<span>${label}</span><i><b style="width:${value * 10}%"></b></i>`;
  }

  bindEvents() {
    this.root.addEventListener('click', (event) => {
      const carButton = event.target.closest('[data-car]');
      const trackButton = event.target.closest('[data-track]');
      const difficultyButton = event.target.closest('[data-difficulty]');
      if (carButton) { this.config.car = CARS.find((car) => car.id === carButton.dataset.car); this.renderMenuOptions(); this.playUiTone(); }
      if (trackButton) { this.config.track = TRACKS.find((track) => track.id === trackButton.dataset.track); this.renderMenuOptions(); this.renderMenuBackdrop(); this.playUiTone(); }
      if (difficultyButton) { this.config.difficulty = difficultyButton.dataset.difficulty; this.renderMenuOptions(); this.playUiTone(); }
      if (event.target.closest('#start-race')) this.startRace();
      if (event.target.closest('#pause-button') || event.target.closest('#resume')) this.togglePause();
      if (event.target.closest('#race-again')) this.startRace();
      if (event.target.closest('[data-action="menu"]')) this.showMenu();
      if (event.target.closest('#sound-button') || event.target.closest('#menu-sound')) this.toggleSound();
      if (event.target.closest('#boost-button')) this.activateBoost();
    });

    window.addEventListener('keydown', (event) => {
      if (CONTROL_KEYS[event.code]) { this.input[CONTROL_KEYS[event.code]] = true; event.preventDefault(); }
      if (event.code === 'Enter' && this.state === 'menu') this.startRace();
      if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) this.activateBoost(); }
      if ((event.code === 'KeyP' || event.code === 'Escape') && (this.state === 'racing' || this.state === 'paused')) this.togglePause();
    });
    window.addEventListener('keyup', (event) => { if (CONTROL_KEYS[event.code]) this.input[CONTROL_KEYS[event.code]] = false; });
    window.addEventListener('blur', () => { this.clearInput(); if (this.state === 'racing') this.togglePause(); });

    this.root.querySelectorAll('[data-control]').forEach((button) => {
      const control = button.dataset.control;
      const on = (event) => { event.preventDefault(); this.input[control] = true; button.setPointerCapture?.(event.pointerId); };
      const off = (event) => { event.preventDefault(); this.input[control] = false; };
      button.addEventListener('pointerdown', on);
      button.addEventListener('pointerup', off);
      button.addEventListener('pointercancel', off);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
    window.addEventListener('resize', () => this.resize());
  }

  initRenderer() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(61, 1, 0.1, 650);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.el.scene.appendChild(this.renderer.domElement);
    this.resize();
  }

  resize() {
    const width = this.el.scene.clientWidth || window.innerWidth;
    const height = this.el.scene.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  clearWorld() {
    this.effects?.dispose();
    this.effects = null;
    this.trackWorld?.dispose();
    this.trackWorld = null;
    if (this.racers) this.racers.forEach((racer) => this.scene.remove(racer.mesh));
    while (this.scene.children.length) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      if (child !== this.trackWorld?.group) child.traverse?.((node) => { node.geometry?.dispose?.(); if (node.material && !Array.isArray(node.material)) node.material.dispose?.(); });
    }
  }

  setupWorld(trackData, preview = false) {
    this.clearWorld();
    this.scene.background = new THREE.Color(trackData.palette.sky);
    // Lighting rigs per time of day. 'space' keeps fog near zero so the
    // starfield and station stay crisp at distance.
    const rigs = {
      sunset: { hemiSky: 0xffe4cf, hemiIntensity: 2.0, sunColor: 0xffd0a3, sunIntensity: 3.8, sunPosition: [-95, 55, -60], fog: 0.0046 },
      night: { hemiSky: 0x6e77ff, hemiIntensity: 1.3, sunColor: 0x9aa6ff, sunIntensity: 2.2, sunPosition: [-70, 90, -60], fog: 0.0065 },
      day: { hemiSky: 0xdfefff, hemiIntensity: 2.3, sunColor: 0xfff1d6, sunIntensity: 3.6, sunPosition: [-65, 100, -40], fog: 0.0036 },
      space: { hemiSky: 0x4a5a9e, hemiIntensity: 0.9, sunColor: 0xcfd8ff, sunIntensity: 2.5, sunPosition: [-60, 115, -85], fog: 0.001 },
    };
    const rig = rigs[trackData.time] || rigs.sunset;
    this.scene.fog = new THREE.FogExp2(trackData.palette.fog, rig.fog);
    this.trackWorld = new TrackWorld(this.scene, trackData);

    const hemi = new THREE.HemisphereLight(rig.hemiSky, trackData.palette.ground, rig.hemiIntensity);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(rig.sunColor, rig.sunIntensity);
    sun.position.set(...rig.sunPosition);
    sun.castShadow = !preview;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -75;
    sun.shadow.camera.right = sun.shadow.camera.top = 75;
    sun.shadow.camera.far = 260;
    this.scene.add(sun);

    if (trackData.time === 'sunset') {
      const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(7, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffe7a1 }));
      sunDisc.position.set(-120, 42, -180);
      this.scene.add(sunDisc);
    }
  }

  renderMenuBackdrop() {
    this.setupWorld(this.config.track, true);
    const frame = this.trackWorld.frameAt(0.12);
    this.camera.position.copy(frame.point).addScaledVector(frame.side, -32).add(new THREE.Vector3(0, 23, 0));
    this.camera.lookAt(frame.point.clone().add(new THREE.Vector3(0, 3, 0)));
  }

  startRace() {
    this.audio.start();
    this.audio.stopMusic();
    this.clearInput();
    this.setupWorld(this.config.track);
    this.finishers = [];
    this.elapsed = 0;
    this.raceTime = 0;
    this.countdown = 3.6;
    this.lastCountdownTick = 4;
    this.boostCharges = 0;
    this.boostTimer = 0;
    this.state = 'racing';
    this.el.menu.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.results.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.hudTrack.textContent = this.config.track.name.toUpperCase();

    const difficulty = DIFFICULTIES[this.config.difficulty];
    this.racers = [];
    const lightsOn = this.config.track.time === 'night' || this.config.track.time === 'space';
    const player = new Racer({ name: 'YOU', car: this.config.car, color: 0xffffff, isPlayer: true, skill: 1, lane: -0.2, lightsOn });
    this.racers.push(player);
    for (let i = 0; i < 6; i += 1) {
      const car = CARS[(i + 1) % CARS.length];
      const variation = (i - 2.5) * 0.018;
      this.racers.push(new Racer({ name: DRIVER_NAMES[i], car, color: DRIVER_COLORS[i], skill: difficulty.pace + variation, lane: ((i % 3) - 1) * 0.22, lightsOn }));
    }
    this.racers.forEach((racer, index) => { racer.reset(this.trackWorld, index); racer.lap = -1; this.scene.add(racer.mesh); });
    this.player = player;
    this.effects = new KartEffects(this.scene, this.config.track);
    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    this.cameraPosition.copy(player.position).addScaledVector(forward, -10).add(new THREE.Vector3(0, 5.5, 0));
    this.camera.position.copy(this.cameraPosition);
    this.cameraLook.copy(player.position);
    this.drawMinimap();
    this.updateBoostHud();
    this.updateDamageHud();
    this.audio.fanfare(this.musicTheme());
  }

  // Each track can name its own arrangement; older tracks fall back to time of day.
  musicTheme() { return this.config.track.music || this.config.track.time; }

  clearInput() { Object.keys(this.input).forEach((key) => { this.input[key] = false; }); }

  playUiTone() { this.audio.start(); this.audio.tone(320, 0.05, 'sine', 0.06, 80); }
  toggleSound() {
    this.audio.start();
    const muted = this.audio.toggle();
    this.root.querySelectorAll('#sound-button, #menu-sound').forEach((button) => { button.textContent = muted ? '♩' : '♫'; button.classList.toggle('muted', muted); });
  }

  activateBoost() {
    if (this.state !== 'racing' || this.countdown > 0 || this.player?.finished) return;
    if (this.boostCharges <= 0 || this.boostTimer > 0) {
      this.audio.tone(105, 0.08, 'square', 0.055, -30);
      this.el.boostButton?.classList.add('empty');
      setTimeout(() => this.el.boostButton?.classList.remove('empty'), 180);
      return;
    }
    this.boostCharges -= 1;
    this.boostTimer = 1.3;
    this.audio.boost();
    this.flashMessage('TURBO!', 0.65);
    this.shake = 0.16;
    this.updateBoostHud();
  }

  updateBoostHud() {
    if (!this.el.boostCharges) return;
    [...this.el.boostCharges.children].forEach((dot, index) => dot.classList.toggle('filled', index < this.boostCharges));
    this.el.boostButton.classList.toggle('armed', this.boostCharges > 0);
    this.el.boostButton.classList.toggle('active', this.boostTimer > 0);
  }

  togglePause() {
    if (this.state === 'racing') {
      this.state = 'paused'; this.el.pause.classList.remove('hidden'); this.clearInput(); this.audio.stopMusic(); this.audio.setEngine(0, 0, false);
    } else if (this.state === 'paused') {
      this.state = 'racing'; this.el.pause.classList.add('hidden'); this.clock.getDelta();
      if (this.countdown <= 0) this.audio.startMusic(this.musicTheme());
    }
  }

  showMenu() {
    this.clearInput();
    this.state = 'menu';
    this.el.menu.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.results.classList.add('hidden');
    this.audio.setEngine(0, 0, false);
    this.audio.stopMusic();
    this.renderMenuOptions();
    this.renderMenuBackdrop();
  }

  updatePlayer(dt) {
    const racer = this.player;
    const stats = racer.car.stats;
    const difficulty = DIFFICULTIES[this.config.difficulty];
    const nearest = this.trackWorld.nearest(racer.position, racer.progress);
    const forward = new THREE.Vector3(Math.sin(racer.yaw), 0, Math.cos(racer.yaw));
    const steerInput = (this.input.left ? 1 : 0) - (this.input.right ? 1 : 0);
    const throttle = this.input.up ? 1 : 0;
    const brake = this.input.down ? 1 : 0;
    const boosting = this.boostTimer > 0;
    let longitudinal = racer.velocity.dot(forward);
    const speedRatio = Math.min(Math.abs(longitudinal) / 42, 1);
    const offroad = Math.abs(nearest.offset) > this.config.track.width * 0.58;
    racer.offroad = offroad;

    let targetYaw = Math.atan2(nearest.tangent.x, nearest.tangent.z);
    const assistError = this.angleDifference(targetYaw, racer.yaw);
    const assist = Math.abs(steerInput) < 0.1 ? difficulty.assist : difficulty.assist * 0.32;
    const assistedSteer = THREE.MathUtils.clamp(steerInput + assistError * assist, -1, 1);
    const steerRate = (1.58 + stats.handling * 0.085) * (0.2 + speedRatio * 0.8);
    racer.yaw += assistedSteer * steerRate * dt * (longitudinal >= -0.5 ? 1 : -0.55);

    // The human kart gets a small straight-line advantage so a clean drive can
    // recover from mistakes and still challenge for first place.
    const damageSpeedPenalty = 1 - racer.damage * 0.34;
    const damageAccelerationPenalty = 1 - racer.damage * 0.2;
    const maxSpeed = (30 + stats.topSpeed * 1.75) * 1.08 * damageSpeedPenalty * (boosting ? 1.28 : 1);
    const acceleration = (9.5 + stats.acceleration * 1.8) * 1.1 * damageAccelerationPenalty * (boosting ? 1.72 : 1);
    if (throttle && longitudinal < maxSpeed) racer.velocity.addScaledVector(forward, acceleration * dt * (1 - Math.max(0, longitudinal / maxSpeed) * 0.48));
    if (boosting) racer.velocity.addScaledVector(forward, acceleration * 0.78 * dt);
    if (brake) {
      if (longitudinal > 1) racer.velocity.addScaledVector(forward, -31 * dt);
      else if (longitudinal > -11) racer.velocity.addScaledVector(forward, -12 * dt);
    }

    // Tire grip rotates velocity toward the kart heading. It is strong enough to
    // feel approachable, but not so strong that powerslides disappear.
    const traction = (2.3 + stats.handling * 0.46) * (offroad ? 0.42 : 1);
    const alignedVelocity = forward.clone().multiplyScalar(racer.velocity.dot(forward));
    racer.velocity.lerp(alignedVelocity, 1 - Math.exp(-traction * dt));
    const drag = offroad ? (boosting ? 1.18 : 2.25) : (boosting ? 0.12 : 0.3) + racer.velocity.length() * 0.008;
    racer.velocity.multiplyScalar(Math.max(0, 1 - drag * dt));
    if (offroad && racer.velocity.length() > maxSpeed * 0.53) racer.velocity.setLength(maxSpeed * 0.53);

    // Track walls are forgiving: a soft inward impulse and speed loss, not a stop.
    const hardEdge = this.config.track.width * 0.93;
    if (Math.abs(nearest.offset) > hardEdge) {
      const excess = Math.abs(nearest.offset) - hardEdge;
      racer.velocity.addScaledVector(nearest.side, -Math.sign(nearest.offset) * (10 + excess * 5) * dt);
      racer.velocity.multiplyScalar(1 - Math.min(0.9, dt * 2.8));
      if (racer.bumpCooldown <= 0) {
        const wallImpact = Math.max(2, racer.speed * 0.42 + excess * 2);
        this.audio.crash(wallImpact);
        racer.damage = Math.min(1, racer.damage + Math.max(0, (wallImpact - 4) * 0.0035));
        this.shake = Math.min(0.55, 0.15 + wallImpact * 0.018);
        racer.bumpCooldown = 0.3;
      }
    }
    racer.bumpCooldown -= dt;
    racer.position.addScaledVector(racer.velocity, dt);
    racer.speed = Math.max(0, racer.velocity.dot(forward));
    racer.syncVisual(this.trackWorld, dt, assistedSteer, { throttle, brake, boost: boosting, damage: racer.damage });
    this.updateProgress(racer);
    this.checkBoostPickup();
    this.checkPowerUpPickup();
    this.emitPlayerEffects(dt, { forward, throttle, brake, boosting });
    this.audio.setEngine(racer.speed, throttle, this.countdown <= 0 && !racer.finished, racer.damage);
  }

  checkBoostPickup() {
    if (this.boostCharges >= 3) return;
    const pad = this.trackWorld.collectBoostAt(this.player.position, this.player.progress);
    if (!pad) return;
    this.boostCharges += 1;
    this.audio.tone(620, 0.18, 'triangle', 0.13, 420);
    this.flashMessage('BOOST +1', 0.75);
    this.updateBoostHud();
  }

  checkPowerUpPickup() {
    const powerUp = this.trackWorld.collectPowerUpAt(this.player.position, this.player.progress);
    if (!powerUp) return;
    if (this.player.damage > 0.08) {
      this.player.damage = Math.max(0, this.player.damage - 0.48);
      this.audio.repair();
      this.flashMessage('REPAIRED!', 0.85);
    } else {
      this.boostTimer = Math.max(this.boostTimer, 1.55);
      this.audio.boost();
      this.flashMessage('POWER BOOST!', 0.85);
    }
    this.updateDamageHud();
  }

  emitPlayerEffects(dt, { forward, throttle, brake, boosting }) {
    if (!this.effects) return;
    const rear = this.player.position.clone().addScaledVector(forward, -1.55).add(new THREE.Vector3(0, 0.28, 0));
    const wake = this.player.velocity.clone().multiplyScalar(0.16).addScaledVector(forward, -2.2);
    if (this.player.offroad && this.player.speed > 3) this.effects.emitRate('dust', rear, wake, 30 + this.player.speed * 0.45, dt, 2.1);
    if (!this.player.offroad && throttle && this.player.speed > 2 && this.player.speed < 25) this.effects.emitRate('smoke', rear, wake, 8, dt, 0.75);
    if (brake && this.player.speed > 5) this.effects.emitRate('smoke', rear, wake, 22, dt, 1.25);
    if (boosting) this.effects.emitRate('boost', rear, wake.addScaledVector(forward, -4.5), 48, dt, 0.65);
    if (this.player.damage > 0.38) {
      const hood = this.player.position.clone().addScaledVector(forward, 1.15).add(new THREE.Vector3(0, 1.05, 0));
      const drift = this.player.velocity.clone().multiplyScalar(0.12).add(new THREE.Vector3(0, 0.8, 0));
      this.effects.emitRate('damage', hood, drift, 8 + (this.player.damage - 0.38) * 34, dt, 0.72);
    }
  }

  updateAI(racer, dt, index) {
    const nearest = this.trackWorld.nearest(racer.position, racer.progress);
    const difficulty = DIFFICULTIES[this.config.difficulty];
    const lookAhead = 0.018 + Math.min(racer.speed / 1700, 0.025);
    const frame = this.trackWorld.frameAt(nearest.progress + lookAhead);
    const lane = Math.sin(this.raceTime * (0.24 + index * 0.025) + racer.aiWobble) * this.config.track.width * difficulty.error + racer.lane * this.config.track.width;
    const target = frame.point.clone().addScaledVector(frame.side, lane);
    const desiredYaw = Math.atan2(target.x - racer.position.x, target.z - racer.position.z);
    const yawError = this.angleDifference(desiredYaw, racer.yaw);
    const steer = THREE.MathUtils.clamp(yawError * 2.3, -1, 1);
    racer.yaw += steer * (1.8 + racer.car.stats.handling * 0.07) * dt;
    const forward = new THREE.Vector3(Math.sin(racer.yaw), 0, Math.cos(racer.yaw));

    const aheadTangent = this.trackWorld.frameAt(nearest.progress + 0.035).tangent;
    const curveAmount = 1 - Math.max(-1, Math.min(1, nearest.tangent.dot(aheadTangent)));
    const baseMax = 30 + racer.car.stats.topSpeed * 1.75;
    const targetSpeed = baseMax * racer.skill * (1 - racer.damage * 0.34) * (1 - Math.min(0.34, curveAmount * 4.5));
    const currentForward = racer.velocity.dot(forward);
    const accel = (9 + racer.car.stats.acceleration * 1.7) * (1 - racer.damage * 0.2);
    if (currentForward < targetSpeed) racer.velocity.addScaledVector(forward, accel * dt);
    else racer.velocity.multiplyScalar(1 - dt * 1.4);

    const traction = 2.8 + racer.car.stats.handling * 0.5;
    racer.velocity.lerp(forward.clone().multiplyScalar(racer.velocity.dot(forward)), 1 - Math.exp(-traction * dt));
    racer.velocity.multiplyScalar(1 - 0.28 * dt);
    if (Math.abs(nearest.offset) > this.config.track.width * 0.78) racer.velocity.addScaledVector(nearest.side, -Math.sign(nearest.offset) * 18 * dt);
    racer.position.addScaledVector(racer.velocity, dt);
    racer.speed = Math.max(0, racer.velocity.dot(forward));
    racer.syncVisual(this.trackWorld, dt, steer, { throttle: currentForward < targetSpeed ? 1 : 0, brake: currentForward >= targetSpeed ? 0.3 : 0, damage: racer.damage });
    this.updateProgress(racer);
  }

  handleCollisions(dt) {
    for (let i = 0; i < this.racers.length; i += 1) {
      for (let j = i + 1; j < this.racers.length; j += 1) {
        const a = this.racers[i]; const b = this.racers[j];
        const delta = new THREE.Vector3().subVectors(a.position, b.position); delta.y = 0;
        const distance = delta.length();
        if (distance < 2.15 && distance > 0.01) {
          const normal = delta.multiplyScalar(1 / distance);
          const overlap = 2.15 - distance;
          const massA = 2 + a.car.stats.weight * 0.45;
          const massB = 2 + b.car.stats.weight * 0.45;
          a.position.addScaledVector(normal, overlap * massB / (massA + massB));
          b.position.addScaledVector(normal, -overlap * massA / (massA + massB));
          const relative = new THREE.Vector3().subVectors(a.velocity, b.velocity).dot(normal);
          if (relative < 0) {
            const impactSpeed = Math.abs(relative);
            const impulse = -(1.15 * relative) / (1 / massA + 1 / massB);
            a.velocity.addScaledVector(normal, impulse / massA);
            b.velocity.addScaledVector(normal, -impulse / massB);
            if (impactSpeed > 2.5) {
              const damageBase = Math.max(0, impactSpeed - 2.5) * 0.006;
              a.damage = Math.min(1, a.damage + damageBase * (massB / (massA + massB)) * 1.45);
              b.damage = Math.min(1, b.damage + damageBase * (massA / (massA + massB)) * 1.45);
            }
            if ((a.isPlayer || b.isPlayer) && this.player.bumpCooldown <= 0) {
              this.audio.crash(impactSpeed);
              this.shake = Math.min(0.62, impactSpeed * 0.04);
              this.player.bumpCooldown = 0.22;
            }
          }
        }
      }
    }
  }

  // Tracks with `rails` (the orbital circuit) hard-clamp every kart inside the
  // guard rails — it is a very long way down. Runs after collisions so even a
  // hefty shunt can't push anyone through the barrier.
  applyRailClamp(racer) {
    const limit = this.config.track.width * 0.56;
    const nearest = this.trackWorld.nearest(racer.position, racer.progress);
    if (Math.abs(nearest.offset) <= limit) return;
    const overshoot = Math.abs(nearest.offset) - limit;
    racer.position.addScaledVector(nearest.side, -Math.sign(nearest.offset) * overshoot);
    const lateral = racer.velocity.dot(nearest.side);
    if (Math.sign(lateral) === Math.sign(nearest.offset)) {
      // Reflect the outward velocity back at ~60% — a springy rail bounce.
      racer.velocity.addScaledVector(nearest.side, -lateral * 1.6);
      if (racer.isPlayer && racer.bumpCooldown <= 0 && Math.abs(lateral) > 2) {
        this.audio.crash(Math.abs(lateral) * 0.55);
        this.shake = Math.min(0.4, 0.1 + Math.abs(lateral) * 0.012);
        racer.bumpCooldown = 0.25;
      }
    }
  }

  updateProgress(racer) {
    const nearest = this.trackWorld.nearest(racer.position, racer.progress);
    racer.previousProgress = racer.progress;
    racer.progress = nearest.progress;
    if (racer.previousProgress > 0.82 && racer.progress < 0.18 && racer.velocity.dot(nearest.tangent) > 0) {
      racer.lap += 1;
      if (racer.lap > 0 && racer.isPlayer && racer.lap < 3) { this.audio.lap(); this.flashMessage(`LAP ${racer.lap + 1}`, 1.5); }
      if (racer.lap >= this.config.track.laps && !racer.finished) this.finishRacer(racer);
    }
    // Prevent driving backward over the line from stealing a lap.
    if (racer.previousProgress < 0.18 && racer.progress > 0.82 && racer.velocity.dot(nearest.tangent) < 0) racer.lap = Math.max(-1, racer.lap - 1);
  }

  finishRacer(racer) {
    racer.finished = true;
    racer.finishPlace = this.finishers.length + 1;
    racer.finishTime = this.raceTime;
    this.finishers.push(racer);
    if (racer.isPlayer) {
      this.audio.lap();
      this.flashMessage('FINISH!', 2.2);
      this.playerFinishDelay = 2.4;
    }
  }

  raceOrder() {
    return [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishPlace - b.finishPlace;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return (b.lap + b.progress) - (a.lap + a.progress);
    });
  }

  angleDifference(target, current) {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
  }

  updateCamera(dt) {
    const forward = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    const speedFactor = Math.min(this.player.speed / 45, 1);
    const desired = this.player.position.clone().addScaledVector(forward, -8.8 - speedFactor * 3.6).add(new THREE.Vector3(0, 4.7 + speedFactor * 1.2, 0));
    this.cameraPosition.lerp(desired, 1 - Math.exp(-5.4 * dt));
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.camera.position.copy(this.cameraPosition);
    if (this.shake) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
    const lookTarget = this.player.position.clone().addScaledVector(forward, 5.5 + speedFactor * 5).add(new THREE.Vector3(0, 1.25, 0));
    this.cameraLook.lerp(lookTarget, 1 - Math.exp(-7 * dt));
    this.camera.lookAt(this.cameraLook);
    this.camera.fov = damp(this.camera.fov, 60 + speedFactor * 8, 3.5, dt);
    this.camera.updateProjectionMatrix();
  }

  flashMessage(text, duration = 1) {
    this.el.message.textContent = text;
    this.el.message.classList.add('show');
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.el.message.classList.remove('show'), duration * 1000);
  }

  updateHud() {
    const order = this.raceOrder();
    const place = order.indexOf(this.player) + 1;
    this.el.position.textContent = ordinal(place);
    this.el.lap.textContent = `LAP ${Math.min(3, Math.max(1, this.player.lap + 1))} / 3`;
    this.el.speed.textContent = Math.round(this.player.speed * 5.3);
    this.el.gear.textContent = this.player.speed < 1 ? 'N' : `${Math.min(5, Math.floor(this.player.speed / 9) + 1)}`;
    this.el.raceTime.textContent = formatTime(this.raceTime);
    this.drawMinimap();
    this.updateBoostHud();
    this.updateDamageHud();
  }

  updateDamageHud() {
    if (!this.player || !this.el.healthBar) return;
    const health = Math.round((1 - this.player.damage) * 100);
    this.el.healthBar.style.width = `${health}%`;
    this.el.healthLabel.textContent = `${health}%`;
    this.el.healthBar.classList.toggle('warning', health <= 60 && health > 30);
    this.el.healthBar.classList.toggle('critical', health <= 30);
  }

  drawMinimap() {
    if (!this.trackWorld) return;
    const ctx = this.mapCtx; const w = ctx.canvas.width; const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const points = this.trackWorld.samples.filter((_, i) => i % 6 === 0).map((sample) => sample.point);
    const xs = points.map((p) => p.x); const zs = points.map((p) => p.z);
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minZ = Math.min(...zs); const maxZ = Math.max(...zs);
    const scale = Math.min((w - 36) / (maxX - minX), (h - 26) / (maxZ - minZ));
    const tx = (x) => w / 2 + (x - (minX + maxX) / 2) * scale;
    const ty = (z) => h / 2 + (z - (minZ + maxZ) / 2) * scale;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(tx(p.x), ty(p.z)) : ctx.moveTo(tx(p.x), ty(p.z)));
    ctx.closePath(); ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(10,10,18,.5)'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
    for (const powerUp of this.trackWorld.powerUps || []) {
      if (powerUp.cooldown > 0) continue;
      const frame = this.trackWorld.frameAt(powerUp.progress);
      const point = frame.point.clone().addScaledVector(frame.side, powerUp.lane);
      ctx.beginPath(); ctx.arc(tx(point.x), ty(point.z), 3.3, 0, Math.PI * 2);
      ctx.fillStyle = '#72f1a8'; ctx.fill();
    }
    if (this.racers) this.racers.forEach((racer) => {
      ctx.beginPath(); ctx.arc(tx(racer.position.x), ty(racer.position.z), racer.isPlayer ? 5 : 3.3, 0, Math.PI * 2);
      ctx.fillStyle = racer.isPlayer ? '#ffdb4d' : '#f7f7ff'; ctx.fill();
      if (racer.isPlayer) { ctx.strokeStyle = '#171522'; ctx.lineWidth = 2; ctx.stroke(); }
    });
  }

  completeRace() {
    if (this.state !== 'racing') return;
    const order = this.raceOrder();
    // Racers still on course fill remaining places by current race position.
    order.forEach((racer, index) => { if (!racer.finishPlace) racer.finishPlace = index + 1; });
    const place = this.player.finishPlace;
    this.state = 'results';
    this.clearInput();
    this.audio.setEngine(0, 0, false);
    this.audio.stopMusic();
    this.el.resultTitle.textContent = place <= 3 ? (place === 1 ? 'Circuit champion!' : 'Podium finish!') : 'Race complete!';
    this.el.resultPlace.textContent = ordinal(place);
    this.el.resultPoints.textContent = `+${POINTS[place - 1]}`;
    this.el.resultTime.textContent = formatTime(this.player.finishTime);
    this.el.standings.innerHTML = order.map((racer, index) => `<div class="standing-row ${racer.isPlayer ? 'player' : ''}"><b>${index + 1}</b><span>${racer.name}</span><small>${racer.car.name}</small><strong>+${POINTS[index]}</strong></div>`).join('');
    this.el.results.classList.remove('hidden');
  }

  update(dt) {
    if (this.state !== 'racing') return;
    this.elapsed += dt;
    if (this.countdown > 0) {
      this.countdown -= dt;
      const tick = Math.ceil(this.countdown);
      if (tick < this.lastCountdownTick && tick > 0) { this.lastCountdownTick = tick; this.flashMessage(String(tick), 0.72); this.audio.countdown(false); }
      if (this.countdown <= 0) {
        this.flashMessage('GO!', 0.85);
        this.audio.countdown(true);
        this.audio.startMusic(this.musicTheme());
      }
    } else {
      this.raceTime += dt;
      if (!this.player.finished) this.updatePlayer(dt);
      else { this.player.velocity.multiplyScalar(1 - 1.1 * dt); this.player.position.addScaledVector(this.player.velocity, dt); this.player.syncVisual(this.trackWorld, dt, 0, { damage: this.player.damage }); }
      this.racers.slice(1).forEach((racer, index) => { if (!racer.finished) this.updateAI(racer, dt, index + 1); });
      this.handleCollisions(dt);
      if (this.config.track.rails) this.racers.forEach((racer) => this.applyRailClamp(racer));
      this.boostTimer = Math.max(0, this.boostTimer - dt);
      if (this.playerFinishDelay != null) { this.playerFinishDelay -= dt; if (this.playerFinishDelay <= 0) { this.playerFinishDelay = null; this.completeRace(); } }
    }
    this.trackWorld?.update(dt, this.elapsed);
    this.effects?.update(dt);
    this.updateCamera(dt);
    if (this.elapsed - this.lastHudUpdate > 0.045) { this.updateHud(); this.lastHudUpdate = this.elapsed; }
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.04);
    this.update(dt);
    if (this.state === 'menu' && this.trackWorld) {
      const orbit = performance.now() * 0.000035;
      const frame = this.trackWorld.frameAt(0.12);
      this.camera.position.x += Math.sin(orbit) * 0.003;
      this.camera.lookAt(frame.point.clone().add(new THREE.Vector3(0, 3, 0)));
    }
    this.renderer.render(this.scene, this.camera);
  };
}
