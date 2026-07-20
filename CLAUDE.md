# CLAUDE.md — Pink Horse of Whimsy

Guidance for AI assistants working in this repo.

## What this is

**Pink Horse of Whimsy** is a whimsical arcade of homemade browser games, hosted at
**https://pinkhorseofwhimsy.com**. It's a [Docusaurus](https://docusaurus.io/) site
that also serves standalone HTML5 games as static files.

> History: this repo started life as the "Grass Valley Game Club" 8-week curriculum.
> It was rebranded to Pink Horse of Whimsy. The curriculum content still lives under
> `site/docs/` and is intentionally kept for now — don't delete it without asking.

## Layout

| Path | What |
| --- | --- |
| `site/` | The Docusaurus website. |
| `site/docusaurus.config.ts` | Branding + site config. `url` is the apex domain, `baseUrl` is `/`. |
| `site/src/pages/index.tsx` | Homepage. |
| `site/src/pages/arcade/index.tsx` | The Arcade page — the `GAMES` array lists every playable game. |
| `site/static/` | Served at the web root. Anything here is published as-is. |
| `site/static/arcade/games/<slug>/` | GDevelop game builds (generated — see below). |
| `site/static/<slug>/` | Committed static builds / copies of standalone games. Served as-is. |
| `site/static/CNAME` | Custom-domain marker for GitHub Pages (`pinkhorseofwhimsy.com`). Keep it. |
| `games/` | **Source of truth** for every arcade game (plus GDevelop pipeline tooling). |
| `games/2d/`, `games/3d/` | GDevelop example projects + Alien from Mars. |
| `games/worm/`, `games/pinball/`, `games/indigokart/`, `games/bean-quiz/` | No-build HTML/JS games — copy into `site/static/<slug>/` to publish. |
| `games/indigo-kart-v2/` | Vite + Three.js kart racer → `site/static/indigokart2/`. |
| `games/space-bean/` | Vite + React + Three.js rail shooter (**Space Bean**) → `site/static/space-bean/`. (`/star-bean/` is a redirect.) |
| `games/bean-simulator/` | Vite + Babylon.js first-person dog sim → `site/static/bean-simulator/`. |
| `games/chickencraft/` | Vite + Babylon.js voxel builder → `site/static/chickencraft/`. |
| `games/vibekart/` | Vite + Three.js procedural kart track → `site/static/vibekart/`. |
| `.github/workflows/deploy.yml` | CI: builds GDevelop games + site and deploys to GitHub Pages. |

**Rule:** every arcade game must be fully buildable (or copy-publishable) from `games/` inside this repo. Do not leave canonical source only under `site/static/` or outside this directory.

## Dev / build

```bash
cd site
npm install
npm start        # hot-reload dev server
npm run build    # production build -> site/build/  (CI uses this)
```

`onBrokenLinks` is set to **`throw`** — a dead internal link fails the build. Always run
`npm run build` before committing site changes.

## Deploy

- **Branch is `trunk`**, not `main`.
- Pushing to `trunk` triggers `.github/workflows/deploy.yml`, which builds the GDevelop
  games, builds Docusaurus, and deploys `site/build/` to GitHub Pages.
- The custom domain is wired via `site/static/CNAME` (copied into the build root). DNS for
  `pinkhorseofwhimsy.com` points at GitHub Pages.

## Adding a game

**Standalone HTML game (like Worm)** — easiest:
1. Put the source under `games/<slug>/` (an `index.html` plus any assets).
2. Copy/publish into `site/static/<slug>/` for the live site.
3. Add a card to the `GAMES` array in `site/src/pages/arcade/index.tsx`, using the
   `href: '/<slug>/'` field (not the GDevelop `slug` path):
   ```ts
   { title: 'My Game', author: 'Pink Horse of Whimsy',
     description: '…', type: '2D', slug: 'my-game', href: '/my-game/' }
   ```

**GDevelop game** — built by the pipeline:
1. Add the project under `games/` so `build-games.mjs` exports it to
   `site/static/arcade/games/<slug>/`.
2. Add a card to `GAMES` with just `slug: '<slug>'` (no `href`); the play URL defaults to
   `/arcade/games/<slug>/`.

**npm-built game (Vite / Three.js / Babylon, like Indigo Kart v2 & Space Bean)** — source lives
in the repo; the built output is committed:
1. Put the game's source under `games/<name>/` as a self-contained npm project. Set its
   production base to the hosted sub-path — e.g. `"build": "vite build --base=/<slug>/"` —
   so bundled asset URLs resolve correctly. (Any runtime asset paths in the game code
   should use `import.meta.env.BASE_URL` so they follow the base too.)
2. Build and copy the output into `site/static/<slug>/`:
   ```bash
   cd games/<name> && npm install && npm run build
   rm -rf ../../site/static/<slug> && cp -R dist/. ../../site/static/<slug>/
   ```
   Commit the refreshed `site/static/<slug>/` — CI does **not** build these (it only builds
   the GDevelop games), so the committed build is what ships. Each game's `README.md` has
   its exact publish steps.
3. Add a card to `GAMES` with `href: '/<slug>/'`.
4. For gamepad/touch support, load `/arcade/controls.js` from the game's **JS entry**
   (`src/main.ts` / `main.js` / `main.tsx`), not from a Vite-processed `<script type="module">`
   in `index.html` — Vite strips those module tags out of the built HTML. Example:
   ```js
   window.ARCADE_CONTROLS = { /* optional */ };
   const s = document.createElement('script');
   s.src = '/arcade/controls.js';
   s.defer = true;
   document.body.appendChild(s);
   ```

## Controls (touch + gamepad)

Every game should be playable with **no keyboard** — many are played on a Tesla
display or tablet, sometimes with a plugged-in controller. The shared shim
`site/static/arcade/controls.js` provides this universally:

- Renders an on-screen D-pad + face buttons on touch devices.
- Polls the **Gamepad API** for controllers.
- Translates both into synthetic `KeyboardEvent`s, so any keyboard-driven game works.

Add it to a game's `index.html` before `</body>`:

```html
<script>window.ARCADE_CONTROLS = { /* per-game key map, optional */ };</script>
<script src="/arcade/controls.js" defer></script>
```

Defaults map the D-pad to arrows **and** WASD, and face buttons to Space / X / Z / Shift.
See the top of `controls.js` for the full config (custom `dpad`, `buttons`, `start`,
`disableTouch` for games with their own touch UI like Worm, etc.). GDevelop exports get
the shim injected automatically by `games/build-games.mjs`.

## Conventions

- Brand name is **Pink Horse of Whimsy**; the arcade is the **Pink Horse Arcade**.
- Games should be touch-friendly (many are played on tablets / car displays) and work with
  no build step where possible.
- Don't commit `site/build/`, `node_modules/`, or `.DS_Store` (see `.gitignore`).
- This repo may carry unrelated work-in-progress changes under `games/`; when committing,
  stage only the files relevant to your task.
