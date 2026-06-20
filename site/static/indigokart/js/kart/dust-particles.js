import * as THREE from 'three';

class DustParticles {
    constructor(scene) {
        // Now we expect to receive the THREE.Scene object directly
        this.scene = scene;
        this.MAX_DUST_PARTICLES = 50;
        this.dustParticles = [];
        console.log("DustParticles initialized with scene:", scene);
    }
    
    // Create a dust particle - SIMPLIFIED VERSION
    createDustParticle(kart, isOnTrack, kartVelocity) {
        // Only create dust when:
        // 1. Off-track
        // 2. Moving at a decent speed
        // 3. Haven't reached max particles
        // OPTIMIZATION: Reduce amount of particles further
        if (isOnTrack || Math.abs(kartVelocity) < 0.1 || this.dustParticles.length >= this.MAX_DUST_PARTICLES/2) {
            return;
        }
        
        // OPTIMIZATION: Use colored boxes instead of sprites to avoid any potential texture issues
        const dustGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const dustMaterial = new THREE.MeshBasicMaterial({
            color: 0xDDDDAA, // Tan/dust color
            transparent: true,
            opacity: 0.5 + Math.random() * 0.2,
        });
        
        const dustCube = new THREE.Mesh(dustGeometry, dustMaterial);
        
        // Position behind the kart with some randomness
        const randomOffset = (Math.random() - 0.5) * 0.5;
        const kartPosition = kart.getPosition();
        const kartRotation = kart.getRotation().y;
        
        dustCube.position.set(
            kartPosition.x - Math.sin(kartRotation) * 0.2 + randomOffset,
            0.05 + Math.random() * 0.15, // Just above ground
            kartPosition.z - Math.cos(kartRotation) * 0.2 + randomOffset
        );
        
        // Add to scene
        this.scene.add(dustCube);
        
        // Store particle data for animation
        this.dustParticles.push({
            sprite: dustCube, // Keep the field name for compatibility
            life: 15 + Math.floor(Math.random() * 10), // Shorter lifespan to reduce particle count
            velocityX: (Math.random() - 0.5) * 0.05,
            velocityY: 0.03 + Math.random() * 0.03,
            velocityZ: (Math.random() - 0.5) * 0.05
        });
    }
    
    // Update dust particles - SIMPLIFIED VERSION
    update(kart) {
        const isOnTrack = kart.isOnTrack;
        const kartVelocity = kart.velocity;
        
        // Create new dust at a rate proportional to speed when off-track
        // OPTIMIZATION: Lower dust generation rate by making threshold higher
        if (!isOnTrack && Math.abs(kartVelocity) > 0.1) {
            if (Math.random() < Math.abs(kartVelocity) * 0.7) { // Reduced probability
                this.createDustParticle(kart, isOnTrack, kartVelocity);
            }
        }
        
        // Update existing particles
        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            const particle = this.dustParticles[i];
            
            // Move particle
            particle.sprite.position.x += particle.velocityX;
            particle.sprite.position.y += particle.velocityY;
            particle.sprite.position.z += particle.velocityZ;
            
            // Fade out over time
            particle.sprite.material.opacity = particle.life / 40;
            particle.life--;
            
            // Remove when life is over
            if (particle.life <= 0) {
                // Check if scene is available and has remove method
                if (this.scene && typeof this.scene.remove === 'function') {
                    this.scene.remove(particle.sprite);
                } else {
                    console.error("Scene object or remove method not available", this.scene);
                    // Remove from parent if available as an alternative
                    if (particle.sprite.parent) {
                        particle.sprite.parent.remove(particle.sprite);
                    }
                }
                this.dustParticles.splice(i, 1);
            }
        }
    }
}

export default DustParticles;