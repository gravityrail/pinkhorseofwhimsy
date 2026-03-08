# Skill: Creating GDevelop Games Programmatically

## Overview

GDevelop projects are **plain JSON files** with a well-defined structure. We can create games by:

1. Writing a `.json` project file (the GDevelop native format)
2. Creating real pixel art assets using `@napi-rs/canvas` (actual pixel-level PNGs)
3. Building to playable HTML5 using `gdexporter`

## Project File Structure

A GDevelop `.json` file has these top-level keys:

```json
{
  "firstLayout": "Level1",
  "gdVersion": { "build": 237, "major": 5, "minor": 5, "revision": 0 },
  "properties": { ... },
  "resources": { "resources": [...], "resourceFolders": [] },
  "objects": [],
  "objectsFolderStructure": { "folderName": "__ROOT", "children": [] },
  "objectsGroups": [],
  "variables": [...],
  "layouts": [...],
  "externalEvents": [],
  "eventsFunctionsExtensions": [],
  "externalLayouts": [],
  "externalSourceFiles": []
}
```

### Properties

```json
{
  "name": "My Game",
  "description": "A cool game",
  "windowWidth": 800,
  "windowHeight": 600,
  "maxFPS": 60,
  "minFPS": 20,
  "packageName": "com.grassvalley.mygame",
  "orientation": "landscape",
  "scaleMode": "nearest",
  "pixelsRounding": true,
  "platforms": [{ "name": "GDevelop JS platform" }],
  "currentPlatform": "GDevelop JS platform"
}
```

### Resources

Every image/sound used must be declared:

```json
{
  "resources": [
    { "file": "player.png", "kind": "image", "name": "player.png", "smoothed": false, "userAdded": true },
    { "file": "jump.wav", "kind": "audio", "name": "jump.wav", "smoothed": false, "userAdded": true }
  ]
}
```

### Layouts (Scenes)

Each layout has objects, instances (placed objects), events (logic), and layers:

```json
{
  "name": "Level1",
  "mangledName": "Level1",
  "b": 200, "r": 135, "v": 235,
  "objects": [...],
  "instances": [...],
  "events": [...],
  "layers": [...],
  "behaviorsSharedData": [...],
  "objectsFolderStructure": { "folderName": "__ROOT", "children": [...] }
}
```

### Object Types

#### Sprite (animated 2D object)
```json
{
  "name": "Player",
  "type": "Sprite",
  "behaviors": [
    {
      "name": "PlatformCharacter",
      "type": "PlatformBehavior::PlatformerObjectBehavior",
      "gravity": 1000, "jumpSpeed": 600, "maxSpeed": 500,
      "acceleration": 1500, "deceleration": 1500, "maxFallingSpeed": 700
    }
  ],
  "animations": [{
    "name": "idle",
    "useMultipleDirections": false,
    "directions": [{
      "looping": true,
      "timeBetweenFrames": 0.08,
      "sprites": [{
        "image": "player.png",
        "hasCustomCollisionMask": false,
        "points": [],
        "originPoint": { "name": "origine", "x": 0, "y": 0 },
        "centerPoint": { "automatic": true, "name": "centre", "x": 0, "y": 0 },
        "customCollisionMask": []
      }]
    }]
  }]
}
```

#### TiledSprite (repeating texture for platforms/ground)
```json
{
  "name": "Ground",
  "type": "TiledSpriteObject::TiledSprite",
  "behaviors": [{ "name": "Platform", "type": "PlatformBehavior::PlatformBehavior", "canBeGrabbed": false, "platformType": "NormalPlatform" }],
  "width": 800, "height": 64, "texture": "ground.png"
}
```

#### Text
```json
{
  "name": "ScoreText",
  "type": "TextObject::Text",
  "characterSize": 32,
  "color": { "b": 255, "g": 255, "r": 255 },
  "string": "Score: 0",
  "bold": true
}
```

#### 3D Box (for 3D games)
```json
{
  "name": "Wall",
  "type": "Scene3D::Cube3DObject",
  "width": 100, "height": 200, "depth": 100,
  "frontFaceResourceName": "wall.png",
  "backFaceResourceName": "wall.png",
  "leftFaceResourceName": "wall.png",
  "rightFaceResourceName": "wall.png",
  "topFaceResourceName": "wall.png",
  "bottomFaceResourceName": "wall.png",
  "materialType": "Basic"
}
```

### Instances (Placed Objects)

```json
{
  "name": "Player",
  "x": 64, "y": 472,
  "angle": 0,
  "customSize": false,
  "height": 0, "width": 0,
  "layer": "",
  "zOrder": 2,
  "persistentUuid": "unique-id"
}
```

For objects with custom size (like tiled sprites):
```json
{
  "name": "Ground",
  "x": 0, "y": 536,
  "customSize": true,
  "width": 800, "height": 64
}
```

### Events (Game Logic)

Events use condition/action pairs:

```json
{
  "type": "BuiltinCommonInstructions::Standard",
  "conditions": [
    { "type": { "value": "CollisionNP" }, "parameters": ["Player", "Coin", "", "", ""] }
  ],
  "actions": [
    { "type": { "value": "Delete" }, "parameters": ["Coin", ""] },
    { "type": { "value": "SetNumberVariable" }, "parameters": ["Score", "+", "10"] },
    { "type": { "value": "TextObject::String" }, "parameters": ["ScoreText", "=", "\"Score: \" + ToString(Variable(Score))"] }
  ]
}
```

#### Common Event Conditions
- `DepartScene` - scene starts (at beginning of scene)
- `CollisionNP` - collision between objects: `["ObjA", "ObjB", "", "", ""]`
- `NumberVariable` - compare variable: `["VarName", "<=", "0"]`
- `KeyPressed` - key is pressed: `["", "Space"]`

#### Common Event Actions
- `SetNumberVariable` - set/modify variable: `["VarName", "=", "0"]` or `["VarName", "+", "10"]`
- `TextObject::String` - set text: `["TextObj", "=", "\"text\""]`
- `Delete` - remove object: `["ObjName", ""]`
- `MettreXY` - set position: `["ObjName", "=", "100", "=", "200"]`
- `Scene` - change scene: `["SceneName", ""]`

### Layers

For 2D:
```json
{ "name": "", "renderingType": "", "visibility": true, "cameras": [{ "defaultSize": true, "defaultViewport": true }] }
```

For 3D:
```json
{ "name": "", "renderingType": "2d+3d", "camera3DFieldOfView": 60, "camera3DFarPlaneDistance": 10000 }
```

## Creating Pixel Art Assets

Use `@napi-rs/canvas` to create actual pixel-level PNGs:

```js
import { createCanvas } from '@napi-rs/canvas';

const c = createCanvas(32, 32); // ACTUAL 32x32 pixels
const ctx = c.getContext('2d');

// Draw individual pixels
ctx.fillStyle = '#ff0000';
ctx.fillRect(x, y, 1, 1); // Single pixel

// Or use a pixel map helper
function drawPixelArt(ctx, pixelMap, palette) {
  pixelMap.trim().split('\n').forEach((row, y) => {
    [...row.trim()].forEach((ch, x) => {
      if (palette[ch]) {
        ctx.fillStyle = palette[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    });
  });
}

const buf = c.toBuffer('image/png');
```

**Important:** NEVER use AI image generation for pixel art. AI produces high-resolution "pixel art style" images with fake transparency grids. Real pixel art must be drawn pixel-by-pixel at the actual target resolution.

## Building Games

```bash
cd games
npm install
node build-games.mjs           # Build all
node build-games.mjs --filter 2d  # Build 2D only
```

This uses a custom exporter (`games/gdexport/`) that automatically downloads the latest GDevelop core (libGD.js) and GDJS Runtime from GDevelop's infrastructure, builds the TypeScript runtime with esbuild, and exports projects to playable HTML5 in `site/static/arcade/games/<name>/`. The toolchain is cached in `games/gdexport/.cache/`.

**Important:** Every image used by a game must be declared in the `resources.resources` array in game.json:
```json
{ "file": "player.png", "kind": "image", "name": "player.png", "smoothed": false, "userAdded": true }
```

## 3D Model Objects (GLB)

GDevelop supports loading GLB/glTF models via `Scene3D::Model3DObject`:

```json
{
  "name": "Barrel",
  "type": "Scene3D::Model3DObject",
  "content": {
    "width": 100, "height": 100, "depth": 100,
    "modelResourceName": "barrel.glb",
    "materialType": "KeepOriginal",
    "originLocation": "BottomCenterZ",
    "animations": [],
    "isCastingShadow": true,
    "isReceivingShadow": true
  }
}
```

GLB resources must be registered with `kind: 'model3D'`:
```json
{ "file": "barrel.glb", "kind": "model3D", "name": "barrel.glb", "userAdded": true }
```

### Animated GLB Models

GLB animations (e.g., blinking LEDs) are supported. Add animation entries to `content.animations`:
```json
"animations": [{ "name": "blink", "source": "blink", "loop": true }]
```
The first animation plays automatically. `source` must match the animation name in the GLB file.

### Generating GLB Models

**Procedural (simple props):** Use `@gltf-transform/core` to build geometry in code.
See `games/3d/maze-explorer/generate-props.mjs`. Key notes:
- All accessors must be assigned to a buffer: `accessor.setBuffer(buf)`
- Set `.setDoubleSided(true)` on all materials (GDevelop's Y-flip inverts winding)
- GLB Z axis maps to game vertical (up)
- Scale animations on child nodes simulate blinking/toggling

**AI-generated (detailed assets):** Use TRELLIS.2 (image → 3D with PBR textures).
See `games/trellis/SETUP.md` for RunPod setup. Quick usage:
```bash
cd games/trellis
python3 runpod-trellis.py generate --image statue.png --output ../3d/maze-explorer/statue.glb
```

### GDevelop 3D Coordinate Mapping

- GDevelop: X = right, Y = forward (grid), Z = up
- GLB model: Z axis → game Z (vertical up)
- `angle` property rotates around Z (yaw)
- GDevelop applies Y-flip (`scale.y = -depth`), so use double-sided materials

## File Structure

```
games/
  package.json              # Dependencies: @napi-rs/canvas
  build-games.mjs           # Build script
  generate-assets.mjs       # Pixel art generator
  SKILL.md                  # This file
  gdexport/
    index.mjs               # Export function (uses latest GDCore + GDJS Runtime)
    setup.mjs               # Downloads libGD.js/wasm, builds GDJS Runtime
    .cache/                  # Auto-populated: libGD.js, libGD.wasm, built Runtime/
  2d/
    coin-collector/
      game.json             # GDevelop project
      player.png            # 32x32 real pixel art
      coin.png              # 24x24
      ground.png            # 32x32 tileable
      platform.png          # 32x32 tileable
    platform-runner/
      game.json
      runner.png, spike.png, ground.png, enemy.png
  3d/
    maze-explorer/
      game.json             # Compiled from level.json
      level.json            # High-level level description
      compile-level.mjs     # Level compiler: level.json → game.json
      generate-props.mjs    # Procedural GLB model generator
      generate-minimap.mjs  # Minimap image generator
      *.glb                 # 3D prop models (barrel, crate, computer, sconce, etc.)
      *.png                 # Textures (wall, floor, ceiling, minimap)
  trellis/
    runpod-trellis.py       # RunPod pod manager (start/setup/generate/stop)
    generate-model.mjs      # Image-to-3D via HuggingFace or RunPod
    server.py               # Flask API server (runs on the pod)
    SETUP.md                # Full setup instructions
```

## Adding a New Game

1. Create `games/{2d|3d}/game-name/game.json` with valid GDevelop structure
2. Add pixel art assets in the same directory
3. Run `node build-games.mjs` to build
4. Add game entry to `site/src/pages/arcade/index.tsx` GAMES array
5. Push -- CI builds and deploys automatically
