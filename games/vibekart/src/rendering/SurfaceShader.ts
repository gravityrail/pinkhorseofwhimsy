import * as THREE from 'three';
import { AltitudeMapper } from '../generation/Surface/AltitudeMapper';
import { SurfaceType } from '../../types/config.d';

/**
 * Calculate a color for a terrain vertex based on altitude and surface mapping
 */
export function calculateVertexColorForTerrain(
  x: number, 
  z: number, 
  altitude: number, 
  altitudeMapper: AltitudeMapper
): THREE.Color {
  // Get surface weights at this altitude
  const surfaceWeights = altitudeMapper.getSurfaceWeightsAtAltitude(altitude);
  
  // Define colors for each surface type
  const surfaceColors: Record<SurfaceType, THREE.Color> = {
    'asphalt': new THREE.Color(0x333333),
    'grass': new THREE.Color(0x3d8c40),
    'sand': new THREE.Color(0xdbc380),
    'water': new THREE.Color(0x4a95c0),
    'ice': new THREE.Color(0xd6f5ff),
    'snow': new THREE.Color(0xffffff),
    'rock': new THREE.Color(0x7d7d7d),
    'dirt': new THREE.Color(0x8b4513),
    'mud': new THREE.Color(0x5d4037)
  };
  
  // Blend colors based on weights
  const resultColor = new THREE.Color(0);
  let totalWeight = 0;
  
  for (const surfaceType in surfaceWeights) {
    const weight = surfaceWeights[surfaceType as SurfaceType];
    if (weight > 0) {
      const color = surfaceColors[surfaceType as SurfaceType];
      resultColor.r += color.r * weight;
      resultColor.g += color.g * weight;
      resultColor.b += color.b * weight;
      totalWeight += weight;
    }
  }
  
  // Normalize if needed
  if (totalWeight > 0 && totalWeight !== 1) {
    resultColor.r /= totalWeight;
    resultColor.g /= totalWeight;
    resultColor.b /= totalWeight;
  }
  
  return resultColor;
}

/**
 * Create a basic surface material that uses vertex colors
 * This is a simplified version - a full implementation would use textures and shaders
 */
export function createTerrainMaterial(): THREE.Material {
  // Use MeshStandardMaterial with vertex colors for high-quality terrain rendering
  return new THREE.MeshStandardMaterial({
    vertexColors: true,     // Use vertex colors for surface type visualization
    roughness: 0.8,        // Fairly rough surface
    metalness: 0.1,        // Very little metallic reflection
    flatShading: false     // Smooth shading for a more natural look
  });
}

/**
 * Create a more advanced surface material with custom shaders
 * This is a placeholder for a more sophisticated implementation
 */
export function createAdvancedTerrainMaterial(): THREE.Material {
  // In a full implementation, this would be a custom shader material
  // that blends textures based on vertex attributes or splatmaps
  
  // For now, just return the basic material
  return createTerrainMaterial();
  
  /* 
  // Example of what a more advanced implementation might look like:
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform sampler2D grassTexture;
    uniform sampler2D rockTexture;
    uniform sampler2D sandTexture;
    uniform sampler2D snowTexture;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // Calculate blend weights based on height and slope
      float height = vPosition.y;
      float slope = 1.0 - dot(vNormal, vec3(0.0, 1.0, 0.0));
      
      // Sample textures
      vec4 grass = texture2D(grassTexture, vUv * 10.0);
      vec4 rock = texture2D(rockTexture, vUv * 5.0);
      vec4 sand = texture2D(sandTexture, vUv * 8.0);
      vec4 snow = texture2D(snowTexture, vUv * 6.0);
      
      // Calculate blend weights
      float snowWeight = smoothstep(0.7, 0.9, height);
      float rockWeight = smoothstep(0.2, 0.7, slope);
      float sandWeight = smoothstep(-0.1, 0.0, height) * (1.0 - slope);
      float grassWeight = 1.0 - snowWeight - rockWeight - sandWeight;
      
      // Blend textures
      vec4 finalColor = 
        grass * grassWeight +
        rock * rockWeight +
        sand * sandWeight +
        snow * snowWeight;
        
      gl_FragColor = finalColor;
    }
  `;
  
  return new THREE.ShaderMaterial({
    uniforms: {
      grassTexture: { value: new THREE.TextureLoader().load('textures/grass.jpg') },
      rockTexture: { value: new THREE.TextureLoader().load('textures/rock.jpg') },
      sandTexture: { value: new THREE.TextureLoader().load('textures/sand.jpg') },
      snowTexture: { value: new THREE.TextureLoader().load('textures/snow.jpg') }
    },
    vertexShader,
    fragmentShader,
    lights: true
  });
  */
}
