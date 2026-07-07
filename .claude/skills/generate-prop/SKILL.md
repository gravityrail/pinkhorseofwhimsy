---
name: generate-prop
description: Generate a 3D game prop (GLB model) from a text description using Gemini image generation and TRELLIS.2 3D conversion. Use when the user wants to create a new 3D object/prop/asset for a game.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

# Generate 3D Game Prop

Generate a 3D GLB model from a text description, then add it to a game.

## Pipeline

1. **Image Generation** (Gemini) — text prompt → reference PNG
2. **3D Conversion** (TRELLIS.2 on RunPod) — PNG → GLB with PBR textures
3. **Game Integration** — register GLB in game.json, optionally add as Model3DObject

## Prerequisites

- `GOOGLE_GEMINI_API_KEY` and `HF_TOKEN` in `<project-root>/.env`
- `RUNPOD_API_KEY` in `<project-root>/.env`
- TRELLIS.2 RunPod pod running: `cd games/trellis && python3 runpod-trellis.py start && python3 runpod-trellis.py setup`

## Usage

Arguments: `$ARGUMENTS` should be a description of the prop to generate.

### Step 1: Check TRELLIS.2 server status

```bash
cd games/trellis && python3 runpod-trellis.py status
```

If the server is not running, start it:
```bash
python3 runpod-trellis.py start
# Wait for pod to boot, then:
python3 runpod-trellis.py setup
```

### Step 2: Generate the prop

```bash
cd games/trellis && node generate-prop.mjs \
  --prompt "$ARGUMENTS" \
  --output <output-path>.glb \
  --image-output <output-path>.png
```

Use `--resolution 512` for quick previews, `1024` (default) for production quality.

### Step 3: Add to game

If the prop is for an existing game (e.g., maze-explorer):

1. Copy the GLB to the game directory: `games/3d/maze-explorer/`
2. Register the resource in game.json:
   ```json
   { "file": "prop.glb", "kind": "model3D", "name": "prop.glb", "userAdded": true }
   ```
3. Add a Model3DObject in the game's layout or level.json:
   ```json
   {
     "name": "PropName",
     "type": "Scene3D::Model3DObject",
     "content": {
       "width": 100, "height": 100, "depth": 100,
       "modelResourceName": "prop.glb",
       "materialType": "KeepOriginal",
       "originLocation": "BottomCenterZ"
     }
   }
   ```
4. For maze-explorer, add to the prop catalog in `level.json` and rebuild:
   ```bash
   node games/3d/maze-explorer/compile-level.mjs
   node games/build-games.mjs --filter 3d
   ```

### Alternative: Image-only mode

Generate just the reference image without 3D conversion:
```bash
node generate-prop.mjs --prompt "a wooden barrel" --image-only --image-output barrel.png
```

### Alternative: Use existing image

Skip Gemini and convert an existing image to 3D:
```bash
node generate-prop.mjs --image existing.png --output prop.glb
```

## Tips

- Best prompts: describe a single object clearly (material, style, condition)
- Good: "a rusty medieval iron barrel with metal bands"
- Bad: "a scene with barrels and crates" (multiple objects confuse TRELLIS.2)
- TRELLIS.2 works best with clean single-object images on plain backgrounds
- Use `--faces 50000` for smaller file sizes (good for game props)
- Remember to stop the RunPod pod when done: `python3 runpod-trellis.py stop`
