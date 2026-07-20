// The Alien from Mars — pure worldgen: RNG, value noise, ground profile, chunk layout.
// SIDE-EFFECT FREE. No browser APIs. Node-importable for determinism smoke tests.
// Same (seed, chunkIndex) => identical layout. groundY(x) is a global continuous
// function of x, so it is automatically continuous across chunk borders.

import { K } from './shared.js';

// ---- deterministic RNG ---------------------------------------------------
export function mulberry32(a) {
  let s = a >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(a, b) {
  let h = (a >>> 0) ^ Math.imul((b >>> 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
  h ^= h >>> 15;
  return h >>> 0;
}

function smooth(t) { return t * t * (3 - 2 * t); }

// lattice height in [0,1) for integer index i, deterministic in (seed,i).
function latH(seed, i) {
  return mulberry32(hashSeed(seed, (i | 0) >>> 0))();
}

function octave(seed, x, L, salt) {
  const p = x / L;
  const i = Math.floor(p);
  const f = p - i;
  const a = latH(seed, i * 2 + salt);
  const b = latH(seed, (i + 1) * 2 + salt);
  return a + (b - a) * smooth(f);
}

const PROP_HP = {
  tree1: 20, tree2: 20, tree_burnt: 12, rock1: 40, rock2: 40,
  hut: 60, barn: 100, windmill: 70, silo: 80, fence: 8, hay: 8,
};

export function propHp(type) { return PROP_HP[type] || 20; }

export function makeWorld(seed) {
  seed = seed >>> 0;

  function groundY(x) {
    const n = octave(seed, x, 300, 1) * 0.7 + octave(seed, x, 95, 7) * 0.3;
    return K.GROUND + (n - 0.5) * 2 * 26;
  }

  // Deterministic list of spawn descriptors for chunk `ci`.
  function chunkLayout(ci) {
    const cx0 = ci * K.CHUNK_W;
    const rng = mulberry32(hashSeed(seed ^ 0xa53c9d, (ci | 0) >>> 0));
    const gx = (frac) => cx0 + frac * K.CHUNK_W;
    const spawns = [];
    const farm = rng() < 0.25;
    // weighted farm fauna — classic + goat/duck/horse; pink_horse is ultra-rare
    const kinds = ['cow', 'sheep', 'pig', 'chicken', 'goat', 'duck', 'horse'];
    function pickAnimal() {
      if (rng() < 0.012) return 'pink_horse'; // ~1.2% easter egg
      const r = rng();
      if (r < 0.18) return 'cow';
      if (r < 0.34) return 'sheep';
      if (r < 0.48) return 'pig';
      if (r < 0.62) return 'chicken';
      if (r < 0.75) return 'goat';
      if (r < 0.88) return 'duck';
      return 'horse';
    }

    if (farm) {
      const bigX = gx(0.18 + rng() * 0.18);
      spawns.push({ cls: 'prop', type: rng() < 0.5 ? 'barn' : 'hut', x: bigX });
      spawns.push({ cls: 'prop', type: rng() < 0.5 ? 'windmill' : 'silo', x: gx(0.52 + rng() * 0.12) });
      const hayN = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < hayN; i++) spawns.push({ cls: 'prop', type: 'hay', x: gx(0.58 + rng() * 0.34) });
      const fN = 3 + Math.floor(rng() * 4);
      const fStart = gx(0.05 + rng() * 0.08);
      for (let i = 0; i < fN; i++) spawns.push({ cls: 'prop', type: 'fence', x: fStart + i * 15 });
      const aN = 3 + Math.floor(rng() * 4);
      for (let i = 0; i < aN; i++) spawns.push({ cls: 'animal', type: pickAnimal(), x: gx(0.12 + rng() * 0.82) });
      if (rng() < 0.7) spawns.push({ cls: 'prop', type: rng() < 0.5 ? 'tree1' : 'tree2', x: gx(0.9 + rng() * 0.07) });
    } else {
      const tN = 2 + Math.floor(rng() * 4);
      for (let i = 0; i < tN; i++) {
        const r = rng();
        const type = r < 0.4 ? 'tree1' : r < 0.65 ? 'tree2' : r < 0.82 ? 'rock1' : 'rock2';
        spawns.push({ cls: 'prop', type, x: gx(0.05 + rng() * 0.9) });
      }
      const aN = Math.floor(rng() * 3);
      for (let i = 0; i < aN; i++) spawns.push({ cls: 'animal', type: pickAnimal(), x: gx(0.1 + rng() * 0.8) });
    }
    return { ci, farm, spawns };
  }

  return { seed, groundY, chunkLayout };
}
