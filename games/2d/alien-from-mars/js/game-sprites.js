// The Alien from Mars — sprite registry merge + universal draw helper.
// Consumes the three parallel sprite modules strictly via their build() contract.

import { build as buildCreatures } from './sprites-creatures.js';
import { build as buildUnits } from './sprites-units.js';
import { build as buildProps } from './sprites-props.js';
import { PAL } from './shared.js';

// white-flash scratch buffer (source-size only; reused, no per-frame alloc)
let scratch = null, sctx = null;
function ensureScratch() {
  if (!scratch) {
    scratch = document.createElement('canvas');
    scratch.width = 96; scratch.height = 96;
    sctx = scratch.getContext('2d');
    sctx.imageSmoothingEnabled = false;
  }
}

export function buildRegistry() {
  ensureScratch();
  const reg = {};
  Object.assign(reg, buildCreatures(), buildUnits(), buildProps());
  return reg;
}

function tinted(img, flash) {
  const w = img.width, h = img.height;
  sctx.clearRect(0, 0, w, h);
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = 1;
  sctx.drawImage(img, 0, 0);
  sctx.globalCompositeOperation = 'source-atop';
  sctx.globalAlpha = Math.min(1, flash);
  sctx.fillStyle = '#ffffff';
  sctx.fillRect(0, 0, w, h);
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = 1;
  return scratch;
}

// Draw a sprite honoring frames/fps/ax/ay, horizontal flip, scale, rotation, flash, alpha.
// o = { t, frame, flip, scale, rot, flash, alpha }
export function drawSprite(ctx, reg, name, x, y, o) {
  const sp = reg[name];
  if (!sp) return;
  const frames = sp.frames;
  let fi = 0;
  if (o && o.frame != null) fi = ((o.frame % frames.length) + frames.length) % frames.length;
  else if (frames.length > 1) {
    const fps = sp.fps || 6;
    fi = Math.floor(((o && o.t) || 0) * fps) % frames.length;
  }
  const img = frames[fi];
  const dw = img.width, dh = img.height;
  const ax = sp.ax, ay = sp.ay;
  const flip = o && o.flip;
  const sc = (o && o.scale) || 1;
  const rot = (o && o.rot) || 0;
  const flash = o && o.flash;
  const src = flash > 0 ? tinted(img, flash) : img;

  if (rot || sc !== 1 || flip) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (rot) ctx.rotate(rot);
    ctx.scale(flip ? -sc : sc, sc);
    if (o && o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.drawImage(src, 0, 0, dw, dh, -ax, -ay, dw, dh);
    ctx.restore();
  } else {
    let pa;
    if (o && o.alpha != null) { pa = ctx.globalAlpha; ctx.globalAlpha = o.alpha; }
    ctx.drawImage(src, 0, 0, dw, dh, Math.round(x - ax), Math.round(y - ay), dw, dh);
    if (pa != null) ctx.globalAlpha = pa;
  }
}

// Soft blob shadow under an entity. w = footprint width; alpha scales with height.
export function drawShadow(ctx, x, groundY, w, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(groundY), w * 0.5, Math.max(1.5, w * 0.18), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
