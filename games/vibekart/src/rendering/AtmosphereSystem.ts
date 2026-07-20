import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { AtmosphereConfig, WeatherType } from '../../types/config.d';

/**
 * Manages atmospheric effects including sky, sun/moon positions, and weather
 */
export class AtmosphereSystem {
  private scene: THREE.Scene;
  private config: AtmosphereConfig;
  private timeOfDay: number; // 0-24 hours
  private lastFrameTime: number = 0;
  
  // Sky objects
  private sky: Sky;
  private sunLight: THREE.DirectionalLight | null = null;
  private moonLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private rainParticles: THREE.Points | null = null;
  private cloudMeshes: THREE.Mesh[] = [];
  private starField: THREE.Points | null = null;
  
  // Weather effects
  private weatherEnabled: boolean = true;
  private rainParticlesCount: number = 10000; // Number of raindrops

  constructor(scene: THREE.Scene, config: AtmosphereConfig) {
    this.scene = scene;
    this.config = config;
    this.timeOfDay = config.time.startTimeOfDay;

    // Initialize sky
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);
    
    // Initialize lights and atmosphere
    this.setupAtmosphere();
    this.setupLights();
    this.setupStarField(); // Create star field
    this.updateByTimeOfDay(this.timeOfDay);
    
    // Initialize weather if enabled
    if (config.weather.type !== 'clear') {
      this.setupWeather(config.weather.type, config.weather.intensity);
    }
    
    // Start time
    this.lastFrameTime = Date.now();
  }
  
  /**
   * Create a star field that will be visible at night
   */
  private setupStarField(): void {
    // Remove existing star field if any
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      (this.starField.material as THREE.Material).dispose();
      this.starField = null;
    }
    
    // Create stars
    const starCount = 2000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starColors = new Float32Array(starCount * 3);
    
    const radius = 400; // Radius of the dome on which stars are placed
    
    for (let i = 0; i < starCount; i++) {
      // Create stars in a hemisphere above the scene
      const phi = Math.acos(Math.random() * 0.8); // Angle from y axis (0 to pi/2 for upper hemisphere)
      const theta = Math.random() * Math.PI * 2; // Angle around y axis
      
      // Convert spherical coordinates to cartesian
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi); // Y is up
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Random star size (some stars bigger than others)
      starSizes[i] = Math.random() * 1.5 + 0.5;
      
      // Star color - mostly white/blue with some variation
      const colorChoice = Math.random();
      if (colorChoice > 0.85) {
        // Reddish star (5%)
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        starColors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
      } else if (colorChoice > 0.7) {
        // Yellowish star (15%)
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 1.0;
        starColors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
      } else {
        // Blue-white star (80%)
        starColors[i * 3] = 0.8 + Math.random() * 0.2;
        starColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    
    // Create star material
    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0, // Start invisible, opacity controlled by time of day
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Create star field
    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.starField.name = 'StarField';
    this.scene.add(this.starField);
  }
  
  /**
   * Update atmospheric effects per frame
   */
  public update(): void {
    if (this.config.time.enabled && this.config.time.autoTimeProgression) {
      const currentTime = Date.now();
      const deltaTime = (currentTime - this.lastFrameTime) / 1000; // in seconds
      
      // Update time of day based on speed multiplier
      const timeIncrement = deltaTime * this.config.time.timeSpeedMultiplier / (60 * 60); // Convert to hours
      this.timeOfDay = (this.timeOfDay + timeIncrement) % 24;
      
      // Update atmospheric effects based on new time
      this.updateByTimeOfDay(this.timeOfDay);
      
      this.lastFrameTime = currentTime;
    }
    
    // Update weather effects
    this.updateWeatherEffects();
  }
  
  /**
   * Set up the sky and atmosphere
   */
  private setupAtmosphere(): void {
    if (!this.config.sky.enabled) return;
    
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 1;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
  }
  
  /**
   * Setup main lights
   */
  private setupLights(): void {
    // Remove existing lights
    if (this.sunLight) this.scene.remove(this.sunLight);
    if (this.moonLight) this.scene.remove(this.moonLight);
    if (this.ambientLight) this.scene.remove(this.ambientLight);
    
    // Create sun light
    this.sunLight = new THREE.DirectionalLight(0xffffbb, this.config.sky.sunIntensity);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    
    // Adjust shadow camera frustum to cover scene
    const shadowCamSize = 150;
    this.sunLight.shadow.camera.left = -shadowCamSize;
    this.sunLight.shadow.camera.right = shadowCamSize;
    this.sunLight.shadow.camera.top = shadowCamSize;
    this.sunLight.shadow.camera.bottom = -shadowCamSize;
    
    this.scene.add(this.sunLight);
    
    // Create moon light (dimmer, blueish)
    this.moonLight = new THREE.DirectionalLight(0x8888ff, this.config.sky.moonIntensity);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 1024;
    this.moonLight.shadow.mapSize.height = 1024;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 500;
    this.moonLight.shadow.camera.left = -shadowCamSize;
    this.moonLight.shadow.camera.right = shadowCamSize;
    this.moonLight.shadow.camera.top = shadowCamSize;
    this.moonLight.shadow.camera.bottom = -shadowCamSize;
    
    this.scene.add(this.moonLight);
    
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);
  }
  
  /**
   * Update atmospheric effects based on time of day
   */
  private updateByTimeOfDay(hour: number): void {
    if (!this.config.sky.enabled) return;
    
    // Calculate sun position based on time (improved celestial math)
    // We'll make the sun arc more realistic for different times of day
    
    // Adjust the angle calculation to make 12 noon the highest point
    let dayProgress = hour / 24;
    // Phi represents height above/below horizon (90° at zenith, -90° at nadir)
    // Adjusted to make noon ~80° elevation and midnight ~-80° below horizon
    const phi = THREE.MathUtils.degToRad(80 * Math.sin((dayProgress * 2 - 0.5) * Math.PI));
    
    // Theta represents azimuth (direction along horizon, 0° = North, 90° = East)
    // Adjusted to make the sun rise in the east and set in the west
    const theta = THREE.MathUtils.degToRad(dayProgress * 360);
    
    // Sun position
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(100000, phi, theta);
    
    // Moon position (shifted ~180° from sun)
    const moonPosition = new THREE.Vector3();
    moonPosition.setFromSphericalCoords(100000, -phi, (theta + Math.PI) % (2 * Math.PI));
    
    // Update sky uniforms
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['sunPosition'].value.copy(sunPosition);
    
    // Determine if it's day, dusk/dawn, or night
    const isDaytime = phi > 0.1; // Just above horizon
    const isDusk = phi > -0.3 && phi <= 0.1; // Twilight/dusk/dawn
    const isNight = phi <= -0.3; // Below horizon by significant amount
    
    // True night time when it's really dark (used for stars)
    const isDeepNight = hour >= 20 || hour <= 4; // After 8pm or before 4am
    
    // Update star visibility - make stars visible at night, fade in/out during dusk/dawn
    if (this.starField) {
      const material = this.starField.material as THREE.PointsMaterial;
      
      if (isDeepNight) {
        // Full star visibility at night
        material.opacity = this.config.sky.starsIntensity;
        material.size = 1.5;
      } else if (isNight && !isDeepNight) {
        // Partial visibility during transitions to deep night
        const transitionProgress = hour >= 19 && hour < 20 
          ? (hour - 19) // Evening transition (7pm-8pm)
          : hour >= 4 && hour < 5 
            ? 1 - (hour - 4) // Morning transition (4am-5am)
            : 0.5; // Default during early night
        
        material.opacity = this.config.sky.starsIntensity * transitionProgress;
        material.size = 1.0 + 0.5 * transitionProgress;
      } else if (isDusk) {
        // Barely visible during dusk/dawn
        material.opacity = this.config.sky.starsIntensity * 0.1;
        material.size = 0.8;
      } else {
        // Not visible during the day
        material.opacity = 0;
      }
    }
    
    // Update light positions
    if (this.sunLight) {
      this.sunLight.position.copy(sunPosition.normalize().multiplyScalar(100));
      
      // Adjust sun intensity and color based on time of day
      if (isDaytime) {
        // Morning to mid-day transition (6am to 12pm)
        if (hour >= 6 && hour <= 12) {
          const t = (hour - 6) / 6; // 0 at 6am, 1 at noon
          // Morning light starts golden, transitions to white
          const intensity = 0.7 + 0.3 * t;
          this.sunLight.intensity = this.config.sky.sunIntensity * intensity;
          
          // Blend from warm morning color to full daylight
          const r = Math.floor(255 * (1.0 - 0.1 * (1 - t))); // Reduced red as day progresses
          const g = Math.floor(255 * (0.9 + 0.1 * t));      // Increased green
          const b = Math.floor(255 * (0.7 + 0.3 * t));      // Increased blue
          
          this.sunLight.color.setRGB(r/255, g/255, b/255);
        } 
        // Mid-day (12pm to 4pm) - full bright white sunlight
        else if (hour > 12 && hour < 16) {
          this.sunLight.intensity = this.config.sky.sunIntensity;
          this.sunLight.color.set(0xffffff);
        } 
        // Afternoon to sunset transition (4pm to 7pm)
        else if (hour >= 16 && hour <= 19) {
          const t = (hour - 16) / 3; // 0 at 4pm, 1 at 7pm
          // Gradually decrease intensity and shift to orange
          const intensity = 1.0 - 0.8 * t;
          this.sunLight.intensity = this.config.sky.sunIntensity * intensity;
          
          // Blend from white to deep orange
          const r = 255;
          const g = Math.floor(255 * (1.0 - 0.5 * t)); // Reduce green
          const b = Math.floor(255 * (1.0 - 0.7 * t)); // Reduce blue more
          
          this.sunLight.color.setRGB(r/255, g/255, b/255);
        }
        // Fade out at night
        else {
          this.sunLight.intensity = 0;
        }
      } else if (isDusk) {
        // Sunrise (5am to 6am)
        if (hour >= 5 && hour < 6) {
          const t = (hour - 5); // 0 to 1 during sunrise
          this.sunLight.intensity = this.config.sky.sunIntensity * 0.4 * t;
          this.sunLight.color.set(0xff8c4d); // Sunrise orange
        } 
        // Sunset (7pm to 8pm)
        else if (hour >= 19 && hour <= 20) {
          const t = 1 - (hour - 19); // 1 to 0 during sunset
          this.sunLight.intensity = this.config.sky.sunIntensity * 0.4 * t;
          this.sunLight.color.set(0xff5e1a); // Sunset deep orange
        }
      } else {
        this.sunLight.intensity = 0;
      }
    }
    
    // Update moon light
    if (this.moonLight) {
      this.moonLight.position.copy(moonPosition.normalize().multiplyScalar(100));
      
      // Moon is visible at night with smooth transitions
      if (isNight) {
        // Full intensity during deep night
        if (isDeepNight) {
          this.moonLight.intensity = this.config.sky.moonIntensity;
          this.moonLight.color.set(0xaabbff); // Blue-white moonlight
        }
        // Transition during dusk/early night
        else {
          const t = hour >= 19 && hour < 20 
            ? (hour - 19) // Evening transition
            : hour >= 4 && hour < 5 
              ? 1 - (hour - 4) // Morning transition
              : 0.5; // Default
          
          this.moonLight.intensity = this.config.sky.moonIntensity * t;
          this.moonLight.color.set(0xaabbff);
        }
      } else {
        this.moonLight.intensity = 0;
      }
    }
    
    // Update ambient light based on time of day
    if (this.ambientLight) {
      // Morning (5am to 8am)
      if (hour >= 5 && hour < 8) {
        const t = (hour - 5) / 3; // 0 at 5am, 1 at 8am
        // Warm morning ambient 
        const r = 255;
        const g = Math.floor(170 + 85 * t); // 170 to 255
        const b = Math.floor(119 + 136 * t); // 119 to 255
        
        this.ambientLight.color.setRGB(r/255, g/255, b/255);
        this.ambientLight.intensity = 0.3 + 0.2 * t;
      }
      // Day (8am to 5pm)
      else if (hour >= 8 && hour < 17) {
        this.ambientLight.color.set(0xffffff);
        this.ambientLight.intensity = 0.5;
      }
      // Evening/sunset (5pm to 8pm)
      else if (hour >= 17 && hour < 20) {
        const t = (hour - 17) / 3; // 0 at 5pm, 1 at 8pm
        // Warm then cool transition
        const r = Math.floor(255 * (1.0 - 0.4 * t));
        const g = Math.floor(255 * (1.0 - 0.6 * t));
        const b = Math.floor(255 * (1.0 - 0.3 * t));
        
        this.ambientLight.color.setRGB(r/255, g/255, b/255);
        this.ambientLight.intensity = 0.5 - 0.2 * t;
      }
      // Night (8pm to 5am)
      else {
        this.ambientLight.color.set(0x334466); // Blue night ambient
        this.ambientLight.intensity = 0.2;
      }
    }
    
    // Update scene fog and background based on time of day
    if (this.scene.fog) {
      // Deep night (9pm to 4am)
      if (hour >= 21 || hour <= 4) {
        const nightColor = new THREE.Color(0x0a1a2a); // Deep blue-black
        this.scene.background = nightColor;
        (this.scene.fog as THREE.Fog).color = nightColor;
      }
      // Early night/late evening (8pm to 9pm)
      else if (hour >= 20 && hour < 21) {
        const t = (hour - 20); // 0 to 1
        const duskColor = new THREE.Color(0x2a3b59); // Dark blue
        const nightColor = new THREE.Color(0x0a1a2a); // Deep blue-black
        const color = duskColor.lerp(nightColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Dusk (7pm to 8pm)
      else if (hour >= 19 && hour < 20) {
        const t = (hour - 19); // 0 to 1
        const sunsetColor = new THREE.Color(0xff5733); // Sunset orange
        const duskColor = new THREE.Color(0x2a3b59); // Dark blue
        const color = sunsetColor.lerp(duskColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Sunset (6pm to 7pm)
      else if (hour >= 18 && hour < 19) {
        const t = (hour - 18); // 0 to 1
        const lateAfternoonColor = new THREE.Color(0xffb86b); // Late afternoon golden
        const sunsetColor = new THREE.Color(0xff5733); // Sunset orange-red
        const color = lateAfternoonColor.lerp(sunsetColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Late afternoon (5pm to 6pm)
      else if (hour >= 17 && hour < 18) {
        const t = (hour - 17); // 0 to 1
        const dayColor = new THREE.Color(0x87CEEB); // Day sky blue
        const lateAfternoonColor = new THREE.Color(0xffb86b); // Late afternoon golden
        const color = dayColor.lerp(lateAfternoonColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Dawn (4am to 5am)
      else if (hour >= 4 && hour < 5) {
        const t = (hour - 4); // 0 to 1
        const nightColor = new THREE.Color(0x0a1a2a); // Night blue-black
        const dawnColor = new THREE.Color(0x2a3b59); // Dark blue dawn
        const color = nightColor.lerp(dawnColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Sunrise (5am to 6am)
      else if (hour >= 5 && hour < 6) {
        const t = (hour - 5); // 0 to 1
        const dawnColor = new THREE.Color(0x2a3b59); // Dark blue dawn
        const sunriseColor = new THREE.Color(0xff9e6b); // Sunrise orange-pink
        const color = dawnColor.lerp(sunriseColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Early morning (6am to 7am)
      else if (hour >= 6 && hour < 7) {
        const t = (hour - 6); // 0 to 1 
        const sunriseColor = new THREE.Color(0xff9e6b); // Sunrise orange-pink
        const morningColor = new THREE.Color(0xaad5f0); // Morning light blue
        const color = sunriseColor.lerp(morningColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Morning (7am to 9am)
      else if (hour >= 7 && hour < 9) {
        const t = (hour - 7) / 2; // 0 to 1
        const morningColor = new THREE.Color(0xaad5f0); // Morning light blue
        const dayColor = new THREE.Color(0x87CEEB); // Day sky blue
        const color = morningColor.lerp(dayColor, t);
        
        this.scene.background = color;
        (this.scene.fog as THREE.Fog).color = color;
      }
      // Full day (9am to 5pm)
      else {
        const dayColor = new THREE.Color(0x87CEEB); // Day sky blue
        this.scene.background = dayColor;
        (this.scene.fog as THREE.Fog).color = dayColor;
      }
    }
  }
  
  /**
   * Setup weather effects
   */
  private setupWeather(type: WeatherType, intensity: number): void {
    this.weatherEnabled = true;
    
    // Clear existing weather effects
    this.clearWeatherEffects();
    
    switch (type) {
      case 'rain':
        this.setupRain(intensity);
        break;
      case 'fog':
        this.setupFog(intensity);
        break;
      case 'cloudy':
      case 'overcast':
        this.setupClouds(type === 'overcast' ? 0.7 : 0.4);
        break;
      case 'storm':
        this.setupStorm(intensity);
        break;
      default:
        this.weatherEnabled = false;
        break;
    }
  }
  
  /**
   * Setup rain particles
   */
  private setupRain(intensity: number): void {
    const particleCount = Math.floor(this.rainParticlesCount * intensity);
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    
    const worldSize = 200; // Adjust based on your world size
    const height = 80;
    
    for (let i = 0; i < particleCount; i++) {
      // Random position in a volume above the scene
      particlePositions[i * 3] = (Math.random() - 0.5) * worldSize * 2;
      particlePositions[i * 3 + 1] = Math.random() * height;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * worldSize * 2;
      
      // Random size for each raindrop
      particleSizes[i] = Math.random() * 2 + 1;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    // Rain material
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 1.5,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    
    this.rainParticles = new THREE.Points(particleGeometry, rainMaterial);
    this.rainParticles.name = 'RainParticles';
    this.scene.add(this.rainParticles);
    
    // Adjust fog for rain
    if (this.scene.fog && intensity > 0.3) {
      (this.scene.fog as THREE.Fog).near = 50;
      (this.scene.fog as THREE.Fog).far = 200;
    }
  }
  
  /**
   * Setup fog effect
   */
  private setupFog(intensity: number): void {
    if (!this.scene.fog) return;
    
    // Adjust fog distance based on intensity
    const fogNear = 20 + (1 - intensity) * 80;
    const fogFar = 80 + (1 - intensity) * 200;
    
    (this.scene.fog as THREE.Fog).near = fogNear;
    (this.scene.fog as THREE.Fog).far = fogFar;
    
    // Fog color could be adjusted based on time of day
    const fogColor = new THREE.Color(this.config.weather.fogColor);
    (this.scene.fog as THREE.Fog).color = fogColor;
    this.scene.background = fogColor;
  }
  
  /**
   * Setup cloud cover
   */
  private setupClouds(coverage: number): void {
    const cloudCount = Math.floor(20 * coverage);
    const worldSize = 200;
    
    for (let i = 0; i < cloudCount; i++) {
      const size = Math.random() * 20 + 30;
      const cloudGeometry = new THREE.PlaneGeometry(size, size);
      
      // Cloud material
      const cloudMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: Math.random() * 0.4 + 0.2,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      
      // Random position
      cloud.position.x = (Math.random() - 0.5) * worldSize * 2;
      cloud.position.y = Math.random() * 20 + 60;
      cloud.position.z = (Math.random() - 0.5) * worldSize * 2;
      
      // Face the cloud parallel to the ground
      cloud.rotation.x = Math.PI / 2;
      
      cloud.name = `Cloud_${i}`;
      this.scene.add(cloud);
      this.cloudMeshes.push(cloud);
    }
  }
  
  /**
   * Setup storm effects (combination of heavy rain, clouds, and occasional lightning)
   */
  private setupStorm(intensity: number): void {
    // Set up heavy rain
    this.setupRain(intensity);
    
    // Set up dark clouds
    this.setupClouds(0.9);
    
    // Darken the scene
    if (this.ambientLight) {
      this.ambientLight.intensity *= 0.6;
    }
    
    // Add fog
    this.setupFog(intensity * 0.7);
  }
  
  /**
   * Update weather effects per frame
   */
  private updateWeatherEffects(): void {
    if (!this.weatherEnabled) return;
    
    // Update rain particles
    if (this.rainParticles) {
      const positions = (this.rainParticles.geometry.attributes.position as THREE.BufferAttribute).array;
      const count = positions.length / 3;
      
      // Rain fall speed
      const fallSpeed = 0.5;
      const worldSize = 200;
      const height = 80;
      
      for (let i = 0; i < count; i++) {
        // Move rain down
        positions[i * 3 + 1] -= fallSpeed;
        
        // If raindrop goes below ground, reset it to the top
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3] = (Math.random() - 0.5) * worldSize * 2;
          positions[i * 3 + 1] = height;
          positions[i * 3 + 2] = (Math.random() - 0.5) * worldSize * 2;
        }
      }
      
      (this.rainParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    
    // Animate clouds (slow drift)
    this.cloudMeshes.forEach((cloud, index) => {
      cloud.position.x += 0.05;
      
      // If cloud drifts too far, reset it
      if (cloud.position.x > 200) {
        cloud.position.x = -200;
        cloud.position.z = (Math.random() - 0.5) * 400;
      }
    });
  }
  
  /**
   * Clear all weather effects
   */
  private clearWeatherEffects(): void {
    // Remove rain particles
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainParticles.geometry.dispose();
      (this.rainParticles.material as THREE.Material).dispose();
      this.rainParticles = null;
    }
    
    // Remove clouds
    this.cloudMeshes.forEach(cloud => {
      this.scene.remove(cloud);
      cloud.geometry.dispose();
      (cloud.material as THREE.Material).dispose();
    });
    this.cloudMeshes = [];
  }
  
  /**
   * Set the time of day manually
   */
  public setTimeOfDay(hours: number): void {
    this.timeOfDay = THREE.MathUtils.clamp(hours, 0, 24);
    this.updateByTimeOfDay(this.timeOfDay);
  }
  
  /**
   * Get current time of day
   */
  public getTimeOfDay(): number {
    return this.timeOfDay;
  }
  
  /**
   * Set time multiplier
   */
  public setTimeMultiplier(multiplier: number): void {
    this.config.time.timeSpeedMultiplier = THREE.MathUtils.clamp(multiplier, 0, 100);
  }
  
  /**
   * Toggle automatic time progression
   */
  public setAutoTimeProgression(enabled: boolean): void {
    this.config.time.autoTimeProgression = enabled;
  }
  
  /**
   * Update weather settings
   */
  public updateWeather(type: WeatherType, intensity: number): void {
    this.config.weather.type = type;
    this.config.weather.intensity = THREE.MathUtils.clamp(intensity, 0, 1);
    this.setupWeather(type, intensity);
  }
  
  /**
   * Update sky settings
   */
  public updateSkySettings(sunIntensity: number, moonIntensity: number, starsIntensity?: number): void {
    this.config.sky.sunIntensity = sunIntensity;
    this.config.sky.moonIntensity = moonIntensity;
    
    if (starsIntensity !== undefined) {
      this.config.sky.starsIntensity = starsIntensity;
    }
    
    if (this.sunLight) this.sunLight.intensity = sunIntensity;
    if (this.moonLight) this.moonLight.intensity = moonIntensity;
    
    // Update will adjust star opacity based on time of day
    this.updateByTimeOfDay(this.timeOfDay);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.clearWeatherEffects();
    
    // Clean up star field
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      (this.starField.material as THREE.Material).dispose();
      this.starField = null;
    }
  }
}