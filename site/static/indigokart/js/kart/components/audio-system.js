import * as THREE from 'three';
import { PHYSICS } from '../kart-config.js';

/**
 * Handles all audio-related functionality for the kart
 */
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.chugOscillator = null;
        this.gainNode = null;
        this.chugDepth = null;
        this.chugModulator = null;
        this.filter = null;
        this.time = 0;
        
        // Try to initialize audio
        this.initializeAudio();
    }
    
    /**
     * Initialize the audio engine for the kart
     */
    initializeAudio() {
        // Only initialize once and check for browser support
        if (this.audioContext || !window.AudioContext) return;
        
        try {
            // Internal time tracker for variations
            this.time = 0;
            
            // Don't automatically start audio - create context in suspended state
            // and wait for user interaction before starting audio
            this.audioReady = false;
            this.audioInitialized = false;
            
            // The actual audio initialization will be completed on first user interaction
            this.setupUserInteractionHandlers();
            
            console.log("Audio engine setup completed - waiting for user interaction");
        } catch (error) {
            console.error("Error initializing audio:", error);
            this.audioContext = null;
        }
    }
    
    /**
     * Setup event handlers to initialize audio after user interaction
     */
    setupUserInteractionHandlers() {
        // We need to wait for a user gesture (click, keypress, etc.)
        const interactionHandler = () => {
            if (this.audioInitialized) return;
            
            // Now it's safe to create the audio context and start audio
            this.completeAudioInitialization();
            
            // Mark as initialized to prevent multiple initializations
            this.audioInitialized = true;
        };
        
        // Set up multiple interaction handlers
        document.addEventListener('click', interactionHandler, { once: false });
        document.addEventListener('keydown', interactionHandler, { once: false });
        document.addEventListener('touchstart', interactionHandler, { once: false });
    }
    
    /**
     * Complete audio initialization after user interaction
     */
    completeAudioInitialization() {
        try {
            // Create audio context now that we have user interaction
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create main oscillator for engine base sound (deep rumble)
            this.oscillator = this.audioContext.createOscillator();
            this.oscillator.type = 'triangle'; // Triangle wave for less harsh base sound 
            this.oscillator.frequency.setValueAtTime(40, this.audioContext.currentTime); // Very low base frequency
            
            // Create secondary oscillator for "chug-chug" sound
            this.chugOscillator = this.audioContext.createOscillator();
            this.chugOscillator.type = 'sine';
            this.chugOscillator.frequency.setValueAtTime(4, this.audioContext.currentTime); // 4Hz = 4 chugs per second at idle
            
            // Create gain node to control chug depth
            this.chugDepth = this.audioContext.createGain();
            this.chugDepth.gain.setValueAtTime(0.6, this.audioContext.currentTime); // Modulation depth
            
            // Create gain node to control overall volume
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime); // Start quiet
            
            // Create modulator for "chug" effect
            // We'll modify the main oscillator's frequency and amplitude with this
            this.chugModulator = this.audioContext.createGain();
            this.chugModulator.gain.setValueAtTime(1, this.audioContext.currentTime); // Base value for the carrier
            
            // Create a noise source for irregularity
            this.noiseGain = this.audioContext.createGain();
            this.noiseGain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
            
            // Create a filter chain for more engine-like sound
            // Low-pass filter to tame the high frequencies
            this.filter = this.audioContext.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
            this.filter.Q.setValueAtTime(8, this.audioContext.currentTime); // Higher Q for more character
            
            // Connect the components
            this.oscillator.connect(this.filter);
            this.filter.connect(this.gainNode);
            
            // Connect modulation for chug-chug effect
            this.chugOscillator.connect(this.chugDepth);
            this.chugDepth.connect(this.chugModulator.gain);
            this.chugModulator.connect(this.gainNode);
            
            // Final output
            this.gainNode.connect(this.audioContext.destination);
            
            // Start oscillators
            this.oscillator.start();
            this.chugOscillator.start();
            
            // Mark audio as ready
            this.audioReady = true;
            
            console.log("Audio engine fully initialized after user interaction");
        } catch (error) {
            console.error("Error completing audio initialization:", error);
            this.audioContext = null;
        }
    }
    
    /**
     * Update engine sound based on velocity with smoothing to prevent rapid fluctuations
     * @param {number} velocity - Current kart velocity
     */
    updateEngineSound(velocity) {
        // If audio isn't ready yet, return without error
        if (!this.audioReady || !this.audioContext || !this.oscillator) return;
        
        // EMERGENCY FIX: Clamp velocity to prevent audio errors when kart jumps
        // Adding a maximum safe velocity for audio calculations
        const safeVelocity = Math.min(Math.abs(velocity), PHYSICS.kartMaxSpeed * 2);
        
        // Calculate speed ratio regardless of audio being ready (using clamped velocity)
        const rawSpeedRatio = safeVelocity / PHYSICS.kartMaxSpeed;
        
        // Apply audio smoothing for engine sound to prevent stuttering and revving
        // Initialize smoothed engine speed if not already set
        if (this.smoothedSpeedRatio === undefined) {
            this.smoothedSpeedRatio = rawSpeedRatio;
            this.lastAudioUpdateTime = Date.now();
        }
        
        // Calculate time since last update for time-based smoothing
        const now = Date.now();
        const dt = Math.min(0.1, (now - this.lastAudioUpdateTime) / 1000); // Cap at 100ms
        this.lastAudioUpdateTime = now;
        
        // Apply different smoothing based on whether engine is speeding up or slowing down
        const smoothingFactorUp = 1.0 * dt;    // Moderate response when speeding up
        const smoothingFactorDown = 0.8 * dt;  // Slower response when slowing down
        
        // Choose smoothing factor based on direction of change
        const smoothingFactor = (rawSpeedRatio > this.smoothedSpeedRatio) 
            ? smoothingFactorUp 
            : smoothingFactorDown;
        
        // Apply asymmetric smoothing to engine sound
        this.smoothedSpeedRatio += (rawSpeedRatio - this.smoothedSpeedRatio) * smoothingFactor;
        
        // Use the smoothed speed ratio for audio parameters
        const speedRatio = this.smoothedSpeedRatio;
        
        // Get base frequency based on speed (lower pitch range overall)
        const minFreq = 40; // Very low idle frequency for deep rumble
        const maxFreq = 100; // Still relatively low at top speed
        const baseFreq = minFreq + speedRatio * (maxFreq - minFreq);
        
        try {
            // Update main oscillator frequency - safely with smoothed values
            // Use Math.min to ensure we never exceed audio system limits
            const safeBaseFreq = Math.min(baseFreq, 20000); // Web Audio API frequency limit
            this.oscillator.frequency.setValueAtTime(safeBaseFreq, this.audioContext.currentTime);
            
            // Update the secondary oscillator if it exists (for chug-chug effect)
            if (this.chugOscillator) {
                // Speed of "chugging" increases with velocity (with safety limit)
                const chugFreq = Math.min(4 + speedRatio * 16, 20000); // Capped at 20000Hz
                this.chugOscillator.frequency.setValueAtTime(chugFreq, this.audioContext.currentTime);
                
                // Depth of modulation reduces slightly at high speeds
                const modulationDepth = Math.max(0, 0.6 - speedRatio * 0.3); // 0.6 at idle, 0.3 at max speed, never negative
                this.chugDepth.gain.setValueAtTime(modulationDepth, this.audioContext.currentTime);
            }
            
            // Update filter to open up at higher speeds (more harmonics)
            if (this.filter) {
                const minFilterFreq = 200;
                const maxFilterFreq = 800;
                const filterFreq = Math.min(minFilterFreq + speedRatio * (maxFilterFreq - minFilterFreq), 20000);
                this.filter.frequency.setValueAtTime(filterFreq, this.audioContext.currentTime);
                
                // Reduce resonance at high speeds for less whine
                const minQ = 2;
                const maxQ = 8;
                this.filter.Q.setValueAtTime(maxQ - speedRatio * (maxQ - minQ), this.audioContext.currentTime);
            }
        } catch (e) {
            // Silently catch any audio parameter errors
            console.log("Audio parameter error caught and handled safely");
        }
        
        try {
            // Update gain based on speed - louder when faster
            const minGain = 0.05; // Quiet when idle
            const maxGain = 0.2;  // Louder at max speed
            const baseGain = minGain + speedRatio * (maxGain - minGain);
            
            // Add a bit more volume when accelerating
            const accelBonus = 0; // Set by the kart when accelerating
            
            // Calculate final gain with safety clamp
            const finalGain = Math.min(Math.max(0, baseGain + accelBonus), 1.0);
            
            // Update gain node
            this.gainNode.gain.setValueAtTime(finalGain, this.audioContext.currentTime);
        } catch (e) {
            // Safely handle any audio parameter errors
            console.log("Audio gain parameter error caught and handled safely");
        }
    }
    
    /**
     * Apply engine strain effect for uphill slopes
     * @param {number} strainLevel - Level of strain (0-1)
     */
    setEngineStrainSound(strainLevel) {
        // Only apply if we have audio initialized and ready
        if (!this.audioReady || !this.audioContext || !this.oscillator) return;
        
        // Limit strain level
        const clampedStrain = Math.min(1.0, Math.max(0, strainLevel));
        
        // Lower pitch for strained engine
        const currentFreq = this.oscillator.frequency.value;
        const strainedFreq = currentFreq * (1 - clampedStrain * 0.2);
        this.oscillator.frequency.setValueAtTime(strainedFreq, this.audioContext.currentTime);
        
        // Increase chug effect for struggling engine
        if (this.chugOscillator && this.chugDepth) {
            // More pronounced chugging when engine is under strain
            const baseChugDepth = this.chugDepth.gain.value;
            const strainedChugDepth = Math.min(1.0, baseChugDepth + clampedStrain * 0.4);
            this.chugDepth.gain.setValueAtTime(strainedChugDepth, this.audioContext.currentTime);
            
            // Slower chugging when strained
            const currentChugFreq = this.chugOscillator.frequency.value;
            const strainedChugFreq = currentChugFreq * (1 - clampedStrain * 0.4);
            this.chugOscillator.frequency.setValueAtTime(strainedChugFreq, this.audioContext.currentTime);
        }
        
        // Apply filter changes for muffled strained sound
        if (this.filter) {
            // Lower filter cutoff for more muffled sound
            const currentFilterFreq = this.filter.frequency.value;
            const strainedFilterFreq = currentFilterFreq * (1 - clampedStrain * 0.3);
            this.filter.frequency.setValueAtTime(strainedFilterFreq, this.audioContext.currentTime);
            
            // Increase resonance for more "struggling" character
            const currentQ = this.filter.Q.value;
            const strainedQ = currentQ + clampedStrain * 2;
            this.filter.Q.setValueAtTime(strainedQ, this.audioContext.currentTime);
        }
        
        // Subtle volume increase for strain
        if (this.gainNode) {
            const currentGain = this.gainNode.gain.value;
            const strainedGain = currentGain * (1 + clampedStrain * 0.15);
            this.gainNode.gain.setValueAtTime(strainedGain, this.audioContext.currentTime);
        }
    }
    
    /**
     * Apply engine boost effect for downhill slopes
     * @param {number} boostLevel - Level of boost (0-1)
     */
    setEngineBoostSound(boostLevel) {
        // Only apply if we have audio initialized and ready
        if (!this.audioReady || !this.audioContext || !this.oscillator) return;
        
        // Limit boost level
        const clampedBoost = Math.min(1.0, Math.max(0, boostLevel));
        
        // Slightly higher pitch for "revving" downhill sound
        const currentFreq = this.oscillator.frequency.value;
        const boostedFreq = currentFreq * (1 + clampedBoost * 0.1);
        this.oscillator.frequency.setValueAtTime(boostedFreq, this.audioContext.currentTime);
        
        // Smoother, more consistent engine sound (less chugging) 
        if (this.chugOscillator && this.chugDepth) {
            // Less pronounced chugging when engine is in boost mode
            const baseChugDepth = this.chugDepth.gain.value;
            const boostedChugDepth = baseChugDepth * (1 - clampedBoost * 0.3);
            this.chugDepth.gain.setValueAtTime(boostedChugDepth, this.audioContext.currentTime);
            
            // Faster, more consistent chugging
            const currentChugFreq = this.chugOscillator.frequency.value;
            const boostedChugFreq = currentChugFreq * (1 + clampedBoost * 0.2);
            this.chugOscillator.frequency.setValueAtTime(boostedChugFreq, this.audioContext.currentTime);
        }
        
        // Apply filter changes for more open, powerful sound
        if (this.filter) {
            // Higher filter cutoff for brighter sound
            const currentFilterFreq = this.filter.frequency.value;
            const boostedFilterFreq = currentFilterFreq * (1 + clampedBoost * 0.4);
            this.filter.frequency.setValueAtTime(boostedFilterFreq, this.audioContext.currentTime);
            
            // Decrease resonance for smoother character
            const currentQ = this.filter.Q.value;
            const boostedQ = Math.max(1, currentQ * (1 - clampedBoost * 0.3));
            this.filter.Q.setValueAtTime(boostedQ, this.audioContext.currentTime);
        }
    }
    
    /**
     * Reset all engine audio effects to normal
     */
    resetEngineAudioEffects() {
        // Nothing to do if audio is not initialized and ready
        if (!this.audioReady || !this.audioContext || !this.oscillator) return;
        
        // Engine sounds will be automatically reset on the next updateEngineSound call
        // We don't need to do anything special here
    }
}

export default AudioSystem;