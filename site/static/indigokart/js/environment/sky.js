import * as THREE from 'three';
import { CONFIG } from '../core/game.js';

class Sky {
    // Static shared texture for both sun and moon glow
    static sharedGlowTexture = null;
    
    // No longer using static textures to save texture units
    // Using procedural effects in shaders instead
    
    constructor(scene) {
        this.scene = scene;
        this.timeOfDay = 0.3; // 0 = night, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 1.0 = night
        this.dayNightCycle = true; // Whether day-night cycle is enabled
        this.dayDuration = 300; // Full day-night cycle in seconds (5 minutes, faster for better gameplay experience)
        this.timeSpeed = 1.0; // Adjustable speed multiplier
        this.weatherEffects = false; // Will be used for weather effects (implemented in future)
        this.moonPhase = Math.random(); // Random moon phase
        
        // Initialize all shared textures first
        this.initializeSharedTextures();
        
        // Create sky components
        this.createSkySystem();
        this.createSun();
        this.createMoon();
    }
    
    // Initialize shared textures in advance - SIMPLIFIED VERSION
    initializeSharedTextures() {
        // We've removed all shared textures to reduce texture unit usage
        // Sky now uses procedural techniques in shaders instead of textures
        
        console.log("Sky textures initialization skipped - using procedural techniques instead");
    }
    
    createSkySystem() {
        // Create sky dome
        const skyGeometry = new THREE.SphereGeometry(CONFIG.worldSize * 2, 64, 32);
        
        // TEXTURE REDUCTION STRATEGY: 
        // 1. Remove cloud texture from shader
        // 2. Use procedural clouds via noise functions instead
        
        // Create a beautiful sky with gradient and procedural clouds
        const skyUniforms = {
            topColor: { value: new THREE.Color(0x0077FF) },   // Deep blue
            bottomColor: { value: new THREE.Color(0xAAAAAFF) }, // Light blue
            offset: { value: 33 },
            exponent: { value: 0.6 },
            time: { value: 0 }
        };

        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: skyUniforms,
            vertexShader: `
                varying vec3 vWorldPosition;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform float time;
                
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    float gradient = max(pow(max(h, 0.0), exponent), 0.0);
                    vec3 skyColor = mix(bottomColor, topColor, gradient);
                    
                    // Simple procedural clouds (no texture)
                    float cloudMask = 0.0;
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        this.skyMaterial = skyMaterial;
        
        // Create sky dome with shader
        const sky = new THREE.Mesh(skyGeometry, this.skyMaterial);
        this.sky = sky;
        this.scene.add(sky);
    }
    
    createSun() {
        // Create a beautiful glowing sun with lens flares
        const sunGeometry = new THREE.CircleGeometry(15, 32);
        
        // Use an emissive material for better glow effect
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF80,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.FrontSide,
            depthWrite: false
        });
        
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun);
        
        // Create glow texture for the sun
        const glowTexture = this.createGlowTexture();
        
        // Create a sprite with the glow texture
        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0xFFFF80,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        // Create glow sprite
        this.sunGlow = new THREE.Sprite(glowMaterial);
        this.sunGlow.scale.set(40, 40, 1);
        this.scene.add(this.sunGlow);
        
        // Create lens flare elements
        this.lensFlareElements = this.createLensFlareElements();
    }
    
    // Create a glow texture using canvas
    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Create radial gradient for sun glow
        const gradient = context.createRadialGradient(
            128, 128, 20,   // Inner circle
            128, 128, 128   // Outer circle
        );
        
        // Add color stops for beautiful gradient
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 220, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 180, 0, 0)');
        
        // Fill the gradient
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    // Create lens flare elements
    createLensFlareElements() {
        const lensFlareElements = [];
        
        // Create lens flare texture
        const lensFlareTexture = this.createFlareTexture();
        
        // Create different colored and sized flare sprites
        const colors = [
            0xFFFFFF,  // White
            0xFFEEDD,  // Warm white
            0xFFDD88,  // Amber
            0xFFAA44   // Orange
        ];
        
        const sizes = [20, 15, 10, 25];
        const positions = [0.3, 0.6, 0.8, 0.95]; // Position along the line from camera to sun
        
        // Create lens flare sprites
        for (let i = 0; i < colors.length; i++) {
            const flareMaterial = new THREE.SpriteMaterial({
                map: lensFlareTexture,
                color: colors[i],
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.6
            });
            
            const flare = new THREE.Sprite(flareMaterial);
            flare.scale.set(sizes[i], sizes[i], 1);
            flare.userData.position = positions[i];
            flare.visible = false;
            
            this.scene.add(flare);
            lensFlareElements.push(flare);
        }
        
        return lensFlareElements;
    }
    
    // Create a lens flare texture
    createFlareTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        // Draw circle with radial gradient for flare
        const gradient = context.createRadialGradient(
            64, 64, 5,    // Inner circle
            64, 64, 60    // Outer circle
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    // Removed createGlowTexture and createFlareTexture methods
    // These are no longer needed as we create textures locally in createSun and createMoon methods
    
    // Calculate sun position based on time of day
    updateSunPosition(camera) {
        // Sun position in sky dome coordinates (0-1 time of day)
        const angle = (this.timeOfDay * Math.PI * 2) - Math.PI/2;
        
        // Calculate sun position (higher during day, lower during sunset/sunrise)
        let radius = CONFIG.worldSize * 1.5;
        let height = Math.sin(angle) * radius * 0.5;
        
        // Keep sun above horizon at dawn/dusk
        const horizonFactor = Math.max(0.05, Math.abs(Math.sin(angle)));
        
        // Adjust sun distance based on time of day
        const x = Math.cos(angle) * radius;
        const y = Math.max(5, height + 50 * horizonFactor); 
        const z = Math.sin(angle) * radius * 0.5;
        
        // Position the sun
        this.sun.position.set(x, y, z);
        this.sun.lookAt(camera.position);
        
        // Position the glow sprite
        this.sunGlow.position.copy(this.sun.position);
        
        // Update lens flare positions based on sun position
        this.updateLensFlare(camera, x, y, z);
    }
    
    // Update sun glow and lens flares
    updateLensFlare(camera, sunX, sunY, sunZ) {
        const sunPosition = new THREE.Vector3(sunX, sunY, sunZ);
        const cameraPosition = camera.position.clone();
        
        // Check if sun is visible
        const isSunVisible = this.isSunVisible(sunPosition, camera);
        
        // Only show sun if it's visible and daytime
        const sunVisibility = isSunVisible && (this.timeOfDay < 0.55 || this.timeOfDay > 0.95) ? 1 : 0;
        
        // Calculate direction to sun
        const directionToSun = sunPosition.clone().sub(cameraPosition).normalize();
        
        // Check angle between sun and camera forward direction (facing angle)
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const sunAngle = directionToSun.dot(cameraForward);
        
        // Only show sun when looking somewhat toward it
        const facingFactor = Math.max(0, sunAngle);
        
        // Visibility factor combines sun visibility and facing direction
        const glowVisibility = sunVisibility * facingFactor;
        
        // Set sun glow visibility
        if (this.sunGlow) {
            this.sunGlow.material.opacity = glowVisibility;
        }
        
        // Set sun's material opacity 
        if (this.sun) {
            // Make the sun itself slightly brighter than the glow
            const sunOpacity = Math.min(1.0, glowVisibility * 1.2);
            // For standard materials we set the opacity directly
            if (this.sun.material.opacity !== undefined) {
                this.sun.material.opacity = sunOpacity;
            }
        }
        
        // Update lens flare positions and visibility
        if (this.lensFlareElements && this.lensFlareElements.length > 0) {
            // Only show lens flares if sun is visible and facing camera
            const flareVisibility = glowVisibility > 0.1;
            
            // Calculate vector from camera to sun
            const sunToCameraVector = cameraPosition.clone().sub(sunPosition);
            const sunToCameraDistance = sunToCameraVector.length();
            
            // For each lens flare element
            this.lensFlareElements.forEach(flare => {
                // Get position along sun-camera line
                const positionFactor = flare.userData.position;
                
                // Calculate position (inverse lerp from sun toward camera)
                const flarePos = new THREE.Vector3().lerpVectors(
                    sunPosition,
                    cameraPosition,
                    positionFactor
                );
                
                // Set position
                flare.position.copy(flarePos);
                
                // Set visibility
                flare.visible = flareVisibility;
                
                // Set opacity based on sun visibility and distance
                flare.material.opacity = glowVisibility * 0.7 * (1.0 - positionFactor * 0.3);
            });
        }
    }
    
    // Determine if sun is visible (not occluded)
    isSunVisible(sunPosition, camera) {
        // Most basic implementation - just check if sun is in front of camera
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const sunDirection = sunPosition.clone().sub(camera.position).normalize();
        
        // Sun is in view if the angle between camera direction and sun is less than ~60 degrees
        return sunDirection.dot(cameraDirection) > -0.5;
    }
    
    setTimeOfDay(time) {
        // Save time of day value
        this.timeOfDay = time;
        
        // Handle non-shader materials (in case we're using MeshBasicMaterial)
        if (this.skyMaterial && !this.skyMaterial.isShaderMaterial) {
            // Change sky color based on time of day
            if (time < 0.3) {
                // Day - Sky blue
                this.skyMaterial.color.set(0x87CEEB);
            } else if (time < 0.45) {
                // Day to sunset transition
                const t = (time - 0.3) / 0.15;
                this.skyMaterial.color.setHex(0x87CEEB).lerp(new THREE.Color(0xFF7733), t);
            } else if (time < 0.55) {
                // Sunset - Orange-ish
                this.skyMaterial.color.set(0xFF7733);
            } else if (time < 0.85) {
                // Night - Dark blue
                this.skyMaterial.color.set(0x001144);
            } else if (time < 0.95) {
                // Dawn - Purple-ish to light blue
                const t = (time - 0.85) / 0.1;
                this.skyMaterial.color.setHex(0x001144).lerp(new THREE.Color(0xB9C4DB), t);
            } else {
                // Dawn to day - Light blue
                const t = (time - 0.95) / 0.05;
                this.skyMaterial.color.setHex(0xB9C4DB).lerp(new THREE.Color(0x87CEEB), t);
            }
        }
        
        // For shader materials, we update colors in the update method
        // through the uniform values
        
        // Force an update of positions
        if (this.scene.camera) {
            this.updateSunPosition(this.scene.camera);
            this.updateMoonPosition(this.scene.camera);
        }
    }
    
    // Create moon with realistic phases and glow
    createMoon() {
        // Create the moon with a realistic texture
        const moonGeometry = new THREE.CircleGeometry(12, 32);
        
        // Create the moon texture with phases
        const moonTexture = this.createMoonTexture();
        
        // Create material with moon texture
        const moonMaterial = new THREE.MeshBasicMaterial({
            map: moonTexture,
            transparent: true,
            side: THREE.FrontSide,
            depthWrite: false
        });
        
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.moon);
        
        // Create moon glow
        const moonGlowTexture = this.createGlowTexture();
        
        const moonGlowMaterial = new THREE.SpriteMaterial({
            map: moonGlowTexture,
            color: 0xCCDDFF,  // Bluish white for moon glow
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.7
        });
        
        this.moonGlow = new THREE.Sprite(moonGlowMaterial);
        this.moonGlow.scale.set(30, 30, 1);
        this.scene.add(this.moonGlow);
    }
    
    // Create a realistic moon texture with craters
    createMoonTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Fill with light gray
        context.fillStyle = '#DDDDDD';
        context.fillRect(0, 0, 256, 256);
        
        // Create moon's base color
        context.fillStyle = '#DDDDEE';
        context.beginPath();
        context.arc(128, 128, 120, 0, Math.PI * 2);
        context.fill();
        
        // Add some craters
        this.drawMoonCraters(context);
        
        // Create phase shadow (changes with moon phase)
        const phase = this.moonPhase; // 0 to 1
        
        // Draw the shadow based on moon phase
        this.drawMoonPhase(context, phase);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    // Draw craters on the moon
    drawMoonCraters(context) {
        // Add several craters of different sizes
        const craterCount = 15;
        const centerX = 128;
        const centerY = 128;
        const radius = 120;
        
        // Draw larger craters first
        for (let i = 0; i < craterCount; i++) {
            // Random position on the moon
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.9; // Keep inside moon
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Random crater size
            const craterSize = 5 + Math.random() * 15;
            
            // Create a crater (lighter rim, darker center)
            // Outer rim (lighter)
            context.fillStyle = '#EEEEEE';
            context.beginPath();
            context.arc(x, y, craterSize, 0, Math.PI * 2);
            context.fill();
            
            // Inner crater (darker)
            context.fillStyle = '#AAAAAA';
            context.beginPath();
            context.arc(x, y, craterSize * 0.7, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    // Draw the moon phase shadow
    drawMoonPhase(context, phase) {
        const centerX = 128;
        const centerY = 128;
        const radius = 120;
        
        // Determine shadow shape based on phase
        // 0 = new moon (full shadow), 0.5 = full moon (no shadow), 1 = new moon again
        let shadowRatio;
        if (phase <= 0.5) {
            // Waxing moon (shadow moves right to left)
            shadowRatio = 1 - phase * 2;
        } else {
            // Waning moon (shadow moves left to right)
            shadowRatio = (phase - 0.5) * 2;
        }
        
        // Draw shadow
        context.fillStyle = 'rgba(0, 0, 0, 0.9)';
        context.beginPath();
        context.arc(centerX, centerY, radius, -Math.PI/2, Math.PI/2);
        
        // Change the shape of the shadow based on phase
        if (phase <= 0.5) {
            // Shadow on the right side (waxing)
            const controlX = centerX + radius * (1 - shadowRatio * 2);
            context.bezierCurveTo(
                controlX, centerY - radius * 0.5,
                controlX, centerY + radius * 0.5,
                centerX, centerY + radius
            );
        } else {
            // Shadow on the left side (waning)
            const controlX = centerX - radius * (1 - shadowRatio * 2);
            context.bezierCurveTo(
                controlX, centerY + radius * 0.5,
                controlX, centerY - radius * 0.5,
                centerX, centerY - radius
            );
        }
        
        context.fill();
    }
    
    // Removed unused moon texture methods
    // Moon textures are now created inline in the createMoon method
    
    update(time, camera) {
        // Update shader uniforms if using ShaderMaterial
        if (this.skyMaterial && this.skyMaterial.isShaderMaterial && this.skyMaterial.uniforms) {
            // Update time uniform for animated sky effects
            if (this.skyMaterial.uniforms.time !== undefined) {
                this.skyMaterial.uniforms.time.value = time;
            }
            
            // Update colors based on time of day
            if (this.skyMaterial.uniforms.topColor !== undefined && 
                this.skyMaterial.uniforms.bottomColor !== undefined) {
                
                let topColor, bottomColor;
                
                // Change sky colors based on time of day
                if (this.timeOfDay < 0.3) {
                    // Day - Deep blue top, light blue bottom
                    topColor = new THREE.Color(0x0077FF);
                    bottomColor = new THREE.Color(0x8CBAFF);
                } else if (this.timeOfDay < 0.45) {
                    // Day to sunset transition
                    const t = (this.timeOfDay - 0.3) / 0.15;
                    topColor = new THREE.Color(0x0077FF).lerp(new THREE.Color(0xFF5500), t);
                    bottomColor = new THREE.Color(0x8CBAFF).lerp(new THREE.Color(0xFFAA33), t);
                } else if (this.timeOfDay < 0.55) {
                    // Sunset - Orange-ish
                    topColor = new THREE.Color(0xFF5500);
                    bottomColor = new THREE.Color(0xFFAA33);
                } else if (this.timeOfDay < 0.85) {
                    // Night - Dark blue
                    topColor = new THREE.Color(0x000022);
                    bottomColor = new THREE.Color(0x001155);
                } else if (this.timeOfDay < 0.95) {
                    // Dawn - Purple-ish to light blue
                    const t = (this.timeOfDay - 0.85) / 0.1;
                    topColor = new THREE.Color(0x000022).lerp(new THREE.Color(0x0044AA), t);
                    bottomColor = new THREE.Color(0x001155).lerp(new THREE.Color(0x8CBAFF), t);
                } else {
                    // Dawn to day - Light blue
                    const t = (this.timeOfDay - 0.95) / 0.05;
                    topColor = new THREE.Color(0x0044AA).lerp(new THREE.Color(0x0077FF), t);
                    bottomColor = new THREE.Color(0x8CBAFF).lerp(new THREE.Color(0x8CBAFF), t);
                }
                
                // Apply colors to shader uniforms
                this.skyMaterial.uniforms.topColor.value = topColor;
                this.skyMaterial.uniforms.bottomColor.value = bottomColor;
            }
        }
        
        // Update time of day if cycle is enabled
        if (this.dayNightCycle) {
            // Calculate time progression (0 to 1) with adjustable speed
            const timeStep = 1 / this.dayDuration;
            this.timeOfDay = (this.timeOfDay + timeStep * 0.016 * this.timeSpeed) % 1.0; // Assume 60fps (0.016 sec)
            this.setTimeOfDay(this.timeOfDay);
        }
        
        // Update sun and moon positions
        if (camera) {
            this.updateSunPosition(camera);
            this.updateMoonPosition(camera);
        }
    }
    
    // Calculate moon position based on time of day (opposite to sun)
    updateMoonPosition(camera) {
        if (!this.moon) return;
        
        // Moon position is opposite to sun (180 degrees offset)
        const angle = ((this.timeOfDay + 0.5) % 1.0) * Math.PI * 2 - Math.PI/2;
        
        // Calculate position in the sky dome
        const radius = CONFIG.worldSize * 1.5;
        const height = Math.sin(angle) * radius * 0.5;
        
        const x = Math.cos(angle) * radius;
        const y = Math.max(5, height + 50 * Math.max(0.05, Math.abs(Math.sin(angle))));
        const z = Math.sin(angle) * radius * 0.5;
        
        // Position the moon
        this.moon.position.set(x, y, z);
        this.moon.lookAt(camera.position);
        
        // Position the moon glow sprite
        if (this.moonGlow) {
            this.moonGlow.position.copy(this.moon.position);
        }
        
        // Only show moon at night (opposite of sun visibility)
        const isMoonVisible = this.timeOfDay > 0.55 && this.timeOfDay < 0.95;
        this.moon.visible = isMoonVisible;
        
        // Also set glow visibility
        if (this.moonGlow) {
            this.moonGlow.visible = isMoonVisible;
            
            // Adjust glow opacity based on time of day
            // Brightest at midnight, dimmer at dusk/dawn
            let glowOpacity = 0.7;
            
            // Peak at 0.7 (night), dimmer at 0.55 and 0.95 (dusk/dawn)
            if (this.timeOfDay < 0.7) {
                glowOpacity = 0.7 * ((this.timeOfDay - 0.55) / 0.15);
            } else if (this.timeOfDay > 0.85) {
                glowOpacity = 0.7 * (1 - ((this.timeOfDay - 0.85) / 0.1));
            }
            
            this.moonGlow.material.opacity = glowOpacity;
        }
    }
}

export default Sky;