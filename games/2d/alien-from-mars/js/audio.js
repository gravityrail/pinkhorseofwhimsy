// The Alien from Mars — audio.js
// Fully synthesized WebAudio. Inert until init(): no AudioContext at import time.
// Contract (DESIGN.md §5):
//   export const audio = { init, play(name,opts), startBeam, stopBeam, startMusic, setWanted }
// Master chain ends in a compressor/limiter so nothing clips. Unknown cues no-op.

let ctx = null;          // AudioContext (null until init)
let master = null;       // final gain -> compressor -> destination
let comp = null;         // limiter
let noiseBuf = null;     // shared white-noise buffer
let sampleBus = null;    // bus for decoded mp3 samples

// beam loop state
let beamNodes = null;
let beamSample = null;   // optional looping mp3 beam hum

// music state
let music = null;
let musicSample = null;  // optional looping mp3 bed under synth
let wanted = 0;

// decoded sample buffers keyed by cue name (null = missing/failed)
const samples = Object.create(null);
const SAMPLE_MAP = {
  mutate: '/arcade/sfx/alien-mutate.mp3',
  lava_explode: '/arcade/sfx/alien-explode.mp3',
  explode_big: '/arcade/sfx/alien-explode.mp3',
  alarm: '/arcade/sfx/alien-alarm.mp3',
};
const BEAM_URL = '/arcade/sfx/alien-beam.mp3';
const MUSIC_URL = '/arcade/sfx/alien-music.mp3';

function loadSample(url) {
  return fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
    .then((buf) => ctx.decodeAudioData(buf.slice(0)))
    .catch(() => null);
}

function playSample(name, vol, rate) {
  const buf = samples[name];
  if (!buf || !ctx || !sampleBus) return false;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate || 1;
    const g = ctx.createGain();
    g.gain.value = (vol != null ? vol : 1) * 0.7;
    src.connect(g); g.connect(sampleBus);
    src.start();
    return true;
  } catch (e) { return false; }
}

// -------------------------------------------------------------------------
// helpers (all no-op / guarded when ctx is null)
// -------------------------------------------------------------------------

function now() { return ctx.currentTime; }

function makeNoiseBuffer() {
  const len = Math.floor(ctx.sampleRate * 1.0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// A short-lived gain node routed to master; auto-suicide is caller's job.
function gain(v = 1) {
  const g = ctx.createGain();
  g.gain.value = v;
  g.connect(master);
  return g;
}

// One-shot oscillator with an ADSR-ish envelope. Returns {osc, env}.
function tone(type, freq, dur, peak, dest, opts = {}) {
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  const env = ctx.createGain();
  const atk = opts.atk != null ? opts.atk : 0.005;
  const rel = opts.rel != null ? opts.rel : dur * 0.6;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + atk);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env);
  env.connect(dest || master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  return { osc, env, t, rel };
}

// Filtered noise burst. Returns the source (already started/stopped).
function noise(dur, peak, filterType, freq, Q, dest) {
  const t = now();
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = filterType || 'bandpass';
  flt.frequency.value = freq || 1000;
  if (Q != null) flt.Q.value = Q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt);
  flt.connect(env);
  env.connect(dest || master);
  src.start(t);
  src.stop(t + dur + 0.05);
  return { src, flt, env };
}

// -------------------------------------------------------------------------
// cue implementations
// each: (opts) with opts.vol (0..1 mult) and opts.pitch (freq/rate mult)
// -------------------------------------------------------------------------

const CUES = {
  // green laser bolt — quick descending zap
  shoot(v, p) {
    const g = gain(0.5 * v);
    const o = ctx.createOscillator();
    o.type = 'square';
    const t = now();
    o.frequency.setValueAtTime(900 * p, t);
    o.frequency.exponentialRampToValueAtTime(180 * p, t + 0.12);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.6, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(e); e.connect(g);
    o.start(t); o.stop(t + 0.16);
  },

  // rival purple bolt — buzzier, lower
  enemy_shoot(v, p) {
    const g = gain(0.5 * v);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const t = now();
    o.frequency.setValueAtTime(520 * p, t);
    o.frequency.exponentialRampToValueAtTime(90 * p, t + 0.16);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 1600;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.55, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(flt); flt.connect(e); e.connect(g);
    o.start(t); o.stop(t + 0.2);
  },

  // generic impact tick
  hit(v, p) {
    noise(0.07, 0.5 * v, 'bandpass', 2600 * p, 1.2);
    tone('triangle', 320 * p, 0.06, 0.25 * v, master, { atk: 0.002 });
  },

  explode_small(v, p) {
    const t = now();
    noise(0.28, 0.7 * v, 'lowpass', 1400 * p, 0.7);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(220 * p, t);
    o.frequency.exponentialRampToValueAtTime(50 * p, t + 0.25);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.6 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.32);
  },

  explode_big(v, p) {
    const t = now();
    noise(0.6, 0.9 * v, 'lowpass', 900 * p, 0.5);
    noise(0.4, 0.5 * v, 'highpass', 2500, 0.4);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180 * p, t);
    o.frequency.exponentialRampToValueAtTime(32 * p, t + 0.5);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.85 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.62);
  },

  // tractor abduction release "bloop-pop"
  abduct_pop(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(300 * p, t);
    o.frequency.exponentialRampToValueAtTime(1200 * p, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(400 * p, t + 0.2);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.02);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.24);
  },

  // mutation — magical warble up + shimmer
  mutate(v, p) {
    const t = now();
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const base = (400 + i * 130) * p;
      o.frequency.setValueAtTime(base, t + i * 0.02);
      o.frequency.exponentialRampToValueAtTime(base * 3.2, t + 0.3);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 18;
      const lg = ctx.createGain(); lg.gain.value = 40;
      lfo.connect(lg); lg.connect(o.frequency);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.05);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(e); e.connect(master);
      o.start(t); o.stop(t + 0.42);
      lfo.start(t); lfo.stop(t + 0.42);
    }
  },

  // --- animal caricatures ---
  moo(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150 * p, t);
    o.frequency.linearRampToValueAtTime(120 * p, t + 0.18);
    o.frequency.linearRampToValueAtTime(95 * p, t + 0.5);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(700, t);
    flt.frequency.linearRampToValueAtTime(420, t + 0.5);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.4 * v, t + 0.06);
    e.gain.setValueAtTime(0.4 * v, t + 0.3);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.57);
  },

  cluck(v, p) {
    const t = now();
    // two quick pecks
    for (let i = 0; i < 2; i++) {
      const s = t + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(1300 * p, s);
      o.frequency.exponentialRampToValueAtTime(700 * p, s + 0.05);
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass'; flt.frequency.value = 1500; flt.Q.value = 3;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, s);
      e.gain.exponentialRampToValueAtTime(0.3 * v, s + 0.008);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.06);
      o.connect(flt); flt.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.07);
    }
  },

  baa(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400 * p, t);
    // vibrato wobble = bleating
    const lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 24;
    const lg = ctx.createGain(); lg.gain.value = 30;
    lfo.connect(lg); lg.connect(o.frequency);
    o.frequency.linearRampToValueAtTime(330 * p, t + 0.4);
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 900 * p; flt.Q.value = 4;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.3 * v, t + 0.05);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.44);
    lfo.start(t); lfo.stop(t + 0.44);
  },

  oink(v, p) {
    const t = now();
    // two grunty snorts
    for (let i = 0; i < 2; i++) {
      const s = t + i * 0.13;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220 * p, s);
      o.frequency.exponentialRampToValueAtTime(130 * p, s + 0.1);
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.value = 800; flt.Q.value = 6;
      const n = noise(0.1, 0.12 * v, 'bandpass', 1100, 5);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, s);
      e.gain.exponentialRampToValueAtTime(0.32 * v, s + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.11);
      o.connect(flt); flt.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.12);
    }
  },

  // steak fire cone
  fire_breath(v, p) {
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(500, t);
    flt.frequency.linearRampToValueAtTime(2400 * p, t + 0.1);
    flt.frequency.linearRampToValueAtTime(700, t + 0.5);
    flt.Q.value = 1.2;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.05);
    e.gain.setValueAtTime(0.45 * v, t + 0.35);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    src.connect(flt); flt.connect(e); e.connect(master);
    src.start(t); src.stop(t + 0.57);
  },

  // cloudsheep lightning
  zap(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1800 * p, t);
    o.frequency.exponentialRampToValueAtTime(300 * p, t + 0.12);
    const flt = ctx.createBiquadFilter();
    flt.type = 'highpass'; flt.frequency.value = 800;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.5 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.18);
    noise(0.12, 0.4 * v, 'highpass', 4000, 0.5);
  },

  // karatepig PORK CHOP — punchy "HI-YA!" grunt
  chop(v, p) {
    const t = now();
    // vocal grunt: formant-ish saw through bandpass, quick pitch drop
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420 * p, t);
    o.frequency.exponentialRampToValueAtTime(170 * p, t + 0.09);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 900 * p; f1.Q.value = 5;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(f1); f1.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.16);
    // the "impact" crack of the chop
    noise(0.06, 0.55 * v, 'bandpass', 2200, 1.5);
    const k = ctx.createOscillator();
    k.type = 'triangle';
    k.frequency.setValueAtTime(200 * p, t);
    k.frequency.exponentialRampToValueAtTime(60 * p, t + 0.08);
    const ke = ctx.createGain();
    ke.gain.setValueAtTime(0.5 * v, t);
    ke.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    k.connect(ke); ke.connect(master);
    k.start(t); k.stop(t + 0.12);
  },

  bite(v, p) {
    const t = now();
    // chomp: fast noise snap + woody click
    noise(0.05, 0.5 * v, 'bandpass', 1600 * p, 2);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(240 * p, t);
    o.frequency.exponentialRampToValueAtTime(90 * p, t + 0.05);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.35 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.08);
  },

  // growth pip — little rising chime
  growth(v, p) {
    const t = now();
    const notes = [523, 659, 784];
    notes.forEach((n, i) => {
      const s = t + i * 0.05;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(n * p, s);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, s);
      e.gain.exponentialRampToValueAtTime(0.28 * v, s + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.16);
      o.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.18);
    });
  },

  // ominous rising fuse before a mutant blows into lava
  engorge_warning(v, p) {
    const t = now();
    const dur = 2.6;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(60 * p, t);
    o.frequency.exponentialRampToValueAtTime(420 * p, t + dur);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(300, t);
    flt.frequency.exponentialRampToValueAtTime(2600, t + dur);
    // tremolo that speeds up = a sizzling fuse
    const trem = ctx.createOscillator();
    trem.type = 'sine';
    trem.frequency.setValueAtTime(6, t);
    trem.frequency.exponentialRampToValueAtTime(26, t + dur);
    const tg = ctx.createGain(); tg.gain.value = 0.3;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.3);
    e.gain.setValueAtTime(0.32 * v, t + dur - 0.2);
    e.gain.exponentialRampToValueAtTime(0.5 * v, t + dur);
    trem.connect(tg); tg.connect(e.gain);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
    trem.start(t); trem.stop(t + dur + 0.05);
  },

  // HUGE lava blast
  lava_explode(v, p) {
    const t = now();
    // deep boom
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140 * p, t);
    o.frequency.exponentialRampToValueAtTime(24 * p, t + 0.8);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.95 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.92);
    // rumble body
    noise(0.9, 0.85 * v, 'lowpass', 700 * p, 0.4);
    // debris sizzle tail
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 3000; flt.Q.value = 0.6;
    const se = ctx.createGain();
    se.gain.setValueAtTime(0.0001, t + 0.1);
    se.gain.exponentialRampToValueAtTime(0.3 * v, t + 0.2);
    se.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    src.connect(flt); flt.connect(se); se.connect(master);
    src.start(t); src.stop(t + 1.25);
  },

  alarm(v, p) {
    const t = now();
    // two-tone siren, a couple cycles
    const o = ctx.createOscillator();
    o.type = 'square';
    const e = ctx.createGain();
    e.gain.value = 0.22 * v;
    o.connect(e); e.connect(master);
    let s = t;
    for (let i = 0; i < 3; i++) {
      o.frequency.setValueAtTime(660 * p, s);
      o.frequency.setValueAtTime(880 * p, s + 0.14);
      s += 0.28;
    }
    e.gain.setValueAtTime(0.22 * v, s - 0.05);
    e.gain.exponentialRampToValueAtTime(0.0001, s + 0.05);
    o.start(t); o.stop(s + 0.07);
  },

  tank_fire(v, p) {
    const t = now();
    noise(0.35, 0.85 * v, 'lowpass', 1100 * p, 0.6);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(160 * p, t);
    o.frequency.exponentialRampToValueAtTime(40 * p, t + 0.2);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.7 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.32);
  },

  jet_pass(v, p) {
    const t = now();
    const dur = 1.0;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.Q.value = 0.8;
    // doppler-ish sweep
    flt.frequency.setValueAtTime(1200 * p, t);
    flt.frequency.exponentialRampToValueAtTime(3000 * p, t + dur * 0.4);
    flt.frequency.exponentialRampToValueAtTime(500 * p, t + dur);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.5 * v, t + dur * 0.4);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(e); e.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  },

  player_hurt(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(400 * p, t);
    o.frequency.exponentialRampToValueAtTime(120 * p, t + 0.25);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.5 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.3);
    noise(0.12, 0.3 * v, 'lowpass', 900, 0.7);
  },

  // theremin-y UFO arrival mood
  ufo_arrive(v, p) {
    const t = now();
    const dur = 1.4;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180 * p, t);
    o.frequency.exponentialRampToValueAtTime(760 * p, t + dur * 0.6);
    o.frequency.exponentialRampToValueAtTime(520 * p, t + dur);
    // wide vibrato = theremin
    const lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 6.5;
    const lg = ctx.createGain(); lg.gain.value = 22;
    lfo.connect(lg); lg.connect(o.frequency);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.3 * v, t + 0.2);
    e.gain.setValueAtTime(0.3 * v, t + dur - 0.3);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
  },

  // mutant vs mutant brawl — comedic scuffle
  brawl(v, p) {
    const t = now();
    for (let i = 0; i < 4; i++) {
      const s = t + i * 0.06 + Math.random() * 0.02;
      noise(0.05, 0.35 * v, 'bandpass', (1200 + Math.random() * 1600) * p, 3);
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime((260 + Math.random() * 200) * p, s);
      o.frequency.exponentialRampToValueAtTime(120 * p, s + 0.05);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.3 * v, s);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.06);
      o.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.08);
    }
  },

  game_over(v, p) {
    const t = now();
    // sad descending martian trombone
    const notes = [392, 349, 294, 233];
    notes.forEach((n, i) => {
      const s = t + i * 0.22;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(n * p, s);
      o.frequency.exponentialRampToValueAtTime(n * p * 0.94, s + 0.2);
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.value = 1400;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, s);
      e.gain.exponentialRampToValueAtTime(0.3 * v, s + 0.02);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.25);
      o.connect(flt); flt.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.27);
    });
  },

  // new animal caricatures
  bleat(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(480 * p, t);
    o.frequency.linearRampToValueAtTime(360 * p, t + 0.25);
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 30;
    const lg = ctx.createGain(); lg.gain.value = 40;
    lfo.connect(lg); lg.connect(o.frequency);
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1100; flt.Q.value = 5;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.03);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.32); lfo.start(t); lfo.stop(t + 0.32);
  },
  quack(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(380 * p, t);
    o.frequency.exponentialRampToValueAtTime(180 * p, t + 0.12);
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 900; flt.Q.value = 4;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.4 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.16);
  },
  neigh(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520 * p, t);
    o.frequency.linearRampToValueAtTime(280 * p, t + 0.18);
    o.frequency.linearRampToValueAtTime(400 * p, t + 0.35);
    o.frequency.linearRampToValueAtTime(200 * p, t + 0.55);
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1200; flt.Q.value = 2;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.35 * v, t + 0.04);
    e.gain.setValueAtTime(0.3 * v, t + 0.35);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.62);
  },
  disco(v, p) {
    const t = now();
    // four-on-the-floor kick + hi sparkle
    for (let i = 0; i < 4; i++) {
      const s = t + i * 0.12;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140 * p, s);
      o.frequency.exponentialRampToValueAtTime(50 * p, s + 0.08);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.4 * v, s);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.1);
      o.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.12);
    }
    tone('triangle', 880 * p, 0.3, 0.15 * v, master);
    tone('triangle', 1320 * p, 0.25, 0.1 * v, master);
  },
  tornado(v, p) {
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.Q.value = 1.2;
    flt.frequency.setValueAtTime(400 * p, t);
    flt.frequency.linearRampToValueAtTime(1800 * p, t + 0.4);
    flt.frequency.linearRampToValueAtTime(600 * p, t + 0.8);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.45 * v, t + 0.1);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    src.connect(flt); flt.connect(e); e.connect(master);
    src.start(t); src.stop(t + 0.9);
  },
  laser(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1400 * p, t);
    o.frequency.exponentialRampToValueAtTime(200 * p, t + 0.2);
    const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 600;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.4 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(flt); flt.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.24);
    noise(0.08, 0.25 * v, 'highpass', 3000, 0.5);
  },
  heli(v, p) {
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 280 * p; flt.Q.value = 4;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.35 * v, t + 0.15);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    // chopper thump LFO
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 12;
    const lg = ctx.createGain(); lg.gain.value = 0.15 * v;
    lfo.connect(lg); lg.connect(e.gain);
    src.connect(flt); flt.connect(e); e.connect(master);
    src.start(t); src.stop(t + 1.15); lfo.start(t); lfo.stop(t + 1.15);
  },
  robot_stomp(v, p) {
    const t = now();
    noise(0.15, 0.6 * v, 'lowpass', 400 * p, 0.8);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(80 * p, t);
    o.frequency.exponentialRampToValueAtTime(30 * p, t + 0.2);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.7 * v, t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.27);
  },
  sat_charge(v, p) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(200 * p, t);
    o.frequency.exponentialRampToValueAtTime(1600 * p, t + 0.8);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.25 * v, t + 0.1);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    o.connect(e); e.connect(master);
    o.start(t); o.stop(t + 0.9);
  },
  mission(v, p) {
    const t = now();
    [523, 659, 784, 1046].forEach((n, i) => {
      const s = t + i * 0.06;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(n * p, s);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, s);
      e.gain.exponentialRampToValueAtTime(0.22 * v, s + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
      o.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.2);
    });
  },
  easter(v, p) {
    const t = now();
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((n, i) => {
      const s = t + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(n * p, s);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.28 * v, s);
      e.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
      o.connect(e); e.connect(master);
      o.start(s); o.stop(s + 0.22);
    });
  },
};

// -------------------------------------------------------------------------
// beam loop (tractor hum)
// -------------------------------------------------------------------------

function beamStart() {
  if (!ctx || beamNodes) return;
  const t = now();
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = 140;
  const shimmer = ctx.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = 320;
  // amplitude wobble
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 11;
  const lg = ctx.createGain();
  lg.gain.value = 0.08;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.08);
  const sg = ctx.createGain();
  sg.gain.value = 0.05;
  lfo.connect(lg); lg.connect(g.gain);
  carrier.connect(g);
  shimmer.connect(sg); sg.connect(g);
  g.connect(master);
  carrier.start(t); shimmer.start(t); lfo.start(t);
  beamNodes = { carrier, shimmer, lfo, g };

  // layer optional mp3 beam loop under the synth hum
  if (samples._beam && !beamSample) {
    try {
      const src = ctx.createBufferSource();
      src.buffer = samples._beam; src.loop = true;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.22, t + 0.1);
      src.connect(bg); bg.connect(sampleBus || master);
      src.start(t);
      beamSample = { src, g: bg };
    } catch (e) {}
  }
}

function beamStop() {
  if (!beamNodes) return;
  const t = now();
  const { carrier, shimmer, lfo, g } = beamNodes;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  carrier.stop(t + 0.15);
  shimmer.stop(t + 0.15);
  lfo.stop(t + 0.15);
  beamNodes = null;
  if (beamSample) {
    try {
      beamSample.g.gain.cancelScheduledValues(t);
      beamSample.g.gain.setValueAtTime(beamSample.g.gain.value || 0.01, t);
      beamSample.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      beamSample.src.stop(t + 0.15);
    } catch (e) {}
    beamSample = null;
  }
}

// -------------------------------------------------------------------------
// music — sparse theremin wobble over a low pulse; intensity via setWanted
// -------------------------------------------------------------------------

function musicStart() {
  if (!ctx || music) return;
  const busGain = ctx.createGain();
  busGain.gain.value = 0.0;
  busGain.connect(master);
  busGain.gain.exponentialRampToValueAtTime(0.5, now() + 1.5);

  // low pulse voice
  const pulseGain = ctx.createGain();
  pulseGain.gain.value = 0.5;
  pulseGain.connect(busGain);

  // theremin lead
  const leadOsc = ctx.createOscillator();
  leadOsc.type = 'sine';
  leadOsc.frequency.value = 220;
  const leadVib = ctx.createOscillator();
  leadVib.type = 'sine';
  leadVib.frequency.value = 5.2;
  const leadVibG = ctx.createGain();
  leadVibG.gain.value = 6;
  leadVib.connect(leadVibG); leadVibG.connect(leadOsc.frequency);
  const leadGain = ctx.createGain();
  leadGain.gain.value = 0.0;
  const leadFlt = ctx.createBiquadFilter();
  leadFlt.type = 'lowpass'; leadFlt.frequency.value = 1400;
  leadOsc.connect(leadFlt); leadFlt.connect(leadGain); leadGain.connect(busGain);
  leadOsc.start(); leadVib.start();

  // extra tension voice (fades in at higher wanted)
  const tenseOsc = ctx.createOscillator();
  tenseOsc.type = 'sawtooth';
  tenseOsc.frequency.value = 110;
  const tenseFlt = ctx.createBiquadFilter();
  tenseFlt.type = 'lowpass'; tenseFlt.frequency.value = 700;
  const tenseGain = ctx.createGain();
  tenseGain.gain.value = 0.0;
  tenseOsc.connect(tenseFlt); tenseFlt.connect(tenseGain); tenseGain.connect(busGain);
  tenseOsc.start();

  // high alarm pad at wanted 3
  const alarmOsc = ctx.createOscillator();
  alarmOsc.type = 'triangle';
  alarmOsc.frequency.value = 660;
  const alarmGain = ctx.createGain();
  alarmGain.gain.value = 0.0;
  alarmOsc.connect(alarmGain); alarmGain.connect(busGain);
  alarmOsc.start();

  // percussion noise tick bus
  const percGain = ctx.createGain();
  percGain.gain.value = 0.0;
  percGain.connect(busGain);

  music = {
    busGain, pulseGain, leadOsc, leadGain, tenseOsc, tenseGain, leadVib,
    alarmOsc, alarmGain, percGain,
    step: 0,
    nextTime: now() + 0.1,
    timer: null,
  };

  // optional mp3 music bed under the synth
  if (samples._music && !musicSample) {
    try {
      const src = ctx.createBufferSource();
      src.buffer = samples._music; src.loop = true;
      const mg = ctx.createGain();
      mg.gain.value = 0.18;
      src.connect(mg); mg.connect(sampleBus || master);
      src.start();
      musicSample = { src, g: mg };
    } catch (e) {}
  }

  scheduleMusic();
  applyWanted();
}

// A minor pentatonic-ish scale for eerie leads.
const LEAD_SCALE = [220, 261.63, 293.66, 349.23, 392, 440, 523.25];
const BASS_ROOT = 55; // A1

function scheduleMusic() {
  if (!music) return;
  // schedule a window of events, then re-arm via timeout
  const lookahead = 0.2;   // seconds of audio to schedule per tick
  const t = now();
  while (music.nextTime < t + lookahead) {
    playMusicStep(music.nextTime);
    // pulse tempo scales with wanted: quarter-note length
    const beat = 0.5 - wanted * 0.07; // 0.5s .. 0.29s
    music.nextTime += beat;
    music.step++;
  }
  music.timer = setTimeout(scheduleMusic, 60);
}

function playMusicStep(t) {
  if (!music) return;
  const step = music.step;

  // low pulse on every beat
  const bassMult = [1, 1, 0.75, 1][step % 4]; // gentle root movement
  const bo = ctx.createOscillator();
  bo.type = 'triangle';
  bo.frequency.setValueAtTime(BASS_ROOT * bassMult, t);
  const bf = ctx.createBiquadFilter();
  bf.type = 'lowpass'; bf.frequency.value = 400;
  const be = ctx.createGain();
  be.gain.setValueAtTime(0.0001, t);
  be.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
  be.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  bo.connect(bf); bf.connect(be); be.connect(music.pulseGain);
  bo.start(t); bo.stop(t + 0.3);

  // sparse theremin lead: only sometimes, denser at higher wanted
  const density = 0.18 + wanted * 0.16;
  if (rngMusic() < density) {
    const note = LEAD_SCALE[(step * 3 + (rngMusic() * 7 | 0)) % LEAD_SCALE.length];
    const oct = rngMusic() < 0.3 ? 2 : 1;
    music.leadOsc.frequency.setTargetAtTime(note * oct, t, 0.05);
    music.leadGain.gain.cancelScheduledValues(t);
    music.leadGain.gain.setValueAtTime(Math.max(0.0001, music.leadGain.gain.value), t);
    music.leadGain.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
    music.leadGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35 + wanted * 0.05);
  }

  // tension arpeggio flickers only at wanted >= 2
  if (wanted >= 2 && (step % 2 === 0)) {
    const n = LEAD_SCALE[(step + 2) % LEAD_SCALE.length] / 2;
    music.tenseOsc.frequency.setValueAtTime(n, t);
  }

  // percussion ticks denser with wanted
  if (wanted >= 1 && music.percGain && (step % (wanted >= 3 ? 1 : 2) === 0)) {
    try {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'highpass'; flt.frequency.value = 2000 + wanted * 400;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.15 + wanted * 0.05, t);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(flt); flt.connect(e); e.connect(music.percGain);
      src.start(t); src.stop(t + 0.05);
    } catch (e) {}
  }

  // alarm siren blips at wanted 3
  if (wanted >= 3 && music.alarmOsc && step % 4 === 0) {
    music.alarmOsc.frequency.setValueAtTime(step % 8 === 0 ? 660 : 880, t);
  }
}

// tiny dedicated RNG for musical variety (deterministic-ish, self-contained)
let musicSeed = 0x9e3779b1;
function rngMusic() {
  musicSeed |= 0;
  musicSeed = (musicSeed + 0x6d2b79f5) | 0;
  let x = Math.imul(musicSeed ^ (musicSeed >>> 15), 1 | musicSeed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

function applyWanted() {
  if (!music || !ctx) return;
  const t = now();
  // tension voice volume follows wanted
  const tv = wanted >= 2 ? 0.14 + (wanted - 2) * 0.1 : 0.0;
  music.tenseGain.gain.setTargetAtTime(tv, t, 0.6);
  // busier lead vibrato as it heats up
  music.leadVib.frequency.setTargetAtTime(5.2 + wanted * 1.1, t, 0.8);
  // overall a touch louder when hot
  music.busGain.gain.setTargetAtTime(0.5 + wanted * 0.08, t, 1.0);
  // perc + alarm layer
  if (music.percGain) music.percGain.gain.setTargetAtTime(wanted >= 1 ? 0.5 + wanted * 0.15 : 0, t, 0.5);
  if (music.alarmGain) music.alarmGain.gain.setTargetAtTime(wanted >= 3 ? 0.12 : 0, t, 0.4);
  // mp3 bed louder when wanted rises
  if (musicSample) musicSample.g.gain.setTargetAtTime(0.14 + wanted * 0.06, t, 0.8);
}

// -------------------------------------------------------------------------
// public API
// -------------------------------------------------------------------------

export const audio = {
  init() {
    if (ctx) {
      // safe to call twice — just try to resume
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // master -> limiter -> destination
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 6;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp);
    comp.connect(ctx.destination);
    sampleBus = ctx.createGain();
    sampleBus.gain.value = 0.85;
    sampleBus.connect(master);
    noiseBuf = makeNoiseBuffer();
    if (ctx.state === 'suspended') ctx.resume();

    // fire-and-forget sample loads (layered over synth when ready)
    const keys = Object.keys(SAMPLE_MAP);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      loadSample(SAMPLE_MAP[k]).then((buf) => { if (buf) samples[k] = buf; });
    }
    loadSample(BEAM_URL).then((buf) => { if (buf) samples._beam = buf; });
    loadSample(MUSIC_URL).then((buf) => {
      if (buf) {
        samples._music = buf;
        // if music already running, start bed now
        if (music && !musicSample) {
          try {
            const src = ctx.createBufferSource();
            src.buffer = buf; src.loop = true;
            const mg = ctx.createGain();
            mg.gain.value = 0.14 + wanted * 0.06;
            src.connect(mg); mg.connect(sampleBus);
            src.start();
            musicSample = { src, g: mg };
          } catch (e) {}
        }
      }
    });
  },

  play(name, opts = {}) {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const v = opts.vol != null ? opts.vol : 1;
    const p = opts.pitch != null ? opts.pitch : 1;
    // layer sample on top of synth for mapped cues
    if (samples[name]) playSample(name, v * 0.85, p);
    const fn = CUES[name];
    if (!fn) return; // unknown cue: no-op (sample may still have played)
    try { fn(v, p); } catch (e) { /* never throw into the game loop */ }
  },

  startBeam() { beamStart(); },
  stopBeam() { beamStop(); },

  startMusic() { musicStart(); },

  setWanted(level) {
    wanted = Math.max(0, Math.min(3, level | 0));
    applyWanted();
  },
};
