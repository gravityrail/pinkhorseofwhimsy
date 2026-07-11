# Star Bean: TigerTron Rising

A cinematic 3D rail shooter — a Star Fox–style romp starring Space Bean, defender of
the Galactic Bean-O-Phone. Built with **Three.js** (WebGL, bloom post-processing) and
**React**, bundled by **Vite**. Fully client-side: no server, no build-time data.

> Originally authored as a Next.js / [vinext](https://github.com/cloudflare/vinext)
> (Cloudflare Workers) app. The game itself is a single self-contained client React
> component that only depends on React + Three.js, so it was lifted out of the full-stack
> scaffolding into this plain static Vite build for the arcade. See **Provenance** below.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

- **Move:** Arrow keys, or drag/point with the mouse or a finger.
- **Fire:** `Space` (or tap).
- **Bomb / focus:** `Shift` (hold).
- **Pause:** `Escape`.

On touch devices the game renders its own on-screen controls. A plugged-in gamepad works
via the arcade's shared `/arcade/controls.js` shim (D-pad = move, A/X = fire, B/Y = bomb).

## Project structure

- `index.html` — mounts the game, loads the Orbitron/Rajdhani fonts, injects the arcade
  gamepad shim.
- `src/main.tsx` — React entry point (renders `<SpaceBeanGame />`).
- `src/space-bean-game.tsx` — the entire game: title/cutscenes/briefing/play/boss loop,
  Three.js scene, enemies, formations, upgrades, synthesized + narrated audio, HUD.
- `src/globals.css` — all UI styling (no Tailwind).
- `public/` — the only external assets: `audio/` (voice-over `mp3`s), `characters/`,
  `cutscenes/`, `textures/` (a space spheremap), and `favicon.svg`.

## Production build

```bash
npm run build      # -> dist/  (base = /star-bean/)
```

The `build` script sets `--base=/star-bean/` so bundled URLs resolve at that sub-path.
The game's own asset references use `import.meta.env.BASE_URL`, so they resolve at `/`
in dev and `/star-bean/` in the production build automatically.

## Publishing to the Pink Horse Arcade

This game is served at `/star-bean/` on [pinkhorseofwhimsy.com](https://pinkhorseofwhimsy.com).
To rebuild and publish:

```bash
npm install
npm run build
rm -rf ../../site/static/star-bean
cp -R dist/. ../../site/static/star-bean/
```

Then commit the refreshed `site/static/star-bean/`. The arcade card lives in
`site/src/pages/arcade/index.tsx`.

## Provenance

Extracted from the vinext starter app. What changed for the standalone build:

- Dropped all Cloudflare/D1/Drizzle/SIWC scaffolding — the game needs none of it.
- Replaced the Next.js `app/layout.tsx` + `app/page.tsx` with `index.html` + `src/main.tsx`.
- Removed the `"use client"` directive and Tailwind's `@import` (the game uses only
  hand-written CSS classes).
- Rewrote the 15 root-absolute asset paths (`/audio/…`, `/characters/…`, `/cutscenes/…`,
  `/textures/…`) to be base-aware via `import.meta.env.BASE_URL`.
- Loaded the Orbitron (display) and Rajdhani (body) fonts from Google Fonts instead of
  `next/font`, bound to the `--font-display` / `--font-body` CSS variables.
