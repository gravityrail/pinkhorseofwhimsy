import * as THREE from 'three';

// Based on Spec Section 4 & others
export type SurfaceType = 'asphalt' | 'grass' | 'sand' | 'water' | 'ice' | 'snow' | 'rock' | 'dirt' | 'mud';

export interface HillSpec {
  center: [number, number]; // x, y
  scale: [number, number, number]; // scaleX, scaleY, scaleZ (height)
  exponent: number; // Falloff sharpness
}

export interface SparseMapTile<T> { // For sparse offsets or painted surfaces
    x: number;
    y: number;
    value: T;
}

// Using a simple array of tiles for sparse data for now, QuadTree is complex for initial setup
export type SparseOffsetsData = SparseMapTile<number>[]; // value is height offset

export interface AltitudeBand {
  minAltitude: number;
  maxAltitude: number;
  textures: Partial<Record<SurfaceType, number>>; // e.g., { sand: 0.8, grass: 0.2 }
}

export interface PaintedSurfaceData extends SparseMapTile<Partial<Record<SurfaceType, number>>> {}

export type TreeType = 'pineTree' | 'palmTree' | 'gumTree';

export interface ScatterRule {
  surfaceTypes: SurfaceType[]; // Apply to these surface types
  objectType: string; // e.g., 'pineTree', 'palmTree', 'gumTree', 'rock', etc.
  density: number; // objects per square meter (or per grid cell)
  minScale?: number;
  maxScale?: number;
  avoidTrack?: boolean; // Whether to avoid placing objects on the track (defaults to true)
  // meshFactory: () => THREE.Mesh; // This would be ideal, but hard to serialize in JSON.
                                // We'll use predefined types and factories in code.
}

export interface ExplicitObjectSpec {
  type: string; // Matches a key in a predefined object factory
  position: [number, number, number];
  rotation?: [number, number, number]; // Euler angles (radians)
  scale?: [number, number, number];
}

// Simplified Curve for config - actual Three.js Curves used in code
export type ConfigurableCurve = { type: 'catmullrom' | 'cubicbezier', points: [number, number][] }; // For 2D path parameters

export interface TrackSplineSpec {
  controlPoints: [number, number][]; // XY coordinates for the track centerline
  closedLoop: boolean;
  width: number;
  // For widthOffsets, bankOffsets, elevationOffsets, we'd use a more complex Curve representation
  // or a series of { t: value } points. For now, keeping it simpler.
  // Using simple number/array for now for easier GUI
  widthOffsetPoints?: { t: number, offset: number }[]; // t is 0-1 along track
  bankOffsetPoints?: { t: number, angle: number }[]; // angle in degrees
  elevationOffsetPoints?: { t: number, offset: number }[];
  defaultSurfaceType: SurfaceType;
  surfaceOverrides?: { tRange: [number, number]; surface: SurfaceType }[];
}

// Weather type options
export type WeatherType = 'clear' | 'cloudy' | 'overcast' | 'fog' | 'rain' | 'storm';

export interface AtmosphereConfig {
  // Time settings
  time: {
    enabled: boolean;
    startTimeOfDay: number; // Hour of the day (0-24, decimal for minutes)
    timeSpeedMultiplier: number; // How fast time passes
    autoTimeProgression: boolean; // Whether time advances automatically
  };
  // Sky settings
  sky: {
    enabled: boolean;
    sunIntensity: number;
    moonIntensity: number;
    starsIntensity: number;
  };
  // Weather settings
  weather: {
    type: WeatherType;
    intensity: number; // 0-1 for rain/fog/etc. intensity
    cloudCoverage: number; // 0-1 for cloud coverage
    fogDistance: number; // Distance at which fog reaches maximum density
    fogColor: string; // Hex color code
  };
}

export interface VibekartConfig {
  seed: string;
  world: {
    gridSize: [number, number]; // width, depth in cells/meters
    cellSize: number; // size of a single grid cell in meters
    lod: {
      terrain: number; // e.g., 1 = full detail, 2 = half, etc.
      objects: number;
    };
  };
  terrain: {
    baseHeight: number;
    hills: HillSpec[];
    sparseOffsets: SparseOffsetsData; // For cliffs, trenches. Simplified for now.
    // Perlin noise parameters for overall terrain variation (optional, can be part of hills)
    noise: {
      enabled: boolean;
      scale: number;
      octaves: number;
      persistence: number;
      lacunarity: number;
      amplitude: number;
    }
  };
  surfaces: {
    altitudeMap: AltitudeBand[];
    noise: { // For fuzzing surface type blending
      amplitude: number; // 0-1 how much noise affects blending
      scale: number; // Scale of the noise pattern
    };
    paint: PaintedSurfaceData[]; // User-painted surface areas
  };
  objects: {
    probabilistic: ScatterRule[];
    explicit: ExplicitObjectSpec[];
    trees?: {
      density: number; // Overall tree density multiplier
      distribution: {
        pine: number; // Relative proportion (0-1)
        palm: number; // Relative proportion (0-1)
        gum: number;  // Relative proportion (0-1)
      };
    };
  };
  track: TrackSplineSpec;
  water: {
    enabled: boolean;
    level: number; // Y-coordinate of water surface
    surfaceType: SurfaceType; // If ground plane is water
  };
  // New atmosphere settings
  atmosphere: AtmosphereConfig;
  rendering: {
    shadows: boolean;
    bloom: {
        enabled: boolean;
        strength: number;
        radius: number;
        threshold: number;
    }
  };
  // Debug visualization settings
  debug?: {
    showNormals: boolean; // Show surface normal vectors
    normalInterval: number; // Distance between normals in world units
  }
}
