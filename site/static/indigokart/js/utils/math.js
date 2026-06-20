// Simple noise function for roughness
export function noise(x, z, frequency = 1, amplitude = 1) {
    return amplitude * Math.sin(x * 0.3 * frequency) * Math.cos(z * 0.35 * frequency) * 
           Math.sin((x + z) * 0.2 * frequency);
}

// Function to find the closest point on a line segment to a given point
export function closestPointOnLineSegment(px, pz, x1, z1, x2, z2) {
    const A = px - x1;
    const B = pz - z1;
    const C = x2 - x1;
    const D = z2 - z1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, zz;
    
    if (param < 0) {
        xx = x1;
        zz = z1;
    } else if (param > 1) {
        xx = x2;
        zz = z2;
    } else {
        xx = x1 + param * C;
        zz = z1 + param * D;
    }
    
    const dx = px - xx;
    const dz = pz - zz;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    return {
        x: xx,
        z: zz,
        distance: distance,
        param: param
    };
}

// Function to calculate distance between two points
export function distance(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
}