import { VibekartConfig } from '../../types/config.d';

export const DEFAULT_CONFIG: VibekartConfig = {
  seed: 'vibekart',
  world: {
    gridSize: [256, 256], // 256x256 meters world
    cellSize: 1, // 1 meter per cell
    lod: {
      terrain: 1,
      objects: 1,
    },
  },
  terrain: {
    baseHeight: 0,
    hills: [
      { center: [64, 64], scale: [80, 80, 20], exponent: 2 },
      { center: [180, 150], scale: [120, 120, 35], exponent: 2.5 },
      { center: [100, 200], scale: [60, 60, -15], exponent: 2 }, // A depression
    ],
    sparseOffsets: [],
    noise: {
        enabled: true,
        scale: 50,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
        amplitude: 0.05, // Reduced to 1/100th of previous value (was 5)
    }
  },
  surfaces: {
    altitudeMap: [
      { minAltitude: -100, maxAltitude: 1, textures: { 'sand': 0.8, 'rock': 0.2 } },
      { minAltitude: 1, maxAltitude: 15, textures: { 'grass': 0.9, 'dirt': 0.1 } },
      { minAltitude: 15, maxAltitude: 30, textures: { 'rock': 0.7, 'grass': 0.3 } },
      { minAltitude: 30, maxAltitude: 100, textures: { 'snow': 0.8, 'rock': 0.2 } },
    ],
    noise: { amplitude: 0.1, scale: 20 },
    paint: [],
  },
  objects: {
    probabilistic: [
        { surfaceTypes: ['grass', 'dirt'], objectType: 'pineTree', density: 0.005, minScale: 0.8, maxScale: 1.5, avoidTrack: true },
        { surfaceTypes: ['grass', 'dirt'], objectType: 'palmTree', density: 0.002, minScale: 0.9, maxScale: 1.4, avoidTrack: true },
        { surfaceTypes: ['grass', 'dirt'], objectType: 'gumTree', density: 0.003, minScale: 0.7, maxScale: 1.6, avoidTrack: true },
        { surfaceTypes: ['rock', 'sand'], objectType: 'rock', density: 0.02, minScale: 0.5, maxScale: 2.0, avoidTrack: true },
    ],
    explicit: [
        // { type: 'pineTree', position: [50, 0, 50], scale: [1,1.5,1] } // Y will be set by terrain height
    ],
    trees: {
      density: 1.0, // Overall multiplier
      distribution: {
        pine: 0.5,  // 50% pine trees
        palm: 0.2,  // 20% palm trees
        gum: 0.3    // 30% gum trees
      }
    }
  },
  track: {
    controlPoints: [
      [50, 50], [100, 50], [150, 100], [150, 150],
      [100, 200], [50, 150], [50, 100], [50, 50]
    ],
    closedLoop: true,
    width: 4, // meters
    defaultSurfaceType: 'asphalt',
    // Example overrides (simplified, full implementation complex)
    // surfaceOverrides: [ { tRange: [0.2, 0.4], surface: 'dirt' } ]
  },
  water: {
    enabled: true,
    level: -5,
    surfaceType: 'water',
  },
  atmosphere: {
    time: {
      enabled: true,
      startTimeOfDay: 10.0, // 10:00 AM
      timeSpeedMultiplier: 10.0, // 10x real-time
      autoTimeProgression: true,
    },
    sky: {
      enabled: true,
      sunIntensity: 1.0,
      moonIntensity: 0.3,
      starsIntensity: 0.5,
    },
    weather: {
      type: 'clear',
      intensity: 0,
      cloudCoverage: 0.2,
      fogDistance: 1000,
      fogColor: '#B8C5DB'
    },
  },
  rendering: {
    shadows: true,
    bloom: {
        enabled: true,
        strength: 0.2,
        radius: 0.4,
        threshold: 0.8,
    }
  },
  // Debug visualization settings
  debug: {
    showNormals: true, // Show surface normal vectors by default
    normalInterval: 10  // Distance between normals in world units
  }
};

// Runtime config, can be modified during execution
export let currentConfig: VibekartConfig = { ...DEFAULT_CONFIG };

// Type for the config
export type { VibekartConfig };
