# Maze Explorer Level Format (v1)

A high-level level description format that compiles to GDevelop game.json.

## GDevelop 3D Capabilities Used

- **Cube3DObject**: Walls, floors, ceilings (per-face textures, tiling)
- **Model3DObject**: GLB props (fountain, barrel, computer, torch)
- **Physics3DCharacterBehavior**: Player collision, gravity, jumping, step-height
- **Layer effects**: DirectionalLight, AmbientLight, LinearFog, HemisphereLight
- **Material**: `StandardWithoutMetalness` for lit surfaces, `KeepOriginal` for GLB models
- **External Layouts**: Reusable room prefabs stamped at offsets

## Format Overview

```jsonc
{
  "format": "maze-level-v1",
  "settings": { ... },     // Global settings
  "textures": { ... },     // Texture catalog
  "materials": { ... },    // Named material presets
  "areas": { ... },        // Area templates (corridor, chamber, etc.)
  "props": { ... },        // Prop catalog (GLB models)
  "grid": [ ... ],         // 2D ASCII grid - the map layout
  "heights": [ ... ],      // Optional per-cell floor height overrides
  "propPlacements": [ ... ], // Where to place props
  "lights": [ ... ],       // Additional point/spot lights
  "spawn": { ... },        // Player start position
  "collectibles": [ ... ]  // Gems, keys, etc.
}
```

## Sections

### settings

```jsonc
{
  "cellSize": 200,         // World units per grid cell
  "wallHeight": 250,       // Default wall height
  "wallThickness": 20,     // Thickness of generated wall slabs
  "ceilingGap": 0,         // Gap between wall top and ceiling (0 = flush)
  "stepHeight": 30,        // Max height player can step up (Physics3D)
  "playerHeight": 80,      // Camera eye height above floor
  "playerRadius": 15,      // Collision capsule radius
  "gravity": 800,          // Downward gravity
  "jumpSpeed": 400,        // Jump impulse
  "moveSpeed": 200,        // Forward/back speed
  "turnSpeed": 120,        // Degrees/sec rotation
  "strafeSpeed": 150       // Sideways speed
}
```

### textures

Named texture catalog. Each entry maps to a PNG file.

```jsonc
{
  "stone_wall": { "file": "stone_wall.png", "tileSize": 64 },
  "stone_floor": { "file": "stone_floor.png", "tileSize": 64 },
  "stone_ceiling": { "file": "stone_ceiling.png", "tileSize": 64 },
  "metal_wall": { "file": "metal_wall.png", "tileSize": 64 },
  "crate": { "file": "crate.png", "tileSize": 32 }
}
```

### materials

Reusable material presets combining textures for walls, floor, ceiling.

```jsonc
{
  "dungeon": {
    "wall": "stone_wall",
    "floor": "stone_floor",
    "ceiling": "stone_ceiling",
    "materialType": "StandardWithoutMetalness"
  },
  "tech": {
    "wall": "metal_wall",
    "floor": "metal_floor",
    "ceiling": "metal_ceiling",
    "materialType": "StandardWithoutMetalness"
  }
}
```

### areas

Area templates define the look/feel of a region. Each character in the
grid (other than `#`) maps to an area template.

```jsonc
{
  ".": {
    "name": "corridor",
    "material": "dungeon",
    "floorHeight": 0,
    "ceilingHeight": 250,
    "lighting": {
      "pattern": "sconces",   // "sconces", "ceiling", "none"
      "spacing": 3,           // Every N cells
      "color": "#ff9944",
      "intensity": 0.8,
      "radius": 400
    }
  },
  "C": {
    "name": "chamber",
    "material": "dungeon",
    "floorHeight": 0,
    "ceilingHeight": 350,     // Taller ceiling in chambers
    "lighting": {
      "pattern": "ceiling",
      "spacing": 2,
      "color": "#aaccff",
      "intensity": 1.0,
      "radius": 600
    }
  },
  "S": {
    "name": "server_room",
    "material": "tech",
    "floorHeight": -10,       // Slightly raised floor
    "ceilingHeight": 200,     // Lower ceiling
    "lighting": {
      "pattern": "ceiling",
      "spacing": 2,
      "color": "#44ff88",
      "intensity": 0.6,
      "radius": 300
    }
  }
}
```

### props

Catalog of placeable 3D model objects. Each has a GLB file, collision
shape, and optional light emission.

```jsonc
{
  "fountain": {
    "model": "fountain.glb",
    "collision": "cylinder",
    "radius": 60,
    "height": 80,
    "materialType": "KeepOriginal",
    "castShadow": true
  },
  "barrel": {
    "model": "barrel.glb",
    "collision": "cylinder",
    "radius": 25,
    "height": 50,
    "materialType": "KeepOriginal",
    "castShadow": true
  },
  "computer": {
    "model": "computer.glb",
    "collision": "box",
    "width": 60,
    "depth": 30,
    "height": 80,
    "materialType": "KeepOriginal",
    "castShadow": true,
    "light": { "color": "#44ff88", "intensity": 0.3, "radius": 150 }
  },
  "torch": {
    "model": "torch.glb",
    "collision": "none",
    "wallMount": true,
    "materialType": "KeepOriginal",
    "light": { "color": "#ff9944", "intensity": 0.8, "radius": 300 },
    "animation": "flame"
  },
  "crate": {
    "model": "crate.glb",
    "collision": "box",
    "width": 40,
    "depth": 40,
    "height": 40,
    "materialType": "KeepOriginal",
    "stackable": true,
    "castShadow": true
  }
}
```

### grid

2D ASCII map. Each character maps to an area template or `#` for solid.

Rules:
- `#` = solid (walls generated at boundaries with open cells)
- Any other character = open space, looked up in `areas`
- Grid must be rectangular (pad with `#` if needed)
- All open cells on the border MUST be `#` (enforced by compiler)
- Connected regions of the same area type form a "room"

```
####################
#..................#
#.####.####.####.C.#
#.#CC#.#CC#.#CC#.C.#
#.#CC#.#CC#.#CC..C.#
#.#CC#.#CC#.####.C.#
#.####.####......C.#
#..................#
#.####.........####.#
#.#SS#.........#CC#.#
#.#SS..........#CC#.#
#.####.........####.#
#..................#
####################
```

### heights (optional)

Per-cell floor height overrides. Same dimensions as grid.
Only open cells need values; `#` cells are ignored.
Omitted cells use the area template's `floorHeight`.

```jsonc
[
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,10,20,30,0,0,0],  // Ramp up
  [0,0,0,0,30,30,30,0,0,0],  // Elevated platform
]
```

Height constraints:
- Adjacent cells may differ by at most `wallHeight` (otherwise unreachable)
- The compiler warns if adjacent floor height difference > `stepHeight`
  (player can't walk there without jumping)

### propPlacements

Place props from the catalog into the level by grid coordinate.
Fractional coordinates place within a cell (0.5 = center).

```jsonc
[
  { "prop": "fountain", "gx": 4.5, "gy": 4.5, "angle": 0 },
  { "prop": "barrel", "gx": 2.2, "gy": 7.8, "angle": 15 },
  { "prop": "barrel", "gx": 2.8, "gy": 7.5, "angle": -10 },
  { "prop": "computer", "gx": 9.0, "gy": 3.5, "angle": 90, "wallSide": "east" },
  { "prop": "torch", "gx": 1.0, "gy": 4.0, "wallSide": "west", "heightOffset": 150 },
  { "prop": "crate", "gx": 6.5, "gy": 2.5, "stack": 2 }
]
```

- `gx`, `gy`: Grid coordinates (0-indexed from top-left)
- `angle`: Rotation in degrees (Y-axis)
- `wallSide`: For wall-mounted props, which wall to attach to
- `heightOffset`: Vertical offset from floor
- `stack`: For stackable props, how many to stack

### lights (optional)

Additional manual light placements beyond area template auto-lighting.

```jsonc
[
  { "type": "point", "gx": 5.5, "gy": 5.5, "height": 200,
    "color": "#ffffff", "intensity": 1.5, "radius": 800 }
]
```

### spawn

Player start position (grid coordinates).

```jsonc
{ "gx": 1.5, "gy": 1.5, "angle": 90 }
```

### collectibles

Pickups placed in the level.

```jsonc
[
  { "type": "gem", "gx": 4.5, "gy": 4.5 },
  { "type": "gem", "gx": 9.5, "gy": 3.5 },
  { "type": "key", "gx": 7.5, "gy": 10.5 }
]
```

### enemies

Roaming combatants (Model3D, no static physics — driven by combat JsCode).

```jsonc
[
  { "type": "beholder", "gx": 12.5, "gy": 15.5,
    "hp": 120, "speed": 45, "aggro": 700, "damage": 18,
    "meleeRange": 90, "float": true, "boss": true, "roar": true },
  { "type": "gargoyle", "gx": 7.5, "gy": 13.5,
    "hp": 45, "speed": 75, "aggro": 550, "damage": 12 },
  { "type": "pacman", "gx": 12.5, "gy": 3.5,
    "hp": 30, "speed": 95, "aggro": 450, "damage": 8 }
]
```

- `type`: `beholder` | `gargoyle` | `pacman` (must match a Model3D object / GLB)
- `hp`, `speed`, `aggro`, `damage`, `meleeRange`: combat tuning
- `float` / `roar` / `boss`: beholder juice flags

### doors

Locked wall slabs. Player must hold a key and walk near the door to open it.

```jsonc
[
  { "id": "treasure-gate", "gx": 12.5, "gy": 12.95,
    "orientation": "ew", "requiresKey": true,
    "width": 200, "thickness": 28, "height": 220 }
]
```

- `orientation`: `ew` spans X (blocks north–south traffic); `ns` spans Y

## Compilation Process

The level compiler (`compile-level.mjs`) transforms the level JSON into
a complete GDevelop `game.json`:

1. **Parse grid** - identify open cells, solid cells, room regions
2. **Generate floors** - one Cube3D per open cell (or merged for efficiency)
3. **Generate ceilings** - one Cube3D per open cell at ceiling height
4. **Generate walls** - for each boundary between open and solid cells,
   emit a thin wall slab. Texture comes from the open cell's material.
   Wall faces point INWARD (toward the open cell).
5. **Generate height transitions** - where adjacent cells have different
   floor heights, emit short wall segments to fill the gap
6. **Place props** - emit Model3DObject instances at world coordinates
7. **Place lights** - emit light objects (area template auto-lights + manual)
8. **Set up layer effects** - DirectionalLight, AmbientLight, LinearFog
9. **Generate player** - invisible Cube3D with Physics3DCharacterBehavior
   at spawn position, with camera follow events
10. **Generate events** - movement input, camera follow, head-bob,
    collectible pickup, HUD updates
11. **Register resources** - all textures, GLB models, in resources array

## Validation Rules

The compiler enforces:
- Grid is rectangular
- All border cells are `#` (enclosed level)
- Every area character in grid has a matching `areas` entry
- Spawn point is on an open cell
- All collectibles are on open cells
- Props don't overlap solid cells
- No orphaned rooms (all open cells reachable from spawn)
- Height differences between adjacent cells are flagged if > stepHeight
- All referenced texture files and GLB models exist on disk
