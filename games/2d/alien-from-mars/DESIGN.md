# THE ALIEN FROM MARS — design + build spec

A 2D side-scrolling chaos sandbox for the Pink Horse Arcade. You are a Martian saucer
over an endless pastoral landscape at dusk. Abduct farm animals, mutate them into absurd
monsters that follow you and destroy everything, and stay ahead of the escalating army.
Feed a mutant too much and it engorges and **blows up into lava**.

This file is the single source of truth. Every module builder reads it fully before
writing code. Module contracts are binding; internal implementation is yours.

---

## 1. Tech ground rules

- Vanilla JavaScript **ES modules**, browser-only, **zero dependencies, no build step**.
  Plain `.js` files loaded via `<script type="module" src="./js/main.js">`.
- **No TypeScript syntax anywhere.** No JSX. No `Date.now()`-seeded logic differences
  between modules — world randomness must come from the seeded RNG in the core.
- Logical resolution **480×270** (constant `K.W`,`K.H`). Render the whole game into a
  480×270 offscreen canvas, then blit to the display canvas at the largest integer scale
  that fits, centered/letterboxed on `#0b0817`. `imageSmoothingEnabled = false`
  everywhere. Crisp chunky pixels are the look.
- World coordinates: x infinite in both directions, y down. Ground sits near
  `K.GROUND = 200`.
- Everything imports palette + constants from `./shared.js` (already written — read it).
  **Never hardcode a color that exists in PAL.**
- Target 60fps on modest hardware (this gets played on a Tesla dashboard). Fixed-timestep
  update at 60Hz with an accumulator; clamp dt (tab-switch safe); render every rAF.
- Works when served from any path. No external assets, no network fetches. All art is
  procedurally drawn to offscreen canvases at load; all audio is synthesized WebAudio.

## 2. Files + ownership

```
games/2d/alien-from-mars/
  DESIGN.md                  (this file — not shipped)
  index.html                 [core agent]
  js/shared.js               (already written — read-only for everyone)
  js/sprites-creatures.js    [creatures art agent]
  js/sprites-units.js        [units art agent]
  js/sprites-props.js        [props art agent]
  js/background.js           [background agent]
  js/audio.js                [audio agent]
  js/main.js + js/game-*.js  [core agent — entry is main.js; split into as many
                              game-*.js modules as keeps the code clean]
```

Each agent writes ONLY its own files. Verify your file parses: `node --check <file>`.

## 3. Sprite module contract

Each `sprites-*.js` exports:

```js
export function build() {
  // returns { [name]: Sprite }
  // Sprite = { frames: [canvas, ...], fps: <number>, ax: <int>, ay: <int> }
}
```

- Frames are canvases at 1× logical scale (1 canvas px = 1 world px), transparent bg.
- `ax, ay` = anchor point in sprite pixels: the point drawn at the entity's (x, y).
  Ground units + props: **bottom-center (feet)**. Flyers (UFOs, jet, cloudsheep):
  **center**. `tank_turret`: the pivot where it bolts onto the tank.
- All ground creatures face **right** in their base art (core flips for left).
- `fps` is the intended animation rate (walk cycles ~6, idle bobs ~3).
- Browser API only (`document.createElement('canvas')`), but see §10 for how to
  preview your art in Node while you iterate.

### Art direction (binding)

Polished-commercial-pixel-art bar, not programmer art. Concretely:
- 1px `PAL.outline` outline around every sprite silhouette.
- 2–3 tone ramps per material (use the PAL ramps); **rim light** on top edges in a warm
  tone (dusk light) — a 1px highlight line sells everything.
- Big readable silhouettes; exaggerate heads/features; tiny black eyes with a 1px white
  glint read as alive.
- No anti-aliasing, no alpha gradients, no strokes wider than needed. Dither sparingly.
- Walk cycles: 2 frames is enough if the legs clearly alternate and the body bobs 1px.

### Sprite manifest

**sprites-creatures.js** — farm animals + mutants:

| name | ~size | frames | notes |
|---|---|---|---|
| `cow` | 22×15 | 2 walk | white hide, big dark patches, pink udder, horns |
| `chicken` | 10×11 | 2 walk | white, red comb + wattle, orange beak/feet |
| `sheep` | 17×13 | 2 walk | fat wool cloud, dark face + legs |
| `pig` | 17×12 | 2 walk | pink, snout, curly tail |
| `steak_walk` | 30×20 | 2 | THE SIRLOIN ABOMINATION: a thick cooked steak slab (char-grill cross-hatch on the meat, fat cap `PAL.fat` along the top) standing on the SAME four cow legs, with a **cow head at EACH end facing outward** (two heads, opposite directions) |
| `steak_fire` | 30×20 | 2 | both mouths open, orange glow inside (fire cone itself is game FX) |
| `drumstick_hop` | 16×22 | 2 | LE POULET TERRIBLE: giant cooked drumstick standing upright, golden-brown crust w/ shine spots, **two googly eyeballs** near the top, **two white bones sticking out the bottom as legs**, and a disturbingly normal **human mouth** (lips + teeth) on the meat |
| `drumstick_bite` | 16×22 | 2 | mouth wide open / chomped shut |
| `cloudsheep_fly` | 26×16 | 2 | CUMULONIMBAAA: puffy magical cloud that is still recognizably a sheep — sheep face at front, tiny useless legs dangling below, star sparkles in the wool |
| `cloudsheep_zap` | 26×16 | 1 | eyes glowing white, belly glowing `PAL.zap2` |
| `karatepig_walk` | 18×19 | 2 | PORK CHOP: pig standing upright in a white karate gi, black belt, red headband, determined eyes |
| `karatepig_chop` | 18×19 | 2 | frame 1 windup (trotter raised high), frame 2 strike (arm fully extended horizontal; motion smear is game FX) |

**sprites-units.js** — the saucers + the army:

| name | ~size | frames | notes |
|---|---|---|---|
| `player_ufo` | 26×15 | 2 | classic chrome saucer, teal glass dome with a tiny green martian (`PAL.alien`) visible inside, ring of running lights that alternate between the 2 frames |
| `enemy_ufo` | 24×14 | 2 | meaner angular rival saucer, red/purple lights |
| `soldier_walk` | 10×14 | 2 | green fatigues, helmet, rifle held level |
| `soldier_aim` | 10×14 | 1 | braced, rifle raised |
| `tank` | 30×17 | 2 | hull + treads; frames shift tread pattern; NO barrel on the hull |
| `tank_turret` | 14×6 | 1 | turret + barrel as separate sprite, anchor at its mount pivot so the game can rotate it |
| `jet` | 30×12 | 1 | dark fighter silhouette, canopy glint, afterburner glow (flicker is FX) |

**sprites-props.js** — the destructible countryside:

| name | ~size | frames | notes |
|---|---|---|---|
| `tree1` | 22×30 | 1 | round leafy oak |
| `tree2` | 18×26 | 1 | pine |
| `tree_burnt` | 20×26 | 1 | charred trunk + bare branches, embers |
| `rock1` / `rock2` | 14×9 / 10×7 | 1 | boulders |
| `hut` | 30×26 | 1 | little farmhouse, warm lit window |
| `hut_ruin` | 30×18 | 1 | collapsed + charred version |
| `barn` | 44×34 | 1 | big red barn, white trim, hay loft door |
| `barn_ruin` | 44×20 | 1 | collapsed + charred version |
| `hay` | 12×9 | 1 | hay bale |
| `fence` | 16×10 | 1 | 2-rail wooden fence segment |
| `windmill` | 26×42 | 2 | farm windmill, blades at two rotations |
| `silo` | 16×34 | 1 | grain silo |
| `crater` | 22×6 | 1 | scorched blast crater patch that lies flat on the ground |

## 4. background.js contract

```js
export function drawBackground(ctx, camX, w, h, t) {}
```

Draws the full backdrop each frame onto the 480×270 buffer before the world renders.
`camX` = camera world x, `t` = seconds elapsed. Must cost well under 1ms/frame — build
layers once on offscreen canvases at init and blit tiles with parallax offsets.

Content (dusk invasion mood, colors from PAL sky ramp): vertical sky gradient as flat
dithered bands (night → dusk1 → dusk2 → dusk3 → horizon glow at ground level); twinkling
stars in the upper third; **Mars, large, red and slightly glowing** (home!) plus a thin
crescent moon; 3 parallax silhouette layers — far mesas (0.10× scroll), rolling hills
(0.25×), treeline + distant farm silhouettes with a few lit windows (0.50×); a couple of
slow drifting cloud silhouettes. Deterministic in `camX` (tile seams must line up), no
per-frame allocation.

## 5. audio.js contract

```js
export const audio = {
  init(),                 // call on first user gesture; safe to call twice
  play(name, opts = {}),  // fire-and-forget SFX; opts.vol, opts.pitch (rate mult)
  startBeam(), stopBeam(),          // abduction tractor-beam hum loop
  startMusic(), setWanted(level),   // level 0..3 scales music intensity
};
```

All synthesized WebAudio (oscillators/noise/filters/envelopes) — no samples. Master
chain ends in a compressor/limiter; nothing clips. Whimsical-menacing, not harsh.

Cues: `shoot, enemy_shoot, hit, explode_small, explode_big, abduct_pop, mutate,
moo, cluck, baa, oink, fire_breath, zap, chop, bite, growth, engorge_warning,
lava_explode, alarm, tank_fire, jet_pass, player_hurt, ufo_arrive, brawl, game_over`.
`chop` should read as a tiny "HI-YA!" grunt; animal cues are cartoon caricatures.
Music: sparse theremin-ish wobble over a low pulse; `setWanted` layers in tension
(faster pulse, extra voice) as the level rises. Unknown cue names must no-op, not throw.

## 6. Core game spec

### Input (keyboard events only — the arcade shim synthesizes them for touch/gamepad)

- Arrows = thrust (momentum + drag, clamped speed; UFO tilts a little when strafing).
- Facing = **last cardinal pressed** (N/S/E/W only, never diagonal); default right.
- `Space` = shoot a green bolt in facing direction, ~0.18s cooldown.
- `a` / `KeyA` (accept either) = hold for abduction beam.
- `Enter` or tap/click = start / restart. Listen on both `key` and `code`.
- Altitude clamp: can't touch ground, can't leave the sky band.

`index.html` configures the shim (D-pad arrows only — WASD must stay unbound since `a`
is abduct) and loads it via absolute path:

```html
<script>window.ARCADE_CONTROLS = {
  dpad: { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' },
  buttons: [ { label:'⚡', keys:' ' }, { label:'🛸', keys:'a' } ],
  start: 'Enter',
};</script>
<script src="/arcade/controls.js" defer></script>
```

### Player

5 hearts, 1s i-frames on hit, hit-flash + shake. Death → game over. Bolts damage
everything (including, comedically, your own mutants — friendly fire on).

### Abduction

Hold A: cone beam (`PAL.beam`, animated shimmer) from saucer to ground. Nearest farm
animal in the cone gets tractored up (~1.1s), spinning as it rises; at the saucer:
white flash + `mutate` cue → its mutant form drops out and lands. Cap **7 live
mutants**; abducting past the cap "probes" the animal instead: +250 score, floating
`PROBED!` text, animal drops back dazed. Beam only affects farm animals.

### Mutants (your allies)

Follow the player's ground position in loose formation slots (cloudsheep flies at a
fixed height below the saucer). Target = nearest valid target within ~140px of the
player's shadow; priority: army > wild animals > props. When on target, attack:

- **steak**: breathes fire cones from BOTH heads simultaneously (both directions),
  igniting things; ignited props burn ~2s then become their ruin/burnt sprite.
- **drumstick**: fast hopper; bites (melee chomp).
- **cloudsheep**: lightning bolt to a ground target, small AoE at impact, ~1.5s
  cooldown. The only mutant that can hit air targets (jets, enemy UFOs).
- **karatepig**: dashes to target and delivers ONE move — the PORK CHOP. Huge single
  hit, `CHOP!` starburst + smear FX, then a 2s bow cooldown.

**Growth**: killing a *living* creature (animal, soldier, another mutant — not props)
advances growth. Stages 1..`K.MUTANT_MAX_STAGE`(6), scale 1.0→2.2, hp/damage scale up.
Kills at stage 6 trigger **ENGORGEMENT**: mutant pulses red/orange and swells for ~3s
(`engorge_warning` — an audible fuse) then **BLOWS UP INTO LAVA**: `lava_explode`, big
shake, 10–16 lava globs launched ballistically (`K.GRAVITY`) that splat into lava pools
burning ~4s. Lava hurts EVERYTHING — props, animals, army, other mutants, the player.
The mutant is gone. (Design intent: over-exploring over-feeds your best mutant — this
is the anti-hoarding valve. Make the fuse readable so the player can flee the blast.)

**Boredom brawls**: a mutant with no valid target for >5s picks a fight with the
nearest mutant — real damage both ways, angry 💢-style pixel markers, can kill (and
the killer *grows* — spicy). Any valid target appearing in range breaks the brawl.
This is what pushes the player to keep moving toward undestroyed land.

Mutant hp pips show only when damaged. Mutant death: comedic poof + giblet particles
(meat chunks, feathers, wool puffs — purple `PAL.dusk2` poofs, no gore).

### Animals (wild)

Wander/graze with idle noises; flee (slowly, doomed, funny) from mutants and fire.
Killed by anything → giblets + score (and growth for the killing mutant).

### World: infinite chunks with permanent memory

- `groundY(x)`: smooth rolling value noise around `K.GROUND`, amplitude ~26,
  wavelength ~300. Ground fill: grass ramp top, dirt below, occasional flowers/pebble
  pixels for texture.
- Chunks of `K.CHUNK_W` px, generated once from `hash(worldSeed, chunkIndex)` (seeded
  RNG — mulberry32 or similar). ~25% of chunks are a **farm**: barn or hut + hay +
  fence run + windmill/silo + 3–6 mixed animals. Others scatter trees/rocks and 0–2
  stray animals.
- **Persistence**: a chunk spawns its contents exactly once; all state (prop hp,
  burnt/ruin/crater states, surviving animals) lives in the world model forever after.
  Entities beyond ~2.5 chunks from the player freeze (no update, no render) but keep
  state. Re-visiting shows exactly the trail of destruction you left. Dead things stay
  dead; ruins stay ruins.
- Props have hp (tree ~20, rock ~40 — rocks crack but don't burn, hut ~60, barn ~100,
  windmill ~70, silo ~80, fence/hay ~8). Destroyed prop → ruin/burnt sprite or crater
  + debris burst + score.

### The army (escalation)

Wanted meter 0–3 stars driven by recent destruction rate (decays slowly toward 0).
- ★1: infantry squads (3–5) jog in from screen edges; rifles, prefer mutant targets.
- ★2: + tanks — ground-following, turret tracks player or biggest mutant, arcing
  shells with AoE.
- ★3: + jets — warning arrow at screen edge, then a fast strafing run at player
  altitude.
Caps: ≤8 soldiers, ≤2 tanks, ≤2 jets alive. Army units are *living* (well, the crews
are) — mutants that kill them grow. Mutants auto-prioritize the army; the war comes
to you.

### Rival UFOs

At wanted ≥1 (or 90s elapsed), every 40–80s: 1–2 rival saucers arrive (`ufo_arrive`),
strafe, shoot purple bolts at player AND mutants, leave after ~20s if unkilled.
Killing one: big explosion, +300.

### Score / HUD / screens

- CHAOS score: prop +10, animal +25, soldier +50, tank +150, jet +200, rival UFO
  +300, probe +250. Combo multiplier ×2..×8 for chained destruction within 2.5s;
  juicy floating popups (`+50`, `MOO-TATED!`, `PORK CHOP!`, `PROBED!`).
- HUD (in-canvas, bitmap font): hearts top-left; score + combo top-center; wanted
  stars top-right; bottom edge: mutant roster chips (type icon + size pips, pulsing
  red when one kill from engorgement).
- **Bitmap font**: implement a small 3×5 or 5×7 pixel font (caps + digits + a few
  glyphs) — no `fillText` in the play field. `fillText` allowed nowhere; the pixel
  look must be consistent.
- Title: "THE ALIEN FROM MARS" big pixel logotype, saucer bobbing over a scrolling
  landscape, control hints, "PRESS START / TAP TO PLAY" (first gesture calls
  `audio.init()` + `startMusic()`).
- Game over: "YOUR CHAOS: N", best (localStorage `afm_best`), mutants created,
  distance traveled; any key/tap restarts with a fresh world seed.

### Juice (mandatory, this is half the graphics)

Screen shake (scaled by event size), white hit-flash on damaged entities, squash &
stretch on hops/chops/landings, particle systems (smoke, embers, sparks, feathers,
wool puffs, meat giblets, dirt, glowing lava globs + pools), muzzle flashes, blob
shadows under everything (`PAL.shadow`, scale with height), camera lead toward
facing, score popups, beam shimmer, engorge pulse. Pool particles; zero allocation
in the hot loop.

## 7. Debug modes (core)

- `#sprites` URL hash: instead of the game, render every sprite from all three sprite
  modules on a labeled grid (bitmap-font names), animating, ~3× zoom, paged/scrollable
  if needed. This is the art-review screen.
- `#calm`: normal game, but army/rival-UFO spawning disabled.

## 8. Performance budget

≤200 active entities, particle pool ~500, one canvas, no per-frame allocations in
update/render paths (reuse arrays/objects), everything off-screen skipped. If a frame
budget must be spent, spend it on particles.

## 9. Registration (handled outside the agents)

Build pipeline copies this dir verbatim (minus `.md`) to
`site/static/arcade/games/alien-from-mars/`; the arcade card + pipeline change are
done by the orchestrator, not the module agents.

## 10. Verify-your-work requirements

- Every agent: `node --check` each file you wrote.
- **Art agents**: don't ship blind. Write a throwaway Node preview script (e.g.
  `preview.mjs` in your scratchpad, NOT in the game dir) that stubs
  `globalThis.document = { createElement: () => require('@napi-rs/canvas').createCanvas(1,1) }`
  (adjust for ESM), imports your module's `build()`, and tiles every frame of every
  sprite onto one big canvas at 8× nearest-neighbor zoom with labels, saving a PNG.
  `@napi-rs/canvas` is installed at `games/node_modules`. **Open the PNG, actually look
  at it, and iterate at least twice** — fix mushy silhouettes, missing outlines, bad
  anchors, unreadable features. Your returned summary must say what you fixed after
  looking.
- **Background agent**: same trick — render a full 480×270 frame (several camX values)
  to PNGs and look at them.
- **Core agent**: `node --check` all files; keep pure logic (noise, RNG, chunk gen)
  importable and side-effect-free so it can be smoke-tested in Node; run a quick Node
  smoke test on worldgen determinism (same seed+chunk → same layout).
