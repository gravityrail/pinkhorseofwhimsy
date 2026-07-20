/**
 * Pinball audio — MP3 clips with WebAudio synth fallback.
 * User-gesture gated (call unlock() from splash onStart).
 */

const SFX_BASE = '/arcade/sfx/';

const CLIPS = {
  bumper: 'pinball-bumper.mp3',
  flipper: 'pinball-flipper.mp3',
  drain: 'pinball-drain.mp3',
  start: 'ui-start.mp3',
  music: 'pinball-music.mp3',
};

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.buffers = {};
    this.musicEl = null;
    this.musicGain = 0.38;
    this.sfxGain = 0.7;
    this._last = Object.create(null);
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      }
    } catch (_) {}
    this._preload();
    this.play('start', { vol: 0.55 });
    this.startMusic();
  }

  _preload() {
    for (const [key, file] of Object.entries(CLIPS)) {
      if (key === 'music') continue;
      const a = new Audio(SFX_BASE + file);
      a.preload = 'auto';
      this.buffers[key] = a;
    }
  }

  startMusic() {
    if (this.musicEl) return;
    try {
      const el = new Audio(SFX_BASE + CLIPS.music);
      el.loop = true;
      el.volume = this.musicGain;
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
      this.musicEl = el;
    } catch (_) {}
  }

  stopMusic() {
    if (!this.musicEl) return;
    try {
      this.musicEl.pause();
      this.musicEl.currentTime = 0;
    } catch (_) {}
    this.musicEl = null;
  }

  setMusicVolume(v) {
    this.musicGain = v;
    if (this.musicEl) this.musicEl.volume = v;
  }

  /** Play named SFX with optional cooldown (ms) to avoid machine-gunning. */
  play(name, { vol = 1, rate = 1, cooldown = 40 } = {}) {
    if (!this.unlocked) return;
    const now = performance.now();
    if (cooldown && this._last[name] && now - this._last[name] < cooldown) return;
    this._last[name] = now;

    const base = this.buffers[name];
    if (base) {
      try {
        const a = base.cloneNode();
        a.volume = Math.min(1, this.sfxGain * vol);
        a.playbackRate = rate;
        const p = a.play();
        if (p && p.catch) {
          p.catch(() => this._synth(name, vol, rate));
        }
        return;
      } catch (_) {
        /* fall through to synth */
      }
    }
    this._synth(name, vol, rate);
  }

  _synth(name, vol = 1, rate = 1) {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (_) {
        return;
      }
    }
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const v = this.sfxGain * vol * 0.35;

    if (name === 'bumper') {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(520 * rate, t);
      o.frequency.exponentialRampToValueAtTime(180 * rate, t + 0.12);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.15);
    } else if (name === 'flipper') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(90 * rate, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.06);
      g.gain.setValueAtTime(v * 0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.09);
    } else if (name === 'drain') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(280, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.45);
      g.gain.setValueAtTime(v * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.52);
    } else if (name === 'start') {
      [440, 554, 659, 880].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0, t + i * 0.07);
        gg.gain.linearRampToValueAtTime(v * 0.4, t + i * 0.07 + 0.02);
        gg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.18);
        o.connect(gg);
        gg.connect(ctx.destination);
        o.start(t + i * 0.07);
        o.stop(t + i * 0.07 + 0.2);
      });
    } else if (name === 'target') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(660 * rate, t);
      o.frequency.exponentialRampToValueAtTime(990 * rate, t + 0.08);
      g.gain.setValueAtTime(v * 0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.13);
    } else if (name === 'spinner') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(200 + Math.random() * 400, t);
      g.gain.setValueAtTime(v * 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.05);
    } else if (name === 'sling') {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300 * rate, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
      g.gain.setValueAtTime(v * 0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.11);
    } else if (name === 'ramp') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.25);
      g.gain.setValueAtTime(v * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.32);
    } else if (name === 'multiball' || name === 'mode') {
      [523, 659, 784, 1046].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0, t + i * 0.09);
        gg.gain.linearRampToValueAtTime(v * 0.45, t + i * 0.09 + 0.03);
        gg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.28);
        o.connect(gg);
        gg.connect(ctx.destination);
        o.start(t + i * 0.09);
        o.stop(t + i * 0.09 + 0.3);
      });
    } else if (name === 'coin') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(1200, t);
      o.frequency.exponentialRampToValueAtTime(1800, t + 0.08);
      g.gain.setValueAtTime(v * 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.13);
    } else {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 440;
      g.gain.setValueAtTime(v * 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.09);
    }
  }
}
