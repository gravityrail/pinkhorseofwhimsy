// Three launch circuits and four original driver builds. Stats: 1–10; physics: SI units.
export const CARS = [
  {
    "id": "indigo",
    "driver": "Indigo",
    "name": "Toyota Trail Truck",
    "kind": "truck",
    "tagline": "A little dirt never hurt.",
    "bio": "The trailblazer",
    "color": 5024613,
    "accent": 16050361,
    "stats": {
      "acceleration": 7,
      "handling": 7,
      "weight": 7,
      "topSpeed": 7
    },
    "physics": {
      "mass": 1650,
      "power": 22500,
      "maxSpeed": 44,
      "grip": 7.2,
      "offroadGrip": 0.8,
      "offroadDrag": 0.62,
      "spring": 34,
      "damping": 7,
      "sound": "combustion"
    }
  },
  {
    "id": "dan",
    "driver": "Dan",
    "name": "Blue Tesla",
    "kind": "sedan",
    "tagline": "Tall Aussie. Instant torque.",
    "bio": "The lightning bolt · Australia",
    "color": 3246311,
    "accent": 13101567,
    "stats": {
      "acceleration": 10,
      "handling": 7,
      "weight": 6,
      "topSpeed": 9
    },
    "physics": {
      "mass": 1900,
      "power": 29000,
      "maxSpeed": 46,
      "grip": 7.6,
      "offroadGrip": 0.48,
      "offroadDrag": 1.35,
      "spring": 55,
      "damping": 11,
      "sound": "electric"
    }
  },
  {
    "id": "lola",
    "driver": "Lola",
    "name": "Pink Tesla",
    "kind": "sedan",
    "tagline": "Find your line. Make it pink.",
    "bio": "The corner queen",
    "color": 15952819,
    "accent": 16770802,
    "stats": {
      "acceleration": 8,
      "handling": 10,
      "weight": 4,
      "topSpeed": 7
    },
    "physics": {
      "mass": 1550,
      "power": 23500,
      "maxSpeed": 44,
      "grip": 10,
      "offroadGrip": 0.5,
      "offroadDrag": 1.2,
      "spring": 48,
      "damping": 10,
      "sound": "electric"
    }
  },
  {
    "id": "asa",
    "driver": "Asa",
    "name": "Neon Cyber Tank",
    "kind": "tank",
    "tagline": "Heavy metal. Electric soul.",
    "bio": "The unstoppable force",
    "color": 6847371,
    "accent": 7602111,
    "stats": {
      "acceleration": 5,
      "handling": 5,
      "weight": 10,
      "topSpeed": 8
    },
    "physics": {
      "mass": 3100,
      "power": 34000,
      "maxSpeed": 46,
      "grip": 6.5,
      "offroadGrip": 0.9,
      "offroadDrag": 0.45,
      "spring": 68,
      "damping": 14,
      "sound": "turbine"
    }
  }
];

export const TRACKS = [
  {
    "id": "sunset-cove",
    "name": "Sunset Coast",
    "description": "Salt in the air. Gold on the asphalt.",
    "seed": 14731,
    "width": 15,
    "laps": 3,
    "time": "sunset",
    "palette": {
      "sky": 9881032,
      "fog": 15319963,
      "ground": 12625273,
      "road": 3818824,
      "shoulder": 16110202,
      "stripeA": 16777215,
      "stripeB": 15289183,
      "water": 1349816
    },
    "terrain": {
      "kind": "island",
      "foliage": "palms",
      "roughness": 0.65
    },
    "boosts": [
      0.12,
      0.39,
      0.68,
      0.88
    ],
    "powerups": [
      0.26,
      0.56,
      0.81
    ],
    "points": [
      [
        0,
        2,
        78
      ],
      [
        54,
        3,
        70
      ],
      [
        98,
        5,
        38
      ],
      [
        108,
        9,
        -12
      ],
      [
        86,
        17,
        -61
      ],
      [
        38,
        23,
        -82
      ],
      [
        -10,
        20,
        -70
      ],
      [
        -40,
        12,
        -45
      ],
      [
        -74,
        5,
        -52
      ],
      [
        -104,
        3,
        -25
      ],
      [
        -105,
        2,
        28
      ],
      [
        -76,
        2,
        63
      ],
      [
        -34,
        2,
        75
      ]
    ],
    "zones": [],
    "badge": "01 / GOLDEN HOUR",
    "kit": "coast"
  },
  {
    "id": "moonlight-metro",
    "name": "Neon Harbor",
    "description": "Electric streets. Midnight mischief.",
    "seed": 98217,
    "width": 13,
    "laps": 3,
    "time": "night",
    "palette": {
      "sky": 1052459,
      "fog": 1512756,
      "ground": 2367545,
      "road": 2697784,
      "shoulder": 1513506,
      "stripeA": 6154239,
      "stripeB": 16732120,
      "water": 1120562
    },
    "terrain": {
      "kind": "city",
      "foliage": "cypress",
      "roughness": 0.25
    },
    "boosts": [
      0.09,
      0.31,
      0.55,
      0.79
    ],
    "powerups": [
      0.2,
      0.46,
      0.72,
      0.91
    ],
    "points": [
      [
        0,
        1,
        82
      ],
      [
        48,
        1,
        79
      ],
      [
        86,
        3,
        57
      ],
      [
        94,
        8,
        18
      ],
      [
        75,
        11,
        -15
      ],
      [
        92,
        7,
        -51
      ],
      [
        61,
        3,
        -83
      ],
      [
        17,
        2,
        -72
      ],
      [
        -11,
        5,
        -92
      ],
      [
        -51,
        7,
        -79
      ],
      [
        -75,
        4,
        -50
      ],
      [
        -93,
        2,
        -10
      ],
      [
        -84,
        1,
        35
      ],
      [
        -55,
        1,
        61
      ],
      [
        -20,
        1,
        57
      ]
    ],
    "zones": [],
    "badge": "02 / AFTER DARK",
    "kit": "neon"
  },
  {
    "id": "outback-run",
    "name": "Red Rock Rally",
    "description": "Big skies. Red dirt. Full throttle.",
    "badge": "03 / WILD COUNTRY",
    "seed": 61616,
    "width": 15,
    "laps": 3,
    "time": "day",
    "music": "outback",
    "palette": {
      "sky": 10474736,
      "fog": 15255976,
      "ground": 12873791,
      "road": 11103814,
      "shoulder": 11558451,
      "stripeA": 16777215,
      "stripeB": 15906106,
      "water": 3832466,
      "dust": 12610106
    },
    "terrain": {
      "kind": "plain",
      "foliage": "gums",
      "roughness": 0.2
    },
    "boosts": [
      0.08,
      0.3,
      0.52,
      0.74,
      0.92
    ],
    "powerups": [
      0.18,
      0.42,
      0.64,
      0.88
    ],
    "points": [
      [
        -140,
        1,
        40
      ],
      [
        -60,
        1,
        55
      ],
      [
        40,
        1.5,
        58
      ],
      [
        130,
        2,
        42
      ],
      [
        146,
        1,
        -4
      ],
      [
        122,
        1,
        -44
      ],
      [
        20,
        1.5,
        -58
      ],
      [
        -90,
        1,
        -52
      ],
      [
        -143,
        1,
        -12
      ]
    ],
    "zones": [],
    "kit": "desert",
    "road": {
      "style": "dirt"
    }
  }
];

export const DIFFICULTIES = {
  "easy": {
    "label": "Easy Cruise",
    "pace": 0.82,
    "error": 0.18,
    "aggression": 0.25,
    "assist": 0.42
  },
  "normal": {
    "label": "Arcade",
    "pace": 0.94,
    "error": 0.1,
    "aggression": 0.48,
    "assist": 0.3
  },
  "hard": {
    "label": "Grand Prix",
    "pace": 1.05,
    "error": 0.04,
    "aggression": 0.7,
    "assist": 0.2
  }
};

export const POINTS = [
  12,
  9,
  7,
  5,
  3,
  2,
  1
];
