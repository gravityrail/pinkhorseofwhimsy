import { currentConfig } from '../core/Config';

/**
 * Manages all audio for the game using Web Audio API
 */
export class AudioEngine {
  private static instance: AudioEngine;
  private context: AudioContext;
  private masterGain: GainNode;
  private categoryGains: Map<AudioCategory, GainNode>;
  private loadedBuffers: Map<string, AudioBuffer>;
  private activeNodes: Map<string, AudioNode[]>;
  private convolver: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode;
  private initialized: boolean = false;
  private muted: boolean = false;

  /**
   * Audio categories for volume control
   */
  public static readonly CATEGORIES = {
    MASTER: 'master' as AudioCategory,
    ENGINE: 'engine' as AudioCategory,
    SURFACE: 'surface' as AudioCategory,
    MUSIC: 'music' as AudioCategory,
    SFX: 'sfx' as AudioCategory,
    UI: 'ui' as AudioCategory,
  };

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    // Create audio context
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Initialize gain nodes for volume control
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    
    // Compressor for dynamic range control
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.masterGain);
    
    // Initialize category gain nodes
    this.categoryGains = new Map();
    Object.values(AudioEngine.CATEGORIES).forEach(category => {
      const gain = this.context.createGain();
      gain.connect(this.compressor);
      this.categoryGains.set(category, gain);
    });
    
    // Initialize collections
    this.loadedBuffers = new Map();
    this.activeNodes = new Map();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Initialize audio engine
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Resume audio context (needed for autoplay policies)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    
    // Load impulse response for reverb
    try {
      await this.loadReverb();
    } catch (error) {
      console.warn('Failed to load reverb impulse response:', error);
    }
    
    this.initialized = true;
    console.log('AudioEngine initialized');
  }

  /**
   * Load reverb impulse response
   */
  private async loadReverb(): Promise<void> {
    // Simple reverb would be loaded from an impulse response file
    // For now we'll use a dynamically generated one
    const duration = 2;
    const decay = 2;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    
    // Create impulse
    for (let i = 0; i < 2; i++) {
      const channelData = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        const n = j / length;
        channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      }
    }
    
    // Create convolver
    this.convolver = this.context.createConvolver();
    this.convolver.buffer = impulse;
  }

  /**
   * Load an audio file and return its buffer
   */
  public async loadSound(url: string, key: string): Promise<AudioBuffer> {
    if (this.loadedBuffers.has(key)) {
      return this.loadedBuffers.get(key)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      this.loadedBuffers.set(key, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load sound: ${url}`, error);
      throw error;
    }
  }

  /**
   * Create an oscillator for generating sound
   */
  public createOscillator(type: OscillatorType = 'sine', frequency: number = 440): OscillatorNode {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    return oscillator;
  }

  /**
   * Play a sound from its buffer
   */
  public playSound(key: string, options: PlaySoundOptions = {}): AudioSourceInfo | null {
    const {
      category = AudioEngine.CATEGORIES.SFX,
      loop = false,
      volume = 1,
      pitch = 1,
      pan = 0,
      startTime = 0,
      stopTime = 0,
      id = key + Date.now(),
    } = options;

    // Check if buffer exists
    const buffer = this.loadedBuffers.get(key);
    if (!buffer) {
      console.warn(`Sound not loaded: ${key}`);
      return null;
    }

    // Get category gain
    const categoryGain = this.categoryGains.get(category);
    if (!categoryGain) {
      console.warn(`Invalid category: ${category}`);
      return null;
    }

    // Create source
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = pitch;

    // Create gain for this specific sound
    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    // Create panner for positioning
    const panner = this.context.createStereoPanner();
    panner.pan.value = pan;

    // Connect everything
    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(categoryGain);

    // Start playback
    const currentTime = this.context.currentTime;
    
    if (startTime > 0) {
      source.start(currentTime, startTime);
    } else {
      source.start();
    }
    
    if (stopTime > 0 && !loop) {
      source.stop(currentTime + stopTime);
    }

    // Store active nodes to allow adjustment and stopping
    if (!this.activeNodes.has(id)) {
      this.activeNodes.set(id, []);
    }
    this.activeNodes.get(id)!.push(source, gainNode, panner);

    // Setup cleanup on end
    source.onended = () => {
      this.stopSound(id);
    };

    // Return info for caller to control this sound
    return {
      id,
      source,
      gain: gainNode,
      panner,
      category
    };
  }

  /**
   * Stop a playing sound by id
   */
  public stopSound(id: string): void {
    const nodes = this.activeNodes.get(id);
    if (!nodes) return;

    // First node should be the source
    const source = nodes[0] as AudioBufferSourceNode;
    try {
      source.stop();
    } catch (e) {
      // Source might already be stopped
    }

    // Clean up nodes
    this.activeNodes.delete(id);
  }

  /**
   * Adjust volume of a playing sound
   */
  public setVolume(id: string, volume: number): void {
    const nodes = this.activeNodes.get(id);
    if (!nodes || nodes.length < 2) return;

    // Second node should be the gain node
    const gain = nodes[1] as GainNode;
    gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.1);
  }

  /**
   * Adjust pitch of a playing sound
   */
  public setPitch(id: string, pitch: number): void {
    const nodes = this.activeNodes.get(id);
    if (!nodes) return;

    // First node should be the source
    const source = nodes[0] as AudioBufferSourceNode;
    source.playbackRate.setTargetAtTime(pitch, this.context.currentTime, 0.1);
  }

  /**
   * Set volume for an audio category
   */
  public setCategoryVolume(category: AudioCategory, volume: number): void {
    if (category === AudioEngine.CATEGORIES.MASTER) {
      this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.1);
      return;
    }

    const gain = this.categoryGains.get(category);
    if (gain) {
      gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.1);
    }
  }

  /**
   * Get current volume for an audio category
   */
  public getCategoryVolume(category: AudioCategory): number {
    if (category === AudioEngine.CATEGORIES.MASTER) {
      return this.masterGain.gain.value;
    }

    const gain = this.categoryGains.get(category);
    return gain ? gain.gain.value : 0;
  }

  /**
   * Mute/unmute all audio
   */
  public setMute(muted: boolean): void {
    this.muted = muted;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.1);
  }

  /**
   * Get mute state
   */
  public getMute(): boolean {
    return this.muted;
  }

  /**
   * Create a filter node
   */
  public createFilter(type: BiquadFilterType, frequency: number, q: number = 1): BiquadFilterNode {
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  /**
   * Access the audio context directly
   */
  public getContext(): AudioContext {
    return this.context;
  }

  /**
   * Create a noise generator
   */
  public createNoiseGenerator(
    type: 'white' | 'pink' | 'brown' = 'white', 
    duration: number = 1
  ): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, sampleRate);
    const output = buffer.getChannelData(0);
    
    if (type === 'white') {
      // White noise - completely random
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } 
    else if (type === 'pink') {
      // Pink noise - 1/f spectrum
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // Normalize
        b6 = white * 0.115926;
      }
    } 
    else if (type === 'brown') {
      // Brown noise - 1/f² spectrum (more bass)
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Normalize
      }
    }
    
    return buffer;
  }

  /**
   * Create a layered engine sound
   */
  public createEngineSound(): AudioSourceInfo[] {
    const sources: AudioSourceInfo[] = [];
    
    // Base engine rumble (brown noise + filter + oscillator)
    const rumbleBuffer = this.createNoiseGenerator('brown', 2);
    const rumble = this.context.createBufferSource();
    rumble.buffer = rumbleBuffer;
    rumble.loop = true;
    
    const rumbleFilter = this.createFilter('lowpass', 120, 5);
    const rumbleGain = this.context.createGain();
    rumbleGain.gain.value = 0.4;
    
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.categoryGains.get(AudioEngine.CATEGORIES.ENGINE)!);
    
    rumble.start();
    
    const rumbleId = 'engine_rumble';
    this.activeNodes.set(rumbleId, [rumble, rumbleGain, rumbleFilter]);
    
    sources.push({
      id: rumbleId,
      source: rumble,
      gain: rumbleGain,
      filter: rumbleFilter,
      category: AudioEngine.CATEGORIES.ENGINE
    });
    
    // Mid-range engine sound (modulated oscillator)
    const mid = this.context.createOscillator();
    mid.type = 'sawtooth';
    mid.frequency.value = 87; // Starting frequency
    
    const midFilter = this.createFilter('bandpass', 400, 2);
    const midGain = this.context.createGain();
    midGain.gain.value = 0.1;
    
    mid.connect(midFilter);
    midFilter.connect(midGain);
    midGain.connect(this.categoryGains.get(AudioEngine.CATEGORIES.ENGINE)!);
    
    mid.start();
    
    const midId = 'engine_mid';
    this.activeNodes.set(midId, [mid, midGain, midFilter]);
    
    sources.push({
      id: midId,
      source: mid,
      gain: midGain,
      filter: midFilter,
      category: AudioEngine.CATEGORIES.ENGINE
    });
    
    // High frequency whine (sine oscillator)
    const high = this.context.createOscillator();
    high.type = 'sine';
    high.frequency.value = 0; // Start at 0 and increase with speed
    
    const highGain = this.context.createGain();
    highGain.gain.value = 0;
    
    // Wind noise (filtered white noise - reduced volume by 80%)
    const windNoiseBuffer = this.createNoiseGenerator('white', 2);
    const windNoise = this.context.createBufferSource();
    windNoise.buffer = windNoiseBuffer;
    windNoise.loop = true;
    
    const windFilter = this.createFilter('highpass', 2000, 1);
    const windGain = this.context.createGain();
    windGain.gain.value = 0.05; // Very low volume (80% reduction)
    
    high.connect(highGain);
    highGain.connect(this.categoryGains.get(AudioEngine.CATEGORIES.ENGINE)!);
    
    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.categoryGains.get(AudioEngine.CATEGORIES.ENGINE)!);
    
    high.start();
    windNoise.start();
    
    const highId = 'engine_high';
    this.activeNodes.set(highId, [high, highGain]);
    
    const windId = 'wind_noise';
    this.activeNodes.set(windId, [windNoise, windGain, windFilter]);
    
    sources.push({
      id: highId,
      source: high,
      gain: highGain,
      category: AudioEngine.CATEGORIES.ENGINE
    });
    
    sources.push({
      id: windId,
      source: windNoise,
      gain: windGain,
      filter: windFilter,
      category: AudioEngine.CATEGORIES.ENGINE
    });
    
    return sources;
  }
}

// Type definitions
export type AudioCategory = 'master' | 'engine' | 'surface' | 'music' | 'sfx' | 'ui';

export interface PlaySoundOptions {
  category?: AudioCategory;
  loop?: boolean;
  volume?: number;
  pitch?: number;
  pan?: number;
  startTime?: number;
  stopTime?: number;
  id?: string;
}

export interface AudioSourceInfo {
  id: string;
  source: AudioNode;
  gain: GainNode;
  panner?: StereoPannerNode;
  filter?: BiquadFilterNode;
  category: AudioCategory;
}