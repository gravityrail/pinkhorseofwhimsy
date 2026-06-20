import * as THREE from 'three';

class StreetLamp {
    constructor(scene, position = { x: 0, y: 0, z: 0 }, options = {}) {
        this.scene = scene;
        this.position = position;
        
        // Default options
        this.options = {
            height: 5.0,             // Height of the lamp post
            lightColor: 0xFFCB76,    // Amber light color
            intensity: 1.5,          // Light intensity
            distance: 25,            // Light distance
            angle: Math.PI/4,        // Spotlight angle (45 degrees)
            penumbra: 0.5,           // Soft edge percentage
            decay: 1.5,              // Light decay with distance
            castShadow: true,        // Whether light casts shadows
            ...options               // Override with provided options
        };
        
        this.createLamp();
    }
    
    createLamp() {
        const {
            height,
            lightColor,
            intensity,
            distance,
            angle,
            penumbra,
            decay,
            castShadow
        } = this.options;
        
        // Create a group for the lamp
        this.lampGroup = new THREE.Group();
        
        // Create the lamp post (vertical pole)
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.15, height, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.5
        });
        
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = height / 2;
        pole.castShadow = true;
        pole.receiveShadow = true;
        
        this.lampGroup.add(pole);
        
        // Create base for the lamp post
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.6
        });
        
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.1;
        base.castShadow = true;
        base.receiveShadow = true;
        
        this.lampGroup.add(base);
        
        // Create the horizontal arm
        const armLength = 1.2;
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, armLength, 8);
        const arm = new THREE.Mesh(armGeometry, poleMaterial);
        
        // Position and rotate the arm
        arm.position.y = height - 0.5;
        arm.position.x = armLength / 2;
        arm.rotation.z = Math.PI / 2;
        arm.castShadow = true;
        
        this.lampGroup.add(arm);
        
        // Create the lamp housing
        const housingGeometry = new THREE.ConeGeometry(0.3, 0.5, 8, 1, true);
        const housingMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.7
        });
        
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.set(armLength, height - 0.8, 0);
        housing.rotation.z = Math.PI;
        housing.castShadow = true;
        
        this.lampGroup.add(housing);
        
        // Create a glass diffuser inside the housing
        const diffuserGeometry = new THREE.SphereGeometry(0.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const diffuserMaterial = new THREE.MeshStandardMaterial({
            color: lightColor,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8,
            emissive: lightColor,
            emissiveIntensity: 0.5
        });
        
        const diffuser = new THREE.Mesh(diffuserGeometry, diffuserMaterial);
        diffuser.position.set(armLength, height - 0.65, 0);
        diffuser.rotation.x = Math.PI;
        
        this.lampGroup.add(diffuser);
        
        // Create the spotlight
        this.light = new THREE.SpotLight(
            lightColor,
            intensity,
            distance,
            angle,
            penumbra,
            decay
        );
        
        this.light.position.set(armLength, height - 0.7, 0);
        this.light.target.position.set(armLength, 0, 0);
        
        // Configure shadows - TEXTURE FIX: Disable shadows
        // Shadows consume texture units, so we need to disable them
        this.light.castShadow = false;
        /*
        if (castShadow) {
            this.light.castShadow = true;
            this.light.shadow.mapSize.width = 512;
            this.light.shadow.mapSize.height = 512;
            this.light.shadow.camera.near = 0.5;
            this.light.shadow.camera.far = 30;
            this.light.shadow.bias = -0.0005;
        }
        */
        
        this.lampGroup.add(this.light);
        this.lampGroup.add(this.light.target);
        
        // Create a subtle ambient light around the lamp
        this.ambientLight = new THREE.PointLight(lightColor, 0.3, 4);
        this.ambientLight.position.set(armLength, height - 0.7, 0);
        this.lampGroup.add(this.ambientLight);
        
        // Create a glow sprite for the lamp
        const glowTexture = this.createGlowTexture();
        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: lightColor,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.8
        });
        
        // Create the glow sprite
        this.glowSprite = new THREE.Sprite(glowMaterial);
        this.glowSprite.scale.set(2, 2, 1);
        this.glowSprite.position.set(armLength, height - 0.65, 0);
        this.lampGroup.add(this.glowSprite);
        
        // Set ambient light intensity
        this.ambientLight.intensity = 0.3;
        
        // Position the entire lamp group
        this.lampGroup.position.set(this.position.x, this.position.y, this.position.z);
        
        // Add to scene
        this.scene.add(this.lampGroup);
        
        // Store initial values for time of day changes
        this.initialIntensity = intensity;
        this.timeOfDayControl();
    }
    
    // Create a glow texture for the lamp light
    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        // Create a radial gradient for the glow
        const gradient = context.createRadialGradient(
            64, 64, 8,    // Inner circle
            64, 64, 64    // Outer circle
        );
        
        // Add color stops for a soft glow
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 220, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 220, 150, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        
        // Fill gradient
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    
    // Position the lamp at ground level on the actual terrain
    positionOnTerrain(getHeightFunction) {
        if (!getHeightFunction) return;
        
        // Get the height at the lamp's xz position
        const heightData = getHeightFunction(this.position.x, this.position.z);
        
        if (heightData && typeof heightData.height === 'number') {
            // Update the lamp's y position to sit on the terrain
            this.lampGroup.position.y = heightData.height;
            
            // If there's normal data, orient the lamp to be perpendicular to the terrain
            if (heightData.normal) {
                // Align lamp with terrain normal
                this.alignWithNormal(heightData.normal);
            }
        }
    }
    
    // Align the lamp with the terrain normal
    alignWithNormal(normal) {
        if (!normal) return;
        
        // Default up vector
        const up = new THREE.Vector3(0, 1, 0);
        
        // Convert normal to Vector3 if it's not already
        const normalVec = new THREE.Vector3(normal.x || 0, normal.y || 1, normal.z || 0);
        
        // Skip if normal is already pointing up
        if (Math.abs(normalVec.y) > 0.99) return;
        
        // Get rotation axis and angle
        const axis = new THREE.Vector3().crossVectors(up, normalVec).normalize();
        const angle = Math.acos(up.dot(normalVec));
        
        // Apply rotation to align with normal
        if (axis.length() > 0.001) { // Avoid zero-length axis
            this.lampGroup.quaternion.setFromAxisAngle(axis, angle);
            
            // Apply a small offset so the lamp doesn't rotate too dramatically on slopes
            if (angle > 0.3) {
                // Reduce the rotation for steep slopes
                this.lampGroup.quaternion.slerp(
                    new THREE.Quaternion().setFromAxisAngle(axis, 0.3), 
                    0.7
                );
            }
        }
    }
    
    // Update lamp based on time of day
    timeOfDayControl(timeOfDay = null) {
        // If no time is provided, this is just initialization
        if (timeOfDay === null) return;
        
        // Determine if it's night time when lamps should be on
        // Dusk starts at 0.45, full night at 0.55
        // Dawn starts at 0.85, full day at 0.95
        let isNightTime = false;
        let intensity = 0;
        
        if (timeOfDay >= 0.42 && timeOfDay <= 0.95) {
            isNightTime = true;
            
            // Ramp up at dusk
            if (timeOfDay < 0.52) {
                intensity = (timeOfDay - 0.42) / 0.1; // 0 to 1 over 0.1 time units
            }
            // Full brightness at night
            else if (timeOfDay <= 0.85) {
                intensity = 1.0;
            }
            // Ramp down at dawn
            else {
                intensity = 1.0 - ((timeOfDay - 0.85) / 0.1); // 1 to 0 over 0.1 time units
            }
        }
        
        // Set light intensity based on time of day
        this.light.intensity = this.initialIntensity * intensity;
        this.ambientLight.intensity = 0.3 * intensity;
        
        // Update glow sprite opacity
        if (this.glowSprite) {
            this.glowSprite.material.opacity = Math.min(1.0, intensity * 1.5);
        }
    }
    
    // Get the lamp's position
    getPosition() {
        return this.lampGroup.position;
    }
    
    // Set the lamp's position
    setPosition(x, y, z) {
        this.position = { x, y, z };
        this.lampGroup.position.set(x, y, z);
    }
    
    // Enable or disable the lamp
    setEnabled(enabled) {
        this.light.visible = enabled;
        this.ambientLight.visible = enabled;
        this.glowSprite.visible = enabled;
    }
}

export default StreetLamp;