# Tiger Simulator

A first-pass 3D browser game starring Tiger, based on the supplied backyard and Tiger photos. Tiger enters through the cat flap and explores a cat-scale yard with a tree, brick ring, string lights, patio, fences, garage, dark pickup, and leafy cover.

## Run locally

```bash
cd games/tiger-simulator
npm ci
npm run dev
```

Open the local Vite URL. Press **Enter** or **Let's Go** to leave the house.

| Action | Control |
| --- | --- |
| Move in any direction | W A S D or arrow keys |
| Jump | Space |
| Swipe | J or left click |
| Pounce | K or P |
| Orbit camera | Right mouse drag or drag on touch screen |
| Move slowly | Shift |

Each of the six helmeted soldier ants has three brains. A swipe or pounce removes one brain; after three hits the ant falls unconscious. Tiger has nine lives. Dense shrubs hide Tiger from pursuing ants. Touch controls appear on touch devices.

## Blender source and web build

`models/tiger.blend`, `models/soldier-ant.blend`, and `models/backyard.blend` are the editable Blender scenes. The asset script regenerates the GLB models used by the browser:

```bash
/Applications/Blender.app/Contents/MacOS/blender -b -t 4 --python games/tiger-simulator/models/build_assets.py
```

The script builds the cat, ants, and full backyard from Blender mesh primitives. The original reference photos are kept in the user's workspace under `games/tiger-simulator/assets` and are not required by the running game.

`npm run publish` copies a production build to `site/static/tiger-simulator/` for the site's `/tiger-simulator/` route.
