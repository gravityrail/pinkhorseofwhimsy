import * as THREE from 'three';
import { TrackPath } from './Spline';
import { HeightMap } from '../Terrain/HeightMap';

/**
 * Creates a 3D mesh for a track based on a track path and height map
 */
export function createTrackMesh(
  trackPath: TrackPath,
  heightMap: HeightMap,
  heightOffset: number = 0.1 // Slight offset to prevent z-fighting
): THREE.Mesh {
  // Parameters for track mesh generation
  const segments = 200; // Number of segments along the track
  const widthSegments = 8; // Number of segments across the track width
  
  // Arrays to store the geometry data
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  // Generate vertices along the track
  for (let i = 0; i <= segments; i++) {
    // Parameter t along the curve (0 to 1)
    const t = i / segments;
    
    // Get track properties at this point
    const centerPoint = trackPath.getPointAt(t);
    const normal = trackPath.getNormalAt(t);
    const binormal = trackPath.getBinormalAt(t);
    const width = trackPath.getWidthAt(t);
    const bankAngle = trackPath.getBankAngleAt(t);
    const elevationOffset = trackPath.getElevationOffsetAt(t);
    
    // Apply banking rotation to normal and binormal
    if (bankAngle !== 0) {
      const bankQuat = new THREE.Quaternion().setFromAxisAngle(
        trackPath.getTangentAt(t),
        bankAngle
      );
      normal.applyQuaternion(bankQuat);
      binormal.applyQuaternion(bankQuat);
    }
    
    // Generate vertices across the track width
    for (let j = 0; j <= widthSegments; j++) {
      // Parameter across the track (-0.5 to 0.5)
      const s = j / widthSegments - 0.5;
      
      // Calculate the position of this vertex
      const offsetVector = normal.clone().multiplyScalar(s * width);
      const vertexPos = centerPoint.clone().add(offsetVector);
      
      // Adjust height based on terrain and elevation offset
      // For bridges/tunnels, we'd use elevationOffset to override terrain height
      if (elevationOffset !== 0) {
        // Bridge or tunnel - use the elevation offset
        vertexPos.y = elevationOffset;
      } else {
        // Follow terrain with a small offset to prevent z-fighting
        vertexPos.y = heightMap.getHeightAt(vertexPos.x, vertexPos.z) + heightOffset;
      }
      
      // Add position to array
      positions.push(vertexPos.x, vertexPos.y, vertexPos.z);
      
      // Calculate normal (simplified - just use binormal)
      normals.push(binormal.x, binormal.y, binormal.z);
      
      // Calculate UV coordinates
      // u: along the track (0 to 1)
      // v: across the track (0 to 1)
      uvs.push(t, j / widthSegments);
    }
  }
  
  // Generate indices for triangles
  const vertsPerRow = widthSegments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      // Calculate indices for the two triangles of this grid cell
      const a = i * vertsPerRow + j;
      const b = a + 1;
      const c = a + vertsPerRow;
      const d = c + 1;
      
      // First triangle
      indices.push(a, c, b);
      
      // Second triangle
      indices.push(b, c, d);
    }
  }
  
  // Create the geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  
  // Create a basic material
  // In a real implementation, we'd use a more sophisticated material
  const material = new THREE.MeshStandardMaterial({
    color: 0x333333, // Dark gray for asphalt
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  
  // Create the mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'TrackMesh';
  
  return mesh;
}
