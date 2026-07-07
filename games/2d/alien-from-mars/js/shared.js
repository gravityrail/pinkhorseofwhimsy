// The Alien from Mars — shared constants + palette.
// Every module imports from here. Do NOT duplicate these values elsewhere.

export const K = {
  W: 480, H: 270,          // logical pixel resolution (16:9), integer-upscaled to screen
  GROUND: 200,             // baseline ground y on flat terrain (world px, y-down)
  CHUNK_W: 480,            // world chunk width in px
  GRAVITY: 340,            // px/s^2 for ballistic things (lava globs, shells, gibs)
  MUTANT_MAX_STAGE: 6,     // growth stages 1..6; kills past 6 => engorge, then blow up into lava
};

// Dusk-invasion palette. Pixel art rules: 1px `outline` outlines, 2-3 tone ramps,
// warm rim light from the horizon side, no anti-aliasing, no gradients inside sprites.
export const PAL = {
  outline: '#151221',
  // sky (zenith -> horizon)
  night: '#1a1030', dusk1: '#3b1d4f', dusk2: '#7a2a5c', dusk3: '#c4504e', horizon: '#f2a65e',
  star: '#ffeec2', mars: '#e06a48', marsDark: '#93321f',
  // terrain
  grass1: '#4d9e55', grass2: '#357a43', grass3: '#245532',
  dirt1: '#6b4634', dirt2: '#4a2e22', dirt3: '#33201a',
  // machines
  metal1: '#c7d0e0', metal2: '#8f9bb3', metal3: '#5d6785', metal4: '#38405c',
  glow: '#7ef9e2', beam: '#b8ff7a', alien: '#6fdc5a',
  // fire / lava / zaps
  fire1: '#fff1a8', fire2: '#ffb03a', fire3: '#f2582a', fire4: '#a12817',
  lava1: '#fff1a8', lava2: '#ff7b2e', lava3: '#d8342c', lava4: '#7a1c12',
  zap1: '#eaffff', zap2: '#9ef3ff', zap3: '#4fc7ff',
  // meat & critters
  meat1: '#c95f38', meat2: '#8a3a22', crust: '#5e2415', bone: '#f4e7c8', fat: '#f0c48e',
  cloud1: '#f5f0ff', cloud2: '#cfc3ee', cloud3: '#9d8fd6',
  white: '#f2ede4', wool: '#d9cfc0', pinkskin: '#f2a3b3', pinkshade: '#c96f88',
  // structures
  wood1: '#8a5a35', wood2: '#5e3a24', roof: '#a8412e', wall: '#caa26a',
  // army
  army1: '#5c6b3a', army2: '#3e4a28', gi: '#f2ede4', red: '#d8342c',
  // misc
  shadow: 'rgba(10,8,20,0.35)', ui: '#f2ede4',
};
