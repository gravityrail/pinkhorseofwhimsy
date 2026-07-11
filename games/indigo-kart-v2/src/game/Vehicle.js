import * as THREE from 'three';

const shared = {
  tire: new THREE.MeshStandardMaterial({ color: 0x0b0b11, roughness: 0.92 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xaeb7c2, metalness: 0.82, roughness: 0.22 }),
  visor: new THREE.MeshStandardMaterial({ color: 0x17283b, metalness: 0.65, roughness: 0.16 }),
};

function addMesh(parent, geometry, material, position) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function addArm(parent, suitMaterial, x) {
  const arm = addMesh(parent, new THREE.CapsuleGeometry(0.105, 0.48, 4, 7), suitMaterial, [x, 1.52, 0.62]);
  arm.rotation.x = 0.92;
  arm.rotation.z = x > 0 ? 0.2 : -0.2;
  return arm;
}

export function createKart(car, driverColor = 0xffffff, lightsOn = false) {
  const root = new THREE.Group();
  const sprungBody = new THREE.Group();
  root.add(sprungBody);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: car.color, roughness: 0.38, metalness: 0.22 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: car.accent, roughness: 0.5 });
  const suitMaterial = new THREE.MeshStandardMaterial({ color: driverColor, roughness: 0.68 });
  const helmetMaterial = new THREE.MeshStandardMaterial({ color: car.accent, roughness: 0.3, metalness: 0.12 });

  const lower = addMesh(sprungBody, new THREE.BoxGeometry(2.3, 0.55, 3.3), bodyMaterial, [0, 0.65, 0]);
  lower.geometry.translate(0, 0, -0.1);
  addMesh(sprungBody, new THREE.BoxGeometry(1.75, 0.45, 1.4), accentMaterial, [0, 1.05, 0.35]);
  addMesh(sprungBody, new THREE.BoxGeometry(2.65, 0.16, 0.5), accentMaterial, [0, 0.55, -1.9]);
  addMesh(sprungBody, new THREE.BoxGeometry(2.4, 0.13, 0.42), bodyMaterial, [0, 1.3, 1.72]);
  addMesh(sprungBody, new THREE.CylinderGeometry(0.1, 0.1, 0.8, 7), shared.chrome, [-0.92, 0.93, 1.46]);
  addMesh(sprungBody, new THREE.CylinderGeometry(0.1, 0.1, 0.8, 7), shared.chrome, [0.92, 0.93, 1.46]);

  // Driver: visible torso, shoulders, arms, steering wheel, helmet shell,
  // reflective visor, and a contrasting center stripe.
  addMesh(sprungBody, new THREE.CylinderGeometry(0.34, 0.44, 0.72, 9), suitMaterial, [0, 1.48, 0.28]);
  addMesh(sprungBody, new THREE.BoxGeometry(0.8, 0.18, 0.3), suitMaterial, [0, 1.67, 0.38]);
  addArm(sprungBody, suitMaterial, -0.38);
  addArm(sprungBody, suitMaterial, 0.38);
  const steeringWheel = addMesh(sprungBody, new THREE.TorusGeometry(0.28, 0.055, 7, 14), shared.chrome, [0, 1.38, 0.9]);
  steeringWheel.rotation.x = 0.76;
  addMesh(sprungBody, new THREE.SphereGeometry(0.39, 16, 11), helmetMaterial, [0, 2.0, 0.29]);
  const visor = addMesh(sprungBody, new THREE.BoxGeometry(0.61, 0.18, 0.12), shared.visor, [0, 2.04, 0.63]);
  visor.rotation.x = -0.09;
  addMesh(sprungBody, new THREE.BoxGeometry(0.105, 0.48, 0.08), accentMaterial, [0, 2.18, -0.02]);
  addMesh(sprungBody, new THREE.BoxGeometry(0.52, 0.1, 0.12), helmetMaterial, [0, 1.82, 0.56]);

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: lightsOn ? 0xfff4c2 : 0x8d948f,
    emissive: lightsOn ? 0xffedaa : 0x000000,
    emissiveIntensity: lightsOn ? 4.2 : 0,
    roughness: 0.18,
  });
  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff253f,
    emissive: lightsOn ? 0xff102d : 0x220005,
    emissiveIntensity: lightsOn ? 4.5 : 0.25,
    roughness: 0.22,
  });
  for (const x of [-0.72, 0.72]) {
    addMesh(sprungBody, new THREE.BoxGeometry(0.42, 0.22, 0.11), headlightMaterial, [x, 0.73, 1.63]);
    addMesh(sprungBody, new THREE.BoxGeometry(0.43, 0.2, 0.11), taillightMaterial, [x, 0.75, -1.72]);
    if (lightsOn) {
      const headlight = new THREE.SpotLight(0xffefbd, 52, 27, 0.43, 0.66, 1.55);
      headlight.position.set(x, 0.76, 1.68);
      headlight.castShadow = false;
      const target = new THREE.Object3D();
      target.position.set(x * 0.45, 0.18, 13);
      sprungBody.add(target, headlight);
      headlight.target = target;
    }
  }
  if (lightsOn) {
    const tailGlow = new THREE.PointLight(0xff1738, 3.5, 5.5, 2);
    tailGlow.position.set(0, 0.76, -1.8);
    sprungBody.add(tailGlow);
  }

  const wheels = [];
  for (const x of [-1.25, 1.25]) {
    for (const z of [-1.15, 1.18]) {
      const wheel = addMesh(root, new THREE.CylinderGeometry(0.47, 0.47, 0.42, 14), shared.tire, [x, 0.48, z]);
      wheel.rotation.z = Math.PI / 2;
      wheel.userData.baseX = x;
      wheel.userData.baseY = 0.48;
      wheel.userData.front = z > 0;
      wheel.userData.phase = (x + z) * 1.7;
      wheels.push(wheel);
      const hub = addMesh(wheel, new THREE.CylinderGeometry(0.17, 0.17, 0.44, 10), shared.chrome, [0, 0, 0]);
      hub.castShadow = false;
    }
  }
  root.userData.wheels = wheels;
  root.userData.body = sprungBody;
  root.scale.setScalar(0.84);
  return root;
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
    this.aiWobble = Math.random() * Math.PI * 2;
    this.verticalSpeed = 0;
    this.bodyBounce = 0;
    this.bodyBounceSpeed = 0;
  }

  reset(track, gridIndex) {
    const row = Math.floor(gridIndex / 2);
    const side = gridIndex % 2 ? 1 : -1;
    const progress = (1 - (row * 0.014 + 0.018)) % 1;
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
    this.previousProgress = progress;
    this.lap = 0;
    this.finished = false;
    this.finishPlace = 0;
    this.damage = 0;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, this.yaw, 0);
  }

  syncVisual(track, dt, steer = 0, dynamics = {}) {
    // Sample beneath all four tires. The wheel assembly is placed directly on
    // that fitted plane; suspension movement belongs to the chassis above it.
    // This prevents centerline pitch from burying one side of the kart while the
    // opposite tires hover on diagonal or off-road slopes.
    const contact = track.wheelContactFrame(this.position, this.yaw);
    const previousGround = this.position.y;
    this.position.y = contact.groundY;
    const sampledVerticalSpeed = (this.position.y - previousGround) / Math.max(dt, 0.001);
    this.verticalSpeed = THREE.MathUtils.lerp(this.verticalSpeed, sampledVerticalSpeed, 1 - Math.exp(-12 * dt));
    this.distanceTravelled += Math.max(0, this.speed) * dt;

    const roughness = this.offroad ? 0.075 : 0.012;
    const roadBuzz = Math.sin(this.distanceTravelled * (this.offroad ? 4.8 : 2.1)) * roughness;
    const bounceTarget = roadBuzz + Math.min(0.12, Math.abs(this.verticalSpeed) * 0.035) + (dynamics.boost ? 0.04 : 0);
    this.bodyBounceSpeed += ((bounceTarget - this.bodyBounce) * 42 - this.bodyBounceSpeed * 9) * dt;
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

    this.mesh.userData.wheels.forEach((wheel, index) => {
      wheel.rotation.x -= this.speed * dt * 1.8;
      const axleLoad = wheel.userData.front ? (dynamics.brake || 0) * -0.075 : (dynamics.throttle || 0) * -0.045;
      const chatter = Math.sin(this.distanceTravelled * 5.4 + wheel.userData.phase) * roughness;
      const contactCorrection = contact.residuals[index] / 0.84;
      const wheelTarget = wheel.userData.baseY + contactCorrection + axleLoad + chatter - this.bodyBounce * 0.38;
      wheel.position.y = THREE.MathUtils.lerp(wheel.position.y, wheelTarget, 1 - Math.exp(-15 * dt));
      const bentAxle = Math.sin(this.distanceTravelled * (2.2 + index * 0.08) + wheel.userData.phase) * damage * damage;
      wheel.position.x = wheel.userData.baseX + bentAxle * 0.085;
      wheel.rotation.y = bentAxle * 0.18;
    });
  }
}
