import * as THREE from 'three';
import DustParticles from './dust-particles.js';
import { kartSize, PHYSICS, wheelConfig } from './kart-config.js';
import { TRACK_PHYSICS } from '../track/track-config.js';

// Import component systems
import AudioSystem from './components/audio-system.js';
import HeadlightSystem from './components/headlight-system.js';
import TerrainPhysics from './components/terrain-physics.js';
import SuspensionSystem from './components/suspension-system.js';
import InputHandler from './components/input-handler.js';

class Kart {
    constructor(scene, track) {
        this.scene = scene;
        this.track = track;
        
        // Kart physics state
        this.velocity = 0;                 // Current velocity
        this.isAccelerating = false;
        
        // Initialize component systems
        this.inputHandler = new InputHandler();
        this.audioSystem = new AudioSystem();
        this.terrainPhysics = new TerrainPhysics(track);
        
        // Physics state
        this.verticalVelocity = 0;         // Vertical speed (for jumps and gravity)
        this.airTime = 0;                  // Time spent in the air (used for safety checks)
        this.lastGroundY = 0;              // Last ground position before losing wheel contact
        this.airRotation = {
            x: 0,                          // Pitch rotation in air
            z: 0,                          // Roll rotation in air
            velocityX: 0,                  // Rotation speeds
            velocityZ: 0
        };
        
        // Chassis orientation state (in radians)
        this.chassisOrientation = {
            pitch: 0,       // Forward/backward tilt
            roll: 0,        // Side-to-side tilt
            pitchVelocity: 0,
            rollVelocity: 0
        };
        
        // Track state
        this.isOnTrack = true;
        this.isOnRamp = false;
        this.rampInfo = null;
        
        // Creating the kart objects
        this.createKart();
        
        // Create dust particles system
        this.dustParticles = new DustParticles(scene.scene);
        
        // Suspension system requires wheels to be created first
        this.suspensionSystem = new SuspensionSystem(this.kartGroup, track);
        this.suspensionSystem.setWheels({
            frontLeft: this.wheels.frontLeft,
            frontRight: this.wheels.frontRight,
            rearLeft: this.wheels.rearLeft,
            rearRight: this.wheels.rearRight
        });
        
        // Initialize suspension
        this.initializeSuspension();
        
        // Headlight system requires the body group to be initialized first
        // FIXED: Consistent scene reference, use this.scene.scene
        this.headlightSystem = new HeadlightSystem(this.scene.scene, this.kartBodyGroup);
        
        // Position kart at the start of the track
        this.positionAtStart();
        
        // Emergency recovery state
        this.isResetting = false;
        this.resetStartTime = 0;
        this.resetDuration = 1.0;
        this.resetStartPosition = new THREE.Vector3();
        this.resetEndPosition = new THREE.Vector3();
        this.resetStartRotation = 0;
        this.resetEndRotation = 0;
        
        // Status display elements
        this.kartStatus = {
            onTrack: true,
            speed: 0,
            groundHeight: 0
        };
        
        // Timer for stuck detection
        this.timeSpentSlow = 0;
    }
    
    /**
     * Create the kart mesh and add it to the scene
     */
    createKart() {
        // Main group for the entire kart
        this.kartGroup = new THREE.Group();
        this.kartGroup.up.set(0, 1, 0); // Ensure kart's up direction is correct
        
        // Separate group for just the body (for banking)
        this.kartBodyGroup = new THREE.Group();
        this.kartGroup.add(this.kartBodyGroup);
        
        // Create kart body
        this.createKartBody();
        
        // Create wheels
        this.createWheels();
        
        // Add wheel caps (detail)
        this.addWheelCaps();
        
        // Add kart to scene - FIXED: Use scene.scene instead of scene directly
        this.scene.scene.add(this.kartGroup);
        
        // Make sure kart is visible
        this.kartGroup.visible = true;
        this.kartBodyGroup.visible = true;
        
        console.log("Kart created and added to scene:", this.kartGroup);
    }
    
    /**
     * Create the kart body mesh
     */
    createKartBody() {
        // Colors
        const kartColors = {
            body: 0x3366ff,   // Blue
            details: 0xffdd00, // Yellow
            darkDetails: 0x444444 // Dark gray
        };
        
        // Main body - simple box for now
        const bodyGeometry = new THREE.BoxGeometry(
            kartSize.width,
            kartSize.height * 0.7, // Lower height for sleeker look
            kartSize.depth
        );
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: kartColors.body,
            roughness: 0.4,
            metalness: 0.6
        });
        
        const kartBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Position body - lower to ground
        kartBody.position.y = kartSize.height / 2;
        
        // Add body to the kart
        this.kartBodyGroup.add(kartBody);
        
        // Add nose cone (for better aerodynamics!)
        const noseGeometry = new THREE.ConeGeometry(kartSize.width / 2, kartSize.depth * 0.4, 4, 1);
        noseGeometry.rotateX(-Math.PI / 2); // Rotate to point forward
        
        const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
        nose.position.set(0, kartSize.height * 0.4, kartSize.depth / 2 - 0.05);
        this.kartBodyGroup.add(nose);
        
        // Add driver seat
        const seatGeometry = new THREE.BoxGeometry(
            kartSize.width * 0.7, 
            kartSize.height * 0.3, 
            kartSize.depth * 0.6
        );
        
        const seatMaterial = new THREE.MeshStandardMaterial({
            color: kartColors.darkDetails,
            roughness: 0.9,
            metalness: 0.2
        });
        
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, kartSize.height * 0.85, -0.1);
        this.kartBodyGroup.add(seat);
        
        // Add steering wheel
        const wheelGeometry = new THREE.TorusGeometry(0.15, 0.03, 8, 16);
        const steeringWheel = new THREE.Mesh(wheelGeometry, seatMaterial);
        steeringWheel.rotation.x = Math.PI / 2; // Face upward
        steeringWheel.position.set(0, kartSize.height * 0.8, 0.3);
        this.kartBodyGroup.add(steeringWheel);
        
        // Add rear spoiler
        const spoilerGeometry = new THREE.BoxGeometry(
            kartSize.width * 0.9,
            kartSize.height * 0.1,
            kartSize.depth * 0.1
        );
        
        const spoilerMaterial = new THREE.MeshStandardMaterial({
            color: kartColors.details,
            roughness: 0.5,
            metalness: 0.7
        });
        
        const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
        spoiler.position.set(0, kartSize.height * 1.2, -kartSize.depth / 2 + 0.1);
        this.kartBodyGroup.add(spoiler);
        
        // Add spoiler supports
        const supportGeometry = new THREE.BoxGeometry(
            kartSize.width * 0.05,
            kartSize.height * 0.4,
            kartSize.depth * 0.05
        );
        
        const leftSupport = new THREE.Mesh(supportGeometry, spoilerMaterial);
        leftSupport.position.set(
            kartSize.width * 0.4,
            kartSize.height * 1,
            -kartSize.depth / 2 + 0.1
        );
        this.kartBodyGroup.add(leftSupport);
        
        const rightSupport = new THREE.Mesh(supportGeometry, spoilerMaterial);
        rightSupport.position.set(
            -kartSize.width * 0.4,
            kartSize.height * 1,
            -kartSize.depth / 2 + 0.1
        );
        this.kartBodyGroup.add(rightSupport);
        
        // Set up shadows
        kartBody.castShadow = true;
        kartBody.receiveShadow = true;
        seat.castShadow = true;
        spoiler.castShadow = true;
        leftSupport.castShadow = true;
        rightSupport.castShadow = true;
    }
    
    /**
     * Create the wheel meshes
     */
    createWheels() {
        // Wheel geometry
        const wheelGeometry = new THREE.CylinderGeometry(
            wheelConfig.radius,
            wheelConfig.radius,
            wheelConfig.thickness,
            16
        );
        
        // Rotate wheel to correct orientation
        wheelGeometry.rotateZ(Math.PI / 2);
        
        // Wheel material
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Create wheel meshes
        this.wheels = {};
        
        // Front left wheel
        this.wheels.frontLeft = new THREE.Mesh(wheelGeometry, wheelMaterial);
        this.wheels.frontLeft.position.set(
            wheelConfig.offsetX,
            wheelConfig.offsetY,
            wheelConfig.frontOffsetZ
        );
        this.wheels.frontLeft.castShadow = true;
        this.kartBodyGroup.add(this.wheels.frontLeft);
        
        // Front right wheel
        this.wheels.frontRight = new THREE.Mesh(wheelGeometry, wheelMaterial);
        this.wheels.frontRight.position.set(
            -wheelConfig.offsetX,
            wheelConfig.offsetY,
            wheelConfig.frontOffsetZ
        );
        this.wheels.frontRight.castShadow = true;
        this.kartBodyGroup.add(this.wheels.frontRight);
        
        // Rear left wheel
        this.wheels.rearLeft = new THREE.Mesh(wheelGeometry, wheelMaterial);
        this.wheels.rearLeft.position.set(
            wheelConfig.offsetX,
            wheelConfig.offsetY,
            wheelConfig.rearOffsetZ
        );
        this.wheels.rearLeft.castShadow = true;
        this.kartBodyGroup.add(this.wheels.rearLeft);
        
        // Rear right wheel
        this.wheels.rearRight = new THREE.Mesh(wheelGeometry, wheelMaterial);
        this.wheels.rearRight.position.set(
            -wheelConfig.offsetX,
            wheelConfig.offsetY,
            wheelConfig.rearOffsetZ
        );
        this.wheels.rearRight.castShadow = true;
        this.kartBodyGroup.add(this.wheels.rearRight);
    }
    
    /**
     * Add detailed wheel caps for visual flair
     */
    addWheelCaps() {
        // Create materials for wheel caps
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0xCCCCCC,
            roughness: 0.4,
            metalness: 0.8
        });
        
        // Add caps to each wheel
        Object.values(this.wheels).forEach(wheel => {
            // Create cap geometry (disc)
            const capGeometry = new THREE.CircleGeometry(wheelConfig.radius * 0.7, 16);
            
            // Create left cap
            const leftCap = new THREE.Mesh(capGeometry, capMaterial);
            leftCap.position.set(wheelConfig.thickness/2 + 0.01, 0, 0);
            leftCap.rotation.y = Math.PI/2;
            wheel.add(leftCap);
            
            // Create right cap (clone of left)
            const rightCap = leftCap.clone();
            rightCap.position.set(-wheelConfig.thickness/2 - 0.01, 0, 0);
            rightCap.rotation.y = -Math.PI/2;
            wheel.add(rightCap);
            
            // Add some spokes for detail
            const spokeCount = 5;
            for (let i = 0; i < spokeCount; i++) {
                const angle = (Math.PI * 2 * i) / spokeCount;
                const spokeGeometry = new THREE.BoxGeometry(
                    wheelConfig.thickness + 0.03,
                    wheelConfig.radius * 0.12,
                    wheelConfig.radius * 0.12
                );
                
                const spoke = new THREE.Mesh(spokeGeometry, capMaterial);
                const spokeRadius = wheelConfig.radius * 0.45;
                spoke.position.set(
                    0,
                    Math.cos(angle) * spokeRadius,
                    Math.sin(angle) * spokeRadius
                );
                
                spoke.rotation.z = angle;
                wheel.add(spoke);
            }
        });
    }
    
    /**
     * Initialize the suspension system
     */
    initializeSuspension() {
        this.suspensionSystem.initializeSuspension(this.kartBodyGroup);
    }
    
    /**
     * Position the kart at the start of the track
     */
    positionAtStart() {
        // Get starting position and rotation
        const startPosition = this.track.getStartPosition();
        const startRotation = this.track.getStartRotation();
        
        // Sample multiple points around the kart start position for better height detection
        const sampleRadius = 1.0; // 1 meter radius for sampling
        const sampleOffsets = [
            {x: 0, z: 0},             // Center
            {x: sampleRadius, z: 0},  // Right
            {x: -sampleRadius, z: 0}, // Left
            {x: 0, z: sampleRadius},  // Front
            {x: 0, z: -sampleRadius}, // Rear
            {x: sampleRadius/2, z: sampleRadius/2},   // Front-right
            {x: -sampleRadius/2, z: sampleRadius/2},  // Front-left
            {x: sampleRadius/2, z: -sampleRadius/2},  // Rear-right
            {x: -sampleRadius/2, z: -sampleRadius/2}  // Rear-left
        ];
        
        // Track maximum heights found
        let maxTerrainHeight = -Infinity;
        let maxTrackHeight = -Infinity;
        let maxRampHeight = -Infinity;
        let surfaceNormal = { x: 0, y: 1, z: 0 };
        
        // Sample heights at each point
        for (const offset of sampleOffsets) {
            const sampleX = startPosition.x + offset.x;
            const sampleZ = startPosition.z + offset.z;
            
            // Try to get both terrain and track heights
            try {
                if (this.track.getHeightAt) {
                    const groundInfo = this.track.getHeightAt(sampleX, sampleZ);
                    const sampleTerrainHeight = typeof groundInfo === 'number' ? groundInfo : groundInfo.height || 0;
                    maxTerrainHeight = Math.max(maxTerrainHeight, sampleTerrainHeight);
                    
                    // Store normal from center point
                    if (offset.x === 0 && offset.z === 0 && typeof groundInfo === 'object' && groundInfo.normal) {
                        surfaceNormal = groundInfo.normal;
                    }
                }
            } catch (e) {
                // Silent fail for sample points
            }
            
            // Get track height with ramps
            try {
                if (this.track.getHeightWithRamps) {
                    const trackInfo = this.track.getHeightWithRamps(sampleX, sampleZ);
                    const sampleTrackHeight = trackInfo.height || 0;
                    maxTrackHeight = Math.max(maxTrackHeight, sampleTrackHeight);
                    
                    // Save ramp height if applicable
                    if (trackInfo.onRamp) {
                        maxRampHeight = Math.max(maxRampHeight, sampleTrackHeight);
                        
                        // Store normal from center point
                        if (offset.x === 0 && offset.z === 0 && trackInfo.rampNormal) {
                            surfaceNormal = trackInfo.rampNormal;
                        }
                    } else if (offset.x === 0 && offset.z === 0 && trackInfo.normal) {
                        // Store track normal from center point
                        surfaceNormal = trackInfo.normal;
                    }
                } else if (this.track.getHeightAt) {
                    const trackInfo = this.track.getHeightAt(sampleX, sampleZ);
                    const sampleTrackHeight = typeof trackInfo === 'number' ? trackInfo : trackInfo.height || 0;
                    maxTrackHeight = Math.max(maxTrackHeight, sampleTrackHeight);
                }
            } catch (e) {
                // Silent fail for sample points
            }
        }
        
        // Default to provided position if all height checks fail
        if (maxTerrainHeight === -Infinity) maxTerrainHeight = startPosition.y;
        if (maxTrackHeight === -Infinity) maxTrackHeight = startPosition.y;
        if (maxRampHeight === -Infinity) maxRampHeight = 0;
        
        // Find the highest point across all samples (track, ramp, or terrain)
        const highestPoint = Math.max(maxTerrainHeight, maxTrackHeight, maxRampHeight, startPosition.y);
        
        console.log("Heights at start: Terrain:", maxTerrainHeight, "Track:", maxTrackHeight, 
                    "Ramp:", maxRampHeight, "Start Y:", startPosition.y, "Using:", highestPoint);
        
        // Calculate proper kart ride height
        // Base height + half of kart height + wheel radius + suspension offset + safety margin
        const safetyMargin = 0.1; // Extra height to prevent starting below terrain
        const properHeight = highestPoint + kartSize.height/2 + wheelConfig.radius + 
                            PHYSICS.suspensionRestHeight + safetyMargin;
        
        // Set kart position and rotation
        this.kartGroup.position.set(
            startPosition.x, 
            properHeight,
            startPosition.z
        );
        
        // Set rotation for forward direction along track
        this.kartGroup.rotation.y = startRotation;
        
        // Apply proper tilt based on surface normal at starting position
        if (surfaceNormal.x !== 0 || surfaceNormal.z !== 0) {
            // Calculate pitch and roll from normal (reduced strength for initial position)
            const pitchFromNormal = Math.atan2(surfaceNormal.z, surfaceNormal.y) * 0.5;
            const rollFromNormal = Math.atan2(-surfaceNormal.x, surfaceNormal.y) * 0.5;
            
            // Apply to chassis orientation
            this.chassisOrientation.pitch = pitchFromNormal;
            this.chassisOrientation.roll = rollFromNormal;
            
            // Apply chassis orientation to kart body
            this.kartBodyGroup.rotation.x = this.chassisOrientation.pitch;
            this.kartBodyGroup.rotation.z = this.chassisOrientation.roll;
        } else {
            // Initialize kart with level orientation if no slope
            this.kartGroup.rotation.z = 0;  // No roll initially
            this.kartGroup.rotation.x = 0;  // No pitch initially
            this.chassisOrientation.pitch = 0;
            this.chassisOrientation.roll = 0;
        }
        
        // Make sure the kart is fully visible
        this.kartGroup.visible = true;
        this.kartBodyGroup.visible = true;
        
        // Initialize suspension to match terrain
        this.suspensionSystem.updateSuspension(0.016, this.chassisOrientation, false);
        
        // Log to confirm position
        console.log("Kart positioned at starting point:", 
            this.kartGroup.position.x, 
            this.kartGroup.position.y, 
            this.kartGroup.position.z,
            "with orientation pitch:", this.chassisOrientation.pitch,
            "roll:", this.chassisOrientation.roll
        );
    }
    
    /**
     * Toggle the kart's headlights
     * @returns {boolean} - New headlight state
     */
    toggleHeadlights() {
        return this.headlightSystem.toggleHeadlights();
    }
    
    /**
     * Update the kart state for a frame
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {object} keys - Keyboard state
     * @param {object} environment - Environment object for time of day
     */
    update(deltaTime, keys, environment) {
        // Store the keys for use in other methods
        this.keys = keys;
        
        // Check for manual reset request via 'r' key
        if (keys.r) {
            this.beginResetAnimation();
            // Clear the key to prevent continuous resets
            keys.r = false;
            return;
        }
        
        // Process input
        const input = this.inputHandler.handleInput(keys, deltaTime);
        
        // Toggle headlights if requested
        if (input.toggleHeadlights) {
            this.headlightSystem.setManualControl(true);
            this.toggleHeadlights();
        }
        
        // Toggle slope visualization if requested
        if (input.toggleSlopeVisualization) {
            this.terrainPhysics.setSlopeDebugEnabled(!this.terrainPhysics.slopeDebugEnabled);
            console.log("Slope visualization:", this.terrainPhysics.slopeDebugEnabled ? "enabled" : "disabled");
        }
        
        // If we're in reset animation, just update that
        if (this.isResetting) {
            const resetT = (Date.now() - this.resetStartTime) / (this.resetDuration * 1000);
            
            if (resetT >= 1.0) {
                // Reset complete
                this.isResetting = false;
                this.velocity = 0;
                this.verticalVelocity = 0;
                this.airTime = 0;
                
                // Completely set position and rotation to end values
                this.kartGroup.position.copy(this.resetEndPosition);
                this.kartGroup.rotation.y = this.resetEndRotation;
                this.kartGroup.rotation.x = 0;
                this.kartGroup.rotation.z = 0;
                
                // Reset chassis orientation
                this.chassisOrientation.pitch = 0;
                this.chassisOrientation.roll = 0;
                this.chassisOrientation.pitchVelocity = 0;
                this.chassisOrientation.rollVelocity = 0;
                
                // Apply to kart body
                this.kartBodyGroup.rotation.set(0, 0, 0);
                
                // Reset air rotation
                this.airRotation.x = 0;
                this.airRotation.z = 0;
                this.airRotation.velocityX = 0;
                this.airRotation.velocityZ = 0;
            } else {
                // Interpolate between start and end positions/rotations
                const smoothT = resetT * resetT * (3 - 2 * resetT); // Smooth step interpolation
                
                // Position interpolation
                this.kartGroup.position.lerpVectors(
                    this.resetStartPosition,
                    this.resetEndPosition,
                    smoothT
                );
                
                // Rotation interpolation
                let rotDiff = this.resetEndRotation - this.resetStartRotation;
                
                // Handle wrap-around
                if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                
                this.kartGroup.rotation.y = this.resetStartRotation + rotDiff * smoothT;
                
                // Reset rotation values gradually
                const remT = 1 - smoothT;
                this.kartGroup.rotation.x *= remT;
                this.kartGroup.rotation.z *= remT;
                this.chassisOrientation.pitch *= remT;
                this.chassisOrientation.roll *= remT;
                this.airRotation.x *= remT;
                this.airRotation.z *= remT;
                
                // Apply chassis orientation smoothly to zero
                this.kartBodyGroup.rotation.x = this.chassisOrientation.pitch * remT;
                this.kartBodyGroup.rotation.z = this.chassisOrientation.roll * remT;
            }
            
            return;
        }
        
        // Check for automatic headlight control based on time of day
        if (environment && environment.sky && !this.headlightSystem.manualHeadlightControl) {
            const timeOfDay = environment.sky.timeOfDay;
            this.headlightSystem.updateHeadlights(timeOfDay);
        }
        
        // Unified physics model - use a single method for all physics states
        this.handleUnifiedPhysics(deltaTime, input);
        
        // Apply gravity and vertical motion
        this.applyVerticalPhysics(deltaTime);
        
        // Update engine sound
        this.audioSystem.updateEngineSound(this.velocity);
        
        // Check for being stuck
        this.checkForStuck(deltaTime);
        
        // Update track status (on/off track)
        this.checkTrackStatus();
        
        // Update dust particles based on speed, track status and wheel contact
        const speedFactor = Math.abs(this.velocity) / PHYSICS.kartMaxSpeed;
        const wheelContactRatio = this.getWheelContactRatio();
        
        this.dustParticles.update(
            this.kartGroup.position.x,
            this.kartGroup.position.y,
            this.kartGroup.position.z,
            speedFactor,
            !this.isOnTrack && wheelContactRatio > 0.1 && Math.abs(this.velocity) > 0.02
        );
        
        // Update the slope visualization if enabled
        if (this.terrainPhysics.slopeDebugEnabled) {
            this.terrainPhysics.visualizeSlopeDirection(
                this.terrainPhysics.currentSlope,
                this.kartGroup,
                this.scene.scene
            );
        }
        
        // Debug output (remove after fixing)
        if (this.frameCount === undefined) this.frameCount = 0;
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            console.log("Kart velocity:", this.velocity, "Position:", this.kartGroup.position, "Contact ratio:", wheelContactRatio);
        }
    }
    
    /**
     * Handle input when kart is on the ground
     * @param {number} deltaTime - Time since last frame
     * @param {object} input - Processed input values
     */
    handleGroundInput(deltaTime, input) {
        // Store acceleration state for audio
        this.isAccelerating = input.acceleration > 0;
        
        // Calculate terrain slope
        const slope = this.terrainPhysics.calculateTerrainSlope(this.kartGroup, this.velocity);
        
        // Apply slope physics
        const slopeSpeedChange = this.terrainPhysics.applySlopePhysics(
            slope, 
            deltaTime, 
            this.chassisOrientation, 
            (level) => this.audioSystem.setEngineBoostSound(level),
            (level) => this.audioSystem.setEngineStrainSound(level),
            () => this.audioSystem.resetEngineAudioEffects()
        );
        
        // Apply slope effect to velocity
        this.velocity += slopeSpeedChange;
        
        // Get friction based on track status
        const frictionFactor = this.isOnTrack ? PHYSICS.onTrackFriction : PHYSICS.offTrackFriction;
        
        // Apply friction if no acceleration or braking
        if (!this.isAccelerating && input.braking === 0) {
            // Enhanced realistic deceleration with stronger friction at lower speeds
            const speedRatio = Math.abs(this.velocity) / PHYSICS.kartMaxSpeed;
            
            // Stronger friction at lower speeds
            const lowSpeedFactor = Math.max(0.5, 1 - speedRatio);
            const adjustedFriction = Math.pow(frictionFactor, lowSpeedFactor);
            
            // Apply friction
            this.velocity *= adjustedFriction;
            
            // Stop if very slow
            if (Math.abs(this.velocity) < 0.001) {
                this.velocity = 0;
            }
        }
        
        // Acceleration from input
        if (input.acceleration > 0) {
            // Get the max speed based on on/off track status
            const maxSpeed = this.isOnTrack ? 
                PHYSICS.kartMaxSpeed : 
                PHYSICS.kartMaxSpeed * PHYSICS.offTrackSpeedMultiplier;
            
            // Accelerate with diminishing effect as we approach max speed
            const speedRatio = Math.abs(this.velocity) / maxSpeed;
            // Less aggressive acceleration falloff - more power at higher speeds
            const accelFactor = 1 - Math.pow(speedRatio, 1.5); // Reduced power from 2 to 1.5 for better high-speed acceleration
            
            // Calculate acceleration force
            const accelForce = (PHYSICS.kartPower / PHYSICS.kartMass) * accelFactor;
            
            // Apply acceleration with enhanced weight transfer effect
            // More pronounced weight transfer for punchier acceleration feel
            const weightTransferBoost = Math.max(0, 1 - speedRatio) * 0.6; // Doubled from 0.3 to 0.6
            this.velocity += accelForce * deltaTime * (1 + weightTransferBoost);
            
            // Apply weight transfer to chassis - pitch back during acceleration
            if (this.chassisOrientation) {
                const accelerationPitch = -0.04 * accelForce * deltaTime * (1 - speedRatio * 0.6);
                this.chassisOrientation.pitchVelocity += accelerationPitch;
            }
            
            // Limit to max speed
            if (this.velocity > maxSpeed) {
                this.velocity = maxSpeed;
            }
        }
        
        // Braking from input
        if (input.braking > 0) {
            // Braking is stronger than acceleration
            const brakeForce = (PHYSICS.brakingPower / PHYSICS.kartMass);
            
            // Apply braking (reduce velocity)
            if (this.velocity > 0) {
                this.velocity -= brakeForce * deltaTime;
                
                // Apply forward weight transfer (pitch forward) during braking
                if (this.chassisOrientation && this.velocity > 0.01) {
                    const brakingPitch = 0.04 * brakeForce * deltaTime * 0.5;
                    this.chassisOrientation.pitchVelocity += brakingPitch;
                }
                
                if (this.velocity < 0) this.velocity = 0; // Prevent overshoot
            } 
            // Allow braking in reverse too, for more consistent feel
            else if (this.velocity < 0) {
                this.velocity += brakeForce * deltaTime;
                if (this.velocity > 0) this.velocity = 0; // Prevent overshoot
            }
        }
        
        // Apply steering - fixing the reversed controls
        if (input.steering !== 0 && Math.abs(this.velocity) > PHYSICS.minSpeedForSteering) {
            // Calculate steering force based on speed
            const speedRatio = Math.abs(this.velocity) / PHYSICS.kartMaxSpeed;
            
            // Calculate steering effectiveness with improved response curve
            // More linear steering response for better control throughout the speed range
            const steeringFactor = 0.5 + 0.5 * Math.pow(speedRatio, PHYSICS.steeringResponseCurve); // Base factor of 0.5 for better low-speed steering
            
            // Reduced understeer for better high-speed handling - less steering reduction
            const understeerFactor = 1 - (PHYSICS.understeerFactor * Math.pow(speedRatio, 1.5)); // Reduced power from 2 to 1.5
            
            // Calculate actual turn amount with overall boost
            const turnAmount = PHYSICS.turnSpeed * steeringFactor * understeerFactor * 1.2; // 20% overall steering boost
            
            // Apply steering (rotate kart) only if moving at sufficient speed
            // FIXED: using negative input.steering to fix reversed controls
            // Prevent steering in place - karts can't rotate without movement
            const minSpeedForTurning = 0.05; // Minimum speed required for any turning effect
            const speedRatioForTurning = Math.min(1.0, Math.abs(this.velocity) / minSpeedForTurning);
            
            // Apply steering effect proportional to speed - no steering when stationary
            this.kartGroup.rotation.y -= turnAmount * input.steering * speedRatioForTurning;
            
            // Apply inertia effects (like drifting/sliding)
            const inertiaFactor = PHYSICS.inertiaFactor;
            
            // For more predictable steering, reduce lateral motion at very low speeds
            const lateralSpeedRatio = Math.max(0.1, Math.min(1, Math.abs(this.velocity) / (PHYSICS.kartMaxSpeed * 0.3)));
            
            // Lateral sliding - apply force perpendicular to kart direction
            if (Math.abs(input.steering) > 0.1 && Math.abs(this.velocity) > PHYSICS.minSpeedForSteering) {
                const slideAngle = input.steering * inertiaFactor * lateralSpeedRatio;
                
                // Calculate slide direction (use inverted slide direction to match control changes)
                const kartRotation = this.kartGroup.rotation.y;
                const originalDir = new THREE.Vector2(Math.sin(kartRotation), Math.cos(kartRotation));
                // Flip the slide direction sign to match the steering direction fix
                const slideDir = new THREE.Vector2(originalDir.y, -originalDir.x).multiplyScalar(slideAngle);
                
                // Apply slide to position
                this.kartGroup.position.x += slideDir.x * Math.abs(this.velocity) * deltaTime;
                this.kartGroup.position.z += slideDir.y * Math.abs(this.velocity) * deltaTime;
                
                // Add roll to chassis based on steering force * speed
                const targetRoll = -input.steering * speedRatio * 0.15;
                this.chassisOrientation.roll = this.chassisOrientation.roll * 0.9 + targetRoll * 0.1;
            } else {
                // Gradually return to neutral roll
                this.chassisOrientation.roll *= 0.95;
            }
        } else {
            // Gradually return to neutral roll when not steering
            this.chassisOrientation.roll *= 0.95;
        }
        
        // Move the kart based on velocity
        const moveDistance = this.velocity * deltaTime;
        const moveDir = new THREE.Vector3(
            Math.sin(this.kartGroup.rotation.y),
            0,
            Math.cos(this.kartGroup.rotation.y)
        );
        
        // Move the kart based on velocity, but apply a multiplier to fix slow movement
        // Use a high enough multiplier to make the kart move at a proper speed
        const moveFactor = 50.0; // Much higher value to ensure proper movement speed
        this.kartGroup.position.x += moveDir.x * moveDistance * moveFactor;
        this.kartGroup.position.z += moveDir.z * moveDistance * moveFactor;
        
        // Apply steering to wheels (fixed to match control direction)
        if (this.wheels) {
            const steerAngle = -input.steering * 0.3; // Negative to match fixed steering direction
            this.wheels.frontLeft.rotation.y = steerAngle;
            this.wheels.frontRight.rotation.y = steerAngle;
            
            // Rotate wheels based on speed
            const wheelRotationSpeed = this.velocity * 3 / wheelConfig.radius;
            
            Object.values(this.wheels).forEach(wheel => {
                wheel.rotation.x += wheelRotationSpeed * deltaTime;
            });
        }
        
        // Update suspension
        this.suspensionSystem.updateSuspension(deltaTime, this.chassisOrientation, this.isInAir);
        
        // Apply chassis orientation to the kart body
        this.kartBodyGroup.rotation.x = this.chassisOrientation.pitch;
        this.kartBodyGroup.rotation.z = this.chassisOrientation.roll;
        
        // Update kart height based on suspension
        this.updateKartHeight();
        
        // Check for jumping off ramps
        if (this.isOnRamp && this.rampInfo) {
            // Get the ramp position (0-1)
            const rampPosition = this.rampInfo.rampPosition;
            
            // Check if we're past the peak of the ramp
            if (rampPosition > 0.6 && Math.abs(this.velocity) > 0.05) {
                // Calculate jump impulse based on speed and ramp height
                const jumpFactor = Math.abs(this.velocity) / PHYSICS.kartMaxSpeed;
                const rampHeight = this.rampInfo.rampHeight;
                
                // Calculate jump strength
                const jumpStrength = jumpFactor * rampHeight * 1.5;
                
                // Apply vertical impulse (convert to upward velocity)
                this.verticalVelocity = jumpStrength * 5;
                
                // Set air state
                this.isInAir = true;
                this.airTime = 0;
                this.lastGroundY = this.kartGroup.position.y;
                
                // Apply forward boost
                const boostMultiplier = 1.1 + jumpFactor * 0.2;
                this.velocity *= boostMultiplier;
                
                // Apply some initial rotation based on ramp angle
                if (this.rampInfo.rampNormal) {
                    // Calculate a pitch velocity based on ramp normal
                    const normalY = this.rampInfo.rampNormal.y;
                    const normalX = this.rampInfo.rampNormal.x;
                    const normalZ = this.rampInfo.rampNormal.z;
                    
                    // Project the normal onto the kart's forward-up plane
                    const kartRotation = this.kartGroup.rotation.y;
                    const kartForward = new THREE.Vector3(Math.sin(kartRotation), 0, Math.cos(kartRotation));
                    const projectedNormal = new THREE.Vector3(normalX, normalY, normalZ)
                        .projectOnPlane(new THREE.Vector3(-kartForward.z, 0, kartForward.x));
                    
                    // Initial pitch velocity based on ramp angle and speed
                    this.airRotation.velocityX = -projectedNormal.y * jumpFactor * 2;
                }
                
                console.log("Jumped off ramp with velocity:", this.velocity, "vert velocity:", this.verticalVelocity);
            }
        }
    }
    
    /**
     * Handle input when kart is in the air
     * @param {number} deltaTime - Time since last frame
     * @param {object} input - Processed input values
     */
    handleAirInput(deltaTime, input) {
        // Apply gravity
        this.verticalVelocity -= PHYSICS.gravity * deltaTime;
        
        // Update vertical position
        this.kartGroup.position.y += this.verticalVelocity * deltaTime;
        
        // Move forward with slightly reduced control
        const airControlFactor = 0.3;
        
        // Forward/backward thrust
        if (input.acceleration > 0) {
            // Apply reduced acceleration in air
            const accelForce = (PHYSICS.kartPower / PHYSICS.kartMass) * deltaTime * airControlFactor;
            this.velocity += accelForce;
            
            // Add a small upward tilt when accelerating in air (like a aircraft nose up)
            this.airRotation.velocityX -= accelForce * 0.3; 
        } else if (input.braking > 0) {
            // Apply braking in air (reduced effect)
            const brakeForce = (PHYSICS.brakingPower / PHYSICS.kartMass) * deltaTime * airControlFactor;
            this.velocity -= brakeForce;
            
            // Add a small downward tilt when braking in air
            this.airRotation.velocityX += brakeForce * 0.3;
        }
        
        // Enhanced air rotation control for better air handling
        if (input.steering !== 0) {
            // Apply stronger steering input to roll velocity (arcade-style air control)
            this.airRotation.velocityZ -= input.steering * deltaTime * 2.5; // Increased from 1.5 to 2.5
            
            // Higher roll velocity limit for more responsive air control
            const maxRotationRate = 2.0; // Increased from 1.5
            this.airRotation.velocityZ = Math.max(-maxRotationRate, Math.min(maxRotationRate, this.airRotation.velocityZ));
            
            // Allow more turning in air for better air control - more arcade-style fun
            const airYawFactor = 0.25; // Increased from 0.15 for better air steering
            // FIXED: Reversed steering in air as well (using negative input.steering)
            this.kartGroup.rotation.y -= input.steering * PHYSICS.turnSpeed * airYawFactor;
            
            // Add a slight forward pitch when steering in air for more dramatic jumps
            this.airRotation.velocityX += Math.abs(input.steering) * deltaTime * 0.3;
        }
        
        // Update air rotation
        this.airRotation.x += this.airRotation.velocityX * deltaTime;
        this.airRotation.z += this.airRotation.velocityZ * deltaTime;
        
        // Apply stronger air drag to slow rotation - better air control
        const airDampingFactor = 0.97; // Stronger damping from backup
        this.airRotation.velocityX *= airDampingFactor;
        this.airRotation.velocityZ *= airDampingFactor;
        
        // Forward motion in air
        const moveDistance = this.velocity * deltaTime;
        const moveDir = new THREE.Vector3(
            Math.sin(this.kartGroup.rotation.y),
            0,
            Math.cos(this.kartGroup.rotation.y)
        );
        
        // Apply movement with the same multiplier as ground movement
        const airMoveFactor = 50.0; // Same as ground movement factor
        this.kartGroup.position.x += moveDir.x * moveDistance * airMoveFactor;
        this.kartGroup.position.z += moveDir.z * moveDistance * airMoveFactor;
        
        // Apply air rotation to kart body
        this.kartBodyGroup.rotation.x = this.airRotation.x;
        this.kartBodyGroup.rotation.z = this.airRotation.z;
        
        // Add some auto-rotation based on velocity for interesting jumps
        // But reduce randomness for better control
        const autoRotationRate = Math.abs(this.velocity) * 0.05; // Reduced from 0.1
        // Use a more deterministic auto-rotation pattern
        this.airRotation.velocityX += (Math.sin(this.airTime * 3) * 0.01) * autoRotationRate * deltaTime;
        
        // Simulate air resistance
        this.velocity *= 0.997;
        
        // Rotate wheels in air too
        if (this.wheels) {
            // Reduce wheel rotation in air
            const wheelRotationSpeed = this.velocity * 2 / wheelConfig.radius;
            
            Object.values(this.wheels).forEach(wheel => {
                wheel.rotation.x += wheelRotationSpeed * deltaTime;
            });
            
            // Apply steering to front wheels (fixed to match control direction)
            const steerAngle = -input.steering * 0.3; // Negative to match fixed steering direction
            this.wheels.frontLeft.rotation.y = steerAngle;
            this.wheels.frontRight.rotation.y = steerAngle;
            
            // Make wheels spin a bit faster in air for visual flair
            if (input.acceleration > 0) {
                const extraSpinSpeed = 0.5;
                this.wheels.rearLeft.rotation.x += extraSpinSpeed * deltaTime;
                this.wheels.rearRight.rotation.x += extraSpinSpeed * deltaTime;
            }
        }
        
        // Maximum air time safety check - force landing if too long
        if (this.airTime > 5.0) {
            this.forceLanding();
        }
    }
    
    /**
     * Force the kart to land if it's been in the air too long
     */
    forceLanding() {
        console.log("Force landing after long air time");
        
        // Get current position
        const { x, y, z } = this.kartGroup.position;
        
        // Get ground height at current position
        let groundInfo;
        let groundHeight;
        
        try {
            groundInfo = this.track.getHeightWithRamps(x, z);
            groundHeight = groundInfo.height;
        } catch (e) {
            try {
                // Fall back to basic height if getHeightWithRamps fails
                groundHeight = this.track.getHeightAt(x, z).height;
            } catch (e2) {
                // Ultimate fallback if even getHeightAt fails
                groundHeight = 0;
            }
        }
        
        console.log("Emergency landing initiated at position:", x, z, "Ground height:", groundHeight);
        
        // Set kart position to ground level plus a bit
        this.kartGroup.position.y = groundHeight + kartSize.height / 2 + 0.05;
        
        // Reset air tracking
        this.airTime = 0;
        this.verticalVelocity = 0;
        
        // Reset air rotation
        this.airRotation.x = 0;
        this.airRotation.z = 0;
        this.airRotation.velocityX = 0;
        this.airRotation.velocityZ = 0;
        
        // Level out kart body
        this.kartBodyGroup.rotation.x = 0;
        this.kartBodyGroup.rotation.z = 0;
        
        // Reset chassis orientation
        this.chassisOrientation.pitch = 0;
        this.chassisOrientation.roll = 0;
        this.chassisOrientation.pitchVelocity = 0;
        this.chassisOrientation.rollVelocity = 0;
        
        // Reduce speed as penalty
        this.velocity *= 0.5;
    }
    
    /**
     * Check if kart has landed on the ground
     */
    checkForLanding() {
        if (!this.isInAir) return;
        
        const { x, y, z } = this.kartGroup.position;
        
        // Get ground height at current position
        // Use the track's getHeightWithRamps method if it exists, otherwise fall back to getHeightAt
        let groundInfo;
        try {
            groundInfo = this.track.getHeightWithRamps(x, z);
        } catch (e) {
            // Fallback to basic height check if getHeightWithRamps is not available
            groundInfo = this.track.getHeightAt(x, z);
        }
        
        const groundHeight = groundInfo.height;
        
        // More forgiving landing detection:
        // Landing zone is ground height plus half the kart height
        const landingHeight = groundHeight + kartSize.height / 2 + 0.05;
        
        // Check if kart is below landing height and moving downward
        if (y <= landingHeight && this.verticalVelocity < 0) {
            // We've landed!
            this.kartGroup.position.y = landingHeight;
            
            // Apply landing impact to chassis orientation
            const landingForce = -this.verticalVelocity * 0.02;
            this.chassisOrientation.pitch = -landingForce * 0.5;
            
            // Reset air state
            this.isInAir = false;
            this.airTime = 0;
            
            console.log("Landing completed - transitioning to ground physics");
            
            // Apply landing impact to velocity
            // Hard landings slow you down
            const impactFactor = Math.abs(this.verticalVelocity) / 10;
            this.velocity *= Math.max(0.5, 1 - impactFactor);
            
            // Reset vertical velocity
            this.verticalVelocity = 0;
            
            // Transfer air rotation to chassis orientation
            this.chassisOrientation.pitch = this.airRotation.x * 0.5;
            this.chassisOrientation.roll = this.airRotation.z * 0.5;
            
            // Reset air rotation
            this.airRotation.x = 0;
            this.airRotation.z = 0;
            this.airRotation.velocityX = 0;
            this.airRotation.velocityZ = 0;
        }
    }
    
    /**
     * Update kart height based on suspension and terrain
     */
    updateKartHeight() {
        // Update suspension display in UI if needed
        this.updateStatusDisplay();
        
        // Get the kart's current position
        const { x, y, z } = this.kartGroup.position;
        
        // Get wheel contact information
        const wheelContactRatio = this.getWheelContactRatio();
        
        // If in freefall (no wheel contact at all), let vertical physics handle it
        if (wheelContactRatio <= 0.01) {
            // Just make sure airTime is being tracked
            if (this.airTime === 0) {
                this.lastGroundY = this.kartGroup.position.y;
            }
            return;
        }
        
        // Calculate the terrain height at kart position using both track and ground methods
        let terrainHeight = 0;
        let trackHeight = 0;
        let rampHeight = 0;
        let surfaceNormal = { x: 0, y: 1, z: 0 }; // Default normal is straight up
        let trackInfo = null;
        let groundInfo = null;
        
        // Sample multiple points around the kart for better height detection
        const sampleOffsets = [
            {x: 0, z: 0},             // Center
            {x: 0.5, z: 0.5},         // Front-right
            {x: -0.5, z: 0.5},        // Front-left
            {x: 0.5, z: -0.5},        // Rear-right
            {x: -0.5, z: -0.5}        // Rear-left
        ];
        
        let maxTerrainHeight = -Infinity;
        let maxTrackHeight = -Infinity;
        let maxRampHeight = -Infinity;
        
        // Get the kart's rotation
        const kartRotation = this.kartGroup.rotation.y;
        const cosRot = Math.cos(kartRotation);
        const sinRot = Math.sin(kartRotation);
        
        // Sample heights at multiple points
        for (const offset of sampleOffsets) {
            // Rotate the offset by the kart's rotation
            const rotatedX = offset.x * cosRot - offset.z * sinRot;
            const rotatedZ = offset.x * sinRot + offset.z * cosRot;
            
            // Sample position
            const sampleX = x + rotatedX;
            const sampleZ = z + rotatedZ;
            
            let sampleTerrainHeight = 0;
            let sampleTrackHeight = 0;
            let sampleRampHeight = 0;
            
            // Get ground height
            try {
                if (this.track.getHeightAt) {
                    const sampleGroundInfo = this.track.getHeightAt(sampleX, sampleZ);
                    sampleTerrainHeight = typeof sampleGroundInfo === 'number' ? sampleGroundInfo : sampleGroundInfo.height || 0;
                    
                    // Store center point info for later use
                    if (offset.x === 0 && offset.z === 0) {
                        groundInfo = sampleGroundInfo;
                        terrainHeight = sampleTerrainHeight;
                        
                        if (typeof groundInfo === 'object' && groundInfo.normal) {
                            groundInfo.normalType = 'ground';
                        }
                    }
                }
            } catch (e) {
                // Silent fail for sample points
            }
            
            // Get track height with ramps
            try {
                if (this.track.getHeightWithRamps) {
                    const sampleTrackInfo = this.track.getHeightWithRamps(sampleX, sampleZ);
                    sampleTrackHeight = sampleTrackInfo.height;
                    
                    // Check if on a ramp
                    if (sampleTrackInfo.onRamp) {
                        sampleRampHeight = sampleTrackHeight;
                    }
                    
                    // Store center point info for later use
                    if (offset.x === 0 && offset.z === 0) {
                        trackInfo = sampleTrackInfo;
                        trackHeight = sampleTrackHeight;
                        
                        if (trackInfo.onRamp) {
                            rampHeight = trackHeight;
                            if (trackInfo.rampNormal) {
                                trackInfo.normalType = 'ramp';
                            }
                        } else if (trackInfo.normal) {
                            trackInfo.normalType = 'track';
                        }
                    }
                } else if (this.track.getHeightAt) {
                    const sampleTrackInfo = this.track.getHeightAt(sampleX, sampleZ);
                    sampleTrackHeight = typeof sampleTrackInfo === 'number' ? sampleTrackInfo : sampleTrackInfo.height || 0;
                    
                    // Store center point info for later use
                    if (offset.x === 0 && offset.z === 0) {
                        trackInfo = sampleTrackInfo;
                        trackHeight = sampleTrackHeight;
                        
                        if (typeof trackInfo === 'object' && trackInfo.normal) {
                            trackInfo.normalType = 'track';
                        }
                    }
                }
            } catch (e) {
                // Silent fail for sample points
            }
            
            // Update max heights
            maxTerrainHeight = Math.max(maxTerrainHeight, sampleTerrainHeight);
            maxTrackHeight = Math.max(maxTrackHeight, sampleTrackHeight);
            maxRampHeight = Math.max(maxRampHeight, sampleRampHeight);
        }
        
        // Use the highest of all sampled heights
        const highestTerrainPoint = Math.max(maxTerrainHeight, maxTrackHeight, maxRampHeight);
        
        // Use the normal from the highest surface for better alignment
        if (rampHeight >= terrainHeight && rampHeight >= trackHeight && trackInfo && trackInfo.rampNormal) {
            // On a ramp - use ramp normal
            surfaceNormal = trackInfo.rampNormal;
        } else if (trackHeight >= terrainHeight && trackInfo && trackInfo.normal) {
            // On track - use track normal
            surfaceNormal = trackInfo.normal;
        } else if (groundInfo && groundInfo.normal) {
            // On ground - use ground normal
            surfaceNormal = groundInfo.normal;
        }
        
        // Apply tilt to chassis based on surface normal - influence depends on wheel contact
        if ((surfaceNormal.x !== 0 || surfaceNormal.z !== 0) && wheelContactRatio > 0.1) {
            // Calculate pitch and roll from normal (adjusted for stronger response)
            const pitchFromNormal = Math.atan2(surfaceNormal.z, surfaceNormal.y) * 0.7; 
            const rollFromNormal = Math.atan2(-surfaceNormal.x, surfaceNormal.y) * 0.7;
            
            // Blend influence based on wheel contact (higher influence for better hill response)
            const normalInfluence = Math.min(0.3, wheelContactRatio * 0.5);
            
            // Blend with existing chassis orientation
            this.chassisOrientation.pitch = this.chassisOrientation.pitch * (1 - normalInfluence) + pitchFromNormal * normalInfluence;
            this.chassisOrientation.roll = this.chassisOrientation.roll * (1 - normalInfluence) + rollFromNormal * normalInfluence;
        }
        
        // Calculate the desired kart height with greater suspension distance
        // Base height + half of kart height + wheel radius + suspension travel
        // Add a small additional offset to prevent clipping through terrain
        const terrainOffset = 0.05; // Small extra height above terrain
        const kartRideHeight = highestTerrainPoint + kartSize.height/2 + wheelConfig.radius + PHYSICS.suspensionRestHeight + terrainOffset;
        
        // Update ride height based on contact - faster response when on ground
        const heightAdjustmentFactor = 0.3 + (wheelContactRatio * 0.4); // Higher base factor for quicker response
        
        // Ensure the kart never sinks below terrain
        if (y < kartRideHeight) {
            // If below desired height, immediately move up with stronger influence
            this.kartGroup.position.y = y + (kartRideHeight - y) * 0.5;
        } 
        // Otherwise, adjust height with more nuanced control
        else if (Math.abs(y - kartRideHeight) > 0.01) {
            // Move toward the desired height, influenced by wheel contact
            const newHeight = y + (kartRideHeight - y) * heightAdjustmentFactor;
            
            // Blend with vertical physics when partially in air
            if (wheelContactRatio < 0.8 && this.verticalVelocity !== 0) {
                // Allow some influence from vertical velocity
                const verticalInfluence = (1 - wheelContactRatio) * 0.2;
                const verticalAdjustment = this.verticalVelocity * verticalInfluence;
                
                // Apply blended height adjustment (never go below the desired ride height)
                this.kartGroup.position.y = Math.max(kartRideHeight, newHeight + verticalAdjustment);
            } else {
                // Normal height adjustment when well-grounded (never go below the desired ride height)
                this.kartGroup.position.y = Math.max(kartRideHeight, newHeight);
            }
        }
    }
    
    /**
     * Check if the kart is on or off the track
     */
    checkTrackStatus() {
        const { x, z } = this.kartGroup.position;
        
        try {
            // Use track's own method to check if on track
            const groundInfo = this.track.getHeightAt(x, z);
            const wasOnTrack = this.isOnTrack;
            this.isOnTrack = groundInfo.onTrack;
            
            // Check for ramp status
            let rampInfo = { onRamp: false };
            
            try {
                if (this.track.isPointOnRamp) {
                    rampInfo = this.track.isPointOnRamp(x, z);
                }
            } catch (e) {
                console.warn("Error checking ramp status:", e);
            }
            
            // Update ramp status
            const wasOnRamp = this.isOnRamp;
            this.isOnRamp = rampInfo.onRamp;
            this.rampInfo = rampInfo.onRamp ? rampInfo : null;
            
            // Status change logging
            if (wasOnTrack !== this.isOnTrack) {
                if (this.isOnTrack) {
                    console.log("Kart is back on track");
                } else {
                    console.log("Kart is off track");
                }
            }
            
            if (wasOnRamp !== this.isOnRamp) {
                if (this.isOnRamp) {
                    console.log("Kart is on ramp!");
                } else {
                    console.log("Kart is off ramp");
                }
            }
            
            // Update status for external systems
            this.kartStatus.onTrack = this.isOnTrack;
            this.kartStatus.speed = this.velocity / PHYSICS.kartMaxSpeed;
            
            return this.isOnTrack;
        } catch (e) {
            console.error("Error checking track status:", e);
            return true; // Default to on track if there's an error
        }
    }
    
    /**
     * Update UI status display
     */
    updateStatusDisplay() {
        // Get wheel contact information
        const wheelContactRatio = this.getWheelContactRatio();
        const isEffectivelyInAir = wheelContactRatio < 0.1;
        
        // Update kart status
        this.kartStatus = {
            onTrack: this.isOnTrack,
            speed: Math.abs(this.velocity) / PHYSICS.kartMaxSpeed,
            wheelContact: wheelContactRatio,
            isInAir: isEffectivelyInAir,
            airTime: this.airTime,
            rampInfo: this.rampInfo,
            headlightsOn: this.headlightSystem.getHeadlightState(),
            slopeDebugEnabled: this.terrainPhysics.slopeDebugEnabled
        };
    }
    
    /**
     * Begin reset animation to put kart back on track
     */
    beginResetAnimation() {
        if (this.isResetting) return;
        
        console.log("Beginning reset animation");
        
        // Set reset state
        this.isResetting = true;
        this.resetStartTime = Date.now();
        
        // Store start position and rotation
        this.resetStartPosition = this.kartGroup.position.clone();
        this.resetStartRotation = this.kartGroup.rotation.y;
        
        // Get nearest track point
        const resetPoint = this.findNearestTrackPoint();
        
        // Set end position and rotation
        this.resetEndPosition = new THREE.Vector3(
            resetPoint.x,
            resetPoint.y + kartSize.height/2 + 0.05,
            resetPoint.z
        );
        this.resetEndRotation = resetPoint.rotation;
        
        // Force back to ground physics
        this.isInAir = false;
        this.verticalVelocity = 0;
        
        // Stop kart
        this.velocity = 0;
    }
    
    /**
     * Check if the kart is stuck and needs to be reset
     * @param {number} deltaTime - Time since last frame
     */
    checkForStuck(deltaTime) {
        // Get wheel contact information
        const wheelContactRatio = this.getWheelContactRatio();
        
        // Special check for being off the ground (little to no wheel contact)
        if (wheelContactRatio < 0.1) {
            // If we've been in the air for more than 3 seconds, start counting as "slow"
            if (this.airTime > 3.0) {
                this.timeSpentSlow += deltaTime;
                
                // Trigger reset after being in the air too long
                if (this.timeSpentSlow > TRACK_PHYSICS.recoveryTimeout) {
                    console.log("Kart has been in the air too long - resetting");
                    this.beginResetAnimation();
                    return;
                }
            } else {
                this.timeSpentSlow = 0;
            }
            return;
        }
        
        // Check if the kart is upside down or at a bad angle
        const isUpsideDown = this.kartBodyGroup.rotation.z > Math.PI/2 || 
                            this.kartBodyGroup.rotation.z < -Math.PI/2 ||
                            this.kartBodyGroup.rotation.x > Math.PI/2 || 
                            this.kartBodyGroup.rotation.x < -Math.PI/2;
        
        if (isUpsideDown) {
            console.log("Kart is upside down - triggering reset");
            this.beginResetAnimation();
            return;
        }
        
        // Check if we're moving very slowly or not at all
        if (Math.abs(this.velocity) < TRACK_PHYSICS.recoveryMinVelocity) {
            // Accumulate time spent below minimum velocity
            this.timeSpentSlow += deltaTime;
            
            // Check if we've been stuck for too long
            if (this.timeSpentSlow > TRACK_PHYSICS.recoveryTimeout) {
                // Trigger reset animation
                this.beginResetAnimation();
            }
        } else {
            // Reset timer if we're moving
            this.timeSpentSlow = 0;
        }
    }
    
    /**
     * Find the nearest valid track point for resetting
     * @returns {object} Track point with position and rotation
     */
    findNearestTrackPoint() {
        const trackPoints = this.track.getTrackPoints();
        const kartPos = this.kartGroup.position;
        
        // Default reset location if track has no points
        if (!trackPoints || !trackPoints.length) {
            return {
                x: 0, y: 1, z: 0,
                rotation: 0
            };
        }
        
        // Find closest track point
        let closestPoint = null;
        let closestDistance = Infinity;
        let closestIndex = -1;
        
        trackPoints.forEach((point, index) => {
            const dist = Math.sqrt(
                Math.pow(point.x - kartPos.x, 2) + 
                Math.pow(point.z - kartPos.z, 2)
            );
            
            if (dist < closestDistance) {
                closestDistance = dist;
                closestPoint = point;
                closestIndex = index;
            }
        });
        
        // Calculate proper y value
        let y = 0;
        try {
            const groundInfo = this.track.getHeightAt(closestPoint.x, closestPoint.z);
            y = groundInfo.height;
        } catch (e) {
            console.warn("Error getting height for reset point:", e);
            y = 0;
        }
        
        // Calculate rotation to face along track
        let rotation = 0;
        
        if (trackPoints.length > 1) {
            // Get next point on track (with wraparound)
            const nextIndex = (closestIndex + 1) % trackPoints.length;
            const nextPoint = trackPoints[nextIndex];
            
            // Calculate direction vector
            const dx = nextPoint.x - closestPoint.x;
            const dz = nextPoint.z - closestPoint.z;
            
            // Convert to angle (facing direction)
            rotation = Math.atan2(dx, dz);
        }
        
        return {
            x: closestPoint.x,
            y: y,
            z: closestPoint.z,
            rotation: rotation
        };
    }
    
    /**
     * Get kart position
     * @returns {THREE.Vector3} Kart position
     */
    getPosition() {
        return this.kartGroup.position;
    }
    
    /**
     * Get kart rotation
     * @returns {object} Kart rotation
     */
    getRotation() {
        return {
            x: this.kartGroup.rotation.x,
            y: this.kartGroup.rotation.y,
            z: this.kartGroup.rotation.z
        };
    }
    
    /**
     * Get headlight state
     * @returns {boolean} Headlight state
     */
    get headlightsOn() {
        return this.headlightSystem.getHeadlightState();
    }
    
    /**
     * Get current terrain slope
     * @returns {number} Current terrain slope
     */
    get currentSlope() {
        // Make sure terrain physics is initialized first
        if (this.terrainPhysics) {
            return this.terrainPhysics.getCurrentSlope();
        }
        return 0;
    }
    
    /**
     * Calculate the wheel contact ratio (0-1) based on suspension compression
     * with smoothing to prevent rapid fluctuations in traction
     * 0 = completely in air, 1 = all wheels fully compressed
     * @returns {number} Smoothed wheel contact ratio (0-1)
     */
    getWheelContactRatio() {
        // Get suspension data from all wheels
        const suspensionData = this.suspensionSystem.getSuspensionData();
        
        // If no suspension data, return 0
        if (!suspensionData || suspensionData.length === 0) {
            return 0;
        }
        
        // Count wheels with good contact (threshold detection)
        let wheelContactCount = 0;
        let totalCompression = 0;
        let wheelCount = 0;
        
        // Check the compression of each wheel
        suspensionData.forEach(suspension => {
            // Apply a minimum threshold for counting a wheel as "in contact"
            if (suspension.compressionRatio > 0.2) {
                wheelContactCount++;
            }
            
            totalCompression += suspension.compressionRatio;
            wheelCount++;
        });
        
        // Calculate raw compression ratio
        const rawContactRatio = wheelCount > 0 ? totalCompression / wheelCount : 0;
        
        // Ensure stable traction when close to the ground
        // Once we have enough wheels with decent contact, provide stable traction
        if (wheelContactCount >= 2 && rawContactRatio > 0.25) {
            // Provide more stable traction when at least 2 wheels have good contact
            return Math.max(0.85, rawContactRatio);
        }
        
        // Initialize smoothed contact ratio if not already set
        if (this.smoothedWheelContact === undefined) {
            this.smoothedWheelContact = rawContactRatio;
            this.lastWheelContactTime = Date.now();
            return rawContactRatio;
        }
        
        // Calculate time since last update for time-based smoothing
        const now = Date.now();
        const dt = Math.min(0.1, (now - this.lastWheelContactTime) / 1000); // Cap at 100ms
        this.lastWheelContactTime = now;
        
        // Apply different smoothing based on whether traction is increasing or decreasing
        const smoothingFactorUp = 2.5 * dt;    // Faster response when gaining traction
        const smoothingFactorDown = 1.0 * dt;  // Slower response when losing traction
        
        // Choose smoothing factor based on direction of change
        const smoothingFactor = (rawContactRatio > this.smoothedWheelContact) 
            ? smoothingFactorUp 
            : smoothingFactorDown;
        
        // Apply asymmetric smoothing
        this.smoothedWheelContact += (rawContactRatio - this.smoothedWheelContact) * smoothingFactor;
        
        // Apply a floor of 0.1 when there's at least minimal contact (prevents harsh changes)
        return (rawContactRatio > 0.05) ? Math.max(0.1, this.smoothedWheelContact) : this.smoothedWheelContact;
    }
    
    /**
     * Handle unified physics model that works for both ground and air states
     * Uses wheel contact ratio to blend between ground and air physics
     * @param {number} deltaTime - Time since last frame
     * @param {object} input - Processed input values
     */
    handleUnifiedPhysics(deltaTime, input) {
        // Get current wheel contact information
        const wheelContactRatio = this.getWheelContactRatio();
        
        // Store acceleration state for audio
        this.isAccelerating = input.acceleration > 0;
        
        // Calculate terrain slope
        const slope = this.terrainPhysics.calculateTerrainSlope(this.kartGroup, this.velocity);
        
        // Apply slope physics (scaled by wheel contact)
        const slopeSpeedChange = this.terrainPhysics.applySlopePhysics(
            slope, 
            deltaTime, 
            this.chassisOrientation, 
            (level) => this.audioSystem.setEngineBoostSound(level * wheelContactRatio),
            (level) => this.audioSystem.setEngineStrainSound(level * wheelContactRatio),
            () => this.audioSystem.resetEngineAudioEffects()
        ) * wheelContactRatio;
        
        // Apply slope effect to velocity
        this.velocity += slopeSpeedChange;
        
        // Track status affects friction
        const frictionFactor = this.isOnTrack ? PHYSICS.onTrackFriction : PHYSICS.offTrackFriction;
        
        // Apply friction if no acceleration or braking with improved stability
        if (!this.isAccelerating && input.braking === 0) {
            // Enhanced realistic deceleration with stronger friction at lower speeds
            const speedRatio = Math.abs(this.velocity) / PHYSICS.kartMaxSpeed;
            
            // Stronger friction at lower speeds
            const lowSpeedFactor = Math.max(0.5, 1 - speedRatio);
            
            // Use the same traction model as acceleration and braking for consistent feel
            let tractionFactor;
            
            if (wheelContactRatio > 0.7) {
                // Full friction when wheels have good contact
                tractionFactor = 1.0;
            } else if (wheelContactRatio > 0.2) {
                // Stable friction in the mid-range with minimal fluctuation
                tractionFactor = 0.8 + (wheelContactRatio - 0.2) * 0.5;
            } else {
                // Low friction only when truly in the air
                tractionFactor = Math.max(0.2, wheelContactRatio * 1.5);
            }
            
            // Calculate friction with smooth traction transition
            const groundFriction = Math.pow(frictionFactor, lowSpeedFactor);
            const airFriction = 0.997; // Minimal air friction
            
            // Blend between ground friction and air friction using our stable traction factor
            const blendedFriction = groundFriction * tractionFactor + airFriction * (1 - tractionFactor);
            
            // Apply friction
            this.velocity *= blendedFriction;
            
            // Stop if very slow
            if (Math.abs(this.velocity) < 0.001) {
                this.velocity = 0;
            }
        }
        
        // Acceleration from input - works in both air and ground with different effectiveness
        if (input.acceleration > 0) {
            // Get the max speed based on on/off track status
            const maxSpeed = this.isOnTrack ? 
                PHYSICS.kartMaxSpeed : 
                PHYSICS.kartMaxSpeed * PHYSICS.offTrackSpeedMultiplier;
            
            // Accelerate with diminishing effect as we approach max speed
            const speedRatio = Math.abs(this.velocity) / maxSpeed;
            const accelFactor = 1 - Math.pow(speedRatio, 1.5); // Reduced power from 2 to 1.5 for better high-speed acceleration
            
            // Calculate acceleration force with a smoother transition between ground and air
            const baseAccelForce = (PHYSICS.kartPower / PHYSICS.kartMass) * accelFactor;
            
            // Apply a traction curve that gives stable acceleration when reasonably close to the ground
            // This creates a much more stable driving feel
            let tractionFactor;
            
            if (wheelContactRatio > 0.7) {
                // Full traction when wheels have good contact
                tractionFactor = 1.0;
            } else if (wheelContactRatio > 0.2) {
                // Stable traction in the mid-range with minimal fluctuation
                tractionFactor = 0.8 + (wheelContactRatio - 0.2) * 0.5;
            } else {
                // Low traction only when truly in the air (30% power)
                tractionFactor = wheelContactRatio * 1.5;
            }
            
            // Calculate the final acceleration force with smooth traction
            const finalAccelForce = baseAccelForce * tractionFactor;
            
            // Apply a more consistent weight transfer based on traction factor rather than raw contact
            const weightTransferBoost = Math.max(0, 1 - speedRatio) * 0.6 * tractionFactor;
            
            // Apply acceleration with the weight transfer effect
            this.velocity += finalAccelForce * deltaTime * (1 + weightTransferBoost);
            
            // Apply weight transfer to chassis - pitch back during acceleration
            if (this.chassisOrientation) {
                // Weight transfer is more pronounced with wheel contact, use the same traction factor for consistency
                const accelerationPitch = -0.04 * finalAccelForce * deltaTime * (1 - speedRatio * 0.6);
                this.chassisOrientation.pitchVelocity += accelerationPitch;
                
                // In air, apply to air rotation instead, but only when truly in the air
                const airFactor = Math.max(0, 1 - tractionFactor);
                const airRotationEffect = -accelFactor * 0.3 * airFactor * deltaTime;
                this.airRotation.velocityX += airRotationEffect;
            }
            
            // Limit to max speed
            if (this.velocity > maxSpeed) {
                this.velocity = maxSpeed;
            }
        }
        
        // Braking from input with improved stability
        if (input.braking > 0) {
            // Braking is stronger than acceleration
            const brakeForce = (PHYSICS.brakingPower / PHYSICS.kartMass);
            
            // Use the same traction model as acceleration for consistent feel
            let tractionFactor;
            
            if (wheelContactRatio > 0.7) {
                // Full braking power when wheels have good contact
                tractionFactor = 1.0;
            } else if (wheelContactRatio > 0.2) {
                // Stable braking in the mid-range with minimal fluctuation
                tractionFactor = 0.8 + (wheelContactRatio - 0.2) * 0.5;
            } else {
                // Low braking power only when truly in the air
                tractionFactor = wheelContactRatio * 1.5;
            }
            
            // Calculate the final braking force with smooth traction
            const finalBrakeForce = brakeForce * tractionFactor;
            
            // Apply braking (reduce velocity)
            if (this.velocity > 0) {
                this.velocity -= finalBrakeForce * deltaTime;
                
                // Apply forward weight transfer (pitch forward) during braking
                if (this.chassisOrientation && this.velocity > 0.01) {
                    const brakingPitch = 0.04 * finalBrakeForce * deltaTime * 0.5;
                    this.chassisOrientation.pitchVelocity += brakingPitch;
                }
                
                if (this.velocity < 0) this.velocity = 0; // Prevent overshoot
            } 
            // Allow braking in reverse too
            else if (this.velocity < 0) {
                this.velocity += finalBrakeForce * deltaTime;
                if (this.velocity > 0) this.velocity = 0; // Prevent overshoot
            }
            
            // In air, braking causes slight downward rotation
            const airFactor = Math.max(0, 1 - tractionFactor);
            if (airFactor > 0.3) {
                const airBrakingEffect = brakeForce * airFactor * deltaTime * 0.3;
                this.airRotation.velocityX += airBrakingEffect;
            }
        }
        
        // Steering - effectiveness scales with wheel contact and speed
        if (input.steering !== 0 && Math.abs(this.velocity) > PHYSICS.minSpeedForSteering) {
            // Calculate steering force based on speed
            const speedRatio = Math.abs(this.velocity) / PHYSICS.kartMaxSpeed;
            
            // Calculate steering effectiveness with improved response curve
            const steeringFactor = 0.5 + 0.5 * Math.pow(speedRatio, PHYSICS.steeringResponseCurve);
            
            // Reduced understeer for better high-speed handling
            const understeerFactor = 1 - (PHYSICS.understeerFactor * Math.pow(speedRatio, 1.5));
            
            // Steering effectiveness reduced in air
            const groundTurnAmount = PHYSICS.turnSpeed * steeringFactor * understeerFactor * 1.2;
            const airTurnAmount = groundTurnAmount * 0.25; // 25% steering effectiveness in air
            
            // Blend between ground and air steering based on wheel contact
            const blendedTurnAmount = groundTurnAmount * wheelContactRatio + airTurnAmount * (1 - wheelContactRatio);
            
            // Prevent steering in place - needs some speed
            const minSpeedForTurning = 0.05;
            const speedRatioForTurning = Math.min(1.0, Math.abs(this.velocity) / minSpeedForTurning);
            
            // Apply steering effect proportional to speed
            this.kartGroup.rotation.y -= blendedTurnAmount * input.steering * speedRatioForTurning;
            
            // Apply roll based on steering for both ground and air
            // Stronger effect on ground
            const groundRoll = -input.steering * speedRatio * 0.15 * wheelContactRatio;
            
            // Air roll is more pronounced
            const airRollFactor = input.steering * (1 - wheelContactRatio) * 2.5 * deltaTime;
            this.airRotation.velocityZ -= airRollFactor;
            
            // Apply inertia effects for ground mode (like drifting/sliding)
            // Only apply lateral sliding when there's significant wheel contact
            if (wheelContactRatio > 0.2 && Math.abs(input.steering) > 0.1 && Math.abs(this.velocity) > PHYSICS.minSpeedForSteering) {
                const inertiaFactor = PHYSICS.inertiaFactor * wheelContactRatio;
                const lateralSpeedRatio = Math.max(0.1, Math.min(1, Math.abs(this.velocity) / (PHYSICS.kartMaxSpeed * 0.3)));
                const slideAngle = input.steering * inertiaFactor * lateralSpeedRatio;
                
                // Calculate slide direction
                const kartRotation = this.kartGroup.rotation.y;
                const originalDir = new THREE.Vector2(Math.sin(kartRotation), Math.cos(kartRotation));
                const slideDir = new THREE.Vector2(originalDir.y, -originalDir.x).multiplyScalar(slideAngle);
                
                // Apply slide to position
                this.kartGroup.position.x += slideDir.x * Math.abs(this.velocity) * deltaTime;
                this.kartGroup.position.z += slideDir.y * Math.abs(this.velocity) * deltaTime;
                
                // Blend roll effect with air roll
                this.chassisOrientation.roll = this.chassisOrientation.roll * 0.9 + groundRoll * 0.1;
            } else {
                // Gradually return to neutral roll when not steering
                this.chassisOrientation.roll *= 0.95;
            }
        } else {
            // Gradually return to neutral roll when not steering
            this.chassisOrientation.roll *= 0.95;
        }
        
        // Move the kart based on velocity
        const moveDistance = this.velocity * deltaTime;
        const moveDir = new THREE.Vector3(
            Math.sin(this.kartGroup.rotation.y),
            0,
            Math.cos(this.kartGroup.rotation.y)
        );
        
        // Move the kart
        const moveFactor = 50.0;
        this.kartGroup.position.x += moveDir.x * moveDistance * moveFactor;
        this.kartGroup.position.z += moveDir.z * moveDistance * moveFactor;
        
        // Apply steering to wheels (with proper control direction)
        if (this.wheels) {
            const steerAngle = -input.steering * 0.3;
            this.wheels.frontLeft.rotation.y = steerAngle;
            this.wheels.frontRight.rotation.y = steerAngle;
            
            // Rotate wheels based on speed
            const wheelRotationSpeed = this.velocity * 3 / wheelConfig.radius;
            
            Object.values(this.wheels).forEach(wheel => {
                wheel.rotation.x += wheelRotationSpeed * deltaTime;
            });
            
            // Make wheels spin faster with less contact and acceleration (visual effect)
            if (input.acceleration > 0 && wheelContactRatio < 0.5) {
                const extraSpinSpeed = 0.5 * (1 - wheelContactRatio);
                this.wheels.rearLeft.rotation.x += extraSpinSpeed * deltaTime;
                this.wheels.rearRight.rotation.x += extraSpinSpeed * deltaTime;
            }
        }
        
        // Update suspension
        this.suspensionSystem.updateSuspension(deltaTime, this.chassisOrientation, false); // No longer use isInAir flag
        
        // Update air rotation values
        this.airRotation.x += this.airRotation.velocityX * deltaTime;
        this.airRotation.z += this.airRotation.velocityZ * deltaTime;
        
        // Apply dampening to air rotation velocities based on contact
        // More damping with more contact
        const airDampingFactor = 0.97 + 0.03 * wheelContactRatio; // 0.97 in air, up to 1.0 on ground
        this.airRotation.velocityX *= airDampingFactor;
        this.airRotation.velocityZ *= airDampingFactor;
        
        // Gradually reduce air rotation if wheel contact increases
        if (wheelContactRatio > 0.3) {
            const recoveryRate = Math.min(1, wheelContactRatio * 0.1);
            this.airRotation.x *= (1 - recoveryRate);
            this.airRotation.z *= (1 - recoveryRate);
        }
        
        // Blend between chassis orientation and air rotation based on wheel contact
        const bodyRotX = this.chassisOrientation.pitch * wheelContactRatio + this.airRotation.x * (1 - wheelContactRatio);
        const bodyRotZ = this.chassisOrientation.roll * wheelContactRatio + this.airRotation.z * (1 - wheelContactRatio);
        
        // Apply to kart body
        this.kartBodyGroup.rotation.x = bodyRotX;
        this.kartBodyGroup.rotation.z = bodyRotZ;
        
        // Update kart height based on suspension and terrain
        this.updateKartHeight();
        
        // Check for ramp jumping
        this.checkForRampJump(deltaTime);
    }
    
    /**
     * Apply vertical physics (gravity and vertical motion)
     * @param {number} deltaTime - Time since last frame
     */
    applyVerticalPhysics(deltaTime) {
        // Get wheel contact information
        const wheelContactRatio = this.getWheelContactRatio();
        
        // If we have significant wheel contact, reset airTime counter
        if (wheelContactRatio > 0.3) {
            this.airTime = 0;
        } else {
            // Increment air time if little wheel contact
            this.airTime += deltaTime;
        }
        
        // Apply gravity if we have little wheel contact
        // Gravity effect scales inversely with wheel contact
        const gravityEffect = (1 - Math.min(1, wheelContactRatio * 2)) * PHYSICS.gravity * deltaTime;
        this.verticalVelocity -= gravityEffect;
        
        // Apply vertical velocity to position (scale based on inverse of wheel contact)
        const verticalMoveFactor = 1 - Math.min(1, wheelContactRatio * 3);
        if (verticalMoveFactor > 0.05) {
            this.kartGroup.position.y += this.verticalVelocity * deltaTime * verticalMoveFactor;
        }
        
        // If we've hit the ground but have vertical velocity, dampen it
        if (wheelContactRatio > 0.2 && this.verticalVelocity < 0) {
            // Rapid damping of downward velocity when contact is made
            this.verticalVelocity *= 0.8;
            
            // Apply landing impact to chassis orientation
            const landingForce = -this.verticalVelocity * 0.02;
            this.chassisOrientation.pitch = -landingForce * 0.5 * wheelContactRatio;
            
            // Hard landings slow you down
            if (this.verticalVelocity < -3) {
                const impactFactor = Math.abs(this.verticalVelocity) / 10;
                this.velocity *= Math.max(0.5, 1 - impactFactor);
            }
            
            // If vertical velocity is very small, zero it out
            if (Math.abs(this.verticalVelocity) < 0.1) {
                this.verticalVelocity = 0;
            }
        }
        
        // Safety check for max air time
        if (this.airTime > 5.0) {
            this.forceLanding();
        }
    }
    
    /**
     * Check if the kart is on a ramp and should jump
     * @param {number} deltaTime - Time since last frame
     */
    checkForRampJump(deltaTime) {
        // Skip if we already have significant vertical velocity
        if (Math.abs(this.verticalVelocity) > 1.0) {
            return;
        }
        
        // Only check if we have some wheel contact and are on a ramp
        if (this.isOnRamp && this.rampInfo && this.getWheelContactRatio() > 0.2) {
            // Get the ramp position (0-1)
            const rampPosition = this.rampInfo.rampPosition;
            
            // Check if we're past the peak of the ramp and moving fast enough
            if (rampPosition > 0.6 && Math.abs(this.velocity) > 0.05) {
                // Calculate jump impulse based on speed and ramp height
                const jumpFactor = Math.abs(this.velocity) / PHYSICS.kartMaxSpeed;
                const rampHeight = this.rampInfo.rampHeight;
                
                // Calculate jump strength
                const jumpStrength = jumpFactor * rampHeight * 1.5;
                
                // Apply vertical impulse (convert to upward velocity)
                this.verticalVelocity = jumpStrength * 5;
                
                // Reset air time for safety
                this.airTime = 0;
                this.lastGroundY = this.kartGroup.position.y;
                
                // Apply forward boost
                const boostMultiplier = 1.1 + jumpFactor * 0.2;
                this.velocity *= boostMultiplier;
                
                // Apply some initial rotation based on ramp angle
                if (this.rampInfo.rampNormal) {
                    // Calculate a pitch velocity based on ramp normal
                    const normalY = this.rampInfo.rampNormal.y;
                    const normalX = this.rampInfo.rampNormal.x;
                    const normalZ = this.rampInfo.rampNormal.z;
                    
                    // Project the normal onto the kart's forward-up plane
                    const kartRotation = this.kartGroup.rotation.y;
                    const kartForward = new THREE.Vector3(Math.sin(kartRotation), 0, Math.cos(kartRotation));
                    const projectedNormal = new THREE.Vector3(normalX, normalY, normalZ)
                        .projectOnPlane(new THREE.Vector3(-kartForward.z, 0, kartForward.x));
                    
                    // Initial pitch velocity based on ramp angle and speed
                    this.airRotation.velocityX = -projectedNormal.y * jumpFactor * 2;
                }
                
                console.log("Jumped off ramp with velocity:", this.velocity, "vert velocity:", this.verticalVelocity);
            }
        }
    }
}

export default Kart;