import * as THREE from 'three';
import { PHYSICS } from '../kart-config.js';

/**
 * Handles terrain-related physics for the kart, including hill effects
 */
class TerrainPhysics {
    constructor(track) {
        this.track = track;
        this.currentSlope = 0;
        this.previousSlope = null;
        this.slopeDebugEnabled = false;
        this.slopeArrow = null;
    }
    
    /**
     * Calculate the terrain slope at the kart's current position
     * @param {THREE.Object3D} kartGroup - The kart object
     * @param {number} velocity - Current kart velocity
     * @returns {number} Slope value (positive = downhill, negative = uphill)
     */
    calculateTerrainSlope(kartGroup, velocity) {
        // Get current position
        const position = kartGroup.position;
        const { x, y, z } = position;
        const kartRotation = kartGroup.rotation.y;
        
        // Determine forward direction
        const forwardX = Math.sin(kartRotation);
        const forwardZ = Math.cos(kartRotation);
        
        // Get height at current position
        const centerHeightResult = this.track.getHeightAt(x, z);
        let centerHeight = (typeof centerHeightResult === 'object') ? centerHeightResult.height : centerHeightResult;
        
        // Use multiple sample points for a more accurate slope calculation
        const sampleDistances = [1.0, 2.0, 3.0]; // Sample at different distances for better slope averaging
        let slopes = [];
        
        // Calculate slopes at different distances
        for (const sampleDistance of sampleDistances) {
            // Point ahead
            const frontX = x + forwardX * sampleDistance;
            const frontZ = z + forwardZ * sampleDistance;
            const frontHeightResult = this.track.getHeightAt(frontX, frontZ);
            const frontHeight = (typeof frontHeightResult === 'object') ? frontHeightResult.height : frontHeightResult;
            
            // Point behind
            const rearX = x - forwardX * sampleDistance;
            const rearZ = z - forwardZ * sampleDistance;
            const rearHeightResult = this.track.getHeightAt(rearX, rearZ);
            const rearHeight = (typeof rearHeightResult === 'object') ? rearHeightResult.height : rearHeightResult;
            
            // Calculate slope (positive = downhill, negative = uphill)
            let slopeAtDistance = 0;
            
            // If moving forward
            if (velocity >= 0) {
                slopeAtDistance = (frontHeight - centerHeight) / sampleDistance;
            } 
            // If moving backward
            else {
                slopeAtDistance = (centerHeight - rearHeight) / sampleDistance;
            }
            
            slopes.push(slopeAtDistance);
        }
        
        // Average the slopes, but give more weight to closer samples
        const weights = [0.5, 0.3, 0.2]; // More weight to closer points
        let weightedSlope = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < slopes.length; i++) {
            weightedSlope += slopes[i] * weights[i];
            totalWeight += weights[i];
        }
        
        const finalSlope = weightedSlope / totalWeight;
        
        // Add smoothing to prevent sudden changes
        if (!this.previousSlope) {
            this.previousSlope = finalSlope;
        }
        
        // Smooth transition between slope values (avoid jerky physics)
        const smoothingFactor = 0.8; // Higher = more smoothing
        const smoothedSlope = this.previousSlope * smoothingFactor + finalSlope * (1 - smoothingFactor);
        this.previousSlope = smoothedSlope;
        
        // Store for UI and other systems
        this.currentSlope = smoothedSlope;
        
        return smoothedSlope;
    }
    
    /**
     * Apply terrain slope physics effects to the kart
     * @param {number} slope - Calculated terrain slope
     * @param {number} deltaTime - Time since last frame
     * @param {object} chassisOrientation - Kart chassis orientation state
     * @param {function} setEngineBoostSound - Function to call for sound effects
     * @param {function} setEngineStrainSound - Function to call for sound effects
     * @param {function} resetEngineAudioEffects - Function to call to reset engine sounds
     * @returns {number} Velocity adjustment from slope
     */
    applySlopePhysics(slope, deltaTime, chassisOrientation, setEngineBoostSound, setEngineStrainSound, resetEngineAudioEffects) {
        // Reduce the threshold to detect more subtle slopes
    // This will make the slope indicator more responsive to terrain changes
    const reducedThreshold = PHYSICS.slopeThreshold * 0.5;
    if (Math.abs(slope) > reducedThreshold) {
            // More pronounced force on steeper slopes (quadratic effect)
            const steepnessFactor = 1 + Math.pow(Math.abs(slope) * 10, 1.5);
            const slopeForce = slope * PHYSICS.slopeSensitivity * steepnessFactor;
            
            // Modify slopeForce magnitude based on current speed and direction
            let slopeAcceleration = 0;
            
            // Use different factors for uphill vs downhill
            if (slope > 0) {
                // Downhill: accelerate
                // Increase effect with steepness, but avoid too much acceleration
                const speedRatio = 0.5; // We'll pass actual speed ratio later if needed
                const speedLimitFactor = Math.max(0.5, 1 - speedRatio * 0.5); // Reduce effect at high speeds
                slopeAcceleration = slopeForce * PHYSICS.downhillAccelerationFactor * speedLimitFactor;
                
                // Add slight engine boost sound when going downhill
                if (slope > 0.05 && setEngineBoostSound) {
                    setEngineBoostSound(0.1);
                }
            } else {
                // Uphill: decelerate
                // More struggle as the slope gets steeper
                const uphillSteepnessFactor = Math.pow(Math.abs(slope) * 10, 0.8);
                slopeAcceleration = slopeForce * PHYSICS.uphillDecelerationFactor * uphillSteepnessFactor;
                
                // Engine struggles more on steep uphills
                if (slope < -0.05 && setEngineStrainSound) {
                    // Make engine sound strained when going uphill
                    setEngineStrainSound(Math.abs(slope) * 5);
                }
            }
            
            // Mass-based effect (heavier karts will accelerate faster downhill due to gravity)
            const massFactor = PHYSICS.kartMass / 430; // Normalized to default mass
            slopeAcceleration *= massFactor;
            
            // Calculate speed change due to gravity on slope (f = ma)
            const slopeSpeedChange = slopeAcceleration * PHYSICS.gravity * PHYSICS.gravityFactor * deltaTime;
            
            // Limit the maximum effect based on config, but allow stronger effects for steeper slopes
            const slopeSteepnessMultiplier = 1 + Math.pow(Math.abs(slope) * 10, 0.7);
            const maxSlopeEffect = PHYSICS.kartMaxSpeed * PHYSICS.maxSlopeEffect * slopeSteepnessMultiplier;
            const limitedSpeedChange = Math.max(-maxSlopeEffect, Math.min(maxSlopeEffect, slopeSpeedChange));
            
            // Add visual pitch to the kart body when going up/down hills
            // Scale pitch by slope - sharper pitch for steeper slopes
            // Use a slightly curved response for more natural look
            const pitchFactor = Math.sign(slope) * Math.pow(Math.abs(slope) * 3, 0.8);
            if (chassisOrientation) {
                chassisOrientation.pitch = -pitchFactor; // Negative because we want to pitch down when going uphill
            }
            
            return limitedSpeedChange;
        } else {
            // Gradually return to level on flat ground
            if (chassisOrientation) {
                chassisOrientation.pitch *= 0.9;
            }
            
            // Reset any engine audio effects
            if (resetEngineAudioEffects) {
                resetEngineAudioEffects();
            }
            
            return 0;
        }
    }
    
    /**
     * Visualize the slope direction for debugging
     * @param {number} slope - Calculated terrain slope
     * @param {THREE.Object3D} kartGroup - The kart object
     * @param {THREE.Scene} scene - The scene object
     */
    visualizeSlopeDirection(slope, kartGroup, scene) {
        // Clean up any existing visualization
        if (this.slopeArrow) {
            scene.remove(this.slopeArrow);
        }
        
        // Get current position
        const position = kartGroup.position;
        const { x, y, z } = position;
        const kartRotation = kartGroup.rotation.y;
        
        // Determine forward direction
        const forwardX = Math.sin(kartRotation);
        const forwardZ = Math.cos(kartRotation);
        
        // Create arrow to show slope direction
        const arrowLength = 3 + Math.abs(slope) * 10; // Longer arrow for steeper slopes
        const startPoint = new THREE.Vector3(x, y + 2, z); // Start above the kart
        
        // End point shows the slope direction (down for downhill, up for uphill)
        const endPoint = new THREE.Vector3(
            x + forwardX * arrowLength,
            y + 2 + slope * -arrowLength, // Negative because slope is positive for downhill
            z + forwardZ * arrowLength
        );
        
        // Create the arrow
        const arrowGeometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
        
        // Color based on slope: red for uphill, green for downhill
        const arrowColor = slope > 0 ? 0x00ff00 : 0xff0000;
        const arrowMaterial = new THREE.LineBasicMaterial({ 
            color: arrowColor,
            linewidth: 3
        });
        
        this.slopeArrow = new THREE.Line(arrowGeometry, arrowMaterial);
        scene.add(this.slopeArrow);
        
        // Add arrow head (cone)
        const arrowHeadGeometry = new THREE.ConeGeometry(0.2, 0.6, 8);
        const arrowHeadMaterial = new THREE.MeshBasicMaterial({ color: arrowColor });
        const arrowHead = new THREE.Mesh(arrowHeadGeometry, arrowHeadMaterial);
        
        // Position and orient the arrow head
        arrowHead.position.copy(endPoint);
        
        // Calculate the direction vector
        const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        
        // Calculate the rotation to align with the direction
        const axis = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
        const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(direction));
        arrowHead.quaternion.setFromAxisAngle(axis, angle);
        
        // Add to scene and track for cleanup
        this.slopeArrow.add(arrowHead);
    }
    
    /**
     * Enable or disable slope visualization
     * @param {boolean} enabled - Whether to enable slope visualization
     */
    setSlopeDebugEnabled(enabled) {
        this.slopeDebugEnabled = enabled;
        
        // If disabled, remove any existing visualization
        if (!enabled && this.slopeArrow) {
            // This requires a scene reference, which will be provided when visualizing
            // So we'll clean up the next time visualizeSlopeDirection is called
        }
    }
    
    /**
     * Get the current calculated slope
     * @returns {number} Current terrain slope
     */
    getCurrentSlope() {
        return this.currentSlope;
    }
}

export default TerrainPhysics;