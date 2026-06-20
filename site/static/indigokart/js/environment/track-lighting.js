import * as THREE from 'three';
import StreetLamp from './street-lamp.js';

class TrackLighting {
    constructor(scene, track, environment) {
        this.scene = scene;
        this.track = track;
        this.environment = environment;
        this.lamps = [];
        
        // Configuration options
        this.config = {
            lampCount: 8,                // TEXTURE FIX: Drastically reduced from 25 to 8
            lampSpacing: 120,            // Increased spacing to spread them out more
            trackOffset: 5,              // How far from track edge to place lamps
            alternatingLamps: true,      // Place lamps on alternating sides of track
            randomizePlacement: 0.15,    // Random variation in placement (0-1)
            heightVariation: false       // Adjust lamp height based on terrain
        };
        
        this.createLamps();
    }
    
    createLamps() {
        // Get track points to place lamps along
        const trackPoints = this.track.getTrackPoints();
        
        if (!trackPoints || trackPoints.length === 0) {
            console.error("No track points available for lamp placement");
            return;
        }
        
        // Calculate spacing based on track length
        const totalTrackPoints = trackPoints.length;
        const lampSpacing = Math.max(3, Math.floor(totalTrackPoints / this.config.lampCount));
        
        // Place lamps around the track at regular intervals
        for (let i = 0; i < totalTrackPoints; i += lampSpacing) {
            const trackPoint = trackPoints[i];
            
            // Skip if trackPoint doesn't have the expected properties
            if (!trackPoint || !('x' in trackPoint) || !('z' in trackPoint) || !('width' in trackPoint)) {
                continue;
            }
            
            // Get next point for direction calculation (with wrapping)
            const nextIndex = (i + 1) % totalTrackPoints;
            const nextPoint = trackPoints[nextIndex];
            
            // Calculate direction vector from current to next point
            const dirX = nextPoint.x - trackPoint.x;
            const dirZ = nextPoint.z - trackPoint.z;
            const dirLength = Math.sqrt(dirX * dirX + dirZ * dirZ);
            
            // Normalize direction vector
            const normDirX = dirX / dirLength;
            const normDirZ = dirZ / dirLength;
            
            // Perpendicular vector (90° to direction)
            const perpX = -normDirZ;
            const perpZ = normDirX;
            
            // Determine which side to place the lamp
            let side = 1; // Default to right side
            
            if (this.config.alternatingLamps) {
                // Alternate sides based on index
                side = (Math.floor(i / lampSpacing) % 2 === 0) ? 1 : -1;
            }
            
            // Add some randomization to placement if configured
            const randomOffset = this.config.randomizePlacement;
            const trackWidth = trackPoint.width / 2;
            
            // Calculate lamp position
            // Offset perpendicular to track by track width plus additional offset
            const offsetDistance = (trackWidth + this.config.trackOffset) * (1 + (Math.random() * randomOffset * 2 - randomOffset));
            
            // Position lamp perpendicular to track direction
            const lampX = trackPoint.x + perpX * offsetDistance * side;
            const lampZ = trackPoint.z + perpZ * offsetDistance * side;
            
            // Create lamp at this position
            const lampPosition = { x: lampX, y: 0, z: lampZ };
            const lamp = new StreetLamp(this.scene.scene, lampPosition, {
                // Slightly randomize lamp properties for visual variety
                height: 4.5 + Math.random() * 1.0,
                intensity: 1.3 + Math.random() * 0.4,
                angle: Math.PI/4 * (0.9 + Math.random() * 0.2),
                // Face the light toward the track
                rotation: -Math.atan2(normDirZ, normDirX) + Math.PI/2 * side
            });
            
            // Store reference to the lamp
            this.lamps.push(lamp);
        }
        
        console.log(`Created ${this.lamps.length} street lamps around the track`);
        
        // Position lamps on terrain after creating them all
        this.positionLampsOnTerrain();
    }
    
    // Update lamp positions to match the actual terrain height
    positionLampsOnTerrain() {
        if (!this.track.getHeightAt) {
            console.warn("Track doesn't have getHeightAt method for lamp terrain positioning");
            return;
        }
        
        // For each lamp, adjust its position based on terrain height
        this.lamps.forEach(lamp => {
            lamp.positionOnTerrain(this.track.getHeightAt.bind(this.track));
        });
    }
    
    // Update lamps based on time of day
    update(timeOfDay) {
        if (typeof timeOfDay === 'number') {
            this.lamps.forEach(lamp => {
                lamp.timeOfDayControl(timeOfDay);
            });
        }
    }
}

export default TrackLighting;