import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BounceSoundEffect } from '../audio/BounceSoundEffect';
import { KartSoundManager } from '../audio/KartSoundManager';
import { TrackPath } from '../generation/Track/Spline';
import { KartPhysics } from '../physics/KartPhysics';

/**
 * TestDrive - handles the test drive mode including camera, controls, and kart
 */
export class TestDrive {
  private enabled: boolean = false;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private originalCameraPosition: THREE.Vector3;
  private originalCameraTarget: THREE.Vector3;
  private controls: OrbitControls;
  private trackPath: TrackPath;
  private kart: KartPhysics | null = null;
  private kartSoundManager: KartSoundManager | null = null;
  private bounceSound: BounceSoundEffect | null = null;
  
  // Transition animation
  private transitionStartTime: number = 0;
  private transitionDuration: number = 2000; // 2 seconds
  private inTransition: boolean = false;
  
  // Input state
  private keys: { [key: string]: boolean } = {};
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: OrbitControls, trackPath: TrackPath) {
    this.scene = scene;
    this.camera = camera;
    this.originalCameraPosition = camera.position.clone();
    this.originalCameraTarget = controls.target.clone();
    this.controls = controls;
    this.trackPath = trackPath;
    
    // Setup key listeners
    this.setupEventListeners();
  }
  
  /**
   * Start test drive mode
   */
  public start(heightMap: any): void {
    if (this.enabled) return;
    
    console.log("Starting test drive mode");
    this.enabled = true;
    
    // Save current camera position and target for later
    this.originalCameraPosition.copy(this.camera.position);
    this.originalCameraTarget.copy(this.controls.target);
    
    // Calculate starting position (beginning of track)
    const startPosition = this.getStartPosition();
    const startDirection = this.getStartDirection();
    
    // Begin camera transition
    this.inTransition = true;
    this.transitionStartTime = Date.now();
    
    // Create kart at starting position
    if (!this.kart) {
      this.kart = new KartPhysics(this.scene, startPosition, this.trackPath);
      
      // Set kart rotation to face the track direction
      const angle = Math.atan2(startDirection.z, startDirection.x);
      this.kart.chassis.rotation.y = -angle; // Negative because of coordinate system
      
      // Initialize sound managers
      this.kartSoundManager = new KartSoundManager();
      this.bounceSound = new BounceSoundEffect();
    } else {
      // Reset existing kart
      this.kart.reset(startPosition);
    }
    
    // Disable orbit controls during test drive
    this.controls.enabled = false;
  }
  
  /**
   * Stop test drive mode
   */
  public stop(): void {
    if (!this.enabled) return;
    
    console.log("Stopping test drive mode");
    this.enabled = false;
    
    // Transition camera back to original position
    this.inTransition = true;
    this.transitionStartTime = Date.now();
    
    // Pause sounds
    if (this.kartSoundManager) {
      this.kartSoundManager.pause();
    }
    
    // Enable orbit controls again
    this.controls.enabled = true;
  }
  
  /**
   * Update test drive logic
   */
  public update(dt: number, heightMap: any): void {
    if (!this.enabled && !this.inTransition) return;
    
    // Handle transition animation
    if (this.inTransition) {
      const elapsed = Date.now() - this.transitionStartTime;
      const progress = Math.min(elapsed / this.transitionDuration, 1.0);
      
      if (this.enabled) {
        // Transition to driving position
        this.updateCameraTransitionToDriving(progress);
      } else {
        // Transition back to orbit view
        this.updateCameraTransitionToOrbit(progress);
      }
      
      // End transition
      if (progress >= 1.0) {
        this.inTransition = false;
      }
      
      return;
    }
    
    // Handle kart physics and controls when in test drive mode
    if (this.enabled && this.kart) {
      // Get input from keys
      const throttle = this.keys['ArrowUp'] ? 1.0 : 0.0;
      const braking = this.keys['ArrowDown'] ? 1.0 : 0.0;
      const steering = (this.keys['ArrowLeft'] ? -1.0 : 0.0) + (this.keys['ArrowRight'] ? 1.0 : 0.0);
      
      // Apply controls to kart
      this.kart.setControls(throttle, braking, steering);
      
      // Update kart physics
      this.kart.update(dt, heightMap);
      
      // Check for bounce and play sound if needed
      if (this.bounceSound && this.kart.hasBouncedThisFrame) {
        // Calculate bounce intensity based on vertical velocity
        const bounceIntensity = Math.min(1.0, Math.abs(this.kart.velocity.y) / 5.0);
        this.bounceSound.playBounce(bounceIntensity);
      }
      
      // Update sounds based on kart state
      if (this.kartSoundManager) {
        // Get kart data for sound updates
        const speed = this.kart.velocity ? this.kart.velocity.length() : 0;
        const acceleration = throttle; // Simplified for now
        
        // Determine surface type from height map (simplified)
        // In a full implementation, you'd get the actual surface type at the kart's position
        const surfaceType = 'asphalt';
        
        // Count wheels on ground
        let wheelsOnGround = 0;
        if (this.kart.wheels) {
          for (const wheel of this.kart.wheels) {
            if (wheel.onGround) wheelsOnGround++;
          }
        }
        
        // Check if skidding - simple implementation
        const isSkidding = Math.abs(steering) > 0.8 && speed > 5;
        const skidIntensity = isSkidding ? Math.min(1.0, speed / 15) : 0;
        
        // Update sound manager
        this.kartSoundManager.update(
          dt,
          speed,
          acceleration, 
          wheelsOnGround,
          surfaceType,
          1.0, // Surface contact ratio
          isSkidding,
          skidIntensity
        );
      }
      
      // Update camera to follow kart
      this.updateFollowCamera();
    }
  }
  
  /**
   * Update camera during transition to driving
   */
  private updateCameraTransitionToDriving(progress: number): void {
    // Calculate target camera position for driving
    const targetPosition = this.calculateDrivingCameraPosition();
    const targetLookAt = this.kart?.chassis.position.clone() || this.getStartPosition();
    
    // Interpolate current position to target position
    const current = new THREE.Vector3().copy(this.originalCameraPosition);
    const target = new THREE.Vector3().copy(targetPosition);
    
    // Use easing function for smoother transition
    const eased = this.easeInOutCubic(progress);
    
    // Update camera position
    this.camera.position.lerpVectors(current, target, eased);
    
    // Update look at target
    const currentTarget = new THREE.Vector3().copy(this.originalCameraTarget);
    this.camera.lookAt(targetLookAt.lerp(currentTarget, 1.0 - eased));
  }
  
  /**
   * Update camera during transition back to orbit view
   */
  private updateCameraTransitionToOrbit(progress: number): void {
    // Calculate current driving camera position
    const currentPosition = this.calculateDrivingCameraPosition();
    
    // Interpolate to original orbit camera position
    const target = new THREE.Vector3().copy(this.originalCameraPosition);
    
    // Use easing function for smoother transition
    const eased = this.easeInOutCubic(progress);
    
    // Update camera position
    this.camera.position.lerpVectors(currentPosition, target, eased);
    
    // Update look at target
    const currentTarget = this.kart?.chassis.position.clone() || this.getStartPosition();
    const targetTarget = new THREE.Vector3().copy(this.originalCameraTarget);
    
    this.camera.lookAt(currentTarget.lerp(targetTarget, eased));
    
    // Also update orbit controls target
    this.controls.target.lerpVectors(currentTarget, targetTarget, eased);
  }
  
  /**
   * Update camera to follow the kart during driving
   */
  private updateFollowCamera(): void {
    if (!this.kart) return;
    
    // Calculate camera position based on kart position and rotation
    const offset = new THREE.Vector3(-3, 2, 0); // Behind and above the kart
    offset.applyEuler(new THREE.Euler(0, this.kart.chassis.rotation.y, 0));
    
    const targetPosition = this.kart.chassis.position.clone().add(offset);
    
    // Smoothly move camera to target position
    this.camera.position.lerp(targetPosition, 0.1);
    
    // Look at the kart
    this.camera.lookAt(this.kart.chassis.position);
  }
  
  /**
   * Calculate the driving camera position
   */
  private calculateDrivingCameraPosition(): THREE.Vector3 {
    const startPos = this.getStartPosition();
    const startDir = this.getStartDirection();
    
    // Positioning camera behind the kart
    const offset = new THREE.Vector3();
    offset.copy(startDir).multiplyScalar(-3); // 3 units behind kart
    offset.y = 2; // 2 units above ground
    
    return startPos.clone().add(offset);
  }
  
  /**
   * Get start position (beginning of track)
   */
  private getStartPosition(): THREE.Vector3 {
    // Get starting point from the track (t=0)
    const startPoint = this.trackPath.getPointAt(0);
    startPoint.y += 0.3; // Lift slightly above ground
    return startPoint;
  }
  
  /**
   * Get starting direction (tangent to track)
   */
  private getStartDirection(): THREE.Vector3 {
    // Get tangent at the starting point
    return this.trackPath.getTangentAt(0).normalize();
  }
  
  /**
   * Setup keyboard event listeners
   */
  private setupEventListeners(): void {
    // Key down event
    window.addEventListener('keydown', (event) => {
      this.keys[event.key] = true;
      
      // ESC key to exit test drive mode
      if (event.key === 'Escape' && this.enabled) {
        this.stop();
      }
    });
    
    // Key up event
    window.addEventListener('keyup', (event) => {
      this.keys[event.key] = false;
    });
  }
  
  /**
   * Cubic easing function for smooth transitions
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Check if test drive is currently active
   */
  public isActive(): boolean {
    return this.enabled;
  }
  
  /**
   * Get the KartPhysics instance - used to control normal visualization
   */
  public getKartPhysics(): any {
    return this.kart;
  }
  
  /**
   * Dispose resources when no longer needed
   */
  public dispose(): void {
    // Remove kart from scene if it exists
    if (this.kart) {
      this.scene.remove(this.kart.chassis);
    }
    
    // Dispose sound managers
    if (this.kartSoundManager) {
      this.kartSoundManager.dispose();
      this.kartSoundManager = null;
    }
    
    if (this.bounceSound) {
      this.bounceSound.dispose();
      this.bounceSound = null;
    }
    
    // Remove event listeners
    window.removeEventListener('keydown', this.setupEventListeners);
    window.removeEventListener('keyup', this.setupEventListeners);
  }
}