// The Alien from Mars — sprites-creatures.js
// Farm animals (cow, chicken, sheep, pig) + the four mutant stars:
//   steak (two-headed sirloin), drumstick (googly-eyed poulet terrible),
//   cloudsheep (cumulonimbaaa), karatepig (pork chop).
// Procedurally drawn to canvases at 1x logical scale. All colors from PAL.
import { PAL } from './shared.js';

// ---------------------------------------------------------------------------
// tiny pixel-drawing toolkit
// ---------------------------------------------------------------------------
function C(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function px(x, cx, cy, col) { x.fillStyle = col; x.fillRect(cx | 0, cy | 0, 1, 1); }
function rect(x, rx, ry, w, h, col) { x.fillStyle = col; x.fillRect(rx | 0, ry | 0, w | 0, h | 0); }
// filled ellipse (chunky, no AA)
function disc(x, cx, cy, rx, ry, col) {
  x.fillStyle = col;
  const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
  for (let y = y0; y <= y1; y++) {
    const dy = (y - cy) / ry, t = 1 - dy * dy;
    if (t < 0) continue;
    const dx = Math.sqrt(t) * rx;
    const xa = Math.round(cx - dx), xb = Math.round(cx + dx);
    x.fillRect(xa, y, xb - xa + 1, 1);
  }
}
function line(x, x0, y0, x1, y1, col) {
  x.fillStyle = col;
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, cx = x0, cy = y0;
  for (;;) {
    x.fillRect(cx, cy, 1, 1);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
}
// auto 1px silhouette outline (8-neighbour) in PAL.outline, drawn into transparent cells
function outline(x, w, h) {
  const img = x.getImageData(0, 0, w, h), d = img.data;
  const op = (px_, py_) => px_ >= 0 && py_ >= 0 && px_ < w && py_ < h && d[(py_ * w + px_) * 4 + 3] > 0;
  const pts = [];
  for (let y = 0; y < h; y++) for (let cx = 0; cx < w; cx++) {
    if (d[(y * w + cx) * 4 + 3] > 0) continue;
    let near = false;
    for (let ny = -1; ny <= 1 && !near; ny++) for (let nx = -1; nx <= 1; nx++) {
      if ((nx || ny) && op(cx + nx, y + ny)) { near = true; break; }
    }
    if (near) pts.push(cx, y);
  }
  x.fillStyle = PAL.outline;
  for (let i = 0; i < pts.length; i += 2) x.fillRect(pts[i], pts[i + 1], 1, 1);
}
// warm rim light: recolor the topmost opaque body pixel of each column. Run BEFORE outline.
function rim(x, w, h, col) {
  const img = x.getImageData(0, 0, w, h), d = img.data;
  const stamp = [];
  for (let cx = 0; cx < w; cx++) {
    for (let y = 0; y < h; y++) {
      if (d[(y * w + cx) * 4 + 3] > 0) { stamp.push(cx, y); break; }
    }
  }
  x.fillStyle = col;
  for (let i = 0; i < stamp.length; i += 2) x.fillRect(stamp[i], stamp[i + 1], 1, 1);
}
// eye: 2x2 dark with a white glint pixel (upper-left)
function eye2(x, ex, ey) {
  rect(x, ex, ey, 2, 2, PAL.outline);
  px(x, ex, ey, PAL.white);
}

// build a sprite frame: draw body -> rim -> outline -> details
function frame(w, h, body, detail, rimCol) {
  const c = C(w, h), x = c.getContext('2d');
  body(x);
  if (rimCol) rim(x, w, h, rimCol);
  outline(x, w, h);
  if (detail) detail(x);
  return c;
}

// ---------------------------------------------------------------------------
// FARM ANIMALS
// ---------------------------------------------------------------------------

// quadruped legs: cols = [x,x,x,x], alternate stride by frame
function legs4(x, cols, top, bot, f, col, hoof) {
  const off = f ? [1, -1, -1, 1] : [-1, 1, 1, -1];
  for (let i = 0; i < 4; i++) {
    const lx = cols[i] + off[i];
    rect(x, lx, top, 2, bot - top, col);
    rect(x, lx, bot - 1, 2, 1, hoof);
  }
}

function cow(f) {
  const w = 22, h = 15;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // legs first (behind body)
    legs4(x, [4, 8, 14, 17], 9 + bob, 15, f, PAL.white, PAL.dirt3);
    // tail
    line(x, 2, 6 + bob, 1, 11 + bob, PAL.white);
    px(x, 1, 11 + bob, PAL.dirt3);
    // body
    disc(x, 9, 7 + bob, 8, 4.2, PAL.white);
    // udder
    rect(x, 7, 10 + bob, 4, 2, PAL.pinkskin);
    // head (right)
    disc(x, 18, 8 + bob, 3.3, 3.2, PAL.white);
    // horns (in body so the outline defines them against the white head)
    rect(x, 16, 3 + bob, 1, 2, PAL.bone);
    rect(x, 20, 3 + bob, 1, 2, PAL.bone);
    // snout
    rect(x, 20, 8 + bob, 2, 3, PAL.pinkskin);
  }, (x) => {
    const bob = f ? 1 : 0;
    // dark hide patches
    disc(x, 5, 6 + bob, 2.2, 1.8, PAL.dirt3);
    disc(x, 11, 8 + bob, 2.4, 1.6, PAL.dirt3);
    disc(x, 14, 6 + bob, 1.6, 1.3, PAL.dirt3);
    // ear
    px(x, 15, 7 + bob, PAL.white);
    // eye + glint
    eye2(x, 18, 7 + bob);
    // nostrils
    px(x, 20, 10 + bob, PAL.pinkshade); px(x, 21, 10 + bob, PAL.pinkshade);
  }, PAL.fat);
}

function chicken(f) {
  const w = 10, h = 11;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // legs
    const lx = f ? [3, 6] : [4, 5];
    rect(x, lx[0], 8, 1, 3, PAL.fire2);
    rect(x, lx[1], 8, 1, 3, PAL.fire2);
    // feet
    px(x, lx[0] - 1, 10, PAL.fire2); px(x, lx[1] + 1, 10, PAL.fire2);
    // body
    disc(x, 4, 6 + bob, 3, 3, PAL.white);
    // tail
    rect(x, 0, 4 + bob, 2, 3, PAL.white);
    // head
    disc(x, 7, 3 + bob, 2, 2, PAL.white);
    // beak
    rect(x, 9, 3 + bob, 1, 2, PAL.fire2);
    // comb
    px(x, 7, 0 + bob, PAL.red); px(x, 8, 0 + bob, PAL.red); px(x, 6, 1 + bob, PAL.red);
    // wattle
    px(x, 8, 5 + bob, PAL.red);
  }, (x) => {
    const bob = f ? 1 : 0;
    eye2(x, 7, 2 + bob);
    // wing line
    line(x, 3, 6 + bob, 5, 7 + bob, PAL.wool);
  }, PAL.fat);
}

function sheep(f) {
  const w = 17, h = 13;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // legs (dark)
    legs4(x, [4, 7, 11, 13], 9 + bob, 13, f, PAL.dusk1, PAL.outline);
    // fat wool cloud body
    disc(x, 8, 6 + bob, 7, 4, PAL.wool);
    disc(x, 4, 5 + bob, 3, 3, PAL.wool);
    disc(x, 10, 4 + bob, 3.5, 2.6, PAL.wool);
    disc(x, 13, 6 + bob, 2.6, 2.4, PAL.wool);
    // dark face (right)
    disc(x, 14, 8 + bob, 2.2, 2.2, PAL.dusk1);
    // ear
    px(x, 12, 6 + bob, PAL.dusk1); px(x, 12, 7 + bob, PAL.dusk1);
  }, (x) => {
    const bob = f ? 1 : 0;
    // wool tufts (lighter dabs)
    px(x, 6, 3 + bob, PAL.cloud1); px(x, 9, 3 + bob, PAL.cloud1); px(x, 3, 4 + bob, PAL.cloud1);
    // eye glint on dark face
    px(x, 15, 7 + bob, PAL.white);
    px(x, 15, 8 + bob, PAL.zap1);
  }, PAL.cloud1);
}

function pig(f) {
  const w = 17, h = 12;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // legs
    legs4(x, [4, 7, 11, 13], 8 + bob, 12, f, PAL.pinkshade, PAL.outline);
    // curly tail
    px(x, 1, 5 + bob, PAL.pinkskin); px(x, 0, 6 + bob, PAL.pinkskin); px(x, 1, 7 + bob, PAL.pinkskin);
    // body
    disc(x, 8, 6 + bob, 7, 3.6, PAL.pinkskin);
    // head
    disc(x, 14, 7 + bob, 2.6, 2.6, PAL.pinkskin);
    // snout
    rect(x, 15, 7 + bob, 2, 2, PAL.pinkshade);
    // ear
    px(x, 13, 4 + bob, PAL.pinkskin); px(x, 14, 4 + bob, PAL.pinkskin);
  }, (x) => {
    const bob = f ? 1 : 0;
    // belly shade
    line(x, 4, 9 + bob, 11, 9 + bob, PAL.pinkshade);
    // snout nostrils
    px(x, 15, 8 + bob, PAL.outline); px(x, 16, 8 + bob, PAL.outline);
    // eye
    eye2(x, 13, 6 + bob);
  }, PAL.pinkskin);
}

// ---------------------------------------------------------------------------
// MUTANTS — the stars
// ---------------------------------------------------------------------------

// a small right/left facing cow head used by the steak. dir=+1 faces right, -1 left.
function cowHead(x, hx, hy, dir) {
  disc(x, hx, hy, 3.2, 3, PAL.white);
  // horns (in body so the outline defines them)
  rect(x, hx - 2, hy - 5, 1, 2, PAL.bone);
  rect(x, hx + 2, hy - 5, 1, 2, PAL.bone);
  // snout out the facing side
  if (dir > 0) rect(x, hx + 2, hy, 2, 3, PAL.pinkskin);
  else rect(x, hx - 3, hy, 2, 3, PAL.pinkskin);
}
function cowHeadDetail(x, hx, hy, dir, mouthOpen) {
  // eye facing forward
  eye2(x, hx + dir * 1, hy - 1);
  // nostril
  px(x, hx + dir * 3, hy + 1, PAL.pinkshade);
  if (mouthOpen) {
    // open mouth glowing at the very front
    const mx = dir > 0 ? hx + 2 : hx - 4;
    rect(x, mx, hy + 1, 3, 2, PAL.fire3);
    rect(x, mx + (dir > 0 ? 1 : 0), hy + 1, 2, 1, PAL.fire2);
    px(x, mx + (dir > 0 ? 1 : 0), hy + 1, PAL.fire1);
  }
}

function steak(f, fire) {
  const w = 30, h = 20;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // four cow legs under the slab
    legs4(x, [9, 13, 17, 21], 13 + bob, 20, f, PAL.white, PAL.dirt3);
    // meat slab
    rect(x, 8, 5 + bob, 15, 8, PAL.meat1);
    // rounded corners
    px(x, 8, 5 + bob, PAL.outline); px(x, 22, 5 + bob, PAL.outline);
    // fat cap along the top
    rect(x, 8, 4 + bob, 15, 2, PAL.fat);
    px(x, 10, 3 + bob, PAL.fat); px(x, 15, 3 + bob, PAL.fat); px(x, 19, 3 + bob, PAL.fat);
    // two cow heads facing outward
    cowHead(x, 4, 9 + bob, -1);
    cowHead(x, 26, 9 + bob, 1);
  }, (x) => {
    const bob = f ? 1 : 0;
    // meat shading + crust bottom edge
    rect(x, 8, 12 + bob, 15, 1, PAL.crust);
    rect(x, 8, 11 + bob, 15, 1, PAL.meat2);
    // char-grill cross-hatch
    x.fillStyle = PAL.crust;
    for (let i = 0; i < 4; i++) {
      const gx = 9 + i * 4;
      line(x, gx, 6 + bob, gx + 4, 10 + bob, PAL.crust);
    }
    for (let i = 0; i < 3; i++) {
      const gx = 10 + i * 4;
      line(x, gx + 4, 6 + bob, gx, 10 + bob, PAL.meat2);
    }
    // fat-cap highlight
    line(x, 9, 4 + bob, 21, 4 + bob, PAL.cloud1);
    // heads
    cowHeadDetail(x, 4, 9 + bob, -1, fire);
    cowHeadDetail(x, 26, 9 + bob, 1, fire);
  }, PAL.fat);
}

function drumstick(f, bite) {
  const w = 16, h = 22;
  return frame(w, h, (x) => {
    const stretch = f ? 1 : 0;       // hop stretch
    const oy = stretch ? -1 : 0;     // whole body lifts on the hop frame
    // two bone legs at the bottom
    const spread = f ? 1 : 2;
    rect(x, 8 - spread - 1, 16 + oy, 2, 5, PAL.bone);
    rect(x, 8 + spread, 16 + oy, 2, 5, PAL.bone);
    // knobby bone feet
    rect(x, 8 - spread - 2, 20 + oy, 3, 1, PAL.bone);
    rect(x, 8 + spread + 1, 20 + oy, 3, 1, PAL.bone);
    // meaty drumstick body: wide rounded crown up top, tapering down to the bones
    disc(x, 8, 6 + oy, 6.5, 5, PAL.meat1);       // meat crown
    for (let yy = 8; yy <= 15; yy++) {           // taper toward the bones
      const half = Math.max(1, 6 - (yy - 8));
      rect(x, 8 - half, yy + oy, half * 2, 1, PAL.meat1);
    }
  }, (x) => {
    const stretch = f ? 1 : 0;
    const oy = stretch ? -1 : 0;
    // golden fried-crust shading: darker toward the bottom
    for (let yy = 12; yy <= 15; yy++) {
      const half = Math.max(1, 6 - (yy - 8));
      rect(x, 8 - half, yy + oy, half * 2, 1, PAL.meat2);
    }
    rect(x, 6, 15 + oy, 4, 1, PAL.crust);
    // shine spots (upper-left) + golden dabs
    px(x, 4, 4 + oy, PAL.fat); px(x, 5, 3 + oy, PAL.fat); px(x, 3, 6 + oy, PAL.fat);
    px(x, 4, 4 + oy, PAL.cloud1);
    // crust speckles (fried texture)
    px(x, 11, 5 + oy, PAL.crust); px(x, 12, 8 + oy, PAL.crust);
    px(x, 4, 10 + oy, PAL.crust); px(x, 10, 11 + oy, PAL.crust); px(x, 6, 12 + oy, PAL.crust);
    px(x, 9, 3 + oy, PAL.fat); px(x, 11, 9 + oy, PAL.fat);
    // two big googly eyeballs near the top
    const ey = 5 + oy;
    for (const ex of [5, 10]) {
      rect(x, ex - 1, ey - 1, 3, 3, PAL.white);
      px(x, ex, ey, PAL.outline);       // pupil
      px(x, ex, ey + 1, PAL.outline);
    }
    // disturbingly human mouth (lips + teeth) on the meat
    const my = 10 + oy;
    if (bite && f) {
      // wide-open chomp
      rect(x, 5, my, 6, 4, PAL.outline);
      rect(x, 6, my + 1, 4, 1, PAL.white);     // upper teeth
      rect(x, 6, my + 3, 4, 1, PAL.pinkshade); // tongue
      px(x, 7, my + 1, PAL.outline); px(x, 9, my + 1, PAL.outline);
    } else {
      // closed grin: lips + a row of teeth
      rect(x, 5, my, 6, 1, PAL.pinkshade);     // upper lip
      rect(x, 5, my + 1, 6, 1, PAL.white);     // teeth
      px(x, 6, my + 1, PAL.outline); px(x, 8, my + 1, PAL.outline); px(x, 10, my + 1, PAL.outline);
      rect(x, 5, my + 2, 6, 1, PAL.pinkskin);  // lower lip
    }
  }, PAL.fat);
}

function cloudsheep(f, zap) {
  const w = 26, h = 16;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // tiny useless dangling legs
    for (const lx of [8, 12, 16]) {
      rect(x, lx, 12 + bob, 1, 3, PAL.dusk2);
      px(x, lx, 14 + bob, PAL.dusk1);
    }
    // puffy cloud body (overlapping lumps)
    disc(x, 10, 8, 8, 5, PAL.cloud1);
    disc(x, 5, 7 - bob, 4, 3.5, PAL.cloud1);
    disc(x, 15, 6, 4.5, 3.5, PAL.cloud1);
    disc(x, 19, 8, 3.5, 3, PAL.cloud1);
    disc(x, 12, 5 - bob, 3.5, 3, PAL.cloud1);
    // sheep face at front (right)
    disc(x, 21, 9, 2.6, 2.6, zap ? PAL.dusk1 : PAL.dusk1);
    // floppy ears
    px(x, 19, 7, PAL.dusk1); px(x, 19, 8, PAL.dusk1);
    px(x, 24, 7, PAL.dusk1);
  }, (x) => {
    const bob = f ? 1 : 0;
    // cloud underside shading
    rect(x, 6, 11, 12, 1, zap ? PAL.zap2 : PAL.cloud3);
    line(x, 4, 10 - bob, 8, 11, PAL.cloud2);
    line(x, 16, 10, 20, 11, PAL.cloud2);
    if (zap) {
      rect(x, 6, 12, 12, 1, PAL.zap2);
      rect(x, 8, 11, 8, 1, PAL.zap1);
    }
    // star sparkles in the wool
    const spark = (sx, sy) => {
      x.fillStyle = PAL.star;
      x.fillRect(sx, sy, 1, 1); x.fillRect(sx - 1, sy, 1, 1); x.fillRect(sx + 1, sy, 1, 1);
      x.fillRect(sx, sy - 1, 1, 1); x.fillRect(sx, sy + 1, 1, 1);
    };
    spark(7, 6 + (f ? 1 : 0)); spark(13, 8); spark(4, 9 - (f ? 1 : 0));
    // sheep face eyes
    if (zap) {
      rect(x, 20, 8, 2, 2, PAL.zap1);
      rect(x, 22, 8, 1, 2, PAL.zap1);
      px(x, 21, 9, PAL.white);
    } else {
      eye2(x, 21, 8);
      px(x, 20, 8, PAL.white); // second eye glint
    }
    // little smile on the face
    px(x, 22, 10, PAL.outline); px(x, 23, 10, PAL.outline);
  }, zap ? PAL.zap1 : PAL.cloud1);
}

function karatepig(f, chop) {
  const w = 18, h = 19;
  return frame(w, h, (x) => {
    // legs / stride
    const stride = chop ? 0 : (f ? 1 : -1);
    // bare pig legs with hooves under the gi
    rect(x, 6 - stride, 15, 2, 4, PAL.pinkskin);
    rect(x, 10 + stride, 15, 2, 4, PAL.pinkskin);
    rect(x, 6 - stride, 18, 2, 1, PAL.outline);
    rect(x, 10 + stride, 18, 2, 1, PAL.outline);
    // white gi torso
    rect(x, 4, 8, 10, 8, PAL.gi);
    // gi skirt flare
    px(x, 3, 15, PAL.gi); px(x, 14, 15, PAL.gi);
    // pig head on top
    disc(x, 9, 5, 4, 4, PAL.pinkskin);
    // ears
    px(x, 6, 2, PAL.pinkskin); px(x, 12, 2, PAL.pinkskin);
    px(x, 6, 1, PAL.pinkshade); px(x, 12, 1, PAL.pinkshade);
    // snout
    rect(x, 8, 6, 3, 2, PAL.pinkshade);
    // ARMS depend on pose
    if (chop === 1) {
      // windup: trotter raised high
      rect(x, 13, 2, 2, 6, PAL.gi);
      rect(x, 13, 1, 2, 2, PAL.pinkskin); // fist up high
    } else if (chop === 2) {
      // strike: arm fully extended horizontal to the right
      rect(x, 13, 9, 5, 2, PAL.gi);
      rect(x, 17, 9, 1, 2, PAL.pinkskin); // fist
    } else {
      // walk: arms at guard
      rect(x, 3, 9, 2, 4, PAL.gi);
      rect(x, 13, 9, 2, 4, PAL.gi);
      px(x, 13, 12, PAL.pinkskin); px(x, 14, 12, PAL.pinkskin);
    }
  }, (x) => {
    // gi fold shadows
    line(x, 6, 9, 6, 14, PAL.wool);
    line(x, 11, 9, 11, 14, PAL.wool);
    // black belt
    rect(x, 4, 13, 10, 2, PAL.outline);
    // belt knot + tails
    rect(x, 8, 13, 2, 3, PAL.outline);
    px(x, 8, 16, PAL.outline); px(x, 9, 16, PAL.outline);
    // red headband across forehead + tails
    rect(x, 5, 3, 8, 2, PAL.red);
    px(x, 4, 4, PAL.red); px(x, 3, 5, PAL.red); // trailing tail
    px(x, 3, 6, PAL.red);
    // determined eyes with angry brows
    px(x, 7, 5, PAL.outline); px(x, 8, 5, PAL.outline);
    px(x, 10, 5, PAL.outline); px(x, 11, 5, PAL.outline);
    eye2(x, 7, 6);
    eye2(x, 10, 6);
    // snout nostrils
    px(x, 8, 7, PAL.outline); px(x, 10, 7, PAL.outline);
    // gi collar V
    line(x, 6, 8, 9, 11, PAL.wool);
    line(x, 12, 8, 9, 11, PAL.wool);
  }, PAL.gi);
}

// ---------------------------------------------------------------------------
// NEW ANIMALS — goat, duck, horse (+ rare pink horse)
// ---------------------------------------------------------------------------

function goat(f) {
  const w = 18, h = 15;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    legs4(x, [4, 7, 11, 14], 9 + bob, 15, f, PAL.wool, PAL.outline);
    // body
    disc(x, 9, 7 + bob, 7, 3.8, PAL.wool);
    // beard
    px(x, 16, 10 + bob, PAL.wool); px(x, 16, 11 + bob, PAL.wool);
    // head
    disc(x, 15, 6 + bob, 3, 2.8, PAL.wool);
    // curved horns
    px(x, 13, 2 + bob, PAL.bone); px(x, 12, 1 + bob, PAL.bone); px(x, 12, 2 + bob, PAL.bone);
    px(x, 16, 2 + bob, PAL.bone); px(x, 17, 1 + bob, PAL.bone); px(x, 17, 2 + bob, PAL.bone);
    // snout
    rect(x, 16, 7 + bob, 2, 2, PAL.pinkshade);
  }, (x) => {
    const bob = f ? 1 : 0;
    eye2(x, 15, 5 + bob);
    px(x, 16, 8 + bob, PAL.outline);
    // wool tuft
    px(x, 6, 4 + bob, PAL.cloud1); px(x, 10, 4 + bob, PAL.cloud1);
  }, PAL.cloud1);
}

function duck(f) {
  const w = 14, h = 12;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // webbed feet
    const lx = f ? [4, 8] : [5, 7];
    rect(x, lx[0], 9, 1, 3, PAL.fire2);
    rect(x, lx[1], 9, 1, 3, PAL.fire2);
    px(x, lx[0] - 1, 11, PAL.fire2); px(x, lx[0] + 1, 11, PAL.fire2);
    px(x, lx[1] - 1, 11, PAL.fire2); px(x, lx[1] + 1, 11, PAL.fire2);
    // body
    disc(x, 6, 6 + bob, 5, 3.5, PAL.white);
    // tail
    rect(x, 1, 5 + bob, 2, 2, PAL.white);
    // head
    disc(x, 11, 4 + bob, 2.6, 2.4, PAL.white);
    // orange bill
    rect(x, 12, 5 + bob, 2, 2, PAL.fire2);
  }, (x) => {
    const bob = f ? 1 : 0;
    eye2(x, 11, 3 + bob);
    // wing
    line(x, 4, 6 + bob, 8, 7 + bob, PAL.wool);
    // bill tip
    px(x, 13, 6 + bob, PAL.fire3);
  }, PAL.fat);
}

function horse(f, pink) {
  const w = 26, h = 18;
  const hide = pink ? PAL.pinkskin : PAL.dirt1;
  const shade = pink ? PAL.pinkshade : PAL.dirt2;
  const mane = pink ? PAL.horizon : PAL.dirt3;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    legs4(x, [6, 10, 16, 20], 11 + bob, 18, f, hide, PAL.outline);
    // body
    disc(x, 13, 8 + bob, 9, 4.5, hide);
    // neck
    rect(x, 19, 3 + bob, 3, 6, hide);
    // head
    disc(x, 23, 4 + bob, 3, 2.6, hide);
    // snout
    rect(x, 24, 5 + bob, 2, 2, shade);
    // mane
    for (let i = 0; i < 4; i++) px(x, 19 + (i % 2), 2 + bob + i, mane);
    // tail
    line(x, 4, 7 + bob, 1, 12 + bob, mane);
  }, (x) => {
    const bob = f ? 1 : 0;
    eye2(x, 22, 3 + bob);
    // nostril
    px(x, 25, 6 + bob, PAL.outline);
    // belly shade
    line(x, 8, 11 + bob, 17, 11 + bob, shade);
    if (pink) {
      // sparkle stars
      px(x, 10, 5 + bob, PAL.star); px(x, 14, 6 + bob, PAL.star);
      px(x, 12, 4 + bob, PAL.zap1);
    }
  }, pink ? PAL.star : PAL.fat);
}

// DISCO COW — bell-bottom bovine with disco ball and platform boots
function discoCow(f, boogie) {
  const w = 28, h = 20;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    const dance = boogie ? (f ? -1 : 1) : 0;
    // platform boots
    rect(x, 5 + dance, 16 + bob, 4, 4, PAL.dusk2);
    rect(x, 18 - dance, 16 + bob, 4, 4, PAL.dusk2);
    rect(x, 5 + dance, 18 + bob, 4, 2, PAL.outline);
    rect(x, 18 - dance, 18 + bob, 4, 2, PAL.outline);
    // legs in flared pants
    rect(x, 6 + dance, 11 + bob, 3, 6, PAL.dusk1);
    rect(x, 19 - dance, 11 + bob, 3, 6, PAL.dusk1);
    // body in sequin jacket
    disc(x, 14, 9 + bob, 9, 5, PAL.dusk2);
    // head
    disc(x, 23, 7 + bob, 3.5, 3.2, PAL.white);
    // afro / big hair
    disc(x, 23, 4 + bob, 4, 3, PAL.dusk1);
    // horns with glitter
    rect(x, 21, 2 + bob, 1, 2, PAL.star);
    rect(x, 25, 2 + bob, 1, 2, PAL.star);
    // snout
    rect(x, 25, 8 + bob, 2, 2, PAL.pinkskin);
    // disco ball floating above
    disc(x, 10, 3 + bob, 3, 3, PAL.metal1);
  }, (x) => {
    const bob = f ? 1 : 0;
    // sequin sparkles on jacket
    const sparkCols = [PAL.zap2, PAL.fire1, PAL.beam, PAL.horizon];
    for (let i = 0; i < 6; i++) {
      px(x, 8 + (i * 3) % 12, 7 + bob + (i % 3), sparkCols[i % 4]);
    }
    // disco ball facets
    px(x, 9, 2 + bob, PAL.zap1); px(x, 11, 3 + bob, PAL.glow);
    px(x, 10, 4 + bob, PAL.fire1);
    // eyes with shades
    rect(x, 22, 6 + bob, 4, 1, PAL.outline);
    px(x, 23, 6 + bob, PAL.zap2); px(x, 25, 6 + bob, PAL.zap2);
    // big smile
    rect(x, 24, 9 + bob, 3, 1, PAL.outline);
    if (boogie) {
      // light rays
      line(x, 10, 6 + bob, 6, 10 + bob, PAL.zap2);
      line(x, 10, 6 + bob, 14, 10 + bob, PAL.fire1);
    }
  }, PAL.star);
}

// TORNADO SHEEP — spinning wool funnel with sheep face
function tornadoSheep(f, spin) {
  const w = 24, h = 28;
  return frame(w, h, (x) => {
    const phase = f ? 1 : 0;
    // funnel body — stacked ellipses narrowing upward
    disc(x, 12, 22, 10, 4, PAL.cloud3);
    disc(x, 12, 18, 8, 4, PAL.cloud2);
    disc(x, 12, 14, 6, 3.5, PAL.cloud1);
    disc(x, 12, 10, 4.5, 3, PAL.cloud1);
    disc(x, 12, 6, 3.5, 3, PAL.wool);
    // sheep face near top
    disc(x, 12 + (phase ? 1 : -1), 5, 3, 2.8, PAL.dusk1);
    // dangling legs
    for (const lx of [8, 12, 16]) {
      rect(x, lx + (phase ? 1 : -1), 24, 1, 3, PAL.dusk2);
    }
  }, (x) => {
    const phase = f ? 1 : 0;
    // swirl lines
    line(x, 4, 20, 10, 18, PAL.cloud1);
    line(x, 20, 20, 14, 18, PAL.cloud1);
    line(x, 6, 14, 11, 12, PAL.zap2);
    line(x, 18, 14, 13, 12, PAL.zap2);
    // eyes
    const ex = 12 + (phase ? 1 : -1);
    eye2(x, ex - 1, 4);
    if (spin) {
      rect(x, 8, 16, 8, 1, PAL.zap1);
      px(x, 12, 12, PAL.zap1);
    }
    // wool tufts
    px(x, 10, 3, PAL.cloud1); px(x, 14, 3, PAL.cloud1);
  }, PAL.zap1);
}

// LASER CHICKEN MECHA — bipedal armored chicken with shoulder cannons
function laserMecha(f, fire) {
  const w = 22, h = 26;
  return frame(w, h, (x) => {
    const bob = f ? 1 : 0;
    // mech legs
    rect(x, 6, 18 + bob, 3, 7, PAL.metal3);
    rect(x, 13, 18 + bob, 3, 7, PAL.metal3);
    rect(x, 5, 24 + bob, 5, 2, PAL.metal4);
    rect(x, 12, 24 + bob, 5, 2, PAL.metal4);
    // torso armor
    rect(x, 5, 10 + bob, 12, 9, PAL.metal2);
    rect(x, 6, 11 + bob, 10, 7, PAL.metal1);
    // chicken head cockpit
    disc(x, 11, 6 + bob, 5, 4.5, PAL.white);
    // comb
    px(x, 10, 1 + bob, PAL.red); px(x, 11, 1 + bob, PAL.red); px(x, 12, 2 + bob, PAL.red);
    // beak
    rect(x, 15, 6 + bob, 3, 2, PAL.fire2);
    // shoulder cannons
    rect(x, 1, 10 + bob, 4, 3, PAL.metal4);
    rect(x, 17, 10 + bob, 4, 3, PAL.metal4);
    if (fire) {
      rect(x, 0, 10 + bob, 2, 3, PAL.zap1);
      rect(x, 20, 10 + bob, 2, 3, PAL.zap1);
    }
  }, (x) => {
    const bob = f ? 1 : 0;
    // armor panels
    line(x, 7, 12 + bob, 14, 12 + bob, PAL.metal3);
    line(x, 7, 15 + bob, 14, 15 + bob, PAL.metal3);
    // glowing core
    rect(x, 10, 14 + bob, 2, 2, fire ? PAL.zap1 : PAL.glow);
    // eyes
    eye2(x, 9, 5 + bob);
    eye2(x, 12, 5 + bob);
    // cannon glow
    px(x, 2, 11 + bob, fire ? PAL.fire1 : PAL.red);
    px(x, 19, 11 + bob, fire ? PAL.fire1 : PAL.red);
    // wing vents
    px(x, 6, 13 + bob, PAL.metal4); px(x, 15, 13 + bob, PAL.metal4);
  }, PAL.metal1);
}

// ---------------------------------------------------------------------------
// export
// ---------------------------------------------------------------------------
export function build() {
  return {
    cow: { frames: [cow(0), cow(1)], fps: 6, ax: 11, ay: 15 },
    chicken: { frames: [chicken(0), chicken(1)], fps: 6, ax: 5, ay: 11 },
    sheep: { frames: [sheep(0), sheep(1)], fps: 6, ax: 8, ay: 13 },
    pig: { frames: [pig(0), pig(1)], fps: 6, ax: 8, ay: 12 },
    goat: { frames: [goat(0), goat(1)], fps: 6, ax: 9, ay: 15 },
    duck: { frames: [duck(0), duck(1)], fps: 6, ax: 7, ay: 12 },
    horse: { frames: [horse(0, false), horse(1, false)], fps: 6, ax: 13, ay: 18 },
    pink_horse: { frames: [horse(0, true), horse(1, true)], fps: 6, ax: 13, ay: 18 },

    steak_walk: { frames: [steak(0, false), steak(1, false)], fps: 6, ax: 15, ay: 20 },
    steak_fire: { frames: [steak(0, true), steak(1, true)], fps: 6, ax: 15, ay: 20 },

    drumstick_hop: { frames: [drumstick(0, false), drumstick(1, false)], fps: 8, ax: 8, ay: 22 },
    drumstick_bite: { frames: [drumstick(0, true), drumstick(1, true)], fps: 6, ax: 8, ay: 22 },

    cloudsheep_fly: { frames: [cloudsheep(0, false), cloudsheep(1, false)], fps: 4, ax: 13, ay: 8 },
    cloudsheep_zap: { frames: [cloudsheep(0, true)], fps: 1, ax: 13, ay: 8 },

    karatepig_walk: { frames: [karatepig(0, 0), karatepig(1, 0)], fps: 6, ax: 9, ay: 19 },
    karatepig_chop: { frames: [karatepig(0, 1), karatepig(0, 2)], fps: 8, ax: 9, ay: 19 },

    disco_walk: { frames: [discoCow(0, false), discoCow(1, false)], fps: 8, ax: 14, ay: 20 },
    disco_boogie: { frames: [discoCow(0, true), discoCow(1, true)], fps: 10, ax: 14, ay: 20 },

    tornado_spin: { frames: [tornadoSheep(0, false), tornadoSheep(1, true)], fps: 10, ax: 12, ay: 28 },

    mecha_walk: { frames: [laserMecha(0, false), laserMecha(1, false)], fps: 6, ax: 11, ay: 26 },
    mecha_fire: { frames: [laserMecha(0, true), laserMecha(1, true)], fps: 8, ax: 11, ay: 26 },
  };
}
