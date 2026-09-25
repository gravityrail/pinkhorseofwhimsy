# Tiger Simulator

A first-pass 3D browser game starring Tiger, based on the supplied backyard and Tiger photos. Tiger walks through the cat flap into a cat-scale backyard. After he knocks out the soldier ants, a blue jump pad beside the pickup launches him over the fence onto the front driveway. The new area includes the full-length house, side window and air conditioner, front porch and maroon door, a fall tree, rose bushes, and a residential street with houses on both sides.

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
| Crouch, then jump on release | Hold Space, then release |
| Swipe, or queue a swipe during a jump | J or left click |
| Jump and swipe on landing | Hold K or P, then release |
| Orbit camera temporarily | Right mouse drag or drag on touch screen |
| Run | Shift or touch RUN |
| Toggle sound | SOUND ON / SOUND OFF button |

Each of the six helmeted soldier ants has three brains and animated tripod legs. A swipe or landing pounce removes one brain; after three hits the ant falls unconscious. Tiger has nine lives. Shrubs hide Tiger from pursuing ants. The jump pad starts gray, then glows and pulses blue after all six ants are unconscious. Touch controls appear on touch devices, including wide Tesla screens, and support simultaneous movement and action presses.

The development overlay is on by default for this first pass. **Defeat all enemies** unlocks the pad; **Jump to level** moves Tiger directly to the backyard or front yard. Add `?debug=0` to the URL to hide the overlay.

## Blender source and web build

`models/tiger.blend`, `models/soldier-ant.blend`, and `models/backyard.blend` are the editable Blender scenes. The asset script regenerates the GLB models used by the browser:

```bash
/Applications/Blender.app/Contents/MacOS/blender -b -t 4 --python games/tiger-simulator/models/build_assets.py
```

The script builds the cat, ants, backyard, front yard, house extension, and street in Blender. Tiger's coat and flexible tail use packed fur and tabby textures; his head, ears, legs, and tail are modeled and animated separately. Bark, foliage, grass, brick, wood, and concrete use packed albedo, roughness, and normal maps. The browser applies wind motion to grass and foliage, and bends nearby plants as Tiger passes. Flower stems and heads stay together without separate wind motion. The camera follows Tiger's facing direction and checks solid scene geometry for blocked sight lines. The original reference photos remain in the user's workspace under `games/tiger-simulator/assets` and are not required by the running game.

The original Web Audio score starts with a short jingle, then loops while exploring. Footsteps are timed to Tiger's gait and change for indoor wood, patio/driveway, and grass. Nearby awake ants chirp more often as Tiger approaches. A swipe makes a gentle swoosh; a low thump plays when Tiger hits an ant or a hard part of the yard. Jumping has an effort sound. Audio starts only after pressing **Let's Go**, as required by browsers, and the sound button stores the mute preference locally.

`npm run publish` copies a production build to `site/static/tiger-simulator/` for the site's `/tiger-simulator/` route.
