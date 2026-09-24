import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GameSound } from './sound.js';
import './style.css';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.20;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6d7ae);
scene.fog = new THREE.Fog(0xb6d7ae, 31, 78);
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .1, 110);
camera.position.set(13, 13, 14);
camera.lookAt(0, 1, -2);

scene.add(new THREE.HemisphereLight(0xeaffcf, 0x617554, 1.6));
const sun = new THREE.DirectionalLight(0xffedba, 2.0);
sun.position.set(-10, 24, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 65;
sun.shadow.bias = -.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xc9e9ca, .5);
fill.position.set(15, 10, -14);
scene.add(fill);

const ui = {
  start: document.getElementById('start-screen'),
  end: document.getElementById('end-screen'),
  loading: document.getElementById('loading'),
  hud: document.getElementById('hud'),
  controls: document.getElementById('controls'),
  touch: document.getElementById('touch-controls'),
  lifeCount: document.getElementById('life-count'),
  lives: document.getElementById('lives'),
  antCount: document.getElementById('ant-count'),
  status: document.getElementById('status'),
  toast: document.getElementById('toast'),
  sound: document.getElementById('sound-toggle'),
};
const sound = new GameSound();
function updateSoundButton() {
  ui.sound.textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON';
  ui.sound.setAttribute('aria-pressed', String(!sound.muted));
}
updateSoundButton();
ui.sound.addEventListener('click', () => { sound.setMuted(!sound.muted); updateSoundButton(); });
let mode = 'loading';
let cat = null;
let flapHinge = null;
let tailPivot = null;
let headPivot = null;
let headLook = 0;
let tailMesh = null;
let tailBasePositions = null;
let tailTime = 0;
const legPivots = {};
const legRest = {};
let antSource = null;
const ants = [];
const keys = new Set();
const clock = new THREE.Clock();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
let cameraYaw = 0;
let cameraOrbit = 0;
const cameraFocus = new THREE.Vector3();
const cameraRay = new THREE.Raycaster();
const cameraObstacles = [];
const cameraFoliage = [];
const patioCanopy = [];
const windMaterials = [];
let worldTime = 0;
let catFacing = 0;
let catHeight = 0;
let verticalVelocity = 0;
let lives = 9;
let asleep = 0;
let invincible = 0;
let swipeCooldown = 0;
let swipeTime = 0;
let pounceTime = 0;
let pounceHit = new Set();
let leap = null;
let swipeSide = 1;
let introTime = 0;
let walkTime = 0;
let toastTime = 0;
let lastSwipe = false;
let lastPounce = false;
let lastJump = false;
let dragging = false;
let dragX = 0;

const bushes = [
  [-16,15],[-15,10],[-17,3],[-15,-9],[-13,-16],
  [15,14],[16,7],[15,-1],[16,-11],[12,-16],[-7,-16],[5,-15],
  [-8,4],[-9,-6],[10,-5],[8,9],
];
const antStarts = [
  [-7,-4], [8,-3], [-12,-11], [11,11], [-4,10], [5,-13],
];

function rand(seed) {
  const x = Math.sin(seed * 49.573 + 1.41) * 43758.5453;
  return x - Math.floor(x);
}
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function smoothstep(a, b, x) {
  const t = clamp((x-a)/(b-a),0,1);
  return t*t*(3-2*t);
}
function flatDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function angleTo(dx, dz) { return Math.atan2(dx, -dz); }
function angleApproach(current, target, amount) {
  let d = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return current + d * clamp(amount, 0, 1);
}
function makeFlap(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#e2c492'; ctx.lineWidth = 13; ctx.strokeRect(8, 8, 496, 240);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 64px Georgia'; ctx.fillText(text, 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  flapHinge = new THREE.Group();
  flapHinge.position.set(0,1.82,19.62);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.55,1.69,.07),
    new THREE.MeshStandardMaterial({ color:0x40301d,roughness:.85 }));
  panel.position.y = -.845;
  panel.castShadow = true;
  flapHinge.add(panel);
  for (const side of [-1,1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.20,.43),
      new THREE.MeshBasicMaterial({ map:tex, side:THREE.DoubleSide }));
    sign.position.set(0,-.42,side*.04);
    if (side < 0) sign.rotation.y = Math.PI;
    flapHinge.add(sign);
  }
  scene.add(flapHinge);
}
function makeShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64,64,10,64,64,64);
  grad.addColorStop(0,'#00000080'); grad.addColorStop(1,'#00000000');
  ctx.fillStyle = grad; ctx.fillRect(0,0,128,128);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI/2;
  mesh.position.y = .018;
  scene.add(mesh);
  return mesh;
}
const catShadow = makeShadow();
catShadow.visible = false;

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.remove('hidden');
  toastTime = 2;
}
function updateHud() {
  ui.lifeCount.textContent = `${lives} / 9`;
  ui.lives.innerHTML = Array.from({length:9}, (_,i) => `<span class="life ${i < lives ? '' : 'lost'}">♥</span>`).join('');
  ui.antCount.textContent = `${asleep} / ${ants.length}`;
}
function hiddenInBush() {
  if (!cat) return false;
  return bushes.some(([x,z]) => Math.hypot(cat.position.x - x, cat.position.z - z) < 1.75);
}
function updateStatus() {
  if (mode !== 'playing') return;
  const hidden = hiddenInBush();
  ui.status.textContent = hidden ? 'Hidden in the leaves' : (pounceTime > 0 ? 'Pouncing!' : 'Explore the jungle');
  ui.status.classList.toggle('hidden-status', hidden);
}

const loader = new GLTFLoader();
const asset = (file) => `${import.meta.env.BASE_URL}models/${file}.glb`;
try {
  const [yardGltf, catGltf, antGltf] = await Promise.all([
    loader.loadAsync(asset('backyard')), loader.loadAsync(asset('tiger')), loader.loadAsync(asset('soldier-ant')),
  ]);
  const yard = yardGltf.scene;
  yard.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.receiveShadow = true;
    obj.castShadow = !/Lawn|Grass patch|Terracotta|Warm brick|Drive concrete/i.test(obj.material?.name || '');
    const name = obj.material?.name || '';
    if (/Leaf green|Sunlit leaf|Deep leaf/.test(name)) {
      obj.material.transparent = false;
      obj.material.opacity = 1;
      obj.material.depthWrite = true;
      cameraFoliage.push(obj);
    }
    if (/Grass blades/.test(name)) {
      obj.material.side = THREE.DoubleSide;
      obj.castShadow = false;
    }
    if (/Patio canopy roof/.test(name)) {
      obj.material.transparent = true;
      obj.material.depthWrite = false;
      patioCanopy.push(obj);
    }
    if (/Leaf green|Sunlit leaf|Deep leaf|Grass blades/.test(name)) {
      const isGrass = /Grass blades/.test(name);
      obj.material.onBeforeCompile = (shader) => {
        shader.uniforms.windTime = { value:0 };
        shader.uniforms.catWorld = { value:new THREE.Vector2(0,25) };
        shader.vertexShader = shader.vertexShader.replace('#include <common>',
          '#include <common>\nuniform float windTime;\nuniform vec2 catWorld;');
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>
          float blade = ${isGrass ? 'clamp(transformed.y / 0.42, 0.0, 1.0)' : '1.0'};
          float breeze = sin(windTime * 1.85 + transformed.x * 0.72 + transformed.z * 0.43)
            + 0.35 * sin(windTime * 3.7 + transformed.z * 1.31);
          float canopy = ${isGrass ? '0.0' : 'clamp((transformed.y - 2.0) / 5.0, 0.0, 1.0)'};
          transformed.x += breeze * blade * (${isGrass ? '.055' : '.045 + canopy * .12'});
          transformed.z += breeze * blade * (${isGrass ? '.027' : '.025 + canopy * .06'});
          vec2 away = transformed.xz - catWorld;
          float nearCat = 1.0 - smoothstep(0.35, 1.85, length(away));
          transformed.xz += normalize(away + vec2(0.001)) * nearCat * blade * ${isGrass ? '.27' : '.18'};
          `);
        windMaterials.push(shader.uniforms);
      };
      obj.material.needsUpdate = true;
    }
    if (!/Lawn|Grass patch|Grass blades|Leaf green|Sunlit leaf|Deep leaf|Terracotta brick|Warm brick|Drive concrete|Warm indoor floor|Patio canopy roof/i.test(name)) {
      cameraObstacles.push(obj);
    }
  });
  scene.add(yard);
  makeFlap("LET'S GO", '#332715', '#f4dc97');
  cat = catGltf.scene;
  cat.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  for (const name of ['leg_front_left','leg_front_right','leg_hind_left','leg_hind_right']) {
    legPivots[name] = cat.getObjectByName(name);
    if (legPivots[name]) legRest[name] = legPivots[name].rotation.clone();
  }
  tailPivot = cat.getObjectByName('tail_pivot');
  headPivot = cat.getObjectByName('head_pivot');
  tailMesh = cat.getObjectByName('flexible_tail');
  if (tailMesh?.isMesh) {
    tailBasePositions = new Float32Array(tailMesh.geometry.attributes.position.array);
    tailMesh.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  }
  cat.position.set(0, 0, 25);
  cat.visible = false;
  scene.add(cat);
  antSource = antGltf.scene;
  antStarts.forEach(([x,z], i) => {
    const model = antSource.clone(true);
    model.position.set(x, 0, z);
    model.rotation.y = rand(i+8) * Math.PI * 2;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(model);
    const brains = [];
    model.traverse((o) => { if (o.name.startsWith('brain pip')) brains.push(o); });
    const legs = [];
    model.traverse((o) => { if (o.name.startsWith('ant_leg_')) legs.push(o); });
    ants.push({ model, brains, legs, x, z, homeX:x, homeZ:z, health:3, awake:true,
      phase:rand(i+4)*10, targetX:x, targetZ:z, decision:0, attackCooldown:0,
      hitCooldown:0, fall:0 });
  });
  ui.loading.classList.add('hidden');
  mode = 'title';
  updateHud();
} catch (err) {
  console.error(err);
  ui.loading.textContent = 'Could not load the backyard models. Refresh to try again.';
}

function startGame() {
  if (mode !== 'title') return;
  sound.start();
  mode = 'intro';
  introTime = 0;
  cat.visible = true;
  ui.start.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.controls.classList.remove('hidden');
  if (matchMedia('(pointer: coarse)').matches) ui.touch.classList.remove('hidden');
  cat.position.set(0,0,25);
  cat.rotation.set(0,0,0);
  camera.position.set(0,1.48,28.9);
  camera.lookAt(0,1.05,21);
  cameraFocus.set(0,1.05,21);
  cameraYaw = 0;
  cameraOrbit = 0;
  showToast('Follow Tiger through the cat flap…');
}
function restart() { location.reload(); }
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', restart);

window.addEventListener('keydown', (e) => {
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Enter') { if (mode === 'title') startGame(); else if (mode === 'won' || mode === 'lost') restart(); }
  if (e.code === 'KeyR' && (mode === 'won' || mode === 'lost')) restart();
  if (e.code === 'KeyJ') trySwipe();
  if (e.code === 'KeyK' || e.code === 'KeyP') tryPounce();
  if (e.code === 'Space') tryJump();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 0 && mode === 'playing' && e.pointerType !== 'touch') {
    keys.add('MouseSwipe'); trySwipe();
  }
  if (e.button === 2 || (e.pointerType === 'touch' && e.target === canvas)) {
    dragging = true; dragX = e.clientX; canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointerup', (e) => {
  keys.delete('MouseSwipe'); dragging = false;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  cameraOrbit -= (e.clientX - dragX) * .006;
  cameraOrbit = clamp(cameraOrbit,-1.15,1.15);
  dragX = e.clientX;
});
for (const button of document.querySelectorAll('#touch-controls button')) {
  const code = button.dataset.key || ({run:'ShiftLeft',jump:'Space',swipe:'KeyJ',pounce:'KeyK'})[button.dataset.action];
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault(); keys.add(code); button.setPointerCapture(e.pointerId);
    if (code === 'Space') tryJump();
    if (code === 'KeyJ') trySwipe();
    if (code === 'KeyK') tryPounce();
  });
  button.addEventListener('pointerup', (e) => { e.preventDefault(); keys.delete(code); });
  button.addEventListener('pointercancel', () => keys.delete(code));
}

function pulseAt(position, color, size=.75) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.9, side:THREE.DoubleSide, depthWrite:false });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(.35,.45,24), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(position); mesh.position.y = .08;
  mesh.scale.setScalar(size);
  scene.add(mesh);
  effects.push({ mesh, age:0, life:.35 });
}
const effects = [];
function hitAnt(ant) {
  if (!ant.awake || ant.hitCooldown > 0) return;
  ant.health--;
  sound.hit();
  ant.hitCooldown = .48;
  if (ant.brains[ant.health]) ant.brains[ant.health].visible = false;
  pulseAt(ant.model.position, 0xffdc6c, 1.1);
  ant.model.position.y = .17;
  if (ant.health <= 0) {
    ant.awake = false;
    asleep++;
    showToast('Soldier ant knocked out!');
    updateHud();
    if (asleep === ants.length) setTimeout(() => finish(true), 800);
  } else {
    showToast(`${ant.health} brain${ant.health === 1 ? '' : 's'} left`);
  }
}
function trySwipe() {
  if (swipeCooldown > 0 || mode !== 'playing') return;
  swipeCooldown = .48;
  swipeTime = .42;
  sound.swipe();
  swipeSide *= -1;
  const front = new THREE.Vector3(Math.sin(catFacing),0,-Math.cos(catFacing));
  const at = cat.position.clone().addScaledVector(front, 1.25);
  pulseAt(at, 0xffe2a7, 1.3);
  let best = null, distance = 2.8;
  for (const ant of ants) {
    if (!ant.awake) continue;
    const toAnt = v1.subVectors(ant.model.position, cat.position); toAnt.y = 0;
    const d = toAnt.length();
    // At cat scale the ants dart under paws and tail, so swipe targets the
    // nearest ant in reach rather than requiring precise camera alignment.
    if (d < distance) { best=ant; distance=d; }
  }
  if (best) hitAnt(best);
}
function tryPounce() {
  if (leap || catHeight > .05 || swipeCooldown > .1 || mode !== 'playing') return;
  leap = { kind:'pounce', phase:'crouch', time:0 };
  pounceHit = new Set();
  swipeCooldown = .30;
}
function tryJump() {
  if (leap || catHeight > .05 || mode !== 'playing') return;
  leap = { kind:'jump', phase:'crouch', time:0 };
}
function takeDamage(attacker) {
  if (invincible > 0 || mode !== 'playing') return;
  invincible = 3.5;
  lives = Math.max(0, lives - 1);
  // A shove separates Tiger from the attacker so contact cannot drain lives in place.
  const away = cat.position.clone().sub(attacker.model.position).setY(0);
  if (away.lengthSq() < .001) away.set(0,0,1);
  cat.position.addScaledVector(away.normalize(),1.4);
  resolveObstacles(cat.position.clone());
  updateHud();
  showToast(lives > 0 ? 'Ouch! One life lost.' : 'Tiger is out of lives!');
  if (lives === 0) setTimeout(() => finish(false), 650);
}
function finish(won) {
  if (mode !== 'playing') return;
  mode = won ? 'won' : 'lost';
  document.getElementById('end-eyebrow').textContent = won ? 'THE BACKYARD IS YOURS' : 'NINE LIVES, ONE BRAVE CAT';
  document.getElementById('end-title').innerHTML = won ? 'NICE WORK,<br><span>TIGER!</span>' : 'TRY AGAIN,<br><span>TIGER!</span>';
  document.getElementById('end-copy').textContent = won ? 'Every soldier ant is sound asleep.' : 'The ants got the better of Tiger this time.';
  ui.end.classList.remove('hidden');
  ui.controls.classList.add('hidden');
  ui.touch.classList.add('hidden');
}

function resolveObstacles(old) {
  cat.position.x = clamp(cat.position.x, -18.4, 31.5);
  cat.position.z = clamp(cat.position.z, -18.4, 18.55);
  // Central oak trunk; the low brick ring stays walkable.
  const dx = cat.position.x, dz = cat.position.z + 2.5;
  if (Math.hypot(dx,dz) < 1.05) {
    const a = Math.atan2(dz,dx);
    cat.position.x = Math.cos(a)*1.05;
    cat.position.z = -2.5 + Math.sin(a)*1.05;
  }
  // The driveway is walkable; the garage walls and pickup are solid.
  for (const [minX,maxX,minZ,maxZ] of [[19.1,32.5,-2.5,9.7],[22.7,27.3,11.0,20.5]]) {
    if (cat.position.x>minX && cat.position.x<maxX
        && cat.position.z>minZ && cat.position.z<maxZ) {
      const edges = [
        [Math.abs(cat.position.x-minX), 'x',minX],
        [Math.abs(cat.position.x-maxX), 'x',maxX],
        [Math.abs(cat.position.z-minZ), 'z',minZ],
        [Math.abs(cat.position.z-maxZ), 'z',maxZ],
      ];
      edges.sort((a,b)=>a[0]-b[0]);
      cat.position[edges[0][1]]=edges[0][2];
    }
  }
  if (!Number.isFinite(cat.position.x) || !Number.isFinite(cat.position.z)) cat.position.copy(old);
}

function updateLeap(dt) {
  if (!leap) return;
  leap.time += dt;
  if (leap.phase === 'crouch' && leap.time >= .17) {
    leap.phase = 'air'; leap.time = 0;
    sound.effort();
    verticalVelocity = leap.kind === 'pounce' ? 5.4 : 6.3;
    if (leap.kind === 'pounce') {
      pounceTime = .50;
      showToast('POUNCE!');
    }
  } else if (leap.phase === 'air') {
    verticalVelocity -= 16 * dt;
    catHeight += verticalVelocity * dt;
    if (catHeight <= 0) {
      catHeight = 0; verticalVelocity = 0;
      leap.phase = 'land'; leap.time = 0;
    }
  } else if (leap.phase === 'land' && leap.time >= .22) {
    leap = null;
  }
}

function animateRig(dt, locomotion) {
  const amount = clamp(locomotion / 4.4, 0, 1);
  tailTime += dt * (1 + amount*.36);
  if (amount > .05) walkTime += dt * (6 + locomotion * 1.48);
  const gait = Math.sin(walkTime);
  const step = {
    leg_front_left:gait, leg_hind_right:gait,
    leg_front_right:-gait, leg_hind_left:-gait,
  };
  const swipeProgress = swipeTime > 0 ? 1-swipeTime/.42 : 0;
  const swipeName = swipeSide > 0 ? 'leg_front_right' : 'leg_front_left';
  for (const [name, part] of Object.entries(legPivots)) {
    if (!part) continue;
    const rest = legRest[name];
    let bend = (step[name] || 0) * .52 * amount;
    let sweep = 0;
    if (leap?.phase === 'crouch') bend = name.includes('front') ? .28 : -.78;
    if (leap?.phase === 'air') bend = verticalVelocity > 0
      ? (name.includes('front') ? .83 : .34)
      : (name.includes('front') ? .22 : -.48);
    if (leap?.phase === 'land') bend = (name.includes('front') ? .66 : -.28)
      * (1 - smoothstep(0,.22,leap.time));
    if (swipeTime > 0 && name === swipeName) {
      bend += Math.sin(swipeProgress*Math.PI) * 1.05;
      sweep = (swipeSide > 0 ? 1 : -1) * Math.cos(swipeProgress*Math.PI) * .72;
    }
    const a = 1-Math.exp(-dt*24);
    part.rotation.x += (rest.x+bend-part.rotation.x)*a;
    part.rotation.z += (rest.z+sweep-part.rotation.z)*a;
  }
  if (tailPivot) {
    const lift = leap?.phase === 'air' ? -.22 : 0;
    tailPivot.rotation.y += (Math.sin(tailTime*2.1)*.12-tailPivot.rotation.y)
      * (1-Math.exp(-dt*7));
    tailPivot.rotation.x += (lift-tailPivot.rotation.x)*(1-Math.exp(-dt*8));
  }
  if (tailMesh && tailBasePositions) {
    const position = tailMesh.geometry.attributes.position;
    const flick = swipeTime > 0 || leap ? .23 : .10 + amount*.12;
    for (let i=0;i<position.count;i++) {
      const at = i*3;
      const s = clamp(tailBasePositions[at+2]/1.37,0,1);
      const bend = s*s;
      position.setXYZ(i,
        tailBasePositions[at] + bend*(Math.sin(tailTime*2.9-s*2.8)*flick
          + Math.sin(tailTime*7.4-s*4.3)*.055),
        tailBasePositions[at+1] + bend*Math.sin(tailTime*2.3-s*2.0)*.075,
        tailBasePositions[at+2]);
    }
    position.needsUpdate = true;
    tailMesh.geometry.computeVertexNormals();
  }
}

function updateCat(dt) {
  const moving = Number(keys.has('KeyW') || keys.has('ArrowUp'))
    - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const turning = Number(keys.has('KeyD') || keys.has('ArrowRight'))
    - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  if (moving) catFacing += turning * dt * 2.25;
  else if (turning) cameraOrbit = clamp(cameraOrbit+turning*dt*.28,-.28,.28);
  headLook += ((moving ? 0 : turning*.65)-headLook)*(1-Math.exp(-dt*9));
  if (headPivot) headPivot.rotation.y = -headLook;
  const direction = new THREE.Vector3(Math.sin(catFacing),0,-Math.cos(catFacing))
    .multiplyScalar(moving);
  updateLeap(dt);
  const speed = pounceTime > 0 ? 10.5 : keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7.2 : 5.2;
  const old = cat.position.clone();
  cat.position.addScaledVector(direction, speed * dt * (leap?.phase === 'crouch' ? .45 : 1));
  if (pounceTime > 0) {
    const pounceForward = new THREE.Vector3(Math.sin(catFacing),0,-Math.cos(catFacing));
    cat.position.addScaledVector(pounceForward, (direction.lengthSq() > 0 ? 3 : 8) * dt);
    pounceTime = Math.max(0,pounceTime-dt);
  }
  resolveObstacles(old);
  // A/D steer while walking; at rest they look and pan without spinning Tiger.
  // Three.js positive yaw sends local -Z toward -X.
  cat.rotation.y = -catFacing;
  animateRig(dt,moving ? speed : 0);
  const jumpPitch = leap?.phase === 'crouch' ? -.07
    : leap?.phase === 'air' ? (verticalVelocity > 0 ? .21 : -.17)
    : leap?.phase === 'land' ? -.13*(1-smoothstep(0,.22,leap.time)) : 0;
  cat.rotation.x += (jumpPitch-cat.rotation.x)*(1-Math.exp(-dt*13));
  let stretch = 1;
  if (leap?.phase === 'crouch') stretch = 1 - .17 * smoothstep(0,.17,leap.time);
  if (leap?.phase === 'air') stretch = verticalVelocity > 0 ? 1.08 : .96;
  if (leap?.phase === 'land') stretch = .83 + .17 * smoothstep(0,.22,leap.time);
  cat.scale.set(1,stretch,1);
  cat.position.y = catHeight + (moving && catHeight === 0 ? Math.sin(walkTime*2)*.025 : 0);
  if (swipeTime > 0) {
    swipeTime = Math.max(0,swipeTime-dt);
    cat.rotation.z = Math.sin((1-swipeTime/.42)*Math.PI)*.08;
  } else cat.rotation.z = 0;
  cat.visible = invincible <= 0 || Math.floor(invincible*10)%2 === 0;
  catShadow.visible = true;
  catShadow.position.x = cat.position.x;
  catShadow.position.z = cat.position.z;
  catShadow.material.opacity = 1 - catHeight * .23;
  if (pounceTime > 0) {
    for (const ant of ants) {
      if (ant.awake && !pounceHit.has(ant) && flatDistance(ant.model.position,cat.position)<1.25) {
        hitAnt(ant); pounceHit.add(ant);
      }
    }
  }
}
function updateAnts(dt, time) {
  const hidden = hiddenInBush() && swipeTime <= 0 && pounceTime <= 0;
  ants.forEach((ant, i) => {
    ant.hitCooldown = Math.max(0,ant.hitCooldown-dt);
    ant.attackCooldown = Math.max(0,ant.attackCooldown-dt);
    if (!ant.awake) {
      ant.fall = Math.min(1, ant.fall + dt*3);
      ant.model.rotation.z = ant.fall * 1.35;
      ant.model.position.y = .04;
      return;
    }
    const distance = flatDistance(ant.model.position, cat.position);
    const chase = !hidden && distance < 5.2 && mode === 'playing';
    ant.decision -= dt;
    if (!chase && ant.decision <= 0) {
      ant.targetX = clamp(ant.homeX+(rand(time*.013+i*8)-.5)*5,-17,17);
      ant.targetZ = clamp(ant.homeZ+(rand(time*.019+i*11)-.5)*5,-17,17);
      ant.decision = 1.8 + rand(i+time*.1)*2.8;
    }
    const tx = chase ? cat.position.x : ant.targetX;
    const tz = chase ? cat.position.z : ant.targetZ;
    const dx = tx-ant.model.position.x, dz = tz-ant.model.position.z;
    const dist = Math.hypot(dx,dz);
    const walking = dist > (chase ? .85 : .25);
    if (walking) {
      const speed = chase ? 1.05 : .62;
      ant.model.position.x += dx/dist * speed*dt;
      ant.model.position.z += dz/dist * speed*dt;
      ant.model.rotation.y = angleApproach(ant.model.rotation.y,-angleTo(dx,dz),dt*7);
    }
    ant.model.position.y = ant.hitCooldown>0 ? Math.abs(Math.sin(time*34))*.04 : 0;
    for (const leg of ant.legs) {
      const index=Number(leg.name.slice(-1));
      const left=leg.name.includes('_left_');
      const tripod=(index+(left?0:1))%2 ? Math.PI : 0;
      const cycle=time*(chase?12:8)+ant.phase+tripod;
      const target=walking ? Math.sin(cycle)*.37 : 0;
      leg.rotation.x += (target-leg.rotation.x)*(1-Math.exp(-dt*15));
      leg.rotation.y = walking ? Math.max(0,Math.cos(cycle))*(left?-.17:.17) : 0;
    }
    if (chase && distance < .78 && ant.attackCooldown <= 0 && catHeight < .5 && pounceTime <= 0) {
      takeDamage(ant); ant.attackCooldown = 4.5;
    }
  });
}
function cameraClearDistance(anchor, destination, obstacles=cameraObstacles) {
  const toward = destination.clone().sub(anchor);
  const distance = toward.length();
  cameraRay.set(anchor,toward.normalize());
  cameraRay.near = .35;
  cameraRay.far = distance;
  const hit = cameraRay.intersectObjects(obstacles,false)[0];
  return hit ? Math.max(.35,hit.distance-.35) : distance;
}
function updateCamera(dt) {
  if (!dragging) cameraOrbit *= Math.exp(-dt*.42);
  cameraYaw = angleApproach(cameraYaw,catFacing+cameraOrbit,1-Math.exp(-dt*3.2));
  const anchor = cat.position.clone().add(new THREE.Vector3(0,1.05,0));
  const inShrub = hiddenInBush();
  const choices = [
    { turn:0, height:6.25, distance:8.2, penalty:inShrub ? .14 : 0 },
    { turn:0, height:8.4, distance:7.6, penalty:inShrub ? 0 : .08 },
    { turn:.48, height:6.8, distance:7.8, penalty:.13 },
    { turn:-.48, height:6.8, distance:7.8, penalty:.13 },
  ];
  let best = null;
  for (const choice of choices) {
    const angle = cameraYaw+choice.turn;
    const candidate = new THREE.Vector3(
      cat.position.x-Math.sin(angle)*choice.distance,
      choice.height,
      cat.position.z+Math.cos(angle)*choice.distance,
    );
    candidate.x = clamp(candidate.x,-18.5,31.7);
    candidate.z = clamp(candidate.z,-18.5,17.2);
    const length = candidate.distanceTo(anchor);
    const clear = cameraClearDistance(anchor,candidate);
    // Leaves are soft occluders: prefer a clear angle or a higher view, but
    // never push the camera onto Tiger just because he entered a shrub.
    const softClear = cameraClearDistance(anchor,candidate,cameraFoliage);
    const score = clear/length-choice.penalty
      - (softClear<length ? .14*(1-softClear/length) : 0);
    if (!best || score>best.score) {
      best = { score, candidate, clear, length };
    }
  }
  const wanted = best.candidate;
  if (best.clear < best.length) {
    wanted.copy(anchor).lerp(wanted,Math.max(1.5,best.clear)/best.length);
  }
  const closing = camera.position.distanceTo(anchor) > wanted.distanceTo(anchor);
  camera.position.lerp(wanted,1-Math.exp(-dt*(closing ? 10 : 4)));
  // The smooth path can itself cross a branch or wall: keep the final point clear.
  const visibleDistance = cameraClearDistance(anchor,camera.position);
  const actualDistance = camera.position.distanceTo(anchor);
  if (visibleDistance < actualDistance) {
    camera.position.copy(anchor).lerp(camera.position,Math.max(1.5,visibleDistance)/actualDistance);
  }
  const forward = new THREE.Vector3(Math.sin(catFacing),0,-Math.cos(catFacing));
  const target = anchor.addScaledVector(forward,.72);
  cameraFocus.lerp(target,1-Math.exp(-dt*7));
  camera.lookAt(cameraFocus);
}
function animate() {
  const dt = Math.min(clock.getDelta(), .05);
  const time = clock.elapsedTime;
  if (mode === 'intro') {
    introTime += dt;
    const t = clamp(introTime/3.55,0,1);
    const reveal = smoothstep(3.25,5.35,introTime);
    cat.position.z = 25 - t*8.4 - reveal*7.1;
    const throughFlap = smoothstep(23.2,20.0,cat.position.z)
      * (1-smoothstep(19.3,17.6,cat.position.z));
    cat.scale.set(1,1-.10*throughFlap,1);
    animateRig(dt,3.5);
    cat.position.y = Math.sin(walkTime*2)*.018;
    catShadow.visible = true;
    catShadow.position.set(cat.position.x,.018,cat.position.z);
    flapHinge.rotation.x = smoothstep(23.8,21.7,cat.position.z) * 1.28;
    const cameraOffset = 3.9-1.5*smoothstep(21,18,cat.position.z);
    const lowCamera = new THREE.Vector3(0,1.48,cat.position.z+cameraOffset);
    const highCamera = new THREE.Vector3(1.5,6.3,17.2);
    camera.position.copy(lowCamera.lerp(highCamera,reveal));
    camera.lookAt(new THREE.Vector3(0,1.04,cat.position.z-4.4)
      .lerp(new THREE.Vector3(0,1.2,cat.position.z-3.1),reveal));
    if (introTime >= 5.35) {
      mode = 'playing'; cat.position.z=9.5; cat.scale.set(1,1,1);
      showToast('The backyard is yours to explore!');
    }
  } else if (mode === 'playing') {
    swipeCooldown = Math.max(0,swipeCooldown-dt);
    invincible = Math.max(0,invincible-dt);
    const swipePressed = keys.has('KeyJ') || keys.has('MouseSwipe');
    const pouncePressed = keys.has('KeyK') || keys.has('KeyP');
    const jumpPressed = keys.has('Space');
    if (swipePressed && !lastSwipe) trySwipe();
    if (pouncePressed && !lastPounce) tryPounce();
    if (jumpPressed && !lastJump) tryJump();
    lastSwipe = swipePressed; lastPounce = pouncePressed; lastJump = jumpPressed;
    updateCat(dt);
    updateAnts(dt,time);
    updateCamera(dt);
    if (flapHinge) flapHinge.rotation.x *= Math.exp(-dt*1.5);
    updateStatus();
  } else if (mode === 'title' && cat) {
    camera.position.set(13,13,14);
    camera.lookAt(0,1,-2);
    updateAnts(dt,time);
  }
  for (let i=effects.length-1;i>=0;i--) {
    const fx=effects[i]; fx.age+=dt;
    fx.mesh.scale.multiplyScalar(1+dt*4);
    fx.mesh.material.opacity=Math.max(0,1-fx.age/fx.life);
    if (fx.age>=fx.life) { scene.remove(fx.mesh); fx.mesh.geometry.dispose(); fx.mesh.material.dispose(); effects.splice(i,1); }
  }
  if (toastTime > 0) { toastTime-=dt; if (toastTime<=0) ui.toast.classList.add('hidden'); }
  worldTime += dt;
  for (const uniforms of windMaterials) {
    uniforms.windTime.value = worldTime;
    if (cat) uniforms.catWorld.value.set(cat.position.x,cat.position.z);
  }
  for (const roof of patioCanopy) {
    const inCameraPath=mode!=='title' && camera.position.z>11 && camera.position.z<24
      && Math.abs(camera.position.x)<14;
    const wanted=inCameraPath ? 0 : 1;
    roof.material.opacity += (wanted-roof.material.opacity)*(1-Math.exp(-dt*14));
    roof.castShadow = !inCameraPath;
  }
  if (cat) {
    const x=cat.position.x, z=cat.position.z;
    const surface = z>20 && Math.abs(x)<12.2 ? 'wood'
      : z>15.4 && Math.abs(x)<12.2 || x>18.8 && z>1.4 ? 'concrete' : 'grass';
    const walking = mode==='intro' || (mode==='playing' &&
      (keys.has('KeyW') || keys.has('ArrowUp') || keys.has('KeyS') || keys.has('ArrowDown')));
    sound.update(mode,walkTime,walking,catHeight<.05 && leap?.phase!=='air',surface,
      cat.position,ants);
  }
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
window.addEventListener('resize', () => {
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
