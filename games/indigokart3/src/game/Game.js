import * as THREE from 'three';
import { CARS, TRACKS, DIFFICULTIES, POINTS } from './content.js';
import { TrackWorld } from './Track.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { driveStep, chooseItem, advanceLap, FIXED_STEP } from './physics.js';
import { Racer, createKart, disposeKart } from './Vehicle.js';
import { resolveCarCollision, resolveBarrier } from './collisions.js';
import { aiInput } from './ai.js';
import { Weather } from './Weather.js';
import { GameAudio } from './audio.js';
import { KartEffects } from './Effects.js';
import { damp, formatTime, ordinal } from './utils.js';



const CONTROL_KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'drift', ShiftRight: 'drift',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

export class Game {
  constructor(root) {
    this.root = root;
    this.config = { car: CARS[0], track: TRACKS[0], difficulty: 'normal' };
    this.state = 'menu';
    this.menuStep = 0;
    this.audio = new GameAudio();
    this.input = { up: false, down: false, left: false, right: false, drift: false };
    this.accumulator = 0;
    this.item = null;
    this.driftCharge = 0;
    this.quality = 'high';
    this.gamepadPrevious = [];
    this.bestTimes = {};
    try {
      const saved = JSON.parse(localStorage.getItem('indigokart3:records') || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) this.bestTimes = Object.fromEntries(Object.entries(saved).filter(([,v])=>Number.isFinite(v) && v>0));
    } catch {}
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
          <header class="wizard-top"><a class="wizard-brand" href="/arcade/">↖ Arcade</a><span id="step-count">THE GOOD KIND OF CHAOS</span><div><button id="quality" class="text-button">HIGH GRAPHICS</button><button id="menu-sound" class="icon-button" aria-label="Toggle sound">♫</button></div></header>
          <main class="wizard-body">
            <section data-step="0" class="wizard-step welcome"><p class="eyebrow">FOUR FRIENDS. OPEN ROAD.</p><h1 class="wordmark">INDIGO<span>KART</span><b>3</b></h1><p class="wizard-intro">Big roads. Big personalities.<br>Your next great race starts here.</p><button id="play" class="start-button">Play <span>→</span></button></section>
            <section data-step="1" class="wizard-step hidden"><p class="eyebrow">01 / YOUR DRIVER</p><h2>Choose your car.</h2><p class="wizard-intro">Four different ways to find your flow.</p><div class="car-picker" id="car-picker"></div><div id="driver-detail" class="driver-detail"></div></section>
            <section data-step="2" class="wizard-step hidden"><p class="eyebrow">02 / YOUR DESTINATION</p><h2>Choose your track.</h2><p class="wizard-intro">Room to race. A view worth chasing.</p><div class="track-picker" id="track-picker"></div></section>
            <section data-step="3" class="wizard-step hidden"><p class="eyebrow">03 / YOUR PACE</p><h2>How do you race?</h2><p class="wizard-intro">Same open road. Your kind of challenge.</p><div class="difficulty-picker" id="difficulty-picker"></div></section>
            <section data-step="4" class="wizard-step hidden"><p class="eyebrow">READY WHEN YOU ARE</p><h2>Make it a great race.</h2><div id="race-summary"></div><button id="start-race" class="start-button">Let’s race <span>↗</span></button><p id="best-time"></p></section>
          </main>
          <aside class="wizard-caption"><strong id="showcase-name"></strong><p id="showcase-tagline"></p></aside>
          <footer class="wizard-bottom"><button id="menu-back" class="secondary-button hidden">← Back</button><button id="how-to" class="text-button">How to play ↗</button><span>Keyboard · Touch · Controller</span></footer>
        </section>
        <section id="hud" class="hud hidden">
          <div class="hud-top">
            <div class="position-box"><strong id="position">1st</strong><span>/ 4</span></div>
            <div class="race-meta"><span id="hud-track">SUNSET COVE</span><strong id="lap">LAP 1 / 3</strong></div>
            <div class="time-box"><span>TIME</span><strong id="race-time">0:00.00</strong></div>
          </div>
          <canvas id="minimap" class="minimap" width="220" height="170"></canvas>
          <div class="speedometer"><div class="speed-ring"><strong id="speed">0</strong><span>KM/H</span></div><div id="gear">N</div></div>
          <button id="boost-button" class="boost-button" aria-label="Use boost"><span>BOOST</span><strong>SPACE</strong><i id="boost-charges"><b></b><b></b><b></b></i></button>
          <div class="damage-meter"><span>CAR HEALTH</span><i><b id="health-bar"></b></i><strong id="health-label">100%</strong></div>
          <div id="race-message" class="race-message" aria-live="polite"></div>
          <button id="item-button" class="item-button" aria-label="Use collected item"><span id="item-name">NO ITEM</span><kbd>X</kbd></button>
          <div class="drift-meter"><span id="drift-label">HOLD SHIFT + STEER TO DRIFT</span><i><b id="drift-fill"></b></i></div>
          <button class="recover-button" id="recover">↻ RESET CAR <kbd>R</kbd></button>
          <button data-control="drift" class="touch-drift">DRIFT</button>
          <button id="pause-button" class="hud-button pause-button" aria-label="Pause">Ⅱ</button>
          <button id="sound-button" class="hud-button sound-button" aria-label="Toggle sound">♫</button>
          <div class="touch-controls">
            <div class="touch-steer"><button data-control="left" aria-label="Steer left">←</button><button data-control="right" aria-label="Steer right">→</button></div>
            <div class="touch-pedals"><button data-control="down" aria-label="Brake">▼</button><button class="go" data-control="up" aria-label="Accelerate">▲</button></div>
          </div>
        </section>
        <section id="help" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="help-title"><div class="overlay-card"><p class="eyebrow">A QUICK PIT STOP</p><h2 id="help-title">Find your flow.</h2><div class="help-copy"><p><b>Drive</b> with WASD / arrows. Down brakes, then reverses. Controller: left stick + RT / LT.</p><p><b>Drift</b> with Shift while steering at speed. Release a charged drift for a mini-turbo. Controller: B.</p><p><b>Boost</b> with Space (controller A). Glowing road pads recharge your three boost slots.</p><p><b>Items</b> come from floating pickups. X (controller X) uses your shield, repair, turbo or nearby shockwave.</p><p><b>R</b> resets your car with a time penalty. Escape / Start pauses. Touch controls appear on tablets.</p></div><button id="close-help" class="start-button">GOT IT ↗</button></div></section>
        <section id="pause" class="overlay hidden"><div class="overlay-card"><p class="eyebrow">RACE PAUSED</p><h2>Catch your breath.</h2><div class="audio-settings"><label>Music <input id="music-volume" type="range" min="0" max="1" step=".05" value=".38"></label><label>Engines & effects <input id="effects-volume" type="range" min="0" max="1" step=".05" value=".8"></label></div><button id="resume" class="start-button">RESUME</button><button class="secondary-button" data-action="menu">QUIT TO MENU</button></div></section>
        <section id="results" class="overlay hidden"><div class="overlay-card results-card"><p class="eyebrow">RACE COMPLETE</p><h2 id="result-title">Podium finish!</h2><div class="result-summary"><div><span>FINISH</span><strong id="result-place">1st</strong></div><div><span>POINTS</span><strong id="result-points">+12</strong></div><div><span>TIME</span><strong id="result-time">0:00.00</strong></div></div><div id="standings" class="standings"></div><button id="race-again" class="start-button">RACE AGAIN</button><button class="secondary-button" data-action="menu">CHANGE SETUP</button></div></section>
      </div>`;

    this.cacheElements();
    this.renderMenuOptions();
    this.setMenuStep(0);
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
    this.el.carPicker.innerHTML = CARS.map((car, i) => `
      <button class="car-card ${car.id === this.config.car.id ? 'selected' : ''}" aria-pressed="${car.id === this.config.car.id}" data-car="${car.id}" style="--car:#${car.color.toString(16).padStart(6,'0')}">
        <span class="driver-number">0${i+1}</span><span class="driver-avatar">${car.driver[0]}</span><strong>${car.driver}</strong><small>${car.kind === 'truck' ? 'TRAIL TRUCK' : car.kind === 'tank' ? 'CYBER TANK' : 'TESLA'}</small>
      </button>`).join('');
    const car = this.config.car;
    this.root.querySelector('#driver-detail').textContent = car.tagline;
    this.root.querySelector('#showcase-name').textContent = car.name;
    this.root.querySelector('#showcase-tagline').textContent = car.tagline;
    this.el.trackPicker.innerHTML = TRACKS.map((track) => {
      const xs = track.points.map(p=>p[0]), zs = track.points.map(p=>p[2]);
      const minX=Math.min(...xs), minZ=Math.min(...zs), width=Math.max(...xs)-minX, height=Math.max(...zs)-minZ;
      const path=track.points.map((p,i)=>`${i?'L':'M'}${12+(p[0]-minX)/width*76},${8+(p[2]-minZ)/height*40}`).join(' ')+' Z';
      return `<button class="track-card ${track.id === this.config.track.id ? 'selected' : ''}" aria-pressed="${track.id === this.config.track.id}" data-track="${track.id}"><svg class="circuit-map" viewBox="0 0 100 58" aria-hidden="true"><path d="${path}" /></svg><div><span>${track.laps} LAPS · ${track.width} m WIDE</span><strong>${track.name}</strong><small>${track.description}</small></div></button>`;
    }).join('');
    this.el.difficultyPicker.innerHTML = Object.entries(DIFFICULTIES).map(([id, value]) => `<button class="difficulty ${id === this.config.difficulty ? 'selected' : ''}" aria-pressed="${id === this.config.difficulty}" data-difficulty="${id}"><strong>${value.label}</strong><span>${value.description}</span></button>`).join('');
    const best = this.bestTimes[this.recordKey()];
    this.root.querySelector('#best-time').textContent = best ? `PERSONAL BEST  /  ${formatTime(best)}` : 'Two laps. Four friends. Let’s go.';
    this.root.querySelector('#race-summary').innerHTML = `<p><span>Driver</span><strong>${car.driver} · ${car.name}</strong></p><p><span>Track</span><strong>${this.config.track.name}</strong></p><p><span>Challenge</span><strong>${DIFFICULTIES[this.config.difficulty].label}</strong></p>`;
  }

  setMenuStep(step) {
    this.menuStep=Math.max(0,Math.min(4,step));
    this.root.querySelectorAll('[data-step]').forEach(panel=>panel.classList.toggle('hidden',Number(panel.dataset.step)!==this.menuStep));
    this.root.querySelector('#menu-back').classList.toggle('hidden',this.menuStep===0);
    this.root.querySelector('#step-count').textContent=['THE GOOD KIND OF CHAOS','CHOOSE CAR','CHOOSE TRACK','CHOOSE PACE','LET’S RACE'][this.menuStep];
    this.el.menu.dataset.currentStep=this.menuStep;
    this.root.querySelector(`[data-step="${this.menuStep}"] button`)?.focus({preventScroll:true});
    this.el.menu.scrollTop=0;
  }

  advanceMenu() {
    if(this.menuStep===4) this.startRace();
    else this.setMenuStep(this.menuStep+1);
  }

  recordKey() { return `${this.config.track.id}:${this.config.car.id}:${this.config.difficulty}`; }

  statRow(label, value) {
    return `<span>${label}</span><i><b style="width:${value * 10}%"></b></i>`;
  }

  bindEvents() {
    this.root.addEventListener('click', (event) => {
      const carButton = event.target.closest('[data-car]');
      const trackButton = event.target.closest('[data-track]');
      const difficultyButton = event.target.closest('[data-difficulty]');
      if (carButton) { this.config.car = CARS.find((car) => car.id === carButton.dataset.car); this.renderMenuOptions(); this.updateShowcase(); this.playUiTone(); this.setMenuStep(2); }
      if (trackButton) { this.config.track = TRACKS.find((track) => track.id === trackButton.dataset.track); this.renderMenuOptions(); this.renderMenuBackdrop(); this.playUiTone(); this.setMenuStep(3); }
      if (difficultyButton) { this.config.difficulty = difficultyButton.dataset.difficulty; this.renderMenuOptions(); this.playUiTone(); this.setMenuStep(4); }
      if (event.target.closest('#play')) { this.playUiTone(); this.setMenuStep(1); }
      if (event.target.closest('#menu-back')) this.setMenuStep(this.menuStep-1);
      if (event.target.closest('#start-race')) this.startRace();
      if (event.target.closest('#pause-button') || event.target.closest('#resume')) this.togglePause();
      if (event.target.closest('#race-again')) this.startRace();
      if (event.target.closest('[data-action="menu"]')) this.showMenu();
      if (event.target.closest('#sound-button') || event.target.closest('#menu-sound')) this.toggleSound();
      if (event.target.closest('#boost-button')) this.activateBoost();
      if (event.target.closest('#item-button')) this.activateItem();
      if (event.target.closest('#recover')) this.recover();
      if (event.target.closest('#how-to')) { this.root.querySelector('#help').classList.remove('hidden'); this.root.querySelector('#close-help').focus(); }
      if (event.target.closest('#close-help')) { this.root.querySelector('#help').classList.add('hidden'); this.root.querySelector('#how-to').focus(); }
      if (event.target.closest('#quality')) this.toggleQuality();
    });

    this.root.querySelector('#music-volume').addEventListener('input',e=>this.audio.setVolume('music',Number(e.target.value)));
    this.root.querySelector('#effects-volume').addEventListener('input',e=>this.audio.setVolume('effects',Number(e.target.value)));
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && !this.root.querySelector('#help').classList.contains('hidden')) { this.root.querySelector('#help').classList.add('hidden'); this.root.querySelector('#how-to').focus(); return; }
      if (CONTROL_KEYS[event.code] && this.state === 'racing') { this.input[CONTROL_KEYS[event.code]] = true; event.preventDefault(); }
      if (event.code === 'Enter' && this.state === 'menu' && this.root.querySelector('#help').classList.contains('hidden') && !event.target.closest('button,a')) this.advanceMenu();
      if (event.code === 'KeyX' && !event.repeat) this.activateItem();
      if (event.code === 'KeyR' && !event.repeat) this.recover();
      if (event.code === 'Space' && this.state === 'racing') { event.preventDefault(); if (!event.repeat) this.activateBoost(); }
      if (!event.repeat && (event.code === 'KeyP' || event.code === 'Escape') && (this.state === 'racing' || this.state === 'paused')) this.togglePause();
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
      button.addEventListener('lostpointercapture', off);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'racing') this.togglePause(); });
    window.addEventListener('resize', () => this.resize());
  }

  initRenderer() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(61, 1, 0.1, 3200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.el.scene.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, .04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = .4;
    room.dispose(); pmrem.dispose();
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1,1), .22, .45, 1.1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.resize();
  }

  toggleQuality() {
    this.quality = this.quality === 'high' ? 'balanced' : 'high';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 1.5 : 1));
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.root.querySelector('#quality').textContent = `${this.quality.toUpperCase()} GRAPHICS`;
    this.resize();
  }

  resize() {
    const width = this.el.scene.clientWidth || window.innerWidth;
    const height = this.el.scene.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
  }

  clearWorld() {
    this.weather?.dispose(); this.weather=null;
    this.effects?.dispose();
    this.effects = null;
    this.trackWorld?.dispose();
    this.trackWorld = null;
    if (this.racers) this.racers.forEach((racer) => disposeKart(racer.mesh));
    this.racers = [];
    if (this.showcase) { disposeKart(this.showcase); this.showcase = null; }
    while (this.scene.children.length) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      if (child !== this.trackWorld?.group) child.traverse?.((node) => { node.geometry?.dispose?.(); if (node.isLight) node.dispose?.(); if (node.material && !Array.isArray(node.material)) node.material.dispose?.(); });
    }
  }

  setupWorld(trackData, preview = false) {
    this.clearWorld();
    this.scene.background = new THREE.Color(trackData.palette.sky);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(2600,24,16), new THREE.ShaderMaterial({
      side:THREE.BackSide, depthWrite:false,
      uniforms:{ top:{value:new THREE.Color(trackData.time === 'night' ? 0x080f28 : 0x4d91af)}, horizon:{value:new THREE.Color(trackData.palette.fog)} },
      vertexShader:'varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader:'uniform vec3 top; uniform vec3 horizon; varying vec3 vPos; void main(){float h=clamp(normalize(vPos).y*2.,0.,1.); gl_FragColor=vec4(mix(horizon,top,pow(h,.65)),1.); #include <tonemapping_fragment>\n #include <colorspace_fragment> }',
    }));
    sky.material.fragmentShader = sky.material.fragmentShader.replace('; #include',';\n #include');
    this.scene.add(sky);

    // Lighting rigs per time of day. 'space' keeps fog near zero so the
    // starfield and station stay crisp at distance.
    const rigs = {
      sunset: { hemiSky: 0xffe4cf, hemiIntensity: 1.6, sunColor: 0xffd0a3, sunIntensity: 2.8, sunPosition: [-95, 55, -60], fog: 0.0046 },
      night: { hemiSky: 0x6e77ff, hemiIntensity: 1.3, sunColor: 0x9aa6ff, sunIntensity: 2.2, sunPosition: [-70, 90, -60], fog: 0.0065 },
      day: { hemiSky: 0xdfefff, hemiIntensity: 2.3, sunColor: 0xfff1d6, sunIntensity: 3.6, sunPosition: [-65, 100, -40], fog: 0.0036 },
      space: { hemiSky: 0x4a5a9e, hemiIntensity: 0.9, sunColor: 0xcfd8ff, sunIntensity: 2.5, sunPosition: [-60, 115, -85], fog: 0.001 },
    };
    const rig = rigs[trackData.time] || rigs.sunset;
    this.scene.fog = new THREE.FogExp2(trackData.palette.fog, rig.fog*.25);
    this.trackWorld = new TrackWorld(this.scene, trackData);
    this.weather = new Weather(this.scene,this.trackWorld);

    const hemi = new THREE.HemisphereLight(rig.hemiSky, trackData.palette.ground, rig.hemiIntensity);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(rig.sunColor, rig.sunIntensity);
    sun.position.set(...rig.sunPosition);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.normalBias = .045;
    sun.shadow.bias = -.00015;
    this.sun = sun;
    this.scene.add(sun.target);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -38;
    sun.shadow.camera.right = sun.shadow.camera.top = 38;
    sun.shadow.camera.far = 260;
    this.scene.add(sun);

    if (trackData.time === 'sunset') {
      const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(70, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffe7a1 }));
      sunDisc.position.set(-1200, 320, -1800);
      this.scene.add(sunDisc);
    }
  }

  renderMenuBackdrop() {
    this.el.menu.classList.toggle('night', this.config.track.time === 'night');
    this.setupWorld(this.config.track, true);
    this.updateShowcase();
  }

  updateShowcase() {
    if (this.showcase) disposeKart(this.showcase);
    this.showcase = createKart(this.config.car, this.config.car.accent, this.config.track.time === 'night');
    const frame = this.trackWorld.frameAt(.14);
    this.showcase.position.copy(frame.point);
    this.showcase.position.y += .05;
    this.showcase.rotation.y = Math.atan2(frame.tangent.x, frame.tangent.z) + .15;
    this.scene.add(this.showcase);
    this.menuFrame = frame;
  }

  updateMenu(dt) {
    const f = this.menuFrame;
    if (!f) return;
    const orbit = Math.sin(performance.now() * .00015) * .25;
    const forward = f.tangent.clone(); forward.y = 0; forward.normalize();
    const desired = f.point.clone().addScaledVector(forward, 8.4 + orbit).addScaledVector(f.side, 7.8).add(new THREE.Vector3(0,4.1,0));
    this.camera.position.copy(desired);
    const target = f.point.clone().add(new THREE.Vector3(0,.85,0));
    // Shift the vehicle into the open right side of the menu.
    const viewRight = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(target,desired).normalize(), new THREE.Vector3(0,1,0));
    if (window.innerWidth > 850) target.addScaledVector(viewRight, -3.4);
    this.camera.fov = 44; this.camera.updateProjectionMatrix(); this.camera.lookAt(target);
    this.showcase.userData.head.rotation.y = Math.sin(performance.now()*.0006)*.15;
    this.trackWorld.update(dt, performance.now()/1000);
    this.updateSun(target);
  }

  updateSun(target) {
    if (!this.sun) return;
    this.sun.position.copy(target).add(new THREE.Vector3(-40,65,-35));
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
  }

  startRace() {
    clearTimeout(this.messageTimer); this.el.message.classList.remove('show');
    this.audio.start();
    this.audio.stopMusic();
    this.audio.profile = this.config.car.physics.sound;
    this.clearInput();
    this.setupWorld(this.config.track);
    this.finishers = [];
    this.elapsed = 0;
    this.raceTime = 0;
    this.countdown = 3.6;
    this.lastCountdownTick = 4;
    this.boostCharges = 0;
    this.boostTimer = 0;
    this.item = null; this.driftCharge = 0; this.wasDrifting = false; this.pulseTime = 0;
    this.playerFinishDelay = null; this.lastHudUpdate = 0; this.accumulator = 0;
    this.state = 'racing';
    this.el.menu.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.results.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.hudTrack.textContent = this.config.track.name.toUpperCase();

    const difficulty = DIFFICULTIES[this.config.difficulty];
    this.racers = [];
    const lightsOn = this.config.track.time === 'night' || this.config.track.time === 'space';
    const player = new Racer({ name: this.config.car.driver, car: this.config.car, color: 0xffffff, isPlayer: true, skill: 1, lane: -0.2, lightsOn });
    this.racers.push(player);
    CARS.filter(car => car.id !== this.config.car.id).forEach((car, i) => {
      this.racers.push(new Racer({ name: car.driver, car, color: car.accent, skill: difficulty.pace + (i - 1) * .018, lane: i % 2 === 0 ? .2 : -.2, lightsOn }));
    });
    this.racers.forEach((racer, index) => { racer.reset(this.trackWorld, index); racer.lap = -1; this.scene.add(racer.mesh); });
    this.player = player;
    this.audio.prepare(this.racers);
    this.effects = new KartEffects(this.scene, this.config.track);
    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    this.cameraPosition.copy(player.position).addScaledVector(forward, -10).add(new THREE.Vector3(0, 5.5, 0));
    this.camera.position.copy(this.cameraPosition);
    this.cameraLook.copy(player.position);
    this.drawMinimap();
    this.updateBoostHud();
    this.updateDamageHud();
    this.updateItemHud();
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
    this.flashMessage('TURBO!', 0.65, 'boost');
    this.el.boostButton?.classList.add('fired');
    setTimeout(() => this.el.boostButton?.classList.remove('fired'), 420);
    this.shake = 0.22;
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
    clearTimeout(this.messageTimer); this.el.message.classList.remove('show');
    this.state = 'menu';
    this.el.menu.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.results.classList.add('hidden');
    this.audio.setEngine(0, 0, false);
    this.audio.stopMusic();
    this.renderMenuOptions();
    this.setMenuStep(0);
    this.renderMenuBackdrop();
  }

  updatePlayer(dt) {
    const racer = this.player;
    const difficulty = DIFFICULTIES[this.config.difficulty];
    const nearest = this.trackWorld.nearest(racer.position, racer.progress);
    const forward = new THREE.Vector3(Math.sin(racer.yaw), 0, Math.cos(racer.yaw));
    const steerInput = (this.input.left ? 1 : 0) - (this.input.right ? 1 : 0);
    const throttle = this.input.up ? 1 : 0;
    const brake = this.input.down ? 1 : 0;
    const boosting = this.boostTimer > 0;
    const offroad = Math.abs(nearest.offset) > this.config.track.width * .53;
    const targetYaw = Math.atan2(nearest.tangent.x, nearest.tangent.z);
    const assistError = this.angleDifference(targetYaw, racer.yaw);
    const assist = Math.abs(steerInput) < .1 ? difficulty.assist : difficulty.assist * .15;
    const assistedSteer = THREE.MathUtils.clamp(steerInput + assistError * assist, -1, 1);
    const { drifting } = driveStep(racer, { steer: assistedSteer, throttle, brake, boost: boosting, drift: this.input.drift }, { offroad, slope: nearest.tangent.y, wetness: this.weather?.wetness || 0, loose: this.config.track.road?.style === 'dirt' }, dt);
    if (drifting) {
      this.driftCharge = Math.min(2, this.driftCharge + dt);
    } else if (this.wasDrifting) {
      if (this.driftCharge >= .7 && !offroad) {
        this.boostTimer = Math.max(this.boostTimer, this.driftCharge >= 1.6 ? 1.35 : .65);
        this.audio.boost(); this.flashMessage(this.driftCharge >= 1.6 ? 'SUPER DRIFT' : 'MINI TURBO', .75, 'boost');
      }
      this.driftCharge = 0;
    }
    this.wasDrifting = drifting;
    if (drifting) this.effects?.emitRate('boost', racer.position.clone().add(new THREE.Vector3(0,.2,0)), racer.velocity.clone().multiplyScalar(-.2), 14, dt, .4);
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
    this.audio.itemPickup();
    this.flashMessage(this.boostCharges >= 3 ? 'BOOST MAX!' : 'BOOST +1', 0.85, 'item');
    this.el.boostButton?.classList.add('pickup-pop');
    setTimeout(() => this.el.boostButton?.classList.remove('pickup-pop'), 380);
    this.shake = Math.max(this.shake, 0.08);
    this.updateBoostHud();
  }

  checkPowerUpPickup() {
    if (this.item) return;
    const powerUp = this.trackWorld.collectPowerUpAt(this.player.position, this.player.progress);
    if (!powerUp) return;
    this.item = chooseItem(this.raceOrder().indexOf(this.player)+1, this.player.damage);
    this.audio.itemPickup();
    this.flashMessage(`${this.item.toUpperCase()} READY`, .8, 'item');
    this.updateItemHud();
  }

  updateItemHud() {
    this.root.querySelector('#item-name').textContent = this.item ? this.item.toUpperCase() : 'NO ITEM';
    this.root.querySelector('#item-button').classList.toggle('armed', !!this.item);
  }

  activateItem() {
    if (this.state !== 'racing' || this.countdown > 0 || this.player.finished || !this.item) return;
    const item = this.item; this.item = null;
    if (item === 'shield') this.player.shieldTimer = 6;
    if (item === 'repair') { this.player.damage = Math.max(0, this.player.damage - .65); this.audio.repair(); }
    if (item === 'turbo') { this.boostTimer = 2.2; this.audio.boost(); }
    if (item === 'pulse') {
      this.racers.filter(r => r !== this.player && r.position.distanceTo(this.player.position) < 20).forEach(r => {
        const normal = r.position.clone().sub(this.player.position); normal.y = 0;
        r.velocity.multiplyScalar(.5).addScaledVector(normal.normalize(), 7);
      });
      this.pulseTime = .6;
      this.audio.crash(12);
    }
    this.flashMessage(item === 'pulse' ? 'SHOCKWAVE!' : `${item.toUpperCase()}!`, .8, 'item');
    this.updateItemHud(); this.updateDamageHud();
  }

  recover() {
    if (this.state !== 'racing' || this.countdown > 0 || this.player.finished) return;
    const frame = this.trackWorld.frameAt(this.player.progress);
    this.player.position.copy(frame.point); this.player.velocity.set(0,0,0); this.player.speed = 0;
    this.player.yaw = Math.atan2(frame.tangent.x, frame.tangent.z);
    this.player.angularVelocity=0; this.player.crashTimer=0;
    this.raceTime += 3; this.clearInput(); this.driftCharge = 0;
    this.flashMessage('BACK ON TRACK +3s', 1);
  }

  emitPlayerEffects(dt, { forward, throttle, brake, boosting }) {
    if (!this.effects) return;
    const rear = this.player.position.clone().addScaledVector(forward, -1.55).add(new THREE.Vector3(0, 0.28, 0));
    const wake = this.player.velocity.clone().multiplyScalar(0.16).addScaledVector(forward, -2.2);
    if ((this.player.offroad || this.config.track.road?.style === 'dirt') && this.player.speed > 3) this.effects.emitRate('dust', rear, wake, 30 + this.player.speed * 0.45, dt, 2.1);
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
    const {nearest,steer,throttle,brake}=aiInput(racer,this.trackWorld,DIFFICULTIES[this.config.difficulty],this.raceTime,index,this.racers);
    driveStep(racer, { steer, throttle, brake, drift: false, boost: false }, {
      offroad: Math.abs(nearest.offset) > this.config.track.width * .53,
      slope: nearest.tangent.y, wetness: this.weather?.wetness || 0, loose: this.config.track.road?.style === 'dirt',
    }, dt);
    racer.syncVisual(this.trackWorld, dt, steer, { throttle, brake, damage: racer.damage });
    this.updateProgress(racer);
  }

  handleCollisions(dt) {
    this.racers.forEach(r=>{r.bumpCooldown=Math.max(0,r.bumpCooldown-dt);});
    const impact=(hit,r)=>{
      if(!hit || hit.speed<2 || r.bumpCooldown>0) return;
      this.audio.crash(hit.speed,hit.point);
      this.effects?.sparks.spawn(hit.point.clone().add(new THREE.Vector3(0,.55,0)),hit.normal.clone().multiplyScalar(3),Math.min(24,Math.ceil(hit.speed)),8);
      if(r.isPlayer)this.shake=Math.min(.55,hit.speed*.025);
      r.bumpCooldown=.2;
    };
    for(let i=0;i<this.racers.length;i++) for(let j=i+1;j<this.racers.length;j++) {
      const a=this.racers[i],b=this.racers[j];
      impact(resolveCarCollision(a,b),a.isPlayer?a:b);
    }
    for(const r of this.racers) {
      if(this.config.track.barrierScale) impact(resolveBarrier(r,this.trackWorld.nearest(r.position),this.config.track.width*this.config.track.barrierScale),r);
      r.mesh.position.copy(r.position);
    }
  }

  updateProgress(racer) {
    const nearest = this.trackWorld.nearest(racer.position, racer.progress);
    const crossed = advanceLap(racer, nearest.progress, racer.velocity.dot(nearest.tangent) > 0);
    if (crossed) {
      if (racer.lap > 0 && racer.isPlayer && racer.lap < this.config.track.laps) { this.audio.lap(); this.flashMessage(`LAP ${racer.lap+1}`, 1.2); }
      if (racer.lap >= this.config.track.laps && !racer.finished) this.finishRacer(racer);
    }
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
      // Signed progress also keeps the live ranking honest when reversing over the line.
      return b.routeDistance - a.routeDistance;
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

  flashMessage(text, duration = 1, kind = '') {
    this.el.message.textContent = text;
    this.el.message.classList.remove('msg-boost', 'msg-item', 'msg-repair');
    if (kind) this.el.message.classList.add(`msg-${kind}`);
    this.el.message.classList.add('show');
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      this.el.message.classList.remove('show', 'msg-boost', 'msg-item', 'msg-repair');
    }, duration * 1000);
  }

  updateHud() {
    const order = this.raceOrder();
    const place = order.indexOf(this.player) + 1;
    this.el.position.textContent = ordinal(place);
    this.el.lap.textContent = `LAP ${Math.min(this.config.track.laps, Math.max(1, this.player.lap + 1))} / ${this.config.track.laps}`;
    this.el.speed.textContent = Math.round(this.player.speed * 3.6);
    this.el.gear.textContent = this.player.speed < 1 ? 'N' : `${Math.min(5, Math.floor(this.player.speed / 9) + 1)}`;
    this.el.raceTime.textContent = formatTime(this.raceTime);
    this.drawMinimap();
    this.updateBoostHud();
    this.updateDamageHud();
    this.root.querySelector('#drift-fill').style.width = `${this.driftCharge / 2 * 100}%`;
    this.root.querySelector('#drift-label').textContent = this.player.shieldTimer > 0 ? `SHIELD / ${Math.ceil(this.player.shieldTimer)}s` : this.driftCharge >= .7 ? 'RELEASE DRIFT FOR TURBO' : 'HOLD SHIFT + STEER TO DRIFT';
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
    const key = this.recordKey();
    if (!this.bestTimes[key] || this.player.finishTime < this.bestTimes[key]) {
      this.bestTimes[key] = this.player.finishTime;
      try { localStorage.setItem('indigokart3:records', JSON.stringify(this.bestTimes)); } catch {}
    }
    this.el.results.classList.remove('hidden');
    this.root.querySelector('#race-again').focus();
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
      else { this.player.velocity.multiplyScalar(1 - 1.1 * dt); this.player.speed = this.player.velocity.length(); this.player.position.addScaledVector(this.player.velocity, dt); this.player.syncVisual(this.trackWorld, dt, 0, { damage: this.player.damage }); }
      this.racers.slice(1).forEach((racer, index) => { if (!racer.finished) this.updateAI(racer, dt, index + 1); });
      this.handleCollisions(dt);
      this.boostTimer = Math.max(0, this.boostTimer - dt);
      if (this.playerFinishDelay != null) { this.playerFinishDelay -= dt; if (this.playerFinishDelay <= 0) { this.playerFinishDelay = null; this.completeRace(); } }
    }
    this.trackWorld?.update(dt, this.elapsed);
    this.effects?.update(dt);
    this.racers.forEach(r => { r.shieldTimer = Math.max(0, (r.shieldTimer || 0) - dt); });
    this.updateCamera(dt);
    this.updateSun(this.player.position);
    if (this.elapsed - this.lastHudUpdate > 0.045) { this.updateHud(); this.lastHudUpdate = this.elapsed; }
  }

  pollGamepad() {
    const pads = navigator.getGamepads?.() || [];
    const pad = Array.from(pads).find(Boolean);
    if (!pad) { if (this.hadGamepad) this.clearInput(); this.hadGamepad = false; return; }
    this.hadGamepad = true;
    const pressed = pad.buttons.map(b=>b.pressed);
    const edge = i => pressed[i] && !this.gamepadPrevious[i];
    if (!this.root.querySelector('#help').classList.contains('hidden')) {
      if (edge(0) || edge(1) || edge(9)) { this.root.querySelector('#help').classList.add('hidden'); this.root.querySelector('#how-to').focus(); }
      this.gamepadPrevious = pressed; return;
    }
    if (this.state === 'menu') {
      const choices=[...this.root.querySelectorAll(`[data-step="${this.menuStep}"] button`)];
      if(edge(14)||edge(15)||edge(12)||edge(13)) {
        const index=choices.indexOf(document.activeElement),delta=edge(15)||edge(13)?1:-1;
        choices[(index+delta+choices.length)%choices.length]?.focus();
      }
      if(edge(1))this.setMenuStep(this.menuStep-1);
      if(edge(0)||edge(9)) { const focused=choices.includes(document.activeElement)?document.activeElement:choices[0]; focused?.click(); }

    } else {
      if (edge(9)) this.togglePause();
      if (edge(0)) this.activateBoost();
      if (edge(2)) this.activateItem();
      if (edge(3)) this.recover();
      this.input.left = (pad.axes[0] || 0) < -.2 || pressed[14];
      this.input.right = (pad.axes[0] || 0) > .2 || pressed[15];
      this.input.up = (pad.buttons[7]?.value || 0) > .15 || pressed[12];
      this.input.down = (pad.buttons[6]?.value || 0) > .15 || pressed[13];
      this.input.drift = pressed[1];
      if (this.state === 'results' && edge(0)) this.startRace();
    }
    this.gamepadPrevious = pressed;
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), .1);
    this.pollGamepad();
    this.accumulator += dt;
    while (this.accumulator >= FIXED_STEP) { this.update(FIXED_STEP); this.accumulator -= FIXED_STEP; }
    if (this.state === 'menu' && this.trackWorld) this.updateMenu(dt);
    if (this.pulseTime > 0 && this.player) {
      this.pulseTime -= dt;
      const shield = this.player.mesh.userData.shield;
      shield.visible = true; shield.scale.setScalar(1 + (1-this.pulseTime/.6)*6);
      if (this.pulseTime <= 0) { shield.scale.setScalar(1); shield.visible = false; }
    }
    const active=this.state==='racing';
    if(this.weather && this.state!=='paused')this.weather.update(dt,this.elapsed+performance.now()*.0001,this.racers?.length?this.player.position:this.menuFrame.point,this.sun);
    this.audio.update(this.racers,this.player,this.camera,this.weather,active);
    if(active && this.countdown<=0)this.effects.updateTires(this.racers,this.trackWorld);
    if(active && this.countdown<=0) this.racers.forEach(r=>{
      const rear=r.position.clone().add(new THREE.Vector3(-Math.sin(r.yaw)*1.7,.18,-Math.cos(r.yaw)*1.7));
      if(this.weather.wetness>.2 && r.speed>5)this.effects.emitRate('spray',rear,r.velocity.clone().multiplyScalar(.3),r.speed*.6,dt,2);
      if(!r.isPlayer && r.speed>8 && r.slip>.15)this.effects.emitRate('smoke',rear,r.velocity.clone().multiplyScalar(.15),20,dt,1);
    });
    this.bloom.enabled = this.quality === 'high';
    this.composer.render();
  };
}
