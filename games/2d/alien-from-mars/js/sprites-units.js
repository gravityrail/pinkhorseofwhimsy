// The Alien from Mars — sprites-units.js
// Player UFO, rival UFO, soldier, tank + separate turret, jet.
// All art procedurally drawn to canvases at 1x logical scale. See DESIGN.md §3.
import { PAL } from './shared.js';

// ---------------------------------------------------------------------------
// Tiny pixel-grid helper. We paint into an index buffer, auto-add a 1px
// silhouette outline, then bake to a transparent canvas. This guarantees a
// clean 1px PAL.outline around every shape and makes edits legible.
// ---------------------------------------------------------------------------
function G(w, h) { return { w, h, d: new Array(w * h).fill(null) }; }
function px(g, x, y, c) {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h || !c) return;
  g.d[y * g.w + x] = c;
}
function get(g, x, y) {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return null;
  return g.d[y * g.w + x];
}
function row(g, y, x0, x1, c) { for (let x = x0; x <= x1; x++) px(g, x, y, c); }
function col(g, x, y0, y1, c) { for (let y = y0; y <= y1; y++) px(g, x, y, c); }
function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) row(g, y, x0, x1, c); }

// Auto 1px outline: any empty cell 4-adjacent to a non-outline fill becomes outline.
function addOutline(g, c) {
  const marks = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (get(g, x, y) !== null) continue;
      const n = get(g, x, y - 1), s = get(g, x, y + 1), e = get(g, x + 1, y), w = get(g, x - 1, y);
      if ((n && n !== c) || (s && s !== c) || (e && e !== c) || (w && w !== c)) marks.push(y * g.w + x);
    }
  }
  for (const i of marks) g.d[i] = c;
}

function bake(g) {
  const cv = document.createElement('canvas');
  cv.width = g.w; cv.height = g.h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const c = g.d[y * g.w + x];
      if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
    }
  }
  return cv;
}

// ---------------------------------------------------------------------------
// PLAYER UFO — 26x15, 2 frames, center anchor.
// Chrome saucer, teal glass dome w/ tiny green martian, alternating rim lights.
// ---------------------------------------------------------------------------
function drawPlayerUFO(frame) {
  const g = G(26, 15);
  // --- Dome glass (teal bubble). glow = bright glass, metal2/3 = shaded edge ---
  row(g, 1, 12, 13, PAL.glow);
  row(g, 2, 11, 15, PAL.glow);
  row(g, 3, 10, 16, PAL.glow);
  row(g, 4, 10, 16, PAL.glow);
  row(g, 5, 9, 17, PAL.glow);
  // curved shading so the glass reads as a bubble, and a bright top glint
  px(g, 16, 3, PAL.metal3); px(g, 16, 4, PAL.metal3); px(g, 16, 5, PAL.metal3); px(g, 17, 5, PAL.metal3);
  px(g, 15, 5, PAL.metal2);
  px(g, 10, 2, PAL.white); // glass shine
  // --- Tiny green martian, clearly framed by teal glass on all sides ---
  px(g, 13, 1, PAL.beam);                                 // antenna / bright crown tip
  row(g, 2, 12, 13, PAL.alien);                           // forehead
  px(g, 12, 2, PAL.beam);                                 // rim-lit crown
  row(g, 3, 12, 14, PAL.alien);                           // head band (with eyes)
  px(g, 12, 3, PAL.outline); px(g, 14, 3, PAL.outline);  // two big dark almond eyes
  row(g, 4, 12, 14, PAL.alien);                           // jaw / little shoulders
  px(g, 12, 4, PAL.beam);                                 // rim light on shoulder
  // --- Chrome hull ---
  row(g, 6, 7, 19, PAL.metal1);   // bright top surface
  row(g, 7, 4, 22, PAL.metal2);   // mid
  row(g, 8, 2, 24, PAL.metal1);   // bright rim band (widest)
  row(g, 9, 3, 23, PAL.metal3);   // lower
  row(g, 10, 5, 21, PAL.metal4);  // dark underside (lights row)
  row(g, 11, 8, 18, PAL.metal4);
  row(g, 12, 11, 15, PAL.metal4);
  // warm dusk rim light on the top-left edge
  px(g, 7, 6, PAL.horizon); px(g, 8, 6, PAL.horizon);
  px(g, 12, 1, PAL.horizon);
  // a dark equator seam just under the rim for chrome contrast
  px(g, 3, 9, PAL.metal4); px(g, 23, 9, PAL.metal4);
  // --- Center abduction emitter glow ---
  px(g, 13, 11, PAL.beam); px(g, 12, 12, PAL.beam); px(g, 14, 12, PAL.beam); px(g, 13, 12, PAL.beam);
  // --- Running lights along the underside rim, alternating per frame ---
  const lightX = [6, 9, 12, 15, 18, 21];
  for (let i = 0; i < lightX.length; i++) {
    const lit = (i % 2 === 0) === (frame === 0);
    px(g, lightX[i], 10, lit ? PAL.glow : PAL.metal2);
    if (lit) px(g, lightX[i], 11, PAL.beam); // tiny glow spill below
  }
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// ENEMY UFO — 24x14, 2 frames, center anchor.
// Meaner angular rival saucer, red glass canopy w/ a slit, red/purple lights.
// ---------------------------------------------------------------------------
function drawEnemyUFO(frame) {
  const g = G(24, 14);
  // --- Low angular canopy (red menacing glass) ---
  row(g, 2, 10, 13, PAL.dusk3);   // narrow pointed canopy top
  row(g, 3, 9, 14, PAL.red);
  // dark cockpit slit -> reads as a single mean glaring eye
  row(g, 4, 9, 14, PAL.outline);
  px(g, 10, 4, PAL.fire3); px(g, 13, 4, PAL.fire2); // hot glare inside the slit
  // --- Angular hull: flat top plate, sharp swept rim tips ---
  row(g, 5, 5, 18, PAL.metal2);   // flat upper plate (lit)
  row(g, 6, 3, 20, PAL.metal3);   // shoulders
  row(g, 7, 1, 22, PAL.metal3);   // widest pointed rim
  px(g, 0, 7, PAL.metal4); px(g, 23, 7, PAL.metal4); // sharp swept tips
  px(g, 1, 6, PAL.metal4); px(g, 22, 6, PAL.metal4); // tip bevels
  row(g, 8, 4, 19, PAL.metal4);   // dark underside
  row(g, 9, 8, 15, PAL.metal4);
  // aggressive central spike pointing down
  px(g, 11, 10, PAL.metal4); px(g, 12, 10, PAL.metal4);
  px(g, 11, 11, PAL.dusk2); px(g, 12, 11, PAL.dusk2);
  px(g, 11, 12, PAL.dusk2);
  // angular purple panel lines on the top plate
  px(g, 6, 5, PAL.dusk2); px(g, 17, 5, PAL.dusk2);
  px(g, 4, 6, PAL.dusk1); px(g, 19, 6, PAL.dusk1);
  // faint warm rim on the top edge
  px(g, 10, 2, PAL.horizon); px(g, 13, 2, PAL.horizon);
  // --- Red/purple running lights along the rim, alternating ---
  const lightX = [4, 8, 12, 16, 19];
  for (let i = 0; i < lightX.length; i++) {
    const lit = (i % 2 === 0) === (frame === 0);
    px(g, lightX[i], 8, lit ? PAL.red : PAL.dusk1);
    if (lit) px(g, lightX[i], 9, PAL.fire3);
  }
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// SOLDIER — 10x14, walk (2f) + aim (1f). Bottom-center (feet) anchor.
// Green fatigues, helmet, rifle. Faces right.
// ---------------------------------------------------------------------------
function soldierBody(g) {
  // Helmet
  row(g, 1, 3, 7, PAL.army1);
  row(g, 2, 2, 8, PAL.army1);
  px(g, 3, 1, PAL.horizon); px(g, 4, 1, PAL.horizon); // warm rim on helmet
  px(g, 8, 2, PAL.army2); // helmet shade
  // Brim
  row(g, 3, 2, 8, PAL.army2);
  // Face (under brim)
  row(g, 4, 5, 7, PAL.fat);
  px(g, 6, 4, PAL.outline); // eye
  px(g, 7, 4, PAL.fat);
  // Torso / fatigues
  row(g, 5, 4, 7, PAL.army1);
  row(g, 6, 3, 7, PAL.army1);
  row(g, 7, 3, 7, PAL.army1);
  row(g, 8, 3, 7, PAL.army1);
  // shading down the right side
  col(g, 7, 5, 8, PAL.army2);
  // ammo strap across chest
  px(g, 4, 6, PAL.army2); px(g, 5, 7, PAL.army2); px(g, 6, 8, PAL.army2);
  // belt
  row(g, 9, 3, 7, PAL.army2);
}

function drawSoldierWalk(frame) {
  const g = G(10, 14);
  soldierBody(g);
  // Rifle held level, muzzle to the right
  row(g, 6, 4, 9, PAL.metal4);   // barrel + body
  px(g, 3, 6, PAL.wood2);         // stock
  px(g, 9, 6, PAL.metal3);        // muzzle
  px(g, 5, 5, PAL.fat);           // forward hand
  // Legs alternate; boots dark
  if (frame === 0) {
    col(g, 4, 10, 13, PAL.army2); px(g, 3, 13, PAL.outline); // back leg planted
    col(g, 6, 10, 12, PAL.army1); px(g, 7, 12, PAL.army2); px(g, 8, 12, PAL.outline); // front leg forward
    px(g, 3, 13, PAL.outline); px(g, 5, 13, PAL.outline);
  } else {
    col(g, 4, 10, 12, PAL.army1); px(g, 3, 12, PAL.army2); px(g, 2, 12, PAL.outline); // front leg
    col(g, 6, 10, 13, PAL.army2); px(g, 7, 13, PAL.outline); // back leg planted
  }
  addOutline(g, PAL.outline);
  return bake(g);
}

function drawSoldierAim() {
  const g = G(10, 14);
  soldierBody(g);
  // Rifle raised, braced up-right
  px(g, 4, 6, PAL.wood2);         // stock at shoulder
  px(g, 5, 5, PAL.metal4); px(g, 6, 5, PAL.metal4);
  px(g, 7, 4, PAL.metal4); px(g, 8, 3, PAL.metal4); px(g, 9, 2, PAL.metal3); // raised barrel
  px(g, 6, 6, PAL.fat);           // bracing hand
  // Braced legs planted apart
  col(g, 3, 10, 13, PAL.army2); px(g, 2, 13, PAL.outline);
  col(g, 7, 10, 13, PAL.army1); px(g, 8, 13, PAL.army2); px(g, 8, 13, PAL.outline);
  px(g, 3, 13, PAL.outline);
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// TANK — 30x17, 2 frames (tread shift), bottom-center anchor. NO barrel on hull.
// ---------------------------------------------------------------------------
function drawTank(frame) {
  const g = G(30, 17);
  // --- Treads (bottom band) ---
  box(g, 1, 13, 28, 16, PAL.metal4);
  row(g, 12, 2, 27, PAL.metal3); // tread top edge
  // road wheels
  for (const wx of [4, 8, 12, 16, 20, 24]) { box(g, wx - 1, 14, wx + 1, 15, PAL.metal2); }
  // tread teeth on top edge, shifted per frame to animate rolling
  const off = frame === 0 ? 0 : 2;
  for (let x = 2 + off; x <= 27; x += 4) { px(g, x, 12, PAL.metal4); px(g, x + 1, 12, PAL.metal4); }
  // tread lugs on bottom edge (opposite phase)
  for (let x = 2 + (2 - off); x <= 27; x += 4) { px(g, x, 16, PAL.metal2); }
  // --- Hull ---
  box(g, 3, 10, 27, 12, PAL.army2);   // lower hull (shaded)
  box(g, 5, 7, 25, 10, PAL.army1);    // upper hull (lit)
  row(g, 6, 6, 24, PAL.army1);
  // front glacis slope (right)
  px(g, 26, 9, PAL.army1); px(g, 27, 10, PAL.army1); px(g, 28, 11, PAL.army2);
  px(g, 26, 8, PAL.army1);
  // warm rim light along the top hull edge
  row(g, 6, 8, 16, PAL.horizon);
  // turret mount ring (where tank_turret bolts) — raised center
  box(g, 12, 5, 18, 6, PAL.metal3);
  row(g, 4, 13, 17, PAL.metal2);
  // details: hatch, vents, rivets
  box(g, 8, 7, 9, 8, PAL.metal4);      // side hatch
  px(g, 20, 7, PAL.army2); px(g, 22, 7, PAL.army2); px(g, 24, 7, PAL.army2); // vent slats
  px(g, 6, 9, PAL.metal4); px(g, 24, 11, PAL.metal4); // rivets/shadow
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// TANK TURRET — 14x6, 1 frame. Separate rotatable sprite. Anchor = mount pivot.
// Barrel extends right in base art. Pivot at base-center of the turret body.
// ---------------------------------------------------------------------------
function drawTankTurret() {
  const g = G(14, 6);
  // Turret body (rounded box)
  box(g, 0, 1, 7, 4, PAL.army1);
  row(g, 0, 1, 6, PAL.army1);
  row(g, 5, 1, 6, PAL.army2);      // base shade
  col(g, 7, 2, 4, PAL.army2);      // front face shade
  // cupola bump + warm rim light on top
  px(g, 2, 0, PAL.army1); px(g, 3, 0, PAL.army1);
  row(g, 0, 1, 4, PAL.horizon);
  px(g, 3, 2, PAL.metal4); // hatch
  // Barrel
  row(g, 2, 7, 12, PAL.metal3);
  row(g, 3, 7, 11, PAL.metal4);
  // muzzle brake tip
  box(g, 12, 1, 13, 4, PAL.metal2);
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// JET — 30x12, 1 frame, center anchor. Dark fighter profile facing right,
// canopy glint, afterburner glow (flicker is game FX).
// ---------------------------------------------------------------------------
function drawJet() {
  const g = G(30, 12);
  // Fuselage (cigar, pointed nose right)
  row(g, 5, 4, 27, PAL.metal4);
  row(g, 6, 3, 29, PAL.metal4);
  row(g, 7, 4, 26, PAL.metal4);
  px(g, 28, 5, PAL.metal4); px(g, 27, 4, PAL.metal4); // nose taper up
  // top rim highlight (dusk-lit metal)
  row(g, 5, 8, 26, PAL.metal3);
  // Swept tailfin (rear-top)
  px(g, 3, 4, PAL.metal4); px(g, 4, 3, PAL.metal4); px(g, 5, 2, PAL.metal4); px(g, 6, 2, PAL.metal3);
  px(g, 7, 3, PAL.metal4);
  // Delta wing / stabilizer (mid-lower, swept back)
  row(g, 8, 8, 18, PAL.metal4);
  px(g, 9, 9, PAL.metal4); px(g, 10, 9, PAL.metal4); px(g, 11, 9, PAL.metal4);
  px(g, 8, 8, PAL.metal3);
  // Intake notch (dark) under the canopy
  px(g, 20, 8, PAL.outline); px(g, 21, 8, PAL.outline);
  // Canopy near the nose w/ bright glint
  row(g, 4, 22, 25, PAL.metal3);
  px(g, 24, 4, PAL.glow); px(g, 23, 4, PAL.glow); // canopy glint
  px(g, 25, 4, PAL.metal2);
  // Afterburner nozzle + base glow (left/rear)
  px(g, 2, 6, PAL.fire3);
  px(g, 1, 5, PAL.fire2); px(g, 1, 6, PAL.fire1); px(g, 1, 7, PAL.fire2);
  px(g, 0, 6, PAL.fire3);
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// HELICOPTER — 28x16, 2 frames (rotor blur), center anchor
// ---------------------------------------------------------------------------
function drawHeli(frame) {
  const g = G(28, 16);
  // cabin
  box(g, 8, 5, 18, 11, PAL.army2);
  box(g, 10, 6, 16, 9, PAL.army1);
  // cockpit glass
  row(g, 6, 15, 18, PAL.glow);
  row(g, 7, 16, 18, PAL.metal2);
  // tail boom
  row(g, 8, 2, 8, PAL.army2);
  row(g, 9, 1, 8, PAL.army2);
  // tail rotor
  if (frame === 0) { col(g, 1, 6, 11, PAL.metal3); px(g, 0, 8, PAL.metal2); px(g, 2, 8, PAL.metal2); }
  else { row(g, 8, 0, 3, PAL.metal3); px(g, 1, 7, PAL.metal2); px(g, 1, 9, PAL.metal2); }
  // skids
  row(g, 12, 9, 17, PAL.metal4);
  px(g, 9, 11, PAL.metal4); px(g, 17, 11, PAL.metal4);
  // main rotor mast
  col(g, 13, 3, 5, PAL.metal3);
  // main rotor blades (alternate)
  if (frame === 0) {
    row(g, 3, 2, 24, PAL.metal2);
    px(g, 2, 3, PAL.metal1); px(g, 24, 3, PAL.metal1);
  } else {
    row(g, 2, 4, 22, PAL.metal3);
    row(g, 4, 6, 20, PAL.metal2);
  }
  // rocket pod
  box(g, 19, 9, 22, 11, PAL.metal4);
  px(g, 22, 10, PAL.fire3);
  // warm rim
  row(g, 5, 10, 14, PAL.horizon);
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// GIANT ROBOT FARMER — 22x36, 2 frames walk, bottom-center anchor
// ---------------------------------------------------------------------------
function drawRobotFarmer(frame) {
  const g = G(22, 36);
  const stride = frame === 0 ? 1 : -1;
  // boots
  box(g, 4 + stride, 33, 8 + stride, 35, PAL.metal4);
  box(g, 13 - stride, 33, 17 - stride, 35, PAL.metal4);
  // legs
  box(g, 5 + stride, 24, 8 + stride, 33, PAL.metal3);
  box(g, 13 - stride, 24, 16 - stride, 33, PAL.metal3);
  // overalls torso
  box(g, 4, 14, 17, 24, PAL.army1);
  box(g, 5, 15, 16, 22, PAL.army2);
  // overall straps
  col(g, 7, 12, 15, PAL.army1);
  col(g, 14, 12, 15, PAL.army1);
  // chest plate
  box(g, 7, 16, 14, 20, PAL.metal2);
  px(g, 10, 18, PAL.red); // power core
  // head / straw hat
  box(g, 7, 6, 14, 12, PAL.metal1);
  box(g, 8, 7, 13, 11, PAL.metal2);
  // eyes
  px(g, 9, 9, PAL.zap1); px(g, 12, 9, PAL.zap1);
  // straw hat brim + crown
  row(g, 5, 4, 17, PAL.fat);
  box(g, 7, 2, 14, 5, PAL.fat);
  row(g, 2, 8, 13, PAL.horizon);
  // pitchfork arm (right)
  if (frame === 0) {
    row(g, 16, 17, 21, PAL.metal3);
    col(g, 21, 12, 16, PAL.metal2);
    px(g, 20, 12, PAL.metal1); px(g, 21, 12, PAL.metal1); px(g, 22, 12, PAL.metal1);
  } else {
    row(g, 14, 17, 20, PAL.metal3);
    col(g, 20, 8, 14, PAL.metal2);
    px(g, 19, 8, PAL.metal1); px(g, 20, 8, PAL.metal1); px(g, 21, 8, PAL.metal1);
  }
  // left arm
  col(g, 3, 16, 22, PAL.metal3);
  px(g, 3, 22, PAL.metal4);
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
// SATELLITE — 20x14, 2 frames (panel tilt), center anchor
// ---------------------------------------------------------------------------
function drawSatellite(frame) {
  const g = G(20, 14);
  // body
  box(g, 7, 5, 12, 10, PAL.metal2);
  box(g, 8, 6, 11, 9, PAL.metal1);
  // antenna dish
  box(g, 9, 2, 11, 4, PAL.metal3);
  px(g, 10, 1, PAL.red);
  // solar panels
  if (frame === 0) {
    box(g, 1, 6, 6, 9, PAL.dusk1);
    box(g, 13, 6, 18, 9, PAL.dusk1);
    row(g, 7, 1, 6, PAL.zap3);
    row(g, 7, 13, 18, PAL.zap3);
  } else {
    box(g, 1, 5, 6, 10, PAL.dusk2);
    box(g, 13, 5, 18, 10, PAL.dusk2);
    row(g, 6, 1, 6, PAL.zap2);
    row(g, 8, 13, 18, PAL.zap2);
  }
  // laser emitter glow
  px(g, 9, 10, PAL.fire1); px(g, 10, 11, PAL.fire2); px(g, 11, 10, PAL.fire1);
  // rim
  row(g, 5, 8, 11, PAL.horizon);
  addOutline(g, PAL.outline);
  return bake(g);
}

// ---------------------------------------------------------------------------
export function build() {
  return {
    player_ufo:  { frames: [drawPlayerUFO(0), drawPlayerUFO(1)], fps: 6, ax: 13, ay: 7 },
    enemy_ufo:   { frames: [drawEnemyUFO(0), drawEnemyUFO(1)],   fps: 6, ax: 12, ay: 7 },
    soldier_walk:{ frames: [drawSoldierWalk(0), drawSoldierWalk(1)], fps: 6, ax: 5, ay: 13 },
    soldier_aim: { frames: [drawSoldierAim()], fps: 1, ax: 5, ay: 13 },
    tank:        { frames: [drawTank(0), drawTank(1)], fps: 8, ax: 15, ay: 16 },
    tank_turret: { frames: [drawTankTurret()], fps: 1, ax: 4, ay: 5 },
    jet:         { frames: [drawJet()], fps: 1, ax: 15, ay: 6 },
    heli:        { frames: [drawHeli(0), drawHeli(1)], fps: 12, ax: 14, ay: 8 },
    robot_farmer:{ frames: [drawRobotFarmer(0), drawRobotFarmer(1)], fps: 5, ax: 11, ay: 35 },
    satellite:   { frames: [drawSatellite(0), drawSatellite(1)], fps: 4, ax: 10, ay: 7 },
  };
}
