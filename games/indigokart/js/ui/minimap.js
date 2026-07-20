import { CONFIG } from '../core/game.js';

class Minimap {
    constructor(track) {
        this.track = track;
        
        // Get canvas and set initial properties
        this.canvas = document.getElementById('minimap');
        this.canvas.width = 150;
        this.canvas.height = 150;
        this.context = this.canvas.getContext('2d');
        this.size = 150;
        this.padding = 10;
        
        // Store track points
        this.trackPoints = track.getTrackPoints();
        
        // Calculate minimap scale for drawing track
        this.calculateMinimapScale();
    }
    
    calculateMinimapScale() {
        // Find track bounds to determine scale
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        
        // Find the bounds of the track
        for (const point of this.trackPoints) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        }
        
        // Calculate track dimensions
        const trackWidth = maxX - minX;
        const trackHeight = maxZ - minZ;
        
        // Calculate minimap scale to fit track within the canvas minus padding
        const scaleX = (this.size - this.padding * 2) / trackWidth;
        const scaleZ = (this.size - this.padding * 2) / trackHeight;
        
        // Use the smaller scale to ensure entire track fits
        this.minimapScale = Math.min(scaleX, scaleZ);
        
        // Store track center for centering in minimap
        this.trackCenterX = (minX + maxX) / 2;
        this.trackCenterZ = (minZ + maxZ) / 2;
    }
    
    worldToMinimapX(worldX) {
        // Convert world X coordinate to minimap X coordinate
        return (worldX - this.trackCenterX) * this.minimapScale + this.size / 2;
    }
    
    worldToMinimapY(worldZ) {
        // Convert world Z coordinate to minimap Y coordinate (Z becomes Y in 2D)
        return (worldZ - this.trackCenterZ) * this.minimapScale + this.size / 2;
    }
    
    render(kartPosition, kartRotation) {
        // Clear the canvas
        this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.context.fillRect(0, 0, this.size, this.size);
        
        // Draw the track
        this.drawTrack();
        
        // Draw the kart position
        this.drawKart(kartPosition, kartRotation);
    }
    
    drawTrack() {
        // Draw the track outline
        this.context.beginPath();
        this.context.strokeStyle = 'white';
        this.context.lineWidth = 2;
        
        // Start from the first point
        const firstPoint = this.trackPoints[0];
        this.context.moveTo(
            this.worldToMinimapX(firstPoint.x),
            this.worldToMinimapY(firstPoint.z)
        );
        
        // Draw a line to each subsequent point
        for (let i = 1; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            this.context.lineTo(
                this.worldToMinimapX(point.x),
                this.worldToMinimapY(point.z)
            );
        }
        
        // Close the path and stroke
        this.context.closePath();
        this.context.stroke();
    }
    
    drawKart(kartPosition, kartRotation) {
        // Convert kart position to minimap coordinates
        const kartX = this.worldToMinimapX(kartPosition.x);
        const kartY = this.worldToMinimapY(kartPosition.z);
        
        // Save current context state
        this.context.save();
        
        // Move to kart position and rotate to match kart orientation
        this.context.translate(kartX, kartY);
        this.context.rotate(-kartRotation); // Negative because canvas Y-axis is flipped
        
        // Draw kart as a triangle
        this.context.beginPath();
        this.context.moveTo(5, 0);  // Tip (front of kart)
        this.context.lineTo(-3, -3); // Left rear
        this.context.lineTo(-3, 3);  // Right rear
        this.context.closePath();
        
        // Fill with red
        this.context.fillStyle = 'red';
        this.context.fill();
        
        // Restore context
        this.context.restore();
    }
}

export default Minimap;