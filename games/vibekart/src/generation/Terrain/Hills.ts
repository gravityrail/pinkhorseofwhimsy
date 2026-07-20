import { HillSpec } from '../../../types/config.d';

/**
 * Calculate the height contribution of a single hill at a given point.
 * Uses a smooth falloff function based on distance from hill center.
 */
export function calculateHillHeight(x: number, z: number, hill: HillSpec): number {
  // Calculate normalized distance from hill center
  const dx = (x - hill.center[0]) / hill.scale[0];
  const dz = (z - hill.center[1]) / hill.scale[1];
  
  // Distance squared
  const distSq = dx * dx + dz * dz;
  
  // If distance > 1, we're outside the hill's influence
  if (distSq > 1) {
    return 0;
  }
  
  // Calculate height using smooth falloff function
  // 1 - dist^exponent gives a smooth curve that's 1 at center and 0 at edge
  const falloff = Math.pow(1 - distSq, hill.exponent);
  
  // Scale by the hill's height
  return hill.scale[2] * falloff;
}

/**
 * Calculate the combined height contribution of multiple hills at a given point.
 */
export function sumHillHeights(x: number, z: number, hills: HillSpec[]): number {
  let totalHeight = 0;
  
  // Sum the height contribution of each hill
  for (const hill of hills) {
    totalHeight += calculateHillHeight(x, z, hill);
  }
  
  return totalHeight;
}
