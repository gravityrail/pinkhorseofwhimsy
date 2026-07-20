import { VibekartConfig, SurfaceType, AltitudeBand } from '../../../types/config.d';

/**
 * Maps altitude values to surface types based on configured altitude bands
 */
export class AltitudeMapper {
  private config: VibekartConfig;
  
  constructor(config: VibekartConfig) {
    this.config = config;
  }
  
  /**
   * Get the surface type distribution at a given altitude
   * Returns an object mapping surface types to their weights (0-1)
   */
  public getSurfaceWeightsAtAltitude(altitude: number): Record<SurfaceType, number> {
    const result: Partial<Record<SurfaceType, number>> = {};
    
    // Find the altitude band that contains this altitude
    const bands = this.config.surfaces.altitudeMap;
    let matchingBand: AltitudeBand | null = null;
    
    for (const band of bands) {
      if (altitude >= band.minAltitude && altitude <= band.maxAltitude) {
        matchingBand = band;
        break;
      }
    }
    
    // If no band matches, use the closest one
    if (!matchingBand && bands.length > 0) {
      let closestBand = bands[0];
      let minDistance = Math.min(
        Math.abs(altitude - bands[0].minAltitude),
        Math.abs(altitude - bands[0].maxAltitude)
      );
      
      for (let i = 1; i < bands.length; i++) {
        const distMin = Math.abs(altitude - bands[i].minAltitude);
        const distMax = Math.abs(altitude - bands[i].maxAltitude);
        const minDist = Math.min(distMin, distMax);
        
        if (minDist < minDistance) {
          minDistance = minDist;
          closestBand = bands[i];
        }
      }
      
      matchingBand = closestBand;
    }
    
    // If we found a band, use its textures
    if (matchingBand) {
      // Copy the textures to our result
      Object.assign(result, matchingBand.textures);
    } else {
      // Default to grass if no bands defined
      result.grass = 1.0;
    }
    
    return result as Record<SurfaceType, number>;
  }
  
  /**
   * Get the dominant surface type at a given altitude
   */
  public getDominantSurfaceAtAltitude(altitude: number): SurfaceType {
    const weights = this.getSurfaceWeightsAtAltitude(altitude);
    
    // Find the surface type with the highest weight
    let maxWeight = 0;
    let dominantSurface: SurfaceType = 'grass'; // Default
    
    for (const [surface, weight] of Object.entries(weights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantSurface = surface as SurfaceType;
      }
    }
    
    return dominantSurface;
  }
}
