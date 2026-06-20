import * as THREE from 'three';

// Scene setup and management
class Scene {
    constructor() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
        
        // Setup renderer with better visuals
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // TEXTURE FIX: Disable shadow maps entirely to save texture units
        this.renderer.shadowMap.enabled = false;
        // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x87ceeb); // Sky blue background (redundant but helpful)
        this.renderer.setPixelRatio(window.devicePixelRatio); // For sharper rendering
        document.body.appendChild(this.renderer.domElement);
        
        // Create a very basic ground plane directly in the scene for reliability
        this.createBasicGround();
        
        // Setup lighting
        this.setupLighting();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createBasicGround() {
        // Completely remove the basic ground plane
        // The ground is now handled entirely by the Ground class in environment
        
        // We'll just log that we're skipping this step
        console.log("Basic ground plane completely removed - using only terrain");
        
        // Don't create or store any reference
    }
    
    setupLighting() {
        // Add directional light (sun) - TEXTURE FIX: Disabled shadows
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity to compensate for no shadows
        sunLight.position.set(100, 100, 50);
        sunLight.castShadow = false; // TEXTURE FIX: Disable shadows to save texture units
        
        /*
        // Shadow settings - disabled to save texture units
        sunLight.castShadow = true;
        
        // Improve shadow quality
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        
        // Increase shadow area coverage
        const shadowArea = 200;
        sunLight.shadow.camera.left = -shadowArea;
        sunLight.shadow.camera.right = shadowArea;
        sunLight.shadow.camera.top = shadowArea;
        sunLight.shadow.camera.bottom = -shadowArea;
        */
        
        // Store the sun light for later updates
        this.sunLight = sunLight;
        this.scene.add(sunLight);
        
        // Add ambient light for general illumination
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);
        
        // Add hemisphere light for better color variation
        this.hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.6);
        this.scene.add(this.hemisphereLight);
        
        // Create post-processing for better visuals
        this.setupPostProcessing();
    }
    
    setupPostProcessing() {
        // Enable tone mapping for better dynamic range
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Enable physically correct lighting
        this.renderer.physicallyCorrectLights = true;
        
        // TEXTURE FIX: Keep shadows disabled to save texture units
        // this.renderer.shadowMap.enabled = true;
        // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Update lighting based on time of day
    updateLighting(timeOfDay) {
        if (!this.sunLight || !this.ambientLight || !this.hemisphereLight) return;
        
        // Update sun position based on time of day
        const angle = (timeOfDay * Math.PI * 2) - Math.PI/2;
        const radius = 300;
        const height = Math.sin(angle) * radius * 0.5;
        
        this.sunLight.position.x = Math.cos(angle) * radius;
        this.sunLight.position.y = Math.max(10, height + 50); 
        this.sunLight.position.z = Math.sin(angle) * radius * 0.5;
        
        // Update sun color based on time of day
        let sunColor, sunIntensity;
        let ambientIntensity, hemiIntensity;
        
        if (timeOfDay < 0.3) {
            // Morning - warm white light
            sunColor = new THREE.Color(0xfffee9);
            sunIntensity = 1.2;
            ambientIntensity = 0.5;
            hemiIntensity = 0.6;
        } else if (timeOfDay < 0.45) {
            // Day to sunset transition
            const blend = (timeOfDay - 0.3) / 0.15;
            sunColor = new THREE.Color(0xfffee9).lerp(new THREE.Color(0xffa064), blend);
            sunIntensity = 1.2 - (blend * 0.3);
            ambientIntensity = 0.5 - (blend * 0.2);
            hemiIntensity = 0.6 - (blend * 0.2);
        } else if (timeOfDay < 0.55) {
            // Sunset - orange-amber light
            sunColor = new THREE.Color(0xffa064);
            sunIntensity = 0.9;
            ambientIntensity = 0.3;
            hemiIntensity = 0.4;
        } else if (timeOfDay < 0.85) {
            // Night - dim blue light
            sunColor = new THREE.Color(0x204080);
            sunIntensity = 0.1;
            ambientIntensity = 0.15;
            hemiIntensity = 0.2;
        } else if (timeOfDay < 0.95) {
            // Dawn - purple to yellow transition
            const blend = (timeOfDay - 0.85) / 0.1;
            sunColor = new THREE.Color(0x204080).lerp(new THREE.Color(0xffe4c0), blend);
            sunIntensity = 0.1 + (blend * 0.9);
            ambientIntensity = 0.15 + (blend * 0.25);
            hemiIntensity = 0.2 + (blend * 0.3);
        } else {
            // Early morning
            const blend = (timeOfDay - 0.95) / 0.05;
            sunColor = new THREE.Color(0xffe4c0).lerp(new THREE.Color(0xfffee9), blend);
            sunIntensity = 1.0 + (blend * 0.2);
            ambientIntensity = 0.4 + (blend * 0.1);
            hemiIntensity = 0.5 + (blend * 0.1);
        }
        
        // Apply light changes
        this.sunLight.color.copy(sunColor);
        this.sunLight.intensity = sunIntensity;
        this.ambientLight.intensity = ambientIntensity;
        this.hemisphereLight.intensity = hemiIntensity;
        
        // Update hemisphere light colors based on time of day
        if (timeOfDay > 0.55 && timeOfDay < 0.85) {
            // Night time - blue sky, dark ground
            this.hemisphereLight.color.set(0x1a3059); // Sky color
            this.hemisphereLight.groundColor.set(0x111111); // Ground color
        } else if (timeOfDay > 0.45 && timeOfDay < 0.55) {
            // Sunset - orange sky, darker ground
            this.hemisphereLight.color.set(0xff9e57); // Sky color
            this.hemisphereLight.groundColor.set(0x332211); // Ground color
        } else {
            // Daytime - yellow sky, green-ish ground
            this.hemisphereLight.color.set(0xffffbb); // Sky color
            this.hemisphereLight.groundColor.set(0x080820); // Ground color
        }
    }
    
    onWindowResize() {
        if (!this.camera) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    add(object) {
        this.scene.add(object);
    }
    
    render() {
        if (!this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }
}

export default Scene;