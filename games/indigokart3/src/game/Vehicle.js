import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createKart(car, driverColor = 0xffffff, lightsOn = false) {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: car.color, metalness: .23, roughness: .36, envMapIntensity: .45, clearcoat: .35, clearcoatRoughness: .35 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x172629, roughness: .65 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb4c7c7, metalness: .85, roughness: .22 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x17323e, metalness: .05, roughness: .2, envMapIntensity: .2, transparent:true, opacity:.42, depthWrite:false, clearcoat: 1 });
  const glow = new THREE.MeshStandardMaterial({ color: car.accent, emissive: car.accent, emissiveIntensity: car.kind === 'tank' ? 3 : .35 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe9b68e, roughness: .9 });
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (x,y,z,w,h,d,mat=paint,r=.1) => add(body, new RoundedBoxGeometry(w,h,d,2,r), mat,x,y,z);
  box(0,.64,0,2.3,.52,4.1);
  box(0,.4,0,2.22,.25,3.95,trim);
  if (car.kind === 'truck') {
    box(0,1.08,1.15,2.22,.55,1.62);
    box(0,1.50,.10,2.03,1.2,1.57,glass);
    box(0,2.1,.07,2.22,.14,1.8);
    for (const x of [-1,1]) {
      box(x,1.58,.79,.12,1.02,.11); box(x,1.58,-.64,.14,1.02,.12);
      box(x,1.1,-1.4,.2,.72,1.35); // genuinely open tray: floor, sidewalls, tailgate
    }
    box(0,.88,-1.36,1.8,.07,1.3,trim);
    for (let i=-3;i<=3;i++) box(i*.23,.94,-1.36,.04,.04,1.3,chrome,.01);
    box(0,1.13,-2.03,2.16,.7,.16);
    box(0,.78,2.09,1.25,.4,.10,trim);
    for (let i=-2;i<=2;i++) box(i*.23,.78,2.16,.12,.26,.03,chrome,.01);
    box(0,.5,2.17,2.4,.2,.18,chrome);
  } else if (car.kind === 'sedan') {
    box(0,.99,.4,2.18,.48,2.8);
    box(0,1.37,-.16,1.87,.76,2.13,glass,.27);
    box(0,1.8,-.36,1.72,.10,1.12,trim);
    box(0,1.01,1.6,2.08,.24,1.0,paint,.12);
    for (const x of [-.96,.96]) {
      box(x,1.36,-.14,.06,.6,.12,paint,.02);
      box(x,.91,-.35,.07,.08,.29,chrome,.02);
      box(x*1.22,1.26,.55,.28,.16,.33);
    }
    box(0,.87,-2.0,1.8,.06,.08,glow,.02);
  } else {
    box(0,1.09,0,2.6,.65,3.8,paint,.04);
    box(0,1.7,-.3,1.85,.64,1.9,paint,.04);
    box(0,1.84,.69,1.6,.28,.05,glass,.01);
    box(0,1.53,1.85,2.36,.09,.07,glow,.01);
    box(0,1.14,-1.97,2.38,.09,.07,glow,.01);
    for (const x of [-1.35,1.35]) {
      box(x,.48,0,.55,.88,3.6,trim,.3);
      box(x*1.2,.72,0,.04,.07,3.1,glow,.01);
    }
    box(0,2.07,-.45,.7,.15,.7,trim);
    // A playful sensor turret, not a weapon.
    box(.51,2.24,-.4,.17,.58,.17,chrome);
    add(body,new THREE.SphereGeometry(.16,12,8),glow,.51,2.54,-.4);
  }
  // Open side windows reveal the driver. Dan's higher torso and head are intentional.
  const driver = new THREE.Group(); body.add(driver);
  if (car.kind === 'sedan') driver.position.y = -.32;
  const tall = car.id === 'dan' ? .18 : 0;
  const suit = new THREE.MeshStandardMaterial({ color: car.id === 'dan' ? 0xe4b965 : car.accent });
  add(driver,new THREE.CapsuleGeometry(.22,.35+tall,4,8),suit,-.42,1.36,.05);
  const head = add(driver,new THREE.SphereGeometry(.23,16,12),skin,-.42,1.82+tall,.1);
  add(driver,new THREE.SphereGeometry(.235,16,8,0,Math.PI*2,0,1.5),trim,-.42,1.91+tall,.08);
  for (const x of [-.50,-.34]) add(driver,new THREE.SphereGeometry(.022,6,4),trim,x,1.85+tall,.31);
  const steeringWheel = add(driver,new THREE.TorusGeometry(.20,.03,6,16),trim,-.42,1.42,.62);
  steeringWheel.rotation.x=.7;
  root.userData.driver = driver; root.userData.head = head; root.userData.steeringWheel = steeringWheel;
  const headlight = new THREE.MeshStandardMaterial({ color: 0xfff8da, emissive: 0xffe7bb, emissiveIntensity: lightsOn ? 4 : 1 });
  const tail = new THREE.MeshStandardMaterial({ color: 0xff334a, emissive: 0xff233a, emissiveIntensity: .8 });
  for (const x of [-.85,.85]) {
    box(x,.96,2.075,.45,.13,.06,headlight,.03);
    box(x,.88,-2.09,.38,.13,.06,tail,.03);
    if (lightsOn) {
      const light=new THREE.SpotLight(0xffedcf,24,22,.5,.75,1.5);
      light.position.set(x,1,2.1); const target=new THREE.Object3D(); target.position.set(x,.1,15);
      light.target=target; body.add(light,target);
    }
  }
  // Nameplates are original typography, not downloaded logos.
  const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=64;
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#152527'; ctx.fillRect(0,0,256,64);
  ctx.fillStyle='#f4efda'; ctx.font='bold 36px sans-serif'; ctx.textAlign='center';
  ctx.fillText(car.kind === 'truck' ? 'TOYOTA' : car.kind === 'tank' ? 'ASA / 04' : 'TESLA',128,45);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const plate=add(body,new THREE.PlaneGeometry(.9,.23),new THREE.MeshStandardMaterial({map:texture}),0,.73,-2.125); plate.rotation.y=Math.PI;
  const wheels=[];
  for (const x of [-1,1]) for (const z of [-1.32,1.32]) {
    const wheel = new THREE.Group(); wheel.position.set(x*(car.kind==='tank'?1.37:1.25),.5,z); root.add(wheel);
    const spin = new THREE.Group(); wheel.add(spin);
    const tire=add(spin,new THREE.CylinderGeometry(.49,.49,.34,24),trim,0,0,0); tire.rotation.z=Math.PI/2;
    const rim=add(spin,new THREE.CylinderGeometry(.30,.30,.355,16),chrome,0,0,0); rim.rotation.z=Math.PI/2;
    for(let k=0;k<6;k++) {
      const spoke=add(spin,new THREE.BoxGeometry(.37,.08,.48),trim,0,0,0); spoke.rotation.x=k*Math.PI/3;
    }
    // Tangible tire tread, visible in the garage and on the outside wheels.
    for(let k=0;k<18;k++) {
      const a=k*Math.PI/9;
      const tread=add(spin,new THREE.BoxGeometry(.36,.055,.11),trim,0,Math.cos(a)*.485,Math.sin(a)*.485); tread.rotation.x=a;
    }
    const spring=add(root,new THREE.CylinderGeometry(.09,.09,.45,8),chrome,x*1.0,.7,z);
    wheel.userData={baseX:wheel.position.x,baseY:.5,front:z>0,phase:(x+z)*1.7,spin,spring}; wheels.push(wheel);
  }
  const shield = add(root,new THREE.SphereGeometry(2.8,24,16),new THREE.MeshBasicMaterial({ color: 0x74ffcb, wireframe:true, transparent:true, opacity:.12, depthWrite:false }),0,1,0);
  shield.visible=false; root.userData.shield=shield;
  root.userData.wheels=wheels; root.userData.body=body; root.userData.tail=tail;
  batchStaticMeshes(body);
  wheels.forEach(wheel => batchStaticMeshes(wheel.userData.spin));
  root.scale.setScalar(.84);
  return root;
}

// Keep the body, steering, suspension and rolling wheels independently animated,
// but draw static panels/treads as one mesh per material rather than per detail.
function batchStaticMeshes(parent) {
  const buckets = new Map();
  for (const node of [...parent.children]) {
    if (!node.isMesh) continue;
    node.updateMatrix();
    const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    geometry.applyMatrix4(node.matrix);
    if (!buckets.has(node.material)) buckets.set(node.material, []);
    buckets.get(node.material).push(geometry);
    node.geometry.dispose(); parent.remove(node);
  }
  for (const [material, geometries] of buckets) {
    const object = new THREE.Mesh(mergeGeometries(geometries, false), material);
    object.castShadow = object.receiveShadow = true; parent.add(object);
    geometries.forEach(g=>g.dispose());
  }
}

export function disposeKart(root) {
  const materials = new Set(), geometries = new Set();
  root.traverse(node => {
    if(node.geometry) geometries.add(node.geometry);
    if(node.material) (Array.isArray(node.material)?node.material:[node.material]).forEach(m=>materials.add(m));
  });
  geometries.forEach(g=>g.dispose()); materials.forEach(m=>{m.map?.dispose();m.dispose();});
  root.removeFromParent();
}
export class Racer {
  constructor({ name, car, color, isPlayer = false, skill = 1, lane = 0, lightsOn = false }) {
    this.name = name;
    this.car = car;
    this.isPlayer = isPlayer;
    this.skill = skill;
    this.lane = lane;
    this.mesh = createKart(car, color, lightsOn);
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.speed = 0;
    this.distanceTravelled = 0;
    this.progress = 0;
    this.previousProgress = 0;
    this.lap = 0;
    this.finished = false;
    this.finishPlace = 0;
    this.finishTime = 0;
    this.offroad = false;
    this.bumpCooldown = 0;
    this.damage = 0;
    this.steer = 0;
    this.routeDistance = null;
    this.aiWobble = Math.random() * Math.PI * 2;
    this.verticalSpeed = 0;
    this.bodyBounce = 0;
    this.bodyBounceSpeed = 0;
  }

  reset(track, gridIndex) {
    const row = Math.floor(gridIndex / 2);
    const side = gridIndex % 2 ? 1 : -1;
    const progress = (1 - (row * 6 + 7) / track.length) % 1;
    const frame = track.frameAt(progress);
    this.position.copy(frame.point).addScaledVector(frame.side, side * 2.35);
    this.position.y = frame.point.y + 0.05;
    this.yaw = Math.atan2(frame.tangent.x, frame.tangent.z);
    this.speed = 0;
    this.distanceTravelled = 0;
    this.velocity.set(0, 0, 0);
    this.verticalSpeed = 0;
    this.bodyBounce = 0;
    this.bodyBounceSpeed = 0;
    this.progress = progress;
    this.routeDistance = progress - 1;
    this.previousProgress = progress;
    this.lap = 0;
    this.finished = false;
    this.finishPlace = 0;
    this.damage = 0;
    this.steer = 0;
    this.angularVelocity = 0;
    this.crashTimer = 0;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, this.yaw, 0);
  }

  syncVisual(track, dt, steer = 0, dynamics = {}) {
    // Sample beneath all four tires. The wheel assembly is placed directly on
    // that fitted plane; suspension movement belongs to the chassis above it.
    // This prevents centerline pitch from burying one side of the kart while the
    // opposite tires hover on diagonal or off-road slopes.
    const contact = track.wheelContactFrame(this.position, this.yaw, this.car);
    const previousGround = this.position.y;
    this.position.y = contact.groundY;
    const sampledVerticalSpeed = (this.position.y - previousGround) / Math.max(dt, 0.001);
    this.verticalSpeed = THREE.MathUtils.lerp(this.verticalSpeed, sampledVerticalSpeed, 1 - Math.exp(-12 * dt));
    this.distanceTravelled += Math.max(0, this.speed) * dt;

    const roughness = this.offroad ? 0.075 : 0.012;
    const roadBuzz = Math.sin(this.distanceTravelled * (this.offroad ? 4.8 : 2.1)) * roughness;
    const bounceTarget = roadBuzz + Math.min(0.12, Math.abs(this.verticalSpeed) * 0.035) + (dynamics.boost ? 0.04 : 0);
    this.bodyBounceSpeed += ((bounceTarget - this.bodyBounce) * this.car.physics.spring - this.bodyBounceSpeed * this.car.physics.damping) * dt;
    this.bodyBounce += this.bodyBounceSpeed * dt;

    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(contact.quaternion);

    const body = this.mesh.userData.body;
    const damage = dynamics.damage || 0;
    const damageWobble = damage * damage * Math.sin(this.distanceTravelled * 2.8 + this.aiWobble);
    body.position.y = THREE.MathUtils.lerp(body.position.y, this.bodyBounce + Math.abs(damageWobble) * 0.025, 1 - Math.exp(-12 * dt));
    body.position.x = THREE.MathUtils.lerp(body.position.x, damageWobble * 0.045, 1 - Math.exp(-9 * dt));
    const dive = (dynamics.brake || 0) * 0.075 - (dynamics.throttle || 0) * 0.025 - (dynamics.boost ? 0.045 : 0);
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, dive, 1 - Math.exp(-7 * dt));
    const chassisLean = -steer * Math.min(this.speed / 25, 1) * 0.105;
    body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, chassisLean + damageWobble * 0.055, 1 - Math.exp(-8 * dt));

    this.mesh.userData.steeringWheel.rotation.z = -steer * .6;
    this.mesh.userData.driver.rotation.z = -steer * .045;
    this.mesh.userData.head.rotation.y = steer * .12;
    this.mesh.userData.tail.emissiveIntensity = dynamics.brake ? 3.5 : .6;
    this.mesh.userData.shield.visible = (this.shieldTimer || 0) > 0;
    this.mesh.userData.wheels.forEach((wheel, index) => {
      wheel.userData.spin.rotation.x += this.speed * dt / .49;
      const axleLoad = wheel.userData.front ? (dynamics.brake || 0) * -0.075 : (dynamics.throttle || 0) * -0.045;
      const chatter = Math.sin(this.distanceTravelled * 5.4 + wheel.userData.phase) * roughness;
      const contactCorrection = contact.residuals[index] / 0.84;
      const wheelTarget = wheel.userData.baseY + contactCorrection + axleLoad + chatter - this.bodyBounce * 0.38;
      wheel.position.y = THREE.MathUtils.lerp(wheel.position.y, wheelTarget, 1 - Math.exp(-15 * dt));
      const bentAxle = Math.sin(this.distanceTravelled * (2.2 + index * 0.08) + wheel.userData.phase) * damage * damage;
      wheel.position.x = wheel.userData.baseX + bentAxle * 0.085;
      wheel.rotation.y = (wheel.userData.front ? steer * .40 : 0) + bentAxle * .18;
      wheel.userData.spring.scale.y = Math.max(.3, 1 + (wheel.position.y - .5) * 2);
    });
  }
}
