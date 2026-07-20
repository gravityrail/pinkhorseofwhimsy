# Pinball

Pink Horse Arcade physics pinball — three.js + cannon.js, zero build step (`type="module"`).

## Layout

```
index.html          shell, HUD, huge touch flippers
js/main.js          splash boot
js/game.js          loop, scoring, modes, multiball
js/table.js         meshes + cannon bodies
js/dmd.js           animated dot-matrix scoreboard
js/audio.js         mp3 SFX + synth fallback + music
```

## Shared assets

- Splash: `/arcade/splashes/pinball.png`
- SFX: `/arcade/sfx/pinball-bumper.mp3`, `pinball-flipper.mp3`, `pinball-drain.mp3`, `pinball-music.mp3`, `ui-start.mp3`
- Controls gamepad shim: `/arcade/controls.js` (touch disabled — custom huge flipper UI)
- Splash helper: `/arcade/splash.js`

## Publish

```bash
rm -rf ../../site/static/pinball
mkdir -p ../../site/static/pinball
cp index.html ../../site/static/pinball/
cp -R js ../../site/static/pinball/
```

## Controls

| Input | Action |
| --- | --- |
| Z / ◀ / left flipper button | Left flipper |
| X / ▶ / right flipper button | Right flipper |
| Hold M / Plunge button | Charge & release plunger |
| 1 / COIN button | Insert credit (3 balls) |

## Modes

- **Drop targets P-H-W** — bank award, unlocks hurry-up / pink path
- **Ramp shots** — 3 ramps start multiball; ramp during multi = jackpot
- **Multiball** — second ball in play, ×2
- **Hurry Up** — timed ramp value countdown after a bank
- **Pink Horse Mode** — table tints pink, ×3, end bonus
