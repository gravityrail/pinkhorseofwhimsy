import * as THREE from 'three';

function makeSoftParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

class ParticlePool {
  constructor(scene, { color, size, max = 90, life = 0.8, lift = 0.5 }) {
    this.max = max;
    this.defaultLife = life;
    this.lift = lift;
    this.cursor = 0;
    this.positions = new Float32Array(max * 3);
    this.items = Array.from({ length: max }, () => ({ life: 0, velocity: new THREE.Vector3() }));
    this.positions.fill(-999);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      color,
      size,
      map: makeSoftParticleTexture(),
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.scene = scene;
  }

  spawn(origin, baseVelocity, count = 1, spread = 1) {
    for (let n = 0; n < count; n += 1) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const item = this.items[index];
      item.life = this.defaultLife * (0.72 + Math.random() * 0.5);
      item.velocity.copy(baseVelocity);
      item.velocity.x += (Math.random() - 0.5) * spread;
      item.velocity.y += Math.random() * this.lift;
      item.velocity.z += (Math.random() - 0.5) * spread;
      const p = index * 3;
      this.positions[p] = origin.x + (Math.random() - 0.5) * 0.7;
      this.positions[p + 1] = origin.y + Math.random() * 0.25;
      this.positions[p + 2] = origin.z + (Math.random() - 0.5) * 0.7;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.max; i += 1) {
      const item = this.items[i];
      if (item.life <= 0) continue;
      item.life -= dt;
      const p = i * 3;
      if (item.life <= 0) {
        this.positions[p] = this.positions[p + 1] = this.positions[p + 2] = -999;
        continue;
      }
      this.positions[p] += item.velocity.x * dt;
      this.positions[p + 1] += item.velocity.y * dt;
      this.positions[p + 2] += item.velocity.z * dt;
      item.velocity.multiplyScalar(Math.max(0, 1 - dt * 1.7));
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.map.dispose();
    this.material.dispose();
  }
}

export class KartEffects {
  constructor(scene, track) {
    this.accumulators = { dust: 0, smoke: 0, boost: 0, damage: 0 };
    // Tracks can tint their offroad dust (red outback dirt, sepia gold-rush
    // roads); the boost trail goes cyan wherever it's dark enough to glow.
    const dark = track.time === 'night' || track.time === 'space';
    const dustColor = track.palette.dust ?? (dark ? 0x8079a7 : 0xd9b56d);
    this.dust = new ParticlePool(scene, { color: dustColor, size: 1.15, max: 130, life: 1.05, lift: 1.1 });
    this.smoke = new ParticlePool(scene, { color: 0xdfe5ea, size: 0.72, max: 80, life: 0.68, lift: 0.6 });
    this.boost = new ParticlePool(scene, { color: dark ? 0x57e7ff : 0xffd84d, size: 0.62, max: 110, life: 0.46, lift: 0.22 });
    this.damage = new ParticlePool(scene, { color: 0x34343d, size: 0.92, max: 90, life: 1.25, lift: 1.45 });
  }

  emitRate(kind, origin, velocity, rate, dt, spread = 1) {
    this.accumulators[kind] += rate * dt;
    const count = Math.floor(this.accumulators[kind]);
    if (count <= 0) return;
    this.accumulators[kind] -= count;
    this[kind].spawn(origin, velocity, count, spread);
  }

  update(dt) {
    this.dust.update(dt);
    this.smoke.update(dt);
    this.boost.update(dt);
    this.damage.update(dt);
  }

  dispose() {
    this.dust.dispose();
    this.smoke.dispose();
    this.boost.dispose();
    this.damage.dispose();
  }
}
