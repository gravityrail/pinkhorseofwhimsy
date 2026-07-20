import * as THREE from 'three';
import { VibekartConfig } from '../../types/config.d';
import { PRNG } from '../core/PRNG';
import { Scatterer } from '../generation/Objects/Scatterer';
import { AltitudeMapper } from '../generation/Surface/AltitudeMapper';
import { SplatPainter } from '../generation/Surface/SplatPainter';
import { HeightMap } from '../generation/Terrain/HeightMap';
import { createTrackMesh } from '../generation/Track/MeshBuilder';
import { TrackPath } from '../generation/Track/Spline';
import { calculateVertexColorForTerrain, createTerrainMaterial } from './SurfaceShader';
import { createWaterPlane } from './WaterShader';

/**
 * Interface for the world model data
 */
export interface WorldModel {
  heightMap: HeightMap;
  trackPath: TrackPath;
  // Other data like splatMaps would go here
}

/**
 * Builds and manages the Three.js scene graph
 */
export class SceneBuilder {
  private scene: THREE.Scene;
  private config: VibekartConfig;
  private prng: PRNG;
  
  // Track meshes for cleanup
  private terrainMesh: THREE.Mesh | null = null;
  private trackMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private objectsGroup: THREE.Group | null = null;
  
  constructor(scene: THREE.Scene, config: VibekartConfig, prng: PRNG) {
    this.scene = scene;
    this.config = config;
    this.prng = prng;
  }
  
  /**
   * Build the entire scene from the world model
   */
  public buildScene(worldModel: WorldModel): void {
    console.log("Building scene...");
    
    // Clean up old meshes
    this.cleanupOldMeshes();
    
    // Create altitude mapper
    const altitudeMapper = new AltitudeMapper(this.config);
    
    // Create splat painter
    const splatPainter = new SplatPainter(this.config, this.prng);
    
    // Build terrain
    this.terrainMesh = this.buildTerrain(worldModel.heightMap, altitudeMapper);
    this.scene.add(this.terrainMesh);
    
    // Build water if enabled
    if (this.config.water.enabled) {
      this.waterMesh = this.buildWater();
      this.scene.add(this.waterMesh);
    }
    
    // Build track
    this.trackMesh = this.buildTrack(worldModel.trackPath, worldModel.heightMap);
    this.scene.add(this.trackMesh);
    
    // Build scattered objects
    const scatterer = new Scatterer(
      this.config,
      this.prng,
      worldModel.heightMap,
      altitudeMapper,
      worldModel.trackPath // Pass track path for track avoidance
    );
    
    this.objectsGroup = scatterer.generateScatteredObjects();
    this.scene.add(this.objectsGroup);
    
    console.log("Scene built successfully");
  }
  
  /**
   * Clean up old meshes from the scene
   */
  private cleanupOldMeshes(): void {
    // Remove terrain mesh
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      if (Array.isArray(this.terrainMesh.material)) {
        this.terrainMesh.material.forEach(m => m.dispose());
      } else if (this.terrainMesh.material) {
        this.terrainMesh.material.dispose();
      }
      this.terrainMesh = null;
    }
    
    // Remove track mesh
    if (this.trackMesh) {
      this.scene.remove(this.trackMesh);
      this.trackMesh.geometry.dispose();
      if (Array.isArray(this.trackMesh.material)) {
        this.trackMesh.material.forEach(m => m.dispose());
      } else if (this.trackMesh.material) {
        this.trackMesh.material.dispose();
      }
      this.trackMesh = null;
    }
    
    // Remove water mesh
    if (this.waterMesh) {
      this.scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      if (Array.isArray(this.waterMesh.material)) {
        this.waterMesh.material.forEach(m => m.dispose());
      } else if (this.waterMesh.material) {
        this.waterMesh.material.dispose();
      }
      this.waterMesh = null;
    }
    
    // Remove objects group
    if (this.objectsGroup) {
      // Recursively dispose of all geometries and materials
      this.objectsGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      
      this.scene.remove(this.objectsGroup);
      this.objectsGroup = null;
    }
  }
  
  /**
   * Build terrain mesh from height map
   */
  private buildTerrain(heightMap: HeightMap, altitudeMapper: AltitudeMapper): THREE.Mesh {
    console.log("Building terrain...");
    
    // Create geometry
    const geometry = this.createTerrainGeometry(heightMap);
    
    // Apply vertex colors based on altitude
    this.applyTerrainVertexColors(geometry, heightMap, altitudeMapper);
    
    // Create material
    const material = createTerrainMaterial();
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'TerrainMesh';
    
    return mesh;
  }
  
  /**
   * Create terrain geometry from height map
   */
  private createTerrainGeometry(heightMap: HeightMap): THREE.BufferGeometry {
    console.log('Creating terrain geometry with dimensions:', heightMap.width, heightMap.depth);
    
    // Create a new buffer geometry (more flexible than PlaneGeometry)
    const geometry = new THREE.BufferGeometry();
    
    // Calculate the number of vertices
    const width = heightMap.width;
    const depth = heightMap.depth;
    const gridSizeX = this.config.world.gridSize[0];
    const gridSizeZ = this.config.world.gridSize[1];
    
    // Create array for positions
    const positions = [];
    const indices = [];
    const uvs = [];
    
    // Generate vertices in a grid pattern
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        // Calculate world coordinates (centered)
        const worldX = (x / (width - 1)) * gridSizeX;
        const worldZ = (z / (depth - 1)) * gridSizeZ;
        
        // Get height from the height map
        const height = heightMap.data[z * width + x];
        
        // Add vertex (x, height, z)
        positions.push(worldX, height, worldZ);
        
        // Add UV coordinates
        uvs.push(x / (width - 1), z / (depth - 1));
      }
    }
    
    // Generate indices for triangles
    for (let z = 0; z < depth - 1; z++) {
      for (let x = 0; x < width - 1; x++) {
        // Calculate vertex indices
        const a = z * width + x;
        const b = z * width + x + 1;
        const c = (z + 1) * width + x;
        const d = (z + 1) * width + x + 1;
        
        // Add two triangles
        indices.push(a, c, b); // First triangle
        indices.push(b, c, d); // Second triangle
      }
    }
    
    // Add attributes to geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    // Compute vertex normals for lighting
    geometry.computeVertexNormals();
    
    console.log(`Created terrain mesh with ${positions.length / 3} vertices and ${indices.length / 3} triangles`);
    
    return geometry;
  }
      /**
   * Apply vertex colors to the terrain geometry based on altitude mapping
   */
  private applyTerrainVertexColors(
    geometry: THREE.BufferGeometry, 
    heightMap: HeightMap, 
    altitudeMapper: AltitudeMapper
  ): void {
    // Get position attribute from the geometry
    const positions = geometry.attributes.position;
    const colors = [];
    
    console.log(`Applying colors to ${positions.count} vertices`);
    
    // For each vertex in the geometry
    for (let i = 0; i < positions.count; i++) {
      // Get the vertex position directly from the buffer
      const worldX = positions.getX(i); // X coordinate is already in world space
      const altitude = positions.getY(i); // Y is the height in our new geometry
      const worldZ = positions.getZ(i); // Z coordinate is already in world space
      
      // Calculate the color based on altitude and surface mapping
      const color = calculateVertexColorForTerrain(worldX, worldZ, altitude, altitudeMapper);
      
      // Add the color components to our array
      colors.push(color.r, color.g, color.b);
    }
    
    // Set the color attribute on the geometry
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    console.log('Applied terrain vertex colors based on altitude mapping');
  }


  // Note: Lights are now managed by AtmosphereSystem
  
  /**
   * Build track mesh from track path
   */
  private buildTrack(trackPath: TrackPath, heightMap: HeightMap): THREE.Mesh {
    console.log("Building track...");
    
    // Create track mesh
    const mesh = createTrackMesh(trackPath, heightMap);
    
    return mesh;
  }
  
  /**
   * Build water plane
   */
  private buildWater(): THREE.Mesh {
    console.log("Building water...");
    
    // Create water plane
    const { gridSize } = this.config.world;
    const waterLevel = this.config.water.level;
    
    const mesh = createWaterPlane(gridSize[0], gridSize[1], waterLevel);
    
    return mesh;
  }
}
