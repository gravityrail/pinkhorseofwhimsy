/*! Worm — biomes, treasures, bird variants */
(function (W) {
  "use strict";

  // Base treasures (always available) + rare biome-flavored finds
  // sprite paths are relative to the game root (…/worm/)
  const TREASURES = [
    { key: "metal", sprite: "assets/treasures/metal.png", name: "Scrap Metal", pts: 10 },
    { key: "fruit", sprite: "assets/treasures/fruit.png", name: "Fruit", pts: 12 },
    { key: "veg", sprite: "assets/treasures/veg.png", name: "Vegetables", pts: 10 },
    { key: "gem", sprite: "assets/treasures/gem.png", name: "Gems", pts: 25 },
    { key: "bone", sprite: "assets/treasures/bone.png", name: "Dino Bones", pts: 18 },
    { key: "teddy", sprite: "assets/treasures/teddy.png", name: "Teddy Bears", pts: 15 },
    { key: "phone", sprite: "assets/treasures/phone.png", name: "Mobile Phones", pts: 14 },
    { key: "bug", sprite: "assets/treasures/bug.png", name: "Bugs", pts: 8 },
    // New whimsical finds
    { key: "diamond", sprite: "assets/treasures/diamond.png", name: "Diamonds", pts: 40, rare: true },
    { key: "fossil", sprite: "assets/treasures/fossil.png", name: "Fossils", pts: 30, rare: true },
    { key: "gapple", sprite: "assets/treasures/gapple.png", name: "Golden Apples", pts: 50, rare: true },
    { key: "helm", sprite: "assets/treasures/helm.png", name: "Tiny Helmets", pts: 35, rare: true },
    { key: "radio", sprite: "assets/treasures/radio.png", name: "Radioactive Snacks", pts: 45, rare: true },
  ];

  const BIOMES = [
    {
      id: "dirt",
      name: "Soft Dirt",
      minDepth: 0,
      hue: 24,
      sat: 38,
      lightTop: 26,
      lightBot: 14,
      accent: "#8b5a2b",
      fog: "rgba(40,24,10,0.35)",
      parallax: ["#3a2414", "#2a1a0e", "#1a1008"],
      particle: "rgba(180,120,60,0.7)",
      pool: [0, 1, 2, 3, 4, 5, 6, 7],
      rarePool: [8, 9],
      hazards: { mole: 0.15, acid: 0, dragon: 0, river: 0.08 },
      birdBias: ["sparrow", "sparrow", "owl"],
    },
    {
      id: "clay",
      name: "Clay Beds",
      minDepth: 3,
      hue: 12,
      sat: 48,
      lightTop: 28,
      lightBot: 12,
      accent: "#c45c26",
      fog: "rgba(60,20,8,0.4)",
      parallax: ["#4a2010", "#351608", "#200e04"],
      particle: "rgba(220,100,50,0.65)",
      pool: [0, 1, 2, 4, 5, 7, 9],
      rarePool: [9, 11],
      hazards: { mole: 0.28, acid: 0.12, dragon: 0, river: 0.12 },
      birdBias: ["sparrow", "owl", "owl"],
    },
    {
      id: "crystal",
      name: "Crystal Caves",
      minDepth: 6,
      hue: 270,
      sat: 42,
      lightTop: 22,
      lightBot: 10,
      accent: "#b388ff",
      fog: "rgba(40,10,60,0.45)",
      parallax: ["#2a1840", "#1a0e30", "#0e081c"],
      particle: "rgba(200,160,255,0.75)",
      pool: [3, 3, 6, 7, 8, 5, 1],
      rarePool: [8, 10, 11],
      hazards: { mole: 0.1, acid: 0, dragon: 0.08, river: 0.05 },
      birdBias: ["owl", "sparrow", "ptero"],
      sparkle: true,
    },
    {
      id: "magma",
      name: "Magma Tunnels",
      minDepth: 10,
      hue: 8,
      sat: 70,
      lightTop: 24,
      lightBot: 8,
      accent: "#ff6a3d",
      fog: "rgba(80,10,0,0.5)",
      parallax: ["#401008", "#2a0804", "#140402"],
      particle: "rgba(255,120,40,0.8)",
      pool: [0, 2, 4, 7, 12, 3],
      rarePool: [12, 10, 8],
      hazards: { mole: 0.18, acid: 0.35, dragon: 0.14, river: 0 },
      birdBias: ["ptero", "drill", "owl"],
      glow: true,
    },
    {
      id: "moon",
      name: "Moon Soil",
      minDepth: 15,
      hue: 210,
      sat: 12,
      lightTop: 30,
      lightBot: 12,
      accent: "#c0d0e8",
      fog: "rgba(20,30,50,0.5)",
      parallax: ["#1a2238", "#101828", "#080e18"],
      particle: "rgba(200,220,255,0.7)",
      pool: [3, 6, 8, 11, 5, 0],
      rarePool: [8, 10, 11, 12],
      hazards: { mole: 0.08, acid: 0.05, dragon: 0.2, river: 0.18 },
      birdBias: ["drill", "ptero", "drill"],
      sparkle: true,
      lowG: true,
    },
  ];

  const BIRDS = {
    sparrow: {
      id: "sparrow",
      sprite: "assets/birds/sparrow.png",
      name: "Sparrow",
      size: 4.0,
      speed: [0.28, 0.48],
      hitR: 1.55,
      score: 0,
    },
    owl: {
      id: "owl",
      sprite: "assets/birds/owl.png",
      name: "Cave Owl",
      size: 4.6,
      speed: [0.18, 0.32],
      hitR: 1.85,
      score: 0,
      silent: true,
    },
    ptero: {
      id: "ptero",
      sprite: "assets/birds/ptero.png",
      name: "Pterodactyl",
      size: 5.2,
      speed: [0.4, 0.62],
      hitR: 1.7,
      score: 0,
      diagonal: true,
    },
    drill: {
      id: "drill",
      sprite: "assets/birds/drill.png",
      name: "Drill-Bird",
      size: 4.4,
      speed: [0.22, 0.38],
      hitR: 1.65,
      score: 0,
      chase: true,
    },
  };

  // Shared hazard / UI sprites (paths relative to game root)
  const SPRITES = {
    mole: "assets/hazards/mole.png",
    dragon: "assets/hazards/dragon.png",
    heart: "assets/ui/heart.png",
    heartEmpty: "assets/ui/heart-empty.png",
    sprout: "assets/ui/sprout.png",
    star: "assets/ui/star.png",
    wormHead: "assets/ui/worm-head.png",
  };

  function depthOf(sx, sy) {
    return Math.max(Math.abs(sx), Math.abs(sy));
  }

  function biomeAt(sx, sy) {
    const d = depthOf(sx, sy);
    let b = BIOMES[0];
    for (let i = 0; i < BIOMES.length; i++) {
      if (d >= BIOMES[i].minDepth) b = BIOMES[i];
    }
    return b;
  }

  function dailySeed() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const str = y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return { seed: h >>> 0, label: str };
  }

  W.TREASURES = TREASURES;
  W.BIOMES = BIOMES;
  W.BIRDS = BIRDS;
  W.SPRITES = SPRITES;
  W.depthOf = depthOf;
  W.biomeAt = biomeAt;
  W.dailySeed = dailySeed;
})(window.Worm = window.Worm || {});
