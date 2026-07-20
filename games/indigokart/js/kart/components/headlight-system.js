import * as THREE from 'three';

/**
 * Manages kart headlights and related lighting effects
 */
class HeadlightSystem {
    constructor(scene, kartBodyGroup) {
        this.scene = scene;
        this.kartBodyGroup = kartBodyGroup;
        this.headlightsOn = false;
        this.manualHeadlightControl = false;
        
        // Spotlights
        this.leftSpotlight = null;
        this.rightSpotlight = null;
        
        // Light meshes (visual representation of headlights)
        this.leftLight = null;
        this.rightLight = null;
        
        // Light cones (visual representation of headlight beams)
        this.leftCone = null;
        this.rightCone = null;
        
        // Create the physical headlight meshes
        this.createHeadlights();
        
        // Create the spotlight objects
        this.createSpotlights();
        
        // Make sure all headlight components are initially visible, but turned off
        if (this.leftLight) this.leftLight.visible = true;
        if (this.rightLight) this.rightLight.visible = true;
        
        console.log("Headlight system initialized", this);
    }
    
    /**
     * Create the headlight meshes that are visible on the kart
     */
    createHeadlights() {
        // Headlight geometry (slightly flattened spheres)
        const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        
        // Create materials for headlights with better visual appearance
        const headlightOffMaterial = new THREE.MeshStandardMaterial({
            color: 0xDDDDDD,
            roughness: 0.3,
            metalness: 0.7,
            transparent: true,
            opacity: 0.9,
            emissive: 0x222222,
            emissiveIntensity: 0.2
        });
        
        // Material for when headlights are on with emissive glow
        const headlightOnMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.95,
            emissive: 0xFFFFAA,
            emissiveIntensity: 0.8
        });
        
        // Left headlight
        this.leftLight = new THREE.Mesh(headlightGeometry, headlightOffMaterial.clone());
        this.leftLight.position.set(0.4, 0.2, 1.0); // Positioned at front-left, moved slightly more forward
        this.leftLight.rotation.set(-Math.PI/2, 0, 0); // Point forward (rotated around x-axis)
        
        // Right headlight
        this.rightLight = new THREE.Mesh(headlightGeometry, headlightOffMaterial.clone());
        this.rightLight.position.set(-0.4, 0.2, 1.0); // Positioned at front-right, moved slightly more forward
        this.rightLight.rotation.set(-Math.PI/2, 0, 0); // Point forward (rotated around x-axis)
        
        // Store materials for later toggling
        this.headlightOffMaterial = headlightOffMaterial;
        this.headlightOnMaterial = headlightOnMaterial;
        
        // Add to kart body
        this.kartBodyGroup.add(this.leftLight);
        this.kartBodyGroup.add(this.rightLight);
    }
    
    /**
     * Create the THREE.js spotlight objects that cast light from the headlights
     */
    createSpotlights() {
        // Create spotlight for left headlight with enhanced properties
        // Increased intensity and tweaked parameters for better visibility
        this.leftSpotlight = new THREE.SpotLight(
            0xFFFFAA,   // Warm yellow color
            5.0,        // Higher intensity (increased from 3.0)
            100,        // Longer distance (increased from 60)
            Math.PI/6,  // Angle of spotlight cone
            0.5,        // Penumbra (softer edge)
            1.0         // Decay
        );
        // Position at front left of kart - align with headlight mesh
        this.leftSpotlight.position.set(0.4, 0.2, 1.0);
        
        // Create a target object for the left headlight
        const leftTarget = new THREE.Object3D();
        // Position target far in front and down slightly to illuminate the road
        leftTarget.position.set(0.4, -0.5, 20); // Far forward and down to illuminate the road
        this.leftSpotlight.target = leftTarget;
        
        // Add to kart body so it moves with the kart
        this.kartBodyGroup.add(this.leftSpotlight.target);
        
        // TEXTURE FIX: Disable shadows to save texture units
        this.leftSpotlight.castShadow = false;
        /*
        // Add shadows
        this.leftSpotlight.castShadow = true;
        this.leftSpotlight.shadow.mapSize.width = 512;
        this.leftSpotlight.shadow.mapSize.height = 512;
        this.leftSpotlight.shadow.camera.near = 0.1;
        this.leftSpotlight.shadow.camera.far = 50;
        */
        
        // Create spotlight for right headlight with enhanced properties
        // Use same settings as left spotlight for consistency
        this.rightSpotlight = new THREE.SpotLight(
            0xFFFFAA,   // Warm yellow color
            5.0,        // Higher intensity
            100,        // Longer distance
            Math.PI/6,  // Angle of spotlight cone
            0.5,        // Penumbra (softer edge)
            1.0         // Decay
        );
        // Position at front right of kart - align with headlight mesh
        this.rightSpotlight.position.set(-0.4, 0.2, 1.0);
        
        // Create a target object for the right headlight
        const rightTarget = new THREE.Object3D();
        // Position target far in front and down slightly to illuminate the road
        rightTarget.position.set(-0.4, -0.5, 20); // Far forward and down to illuminate the road
        this.rightSpotlight.target = rightTarget;
        
        // Add to kart body so it moves with the kart
        this.kartBodyGroup.add(this.rightSpotlight.target);
        
        // TEXTURE FIX: Disable shadows to save texture units
        this.rightSpotlight.castShadow = false;
        /*
        // Add shadows
        this.rightSpotlight.castShadow = true;
        this.rightSpotlight.shadow.mapSize.width = 512;
        this.rightSpotlight.shadow.mapSize.height = 512;
        this.rightSpotlight.shadow.camera.near = 0.1;
        this.rightSpotlight.shadow.camera.far = 50;
        */
        
        // Turn them off initially
        this.leftSpotlight.visible = false;
        this.rightSpotlight.visible = false;
        
        // Add spotlights to the kart body so they move with the kart
        this.kartBodyGroup.add(this.leftSpotlight);
        this.kartBodyGroup.add(this.rightSpotlight);
        
        // Also add spotlights to the main scene for better light propagation
        // This allows the lights to affect the entire scene
        this.scene.add(this.leftSpotlight);
        this.scene.add(this.rightSpotlight);
        
        // Create visible light cones for beam visualization
        this.createLightCones();
    }
    
    /**
     * Create visible light cone meshes to represent headlight beams
     */
    createLightCones() {
        // Create geometry for light cones - use cylinder for better directional control
        const coneLength = 15; // Longer cone for better visibility
        const coneBaseRadius = 3.5;
        const coneTipRadius = 0.5; // Smaller tip for better directional appearance
        
        // Use cylinder geometry for better control over orientation
        // NOTE: Cylinder geometry in Three.js has Y-axis as long axis by default
        const coneGeometry = new THREE.CylinderGeometry(
            coneTipRadius,     // radiusTop (smaller at tip)
            coneBaseRadius,    // radiusBottom (wider at base)
            coneLength,        // height
            16,                // radialSegments
            1,                 // heightSegments
            true               // openEnded
        );
        
        // Create enhanced material for light cones
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFCC, // Warm yellow light color
            transparent: true,
            opacity: 0.35,   // Increased opacity for better visibility
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, // Additive blending for glow effect
            depthWrite: false, // Don't write to depth buffer
        });
        
        // Create left cone
        this.leftCone = new THREE.Mesh(coneGeometry, coneMaterial);
        this.leftCone.position.copy(this.leftSpotlight.position);
        
        // Rotate cone to point forward along Z-axis
        // In Three.js, cylinder default is along Y-axis, rotate to point along Z
        this.leftCone.rotation.x = -Math.PI/2; // Rotate to point along Z-axis
        
        // Position the narrow end at the light and extend forward
        // Moving cone forward half its length so origin is at the light position
        this.leftCone.position.z += coneLength/2;
        this.leftCone.visible = false;
        
        // Create right cone
        this.rightCone = new THREE.Mesh(coneGeometry, coneMaterial);
        this.rightCone.position.copy(this.rightSpotlight.position);
        
        // Same rotation as left cone
        this.rightCone.rotation.x = -Math.PI/2; // Rotate to point along Z-axis
        
        // Position the narrow end at the light and extend forward
        this.rightCone.position.z += coneLength/2;
        this.rightCone.visible = false;
        
        // Add to kart body
        this.kartBodyGroup.add(this.leftCone);
        this.kartBodyGroup.add(this.rightCone);
    }
    
    /**
     * Toggle headlights on/off
     * @returns {boolean} New headlight state (true = on, false = off)
     */
    toggleHeadlights() {
        // Toggle the state
        this.headlightsOn = !this.headlightsOn;
        
        // Toggle the spotlights
        this.leftSpotlight.visible = this.headlightsOn;
        this.rightSpotlight.visible = this.headlightsOn;
        
        // Toggle the light cones
        this.leftCone.visible = this.headlightsOn;
        this.rightCone.visible = this.headlightsOn;
        
        // Increase spotlight intensity slightly when toggled for better visibility
        if (this.headlightsOn) {
            // Brighten spotlights
            this.leftSpotlight.intensity = 6.0;  
            this.rightSpotlight.intensity = 6.0;
            
            // Use glowing material for headlights
            this.leftLight.material = this.headlightOnMaterial.clone();
            this.rightLight.material = this.headlightOnMaterial.clone();
            
            // Ensure cone positions are correct (in case they were moved)
            const coneLength = 15;
            this.leftCone.position.copy(this.leftSpotlight.position);
            this.leftCone.position.z += coneLength/2;
            this.rightCone.position.copy(this.rightSpotlight.position);
            this.rightCone.position.z += coneLength/2;
        } else {
            // Reduce spotlight intensity when off
            this.leftSpotlight.intensity = 0;
            this.rightSpotlight.intensity = 0;
            
            // Use non-glowing material for headlights
            this.leftLight.material = this.headlightOffMaterial.clone();
            this.rightLight.material = this.headlightOffMaterial.clone();
        }
        
        return this.headlightsOn;
    }
    
    /**
     * Update headlights based on time of day
     * @param {number} timeOfDay - Current time of day (0-1)
     */
    updateHeadlights(timeOfDay) {
        // Only update if not under manual control
        if (this.manualHeadlightControl) return;
        
        // Determine if it's dark enough for headlights
        const isNightTime = timeOfDay > 0.45 && timeOfDay < 0.95;
        
        // Turn headlights on at night, off during day
        if (isNightTime && !this.headlightsOn) {
            this.toggleHeadlights();
        } else if (!isNightTime && this.headlightsOn) {
            this.toggleHeadlights();
        }
    }
    
    /**
     * Get the current headlight state
     * @returns {boolean} Current headlight state (true = on, false = off)
     */
    getHeadlightState() {
        return this.headlightsOn;
    }
    
    /**
     * Set manual control of headlights
     * @param {boolean} manualControl - Whether headlights are manually controlled
     */
    setManualControl(manualControl) {
        this.manualHeadlightControl = manualControl;
    }
}

export default HeadlightSystem;