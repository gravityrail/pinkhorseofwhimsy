#!/usr/bin/env node

/**
 * Generate GLB model files for maze props using @gltf-transform/core.
 * All models are unit-sized (1x1x1) — GDevelop scales them via width/height/depth.
 */

import { Document, NodeIO } from '@gltf-transform/core';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Geometry helpers ────────────────────────────────────────────────────

/** Create a unit box (1x1x1) centered at origin */
function createBoxGeometry(doc, r, g, b) {
  const mesh = doc.createMesh('box');
  const prim = doc.createPrimitive();

  // 24 vertices (4 per face, for proper normals)
  const positions = new Float32Array([
    // Front face (z=0.5)
    -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
    // Back face (z=-0.5)
    -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
    // Top face (y=0.5)
    -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
    // Bottom face (y=-0.5)
    -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5,
    // Right face (x=0.5)
     0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
    // Left face (x=-0.5)
    -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
  ]);

  const normals = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
  ]);

  const indices = new Uint16Array([
    0,1,2, 0,2,3,     // front
    4,5,6, 4,6,7,     // back
    8,9,10, 8,10,11,  // top
    12,13,14, 12,14,15, // bottom
    16,17,18, 16,18,19, // right
    20,21,22, 20,22,23, // left
  ]);

  const posAccessor = doc.createAccessor('pos').setType('VEC3').setArray(positions);
  const normAccessor = doc.createAccessor('norm').setType('VEC3').setArray(normals);
  const idxAccessor = doc.createAccessor('idx').setType('SCALAR').setArray(indices);

  prim.setAttribute('POSITION', posAccessor);
  prim.setAttribute('NORMAL', normAccessor);
  prim.setIndices(idxAccessor);

  const mat = doc.createMaterial('mat')
    .setBaseColorFactor([r, g, b, 1])
    .setRoughnessFactor(0.8)
    .setMetallicFactor(0.0)
    .setDoubleSided(true);
  prim.setMaterial(mat);
  mesh.addPrimitive(prim);
  return mesh;
}

/** Create a cylinder approximation (N-sided prism) centered at origin, height 1, radius 0.5 */
function createCylinderGeometry(doc, r, g, b, segments = 16) {
  const mesh = doc.createMesh('cylinder');

  const positions = [];
  const normals = [];
  const indices = [];

  // Side faces
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const nx = (c0 + c1) / 2, nz = (s0 + s1) / 2;
    const len = Math.sqrt(nx * nx + nz * nz);

    const base = positions.length / 3;
    // 4 vertices per quad
    positions.push(c0 * 0.5, -0.5, s0 * 0.5);
    positions.push(c1 * 0.5, -0.5, s1 * 0.5);
    positions.push(c1 * 0.5,  0.5, s1 * 0.5);
    positions.push(c0 * 0.5,  0.5, s0 * 0.5);
    for (let j = 0; j < 4; j++) normals.push(nx / len, 0, nz / len);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // Top cap
  const topCenter = positions.length / 3;
  positions.push(0, 0.5, 0);
  normals.push(0, 1, 0);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5);
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(topCenter, topCenter + 1 + i, topCenter + 1 + ((i + 1) % segments));
  }

  // Bottom cap
  const botCenter = positions.length / 3;
  positions.push(0, -0.5, 0);
  normals.push(0, -1, 0);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(botCenter, botCenter + 1 + ((i + 1) % segments), botCenter + 1 + i);
  }

  const prim = doc.createPrimitive();
  prim.setAttribute('POSITION', doc.createAccessor('pos').setType('VEC3').setArray(new Float32Array(positions)));
  prim.setAttribute('NORMAL', doc.createAccessor('norm').setType('VEC3').setArray(new Float32Array(normals)));
  prim.setIndices(doc.createAccessor('idx').setType('SCALAR').setArray(new Uint16Array(indices)));

  const mat = doc.createMaterial('mat')
    .setBaseColorFactor([r, g, b, 1])
    .setRoughnessFactor(0.8)
    .setMetallicFactor(0.0)
    .setDoubleSided(true);
  prim.setMaterial(mat);
  mesh.addPrimitive(prim);
  return mesh;
}

/** Create a barrel: brown cylinder with darker bands (two-material cylinder) */
function createBarrelModel() {
  const doc = new Document();
  const scene = doc.createScene('Scene');
  const node = doc.createNode('Barrel');

  // Main barrel body
  const mesh = createCylinderGeometry(doc, 0.45, 0.25, 0.1);

  // Add metal bands as thin cylinders (slightly larger radius)
  const bandMat = doc.createMaterial('band')
    .setBaseColorFactor([0.3, 0.3, 0.3, 1])
    .setRoughnessFactor(0.4)
    .setMetallicFactor(0.6)
    .setDoubleSided(true);

  for (const bandY of [-0.35, 0.0, 0.35]) {
    const bandPositions = [];
    const bandNormals = [];
    const bandIndices = [];
    const segs = 16;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);
      const nx = (c0 + c1) / 2, nz = (s0 + s1) / 2;
      const len = Math.sqrt(nx * nx + nz * nz);
      const base = bandPositions.length / 3;
      const r = 0.52;
      bandPositions.push(c0*r, bandY-0.03, s0*r, c1*r, bandY-0.03, s1*r, c1*r, bandY+0.03, s1*r, c0*r, bandY+0.03, s0*r);
      for (let j = 0; j < 4; j++) bandNormals.push(nx/len, 0, nz/len);
      bandIndices.push(base, base+1, base+2, base, base+2, base+3);
    }
    const bandPrim = doc.createPrimitive();
    bandPrim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(bandPositions)));
    bandPrim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(bandNormals)));
    bandPrim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(bandIndices)));
    bandPrim.setMaterial(bandMat);
    mesh.addPrimitive(bandPrim);
  }

  node.setMesh(mesh);
  scene.addChild(node);
  return doc;
}

/** Create a wooden crate: box with plank-like detail */
function createCrateModel() {
  const doc = new Document();
  const scene = doc.createScene('Scene');
  const node = doc.createNode('Crate');

  // Main body
  const mesh = createBoxGeometry(doc, 0.55, 0.4, 0.2);

  // Cross braces on front/back
  const braceMat = doc.createMaterial('brace')
    .setBaseColorFactor([0.35, 0.25, 0.1, 1])
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0.0);

  // Add thin cross planks on each face
  for (const [fx, fy, fz, w, h, d] of [
    // Front X brace
    [0, 0, 0.51, 0.08, 1.0, 0.02],
    // Rotated X on front (simulated as horizontal bar)
    [0, 0, 0.51, 1.0, 0.08, 0.02],
    // Back
    [0, 0, -0.51, 0.08, 1.0, 0.02],
    [0, 0, -0.51, 1.0, 0.08, 0.02],
    // Edges/trim
    [0, 0.5, 0, 1.02, 0.04, 1.02],
    [0, -0.5, 0, 1.02, 0.04, 1.02],
  ]) {
    const positions = new Float32Array([
      fx-w/2, fy-h/2, fz+d/2,  fx+w/2, fy-h/2, fz+d/2,  fx+w/2, fy+h/2, fz+d/2,  fx-w/2, fy+h/2, fz+d/2,
      fx-w/2, fy-h/2, fz-d/2,  fx-w/2, fy+h/2, fz-d/2,  fx+w/2, fy+h/2, fz-d/2,  fx+w/2, fy-h/2, fz-d/2,
    ]);
    const bNormals = new Float32Array([
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    ]);
    const bIndices = new Uint16Array([0,1,2, 0,2,3, 4,5,6, 4,6,7]);
    const prim = doc.createPrimitive();
    prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(positions));
    prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(bNormals));
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(bIndices));
    prim.setMaterial(braceMat);
    mesh.addPrimitive(prim);
  }

  node.setMesh(mesh);
  scene.addChild(node);
  return doc;
}

/** Helper: create a small box mesh for a single LED */
function createLedMesh(doc, material, cx, cy, cz, w, h, d) {
  const mesh = doc.createMesh();
  addBoxPrimitive(doc, mesh, material, cx, cy, cz, w, h, d);
  return mesh;
}

/** Helper: create a STEP scale animation channel that blinks a node on/off.
 *  onTimes = array of [startTime, endTime] pairs when LED is ON within the cycle. */
function createBlinkChannel(doc, anim, ledNode, cycleDuration, onTimes) {
  // Build keyframes: at each transition point, scale goes to (1,1,1) or (0,0,0)
  const times = [0];
  const values = [];
  // Determine state at t=0
  let onAtZero = onTimes.some(([s, e]) => s <= 0 && e > 0);

  // Collect all transition points sorted
  const transitions = [];
  for (const [s, e] of onTimes) {
    transitions.push({ t: s, on: true });
    transitions.push({ t: e, on: false });
  }
  transitions.sort((a, b) => a.t - b.t);

  // Build timeline
  const keyTimes = [];
  const keyScales = [];
  let currentlyOn = onAtZero;
  keyTimes.push(0);
  keyScales.push(currentlyOn ? 1 : 0);

  for (const { t, on } of transitions) {
    if (t <= 0 || t >= cycleDuration) continue;
    keyTimes.push(t);
    keyScales.push(on ? 1 : 0);
  }
  // Close the loop
  keyTimes.push(cycleDuration);
  keyScales.push(onAtZero ? 1 : 0);

  const input = doc.createAccessor(`blink_time_${ledNode.getName()}`)
    .setType('SCALAR')
    .setArray(new Float32Array(keyTimes));

  const output = doc.createAccessor(`blink_scale_${ledNode.getName()}`)
    .setType('VEC3')
    .setArray(new Float32Array(keyScales.flatMap(s => [s, s, s])));

  const sampler = doc.createAnimationSampler()
    .setInput(input)
    .setOutput(output)
    .setInterpolation('STEP');

  const channel = doc.createAnimationChannel()
    .setTargetNode(ledNode)
    .setTargetPath('scale')
    .setSampler(sampler);

  anim.addSampler(sampler);
  anim.addChannel(channel);
}

/** Create a server rack cabinet with animated blinking LEDs.
 *  Z axis = up in GDevelop. LEDs on both Y faces. */
function createComputerModel() {
  const doc = new Document();
  const scene = doc.createScene('Scene');
  const root = doc.createNode('Computer');

  // Main cabinet body
  const cabinetMesh = doc.createMesh('cabinet');
  const cabinetMat = doc.createMaterial('cabinet')
    .setBaseColorFactor([0.12, 0.12, 0.15, 1])
    .setRoughnessFactor(0.4)
    .setMetallicFactor(0.6);
  addBoxPrimitive(doc, cabinetMesh, cabinetMat, 0, 0, 0, 0.95, 0.95, 0.95);

  // Front/back panel insets
  const panelMat = doc.createMaterial('panel')
    .setBaseColorFactor([0.15, 0.15, 0.18, 1])
    .setRoughnessFactor(0.5)
    .setMetallicFactor(0.4);
  addBoxPrimitive(doc, cabinetMesh, panelMat, 0, -0.48, 0, 0.85, 0.02, 0.85);
  addBoxPrimitive(doc, cabinetMesh, panelMat, 0, 0.48, 0, 0.85, 0.02, 0.85);

  root.setMesh(cabinetMesh);

  // LED materials
  const blueLed = doc.createMaterial('led_blue')
    .setBaseColorFactor([0.1, 0.3, 1.0, 1])
    .setEmissiveFactor([0.1, 0.3, 1.0])
    .setRoughnessFactor(1.0).setMetallicFactor(0.0);

  const greenLed = doc.createMaterial('led_green')
    .setBaseColorFactor([0.1, 0.9, 0.3, 1])
    .setEmissiveFactor([0.1, 0.9, 0.3])
    .setRoughnessFactor(1.0).setMetallicFactor(0.0);

  const yellowLed = doc.createMaterial('led_yellow')
    .setBaseColorFactor([0.9, 0.8, 0.1, 1])
    .setEmissiveFactor([0.9, 0.8, 0.1])
    .setRoughnessFactor(1.0).setMetallicFactor(0.0);

  const redLed = doc.createMaterial('led_red')
    .setBaseColorFactor([1.0, 0.1, 0.1, 1])
    .setEmissiveFactor([1.0, 0.1, 0.1])
    .setRoughnessFactor(1.0).setMetallicFactor(0.0);

  // Animation setup
  const anim = doc.createAnimation('blink');
  const CYCLE = 3.0; // 3 second loop
  const t = 0.02; // LED thickness
  let ledId = 0;

  /** Create an LED on both faces, add as child node, animate it */
  function addLed(material, x, z, size, onTimes) {
    const name = `led_${ledId++}`;
    const ledMesh = doc.createMesh(name);
    // Front face
    addBoxPrimitive(doc, ledMesh, material, x, -0.49, z, size, t, size);
    // Back face
    addBoxPrimitive(doc, ledMesh, material, x, 0.49, z, size, t, size);

    const ledNode = doc.createNode(name).setMesh(ledMesh);
    root.addChild(ledNode);
    createBlinkChannel(doc, anim, ledNode, CYCLE, onTimes);
  }

  // Row of 3 blue LEDs (top — sequential chase, each on for 0.3s)
  addLed(blueLed, -0.2, 0.35, 0.06, [[0, 0.3], [1.5, 1.8]]);
  addLed(blueLed,  0.0, 0.35, 0.06, [[0.3, 0.6], [1.8, 2.1]]);
  addLed(blueLed,  0.2, 0.35, 0.06, [[0.6, 0.9], [2.1, 2.4]]);

  // 2x2 green/yellow grid (middle — alternating, swap every 1s)
  addLed(greenLed,  -0.12, 0.12, 0.06, [[0, 1.0], [2.0, 3.0]]);     // on, off, on
  addLed(yellowLed,  0.12, 0.12, 0.06, [[1.0, 2.0]]);                 // off, on, off
  addLed(yellowLed, -0.12, 0.0,  0.06, [[1.0, 2.0]]);                 // off, on, off
  addLed(greenLed,   0.12, 0.0,  0.06, [[0, 1.0], [2.0, 3.0]]);     // on, off, on

  // Row of 4 red LEDs (lower — occasional brief flash, staggered)
  addLed(redLed, -0.25, -0.15, 0.05, [[0.5, 0.65]]);
  addLed(redLed, -0.08, -0.15, 0.05, [[1.2, 1.35]]);
  addLed(redLed,  0.09, -0.15, 0.05, [[2.0, 2.15]]);
  addLed(redLed,  0.26, -0.15, 0.05, [[2.7, 2.85]]);

  // Large green power LED (bottom — always on, no animation needed)
  const powerMesh = doc.createMesh('power_led');
  addBoxPrimitive(doc, powerMesh, greenLed, 0, -0.49, -0.35, 0.08, t, 0.08);
  addBoxPrimitive(doc, powerMesh, greenLed, 0, 0.49, -0.35, 0.08, t, 0.08);
  root.addChild(doc.createNode('power_led').setMesh(powerMesh));

  scene.addChild(root);
  return doc;
}

/** Add a cone/frustum primitive to a mesh. Cone along Z axis (GDevelop up), base at z=baseZ, tip at z=tipZ */
function addConePrimitive(doc, mesh, material, cx, cy, baseZ, baseRadius, tipRadius, tipZ, segments = 12) {
  const positions = [];
  const normals = [];
  const indices = [];

  const height = tipZ - baseZ;
  const slopeAngle = Math.atan2(baseRadius - tipRadius, height);
  const nz = Math.sin(slopeAngle);
  const nScale = Math.cos(slopeAngle);

  // Side faces — cone along Z axis
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const nx0 = c0 * nScale, ny0 = s0 * nScale;
    const nx1 = c1 * nScale, ny1 = s1 * nScale;

    const base = positions.length / 3;
    positions.push(cx + c0 * baseRadius, cy + s0 * baseRadius, baseZ);
    positions.push(cx + c1 * baseRadius, cy + s1 * baseRadius, baseZ);
    positions.push(cx + c1 * tipRadius, cy + s1 * tipRadius, tipZ);
    positions.push(cx + c0 * tipRadius, cy + s0 * tipRadius, tipZ);
    normals.push(nx0, ny0, nz, nx1, ny1, nz, nx1, ny1, nz, nx0, ny0, nz);
    indices.push(base, base+1, base+2, base, base+2, base+3);
  }

  const prim = doc.createPrimitive();
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)));
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)));
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)));
  prim.setMaterial(material);
  mesh.addPrimitive(prim);
}

/** Create a wall torch: vertical arm with brazier cup and flame on top.
 *  GLB Z axis = game vertical (up). Arm extends along Z, flame cones along Z.
 *  Symmetrical in X/Y so orientation doesn't matter per-wall. */
function createSconceModel() {
  const doc = new Document();
  const scene = doc.createScene('Scene');
  const node = doc.createNode('Sconce');
  const mesh = doc.createMesh('sconce');

  const ironMat = doc.createMaterial('iron')
    .setBaseColorFactor([0.25, 0.22, 0.2, 1])
    .setRoughnessFactor(0.5)
    .setMetallicFactor(0.7);

  // Wall mount plate (flat, at bottom of arm)
  addBoxPrimitive(doc, mesh, ironMat, 0, 0, -0.45, 0.2, 0.12, 0.08);

  // Vertical arm (extends up along Z)
  addBoxPrimitive(doc, mesh, ironMat, 0, 0, -0.15, 0.06, 0.06, 0.5);

  // Brazier cup (cone widening upward) at top of arm
  const cupMat = doc.createMaterial('cup')
    .setBaseColorFactor([0.3, 0.25, 0.18, 1])
    .setRoughnessFactor(0.6)
    .setMetallicFactor(0.5);

  // Cup: narrow at z=0.05, wide rim at z=0.15 (cone along Z)
  addConePrimitive(doc, mesh, cupMat, 0, 0, 0.05, 0.06, 0.15, 0.15);

  // Flame: outer glow (wide base tapering to point upward along Z)
  const flameMat = doc.createMaterial('flame')
    .setBaseColorFactor([1.0, 0.6, 0.1, 1])
    .setEmissiveFactor([1.0, 0.5, 0.1])
    .setRoughnessFactor(1.0)
    .setMetallicFactor(0.0);

  addConePrimitive(doc, mesh, flameMat, 0, 0, 0.15, 0.1, 0.02, 0.45);

  // Flame: inner bright core
  const coreMat = doc.createMaterial('flamecore')
    .setBaseColorFactor([1.0, 0.9, 0.4, 1])
    .setEmissiveFactor([1.0, 0.85, 0.35])
    .setRoughnessFactor(1.0)
    .setMetallicFactor(0.0);

  addConePrimitive(doc, mesh, coreMat, 0, 0, 0.17, 0.06, 0.01, 0.38);

  node.setMesh(mesh);
  scene.addChild(node);
  return doc;
}

/** Create a ceiling light panel: flat box with emissive face */
function createCeilingLightModel() {
  const doc = new Document();
  const scene = doc.createScene('Scene');
  const node = doc.createNode('CeilingLight');
  const mesh = doc.createMesh('light');

  // Housing
  const housingMat = doc.createMaterial('housing')
    .setBaseColorFactor([0.6, 0.6, 0.6, 1])
    .setRoughnessFactor(0.5)
    .setMetallicFactor(0.5);

  addBoxPrimitive(doc, mesh, housingMat, 0, 0.1, 0, 1.0, 0.2, 1.0);

  // Light panel (emissive)
  const lightMat = doc.createMaterial('lightpanel')
    .setBaseColorFactor([0.9, 1.0, 0.9, 1])
    .setEmissiveFactor([0.8, 1.0, 0.85])
    .setRoughnessFactor(1.0)
    .setMetallicFactor(0.0);

  addBoxPrimitive(doc, mesh, lightMat, 0, -0.01, 0, 0.9, 0.02, 0.9);

  node.setMesh(mesh);
  scene.addChild(node);
  return doc;
}

/** Helper: add a box primitive to an existing mesh */
function addBoxPrimitive(doc, mesh, material, cx, cy, cz, w, h, d) {
  const hw = w/2, hh = h/2, hd = d/2;
  const positions = new Float32Array([
    // Front
    cx-hw, cy-hh, cz+hd, cx+hw, cy-hh, cz+hd, cx+hw, cy+hh, cz+hd, cx-hw, cy+hh, cz+hd,
    // Back
    cx-hw, cy-hh, cz-hd, cx-hw, cy+hh, cz-hd, cx+hw, cy+hh, cz-hd, cx+hw, cy-hh, cz-hd,
    // Top
    cx-hw, cy+hh, cz-hd, cx-hw, cy+hh, cz+hd, cx+hw, cy+hh, cz+hd, cx+hw, cy+hh, cz-hd,
    // Bottom
    cx-hw, cy-hh, cz-hd, cx+hw, cy-hh, cz-hd, cx+hw, cy-hh, cz+hd, cx-hw, cy-hh, cz+hd,
    // Right
    cx+hw, cy-hh, cz-hd, cx+hw, cy+hh, cz-hd, cx+hw, cy+hh, cz+hd, cx+hw, cy-hh, cz+hd,
    // Left
    cx-hw, cy-hh, cz-hd, cx-hw, cy-hh, cz+hd, cx-hw, cy+hh, cz+hd, cx-hw, cy+hh, cz-hd,
  ]);
  const normals = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
  ]);
  const indices = new Uint16Array([
    0,1,2, 0,2,3,  4,5,6, 4,6,7,  8,9,10, 8,10,11,
    12,13,14, 12,14,15,  16,17,18, 16,18,19,  20,21,22, 20,22,23,
  ]);

  const prim = doc.createPrimitive();
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(positions));
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals));
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(indices));
  prim.setMaterial(material);
  mesh.addPrimitive(prim);
}

// ─── Main ────────────────────────────────────────────────────────────────

const models = {
  'barrel.glb': createBarrelModel,
  'crate.glb': createCrateModel,
  'computer.glb': createComputerModel,
  'sconce.glb': createSconceModel,
  'ceiling_light.glb': createCeilingLightModel,
};

const io = new NodeIO();

for (const [filename, generator] of Object.entries(models)) {
  const doc = generator();
  // GLB requires all accessors assigned to a buffer
  const buf = doc.createBuffer('data');
  for (const accessor of doc.getRoot().listAccessors()) {
    accessor.setBuffer(buf);
  }
  // GDevelop's renderer applies a Y-flip that inverts face winding;
  // double-sided materials ensure correct rendering regardless.
  for (const mat of doc.getRoot().listMaterials()) {
    mat.setDoubleSided(true);
  }
  const glb = await io.writeBinary(doc);
  const outPath = join(__dirname, filename);
  writeFileSync(outPath, Buffer.from(glb));
  console.log(`  Generated: ${filename} (${glb.byteLength} bytes)`);
}

console.log('Done generating prop models.');
