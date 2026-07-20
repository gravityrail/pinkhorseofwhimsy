import { VibekartConfig, PaintedSurfaceData, SurfaceType } from '../../../types/config.d';
import { PRNG } from '../../core/PRNG';

/**
 * Handles surface type painting and blending
 * This is a simplified placeholder implementation
 */
export class SplatPainter {
  private config: VibekartConfig;
  private prng: PRNG;
  
  constructor(config: VibekartConfig, prng: PRNG) {
    this.config = config;
    this.prng = prng;
  }
  
  /**
   * Get the painted surface weights at a specific position
   * Returns an object mapping surface types to their weights (0-1)
   */
  public getPaintedSurfaceWeights(x: number, z: number): Partial<Record<SurfaceType, number>> {
    // Check if there's a painted surface at this position
    for (const paintData of this.config.surfaces.paint) {
      if (Math.floor(paintData.x) === Math.floor(x) && Math.floor(paintData.y) === Math.floor(z)) {
        return paintData.value;
      }
    }
    
    // No painted surface at this position
    return {};
  }
  
  /**
   * Apply noise to surface weights to create more natural transitions
   */
  public applySurfaceNoise(
    x: number, 
    z: number, 
    weights: Partial<Record<SurfaceType, number>>
  ): Partial<Record<SurfaceType, number>> {
    // Deep copy the weights
    const result = { ...weights };
    
    // Get noise parameters
    const { amplitude, scale } = this.config.surfaces.noise;
    
    // If amplitude is 0, no noise to apply
    if (amplitude === 0) {
      return result;
    }
    
    // Generate a noise value for this position
    const noise = this.generateNoise(x, z, scale);
    
    // Apply noise to each weight
    for (const surface in result) {
      const typedSurface = surface as SurfaceType;
      const weight = result[typedSurface] || 0;
      
      // Adjust weight by noise
      result[typedSurface] = Math.max(0, Math.min(1, weight + noise * amplitude));
    }
    
    // Normalize weights to ensure they sum to 1
    this.normalizeWeights(result);
    
    return result;
  }
  
  /**
   * Generate a noise value for the given position
   */
  private generateNoise(x: number, z: number, scale: number): number {
    // Simple noise function using the PRNG
    // In a real implementation, use a proper noise library
    const nx = x / scale;
    const nz = z / scale;
    
    // Use a simple hash function to get a "random" value
    const seed = this.config.seed;
    const n = Math.sin(nx * 12.9898 + nz * 78.233 + seed.charCodeAt(0)) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1; // Range -1 to 1
  }
  
  /**
   * Normalize weights to ensure they sum to 1
   */
  private normalizeWeights(weights: Partial<Record<SurfaceType, number>>): void {
    // Calculate sum of weights
    let sum = 0;
    for (const surface in weights) {
      sum += weights[surface as SurfaceType] || 0;
    }
    
    // If sum is 0, nothing to normalize
    if (sum === 0) {
      return;
    }
    
    // Normalize each weight
    for (const surface in weights) {
      const typedSurface = surface as SurfaceType;
      weights[typedSurface] = (weights[typedSurface] || 0) / sum;
    }
  }
  
  /**
   * Add a painted surface at the specified position
   */
  public addPaintedSurface(x: number, z: number, surfaceType: SurfaceType, strength: number = 1.0): void {
    // Check if there's already a painted surface at this position
    let existingIndex = -1;
    for (let i = 0; i < this.config.surfaces.paint.length; i++) {
      const paint = this.config.surfaces.paint[i];
      if (Math.floor(paint.x) === Math.floor(x) && Math.floor(paint.y) === Math.floor(z)) {
        existingIndex = i;
        break;
      }
    }
    
    // Create the surface weights object
    const weights: Partial<Record<SurfaceType, number>> = {};
    weights[surfaceType] = strength;
    
    if (existingIndex >= 0) {
      // Update existing painted surface
      this.config.surfaces.paint[existingIndex].value = {
        ...this.config.surfaces.paint[existingIndex].value,
        ...weights
      };
    } else {
      // Add new painted surface
      this.config.surfaces.paint.push({
        x: Math.floor(x),
        y: Math.floor(z),
        value: weights
      });
    }
  }
}
