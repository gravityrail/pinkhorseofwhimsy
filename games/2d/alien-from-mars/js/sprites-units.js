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
export function build() {
  return {
    player_ufo:  { frames: [drawPlayerUFO(0), drawPlayerUFO(1)], fps: 6, ax: 13, ay: 7 },
    enemy_ufo:   { frames: [drawEnemyUFO(0), drawEnemyUFO(1)],   fps: 6, ax: 12, ay: 7 },
    soldier_walk:{ frames: [drawSoldierWalk(0), drawSoldierWalk(1)], fps: 6, ax: 5, ay: 13 },
    soldier_aim: { frames: [drawSoldierAim()], fps: 1, ax: 5, ay: 13 },
    tank:        { frames: [drawTank(0), drawTank(1)], fps: 8, ax: 15, ay: 16 },
    tank_turret: { frames: [drawTankTurret()], fps: 1, ax: 4, ay: 5 },
    jet:         { frames: [drawJet()], fps: 1, ax: 15, ay: 6 },
  };
}
