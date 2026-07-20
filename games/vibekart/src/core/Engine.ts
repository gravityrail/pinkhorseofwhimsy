import Stats from 'stats.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js'; // If using SSAA

import { TestDrive } from '../gameplay/TestDrive';
import { HeightMap } from '../generation/Terrain/HeightMap';
import { TrackPath } from '../generation/Track/Spline';
import { AtmosphereSystem } from '../rendering/AtmosphereSystem';
import { SceneBuilder, WorldModel } from '../rendering/SceneBuilder';
import { setupOrbitControls } from '../ui/Controls';
import { setupGUI } from '../ui/Gui';
import { currentConfig } from './Config';
import { PRNG } from './PRNG';
import { KartPhysics } from '../physics/KartPhysics';
// import { LODController } from '../rendering/LODController'; // If LOD is implemented

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private stats: Stats;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  private prng!: PRNG;
  private sceneBuilder!: SceneBuilder;
  // private lodController!: LODController; // If LOD used
  private atmosphereSystem!: AtmosphereSystem;
  private testDrive: TestDrive | null = null;
  
  private worldModel: WorldModel | null = null;
  private lastFrameTime: number = 0;
  private kartPhysics: any = null; // Reference to KartPhysics instance for controlling normals

  constructor(containerId: string = 'container') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found.`);
    }

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = currentConfig.rendering.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct colors
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500); // Match background, start, end

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(
        currentConfig.world.gridSize[0] * 0.5, // Centered X
        50,                                     // Elevated Y
        currentConfig.world.gridSize[1] * 0.75  // Slightly offset Z for better initial view
    );
    this.camera.lookAt(currentConfig.world.gridSize[0] / 2, 0, currentConfig.world.gridSize[1] / 2);


    // Controls
    this.controls = setupOrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(currentConfig.world.gridSize[0] / 2, 0, currentConfig.world.gridSize[1] / 2);
    this.controls.update();


    // Stats
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    // LOD Controller (if used)
    // this.lodController = new LODController(this.camera);

    // Initial world generation
    this.regenerateWorld();

    // UI
    setupGUI(this); // Pass engine instance for callbacks

    // Post-processing
    this.setupPostProcessing();


    // Event Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Start animation loop
    this.animate();
  }

  public regenerateWorld(): void {
    console.log("Regenerating world with seed:", currentConfig.seed);
    this.prng = new PRNG(currentConfig.seed);

    // --- Procedural Generation Stack ---
    // 1. Height Pass
    const heightMap = new HeightMap(currentConfig, this.prng);

    // 2. Surface-Type Pass (placeholders, data would be generated here)
    // const altitudeMapper = new AltitudeMapper(currentConfig);
    // const surfaceNoise = new SurfaceNoise(this.prng, currentConfig.surfaces.noise.amplitude, currentConfig.surfaces.noise.scale);
    // const splatPainter = new SplatPainter(currentConfig);
    // This would produce splatMap textures/data.

    // 3. Track Pass
    const trackPath = new TrackPath(currentConfig.track);
    // TODO: Track crossing detection & bridge/tunnel elevation adjustments
    // const bridgeSolver = new BridgeSolver(trackPath);
    // const intersections = bridgeSolver.findIntersections();
    // bridgeSolver.resolveCrossings(intersections); // This would modify trackPath spec

    // (Object scatter pass is part of SceneBuilder for now, could be separated)

    this.worldModel = {
      heightMap,
      trackPath,
      // ... other generated data like splat maps ...
    };

    // Setup fog
    this.scene.fog = new THREE.Fog(0x87CEEB, Math.max(...currentConfig.world.gridSize) * 0.4, Math.max(...currentConfig.world.gridSize) * 2);
    
    // Set up atmosphere system first, as it manages lights and sky
    if (!this.atmosphereSystem) {
      this.atmosphereSystem = new AtmosphereSystem(this.scene, currentConfig.atmosphere);
    } else {
      // Dispose old atmosphere system resources
      this.atmosphereSystem.dispose();
      this.atmosphereSystem = new AtmosphereSystem(this.scene, currentConfig.atmosphere);
    }
    
    // Scene Graph Builder
    if (!this.sceneBuilder) {
      this.sceneBuilder = new SceneBuilder(this.scene, currentConfig, this.prng /*, this.lodController */);
    } else {
      // Update config if it's a new one (e.g. from reset)
      // This is a bit tricky, SceneBuilder might need to be reinstantiated or have a setConfig method
      // For now, SceneBuilder uses currentConfig directly.
    }
    
    this.sceneBuilder.buildScene(this.worldModel);
    
    // Update renderer shadow map setting if changed
    this.renderer.shadowMap.enabled = currentConfig.rendering.shadows;
    
    // Initialize test drive with the new track
    if (this.testDrive) {
      this.testDrive.dispose();
    }
    this.testDrive = new TestDrive(this.scene, this.camera, this.controls, this.worldModel.trackPath);
    
    // Create a temporary KartPhysics instance just for normal visualization if debug is enabled
    if (currentConfig.debug?.showNormals && !this.kartPhysics) {
      // Create kart at track starting point
      const startPosition = this.worldModel.trackPath.getPointAt(0);
      startPosition.y += 0.3; // Lift slightly above ground
      
      // Create KartPhysics for normals
      this.kartPhysics = new KartPhysics(this.scene, startPosition);
      
      // Ensure it's visible
      if (this.kartPhysics.setNormalsVisible) {
        this.kartPhysics.setNormalsVisible(true);
      }
      
      // If we have a height map, update the normal positions
      if (this.worldModel.heightMap && this.kartPhysics.updateNormalHelperPositions) {
        this.kartPhysics.updateNormalHelperPositions(this.worldModel.heightMap);
      }
      
      // Hide the chassis - we only want the normals
      if (this.kartPhysics.chassis) {
        this.kartPhysics.chassis.visible = false;
      }
    }
    
    // Initialize frame time for animation
    this.lastFrameTime = Date.now();
  }
  
  public setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (currentConfig.rendering.bloom.enabled) {
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            currentConfig.rendering.bloom.strength,
            currentConfig.rendering.bloom.radius,
            currentConfig.rendering.bloom.threshold
        );
        this.composer.addPass(this.bloomPass);
    } else {
        this.bloomPass = null; // Ensure it's cleared if disabled
    }

    // SSAA Pass (optional, performance heavy)
    // if (config.rendering.ssaa.enabled) {
    //   const ssaaPass = new SSAARenderPass(this.scene, this.camera);
    //   ssaaPass.sampleLevel = config.rendering.ssaa.sampleLevel;
    //   this.composer.addPass(ssaaPass);
    // }

    const outputPass = new OutputPass(); // Handles sRGB encoding if needed (renderer already does)
    this.composer.addPass(outputPass);
  }

  public updateBloomPass(): void {
    if (this.bloomPass && currentConfig.rendering.bloom.enabled) {
        this.bloomPass.strength = currentConfig.rendering.bloom.strength;
        this.bloomPass.radius = currentConfig.rendering.bloom.radius;
        this.bloomPass.threshold = currentConfig.rendering.bloom.threshold;
    } else if (this.bloomPass && !currentConfig.rendering.bloom.enabled) {
        // Need to rebuild composer if a pass is removed.
        // Simpler: just enable/disable the existing bloom pass if possible, or rebuild.
        this.setupPostProcessing(); // Rebuild to remove/add bloom
    } else if (!this.bloomPass && currentConfig.rendering.bloom.enabled) {
        this.setupPostProcessing(); // Rebuild to add bloom
    }
  }
  
  /**
   * Set time of day (hour: 0-24)
   */
  public setTimeOfDay(hour: number): void {
    if (this.atmosphereSystem) {
      this.atmosphereSystem.setTimeOfDay(hour);
    }
  }
  
  /**
   * Get current time of day
   */
  public getTimeOfDay(): number {
    if (this.atmosphereSystem) {
      return this.atmosphereSystem.getTimeOfDay();
    }
    return currentConfig.atmosphere.time.startTimeOfDay;
  }
  
  /**
   * Set time speed multiplier
   */
  public setTimeMultiplier(multiplier: number): void {
    if (this.atmosphereSystem) {
      this.atmosphereSystem.setTimeMultiplier(multiplier);
    }
  }
  
  /**
   * Set auto time progression
   */
  public setAutoTimeProgression(enabled: boolean): void {
    if (this.atmosphereSystem) {
      this.atmosphereSystem.setAutoTimeProgression(enabled);
    }
  }
  
  /**
   * Update weather settings
   */
  public updateWeather(type: string, intensity: number): void {
    if (this.atmosphereSystem) {
      this.atmosphereSystem.updateWeather(type as any, intensity);
    }
  }
  
  /**
   * Update sky settings
   */
  public updateSkySettings(sunIntensity: number, moonIntensity: number, starsIntensity?: number): void {
    if (this.atmosphereSystem) {
      this.atmosphereSystem.updateSkySettings(sunIntensity, moonIntensity, starsIntensity);
    }
  }
  
  /**
   * Start test drive mode
   */
  public startTestDrive(): void {
    if (this.testDrive && this.worldModel?.heightMap) {
      this.testDrive.start(this.worldModel.heightMap);
      
      // Get reference to new kart physics
      const newKartPhysics = this.testDrive.getKartPhysics();
      
      // If we already had a separate KartPhysics for normals, dispose it
      if (this.kartPhysics && this.kartPhysics !== newKartPhysics) {
        this.kartPhysics.dispose(this.scene);
        this.kartPhysics = null;
      }
      
      // Set new kart physics
      this.kartPhysics = newKartPhysics;
      
      // Apply current normal settings
      if (this.kartPhysics && currentConfig.debug) {
        this.kartPhysics.setNormalsVisible(currentConfig.debug.showNormals);
      }
    }
  }
  
  /**
   * Stop test drive mode
   */
  public stopTestDrive(): void {
    if (this.testDrive) {
      // Get kart physics reference before stopping test drive
      const kartPhysics = this.testDrive.getKartPhysics();
      
      // Stop test drive
      this.testDrive.stop();
      
      // If we should keep showing normals, create a new visualization-only KartPhysics
      if (currentConfig.debug?.showNormals && this.worldModel?.trackPath && this.worldModel?.heightMap) {
        // Keep reference to existing kart physics before it's disposed
        this.kartPhysics = kartPhysics;
        
        // Hide the kart chassis but keep normals visible
        if (this.kartPhysics.chassis) {
          this.kartPhysics.chassis.visible = false;
        }
      }
    }
  }
  
  /**
   * Check if test drive is active
   */
  public getTestDriveActive(): boolean {
    return this.testDrive?.isActive() || false;
  }
  
  /**
   * Set visibility of normal vectors
   */
  public setNormalsVisibility(visible: boolean): void {
    // Update config
    if (!currentConfig.debug) {
      currentConfig.debug = {
        showNormals: visible,
        normalInterval: 10
      };
    } else {
      currentConfig.debug.showNormals = visible;
    }
    
    // Get reference to kart physics from test drive if available
    if (this.testDrive) {
      this.kartPhysics = this.testDrive.getKartPhysics();
    }
    
    // Update visibility if kart physics exists
    if (this.kartPhysics && this.kartPhysics.setNormalsVisible) {
      this.kartPhysics.setNormalsVisible(visible);
    }
    
    // Create surface normals if they don't exist yet and should be visible
    if (visible && this.worldModel?.heightMap && this.kartPhysics && !this.kartPhysics.normalHelpers?.length) {
      this.kartPhysics.createNormalHelpers(this.scene, this.worldModel.heightMap);
    }
  }
  
  /**
   * Update normal grid spacing
   */
  public updateNormalSpacing(spacing: number): void {
    // Update config
    if (!currentConfig.debug) {
      currentConfig.debug = {
        showNormals: true,
        normalInterval: spacing
      };
    } else {
      currentConfig.debug.normalInterval = spacing;
    }
    
    // Get reference to kart physics
    if (this.testDrive) {
      this.kartPhysics = this.testDrive.getKartPhysics();
    }
    
    // Recreate normals with new spacing if kart physics exists
    if (this.kartPhysics && this.worldModel?.heightMap) {
      if (this.kartPhysics.updateNormalSpacing) {
        this.kartPhysics.updateNormalSpacing(spacing, this.scene, this.worldModel.heightMap);
      }
    }
  }


  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (this.bloomPass) {
        this.bloomPass.setSize(window.innerWidth, window.innerHeight);
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.stats.begin();

    // Calculate delta time for physics
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;

    // Update orbit controls if not in test drive mode
    if (!this.testDrive?.isActive()) {
      this.controls.update(); // For damping
    }
    
    // Update TestDrive if available
    if (this.testDrive && this.worldModel?.heightMap) {
      this.testDrive.update(deltaTime, this.worldModel.heightMap);
    } else {
      // If test drive is not active but we have a KartPhysics for normals, update it
      if (this.kartPhysics && !this.testDrive?.isActive() && this.worldModel?.heightMap) {
        // Just update the debug helpers
        if (this.kartPhysics.updateDebugHelpers && currentConfig.debug?.showNormals) {
          this.kartPhysics.updateDebugHelpers(this.worldModel.heightMap);
        }
      }
    }
    
    // this.lodController.update(); // Update LODs based on camera position
    
    // Update atmosphere system (time of day, weather effects)
    if (this.atmosphereSystem) {
      this.atmosphereSystem.update();
    }

    // Any other per-frame updates
    // e.g., if water material uniforms need uTime for animation:
    const waterMesh = this.scene.getObjectByName("WaterPlane") as THREE.Mesh;
    if (waterMesh && waterMesh.material instanceof THREE.ShaderMaterial) {
        waterMesh.material.uniforms.uTime.value += 0.01; // Example time update
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.stats.end();
  }
}
