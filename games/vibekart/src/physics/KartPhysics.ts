import * as THREE from 'three';
import { currentConfig } from '../core/Config';
import { TrackPath } from '../generation/Track/Spline';

/**
 * KartWheel - represents a wheel of the kart with physics properties
 */
interface KartWheel {
  mesh: THREE.Mesh;
  connection: THREE.Object3D; // Connection point to chassis (for steering)
  radius: number;
  suspensionRestLength: number;
  suspensionTravel: number;
  suspensionStiffness: number;
  dampingCompression: number;
  dampingRelaxation: number;
  isFrontWheel: boolean;
  contactPoint: THREE.Vector3;
  contactNormal: THREE.Vector3;
  onGround: boolean;
}

/**
 * KartPhysics - handles physics simulation for the kart
 */
export class KartPhysics {
  // Kart components
  public chassis!: THREE.Group;
  public wheels!: KartWheel[];
  
  // Physics properties
  private mass!: number;
  private position!: THREE.Vector3;
  public velocity!: THREE.Vector3; // Made public for sound system
  private acceleration!: THREE.Vector3;
  private rotation!: THREE.Euler;
  private angularVelocity!: THREE.Vector3;
  
  // Vehicle dynamics - simplified arcade physics
  private engineForce: number = 0;
  private brakeForce: number = 0;
  private steeringAngle: number = 0;
  private maxSteeringAngle: number = Math.PI / 6; // 30 degrees
  private maxEngineForce: number = 3000; // Balanced acceleration
  private maxBrakeForce: number = 500;
  private dragCoefficient: number = 0.15;
  private rollingResistance: number = 0.08;
  private timeInAir: number = 0;
  private terminalVelocity: number = 30.0; // Max speed in m/s
  
  // Physics constants
  private gravity: THREE.Vector3 = new THREE.Vector3(0, -9.81, 0);
  private groundNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private normalHelpers: THREE.ArrowHelper[] = [];
  private kartNormalHelper: THREE.ArrowHelper | null = null;
  
  // Surface properties
  private surfaceFriction: number = 1.0;
  private turnSpeed: number = 1.2; // Faster turning for arcade feel
  
  // Bounce detection
  private bounceThreshold: number = 1.0; // Vertical velocity threshold for bounce sound
  private lastBounceTime: number = 0; // Time of last bounce sound
  private bounceDebounceTime: number = 0.3; // Minimum time between bounce sounds
  public hasBouncedThisFrame: boolean = false; // Flag for sound system
  
  // Visual elements
  private brakeLights: THREE.Mesh[] | null = null;
  
  // Debug settings
  private debugNormals: boolean = false; // Start with normals disabled
  private debugInterval: number = 10; // Interval between normal vectors in meters
  
  constructor(scene: THREE.Scene, position: THREE.Vector3, trackPath?: TrackPath) {
    this.mass = 400; // kg - balance between responsive and stable
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.angularVelocity = new THREE.Vector3();
    this.trackPath = trackPath || null;
    
    // Create the kart mesh and add it to the scene
    this.createKartMesh();
    scene.add(this.chassis);
    
    // Position kart
    this.chassis.position.copy(position);
    
    // Check if debug normals should be enabled from config
    if (currentConfig.debug && currentConfig.debug.showNormals !== undefined) {
      this.debugNormals = currentConfig.debug.showNormals;
    }
    
    if (currentConfig.debug && currentConfig.debug.normalInterval !== undefined) {
      this.debugInterval = currentConfig.debug.normalInterval;
    }
    
    // Initialize kart normal debug helper
    if (this.debugNormals) {
      this.initializeDebugHelpers(scene);
    }
  }
  
  /**
   * Initialize debug visualization helpers
   */
  private initializeDebugHelpers(scene: THREE.Scene) {
    // Create kart normal helper
    const normalLength = 3;
    const normalColor = 0xff0000; // Red for kart normal
    this.kartNormalHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      normalLength,
      normalColor
    );
    scene.add(this.kartNormalHelper);
    
    // Create surface normal helpers on a grid
    // Reduced grid density to improve performance
    const gridSize = 200; // Increased to cover more area
    const gridStep = this.debugInterval * 2; // Double the interval for fewer arrows
    const surfaceNormalColor = 0x00ff00; // Green for surface normals
    
    // Clear any existing normal helpers
    for (const helper of this.normalHelpers) {
      scene.remove(helper);
    }
    this.normalHelpers = [];
    
    console.log(`Creating normal grid with size ${gridSize}, step ${gridStep}`);
    
    // Add debug grid only in specific regions to avoid filling the entire map
    // This focuses visualization on the most important areas
    for (let x = -gridSize; x <= gridSize; x += gridStep) {
      for (let z = -gridSize; z <= gridSize; z += gridStep) {
        // Position arrows at correct height based on terrain height map
        let y = 0;
        if (this.getHeightAtPosition) {
          y = this.getHeightAtPosition(x, z, null);
        }
        
        const normalHelper = new THREE.ArrowHelper(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(x, y, z),
          normalLength,
          surfaceNormalColor
        );
        this.normalHelpers.push(normalHelper);
        scene.add(normalHelper);
      }
    }
    
    console.log(`Created ${this.normalHelpers.length} normal helpers`);
  }
  
  /**
   * Update debug visualization helpers
   */
  private updateDebugHelpers(heightMap: any) {
    if (!this.debugNormals) return;
    
    // Update kart normal helper
    if (this.kartNormalHelper) {
      // Get local up vector from kart
      const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.chassis.quaternion);
      this.kartNormalHelper.position.copy(this.chassis.position);
      this.kartNormalHelper.position.y += 1.5; // Position above kart
      this.kartNormalHelper.setDirection(localUp);
      
      // Set longer length for better visibility
      this.kartNormalHelper.setLength(3.0);
      
      // Highlight kart normal if it doesn't match ground normal
      // This helps identify alignment issues
      const groundNormalAtKart = this.getGroundNormalAtPosition(
        this.chassis.position.x, this.chassis.position.z, heightMap
      );
      
      // Check alignment by dot product (1.0 = perfect alignment)
      const alignment = localUp.dot(groundNormalAtKart);
      
      // Color based on alignment: 
      // - Red when misaligned (dot product < 0.9)
      // - Yellow when partially aligned (0.9-0.98)
      // - Green when well aligned (> 0.98)
      if (alignment < 0.9) {
        (this.kartNormalHelper as THREE.ArrowHelper).setColor(0xff0000); // Red
      } else if (alignment < 0.98) {
        (this.kartNormalHelper as THREE.ArrowHelper).setColor(0xffff00); // Yellow
      } else {
        (this.kartNormalHelper as THREE.ArrowHelper).setColor(0x00ff00); // Green
      }
      
      // Debug output for ground normal vs kart normal
      console.log(`Kart position: (${this.chassis.position.x.toFixed(1)}, ${this.chassis.position.y.toFixed(1)}, ${this.chassis.position.z.toFixed(1)})`);
      console.log(`Ground normal: (${groundNormalAtKart.x.toFixed(2)}, ${groundNormalAtKart.y.toFixed(2)}, ${groundNormalAtKart.z.toFixed(2)})`);
      console.log(`Kart up: (${localUp.x.toFixed(2)}, ${localUp.y.toFixed(2)}, ${localUp.z.toFixed(2)})`);
      console.log(`Alignment: ${alignment.toFixed(3)}`);
    }
    
    // Update surface normal helpers
    if (heightMap && heightMap.getHeightAt) {
      // Increased update radius to show more normals
      const kartX = this.chassis.position.x;
      const kartZ = this.chassis.position.z;
      const updateRadius = 50; // Increased from 30 to 50
      
      // Count how many normals are updated for debugging
      let updatedCount = 0;
      
      // Update all normals in the scene to ensure visibility
      for (const helper of this.normalHelpers) {
        const x = helper.position.x;
        const z = helper.position.z;
        
        // Calculate distance to kart
        const distToKart = Math.sqrt(Math.pow(x - kartX, 2) + Math.pow(z - kartZ, 2));
        
        // Make all helpers visible but with different intensities based on distance
        const isNearKart = distToKart <= updateRadius;
        
        try {
          // Always update height for all helpers
          const height = heightMap.getHeightAt(x, z);
          
          // Apply terrain height to the helper position
          if (Math.abs(helper.position.y - height) > 0.1) {
            helper.position.y = height;
          }
          
          // Get the surface normal at this position
          const normal = this.getGroundNormalAtPosition(x, z, heightMap);
          
          // Set helper direction to match surface normal
          helper.setDirection(normal);
          
          // Visualize normals differently based on distance to kart
          if (isNearKart) {
            updatedCount++;
            
            // Near helpers are more visible and colorful based on normal tilt
            const normalTilt = normal.y; // 1.0 = flat, 0.0 = vertical
            
            // Adjust color based on normal's Y component
            if (normalTilt < 0.8) {
              // Steeper slopes in orange-red
              const redComponent = Math.floor(255 * (1.0 - normalTilt / 0.8));
              const greenComponent = Math.floor(128 * (normalTilt / 0.8));
              const color = (redComponent << 16) | (greenComponent << 8);
              (helper as THREE.ArrowHelper).setColor(color);
            } else {
              // Flatter areas in green-blue
              const blueComponent = Math.floor(255 * ((normalTilt - 0.8) / 0.2));
              const greenComponent = Math.floor(128 + 127 * ((normalTilt - 0.8) / 0.2));
              const color = (greenComponent << 8) | blueComponent;
              (helper as THREE.ArrowHelper).setColor(color);
            }
            
            // Make closer helpers longer for better visibility
            const baseLength = 2.0;
            const proximityFactor = 1.0 - Math.min(1.0, distToKart / updateRadius);
            const length = baseLength * (1.0 + proximityFactor * 2);
            helper.setLength(length);
            helper.visible = true;
          } else {
            // Far helpers are gray and shorter
            helper.setColor(0x999999);
            helper.setLength(0.5);
            // Only show some far arrows based on grid position to reduce clutter
            // Show every 4th normal when far away
            helper.visible = ((Math.floor(x) % 16 === 0 && Math.floor(z) % 16 === 0));
          }
        } catch (error) {
          console.warn(`Error updating normal at (${x}, ${z}): ${error}`);
          helper.visible = false;
        }
      }
      
      // Debug output for the number of updated normals
      if (Math.random() < 0.01) { // Only log occasionally to avoid console spam
        console.log(`Updated ${updatedCount} of ${this.normalHelpers.length} normals, radius ${updateRadius}`);
      }
    }
  }
  
  /**
   * Create the kart mesh with wheels
   */
  private createKartMesh() {
    // Create chassis
    this.chassis = new THREE.Group();
    this.chassis.name = 'Kart';
    
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2277cc });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4; // Lift body above wheels
    body.castShadow = true;
    body.receiveShadow = true;
    this.chassis.add(body);
    
    // Driver area
    const cockpitGeometry = new THREE.BoxGeometry(0.5, 0.25, 0.7);
    const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(-0.2, 0.7, 0); // Place at the back of the body
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    this.chassis.add(cockpit);
    
    // Front nose
    const noseGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.6);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x2277cc });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0.55, 0.3, 0); // Place at the front of the body
    nose.castShadow = true;
    nose.receiveShadow = true;
    this.chassis.add(nose);
    
    // Create wheels
    this.wheels = [];
    
    // Wheel positions
    const wheelPositions = [
      new THREE.Vector3(0.5, 0.2, 0.4),  // Front right
      new THREE.Vector3(0.5, 0.2, -0.4), // Front left
      new THREE.Vector3(-0.5, 0.2, 0.4), // Rear right
      new THREE.Vector3(-0.5, 0.2, -0.4) // Rear left
    ];
    
    // Wheels are oriented with axle along Z axis by default
    
    // Create four wheels
    for (let i = 0; i < 4; i++) {
      const isFrontWheel = i < 2;
      const wheelRadius = 0.2;
      
      // Create wheel geometry - a cylinder should be aligned so its axis runs through the axle
      // By default, THREE.CylinderGeometry has its axis along the Y-axis
      // We need the axis to go from left to right (along the Z-axis)
      // So we rotate the cylinder 90 degrees around the X-axis
      const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.1, 16);
      wheelGeometry.rotateX(Math.PI / 2);
      
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      
      // Create a connection point for the wheel (for steering)
      const connection = new THREE.Object3D();
      connection.position.copy(wheelPositions[i]);
      this.chassis.add(connection);
      
      // We don't need special orientation for left wheels,
      // as we'll handle rotation direction separately
      
      connection.add(wheel);
      
      // Add wheel to wheels array
      this.wheels.push({
        mesh: wheel,
        connection: connection,
        radius: wheelRadius,
        suspensionRestLength: 0.2, // Simple suspension height
        suspensionTravel: 0.1, // More travel for less bounciness
        suspensionStiffness: 30.0, // Increased stiffness for better ground contact
        dampingCompression: 7.0, // Increased compression damping to reduce bouncing
        dampingRelaxation: 6.0, // Slightly increased relaxation damping
        isFrontWheel: isFrontWheel,
        contactPoint: new THREE.Vector3(),
        contactNormal: new THREE.Vector3(0, 1, 0),
        onGround: false
      });
    }
    
    // Create brake lights
    this.createBrakeLights();
  }
  
  /**
   * Create brake lights for the kart
   */
  private createBrakeLights() {
    // Create brake light materials (standard material for emissive properties)
    const brakeLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x330000, // Dull red when off
      emissive: 0x330000,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.5
    });
    
    // Create two brake lights
    this.brakeLights = [];
    
    // Left brake light
    const leftBrakeLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.08, 0.15),
      brakeLightMaterial.clone()
    );
    leftBrakeLight.position.set(-0.6, 0.4, -0.3);
    leftBrakeLight.castShadow = true;
    leftBrakeLight.receiveShadow = true;
    this.chassis.add(leftBrakeLight);
    this.brakeLights.push(leftBrakeLight);
    
    // Right brake light
    const rightBrakeLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.08, 0.15),
      brakeLightMaterial.clone()
    );
    rightBrakeLight.position.set(-0.6, 0.4, 0.3);
    rightBrakeLight.castShadow = true;
    rightBrakeLight.receiveShadow = true;
    this.chassis.add(rightBrakeLight);
    this.brakeLights.push(rightBrakeLight);
  }
  
  /**
   * Set kart controls
   */
  public setControls(throttle: number, braking: number, steering: number) {
    // Handle reversing - use braking input for reverse when already stopped
    const speed = this.velocity.length();
    const forwardSpeed = new THREE.Vector3(1, 0, 0)
      .applyEuler(this.chassis.rotation)
      .dot(this.velocity);
    
    if (braking > 0.1) {
      if (speed < 0.5 || forwardSpeed < -0.1) {
        // If nearly stopped or already going backward, use reverse
        this.engineForce = -braking * this.maxEngineForce * 0.5; // Half power for reverse
        this.brakeForce = 0;
      } else {
        // Otherwise apply brakes
        this.engineForce = 0;
        this.brakeForce = braking * this.maxBrakeForce;
      }
    } else {
      // Normal forward throttle
      this.engineForce = throttle * this.maxEngineForce;
      this.brakeForce = 0;
    }
    
    // Steering angle - apply maximum angle but ensure it's tighter (more responsive)
    this.steeringAngle = steering * this.maxSteeringAngle;
    
    // Apply steering to front wheels (negative to get correct steering direction)
    for (const wheel of this.wheels) {
      if (wheel.isFrontWheel) {
        wheel.connection.rotation.y = -this.steeringAngle;
      }
    }
    
    // Update brake lights
    this.updateBrakeLights(braking > 0.1 || (throttle < 0.1 && forwardSpeed > 0.5));
  }
  
  /**
   * Update brake lights based on braking status
   */
  private updateBrakeLights(isBraking: boolean): void {
    // Ensure brake lights exist
    if (!this.brakeLights) {
      this.createBrakeLights();
    }
    
    // Update brightness
    if (this.brakeLights) {
      for (const light of this.brakeLights) {
        if (light instanceof THREE.Mesh && light.material instanceof THREE.MeshStandardMaterial) {
          // Set to bright red when braking, dull red when not
          light.material.emissive.setHex(isBraking ? 0xff0000 : 0x330000);
          light.material.emissiveIntensity = isBraking ? 1.0 : 0.3;
          light.material.color.setHex(isBraking ? 0xff0000 : 0x330000);
          light.material.needsUpdate = true;
        }
      }
    }
  }
  
  /**
   * Update kart physics - simplified for better playability
   */
  // Static variable for tracking initialization
  private static heightMapInitialized = false;
  
  public update(dt: number, heightMap?: any) {
    // Initialize heightMap-dependent structures on first update with valid height map
    if (heightMap && heightMap.getHeightAt && !KartPhysics.heightMapInitialized) {
      KartPhysics.heightMapInitialized = true;
      console.log("Height map detected - initializing terrain-dependent structures");
      // Update normal helper positions based on actual terrain heights
      this.updateNormalHelperPositions(heightMap);
    }
    
    // Get kart orientation vectors
    const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.chassis.quaternion);
    const rightDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.chassis.quaternion);
    
    // Calculate speed components
    const speed = this.velocity.length();
    const forwardSpeed = this.velocity.dot(forwardDir);
    const lateralSpeed = this.velocity.dot(rightDir);
    
    // Reset acceleration with gravity
    this.acceleration.copy(this.gravity);
    
    // Engine force (forward/backward)
    if (this.engineForce !== 0) {
      const engineAccel = forwardDir.clone().multiplyScalar(this.engineForce / this.mass);
      this.acceleration.add(engineAccel);
    }
    
    // Braking force
    if (this.brakeForce > 0 && speed > 0.1) {
      const brakeAccel = this.velocity.clone().normalize().multiplyScalar(-this.brakeForce / this.mass);
      this.acceleration.add(brakeAccel);
    }
    
    // Air drag (quadratic with speed)
    if (speed > 0.1) {
      const dragForce = this.dragCoefficient * speed * speed / this.mass;
      const dragAccel = this.velocity.clone().normalize().multiplyScalar(-dragForce);
      this.acceleration.add(dragAccel);
    }
    
    // Rolling resistance
    if (speed > 0.1) {
      const rollingForce = this.rollingResistance * 9.81;
      const rollingAccel = this.velocity.clone().normalize().multiplyScalar(-rollingForce);
      this.acceleration.add(rollingAccel);
    }
    
    // Lateral friction (prevents sliding)
    if (Math.abs(lateralSpeed) > 0.1) {
      const lateralVel = rightDir.clone().multiplyScalar(lateralSpeed);
      const frictionForce = this.surfaceFriction * 15.0; // Strong lateral grip
      const frictionAccel = lateralVel.normalize().multiplyScalar(-frictionForce);
      this.acceleration.add(frictionAccel);
    }
    
    // Update velocity
    this.velocity.add(this.acceleration.clone().multiplyScalar(dt));
    
    // Apply terminal velocity limit (separate for horizontal and vertical)
    const horizontalVelocity = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    const horizontalSpeed = horizontalVelocity.length();
    if (horizontalSpeed > this.terminalVelocity) {
      horizontalVelocity.multiplyScalar(this.terminalVelocity / horizontalSpeed);
      this.velocity.x = horizontalVelocity.x;
      this.velocity.z = horizontalVelocity.z;
    }
    
    // Simple ground collision
    const groundHeight = heightMap ? this.getHeightAtPosition(this.chassis.position.x, this.chassis.position.z, heightMap) : 0;
    
    // We'll compute an average normal from the ground under all wheels
    // This gives better terrain following than just using the center point
    const groundNormal = new THREE.Vector3(0, 1, 0);
    
    // Track how many wheels are on the ground
    let wheelsOnGround = 0;
    
    // Collect all wheel normals to compute an average
    const wheelNormals: THREE.Vector3[] = [];
    
    // Simple wheel suspension and contact check
    for (const wheel of this.wheels) {
      // Calculate wheel world position
      const wheelPos = new THREE.Vector3();
      wheel.mesh.getWorldPosition(wheelPos);
      
      // Calculate wheel height from ground
      const wheelHeight = heightMap ? this.getHeightAtPosition(wheelPos.x, wheelPos.z, heightMap) : 0;
      
      // Get ground normal at wheel position
      const wheelNormal = heightMap ? 
        this.getGroundNormalAtPosition(wheelPos.x, wheelPos.z, heightMap) : 
        new THREE.Vector3(0, 1, 0);
      
      // Check if wheel is on ground - increased tolerance for better ground contact
      const suspensionLength = wheelPos.y - wheelHeight - wheel.radius;
      wheel.onGround = suspensionLength < wheel.suspensionRestLength + 0.05; // Added tolerance for better ground detection
      
      if (wheel.onGround) {
        wheelsOnGround++;
        
        // Add suspension force - simpler model
        const compressionRatio = Math.min(1.0, (wheel.suspensionRestLength - suspensionLength) / wheel.suspensionRestLength);
        // Apply stronger suspension forces for better damping and terrain following
        const suspensionForce = compressionRatio * wheel.suspensionStiffness * 1.3;
        
        // Apply upward force along wheel normal
        const suspensionAccel = wheelNormal.clone().multiplyScalar(suspensionForce / this.mass);
        this.acceleration.add(suspensionAccel);
        
        // Store contact point and normal for visualization
        wheel.contactPoint.set(wheelPos.x, wheelHeight + wheel.radius, wheelPos.z);
        wheel.contactNormal.copy(wheelNormal);
        
        // Add to collection of wheel normals for average calculation
        wheelNormals.push(wheelNormal);
      }
    }
    
    // Calculate average normal from all wheels on ground
    if (wheelNormals.length > 0) {
      groundNormal.set(0, 0, 0);
      for (const normal of wheelNormals) {
        groundNormal.add(normal);
      }
      groundNormal.divideScalar(wheelNormals.length).normalize();
    }
    
    // Store the ground normal for debug visualization
    this.groundNormal = groundNormal.clone();
    
    // Handle ground contact and air time
    // Reset bounce flag each frame
    this.hasBouncedThisFrame = false;
    
    const now = Date.now() / 1000; // Current time in seconds

    if (wheelsOnGround === 0) {
      // Kart is airborne
      this.timeInAir += dt;
      
      // Add mild downforce when airborne to prevent excessive jumps
      // The longer in air, the stronger it gets (but with a reasonable limit)
      const airTimeFactor = Math.min(2.0, 1.0 + this.timeInAir * 0.5);
      this.acceleration.y -= 10.0 * airTimeFactor; // Simple constant downforce
      
      // When wheels are off the ground, they spin based on engine power
      if (Math.abs(this.engineForce) > 10) {
        this.updateWheelRotation(dt, Math.max(this.velocity.length(), 5));
      }
    } else {
      // Kart has at least one wheel on ground
      
      // Check for bounce sound when landing after being airborne
      if (this.timeInAir > 0.2 && Math.abs(this.velocity.y) > this.bounceThreshold) {
        // Trigger bounce sound with sufficient time between sounds
        if (now - this.lastBounceTime > this.bounceDebounceTime) {
          this.hasBouncedThisFrame = true;
          this.lastBounceTime = now;
        }
      }
      
      // On ground: reset air time tracking
      this.timeInAir = 0;
      
      // Simple downforce for stability
      const downforce = Math.min(5.0, speed * 0.2);
      this.acceleration.y -= downforce;
      
      // Align chassis to ground normal
      this.alignChassisToGround(groundNormal);
      
      // Dampen vertical velocity to reduce bouncing
      if (Math.abs(this.velocity.y) > 0.1) {
        this.velocity.y *= 0.6;
      }
    }
    
    // Apply track attraction if track path is available
    if (this.trackPath) {
      this.applyTrackAttraction(dt);
    }
    
    // Update position
    this.chassis.position.add(this.velocity.clone().multiplyScalar(dt));
    
    // Keep kart above ground
    if (this.chassis.position.y < groundHeight + 0.3) {
      this.chassis.position.y = groundHeight + 0.3;
      
      // Kill downward velocity on impact
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
    }
    
    // Apply steering with fixed rotation to prevent twisting
    if (Math.abs(this.steeringAngle) > 0.01 && wheelsOnGround > 0) {
      // Speed-based steering effectiveness
      const speedFactor = Math.min(1.0, speed / 10);
      const turnRate = this.steeringAngle * this.turnSpeed * speedFactor * dt;
      
      // Create rotation around world Y-axis (not local)
      const yAxis = new THREE.Vector3(0, 1, 0);
      const steerQuat = new THREE.Quaternion().setFromAxisAngle(yAxis, -turnRate);
      
      // Apply steering rotation
      this.chassis.quaternion.premultiply(steerQuat);
      this.chassis.quaternion.normalize();
    }
    
    // Rotate wheels based on speed
    this.updateWheelRotation(dt, speed);
    
    // Update debug helpers
    if (this.debugNormals && heightMap) {
      this.updateDebugHelpers(heightMap);
    }
  }
  
  /**
   * Update wheel rotation visuals - simplified to fix twisting
   */
  private updateWheelRotation(dt: number, speed: number) {
    const wheelCircumference = 2 * Math.PI * this.wheels[0].radius;
    
    // Calculate forward speed
    const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.chassis.quaternion);
    const forwardSpeed = this.velocity.dot(forwardDir);
    
    // Rotation amount based on forward speed
    const rotationAmount = (forwardSpeed / wheelCircumference) * Math.PI * 2 * dt;
    
    for (const wheel of this.wheels) {
      // Update steering angle for front wheels
      if (wheel.isFrontWheel) {
        wheel.connection.rotation.y = -this.steeringAngle;
      }
      
      // Apply wheel rotation - same direction for all wheels
      // The cylinder geometry is already oriented correctly
      wheel.mesh.rotation.z += rotationAmount;
    }
  }
  
  // Track detection for arcade-style attraction
  private trackPath: TrackPath | null = null;
  private targetTrackPosition: THREE.Vector3 = new THREE.Vector3();
  private trackAttractionStrength: number = 0.5; // How strongly to attract to track

  /**
   * Align chassis orientation to ground normal - simplified and fixed
   */
  private alignChassisToGround(groundNormal: THREE.Vector3) {
    // Validate normal
    if (!groundNormal || groundNormal.length() < 0.1) {
      groundNormal = new THREE.Vector3(0, 1, 0);
    }
    groundNormal.normalize();
    
    // Limit maximum tilt for arcade feel
    const worldUp = new THREE.Vector3(0, 1, 0);
    const maxTiltAngle = Math.PI / 8; // 22.5 degrees - reduced for more stability
    
    const tiltAngle = Math.acos(Math.max(-1, Math.min(1, groundNormal.dot(worldUp))));
    
    if (tiltAngle > maxTiltAngle) {
      const tiltAxis = new THREE.Vector3().crossVectors(worldUp, groundNormal).normalize();
      groundNormal.copy(worldUp).applyAxisAngle(tiltAxis, maxTiltAngle);
    }
    
    // Get current forward direction (local X axis in world space)
    const currentForward = new THREE.Vector3(1, 0, 0).applyQuaternion(this.chassis.quaternion).normalize();
    
    // Project forward onto the plane perpendicular to ground normal
    const projectedForward = currentForward.clone()
      .sub(groundNormal.clone().multiplyScalar(currentForward.dot(groundNormal)))
      .normalize();
    
    // Calculate right vector
    const rightVector = new THREE.Vector3().crossVectors(groundNormal, projectedForward).normalize();
    
    // Recalculate forward to ensure orthogonality
    const finalForward = new THREE.Vector3().crossVectors(rightVector, groundNormal).normalize();
    
    // Build rotation matrix
    const m = new THREE.Matrix4();
    m.makeBasis(finalForward, groundNormal, rightVector);
    
    // Convert to quaternion
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(m);
    
    // Apply with smooth interpolation
    this.chassis.quaternion.slerp(targetQuaternion, 0.15); // Smoother adaptation
  }
  
  /**
   * Get the height of the terrain at a given position
   */
  private getHeightAtPosition(x: number, z: number, heightMap: any): number {
    // This function should use the height map to get the terrain height
    // For now, we'll return a simple value
    if (heightMap && heightMap.getHeightAt) {
      return heightMap.getHeightAt(x, z);
    }
    return 0;
  }
  
  /**
   * Update positions of normal helpers when terrain is available
   * This should be called once when the height map becomes available
   */
  public updateNormalHelperPositions(heightMap: any): void {
    if (!this.debugNormals || !heightMap || !heightMap.getHeightAt) return;
    
    console.log("Updating initial positions of all normal helpers");
    
    // Update all normal helper positions based on terrain height
    let updated = 0;
    for (const helper of this.normalHelpers) {
      try {
        const x = helper.position.x;
        const z = helper.position.z;
        
        // Get terrain height at this position
        const height = heightMap.getHeightAt(x, z);
        
        // Update helper position
        if (!isNaN(height)) {
          helper.position.y = height;
          updated++;
        }
      } catch (error) {
        console.warn(`Error updating normal helper position: ${error}`);
      }
    }
    
    console.log(`Updated positions of ${updated} normal helpers based on terrain height`);
    
    // Immediately update normals
    this.updateDebugHelpers(heightMap);
  }
  
  /**
   * Calculate surface normal using a simplified finite difference approach
   * Fixed to use smaller delta for better accuracy and avoid terrain sampling issues
   */
  private getGroundNormalAtPosition(x: number, z: number, heightMap: any): THREE.Vector3 {
    if (!heightMap || !heightMap.getHeightAt) {
      return new THREE.Vector3(0, 1, 0);
    }
    
    try {
      // Use smaller sampling delta for more accurate normals
      const delta = 0.5;
      
      // Sample heights at center and four surrounding points
      const h  = heightMap.getHeightAt(x, z);
      const hL = heightMap.getHeightAt(x - delta, z);
      const hR = heightMap.getHeightAt(x + delta, z);
      const hF = heightMap.getHeightAt(x, z + delta);
      const hB = heightMap.getHeightAt(x, z - delta);
      
      // Check for invalid data
      if (isNaN(h) || isNaN(hL) || isNaN(hR) || isNaN(hF) || isNaN(hB)) {
        return new THREE.Vector3(0, 1, 0);
      }
      
      // Calculate partial derivatives using central differences
      const dHdX = (hR - hL) / (2 * delta);
      const dHdZ = (hF - hB) / (2 * delta);
      
      // Calculate normal vector using cross product method for consistency
      // Tangent in X direction: (1, dHdX, 0)
      // Tangent in Z direction: (0, dHdZ, 1)
      // Normal = TangentX × TangentZ
      const normal = new THREE.Vector3(-dHdX, 1, -dHdZ).normalize();
      
      // Ensure normal points upward
      if (normal.y < 0) {
        normal.negate();
      }
      
      // Validate result
      if (isNaN(normal.x) || isNaN(normal.y) || isNaN(normal.z) || normal.length() < 0.1) {
        return new THREE.Vector3(0, 1, 0);
      }
      
      return normal;
    } catch (error) {
      // Fallback to default up vector
      return new THREE.Vector3(0, 1, 0);
    }
  }
  
  /**
   * Reset kart position
   */
  public reset(position: THREE.Vector3) {
    this.position.copy(position);
    this.chassis.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.chassis.rotation.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.engineForce = 0;
    this.brakeForce = 0;
    this.steeringAngle = 0;
    
    // Reset wheel rotations
    for (const wheel of this.wheels) {
      if (wheel.isFrontWheel) {
        wheel.connection.rotation.y = 0;
      }
      wheel.mesh.rotation.z = 0; // Reset rotation around Z axis (wheel's rotation axis)
    }
    
    // Reset brake lights to off state
    this.updateBrakeLights(false);
  }
  
  /**
   * Set visibility of normal vectors
   */
  public setNormalsVisible(visible: boolean): void {
    this.debugNormals = visible;
    
    // Update kart normal helper visibility
    if (this.kartNormalHelper) {
      this.kartNormalHelper.visible = visible;
    }
    
    // Update all normal helpers visibility
    for (const helper of this.normalHelpers) {
      helper.visible = visible;
    }
  }
  
  /**
   * Create normal helpers for debug visualization
   * This is called when visualization is enabled but helpers don't exist yet
   */
  public createNormalHelpers(scene: THREE.Scene, heightMap: any): void {
    // Initialize debug helpers if needed
    if (this.normalHelpers.length === 0) {
      this.initializeDebugHelpers(scene);
    }
    
    // If height map is available, update normal positions
    if (heightMap && heightMap.getHeightAt) {
      this.updateNormalHelperPositions(heightMap);
    }
  }
  
  /**
   * Update normal spacing (grid density)
   */
  public updateNormalSpacing(spacing: number, scene: THREE.Scene, heightMap: any): void {
    // Update interval
    this.debugInterval = spacing;
    
    // Remove existing helpers
    for (const helper of this.normalHelpers) {
      scene.remove(helper);
    }
    this.normalHelpers = [];
    
    // Recreate with new spacing
    this.initializeDebugHelpers(scene);
    
    // Update positions based on heightmap
    if (heightMap && heightMap.getHeightAt) {
      this.updateNormalHelperPositions(heightMap);
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(scene: THREE.Scene) {
    // Remove debug helpers
    if (this.kartNormalHelper) {
      scene.remove(this.kartNormalHelper);
    }
    
    for (const helper of this.normalHelpers) {
      scene.remove(helper);
    }
    
    this.normalHelpers = [];
    this.kartNormalHelper = null;
  }
  
  /**
   * Apply track attraction force - pulls kart towards track when far away
   */
  private applyTrackAttraction(dt: number) {
    if (!this.trackPath) return;
    
    // Find closest point on track
    const kartPos = this.chassis.position;
    let closestDistance = Infinity;
    let closestT = 0;
    
    // Sample track at intervals to find closest point
    const samples = 100;
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const trackPoint = this.trackPath.getPointAt(t);
      trackPoint.y = kartPos.y; // Ignore vertical distance
      
      const distance = kartPos.distanceTo(trackPoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestT = t;
      }
    }
    
    // Get the closest point and track width
    const closestPoint = this.trackPath.getPointAt(closestT);
    const trackWidth = this.trackPath.getWidthAt(closestT);
    
    // Only apply attraction if kart is off the track
    if (closestDistance > trackWidth * 0.5) {
      // Calculate attraction force
      const attractionDir = closestPoint.clone().sub(kartPos);
      attractionDir.y = 0; // Only horizontal attraction
      attractionDir.normalize();
      
      // Stronger attraction the further from track
      const distanceFromTrack = closestDistance - trackWidth * 0.5;
      const attractionMagnitude = Math.min(distanceFromTrack * this.trackAttractionStrength * 2, 15);
      
      // Apply as acceleration
      const attractionAccel = attractionDir.multiplyScalar(attractionMagnitude);
      this.acceleration.add(attractionAccel);
      
      // Slow down when off track for arcade feel
      const offTrackDamping = 0.05;
      this.velocity.x *= (1 - offTrackDamping);
      this.velocity.z *= (1 - offTrackDamping);
    }
  }
  
  /**
   * Set the track path for attraction
   */
  public setTrackPath(trackPath: TrackPath) {
    this.trackPath = trackPath;
  }
}