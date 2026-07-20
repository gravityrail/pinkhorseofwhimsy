import { VibekartConfig } from '../../../types/config.d';
import { PRNG } from '../../core/PRNG';
import { sumHillHeights } from './Hills';

/**
 * Generates a 2D height map for terrain based on configuration
 */
export class HeightMap {
  public data: Float32Array;
  public width: number;
  public depth: number;
  
  private config: VibekartConfig;
  private prng: PRNG;
  
  constructor(config: VibekartConfig, prng: PRNG) {
    this.config = config;
    this.prng = prng;
    
    this.width = config.world.gridSize[0] + 1; // +1 for vertices at edges
    this.depth = config.world.gridSize[1] + 1;
    
    this.data = new Float32Array(this.width * this.depth);
    
    this.generate();
  }
  
  /**
   * Generate the height map based on configuration
   */
  private generate(): void {
    // Base height
    const baseHeight = this.config.terrain.baseHeight;
    
    // For each point in the grid
    for (let z = 0; z < this.depth; z++) {
      for (let x = 0; x < this.width; x++) {
        const index = z * this.width + x;
        
        // Start with base height
        let height = baseHeight;
        
        // Add hill contributions
        if (this.config.terrain.hills.length > 0) {
          height += sumHillHeights(x, z, this.config.terrain.hills);
        }
        
        // Add Perlin noise if enabled
        if (this.config.terrain.noise.enabled) {
          height += this.generateNoiseHeight(x, z);
        }
        
        // Apply any sparse offsets (cliffs, trenches, etc.)
        height += this.getSparseOffset(x, z);
        
        // Store the final height
        this.data[index] = height;
      }
    }
  }
  
  /**
   * Generate height contribution from Perlin noise
   */
  private generateNoiseHeight(x: number, z: number): number {
    const { scale, octaves, persistence, lacunarity, amplitude } = this.config.terrain.noise;
    
    // Simple Perlin-like noise implementation
    // For a real implementation, use a proper noise library
    let noise = 0;
    let frequency = 1 / scale;
    let amp = amplitude;
    
    // Sum multiple octaves of noise
    for (let i = 0; i < octaves; i++) {
      // Use the PRNG to generate consistent noise
      // This is a very simplified noise function
      const nx = x * frequency;
      const nz = z * frequency;
      
      // Generate a pseudo-random value based on position
      // In a real implementation, use proper Perlin/Simplex noise
      const noiseVal = this.simplexLike(nx, nz);
      
      noise += noiseVal * amp;
      
      // Adjust for next octave
      amp *= persistence;
      frequency *= lacunarity;
    }
    
    return noise;
  }
  
  /**
   * Very simple noise function (not actual Simplex/Perlin)
   * Just for demonstration - in a real implementation, use a proper noise library
   */
  private simplexLike(x: number, z: number): number {
    // Create a repeatable "random" value from the coordinates
    // This is NOT proper noise, just a simple hash function
    const seed = this.config.seed;
    const n = Math.sin(x * 12.9898 + z * 78.233 + seed.charCodeAt(0)) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1; // Range -1 to 1
  }
  
  /**
   * Get height offset from sparse offsets (cliffs, trenches, etc.)
   */
  private getSparseOffset(x: number, z: number): number {
    // Check if there are any sparse offsets at this position
    for (const offset of this.config.terrain.sparseOffsets) {
      if (offset.x === Math.floor(x) && offset.y === Math.floor(z)) {
        return offset.value;
      }
    }
    
    return 0;
  }
  
  /**
   * Get the height at a specific world position
   * Uses bilinear interpolation for positions between grid points
   */
  public getHeightAt(worldX: number, worldZ: number): number {
    // Convert world coordinates to grid coordinates
    const gridX = worldX / this.config.world.cellSize;
    const gridZ = worldZ / this.config.world.cellSize;
    
    // Get the four surrounding grid points
    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(x0 + 1, this.width - 1);
    const z1 = Math.min(z0 + 1, this.depth - 1);
    
    // Fractional part for interpolation
    const fx = gridX - x0;
    const fz = gridZ - z0;
    
    // Get heights at the four corners
    const h00 = this.data[z0 * this.width + x0];
    const h10 = this.data[z0 * this.width + x1];
    const h01 = this.data[z1 * this.width + x0];
    const h11 = this.data[z1 * this.width + x1];
    
    // Bilinear interpolation
    const hx0 = h00 * (1 - fx) + h10 * fx;
    const hx1 = h01 * (1 - fx) + h11 * fx;
    
    return hx0 * (1 - fz) + hx1 * fz;
  }
}
