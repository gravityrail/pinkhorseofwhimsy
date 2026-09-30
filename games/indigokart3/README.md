# IndigoKart 3

The canonical IndigoKart game in the Pink Horse Arcade. Replaces the original and
v2 builds; `/indigokart/` and `/indigokart2/` redirect to `/indigokart3/`.

## Play / build

```sh
npm ci
npm run dev
npm test
npm run build
npm run publish
```

Publishing copies the **local build** into `site/static/indigokart3/` and writes
both legacy redirects. Commit that output: the arcade deploy serves committed
static games. It does not rebuild them. Node 22 or newer is recommended.

## The crew

| Driver | Ride | Character |
| --- | --- | --- |
| Indigo | Green Toyota truck with open rear tray | Long-travel suspension and strong sand traction |
| Dan | Blue Tesla | Tall Australian driver, instant torque, highest road speed |
| Lola | Pink Tesla | Lightest car, strongest grip, quick changes of direction |
| Asa | Neon cyber tank | Highest collision mass, stable suspension, strong off-road traction |

These are original stylized models, not manufacturer-supplied CAD assets.
Suspension, tire tread, steering, driver lean, brake lights and wheel rotation are
animated. Web Audio synthesizes combustion, electric and turbine engine profiles,
as well as music, pickups, impacts and race cues. No audio downloads are needed.

## Controls

| Action | Keyboard | Controller | Touch |
| --- | --- | --- | --- |
| Drive / brake / reverse | WASD or arrows | Left stick, RT / LT | Steering and pedal buttons |
| Drift | Hold Shift + steer at speed | B + steer | Hold Drift + steer |
| Turbo | Space | A | Boost |
| Use item | X | X | Item |
| Recover (+3 seconds) | R | Y | Reset car |
| Pause / resume | P / Escape | Start | Pause / Resume |

Menu controller controls: left/right choose driver, up/down choose circuit, A or
Start races. Menu buttons also support normal Tab / Enter keyboard navigation.
Three race classes tune opponents and steering assistance. Drifting on asphalt
charges a mini-turbo (0.7 seconds) or super-turbo (1.6 seconds); release to fire.
Boost pads replenish up to three stored boosts. Floating pickups give a shield,
repair, turbo, or a 20-metre shockwave. Damaged racers get repairs; trailing racers
are more likely to get turbo. Personal race records are saved locally per
vehicle, circuit and class. Storage denial does not prevent playing.

## Art and graphics

Three circuits: Sunset Coast, Neon Harbor and Red Rock Rally. The original Blender
asset library is `art/indigokart-environments.blend`; its six collections contain
palms, eroded sandstone, a pavilion, lighthouse, neon tower and festival arch.
The exact rebuild script is included:

```sh
blender -b --python art/build_environment.py
```

This writes the editable `.blend` and six glTF binary exports in `public/models/`.
At runtime the assets are batched by material and placed around spline circuits.
Roads, terrain and vehicles are built in Three.js; only scenery assets are authored
in Blender. No proprietary textures, fonts, logos or models are fetched.

Lighting uses a moving shadow camera, environment reflections, bloom, ACES tone
mapping, distance fog, drifting atmosphere particles and night headlamps. The
Balanced graphics button lowers pixel density and disables shadow maps/bloom.
The game requires WebGL2. It is a stylized browser racer, not a vehicle simulator.

## Implementation / verification

- `src/game/physics.js`: shared player/AI driving, mass, tire grip, surfaces,
  acceleration, braking, signed lap accounting. Fixed 120 Hz simulation, capped
  catch-up to avoid spiralling on slow devices.
- `src/game/Game.js`: racing, garage, AI steering, input, items, chase camera,
  standings, records and pause handling.
- `src/game/Vehicle.js`: four vehicle identities and animated suspension.
- `src/game/Track.js`: spline road, terrain contact and scenery placement.
- `src/game/assets.js`: glTF loading and material batching.
- `tests/physics.test.js`: launch balance, surfaces, timestep invariance, braking,
  boost, drifting, lap counting and item balance.

Development builds expose `window.__INDIGO_KART__` for local browser diagnostics;
production builds do not. Test keyboard driving, touch and real controllers on
target hardware before tuning for a specific tablet or in-car browser.
