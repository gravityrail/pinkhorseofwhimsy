import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

type GamePhase = "title" | "cutscene" | "briefing" | "playing" | "paused" | "gameover" | "victory";
type Level = 0 | 1 | 2;
type Character = "bean" | "asa" | "lola" | "tiger";
type EnemyKind = "fighter" | "interceptor" | "bot" | "bomber" | "asteroid" | "turret" | "boss";
type Formation = "wedge" | "pincer" | "wall" | "helix" | "escort" | "cross";
type UpgradeKind = "double" | "rapid" | "bomb";

type HUDState = {
  shield: number;
  score: number;
  combo: number;
  progress: number;
  level: Level;
  objective: string;
  boss: number;
  wave: number;
  waveName: string;
  doubleTime: number;
  rapidTime: number;
  bombs: number;
  bombCharge: number;
};

type Comms = { character: Character; name: string; line: string } | null;

const LEVELS = [
  {
    code: "01",
    name: "AURELIA PRIME",
    kicker: "ORBITAL BREACH",
    objective: "Punch through TigerTron’s worship satellites",
    color: "#74d9ff",
  },
  {
    code: "02",
    name: "THE RATTLEBELT",
    kicker: "ASTEROID AMBUSH",
    objective: "Hunt the stolen Bean-O-Phone signal",
    color: "#ff9f43",
  },
  {
    code: "03",
    name: "KALDERA IX SURFACE",
    kicker: "VALLEY RUN",
    objective: "Run the ember valleys and silence TigerTron’s ground batteries",
    color: "#ff4f70",
  },
] as const;

const STORY: Record<Level, Comms[]> = {
  0: [
    { character: "asa", name: "ASA // SLOW OPS", line: "I found the breach. Only took... three... keystrokes." },
    { character: "lola", name: "LOLA // DEEP COVER", line: "Darling, those satellites are offensively unfabulous." },
    { character: "bean", name: "SPACE BEAN", line: "Little paws. Big responsibility. Let’s fly." },
  ],
  1: [
    { character: "tiger", name: "TIGERTRON", line: "Come running, Little Bean. I have knocked over a MOON." },
    { character: "asa", name: "ASA // SLOW OPS", line: "Hack complete. I pressed A... S... A." },
    { character: "lola", name: "LOLA // DEEP COVER", line: "I’m undercover as an asteroid. It’s very slimming." },
  ],
  2: [
    { character: "bean", name: "SPACE BEAN", line: "Surface lock. Taking the river valley straight to Tiger’s fortress." },
    { character: "tiger", name: "TIGERTRON", line: "Never. The universe will adore me—or pick up after me!" },
    { character: "asa", name: "ASA // SLOW OPS", line: "Ground batteries mapped. I only pressed... three... keys." },
  ],
};

const CUTSCENES = [
  {
    image: `${import.meta.env.BASE_URL}cutscenes/01-beanophone.png`,
    audio: `${import.meta.env.BASE_URL}audio/00-narrator.mp3`,
    speaker: "MISSION ARCHIVE",
    line: "Grass Valley, California. Midnight. In a modest Victorian house, the smallest guardian in the galaxy is about to get a very long-distance call.",
    location: "GRASS VALLEY // EARTH",
    focus: "center",
  },
  {
    image: `${import.meta.env.BASE_URL}cutscenes/01-beanophone.png`,
    audio: `${import.meta.env.BASE_URL}audio/01-bean.mp3`,
    speaker: "LITTLE BEAN",
    line: "The Galactic Bean-O-Phone... TigerTron. Of course. Okay, Little Bean—big breath. Someone out there needs Space Bean.",
    location: "INCOMING // PRIORITY OMEGA",
    focus: "left",
  },
  {
    image: `${import.meta.env.BASE_URL}cutscenes/04-tiger-scheme.png`,
    audio: `${import.meta.env.BASE_URL}audio/02-tiger.mp3`,
    speaker: "TIGERTRON",
    line: "Citizens of Aurelia! Behold! One tiny push, and every monument in orbit falls. Then the whole universe will come running... to me.",
    location: "INTERCEPTED VILLAINCAST",
    focus: "right",
  },
  {
    image: `${import.meta.env.BASE_URL}cutscenes/02-transformation.png`,
    audio: `${import.meta.env.BASE_URL}audio/03-asa.mp3`,
    speaker: "ASA // SLOW OPS",
    line: "I found his signal. It only took... three... keystrokes. TigerTron is tipping the Aurelia array. If the first satellite falls, they all fall.",
    location: "HIDDEN HANGAR // BELOW THE HOUSE",
    focus: "left",
  },
  {
    image: `${import.meta.env.BASE_URL}cutscenes/02-transformation.png`,
    audio: `${import.meta.env.BASE_URL}audio/04-lola.mp3`,
    speaker: "LOLA // DEEP COVER",
    line: "Darling, I am already undercover at the orbital gala, and trust me: catastrophe is not fabulous. Get in that gorgeous little ship and move!",
    location: "ENCRYPTED ALLY CHANNEL",
    focus: "right",
  },
  {
    image: `${import.meta.env.BASE_URL}cutscenes/03-takeoff.png`,
    audio: `${import.meta.env.BASE_URL}audio/05-launch.mp3`,
    speaker: "SPACE BEAN",
    line: "Chihuahua Two-Three-Seven-Two online. Home behind me. Stars ahead. TigerTron... paws off the universe.",
    location: "LAUNCH VECTOR // AURELIA PRIME",
    focus: "center",
  },
] as const;

const CAMPAIGN_NODES = [
  { name: "GRASS VALLEY", type: "HOME", x: 12, y: 77 },
  { name: "AURELIA PRIME", type: "ORBIT", x: 35, y: 57 },
  { name: "THE RATTLEBELT", type: "NEBULA", x: 59, y: 43 },
  { name: "KALDERA IX", type: "LAIR", x: 84, y: 22 },
] as const;

const MISSION_INTEL = [
  { story: "Aurelia’s seven monuments hold the memories of an entire civilization. TigerTron has turned them into dominoes—and the first one is already falling.", eta: "07 JUMPS", signal: "ASA LOCK" },
  { story: "The villain fled through a graveyard of abandoned freighters. Somewhere inside the Rattlebelt, a stolen Bean-O-Phone relay is still broadcasting.", eta: "03 JUMPS", signal: "HULK 9" },
  { story: "The final vector drops into Kaldera IX’s Emberwash Valley. Follow the turquoise river below the ridgeline, break TigerTron’s ground batteries, and reach the attention engine beyond the burning forest.", eta: "SURFACE DROP", signal: "TERRAIN LOCK" },
] as const;

const CHARACTER_IMAGES: Record<Character, string> = {
  bean: `${import.meta.env.BASE_URL}characters/space-bean.png`,
  tiger: `${import.meta.env.BASE_URL}characters/tigertron.png`,
  asa: `${import.meta.env.BASE_URL}characters/asa.png`,
  lola: `${import.meta.env.BASE_URL}characters/lola-flamingo.png`,
};

type WaveSpec = { time: number; name: string; formation: Formation; units: EnemyKind[] };

const WAVE_PLANS: Record<Level, WaveSpec[]> = {
  0: [
    { time: 2, name: "SPEARHEAD PATROL", formation: "wedge", units: ["fighter", "fighter", "fighter", "fighter", "fighter"] },
    { time: 8, name: "NEEDLE PINCER", formation: "pincer", units: ["interceptor", "interceptor", "interceptor", "interceptor", "interceptor", "interceptor"] },
    { time: 14, name: "ENFORCER WALL", formation: "wall", units: ["bot", "bot", "bot", "bot"] },
    { time: 20, name: "BOMBER ESCORT", formation: "escort", units: ["fighter", "fighter", "bomber", "fighter", "fighter"] },
    { time: 27, name: "CROSSWIND SQUADRON", formation: "cross", units: ["interceptor", "fighter", "interceptor", "fighter", "interceptor", "fighter", "interceptor"] },
    { time: 34, name: "COMMAND SCREEN", formation: "helix", units: ["bot", "fighter", "bomber", "fighter", "bot"] },
  ],
  1: [
    { time: 2, name: "GIANT ROCK FRONT", formation: "wall", units: ["asteroid", "asteroid", "asteroid"] },
    { time: 11, name: "RAZORS IN THE RUBBLE", formation: "pincer", units: ["interceptor", "asteroid", "fighter", "asteroid", "interceptor"] },
    { time: 20, name: "SPLINTER STORM", formation: "wedge", units: ["asteroid", "asteroid", "asteroid", "asteroid"] },
    { time: 30, name: "SALVAGE BOT SWARM", formation: "helix", units: ["bot", "bot", "fighter", "bot", "bot"] },
    { time: 39, name: "HEAVY LIFTERS", formation: "escort", units: ["fighter", "bomber", "asteroid", "bomber", "fighter"] },
    { time: 48, name: "TIGER’S CLAW", formation: "cross", units: ["bot", "interceptor", "bomber", "interceptor", "bot"] },
  ],
  2: [
    { time: 2, name: "VALLEY GATE BATTERY", formation: "wall", units: ["turret", "turret", "turret"] },
    { time: 10, name: "CANYON INTERCEPT", formation: "wedge", units: ["interceptor", "interceptor", "fighter", "interceptor", "interceptor"] },
    { time: 18, name: "RIVER CROSSING", formation: "pincer", units: ["turret", "fighter", "turret", "fighter", "turret"] },
    { time: 27, name: "EMBER FOREST GUARD", formation: "wall", units: ["bot", "turret", "bot", "turret", "bot"] },
    { time: 36, name: "BASALT RIDGE ESCORT", formation: "escort", units: ["interceptor", "bomber", "turret", "bomber", "interceptor"] },
    { time: 46, name: "FORTRESS APPROACH", formation: "cross", units: ["turret", "bot", "fighter", "turret", "fighter", "bot", "turret"] },
  ],
};

const INITIAL_HUD: HUDState = {
  shield: 100,
  score: 0,
  combo: 1,
  progress: 0,
  level: 0,
  objective: LEVELS[0].objective,
  boss: 100,
  wave: 0,
  waveName: "STANDBY",
  doubleTime: 0,
  rapidTime: 0,
  bombs: 2,
  bombCharge: 0,
};

class AudioDirector {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  effects: GainNode | null = null;
  reverb: ConvolverNode | null = null;
  delay: DelayNode | null = null;
  delayFeedback: GainNode | null = null;
  padFilter: BiquadFilterNode | null = null;
  padGain: GainNode | null = null;
  padOscillators: OscillatorNode[] = [];
  musicTimer = 0;
  step = 0;
  muted = false;
  lowShield = false;
  intensity = 0;
  targetIntensity = 0;
  level: Level = 0;

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.28;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.music = this.ctx.createGain();
    this.effects = this.ctx.createGain();
    this.music.gain.value = 0.62;
    this.effects.gain.value = 0.9;
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.8, 2.7);
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.2;
    this.delay = this.ctx.createDelay(1);
    this.delay.delayTime.value = 0.29;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.27;
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(reverbGain);
    this.reverb.connect(reverbGain);
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.music.connect(this.reverb);
    this.effects.connect(this.delay);
    reverbGain.connect(this.master);
    this.master.connect(compressor);
    compressor.connect(this.ctx.destination);
    this.startPad();
    this.musicTimer = window.setInterval(() => this.tick(), 125);
  }

  makeImpulse(duration: number, decay: number) {
    if (!this.ctx) return null;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }

  startPad() {
    if (!this.ctx || !this.music) return;
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.028;
    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = 620;
    this.padFilter.Q.value = 3.5;
    this.padGain.connect(this.padFilter);
    this.padFilter.connect(this.music);
    [55, 82.41, 110, 164.81].forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = index % 2 ? "triangle" : "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = (index - 1.5) * 7;
      gain.gain.value = index === 0 ? 0.6 : 0.28;
      osc.connect(gain);
      gain.connect(this.padGain!);
      osc.start();
      this.padOscillators.push(osc);
    });
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.075;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(this.padFilter.frequency);
    lfo.start();
    this.padOscillators.push(lfo);
  }

  tone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.08, delay = 0) {
    if (!this.ctx || !this.effects || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.effects);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  tick() {
    if (!this.ctx || !this.music || this.muted) return;
    this.intensity += (this.targetIntensity - this.intensity) * 0.12;
    const now = this.ctx.currentTime;
    if (this.padFilter) this.padFilter.frequency.setTargetAtTime(520 + this.intensity * 1700, now, 0.18);
    if (this.padGain) this.padGain.gain.setTargetAtTime(0.025 + this.intensity * 0.026, now, 0.25);
    if (this.delayFeedback) this.delayFeedback.gain.setTargetAtTime(0.22 + this.intensity * 0.2, now, 0.2);
    const scales = [
      [220, 277.2, 329.6, 440, 392, 329.6, 277.2, 246.9],
      [196, 233.1, 293.7, 392, 349.2, 293.7, 261.6, 233.1],
      [174.6, 207.7, 261.6, 349.2, 311.1, 261.6, 233.1, 207.7],
    ];
    const melody = this.lowShield ? [110, 110, 146.8, 110, 98, 98, 123.5, 82.4] : scales[this.level];
    const note = melody[this.step % melody.length];
    if (this.step % (this.intensity > 0.55 ? 1 : 2) === 0) this.musicTone(note * (this.step % 8 === 7 ? 2 : 1), 0.2, "triangle", 0.018 + this.intensity * 0.024);
    if (this.step % 4 === 0) this.musicTone(note / 2, 0.55, "sawtooth", 0.014 + this.intensity * 0.018);
    if (this.intensity > 0.25 && this.step % (this.intensity > 0.72 ? 2 : 4) === 0) this.percussion(this.step % 8 === 0 ? 72 : 125, this.step % 8 === 0 ? 0.095 : 0.035);
    if (this.intensity > 0.7 && this.step % 2 === 1) this.musicTone(note * 4, 0.055, "square", 0.008);
    if (this.lowShield && this.step % 4 === 0) {
      this.tone(880, 0.08, "square", 0.055);
      this.tone(660, 0.08, "square", 0.04, 0.1);
    }
    this.step++;
  }

  musicTone(freq: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = 900 + this.intensity * 2600;
    filter.Q.value = 5;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.music);
    if (this.reverb) gain.connect(this.reverb);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  percussion(freq: number, volume: number) {
    if (!this.ctx || !this.music) return;
    const length = Math.floor(this.ctx.sampleRate * 0.11);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = freq < 100 ? "lowpass" : "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 2;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.music);
    source.start();
  }

  setIntensity(value: number, level: Level) {
    this.targetIntensity = THREE.MathUtils.clamp(value, 0, 1);
    this.level = level;
  }

  shot() {
    this.tone(720, 0.08, "square", 0.055);
    this.tone(1180, 0.055, "sine", 0.03, 0.025);
  }

  hit() {
    this.tone(90, 0.35, "sawtooth", 0.12);
    this.tone(48, 0.5, "square", 0.08);
  }

  boost() {
    if (!this.ctx || !this.master || this.muted) return;
    for (let i = 0; i < 6; i++) this.tone(120 + i * 50, 0.18, "sawtooth", 0.03, i * 0.025);
  }

  success() {
    [261.6, 329.6, 392, 523.3].forEach((f, i) => this.tone(f, 0.7, "triangle", 0.07, i * 0.12));
  }

  upgrade() {
    [440, 660, 880].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.055, i * 0.07));
  }

  bomb(charge: number) {
    this.tone(58, 0.7, "sawtooth", 0.15);
    this.tone(90 + charge * 55, 0.48, "square", 0.09, 0.03);
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  destroy() {
    window.clearInterval(this.musicTimer);
    this.padOscillators.forEach((osc) => osc.stop());
    void this.ctx?.close();
  }
}

type Enemy = {
  mesh: THREE.Group;
  hp: number;
  radius: number;
  boss?: boolean;
  phase: number;
  type: EnemyKind;
  speed: number;
  damage: number;
  anchor: THREE.Vector2;
  formation: Formation;
  slot: number;
  squadSize: number;
  waveId: number;
  asteroidTier: number;
  driftX: number;
  driftY: number;
  previous: THREE.Vector3;
  fireCooldown: number;
};

type Laser = { mesh: THREE.Mesh; velocity: THREE.Vector3; previous: THREE.Vector3 };
type EnemyShot = { mesh: THREE.Mesh; velocity: THREE.Vector3; previous: THREE.Vector3 };
type UpgradePickup = { mesh: THREE.Group; kind: UpgradeKind; life: number; phase: number };
type ActiveBomb = { mesh: THREE.Group; age: number };
type TreeTarget = { x: number; y: number; z: number; scale: number; index: number; active: boolean; burning: number; fireTick: number };
type SurfaceSet = { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture };
type Nebula = { group: THREE.Group; materials: THREE.ShaderMaterial[]; speed: number };

const surfaceCache = new Map<string, SurfaceSet>();
const asteroidGeometryCache: THREE.BufferGeometry[] = [];
let asteroidMaterialCache: THREE.MeshStandardMaterial[] = [];
const asteroidRimMaterial = new THREE.MeshBasicMaterial({ color: "#8dc8ee", transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false });

const ENEMY_STATS: Record<EnemyKind, { hp: number; radius: number; speed: number; damage: number; score: number }> = {
  fighter: { hp: 2, radius: 0.92, speed: 22, damage: 14, score: 1200 },
  interceptor: { hp: 1, radius: 0.72, speed: 30, damage: 12, score: 1450 },
  bot: { hp: 3, radius: 1.05, speed: 17, damage: 18, score: 1850 },
  bomber: { hp: 6, radius: 1.45, speed: 13, damage: 26, score: 3200 },
  asteroid: { hp: 2, radius: 1.05, speed: 19, damage: 22, score: 900 },
  turret: { hp: 4, radius: 1.08, speed: 10, damage: 16, score: 2200 },
  boss: { hp: 48, radius: 3.7, speed: 7, damage: 35, score: 25000 },
};

function segmentHitsSphere(start: THREE.Vector3, end: THREE.Vector3, center: THREE.Vector3, radius: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  if (lengthSq === 0) return start.distanceToSquared(center) <= radius * radius;
  const t = THREE.MathUtils.clamp(((center.x - start.x) * dx + (center.y - start.y) * dy + (center.z - start.z) * dz) / lengthSq, 0, 1);
  const cx = start.x + dx * t - center.x;
  const cy = start.y + dy * t - center.y;
  const cz = start.z + dz * t - center.z;
  return cx * cx + cy * cy + cz * cz <= radius * radius;
}

function formationSlot(formation: Formation, slot: number, count: number) {
  const center = (count - 1) / 2;
  const relative = slot - center;
  switch (formation) {
    case "wedge": return new THREE.Vector2(relative * 2.25, -Math.abs(relative) * 1.15 + 1.8);
    case "pincer": return new THREE.Vector2(relative * 2.45, Math.abs(relative) * 0.78 - 1.3);
    case "wall": return new THREE.Vector2(relative * 2.35, slot % 2 === 0 ? 1.35 : -1.15);
    case "helix": {
      const angle = (slot / Math.max(1, count)) * Math.PI * 2;
      return new THREE.Vector2(Math.cos(angle) * 4.8, Math.sin(angle) * 2.8);
    }
    case "escort": return slot === Math.floor(center) ? new THREE.Vector2(0, 0.5) : new THREE.Vector2(relative * 2.2, -Math.abs(relative) * 0.5 + 1.5);
    case "cross": return slot % 2 === 0 ? new THREE.Vector2(relative * 1.9, 0) : new THREE.Vector2(0, relative * 1.25);
  }
}

function seededNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 45.164) * 43758.5453;
  return value - Math.floor(value);
}

function kalderaValleyCenter(z: number) {
  return Math.sin(z * 0.018) * 3.8 + Math.sin(z * 0.043 + 1.2) * 1.35;
}

function kalderaRiverCenter(z: number) {
  return kalderaValleyCenter(z) - 2.3 + Math.sin(z * 0.031 + 0.7) * 1.4;
}

function kalderaTerrainHeight(x: number, z: number) {
  const center = kalderaValleyCenter(z);
  const valleyDistance = Math.abs(x - center);
  const ridge = Math.pow(Math.max(0, valleyDistance - 5.2), 1.42) * 0.105;
  const rolling = Math.sin(x * 0.34 + z * 0.055) * 0.42 + Math.sin(z * 0.12 - x * 0.08) * 0.22;
  const riverCut = Math.exp(-Math.pow((x - kalderaRiverCenter(z)) / 1.6, 2)) * 0.55;
  return -5.35 + ridge + rolling - riverCut;
}

function makeProceduralSurface(name: string, base: string, accent: string, seed: number): SurfaceSet {
  const cached = surfaceCache.get(name);
  if (cached) return cached;
  const size = 256;
  const albedoCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  const roughCanvas = document.createElement("canvas");
  albedoCanvas.width = bumpCanvas.width = roughCanvas.width = size;
  albedoCanvas.height = bumpCanvas.height = roughCanvas.height = size;
  const albedo = albedoCanvas.getContext("2d")!;
  const bump = bumpCanvas.getContext("2d")!;
  const rough = roughCanvas.getContext("2d")!;
  const albedoData = albedo.createImageData(size, size);
  const bumpData = bump.createImageData(size, size);
  const roughData = rough.createImageData(size, size);
  const baseColor = new THREE.Color(base);
  const accentColor = new THREE.Color(accent);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value = 0;
      let amplitude = 0.56;
      let frequency = 0.018;
      for (let octave = 0; octave < 5; octave++) {
        value += (seededNoise(Math.floor(x * frequency), Math.floor(y * frequency), seed + octave) * 2 - 1) * amplitude;
        amplitude *= 0.52;
        frequency *= 2.1;
      }
      value += Math.sin((x + Math.sin(y * 0.019) * 36) * 0.035 + seed) * 0.18;
      const normalized = THREE.MathUtils.clamp(value * 0.52 + 0.5, 0, 1);
      const color = baseColor.clone().lerp(accentColor, Math.pow(normalized, 1.35));
      const index = (y * size + x) * 4;
      albedoData.data[index] = color.r * 255;
      albedoData.data[index + 1] = color.g * 255;
      albedoData.data[index + 2] = color.b * 255;
      albedoData.data[index + 3] = 255;
      const height = Math.floor(normalized * 255);
      bumpData.data[index] = bumpData.data[index + 1] = bumpData.data[index + 2] = height;
      bumpData.data[index + 3] = 255;
      const roughValue = Math.floor((0.45 + (1 - normalized) * 0.5) * 255);
      roughData.data[index] = roughData.data[index + 1] = roughData.data[index + 2] = roughValue;
      roughData.data[index + 3] = 255;
    }
  }
  albedo.putImageData(albedoData, 0, 0);
  bump.putImageData(bumpData, 0, 0);
  rough.putImageData(roughData, 0, 0);
  const configure = (texture: THREE.CanvasTexture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const set = {
    map: configure(new THREE.CanvasTexture(albedoCanvas)),
    bump: new THREE.CanvasTexture(bumpCanvas),
    roughness: new THREE.CanvasTexture(roughCanvas),
  };
  surfaceCache.set(name, set);
  return set;
}

function makeGasGiantTexture() {
  const cached = surfaceCache.get("rattlebelt-gas-bands");
  if (cached) return cached.map;
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(canvas.width, canvas.height);
  const palette = [new THREE.Color("#2a173f"), new THREE.Color("#9c6a92"), new THREE.Color("#e8b88f"), new THREE.Color("#f1dec2"), new THREE.Color("#6f416f")];
  for (let y = 0; y < canvas.height; y++) {
    const latitude = y / canvas.height;
    const band = Math.sin(latitude * Math.PI * 24) * 0.5 + Math.sin(latitude * Math.PI * 57) * 0.18;
    for (let x = 0; x < canvas.width; x++) {
      const turbulence = Math.sin(x * 0.018 + Math.sin(y * 0.08) * 3.2) * 0.12 + seededNoise(Math.floor(x / 20), Math.floor(y / 9), 77) * 0.15;
      const value = THREE.MathUtils.clamp(latitude * 1.8 + band * 0.44 + turbulence, 0, 1);
      const scaled = value * (palette.length - 1);
      const indexA = Math.min(palette.length - 1, Math.floor(scaled));
      const indexB = Math.min(palette.length - 1, indexA + 1);
      const color = palette[indexA].clone().lerp(palette[indexB], scaled - indexA);
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = color.r * 255;
      image.data[offset + 1] = color.g * 255;
      image.data[offset + 2] = color.b * 255;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const storm = context.createRadialGradient(470, 235, 2, 470, 235, 65);
  storm.addColorStop(0, "rgba(255,232,195,.95)");
  storm.addColorStop(0.35, "rgba(210,110,94,.76)");
  storm.addColorStop(0.72, "rgba(102,47,92,.35)");
  storm.addColorStop(1, "rgba(0,0,0,0)");
  context.save();
  context.translate(470, 235);
  context.scale(1.9, 0.62);
  context.translate(-470, -235);
  context.fillStyle = storm;
  context.fillRect(390, 170, 160, 130);
  context.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const placeholder = { map: texture, bump: texture, roughness: texture };
  surfaceCache.set("rattlebelt-gas-bands", placeholder);
  return texture;
}

function displacePlanetGeometry(geometry: THREE.SphereGeometry, seed: number, strength: number) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const normal = vertex.clone().normalize();
    const ridge = Math.sin(normal.x * 17 + seed) * Math.sin(normal.y * 23 - seed) * Math.sin(normal.z * 19);
    const detail = seededNoise(Math.floor((normal.x + 1) * 32), Math.floor((normal.y + 1) * 32), seed) - 0.5;
    vertex.addScaledVector(normal, (ridge * 0.58 + detail * 0.42) * strength);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createStarLayer(count: number, spread: number, depth: number, color: string, pointSize: number) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.58;
    positions[i * 3 + 2] = 12 - Math.random() * depth;
    scales[i] = 0.5 + Math.pow(Math.random(), 3) * 3.2;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: pointSize } },
    vertexShader: `
      attribute float aScale; attribute float aPhase; uniform float uTime; uniform float uSize; varying float vGlow;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float pulse=.72+.28*sin(uTime*1.8+aPhase); vGlow=pulse; gl_PointSize=uSize*aScale*pulse*(150.0/max(1.0,-mv.z)); gl_Position=projectionMatrix*mv; }
    `,
    fragmentShader: `
      uniform vec3 uColor; varying float vGlow;
      void main(){ vec2 p=gl_PointCoord-.5; float d=length(p); float core=smoothstep(.3,0.0,d); float flare=smoothstep(.5,.08,abs(p.x))*smoothstep(.12,0.0,abs(p.y))+smoothstep(.5,.08,abs(p.y))*smoothstep(.12,0.0,abs(p.x)); float a=(core+flare*.28)*vGlow; if(a<.02)discard; gl_FragColor=vec4(uColor*(1.2+core),a); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

function createNebula(color: string, position: THREE.Vector3, scale: THREE.Vector2, seed: number, opacity = 0.3): Nebula {
  const group = new THREE.Group();
  group.position.copy(position);
  const materials: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < 3; i++) {
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: seed * 9 + i }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity * (1 - i * 0.12) }, uSeed: { value: seed + i * 2.7 } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uSeed;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed)*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=.52;mat2 r=mat2(.82,-.57,.57,.82);for(int i=0;i<6;i++){v+=a*noise(p);p=r*p*2.03+7.1;a*=.5;}return v;}
        void main(){vec2 uv=vUv-.5;float radius=length(uv);float angle=atan(uv.y,uv.x);uv*=mat2(cos(.22*sin(uTime*.07)), -sin(.22*sin(uTime*.07)), sin(.22*sin(uTime*.07)), cos(.22*sin(uTime*.07)));uv+=vec2(cos(angle*2.0+uTime*.06),sin(angle*3.0-uTime*.04))*radius*.22;float n=fbm(uv*3.1+vec2(uTime*.018,-uTime*.011));float filaments=fbm(uv*6.4-vec2(uTime*.01));float density=smoothstep(.34,.82,n*.78+filaments*.35)*smoothstep(.72,.08,radius);vec3 c=mix(uColor*.17,uColor*1.55,pow(density,1.8));gl_FragColor=vec4(c,density*uOpacity);}
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    plane.scale.set(scale.x * (1 + i * 0.18), scale.y * (1 + i * 0.1), 1);
    plane.position.set((i - 1.5) * 2.5, Math.sin(i * 2.4) * 2, -i * 7);
    plane.rotation.z = seed + i * 0.57;
    group.add(plane);
    materials.push(material);
  }
  return { group, materials, speed: 0.01 + seed * 0.004 };
}

const CinematicShader = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.0007 }, vignette: { value: 0.22 } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse;uniform float amount;uniform float vignette;varying vec2 vUv;
    void main(){vec2 dir=vUv-.5;float d=length(dir);vec2 shift=normalize(dir+.0001)*amount*(.2+d*1.8);float r=texture2D(tDiffuse,vUv+shift).r;float g=texture2D(tDiffuse,vUv).g;float b=texture2D(tDiffuse,vUv-shift).b;vec3 c=vec3(r,g,b);c*=1.0-smoothstep(.38,.82,d)*vignette;c=(c-.5)*1.055+.5;gl_FragColor=vec4(c,1.0);}
  `,
};

function makeGlowMaterial(color: string, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: 0.72,
    roughness: 0.24,
  });
}

function createShip() {
  const ship = new THREE.Group();
  const hullSurface = makeProceduralSurface("brushed-alloy", "#dce8ef", "#7694a9", 12);
  hullSurface.map.repeat.set(2, 7);
  hullSurface.bump.repeat.set(2, 7);
  hullSurface.roughness.repeat.set(2, 7);
  const hullMaterial = new THREE.MeshPhysicalMaterial({
    map: hullSurface.map,
    bumpMap: hullSurface.bump,
    bumpScale: 0.018,
    roughnessMap: hullSurface.roughness,
    roughness: 0.24,
    metalness: 0.88,
    clearcoat: 0.55,
    clearcoatRoughness: 0.17,
  });
  const darkMaterial = new THREE.MeshPhysicalMaterial({ color: "#07101c", metalness: 0.92, roughness: 0.18, clearcoat: 0.72, clearcoatRoughness: 0.12 });
  const cyanMaterial = makeGlowMaterial("#40e8ff", 0.34);
  const whiteGlow = new THREE.MeshStandardMaterial({ color: "#f4f5ef", roughness: 0.82, metalness: 0.04 });

  const wingShape = new THREE.Shape();
  wingShape.moveTo(-2.55, 0.45);
  wingShape.lineTo(-1.2, -1.15);
  wingShape.lineTo(-0.42, -0.72);
  wingShape.lineTo(0, -1.45);
  wingShape.lineTo(0.42, -0.72);
  wingShape.lineTo(1.2, -1.15);
  wingShape.lineTo(2.55, 0.45);
  wingShape.lineTo(0.78, 0.82);
  wingShape.lineTo(0, 0.48);
  wingShape.lineTo(-0.78, 0.82);
  wingShape.closePath();
  const wingGeometry = new THREE.ExtrudeGeometry(wingShape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.035, bevelSegments: 2 });
  wingGeometry.center();
  const wings = new THREE.Mesh(wingGeometry, hullMaterial);
  wings.rotation.x = Math.PI / 2;
  wings.position.set(0, -0.14, 0.12);
  ship.add(wings);

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.5, 10, 20), hullMaterial);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = -0.18;
  fuselage.scale.set(1, 1, 0.88);
  ship.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.12, 10), hullMaterial);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.62;
  ship.add(nose);
  const keel = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 12), darkMaterial);
  keel.scale.set(0.78, 0.38, 1.7);
  keel.position.set(0, -0.34, 0.12);
  ship.add(keel);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 28, 18),
    new THREE.MeshPhysicalMaterial({ color: "#07182e", emissive: "#1763a5", emissiveIntensity: 0.48, metalness: 0.15, roughness: 0.04, transmission: 0.16, transparent: true, opacity: 0.88, clearcoat: 1 }),
  );
  canopy.scale.set(0.88, 0.58, 1.45);
  canopy.position.set(0, 0.28, -0.52);
  ship.add(canopy);

  const pilotHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: "#f4f2e8", roughness: 0.9 }));
  pilotHead.position.set(0, 0.31, -0.58);
  ship.add(pilotHead);
  [-0.11, 0.11].forEach((x) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 3), whiteGlow);
    ear.position.set(x, 0.47, -0.58);
    ship.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), new THREE.MeshBasicMaterial({ color: "#05070a" }));
    eye.position.set(x * 0.52, 0.33, -0.72);
    ship.add(eye);
  });
  const mohawk = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.25, 5), whiteGlow);
  mohawk.position.set(0, 0.52, -0.59);
  mohawk.rotation.z = -0.12;
  ship.add(mohawk);

  [-1, 1].forEach((side) => {
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.29, 1.22, 16), darkMaterial);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(side * 1.02, -0.07, 0.32);
    ship.add(nacelle);
    const intake = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.052, 8, 24), cyanMaterial);
    intake.position.set(side * 1.02, -0.07, -0.32);
    ship.add(intake);
    const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), cyanMaterial);
    turbine.rotation.x = Math.PI / 2;
    turbine.position.set(side * 1.02, -0.07, 0.96);
    ship.add(turbine);
    const engineRing = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.045, 8, 28), cyanMaterial);
    engineRing.position.set(side * 1.02, -0.07, 0.98);
    ship.add(engineRing);
    const exhaust = new THREE.Mesh(
      new THREE.ConeGeometry(0.21, 1.9, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: "#75f7ff", transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * 1.02, -0.07, 1.86);
    exhaust.userData.engineTrail = true;
    ship.add(exhaust);

    const cannonHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.9, 10), darkMaterial);
    cannonHousing.rotation.x = Math.PI / 2;
    cannonHousing.position.set(side * 1.72, -0.08, -0.25);
    ship.add(cannonHousing);
    const cannonTip = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.08, 12), cyanMaterial);
    cannonTip.position.set(side * 1.72, -0.08, -0.72);
    ship.add(cannonTip);
    const wingLight = new THREE.PointLight(side < 0 ? "#ff335d" : "#45f2ff", 0.55, 2.2);
    wingLight.position.set(side * 2.15, 0, 0.3);
    ship.add(wingLight);
  });

  const finShape = new THREE.Shape();
  finShape.moveTo(-0.5, 0);
  finShape.lineTo(0.45, 0);
  finShape.lineTo(0.28, 0.78);
  finShape.lineTo(-0.18, 0.5);
  finShape.closePath();
  [-0.58, 0.58].forEach((x) => {
    const fin = new THREE.Mesh(new THREE.ShapeGeometry(finShape), hullMaterial);
    fin.rotation.y = Math.PI / 2;
    fin.position.set(x, 0.04, 0.65);
    ship.add(fin);
  });

  [-0.32, 0, 0.32].forEach((x) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.82), cyanMaterial);
    strip.position.set(x, 0.39, 0.23);
    ship.add(strip);
  });
  const shieldRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.018, 6, 64),
    new THREE.MeshBasicMaterial({ color: "#62efff", transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  shieldRing.position.z = 0.2;
  shieldRing.userData.shieldRing = true;
  ship.add(shieldRing);

  const light = new THREE.PointLight("#5cf4ff", 0.9, 4.5);
  light.position.z = 1.1;
  ship.add(light);
  ship.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  ship.position.set(0, -1.6, 3);
  ship.scale.setScalar(0.68);
  return ship;
}

function createEnemyCraft(level: Level, kind: Exclude<EnemyKind, "asteroid" | "turret" | "boss">) {
  const group = new THREE.Group();
  const accent = LEVELS[level].color;
  const hullColors = ["#172334", "#30201d", "#2c1119"];
  const hull = new THREE.MeshPhysicalMaterial({ color: hullColors[level], metalness: 0.9, roughness: 0.24, clearcoat: 0.42, clearcoatRoughness: 0.2 });
  const armor = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.16, metalness: 0.82, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: "#080b12", metalness: 0.8, roughness: 0.34 });
  const hostile = makeGlowMaterial(level === 2 ? "#ffb02e" : "#ff315c", 3.2);

  if (kind === "fighter") {
    const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.43, 2.65, 7), hull);
    fuselage.rotation.x = Math.PI / 2;
    group.add(fuselage);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.1, 0.72), armor);
    wings.position.z = -0.2;
    group.add(wings);
    [-1, 1].forEach((side) => {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.18, 3), hull);
      blade.rotation.z = side * Math.PI / 2;
      blade.rotation.y = -0.35;
      blade.position.set(side * 1.25, 0, -0.35);
      group.add(blade);
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.85, 8), dark);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(side * 1.08, -0.06, 0.55);
      group.add(cannon);
      const engine = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10), hostile);
      engine.position.set(side * 0.24, 0, -1.28);
      engine.rotation.y = Math.PI;
      group.add(engine);
    });
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 10), new THREE.MeshPhysicalMaterial({ color: "#3b0c18", emissive: "#ff315c", emissiveIntensity: 0.35, metalness: 0.35, roughness: 0.08 }));
    canopy.scale.set(1, 0.55, 1.3);
    canopy.position.set(0, 0.24, 0.35);
    group.add(canopy);
  }

  if (kind === "interceptor") {
    const needle = new THREE.Mesh(new THREE.ConeGeometry(0.25, 3.25, 5), hull);
    needle.rotation.x = Math.PI / 2;
    group.add(needle);
    [Math.PI / 4, -Math.PI / 4].forEach((angle) => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.07, 0.34), armor);
      blade.rotation.z = angle;
      blade.position.z = -0.28;
      group.add(blade);
    });
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), hostile);
    sensor.position.z = 1.42;
    group.add(sensor);
    const engine = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.2, 12), hostile);
    engine.position.z = -1.52;
    engine.rotation.y = Math.PI;
    group.add(engine);
  }

  if (kind === "bot") {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.28, 0.72), hull);
    group.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.16), armor);
    chest.position.set(0, 0.15, 0.43);
    group.add(chest);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.58, 0.62), dark);
    head.position.y = 0.94;
    group.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.06), hostile);
    visor.position.set(0, 1, 0.34);
    group.add(visor);
    [-1, 1].forEach((side) => {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), armor);
      shoulder.position.set(side * 0.84, 0.36, 0);
      group.add(shoulder);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.1, 9), hull);
      arm.rotation.z = side * 0.24;
      arm.position.set(side * 0.93, -0.3, 0);
      group.add(arm);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.48, 4), hostile);
      claw.position.set(side * 1.06, -0.9, 0.08);
      group.add(claw);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.72, 0.38), hull);
      leg.position.set(side * 0.32, -0.96, -0.08);
      group.add(leg);
    });
  }

  if (kind === "bomber") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.82, 2.1), hull);
    body.position.z = -0.1;
    group.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.15, 6), armor);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.55;
    group.add(nose);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.14, 0.88), hull);
    wing.position.z = -0.35;
    group.add(wing);
    [-1, 1].forEach((side) => {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 1.8, 12), armor);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 1.32, -0.05, -0.28);
      group.add(pod);
      const engine = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), hostile);
      engine.position.set(side * 1.32, -0.05, -1.2);
      engine.rotation.y = Math.PI;
      group.add(engine);
    });
    const turret = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), dark);
    turret.position.set(0, 0.62, 0.15);
    group.add(turret);
    const turretEye = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.06), hostile);
    turretEye.position.set(0, 0.65, 0.44);
    group.add(turretEye);
  }

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function createAsteroid(withLight = true) {
  const mesh = new THREE.Group();
  const surface = makeProceduralSurface("asteroid-basalt", "#1e1818", "#9f5d3f", 31);
  surface.map.repeat.set(1.7, 1.7);
  surface.bump.repeat.set(1.7, 1.7);
  if (!asteroidGeometryCache.length) {
    for (let variant = 0; variant < 4; variant++) {
      const geometry = new THREE.IcosahedronGeometry(1, 2);
      const position = geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        const noise = 0.76 + seededNoise(Math.floor((x + 1.4) * 17), Math.floor((y + z + 2.4) * 19), 170 + variant * 13) * 0.42;
        position.setXYZ(i, x * noise, y * noise, z * noise);
      }
      geometry.computeVertexNormals();
      asteroidGeometryCache.push(geometry);
    }
    asteroidMaterialCache = ["#a58270", "#85817c", "#aa8068", "#777f8d"].map((color) => new THREE.MeshStandardMaterial({
      color,
      map: surface.map,
      bumpMap: surface.bump,
      bumpScale: 0.19,
      roughnessMap: surface.roughness,
      emissiveMap: surface.map,
      emissive: "#23364d",
      emissiveIntensity: 0.28,
      roughness: 0.9,
      metalness: 0.09,
    }));
  }
  const variant = Math.floor(Math.random() * asteroidGeometryCache.length);
  const rock = new THREE.Mesh(
    asteroidGeometryCache[variant],
    asteroidMaterialCache[variant],
  );
  rock.scale.set(1, 0.68 + Math.random() * 0.18, 0.82 + Math.random() * 0.18);
  const rim = new THREE.Mesh(asteroidGeometryCache[variant], asteroidRimMaterial);
  rim.scale.copy(rock.scale).multiplyScalar(1.055);
  mesh.add(rock, rim);
  if (withLight) {
    const ember = new THREE.PointLight("#ff9361", 4.5, 5.5, 2);
    ember.position.set(0.35, 0.15, 0.45);
    mesh.add(ember);
  }
  return mesh;
}

function createGroundTurret() {
  const group = new THREE.Group();
  const basalt = new THREE.MeshStandardMaterial({ color: "#241b1d", metalness: 0.76, roughness: 0.42 });
  const armor = new THREE.MeshStandardMaterial({ color: "#7d2c21", emissive: "#ff351c", emissiveIntensity: 0.12, metalness: 0.82, roughness: 0.3 });
  const glow = makeGlowMaterial("#ffb11f", 1.8);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.05, 0.5, 8), basalt);
  base.position.y = 0.25;
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.42, 10), armor);
  turntable.position.y = 0.67;
  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.58, 0.92), basalt);
  housing.position.y = 1.03;
  [-0.25, 0.25].forEach((x) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.35, 8), armor);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(x, 1.15, -0.72);
    group.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), glow);
    muzzle.position.set(x, 1.15, -1.42);
    group.add(muzzle);
  });
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.08), glow);
  eye.position.set(0, 1.2, -0.49);
  group.add(base, turntable, housing, eye);
  group.userData.turretHousing = housing;
  return group;
}

function createUpgradePickup(kind: UpgradeKind) {
  const group = new THREE.Group();
  const colors: Record<UpgradeKind, string> = { double: "#6dfff0", rapid: "#ffe95c", bomb: "#ff6ca8" };
  const color = colors[kind];
  const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.74, blending: THREE.AdditiveBlending, depthWrite: false });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.055, 8, 36), ringMaterial);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.025, 6, 28), ringMaterial.clone());
  inner.rotation.set(Math.PI / 2, 0.2, 0);
  outer.userData.upgradeRing = 1;
  inner.userData.upgradeRing = -1;
  group.add(outer, inner);
  const coreMaterial = new THREE.MeshStandardMaterial({ color: "#f5ffff", emissive: color, emissiveIntensity: 0.8, metalness: 0.48, roughness: 0.18 });
  if (kind === "double") {
    [-0.2, 0.2].forEach((x) => {
      const bolt = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.52, 3, 7), coreMaterial);
      bolt.position.x = x;
      group.add(bolt);
    });
  } else if (kind === "rapid") {
    [-0.22, 0.16].forEach((y) => {
      const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.48, 3), coreMaterial);
      chevron.rotation.z = Math.PI;
      chevron.position.y = y;
      group.add(chevron);
    });
  } else {
    const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), coreMaterial);
    const fuse = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 6, 18), ringMaterial.clone());
    fuse.rotation.x = Math.PI / 2;
    group.add(bomb, fuse);
  }
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, 12, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }),
  );
  group.add(aura);
  return group;
}

function createBombProjectile() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 8),
    new THREE.MeshStandardMaterial({ color: "#f7fbff", emissive: "#ff408d", emissiveIntensity: 1.25, metalness: 0.4, roughness: 0.15 }),
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.045, 7, 28),
    new THREE.MeshBasicMaterial({ color: "#ff77b6", transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ring.userData.bombRing = true;
  group.add(core, ring);
  return group;
}

function createTigerBoss() {
  const boss = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: "#d96f24", metalness: 0.68, roughness: 0.28, emissive: "#7a2108", emissiveIntensity: 0.45 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), orange);
  head.scale.y = 0.78;
  boss.add(head);
  [-0.92, 0.92].forEach((x) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.3, 3), orange);
    ear.position.set(x, 1.25, 0);
    boss.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), makeGlowMaterial("#c8ff35", 4));
    eye.position.set(x * 0.56, 0.25, 1.3);
    boss.add(eye);
  });
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: "#f0b26f" }));
  muzzle.position.set(0, -0.42, 1.28);
  muzzle.scale.y = 0.65;
  boss.add(muzzle);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 3), makeGlowMaterial("#ff4c6b", 1));
  nose.rotation.x = Math.PI;
  nose.position.set(0, -0.22, 1.75);
  boss.add(nose);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.12, 12, 48), makeGlowMaterial("#ff315c", 4));
  ring.rotation.x = Math.PI / 2;
  boss.add(ring);
  const light = new THREE.PointLight("#ff522d", 40, 20);
  boss.add(light);
  return boss;
}

function Portrait({ character }: { character: Character }) {
  return (
    <div className={`portrait portrait--${character}`} aria-hidden="true">
      <img src={CHARACTER_IMAGES[character]} alt="" />
    </div>
  );
}

export default function SpaceBeanGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cutsceneAudioRef = useRef<HTMLAudioElement>(null);
  const phaseRef = useRef<GamePhase>("title");
  const levelRef = useRef<Level>(0);
  const audioRef = useRef<AudioDirector | null>(null);
  const commandRef = useRef({ x: 0, y: 0, firing: false, boost: false, bombing: false, bombPressed: false, bombReleased: false });
  const [phase, setPhaseState] = useState<GamePhase>("title");
  const [hud, setHud] = useState<HUDState>(INITIAL_HUD);
  const [comms, setComms] = useState<Comms>({
    character: "tiger",
    name: "INCOMING TRANSMISSION",
    line: "At last... something worth knocking over.",
  });
  const [soundOff, setSoundOff] = useState(false);
  const [briefLevel, setBriefLevel] = useState<Level>(0);
  const [flash, setFlash] = useState(false);
  const [waveBanner, setWaveBanner] = useState<{ number: number; name: string } | null>(null);
  const [upgradeBanner, setUpgradeBanner] = useState<{ kind: UpgradeKind; label: string } | null>(null);
  const [cutsceneIndex, setCutsceneIndex] = useState(0);

  const setPhase = useCallback((p: GamePhase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const showComms = useCallback((message: Comms) => {
    setComms(message);
    if (message) window.setTimeout(() => setComms((current) => (current === message ? null : current)), 4200);
  }, []);

  const startBriefing = useCallback(() => {
    audioRef.current?.start();
    setBriefLevel(levelRef.current);
    setPhase("briefing");
  }, [setPhase]);

  const startPrologue = useCallback(() => {
    audioRef.current?.start();
    setCutsceneIndex(0);
    setPhase("cutscene");
  }, [setPhase]);

  const selectStartingLevel = useCallback((level: Level) => {
    audioRef.current?.start();
    levelRef.current = level;
    setBriefLevel(level);
    setHud((current) => ({ ...current, level, progress: 0, objective: LEVELS[level].objective, wave: 0, waveName: "STANDBY" }));
    setPhase("briefing");
  }, [setPhase]);

  const finishCutscene = useCallback(() => {
    cutsceneAudioRef.current?.pause();
    setBriefLevel(levelRef.current);
    setPhase("briefing");
  }, [setPhase]);

  const advanceCutscene = useCallback(() => {
    if (cutsceneIndex < CUTSCENES.length - 1) setCutsceneIndex((index) => index + 1);
    else finishCutscene();
  }, [cutsceneIndex, finishCutscene]);

  const startMission = useCallback(() => {
    audioRef.current?.start();
    setHud((h) => ({ ...h, level: levelRef.current, progress: 0, objective: LEVELS[levelRef.current].objective, wave: 0, waveName: "STANDBY" }));
    showComms(STORY[levelRef.current][0]);
    setPhase("playing");
  }, [setPhase, showComms]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const audio = new AudioDirector();
    audioRef.current = audio;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#02030a");
    scene.fog = new THREE.FogExp2("#050916", 0.009);
    const camera = new THREE.PerspectiveCamera(62, mount.clientWidth / mount.clientHeight, 0.1, 800);
    camera.position.set(0, 1.4, 10);
    const initialPixels = mount.clientWidth * mount.clientHeight;
    const hardwareThreads = navigator.hardwareConcurrency ?? 8;
    const maxRenderScale = initialPixels > 1_800_000 ? 0.82 : hardwareThreads <= 4 ? 0.78 : Math.min(window.devicePixelRatio, 1);
    let renderScale = maxRenderScale;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: false });
    renderer.setPixelRatio(renderScale);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const composer = new EffectComposer(renderer);
    composer.setSize(mount.clientWidth, mount.clientHeight);
    composer.setPixelRatio(renderScale);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.18, 0.2, 1.34);
    bloom.threshold = 1.34;
    bloom.strength = 0.18;
    bloom.radius = 0.2;
    composer.addPass(bloom);
    const cinematicPass = new ShaderPass(CinematicShader);
    composer.addPass(cinematicPass);

    const ambient = new THREE.HemisphereLight("#88bdff", "#100018", 1.15);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#b8d7ff", 3.15);
    key.position.set(4, 8, 10);
    key.castShadow = true;
    scene.add(key);

    const ship = createShip();
    scene.add(ship);
    const engineTrails = ship.children.filter((child) => child.userData.engineTrail) as THREE.Mesh[];
    const shieldRings = ship.children.filter((child) => child.userData.shieldRing) as THREE.Mesh[];
    const starLayers = [
      { points: createStarLayer(2600, 150, 420, "#d9f4ff", 1.15), speed: 14 },
      { points: createStarLayer(1350, 110, 300, "#76c8ff", 1.75), speed: 25 },
      { points: createStarLayer(520, 82, 210, "#fff2d2", 2.6), speed: 41 },
    ];
    starLayers.forEach(({ points }) => scene.add(points));

    const nebulae: Nebula[] = [
      createNebula("#1766c7", new THREE.Vector3(-28, 8, -150), new THREE.Vector2(76, 42), 1.3, 0.32),
      createNebula("#6a1ea8", new THREE.Vector3(35, -8, -230), new THREE.Vector2(92, 53), 2.1, 0.25),
      createNebula("#e94055", new THREE.Vector3(-16, -17, -310), new THREE.Vector2(80, 44), 3.7, 0.18),
    ];
    nebulae.forEach((nebula) => scene.add(nebula.group));

    const planetSurface = makeProceduralSurface("aurelia-ocean", "#061a46", "#2fc9d8", 7);
    planetSurface.map.repeat.set(3, 1.5);
    planetSurface.bump.repeat.set(3, 1.5);
    planetSurface.roughness.repeat.set(3, 1.5);
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(22, 72, 48),
      new THREE.MeshPhysicalMaterial({ map: planetSurface.map, bumpMap: planetSurface.bump, bumpScale: 0.46, roughnessMap: planetSurface.roughness, roughness: 0.68, metalness: 0.08, clearcoat: 0.18, emissive: "#031b54", emissiveIntensity: 0.32 }),
    );
    planet.position.set(29, -18, -86);
    planet.receiveShadow = true;
    scene.add(planet);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(22.6, 48, 32),
      new THREE.MeshBasicMaterial({ color: "#5bd7ff", transparent: true, opacity: 0.08, side: THREE.BackSide }),
    );
    atmosphere.position.copy(planet.position);
    scene.add(atmosphere);
    const cloudSurface = makeProceduralSurface("aurelia-clouds", "#0d1b3a", "#d9fbff", 51);
    cloudSurface.map.repeat.set(4, 2);
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(22.28, 64, 42),
      new THREE.MeshStandardMaterial({ map: cloudSurface.map, color: "#cceeff", transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    clouds.position.copy(planet.position);
    scene.add(clouds);
    const aureliaOrbit = new THREE.Group();
    aureliaOrbit.position.copy(planet.position);
    const polarAurora = new THREE.Mesh(
      new THREE.TorusGeometry(23.1, 0.38, 12, 128),
      new THREE.MeshBasicMaterial({ color: "#67ffe2", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    polarAurora.rotation.x = Math.PI / 2;
    polarAurora.rotation.y = 0.62;
    aureliaOrbit.add(polarAurora);
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const monument = new THREE.Group();
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.8, 8), new THREE.MeshStandardMaterial({ color: "#c5e8f5", metalness: 0.84, roughness: 0.22 }));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 20), makeGlowMaterial("#67ffe2", 2));
      halo.rotation.x = Math.PI / 2;
      monument.add(mast, halo);
      monument.position.set(Math.cos(angle) * 28, Math.sin(angle) * 8, Math.sin(angle) * 25);
      monument.rotation.z = angle;
      aureliaOrbit.add(monument);
    }
    scene.add(aureliaOrbit);
    const sun = new THREE.PointLight("#ffe5bd", 600, 220);
    sun.position.set(-35, 20, -100);
    scene.add(sun);

    const asteroidBelt = new THREE.Group();
    for (let i = 0; i < 28; i++) {
      const asteroid = createAsteroid(false);
      asteroid.position.set((Math.random() - 0.5) * 90, (Math.random() - 0.5) * 46, -60 - Math.random() * 210);
      const asteroidScale = 0.35 + Math.pow(Math.random(), 2) * 3.8;
      asteroid.scale.setScalar(asteroidScale);
      asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      asteroid.userData.drift = 0.18 + Math.random() * 0.52;
      asteroidBelt.add(asteroid);
    }
    asteroidBelt.visible = false;
    scene.add(asteroidBelt);

    const gasWorld = new THREE.Group();
    gasWorld.position.set(-31, 7, -108);
    const gasPlanet = new THREE.Mesh(
      new THREE.SphereGeometry(27, 96, 64),
      new THREE.MeshPhysicalMaterial({ map: makeGasGiantTexture(), roughness: 0.82, metalness: 0, clearcoat: 0.12, emissive: "#30153f", emissiveIntensity: 0.16 }),
    );
    gasWorld.add(gasPlanet);
    const gasAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(27.7, 72, 48),
      new THREE.MeshBasicMaterial({ color: "#d68dce", transparent: true, opacity: 0.09, side: THREE.BackSide, blending: THREE.AdditiveBlending }),
    );
    gasWorld.add(gasAtmosphere);
    const ringGroup = new THREE.Group();
    [
      { inner: 31, outer: 34.2, color: "#e7d2b5", opacity: 0.52 },
      { inner: 34.8, outer: 37.1, color: "#a878a1", opacity: 0.38 },
      { inner: 38.2, outer: 40.6, color: "#e9b889", opacity: 0.31 },
      { inner: 41.5, outer: 43.6, color: "#7f5e91", opacity: 0.22 },
    ].forEach((ring) => {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(ring.inner, ring.outer, 160),
        new THREE.MeshBasicMaterial({ color: ring.color, transparent: true, opacity: ring.opacity, side: THREE.DoubleSide, depthWrite: false }),
      );
      ringGroup.add(mesh);
    });
    ringGroup.rotation.set(1.13, 0.08, -0.34);
    gasWorld.add(ringGroup);
    const shepherdMoon = new THREE.Mesh(
      displacePlanetGeometry(new THREE.SphereGeometry(3.3, 36, 24), 16, 0.35),
      new THREE.MeshStandardMaterial({ color: "#b5a5a0", roughness: 0.94, metalness: 0.05 }),
    );
    shepherdMoon.position.set(35, 13, 4);
    gasWorld.add(shepherdMoon);
    const moonGlow = new THREE.PointLight("#e6c5ff", 110, 80, 1.6);
    moonGlow.position.set(18, 22, 18);
    gasWorld.add(moonGlow);
    gasWorld.visible = false;
    scene.add(gasWorld);

    const kalderaSphereMap = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/kaldera-ix-spheremap-v1.png`);
    kalderaSphereMap.colorSpace = THREE.SRGBColorSpace;
    kalderaSphereMap.wrapS = kalderaSphereMap.wrapT = THREE.RepeatWrapping;
    kalderaSphereMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const lavaSurface = makeProceduralSurface("kaldera-lava", "#090106", "#ff5a0a", 91);
    lavaSurface.map.repeat.set(4, 2);
    lavaSurface.bump.repeat.set(4, 2);
    const lavaWorld = new THREE.Group();
    const kalderaGeometry = displacePlanetGeometry(new THREE.SphereGeometry(35, 96, 64), 91, 1.35);
    const lavaPlanet = new THREE.Mesh(
      kalderaGeometry,
      new THREE.MeshStandardMaterial({ map: kalderaSphereMap, bumpMap: lavaSurface.bump, bumpScale: 1.2, emissiveMap: lavaSurface.map, emissive: "#ff2200", emissiveIntensity: 0.42, roughness: 0.82, metalness: 0.08 }),
    );
    lavaPlanet.position.set(-18, -42, -108);
    lavaWorld.add(lavaPlanet);
    const lavaHalo = new THREE.Mesh(
      new THREE.SphereGeometry(36.3, 56, 40),
      new THREE.MeshBasicMaterial({ color: "#ff3f16", transparent: true, opacity: 0.11, side: THREE.BackSide, blending: THREE.AdditiveBlending }),
    );
    lavaHalo.position.copy(lavaPlanet.position);
    lavaWorld.add(lavaHalo);
    const ashSurface = makeProceduralSurface("kaldera-ash", "#060307", "#6b2225", 111);
    ashSurface.map.repeat.set(5, 2);
    const ashClouds = new THREE.Mesh(
      new THREE.SphereGeometry(36, 72, 48),
      new THREE.MeshStandardMaterial({ map: ashSurface.map, color: "#3d1518", transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 }),
    );
    ashClouds.position.copy(lavaPlanet.position);
    lavaWorld.add(ashClouds);
    const brokenMoon = new THREE.Mesh(
      displacePlanetGeometry(new THREE.SphereGeometry(5.2, 42, 28), 143, 0.8),
      new THREE.MeshStandardMaterial({ color: "#241219", emissive: "#7b150e", emissiveIntensity: 0.55, roughness: 0.88 }),
    );
    brokenMoon.position.set(27, 10, -16);
    lavaWorld.add(brokenMoon);
    const heatLight = new THREE.PointLight("#ff3518", 900, 190, 1.45);
    heatLight.position.set(-10, -22, -75);
    lavaWorld.add(heatLight);
    lavaWorld.visible = false;
    scene.add(lavaWorld);

    const kalderaSurface = new THREE.Group();
    const terrainLength = 560;
    const terrainGeometry = new THREE.PlaneGeometry(58, terrainLength, 48, 160);
    const terrainPositions = terrainGeometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < terrainPositions.count; i++) {
      const x = terrainPositions.getX(i);
      const localY = terrainPositions.getY(i);
      const z = -localY - 260;
      terrainPositions.setZ(i, kalderaTerrainHeight(x, z));
    }
    terrainGeometry.computeVertexNormals();
    const groundTexture = kalderaSphereMap.clone();
    groundTexture.repeat.set(1.8, 9);
    groundTexture.needsUpdate = true;
    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({ map: groundTexture, bumpMap: lavaSurface.bump, bumpScale: 0.32, roughness: 0.91, metalness: 0.07, color: "#b87861" }),
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    kalderaSurface.add(terrain);

    const riverPoints: THREE.Vector3[] = [];
    for (let z = 18; z >= -538; z -= 5.5) {
      const x = kalderaRiverCenter(z);
      riverPoints.push(new THREE.Vector3(x, kalderaTerrainHeight(x, z) + 0.14, z));
    }
    const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
    const river = new THREE.Mesh(
      new THREE.TubeGeometry(riverCurve, 170, 0.54, 6, false),
      new THREE.MeshPhysicalMaterial({ color: "#2ec8c2", emissive: "#087a79", emissiveIntensity: 0.42, metalness: 0.08, roughness: 0.16, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    );
    kalderaSurface.add(river);

    const treeTargets: TreeTarget[] = [];
    const treeCount = hardwareThreads <= 4 ? 44 : 68;
    const treeTrunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.12, 0.2, 1.25, 6),
      new THREE.MeshStandardMaterial({ color: "#241311", roughness: 1 }),
      treeCount,
    );
    const treeCrowns = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.68, 2.35, 7),
      new THREE.MeshStandardMaterial({ color: "#243b31", roughness: 0.94 }),
      treeCount,
    );
    treeTrunks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    treeCrowns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const treeMatrix = new THREE.Matrix4();
    const treeQuaternion = new THREE.Quaternion();
    const treeScale = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < treeCount; i++) {
      const z = 5 - i * (520 / treeCount);
      const side = i % 2 === 0 ? -1 : 1;
      const spread = i % 5 === 0 ? 3.9 + seededNoise(i, 4, 230) * 1.5 : 7.2 + seededNoise(i, 4, 230) * 13.2;
      const x = kalderaValleyCenter(z) + side * spread + (seededNoise(i, 8, 412) - 0.5) * 2.8;
      const y = kalderaTerrainHeight(x, z);
      const scale = 0.72 + seededNoise(i, 11, 91) * 0.62;
      treeMatrix.compose(new THREE.Vector3(x, y + 0.62 * scale, z), treeQuaternion, new THREE.Vector3(scale, scale, scale));
      treeTrunks.setMatrixAt(i, treeMatrix);
      treeMatrix.compose(new THREE.Vector3(x, y + 1.72 * scale, z), treeQuaternion, new THREE.Vector3(scale, scale, scale));
      treeCrowns.setMatrixAt(i, treeMatrix);
      treeCrowns.setColorAt(i, new THREE.Color("#2c4939"));
      treeTargets.push({ x, y, z, scale, index: i, active: true, burning: 0, fireTick: 0 });
    }
    treeTrunks.instanceMatrix.needsUpdate = true;
    treeCrowns.instanceMatrix.needsUpdate = true;
    if (treeCrowns.instanceColor) treeCrowns.instanceColor.needsUpdate = true;
    kalderaSurface.add(treeTrunks, treeCrowns);

    const fortress = new THREE.Group();
    const fortressMaterial = new THREE.MeshStandardMaterial({ color: "#130c11", emissive: "#9b160e", emissiveIntensity: 0.22, metalness: 0.8, roughness: 0.38 });
    [-5, 0, 5].forEach((x, index) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(index === 1 ? 1.8 : 1.2, index === 1 ? 2.5 : 1.7, index === 1 ? 12 : 8, 8), fortressMaterial);
      tower.position.set(x, kalderaTerrainHeight(x, -522) + (index === 1 ? 6 : 4), -522);
      fortress.add(tower);
    });
    kalderaSurface.add(fortress);
    kalderaSurface.visible = false;
    scene.add(kalderaSurface);

    const kalderaHorizon = new THREE.Group();
    const surfaceMoon = new THREE.Mesh(
      displacePlanetGeometry(new THREE.SphereGeometry(7.2, 42, 28), 143, 0.8),
      new THREE.MeshStandardMaterial({ map: kalderaSphereMap, roughness: 0.9, emissive: "#5d1814", emissiveIntensity: 0.24 }),
    );
    surfaceMoon.position.set(28, 18, -185);
    kalderaHorizon.add(surfaceMoon);
    const horizonGlow = new THREE.PointLight("#ff4b24", 280, 150, 1.5);
    horizonGlow.position.set(-18, 22, -95);
    kalderaHorizon.add(horizonGlow);
    kalderaHorizon.visible = false;
    scene.add(kalderaHorizon);

    const enemies: Enemy[] = [];
    const lasers: Laser[] = [];
    const enemyShots: EnemyShot[] = [];
    const upgrades: UpgradePickup[] = [];
    const waveState = new Map<number, { remaining: number; failed: boolean }>();
    const laserGeometry = new THREE.CapsuleGeometry(0.045, 1.15, 3, 6);
    const laserMaterial = new THREE.MeshBasicMaterial({ color: "#aafff1" });
    const laserPool: THREE.Mesh[] = [];
    const enemyShotGeometry = new THREE.SphereGeometry(0.11, 7, 5);
    const enemyShotMaterial = new THREE.MeshBasicMaterial({ color: "#ff8a32" });
    const enemyShotPool: THREE.Mesh[] = [];
    const treeWorldPosition = new THREE.Vector3();
    const maxParticles = hardwareThreads <= 4 ? 320 : 560;
    const particlePositions = new Float32Array(maxParticles * 3);
    const particleVelocities = new Float32Array(maxParticles * 3);
    const particleColors = new Float32Array(maxParticles * 3);
    const particleLife = new Float32Array(maxParticles);
    particlePositions.fill(9999);
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositionAttribute = new THREE.BufferAttribute(particlePositions, 3);
    const particleColorAttribute = new THREE.BufferAttribute(particleColors, 3);
    particleGeometry.setAttribute("position", particlePositionAttribute);
    particleGeometry.setAttribute("color", particleColorAttribute);
    const particlePoints = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ size: 0.34, vertexColors: true, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
    );
    particlePoints.frustumCulled = false;
    scene.add(particlePoints);
    let particleCursor = 0;
    const shockwaveGeometry = new THREE.RingGeometry(0.18, 0.27, 24);
    const shockwaves = Array.from({ length: 10 }, () => {
      const mesh = new THREE.Mesh(
        shockwaveGeometry,
        new THREE.MeshBasicMaterial({ color: "#7dfff1", transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, life: 0, speed: 10 };
    });
    const clock = new THREE.Clock();
    let missionTime = 0;
    let waveIndex = 0;
    let lastShot = 0;
    let shield = 100;
    let score = 0;
    let combo = 1;
    let comboTimer = 0;
    let bossHealth = 100;
    let bossSpawned = false;
    let invincible = 0;
    let messageIndex = 0;
    let wasPlaying = false;
    let animationFrame = 0;
    let cameraShake = 0;
    let smoothedIntensity = 0;
    let hudAccumulator = 0;
    let performanceTime = 0;
    let performanceFrames = 0;
    let doubleTime = 0;
    let rapidTime = 0;
    let bombs = 2;
    let activeBomb: ActiveBomb | null = null;
    let bombWasHeld = false;
    let bombCharge = 0;

    const clearObjects = () => {
      enemies.splice(0).forEach((e) => scene.remove(e.mesh));
      lasers.splice(0).forEach((laser) => { scene.remove(laser.mesh); laserPool.push(laser.mesh); });
      enemyShots.splice(0).forEach((shot) => { scene.remove(shot.mesh); enemyShotPool.push(shot.mesh); });
      upgrades.splice(0).forEach((upgrade) => scene.remove(upgrade.mesh));
      if (activeBomb) scene.remove(activeBomb.mesh);
      activeBomb = null;
      particleLife.fill(0);
      particlePositions.fill(9999);
      particlePositionAttribute.needsUpdate = true;
      shockwaves.forEach((shockwave) => { shockwave.life = 0; shockwave.mesh.visible = false; });
      waveState.clear();
    };

    const resetMission = () => {
      clearObjects();
      missionTime = 0;
      waveIndex = 0;
      shield = 100;
      combo = 1;
      comboTimer = 0;
      bossHealth = 100;
      bossSpawned = false;
      messageIndex = 0;
      invincible = 1.5;
      doubleTime = 0;
      rapidTime = 0;
      bombCharge = 0;
      bombWasHeld = false;
      commandRef.current.bombing = false;
      commandRef.current.bombPressed = false;
      commandRef.current.bombReleased = false;
      if (levelRef.current === 0) bombs = 2;
      planet.visible = levelRef.current === 0;
      atmosphere.visible = levelRef.current === 0;
      clouds.visible = levelRef.current === 0;
      aureliaOrbit.visible = levelRef.current === 0;
      asteroidBelt.visible = levelRef.current === 1;
      gasWorld.visible = levelRef.current === 1;
      lavaWorld.visible = false;
      kalderaSurface.visible = levelRef.current === 2;
      kalderaHorizon.visible = levelRef.current === 2;
      kalderaSurface.position.set(0, 0, 0);
      treeTargets.forEach((tree) => {
        tree.active = true;
        tree.burning = 0;
        tree.fireTick = 0;
        treeMatrix.compose(new THREE.Vector3(tree.x, tree.y + 0.62 * tree.scale, tree.z), treeQuaternion, new THREE.Vector3(tree.scale, tree.scale, tree.scale));
        treeTrunks.setMatrixAt(tree.index, treeMatrix);
        treeMatrix.compose(new THREE.Vector3(tree.x, tree.y + 1.72 * tree.scale, tree.z), treeQuaternion, new THREE.Vector3(tree.scale, tree.scale, tree.scale));
        treeCrowns.setMatrixAt(tree.index, treeMatrix);
        treeCrowns.setColorAt(tree.index, new THREE.Color("#2c4939"));
      });
      treeTrunks.instanceMatrix.needsUpdate = true;
      treeCrowns.instanceMatrix.needsUpdate = true;
      if (treeCrowns.instanceColor) treeCrowns.instanceColor.needsUpdate = true;
      scene.fog = new THREE.FogExp2(levelRef.current === 2 ? "#310508" : levelRef.current === 1 ? "#21142b" : "#050916", levelRef.current === 1 ? 0.0105 : 0.009);
      scene.background = new THREE.Color(levelRef.current === 2 ? "#090104" : levelRef.current === 1 ? "#100b1a" : "#02030a");
      renderer.toneMappingExposure = levelRef.current === 2 ? 1.04 : levelRef.current === 1 ? 0.98 : 0.94;
      ambient.color.set(levelRef.current === 2 ? "#ff7950" : levelRef.current === 1 ? "#c594df" : "#88bdff");
      ambient.groundColor.set(levelRef.current === 2 ? "#180003" : levelRef.current === 1 ? "#130d1f" : "#100018");
      ambient.intensity = levelRef.current === 1 ? 1.5 : 1.15;
      key.color.set(levelRef.current === 2 ? "#ffb16d" : levelRef.current === 1 ? "#f2c8ff" : "#b8d7ff");
      key.intensity = levelRef.current === 1 ? 3.8 : 3.15;
      sun.color.set(levelRef.current === 2 ? "#ff321c" : levelRef.current === 1 ? "#d6a8ff" : "#ffe5bd");
      sun.intensity = levelRef.current === 2 ? 780 : levelRef.current === 1 ? 490 : 600;
      const nebulaColors = levelRef.current === 2 ? ["#ff351f", "#aa102d", "#ff7a18"] : levelRef.current === 1 ? ["#8b3b22", "#4e2034", "#d16c2b"] : ["#1766c7", "#6a1ea8", "#e94055"];
      nebulae.forEach((nebula, i) => nebula.materials.forEach((material) => material.uniforms.uColor.value.set(nebulaColors[i])));
      audio.level = levelRef.current;
      audio.lowShield = false;
      setWaveBanner(null);
    };

    const spawnUnit = (type: EnemyKind, slot: number, squadSize: number, formation: Formation, waveId = -1, asteroidTier = 2) => {
      const level = levelRef.current;
      const mesh = type === "boss" ? createTigerBoss() : type === "asteroid" ? createAsteroid() : type === "turret" ? createGroundTurret() : createEnemyCraft(level, type);
      const anchor = type === "boss" ? new THREE.Vector2(0, 1.7) : formationSlot(formation, slot, squadSize);
      const formationDepth = type === "boss" ? -70 : -78 - Math.abs(slot - (squadSize - 1) / 2) * 3.2;
      if (type === "turret") {
        anchor.x += kalderaValleyCenter(formationDepth);
        anchor.y = kalderaTerrainHeight(anchor.x, formationDepth) + 0.12;
        mesh.rotation.y = Math.PI;
      }
      mesh.position.set(anchor.x, anchor.y, formationDepth);
      const asteroidScale = asteroidTier === 2 ? 1.75 + (slot % 3) * 0.25 : asteroidTier === 1 ? 0.98 : 0.56;
      const scale = type === "asteroid" ? asteroidScale : type === "boss" ? 1.25 : type === "bomber" ? 0.92 : type === "bot" ? 0.88 : type === "turret" ? 0.9 : 0.82;
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      const stats = ENEMY_STATS[type];
      enemies.push({
        mesh,
        hp: type === "asteroid" ? (asteroidTier === 2 ? 7 : asteroidTier === 1 ? 3 : 1) : stats.hp + (type !== "boss" ? level : 0),
        radius: stats.radius * scale,
        boss: type === "boss",
        phase: slot * 0.72,
        type,
        speed: stats.speed + level * 1.2,
        damage: stats.damage,
        anchor,
        formation,
        slot,
        squadSize,
        waveId,
        asteroidTier: type === "asteroid" ? asteroidTier : -1,
        driftX: 0,
        driftY: 0,
        previous: mesh.position.clone(),
        fireCooldown: 0.75 + slot * 0.22,
      });
    };

    const spawnWave = (wave: WaveSpec, index: number) => {
      waveState.set(index, { remaining: wave.units.length, failed: false });
      wave.units.forEach((type, slot) => spawnUnit(type, slot, wave.units.length, wave.formation, index, type === "asteroid" ? 2 : -1));
      const banner = { number: index + 1, name: wave.name };
      setWaveBanner(banner);
      window.setTimeout(() => setWaveBanner((current) => current === banner ? null : current), 2100);
      setHud((current) => ({ ...current, wave: index + 1, waveName: wave.name }));
      audio.setIntensity(0.72, levelRef.current);
    };

    const spawnBoss = () => {
      spawnUnit("boss", 0, 1, "escort");
    };

    const spawnBurst = (position: THREE.Vector3, color: string, amount = 22, withShockwave = true) => {
      const tint = new THREE.Color(color);
      const count = Math.min(amount, amount > 50 ? 72 : 28);
      const velocity = amount > 50 ? 12 : 8;
      for (let i = 0; i < count; i++) {
        const index = particleCursor++ % maxParticles;
        const offset = index * 3;
        particlePositions[offset] = position.x;
        particlePositions[offset + 1] = position.y;
        particlePositions[offset + 2] = position.z;
        particleVelocities[offset] = (Math.random() - 0.5) * velocity;
        particleVelocities[offset + 1] = (Math.random() - 0.5) * velocity;
        particleVelocities[offset + 2] = (Math.random() - 0.5) * velocity;
        const bright = 0.7 + Math.random() * 0.45;
        particleColors[offset] = Math.min(1, tint.r * bright);
        particleColors[offset + 1] = Math.min(1, tint.g * bright);
        particleColors[offset + 2] = Math.min(1, tint.b * bright);
        particleLife[index] = 0.45 + Math.random() * 0.42;
      }
      particlePositionAttribute.needsUpdate = true;
      particleColorAttribute.needsUpdate = true;
      if (withShockwave) {
        const shockwave = shockwaves.reduce((oldest, candidate) => candidate.life < oldest.life ? candidate : oldest, shockwaves[0]);
        shockwave.life = 0.76;
        shockwave.speed = amount > 50 ? 18 : 10;
        shockwave.mesh.visible = true;
        shockwave.mesh.position.copy(position);
        shockwave.mesh.scale.setScalar(1);
        (shockwave.mesh.material as THREE.MeshBasicMaterial).color.set(color);
        (shockwave.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
      }
      cameraShake = Math.min(1.2, cameraShake + (amount > 50 ? 0.75 : 0.16));
    };

    const spawnUpgrade = (position: THREE.Vector3, waveId: number) => {
      let kind: UpgradeKind = (["double", "rapid", "bomb"] as UpgradeKind[])[waveId % 3];
      if (kind === "bomb" && bombs >= 5) kind = waveId % 2 ? "rapid" : "double";
      const mesh = createUpgradePickup(kind);
      mesh.position.set(
        THREE.MathUtils.clamp(position.x, -4.8, 4.8),
        THREE.MathUtils.clamp(position.y, -2.6, 3.4),
        THREE.MathUtils.clamp(position.z, -32, -14),
      );
      scene.add(mesh);
      upgrades.push({ mesh, kind, life: 13, phase: Math.random() * Math.PI * 2 });
    };

    const collectUpgrade = (pickup: UpgradePickup) => {
      const labels: Record<UpgradeKind, string> = { double: "DOUBLE LASERS", rapid: "RAPID FIRE", bomb: "SMART BOMB +1" };
      if (pickup.kind === "double") doubleTime = Math.min(28, doubleTime + 18);
      else if (pickup.kind === "rapid") rapidTime = Math.min(25, rapidTime + 16);
      else bombs = Math.min(5, bombs + 1);
      const banner = { kind: pickup.kind, label: labels[pickup.kind] };
      setUpgradeBanner(banner);
      window.setTimeout(() => setUpgradeBanner((current) => current === banner ? null : current), 1900);
      spawnBurst(pickup.mesh.position, pickup.kind === "bomb" ? "#ff6ca8" : pickup.kind === "rapid" ? "#ffe95c" : "#6dfff0", 38);
      audio.upgrade();
    };

    const resolveWaveMember = (enemy: Enemy, killed: boolean, position: THREE.Vector3, addedChildren = 0) => {
      if (enemy.waveId < 0) return;
      const state = waveState.get(enemy.waveId);
      if (!state) return;
      state.remaining += addedChildren - 1;
      if (!killed) state.failed = true;
      if (state.remaining <= 0) {
        waveState.delete(enemy.waveId);
        if (!state.failed) spawnUpgrade(position, enemy.waveId);
      }
    };

    const splitAsteroid = (enemy: Enemy) => {
      if (enemy.type !== "asteroid" || enemy.asteroidTier <= 0) return 0;
      const fragmentCount = enemy.asteroidTier === 2 ? 3 : 2;
      for (let fragment = 0; fragment < fragmentCount; fragment++) {
        spawnUnit("asteroid", fragment, fragmentCount, "pincer", enemy.waveId, enemy.asteroidTier - 1);
        const child = enemies[enemies.length - 1];
        const angle = (fragment / fragmentCount) * Math.PI * 2 + Math.random() * 0.45;
        child.mesh.position.copy(enemy.mesh.position);
        child.mesh.position.x += Math.cos(angle) * enemy.radius * 0.28;
        child.mesh.position.y += Math.sin(angle) * enemy.radius * 0.28;
        child.phase = Math.random() * Math.PI * 2;
        child.driftX = Math.cos(angle) * (1.8 + Math.random() * 2.4);
        child.driftY = Math.sin(angle) * (1.5 + Math.random() * 2.1);
        child.speed = enemy.speed * (1.08 + Math.random() * 0.14);
      }
      return fragmentCount;
    };

    const destroyEnemy = (enemy: Enemy, index: number, position: THREE.Vector3) => {
      const fragments = splitAsteroid(enemy);
      spawnBurst(position, enemy.boss ? "#ff3e55" : enemy.type === "asteroid" ? "#ffb06b" : "#7dfff1", enemy.boss ? 110 : enemy.type === "asteroid" ? 42 : 28);
      scene.remove(enemy.mesh);
      enemies.splice(index, 1);
      score += Math.round(ENEMY_STATS[enemy.type].score * combo * (enemy.asteroidTier >= 0 ? 1 + enemy.asteroidTier * 0.45 : 1));
      combo = Math.min(8, combo + (enemy.boss ? 1 : 0.35));
      comboTimer = 4;
      resolveWaveMember(enemy, true, position, fragments);
      audio.hit();
      if (enemy.boss) completeMission();
    };

    const damageEnemy = (enemy: Enemy, index: number, damage: number, position: THREE.Vector3) => {
      enemy.hp -= damage;
      if (enemy.boss) bossHealth = Math.max(0, (enemy.hp / ENEMY_STATS.boss.hp) * 100);
      if (enemy.hp <= 0) destroyEnemy(enemy, index, position);
    };

    const releaseLaser = (index: number) => {
      const [laser] = lasers.splice(index, 1);
      if (!laser) return;
      scene.remove(laser.mesh);
      laserPool.push(laser.mesh);
    };

    const releaseEnemyShot = (index: number) => {
      const [shot] = enemyShots.splice(index, 1);
      if (!shot) return;
      scene.remove(shot.mesh);
      enemyShotPool.push(shot.mesh);
    };

    const fireTurret = (enemy: Enemy) => {
      const mesh = enemyShotPool.pop() ?? new THREE.Mesh(enemyShotGeometry, enemyShotMaterial);
      mesh.position.set(enemy.mesh.position.x, enemy.mesh.position.y + 1.05, enemy.mesh.position.z + 0.7);
      const direction = ship.position.clone().sub(mesh.position).normalize();
      scene.add(mesh);
      enemyShots.push({ mesh, velocity: direction.multiplyScalar(22), previous: mesh.position.clone() });
      spawnBurst(mesh.position, "#ff8a32", 4, false);
    };

    const shoot = (now: number) => {
      if (now - lastShot < (rapidTime > 0 ? 0.075 : 0.14)) return;
      lastShot = now;
      let lockTarget: Enemy | null = null;
      let lockScore = Number.POSITIVE_INFINITY;
      enemies.forEach((enemy) => {
        if (enemy.mesh.position.z > 2 || enemy.mesh.position.z < -95) return;
        const lateralDistance = Math.hypot(enemy.mesh.position.x - ship.position.x, enemy.mesh.position.y - (ship.position.y + 0.08));
        const candidateScore = lateralDistance + Math.abs(enemy.mesh.position.z) * 0.008;
        if (lateralDistance < 2.65 && candidateScore < lockScore) {
          lockTarget = enemy;
          lockScore = candidateScore;
        }
      });
      const offsets = doubleTime > 0 ? [-0.3, 0.3] : [0];
      offsets.forEach((x) => {
        const laser = laserPool.pop() ?? new THREE.Mesh(laserGeometry, laserMaterial);
        laser.position.set(ship.position.x + x, ship.position.y + 0.08, ship.position.z - 1.1);
        const direction = lockTarget
          ? (lockTarget as Enemy).mesh.position.clone().sub(laser.position).normalize()
          : new THREE.Vector3(0, 0, -1);
        laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        scene.add(laser);
        lasers.push({ mesh: laser, velocity: direction.multiplyScalar(92), previous: laser.position.clone() });
      });
      cameraShake = Math.min(0.45, cameraShake + 0.035);
      audio.shot();
    };

    const takeDamage = (amount: number) => {
      if (invincible > 0) return;
      shield = Math.max(0, shield - amount);
      invincible = 0.55;
      combo = 1;
      setFlash(true);
      window.setTimeout(() => setFlash(false), 120);
      audio.hit();
      cameraShake = 1;
      audio.lowShield = shield < 28;
      if (shield <= 0) {
        setHud((h) => ({ ...h, shield: 0, score }));
        setPhase("gameover");
        showComms({ character: "asa", name: "ASA // SLOW OPS", line: "I can reboot it. Give me... three... keystrokes." });
      }
    };

    const completeMission = () => {
      audio.success();
      if (levelRef.current < 2) {
        levelRef.current = (levelRef.current + 1) as Level;
        setBriefLevel(levelRef.current);
        setPhase("briefing");
        showComms({ character: "bean", name: "SPACE BEAN", line: "One sector safe. Tiger’s trail is still warm." });
      } else {
        setPhase("victory");
        showComms({ character: "tiger", name: "TIGERTRON", line: "Fine. I shall knock over something smaller." });
      }
    };

    const launchBomb = () => {
      if (activeBomb || bombs <= 0) return;
      bombs--;
      bombCharge = 0;
      const mesh = createBombProjectile();
      mesh.position.set(ship.position.x, ship.position.y, ship.position.z - 1.3);
      scene.add(mesh);
      activeBomb = { mesh, age: 0 };
      audio.tone(260, 0.18, "sine", 0.06);
    };

    const detonateBomb = () => {
      if (!activeBomb) return;
      const bomb = activeBomb;
      const position = bomb.mesh.position.clone();
      const radius = 6 + Math.min(2, bomb.age) * 7;
      const damage = 4 + Math.round(Math.min(2, bomb.age) * 3.5);
      scene.remove(bomb.mesh);
      activeBomb = null;
      bombCharge = 0;
      spawnBurst(position, "#ff68b4", 120);
      const shockwave = shockwaves.reduce((oldest, candidate) => candidate.life < oldest.life ? candidate : oldest, shockwaves[0]);
      shockwave.life = 0.92;
      shockwave.speed = radius * 1.6;
      shockwave.mesh.visible = true;
      shockwave.mesh.position.copy(position);
      (shockwave.mesh.material as THREE.MeshBasicMaterial).color.set("#ff68b4");
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.mesh.position.distanceTo(position) <= radius + enemy.radius) {
          damageEnemy(enemy, i, enemy.boss ? Math.ceil(damage * 0.45) : damage, enemy.mesh.position.clone());
        }
      }
      cameraShake = 1.35;
      audio.bomb(bomb.age);
    };

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const rawDelta = clock.getDelta();
      const dt = Math.min(rawDelta, 0.035);
      const elapsed = clock.elapsedTime;
      const playing = phaseRef.current === "playing";
      performanceTime += rawDelta;
      performanceFrames++;
      if (performanceTime >= 2) {
        const measuredFps = performanceFrames / performanceTime;
        const previousScale = renderScale;
        if (measuredFps < 34 && renderScale > 0.62) renderScale = Math.max(0.62, renderScale - 0.08);
        else if (measuredFps > 54 && renderScale < maxRenderScale) renderScale = Math.min(maxRenderScale, renderScale + 0.04);
        if (renderScale !== previousScale) {
          renderer.setPixelRatio(renderScale);
          composer.setPixelRatio(renderScale);
        }
        renderer.domElement.dataset.fps = measuredFps.toFixed(0);
        renderer.domElement.dataset.renderScale = renderScale.toFixed(2);
        performanceTime = 0;
        performanceFrames = 0;
      }

      if (playing && !wasPlaying) resetMission();
      wasPlaying = playing;

      starLayers.forEach((layer, index) => {
        const velocity = layer.speed * (playing ? (commandRef.current.boost ? 2.65 : 1) : 0.18);
        layer.points.position.z += dt * velocity;
        if (layer.points.position.z > (index + 1) * 105) layer.points.position.z = -index * 80;
        layer.points.rotation.z += dt * (0.003 + index * 0.002);
        (layer.points.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      });
      nebulae.forEach((nebula, index) => {
        nebula.materials.forEach((material, materialIndex) => { material.uniforms.uTime.value = elapsed * (0.8 + index * 0.17) + materialIndex; });
        nebula.group.rotation.z = Math.sin(elapsed * nebula.speed) * 0.12;
        nebula.group.position.x += Math.sin(elapsed * 0.05 + index) * dt * 0.11;
      });
      if (planet.visible) {
        planet.rotation.y += dt * 0.025;
        clouds.rotation.y += dt * 0.039;
        aureliaOrbit.rotation.y += dt * 0.008;
        polarAurora.rotation.z += dt * 0.022;
      }
      if (gasWorld.visible) {
        gasPlanet.rotation.y += dt * 0.035;
        ringGroup.rotation.z += dt * 0.0025;
        const moonAngle = elapsed * 0.075;
        shepherdMoon.position.set(Math.cos(moonAngle) * 38, 12 + Math.sin(moonAngle * 1.7) * 4, Math.sin(moonAngle) * 31);
        shepherdMoon.rotation.y += dt * 0.1;
      }
      if (lavaWorld.visible) {
        lavaPlanet.rotation.y += dt * 0.032;
        ashClouds.rotation.y -= dt * 0.018;
        brokenMoon.rotation.x += dt * 0.07;
        brokenMoon.rotation.y += dt * 0.045;
      }
      if (kalderaSurface.visible) {
        const surfaceSpeed = 10 * (commandRef.current.boost ? 1.38 : 1);
        kalderaSurface.position.z += dt * surfaceSpeed;
        surfaceMoon.rotation.y += dt * 0.035;
        const localShipZ = ship.position.z - kalderaSurface.position.z;
        const groundClearance = kalderaTerrainHeight(ship.position.x, localShipZ) + 0.72;
        if (playing && ship.position.y < groundClearance) {
          ship.position.y = groundClearance;
          takeDamage(8);
          cameraShake = Math.max(cameraShake, 0.7);
        }
      }
      if (asteroidBelt.visible) {
        asteroidBelt.children.forEach((asteroid) => {
          asteroid.rotation.x += dt * asteroid.userData.drift;
          asteroid.rotation.y += dt * asteroid.userData.drift * 0.7;
          asteroid.position.z += dt * (commandRef.current.boost ? 18 : 7);
          if (asteroid.position.z > 5) asteroid.position.z = -250;
        });
      }

      const targetX = commandRef.current.x * 5.6;
      const targetY = -1.2 + commandRef.current.y * 3.2;
      ship.position.x += (targetX - ship.position.x) * Math.min(1, dt * 6.5);
      ship.position.y += (targetY - ship.position.y) * Math.min(1, dt * 6.5);
      ship.rotation.z += ((-commandRef.current.x * 0.42) - ship.rotation.z) * Math.min(1, dt * 7);
      ship.rotation.x += ((commandRef.current.y * 0.18) - ship.rotation.x) * Math.min(1, dt * 7);
      ship.position.z = 3 + Math.sin(elapsed * 2.8) * 0.035;
      engineTrails.forEach((child) => {
        if (child.userData.engineTrail) {
          child.scale.y = 0.88 + Math.random() * 0.3 + (commandRef.current.boost ? 0.62 : 0);
          (child.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.random() * 0.07 + (commandRef.current.boost ? 0.1 : 0);
        }
      });
      shieldRings.forEach((child) => {
        if (child.userData.shieldRing) {
          child.rotation.z += dt * 0.55;
          const pulse = 1 + Math.sin(elapsed * 2.4) * 0.025;
          child.scale.setScalar(pulse);
          (child.material as THREE.MeshBasicMaterial).opacity = 0.035 + (shield / 100) * 0.035;
        }
      });
      cameraShake *= Math.pow(0.018, dt);
      const shakeX = (Math.random() - 0.5) * cameraShake * 0.34;
      const shakeY = (Math.random() - 0.5) * cameraShake * 0.28;
      camera.position.x += (ship.position.x * 0.14 + shakeX - camera.position.x) * dt * 6;
      camera.position.y += ((ship.position.y * 0.08 + 1.4 + shakeY) - camera.position.y) * dt * 6;
      camera.rotation.z += ((-ship.rotation.z * 0.045 + Math.sin(elapsed * 0.21) * 0.002) - camera.rotation.z) * dt * 2.4;
      const targetFov = 62 + (commandRef.current.boost ? 10 : 0) + smoothedIntensity * 1.8;
      const nextFov = camera.fov + (targetFov - camera.fov) * dt * 4.5;
      if (Math.abs(nextFov - camera.fov) > 0.002) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }

      if (playing) {
        missionTime += dt * (commandRef.current.boost ? 1.38 : 1);
        comboTimer -= dt;
        invincible -= dt;
        doubleTime = Math.max(0, doubleTime - dt);
        rapidTime = Math.max(0, rapidTime - dt);
        if (comboTimer <= 0) combo = Math.max(1, combo - dt * 0.25);
        if (commandRef.current.firing) shoot(elapsed);
        if (commandRef.current.bombPressed || (commandRef.current.bombing && !bombWasHeld)) {
          commandRef.current.bombPressed = false;
          bombWasHeld = true;
          launchBomb();
        }
        if (commandRef.current.bombReleased || (!commandRef.current.bombing && bombWasHeld)) {
          commandRef.current.bombReleased = false;
          bombWasHeld = false;
          detonateBomb();
        }
        if (activeBomb) {
          activeBomb.age += dt;
          bombCharge = Math.min(1, activeBomb.age / 2);
          activeBomb.mesh.position.z -= dt * (21 + activeBomb.age * 6);
          activeBomb.mesh.rotation.y += dt * 4.2;
          activeBomb.mesh.children.forEach((child) => {
            if (child.userData.bombRing) child.rotation.z += dt * 5.5;
          });
          const pulse = 1 + Math.sin(activeBomb.age * 18) * 0.12;
          activeBomb.mesh.scale.setScalar(pulse);
          if (activeBomb.age >= 2 || activeBomb.mesh.position.z < -80) detonateBomb();
        }
        const actionLevel = THREE.MathUtils.clamp(enemies.length / 9 + (bossSpawned ? 0.34 : 0) + (1 - shield / 100) * 0.3 + (commandRef.current.boost ? 0.2 : 0), 0, 1);
        smoothedIntensity += (actionLevel - smoothedIntensity) * Math.min(1, dt * 2.8);
        audio.setIntensity(smoothedIntensity, levelRef.current);
        bloom.strength += ((0.16 + smoothedIntensity * 0.12 + (commandRef.current.boost ? 0.04 : 0)) - bloom.strength) * dt * 4;
        bloom.radius += ((0.18 + smoothedIntensity * 0.06) - bloom.radius) * dt * 3;
        cinematicPass.uniforms.amount.value = 0.00055 + smoothedIntensity * 0.0017 + (shield < 28 ? 0.0012 : 0);

        const wavePlan = WAVE_PLANS[levelRef.current];
        if (!bossSpawned && waveIndex < wavePlan.length && missionTime >= wavePlan[waveIndex].time) {
          spawnWave(wavePlan[waveIndex], waveIndex);
          waveIndex++;
        }

        const finalWaveTime = wavePlan[wavePlan.length - 1].time;
        if (waveIndex >= wavePlan.length && !bossSpawned && missionTime > finalWaveTime + 4 && (enemies.length === 0 || missionTime > finalWaveTime + 11)) {
          bossSpawned = true;
          spawnBoss();
          setWaveBanner({ number: wavePlan.length + 1, name: levelRef.current === 2 ? "TIGERTRON" : "COMMAND ACE" });
          showComms(levelRef.current === 2
            ? { character: "tiger", name: "TIGERTRON // BOSS", line: "Behold my ultimate weapon: THE EDGE OF THE TABLE!" }
            : { character: "lola", name: "LOLA // DEEP COVER", line: "Big target incoming. Very dramatic. I approve." });
        }

        const storyStep = Math.floor(missionTime / 11);
        if (storyStep > messageIndex && storyStep < STORY[levelRef.current].length) {
          messageIndex = storyStep;
          showComms(STORY[levelRef.current][storyStep]);
        }
      }

      for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        let hitTarget = false;
        laser.previous.copy(laser.mesh.position);
        laser.mesh.position.addScaledVector(laser.velocity, dt);
        if (laser.mesh.position.z < -145 || Math.abs(laser.mesh.position.x) > 28 || Math.abs(laser.mesh.position.y) > 20) {
          releaseLaser(i);
          continue;
        }
        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemy = enemies[j];
          if (segmentHitsSphere(laser.previous, laser.mesh.position, enemy.mesh.position, enemy.radius + 0.16)) {
            hitTarget = true;
            releaseLaser(i);
            spawnBurst(enemy.mesh.position.clone().lerp(laser.mesh.position, 0.18), enemy.boss ? "#ff623a" : LEVELS[levelRef.current].color, 7);
            damageEnemy(enemy, j, 1, enemy.mesh.position.clone());
            break;
          }
        }
        if (!hitTarget && kalderaSurface.visible) {
          for (let treeIndex = 0; treeIndex < treeTargets.length; treeIndex++) {
            const tree = treeTargets[treeIndex];
            if (!tree.active) continue;
            treeWorldPosition.set(tree.x, tree.y + tree.scale * 1.55, tree.z + kalderaSurface.position.z);
            if (treeWorldPosition.z < -120 || treeWorldPosition.z > 8) continue;
            if (segmentHitsSphere(laser.previous, laser.mesh.position, treeWorldPosition, 0.62 * tree.scale)) {
              releaseLaser(i);
              tree.burning = Math.min(6, Math.max(4.5, tree.burning + 1.1));
              tree.fireTick = 0;
              treeCrowns.setColorAt(tree.index, new THREE.Color("#ff5928"));
              if (treeCrowns.instanceColor) treeCrowns.instanceColor.needsUpdate = true;
              spawnBurst(treeWorldPosition, "#ff8a2b", 12, false);
              score += 250;
              break;
            }
          }
        }
      }

      for (let i = enemyShots.length - 1; i >= 0; i--) {
        const shot = enemyShots[i];
        shot.previous.copy(shot.mesh.position);
        shot.mesh.position.addScaledVector(shot.velocity, dt);
        if (segmentHitsSphere(shot.previous, shot.mesh.position, ship.position, 0.62)) {
          takeDamage(6);
          spawnBurst(shot.mesh.position, "#ff6b2c", 10, false);
          releaseEnemyShot(i);
        } else if (shot.mesh.position.z > 12 || shot.mesh.position.z < -140 || Math.abs(shot.mesh.position.x) > 30 || Math.abs(shot.mesh.position.y) > 22) {
          releaseEnemyShot(i);
        }
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const previousPosition = enemy.previous.copy(enemy.mesh.position);
        enemy.phase += dt;
        const travelSpeed = enemy.type === "turret" ? 10 * (commandRef.current.boost ? 1.38 : 1) : enemy.speed;
        enemy.mesh.position.z += dt * travelSpeed;
        if (enemy.type === "asteroid") {
          enemy.mesh.rotation.x += dt * 0.7;
          enemy.mesh.rotation.z += dt * 0.48;
          enemy.mesh.position.x += enemy.driftX * dt;
          enemy.mesh.position.y += enemy.driftY * dt;
        } else if (enemy.type === "turret") {
          enemy.fireCooldown -= dt;
          const housing = enemy.mesh.userData.turretHousing as THREE.Mesh | undefined;
          if (housing) housing.rotation.y = Math.sin(enemy.phase * 0.8) * 0.25;
          if (playing && enemy.mesh.position.z > -72 && enemy.mesh.position.z < -10 && enemy.fireCooldown <= 0) {
            fireTurret(enemy);
            enemy.fireCooldown = 2.2 + enemy.slot * 0.18;
          }
        } else if (!enemy.boss) {
          const slotPhase = enemy.slot * 0.66;
          let x = enemy.anchor.x;
          let y = enemy.anchor.y;
          if (enemy.formation === "wedge") {
            x += Math.sin(enemy.phase * 1.8 + slotPhase) * 0.42;
            y += Math.cos(enemy.phase * 1.35 + slotPhase) * 0.28;
          } else if (enemy.formation === "pincer") {
            x *= 0.86 + Math.sin(enemy.phase * 1.2) * 0.14;
            y += Math.sin(enemy.phase * 2 + slotPhase) * 0.34;
          } else if (enemy.formation === "wall") {
            x += Math.sin(enemy.phase * 1.4 + slotPhase) * 0.58;
            y += Math.sin(enemy.phase * 0.9) * 0.3;
          } else if (enemy.formation === "helix") {
            const angle = enemy.phase * 1.2 + (enemy.slot / Math.max(1, enemy.squadSize)) * Math.PI * 2;
            x = Math.cos(angle) * 4.8;
            y = Math.sin(angle) * 2.8;
          } else if (enemy.formation === "escort") {
            x += Math.sin(enemy.phase * 1.6 + slotPhase) * 0.32;
            y += Math.cos(enemy.phase * 1.2 + slotPhase) * 0.3;
          } else if (enemy.formation === "cross") {
            const sweep = Math.sin(enemy.phase * 1.05) * 0.7;
            x += enemy.anchor.y === 0 ? sweep : 0;
            y += enemy.anchor.x === 0 ? sweep * 0.6 : 0;
          }
          enemy.mesh.position.x = x;
          enemy.mesh.position.y = y;
          const lateralVelocity = x - previousPosition.x;
          enemy.mesh.rotation.z += ((-lateralVelocity * 2.3) - enemy.mesh.rotation.z) * Math.min(1, dt * 5);
          if (enemy.type === "bot") enemy.mesh.rotation.y = Math.sin(enemy.phase * 1.7) * 0.14;
          if (enemy.type === "interceptor") enemy.mesh.rotation.z += dt * 0.8;
        }
        if (enemy.boss) {
          enemy.mesh.position.x = Math.sin(enemy.phase * 0.8) * 4.5;
          enemy.mesh.position.y = 1 + Math.cos(enemy.phase * 1.25) * 1.3;
          enemy.mesh.position.z = Math.min(-20, enemy.mesh.position.z);
        }
        if (!enemy.boss) {
          const collidedWithShip = segmentHitsSphere(previousPosition, enemy.mesh.position, ship.position, enemy.radius + 0.64);
          if (collidedWithShip || enemy.mesh.position.z > 8) {
            if (collidedWithShip) {
              takeDamage(enemy.damage);
              spawnBurst(enemy.mesh.position, "#ff4f66", 25);
            }
            resolveWaveMember(enemy, false, enemy.mesh.position);
            scene.remove(enemy.mesh);
            enemies.splice(i, 1);
          }
        }
      }

      for (let i = upgrades.length - 1; i >= 0; i--) {
        const pickup = upgrades[i];
        pickup.life -= dt;
        pickup.phase += dt;
        pickup.mesh.position.z += dt * 9.5;
        pickup.mesh.position.y += Math.sin(pickup.phase * 2.6) * dt * 0.32;
        pickup.mesh.rotation.y += dt * 1.15;
        pickup.mesh.children.forEach((child) => {
          if (child.userData.upgradeRing) child.rotation.z += dt * child.userData.upgradeRing * 1.8;
        });
        if (pickup.mesh.position.distanceToSquared(ship.position) < 2.25) {
          collectUpgrade(pickup);
          scene.remove(pickup.mesh);
          upgrades.splice(i, 1);
        } else if (pickup.life <= 0 || pickup.mesh.position.z > 8) {
          scene.remove(pickup.mesh);
          upgrades.splice(i, 1);
        }
      }

      if (playing && kalderaSurface.visible) {
        let treeMatrixChanged = false;
        treeTargets.forEach((tree) => {
          if (!tree.active || tree.burning <= 0) return;
          tree.burning -= dt;
          tree.fireTick -= dt;
          treeWorldPosition.set(tree.x, tree.y + tree.scale * 1.75, tree.z + kalderaSurface.position.z);
          if (tree.fireTick <= 0 && treeWorldPosition.z > -110 && treeWorldPosition.z < 10) {
            tree.fireTick = 0.16 + seededNoise(tree.index, Math.floor(missionTime * 4), 777) * 0.12;
            spawnBurst(treeWorldPosition, Math.floor(tree.burning * 5) % 2 ? "#ff4c16" : "#ffbd36", 3, false);
          }
          if (tree.burning <= 0) {
            tree.active = false;
            treeMatrix.makeScale(0, 0, 0);
            treeTrunks.setMatrixAt(tree.index, treeMatrix);
            treeCrowns.setMatrixAt(tree.index, treeMatrix);
            treeMatrixChanged = true;
            spawnBurst(treeWorldPosition, "#63251d", 9, false);
          }
        });
        if (treeMatrixChanged) {
          treeTrunks.instanceMatrix.needsUpdate = true;
          treeCrowns.instanceMatrix.needsUpdate = true;
        }
      }

      let particleChanged = false;
      const particleDamping = Math.pow(0.035, dt);
      for (let i = 0; i < maxParticles; i++) {
        if (particleLife[i] <= 0) continue;
        particleChanged = true;
        particleLife[i] -= dt;
        const offset = i * 3;
        if (particleLife[i] <= 0) {
          particlePositions[offset] = particlePositions[offset + 1] = particlePositions[offset + 2] = 9999;
          continue;
        }
        particlePositions[offset] += particleVelocities[offset] * dt;
        particlePositions[offset + 1] += particleVelocities[offset + 1] * dt;
        particlePositions[offset + 2] += particleVelocities[offset + 2] * dt;
        particleVelocities[offset] *= particleDamping;
        particleVelocities[offset + 1] *= particleDamping;
        particleVelocities[offset + 2] *= particleDamping;
      }
      if (particleChanged) particlePositionAttribute.needsUpdate = true;
      shockwaves.forEach((shockwave) => {
        if (shockwave.life <= 0) return;
        shockwave.life -= dt;
        shockwave.mesh.scale.addScalar(dt * shockwave.speed);
        shockwave.mesh.lookAt(camera.position);
        (shockwave.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, shockwave.life * 0.78);
        if (shockwave.life <= 0) shockwave.mesh.visible = false;
      });

      hudAccumulator += dt;
      if (playing) {
        if (hudAccumulator >= 0.083) {
          const plan = WAVE_PLANS[levelRef.current];
          const progress = bossSpawned ? 88 + (100 - bossHealth) * 0.12 : Math.min(88, (missionTime / (plan[plan.length - 1].time + 8)) * 88);
          const displayWave = bossSpawned ? plan.length + 1 : waveIndex;
          const displayName = bossSpawned ? (levelRef.current === 2 ? "TIGERTRON" : "COMMAND ACE") : waveIndex > 0 ? plan[waveIndex - 1].name : "STANDBY";
          setHud({ shield, score, combo: Math.floor(combo), progress, level: levelRef.current, objective: LEVELS[levelRef.current].objective, boss: bossHealth, wave: displayWave, waveName: displayName, doubleTime, rapidTime, bombs, bombCharge });
          hudAccumulator = 0;
        }
      } else {
        smoothedIntensity += (0.08 - smoothedIntensity) * Math.min(1, dt * 1.5);
        audio.setIntensity(smoothedIntensity, levelRef.current);
        bloom.strength += (0.18 - bloom.strength) * dt * 2;
        cinematicPass.uniforms.amount.value = 0.00065;
      }
      composer.render();
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(renderScale);
      composer.setSize(mount.clientWidth, mount.clientHeight);
      composer.setPixelRatio(renderScale);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      if (event.key === " " || event.key.toLowerCase() === "j") commandRef.current.firing = true;
      if (event.key.toLowerCase() === "b" && !event.repeat && phaseRef.current === "playing") {
        commandRef.current.bombing = true;
        commandRef.current.bombPressed = true;
      }
      if (event.key === "Shift") { commandRef.current.boost = true; audio.boost(); }
      if (event.key === "Escape" && phaseRef.current === "playing") setPhase("paused");
      else if (event.key === "Escape" && phaseRef.current === "paused") setPhase("playing");
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") commandRef.current.x = -1;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") commandRef.current.x = 1;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") commandRef.current.y = 1;
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") commandRef.current.y = -1;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " || event.key.toLowerCase() === "j") commandRef.current.firing = false;
      if (event.key.toLowerCase() === "b") {
        commandRef.current.bombing = false;
        commandRef.current.bombReleased = true;
      }
      if (event.key === "Shift") commandRef.current.boost = false;
      if (["ArrowLeft", "ArrowRight"].includes(event.key) || ["a", "d"].includes(event.key.toLowerCase())) commandRef.current.x = 0;
      if (["ArrowUp", "ArrowDown"].includes(event.key) || ["w", "s"].includes(event.key.toLowerCase())) commandRef.current.y = 0;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || phaseRef.current !== "playing") return;
      const rect = mount.getBoundingClientRect();
      commandRef.current.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      commandRef.current.y = THREE.MathUtils.clamp((0.5 - (event.clientY - rect.top) / rect.height) * 2, -1, 1);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && phaseRef.current === "playing") commandRef.current.firing = true;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") commandRef.current.firing = false;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(animationFrame);
      audio.destroy();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      composer.dispose();
      pmrem.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [setPhase, showComms]);

  const joystickMove = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    const y = THREE.MathUtils.clamp((0.5 - (event.clientY - rect.top) / rect.height) * 2, -1, 1);
    commandRef.current.x = x;
    commandRef.current.y = y;
    const nub = event.currentTarget.querySelector<HTMLElement>(".joystick__nub");
    if (nub) nub.style.transform = `translate(${x * 34}px, ${-y * 34}px)`;
  };

  const joystickEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    commandRef.current.x = 0;
    commandRef.current.y = 0;
    const nub = event.currentTarget.querySelector<HTMLElement>(".joystick__nub");
    if (nub) nub.style.transform = "translate(0, 0)";
  };

  const restart = () => {
    const level = levelRef.current;
    setHud({ ...INITIAL_HUD, level, objective: LEVELS[level].objective });
    setBriefLevel(level);
    setPhase("briefing");
  };

  const toggleSound = () => setSoundOff(audioRef.current?.toggle() ?? false);
  const level = LEVELS[hud.level];

  return (
    <main className={`game game--${phase} ${hud.shield < 28 && phase === "playing" ? "game--danger" : ""} ${flash ? "game--hit" : ""}`}>
      <div ref={mountRef} className="viewport" aria-label="3D space combat view" />
      <div className="scanlines" />
      <div className="vignette" />

      <header className="topbar">
        <div className="brandmark"><span>SB</span><div><b>SPACE BEAN</b><small>GALACTIC DEFENSE // 2372</small></div></div>
        <div className="topbar__actions">
          <button className="icon-button" onClick={toggleSound} aria-label={soundOff ? "Turn sound on" : "Mute sound"}>{soundOff ? "SOUND OFF" : "SOUND ON"}</button>
          {(phase === "playing" || phase === "paused") && <button className="icon-button icon-button--square" onClick={() => setPhase(phase === "paused" ? "playing" : "paused")} aria-label={phase === "paused" ? "Resume" : "Pause"}>{phase === "paused" ? "▶" : "Ⅱ"}</button>}
        </div>
      </header>

      {phase === "title" && (
        <section className="title-screen">
          <div className="eyebrow"><span /> A LITTLE DOG. A VERY BIG UNIVERSE.</div>
          <h1><span>SPACE</span><strong>BEAN</strong></h1>
          <p className="title-screen__subtitle">TIGERTRON RISING</p>
          <p className="title-screen__intro">When chaos calls, Little Bean answers. Take the controls of the USSF Chihuahua 2372 and chase one catastrophically needy cat across the galaxy.</p>
          <button className="beanophone" onClick={startPrologue}>
            <span className="beanophone__ring"><i /><i /><i /></span>
            <span><small>INCOMING</small>ANSWER THE BEAN-O-PHONE</span>
          </button>
          <div className="dev-level-select" aria-label="Developer starting level selection">
            <small>DEVELOPER FLIGHT SELECT // TEMPORARY</small>
            <div>
              {LEVELS.map((mission, index) => (
                <button key={mission.code} onClick={() => selectStartingLevel(index as Level)}><b>{mission.code}</b><span>{mission.name}</span></button>
              ))}
            </div>
          </div>
          <div className="controls-hint"><span>MOVE <b>WASD / DRAG</b></span><span>FIRE <b>SPACE / TAP</b></span><span>BOMB <b>HOLD B / RELEASE</b></span><span>BOOST <b>SHIFT / HOLD</b></span></div>
        </section>
      )}

      {phase === "cutscene" && (
        <section className={`cutscene cutscene--${CUTSCENES[cutsceneIndex].focus}`}>
          <div className="cutscene__image-wrap">
            <img key={CUTSCENES[cutsceneIndex].image + cutsceneIndex} src={CUTSCENES[cutsceneIndex].image} alt="" className="cutscene__image" />
            <div className="cutscene__grade" />
          </div>
          <div className="cutscene__letterbox cutscene__letterbox--top" />
          <div className="cutscene__letterbox cutscene__letterbox--bottom" />
          <div className="cutscene__meta">
            <span>STORY TRANSMISSION // {String(cutsceneIndex + 1).padStart(2, "0")}</span>
            <b>{CUTSCENES[cutsceneIndex].location}</b>
          </div>
          <button className="cutscene__skip" onClick={finishCutscene}>SKIP CINEMATIC <b>»</b></button>
          <div className="cutscene__subtitles">
            <small>{CUTSCENES[cutsceneIndex].speaker}</small>
            <p>{CUTSCENES[cutsceneIndex].line}</p>
            <div className="cutscene__progress"><i style={{ width: `${((cutsceneIndex + 1) / CUTSCENES.length) * 100}%` }} /></div>
          </div>
          <button className="cutscene__next" onClick={advanceCutscene} aria-label="Next cinematic scene">→</button>
          <audio
            key={CUTSCENES[cutsceneIndex].audio}
            ref={cutsceneAudioRef}
            src={CUTSCENES[cutsceneIndex].audio}
            autoPlay
            playsInline
            muted={soundOff}
            onEnded={advanceCutscene}
          />
        </section>
      )}

      {phase === "briefing" && (
        <section className="briefing">
          <div className="briefing__map">
            <div className="campaign-map">
              <div className="campaign-map__grid" />
              <div className="campaign-map__nebula campaign-map__nebula--one" />
              <div className="campaign-map__nebula campaign-map__nebula--two" />
              <div className="route-line route-line--one" /><div className="route-line route-line--two" /><div className="route-line route-line--three" />
              {CAMPAIGN_NODES.map((node, index) => {
                const destination = briefLevel + 1;
                const status = index < destination ? "complete" : index === destination ? "active" : "locked";
                return (
                  <div key={node.name} className={`map-node map-node--${status} map-node--${index}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                    <i><span /></i><div><small>{node.type}</small><b>{node.name}</b></div>
                  </div>
                );
              })}
              <div className="map-landmark map-landmark--hulk"><i />ABANDONED HULK</div>
              <div className="map-landmark map-landmark--relay"><i />STOLEN RELAY</div>
              <div className="map-landmark map-landmark--sat"><i />FALLING SATELLITES</div>
              <div className="campaign-map__legend"><span><i /> CLEARED</span><span><i /> NEXT VECTOR</span><span>2372 // NAV ONLINE</span></div>
            </div>
          </div>
          <div className="briefing__copy">
            <div className="eyebrow"><span /> MISSION {LEVELS[briefLevel].code} // {LEVELS[briefLevel].kicker}</div>
            <h2>{LEVELS[briefLevel].name}</h2>
            <p>{MISSION_INTEL[briefLevel].story}</p>
            <div className="briefing__objective"><small>PRIMARY OBJECTIVE</small><span>{LEVELS[briefLevel].objective}</span></div>
            <div className="briefing__intel">
              <div><b>THREAT</b><span>{briefLevel === 0 ? "RISING" : briefLevel === 1 ? "SEVERE" : "ABSURD"}</span></div>
              <div><b>FLIGHT PATH</b><span>{MISSION_INTEL[briefLevel].eta}</span></div>
              <div><b>NAV SIGNAL</b><span>{MISSION_INTEL[briefLevel].signal}</span></div>
            </div>
            <button className="primary-button" onClick={startMission}><span>LAUNCH CHIHUAHUA 2372</span><b>→</b></button>
          </div>
        </section>
      )}

      {(phase === "playing" || phase === "paused") && (
        <>
          <section className="hud" aria-live="polite">
            <div className="hud__left">
              <div className="meter-label"><span>SHIELD ARRAY</span><b>{Math.round(hud.shield)}%</b></div>
              <div className="shield-meter"><i style={{ width: `${hud.shield}%` }} /></div>
              <div className="objective"><small>ACTIVE OBJECTIVE</small><span>{hud.objective}</span></div>
            </div>
            <div className="hud__center"><span className="reticle"><i /><i /></span><small>WAVE {hud.wave}/{WAVE_PLANS[hud.level].length + 1}</small><em>{hud.waveName}</em></div>
            <div className="hud__right">
              <small>SCORE</small><strong>{hud.score.toString().padStart(7, "0")}</strong>
              <div className="combo">CHAIN <b>×{hud.combo}</b></div>
            </div>
            <div className="loadout-panel">
              <div className={hud.doubleTime > 0 ? "loadout-panel__item is-active" : "loadout-panel__item"}><i>Ⅱ</i><span>DOUBLE</span><b>{hud.doubleTime > 0 ? `${Math.ceil(hud.doubleTime)}s` : "—"}</b></div>
              <div className={hud.rapidTime > 0 ? "loadout-panel__item is-active loadout-panel__item--rapid" : "loadout-panel__item"}><i>»</i><span>RAPID</span><b>{hud.rapidTime > 0 ? `${Math.ceil(hud.rapidTime)}s` : "—"}</b></div>
              <div className="loadout-panel__item loadout-panel__item--bomb"><i>●</i><span>BOMBS</span><b>{hud.bombs}/5</b></div>
            </div>
            <div className="mission-track"><i style={{ width: `${hud.progress}%`, background: level.color }} /><span style={{ left: `${Math.min(97, hud.progress)}%` }} /></div>
            {hud.progress >= 88 && <div className="boss-meter"><small>{hud.level === 2 ? "TIGERTRON" : "COMMAND UNIT"}</small><i><b style={{ width: `${hud.boss}%` }} /></i></div>}
          </section>

          {waveBanner && (
            <div className="wave-banner" aria-live="polite">
              <small>HOSTILE FORMATION // {String(waveBanner.number).padStart(2, "0")}</small>
              <strong>{waveBanner.name}</strong>
              <span>BREAK THE FORMATION</span>
            </div>
          )}

          {upgradeBanner && (
            <div className={`upgrade-banner upgrade-banner--${upgradeBanner.kind}`} aria-live="polite">
              <i><span>{upgradeBanner.kind === "double" ? "Ⅱ" : upgradeBanner.kind === "rapid" ? "»" : "●"}</span></i>
              <div><small>BEAN TECH ACQUIRED</small><strong>{upgradeBanner.label}</strong></div>
            </div>
          )}

          <div className="touch-controls">
            <div className="joystick" onPointerDown={joystickMove} onPointerMove={(e) => e.buttons && joystickMove(e)} onPointerUp={joystickEnd} onPointerCancel={joystickEnd} aria-label="Flight joystick"><span className="joystick__nub" /></div>
            <div className="action-cluster">
              <button className="boost-button" onPointerDown={() => { commandRef.current.boost = true; audioRef.current?.boost(); }} onPointerUp={() => { commandRef.current.boost = false; }} onPointerCancel={() => { commandRef.current.boost = false; }}><small>HOLD</small>BOOST</button>
              <button
                className={`bomb-button ${hud.bombCharge > 0 ? "bomb-button--charging" : ""}`}
                disabled={hud.bombs <= 0}
                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); commandRef.current.bombing = true; commandRef.current.bombPressed = true; audioRef.current?.start(); }}
                onPointerUp={() => { commandRef.current.bombing = false; commandRef.current.bombReleased = true; }}
                onPointerCancel={() => { commandRef.current.bombing = false; commandRef.current.bombReleased = true; }}
                aria-label={`Hold and release smart bomb. ${hud.bombs} remaining`}
              >
                <i style={{ background: `conic-gradient(#ff77b6 ${hud.bombCharge * 360}deg, rgba(255,119,182,.12) 0deg)` }} />
                <small>HOLD / RELEASE</small><span>BOMB</span><b>×{hud.bombs}</b>
              </button>
              <button className="fire-button" onPointerDown={() => { commandRef.current.firing = true; audioRef.current?.start(); }} onPointerUp={() => { commandRef.current.firing = false; }} onPointerCancel={() => { commandRef.current.firing = false; }}><span>FIRE</span></button>
            </div>
          </div>
        </>
      )}

      {comms && phase !== "briefing" && phase !== "cutscene" && (
        <aside className={`comms comms--${comms.character}`}>
          <Portrait character={comms.character} />
          <div><small>{comms.name}</small><p>{comms.line}</p></div>
          <span className="comms__signal">▥ ▥ ▥</span>
        </aside>
      )}

      {phase === "paused" && (
        <section className="modal">
          <div className="modal__card"><div className="eyebrow"><span /> FLIGHT SUSPENDED</div><h2>PAUSED</h2><p>Even heroes need to shake out their tiny paws.</p><button className="primary-button" onClick={() => setPhase("playing")}><span>BACK TO THE FIGHT</span><b>▶</b></button></div>
        </section>
      )}

      {phase === "gameover" && (
        <section className="modal">
          <div className="modal__card modal__card--danger"><div className="eyebrow"><span /> SYSTEMS OFFLINE</div><h2>SHIP DOWN</h2><p>The Bean is small, but her reboot energy is enormous.</p><button className="primary-button" onClick={restart}><span>REBOOT MISSION</span><b>↻</b></button></div>
        </section>
      )}

      {phase === "victory" && (
        <section className="modal victory">
          <div className="modal__card"><div className="victory__burst">✦</div><div className="eyebrow"><span /> GALAXY SECURED</div><h2>GOOD GIRL.</h2><p>TigerTron has retreated. The cosmic shelves are safe—for now.</p><div className="victory__score"><small>FINAL SCORE</small><strong>{hud.score.toLocaleString()}</strong></div><button className="primary-button" onClick={restart}><span>FLY AGAIN</span><b>→</b></button></div>
        </section>
      )}

      {hud.shield < 28 && phase === "playing" && <div className="danger-callout"><b>⚠ SHIELD CRITICAL</b><span>EVASIVE ACTION</span></div>}
    </main>
  );
}
