import * as THREE from 'three';

/**
 * Create a basic water material
 * This is a simplified version - a full implementation would use custom shaders
 */
export function createWaterMaterial(): THREE.Material {
  // Simple transparent material for water
  return new THREE.MeshStandardMaterial({
    color: 0x4a95c0,
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.2,
  });
}

/**
 * Create a more advanced water material with custom shaders
 * This is a placeholder for a more sophisticated implementation
 */
export function createAdvancedWaterMaterial(): THREE.Material {
  // Create a shader material for water
  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Simple wave function
    float wave(vec2 position, float frequency, float amplitude, float phase) {
      return amplitude * sin(frequency * position.x + uTime * phase) * sin(frequency * position.y + uTime * phase);
    }
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      // Apply wave displacement
      vec3 pos = position;
      
      // Combine multiple waves
      float wave1 = wave(position.xz, 0.2, 0.1, 0.5);
      float wave2 = wave(position.xz, 0.4, 0.05, 1.0);
      
      pos.y += wave1 + wave2;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      // Base water color
      vec3 waterColor = uColor;
      
      // Add some variation based on position and time
      float colorVariation = sin(vUv.x * 10.0 + uTime * 0.5) * sin(vUv.y * 10.0 + uTime * 0.5) * 0.1;
      
      // Final color
      vec3 finalColor = waterColor + vec3(colorVariation);
      
      gl_FragColor = vec4(finalColor, 0.8); // Fixed opacity
    }
  `;
  
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color(0x4a95c0) }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });
}

/**
 * Create a water plane mesh
 */
export function createWaterPlane(width: number, height: number, level: number = 0): THREE.Mesh {
  // Create geometry
  const geometry = new THREE.PlaneGeometry(width, height, 32, 32);
  
  // Rotate to be horizontal
  geometry.rotateX(-Math.PI / 2);
  
  // Position at water level
  geometry.translate(width / 2, level, height / 2);
  
  // Create material
  // For simplicity, using the basic material
  // In a full implementation, use the advanced shader
  const material = createWaterMaterial();
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'WaterPlane';
  
  return mesh;
}
