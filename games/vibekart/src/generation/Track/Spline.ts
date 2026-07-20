import * as THREE from 'three';
import { TrackSplineSpec } from '../../../types/config.d';

/**
 * Represents a track path defined by a spline curve
 */
export class TrackPath {
  public curve: THREE.CatmullRomCurve3;
  private spec: TrackSplineSpec;
  
  constructor(spec: TrackSplineSpec) {
    this.spec = spec;
    
    // Convert 2D control points to 3D vectors (y=0 initially)
    const points = spec.controlPoints.map(point => 
      new THREE.Vector3(point[0], 0, point[1])
    );
    
    // Create the curve
    this.curve = new THREE.CatmullRomCurve3(
      points,
      spec.closedLoop, // closed loop
      'centripetal' // curve type
    );
  }
  
  /**
   * Get a point on the track at parameter t (0-1)
   */
  public getPointAt(t: number): THREE.Vector3 {
    return this.curve.getPointAt(t);
  }
  
  /**
   * Get the tangent vector at parameter t (0-1)
   */
  public getTangentAt(t: number): THREE.Vector3 {
    return this.curve.getTangentAt(t);
  }
  
  /**
   * Get the normal vector at parameter t (0-1)
   * This is perpendicular to the tangent and points to the right of the track
   */
  public getNormalAt(t: number): THREE.Vector3 {
    const tangent = this.getTangentAt(t);
    
    // Cross product with up vector to get normal (perpendicular to tangent)
    // This assumes the track is mostly horizontal
    const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
    
    return normal;
  }
  
  /**
   * Get the binormal vector at parameter t (0-1)
   * This points upward from the track
   */
  public getBinormalAt(t: number): THREE.Vector3 {
    const tangent = this.getTangentAt(t);
    const normal = this.getNormalAt(t);
    
    // Cross product of tangent and normal gives binormal
    return tangent.clone().cross(normal).normalize();
  }
  
  /**
   * Get the track width at parameter t (0-1)
   */
  public getWidthAt(t: number): number {
    // Base width from spec
    let width = this.spec.width;
    
    // Apply width offsets if defined
    if (this.spec.widthOffsetPoints && this.spec.widthOffsetPoints.length > 0) {
      // Find the two closest offset points
      let prevPoint = null;
      let nextPoint = null;
      
      for (const point of this.spec.widthOffsetPoints) {
        if (point.t <= t) {
          if (!prevPoint || point.t > prevPoint.t) {
            prevPoint = point;
          }
        }
        
        if (point.t >= t) {
          if (!nextPoint || point.t < nextPoint.t) {
            nextPoint = point;
          }
        }
      }
      
      // Interpolate between the two points
      if (prevPoint && nextPoint) {
        const tRange = nextPoint.t - prevPoint.t;
        if (tRange > 0) {
          const tNorm = (t - prevPoint.t) / tRange;
          width += prevPoint.offset * (1 - tNorm) + nextPoint.offset * tNorm;
        } else {
          width += prevPoint.offset;
        }
      } else if (prevPoint) {
        width += prevPoint.offset;
      } else if (nextPoint) {
        width += nextPoint.offset;
      }
    }
    
    return width;
  }
  
  /**
   * Get the bank angle (in radians) at parameter t (0-1)
   */
  public getBankAngleAt(t: number): number {
    // Default is no banking
    let bankAngle = 0;
    
    // Apply bank offsets if defined
    if (this.spec.bankOffsetPoints && this.spec.bankOffsetPoints.length > 0) {
      // Find the two closest offset points
      let prevPoint = null;
      let nextPoint = null;
      
      for (const point of this.spec.bankOffsetPoints) {
        if (point.t <= t) {
          if (!prevPoint || point.t > prevPoint.t) {
            prevPoint = point;
          }
        }
        
        if (point.t >= t) {
          if (!nextPoint || point.t < nextPoint.t) {
            nextPoint = point;
          }
        }
      }
      
      // Interpolate between the two points
      if (prevPoint && nextPoint) {
        const tRange = nextPoint.t - prevPoint.t;
        if (tRange > 0) {
          const tNorm = (t - prevPoint.t) / tRange;
          bankAngle = (prevPoint.angle * (1 - tNorm) + nextPoint.angle * tNorm) * Math.PI / 180;
        } else {
          bankAngle = prevPoint.angle * Math.PI / 180;
        }
      } else if (prevPoint) {
        bankAngle = prevPoint.angle * Math.PI / 180;
      } else if (nextPoint) {
        bankAngle = nextPoint.angle * Math.PI / 180;
      }
    }
    
    return bankAngle;
  }
  
  /**
   * Get the elevation offset at parameter t (0-1)
   */
  public getElevationOffsetAt(t: number): number {
    // Default is no elevation offset
    let elevationOffset = 0;
    
    // Apply elevation offsets if defined
    if (this.spec.elevationOffsetPoints && this.spec.elevationOffsetPoints.length > 0) {
      // Find the two closest offset points
      let prevPoint = null;
      let nextPoint = null;
      
      for (const point of this.spec.elevationOffsetPoints) {
        if (point.t <= t) {
          if (!prevPoint || point.t > prevPoint.t) {
            prevPoint = point;
          }
        }
        
        if (point.t >= t) {
          if (!nextPoint || point.t < nextPoint.t) {
            nextPoint = point;
          }
        }
      }
      
      // Interpolate between the two points
      if (prevPoint && nextPoint) {
        const tRange = nextPoint.t - prevPoint.t;
        if (tRange > 0) {
          const tNorm = (t - prevPoint.t) / tRange;
          elevationOffset = prevPoint.offset * (1 - tNorm) + nextPoint.offset * tNorm;
        } else {
          elevationOffset = prevPoint.offset;
        }
      } else if (prevPoint) {
        elevationOffset = prevPoint.offset;
      } else if (nextPoint) {
        elevationOffset = nextPoint.offset;
      }
    }
    
    return elevationOffset;
  }
  
  /**
   * Get the surface type at parameter t (0-1)
   */
  public getSurfaceTypeAt(t: number): string {
    // Default surface type
    let surfaceType = this.spec.defaultSurfaceType;
    
    // Apply surface overrides if defined
    if (this.spec.surfaceOverrides && this.spec.surfaceOverrides.length > 0) {
      for (const override of this.spec.surfaceOverrides) {
        if (t >= override.tRange[0] && t <= override.tRange[1]) {
          surfaceType = override.surface;
          break;
        }
      }
    }
    
    return surfaceType;
  }
  
  /**
   * Get the total length of the track in world units
   */
  public getLength(): number {
    return this.curve.getLength();
  }
  
  /**
   * Get the track specification
   */
  public getSpec(): TrackSplineSpec {
    return this.spec;
  }
}
