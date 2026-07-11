# Indigo Kart

A compact, data-driven arcade kart racer built with Three.js and Vite. It includes six seeded circuits (a sunset island, a neon night city, an orbital rainbow ring above a space station, present-day and 1892 versions of Grass Valley, California, and a long flat outback highway), three stat-distinct karts, seven racers, three difficulty levels, three-lap races, weighted collision damage, collectible turbo and repair pickups, four-wheel ground contact, sprung kart animation, night lighting, particle effects, touch controls, procedural scenery, reactive Web Audio soundtracks, and a responsive race HUD.

## Run it

```bash
npm install
npm run dev
```

Use the arrow keys or WASD to drive. Drive across glowing boost pads to collect up to three turbo charges, then press `Space` to use one. Green floating powerups repair a damaged kart or trigger a free turbo when the kart is healthy. Press `P` or `Escape` to pause. On touch devices, steering, pedals, and a dedicated boost button appear automatically.

## Add a kart

Add a record to `CARS` in `src/game/content.js`. Stats use a 1–10 scale:

- `acceleration`: engine force and low-speed response
- `handling`: tire grip and steering response
- `weight`: collision mass and resistance to being pushed
- `topSpeed`: maximum road speed

The kart mesh is generated from the record's `color` and `accent`, so no model asset is required.

## Add a track

Add a record to `TRACKS` in `src/game/content.js`. The key fields are:

```js
{
  id: 'my-track',
  name: 'My Track',
  seed: 12345,
  width: 14,
  laps: 3,
  time: 'sunset', // or 'night'
  palette: {
    sky, fog, ground, road, shoulder,
    stripeA, stripeB, water
  },
  terrain: { kind: 'island', foliage: 'palms', roughness: 0.5 },
  // Normalized positions of collectible boost pads.
  boosts: [0.12, 0.4, 0.72],
  // Respawning contextual repair/turbo pickups.
  powerups: [0.25, 0.58, 0.85],
  // Closed center line: [x, elevation, z]. Curves and height are interpolated.
  points: [[0, 2, 70], [60, 5, 20], [0, 10, -70], [-60, 3, 20]],
  // Seeded decoration regions along normalized track progress.
  zones: [
    { from: 0, to: 0.25, type: 'grandstands', density: 0.6 },
    { from: 0.25, to: 0.8, type: 'palms', density: 0.9 }
  ],
  // Optional hand-placed overrides; supply as many as needed.
  decorations: [
    { progress: 0.4, side: -1, type: 'cliffs', distance: 19, scale: 1.3 }
  ]
}
```

Optional fields added with the second wave of circuits:

- `badge` — the label on the circuit's menu card (defaults to GOLDEN HOUR / MIDNIGHT).
- `music` — arrangement key for `audio.js` (`space`, `western`, `surf`, `outback`; defaults to `time`).
- `time` — now supports `'day'` and `'space'` lighting rigs in addition to `'sunset'` / `'night'`.
- `environment: 'space'` — skips terrain/water and builds a starfield, planet, moon, floating
  satellites/asteroids, and a slowly rotating space station far below the road.
- `rails` — glowing guard rails plus a hard physics clamp in `Game.js` so no kart (player or AI,
  even after a collision shove) can leave the road. Used by the orbital track.
- `road.style` — `'rainbow'` (unlit vertex-color neon), `'dirt'` (ruts + wooden posts, no curbs),
  `'street'` (dashed center line), or default asphalt.
- `palette.dust` — offroad dust particle color (red outback dirt, sepia 1892 roads).
- New `zones` types: `pines`, `mainstreet`, `teslas`, `oldwest`, `horses`, `outback`, `space` —
  each maps to a mix of procedural decorations (shopfronts, parked EVs, false-front saloons,
  horses and hay carts, gum trees, kangaroos, canvas-textured road signs like the yellow
  "WATCH FOR KANGAROOS!" diamond, spinning windpumps, satellites...).

The track builder generates the road, shoulders, curbs, elevation, starting gantry, boost pads, terrain, distant silhouettes, international-scale grandstands, and seeded objects from that data. Terrain is blended from the road elevation to create supporting hills under raised track sections. Every decoration samples that terrain before placement, and generation considers altitude—for example, high-elevation palm zones naturally transition toward rocks. Grandstands are automatically aimed toward the local racing line.

Kart alignment is calculated from four separate tire contact samples. The wheel assembly follows the fitted ground plane while the chassis suspension handles pitch, lean, dive, and bounce independently. Night races enable emissive headlamps and taillamps, forward spotlights, and rear red light spill for every racer.

Race audio is synthesized and scheduled with Web Audio: a brass starting fanfare, red/red/green countdown cues, a major-key pop arrangement for Sunset Cove, a faster layered techno arrangement for Moonlight Metro, a multi-layer engine with sub-bass rumble, and impact-scaled crash synthesis. Collision damage reduces acceleration and top speed, adds hood smoke, and progressively bends the animated axle motion until repaired.

## Project structure

- `src/game/content.js` — cars, tracks, difficulties, and scoring
- `src/game/Track.js` — spline road mesh, terrain, and procedural decoration generation
- `src/game/Vehicle.js` — generated kart visuals and racer state
- `src/game/Effects.js` — pooled dust, smoke, braking, and turbo particles
- `src/game/Game.js` — race lifecycle, arcade physics, AI, collisions, camera, HUD, and input
- `src/game/audio.js` — synthesized engine, gear, countdown, lap, and collision audio

## Production build

```bash
npm run build
```

## Publishing to the Pink Horse Arcade

This game lives in the [Pink Horse of Whimsy](https://pinkhorseofwhimsy.com) arcade at
`/indigokart2/`. The `build` script is configured with `--base=/indigokart2/` so the
bundled asset URLs resolve at that sub-path.

The game has no external asset files (karts, tracks, and audio are all generated at
runtime), so the entire game is the bundled JS + CSS. To rebuild and publish:

```bash
npm install
npm run build                       # -> dist/  (base = /indigokart2/)
rm -rf ../../site/static/indigokart2
cp -R dist/. ../../site/static/indigokart2/
```

Then commit the refreshed `site/static/indigokart2/`. The arcade card lives in
`site/src/pages/arcade/index.tsx`. The on-screen gamepad shim (`/arcade/controls.js`)
is injected from `src/main.js`'s host `index.html`; the game keeps its own touch UI.
