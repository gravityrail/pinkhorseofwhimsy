const NOTES = {
  C2: 65.41, D2: 73.42, E2: 82.41, FS2: 92.5, G2: 98, A2: 110, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, FS3: 185, G3: 196, A3: 220, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, FS4: 369.99, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, FS5: 739.99, G5: 783.99, A5: 880, B5: 987.77,
  E6: 1318.51,
};

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.engineSub = null;
    this.engineGain = null;
    this.subGain = null;
    this.engineNoiseGain = null;
    this.engineFilter = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicNodes = new Set();
    this.musicTheme = null;
    this.muted = false;
    this.lastGear = 0;
  }

  createNoiseBuffer(seconds = 2) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1;
    return buffer;
  }

  start() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);

      const engineBus = this.ctx.createGain();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 520;
      engineBus.connect(this.engineFilter).connect(this.master);

      this.engine = this.ctx.createOscillator();
      this.engine.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineGain).connect(engineBus);
      this.engine.start();

      this.engineSub = this.ctx.createOscillator();
      this.engineSub.type = 'square';
      this.subGain = this.ctx.createGain();
      this.subGain.gain.value = 0;
      this.engineSub.connect(this.subGain).connect(engineBus);
      this.engineSub.start();

      const rumble = this.ctx.createBufferSource();
      rumble.buffer = this.createNoiseBuffer();
      rumble.loop = true;
      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'bandpass';
      rumbleFilter.frequency.value = 105;
      rumbleFilter.Q.value = 1.8;
      this.engineNoiseGain = this.ctx.createGain();
      this.engineNoiseGain.gain.value = 0;
      rumble.connect(rumbleFilter).connect(this.engineNoiseGain).connect(engineBus);
      rumble.start();

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.master);
      this.noiseBuffer = this.createNoiseBuffer();
    }
    this.ctx.resume();
  }

  setEngine(speed, throttle, racing, damage = 0) {
    if (!this.ctx) return;
    const gear = Math.min(5, Math.floor(speed / 10));
    const rpmCycle = speed % 11;
    const rpm = 52 + rpmCycle * 7.2 + gear * 6;
    const now = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(rpm, now, 0.035);
    this.engineSub.frequency.setTargetAtTime(30 + speed * 0.72 + throttle * 7, now, 0.055);
    this.engineFilter.frequency.setTargetAtTime(270 + speed * 19 + throttle * 430, now, 0.06);
    this.engineGain.gain.setTargetAtTime(racing ? 0.09 + throttle * 0.055 : 0, now, 0.07);
    this.subGain.gain.setTargetAtTime(racing ? 0.058 + throttle * 0.04 : 0, now, 0.09);
    this.engineNoiseGain.gain.setTargetAtTime(racing ? 0.012 + throttle * 0.022 + damage * 0.025 : 0, now, 0.08);
    if (gear > this.lastGear && speed > 6) this.shift();
    this.lastGear = gear;
  }

  tone(frequency, duration = 0.12, type = 'square', volume = 0.14, slide = 0, when = null) {
    if (!this.ctx || this.muted) return;
    const start = when ?? this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), start + duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.012, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  synthNote(frequency, time, duration, { type = 'triangle', gain = 0.07, filter = 1400, detune = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const oscillator = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    const lowpass = this.ctx.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.detune.value = detune;
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(filter, time);
    amp.gain.setValueAtTime(0.001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(lowpass).connect(amp).connect(this.musicGain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
    this.musicNodes.add(oscillator);
    oscillator.onended = () => this.musicNodes.delete(oscillator);
  }

  percussion(time, kind, gain = 0.05) {
    if (!this.ctx || this.muted) return;
    if (kind === 'kick') {
      const oscillator = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(135, time);
      oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.16);
      amp.gain.setValueAtTime(gain, time);
      amp.gain.exponentialRampToValueAtTime(0.001, time + 0.19);
      oscillator.connect(amp).connect(this.musicGain);
      oscillator.start(time); oscillator.stop(time + 0.2);
      this.musicNodes.add(oscillator);
      oscillator.onended = () => this.musicNodes.delete(oscillator);
      return;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();
    filter.type = kind === 'clap' ? 'bandpass' : 'highpass';
    filter.frequency.value = kind === 'clap' ? 1250 : 5200;
    const duration = kind === 'clap' ? 0.11 : 0.045;
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.001, time + duration);
    source.connect(filter).connect(amp).connect(this.musicGain);
    source.start(time); source.stop(time + duration + 0.01);
    this.musicNodes.add(source);
    source.onended = () => this.musicNodes.delete(source);
  }

  brassNote(frequency, time, duration, gain = 0.095) {
    if (!this.ctx || this.muted) return;
    for (const [type, detune, level] of [['sawtooth', -5, 1], ['square', 7, 0.3]]) {
      const oscillator = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const amp = this.ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.detune.value = detune;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, time);
      filter.frequency.exponentialRampToValueAtTime(2300, time + Math.min(0.1, duration * 0.3));
      filter.frequency.exponentialRampToValueAtTime(900, time + duration);
      amp.gain.setValueAtTime(0.001, time);
      amp.gain.exponentialRampToValueAtTime(gain * level, time + 0.035);
      amp.gain.setValueAtTime(gain * level * 0.82, time + duration * 0.62);
      amp.gain.exponentialRampToValueAtTime(0.001, time + duration);
      oscillator.connect(filter).connect(amp).connect(this.master);
      oscillator.start(time); oscillator.stop(time + duration + 0.03);
    }
  }

  fanfare(theme = 'sunset') {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + 0.08;
    const lines = {
      night: [[NOTES.E4, 0, 0.2], [NOTES.B4, 0.23, 0.2], [NOTES.E5, 0.46, 0.3], [NOTES.FS5, 0.82, 0.18], [NOTES.E5, 1.04, 0.48]],
      // Slow, wide intervals — mission control clearing you for launch.
      space: [[NOTES.E4, 0, 0.34], [NOTES.A4, 0.4, 0.34], [NOTES.E5, 0.8, 0.42], [NOTES.B5, 1.28, 0.6]],
      // A bugle call for the 1892 main street.
      western: [[NOTES.C4, 0, 0.16], [NOTES.E4, 0.18, 0.16], [NOTES.G4, 0.36, 0.16], [NOTES.C5, 0.54, 0.34], [NOTES.G4, 0.94, 0.18], [NOTES.C5, 1.14, 0.5]],
      // Bouncy sugar-rush fanfare for Candy Canyon.
      candy: [[NOTES.G4, 0, 0.14], [NOTES.B4, 0.16, 0.14], [NOTES.D5, 0.32, 0.14], [NOTES.G5, 0.5, 0.28], [NOTES.E5, 0.84, 0.16], [NOTES.G5, 1.04, 0.42]],
      sunset: [[NOTES.D4, 0, 0.2], [NOTES.FS4, 0.22, 0.2], [NOTES.A4, 0.44, 0.28], [NOTES.D5, 0.78, 0.2], [NOTES.FS5, 1.02, 0.5]],
    };
    const line = lines[theme] || lines.sunset;
    line.forEach(([note, offset, duration], index) => this.brassNote(note, start + offset, duration, 0.075 + index * 0.006));
  }

  scheduleDayStep(step, time, beat) {
    if (step % 4 === 0) this.percussion(time, 'kick', 0.095);
    if (step === 4 || step === 12) this.percussion(time, 'clap', 0.045);
    if (step % 2 === 1) this.percussion(time, 'hat', 0.018);
    const bass = [NOTES.D2, NOTES.D2, NOTES.A2, NOTES.A2, NOTES.B2, NOTES.B2, NOTES.FS2, NOTES.A2];
    if (step % 2 === 0) this.synthNote(bass[step / 2], time, beat * 1.55, { type: 'square', gain: 0.038, filter: 620 });
    const chords = [
      [NOTES.D3, NOTES.FS3, NOTES.A3], [NOTES.A2, NOTES.D3, NOTES.FS3],
      [NOTES.B2, NOTES.D3, NOTES.FS3], [NOTES.A2, NOTES.E3, NOTES.FS3],
    ];
    if (step % 4 === 0) chords[step / 4].forEach((note) => this.synthNote(note, time, beat * 3.6, { type: 'triangle', gain: 0.024, filter: 1900 }));
    const melody = [NOTES.FS4, NOTES.A4, NOTES.D5, NOTES.A4, NOTES.B4, NOTES.D5, NOTES.FS5, NOTES.E5];
    if (step % 2 === 0) this.synthNote(melody[step / 2], time, beat * 1.35, { type: 'triangle', gain: 0.038, filter: 3000, detune: 3 });
  }

  scheduleNightStep(step, time, beat) {
    if (step % 4 === 0) this.percussion(time, 'kick', 0.12);
    if (step === 4 || step === 12) this.percussion(time, 'clap', 0.055);
    if (step % 2 === 0) this.percussion(time, 'hat', step % 4 ? 0.025 : 0.016);
    const bass = [NOTES.E2, NOTES.E2, NOTES.E2, NOTES.B2, NOTES.D3, NOTES.D3, NOTES.B2, NOTES.FS2];
    if (step % 2 === 0) this.synthNote(bass[step / 2], time, beat * 1.7, { type: 'sawtooth', gain: 0.045, filter: 520 });
    const arp = [NOTES.E4, NOTES.B4, NOTES.E5, NOTES.FS5, NOTES.D5, NOTES.B4, NOTES.FS4, NOTES.B4];
    if (step % 2 === 0) {
      this.synthNote(arp[step / 2], time, beat * 1.35, { type: 'sawtooth', gain: 0.034, filter: 2600, detune: -6 });
      this.synthNote(arp[step / 2] * 0.5, time, beat * 1.5, { type: 'square', gain: 0.016, filter: 1300, detune: 6 });
    }
    if (step === 0 || step === 8) [NOTES.E3, NOTES.B3, NOTES.E4].forEach((note) => this.synthNote(note, time, beat * 7.2, { type: 'sawtooth', gain: 0.02, filter: 1250 }));
  }

  // Drifting synth pads and a slow sparkle arp for the orbital circuit.
  scheduleSpaceStep(step, time, beat) {
    if (step === 0) this.percussion(time, 'kick', 0.06);
    if (step % 4 === 2) this.percussion(time, 'hat', 0.012);
    if (step === 0) {
      [NOTES.E3, NOTES.B3, NOTES.D4, NOTES.FS4].forEach((note) => this.synthNote(note, time, beat * 13, { type: 'triangle', gain: 0.02, filter: 1100, detune: 4 }));
      this.synthNote(NOTES.E2, time, beat * 15, { type: 'sine', gain: 0.05, filter: 320 });
    }
    if (step === 8) this.synthNote(NOTES.B2, time, beat * 7, { type: 'sine', gain: 0.04, filter: 320 });
    const sparkle = [NOTES.E5, NOTES.FS5, NOTES.B5, NOTES.E6, NOTES.B5, NOTES.FS5, NOTES.D5, NOTES.B4];
    if (step % 2 === 0) this.synthNote(sparkle[step / 2], time, beat * 1.9, { type: 'sine', gain: 0.02, filter: 5200, detune: -4 });
  }

  // Saloon-piano oom-pah in C for the gold-rush main street.
  scheduleWesternStep(step, time, beat) {
    if (step === 0) this.synthNote(NOTES.C2, time, beat * 1.8, { type: 'triangle', gain: 0.055, filter: 480 });
    if (step === 8) this.synthNote(NOTES.G2, time, beat * 1.8, { type: 'triangle', gain: 0.055, filter: 480 });
    if (step === 4 || step === 12) {
      [NOTES.C3, NOTES.E3, NOTES.G3].forEach((note) => this.synthNote(note, time, beat * 1.4, { type: 'square', gain: 0.018, filter: 1500 }));
      this.percussion(time, 'hat', 0.014);
    }
    const melody = [NOTES.G4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.G4, NOTES.C5, NOTES.A4, NOTES.G4];
    if (step % 2 === 0) this.synthNote(melody[step / 2], time, beat * 1.6, { type: 'square', gain: 0.026, filter: 2300, detune: 9 });
    if (step === 6 || step === 14) this.percussion(time, 'clap', 0.026);
  }

  // Driving surf rock for present-day California streets.
  scheduleSurfStep(step, time, beat) {
    if (step % 8 === 0) this.percussion(time, 'kick', 0.1);
    if (step === 4 || step === 12) this.percussion(time, 'clap', 0.05);
    if (step % 2 === 1) this.percussion(time, 'hat', 0.02);
    const bass = [NOTES.A2, NOTES.A2, NOTES.A2, NOTES.A2, NOTES.C3, NOTES.C3, NOTES.G2, NOTES.G2];
    if (step % 2 === 0) this.synthNote(bass[step / 2], time, beat * 1.5, { type: 'square', gain: 0.042, filter: 560 });
    const lead = [NOTES.A4, NOTES.C5, NOTES.E5, NOTES.D5, NOTES.C5, NOTES.A4, NOTES.G4, NOTES.A4];
    if (step % 2 === 0) this.synthNote(lead[step / 2], time, beat * 1.25, { type: 'sawtooth', gain: 0.03, filter: 2800, detune: -8 });
    if (step === 0) [NOTES.A3, NOTES.C4, NOTES.E4].forEach((note) => this.synthNote(note, time, beat * 3.4, { type: 'triangle', gain: 0.016, filter: 1600 }));
  }

  // A didgeridoo-style drone with clapstick accents for the long red highway.
  scheduleOutbackStep(step, time, beat) {
    if (step === 0) {
      this.synthNote(NOTES.E2 / 2, time, beat * 15.4, { type: 'sawtooth', gain: 0.05, filter: 210 });
      this.synthNote(NOTES.E2, time, beat * 15.4, { type: 'sawtooth', gain: 0.02, filter: 340, detune: 6 });
    }
    if (step === 0 || step === 6 || step === 8 || step === 14) this.percussion(time, 'hat', step % 8 ? 0.02 : 0.03);
    if (step % 8 === 2) this.percussion(time, 'kick', 0.07);
    const melody = [NOTES.E4, null, NOTES.G4, null, NOTES.A4, null, NOTES.B4, NOTES.G4];
    const note = step % 2 === 0 ? melody[step / 2] : null;
    if (note && Math.floor(step / 2) % 2 === 0) this.synthNote(note, time, beat * 2.6, { type: 'triangle', gain: 0.024, filter: 1900 });
  }

  // Bouncy major-key sugar pop for Candy Canyon — xylophone-ish sparkles.
  scheduleCandyStep(step, time, beat) {
    if (step % 4 === 0) this.percussion(time, 'kick', 0.08);
    if (step === 4 || step === 12) this.percussion(time, 'clap', 0.04);
    if (step % 2 === 1) this.percussion(time, 'hat', 0.022);
    const bass = [NOTES.G2, NOTES.G2, NOTES.D3, NOTES.D3, NOTES.E3, NOTES.E3, NOTES.C3, NOTES.D3];
    if (step % 2 === 0) this.synthNote(bass[step / 2], time, beat * 1.5, { type: 'square', gain: 0.036, filter: 580 });
    const sparkle = [NOTES.G5, NOTES.B5, NOTES.D5, NOTES.G5, NOTES.A5, NOTES.B5, NOTES.D5, NOTES.E5];
    if (step % 2 === 0) this.synthNote(sparkle[step / 2], time, beat * 1.1, { type: 'triangle', gain: 0.034, filter: 4800, detune: 5 });
    if (step % 4 === 0) {
      [NOTES.G3, NOTES.B3, NOTES.D4].forEach((note) => this.synthNote(note, time, beat * 3.4, { type: 'sine', gain: 0.018, filter: 2200 }));
    }
  }

  startMusic(theme = 'sunset') {
    if (!this.ctx) return;
    this.stopMusic();
    this.musicTheme = theme;
    const arrangements = {
      night: { step: (s, t, b) => this.scheduleNightStep(s, t, b), bpm: 148, gain: 0.5 },
      space: { step: (s, t, b) => this.scheduleSpaceStep(s, t, b), bpm: 112, gain: 0.52 },
      western: { step: (s, t, b) => this.scheduleWesternStep(s, t, b), bpm: 116, gain: 0.5 },
      surf: { step: (s, t, b) => this.scheduleSurfStep(s, t, b), bpm: 140, gain: 0.46 },
      outback: { step: (s, t, b) => this.scheduleOutbackStep(s, t, b), bpm: 92, gain: 0.5 },
      candy: { step: (s, t, b) => this.scheduleCandyStep(s, t, b), bpm: 150, gain: 0.48 },
      sunset: { step: (s, t, b) => this.scheduleDayStep(s, t, b), bpm: 132, gain: 0.46 },
    };
    const arrangement = arrangements[theme] || arrangements.sunset;
    this.musicGain.gain.setTargetAtTime(arrangement.gain, this.ctx.currentTime, 0.08);
    const beat = 60 / arrangement.bpm / 4;
    let step = 0;
    let nextTime = this.ctx.currentTime + 0.08;
    const schedule = () => {
      while (nextTime < this.ctx.currentTime + 0.14) {
        arrangement.step(step, nextTime, beat);
        step = (step + 1) % 16;
        nextTime += beat;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 45);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    for (const node of this.musicNodes) { try { node.stop(); } catch { /* already stopped */ } }
    this.musicNodes.clear();
    this.musicTheme = null;
  }

  crash(impactSpeed = 3) {
    if (!this.ctx || this.muted) return;
    const strength = Math.max(0.08, Math.min(1, impactSpeed / 18));
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520 + strength * 1700, now);
    filter.frequency.exponentialRampToValueAtTime(170, now + 0.08 + strength * 0.2);
    gain.gain.setValueAtTime(0.045 + strength * 0.19, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07 + strength * 0.28);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now); source.stop(now + 0.38);
    this.tone(105 - strength * 38, 0.09 + strength * 0.2, 'sawtooth', 0.05 + strength * 0.1, -42, now);
    if (strength > 0.55) this.tone(290, 0.12, 'square', strength * 0.045, -180, now + 0.018);
  }

  shift() { this.tone(190, 0.07, 'square', 0.07, -70); }
  countdown(final = false) {
    this.tone(final ? 780 : 365, final ? 0.38 : 0.14, 'sine', 0.14, final ? 360 : 80);
    this.tone(final ? 1170 : 520, final ? 0.26 : 0.1, 'square', 0.035, final ? 260 : 40);
  }
  bump() { this.crash(2.2); }
  lap() { this.tone(520, 0.2, 'triangle', 0.16, 360); }
  repair() {
    [440, 554.37, 659.25, 880].forEach((note, index) => this.tone(note, 0.18, 'sine', 0.065, 90, this.ctx.currentTime + index * 0.075));
  }
  boost() {
    // Prefer the shared arcade mp3 whoosh; fall back to synthesized ramp.
    if (this.playSample('/arcade/sfx/kart-boost.mp3', 0.55)) return;
    this.tone(155, 0.42, 'sawtooth', 0.13, 760);
    window.setTimeout(() => this.tone(480, 0.24, 'square', 0.075, 320), 80);
  }
  itemPickup() {
    if (this.playSample('/arcade/sfx/kart-item.mp3', 0.6)) return;
    this.tone(620, 0.12, 'triangle', 0.12, 420);
    this.tone(880, 0.16, 'sine', 0.1, 280, this.ctx?.currentTime + 0.06);
  }

  playSample(url, volume = 0.5) {
    if (this.muted) return true;
    try {
      const audio = new Audio(url);
      audio.volume = volume;
      const play = audio.play();
      if (play && play.catch) play.catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.2;
    return this.muted;
  }
}
