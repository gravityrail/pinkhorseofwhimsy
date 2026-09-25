// Original, self-contained Web Audio score and game sounds. Audio starts only
// after the player presses Let's Go, satisfying browser gesture restrictions.
const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const MELODY = [76,79,83,79,81,79,76,72, 74,77,81,77,79,76,74,71,
  72,76,79,76,81,79,76,74, 71,74,79,74,76,74,72,69];
const BASS = [48,48,53,53,50,50,43,43];

export class GameSound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.effects = null;
    this.noise = null;
    this.muted = localStorage.getItem('tiger-muted') === '1';
    this.nextBeat = 0;
    this.beat = 0;
    this.lastStep = -1;
    this.nextAnt = 0;
  }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : .72;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = .38; this.music.connect(this.master);
    this.effects = this.ctx.createGain(); this.effects.gain.value = .78; this.effects.connect(this.master);
    this.noise = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * .28), this.ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i=0; i<samples.length; i++) samples[i] = Math.random()*2-1;
    this.jingle();
    this.nextBeat = this.ctx.currentTime + 2.45;
  }
  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('tiger-muted', muted ? '1' : '0');
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : .72, this.ctx.currentTime, .025);
  }
  tone(freq, at, duration, volume, destination, type='sine', pan=0) {
    if (!this.ctx) return;
    const osc=this.ctx.createOscillator(); osc.type=type; osc.frequency.setValueAtTime(freq,at);
    const amp=this.ctx.createGain();
    amp.gain.setValueAtTime(.0001,at);
    amp.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.012);
    amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
    const panner=this.ctx.createStereoPanner(); panner.pan.value=Math.max(-1,Math.min(1,pan));
    osc.connect(amp).connect(panner).connect(destination);
    osc.start(at); osc.stop(at+duration+.02);
    return osc;
  }
  pluck(note, at, duration=.29, volume=.20) {
    const f=midi(note);
    const osc=this.tone(f,at,duration,volume,this.music,'triangle');
    if (osc) osc.frequency.exponentialRampToValueAtTime(f*.995,at+duration);
    this.tone(f*2,at,Math.min(.10,duration),volume*.22,this.music,'sine');
  }
  noiseHit(at, duration, volume, cutoff, pan=0) {
    if (!this.ctx) return;
    const src=this.ctx.createBufferSource(); src.buffer=this.noise;
    const filter=this.ctx.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=cutoff;
    filter.Q.value=.75;
    const amp=this.ctx.createGain(); amp.gain.setValueAtTime(Math.max(.0002,volume),at);
    amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
    const panner=this.ctx.createStereoPanner(); panner.pan.value=Math.max(-1,Math.min(1,pan));
    src.connect(filter).connect(amp).connect(panner).connect(this.effects);
    src.start(at); src.stop(at+Math.min(.27,duration+.015));
  }
  jingle() {
    const t=this.ctx.currentTime+.08;
    [72,76,79,84].forEach((note,i) => {
      this.pluck(note,t+i*.19,.56,.26);
      this.tone(midi(note)*.5,t+i*.19,.48,.06,this.music,'sine');
    });
    this.tone(midi(84),t+.89,.95,.20,this.music,'triangle');
    this.tone(midi(79),t+.89,.85,.08,this.music,'sine');
  }
  scheduleMusic() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now=this.ctx.currentTime;
    while (this.nextBeat < now+.5) {
      const beat=this.beat;
      const at=this.nextBeat;
      const note=MELODY[beat%MELODY.length];
      if (beat%2===0 || beat%8===3) this.pluck(note,at,.30,beat%8===0?.21:.14);
      if (beat%4===0) {
        this.tone(midi(BASS[Math.floor(beat/4)%BASS.length]),at,.45,.12,this.music,'sine');
        this.noiseHit(at,.09,.035,180,0);
      }
      if (beat%4===2) this.noiseHit(at,.07,.020,1650,.18);
      if (beat%2===1) this.noiseHit(at,.035,.008,4300,-.1);
      this.beat++;
      this.nextBeat+=.255;
    }
  }
  footstep(surface, pan=0) {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime;
    if (surface==='grass') {
      this.noiseHit(t,.072,.105,900,pan);
      this.tone(90,t,.065,.018,this.effects,'sine',pan);
    } else if (surface==='wood') {
      this.tone(185,t,.09,.085,this.effects,'triangle',pan);
      this.noiseHit(t,.035,.035,1650,pan);
    } else {
      this.tone(135,t,.075,.10,this.effects,'triangle',pan);
      this.noiseHit(t,.048,.052,2100,pan);
    }
  }
  antChirp(distance, pan=0) {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime;
    const volume=.035+.075*(1-distance/6);
    for (let i=0;i<3;i++) {
      const f=660+i*130+Math.random()*65;
      const osc=this.tone(f,t+i*.067,.075,volume,this.effects,'square',pan);
      if (osc) osc.frequency.exponentialRampToValueAtTime(f*.72,t+i*.067+.075);
    }
  }
  swipe() {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime;
    const air=this.ctx.createBufferSource(); air.buffer=this.noise;
    const filter=this.ctx.createBiquadFilter(); filter.type='bandpass'; filter.Q.value=.65;
    filter.frequency.setValueAtTime(650,t);
    filter.frequency.exponentialRampToValueAtTime(2300,t+.10);
    filter.frequency.exponentialRampToValueAtTime(920,t+.22);
    const envelope=this.ctx.createGain();
    envelope.gain.setValueAtTime(.0001,t);
    envelope.gain.linearRampToValueAtTime(.075,t+.075);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+.23);
    air.connect(filter).connect(envelope).connect(this.effects);
    air.start(t); air.stop(t+.24);
  }
  effort() {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime;
    const length=.23;
    const osc=this.ctx.createOscillator(); osc.type='sawtooth';
    osc.frequency.setValueAtTime(225,t);
    osc.frequency.exponentialRampToValueAtTime(180,t+length*.38);
    osc.frequency.exponentialRampToValueAtTime(145,t+length);
    const voice=this.ctx.createGain();
    voice.gain.setValueAtTime(.0001,t);
    voice.gain.exponentialRampToValueAtTime(.12,t+.035);
    voice.gain.setValueAtTime(.12,t+length*.55);
    voice.gain.exponentialRampToValueAtTime(.0001,t+length);
    const low=this.ctx.createBiquadFilter(); low.type='lowpass'; low.frequency.value=1000;
    const vowel=this.ctx.createBiquadFilter(); vowel.type='peaking';
    vowel.frequency.value=550; vowel.Q.value=1.0; vowel.gain.value=8;
    osc.connect(low).connect(vowel).connect(voice).connect(this.effects);
    osc.start(t); osc.stop(t+length+.02);
  }
  hit() {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime;
    const thump=this.ctx.createOscillator(); thump.type='sine';
    thump.frequency.setValueAtTime(175,t);
    thump.frequency.exponentialRampToValueAtTime(72,t+.17);
    const envelope=this.ctx.createGain();
    envelope.gain.setValueAtTime(.0001,t);
    envelope.gain.exponentialRampToValueAtTime(.20,t+.012);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+.18);
    thump.connect(envelope).connect(this.effects);
    thump.start(t); thump.stop(t+.20);
    this.noiseHit(t,.065,.045,350);
  }
  acWake() {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime;
    this.noiseHit(t,.24,.075,340);
    for (let i=0;i<3;i++) {
      const at=t+i*.19;
      const osc=this.tone(92+i*33,at,.23,.095,this.effects,'sawtooth');
      if (osc) osc.frequency.exponentialRampToValueAtTime(65+i*38,at+.22);
    }
  }
  acStomp(final=false) {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime;
    const osc=this.tone(final ? 125 : 215,t,final ? .65 : .30,.13,this.effects,'triangle');
    if (osc) osc.frequency.exponentialRampToValueAtTime(final ? 45 : 95,
      t+(final ? .64 : .29));
    this.noiseHit(t,final ? .22 : .09,final ? .09 : .045,final ? 300 : 650);
  }
  update(mode, walkTime, walking, grounded, surface, cat, ants) {
    if (!this.ctx || this.ctx.state!=='running') return;
    if (mode==='intro' || mode==='playing') this.scheduleMusic();
    if (walking && grounded && (mode==='intro' || mode==='playing')) {
      const step=Math.floor(walkTime/Math.PI);
      if (step!==this.lastStep) { this.lastStep=step; this.footstep(surface,step%2 ? -.13 : .13); }
    } else this.lastStep=Math.floor(walkTime/Math.PI);
    if (mode!=='playing' || !cat || this.ctx.currentTime<this.nextAnt) return;
    const closest=ants.filter(a=>a.awake).map(a=>({
      distance:Math.hypot(a.model.position.x-cat.x,a.model.position.z-cat.z),
      pan:(a.model.position.x-cat.x)/5,
    })).sort((a,b)=>a.distance-b.distance)[0];
    if (closest?.distance<6) {
      this.antChirp(closest.distance,closest.pan);
      this.nextAnt=this.ctx.currentTime+.50+closest.distance*.18+Math.random()*.25;
    }
  }
}
