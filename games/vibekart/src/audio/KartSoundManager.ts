import { AudioEngine, AudioSourceInfo } from './AudioEngine';
import { SurfaceSounds, SurfaceType } from './SurfaceSounds';

/**
 * KartSoundManager - Handles all kart-related sounds
 */
export class KartSoundManager {
  private audioEngine: AudioEngine;
  private surfaceSounds: SurfaceSounds;
  
  // Engine sound components
  private engineSounds: AudioSourceInfo[] = [];
  private idleSound: AudioSourceInfo | null = null;
  
  // Engine sound parameters
  private currentRPM: number = 0;
  private targetRPM: number = 0;
  private maxRPM: number = 8000;
  private minRPM: number = 800;
  
  // State variables
  private acceleration: number = 0;
  private speed: number = 0;
  private wheelsOnGround: number = 0;
  private surfaceType: SurfaceType = 'asphalt';
  private surfaceContactRatio: number = 1.0;
  
  // Effect sounds
  private skidSoundId: string | null = null;
  private boostSoundId: string | null = null;
  
  constructor() {
    this.audioEngine = AudioEngine.getInstance();
    this.surfaceSounds = new SurfaceSounds();
    
    // Initialize engine sounds
    this.initializeEngineSounds();
  }
  
  /**
   * Initialize engine sound components
   */
  private async initializeEngineSounds(): Promise<void> {
    // Ensure audio engine is initialized
    await this.audioEngine.initialize();
    
    // Create engine sounds
    this.engineSounds = this.audioEngine.createEngineSound();
    
    // Initialize idle sound (looped sample)
    // In a real implementation, you'd load an actual idle sample
    const idleBuffer = this.audioEngine.createNoiseGenerator('brown', 2);
    const idleSource = this.audioEngine.getContext().createBufferSource();
    idleSource.buffer = idleBuffer;
    idleSource.loop = true;
    
    const idleFilter = this.audioEngine.createFilter('lowpass', 200, 2);
    const idleGain = this.audioEngine.getContext().createGain();
    idleGain.gain.value = 0.2;
    
    // Connect
    idleSource.connect(idleFilter);
    idleFilter.connect(idleGain);
    const category = AudioEngine.CATEGORIES.ENGINE;
    idleGain.connect(this.audioEngine.getContext().destination);
    
    // Start
    idleSource.start();
    
    this.idleSound = {
      id: 'engine_idle',
      source: idleSource,
      gain: idleGain,
      filter: idleFilter,
      category
    };
  }
  
  /**
   * Update sounds based on kart state
   */
  public update(
    deltaTime: number, 
    speed: number, 
    acceleration: number, 
    wheelsOnGround: number, 
    surfaceType: SurfaceType,
    surfaceContactRatio: number = 1.0,
    isSkidding: boolean = false,
    skidIntensity: number = 0
  ): void {
    // Update state
    this.speed = speed;
    this.acceleration = acceleration;
    this.wheelsOnGround = wheelsOnGround;
    this.surfaceType = surfaceType;
    this.surfaceContactRatio = surfaceContactRatio;
    
    // Calculate target RPM based on speed and acceleration
    this.calculateTargetRPM();
    
    // Smooth RPM changes for more natural sound
    this.smoothRPMTransition(deltaTime);
    
    // Apply RPM to engine sounds
    this.applyRPMToEngineSounds();
    
    // Update surface sounds
    this.updateSurfaceSounds();
    
    // Handle skidding sound
    this.updateSkidSound(isSkidding, skidIntensity);
  }
  
  /**
   * Calculate target RPM based on speed and acceleration
   */
  private calculateTargetRPM(): void {
    // Base RPM is proportional to speed
    let baseRPM = this.minRPM + (this.speed * 500);
    
    // Add acceleration effect (rev up when accelerating)
    const accelBoost = this.acceleration > 0 
      ? this.acceleration * 2000 
      : 0;
    
    // Adjust based on wheels contact
    const groundFactor = this.wheelsOnGround > 0 ? 1.0 : 0.8;
    
    // Calculate final target RPM
    this.targetRPM = Math.min(
      this.maxRPM, 
      (baseRPM + accelBoost) * groundFactor
    );
    
    // When not on ground or very slow, ensure some idle RPM
    if (this.wheelsOnGround === 0 || this.speed < 0.1) {
      this.targetRPM = Math.max(this.minRPM, this.targetRPM);
    }
  }
  
  /**
   * Smooth RPM transition for more natural engine sound
   */
  private smoothRPMTransition(deltaTime: number): void {
    // Adjust transition speed based on whether we're revving up or down
    const transitionSpeed = this.targetRPM > this.currentRPM 
      ? 5.0  // Rev up quickly
      : 2.0; // Rev down more slowly
    
    // Smooth transition
    const step = (this.targetRPM - this.currentRPM) * Math.min(deltaTime * transitionSpeed, 1.0);
    this.currentRPM += step;
    
    // Ensure RPM stays within limits
    this.currentRPM = Math.max(this.minRPM, Math.min(this.maxRPM, this.currentRPM));
  }
  
  /**
   * Apply current RPM to engine sound components
   */
  private applyRPMToEngineSounds(): void {
    // Skip if no engine sounds
    if (this.engineSounds.length === 0) return;
    
    // Calculate RPM ratio (0-1)
    const rpmRatio = (this.currentRPM - this.minRPM) / (this.maxRPM - this.minRPM);
    
    // Apply to each engine sound component
    this.engineSounds.forEach(sound => {
      if (sound.id === 'engine_rumble') {
        // Rumble - adjust filter cutoff and volume
        if (sound.filter) {
          // Cutoff increases with RPM
          const cutoff = 80 + (rpmRatio * 140);
          sound.filter.frequency.setTargetAtTime(cutoff, this.audioEngine.getContext().currentTime, 0.05);
          
          // Resonance decreases slightly with RPM for a smoother sound at high revs
          sound.filter.Q.setTargetAtTime(5 - (rpmRatio * 2), this.audioEngine.getContext().currentTime, 0.1);
        }
        
        // Volume increases with RPM but only up to a point
        const rumbleVolume = 0.3 + (rpmRatio * 0.3);
        sound.gain.gain.setTargetAtTime(rumbleVolume, this.audioEngine.getContext().currentTime, 0.05);
      }
      else if (sound.id === 'engine_mid') {
        // Mid-range - adjust frequency and volume
        if (sound.source instanceof OscillatorNode) {
          // Increase frequency with RPM
          const freq = 87 + (rpmRatio * 150);
          sound.source.frequency.setTargetAtTime(freq, this.audioEngine.getContext().currentTime, 0.05);
        }
        
        // Volume peaks in the mid-range RPM
        const midRangeIntensity = 4 * rpmRatio * (1 - rpmRatio); // Peaks at 0.5
        const midVolume = 0.05 + (midRangeIntensity * 0.25);
        sound.gain.gain.setTargetAtTime(midVolume, this.audioEngine.getContext().currentTime, 0.05);
        
        // Adjust filter for different RPM ranges
        if (sound.filter) {
          const filterFreq = 300 + (rpmRatio * 700);
          sound.filter.frequency.setTargetAtTime(filterFreq, this.audioEngine.getContext().currentTime, 0.05);
        }
      }
      else if (sound.id === 'engine_high') {
        // High-end - only present at higher RPMs
        if (sound.source instanceof OscillatorNode) {
          // Higher whine frequency at high RPM
          const highFreq = rpmRatio > 0.5 ? 700 + ((rpmRatio - 0.5) * 2 * 1200) : 0;
          sound.source.frequency.setTargetAtTime(highFreq, this.audioEngine.getContext().currentTime, 0.05);
        }
        
        // Volume increases more at high RPM
        const highVolume = rpmRatio > 0.5 ? (rpmRatio - 0.5) * 2 * 0.15 : 0;
        sound.gain.gain.setTargetAtTime(highVolume, this.audioEngine.getContext().currentTime, 0.05);
      }
      else if (sound.id === 'wind_noise') {
        // Wind noise volume based on speed and wheels on ground
        const speedFactor = Math.min(1.0, this.speed / 30);
        // Wind is quieter when wheels on ground, louder when airborne
        const airFactor = this.wheelsOnGround === 0 ? 1.0 : 0.3;
        const windVolume = speedFactor * airFactor * 0.05; // Keep volume very low
        
        sound.gain.gain.setTargetAtTime(windVolume, this.audioEngine.getContext().currentTime, 0.2);
        
        // Wind pitch/frequency also changes with speed
        if (sound.filter) {
          const filterFreq = 2000 + (speedFactor * 3000);
          sound.filter.frequency.setTargetAtTime(filterFreq, this.audioEngine.getContext().currentTime, 0.2);
        }
      }
    });
    
    // Handle idle sound separately
    if (this.idleSound) {
      // Idle sound fades out as RPM increases
      const idleVolume = Math.max(0, 0.2 - (rpmRatio * 0.2));
      this.idleSound.gain.gain.setTargetAtTime(idleVolume, this.audioEngine.getContext().currentTime, 0.1);
    }
  }
  
  /**
   * Update surface sounds based on speed and surface type
   */
  private updateSurfaceSounds(): void {
    // Only play surface sounds when wheels are on the ground
    if (this.wheelsOnGround === 0) {
      // Stop surface sounds if all wheels are in the air
      this.surfaceSounds.updateSurface(
        this.surfaceType,
        0, // No volume when airborne
        0
      );
      return;
    }
    
    // Surface sounds are louder at higher speeds
    const speedFactor = Math.min(1.0, this.speed / 15);
    
    // Scale by contact ratio
    const finalVolume = speedFactor * this.surfaceContactRatio;
    
    // Update the surface sounds
    this.surfaceSounds.updateSurface(
      this.surfaceType,
      finalVolume,
      this.speed
    );
  }
  
  /**
   * Update skid sound
   */
  private updateSkidSound(isSkidding: boolean, intensity: number): void {
    // Handle skid sound start/stop
    if (isSkidding && intensity > 0.1) {
      if (!this.skidSoundId) {
        // No skid sound playing, start one
        this.startSkidSound(intensity);
      } else {
        // Update existing skid sound
        this.updateSkidSoundIntensity(intensity);
      }
    } else if (this.skidSoundId) {
      // Should stop skid sound
      this.stopSkidSound();
    }
  }
  
  /**
   * Start skid sound effect
   */
  private startSkidSound(intensity: number): void {
    // Create a filtered noise for skidding
    const skidBuffer = this.audioEngine.createNoiseGenerator('pink', 1);
    const skidSourceInfo = this.audioEngine.playSound('skid', {
      category: AudioEngine.CATEGORIES.SFX,
      loop: true,
      volume: intensity * 0.5,
      id: 'kart_skid'
    });
    
    if (skidSourceInfo) {
      this.skidSoundId = skidSourceInfo.id;
    }
  }
  
  /**
   * Update skid sound intensity
   */
  private updateSkidSoundIntensity(intensity: number): void {
    if (this.skidSoundId) {
      this.audioEngine.setVolume(this.skidSoundId, intensity * 0.5);
    }
  }
  
  /**
   * Stop skid sound effect
   */
  private stopSkidSound(): void {
    if (this.skidSoundId) {
      this.audioEngine.stopSound(this.skidSoundId);
      this.skidSoundId = null;
    }
  }
  
  /**
   * Play a one-shot boost sound
   */
  public playBoostSound(): void {
    // Already playing a boost sound
    if (this.boostSoundId) return;
    
    // Create a synthesized boost sound
    const boostSourceInfo = this.audioEngine.playSound('boost', {
      category: AudioEngine.CATEGORIES.SFX,
      volume: 0.8,
      id: 'kart_boost'
    });
    
    if (boostSourceInfo) {
      this.boostSoundId = boostSourceInfo.id;
      
      // Auto clear after sound finishes
      setTimeout(() => {
        this.boostSoundId = null;
      }, 1000);
    }
  }
  
  /**
   * Play collision/impact sound
   */
  public playCollisionSound(intensity: number): void {
    // Scale intensity between 0-1
    const scaledIntensity = Math.min(1.0, Math.max(0.2, intensity));
    
    // Play sound with volume based on intensity
    this.audioEngine.playSound('collision', {
      category: AudioEngine.CATEGORIES.SFX,
      volume: scaledIntensity,
      pitch: 0.8 + (Math.random() * 0.4) // Random pitch for variety
    });
  }
  
  /**
   * Pause all kart sounds
   */
  public pause(): void {
    // Mute engine sounds without stopping them
    this.engineSounds.forEach(sound => {
      sound.gain.gain.setValueAtTime(0, this.audioEngine.getContext().currentTime);
    });
    
    // Mute idle
    if (this.idleSound) {
      this.idleSound.gain.gain.setValueAtTime(0, this.audioEngine.getContext().currentTime);
    }
    
    // Stop skid sound
    if (this.skidSoundId) {
      this.audioEngine.stopSound(this.skidSoundId);
      this.skidSoundId = null;
    }
    
    // Pause surface sounds
    this.surfaceSounds.pause();
  }
  
  /**
   * Resume all kart sounds
   */
  public resume(): void {
    // Sounds will return to normal on next update call
    this.surfaceSounds.resume();
  }
  
  /**
   * Clean up and dispose resources
   */
  public dispose(): void {
    // Stop all engine sounds
    this.engineSounds.forEach(sound => {
      if (sound.source instanceof AudioBufferSourceNode || 
          sound.source instanceof OscillatorNode) {
        try {
          sound.source.stop();
        } catch (e) {
          // Already stopped
        }
      }
    });
    
    // Stop idle sound
    if (this.idleSound && this.idleSound.source instanceof AudioBufferSourceNode) {
      try {
        this.idleSound.source.stop();
      } catch (e) {
        // Already stopped
      }
    }
    
    // Stop skid sound
    if (this.skidSoundId) {
      this.audioEngine.stopSound(this.skidSoundId);
    }
    
    // Dispose surface sounds
    this.surfaceSounds.dispose();
    
    // Clear arrays
    this.engineSounds = [];
    this.idleSound = null;
  }
}