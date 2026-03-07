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
      "type": "PlatformBehavior::PlatformCharacterBehavior",
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

This uses `gdexporter` (wraps GDevelop's GDJS engine) to produce playable HTML5 builds in `site/static/arcade/games/<name>/`.

## File Structure

```
games/
  package.json              # Dependencies: @napi-rs/canvas, gdexporter
  build-games.mjs           # Build script
  generate-assets.mjs       # Pixel art generator
  SKILL.md                  # This file
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
      game.json
      wall.png              # 64x64 tileable texture
      floor.png             # 64x64 tileable
      key.png, gem.png
```

## Adding a New Game

1. Create `games/{2d|3d}/game-name/game.json` with valid GDevelop structure
2. Add pixel art assets in the same directory
3. Run `node build-games.mjs` to build
4. Add game entry to `site/src/pages/arcade/index.tsx` GAMES array
5. Push -- CI builds and deploys automatically
