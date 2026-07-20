import * as THREE from 'three';

class Camera {
    constructor(scene) {
        // Camera configuration
        this.config = {
            height: 4,       // Height above the kart
            distance: 8,     // Distance behind the kart
            lookAheadDist: 6, // Distance ahead to look at
            damping: 0.1     // Camera movement smoothing factor
        };
        
        // Create the camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Set the camera to look down initially (prevents upside-down view on first frame)
        this.camera.position.set(0, 100, 0);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(0, 0, 0);
        
        // Ensure matrix updates properly
        this.camera.matrixAutoUpdate = true;
        
        // Set the camera in the scene
        scene.setCamera(this.camera);
        
        // Store current camera track angle to fix orientation issues
        this.cameraTrackAngle = 0;
    }
    
    // Initialize camera with kart reference
    init(kart) {
        this.kart = kart;
        
        // Initialize camera angle based on kart's initial rotation
        this.cameraTrackAngle = kart.getRotation().y;
        
        // Force initial update
        this.update(0);
    }
    
    update(deltaTime) {
        if (!this.kart) return;
        
        // =============== COMPLETELY NEW CAMERA SYSTEM ===============
        // This system uses a different approach to avoid orientation issues
        
        // Step 1: Start with a clean camera orientation
        this.camera.rotation.set(0, 0, 0); // Reset rotation
        this.camera.up.set(0, 1, 0);       // Set up direction
        
        // Find shortest path to target angle (handles -π to π wrapping)
        let kartRotationY = this.kart.getRotation().y;
        let angleDiff = kartRotationY - this.cameraTrackAngle;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Smoothly track the angle with damping
        this.cameraTrackAngle += angleDiff * this.config.damping;
        
        // Step 2: Calculate ideal camera positions
        const idealCameraX = this.kart.getPosition().x - Math.sin(this.cameraTrackAngle) * this.config.distance;
        const idealCameraY = this.kart.getPosition().y + this.config.height;
        const idealCameraZ = this.kart.getPosition().z - Math.cos(this.cameraTrackAngle) * this.config.distance;
        
        // Position look target ahead of the kart
        const idealLookAtX = this.kart.getPosition().x + Math.sin(this.cameraTrackAngle) * this.config.lookAheadDist;
        const idealLookAtY = this.kart.getPosition().y; // Same height as kart
        const idealLookAtZ = this.kart.getPosition().z + Math.cos(this.cameraTrackAngle) * this.config.lookAheadDist;
        
        // Step 3: Apply damping to camera position changes (smoother following)
        // Apply position with damping
        this.camera.position.x += (idealCameraX - this.camera.position.x) * this.config.damping * 2;
        this.camera.position.y += (idealCameraY - this.camera.position.y) * this.config.damping * 2;
        this.camera.position.z += (idealCameraZ - this.camera.position.z) * this.config.damping * 2;
        
        // Step 4: Make the camera look at the target point
        const lookAtTarget = new THREE.Vector3(idealLookAtX, idealLookAtY, idealLookAtZ);
        this.camera.lookAt(lookAtTarget);
    }
    
    getCamera() {
        return this.camera;
    }
}

export default Camera;