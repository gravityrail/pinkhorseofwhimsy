import { AudioEngine } from './AudioEngine';

/**
 * BounceSoundEffect - Manages the "boing" sound when the kart bounces
 */
export class BounceSoundEffect {
  private audioEngine: AudioEngine;
  private boingSound: AudioBuffer | null = null;
  private lastPlayTime: number = 0;
  private debounceTime: number = 300; // ms between successive bounce sounds
  
  constructor() {
    this.audioEngine = AudioEngine.getInstance();
    this.generateBoingSound();
  }
  
  /**
   * Generate a boing sound using oscillators
   */
  private async generateBoingSound(): Promise<void> {
    await this.audioEngine.initialize();
    
    // Create audio context and buffer
    const context = this.audioEngine.getContext();
    const sampleRate = context.sampleRate;
    const duration = 0.6; // seconds
    const bufferSize = sampleRate * duration;
    
    // Create an empty stereo buffer
    const buffer = context.createBuffer(2, bufferSize, sampleRate);
    
    // Parameters for our "boing" sound
    const startFreq = 150;
    const endFreq = 80;
    const attackTime = 0.01;
    const decayTime = 0.5;
    
    // Fill left and right channels with the same data
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate; // Time in seconds
        
        // Frequency curve (starts high, drops down)
        const freqT = Math.min(1.0, t / 0.3);
        const freq = startFreq + (endFreq - startFreq) * freqT;
        
        // Generate sine wave at current frequency
        const sineWave = Math.sin(t * freq * Math.PI * 2);
        
        // Amplitude envelope (quick attack, longer decay)
        let amplitude = 0;
        if (t < attackTime) {
          // Attack phase
          amplitude = t / attackTime;
        } else if (t < attackTime + decayTime) {
          // Decay phase
          const decayProgress = (t - attackTime) / decayTime;
          amplitude = 1.0 - decayProgress * decayProgress; // Quadratic decay
        }
        
        // Add some noise for texture in the higher frequencies
        const noise = (Math.random() * 2 - 1) * 0.1 * amplitude;
        
        // Mix sine wave and noise
        channelData[i] = (sineWave * 0.9 + noise * 0.1) * amplitude * 0.8;
      }
    }
    
    this.boingSound = buffer;
  }
  
  /**
   * Play bounce sound with specified intensity
   */
  public playBounce(intensity: number = 1.0): void {
    if (!this.boingSound) return;
    
    const currentTime = Date.now();
    
    // Debounce to prevent sound spam
    if (currentTime - this.lastPlayTime < this.debounceTime) {
      return;
    }
    
    // Scale intensity to reasonable range
    const scaledIntensity = Math.min(1.0, Math.max(0.2, intensity));
    
    // Play the sound
    const source = this.audioEngine.getContext().createBufferSource();
    source.buffer = this.boingSound;
    
    // Create gain node for volume control
    const gainNode = this.audioEngine.getContext().createGain();
    gainNode.gain.value = scaledIntensity * 0.8;
    
    // Connect and play
    source.connect(gainNode);
    gainNode.connect(this.audioEngine.getContext().destination);
    source.start();
    
    // Update last play time
    this.lastPlayTime = currentTime;
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    this.boingSound = null;
  }
}