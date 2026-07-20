import * as THREE from 'three';
import { PHYSICS, wheelConfig } from '../kart-config.js';

/**
 * Manages kart suspension and wheel physics
 */
class SuspensionSystem {
    constructor(kartGroup, track) {
        this.kartGroup = kartGroup;
        this.track = track;
        this.suspensions = [];
        this.suspensionLines = [];
        
        // Wheel meshes
        this.wheels = {
            frontLeft: null,
            frontRight: null,
            rearLeft: null,
            rearRight: null
        };
    }
    
    /**
     * Initialize the suspension system
     * @param {THREE.Object3D} kartBodyGroup - The kart body group
     */
    initializeSuspension(kartBodyGroup) {
        // Clear any existing suspension
        this.suspensions = [];
        
        // Create suspension for each wheel
        this.createWheelSuspension(kartBodyGroup, 'frontLeft', 
            wheelConfig.offsetX, wheelConfig.offsetY, wheelConfig.frontOffsetZ);
            
        this.createWheelSuspension(kartBodyGroup, 'frontRight', 
            -wheelConfig.offsetX, wheelConfig.offsetY, wheelConfig.frontOffsetZ);
            
        this.createWheelSuspension(kartBodyGroup, 'rearLeft', 
            wheelConfig.offsetX, wheelConfig.offsetY, wheelConfig.rearOffsetZ);
            
        this.createWheelSuspension(kartBodyGroup, 'rearRight', 
            -wheelConfig.offsetX, wheelConfig.offsetY, wheelConfig.rearOffsetZ);
    }
    
    /**
     * Create suspension for a single wheel
     * @param {THREE.Object3D} kartBodyGroup - The kart body group
     * @param {string} name - Wheel name
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    createWheelSuspension(kartBodyGroup, name, x, y, z) {
        // Get the wheel mesh
        const wheel = this.wheels[name];
        
        if (!wheel) {
            console.warn(`Wheel ${name} not found for suspension`);
            return;
        }
        
        // Create suspension data
        const suspension = {
            name: name,
            wheelMesh: wheel,
            restPosition: new THREE.Vector3(x, y, z),
            currentPosition: new THREE.Vector3(x, y, z),
            travel: 0,                    // Current suspension travel
            compressionRatio: 0,          // 0 = fully extended, 1 = fully compressed
            velocity: 0,                  // Suspension velocity
            force: 0,                     // Current force
            groundHeight: 0,              // Height of ground at wheel position
            isOnTrack: true,              // Whether wheel is on track
            isSteering: name.includes('front'), // Whether this is a steering wheel
            load: 0                       // Load on this wheel
        };
        
        // Position the wheel
        wheel.position.copy(suspension.currentPosition);
        
        // Add to suspensions array
        this.suspensions.push(suspension);
    }
    
    /**
     * Update suspension physics for all wheels
     * @param {number} deltaTime - Time since last frame
     * @param {object} chassisOrientation - Kart chassis orientation
     * @param {boolean} skipSuspension - Whether to skip suspension updates (for legacy compatibility)
     */
    updateSuspension(deltaTime, chassisOrientation, skipSuspension) {
        // Skip suspension updates if explicitly told to
        if (skipSuspension === true) return;
        
        // Get kart position in world space
        const kartPosition = this.kartGroup.position.clone();
        const kartRotation = this.kartGroup.rotation.y;
        
        // Update each suspension
        for (const suspension of this.suspensions) {
            this.updateWheelSuspension(suspension, kartPosition, kartRotation, deltaTime);
        }
        
        // Calculate pitch and roll based on suspension
        this.calculateChassisPitchRoll(deltaTime, chassisOrientation);
    }
    
    /**
     * Update suspension for a single wheel
     * @param {object} suspension - Suspension data
     * @param {THREE.Vector3} kartPosition - Kart position
     * @param {number} kartRotation - Kart rotation
     * @param {number} deltaTime - Time since last frame
     */
    updateWheelSuspension(suspension, kartPosition, kartRotation, deltaTime) {
        // Calculate world position of wheel
        const wheelWorldPosition = this.getWheelWorldPosition(suspension, kartPosition, kartRotation);
        
        // Get ground height and track info at wheel position
        let terrainInfo;
        let trackInfo;
        let rampInfo;
        
        // Try to get both terrain and track heights for more accurate surface detection
        try {
            // First check terrain height
            terrainInfo = this.track.getHeightAt(wheelWorldPosition.x, wheelWorldPosition.z);
        } catch (e) {
            // If terrain height fails, use default values
            terrainInfo = { height: 0, normal: { x: 0, y: 1, z: 0 }, onTrack: false };
        }
        
        // Try to get ramp/track height
        try {
            if (this.track.getHeightWithRamps) {
                trackInfo = this.track.getHeightWithRamps(wheelWorldPosition.x, wheelWorldPosition.z);
                
                // Check if on a ramp
                if (trackInfo.onRamp) {
                    rampInfo = trackInfo;
                }
            } else {
                // Fallback to regular height
                trackInfo = this.track.getHeightAt(wheelWorldPosition.x, wheelWorldPosition.z);
            }
        } catch (e) {
            // If track/ramp height fails, use terrain info
            trackInfo = terrainInfo;
        }
        
        // Merge information to get the most accurate surface details
        const terrainHeight = typeof terrainInfo === 'number' ? terrainInfo : terrainInfo.height || 0;
        const trackHeight = typeof trackInfo === 'number' ? trackInfo : trackInfo.height || 0;
        const rampHeight = rampInfo ? rampInfo.height : 0;
        
        // Find the highest point (use max of all sources for more accurate terrain following)
        const highestPoint = Math.max(terrainHeight, trackHeight, rampHeight);
        
        // Determine the most relevant surface normal
        let surfaceNormal = { x: 0, y: 1, z: 0 }; // Default normal is straight up
        
        // Use normals from the highest surface for better alignment
        if (rampInfo && rampInfo.rampNormal && rampHeight >= terrainHeight && rampHeight >= trackHeight) {
            // On a ramp - use ramp normal
            surfaceNormal = rampInfo.rampNormal;
        } else if (trackInfo && trackInfo.normal && trackHeight >= terrainHeight) {
            // On track - use track normal
            surfaceNormal = trackInfo.normal;
        } else if (terrainInfo && terrainInfo.normal) {
            // On terrain - use terrain normal
            surfaceNormal = terrainInfo.normal;
        }
        
        // Set suspension data from surface
        suspension.groundHeight = highestPoint;
        suspension.onTrack = (trackInfo && trackInfo.onTrack) || false;
        suspension.groundNormal = surfaceNormal;
        
        // Calculate suspension compression with improved hill response
        const wheelRadius = wheelConfig.radius;
        
        // Determine the wheel's position relative to the surface
        // Add a much larger offset to prevent wheels from sinking into surfaces
        // The dramatically increased offset ensures vehicles stay above terrain at all costs
        const surfaceOffset = 1.2; // Dramatically increased offset to guarantee terrain clearance
        const idealHeight = highestPoint + wheelRadius + surfaceOffset;
        
        // Enhanced ground distance calculation with predictive adjustment for steep terrain
        // This helps prevent passing through terrain at high elevations by anticipating terrain changes
        
        // Get kart's velocity
        const kartVelocityY = this.kartGroup.userData.velocityY || 0;
        
        // Calculate distance from wheel to ground with much more aggressive predictive adjustment
        // Add a stronger velocity-based offset that ensures terrain detection even at very high speeds
        const velocityOffset = Math.max(0, -kartVelocityY * 1.0); // 5x stronger predictive offset based on downward velocity
        const predictiveDistance = kartPosition.y - (idealHeight + velocityOffset);
        
        // For steep terrain, we'll use a more aggressive distance calculation 
        // that favors terrain detection over smooth suspension
        const distanceToGround = predictiveDistance;
        
        // Calculate suspension values
        const restHeight = suspension.restPosition.y;
        const maxTravel = PHYSICS.suspensionTravel;
        
        // Enhanced wheel offset calculation with improved terrain handling
        let wheelY = 0;
        
        if (distanceToGround < 0) {
            // Ground is above wheel rest position - compress suspension fully with much stronger response
            // The 3.0 multiplier provides dramatically more aggressive compression on all terrain
            const compression = Math.min(maxTravel, Math.abs(distanceToGround) * 3.0);
            suspension.travel = maxTravel - compression;
            wheelY = restHeight - compression;
            
            // Ensure compression ratio has a minimum value for better terrain contact
            // This prevents slipping through terrain on high-speed collisions
            suspension.compressionRatio = Math.max(0.15, compression / maxTravel);
        } else if (distanceToGround < maxTravel) {
            // Ground is below wheel rest position but within travel range
            // Add a small bias toward compression for better terrain detection
            const biasedDistance = distanceToGround * 0.85;
            suspension.travel = biasedDistance;
            wheelY = restHeight - maxTravel + suspension.travel;
            suspension.compressionRatio = (maxTravel - suspension.travel) / maxTravel;
        } else {
            // Wheel is in the air but maintain a slight contact bias
            suspension.travel = maxTravel;
            wheelY = restHeight - maxTravel;
            suspension.compressionRatio = 0;
        }
        
        // Calculate suspension forces with improved dynamics
        const springForce = (maxTravel - suspension.travel) * PHYSICS.suspensionStiffness;
        const dampingForce = -suspension.velocity * PHYSICS.suspensionDamping;
        suspension.force = springForce + dampingForce;
        
        // Calculate load factor (0-1) based on compression
        // Enhanced to provide stronger wheel contact feeling
        suspension.load = Math.max(0, Math.min(1, suspension.compressionRatio * 1.8));
        
        // Update wheel position
        suspension.currentPosition.y = wheelY;
        suspension.wheelMesh.position.y = wheelY;
        
        // Enhanced contact point calculation with improved terrain physics
        // Using a much higher minimum contact threshold for guaranteed terrain adherence
        const minimumContactThreshold = 0.2; // 4x stronger contact threshold
        
        if (suspension.compressionRatio > minimumContactThreshold) {
            // Calculate contact point in world space with more precise positioning
            // Apply a much larger offset along the surface normal for guaranteed terrain adherence
            const normalOffsetAmount = 0.25; // Significantly increased offset for stronger ground sticking
            
            const contactPoint = {
                x: wheelWorldPosition.x + surfaceNormal.x * normalOffsetAmount,
                y: highestPoint + surfaceNormal.y * normalOffsetAmount,
                z: wheelWorldPosition.z + surfaceNormal.z * normalOffsetAmount
            };
            
            // Store additional data about the wheel contact with enhanced physics values
            suspension.contactPoint = contactPoint;
            suspension.contactNormal = surfaceNormal;
            
            // Use a much stronger non-linear mapping for contact force to ensure terrain adhesion
            // This gives dramatically more traction on all terrain to prevent objects passing through
            const forceScaling = 3.0 + 2.0 * Math.pow(suspension.compressionRatio, 2);
            suspension.contactForce = suspension.force * suspension.compressionRatio * forceScaling;
            
            // Add additional steep terrain handling
            if (surfaceNormal.y < 0.7) { // Surface is fairly steep
                suspension.contactForce *= 1.2; // Increase force for better grip on steep terrain
            }
        } else {
            // No significant contact, but maintain some minimal values for stability
            // This prevents abrupt transitions when moving over small bumps
            suspension.contactPoint = {
                x: wheelWorldPosition.x,
                y: highestPoint,
                z: wheelWorldPosition.z
            };
            suspension.contactNormal = { x: 0, y: 1, z: 0 };
            suspension.contactForce = suspension.force * minimumContactThreshold * 0.1;
        }
        
        // Update suspension velocity
        const previousTravel = suspension.travel;
        const travelDelta = suspension.travel - previousTravel;
        suspension.velocity = travelDelta / deltaTime;
    }
    
    /**
     * Calculate the world position of a wheel
     * @param {object} suspension - Suspension data
     * @param {THREE.Vector3} kartPosition - Kart position
     * @param {number} kartRotation - Kart rotation
     * @returns {THREE.Vector3} World position of wheel
     */
    getWheelWorldPosition(suspension, kartPosition, kartRotation) {
        // Get wheel position in local space
        const localPos = suspension.currentPosition.clone();
        
        // Apply kart rotation
        const rotatedX = localPos.x * Math.cos(kartRotation) - localPos.z * Math.sin(kartRotation);
        const rotatedZ = localPos.x * Math.sin(kartRotation) + localPos.z * Math.cos(kartRotation);
        
        // Add kart position to get world position
        return new THREE.Vector3(
            kartPosition.x + rotatedX,
            kartPosition.y + localPos.y,
            kartPosition.z + rotatedZ
        );
    }
    
    /**
     * Calculate chassis pitch and roll based on suspension
     * @param {number} deltaTime - Time since last frame
     * @param {object} chassisOrientation - Chassis orientation state
     */
    calculateChassisPitchRoll(deltaTime, chassisOrientation) {
        if (!chassisOrientation) return;
        
        // Get suspensions by position
        const frontLeft = this.suspensions.find(s => s.name === 'frontLeft');
        const frontRight = this.suspensions.find(s => s.name === 'frontRight');
        const rearLeft = this.suspensions.find(s => s.name === 'rearLeft');
        const rearRight = this.suspensions.find(s => s.name === 'rearRight');
        
        if (!frontLeft || !frontRight || !rearLeft || !rearRight) return;
        
        // Calculate pitch (forward/backward tilt)
        const frontAvg = (frontLeft.travel + frontRight.travel) / 2;
        const rearAvg = (rearLeft.travel + rearRight.travel) / 2;
        const pitchDelta = (frontAvg - rearAvg) / 10;
        
        // Calculate roll (side-to-side tilt)
        const leftAvg = (frontLeft.travel + rearLeft.travel) / 2;
        const rightAvg = (frontRight.travel + rearRight.travel) / 2;
        const rollDelta = (leftAvg - rightAvg) / 8;
        
        // Apply spring and damping forces to chassis orientation
        const pitchForce = -pitchDelta * PHYSICS.pitchStiffness - chassisOrientation.pitchVelocity * PHYSICS.dampingCoefficient;
        const rollForce = rollDelta * PHYSICS.chassisRollStiffness - chassisOrientation.rollVelocity * PHYSICS.dampingCoefficient;
        
        // Update chassis velocities
        chassisOrientation.pitchVelocity += pitchForce * deltaTime / 5000;
        chassisOrientation.rollVelocity += rollForce * deltaTime / 5000;
        
        // Limit maximum velocities
        const maxAngularVelocity = 0.05;
        chassisOrientation.pitchVelocity = Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, chassisOrientation.pitchVelocity));
        chassisOrientation.rollVelocity = Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, chassisOrientation.rollVelocity));
        
        // Update chassis orientation
        chassisOrientation.pitch += chassisOrientation.pitchVelocity;
        chassisOrientation.roll += chassisOrientation.rollVelocity;
        
        // Apply natural damping
        chassisOrientation.pitch *= 0.95;
        chassisOrientation.roll *= 0.95;
        
        // Set limits to orientation
        const maxPitch = 0.3;
        const maxRoll = 0.2;
        chassisOrientation.pitch = Math.max(-maxPitch, Math.min(maxPitch, chassisOrientation.pitch));
        chassisOrientation.roll = Math.max(-maxRoll, Math.min(maxRoll, chassisOrientation.roll));
    }
    
    /**
     * Debug method to draw the kart's suspension
     * @param {THREE.Scene} scene - The scene to add debug visuals to
     */
    drawSuspension(scene) {
        // Clean up any existing debug lines
        if (this.suspensionLines.length > 0) {
            this.suspensionLines.forEach(line => {
                scene.remove(line);
            });
        }
        this.suspensionLines = [];
        
        // Draw each suspension as a line
        this.suspensions.forEach(suspension => {
            const startPoint = new THREE.Vector3()
                .copy(suspension.wheelMesh.position)
                .add(new THREE.Vector3(0, suspension.travel, 0));
                
            const endPoint = new THREE.Vector3()
                .copy(suspension.wheelMesh.position);
            
            // Create a line for this suspension
            const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
            const material = new THREE.LineBasicMaterial({ 
                color: 0xffff00, 
                linewidth: 2 
            });
            const line = new THREE.Line(geometry, material);
            
            // Add to scene and track for cleanup
            scene.add(line);
            this.suspensionLines.push(line);
        });
    }
    
    /**
     * Set wheel meshes for suspension system
     * @param {object} wheels - Object containing wheel meshes
     */
    setWheels(wheels) {
        this.wheels = wheels;
    }
    
    /**
     * Get suspension data for UI and other systems
     * @returns {Array} Array of suspension data
     */
    getSuspensionData() {
        return this.suspensions.map(suspension => ({
            name: suspension.name,
            compressionRatio: suspension.compressionRatio,
            isOnTrack: suspension.onTrack,
            load: suspension.load
        }));
    }
}

export default SuspensionSystem;