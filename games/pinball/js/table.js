/**
 * Pinball table construction — meshes, lights, physics bodies.
 * Playfield is flat on XZ; gravity pulls +Z (toward drain) and -Y.
 */

export const TABLE = {
  halfW: 10.5,
  halfL: 20,
  wallH: 2.2,
  ballR: 0.42,
  flipperZ: 15.2,
  drainZ: 18.5,
  plungerX: 12.2,
};

export function makeMaterials(THREE) {
  const M = {};
  M.playfield = new THREE.MeshStandardMaterial({
    color: 0x0c3d28,
    roughness: 0.55,
    metalness: 0.15,
    emissive: 0x031a10,
    emissiveIntensity: 0.35,
  });
  M.playfieldPink = new THREE.MeshStandardMaterial({
    color: 0x5a1848,
    roughness: 0.5,
    metalness: 0.2,
    emissive: 0x3a0630,
    emissiveIntensity: 0.55,
  });
  M.cabinet = new THREE.MeshStandardMaterial({
    color: 0x1a1a28,
    roughness: 0.4,
    metalness: 0.65,
  });
  M.chrome = new THREE.MeshStandardMaterial({
    color: 0xc8d0e0,
    roughness: 0.22,
    metalness: 0.95,
  });
  M.flipper = new THREE.MeshStandardMaterial({
    color: 0xff3344,
    roughness: 0.35,
    metalness: 0.55,
    emissive: 0x440010,
    emissiveIntensity: 0.4,
  });
  M.ball = new THREE.MeshStandardMaterial({
    color: 0xe8eef8,
    roughness: 0.15,
    metalness: 0.92,
    envMapIntensity: 1.2,
  });
  M.bumper = new THREE.MeshStandardMaterial({
    color: 0x3366ff,
    roughness: 0.3,
    metalness: 0.5,
    emissive: 0x112266,
    emissiveIntensity: 0.6,
  });
  M.bumperLit = new THREE.MeshStandardMaterial({
    color: 0xaaccff,
    roughness: 0.2,
    metalness: 0.4,
    emissive: 0x4488ff,
    emissiveIntensity: 2.5,
  });
  M.sling = new THREE.MeshStandardMaterial({
    color: 0xff8833,
    roughness: 0.4,
    metalness: 0.35,
    emissive: 0x442200,
    emissiveIntensity: 0.5,
  });
  M.target = new THREE.MeshStandardMaterial({
    color: 0xffcc22,
    roughness: 0.35,
    metalness: 0.4,
    emissive: 0x664400,
    emissiveIntensity: 0.7,
  });
  M.targetDown = new THREE.MeshStandardMaterial({
    color: 0x442200,
    roughness: 0.6,
    metalness: 0.2,
    emissive: 0x110800,
    emissiveIntensity: 0.2,
  });
  M.ramp = new THREE.MeshStandardMaterial({
    color: 0x99aabb,
    roughness: 0.25,
    metalness: 0.85,
    emissive: 0x223344,
    emissiveIntensity: 0.25,
  });
  M.neonPink = new THREE.MeshStandardMaterial({
    color: 0xff44aa,
    emissive: 0xff2299,
    emissiveIntensity: 1.8,
    roughness: 0.3,
    metalness: 0.4,
  });
  M.neonCyan = new THREE.MeshStandardMaterial({
    color: 0x44ffee,
    emissive: 0x22ddcc,
    emissiveIntensity: 1.6,
    roughness: 0.3,
    metalness: 0.4,
  });
  M.neonAmber = new THREE.MeshStandardMaterial({
    color: 0xffaa33,
    emissive: 0xff8800,
    emissiveIntensity: 1.4,
    roughness: 0.35,
    metalness: 0.35,
  });
  M.insert = new THREE.MeshStandardMaterial({
    color: 0x114422,
    emissive: 0x00ff66,
    emissiveIntensity: 0.15,
    roughness: 0.5,
    metalness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  M.wood = new THREE.MeshStandardMaterial({
    color: 0x3a2818,
    roughness: 0.75,
    metalness: 0.05,
  });
  M.glass = new THREE.MeshStandardMaterial({
    color: 0x88aacc,
    transparent: true,
    opacity: 0.07,
    roughness: 0.05,
    metalness: 0.2,
    depthWrite: false,
  });
  return M;
}

export function makePhysicsMats(CANNON) {
  const ball = new CANNON.Material('ball');
  const table = new CANNON.Material('table');
  const wall = new CANNON.Material('wall');
  const flip = new CANNON.Material('flip');
  const bump = new CANNON.Material('bump');
  const soft = new CANNON.Material('soft');

  const contacts = [
    new CANNON.ContactMaterial(ball, table, { friction: 0.04, restitution: 0.35 }),
    new CANNON.ContactMaterial(ball, wall, { friction: 0.01, restitution: 0.55 }),
    new CANNON.ContactMaterial(ball, flip, { friction: 0.02, restitution: 0.15 }),
    new CANNON.ContactMaterial(ball, bump, { friction: 0.0, restitution: 0.9 }),
    new CANNON.ContactMaterial(ball, soft, { friction: 0.05, restitution: 0.45 }),
  ];
  return { ball, table, wall, flip, bump, soft, contacts };
}

function addStaticBox(world, CANNON, mat, sx, sy, sz, x, y, z, rotY = 0) {
  const shape = new CANNON.Box(new CANNON.Vec3(sx, sy, sz));
  const body = new CANNON.Body({ mass: 0, material: mat });
  body.addShape(shape);
  body.position.set(x, y, z);
  if (rotY) body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotY);
  world.addBody(body);
  return body;
}

function meshBox(THREE, mat, w, h, d, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildTable(THREE, CANNON, scene, world, mats, pmat) {
  const root = new THREE.Group();
  scene.add(root);
  const parts = {
    root,
    lights: [],
    bumpers: [],
    slingshots: [],
    dropTargets: [],
    spinner: null,
    ramp: null,
    flippers: [],
    plunger: null,
    inserts: [],
    neon: [],
    playfieldMesh: null,
    cabinetMeshes: [],
    dmdMesh: null,
  };

  // --- Cabinet shell ---
  const cab = meshBox(THREE, mats.cabinet, 28, 4, 48, 0, -2.2, 0);
  root.add(cab);
  parts.cabinetMeshes.push(cab);

  // Legs
  for (const [lx, lz] of [
    [-11, -18],
    [11, -18],
    [-11, 18],
    [11, 18],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 12, 10), mats.wood);
    leg.position.set(lx, -8, lz);
    leg.castShadow = true;
    root.add(leg);
  }

  // Playfield
  const pf = meshBox(THREE, mats.playfield, TABLE.halfW * 2, 0.5, TABLE.halfL * 2, 0, 0, 0);
  root.add(pf);
  parts.playfieldMesh = pf;
  addStaticBox(world, CANNON, pmat.table, TABLE.halfW, 0.25, TABLE.halfL, 0, 0, 0);

  // Glass (visual only)
  const glass = meshBox(THREE, mats.glass, TABLE.halfW * 2 - 0.4, 0.05, TABLE.halfL * 2 - 0.4, 0, 3.4, 0);
  glass.castShadow = false;
  root.add(glass);

  // Walls
  const W = TABLE.halfW;
  const L = TABLE.halfL;
  const wh = TABLE.wallH;
  const wt = 0.45;

  // Left / right long walls
  root.add(meshBox(THREE, mats.chrome, wt, wh, L * 2, -W, wh / 2, 0));
  addStaticBox(world, CANNON, pmat.wall, wt / 2, wh / 2, L, -W, wh / 2, 0);
  root.add(meshBox(THREE, mats.chrome, wt, wh, L * 2, W, wh / 2, 0));
  addStaticBox(world, CANNON, pmat.wall, wt / 2, wh / 2, L, W, wh / 2, 0);

  // Back wall
  root.add(meshBox(THREE, mats.chrome, W * 2, wh, wt, 0, wh / 2, -L));
  addStaticBox(world, CANNON, pmat.wall, W, wh / 2, wt / 2, 0, wh / 2, -L);

  // Front apron pieces (gap in center for drain)
  const apronW = 6.5;
  root.add(meshBox(THREE, mats.chrome, apronW, wh, wt, -W + apronW / 2 + 0.2, wh / 2, L));
  addStaticBox(world, CANNON, pmat.wall, apronW / 2, wh / 2, wt / 2, -W + apronW / 2 + 0.2, wh / 2, L);
  root.add(meshBox(THREE, mats.chrome, apronW, wh, wt, W - apronW / 2 - 0.2, wh / 2, L));
  addStaticBox(world, CANNON, pmat.wall, apronW / 2, wh / 2, wt / 2, W - apronW / 2 - 0.2, wh / 2, L);

  // Plunger lane divider
  const laneX = 9.4;
  root.add(meshBox(THREE, mats.chrome, wt, wh, 22, laneX, wh / 2, 7));
  addStaticBox(world, CANNON, pmat.wall, wt / 2, wh / 2, 11, laneX, wh / 2, 7);

  // Upper arch / shooter lane guide
  root.add(meshBox(THREE, mats.chrome, 3, wh, wt, 11, wh / 2, -4));
  addStaticBox(world, CANNON, pmat.wall, 1.5, wh / 2, wt / 2, 11, wh / 2, -4);

  // Outlane posts
  for (const x of [-8.2, 8.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 12), mats.chrome);
    post.position.set(x, 0.9, 12.5);
    post.castShadow = true;
    root.add(post);
    const b = new CANNON.Body({ mass: 0, material: pmat.wall });
    b.addShape(new CANNON.Cylinder(0.28, 0.28, 1.4, 8));
    b.position.set(x, 0.9, 12.5);
    world.addBody(b);
  }

  // Inlane guides (angled)
  const guide = (x, z, rot, len = 4) => {
    root.add(meshBox(THREE, mats.chrome, 0.35, 1.2, len, x, 0.7, z, rot));
    addStaticBox(world, CANNON, pmat.wall, 0.18, 0.6, len / 2, x, 0.7, z, rot);
  };
  guide(-6.5, 13.5, 0.35, 5);
  guide(6.5, 13.5, -0.35, 5);

  // --- Neon inserts on playfield ---
  const insertSpecs = [
    { x: -3, z: -6, c: mats.neonPink, s: 1.4 },
    { x: 3, z: -6, c: mats.neonCyan, s: 1.4 },
    { x: 0, z: 2, c: mats.neonAmber, s: 1.8 },
    { x: -5, z: 4, c: mats.neonCyan, s: 1.1 },
    { x: 5, z: 4, c: mats.neonPink, s: 1.1 },
    { x: 0, z: -12, c: mats.neonPink, s: 2.2 },
  ];
  for (const s of insertSpecs) {
    const geo = new THREE.CircleGeometry(s.s, 24);
    const m = new THREE.Mesh(geo, s.c.clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set(s.x, 0.27, s.z);
    root.add(m);
    parts.inserts.push(m);
    // Point light for GI-ish glow
    const col = s.c.emissive || new THREE.Color(0xff44aa);
    const light = new THREE.PointLight(col.getHex(), 0.55, 8, 2);
    light.position.set(s.x, 1.2, s.z);
    root.add(light);
    parts.lights.push(light);
  }

  // Lane rollover lights (mission)
  for (let i = 0; i < 3; i++) {
    const x = -3 + i * 3;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 0.5),
      mats.insert.clone()
    );
    m.position.set(x, 0.28, -16.5);
    root.add(m);
    parts.inserts.push(m);
  }

  // --- Bumpers ---
  const bumperPos = [
    { x: -3.2, z: -8.5 },
    { x: 3.2, z: -8.5 },
    { x: 0, z: -4.8 },
  ];
  for (let i = 0; i < bumperPos.length; i++) {
    const p = bumperPos[i];
    const group = new THREE.Group();
    group.position.set(p.x, 0, p.z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.35, 20),
      mats.chrome
    );
    base.position.y = 0.4;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 1.1, 20),
      mats.bumper.clone()
    );
    cap.position.y = 1.0;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.12, 8, 24),
      mats.neonAmber
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    group.add(base, cap, ring);
    root.add(group);

    const body = new CANNON.Body({ mass: 0, material: pmat.bump });
    // Cannon cylinder is along Z by default in some versions — use sphere for reliability
    body.addShape(new CANNON.Sphere(1.05));
    body.position.set(p.x, 1.0, p.z);
    world.addBody(body);

    const light = new THREE.PointLight(0x4488ff, 0.3, 6, 2);
    light.position.set(p.x, 1.6, p.z);
    root.add(light);

    parts.bumpers.push({
      group,
      cap,
      body,
      light,
      baseMat: mats.bumper,
      litMat: mats.bumperLit,
      flash: 0,
      id: 'bumper' + i,
    });
  }

  // --- Slingshots ---
  const makeSling = (side) => {
    const s = side; // -1 left, +1 right
    const x = s * 5.5;
    const z = 9.5;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(s * 2.8, 3.2);
    shape.lineTo(s * 0.3, 3.2);
    shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mats.sling.clone());
    mesh.position.set(x - s * 1.2, 0.3, z - 1.5);
    mesh.castShadow = true;
    root.add(mesh);

    // Physics: angled box
    const body = addStaticBox(
      world,
      CANNON,
      pmat.bump,
      0.35,
      0.55,
      1.8,
      x,
      0.7,
      z,
      -s * 0.55
    );

    // Rubber band visual
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.5, 3.2),
      mats.neonPink
    );
    band.position.set(x - s * 0.5, 0.7, z);
    band.rotation.y = -s * 0.55;
    root.add(band);

    return {
      mesh,
      body,
      band,
      side: s,
      flash: 0,
      id: s < 0 ? 'slingL' : 'slingR',
      kick: new CANNON.Vec3(-s * 14, 2, -8),
    };
  };
  parts.slingshots.push(makeSling(-1), makeSling(1));

  // --- Drop targets (mission bank) ---
  const dropXs = [-2.4, 0, 2.4];
  dropXs.forEach((x, i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.3, 0.35),
      mats.target.clone()
    );
    mesh.position.set(x, 0.9, -14.5);
    mesh.castShadow = true;
    root.add(mesh);
    const body = addStaticBox(world, CANNON, pmat.soft, 0.9, 0.65, 0.18, x, 0.9, -14.5);
    // Letter plate
    parts.dropTargets.push({
      mesh,
      body,
      index: i,
      down: false,
      letter: ['P', 'H', 'W'][i],
      baseY: 0.9,
      id: 'drop' + i,
    });
  });

  // --- Spinner ---
  {
    const pivot = new THREE.Group();
    pivot.position.set(6.5, 1.0, -11.5);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.4, 0.35),
      mats.chrome
    );
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    pivot.add(blade, blade2);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), mats.neonCyan);
    pivot.add(hub);
    root.add(pivot);

    // Thin trigger body
    const body = addStaticBox(world, CANNON, pmat.soft, 0.15, 0.7, 0.4, 6.5, 1.0, -11.5);
    parts.spinner = {
      pivot,
      body,
      spin: 0,
      id: 'spinner',
    };
  }

  // --- Ramp (left side loop-ish) ---
  {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8.5, 0.8, -2),
      new THREE.Vector3(-9.0, 1.6, -8),
      new THREE.Vector3(-7.0, 2.6, -14),
      new THREE.Vector3(-2.0, 3.0, -17),
      new THREE.Vector3(4.0, 2.4, -15),
      new THREE.Vector3(7.5, 1.4, -10),
    ]);
    const rampMesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.55, 10, false),
      mats.ramp
    );
    rampMesh.castShadow = true;
    root.add(rampMesh);

    // Entrance rails
    const entryL = meshBox(THREE, mats.chrome, 0.3, 1.0, 3.5, -9.3, 0.7, 0.5);
    const entryR = meshBox(THREE, mats.chrome, 0.3, 1.0, 3.5, -7.5, 0.7, 0.5);
    root.add(entryL, entryR);
    addStaticBox(world, CANNON, pmat.wall, 0.15, 0.5, 1.75, -9.3, 0.7, 0.5);
    addStaticBox(world, CANNON, pmat.wall, 0.15, 0.5, 1.75, -7.5, 0.7, 0.5);

    // Segment physics
    const bodies = [];
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const p = curve.getPoint(t);
      const p2 = curve.getPoint(Math.min(1, t + 1 / segs));
      const mid = p.clone().lerp(p2, 0.5);
      const dir = p2.clone().sub(p).normalize();
      const len = p.distanceTo(p2);
      const body = new CANNON.Body({ mass: 0, material: pmat.table });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.55, 0.12, len / 2 + 0.05)));
      body.position.set(mid.x, mid.y, mid.z);
      // orient: rough look-at
      const up = new CANNON.Vec3(0, 1, 0);
      const z = new CANNON.Vec3(dir.x, dir.y, dir.z);
      // simple yaw/pitch from direction
      const yaw = Math.atan2(dir.x, dir.z);
      const pitch = -Math.asin(Math.max(-1, Math.min(1, dir.y)));
      const q1 = new CANNON.Quaternion();
      q1.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
      const q2 = new CANNON.Quaternion();
      q2.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), pitch);
      body.quaternion = q1.mult(q2);
      world.addBody(body);
      bodies.push(body);
    }

    // Neon strip along ramp
    const neon = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.08, 6, false),
      mats.neonCyan
    );
    neon.position.y = 0.15;
    root.add(neon);
    parts.neon.push(neon);

    parts.ramp = {
      mesh: rampMesh,
      bodies,
      curve,
      entrance: new THREE.Vector3(-8.5, 0.8, -1.5),
      exit: new THREE.Vector3(7.5, 1.4, -10),
      id: 'ramp',
    };
  }

  // --- Flippers ---
  const makeFlipper = (side) => {
    // side -1 = left, +1 = right
    // Paddle extends along +X (left) or -X (right) from hinge.
    // Rest: tip toward drain (+Z). Active: tip swings toward top (−Z).
    const rest = side < 0 ? -0.52 : 0.52;
    const active = side < 0 ? 0.62 : -0.62;
    const pivotX = side * 2.6;
    const pivotZ = TABLE.flipperZ;
    const len = 3.4;
    const thick = 0.55;
    const height = 0.55;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(len, height, thick),
      mats.flipper
    );
    // Offset so hinge is at inner end
    mesh.geometry.translate(side < 0 ? len / 2 : -len / 2, 0, 0);
    mesh.position.set(pivotX, 0.55, pivotZ);
    mesh.rotation.y = rest;
    mesh.castShadow = true;
    root.add(mesh);

    // Tip light
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      mats.neonAmber
    );
    tip.position.set(side < 0 ? len - 0.2 : -(len - 0.2), 0, 0);
    mesh.add(tip);

    const body = new CANNON.Body({
      mass: 0,
      material: pmat.flip,
      type: CANNON.Body.KINEMATIC,
    });
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(len / 2, height / 2, thick / 2)),
      new CANNON.Vec3(side < 0 ? len / 2 : -len / 2, 0, 0)
    );
    body.position.set(pivotX, 0.55, pivotZ);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rest);
    world.addBody(body);

    return {
      mesh,
      body,
      side,
      pivotX,
      pivotZ,
      len,
      restAngle: rest,
      activeAngle: active,
      angle: rest,
      pressed: false,
      angularVel: 0,
      id: side < 0 ? 'flipL' : 'flipR',
    };
  };
  parts.flippers.push(makeFlipper(-1), makeFlipper(1));

  // --- Plunger ---
  {
    const x = TABLE.plungerX;
    const housing = meshBox(THREE, mats.cabinet, 2.2, 1.6, 8, x, 0.9, 14);
    root.add(housing);
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 4, 12),
      mats.flipper
    );
    rod.rotation.x = Math.PI / 2;
    rod.position.set(x, 0.7, 17);
    root.add(rod);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), mats.neonPink);
    knob.position.set(x, 0.7, 19);
    root.add(knob);
    parts.plunger = {
      rod,
      knob,
      x,
      pull: 0,
      charging: false,
      restZ: 17,
    };
  }

  // Backbox / DMD housing
  {
    const box = meshBox(THREE, mats.cabinet, 18, 9, 1.2, 0, 8, -L - 0.5);
    root.add(box);
    parts.cabinetMeshes.push(box);
    // Marquee neon
    const marquee = new THREE.Mesh(
      new THREE.BoxGeometry(16, 1.2, 0.3),
      mats.neonPink
    );
    marquee.position.set(0, 12.2, -L - 0.3);
    root.add(marquee);
    parts.neon.push(marquee);
    const titleLight = new THREE.PointLight(0xff44aa, 1.2, 20, 2);
    titleLight.position.set(0, 11, -L + 2);
    root.add(titleLight);
    parts.lights.push(titleLight);
  }

  // Ambient + key lights
  const ambient = new THREE.AmbientLight(0x446688, 0.35);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffe2c8, 0.85);
  key.position.set(8, 30, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 80;
  key.shadow.camera.left = -25;
  key.shadow.camera.right = 25;
  key.shadow.camera.top = 25;
  key.shadow.camera.bottom = -25;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688ff, 0.25);
  fill.position.set(-12, 10, -5);
  scene.add(fill);
  const hemi = new THREE.HemisphereLight(0x88aaff, 0x221100, 0.35);
  scene.add(hemi);

  // Drain trough visual
  const drain = meshBox(THREE, new THREE.MeshStandardMaterial({ color: 0x080808 }), 7, 0.3, 2.5, 0, -0.1, 19);
  root.add(drain);

  return parts;
}

/** Sync flipper kinematic body from angle. */
export function setFlipperAngle(flip, angle, dt) {
  const prev = flip.angle;
  flip.angle = angle;
  flip.angularVel = dt > 0 ? (angle - prev) / dt : 0;
  flip.mesh.rotation.y = angle;
  flip.body.position.set(flip.pivotX, 0.55, flip.pivotZ);
  flip.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
  // Kinematic velocity for proper collision response
  flip.body.velocity.setZero();
  flip.body.angularVelocity.set(0, flip.angularVel, 0);
}

export function createBall(THREE, CANNON, scene, world, mats, pmat, x, y, z) {
  const r = TABLE.ballR;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), mats.ball);
  mesh.castShadow = true;
  scene.add(mesh);

  // Trail
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const trail = [];
  for (let i = 0; i < 10; i++) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(r * (0.7 - i * 0.05), 8, 8), trailMat.clone());
    t.material.opacity = 0.28 - i * 0.025;
    t.visible = false;
    scene.add(t);
    trail.push(t);
  }

  const body = new CANNON.Body({
    mass: 0.85,
    material: pmat.ball,
    linearDamping: 0.12,
    angularDamping: 0.2,
    allowSleep: false,
  });
  body.addShape(new CANNON.Sphere(r));
  body.position.set(x, y, z);
  body.sphereRadius = r; // for custom logic
  world.addBody(body);

  return { mesh, body, trail, r, alive: true, launched: false, id: Math.random().toString(36).slice(2) };
}

export function removeBall(scene, world, ball) {
  if (!ball) return;
  scene.remove(ball.mesh);
  for (const t of ball.trail) scene.remove(t);
  try {
    world.removeBody(ball.body);
  } catch (_) {}
  ball.alive = false;
}
