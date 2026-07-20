import * as THREE from 'three';
import { ExplicitObjectSpec, ScatterRule, VibekartConfig } from '../../../types/config.d';
import { PRNG } from '../../core/PRNG';
import { AltitudeMapper } from '../Surface/AltitudeMapper';
import { HeightMap } from '../Terrain/HeightMap';
import { TrackPath } from '../Track/Spline';

/**
 * Handles procedural object placement in the world
 */
export class Scatterer {
  private config: VibekartConfig;
  private prng: PRNG;
  private heightMap: HeightMap;
  private altitudeMapper: AltitudeMapper;
  private trackPath: TrackPath | null = null;
  
  // Object factories - maps object type to a function that creates a mesh
  private objectFactories: Record<string, () => THREE.Mesh>;
  
  constructor(
    config: VibekartConfig, 
    prng: PRNG, 
    heightMap: HeightMap,
    altitudeMapper: AltitudeMapper,
    trackPath?: TrackPath
  ) {
    this.config = config;
    this.prng = prng;
    this.heightMap = heightMap;
    this.altitudeMapper = altitudeMapper;
    this.trackPath = trackPath || null;
    
    // Initialize object factories
    this.objectFactories = {
      'pineTree': this.createPineTree.bind(this),
      'palmTree': this.createPalmTree.bind(this),
      'gumTree': this.createGumTree.bind(this),
      'rock': this.createRock.bind(this),
      // Add more object types as needed
    };
  }
  
  /**
   * Generate scattered objects based on rules
   */
  public generateScatteredObjects(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ScatteredObjects';
    
    // Apply each scatter rule
    for (const rule of this.config.objects.probabilistic) {
      this.applyScatterRule(rule, group);
    }
    
    // Place explicit objects
    for (const objSpec of this.config.objects.explicit) {
      const obj = this.createExplicitObject(objSpec);
      if (obj) {
        group.add(obj);
      }
    }
    
    return group;
  }
  
  /**
   * Apply a single scatter rule to generate objects
   */
  private applyScatterRule(rule: ScatterRule, parent: THREE.Group): void {
    // Check if we have a factory for this object type
    if (!this.objectFactories[rule.objectType]) {
      console.warn(`No factory found for object type: ${rule.objectType}`);
      return;
    }
    
    // Create a group for this rule
    const group = new THREE.Group();
    group.name = `Scattered_${rule.objectType}`;
    
    // Calculate number of objects based on density and world size
    const worldArea = this.config.world.gridSize[0] * this.config.world.gridSize[1];
    const targetCount = Math.floor(worldArea * rule.density);
    
    // Use instancing for efficiency if many objects
    if (targetCount > 50) {
      this.createInstancedObjects(rule, targetCount, group);
    } else {
      this.createIndividualObjects(rule, targetCount, group);
    }
    
    parent.add(group);
  }
  
  /**
   * Create individual objects for a scatter rule (for small counts)
   */
  private createIndividualObjects(rule: ScatterRule, count: number, parent: THREE.Group): void {
    let placedCount = 0;
    let attempts = 0;
    const maxAttempts = count * 10; // Limit attempts to avoid infinite loops
    const avoidTrack = rule.avoidTrack !== false; // Default to true if not specified
    
    while (placedCount < count && attempts < maxAttempts) {
      attempts++;
      
      // Random position within world bounds
      const x = this.prng.randomRange(0, this.config.world.gridSize[0]);
      const z = this.prng.randomRange(0, this.config.world.gridSize[1]);
      
      // Get height at this position
      const y = this.heightMap.getHeightAt(x, z);
      
      // Check if this position has a suitable surface type
      const surfaceType = this.altitudeMapper.getDominantSurfaceAtAltitude(y);
      if (!rule.surfaceTypes.includes(surfaceType)) {
        continue; // Skip this position
      }
      
      // Skip if we're avoiding the track and this position is on the track
      if (avoidTrack && this.isPositionOnTrack(x, z)) {
        continue;
      }
      
      // Create object
      const obj = this.objectFactories[rule.objectType]();
      
      // Position object
      obj.position.set(x, y, z);
      
      // Random rotation around Y axis
      obj.rotation.y = this.prng.randomRange(0, Math.PI * 2);
      
      // Random scale if specified
      if (rule.minScale !== undefined && rule.maxScale !== undefined) {
        const scale = this.prng.randomRange(rule.minScale, rule.maxScale);
        obj.scale.set(scale, scale, scale);
      }
      
      // Add to group
      parent.add(obj);
      placedCount++;
    }
  }
  
  /**
   * Create instanced objects for a scatter rule (for large counts)
   */
  private createInstancedObjects(rule: ScatterRule, count: number, parent: THREE.Group): void {
    console.log(`Creating ${count} instances of ${rule.objectType}`);
    
    // For trees, we'll use individual objects instead of instancing
    if (rule.objectType.includes('Tree')) {
      console.log(`Using individual placement for ${rule.objectType} instead of instancing`);
      return this.createIndividualObjects(rule, count, parent);
    }
    
    // Create a template object
    const template = this.objectFactories[rule.objectType]();
    
    // Extract geometry
    let geometry: THREE.BufferGeometry;
    if (template instanceof THREE.Mesh) {
      geometry = template.geometry;
    } else {
      console.warn(`Template for ${rule.objectType} is not a mesh - using individual placement`);
      return this.createIndividualObjects(rule, count, parent);
    }
    
    // Extract material
    let material: THREE.Material;
    if (template instanceof THREE.Mesh) {
      material = template.material as THREE.Material;
    } else {
      console.warn(`Template for ${rule.objectType} is not a mesh - using individual placement`);
      return this.createIndividualObjects(rule, count, parent);
    }
    
    // Create instanced mesh
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      count
    );
    instancedMesh.name = `Instanced_${rule.objectType}`;
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    
    // Place instances
    let placedCount = 0;
    let attempts = 0;
    const maxAttempts = count * 10; // Limit attempts to avoid infinite loops
    const avoidTrack = rule.avoidTrack !== false; // Default to true if not specified
    
    const matrix = new THREE.Matrix4();
    
    while (placedCount < count && attempts < maxAttempts) {
      attempts++;
      
      // Random position within world bounds
      const x = this.prng.randomRange(0, this.config.world.gridSize[0]);
      const z = this.prng.randomRange(0, this.config.world.gridSize[1]);
      
      // Get height at this position
      const y = this.heightMap.getHeightAt(x, z);
      
      // Check if this position has a suitable surface type
      const surfaceType = this.altitudeMapper.getDominantSurfaceAtAltitude(y);
      if (!rule.surfaceTypes.includes(surfaceType)) {
        continue; // Skip this position
      }
      
      // Skip if we're avoiding the track and this position is on the track
      if (avoidTrack && this.isPositionOnTrack(x, z)) {
        continue;
      }
      
      // Random rotation around Y axis
      const rotY = this.prng.randomRange(0, Math.PI * 2);
      
      // Random scale if specified
      let scale = 1;
      if (rule.minScale !== undefined && rule.maxScale !== undefined) {
        scale = this.prng.randomRange(rule.minScale, rule.maxScale);
      }
      
      // Create transform matrix
      matrix.makeRotationY(rotY);
      matrix.scale(new THREE.Vector3(scale, scale, scale));
      matrix.setPosition(x, y, z);
      
      // Set instance matrix
      instancedMesh.setMatrixAt(placedCount, matrix);
      placedCount++;
    }
    
    // Update instance matrix
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Add to group
    parent.add(instancedMesh);
  }
  
  /**
   * Create an explicit object from a specification
   */
  private createExplicitObject(spec: ExplicitObjectSpec): THREE.Object3D | null {
    // Check if we have a factory for this object type
    if (!this.objectFactories[spec.type]) {
      console.warn(`No factory found for object type: ${spec.type}`);
      return null;
    }
    
    // Create object
    const obj = this.objectFactories[spec.type]();
    
    // Position object
    // If Y is 0, use terrain height
    const [x, y, z] = spec.position;
    const finalY = y === 0 ? this.heightMap.getHeightAt(x, z) : y;
    obj.position.set(x, finalY, z);
    
    // Set rotation if specified
    if (spec.rotation) {
      obj.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    }
    
    // Set scale if specified
    if (spec.scale) {
      obj.scale.set(spec.scale[0], spec.scale[1], spec.scale[2]);
    }
    
    return obj;
  }
  
  /**
   * Check if a position is on or near the track
   */
  private isPositionOnTrack(x: number, z: number): boolean {
    if (!this.trackPath) {
      return false;
    }
    
    // Calculate track width with a small buffer
    const trackWidth = this.config.track.width * 1.2; // 20% buffer
    const curve = this.trackPath.curve;
    
    // Check minimum distance to the track spline
    // This is an approximation, for better performance we could use spatial partitioning
    const numSamples = 50; // More samples for higher accuracy, fewer for better performance
    let minDistance = Infinity;
    
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const point = curve.getPointAt(t);
      const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(z - point.z, 2));
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    // If distance is less than half track width, position is on track
    return minDistance < trackWidth / 2;
  }
  
  /**
   * Create a pine tree with trunk and conical foliage
   */
  private createPineTree(): THREE.Mesh {
    // SIMPLIFIED APPROACH WITH DIRECT POSITIONING
    
    // Create all trees at origin (0,0,0) with simple geometries
    const treeMesh = new THREE.Group();
    
    // Add trunk - shorter overall height (50% shorter)
    const trunkHeight = 2.5; // Reduced from 5.0
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    // Position trunk so its bottom is at y=0 and top is at y=trunkHeight
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeMesh.add(trunk);
    
    // Add foliage layers - using a single material for all
    const foliageMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1B512D,
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Bottom foliage cone - wider and taller
    const foliage1Height = 1.5;
    const foliage1 = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, foliage1Height, 8), // Wider cone
      foliageMaterial.clone()
    );
    // Position with bottom just below trunk top for overlap
    foliage1.position.y = trunkHeight + (foliage1Height / 2) - 0.2; // Slight overlap
    foliage1.castShadow = true;
    foliage1.receiveShadow = true;
    treeMesh.add(foliage1);
    
    // Middle foliage cone - starts before bottom cone ends
    const foliage2Height = 1.2;
    const foliage2 = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, foliage2Height, 8),
      foliageMaterial.clone()
    );
    // Position with overlap with bottom cone
    foliage2.position.y = trunkHeight + foliage1Height * 0.6; // Overlap by 40%
    foliage2.castShadow = true;
    foliage2.receiveShadow = true;
    treeMesh.add(foliage2);
    
    // Top foliage cone - smaller and overlapping with middle
    const foliage3Height = 1.0;
    const foliage3 = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, foliage3Height, 8), // Smaller top cone
      foliageMaterial.clone()
    );
    // Position with overlap with middle cone
    foliage3.position.y = trunkHeight + foliage1Height * 0.6 + foliage2Height * 0.6; // Overlapping
    foliage3.castShadow = true;
    foliage3.receiveShadow = true;
    treeMesh.add(foliage3);
    
    // The simplest and most reliable approach: just return the Group directly
    // This way there's no need to merge geometries and risk transformation issues
    treeMesh.castShadow = true;
    treeMesh.receiveShadow = true;
    
    // This is a hack but it works: cast the Group to Mesh to satisfy the TypeScript interface
    // In Three.js, both Group and Mesh extend Object3D so they share the same core properties
    return treeMesh as unknown as THREE.Mesh;
  }
  
  /**
   * Create a palm tree with trunk and fan leaves
   */
  private createPalmTree(): THREE.Mesh {
    // Create a group instead of merged geometry
    const treeMesh = new THREE.Group();
    
    // Define key heights
    const TRUNK_HEIGHT = 4.0;  // Shorter trunk
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.22, TRUNK_HEIGHT, 8);
    // Very slight lean to the trunk
    const trunkMatrix = new THREE.Matrix4().makeShear(0.1, 0, 0, 0, 0, 0);
    trunkGeometry.applyMatrix4(trunkMatrix);
    
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B5A2B,
      roughness: 0.9
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = TRUNK_HEIGHT / 2; // Center of trunk is half its height
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeMesh.add(trunk);
    
    // Leaf material
    const frondMaterial = new THREE.MeshStandardMaterial({
      color: 0x4C9F50,
      roughness: 0.8,
      side: THREE.DoubleSide // Visible from both sides
    });
    
    // Create palm fronds with a better orientation
    const frondCount = 8; // Fewer fronds
    
    for (let i = 0; i < frondCount; i++) {
      // Improved frond shape - use a plane with subdivision
      const frondWidth = 0.4;
      const frondLength = 1.8;
      
      // Create an elongated plane for the frond
      const frondGeometry = new THREE.PlaneGeometry(frondWidth, frondLength, 4, 8);
      
      // Curve the frond - apply different transformation
      const positions = frondGeometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const y = positions.getY(j);
        const normalizedY = (y + frondLength/2) / frondLength; // 0 to 1 from base to tip
        
        // Apply a gentle arc curve
        const bend = Math.sin(normalizedY * Math.PI) * 0.2;
        positions.setZ(j, positions.getZ(j) + bend);
      }
      
      frondGeometry.computeVertexNormals();
      
      const frond = new THREE.Mesh(frondGeometry, frondMaterial.clone());
      frond.castShadow = true;
      frond.receiveShadow = true;
      
      // Position at trunk top with slight offset for cluster effect
      frond.position.y = TRUNK_HEIGHT + 0.1;
      
      // Rotate fronds evenly around the trunk
      const angle = (i / frondCount) * Math.PI * 2;
      frond.rotation.y = angle;
      
      // Better frond orientation - more upright at center, curving outward
      // The arch is now part of the geometry, not rotation
      frond.rotation.x = -Math.PI / 6; // Only 30 degrees downward
      
      // Add a slight random rotation for natural look
      frond.rotation.z = this.prng.randomRange(-0.1, 0.1);
      
      treeMesh.add(frond);
    }
    
    // Add coconuts at the top
    const coconutCount = 3;
    const coconutMaterial = new THREE.MeshStandardMaterial({
      color: 0x5A3C36,
      roughness: 0.7
    });
    
    for (let i = 0; i < coconutCount; i++) {
      const coconut = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        coconutMaterial
      );
      
      // Position coconuts at the top of the trunk with slight offsets
      coconut.position.set(
        this.prng.randomRange(-0.1, 0.1),
        TRUNK_HEIGHT - 0.1, // Just below trunk top
        this.prng.randomRange(-0.1, 0.1)
      );
      
      coconut.castShadow = true;
      coconut.receiveShadow = true;
      treeMesh.add(coconut);
    }
    
    treeMesh.castShadow = true;
    treeMesh.receiveShadow = true;
    
    // Return group directly, bypassing the geometry merging that's causing issues
    return treeMesh as unknown as THREE.Mesh;
  }
  
  /**
   * Create a gum tree with skinny trunk and sparse foliage
   */
  private createGumTree(): THREE.Mesh {
    // Create a group to hold all parts
    const treeMesh = new THREE.Group();
    
    // Define key heights - shorter trunk
    const TRUNK_HEIGHT = 5.0;
    
    // Create trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, TRUNK_HEIGHT, 8);
    
    // Apply very subtle bend to trunk
    const trunkPositions = trunkGeometry.attributes.position;
    const bendFactor = 0.1; // Less bend
    
    for (let i = 0; i < trunkPositions.count; i++) {
      const y = trunkPositions.getY(i);
      const normalizedY = (y + TRUNK_HEIGHT / 2) / TRUNK_HEIGHT; // 0 at bottom, 1 at top
      const bendAmount = normalizedY * normalizedY * bendFactor;
      
      trunkPositions.setX(i, trunkPositions.getX(i) + bendAmount);
    }
    
    trunkGeometry.computeVertexNormals();
    
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xC0C0C0, // Silvery grey color for eucalyptus
      roughness: 0.7
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = TRUNK_HEIGHT / 2; // Position trunk so bottom is at y=0
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeMesh.add(trunk);
    
    // Create branches with controlled angles
    const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x996633 });
    const leafMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x77AA77, 
      side: THREE.DoubleSide,
      roughness: 0.7
    });
    
    // Place branches at even intervals around the trunk
    const branchCount = 6;
    
    // Add branches evenly around the trunk at different heights
    for (let i = 0; i < branchCount; i++) {
      // Distribute branches evenly around the trunk (every 60 degrees)
      const angle = (i / branchCount) * Math.PI * 2;
      
      // Alternate branch heights
      // First set at ~40% up, second set at ~70% up
      const heightFraction = (i % 2 === 0) ? 0.4 : 0.7;
      const branchY = TRUNK_HEIGHT * heightFraction;
      
      // Create branch - thin branches
      const branchLength = 0.6 + this.prng.randomRange(0, 0.3);
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, branchLength, 5),
        branchMaterial
      );
      
      // Start with branch horizontal
      branch.rotation.z = Math.PI / 2;
      
      // Rotate branch around trunk at the calculated angle
      branch.rotation.y = angle;
      
      // Position branch at the trunk, protruding outward
      branch.position.y = branchY;
      
      // Set the x/z position based on the angle to make branches start at the trunk surface
      // Subtract branch width factor to make it start at trunk surface
      const trunkRadius = 0.15; // Match the trunk top radius
      branch.position.x = Math.cos(angle) * (trunkRadius - 0.02);
      branch.position.z = Math.sin(angle) * (trunkRadius - 0.02);
      
      // Now move it out by half its length
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
      branch.position.x += dir.x * branchLength / 2;
      branch.position.z += dir.z * branchLength / 2;
      
      // Slight upward tilt for higher branches
      const tiltAmount = heightFraction * 0.1; // Very subtle tilt
      branch.rotation.z -= tiltAmount;
      
      treeMesh.add(branch);
      
      // Add leaves at branch tips
      const leafSize = 0.3 + heightFraction * 0.1;
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(leafSize, 8, 8),
        leafMaterial.clone()
      );
      leaf.scale.y = 0.4; // Flatter leaves
      
      // Calculate leaf position at branch tip
      const tipOffset = branchLength / 2; // Half length because branch is centered
      const leafPos = new THREE.Vector3(
        branch.position.x + dir.x * tipOffset,
        branch.position.y,
        branch.position.z + dir.z * tipOffset
      );
      
      leaf.position.copy(leafPos);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      treeMesh.add(leaf);
    }
    
    // Add main canopy at the top - larger and taller
    const topFoliage = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 8, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x88CC88, // Lighter green
        side: THREE.DoubleSide,
        roughness: 0.7
      })
    );
    topFoliage.scale.set(1.0, 1.3, 1.0); // Taller rather than flatter
    topFoliage.position.y = TRUNK_HEIGHT + 0.8; // Position ABOVE trunk top
    topFoliage.castShadow = true;
    topFoliage.receiveShadow = true;
    treeMesh.add(topFoliage);
    
    // Add a few smaller clusters above the main canopy
    for (let i = 0; i < 2; i++) {
      const smallCluster = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshStandardMaterial({ 
          color: 0x88CC88,
          side: THREE.DoubleSide
        })
      );
      
      // Position above the main canopy
      smallCluster.position.set(
        this.prng.randomRange(-0.3, 0.3),
        TRUNK_HEIGHT + 1.8 + i * 0.5, // Stacked above
        this.prng.randomRange(-0.3, 0.3)
      );
      
      smallCluster.scale.set(0.8, 1.0, 0.8); // Slightly taller than wide
      smallCluster.castShadow = true;
      smallCluster.receiveShadow = true;
      treeMesh.add(smallCluster);
    }
    
    treeMesh.castShadow = true;
    treeMesh.receiveShadow = true;
    
    // Return the group directly, avoiding geometry merging
    return treeMesh as unknown as THREE.Mesh;
  }
  
  /**
   * Create a rock mesh
   * Note: This function returns a simple Mesh (not a Group) to support instancing
   */
  private createRock(): THREE.Mesh {
    // Create a rock (deformed sphere)
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    
    // Deform vertices for a more rock-like appearance
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Add some noise to the position
      const noise = this.prng.randomRange(-0.2, 0.2);
      positions.setX(i, x + noise);
      positions.setY(i, y + noise);
      positions.setZ(i, z + noise);
    }
    
    // Update normals
    geometry.computeVertexNormals();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x7d7d7d,
      roughness: 0.8,
      metalness: 0.2,
    });
    
    // Create mesh
    const rock = new THREE.Mesh(geometry, material);
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
}