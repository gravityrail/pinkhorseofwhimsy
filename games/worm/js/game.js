/*! Worm — core game loop, world, render, input */
(function (W) {
  "use strict";

  const COLS = 20;
  const ROWS = 15;
  const BASE_LEN = 6;
  const MAX_LEN = 18;
  const BASE_TICK = 130;
  const BIRD_AVG_MS = 52000;

  const TREASURES = W.TREASURES;
  const BIRDS = W.BIRDS;
  const SPRITES = W.SPRITES;
  const Audio = W.Audio;
  const Particles = W.Particles;
  const biomeAt = W.biomeAt;
  const depthOf = W.depthOf;
  const dailySeed = W.dailySeed;

  // ---------- Sprite atlas ----------
  const spriteCache = Object.create(null);
  let spritesReady = false;

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) {
        resolve(null);
        return;
      }
      if (spriteCache[src]) {
        resolve(spriteCache[src]);
        return;
      }
      const img = new Image();
      img.onload = function () {
        spriteCache[src] = img;
        resolve(img);
      };
      img.onerror = function () {
        console.warn("Worm sprite failed to load:", src);
        resolve(null);
      };
      img.src = src;
    });
  }

  function preloadSprites() {
    const urls = [];
    TREASURES.forEach(function (t) {
      if (t.sprite) urls.push(t.sprite);
    });
    Object.keys(BIRDS).forEach(function (k) {
      if (BIRDS[k].sprite) urls.push(BIRDS[k].sprite);
    });
    Object.keys(SPRITES).forEach(function (k) {
      if (SPRITES[k]) urls.push(SPRITES[k]);
    });
    return Promise.all(urls.map(loadImage)).then(function () {
      spritesReady = true;
    });
  }

  function getSprite(src) {
    return src ? spriteCache[src] || null : null;
  }

  /** Draw a preloaded PNG centered at (x,y) with height `size` (width preserves aspect). */
  function drawSprite(src, x, y, size) {
    const img = getSprite(src);
    if (!img || !img.complete || !img.naturalWidth) return false;
    const aspect = img.naturalWidth / img.naturalHeight;
    const h = size;
    const w = size * aspect;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return true;
  }

  function spriteImgTag(src, cls) {
    return (
      '<img class="' +
      (cls || "ic-img") +
      '" src="' +
      src +
      '" alt="" draggable="false" />'
    );
  }

  // ---------- RNG ----------
  function hashSeed(x, y, salt) {
    let h = 2166136261 ^ ((x * 73856093) ^ (y * 19349663) ^ ((salt || 0) * 83492791));
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t,
      t3 = t2 * t;
    return {
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  // ---------- Canvas ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let cell = 32,
    Wpx = COLS * cell,
    Hpx = ROWS * cell;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    cell = canvas.width / COLS;
    Wpx = canvas.width;
    Hpx = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    dirtCache.clear();
  }
  window.addEventListener("resize", resize);

  // ---------- World ----------
  const screens = new Map();
  function screenKey(x, y) {
    return x + "," + y;
  }

  function pickTreasure(rng, biome) {
    if (rng() < 0.12 && biome.rarePool && biome.rarePool.length) {
      return biome.rarePool[Math.floor(rng() * biome.rarePool.length)];
    }
    return biome.pool[Math.floor(rng() * biome.pool.length)];
  }

  function buildScreen(sx, sy) {
    const worldSalt = game ? game.worldSalt : 0;
    const rng = mulberry32(hashSeed(sx, sy, worldSalt));
    const biome = biomeAt(sx, sy);
    const items = [];
    const taken = new Set();
    const isSecret = (hashSeed(sx, sy, worldSalt ^ 0x51eed) % 37) === 0 && !(sx === 0 && sy === 0);

    let count = 7 + Math.floor(rng() * 9);
    let secret = null;

    if (isSecret) {
      // Rune puzzle: eat 4 treasures in a specific order
      const order = [];
      const positions = [
        { cx: 4, cy: 4 },
        { cx: 15, cy: 4 },
        { cx: 4, cy: 11 },
        { cx: 15, cy: 11 },
      ];
      const pool = biome.rarePool && biome.rarePool.length ? biome.rarePool : biome.pool;
      for (let i = 0; i < 4; i++) {
        let t;
        do {
          t = pool[Math.floor(rng() * pool.length)];
        } while (order.indexOf(t) >= 0 && order.length < pool.length);
        order.push(t);
        const p = positions[i];
        taken.add(p.cx + "," + p.cy);
        items.push({
          cx: p.cx,
          cy: p.cy,
          type: t,
          phase: rng() * Math.PI * 2,
          secretIdx: i,
        });
      }
      secret = { order: order.slice(), next: 0, done: false };
      count = 3 + Math.floor(rng() * 4);
    }

    for (let i = 0; i < count; i++) {
      let cx, cy, k, tries = 0;
      do {
        cx = 1 + Math.floor(rng() * (COLS - 2));
        cy = 2 + Math.floor(rng() * (ROWS - 3));
        k = cx + "," + cy;
        tries++;
      } while (taken.has(k) && tries < 40);
      if (taken.has(k)) continue;
      taken.add(k);
      items.push({ cx: cx, cy: cy, type: pickTreasure(rng, biome), phase: rng() * Math.PI * 2 });
    }

    // Decor
    const decor = [];
    const dn = 10 + Math.floor(rng() * 14);
    for (let i = 0; i < dn; i++) {
      decor.push({
        x: rng(),
        y: rng(),
        r: 0.4 + rng() * 0.8,
        kind: rng() < 0.3 ? 1 : 0,
      });
    }

    // Crystals / magma veins for ambience
    const crystals = [];
    if (biome.sparkle || biome.glow) {
      const cn = 4 + Math.floor(rng() * 8);
      for (let i = 0; i < cn; i++) {
        crystals.push({
          x: rng(),
          y: rng(),
          r: 0.02 + rng() * 0.05,
          phase: rng() * Math.PI * 2,
        });
      }
    }

    // Hazards
    const moles = [];
    const acids = [];
    const dragons = [];
    let river = null;
    const hz = biome.hazards || {};

    if (rng() < (hz.mole || 0)) {
      const n = 1 + (rng() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        let cx, cy, k, tries = 0;
        do {
          cx = 2 + Math.floor(rng() * (COLS - 4));
          cy = 3 + Math.floor(rng() * (ROWS - 5));
          k = cx + "," + cy;
          tries++;
        } while (taken.has(k) && tries < 20);
        if (!taken.has(k)) {
          taken.add(k);
          moles.push({ cx: cx, cy: cy, phase: rng() * 10, awake: false });
        }
      }
    }

    if (rng() < (hz.acid || 0)) {
      const n = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        acids.push({
          cx: 1 + Math.floor(rng() * (COLS - 2)) + 0.5,
          cy: rng() * 2 + 0.5,
          speed: 0.003 + rng() * 0.004,
          phase: rng() * 1000,
        });
      }
    }

    if (rng() < (hz.dragon || 0)) {
      let cx, cy, k, tries = 0;
      do {
        cx = 3 + Math.floor(rng() * (COLS - 6));
        cy = 3 + Math.floor(rng() * (ROWS - 6));
        k = cx + "," + cy;
        tries++;
      } while (taken.has(k) && tries < 20);
      dragons.push({
        cx: cx,
        cy: cy,
        asleep: true,
        wake: 0,
        phase: rng() * 10,
      });
    }

    if (rng() < (hz.river || 0)) {
      const horiz = rng() < 0.5;
      const dir = rng() < 0.5 ? 1 : -1;
      const pos = horiz
        ? 3 + Math.floor(rng() * (ROWS - 6))
        : 3 + Math.floor(rng() * (COLS - 6));
      river = { horiz: horiz, pos: pos, dir: dir, width: 1 + (rng() < 0.3 ? 1 : 0) };
    }

    // Parallax pebble layers (precomputed)
    const layers = [];
    for (let L = 0; L < 3; L++) {
      const pebs = [];
      const n = 18 + Math.floor(rng() * 20);
      for (let i = 0; i < n; i++) {
        pebs.push({ x: rng(), y: rng(), r: 0.008 + rng() * 0.02 * (3 - L) });
      }
      layers.push(pebs);
    }

    return {
      items: items,
      decor: decor,
      crystals: crystals,
      moles: moles,
      acids: acids,
      dragons: dragons,
      river: river,
      secret: secret,
      layers: layers,
      biomeId: biome.id,
      trail: [],
    };
  }

  function getScreen(x, y) {
    const k = screenKey(x, y);
    if (!screens.has(k)) screens.set(k, buildScreen(x, y));
    return screens.get(k);
  }

  // ---------- Game state ----------
  let game = null;
  let particles = new Particles();
  let transition = null; // {t, life, dir}
  let paused = false;

  function newGame() {
    screens.clear();
    dirtCache.clear();
    particles = new Particles();
    const day = dailySeed();
    game = {
      lives: 3,
      inv: {},
      totalCollected: 0,
      score: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      multiplier: 1,
      screensVisited: new Set(["0,0"]),
      biomesVisited: new Set([biomeAt(0, 0).id]),
      deepest: 0,
      screen: { x: 0, y: 0 },
      worm: [],
      targetLen: BASE_LEN,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      moveAcc: 0,
      tick: BASE_TICK,
      birds: [],
      nextBirdAt: 0,
      invuln: 0,
      over: false,
      elapsed: 0,
      eatFx: [],
      face: "happy", // happy | munch | hurt
      faceT: 0,
      worldSalt: day.seed,
      dailyLabel: day.label,
      milestonesHit: {},
      secretsSolved: 0,
      pushCooldown: 0,
    };
    TREASURES.forEach(function (_, i) {
      game.inv[i] = 0;
    });
    const hx = Math.floor(COLS / 2),
      hy = Math.floor(ROWS / 2);
    for (let i = 0; i < BASE_LEN; i++) {
      game.worm.push({ x: hx - i, y: hy, px: hx - i, py: hy });
    }
    const s0 = getScreen(0, 0);
    s0.trail = [];
    for (let i = game.worm.length - 1; i >= 0; i--) {
      s0.trail.push({ x: game.worm[i].x, y: game.worm[i].y });
    }
    scheduleBird(true);
    buildInvHUD();
    updateHUD();
    transition = null;
    paused = false;
    setPauseUI(false);
  }

  function scheduleBird(first) {
    const u = Math.random();
    const interval = first ? 4000 + Math.random() * 6000 : -Math.log(1 - u) * BIRD_AVG_MS;
    game.nextBirdAt = game.elapsed + Math.max(2800, Math.min(interval, BIRD_AVG_MS * 2.5));
  }

  function pickBirdType() {
    const b = biomeAt(game.screen.x, game.screen.y);
    const bias = b.birdBias || ["sparrow"];
    return bias[Math.floor(Math.random() * bias.length)];
  }

  function spawnBird() {
    const typeId = pickBirdType();
    const def = BIRDS[typeId] || BIRDS.sparrow;
    const biome = biomeAt(game.screen.x, game.screen.y);
    const spdMul = biome.lowG ? 0.75 : 1;
    const speed = (def.speed[0] + Math.random() * (def.speed[1] - def.speed[0])) * spdMul;
    const M = 3.5;
    let bird;
    if (def.diagonal && Math.random() < 0.7) {
      const dx = Math.random() < 0.5 ? 1 : -1;
      const dy = Math.random() < 0.5 ? 1 : -1;
      const sp = speed * 0.75;
      bird = {
        x: dx > 0 ? -M : COLS + M,
        y: dy > 0 ? -M : ROWS + M,
        vx: dx * sp,
        vy: dy * sp,
        flap: 0,
        dir: dx,
        type: typeId,
        def: def,
      };
    } else if (Math.random() < 0.5) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const cy = 1 + Math.random() * (ROWS - 2);
      bird = {
        x: dir > 0 ? -M : COLS + M,
        y: cy,
        vx: dir * speed,
        vy: 0,
        flap: 0,
        dir: dir,
        type: typeId,
        def: def,
      };
    } else {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const cx = 1 + Math.random() * (COLS - 2);
      bird = {
        x: cx,
        y: dir > 0 ? -M : ROWS + M,
        vx: 0,
        vy: dir * speed,
        flap: 0,
        dir: dir,
        type: typeId,
        def: def,
      };
    }
    game.birds.push(bird);
    Audio.bird();
    particles.burstBird(bird.x, bird.y);
  }

  // ---------- HUD ----------
  const invEl = document.getElementById("inv");
  const livesEl = document.getElementById("lives");
  const coordsEl = document.getElementById("coords");
  const toastEl = document.getElementById("toast");
  const scoreEl = document.getElementById("score");
  const biomeEl = document.getElementById("biomeTag");
  const comboEl = document.getElementById("combo");
  const dailyEl = document.getElementById("daily");
  let slotEls = [];

  function buildInvHUD() {
    invEl.innerHTML = "";
    // Show base 8 always; rares appear when found
    slotEls = TREASURES.map(function (t, i) {
      const d = document.createElement("div");
      d.className = "slot" + (t.rare ? " rare hidden-slot" : "");
      d.dataset.idx = i;
      d.innerHTML = spriteImgTag(t.sprite, "ic-img") + '<span class="n">0</span>';
      invEl.appendChild(d);
      return d;
    });
  }

  function updateHUD() {
    if (!game) return;
    TREASURES.forEach(function (t, i) {
      const el = slotEls[i];
      const n = game.inv[i];
      el.querySelector(".n").textContent = n;
      if (t.rare) {
        if (n > 0) el.classList.remove("hidden-slot");
      }
    });
    // Lives as heart sprites
    if (livesEl) {
      let hearts = "";
      for (let i = 0; i < 3; i++) {
        hearts += spriteImgTag(
          i < game.lives ? SPRITES.heart : SPRITES.heartEmpty,
          "life-img"
        );
      }
      livesEl.innerHTML = hearts;
    }
    const b = biomeAt(game.screen.x, game.screen.y);
    coordsEl.textContent = "depth " + depthOf(game.screen.x, game.screen.y) + " · " + game.screen.x + "," + game.screen.y;
    if (biomeEl) {
      biomeEl.textContent = b.name;
      biomeEl.style.borderColor = b.accent;
      biomeEl.style.color = b.accent;
    }
    if (scoreEl) scoreEl.textContent = String(game.score);
    if (dailyEl) {
      dailyEl.innerHTML = spriteImgTag(SPRITES.sprout, "hud-inline") + " " + game.dailyLabel;
    }
    if (comboEl) {
      if (game.combo >= 2) {
        comboEl.textContent = "×" + game.combo + " COMBO";
        comboEl.classList.add("show");
      } else {
        comboEl.classList.remove("show");
      }
    }
  }

  function pulseSlot(i) {
    const s = slotEls[i];
    if (!s) return;
    s.classList.remove("hidden-slot");
    s.classList.add("pulse");
    setTimeout(function () {
      s.classList.remove("pulse");
    }, 160);
  }

  let toastT = null;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      toastEl.classList.remove("show");
    }, ms || 1600);
  }

  // ---------- Input ----------
  function setDir(dx, dy) {
    if (!game || game.over || paused) return;
    if (dx === -game.dir.x && dy === -game.dir.y) return;
    game.nextDir = { x: dx, y: dy };
  }

  const keyMap = {
    ArrowUp: [0, -1],
    KeyW: [0, -1],
    ArrowDown: [0, 1],
    KeyS: [0, 1],
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    ArrowRight: [1, 0],
    KeyD: [1, 0],
  };

  window.addEventListener("keydown", function (e) {
    if (e.code === "KeyP" || e.code === "Escape") {
      if (running && game && !game.over) {
        e.preventDefault();
        togglePause();
      }
      return;
    }
    const m = keyMap[e.code];
    if (m) {
      e.preventDefault();
      setDir(m[0], m[1]);
      Audio.unlock();
    }
  });

  function bindBtn(id, dx, dy) {
    const el = document.getElementById(id);
    if (!el) return;
    const press = function (e) {
      e.preventDefault();
      setDir(dx, dy);
      Audio.unlock();
      el.classList.add("on");
    };
    const rel = function () {
      el.classList.remove("on");
    };
    el.addEventListener("touchstart", press, { passive: false });
    el.addEventListener("mousedown", press);
    el.addEventListener("touchend", rel);
    el.addEventListener("mouseup", rel);
    el.addEventListener("mouseleave", rel);
    el.addEventListener("touchcancel", rel);
  }
  bindBtn("up", 0, -1);
  bindBtn("down", 0, 1);
  bindBtn("left", -1, 0);
  bindBtn("right2", 1, 0);

  let touchStart = null;
  canvas.addEventListener(
    "touchstart",
    function (e) {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
      Audio.unlock();
    },
    { passive: true }
  );
  canvas.addEventListener(
    "touchend",
    function (e) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x,
        dy = t.clientY - touchStart.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
        touchStart = null;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
      else setDir(0, dy > 0 ? 1 : -1);
      touchStart = null;
    },
    { passive: true }
  );

  // ---------- Update ----------
  function step(dt) {
    if (!game || game.over || paused) return;
    game.elapsed += dt;
    if (game.invuln > 0) game.invuln = Math.max(0, game.invuln - dt);
    if (game.faceT > 0) {
      game.faceT -= dt;
      if (game.faceT <= 0) game.face = "happy";
    }
    if (game.comboTimer > 0) {
      game.comboTimer -= dt;
      if (game.comboTimer <= 0) {
        game.combo = 0;
        updateHUD();
      }
    }
    if (game.pushCooldown > 0) game.pushCooldown -= dt;

    if (transition) {
      transition.t += dt;
      if (transition.t >= transition.life) transition = null;
    }

    particles.update(dt);

    // Acid drips animation + damage
    const scr = getScreen(game.screen.x, game.screen.y);
    for (let i = 0; i < scr.acids.length; i++) {
      const a = scr.acids[i];
      a.cy += a.speed * dt;
      if (a.cy > ROWS + 1) {
        a.cy = -0.5;
        a.cx = 1 + Math.random() * (COLS - 2);
      }
      if (Math.random() < 0.08) particles.drip(a.cx - 0.5, a.cy, "rgba(120,255,60,0.7)");
    }
    checkAcidHit(scr);
    checkDragon(scr, dt);

    // worm movement
    const biome = biomeAt(game.screen.x, game.screen.y);
    const tickMul = biome.lowG ? 1.12 : 1;
    const tick = game.tick * tickMul;
    game.moveAcc += dt;
    while (game.moveAcc >= tick) {
      game.moveAcc -= tick;
      moveWorm();
    }

    game.eatFx = game.eatFx.filter(function (f) {
      f.t += dt;
      return f.t < f.life;
    });

    if (game.elapsed >= game.nextBirdAt) {
      spawnBird();
      scheduleBird(false);
    }
    const bs = dt / 100;
    const head = game.worm[0];
    for (let i = 0; i < game.birds.length; i++) {
      const b = game.birds[i];
      if (b.def && b.def.chase) {
        const tx = head.x - b.x,
          ty = head.y - b.y;
        const len = Math.hypot(tx, ty) || 1;
        const steer = 0.008 * bs * 100;
        b.vx += (tx / len) * steer;
        b.vy += (ty / len) * steer;
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const maxS = (b.def.speed[1] || 0.4) * 1.1;
        if (sp > maxS) {
          b.vx = (b.vx / sp) * maxS;
          b.vy = (b.vy / sp) * maxS;
        }
      }
      b.x += b.vx * bs;
      b.y += b.vy * bs;
      b.flap += dt * 0.02;
    }
    game.birds = game.birds.filter(function (b) {
      return b.x > -5 && b.x < COLS + 5 && b.y > -5 && b.y < ROWS + 5;
    });
    checkBirdHit();
  }

  function cellBlocked(cx, cy, scr) {
    for (let i = 0; i < scr.moles.length; i++) {
      if (scr.moles[i].cx === cx && scr.moles[i].cy === cy) return "mole";
    }
    for (let i = 0; i < scr.dragons.length; i++) {
      const d = scr.dragons[i];
      if (d.asleep && d.cx === cx && d.cy === cy) return "dragon";
    }
    return null;
  }

  function moveWorm() {
    game.dir = game.nextDir;
    const head = game.worm[0];
    let nx = head.x + game.dir.x;
    let ny = head.y + game.dir.y;

    // River current push
    const scr0 = getScreen(game.screen.x, game.screen.y);
    if (scr0.river && game.pushCooldown <= 0) {
      const rv = scr0.river;
      let inRiver = false;
      if (rv.horiz) {
        if (Math.abs(head.y - rv.pos) <= rv.width) inRiver = true;
      } else {
        if (Math.abs(head.x - rv.pos) <= rv.width) inRiver = true;
      }
      if (inRiver) {
        if (rv.horiz) nx += rv.dir;
        else ny += rv.dir;
        game.pushCooldown = game.tick * 0.5;
      }
    }

    let crossed = null;
    if (nx < 0) {
      crossed = { x: -1, y: 0 };
      nx = COLS - 1;
    } else if (nx >= COLS) {
      crossed = { x: 1, y: 0 };
      nx = 0;
    } else if (ny < 0) {
      crossed = { x: 0, y: -1 };
      ny = ROWS - 1;
    } else if (ny >= ROWS) {
      crossed = { x: 0, y: 1 };
      ny = 0;
    }

    if (crossed) {
      game.screen.x += crossed.x;
      game.screen.y += crossed.y;
      const key = screenKey(game.screen.x, game.screen.y);
      const fresh = !game.screensVisited.has(key);
      game.screensVisited.add(key);
      const d = depthOf(game.screen.x, game.screen.y);
      if (d > game.deepest) game.deepest = d;
      const biome = biomeAt(game.screen.x, game.screen.y);
      const newBiome = !game.biomesVisited.has(biome.id);
      game.biomesVisited.add(biome.id);
      getScreen(game.screen.x, game.screen.y);
      Audio.transition();
      transition = { t: 0, life: 420, dir: crossed, biome: biome };

      if (newBiome) {
        toast(biome.name + "!", 2200);
        Audio.milestone();
        game.score += 100;
      } else if (fresh) {
        toast("New tunnel  " + game.screen.x + "," + game.screen.y, 1400);
      }

      const cur = getScreen(game.screen.x, game.screen.y);
      if (cur.secret && !cur.secret.done) {
        setTimeout(function () {
          if (game && !game.over) toast("Secret runes! Eat treasures in order", 2400);
        }, 500);
      }

      game.worm = [];
      for (let i = 0; i < game.targetLen; i++) {
        const sx = nx - game.dir.x * i,
          sy = ny - game.dir.y * i;
        game.worm.push({ x: sx, y: sy, px: sx, py: sy });
      }
      if (cur.trail.length === 0) {
        for (let i = game.worm.length - 1; i >= 0; i--) {
          cur.trail.push({ x: game.worm[i].x, y: game.worm[i].y });
        }
      } else {
        cur.trail.push({ x: nx, y: ny });
      }
      // Clear birds on screen change
      game.birds = [];
      updateHUD();
      eat(nx, ny);
      return;
    }

    // Hazard block
    const scr = getScreen(game.screen.x, game.screen.y);
    const block = cellBlocked(nx, ny, scr);
    if (block === "mole") {
      loseLife("mole");
      // bounce: reverse
      game.dir = { x: -game.dir.x, y: -game.dir.y };
      game.nextDir = { x: game.dir.x, y: game.dir.y };
      return;
    }
    if (block === "dragon") {
      // Wake the dragon!
      for (let i = 0; i < scr.dragons.length; i++) {
        const dr = scr.dragons[i];
        if (dr.cx === nx && dr.cy === ny) {
          dr.asleep = false;
          dr.wake = 3000;
        }
      }
      loseLife("dragon");
      return;
    }

    for (const seg of game.worm) {
      seg.px = seg.x;
      seg.py = seg.y;
    }
    // Grow if needed
    if (game.worm.length < game.targetLen) {
      const tail = game.worm[game.worm.length - 1];
      game.worm.push({ x: tail.x, y: tail.y, px: tail.x, py: tail.y });
    }
    for (let i = game.worm.length - 1; i > 0; i--) {
      game.worm[i].x = game.worm[i - 1].px;
      game.worm[i].y = game.worm[i - 1].py;
    }
    game.worm[0].x = nx;
    game.worm[0].y = ny;
    scr.trail.push({ x: nx, y: ny });
    if (scr.trail.length > 1800) scr.trail.shift();
    eat(nx, ny);
  }

  function eat(cx, cy) {
    const scr = getScreen(game.screen.x, game.screen.y);
    for (let i = 0; i < scr.items.length; i++) {
      const it = scr.items[i];
      if (it.cx === cx && it.cy === cy) {
        // Secret order check
        if (scr.secret && !scr.secret.done && it.secretIdx != null) {
          if (it.secretIdx === scr.secret.next) {
            scr.secret.next++;
            if (scr.secret.next >= scr.secret.order.length) {
              scr.secret.done = true;
              game.secretsSolved++;
              game.score += 500 * game.multiplier;
              game.multiplier = Math.min(5, game.multiplier + 0.5);
              Audio.secret();
              toast("Rune puzzle solved! ×" + game.multiplier.toFixed(1) + " mult", 2400);
              particles.burstEat(cx, cy, "rgba(200,160,255,0.95)");
              particles.burstEat(cx, cy, "rgba(255,220,100,0.9)");
            } else {
              toast(scr.secret.next + "/" + scr.secret.order.length, 1000);
            }
          } else {
            // Wrong order — reset puzzle progress but still collect
            scr.secret.next = it.secretIdx === 0 ? 1 : 0;
            if (it.secretIdx === 0) {
              toast("Sequence restarted", 1000);
            } else {
              toast("Wrong order — watch the runes!", 1400);
              scr.secret.next = 0;
            }
          }
        }

        game.inv[it.type]++;
        game.totalCollected++;
        game.combo++;
        game.comboTimer = 2200;
        if (game.combo > game.maxCombo) game.maxCombo = game.combo;
        const tdef = TREASURES[it.type];
        const pts = Math.round((tdef.pts || 10) * game.multiplier * (1 + Math.max(0, game.combo - 1) * 0.15));
        game.score += pts;

        Audio.eat(it.type);
        if (game.combo >= 2) Audio.combo(game.combo);
        pulseSlot(it.type);
        game.face = "munch";
        game.faceT = 280;
        game.eatFx.push({ cx: cx, cy: cy, type: it.type, t: 0, life: 560, pts: pts });
        const biome = biomeAt(game.screen.x, game.screen.y);
        particles.burstEat(cx, cy, biome.particle);
        scr.items.splice(i, 1);

        checkMilestones();
        updateHUD();
        break;
      }
    }
  }

  function checkMilestones() {
    const marks = [
      { n: 10, msg: "Snacky worm!", grow: 1 },
      { n: 25, msg: "Growing strong!", grow: 1 },
      { n: 50, msg: "Treasure hog!", grow: 2 },
      { n: 75, msg: "Legendary burrower!", grow: 1 },
      { n: 100, msg: "HUNDRED! Fabulous!", grow: 2 },
      { n: 150, msg: "Mythic tunnel-wyrm!", grow: 1 },
    ];
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (game.totalCollected >= m.n && !game.milestonesHit[m.n]) {
        game.milestonesHit[m.n] = true;
        game.targetLen = Math.min(MAX_LEN, game.targetLen + m.grow);
        game.score += m.n * 5;
        Audio.milestone();
        toast(m.msg + "  +" + m.grow + " length", 2200);
      }
    }
  }

  function checkBirdHit() {
    if (game.invuln > 0) return;
    for (let bi = 0; bi < game.birds.length; bi++) {
      const b = game.birds[bi];
      const hitR = (b.def && b.def.hitR) || 1.6;
      for (let si = 0; si < game.worm.length; si++) {
        const seg = game.worm[si];
        const dx = seg.x - b.x,
          dy = seg.y - b.y;
        if (dx * dx + dy * dy <= hitR * hitR) {
          loseLife("bird");
          particles.burstBird(b.x, b.y);
          return;
        }
      }
    }
  }

  function checkAcidHit(scr) {
    if (game.invuln > 0) return;
    const head = game.worm[0];
    for (let i = 0; i < scr.acids.length; i++) {
      const a = scr.acids[i];
      const dx = head.x + 0.5 - a.cx;
      const dy = head.y + 0.5 - a.cy;
      if (dx * dx + dy * dy < 0.55) {
        loseLife("acid");
        return;
      }
    }
  }

  function checkDragon(scr, dt) {
    for (let i = 0; i < scr.dragons.length; i++) {
      const d = scr.dragons[i];
      if (!d.asleep) {
        d.wake -= dt;
        if (d.wake <= 0) {
          d.asleep = true;
          toast("Dragon dozed off again…", 1400);
        }
        continue;
      }
      // Proximity wake
      const head = game.worm[0];
      const dx = head.x - d.cx,
        dy = head.y - d.cy;
      if (dx * dx + dy * dy <= 2.2 * 2.2) {
        // Quiet tip once
        if (!d.warned) {
          d.warned = true;
          toast("Shh… sleeping dragon nearby", 1600);
        }
      }
      if (dx * dx + dy * dy <= 1.1 * 1.1) {
        d.asleep = false;
        d.wake = 3500;
        loseLife("dragon");
      }
    }
  }

  function loseLife(reason) {
    if (game.invuln > 0) return;
    game.lives--;
    game.invuln = 1800;
    game.combo = 0;
    game.face = "hurt";
    game.faceT = 600;
    Audio.hurt();
    flash(reason === "acid" ? "acid" : "hurt");
    const head = game.worm[0];
    particles.burstHurt(head.x, head.y);
    updateHUD();
    if (game.lives <= 0) {
      endGame();
    } else {
      const msgs = {
        bird: "Ouch! Bird strike!  −1 life",
        mole: "Bonk! Grumpy mole!  −1 life",
        acid: "Sizzle! Acid drip!  −1 life",
        dragon: "ROAR! Dragon woke up!  −1 life",
      };
      toast(msgs[reason] || "Ouch! −1 life", 1600);
    }
  }

  // ---------- Render ----------
  const dirtCache = new Map();
  let dirtSizeKey = "";

  function getDirt(sx, sy) {
    const sizeKey = Wpx + "x" + Hpx;
    if (dirtSizeKey !== sizeKey) {
      dirtCache.clear();
      dirtSizeKey = sizeKey;
    }
    const key = sx + "," + sy;
    if (dirtCache.has(key)) return dirtCache.get(key);

    const biome = biomeAt(sx, sy);
    const c = document.createElement("canvas");
    c.width = Wpx;
    c.height = Hpx;
    const g = c.getContext("2d");
    const rng = mulberry32((hashSeed(sx, sy, game ? game.worldSalt : 0) ^ 0x9e3779b9) >>> 0);
    const sc = cell / 32;
    const hue = biome.hue + rng() * 8 - 4;

    const grd = g.createLinearGradient(0, 0, 0, Hpx);
    grd.addColorStop(0, "hsl(" + (hue + 5) + "," + biome.sat + "%," + biome.lightTop + "%)");
    grd.addColorStop(1, "hsl(" + (hue - 3) + "," + (biome.sat + 6) + "%," + biome.lightBot + "%)");
    g.fillStyle = grd;
    g.fillRect(0, 0, Wpx, Hpx);

    // Parallax-ish blotches
    for (let i = 0; i < 30; i++) {
      const x = rng() * Wpx,
        y = rng() * Hpx,
        r = (0.1 + rng() * 0.28) * Wpx;
      const l = biome.lightBot + rng() * 14;
      const h = hue - 6 + rng() * 14;
      const a = 0.1 + rng() * 0.14;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, "hsla(" + h + "," + biome.sat + "%," + l + "%," + a + ")");
      rg.addColorStop(1, "hsla(" + h + "," + biome.sat + "%," + l + "%,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, Wpx, Hpx);
    }

    // Fine grains
    const grains = Math.floor((Wpx * Hpx) / 800);
    for (let i = 0; i < grains; i++) {
      const x = rng() * Wpx,
        y = rng() * Hpx;
      const s = (0.5 + rng() * 1.8) * sc;
      const l = 8 + rng() * 40;
      const h = hue - 10 + rng() * 24;
      const sat = biome.sat * 0.6 + rng() * 30;
      g.fillStyle = "hsla(" + h + "," + sat + "%," + l + "%," + (0.2 + rng() * 0.5) + ")";
      g.beginPath();
      g.arc(x, y, s, 0, 7);
      g.fill();
    }

    // Pebbles / crystals
    for (let i = 0; i < 32; i++) {
      const x = rng() * Wpx,
        y = rng() * Hpx,
        r = (2 + rng() * 4.5) * sc;
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.beginPath();
      g.ellipse(x + r * 0.3, y + r * 0.4, r, r * 0.8, 0, 0, 7);
      g.fill();
      if (biome.sparkle && rng() < 0.35) {
        const pr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        pr.addColorStop(0, "hsla(" + (260 + rng() * 40) + ",70%,75%,0.9)");
        pr.addColorStop(1, "hsla(" + (270 + rng() * 30) + ",50%,30%,0.3)");
        g.fillStyle = pr;
      } else if (biome.glow && rng() < 0.4) {
        const pr = g.createRadialGradient(x, y, 0, x, y, r * 2);
        pr.addColorStop(0, "hsla(20,100%,60%,0.55)");
        pr.addColorStop(1, "hsla(10,80%,20%,0)");
        g.fillStyle = pr;
        g.beginPath();
        g.arc(x, y, r * 2, 0, 7);
        g.fill();
        g.fillStyle = "hsl(18,90%," + (40 + rng() * 20) + "%)";
      } else {
        const pl = 40 + rng() * 28;
        const pr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        pr.addColorStop(0, "hsl(" + hue + ",14%," + pl + "%)");
        pr.addColorStop(1, "hsl(" + hue + ",20%," + (pl - 26) + "%)");
        g.fillStyle = pr;
      }
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }

    // Vignette
    const vg = g.createRadialGradient(Wpx / 2, Hpx * 0.4, Math.min(Wpx, Hpx) * 0.18, Wpx / 2, Hpx / 2, Math.max(Wpx, Hpx) * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, biome.fog || "rgba(0,0,0,0.42)");
    g.fillStyle = vg;
    g.fillRect(0, 0, Wpx, Hpx);

    dirtCache.set(key, c);
    return c;
  }

  function drawParallax(scr, biome) {
    // Soft drifting depth layers based on time + screen
    const t = game.elapsed * 0.00015;
    const cols = biome.parallax || ["#2a1a0e", "#1a1008", "#0e0804"];
    for (let L = 0; L < scr.layers.length; L++) {
      const pebs = scr.layers[L];
      const parallax = 0.15 + L * 0.12;
      const ox = Math.sin(t * (1 + L * 0.3) + game.screen.x) * cell * parallax * 2;
      const oy = Math.cos(t * (0.8 + L * 0.2) + game.screen.y) * cell * parallax;
      ctx.globalAlpha = 0.12 + L * 0.06;
      ctx.fillStyle = cols[L] || cols[cols.length - 1];
      for (let i = 0; i < pebs.length; i++) {
        const p = pebs[i];
        const x = p.x * Wpx + ox;
        const y = p.y * Hpx + oy;
        ctx.beginPath();
        ctx.arc(x, y, p.r * Wpx, 0, 7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Ambient crystals
    if (scr.crystals && scr.crystals.length) {
      for (let i = 0; i < scr.crystals.length; i++) {
        const c = scr.crystals[i];
        const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(game.elapsed * 0.004 + c.phase));
        const x = c.x * Wpx,
          y = c.y * Hpx;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, c.r * Wpx * 3);
        if (biome.glow) {
          rg.addColorStop(0, "rgba(255,120,40," + 0.35 * pulse + ")");
          rg.addColorStop(1, "rgba(255,60,0,0)");
        } else {
          rg.addColorStop(0, "rgba(200,170,255," + 0.4 * pulse + ")");
          rg.addColorStop(1, "rgba(140,80,255,0)");
        }
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, c.r * Wpx * 3, 0, 7);
        ctx.fill();
      }
    }
  }

  function tunnelPath(pts) {
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[0].x, pts[0].y);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2,
        my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  function drawTunnel(scr, biome) {
    const tr = scr.trail;
    if (!tr || !tr.length) return;
    const pts = tr.map(function (p) {
      return { x: p.x * cell + cell / 2, y: p.y * cell + cell / 2 };
    });
    const t = Math.max(0, Math.min(1, game.moveAcc / game.tick));
    const h = game.worm[0];
    pts.push({
      x: lerp(h.px, h.x, t) * cell + cell / 2,
      y: lerp(h.py, h.y, t) * cell + cell / 2,
    });

    const w = cell * 0.95;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = cell * 0.55;
    ctx.shadowOffsetY = cell * 0.06;
    ctx.strokeStyle = "rgba(15,9,5,0.95)";
    ctx.lineWidth = w * 1.02;
    tunnelPath(pts);
    ctx.restore();

    const wallH = biome.hue;
    ctx.strokeStyle = "hsl(" + wallH + ",46%,7%)";
    ctx.lineWidth = w;
    tunnelPath(pts);

    ctx.strokeStyle = "hsl(" + wallH + ",40%,13%)";
    ctx.lineWidth = w * 0.72;
    tunnelPath(pts);

    ctx.strokeStyle = "hsla(" + (wallH + 8) + ",34%,24%,0.55)";
    ctx.lineWidth = w * 0.42;
    tunnelPath(pts);

    ctx.save();
    ctx.translate(0, -w * 0.4);
    ctx.strokeStyle = "hsla(" + (wallH + 12) + ",42%,46%,0.30)";
    ctx.lineWidth = Math.max(1.5, cell * 0.07);
    tunnelPath(pts);
    ctx.restore();

    ctx.save();
    ctx.translate(0, w * 0.4);
    ctx.strokeStyle = "rgba(0,0,0,0.30)";
    ctx.lineWidth = Math.max(1.5, cell * 0.06);
    tunnelPath(pts);
    ctx.restore();
  }

  function drawRiver(scr) {
    if (!scr.river) return;
    const rv = scr.river;
    const t = game.elapsed * 0.004;
    ctx.save();
    if (rv.horiz) {
      const y = rv.pos * cell + cell / 2;
      const h = cell * (0.7 + rv.width * 0.5);
      const grd = ctx.createLinearGradient(0, y - h, 0, y + h);
      grd.addColorStop(0, "rgba(40,120,200,0)");
      grd.addColorStop(0.5, "rgba(60,160,220,0.28)");
      grd.addColorStop(1, "rgba(40,120,200,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, y - h, Wpx, h * 2);
      ctx.strokeStyle = "rgba(140,220,255,0.25)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const yy = y + Math.sin(t * 2 + i) * h * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        for (let x = 0; x < Wpx; x += 16) {
          ctx.lineTo(x, yy + Math.sin(t * 3 + x * 0.04 + i) * 4);
        }
        ctx.stroke();
      }
      // Arrow hints
      ctx.fillStyle = "rgba(180,230,255,0.35)";
      ctx.font = cell * 0.45 + "px serif";
      ctx.textAlign = "center";
      ctx.fillText(rv.dir > 0 ? "→ → →" : "← ← ←", Wpx / 2, y + cell * 0.15);
    } else {
      const x = rv.pos * cell + cell / 2;
      const w = cell * (0.7 + rv.width * 0.5);
      const grd = ctx.createLinearGradient(x - w, 0, x + w, 0);
      grd.addColorStop(0, "rgba(40,120,200,0)");
      grd.addColorStop(0.5, "rgba(60,160,220,0.28)");
      grd.addColorStop(1, "rgba(40,120,200,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(x - w, 0, w * 2, Hpx);
      ctx.fillStyle = "rgba(180,230,255,0.35)";
      ctx.font = cell * 0.45 + "px serif";
      ctx.textAlign = "center";
      ctx.fillText(rv.dir > 0 ? "↓" : "↑", x, Hpx / 2);
    }
    ctx.restore();
  }

  function drawItems(scr) {
    const t = game.elapsed * 0.004;
    // Secret rune order display
    if (scr.secret && !scr.secret.done) {
      const order = scr.secret.order;
      const bx = Wpx / 2;
      const by = cell * 1.1;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(20,10,40,0.55)";
      const bw = cell * (order.length * 0.9 + 1.2);
      roundRect(bx - bw / 2, by - cell * 0.45, bw, cell * 0.9, 10);
      ctx.fill();
      ctx.font = cell * 0.28 + "px sans-serif";
      ctx.fillStyle = "rgba(200,180,255,0.9)";
      ctx.textAlign = "center";
      ctx.fillText("RUNES", bx, by - cell * 0.55);
      for (let i = 0; i < order.length; i++) {
        const done = i < scr.secret.next;
        const x = bx - ((order.length - 1) * cell * 0.7) / 2 + i * cell * 0.7;
        ctx.globalAlpha = done ? 0.35 : 1;
        drawSprite(TREASURES[order[i]].sprite, x, by, cell * 0.55);
        if (done) {
          ctx.fillStyle = "#5ef38c";
          ctx.font = "bold " + cell * 0.35 + "px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✓", x, by);
        }
      }
      ctx.restore();
    }

    for (let i = 0; i < scr.items.length; i++) {
      const it = scr.items[i];
      const bob = Math.sin(t + it.phase) * cell * 0.12;
      const x = it.cx * cell + cell / 2;
      const y = it.cy * cell + cell / 2 + bob;
      const tdef = TREASURES[it.type];

      // Sparkle for rares
      if (tdef.rare) {
        const spark = 0.5 + 0.5 * Math.sin(t * 3 + it.phase);
        ctx.save();
        ctx.globalAlpha = 0.35 * spark;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, cell * 0.7);
        rg.addColorStop(0, "rgba(255,240,150,0.9)");
        rg.addColorStop(1, "rgba(255,200,50,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.7, 0, 7);
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(x, it.cy * cell + cell * 0.82, cell * 0.28, cell * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Soft glow behind sprite
      ctx.save();
      ctx.shadowColor = tdef.rare ? "rgba(255,220,100,0.7)" : "rgba(255,255,255,0.35)";
      ctx.shadowBlur = cell * 0.35;
      drawSprite(tdef.sprite, x, y, cell * 0.78);
      ctx.restore();

      if (it.secretIdx != null) {
        ctx.strokeStyle = "rgba(180,140,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.48, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawHazards(scr) {
    // Moles
    for (let i = 0; i < scr.moles.length; i++) {
      const m = scr.moles[i];
      const x = m.cx * cell + cell / 2;
      const y = m.cy * cell + cell / 2 + Math.sin(game.elapsed * 0.005 + m.phase) * cell * 0.06;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(x, m.cy * cell + cell * 0.8, cell * 0.35, cell * 0.12, 0, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawSprite(SPRITES.mole, x, y, cell * 0.85);
    }
    // Dragons
    for (let i = 0; i < scr.dragons.length; i++) {
      const d = scr.dragons[i];
      const x = d.cx * cell + cell / 2;
      const y = d.cy * cell + cell / 2;
      const snore = d.asleep ? Math.sin(game.elapsed * 0.003 + d.phase) : 0;
      if (d.asleep) {
        ctx.globalAlpha = 0.7;
        ctx.font = cell * 0.35 + "px serif";
        ctx.fillStyle = "rgba(200,220,255,0.7)";
        ctx.textAlign = "center";
        ctx.fillText("z", x + cell * 0.45, y - cell * 0.5 + snore * 4);
        ctx.fillText("z", x + cell * 0.6, y - cell * 0.75 + snore * 4);
        ctx.globalAlpha = 1;
        drawSprite(SPRITES.dragon, x, y, cell * 1.1);
      } else {
        // Awake — angry glow
        const rg = ctx.createRadialGradient(x, y, 0, x, y, cell * 1.4);
        rg.addColorStop(0, "rgba(255,60,40,0.45)");
        rg.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, cell * 1.4, 0, 7);
        ctx.fill();
        drawSprite(SPRITES.dragon, x, y + Math.sin(game.elapsed * 0.02) * 3, cell * 1.2);
      }
    }
    // Acid
    for (let i = 0; i < scr.acids.length; i++) {
      const a = scr.acids[i];
      const x = a.cx * cell;
      const y = a.cy * cell;
      ctx.fillStyle = "rgba(100,255,60,0.2)";
      ctx.fillRect(x - cell * 0.08, 0, cell * 0.16, y);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, cell * 0.35);
      rg.addColorStop(0, "rgba(180,255,80,0.9)");
      rg.addColorStop(1, "rgba(40,180,20,0.1)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.28, 0, 7);
      ctx.fill();
    }
  }

  function drawEatFx() {
    for (let i = 0; i < game.eatFx.length; i++) {
      const f = game.eatFx[i];
      const p = f.t / f.life;
      const x = f.cx * cell + cell / 2,
        y = f.cy * cell + cell / 2 - p * cell * 1.4;
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.cx * cell + cell / 2, f.cy * cell + cell / 2, p * cell * 1.0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffd54a";
      ctx.font = "bold " + cell * 0.42 + "px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+" + (f.pts || 1), x, y);
      ctx.globalAlpha = 1;
    }
  }

  function drawWorm() {
    const blink = game.invuln > 0 && Math.floor(game.elapsed / 120) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.45;

    const t = Math.max(0, Math.min(1, game.moveAcc / game.tick));
    const centers = game.worm.map(function (seg) {
      return {
        x: lerp(seg.px, seg.x, t) * cell + cell / 2,
        y: lerp(seg.py, seg.y, t) * cell + cell / 2,
      };
    });

    const PER = 7;
    const PAD = [centers[0]].concat(centers, [centers[centers.length - 1]]);
    const pts = [];
    for (let i = 1; i < PAD.length - 2; i++) {
      for (let s = 0; s < PER; s++) pts.push(catmull(PAD[i - 1], PAD[i], PAD[i + 1], PAD[i + 2], s / PER));
    }
    pts.push(centers[centers.length - 1]);
    const n = pts.length;

    const rHead = cell * 0.5,
      rTail = cell * 0.22;
    const amp = cell * 0.1;
    if (n < 2) {
      // Degenerate (idle preview) — just a head blob
      const p = pts[0] || centers[0];
      if (p) {
        ctx.fillStyle = "hsl(138,68%,52%)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, rHead, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = i / (n - 1);
      const prev = pts[Math.max(0, i - 1)],
        next = pts[Math.min(n - 1, i + 1)];
      let tx = next.x - prev.x,
        ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const off = Math.sin(game.elapsed * 0.008 + a * 7) * amp * Math.min(1, a * 2.2);
      p.wx = p.x + -ty * off;
      p.wy = p.y + tx * off;
      p.r = lerp(rHead, rTail, a);
      p.tx = tx;
      p.ty = ty;
    }

    // Outline
    ctx.fillStyle = "rgba(4,46,20,0.9)";
    const olw = Math.max(2, cell * 0.07);
    for (let i = n - 1; i >= 0; i--) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.wx, p.wy, p.r + olw, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gradient body segments
    for (let i = n - 1; i >= 0; i--) {
      const p = pts[i],
        a = i / (n - 1);
      const hue = game.face === "hurt" ? 8 + a * 6 : 138 + a * 10;
      const light = game.face === "hurt" ? 48 - a * 10 : 54 - a * 14;
      const sat = game.face === "hurt" ? 70 : 72;
      const grd = ctx.createRadialGradient(p.wx - p.r * 0.3, p.wy - p.r * 0.35, p.r * 0.1, p.wx, p.wy, p.r);
      grd.addColorStop(0, "hsl(" + hue + "," + sat + "%," + (light + 14) + "%)");
      grd.addColorStop(0.55, "hsl(" + hue + "," + sat + "%," + light + "%)");
      grd.addColorStop(1, "hsl(" + (hue - 8) + "," + (sat + 5) + "%," + (light - 16) + "%)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.wx, p.wy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sheen
    for (let i = n - 1; i >= 0; i--) {
      const p = pts[i];
      ctx.fillStyle = "rgba(220,255,230,0.18)";
      ctx.beginPath();
      ctx.arc(p.wx, p.wy - p.r * 0.42, p.r * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    // Segment ridges
    ctx.fillStyle = "rgba(4,46,20,0.14)";
    for (let i = 1; i < centers.length; i++) {
      const p = pts[Math.min(n - 1, i * PER)];
      if (p) {
        ctx.beginPath();
        ctx.arc(p.wx, p.wy, p.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Head face
    const h = pts[0],
      rad = h.r,
      hx = h.wx,
      hy = h.wy;
    const dx = game.dir.x,
      dy = game.dir.y;
    const px = -dy,
      py = dx;

    // Cheeks blush when munching
    if (game.face === "munch") {
      ctx.fillStyle = "rgba(255,120,140,0.35)";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hx + px * rad * 0.55 * s, hy + py * rad * 0.55 * s, rad * 0.22, 0, 7);
        ctx.fill();
      }
    }

    // Eyes
    for (const s of [-1, 1]) {
      const eyeX = hx + px * rad * 0.42 * s + dx * rad * 0.22;
      const eyeY = hy + py * rad * 0.42 * s + dy * rad * 0.22;
      if (game.face === "hurt") {
        // X eyes
        ctx.strokeStyle = "#06210f";
        ctx.lineWidth = Math.max(2, cell * 0.06);
        const r = rad * 0.18;
        ctx.beginPath();
        ctx.moveTo(eyeX - r, eyeY - r);
        ctx.lineTo(eyeX + r, eyeY + r);
        ctx.moveTo(eyeX + r, eyeY - r);
        ctx.lineTo(eyeX - r, eyeY + r);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, rad * 0.28, 0, Math.PI * 2);
        ctx.fill();
        // Pupils look toward movement; happy squint when munch
        const pr = game.face === "munch" ? rad * 0.1 : rad * 0.14;
        ctx.fillStyle = "#06210f";
        ctx.beginPath();
        ctx.arc(eyeX + dx * rad * 0.1, eyeY + dy * rad * 0.1, pr, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(eyeX - rad * 0.08, eyeY - rad * 0.08, rad * 0.07, 0, 7);
        ctx.fill();
      }
    }

    // Smile / mouth
    ctx.strokeStyle = "rgba(4,46,20,0.7)";
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.lineCap = "round";
    const mx = hx + dx * rad * 0.45;
    const my = hy + dy * rad * 0.45;
    ctx.beginPath();
    if (game.face === "hurt") {
      // frown
      ctx.arc(mx - dx * rad * 0.1, my - dy * rad * 0.1, rad * 0.22, 0.2, Math.PI - 0.2);
    } else if (game.face === "munch") {
      ctx.fillStyle = "rgba(40,20,10,0.75)";
      ctx.beginPath();
      ctx.ellipse(mx, my, rad * 0.28, rad * 0.22, Math.atan2(dy, dx), 0, 7);
      ctx.fill();
    } else {
      // happy smile
      const ang = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.arc(mx - dx * rad * 0.05, my - dy * rad * 0.05, rad * 0.25, ang + 0.4, ang + Math.PI - 0.4);
      ctx.stroke();
    }

    // Antennae
    ctx.strokeStyle = game.face === "hurt" ? "hsl(8,55%,40%)" : "hsl(140,55%,38%)";
    ctx.lineWidth = Math.max(2, cell * 0.05);
    for (const s of [-1, 1]) {
      const baseX = hx + px * rad * 0.35 * s,
        baseY = hy + py * rad * 0.35 * s;
      const tipX = baseX + dx * rad * 0.75 + px * rad * 0.3 * s;
      const tipY = baseY + dy * rad * 0.75 + py * rad * 0.3 * s;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = game.face === "hurt" ? "#ff8a6a" : "#ffd54a";
      ctx.beginPath();
      ctx.arc(tipX, tipY, rad * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function drawBirds() {
    for (let i = 0; i < game.birds.length; i++) {
      const b = game.birds[i];
      const def = b.def || BIRDS.sparrow;
      const size = cell * def.size;
      const x = b.x * cell + cell / 2,
        y = b.y * cell + cell / 2;
      const flap = Math.sin(b.flap) * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(0, size * 0.55, size * 0.42, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const face = b.vx !== 0 ? b.vx : b.dir || 1;
      if (face < 0) ctx.scale(-1, 1);
      ctx.scale(1, 1 - flap * 0.12);
      // Type glow
      if (b.type === "drill") {
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
        rg.addColorStop(0, "rgba(100,200,255,0.35)");
        rg.addColorStop(1, "rgba(100,200,255,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, 7);
        ctx.fill();
      } else if (b.type === "ptero") {
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
        rg.addColorStop(0, "rgba(180,80,40,0.3)");
        rg.addColorStop(1, "rgba(180,80,40,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.55, 0, 7);
        ctx.fill();
      }
      drawSprite(def.sprite, 0, 0, size);
      ctx.restore();
    }
  }

  function drawTransition() {
    if (!transition) return;
    const p = transition.t / transition.life;
    const dir = transition.dir;
    ctx.save();
    // Wipe veil
    ctx.globalAlpha = p < 0.5 ? p * 2 * 0.55 : (1 - p) * 2 * 0.55;
    const biome = transition.biome || biomeAt(game.screen.x, game.screen.y);
    ctx.fillStyle = biome.parallax ? biome.parallax[0] : "#1a1008";
    ctx.fillRect(0, 0, Wpx, Hpx);
    // Sliding light band
    ctx.globalAlpha = 0.35 * (1 - Math.abs(p - 0.5) * 2);
    const band = p * (dir.x !== 0 ? Wpx : Hpx);
    ctx.fillStyle = biome.accent || "#5ef38c";
    if (dir.x !== 0) {
      ctx.fillRect(dir.x > 0 ? band - 20 : Wpx - band - 20, 0, 40, Hpx);
    } else {
      ctx.fillRect(0, dir.y > 0 ? band - 20 : Hpx - band - 20, Wpx, 40);
    }
    ctx.restore();
  }

  function draw() {
    if (!game) return;
    ctx.clearRect(0, 0, Wpx, Hpx);
    const scr = getScreen(game.screen.x, game.screen.y);
    const biome = biomeAt(game.screen.x, game.screen.y);

    ctx.drawImage(getDirt(game.screen.x, game.screen.y), 0, 0);
    drawParallax(scr, biome);
    drawRiver(scr);
    drawTunnel(scr, biome);
    drawHazards(scr);
    drawItems(scr);
    drawEatFx();
    particles.draw(ctx, cell);
    drawWorm();
    drawBirds();
    drawTransition();

    if (paused) {
      ctx.fillStyle = "rgba(5,7,15,0.55)";
      ctx.fillRect(0, 0, Wpx, Hpx);
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + cell * 0.9 + "px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAUSED", Wpx / 2, Hpx / 2);
      ctx.font = cell * 0.4 + "px Trebuchet MS, sans-serif";
      ctx.globalAlpha = 0.8;
      ctx.fillText("Tap ⏯ to resume", Wpx / 2, Hpx / 2 + cell * 0.8);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- FX ----------
  const flashEl = document.getElementById("flash");
  function flash(kind) {
    flashEl.style.background = kind === "acid" ? "#7dff4a" : "";
    flashEl.style.opacity = "0.55";
    setTimeout(function () {
      flashEl.style.opacity = "0";
      flashEl.style.background = "";
    }, 120);
  }

  // ---------- Loop ----------
  let last = 0,
    raf = null,
    running = false;

  function loop(ts) {
    if (!last) last = ts;
    let dt = ts - last;
    last = ts;
    if (dt > 100) dt = 100;
    if (running) {
      step(dt);
      draw();
    }
    raf = requestAnimationFrame(loop);
  }

  // ---------- Screens ----------
  const startOv = document.getElementById("start");
  const goOv = document.getElementById("gameOver");
  const goStats = document.getElementById("goStats");
  const pauseOv = document.getElementById("pauseOv");

  function setPauseUI(on) {
    if (pauseOv) {
      if (on) pauseOv.classList.remove("hidden");
      else pauseOv.classList.add("hidden");
    }
    const btn = document.getElementById("pauseBtn");
    if (btn) btn.textContent = on ? "▶" : "⏯";
  }

  function togglePause() {
    if (!game || game.over || !running) return;
    paused = !paused;
    setPauseUI(paused);
    Audio.pauseMusic(paused);
  }

  function startGame() {
    Audio.unlock();
    Audio.start();
    Audio.startMusic();
    Audio.setMusicVolume(0.22);
    resize();
    newGame();
    startOv.classList.add("hidden");
    goOv.classList.add("hidden");
    running = true;
    paused = false;
    setPauseUI(false);
    last = 0;
    if (idleRaf) {
      cancelAnimationFrame(idleRaf);
      idleRaf = null;
    }
    if (!raf) raf = requestAnimationFrame(loop);
    toast("Swipe or use the pad · Watch for birds!", 2400);
  }

  function endGame() {
    game.over = true;
    running = false;
    Audio.gameOver();
    Audio.setMusicVolume(0.08);

    const biomeNames = Array.from(game.biomesVisited)
      .map(function (id) {
        const b = W.BIOMES.find(function (x) {
          return x.id === id;
        });
        return b ? b.name : id;
      })
      .join(" → ");

    const lines = TREASURES.filter(function (_, i) {
      return game.inv[i] > 0;
    })
      .map(function (t) {
        return (
          '<span class="loot-item">' +
          spriteImgTag(t.sprite, "loot-img") +
          " " +
          game.inv[TREASURES.indexOf(t)] +
          "</span>"
        );
      })
      .join(" ");

    goStats.innerHTML =
      '<div class="stat">Score <b>' +
      game.score +
      "</b></div>" +
      '<div class="stat">Collected <b>' +
      game.totalCollected +
      "</b> treasures across <b>" +
      game.screensVisited.size +
      "</b> tunnels</div>" +
      '<div class="stat">Deepest depth <b>' +
      game.deepest +
      "</b> · Max combo <b>×" +
      game.maxCombo +
      "</b></div>" +
      (game.secretsSolved
        ? '<div class="stat">Secrets solved <b>' + game.secretsSolved + "</b></div>"
        : "") +
      '<div class="stat biome-path">' +
      biomeNames +
      "</div>" +
      '<div class="stat loot" style="margin-top:10px">' +
      (lines || "<span class='loot-empty'>nothing this time…</span>") +
      "</div>" +
      '<div class="stat daily-note">Daily seed ' +
      game.dailyLabel +
      "</div>";
    goOv.classList.remove("hidden");
  }

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("retryBtn").addEventListener("click", function () {
    Audio.setMusicVolume(0.22);
    startGame();
  });

  const pauseBtn = document.getElementById("pauseBtn");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!running || !game || game.over) return;
      togglePause();
    });
  }
  if (pauseOv) {
    pauseOv.addEventListener("click", function () {
      if (paused) togglePause();
    });
  }

  // Fullscreen
  const fsBtn = document.getElementById("fsBtn");
  fsBtn.addEventListener("click", function () {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    }
  });
  document.addEventListener("fullscreenchange", function () {
    fsBtn.textContent = document.fullscreenElement ? "⛶ Exit" : "⛶ Fullscreen";
    setTimeout(resize, 100);
  });

  // Idle preview of start screen dirt
  let idleRaf = null;
  function idleDraw() {
    if (running) {
      idleRaf = null;
      return;
    }
    if (!game) {
      const segs = [];
      for (let i = 0; i < 6; i++) segs.push({ x: 10 - i, y: 7, px: 10 - i, py: 7 });
      game = {
        worldSalt: dailySeed().seed,
        elapsed: 0,
        moveAcc: 0,
        tick: BASE_TICK,
        worm: segs,
        dir: { x: 1, y: 0 },
        screen: { x: 0, y: 0 },
        invuln: 0,
        face: "happy",
        birds: [],
        eatFx: [],
      };
      const s0 = getScreen(0, 0);
      if (!s0.trail.length) {
        for (let i = 0; i < 6; i++) s0.trail.push({ x: 10 - i, y: 7 });
      }
    }
    game.elapsed += 16;
    draw();
    idleRaf = requestAnimationFrame(idleDraw);
  }

  // Boot
  Audio.init();
  resize();
  if (dailyEl) {
    const d = dailySeed();
    dailyEl.innerHTML = spriteImgTag(SPRITES.sprout, "hud-inline") + " " + d.label;
  }

  // Splash integration: hide start until splash done, then show tutorial overlay
  let startRevealed = false;
  function revealStart() {
    if (startRevealed) return;
    startRevealed = true;
    startOv.classList.remove("hidden");
    if (!idleRaf && !running) idleRaf = requestAnimationFrame(idleDraw);
  }

  startOv.classList.add("hidden");
  preloadSprites().then(function () {
    // Re-paint HUD icons once assets are ready
    if (dailyEl && !game) {
      const d = dailySeed();
      dailyEl.innerHTML = spriteImgTag(SPRITES.sprout, "hud-inline") + " " + d.label;
    }
  });
  window.addEventListener("arcade-splash-done", revealStart, { once: true });
  // Fallback if splash.js is missing / blocked
  setTimeout(function () {
    if (!document.getElementById("arcade-splash")) revealStart();
  }, 400);

  W.gameApi = {
    startGame: startGame,
    resize: resize,
  };
})(window.Worm = window.Worm || {});
