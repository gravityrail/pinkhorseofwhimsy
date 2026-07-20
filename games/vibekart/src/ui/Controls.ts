import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Setup orbit controls for the camera
 */
export function setupOrbitControls(camera: THREE.Camera, domElement: HTMLElement): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  
  // Configure controls
  controls.enableDamping = true; // Smooth camera movement
  controls.dampingFactor = 0.05;
  
  controls.screenSpacePanning = false; // Pan parallel to the ground
  
  controls.minDistance = 5;
  controls.maxDistance = 500;
  
  controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
  
  // Adjust pan speed based on camera height
  controls.addEventListener('change', () => {
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    const height = cameraPosition.y;
    
    // Scale pan speed with height (higher = faster panning)
    const panFactor = Math.max(0.5, height / 20);
    controls.panSpeed = panFactor;
    
    // Also adjust rotation speed
    controls.rotateSpeed = 0.8;
  });
  
  return controls;
}
