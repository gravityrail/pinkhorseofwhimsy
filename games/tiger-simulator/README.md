# Tiger Simulator

A first-pass 3D browser game starring Tiger, based on the supplied backyard and Tiger photos. Tiger walks from inside the house through the cat flap into a cat-scale yard with a tree, brick ring, string lights anchored to the patio roof's yard-facing corners, covered patio, flower planter, potted flowers, L-shaped seating, fences, garage, dark pickup, and leafy cover.

## Run locally

```bash
cd games/tiger-simulator
npm ci
npm run dev
```

Open the local Vite URL. Press **Enter** or **Let's Go** to leave the house.

| Action | Control |
| --- | --- |
| Walk forward or backward, relative to Tiger | W / S or up / down arrows |
| Look left or right while still; steer while walking | A / D or left / right arrows |
| Jump | Space |
| Swipe | J or left click |
| Pounce | K or P |
| Orbit camera temporarily | Right mouse drag or drag on touch screen |
| Run | Shift or touch RUN |
| Toggle sound | SOUND ON / SOUND OFF button |

Each of the six helmeted soldier ants has three brains and animated tripod legs. A swipe or pounce removes one brain; after three hits the ant falls unconscious. Tiger has nine lives. Shrubs hide Tiger from pursuing ants. Touch controls appear on touch devices and support simultaneous movement and action presses.

## Blender source and web build

`models/tiger.blend`, `models/soldier-ant.blend`, and `models/backyard.blend` are the editable Blender scenes. The asset script regenerates the GLB models used by the browser:

```bash
/Applications/Blender.app/Contents/MacOS/blender -b -t 4 --python games/tiger-simulator/models/build_assets.py
```

The script builds the cat, ants, and full backyard in Blender. Tiger's coat and flexible tail use packed fur and tabby textures; his head, ears, legs, and tail are modeled and animated separately. Backyard bark, foliage, grass, brick, wood, and concrete use packed albedo, roughness, and normal maps. Shrubs have smooth, textured oval canopies; the raised planter and patio pots add varied flowers. Blender also generates scattered grass and a pickup with an open tray. The browser applies wind motion to grass and foliage, and bends nearby plants as Tiger passes. The camera follows Tiger's facing direction, checks solid scene geometry for blocked sight lines, and rises above shrubs without zooming into them. The angled patio canopy fades when it blocks the camera’s view of Tiger. The original reference photos are kept in the user's workspace under `games/tiger-simulator/assets` and are not required by the running game.

The original Web Audio score starts with a short jingle, then loops while exploring. Footsteps are timed to Tiger's gait and change for indoor wood, patio/driveway, and grass. Nearby awake ants chirp more often as Tiger approaches. A swipe makes a gentle swoosh, with a low thump when it hits an ant; jumping has an effort sound. Audio starts only after pressing **Let's Go**, as required by browsers, and the sound button stores the mute preference locally.

`npm run publish` copies a production build to `site/static/tiger-simulator/` for the site's `/tiger-simulator/` route.
