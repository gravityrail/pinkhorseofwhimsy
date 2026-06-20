// Track configuration

// Scale factor to make the track much larger
export const trackScaleFactor = 2.5;

// Define rough sections of the track (0-1 values representing percentage around the track)
export const roughSections = [
    { start: 0.25, end: 0.32, intensity: 1.0 },   // First rough section after first curve
    { start: 0.55, end: 0.65, intensity: 0.8 },   // Second rough section on the back straight
    { start: 0.85, end: 0.95, intensity: 1.2 }    // Third rough section on final curve
];

// Jump ramp definitions
// - trackPosition: position around the track as a percentage (0-1)
// - width: width of the ramp as a percentage of track width (0-1)
// - offset: offset from center of track (-1 to 1, where -1 is far left, 0 is center, 1 is far right)
// - height: height of the ramp at peak in world units
// - length: length of the ramp in world units
export const jumpRamps = [
    // Small ramp on first straight section
    { 
        trackPosition: 0.08, 
        width: 0.5,        // 50% of track width
        offset: -0.3,      // Slightly to the left
        height: 1.0,       // 1 meter high
        length: 5.0        // 5 meters long
    },
    
    // Wide ramp after first curve
    {
        trackPosition: 0.35, 
        width: 0.9,        // 90% of track width
        offset: 0.0,       // Center of track
        height: 1.5,       // 1.5 meters high
        length: 8.0        // 8 meters long
    },
    
    // Narrow ramp on the far side of the track
    {
        trackPosition: 0.6, 
        width: 0.4,        // 40% of track width
        offset: 0.5,       // Right side of track
        height: 2.0,       // 2 meters high
        length: 10.0       // 10 meters long
    },
    
    // Final ramp on a straight section (moved from the corner)
    {
        trackPosition: 0.8, 
        width: 0.7,        // 70% of track width
        offset: 0,         // Center of track
        height: 1.2,       // 1.2 meters high
        length: 6.0        // 6 meters long
    }
];

export const trackControlPoints = [
    // Starting straight
    { x: -40 * trackScaleFactor, z: -30 * trackScaleFactor, width: 10, roughness: 0 },
    { x: -40 * trackScaleFactor, z: -10 * trackScaleFactor, width: 10, roughness: 0 },
    { x: -40 * trackScaleFactor, z: 10 * trackScaleFactor, width: 10, roughness: 0 },
    { x: -40 * trackScaleFactor, z: 30 * trackScaleFactor, width: 10, roughness: 0 },
    
    // First curve
    { x: -40 * trackScaleFactor, z: 50 * trackScaleFactor, width: 10, roughness: 0 },  
    { x: -30 * trackScaleFactor, z: 60 * trackScaleFactor, width: 11, roughness: 0.4 },
    { x: -10 * trackScaleFactor, z: 60 * trackScaleFactor, width: 12, roughness: 0.8 },
    { x: 0 * trackScaleFactor, z: 50 * trackScaleFactor, width: 12, roughness: 1.0 },
    
    // Second curve and straight
    { x: 10 * trackScaleFactor, z: 40 * trackScaleFactor, width: 11, roughness: 0.5 },
    { x: 20 * trackScaleFactor, z: 30 * trackScaleFactor, width: 10, roughness: 0 },
    { x: 30 * trackScaleFactor, z: 15 * trackScaleFactor, width: 10, roughness: 0 },
    { x: 35 * trackScaleFactor, z: 0 * trackScaleFactor, width: 10, roughness: 0 },
    
    // Third curve
    { x: 40 * trackScaleFactor, z: -15 * trackScaleFactor, width: 10, roughness: 0 },
    { x: 35 * trackScaleFactor, z: -30 * trackScaleFactor, width: 10, roughness: 0 },
    { x: 20 * trackScaleFactor, z: -40 * trackScaleFactor, width: 11, roughness: 0.7 },
    { x: 0 * trackScaleFactor, z: -45 * trackScaleFactor, width: 11, roughness: 1.0 },
    
    // Final curve back to start - ensure smooth loop connection
    { x: -15 * trackScaleFactor, z: -50 * trackScaleFactor, width: 11, roughness: 0.8 },
    { x: -30 * trackScaleFactor, z: -45 * trackScaleFactor, width: 10.5, roughness: 0.3 },
    { x: -40 * trackScaleFactor, z: -40 * trackScaleFactor, width: 10, roughness: 0 },
    { x: -40 * trackScaleFactor, z: -30 * trackScaleFactor, width: 10, roughness: 0 } // Make identical to first point
];

// Maximum banking angle in radians (about 7 degrees)
export const maxBankingAngle = 0.12;

// Physics constants for jumps and collisions
export const TRACK_PHYSICS = {
    gravity: 20.0,          // Higher gravity in m/s² for more responsive falls
    jumpLaunchFactor: 2.5,  // Even higher vertical velocity factor for more pronounced jumps
    jumpForwardBoost: 1.2,  // Forward velocity boost when hitting a ramp (multiplier)
    airSteeringFactor: 0.3, // How much steering is possible in the air (0-1)
    collisionSpeedFactor: 0.1, // Speed after collision as fraction of max speed
    collisionBounceFactor: 0.3, // How much the kart bounces off obstacles
    rampFriction: 0.98,     // Less friction on ramps
    recoveryTimeout: 5.0,   // Seconds to wait before resetting kart if stuck
    recoveryMinVelocity: 0.01 // Minimum velocity threshold to avoid being considered "stuck"
};