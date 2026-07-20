import * as THREE from 'three';
import { mulberry32 } from './utils.js';

const UP = new THREE.Vector3(0, 1, 0);

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
}

function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

export class TrackWorld {
  constructor(scene, data) {
    this.scene = scene;
    this.data = data;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.random = mulberry32(data.seed);
    this.curve = new THREE.CatmullRomCurve3(
      data.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      true,
      'catmullrom',
      0.45,
    );
    this.sampleCount = 720;
    this.samples = [];
    this.length = this.curve.getLength();
    // 'space' tracks float in orbit: no terrain, guard rails, and orbital scenery.
    this.space = data.environment === 'space';
    this.dark = data.time === 'night' || data.time === 'space';
    // Decorations that keep moving after build (windmill fans, the space station).
    this.spinners = [];
    this.buildSamples();
    if (this.space) this.buildSpaceScenery();
    else this.buildTerrain();
    this.buildRoad();
    if (data.rails) this.buildRails();
    this.buildStartLine();
    this.buildBoostPads();
    this.buildPowerUps();
    this.buildDecorations();
  }

  buildSamples() {
    for (let i = 0; i < this.sampleCount; i += 1) {
      const t = i / this.sampleCount;
      const point = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3().crossVectors(UP, tangent).normalize();
      this.samples.push({ t, point, tangent, side });
    }
  }

  buildTerrain() {
    const { palette, terrain, time } = this.data;
    const groundMat = material(palette.ground, { roughness: 1 });
    // The terrain surface follows the nearest section of road, then smoothly
    // falls away. This creates broad supporting hills instead of floating road
    // ribbons, and gives trackside scenery a real patch of ground to stand on.
    const terrainGeometry = new THREE.PlaneGeometry(360, 360, 72, 72);
    terrainGeometry.rotateX(-Math.PI / 2);
    const positions = terrainGeometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      positions.setY(i, this.terrainHeightAt(x, z));
    }
    positions.needsUpdate = true;
    terrainGeometry.computeVertexNormals();
    const ground = mesh(terrainGeometry, groundMat, 0, 0, 0);
    ground.receiveShadow = true;
    ground.castShadow = false;
    this.group.add(ground);

    // A solid skirt hides the edge of the generated landscape from low angles.
    const groundBase = mesh(new THREE.CylinderGeometry(182, 188, 6, 48), groundMat, 0, -3.4, 0);
    groundBase.receiveShadow = true;
    groundBase.castShadow = false;
    this.group.add(groundBase);

    if (terrain.kind === 'island') {
      const water = mesh(
        new THREE.CylinderGeometry(280, 280, 1, 64),
        material(palette.water, { metalness: 0.15, roughness: 0.2, transparent: true, opacity: 0.9 }),
        0, -5.2, 0,
      );
      water.castShadow = false;
      this.group.add(water);
    } else {
      const cityFloor = mesh(new THREE.CylinderGeometry(230, 230, 2, 48), material(palette.ground), 0, -3.7, 0);
      cityFloor.castShadow = false;
      this.group.add(cityFloor);
    }

    // Distant low-poly silhouettes add depth while keeping the drivable area clear.
    const silhouetteMat = material(time === 'night' ? 0x15142b : 0x765c58, { flatShading: true });
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2 + this.random() * 0.12;
      const radius = 152 + this.random() * 24;
      const h = terrain.kind === 'city' ? 14 + this.random() * 38 : 10 + this.random() * 23;
      const geo = terrain.kind === 'city'
        ? new THREE.BoxGeometry(8 + this.random() * 10, h, 8 + this.random() * 10)
        : new THREE.ConeGeometry(11 + this.random() * 11, h, 5);
      const object = mesh(geo, silhouetteMat, Math.cos(angle) * radius, h / 2 - 0.32, Math.sin(angle) * radius);
      object.castShadow = false;
      this.group.add(object);
    }
  }

  buildSpaceScenery() {
    // Starfield: a shell of distant points so every camera angle finds stars.
    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starTints = [new THREE.Color(0xffffff), new THREE.Color(0xbfd8ff), new THREE.Color(0xffe1c4), new THREE.Color(0xffc9ec)];
    for (let i = 0; i < starCount; i += 1) {
      const radius = 330 + this.random() * 220;
      const theta = this.random() * Math.PI * 2;
      const phi = Math.acos(this.random() * 2 - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const tint = starTints[Math.floor(this.random() * starTints.length)];
      const brightness = 0.5 + this.random() * 0.5;
      starColors[i * 3] = tint.r * brightness;
      starColors[i * 3 + 1] = tint.g * brightness;
      starColors[i * 3 + 2] = tint.b * brightness;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 1.7, vertexColors: true, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.95,
    }));
    this.group.add(stars);

    // A big blue planet low on the horizon sells the altitude.
    const planet = mesh(
      new THREE.SphereGeometry(95, 32, 24),
      material(0x3f7fd9, { emissive: 0x16345f, emissiveIntensity: 0.55, roughness: 0.9, fog: false }),
      -250, -70, -290,
    );
    planet.castShadow = planet.receiveShadow = false;
    const atmosphere = mesh(
      new THREE.SphereGeometry(99, 32, 24),
      material(0x7fb8ff, { transparent: true, opacity: 0.14, emissive: 0x7fb8ff, emissiveIntensity: 0.5, fog: false, depthWrite: false }),
      -250, -70, -290,
    );
    atmosphere.castShadow = atmosphere.receiveShadow = false;
    const moon = mesh(new THREE.SphereGeometry(24, 20, 14), material(0xc9b8a6, { emissive: 0x4a4238, emissiveIntensity: 0.4, roughness: 1, fog: false }), 270, 80, 210);
    moon.castShadow = moon.receiveShadow = false;
    this.group.add(planet, atmosphere, moon);

    // Station Whimsy, far below the racing line ("it's a long way down").
    const station = new THREE.Group();
    const hull = material(0x9aa4b8, { metalness: 0.75, roughness: 0.35 });
    const glowWindows = material(0xffd77a, { emissive: 0xffc75a, emissiveIntensity: 1.8 });
    const ring = mesh(new THREE.TorusGeometry(46, 5.5, 10, 42), hull);
    ring.rotation.x = Math.PI / 2;
    station.add(ring);
    const hub = mesh(new THREE.SphereGeometry(10, 16, 12), hull);
    station.add(hub);
    for (let i = 0; i < 4; i += 1) {
      const spoke = mesh(new THREE.CylinderGeometry(1.6, 1.6, 46, 8), hull);
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.y = (i / 4) * Math.PI * 2;
      spoke.position.set(Math.cos((i / 4) * Math.PI * 2) * 23, 0, Math.sin((i / 4) * Math.PI * 2) * 23);
      spoke.rotation.set(0, -(i / 4) * Math.PI * 2, Math.PI / 2);
      station.add(spoke);
    }
    for (const side of [-1, 1]) {
      const panel = mesh(new THREE.BoxGeometry(34, 0.5, 13), material(0x1c3f8f, { emissive: 0x2050b0, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.3 }));
      panel.position.set(side * 28, 0, 0);
      station.add(panel);
    }
    for (let i = 0; i < 26; i += 1) {
      const angle = (i / 26) * Math.PI * 2;
      const light = mesh(new THREE.BoxGeometry(1.1, 0.7, 0.7), glowWindows);
      light.position.set(Math.cos(angle) * 46, 3, Math.sin(angle) * 46);
      light.castShadow = false;
      station.add(light);
    }
    station.position.set(10, -62, -14);
    this.group.add(station);
    this.spinners.push({ mesh: station, axis: 'y', speed: 0.05 });
  }

  terrainHeightAt(x, z) {
    let closest = this.samples[0];
    let bestDistanceSq = Infinity;
    for (let i = 0; i < this.samples.length; i += 3) {
      const sample = this.samples[i];
      const dx = x - sample.point.x;
      const dz = z - sample.point.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < bestDistanceSq) { bestDistanceSq = distanceSq; closest = sample; }
    }
    const distance = Math.sqrt(bestDistanceSq);
    const base = -0.32;
    const shelf = this.data.width * 0.74;
    const hillRadius = this.data.width * 2.85;
    if (distance >= hillRadius) return base;
    const raw = THREE.MathUtils.clamp((hillRadius - distance) / (hillRadius - shelf), 0, 1);
    const blend = raw * raw * (3 - 2 * raw);
    const roadBed = closest.point.y - 0.34;
    const naturalVariation = Math.sin(x * 0.085 + this.data.seed) * Math.cos(z * 0.073) * 0.32 * blend * (1 - blend);
    return THREE.MathUtils.lerp(base, roadBed, blend) + naturalVariation;
  }

  groundHeightAt(x, z) {
    const probe = new THREE.Vector3(x, 0, z);
    const nearest = this.nearest(probe);
    if (Math.abs(nearest.offset) <= this.data.width * 0.69) return nearest.point.y + 0.045;
    // In orbit there is no ground beside the road; rails keep karts within the
    // 0.69 band, so this only pads wheel samples that poke past the edge.
    if (this.space) return nearest.point.y + 0.045;
    return this.terrainHeightAt(x, z);
  }

  wheelContactFrame(position, yaw) {
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const halfWidth = 1.05;
    const rearLength = 0.97;
    const frontLength = 0.99;
    // Order mirrors Vehicle.js: left-rear, left-front, right-rear, right-front.
    const offsets = [
      [-halfWidth, -rearLength], [-halfWidth, frontLength],
      [halfWidth, -rearLength], [halfWidth, frontLength],
    ];
    const heights = offsets.map(([x, z]) => this.groundHeightAt(
      position.x + right.x * x + forward.x * z,
      position.z + right.z * x + forward.z * z,
    ));
    const frontHeight = (heights[1] + heights[3]) * 0.5;
    const rearHeight = (heights[0] + heights[2]) * 0.5;
    const leftHeight = (heights[0] + heights[1]) * 0.5;
    const rightHeight = (heights[2] + heights[3]) * 0.5;
    const averageHeight = heights.reduce((sum, height) => sum + height, 0) * 0.25;
    const forwardSlope = (frontHeight - rearHeight) / (frontLength + rearLength);
    const sideSlope = (rightHeight - leftHeight) / (halfWidth * 2);

    const surfaceForward = new THREE.Vector3(forward.x, forwardSlope, forward.z).normalize();
    const sampledRight = new THREE.Vector3(right.x, sideSlope, right.z).normalize();
    const surfaceUp = new THREE.Vector3().crossVectors(surfaceForward, sampledRight).normalize();
    const surfaceRight = new THREE.Vector3().crossVectors(surfaceUp, surfaceForward).normalize();
    const basis = new THREE.Matrix4().makeBasis(surfaceRight, surfaceUp, surfaceForward);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);

    const residuals = offsets.map(([x, z], index) => {
      const predicted = averageHeight + x * sideSlope + z * forwardSlope;
      return heights[index] - predicted;
    });
    return { groundY: averageHeight - 0.008, quaternion, residuals, up: surfaceUp };
  }

  stripGeometry(innerScale, outerScale, yOffset = 0) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const width = this.data.width;
    for (let i = 0; i <= this.sampleCount; i += 1) {
      const sample = this.samples[i % this.sampleCount];
      const a = sample.point.clone().addScaledVector(sample.side, width * innerScale);
      const b = sample.point.clone().addScaledVector(sample.side, width * outerScale);
      positions.push(a.x, a.y + yOffset, a.z, b.x, b.y + yOffset, b.z);
      uvs.push(0, i / 10, 1, i / 10);
      if (i < this.sampleCount) {
        const p = i * 2;
        // Wind triangles upward so the road is visible from the chase camera.
        indices.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  rainbowGeometry() {
    // Vertex-colored road strip cycling through the full hue wheel five times,
    // so the loop closes seamlessly on the same color it started with.
    const geo = this.stripGeometry(-0.5, 0.5, 0.04);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i <= this.sampleCount; i += 1) {
      color.setHSL(((i / this.sampleCount) * 5) % 1, 0.9, 0.56);
      for (const vertex of [i * 2, i * 2 + 1]) {
        colors[vertex * 3] = color.r;
        colors[vertex * 3 + 1] = color.g;
        colors[vertex * 3 + 2] = color.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  buildRoad() {
    const { palette } = this.data;
    const style = this.data.road?.style;

    if (style === 'rainbow') {
      // Unlit vertex colors read as self-illuminated neon against the void.
      const road = new THREE.Mesh(this.rainbowGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true }));
      this.group.add(road);
    } else {
      const road = new THREE.Mesh(this.stripGeometry(-0.5, 0.5, 0.04), material(palette.road, { roughness: style === 'dirt' ? 1 : 0.82 }));
      road.receiveShadow = true;
      this.group.add(road);
    }

    const leftShoulder = new THREE.Mesh(this.stripGeometry(-0.68, -0.5, 0.015), material(palette.shoulder));
    const rightShoulder = new THREE.Mesh(this.stripGeometry(0.5, 0.68, 0.015), material(palette.shoulder));
    leftShoulder.receiveShadow = rightShoulder.receiveShadow = true;
    this.group.add(leftShoulder, rightShoulder);

    if (style === 'dirt') {
      // Wagon-wheel ruts instead of painted lines, and rough wooden edge posts.
      const rutMat = material(0x6e5236, { roughness: 1 });
      for (const lane of [-0.21, 0.21]) {
        const rut = new THREE.Mesh(this.stripGeometry(lane - 0.05, lane + 0.05, 0.048), rutMat);
        rut.receiveShadow = true;
        this.group.add(rut);
      }
      const postMat = material(0x5c4530, { roughness: 0.95 });
      for (let i = 0; i < this.sampleCount; i += 20) {
        const sample = this.samples[i];
        for (const sideSign of [-1, 1]) {
          const post = mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.1, 6), postMat);
          post.position.copy(sample.point).addScaledVector(sample.side, sideSign * this.data.width * 0.6);
          post.position.y += 0.5;
          this.group.add(post);
        }
      }
      return;
    }

    if (style === 'street') {
      // Dashed center line like a small-town main street.
      const dashMat = material(0xf2c94c, { roughness: 0.6 });
      for (let i = 0; i < this.sampleCount; i += 8) {
        const sample = this.samples[i];
        const dash = mesh(new THREE.BoxGeometry(0.22, 0.03, 2.1), dashMat);
        dash.position.copy(sample.point);
        dash.position.y += 0.075;
        dash.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
        dash.castShadow = false;
        this.group.add(dash);
      }
    }

    if (style === 'rainbow') return; // rails replace curbs in orbit

    // Alternating curb blocks make bends readable at speed.
    for (let i = 0; i < this.sampleCount; i += 12) {
      const sample = this.samples[i];
      for (const sideSign of [-1, 1]) {
        const curb = mesh(
          new THREE.BoxGeometry(2.8, 0.3, 0.8),
          material((Math.floor(i / 12) % 2) ? palette.stripeA : palette.stripeB),
        );
        curb.position.copy(sample.point).addScaledVector(sample.side, sideSign * this.data.width * 0.56);
        curb.position.y += 0.17;
        curb.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
        curb.castShadow = false;
        this.group.add(curb);
      }
    }
  }

  buildRails() {
    // Glowing guard rails along both edges. Game.js pairs these with a hard
    // physics clamp, so karts bounce off instead of sailing into the void.
    const railColor = this.data.palette.stripeA;
    const railMat = material(railColor, { emissive: railColor, emissiveIntensity: 1.5, metalness: 0.45, roughness: 0.3 });
    const postMat = material(0x2a2c48, { metalness: 0.6, roughness: 0.4 });
    for (const sideSign of [-1, 1]) {
      const railPoints = [];
      for (let i = 0; i < this.sampleCount; i += 6) {
        const sample = this.samples[i];
        railPoints.push(sample.point.clone().addScaledVector(sample.side, sideSign * this.data.width * 0.66));
      }
      for (const height of [0.55, 1.2]) {
        const curve = new THREE.CatmullRomCurve3(railPoints.map((p) => p.clone().add(new THREE.Vector3(0, height, 0))), true);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 420, height > 1 ? 0.13 : 0.09, 6, true), railMat);
        tube.castShadow = false;
        this.group.add(tube);
      }
      for (let i = 0; i < this.sampleCount; i += 10) {
        const sample = this.samples[i];
        const post = mesh(new THREE.BoxGeometry(0.18, 1.35, 0.18), postMat);
        post.position.copy(sample.point).addScaledVector(sample.side, sideSign * this.data.width * 0.66);
        post.position.y += 0.68;
        post.castShadow = false;
        this.group.add(post);
      }
    }
  }

  buildStartLine() {
    const frame = this.frameAt(0);
    const white = material(0xffffff);
    const dark = material(0x181822);
    for (let i = -5; i < 5; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        const tile = mesh(new THREE.BoxGeometry(1.5, 0.06, 1.25), ((i + j) % 2) ? white : dark);
        tile.position.copy(frame.point).addScaledVector(frame.side, i * 1.5 + 0.75).addScaledVector(frame.tangent, j * 1.25 - 0.6);
        tile.position.y += 0.12;
        tile.rotation.y = Math.atan2(frame.tangent.x, frame.tangent.z);
        tile.castShadow = false;
        this.group.add(tile);
      }
    }

    const archMat = material(this.data.palette.stripeB, { emissive: this.dark ? this.data.palette.stripeB : 0x000000, emissiveIntensity: 0.7 });
    const left = mesh(new THREE.BoxGeometry(0.8, 8, 0.8), archMat);
    const right = left.clone();
    const top = mesh(new THREE.BoxGeometry(this.data.width + 4, 1.25, 0.8), archMat);
    for (const item of [left, right, top]) item.rotation.y = Math.atan2(frame.tangent.x, frame.tangent.z);
    left.position.copy(frame.point).addScaledVector(frame.side, -this.data.width * 0.62); left.position.y += 4;
    right.position.copy(frame.point).addScaledVector(frame.side, this.data.width * 0.62); right.position.y += 4;
    top.position.copy(frame.point); top.position.y += 7.5;
    this.group.add(left, right, top);
  }

  buildBoostPads() {
    this.boostPads = [];
    const boostColor = this.dark ? 0x5de7ff : 0xffd84d;
    const glowMaterial = () => material(boostColor, {
      emissive: boostColor,
      emissiveIntensity: 2.4,
      metalness: 0.25,
      roughness: 0.28,
      transparent: true,
      opacity: 0.94,
    });
    for (const progress of this.data.boosts || []) {
      const frame = this.frameAt(progress);
      const group = new THREE.Group();
      const base = mesh(new THREE.BoxGeometry(this.data.width * 0.62, 0.08, 3.1), material(0x171726, { metalness: 0.35 }));
      group.add(base);
      const padGlow = glowMaterial();
      for (let z = -0.85; z <= 0.85; z += 0.85) {
        for (const side of [-1, 1]) {
          const stripe = mesh(new THREE.BoxGeometry(this.data.width * 0.2, 0.08, 0.32), padGlow);
          stripe.position.set(side * this.data.width * 0.145, 0.09, z);
          stripe.rotation.y = side * 0.27;
          stripe.castShadow = false;
          group.add(stripe);
        }
      }
      group.position.copy(frame.point);
      group.position.y += 0.13;
      group.rotation.y = Math.atan2(frame.tangent.x, frame.tangent.z);
      group.userData.glowMaterial = padGlow;
      group.userData.baseY = group.position.y;
      this.group.add(group);
      this.boostPads.push({ progress, group, cooldown: 0 });
    }
  }

  buildPowerUps() {
    this.powerUps = [];
    const glowColor = this.dark ? 0x6bffdc : 0x72f1a8;
    (this.data.powerups || []).forEach((progress, index) => {
      const frame = this.frameAt(progress);
      const lane = ((index % 3) - 1) * this.data.width * 0.21;
      const group = new THREE.Group();
      const glow = material(glowColor, {
        emissive: glowColor,
        emissiveIntensity: 2.8,
        metalness: 0.18,
        roughness: 0.22,
      });
      const ring = mesh(new THREE.TorusGeometry(0.72, 0.12, 8, 20), glow);
      ring.rotation.y = Math.PI / 2;
      const vertical = mesh(new THREE.BoxGeometry(0.24, 1.05, 0.22), glow);
      const horizontal = mesh(new THREE.BoxGeometry(0.92, 0.24, 0.22), glow);
      const halo = mesh(new THREE.SphereGeometry(0.95, 12, 8), material(glowColor, {
        emissive: glowColor,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }));
      group.add(halo, ring, vertical, horizontal);
      group.position.copy(frame.point).addScaledVector(frame.side, lane);
      group.position.y += 1.15;
      group.userData.baseY = group.position.y;
      this.group.add(group);
      this.powerUps.push({ progress, lane, group, cooldown: 0, phase: index * 1.7 });
    });
  }

  makePalm(scale = 1) {
    const group = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.22 * scale, 0.38 * scale, 4.8 * scale, 7), material(0x8b5a32));
    trunk.position.y = 2.4 * scale;
    group.add(trunk);
    const leafMat = material(0x2b9b62, { flatShading: true });
    for (let i = 0; i < 6; i += 1) {
      const leaf = mesh(new THREE.ConeGeometry(0.72 * scale, 3.3 * scale, 4), leafMat);
      leaf.rotation.z = Math.PI / 2.7;
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      leaf.position.y = 4.7 * scale;
      group.add(leaf);
    }
    return group;
  }

  makeStreetLight() {
    const group = new THREE.Group();
    const poleMat = material(0x27283d, { metalness: 0.7 });
    const glow = material(this.data.palette.stripeA, { emissive: this.data.palette.stripeA, emissiveIntensity: 2 });
    const pole = mesh(new THREE.CylinderGeometry(0.12, 0.18, 6, 6), poleMat); pole.position.y = 3;
    const lamp = mesh(new THREE.SphereGeometry(0.35, 8, 6), glow); lamp.position.y = 6;
    group.add(pole, lamp);
    return group;
  }

  makeBuilding() {
    const group = new THREE.Group();
    const h = 6 + this.random() * 12;
    const baseColor = new THREE.Color().setHSL(0.66 + this.random() * 0.08, 0.25, 0.14 + this.random() * 0.08);
    const base = mesh(new THREE.BoxGeometry(5 + this.random() * 5, h, 5 + this.random() * 5), material(baseColor));
    base.position.y = h / 2;
    group.add(base);
    const windowMat = material(this.random() > 0.5 ? 0x5de7ff : 0xffd36a, { emissive: this.random() > 0.5 ? 0x5de7ff : 0xffb84d, emissiveIntensity: 1.4 });
    for (let y = 2; y < h - 1; y += 2.2) {
      const window = mesh(new THREE.BoxGeometry(base.geometry.parameters.width * 0.62, 0.55, 0.05), windowMat);
      window.position.set(0, y, base.geometry.parameters.depth / 2 + 0.04);
      group.add(window);
    }
    return group;
  }

  makeStand() {
    const group = new THREE.Group();
    const concrete = material(this.data.time === 'night' ? 0x30324d : 0x70748a, { roughness: 0.88 });
    const structure = material(0x25273b, { metalness: 0.42, roughness: 0.52 });
    const roofMaterial = material(this.data.palette.stripeB, {
      metalness: 0.25,
      roughness: 0.5,
      emissive: this.data.time === 'night' ? this.data.palette.stripeB : 0x000000,
      emissiveIntensity: this.data.time === 'night' ? 0.45 : 0,
    });

    // Local +Z is the front. Seating rises away from the circuit so every tier
    // and spectator faces down toward the racing line.
    const tierCount = 6;
    for (let row = 0; row < tierCount; row += 1) {
      const tier = mesh(new THREE.BoxGeometry(20, 0.58 + row * 0.08, 1.55), concrete);
      tier.position.set(0, 0.32 + row * 0.68, 3.85 - row * 1.45);
      group.add(tier);
    }

    // Grand roof, rear spine, lighting truss, and large raceway banners give the
    // stand an international-circuit scale rather than a small local bleacher.
    const roof = mesh(new THREE.BoxGeometry(22.5, 0.38, 9.5), roofMaterial);
    roof.position.set(0, 7.25, 0.1);
    roof.rotation.x = 0.055;
    group.add(roof);
    const rearWall = mesh(new THREE.BoxGeometry(20.5, 6.3, 0.45), structure);
    rearWall.position.set(0, 3.15, -4.25);
    group.add(rearWall);
    for (const x of [-9.1, -4.55, 0, 4.55, 9.1]) {
      const column = mesh(new THREE.CylinderGeometry(0.16, 0.22, 7.1, 7), structure);
      column.position.set(x, 3.55, -3.75);
      column.rotation.x = -0.07;
      group.add(column);
      const lamp = mesh(new THREE.SphereGeometry(0.16, 7, 5), material(0xffffff, { emissive: 0xffffff, emissiveIntensity: 2.2 }));
      lamp.position.set(x, 6.78, 3.7);
      group.add(lamp);
    }
    const banner = mesh(new THREE.BoxGeometry(14, 1.05, 0.18), roofMaterial);
    banner.position.set(0, 5.75, 4.1);
    group.add(banner);

    const crowdColors = [0xffd166, 0xff4f7b, 0x5de7ff, 0xf6f7ff, 0x6be585];
    const columns = 17;
    const crowd = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 6, 5),
      material(0xffffff, { roughness: 0.7 }),
      columns * tierCount,
    );
    const transform = new THREE.Object3D();
    let instance = 0;
    for (let row = 0; row < tierCount; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        transform.position.set(-8.75 + column * 1.1, 0.95 + row * 0.69, 3.85 - row * 1.45);
        transform.scale.setScalar(0.84 + this.random() * 0.28);
        transform.updateMatrix();
        crowd.setMatrixAt(instance, transform.matrix);
        crowd.setColorAt(instance, new THREE.Color(crowdColors[(row * 3 + column) % crowdColors.length]));
        instance += 1;
      }
    }
    crowd.instanceMatrix.needsUpdate = true;
    crowd.instanceColor.needsUpdate = true;
    crowd.castShadow = true;
    group.add(crowd);
    return group;
  }

  makeRock() {
    return mesh(new THREE.DodecahedronGeometry(1.5 + this.random() * 2.5, 0), material(0x735f58, { flatShading: true }));
  }

  makePine() {
    const group = new THREE.Group();
    const height = 6.5 + this.random() * 4;
    const trunk = mesh(new THREE.CylinderGeometry(0.24, 0.4, height * 0.42, 7), material(0x6e4a2f));
    trunk.position.y = height * 0.21;
    group.add(trunk);
    const green = this.random() > 0.5 ? 0x2e6b3f : 0x1f5c33;
    const leafMat = material(green, { flatShading: true });
    for (let tier = 0; tier < 3; tier += 1) {
      const cone = mesh(new THREE.ConeGeometry(2.3 - tier * 0.62, height * 0.42, 7), leafMat);
      cone.position.y = height * (0.42 + tier * 0.21);
      group.add(cone);
    }
    return group;
  }

  makeTesla() {
    const group = new THREE.Group();
    const paint = [0xf2f3f5, 0x16181d, 0xb03028, 0x2456a8, 0x9aa0a8][Math.floor(this.random() * 5)];
    const bodyMat = material(paint, { metalness: 0.55, roughness: 0.3 });
    const glassMat = material(0x1b2430, { metalness: 0.7, roughness: 0.12 });
    const body = mesh(new THREE.BoxGeometry(2.0, 0.55, 4.4), bodyMat);
    body.position.y = 0.72;
    const nose = mesh(new THREE.BoxGeometry(1.85, 0.34, 0.7), bodyMat);
    nose.position.set(0, 0.62, 2.35);
    // A single sleek glass canopy instead of a grille-era cabin.
    const canopy = mesh(new THREE.BoxGeometry(1.72, 0.5, 2.4), glassMat);
    canopy.position.set(0, 1.2, -0.15);
    group.add(body, nose, canopy);
    const lightBar = mesh(new THREE.BoxGeometry(1.7, 0.09, 0.06), material(0xffffff, { emissive: 0xdfefff, emissiveIntensity: 1.4 }));
    lightBar.position.set(0, 0.86, 2.68);
    const tailBar = mesh(new THREE.BoxGeometry(1.7, 0.09, 0.06), material(0xff2a3c, { emissive: 0xff2030, emissiveIntensity: 1.2 }));
    tailBar.position.set(0, 0.86, -2.22);
    group.add(lightBar, tailBar);
    for (const x of [-0.95, 0.95]) {
      for (const z of [-1.45, 1.45]) {
        const wheel = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), material(0x0b0b11, { roughness: 0.9 }));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.4, z);
        group.add(wheel);
      }
    }
    group.userData.alongRoad = true;
    return group;
  }

  makeShopfront() {
    const group = new THREE.Group();
    const w = 5 + this.random() * 3;
    const h = 4 + this.random() * 3;
    const brick = [0x9c5b45, 0xb8977a, 0x8a6f5c, 0xa87f68][Math.floor(this.random() * 4)];
    const base = mesh(new THREE.BoxGeometry(w, h, 5), material(brick, { roughness: 0.9 }));
    base.position.y = h / 2;
    group.add(base);
    const glass = mesh(new THREE.BoxGeometry(w * 0.7, 1.7, 0.12), material(0x9fd8e8, { metalness: 0.5, roughness: 0.15 }));
    glass.position.set(0, 1.15, 2.55);
    group.add(glass);
    const awningColor = [0xb03028, 0x2a7f62, 0x2456a8, 0xc07f2a][Math.floor(this.random() * 4)];
    const awning = mesh(new THREE.BoxGeometry(w * 0.82, 0.1, 1.4), material(awningColor, { roughness: 0.8 }));
    awning.position.set(0, 2.45, 3.05);
    awning.rotation.x = 0.24;
    group.add(awning);
    const sign = mesh(new THREE.BoxGeometry(w * 0.5, 0.55, 0.1), material(0xf5f2e8, { emissive: 0xfff6d8, emissiveIntensity: 0.35 }));
    sign.position.set(0, 3.35, 2.58);
    group.add(sign);
    return group;
  }

  makeWesternBuilding() {
    const group = new THREE.Group();
    const w = 4.5 + this.random() * 2.5;
    const h = 3.5 + this.random() * 1.5;
    const wood = [0x8a6a4a, 0xa8895c, 0x6e5236, 0xb59a6a, 0x7a5a40][Math.floor(this.random() * 5)];
    const woodMat = material(wood, { roughness: 0.95 });
    const base = mesh(new THREE.BoxGeometry(w, h, 6), woodMat);
    base.position.y = h / 2;
    group.add(base);
    // The classic old-west false front rises past the actual roofline.
    const falseFront = mesh(new THREE.BoxGeometry(w + 0.3, h + 1.7, 0.3), woodMat);
    falseFront.position.set(0, (h + 1.7) / 2, 3);
    group.add(falseFront);
    const signBoard = mesh(new THREE.BoxGeometry(w * 0.72, 0.6, 0.1), material(0xd8c8a8, { roughness: 0.85 }));
    signBoard.position.set(0, h + 0.75, 3.22);
    group.add(signBoard);
    const porchRoof = mesh(new THREE.BoxGeometry(w + 0.4, 0.12, 1.8), woodMat);
    porchRoof.position.set(0, 2.5, 3.95);
    group.add(porchRoof);
    for (const x of [-w * 0.42, 0, w * 0.42]) {
      const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 6), woodMat);
      post.position.set(x, 1.25, 4.75);
      group.add(post);
    }
    const windowMat = material(0x2a2620, { roughness: 0.4 });
    for (const x of [-w * 0.28, w * 0.28]) {
      const window = mesh(new THREE.BoxGeometry(0.7, 0.95, 0.08), windowMat);
      window.position.set(x, 1.4, 3.18);
      group.add(window);
    }
    return group;
  }

  makeWaterTower() {
    const group = new THREE.Group();
    const woodMat = material(0x7a5a40, { roughness: 0.95 });
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
      const leg = mesh(new THREE.CylinderGeometry(0.09, 0.13, 4.6, 6), woodMat);
      leg.position.set(x, 2.3, z);
      group.add(leg);
    }
    const tank = mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.2, 10), woodMat);
    tank.position.y = 5.4;
    group.add(tank);
    const roof = mesh(new THREE.ConeGeometry(1.75, 0.95, 10), material(0x5c4530, { roughness: 0.95 }));
    roof.position.y = 6.95;
    group.add(roof);
    return group;
  }

  makeHorse() {
    const group = new THREE.Group();
    const coat = [0x6b4a2f, 0x8a5c3a, 0x3d2f24, 0x9c8a72][Math.floor(this.random() * 4)];
    const coatMat = material(coat, { roughness: 0.85 });
    const body = mesh(new THREE.BoxGeometry(0.6, 0.68, 1.5), coatMat);
    body.position.y = 1.05;
    group.add(body);
    for (const [x, z] of [[-0.2, -0.55], [0.2, -0.55], [-0.2, 0.55], [0.2, 0.55]]) {
      const leg = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.78, 6), coatMat);
      leg.position.set(x, 0.39, z);
      group.add(leg);
    }
    const neck = mesh(new THREE.BoxGeometry(0.24, 0.72, 0.32), coatMat);
    neck.position.set(0, 1.55, 0.72);
    neck.rotation.x = -0.45;
    group.add(neck);
    const head = mesh(new THREE.BoxGeometry(0.2, 0.26, 0.56), coatMat);
    head.position.set(0, 1.92, 0.98);
    head.rotation.x = 0.28;
    group.add(head);
    const darkMat = material(0x241c14, { roughness: 0.9 });
    for (const x of [-0.07, 0.07]) {
      const ear = mesh(new THREE.ConeGeometry(0.05, 0.16, 5), darkMat);
      ear.position.set(x, 2.1, 0.82);
      group.add(ear);
    }
    const tail = mesh(new THREE.BoxGeometry(0.1, 0.62, 0.13), darkMat);
    tail.position.set(0, 0.98, -0.82);
    tail.rotation.x = 0.35;
    group.add(tail);
    group.userData.freeRotate = true;
    return group;
  }

  makeCart() {
    const group = new THREE.Group();
    const woodMat = material(0x8a6a4a, { roughness: 0.95 });
    const bed = mesh(new THREE.BoxGeometry(1.6, 0.22, 2.5), woodMat);
    bed.position.y = 1.0;
    group.add(bed);
    for (const x of [-0.78, 0.78]) {
      const rail = mesh(new THREE.BoxGeometry(0.09, 0.5, 2.5), woodMat);
      rail.position.set(x, 1.35, 0);
      group.add(rail);
      const wheel = mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.11, 12), material(0x5c4530, { roughness: 0.9 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x + Math.sign(x) * 0.12, 0.85, -0.25);
      group.add(wheel);
    }
    for (const x of [-0.45, 0.45]) {
      const shaft = mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.9, 6), woodMat);
      shaft.rotation.x = Math.PI / 2 - 0.22;
      shaft.position.set(x, 0.78, 2.05);
      group.add(shaft);
    }
    if (this.random() > 0.45) {
      const hay = mesh(new THREE.SphereGeometry(0.85, 8, 6), material(0xd8b64a, { flatShading: true, roughness: 1 }));
      hay.scale.set(0.9, 0.62, 1.35);
      hay.position.y = 1.45;
      group.add(hay);
    }
    return group;
  }

  makeGumTree() {
    const group = new THREE.Group();
    // Pale, slightly leaning eucalypt trunk with a sparse high canopy.
    const trunk = mesh(new THREE.CylinderGeometry(0.2, 0.36, 5.4, 7), material(0xd8cfc0, { roughness: 0.9 }));
    trunk.position.y = 2.7;
    trunk.rotation.z = (this.random() - 0.5) * 0.16;
    group.add(trunk);
    const leafMat = material(0x7a8f5a, { flatShading: true });
    const blobs = 3 + Math.floor(this.random() * 2);
    for (let i = 0; i < blobs; i += 1) {
      const blob = mesh(new THREE.SphereGeometry(1.05 + this.random() * 0.6, 7, 5), leafMat);
      blob.position.set((this.random() - 0.5) * 2.6, 5 + this.random() * 1.6, (this.random() - 0.5) * 2.6);
      group.add(blob);
    }
    return group;
  }

  makeKangaroo() {
    const group = new THREE.Group();
    const coatMat = material(0xa5714f, { roughness: 0.85 });
    const body = mesh(new THREE.CapsuleGeometry(0.3, 0.55, 4, 8), coatMat);
    body.position.y = 0.95;
    body.rotation.x = 0.5;
    group.add(body);
    // The heavy tail props the roo up like a tripod.
    const tail = mesh(new THREE.CylinderGeometry(0.09, 0.17, 1.15, 6), coatMat);
    tail.position.set(0, 0.42, -0.62);
    tail.rotation.x = -1.15;
    group.add(tail);
    const head = mesh(new THREE.SphereGeometry(0.19, 8, 6), coatMat);
    head.position.set(0, 1.62, 0.3);
    group.add(head);
    const snout = mesh(new THREE.BoxGeometry(0.13, 0.12, 0.3), coatMat);
    snout.position.set(0, 1.56, 0.5);
    group.add(snout);
    for (const x of [-0.09, 0.09]) {
      const ear = mesh(new THREE.ConeGeometry(0.07, 0.3, 5), coatMat);
      ear.position.set(x, 1.88, 0.22);
      ear.rotation.z = x * 3;
      group.add(ear);
    }
    for (const x of [-0.22, 0.22]) {
      const haunch = mesh(new THREE.SphereGeometry(0.24, 7, 5), coatMat);
      haunch.position.set(x, 0.58, -0.05);
      group.add(haunch);
      const foot = mesh(new THREE.BoxGeometry(0.13, 0.09, 0.55), coatMat);
      foot.position.set(x, 0.06, 0.18);
      group.add(foot);
    }
    group.userData.freeRotate = true;
    return group;
  }

  makeCanvasTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  drawKangarooSilhouette(ctx, cx, cy, s) {
    // A chunky mid-hop roo profile: ears, arched back, big tail, forward feet.
    const points = [
      [-26, -2], [-18, -8], [-12, -16], [-9, -10], [-2, -12], [6, -16],
      [8, -24], [11, -16], [16, -12], [30, 2], [36, 14], [30, 12],
      [18, 4], [20, 18], [4, 20], [12, 14], [8, 6], [-2, 10],
      [-6, 18], [-12, 16], [-9, 6], [-16, 2],
    ];
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      const px = cx + x * s;
      const py = cy + y * s;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }

  makeRoadSign(kind) {
    const group = new THREE.Group();
    const post = mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.7, 6), material(0x8a8f98, { metalness: 0.6, roughness: 0.4 }));
    post.position.y = 1.35;
    group.add(post);
    if (kind === 'roo') {
      // The classic yellow diamond with a kangaroo silhouette.
      const texture = this.makeCanvasTexture(128, 128, (ctx, w, h) => {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI / 4);
        const box = w / Math.SQRT2 - 6;
        ctx.fillStyle = '#111';
        ctx.fillRect(-box / 2 - 3, -box / 2 - 3, box + 6, box + 6);
        ctx.fillStyle = '#f7c800';
        ctx.fillRect(-box / 2, -box / 2, box, box);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#111';
        this.drawKangarooSilhouette(ctx, 0, 2, 1.05);
      });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.55 }));
      face.position.y = 2.9;
      group.add(face);
      const plate = this.makeCanvasTexture(128, 40, (ctx, w, h) => {
        ctx.fillStyle = '#f7c800';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NEXT 24 km', w / 2, h / 2 + 1);
      });
      const plateFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.55 }));
      plateFace.position.y = 1.62;
      group.add(plateFace);
    } else {
      const texture = this.makeCanvasTexture(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#f7c800';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 7;
        ctx.strokeRect(5, 5, w - 10, h - 10);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('WATCH FOR', w / 2, h / 2 - 22);
        ctx.fillText('KANGAROOS!', w / 2, h / 2 + 22);
      });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.25), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 }));
      face.position.y = 2.4;
      group.add(face);
    }
    group.userData.faceTraffic = true;
    return group;
  }

  makeWindmill() {
    const group = new THREE.Group();
    const steel = material(0x9aa0a8, { metalness: 0.65, roughness: 0.4 });
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const leg = mesh(new THREE.CylinderGeometry(0.05, 0.08, 4.8, 5), steel);
      leg.position.set(x * 0.55, 2.4, z * 0.55);
      leg.rotation.x = -z * 0.16;
      leg.rotation.z = x * 0.16;
      group.add(leg);
    }
    // Southern Cross-style windpump fan; Track.update() keeps it turning.
    const fan = new THREE.Group();
    const hub = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 8), steel);
    hub.rotation.x = Math.PI / 2;
    fan.add(hub);
    for (let i = 0; i < 12; i += 1) {
      const blade = mesh(new THREE.BoxGeometry(0.2, 1.15, 0.03), steel);
      blade.position.y = 0.72;
      const arm = new THREE.Group();
      arm.add(blade);
      arm.rotation.z = (i / 12) * Math.PI * 2;
      fan.add(arm);
    }
    fan.position.set(0, 4.95, 0.4);
    group.add(fan);
    const vane = mesh(new THREE.BoxGeometry(0.06, 0.55, 1.3), steel);
    vane.position.set(0, 4.95, -1.1);
    group.add(vane);
    this.spinners.push({ mesh: fan, axis: 'z', speed: 1 + this.random() * 1.2 });
    return group;
  }

  makeFence() {
    const group = new THREE.Group();
    const woodMat = material(0x8a7a62, { roughness: 0.95 });
    for (const x of [-1.8, 0, 1.8]) {
      const post = mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.15, 5), woodMat);
      post.position.set(x, 0.55, 0);
      group.add(post);
    }
    for (const y of [0.55, 0.92]) {
      const wire = mesh(new THREE.BoxGeometry(4.1, 0.05, 0.04), woodMat);
      wire.position.y = y;
      group.add(wire);
    }
    group.userData.alongRoad = true;
    return group;
  }

  makeHayBale() {
    const bale = mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.15, 10), material(0xd8b64a, { roughness: 1 }));
    bale.rotation.z = Math.PI / 2;
    bale.position.y = 0.72;
    const group = new THREE.Group();
    group.add(bale);
    group.userData.freeRotate = true;
    return group;
  }

  makeDeadTree() {
    const group = new THREE.Group();
    const barkMat = material(0x6e6152, { roughness: 1 });
    const trunk = mesh(new THREE.CylinderGeometry(0.13, 0.26, 3.6, 6), barkMat);
    trunk.position.y = 1.8;
    group.add(trunk);
    for (let i = 0; i < 3; i += 1) {
      const branch = mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.5, 5), barkMat);
      branch.position.set((this.random() - 0.5) * 0.8, 2.6 + this.random() * 0.9, (this.random() - 0.5) * 0.8);
      branch.rotation.z = (this.random() - 0.5) * 1.6;
      branch.rotation.x = (this.random() - 0.5) * 1.2;
      group.add(branch);
    }
    return group;
  }

  makeSatellite() {
    const group = new THREE.Group();
    const body = mesh(new THREE.BoxGeometry(0.9, 0.9, 1.4), material(0xb8c0cc, { metalness: 0.75, roughness: 0.3 }));
    group.add(body);
    for (const side of [-1, 1]) {
      const panel = mesh(new THREE.BoxGeometry(2.7, 0.06, 1.05), material(0x1c3f8f, { emissive: 0x2050b0, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 }));
      panel.position.x = side * 1.9;
      group.add(panel);
    }
    const dish = mesh(new THREE.CylinderGeometry(0.34, 0.1, 0.28, 10), material(0xe8ecf2, { metalness: 0.4, roughness: 0.4 }));
    dish.rotation.x = Math.PI / 2;
    dish.position.z = 0.9;
    group.add(dish);
    this.spinners.push({ mesh: group, axis: 'y', speed: 0.15 + this.random() * 0.3 });
    return group;
  }

  makeAsteroid() {
    const rock = mesh(new THREE.DodecahedronGeometry(0.9 + this.random() * 1.9, 0), material(0x6a6a72, { flatShading: true, roughness: 1 }));
    const group = new THREE.Group();
    rock.rotation.set(this.random() * 3, this.random() * 3, this.random() * 3);
    group.add(rock);
    this.spinners.push({ mesh: rock, axis: 'y', speed: 0.1 + this.random() * 0.25 });
    group.userData.freeRotate = true;
    return group;
  }

  makeLollipop() {
    const group = new THREE.Group();
    const stick = mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), material(0xf5f0e6, { roughness: 0.6 }));
    stick.position.y = 1.7;
    group.add(stick);
    const candyColors = [0xff4f7b, 0x7dffb3, 0xffd166, 0x6ad5ff, 0xff6ad5, 0xff9f1c];
    const color = candyColors[Math.floor(this.random() * candyColors.length)];
    const head = mesh(
      new THREE.SphereGeometry(0.85 + this.random() * 0.35, 14, 12),
      material(color, { roughness: 0.35, metalness: 0.15, emissive: color, emissiveIntensity: 0.12 }),
    );
    head.position.y = 3.5;
    head.scale.y = 0.55 + this.random() * 0.15;
    group.add(head);
    // Swirl stripe ring
    const swirl = mesh(
      new THREE.TorusGeometry(0.55, 0.08, 6, 18),
      material(0xffffff, { roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.08 }),
    );
    swirl.position.y = 3.5;
    swirl.rotation.x = Math.PI / 2;
    group.add(swirl);
    group.userData.freeRotate = true;
    return group;
  }

  makeGumdrop() {
    const colors = [0xff6ad5, 0x7dffb3, 0xffd166, 0x6ad5ff, 0xff4f7b, 0xc792ff];
    const color = colors[Math.floor(this.random() * colors.length)];
    const drop = mesh(
      new THREE.SphereGeometry(0.9 + this.random() * 0.7, 12, 10),
      material(color, { roughness: 0.45, metalness: 0.05, emissive: color, emissiveIntensity: 0.1 }),
    );
    drop.scale.y = 0.7;
    drop.position.y = 0.65;
    const group = new THREE.Group();
    group.add(drop);
    // Sugar dust cap
    const sugar = mesh(new THREE.SphereGeometry(0.35, 8, 6), material(0xffffff, { roughness: 1 }));
    sugar.position.y = 1.15;
    sugar.scale.set(1.2, 0.4, 1.2);
    group.add(sugar);
    group.userData.freeRotate = true;
    return group;
  }

  makeCandyCane() {
    const group = new THREE.Group();
    const red = material(0xff3b5c, { roughness: 0.4 });
    const white = material(0xfff8f0, { roughness: 0.4 });
    const h = 3.2 + this.random() * 1.4;
    // Striped pole from stacked discs
    const segments = 10;
    for (let i = 0; i < segments; i += 1) {
      const band = mesh(new THREE.CylinderGeometry(0.18, 0.2, h / segments, 8), i % 2 ? red : white);
      band.position.y = (i + 0.5) * (h / segments);
      group.add(band);
    }
    // Hook at the top
    const hook = mesh(new THREE.TorusGeometry(0.55, 0.16, 8, 14, Math.PI), red);
    hook.position.set(0.45, h, 0);
    hook.rotation.z = Math.PI / 2;
    group.add(hook);
    return group;
  }

  makeChocolateBar() {
    const group = new THREE.Group();
    const wrap = mesh(new THREE.BoxGeometry(1.6, 0.35, 0.95), material(0x6b3a1f, { roughness: 0.7 }));
    wrap.position.y = 0.2;
    group.add(wrap);
    const foil = mesh(new THREE.BoxGeometry(1.65, 0.08, 1.0), material(0xffd166, { metalness: 0.7, roughness: 0.3 }));
    foil.position.y = 0.42;
    group.add(foil);
    group.userData.freeRotate = true;
    return group;
  }

  makeCupcake() {
    const group = new THREE.Group();
    const liner = mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.7, 10), material(0xfff0f8, { roughness: 0.8 }));
    liner.position.y = 0.35;
    group.add(liner);
    const frosting = mesh(
      new THREE.SphereGeometry(0.62, 12, 10),
      material(0xff6ad5, { roughness: 0.55, emissive: 0xff6ad5, emissiveIntensity: 0.08 }),
    );
    frosting.position.y = 0.95;
    frosting.scale.y = 0.7;
    group.add(frosting);
    const cherry = mesh(new THREE.SphereGeometry(0.16, 8, 6), material(0xff2d55, { roughness: 0.3 }));
    cherry.position.y = 1.4;
    group.add(cherry);
    return group;
  }

  makeDecorFor(type) {
    const r = this.random();
    if (type === 'palms' || type === 'festival') return this.makePalm();
    if (type === 'city') return r > 0.56 ? this.makeBuilding() : this.makeStreetLight();
    if (type === 'grandstands') return this.makeStand();
    if (type === 'pines') return this.makePine();
    if (type === 'mainstreet') return r < 0.5 ? this.makeShopfront() : r < 0.78 ? this.makeTesla() : this.makeStreetLight();
    if (type === 'teslas') return r < 0.62 ? this.makeTesla() : r < 0.84 ? this.makePine() : this.makeStreetLight();
    if (type === 'oldwest') {
      return r < 0.52 ? this.makeWesternBuilding()
        : r < 0.68 ? this.makeCart()
          : r < 0.8 ? this.makeHorse()
            : r < 0.92 ? this.makeHayBale() : this.makeWaterTower();
    }
    if (type === 'horses') return r < 0.55 ? this.makeHorse() : r < 0.8 ? this.makeCart() : this.makeFence();
    if (type === 'outback') {
      return r < 0.28 ? this.makeGumTree()
        : r < 0.4 ? this.makeDeadTree()
          : r < 0.54 ? this.makeKangaroo()
            : r < 0.63 ? this.makeRoadSign('roo')
              : r < 0.71 ? this.makeRoadSign('text')
                : r < 0.87 ? this.makeFence()
                  : r < 0.94 ? this.makeWindmill() : this.makeHayBale();
    }
    if (type === 'space') return r < 0.55 ? this.makeSatellite() : this.makeAsteroid();
    if (type === 'candy') {
      return r < 0.28 ? this.makeGumdrop()
        : r < 0.48 ? this.makeLollipop()
          : r < 0.62 ? this.makeCandyCane()
            : r < 0.78 ? this.makeCupcake()
              : r < 0.9 ? this.makeChocolateBar() : this.makeGumdrop();
    }
    if (type === 'lollipops') {
      return r < 0.55 ? this.makeLollipop()
        : r < 0.78 ? this.makeCandyCane()
          : r < 0.9 ? this.makeGumdrop() : this.makeCupcake();
    }
    return this.makeRock();
  }

  addDecorAt(progress, sideSign, type, distance, scale = 1) {
    const frame = this.frameAt(progress);
    const object = this.makeDecorFor(type);
    object.position.copy(frame.point).addScaledVector(frame.side, sideSign * distance);
    if (this.space) {
      // Orbital scenery floats loosely around the ribbon's altitude.
      object.position.y = frame.point.y + (this.random() - 0.35) * 12;
    } else {
      object.position.y = this.terrainHeightAt(object.position.x, object.position.z) + (type === 'cliffs' ? -0.2 : 0);
    }
    const towardTrackX = frame.point.x - object.position.x;
    const towardTrackZ = frame.point.z - object.position.z;
    if (object.userData.faceTraffic) {
      // Road signs face oncoming drivers rather than the middle of the road.
      object.rotation.y = Math.atan2(-frame.tangent.x, -frame.tangent.z);
    } else if (object.userData.alongRoad) {
      // Fences and parked cars line up parallel with the roadside.
      object.rotation.y = Math.atan2(frame.tangent.x, frame.tangent.z) + (this.random() > 0.5 ? Math.PI : 0) + (this.random() - 0.5) * 0.12;
    } else {
      const orientationJitter = type === 'grandstands' ? 0.025 : object.userData.freeRotate ? 3.2 : 0.25;
      object.rotation.y = Math.atan2(towardTrackX, towardTrackZ) + (this.random() - 0.5) * orientationJitter;
    }
    object.scale.multiplyScalar(scale);
    this.group.add(object);
  }

  buildDecorations() {
    for (const zone of this.data.zones) {
      const span = zone.to >= zone.from ? zone.to - zone.from : zone.to + 1 - zone.from;
      const count = Math.floor(span * 75 * zone.density);
      for (let i = 0; i < count; i += 1) {
        const t = (zone.from + (i + this.random() * 0.7) / count * span) % 1;
        const side = (i % 2) ? 1 : -1;
        const distance = this.data.width * (0.82 + this.random() * 0.85);
        const altitude = this.frameAt(t).point.y;
        // At high elevations palms thin out in favor of rocks.
        const type = zone.type === 'palms' && altitude > 15 && this.random() > 0.42 ? 'cliffs' : zone.type;
        this.addDecorAt(t, side, type, distance, 0.72 + this.random() * 0.52);
      }
    }

    // Track specs can provide any number of explicit decorations as data.
    for (const item of this.data.decorations || []) {
      this.addDecorAt(item.progress, item.side || 1, item.type, item.distance || this.data.width, item.scale || 1);
    }
  }

  frameAt(progress) {
    const t = ((progress % 1) + 1) % 1;
    const point = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(UP, tangent).normalize();
    return { point, tangent, side, t };
  }

  collectBoostAt(position, progress) {
    const nearest = this.nearest(position, progress);
    if (Math.abs(nearest.offset) > this.data.width * 0.48) return null;
    for (const pad of this.boostPads) {
      let delta = Math.abs(progress - pad.progress);
      delta = Math.min(delta, 1 - delta);
      if (delta < 0.012 && pad.cooldown <= 0) {
        pad.cooldown = 5;
        return pad;
      }
    }
    return null;
  }

  collectPowerUpAt(position, progress) {
    const nearest = this.nearest(position, progress);
    for (const powerUp of this.powerUps || []) {
      let delta = Math.abs(progress - powerUp.progress);
      delta = Math.min(delta, 1 - delta);
      if (delta < 0.014 && Math.abs(nearest.offset - powerUp.lane) < 3 && powerUp.cooldown <= 0) {
        powerUp.cooldown = 9;
        powerUp.group.visible = false;
        return powerUp;
      }
    }
    return null;
  }

  update(dt, elapsed = 0) {
    for (const spinner of this.spinners) spinner.mesh.rotation[spinner.axis] += dt * spinner.speed;
    for (let i = 0; i < (this.boostPads || []).length; i += 1) {
      const pad = this.boostPads[i];
      pad.cooldown = Math.max(0, pad.cooldown - dt);
      const available = pad.cooldown <= 0;
      const pulse = 1 + Math.sin(elapsed * 7 + i) * 0.035;
      pad.group.scale.set(pulse, 1, pulse);
      pad.group.userData.glowMaterial.emissiveIntensity = available ? 2.1 + Math.sin(elapsed * 8 + i) * 0.7 : 0.12;
      pad.group.userData.glowMaterial.opacity = available ? 0.94 : 0.28;
    }
    for (const powerUp of this.powerUps || []) {
      powerUp.cooldown = Math.max(0, powerUp.cooldown - dt);
      powerUp.group.visible = powerUp.cooldown <= 0;
      powerUp.group.position.y = powerUp.group.userData.baseY + Math.sin(elapsed * 2.8 + powerUp.phase) * 0.24;
      powerUp.group.rotation.y += dt * 1.9;
      powerUp.group.rotation.x = Math.sin(elapsed * 1.3 + powerUp.phase) * 0.12;
    }
  }

  nearest(position, hint = 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    // A full scan is inexpensive at this resolution and robust after collisions.
    for (let i = 0; i < this.samples.length; i += 1) {
      const dx = position.x - this.samples[i].point.x;
      const dz = position.z - this.samples[i].point.z;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) { bestDistance = distance; bestIndex = i; }
    }
    const sample = this.samples[bestIndex];
    const offset = new THREE.Vector3(position.x - sample.point.x, 0, position.z - sample.point.z).dot(sample.side);
    return { ...sample, index: bestIndex, progress: bestIndex / this.sampleCount, offset, distance: Math.sqrt(bestDistance) };
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((node) => {
      node.geometry?.dispose();
      if (Array.isArray(node.material)) node.material.forEach((mat) => mat.dispose());
      else node.material?.dispose();
    });
  }
}
