import { AudioEngine, AudioSourceInfo } from './AudioEngine';
import { SurfaceType as GameSurfaceType } from '../../types/config';

/**
 * Type alias for surface types in the audio system
 */
export type SurfaceType = GameSurfaceType;

/**
 * Surface sound profiles
 */
interface SurfaceSoundProfile {
  noiseType: 'white' | 'pink' | 'brown';
  baseFrequency: number;
  frequencyRange: number; // Amount to increase with speed
  filterType: BiquadFilterType;
  filterQ: number;
  volumeMultiplier: number;
}

/**
 * SurfaceSounds - Manages sounds for different surface types
 */
export class SurfaceSounds {
  private audioEngine: AudioEngine;
  private currentSurfaceSound: AudioSourceInfo | null = null;
  private currentSurfaceType: SurfaceType | null = null;
  private transitionTimer: number | null = null;
  
  // Surface sound characteristics
  private surfaceProfiles: Record<SurfaceType, SurfaceSoundProfile> = {
    asphalt: {
      noiseType: 'pink',
      baseFrequency: 2000,
      frequencyRange: 3000,
      filterType: 'bandpass',
      filterQ: 1.5,
      volumeMultiplier: 0.2,
    },
    grass: {
      noiseType: 'pink',
      baseFrequency: 800,
      frequencyRange: 1500,
      filterType: 'lowpass',
      filterQ: 1.0,
      volumeMultiplier: 0.4,
    },
    dirt: {
      noiseType: 'brown',
      baseFrequency: 500,
      frequencyRange: 1000,
      filterType: 'lowpass',
      filterQ: 0.8,
      volumeMultiplier: 0.5,
    },
    sand: {
      noiseType: 'pink',
      baseFrequency: 1200,
      frequencyRange: 800,
      filterType: 'bandpass',
      filterQ: 0.7,
      volumeMultiplier: 0.6,
    },
    rock: {
      noiseType: 'white',
      baseFrequency: 3000,
      frequencyRange: 2000,
      filterType: 'highpass',
      filterQ: 2.0,
      volumeMultiplier: 0.7,
    },
    snow: {
      noiseType: 'white',
      baseFrequency: 4000,
      frequencyRange: 1000,
      filterType: 'highpass',
      filterQ: 0.5,
      volumeMultiplier: 0.3,
    },
    ice: {
      noiseType: 'white',
      baseFrequency: 5000,
      frequencyRange: 500,
      filterType: 'highpass',
      filterQ: 0.3,
      volumeMultiplier: 0.15,
    },
    water: {
      noiseType: 'white',
      baseFrequency: 2500,
      frequencyRange: 1500,
      filterType: 'bandpass',
      filterQ: 0.6,
      volumeMultiplier: 0.4,
    },
    mud: {
      noiseType: 'brown',
      baseFrequency: 300,
      frequencyRange: 600,
      filterType: 'lowpass',
      filterQ: 0.5,
      volumeMultiplier: 0.65,
    },
  };
  
  constructor() {
    this.audioEngine = AudioEngine.getInstance();
  }
  
  /**
   * Update surface sound based on current surface and speed
   */
  public updateSurface(
    surfaceType: SurfaceType, 
    volume: number, 
    speed: number
  ): void {
    // If switching surface types, handle transition
    if (!this.currentSurfaceType || this.currentSurfaceType !== surfaceType) {
      this.transitionToSurface(surfaceType);
    }
    
    // Skip if no surface sound is active
    if (!this.currentSurfaceSound) return;
    
    // Get the profile for the current surface
    const profile = this.surfaceProfiles[surfaceType];
    
    // Adjust volume based on speed and surface type
    const finalVolume = volume * profile.volumeMultiplier;
    this.currentSurfaceSound.gain.gain.setTargetAtTime(
      finalVolume, 
      this.audioEngine.getContext().currentTime, 
      0.1
    );
    
    // Adjust filter based on speed - higher speed = higher frequency
    if (this.currentSurfaceSound.filter) {
      const speedRatio = Math.min(1.0, speed / 20);
      const filterFreq = profile.baseFrequency + (profile.frequencyRange * speedRatio);
      
      this.currentSurfaceSound.filter.frequency.setTargetAtTime(
        filterFreq,
        this.audioEngine.getContext().currentTime,
        0.1
      );
    }
  }
  
  /**
   * Transition from one surface type to another
   */
  private transitionToSurface(newSurfaceType: SurfaceType): void {
    // Already on this surface
    if (this.currentSurfaceType === newSurfaceType) return;
    
    // Clear any pending transitions
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    
    // If we already have a surface sound, fade it out
    if (this.currentSurfaceSound) {
      const oldSoundId = this.currentSurfaceSound.id;
      
      // Fade out over 200ms
      this.currentSurfaceSound.gain.gain.setTargetAtTime(
        0,
        this.audioEngine.getContext().currentTime,
        0.05
      );
      
      // Stop after fade out
      this.transitionTimer = window.setTimeout(() => {
        this.audioEngine.stopSound(oldSoundId);
        this.transitionTimer = null;
      }, 200);
    }
    
    // Create the new surface sound
    this.createSurfaceSound(newSurfaceType);
    this.currentSurfaceType = newSurfaceType;
  }
  
  /**
   * Create a surface sound based on surface type
   */
  private createSurfaceSound(surfaceType: SurfaceType): void {
    const profile = this.surfaceProfiles[surfaceType];
    
    // Create a noise buffer for this surface type
    const noiseBuffer = this.audioEngine.createNoiseGenerator(profile.noiseType, 2);
    
    // Create the source
    const source = this.audioEngine.getContext().createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    
    // Create the filter
    const filter = this.audioEngine.createFilter(
      profile.filterType,
      profile.baseFrequency,
      profile.filterQ
    );
    
    // Create gain node
    const gain = this.audioEngine.getContext().createGain();
    gain.gain.value = 0; // Start silent, will fade in
    
    // Connect nodes
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioEngine.getContext().destination);
    
    // Start playback
    source.start();
    
    // Store the sound
    const id = `surface_${surfaceType}_${Date.now()}`;
    this.currentSurfaceSound = {
      id,
      source,
      gain,
      filter,
      category: AudioEngine.CATEGORIES.SURFACE
    };
    
    // Register with audio engine for tracking
    if (!this.audioEngine['activeNodes']) {
      this.audioEngine['activeNodes'] = new Map();
    }
    
    this.audioEngine['activeNodes'].set(id, [source, gain, filter]);
  }
  
  /**
   * Play an impact sound for the current surface
   */
  public playImpactSound(surfaceType: SurfaceType, intensity: number): void {
    // Scale intensity
    const scaledIntensity = Math.min(1.0, Math.max(0.1, intensity));
    
    // Create a short impact sound based on surface type
    const profile = this.surfaceProfiles[surfaceType];
    const impactBuffer = this.audioEngine.createNoiseGenerator(profile.noiseType, 0.2);
    
    const source = this.audioEngine.getContext().createBufferSource();
    source.buffer = impactBuffer;
    
    const filter = this.audioEngine.createFilter(
      profile.filterType,
      profile.baseFrequency * 1.5, // Higher frequency for impact
      profile.filterQ
    );
    
    const gain = this.audioEngine.getContext().createGain();
    gain.gain.value = scaledIntensity * profile.volumeMultiplier * 2; // Louder than rolling
    
    // Add quick envelope
    gain.gain.setValueAtTime(0, this.audioEngine.getContext().currentTime);
    gain.gain.linearRampToValueAtTime(
      scaledIntensity * profile.volumeMultiplier * 2,
      this.audioEngine.getContext().currentTime + 0.01
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioEngine.getContext().currentTime + 0.2
    );
    
    // Connect
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioEngine.getContext().destination);
    
    // Play
    source.start();
    source.stop(this.audioEngine.getContext().currentTime + 0.2);
  }
  
  /**
   * Pause all surface sounds
   */
  public pause(): void {
    if (this.currentSurfaceSound) {
      this.currentSurfaceSound.gain.gain.setValueAtTime(0, this.audioEngine.getContext().currentTime);
    }
  }
  
  /**
   * Resume surface sounds
   */
  public resume(): void {
    // Surface sound volume will be set in next update call
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.currentSurfaceSound) {
      if (this.currentSurfaceSound.source instanceof AudioBufferSourceNode) {
        try {
          this.currentSurfaceSound.source.stop();
        } catch (e) {
          // Already stopped
        }
      }
      
      this.currentSurfaceSound = null;
    }
    
    // Clear transition timer
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    
    this.currentSurfaceType = null;
  }
}