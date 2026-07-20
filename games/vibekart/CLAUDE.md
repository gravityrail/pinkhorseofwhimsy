# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibekart is a 3D karting track rendering engine built with TypeScript, Three.js and Vite. It procedurally generates terrain, tracks, and environmental elements for kart racing visualizations.

## Development Commands

```bash
# Install dependencies
yarn install

# Start development server with hot-reload
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## Architecture

### Core System

- **Engine.ts**: Main class that initializes the 3D scene, camera, renderer, and manages the animation loop
- **Config.ts**: Configuration settings for world generation, including terrain parameters, track specifications, etc.
- **PRNG.ts**: Pseudo-random number generator for reproducible procedural generation

### Generation Pipeline

1. **Terrain Generation**
   - `HeightMap.ts`: Creates the base heightmap using hills and noise
   - `Hills.ts`: Defines hill shapes and their contribution to terrain

2. **Track System**
   - `Spline.ts`: Defines the track path as a 3D spline curve
   - `MeshBuilder.ts`: Constructs the 3D mesh representation of the track

3. **Surface & Object Placement**
   - `AltitudeMapper.ts`: Maps terrain height to surface types
   - `SplatPainter.ts`: Handles surface texture blending
   - `Scatterer.ts`: Places objects (trees, rocks, etc.) based on surface type and rules

### Rendering

- **SceneBuilder.ts**: Orchestrates the creation of the entire 3D scene
- **SurfaceShader.ts**: Handles terrain surface material and shading
- **WaterShader.ts**: Implements water surface rendering

### UI

- **Gui.ts**: Interactive controls for modifying the world configuration
- **Controls.ts**: Camera controls for navigating the 3D scene

## Workflow Notes

1. The engine uses a seeded PRNG to ensure reproducible generation
2. The `regenerateWorld()` method rebuilds the entire world when configuration changes
3. All configuration parameters can be adjusted through the UI using lil-gui
4. The scene is rendered using Three.js with optional post-processing effects like bloom
5. Water is implemented as a shader-based plane at a configurable height

## Type System

- Configuration types are defined in `types/config.d.ts`
- Each component uses TypeScript interfaces to ensure type safety
- The `VibekartConfig` interface defines the complete configuration structure

## Design Patterns

- **Component-based architecture**: Each part of the system is encapsulated
- **Factory pattern**: Used for creating different types of objects and surfaces
- **Command pattern**: Used in the UI to handle configuration changes