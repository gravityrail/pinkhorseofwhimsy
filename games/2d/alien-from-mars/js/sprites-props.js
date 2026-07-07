// The Alien from Mars — sprites-props.js
// Destructible countryside props: trees, rocks, farm buildings + ruined/burnt
// variants, hay, fence, windmill (2 frames), silo, crater.
// Art rules per DESIGN.md §3: 1px PAL.outline silhouette, 2-3 tone ramps per
// material, warm horizon rim light on top edges, crisp chunky pixels, no AA.
// Anchors: props are bottom-center (feet on the ground).

import { PAL } from './shared.js';

// ---------------------------------------------------------------------------
// tiny pixel-drawing toolkit
// ---------------------------------------------------------------------------

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { c, x, w, h };
}

function rect(x, X, Y, W, H, col) {
  x.fillStyle = col;
  x.fillRect(X | 0, Y | 0, W | 0, H | 0);
}
function px(x, X, Y, col) {
  x.fillStyle = col;
  x.fillRect(X | 0, Y | 0, 1, 1);
}
// vertical line
function vln(x, X, Y0, Y1, col) { rect(x, X, Y0, 1, Y1 - Y0 + 1, col); }
// horizontal line
function hln(x, X0, X1, Y, col) { rect(x, X0, Y, X1 - X0 + 1, 1, col); }

// filled ellipse (integer scanline)
function ellipse(x, cx, cy, rx, ry, col) {
  x.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    if (t < 0) continue;
    const dx = Math.floor(rx * Math.sqrt(t) + 0.0001);
    x.fillRect((cx - dx) | 0, (cy + dy) | 0, (dx * 2 + 1) | 0, 1);
  }
}

function hexRGB(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Auto 1px outline: any transparent pixel orthogonally touching an opaque pixel
// becomes PAL.outline. Keeps silhouettes crisp and consistent everywhere.
function outline(s) {
  const { x, w, h } = s;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const src = d.slice();
  const [or_, og, ob] = hexRGB(PAL.outline);
  const A = (X, Y) => (X < 0 || Y < 0 || X >= w || Y >= h) ? 0 : src[(Y * w + X) * 4 + 3];
  for (let Y = 0; Y < h; Y++) {
    for (let X = 0; X < w; X++) {
      const i = (Y * w + X) * 4;
      if (src[i + 3] === 0 && (A(X - 1, Y) || A(X + 1, Y) || A(X, Y - 1) || A(X, Y + 1))) {
        d[i] = or_; d[i + 1] = og; d[i + 2] = ob; d[i + 3] = 255;
      }
    }
  }
  x.putImageData(img, 0, 0);
}

// Blob shadow-free helper: finalize a single-frame sprite.
function fin(s, ax, ay, fps) {
  outline(s);
  return { frames: [s.c], fps: fps || 0, ax, ay };
}

// ---------------------------------------------------------------------------
// TREES
// ---------------------------------------------------------------------------

function tree1() { // round leafy oak, 22x30, anchor bottom-center
  const s = mk(22, 30), x = s.x;
  // trunk
  rect(x, 9, 20, 4, 9, PAL.wood2);
  rect(x, 9, 20, 2, 9, PAL.wood1);       // lit left side
  px(x, 12, 24, PAL.wood2);
  // canopy — layered round blob
  const cx = 11, cy = 12;
  ellipse(x, cx, cy, 10, 9, PAL.grass3);          // dark base
  ellipse(x, cx - 1, cy, 9, 8, PAL.grass2);        // mid
  ellipse(x, cx - 2, cy - 2, 6, 6, PAL.grass1);    // lit upper-left
  // leaf clumps texture (dark pockets)
  px(x, 14, 14, PAL.grass3); px(x, 15, 12, PAL.grass3);
  px(x, 7, 15, PAL.grass3); px(x, 12, 17, PAL.grass3);
  px(x, 5, 9, PAL.grass2); px(x, 16, 8, PAL.grass2);
  // warm rim light along top-left edge (dusk)
  px(x, 6, 4, PAL.horizon); px(x, 7, 3, PAL.horizon); px(x, 9, 3, PAL.horizon);
  px(x, 5, 6, PAL.horizon); px(x, 4, 9, PAL.horizon);
  px(x, 11, 4, PAL.horizon);
  return fin(s, 11, 29);
}

function tree2() { // pine, 18x26
  const s = mk(18, 26), x = s.x;
  const cx = 9;
  // trunk
  rect(x, 8, 22, 3, 4, PAL.wood2);
  rect(x, 8, 22, 1, 4, PAL.wood1);
  // three stacked triangular tiers (dark base, lit top-left)
  function tier(topY, botY, halfBot) {
    const rows = botY - topY;
    for (let i = 0; i <= rows; i++) {
      const half = Math.round((i / rows) * halfBot);
      rect(x, cx - half, topY + i, half * 2 + 1, 1, PAL.grass3);
    }
    // mid highlight offset left
    for (let i = 1; i <= rows; i++) {
      const half = Math.round((i / rows) * halfBot);
      const w2 = Math.max(0, half - 1);
      rect(x, cx - half, topY + i, w2 + 1, 1, PAL.grass2);
    }
  }
  tier(1, 9, 6);
  tier(7, 16, 8);
  tier(13, 22, 9);
  // lit needles up top-left
  px(x, cx - 1, 2, PAL.grass1); px(x, cx - 2, 5, PAL.grass1);
  px(x, cx - 3, 9, PAL.grass1); px(x, cx - 4, 13, PAL.grass1);
  px(x, cx - 5, 17, PAL.grass1); px(x, cx - 6, 21, PAL.grass1);
  // warm rim on peak
  px(x, cx, 1, PAL.horizon); px(x, cx - 1, 3, PAL.horizon);
  return fin(s, 9, 25);
}

function tree_burnt() { // charred trunk + bare branches + embers, 20x26
  const s = mk(20, 26), x = s.x;
  const cx = 9;
  // trunk (charred, slight lean)
  for (let i = 0; i < 20; i++) {
    const y = 25 - i;
    const lean = Math.round(i * 0.12);
    rect(x, cx - 1 - lean, y, 3, 1, PAL.dirt3);
    px(x, cx - 1 - lean, y, PAL.dirt2); // faint lit edge
  }
  // bare branches (dark twiggy lines)
  function branch(x0, y0, x1, y1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const bx = Math.round(x0 + (x1 - x0) * i / steps);
      const by = Math.round(y0 + (y1 - y0) * i / steps);
      px(x, bx, by, PAL.dirt3);
    }
  }
  branch(cx, 12, 3, 5);
  branch(cx, 10, 15, 3);
  branch(cx, 8, 5, 2);
  branch(cx + 1, 14, 16, 9);
  branch(4, 5, 2, 2);
  branch(15, 3, 17, 1);
  // embers glowing along the trunk
  px(x, cx, 20, PAL.fire3); px(x, cx - 1, 16, PAL.fire2);
  px(x, cx, 23, PAL.fire3); px(x, cx + 1, 18, PAL.fire2);
  px(x, cx - 1, 24, PAL.fire1);
  return fin(s, 9, 25);
}

// ---------------------------------------------------------------------------
// ROCKS  (cool stone grey ramp, warm rim)
// ---------------------------------------------------------------------------

function rock1() { // 14x9
  const s = mk(14, 9), x = s.x;
  ellipse(x, 7, 6, 6, 3, PAL.metal4);           // base/shadow side
  ellipse(x, 6, 5, 6, 3, PAL.metal3);           // mid
  ellipse(x, 5, 4, 4, 2, PAL.metal2);           // lit
  // facet cracks
  hln(x, 4, 9, 6, PAL.metal4);
  px(x, 8, 4, PAL.metal4); px(x, 9, 5, PAL.metal4);
  // warm rim on top
  px(x, 4, 2, PAL.horizon); px(x, 6, 1, PAL.horizon); px(x, 3, 3, PAL.horizon);
  return fin(s, 7, 8);
}

function rock2() { // 10x7
  const s = mk(10, 7), x = s.x;
  ellipse(x, 5, 4, 4, 2, PAL.metal4);
  ellipse(x, 4, 3, 4, 2, PAL.metal3);
  ellipse(x, 4, 3, 2, 1, PAL.metal2);
  px(x, 6, 3, PAL.metal4); hln(x, 3, 6, 4, PAL.metal4);
  px(x, 3, 1, PAL.horizon); px(x, 5, 1, PAL.horizon);
  return fin(s, 5, 6);
}

// ---------------------------------------------------------------------------
// HUT  + ruin
// ---------------------------------------------------------------------------

function hut() { // 30x26 little farmhouse, warm lit window
  const s = mk(30, 26), x = s.x;
  // body walls
  rect(x, 4, 12, 22, 13, PAL.wall);
  rect(x, 4, 12, 2, 13, PAL.horizon);      // lit left wall edge (warm)
  rect(x, 23, 12, 3, 13, PAL.wood2);       // shaded right wall
  // chimney (drawn first so roof overlaps its base)
  rect(x, 21, 2, 3, 8, PAL.wood2); rect(x, 21, 2, 1, 8, PAL.horizon);
  // roof (gable: peak at top, wide base flush on the walls)
  for (let i = 0; i <= 10; i++) {
    const half = Math.round((i / 10) * 12);   // i=0 peak, i=10 base
    const y = 1 + i;
    rect(x, 15 - half, y, half * 2 + 1, 1, PAL.roof);
    rect(x, 16, y, half, 1, PAL.wood2);       // right slope darker
    px(x, 15 - half, y, PAL.horizon);         // lit left eave edge
  }
  px(x, 15, 1, PAL.horizon); // ridge glint
  // door
  rect(x, 7, 17, 5, 8, PAL.wood2); rect(x, 7, 17, 5, 1, PAL.wood1);
  px(x, 11, 21, PAL.horizon); // handle
  // warm lit window
  rect(x, 15, 15, 7, 6, PAL.wood2);        // frame
  rect(x, 16, 16, 5, 4, PAL.fire1);        // glowing glass
  px(x, 18, 16, PAL.fire2); px(x, 18, 18, PAL.fire2); // muntin
  hln(x, 16, 20, 18, PAL.fire2);
  return fin(s, 15, 25);
}

function hut_ruin() { // 30x18 collapsed + charred — same footprint, same wall/roof colors
  const s = mk(30, 18), x = s.x;
  // remaining broken wall stubs (same wall tan, charred at tops)
  rect(x, 4, 10, 8, 7, PAL.wall); rect(x, 4, 10, 2, 7, PAL.horizon);
  rect(x, 4, 10, 8, 2, PAL.dirt3);         // charred top
  px(x, 8, 9, PAL.wall); px(x, 6, 8, PAL.wall); // jagged edge
  rect(x, 21, 12, 6, 5, PAL.wall); rect(x, 21, 12, 6, 1, PAL.dirt3);
  px(x, 20, 11, PAL.wall);
  // fallen roof beam (same roof red) leaning across
  for (let i = 0; i < 16; i++) px(x, 9 + i, 13 - Math.round(i * 0.4), PAL.roof);
  for (let i = 0; i < 16; i++) px(x, 9 + i, 14 - Math.round(i * 0.4), PAL.wood2);
  // charred rubble pile
  rect(x, 12, 14, 9, 3, PAL.dirt3);
  px(x, 13, 13, PAL.dirt2); px(x, 17, 13, PAL.dirt2);
  // door frame remnant
  vln(x, 7, 12, 16, PAL.wood2); vln(x, 11, 11, 16, PAL.wood2);
  // embers + smoke wisp
  px(x, 15, 15, PAL.fire2); px(x, 18, 15, PAL.fire3); px(x, 13, 15, PAL.fire3);
  px(x, 16, 10, PAL.dusk2); px(x, 17, 8, PAL.dusk2);
  return fin(s, 15, 17);
}

// ---------------------------------------------------------------------------
// BARN + ruin
// ---------------------------------------------------------------------------

function barn() { // 44x34 big red barn, white trim, hay loft door
  const s = mk(44, 34), x = s.x;
  const cx = 22;
  // gable roof: peak at top, wide base sitting flush on the walls
  for (let i = 0; i <= 9; i++) {
    const half = Math.round((i / 9) * 21);    // i=0 peak, i=9 base
    const y = 2 + i;
    rect(x, cx - half, y, half * 2 + 1, 1, PAL.wood2);
    rect(x, cx + 1, y, half, 1, PAL.dirt2);   // right slope darker
    px(x, cx - half, y, PAL.wood1);           // lit left eave
  }
  px(x, cx, 2, PAL.horizon); px(x, cx - 2, 4, PAL.horizon); // ridge glint
  // red walls
  rect(x, 2, 11, 40, 22, PAL.roof);
  rect(x, 2, 11, 3, 22, PAL.red);          // lit left wall (brighter red)
  rect(x, 38, 11, 4, 22, PAL.wood2);       // shaded right
  // white trim: corners + eave line + vertical planks accents
  rect(x, 2, 11, 40, 1, PAL.white);        // eave trim
  vln(x, 2, 11, 32, PAL.white); vln(x, 41, 11, 32, PAL.white); // corner trim
  // subtle plank lines
  for (let vx = 8; vx < 40; vx += 7) vln(x, vx, 13, 31, PAL.wood2);
  // hay loft door (high on the front wall, just under the roof) with hay poking
  rect(x, 18, 12, 8, 6, PAL.wood2); rect(x, 19, 13, 6, 4, PAL.dirt3); // dark opening
  px(x, 20, 16, PAL.horizon); px(x, 22, 16, PAL.wall); px(x, 23, 15, PAL.horizon); // hay
  px(x, 21, 17, PAL.wall);
  // big double barn door with white X brace
  rect(x, 15, 18, 14, 15, PAL.wood2);      // door recess
  rect(x, 16, 19, 12, 14, PAL.wood1);      // door face
  vln(x, 22, 19, 32, PAL.wood2);           // center split
  // white X brace
  for (let i = 0; i < 6; i++) { px(x, 16 + i, 20 + i * 2, PAL.white); px(x, 27 - i, 20 + i * 2, PAL.white); }
  rect(x, 16, 19, 12, 1, PAL.white); rect(x, 16, 32, 12, 1, PAL.white);
  return fin(s, 22, 33);
}

function barn_ruin() { // 44x20 collapsed + charred — red fragments + white trim bits + char
  const s = mk(44, 20), x = s.x;
  // left wall stub still standing (red, charred top, white corner trim)
  rect(x, 3, 8, 11, 11, PAL.roof); rect(x, 3, 8, 3, 11, PAL.red);
  vln(x, 3, 8, 18, PAL.white);
  rect(x, 3, 8, 11, 2, PAL.dirt3);         // charred jagged top
  px(x, 9, 7, PAL.roof); px(x, 12, 7, PAL.roof); px(x, 6, 6, PAL.roof);
  // right leaning wall fragment
  rect(x, 33, 11, 8, 8, PAL.roof); rect(x, 33, 11, 8, 2, PAL.dirt3);
  vln(x, 40, 11, 18, PAL.white); px(x, 35, 10, PAL.roof);
  // fallen roof beam across the gap
  for (let i = 0; i < 22; i++) { px(x, 12 + i, 12 + Math.round(i * 0.2), PAL.wood2); px(x, 12 + i, 13 + Math.round(i * 0.2), PAL.dirt2); }
  // charred debris + splintered planks (with white trim shards)
  rect(x, 14, 15, 20, 4, PAL.dirt3);
  px(x, 17, 14, PAL.roof); px(x, 22, 14, PAL.red); px(x, 27, 14, PAL.roof);
  px(x, 19, 15, PAL.white); px(x, 25, 16, PAL.white);
  // embers + smoke
  px(x, 18, 16, PAL.fire2); px(x, 24, 16, PAL.fire3); px(x, 29, 15, PAL.fire3); px(x, 21, 17, PAL.fire2);
  px(x, 20, 6, PAL.dusk2); px(x, 26, 4, PAL.dusk2); px(x, 23, 2, PAL.dusk2);
  return fin(s, 22, 19);
}

// ---------------------------------------------------------------------------
// HAY, FENCE
// ---------------------------------------------------------------------------

function hay() { // 12x9 hay bale (golden, banded)
  const s = mk(12, 9), x = s.x;
  ellipse(x, 6, 5, 5, 3, PAL.wall);        // base
  rect(x, 1, 3, 10, 5, PAL.wall);          // squared body
  rect(x, 1, 3, 10, 1, PAL.horizon);       // lit top
  rect(x, 1, 7, 10, 1, PAL.wood1);         // shaded bottom
  // straw texture strokes
  for (let i = 2; i < 11; i += 2) px(x, i, 5, PAL.horizon);
  for (let i = 3; i < 11; i += 3) px(x, i, 6, PAL.wood1);
  // binding twine
  vln(x, 4, 3, 7, PAL.wood2); vln(x, 8, 3, 7, PAL.wood2);
  return fin(s, 6, 8);
}

function fence() { // 16x10 two-rail wooden fence segment
  const s = mk(16, 10), x = s.x;
  // posts
  rect(x, 1, 1, 3, 9, PAL.wood2); rect(x, 1, 1, 1, 9, PAL.wood1);
  rect(x, 12, 1, 3, 9, PAL.wood2); rect(x, 12, 1, 1, 9, PAL.wood1);
  px(x, 2, 0, PAL.wood1); px(x, 13, 0, PAL.wood1); // rounded post tops
  // two rails
  rect(x, 0, 3, 16, 2, PAL.wood1); rect(x, 0, 3, 16, 1, PAL.horizon);
  rect(x, 0, 6, 16, 2, PAL.wood1); rect(x, 0, 6, 16, 1, PAL.horizon);
  // grain lines on rails
  for (let i = 2; i < 16; i += 4) { px(x, i, 4, PAL.wood2); px(x, i + 1, 7, PAL.wood2); }
  return fin(s, 8, 9);
}

// ---------------------------------------------------------------------------
// WINDMILL (2 frames — blades at two rotations)
// ---------------------------------------------------------------------------

function windmillTower(x) {
  // tapered tower body, anchor bottom-center of a 26x42 canvas, hub near (13,10)
  const cx = 13;
  for (let i = 0; i < 30; i++) {
    const y = 41 - i;
    const half = 6 - Math.round(i * 0.10);   // wider at base
    rect(x, cx - half, y, half * 2 + 1, 1, PAL.wall);
    px(x, cx - half, y, PAL.horizon);        // lit left edge
    px(x, cx + half, y, PAL.wood2);          // shaded right edge
  }
  // stone/plank bands
  hln(x, 8, 18, 30, PAL.wood2); hln(x, 8, 18, 22, PAL.wood2);
  // little door + window
  rect(x, 11, 35, 4, 6, PAL.wood2); px(x, 14, 38, PAL.horizon);
  rect(x, 10, 26, 3, 3, PAL.wood2); px(x, 11, 27, PAL.fire1);
  // cap (rounded roof) at top
  ellipse(x, cx, 9, 5, 3, PAL.roof);
  rect(x, cx - 5, 9, 11, 2, PAL.roof);
  px(x, cx, 5, PAL.horizon); px(x, cx - 2, 6, PAL.horizon);
  rect(x, cx + 1, 7, 4, 3, PAL.wood2);       // roof shade
}

function windmillHub(x, hx, hy) {
  rect(x, hx - 1, hy - 1, 3, 3, PAL.wood2);
  px(x, hx, hy, PAL.metal2);
}

// draw a blade from hub along a unit vector, sail = plank rows
function windmillBlade(x, hx, hy, dx, dy, len) {
  // main spar
  for (let i = 2; i <= len; i++) {
    const bx = Math.round(hx + dx * i);
    const by = Math.round(hy + dy * i);
    px(x, bx, by, PAL.wood2);
    // sail cloth offset perpendicular (to one side) -> lattice look
    const pxp = Math.round(hx + dx * i - dy * 1.6);
    const pyp = Math.round(hy + dy * i + dx * 1.6);
    if (i > 3) px(x, pxp, pyp, PAL.wall);
    const pxp2 = Math.round(hx + dx * i - dy * 2.6);
    const pyp2 = Math.round(hy + dy * i + dx * 2.6);
    if (i > 5) px(x, pxp2, pyp2, PAL.wood1);
  }
}

function windmill() { // 26x42, 2 frames
  const frames = [];
  const hx = 13, hy = 10, len = 11;
  // frame A: + orientation
  {
    const s = mk(26, 42), x = s.x;
    windmillTower(x);
    windmillBlade(x, hx, hy, 0, -1, len);
    windmillBlade(x, hx, hy, 0, 1, len);
    windmillBlade(x, hx, hy, -1, 0, len);
    windmillBlade(x, hx, hy, 1, 0, len);
    windmillHub(x, hx, hy);
    outline(s);
    frames.push(s.c);
  }
  // frame B: x orientation (45°)
  {
    const s = mk(26, 42), x = s.x;
    windmillTower(x);
    const d = 0.7071;
    windmillBlade(x, hx, hy, d, -d, len);
    windmillBlade(x, hx, hy, -d, d, len);
    windmillBlade(x, hx, hy, -d, -d, len);
    windmillBlade(x, hx, hy, d, d, len);
    windmillHub(x, hx, hy);
    outline(s);
    frames.push(s.c);
  }
  return { frames, fps: 6, ax: 13, ay: 41 };
}

// ---------------------------------------------------------------------------
// SILO
// ---------------------------------------------------------------------------

function silo() { // 16x34 grain silo — metal cylinder, domed cap, warm rim
  const s = mk(16, 34), x = s.x;
  // cylinder body
  rect(x, 3, 8, 10, 25, PAL.metal3);
  rect(x, 3, 8, 2, 25, PAL.metal2);        // lit left
  vln(x, 4, 8, 32, PAL.metal1);            // bright edge highlight
  rect(x, 11, 8, 2, 25, PAL.metal4);       // shaded right
  // horizontal ribs (corrugation bands)
  for (let y = 11; y < 33; y += 4) hln(x, 3, 12, y, PAL.metal4);
  // domed cap
  ellipse(x, 8, 7, 7, 4, PAL.metal3);
  ellipse(x, 7, 6, 6, 3, PAL.metal2);
  px(x, 6, 4, PAL.horizon); px(x, 8, 3, PAL.horizon); px(x, 5, 5, PAL.horizon); // warm rim
  // little top hatch/finial
  rect(x, 7, 1, 2, 3, PAL.metal4); px(x, 7, 1, PAL.horizon);
  // base ring
  rect(x, 3, 32, 10, 1, PAL.metal4);
  return fin(s, 8, 33);
}

// ---------------------------------------------------------------------------
// CRATER  (flat scorched blast patch on the ground)
// ---------------------------------------------------------------------------

function crater() { // 22x6, lies flat; anchor at ground level (bottom-center)
  const s = mk(22, 6), x = s.x;
  ellipse(x, 11, 4, 10, 2, PAL.dirt3);       // outer scorch
  ellipse(x, 11, 4, 8, 2, PAL.dirt2);        // ring
  ellipse(x, 11, 4, 5, 1, PAL.dirt3);        // dark pit center
  // charred flecks + a couple embers cooling
  px(x, 6, 3, PAL.dirt2); px(x, 16, 3, PAL.dirt2); px(x, 11, 2, PAL.dirt2);
  px(x, 9, 4, PAL.fire4); px(x, 13, 4, PAL.fire3); px(x, 11, 4, PAL.fire2);
  // thrown dirt clods at rim
  px(x, 2, 4, PAL.dirt2); px(x, 20, 4, PAL.dirt2); px(x, 4, 5, PAL.dirt3); px(x, 18, 5, PAL.dirt3);
  return fin(s, 11, 5);
}

// ---------------------------------------------------------------------------

export function build() {
  return {
    tree1: tree1(),
    tree2: tree2(),
    tree_burnt: tree_burnt(),
    rock1: rock1(),
    rock2: rock2(),
    hut: hut(),
    hut_ruin: hut_ruin(),
    barn: barn(),
    barn_ruin: barn_ruin(),
    hay: hay(),
    fence: fence(),
    windmill: windmill(),
    silo: silo(),
    crater: crater(),
  };
}
