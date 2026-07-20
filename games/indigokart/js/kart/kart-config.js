// Kart configuration parameters

// Kart dimensions
export const kartSize = {
    width: 1,
    height: 0.5,
    depth: 2
};

// Physics constants
export const PHYSICS = {
    // Performance
    kartMaxSpeed: 0.22,         // Original max speed value - actual speed depends on movement multiplier
    offTrackSpeedMultiplier: 0.55, // 45% reduction when off track
    turnSpeed: 0.03,            // Moderate turn speed for balanced steering
    
    // Physics constants
    kartMass: 430,              // Kart mass in kg
    kartPower: 950,             // Original engine power value
    onTrackFriction: 0.984,     // On-track friction coefficient
    offTrackFriction: 0.92,     // Off-track friction coefficient
    brakingPower: 1300,         // Original braking power
    
    // Gravity and terrain physics
    gravity: 9.81,                  // Gravitational acceleration (m/s²)
    gravityFactor: 1.2,             // Multiplier for gravity effects (increased for more pronounced effects)
    downhillAccelerationFactor: 0.8, // How much gravity accelerates the kart downhill (increased)
    uphillDecelerationFactor: 1.5,   // How much gravity slows the kart uphill (increased)
    maxSlopeEffect: 0.25,           // Maximum speed change from slopes (as fraction of maxSpeed) (increased)
    slopeSensitivity: 6.0,          // How sensitive the kart is to slopes (higher = more effect) (increased)
    slopeThreshold: 0.01,           // Very low minimum slope threshold to detect even subtle terrain changes
    
    // Steering physics
    minSpeedForSteering: 0.0001, // Even lower minimum speed for steering at all speeds
    steeringResponseCurve: 0.4,  // Even flatter curve for more consistent steering (lower = flatter)
    wheelGripFactor: 0.9,        // Further increased grip for better control
    understeerFactor: 0.3,       // Further reduced understeer at high speeds for better control
    steeringDeadzone: 0.0001,    // Very low speed below which steering behavior changes
    steeringRecoveryRate: 0.95,  // Even faster wheel return for more responsive feel
    
    // Inertia physics
    inertiaFactor: 0.1,         // Further reduced inertia for more responsive turning (lower = less inertia)
    massTransferFactor: 0.5,     // Increased weight shifts during acceleration/braking for better feel
    lateralGripDecay: 0.9,       // Improved grip retention when sliding
    
    // Suspension physics
    suspensionStiffness: 3500,  // Further reduced stiffness for softer feel (N/m)
    suspensionDamping: 400,     // Further reduced damping for more oscillation (N*s/m)
    suspensionTravel: 0.18,     // Increased suspension travel in meters
    suspensionRestHeight: 0.06, // Slightly higher resting height of suspension
    chassisRollStiffness: 650,  // Further reduced for more pronounced body roll
    pitchStiffness: 1300,       // Further reduced for more pronounced pitch during acceleration/braking
    dampingCoefficient: 0.92    // Natural damping coefficient for chassis oscillation
};

// Wheel configuration
export const wheelConfig = {
    radius: 0.25,
    thickness: 0.15,
    offsetX: kartSize.width / 2 + 0.15 / 3, // Slightly inside the kart width
    offsetY: -kartSize.height / 2 + 0.25 / 2, // At the bottom of the kart
    frontOffsetZ: kartSize.depth / 3,      // Position along the kart length for front wheels
    rearOffsetZ: -kartSize.depth / 3       // Position for rear wheels
};