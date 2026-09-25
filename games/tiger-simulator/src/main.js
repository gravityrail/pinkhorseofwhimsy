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
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .1, 190);
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
scene.add(sun.target);
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
  missionLabel: document.querySelector('.mission-label'),
  mission: document.querySelector('.mission'),
  status: document.getElementById('status'),
  toast: document.getElementById('toast'),
  sound: document.getElementById('sound-toggle'),
  debugPanel: document.getElementById('debug-panel'),
  debugLevel: document.getElementById('debug-level'),
  debugJump: document.getElementById('debug-jump'),
  debugDefeat: document.getElementById('debug-defeat'),
  charge: document.getElementById('jump-charge'),
  chargeFill: document.getElementById('jump-charge-fill'),
  chargeLabel: document.getElementById('jump-charge-label'),
};
// Development tools are visible by default during this first-pass build.
// Append ?debug=0 to the URL for a clean play view.
const debugEnabled = new URLSearchParams(location.search).get('debug') !== '0';
ui.debugPanel.classList.toggle('hidden',!debugEnabled);
const sound = new GameSound();
function updateSoundButton() {
  ui.sound.textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON';
  ui.sound.setAttribute('aria-pressed', String(!sound.muted));
}
updateSoundButton();
ui.sound.addEventListener('click', () => { sound.setMuted(!sound.muted); updateSoundButton(); });
let mode = 'loading';
// Some in-car browsers expose a fine primary pointer despite having a touchscreen.
// A real touch event is the fallback when their capability hints are missing.
let touchEnabled = navigator.maxTouchPoints > 0 ||
  matchMedia('(any-pointer: coarse)').matches || /Tesla/i.test(navigator.userAgent);
document.documentElement.classList.toggle('touch-enabled', touchEnabled);
function showTouchControls() {
  ui.touch.classList.toggle('hidden', !touchEnabled || (mode !== 'intro' && mode !== 'playing'));
}
function enableTouchControls() {
  if (touchEnabled) return;
  touchEnabled = true;
  document.documentElement.classList.add('touch-enabled');
  showTouchControls();
}
document.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch') enableTouchControls();
}, true);
document.addEventListener('touchstart', enableTouchControls, { passive: true, capture: true });
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
const roofRay = new THREE.Raycaster();
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
let leap = null;
let swipeSide = 1;
let introTime = 0;
let walkTime = 0;
let toastTime = 0;
let lastSwipe = false;
let lastHardContact = null;
let hardImpactCooldown = 0;
let dragging = false;
let dragX = 0;
let level = 1;
let transition = null;
let levelPad = null;
const PAD_POSITION = new THREE.Vector3(20.2, 0, 16.8);
const AC_HOME = new THREE.Vector3(15.2, 0, 47.1);
const AC_TOP = 1.10;
let airConditioner = null;

const bushes = [
  [-16,15],[-15,10],[-17,3],[-15,-9],[-13,-16],
  [15,14],[16,7],[15,-1],[16,-11],[12,-16],[-7,-16],[5,-15],
  [-8,4],[-9,-6],[10,-5],[8,9],
];
const antStarts = [
  [-7,-4], [8,-3], [-12,-11], [11,11], [-4,10], [5,-13],
];
// These bounds include room for Tiger's body around the modeled solids.
const solidBoxes = [
  ['garage',19.1,32.5,-2.5,11.05,Infinity],
  ['pickup',22.7,27.3,11.0,20.5,Infinity],
  ['planter and bench',3.8,8.35,13.95,17.1,.9],
  ['wall bench',-9.9,-4.6,18.0,19.1,.9],
  ['return bench',-11.0,-9.9,15.5,18.0,.9],
];
const solidPosts = [
  ...[-10.3,-4.4,10.3].map((x) => ['patio post',x,14.95,.67,Infinity]),
  ...[[-11.3,18.35],[-2.6,18.4],[2.5,18.6],[11.1,18.4],[-11.2,16.0]]
    .map(([x,z]) => ['flower pot',x,z,.52,.65]),
];
const frontSolidBoxes = [
  ['house',-13.5,13.5,21.5,58.4,Infinity],
];
const frontSolidPosts = [
  ['front tree',-8,79,1.15,Infinity],
  ['front porch column',-5.5,63,.55,Infinity],
  ['front porch column',5.5,63,.55,Infinity],
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
function airConditionerBounds() {
  if (!airConditioner) return null;
  const {x,z} = airConditioner.model.position;
  return ['air conditioner',x-2.05,x+2.05,z-1.50,z+1.50,AC_TOP];
}
function overlapsAirConditioner(x,z,margin=0) {
  const box=airConditionerBounds();
  return box && x>box[1]-margin && x<box[2]+margin
    && z>box[3]-margin && z<box[4]+margin;
}
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
  if (!cat || level !== 1) return false;
  return bushes.some(([x,z]) => Math.hypot(cat.position.x - x, cat.position.z - z) < 1.75);
}
function surfaceAt(position) {
  const {x,z} = position;
  if (level === 2) {
    if ((x > 17.4 && z < 98) || (Math.abs(x)<6.2 && z>=58.5 && z<65.3)
        || (Math.abs(x)<1.55 && z<96 && z>=64.5)) return 'concrete';
    return 'grass';
  }
  if (z > 20 && Math.abs(x) < 12.2) return 'wood';
  const ringDistance = Math.hypot(x,z+2.5);
  if (ringDistance > 2.9 && ringDistance < 3.65) return 'concrete';
  if ((z > 15.4 && Math.abs(x) < 12.2) || (x > 18.8 && z > 1.4)) return 'concrete';
  return 'grass';
}
function hardSurfaceAt(position) {
  const {x,z} = position;
  if (level === 2) {
    if (x < -18.4 || x > 31.5 || z < 22.8 || z > 95.5) return true;
    if (frontSolidBoxes.some(([,minX,maxX,minZ,maxZ,height]) => catHeight<=height
        && x>minX && x<maxX && z>minZ && z<maxZ)) return true;
    if (catHeight<=AC_TOP && overlapsAirConditioner(x,z)) return true;
    return frontSolidPosts.some(([,px,pz,radius,height]) => catHeight<=height
      && Math.hypot(x-px,z-pz)<radius);
  }
  if (x < -18.4 || x > 31.5 || z < -18.4 || z > 18.55) return true;
  if (Math.hypot(x,z+2.5) < 1.05) return true;
  if (solidBoxes.some(([,minX,maxX,minZ,maxZ,height]) => catHeight<=height
      && x>minX && x<maxX && z>minZ && z<maxZ)) return true;
  return solidPosts.some(([,px,pz,radius,height]) => catHeight<=height
    && Math.hypot(x-px,z-pz)<radius);
}
function updateStatus() {
  if (mode !== 'playing') return;
  const hidden = hiddenInBush();
  ui.status.textContent = hidden ? 'Hidden in the leaves'
    : leap?.phase === 'crouch' ? 'Ready to spring…'
    : leap?.swipeOnLand ? 'Pouncing!'
    : level===2 && airConditioner?.state==='defeated' ? 'The condenser is in a deep sleep'
    : level===2 && airConditioner?.state==='stunned' ? `Condenser paused · ${Math.ceil(airConditioner.stunTimer)}s`
    : level===2 && airConditioner?.state==='marching' ? 'Dodge or jump on the chomping condenser'
    : level === 2 ? 'Explore the front yard'
    : levelPad?.active ? 'The blue pad by the truck is ready' : 'Explore the jungle';
  ui.status.classList.toggle('hidden-status', hidden);
}

function makeLevelPad() {
  const group = new THREE.Group();
  group.position.copy(PAD_POSITION);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.04,1.10,.13,48),
    new THREE.MeshStandardMaterial({color:0x666d74,roughness:.5,metalness:.28,
      emissive:0x000000,emissiveIntensity:0}));
  base.position.y=.08; base.receiveShadow=true;
  group.add(base);
  const core = new THREE.Mesh(new THREE.CircleGeometry(.77,48),
    new THREE.MeshBasicMaterial({color:0xbac0c5,side:THREE.DoubleSide}));
  core.rotation.x=-Math.PI/2; core.position.y=.157;
  group.add(core);
  const canvas = document.createElement('canvas'); canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ffffff'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='900 133px system-ui'; ctx.fillText('↟',128,112);
  ctx.font='900 32px system-ui'; ctx.fillText('NEXT',128,209);
  const emblem=new THREE.Mesh(new THREE.PlaneGeometry(1.28,1.28),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,
      opacity:.32,depthWrite:false,side:THREE.DoubleSide}));
  emblem.rotation.x=-Math.PI/2; emblem.position.y=.165;
  group.add(emblem);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.07,1.25,48),
    new THREE.MeshBasicMaterial({color:0x58d6ff,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.y=.174;
  group.add(ring);
  const light = new THREE.PointLight(0x4abfff,0,4.5);
  light.position.y=.7; group.add(light);
  scene.add(group);
  levelPad={group,base,core,emblem,ring,light,active:false};
}
function setLevelPadActive() {
  if (!levelPad || levelPad.active) return;
  levelPad.active=true;
  levelPad.base.material.color.setHex(0x164b85);
  levelPad.base.material.emissive.setHex(0x0c71c0);
  levelPad.base.material.emissiveIntensity=.85;
  levelPad.core.material.color.setHex(0x35bfff);
  levelPad.emblem.material.opacity=.92;
}

function makeAirConditionerSmoke() {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=64;
  const context=canvas.getContext('2d');
  const fade=context.createRadialGradient(32,32,2,32,32,31);
  fade.addColorStop(0,'rgba(105,116,112,.90)');
  fade.addColorStop(.42,'rgba(119,131,127,.62)');
  fade.addColorStop(1,'rgba(143,156,150,0)');
  context.fillStyle=fade;
  context.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);
  for (let i=0;i<9;i++) {
    const puff=new THREE.Sprite(new THREE.SpriteMaterial({
      map:texture,color:0xffffff,
      transparent:true,opacity:0,depthWrite:false,
    }));
    puff.visible=false;
    scene.add(puff);
    airConditioner.smoke.push(puff);
  }
}
function resetAirConditioner() {
  if (!airConditioner) return;
  const ac=airConditioner;
  ac.model.position.copy(AC_HOME);
  // Blender's front panel faces local +Z in glTF. Turn it toward Tiger's
  // approach from the rear half of the driveway.
  ac.model.rotation.set(0,Math.PI,0);
  ac.state='sleeping'; ac.wakeTime=0; ac.stunTimer=0;
  ac.stomps=0; ac.direction=1; ac.marchTime=0;
  ac.cover.position.y=ac.coverRest;
  ac.upperTeeth.position.y=0; ac.lowerTeeth.position.y=0;
  for (const leg of ac.legs) {
    leg.part.rotation.x=0; leg.part.position.y=leg.restY;
  }
  for (const eye of ac.eyes) {
    eye.material.emissive.setHex(0x2b0502);
    eye.material.emissiveIntensity=.35;
  }
  for (const puff of ac.smoke) puff.visible=false;
}
function stompAirConditioner() {
  const ac=airConditioner;
  ac.stomps++;
  ac.stunTimer=5;
  ac.state=ac.stomps>=5 ? 'defeated' : 'stunned';
  ac.model.position.y=0;
  if (ui.acCount) ui.acCount.textContent=`${ac.stomps} / 5`;
  sound.hit();
  sound.acStomp(ac.state==='defeated');
  pulseAt(ac.model.position,ac.state==='defeated' ? 0xe8e2c7 : 0x8ae5ff,2.0);
  showToast(ac.state==='defeated'
    ? 'The condenser is in a deep sleep!'
    : `Condenser stunned for 5 seconds · ${ac.stomps}/5`);
}
function updateAirConditioner(dt) {
  if (!airConditioner) return;
  const ac=airConditioner;
  if (level!==2 || mode!=='playing') return;
  if (ac.state==='sleeping' && cat.position.x>15.5
      && Math.abs(cat.position.z-AC_HOME.z)<7.5) {
    ac.state='waking'; ac.wakeTime=0;
    sound.acWake();
    showToast('Something is shaking beside the driveway…');
  }
  if (ac.state==='waking') {
    ac.wakeTime+=dt;
    const open=smoothstep(.12,.95,ac.wakeTime);
    ac.model.position.x=AC_HOME.x+Math.sin(ac.wakeTime*52)*.075*(1-open*.5);
    ac.cover.position.y=ac.coverRest+open*.52;
    if (ac.wakeTime>=1.08) {
      ac.state='marching'; ac.model.position.x=AC_HOME.x;
      showToast('The air conditioner has teeth! Dodge or jump on it.');
    }
  }
  if (ac.state==='marching') {
    ac.marchTime+=dt;
    ac.model.position.x+=ac.direction*3.5*dt;
    if (ac.model.position.x>=28.7) { ac.model.position.x=28.7; ac.direction=-1; }
    if (ac.model.position.x<=15.2) { ac.model.position.x=15.2; ac.direction=1; }
    ac.model.position.y=Math.abs(Math.sin(ac.marchTime*10))*.025;
    if (catHeight<.25 && leap?.phase!=='air'
        && overlapsAirConditioner(cat.position.x,cat.position.z,.20)) {
      takeDamage(ac);
    }
  } else if (ac.state==='stunned') {
    ac.stunTimer=Math.max(0,ac.stunTimer-dt);
    if (ac.stunTimer===0) {
      ac.state='marching';
      if (flatDistance(cat.position,ac.model.position)<8)
        showToast('The condenser woke up again!');
    }
  }
  const active=ac.state!=='sleeping' && ac.state!=='waking';
  const chomping=ac.state==='marching';
  ac.eyes.forEach((eye) => {
    eye.material.emissive.setHex(active && ac.state!=='defeated' ? 0xff3f18 : 0x2b0502);
    eye.material.emissiveIntensity=chomping ? 1.6 : .35;
  });
  ac.upperTeeth.position.y=chomping ? -.10*Math.sin(ac.marchTime*13) : 0;
  ac.lowerTeeth.position.y=chomping ? .10*Math.sin(ac.marchTime*13) : 0;
  ac.legs.forEach((leg,i) => {
    const stride=chomping ? Math.sin(ac.marchTime*12+(i%2 ? Math.PI : 0)) : 0;
    leg.part.rotation.x=stride*.32;
    leg.part.position.y=leg.restY+Math.max(0,stride)*.08;
  });
  if (ac.state==='defeated') {
    ac.model.rotation.z+=(-.12-ac.model.rotation.z)*(1-Math.exp(-dt*3));
    ac.model.position.y+=(-.04-ac.model.position.y)*(1-Math.exp(-dt*3));
    ac.smoke.forEach((puff,i) => {
      const cycle=(worldTime*.30+i/9)%1;
      puff.visible=true;
      puff.position.set(ac.model.position.x+(i%2 ? -.48 : .45)+Math.sin(worldTime+i)*.25,
        1.08+cycle*2.25,ac.model.position.z-.28+Math.sin(i*8.3)*.44);
      puff.scale.setScalar(.52+cycle*.96);
      puff.material.opacity=.90*(1-cycle);
    });
  }
}
function updateJumpCharge() {
  if (mode!=='playing' || leap?.phase!=='crouch' || !cat) {
    ui.charge.classList.add('hidden');
    return;
  }
  const charge=clamp((leap.time-.18)/2.82,0,1);
  const point=cat.position.clone().add(new THREE.Vector3(0,.12,0)).project(camera);
  if (point.z<0 || point.z>1) { ui.charge.classList.add('hidden'); return; }
  ui.charge.classList.remove('hidden');
  ui.charge.classList.toggle('full',charge>=1);
  ui.charge.style.left=`${(point.x*.5+.5)*innerWidth}px`;
  ui.charge.style.top=`${(-point.y*.5+.5)*innerHeight+28}px`;
  ui.chargeFill.style.width=`${Math.round(charge*100)}%`;
  ui.chargeLabel.textContent=charge>=1 ? 'MEGA JUMP!' : `JUMP ${Math.round(charge*100)}%`;
  ui.charge.setAttribute('aria-valuenow',String(Math.round(charge*100)));
}

const loader = new GLTFLoader();
const asset = (file) => `${import.meta.env.BASE_URL}models/${file}.glb`;
try {
  const [yardGltf, catGltf, antGltf, acGltf] = await Promise.all([
    loader.loadAsync(asset('backyard')), loader.loadAsync(asset('tiger')),
    loader.loadAsync(asset('soldier-ant')), loader.loadAsync(asset('air-conditioner')),
  ]);
  const yard = yardGltf.scene;
  yard.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.receiveShadow = true;
    obj.castShadow = !/Lawn|Grass patch|Terracotta|Warm brick|Drive concrete|Street asphalt|Utility poles and wires/i.test(obj.material?.name || '');
    const name = obj.material?.name || '';
    if (/Leaf green|Sunlit leaf|Deep leaf|Autumn .* leaf/.test(name)) {
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
      obj.material.side = THREE.DoubleSide;
      patioCanopy.push(obj);
    }
    if (/Leaf green|Sunlit leaf|Deep leaf|Autumn .* leaf|Grass blades/.test(name)) {
      const isGrass = /Grass blades/.test(name);
      // Grass roots are authored at y=.012. Give them zero bend weight so a
      // gust rotates the silhouette above the ground instead of sliding it.
      const bendWeight = isGrass
        ? 'pow(clamp((transformed.y - 0.012) / 0.378, 0.0, 1.0), 1.6)'
        : '1.0';
      obj.material.onBeforeCompile = (shader) => {
        shader.uniforms.windTime = { value:0 };
        shader.uniforms.catWorld = { value:new THREE.Vector2(0,25) };
        shader.vertexShader = shader.vertexShader.replace('#include <common>',
          '#include <common>\nuniform float windTime;\nuniform vec2 catWorld;');
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>
          float blade = ${bendWeight};
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
    if (!/Lawn|Grass patch|Grass blades|Leaf green|Sunlit leaf|Deep leaf|Autumn .* leaf|Terracotta brick|Warm brick|Drive concrete|Street asphalt|Utility poles and wires|Warm indoor floor|Patio canopy roof/i.test(name)) {
      cameraObstacles.push(obj);
    }
  });
  scene.add(yard);
  makeLevelPad();
  const acModel=acGltf.scene;
  acModel.position.copy(AC_HOME);
  const acLegs=[];
  const acEyes=[];
  acModel.traverse((obj) => {
    if (obj.isMesh) { obj.castShadow=true; obj.receiveShadow=true; }
    if (obj.name.startsWith('ac_leg_')) acLegs.push({part:obj,restY:obj.position.y});
    if (obj.name.startsWith('ac_eye_lamp')) acEyes.push(obj);
  });
  airConditioner={model:acModel,cover:acModel.getObjectByName('ac_mouth_cover'),
    upperTeeth:acModel.getObjectByName('ac_upper_teeth'),
    lowerTeeth:acModel.getObjectByName('ac_lower_teeth'),
    legs:acLegs,eyes:acEyes,coverRest:0,state:'sleeping',wakeTime:0,
    stunTimer:0,stomps:0,direction:1,marchTime:0,smoke:[]};
  airConditioner.coverRest=airConditioner.cover.position.y;
  makeAirConditionerSmoke();
  scene.add(acModel);
  resetAirConditioner();
  makeFlap("LET'S GO", '#332715', '#f4dc97');
  cat = catGltf.scene;
  // Yaw first keeps the jump pitch aligned with Tiger's heading at every angle.
  cat.rotation.order = 'YXZ';
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
  ui.debugJump.disabled=false;
  ui.debugDefeat.disabled=false;
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
  showTouchControls();
  cat.position.set(0,0,25);
  cat.rotation.set(0,0,0);
  camera.position.set(0,1.48,28.9);
  camera.lookAt(0,1.05,21);
  cameraFocus.set(0,1.05,21);
  cameraYaw = 0;
  cameraOrbit = 0;
  showToast('Follow Tiger through the cat flap…');
}
function showMissionForLevel() {
  if (level===2) {
    ui.missionLabel.textContent='FRONT YARD';
    ui.mission.innerHTML='Condenser stomps <strong id="ac-count"></strong>';
    ui.acCount=document.getElementById('ac-count');
    ui.acCount.textContent=`${airConditioner?.stomps || 0} / 5`;
  } else {
    ui.missionLabel.textContent='BACKYARD PATROL';
    ui.mission.innerHTML='Soldier ants asleep <strong id="ant-count"></strong>';
    ui.antCount=document.getElementById('ant-count');
    updateHud();
  }
  ui.debugLevel.value=String(level);
}
function debugJumpToLevel(target) {
  if (!debugEnabled || !cat) return;
  sound.start();
  keys.clear();
  resetAirConditioner();
  level=target; mode='playing'; transition=null; leap=null;
  catHeight=0; verticalVelocity=0; swipeTime=0;
  cat.visible=true; cat.scale.set(1,1,1); cat.rotation.set(0,0,0);
  catFacing=target===1 ? 0 : Math.PI;
  cat.position.set(target===1 ? 0 : 20.2,0,target===1 ? 9.5 : 30.2);
  cat.rotation.y=-catFacing;
  cameraYaw=catFacing; cameraOrbit=0;
  camera.position.set(cat.position.x,8,cat.position.z+(target===1 ? 7 : -8));
  cameraFocus.copy(cat.position).add(new THREE.Vector3(0,1.05,0));
  camera.lookAt(cameraFocus);
  scene.fog.near=target===1 ? 31 : 50;
  scene.fog.far=target===1 ? 78 : 145;
  catShadow.visible=true;
  ui.charge.classList.add('hidden');
  ui.start.classList.add('hidden'); ui.end.classList.add('hidden');
  ui.hud.classList.remove('hidden'); ui.controls.classList.remove('hidden');
  showTouchControls();
  showMissionForLevel();
  showToast(target===1 ? 'Back to the backyard!' : 'Exploring the front yard!');
}
function debugDefeatAll() {
  if (!debugEnabled || !ants.length) return;
  for (const ant of ants) {
    ant.health=0; ant.awake=false; ant.hitCooldown=0; ant.fall=1;
    ant.model.rotation.z=1.35; ant.model.position.y=.04;
    for (const pip of ant.brains) pip.visible=false;
  }
  asleep=ants.length;
  updateHud();
  setLevelPadActive();
  showToast('All ants asleep. The jump pad is ready!');
}
ui.debugJump.addEventListener('click',() => debugJumpToLevel(Number(ui.debugLevel.value)));
ui.debugDefeat.addEventListener('click',debugDefeatAll);
function restart() { location.reload(); }
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', restart);

window.addEventListener('keydown', (e) => {
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Enter') { if (mode === 'title') startGame(); else if (mode === 'won' || mode === 'lost') restart(); }
  if (e.code === 'KeyR' && (mode === 'won' || mode === 'lost')) restart();
  if (e.code === 'KeyJ') trySwipe();
  if (!e.repeat && (e.code === 'KeyK' || e.code === 'KeyP')) tryPounce(e.code);
  if (!e.repeat && e.code === 'Space') tryJump(e.code);
});
window.addEventListener('keyup', (e) => { keys.delete(e.code); releaseJump(e.code); });
window.addEventListener('blur', () => {
  keys.clear();
  if (leap?.phase === 'crouch') leap = null;
});
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
    if (code === 'Space') tryJump(code);
    if (code === 'KeyJ') trySwipe();
    if (code === 'KeyK') tryPounce(code);
  });
  button.addEventListener('pointerup', (e) => { e.preventDefault(); keys.delete(code); releaseJump(code); });
  button.addEventListener('pointercancel', () => { keys.delete(code); releaseJump(code); });
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
    if (asleep === ants.length) {
      setLevelPadActive();
      showToast('The jump pad by the truck is glowing!');
    }
  } else {
    showToast(`${ant.health} brain${ant.health === 1 ? '' : 's'} left`);
  }
}
function trySwipe() {
  if (mode !== 'playing') return;
  if (leap && (leap.phase === 'crouch' || leap.phase === 'air')) {
    leap.swipeOnLand = true;
    return;
  }
  if (swipeCooldown > 0) return;
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
  else if (hardSurfaceAt(at)) sound.hit();
}
function tryPounce(trigger='KeyK') {
  if (mode !== 'playing') return;
  if (leap) {
    if (leap.phase === 'land') trySwipe();
    else leap.swipeOnLand = true;
    return;
  }
  if (catHeight > .05) return;
  leap = { phase:'crouch', time:0, trigger, releaseRequested:false, swipeOnLand:true };
}
function tryJump(trigger='Space') {
  if (leap || catHeight > .05 || mode !== 'playing') return;
  leap = { phase:'crouch', time:0, trigger, releaseRequested:false, swipeOnLand:false };
}
function releaseJump(trigger) {
  if (leap?.phase === 'crouch' && leap.trigger === trigger) leap.releaseRequested = true;
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

function beginLevelTransition() {
  if (mode !== 'playing' || level !== 1 || !levelPad?.active) return;
  mode='transition';
  transition={time:0,from:cat.position.clone()};
  keys.clear();
  catFacing=Math.PI;
  leap={phase:'air',time:0,swipeOnLand:false};
  swipeTime=0;
  verticalVelocity=8;
  sound.effort();
  showToast('Over the fence, Tiger!');
}
function updateLevelTransition(dt) {
  transition.time+=dt;
  const t=clamp(transition.time/1.45,0,1);
  const glide=smoothstep(0,1,t);
  cat.position.x=THREE.MathUtils.lerp(transition.from.x,20.2,glide);
  cat.position.z=THREE.MathUtils.lerp(transition.from.z,26.6,glide);
  catHeight=3.55*Math.sin(Math.PI*t);
  verticalVelocity=3.55*Math.PI/1.45*Math.cos(Math.PI*t);
  leap.time+=dt;
  cat.position.y=catHeight;
  cat.rotation.y=-Math.PI;
  cat.rotation.x=verticalVelocity>0 ? .15 : -.10;
  cat.rotation.z=0;
  animateRig(dt,0);
  catShadow.position.set(cat.position.x,.018,cat.position.z);
  catShadow.material.opacity=Math.max(0,1-catHeight*.23);
  const cameraTarget=new THREE.Vector3(cat.position.x+6.7,7.6,cat.position.z-4.7);
  camera.position.lerp(cameraTarget,1-Math.exp(-dt*3.8));
  cameraFocus.lerp(cat.position.clone().add(new THREE.Vector3(0,1.3,0)),
    1-Math.exp(-dt*5));
  camera.lookAt(cameraFocus);
  if (t>=1) {
    mode='playing'; level=2; transition=null;
    leap={phase:'land',time:0,swipeOnLand:false};
    catHeight=0; verticalVelocity=0; cat.position.y=0;
    catShadow.material.opacity=1;
    cameraYaw=catFacing; cameraOrbit=0;
    scene.fog.near=50; scene.fog.far=145;
    showMissionForLevel();
    sound.hit();
    showToast('The front yard is yours to explore!');
  }
}

function resolveObstacles(old) {
  let contact = null;
  const xBeforeClamp = cat.position.x, zBeforeClamp = cat.position.z;
  cat.position.x = clamp(cat.position.x, -18.4, 31.5);
  cat.position.z = level === 1
    ? clamp(cat.position.z,-18.4,18.55)
    : clamp(cat.position.z,22.8,95.5);
  if (cat.position.x !== xBeforeClamp || cat.position.z !== zBeforeClamp) contact = 'fence or house';
  // Central oak trunk; the low brick ring stays walkable.
  if (level === 1) {
    const dx = cat.position.x, dz = cat.position.z + 2.5;
    if (Math.hypot(dx,dz) < 1.05) {
      const a = Math.atan2(dz,dx);
      cat.position.x = Math.cos(a)*1.05;
      cat.position.z = -2.5 + Math.sin(a)*1.05;
      contact = 'oak trunk';
    }
  }
  // The driveway stays walkable. Resolve modeled hard props and structures.
  const boxes=level===1 ? solidBoxes : [...frontSolidBoxes,airConditionerBounds()].filter(Boolean);
  for (const [name,minX,maxX,minZ,maxZ,height] of boxes) {
    if (catHeight<=height && cat.position.x>minX && cat.position.x<maxX
        && cat.position.z>minZ && cat.position.z<maxZ) {
      const edges = [
        [Math.abs(cat.position.x-minX), 'x',minX],
        [Math.abs(cat.position.x-maxX), 'x',maxX],
        [Math.abs(cat.position.z-minZ), 'z',minZ],
        [Math.abs(cat.position.z-maxZ), 'z',maxZ],
      ];
      edges.sort((a,b)=>a[0]-b[0]);
      cat.position[edges[0][1]]=edges[0][2];
      contact = name;
    }
  }
  for (const [name,x,z,radius,height] of level===1 ? solidPosts : frontSolidPosts) {
    if (catHeight>height) continue;
    const dx=cat.position.x-x, dz=cat.position.z-z;
    const distance=Math.hypot(dx,dz);
    if (distance < radius) {
      const angle=distance > .001 ? Math.atan2(dz,dx) : Math.atan2(old.z-z,old.x-x);
      cat.position.x=x+Math.cos(angle)*radius;
      cat.position.z=z+Math.sin(angle)*radius;
      contact=name;
    }
  }
  if (!Number.isFinite(cat.position.x) || !Number.isFinite(cat.position.z)) {
    cat.position.copy(old);
    return null;
  }
  return contact;
}

function updateLeap(dt) {
  if (!leap) return;
  leap.time += dt;
  if (leap.phase === 'crouch' && leap.releaseRequested && leap.time >= .18) {
    const charge=clamp((leap.time-.18)/2.82,0,1);
    leap.phase = 'air'; leap.time = 0;
    sound.effort();
    verticalVelocity = 6.3+3.7*charge;
    if (leap.swipeOnLand) showToast('POUNCE!');
  } else if (leap.phase === 'air') {
    const previousHeight=catHeight;
    verticalVelocity -= 16 * dt;
    catHeight += verticalVelocity * dt;
    if (level===2 && airConditioner
        && (airConditioner.state==='marching' || airConditioner.state==='stunned')
        && !leap.stompedAc && verticalVelocity<0
        && previousHeight>AC_TOP && catHeight<=AC_TOP
        && overlapsAirConditioner(cat.position.x,cat.position.z,.15)) {
      leap.stompedAc=true;
      stompAirConditioner();
      catHeight=AC_TOP+.04;
      verticalVelocity=4.1;
    }
    if (catHeight <= 0) {
      catHeight = 0; verticalVelocity = 0;
      leap.phase = 'land'; leap.time = 0;
      if (surfaceAt(cat.position) !== 'grass' && hardImpactCooldown <= 0) {
        sound.hit();
        hardImpactCooldown = .25;
      }
      if (leap.swipeOnLand) {
        swipeCooldown = 0;
        trySwipe();
      }
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
    const hind = name.includes('hind');
    let bend = (step[name] || 0) * .52 * amount;
    let legStretch = 1;
    let sweep = 0;
    if (leap?.phase === 'crouch') {
      bend = hind ? .50 : .10;
      legStretch = hind ? .74 : .94;
    }
    if (leap?.phase === 'air') {
      const pushingOff = verticalVelocity > 0;
      bend = hind ? (pushingOff ? -1.02 : -.52) : (pushingOff ? .78 : .23);
      legStretch = hind ? (pushingOff ? 1.22 : 1.08) : (pushingOff ? .89 : 1.04);
    }
    if (leap?.phase === 'land') {
      bend = (hind ? -.14 : .67) * (1 - smoothstep(0,.22,leap.time));
      legStretch = hind ? 1 : 1.06-.06*smoothstep(0,.22,leap.time);
    }
    if (swipeTime > 0 && name === swipeName) {
      bend += Math.sin(swipeProgress*Math.PI) * 1.05;
      sweep = (swipeSide > 0 ? 1 : -1) * Math.cos(swipeProgress*Math.PI) * .72;
    }
    const a = 1-Math.exp(-dt*24);
    part.rotation.x += (rest.x+bend-part.rotation.x)*a;
    part.rotation.z += (rest.z+sweep-part.rotation.z)*a;
    part.scale.y += (legStretch-part.scale.y)*a;
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
  hardImpactCooldown = Math.max(0,hardImpactCooldown-dt);
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
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7.2 : 5.2;
  const old = cat.position.clone();
  cat.position.addScaledVector(direction, speed * dt * (leap?.phase === 'crouch' ? 0 : 1));
  const attemptedSpeed = Math.hypot(cat.position.x-old.x,cat.position.z-old.z) / Math.max(dt,.001);
  const hardContact = resolveObstacles(old);
  if (hardContact && hardContact !== lastHardContact
      && attemptedSpeed > 1.2 && hardImpactCooldown <= 0) {
    sound.hit();
    hardImpactCooldown = .25;
  }
  lastHardContact = hardContact;
  if (hardContact==='air conditioner' && airConditioner?.state==='marching'
      && catHeight<.25 && leap?.phase!=='air')
    takeDamage(airConditioner);
  if (level===1 && levelPad?.active && catHeight<.12
      && flatDistance(cat.position,PAD_POSITION)<.98) beginLevelTransition();
  // A/D steer while walking; at rest they look and pan without spinning Tiger.
  // Three.js positive yaw sends local -Z toward -X.
  cat.rotation.y = -catFacing;
  animateRig(dt,moving && leap?.phase !== 'crouch' ? speed : 0);
  const jumpPitch = leap?.phase === 'crouch' ? .22
    : leap?.phase === 'air' ? (verticalVelocity > 0 ? .16 : -.11)
    : leap?.phase === 'land' ? -.08*(1-smoothstep(0,.22,leap.time)) : 0;
  cat.rotation.x += (jumpPitch-cat.rotation.x)*(1-Math.exp(-dt*13));
  let stretch = 1;
  if (leap?.phase === 'crouch') stretch = 1 - .22 * smoothstep(0,.18,leap.time);
  if (leap?.phase === 'air') stretch = verticalVelocity > 0 ? 1.04 : .98;
  if (leap?.phase === 'land') stretch = .83 + .17 * smoothstep(0,.22,leap.time);
  cat.scale.set(1,stretch,1);
  cat.position.y = catHeight + (moving && !leap ? Math.sin(walkTime*2)*.025 : 0);
  if (swipeTime > 0) {
    swipeTime = Math.max(0,swipeTime-dt);
    cat.rotation.z = leap ? 0 : Math.sin((1-swipeTime/.42)*Math.PI)*.08;
  } else cat.rotation.z = 0;
  cat.visible = invincible <= 0 || Math.floor(invincible*10)%2 === 0;
  catShadow.visible = true;
  catShadow.position.x = cat.position.x;
  catShadow.position.z = cat.position.z;
  catShadow.material.opacity = 1 - catHeight * .23;
}
function updateAnts(dt, time) {
  const hidden = hiddenInBush() && swipeTime <= 0 && !leap?.swipeOnLand;
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
    if (chase && distance < .78 && ant.attackCooldown <= 0 && catHeight < .5 && leap?.phase !== 'air') {
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
  if (level===2 && cat.position.z>58 && cat.position.z<70
      && Math.abs(cat.position.x)<7) {
    choices.unshift({turn:-1.3,height:7.5,distance:15.5,penalty:-.25});
  }
  let best = null;
  for (const choice of choices) {
    const angle = cameraYaw+choice.turn;
    const candidate = new THREE.Vector3(
      cat.position.x-Math.sin(angle)*choice.distance,
      choice.height,
      cat.position.z+Math.cos(angle)*choice.distance,
    );
    candidate.x = clamp(candidate.x,-18.5,31.7);
    candidate.z = level===1
      ? clamp(candidate.z,-18.5,cat.position.x>18.5 && cat.position.z>10 ? 27 : 17.2)
      : clamp(candidate.z,14.5,97.0);
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
    wanted.lerp(anchor,1-Math.min(1,Math.max(1.5,best.clear)/best.length));
  }
  const closing = camera.position.distanceTo(anchor) > wanted.distanceTo(anchor);
  camera.position.lerp(wanted,1-Math.exp(-dt*(closing ? 10 : 4)));
  // The smooth path can itself cross a branch or wall: keep the final point clear.
  const visibleDistance = cameraClearDistance(anchor,camera.position);
  const actualDistance = camera.position.distanceTo(anchor);
  if (visibleDistance < actualDistance) {
    camera.position.lerp(anchor,1-Math.min(1,Math.max(1.5,visibleDistance)/actualDistance));
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
    if (swipePressed && !lastSwipe) trySwipe();
    lastSwipe = swipePressed;
    updateCat(dt);
    updateAnts(dt,time);
    updateAirConditioner(dt);
    updateCamera(dt);
    if (flapHinge) flapHinge.rotation.x *= Math.exp(-dt*1.5);
    updateStatus();
  } else if (mode === 'transition') {
    updateLevelTransition(dt);
  } else if (mode === 'title' && cat) {
    camera.position.set(13,13,14);
    camera.lookAt(0,1,-2);
    updateAnts(dt,time);
  }
  updateJumpCharge();
  for (let i=effects.length-1;i>=0;i--) {
    const fx=effects[i]; fx.age+=dt;
    fx.mesh.scale.multiplyScalar(1+dt*4);
    fx.mesh.material.opacity=Math.max(0,1-fx.age/fx.life);
    if (fx.age>=fx.life) { scene.remove(fx.mesh); fx.mesh.geometry.dispose(); fx.mesh.material.dispose(); effects.splice(i,1); }
  }
  if (toastTime > 0) { toastTime-=dt; if (toastTime<=0) ui.toast.classList.add('hidden'); }
  worldTime += dt;
  if (levelPad?.active) {
    const pulse=(worldTime*1.5)%1;
    levelPad.ring.scale.setScalar(1+pulse*.48);
    levelPad.ring.material.opacity=(1-pulse)*.70;
    levelPad.light.intensity=1.4+.55*Math.sin(worldTime*5);
    levelPad.base.material.emissiveIntensity=.75+.22*Math.sin(worldTime*5);
  }
  if (cat) {
    sun.position.set(cat.position.x-10,24,cat.position.z+10);
    sun.target.position.set(cat.position.x,0,cat.position.z);
    sun.target.updateMatrixWorld();
  }
  for (const uniforms of windMaterials) {
    uniforms.windTime.value = worldTime;
    if (cat) uniforms.catWorld.value.set(cat.position.x,cat.position.z);
  }
  let canopyBlocksTiger = false;
  if (cat && (mode === 'intro' || mode === 'playing')) {
    const toTiger = cat.position.clone().add(new THREE.Vector3(0,1.05,0)).sub(camera.position);
    const distance = toTiger.length();
    roofRay.set(camera.position,toTiger.normalize());
    roofRay.near = .05;
    roofRay.far = distance - .20;
    canopyBlocksTiger = roofRay.intersectObjects(patioCanopy,false).length > 0;
  }
  for (const roof of patioCanopy) {
    const inCameraPath=canopyBlocksTiger;
    const wanted=inCameraPath ? 0 : 1;
    roof.material.opacity += (wanted-roof.material.opacity)*(1-Math.exp(-dt*14));
    roof.castShadow = !inCameraPath;
  }
  if (cat) {
    const surface = surfaceAt(cat.position);
    const walking = mode==='intro' || (mode==='playing' && leap?.phase !== 'crouch' &&
      (keys.has('KeyW') || keys.has('ArrowUp') || keys.has('KeyS') || keys.has('ArrowDown')));
    sound.update(mode==='transition' ? 'playing' : mode,walkTime,walking,
      catHeight<.05 && leap?.phase!=='air',surface,
      cat.position,ants);
  }
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
window.addEventListener('resize', () => {
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
