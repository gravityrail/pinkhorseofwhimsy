import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
};
let mode = 'loading';
let cat = null;
let antSource = null;
const ants = [];
const keys = new Set();
const clock = new THREE.Clock();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
let yaw = 0;
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
function flatDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function angleTo(dx, dz) { return Math.atan2(dx, -dz); }
function angleApproach(current, target, amount) {
  let d = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return current + d * clamp(amount, 0, 1);
}
function makeTextPlane(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#e2c492'; ctx.lineWidth = 13; ctx.strokeRect(8, 8, 496, 240);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 64px Georgia'; ctx.fillText(text, 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.84, .45),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  // The flap faces into the yard (toward negative Three.js Z).
  mesh.rotation.y = Math.PI;
  mesh.position.set(0, .66, 19.62);
  scene.add(mesh);
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
      obj.material.transparent = true;
      obj.material.opacity = .84;
      obj.material.depthWrite = false;
    }
  });
  scene.add(yard);
  makeTextPlane("LET'S GO", '#332715', '#f4dc97');
  cat = catGltf.scene;
  cat.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  cat.position.set(0, 0, 19.7);
  cat.scale.setScalar(.55);
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
    ants.push({ model, brains, x, z, homeX:x, homeZ:z, health:3, awake:true,
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
  mode = 'intro';
  introTime = 0;
  cat.visible = true;
  ui.start.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.controls.classList.remove('hidden');
  if (matchMedia('(pointer: coarse)').matches) ui.touch.classList.remove('hidden');
  camera.position.set(3.8, 3.5, 15.4);
  camera.lookAt(0, .7, 19.1);
  showToast('Tiger squeezes through the cat flap…');
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
  yaw -= (e.clientX - dragX) * .006;
  dragX = e.clientX;
});
for (const button of document.querySelectorAll('#touch-controls button')) {
  const code = button.dataset.key || ({jump:'Space',swipe:'KeyJ',pounce:'KeyK'})[button.dataset.action];
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
  swipeTime = .30;
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
  if (pounceTime > 0 || catHeight > .05 || swipeCooldown > .1 || mode !== 'playing') return;
  pounceTime = .52;
  verticalVelocity = 5.7;
  pounceHit = new Set();
  swipeCooldown = .30;
  showToast('POUNCE!');
}
function tryJump() {
  if (catHeight > .05 || mode !== 'playing') return;
  verticalVelocity = 6.1;
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
  cat.position.x = clamp(cat.position.x, -18.4, 18.4);
  cat.position.z = clamp(cat.position.z, -18.4, 18.55);
  // Central oak trunk; the low brick ring stays walkable.
  const dx = cat.position.x, dz = cat.position.z + 2.5;
  if (Math.hypot(dx,dz) < 1.05) {
    const a = Math.atan2(dz,dx);
    cat.position.x = Math.cos(a)*1.05;
    cat.position.z = -2.5 + Math.sin(a)*1.05;
  }
  // Keep Tiger out of the garage driveway until that area is built out.
  if (!Number.isFinite(cat.position.x) || !Number.isFinite(cat.position.z)) cat.position.copy(old);
}

function updateCat(dt) {
  const moving = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafing = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  const forward = v1.set(Math.sin(yaw),0,-Math.cos(yaw));
  const right = v2.set(Math.cos(yaw),0,Math.sin(yaw));
  const direction = new THREE.Vector3().addScaledVector(forward,moving).addScaledVector(right,strafing);
  if (direction.lengthSq() > 0) direction.normalize();
  const speed = pounceTime > 0 ? 10.5 : keys.has('ShiftLeft') ? 2.2 : 4.4;
  const old = cat.position.clone();
  cat.position.addScaledVector(direction, speed * dt);
  if (pounceTime > 0) {
    const pounceForward = new THREE.Vector3(Math.sin(catFacing),0,-Math.cos(catFacing));
    cat.position.addScaledVector(pounceForward, (direction.lengthSq() > 0 ? 3 : 8) * dt);
    pounceTime = Math.max(0,pounceTime-dt);
  }
  resolveObstacles(old);
  if (direction.lengthSq() > .1) catFacing = angleApproach(catFacing, angleTo(direction.x,direction.z), dt*11);
  cat.rotation.y = catFacing;
  verticalVelocity -= 16 * dt;
  catHeight = Math.max(0, catHeight + verticalVelocity * dt);
  if (catHeight === 0) verticalVelocity = 0;
  cat.position.y = catHeight + (direction.lengthSq() > .1 && catHeight === 0 ? Math.sin(walkTime*13)*.035 : 0);
  if (direction.lengthSq() > .1) walkTime += dt;
  let legIndex = 0;
  cat.traverse((o) => {
    if (!o.name.startsWith('leg')) return;
    o.rotation.x = direction.lengthSq() > .1 ? Math.sin(walkTime*12 + legIndex*Math.PI)*.23 : 0;
    legIndex++;
  });
  if (swipeTime > 0) {
    swipeTime = Math.max(0,swipeTime-dt);
    cat.rotation.z = Math.sin((1-swipeTime/.3)*Math.PI)*.17;
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
    if (dist > (chase ? .85 : .25)) {
      const speed = chase ? 1.05 : .62;
      ant.model.position.x += dx/dist * speed*dt;
      ant.model.position.z += dz/dist * speed*dt;
      ant.model.rotation.y = angleApproach(ant.model.rotation.y,angleTo(dx,dz),dt*7);
    }
    ant.model.position.y = Math.sin(time*9+ant.phase)*.025 + (ant.hitCooldown>0 ? Math.sin(time*34)*.05 : 0);
    if (chase && distance < .78 && ant.attackCooldown <= 0 && catHeight < .5 && pounceTime <= 0) {
      takeDamage(ant); ant.attackCooldown = 4.5;
    }
  });
}
function updateCamera(dt) {
  const porch = clamp((cat.position.z - 11) / 5, 0, 1);
  const behind = new THREE.Vector3(-Math.sin(yaw)*9.8, 7.3 - porch*2.7, Math.cos(yaw)*9.8);
  const wanted = cat.position.clone().add(behind);
  wanted.x = clamp(wanted.x,-18.7,18.7);
  wanted.z = clamp(wanted.z,-18.7,19.1);
  camera.position.lerp(wanted,1-Math.exp(-dt*5));
  const target = cat.position.clone().add(new THREE.Vector3(0,1.2,0));
  camera.lookAt(target);
}
function animate() {
  const dt = Math.min(clock.getDelta(), .05);
  const time = clock.elapsedTime;
  if (mode === 'intro') {
    introTime += dt;
    const t = clamp(introTime/1.55,0,1);
    cat.position.z = 19.7 - t*2.7;
    cat.scale.setScalar(.55 + .45*t);
    cat.position.y = Math.sin(t*Math.PI)*.04;
    catShadow.visible = true;
    catShadow.position.set(cat.position.x,.018,cat.position.z);
    const targetCam = new THREE.Vector3(3.8,3.5,15.4);
    camera.position.lerp(targetCam,dt*3);
    camera.lookAt(cat.position.x,.8,cat.position.z);
    if (t >= 1) { mode = 'playing'; cat.position.z=17; cat.scale.setScalar(1); showToast('Find the soldier ants!'); }
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
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
window.addEventListener('resize', () => {
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
