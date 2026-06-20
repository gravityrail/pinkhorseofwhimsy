// Bezier curve utilities

// Function to calculate a point on a cubic Bezier curve
export function bezierPoint(p0, p1, p2, p3, t) {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;
    
    return {
        x: oneMinusTCubed * p0.x + 3 * oneMinusTSquared * t * p1.x + 3 * oneMinusT * tSquared * p2.x + tCubed * p3.x,
        z: oneMinusTCubed * p0.z + 3 * oneMinusTSquared * t * p1.z + 3 * oneMinusT * tSquared * p2.z + tCubed * p3.z,
        width: oneMinusTCubed * p0.width + 3 * oneMinusTSquared * t * p1.width + 3 * oneMinusT * tSquared * p2.width + tCubed * p3.width
    };
}

// Function to calculate the derivative of a cubic Bezier curve (for tangent)
export function bezierDerivative(p0, p1, p2, p3, t) {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const tSquared = t * t;
    
    return {
        x: 3 * oneMinusTSquared * (p1.x - p0.x) + 6 * oneMinusT * t * (p2.x - p1.x) + 3 * tSquared * (p3.x - p2.x),
        z: 3 * oneMinusTSquared * (p1.z - p0.z) + 6 * oneMinusT * t * (p2.z - p1.z) + 3 * tSquared * (p3.z - p2.z)
    };
}

// Function to calculate the second derivative of a cubic Bezier curve (for curvature)
export function bezierSecondDerivative(p0, p1, p2, p3, t) {
    const oneMinusT = 1 - t;
    
    return {
        x: 6 * oneMinusT * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x),
        z: 6 * oneMinusT * (p2.z - 2 * p1.z + p0.z) + 6 * t * (p3.z - 2 * p2.z + p1.z)
    };
}

// Function to calculate curvature at a point on a bezier curve
export function calculateCurvature(p0, p1, p2, p3, t) {
    const derivative = bezierDerivative(p0, p1, p2, p3, t);
    const secondDerivative = bezierSecondDerivative(p0, p1, p2, p3, t);
    
    // Curvature formula for 2D curve: |x'y'' - y'x''| / (x'^2 + y'^2)^(3/2)
    const numerator = Math.abs(derivative.x * secondDerivative.z - derivative.z * secondDerivative.x);
    const denominator = Math.pow(derivative.x * derivative.x + derivative.z * derivative.z, 1.5);
    
    return numerator / denominator;
}