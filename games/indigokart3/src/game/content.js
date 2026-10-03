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
      "power": 25874.999999999996,
      "maxSpeed": 53,
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
      "power": 33350,
      "maxSpeed": 55,
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
      "power": 27024.999999999996,
      "maxSpeed": 53,
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
      "power": 39100,
      "maxSpeed": 55,
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
    "id": "pacific-grand-tour",
    "name": "Pacific Grand Tour",
    "description": "A huge ocean straight, sweeping headlands and a climb through the palms.",
    "seed": 14731,
    "width": 26,
    "laps": 2,
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
      "roughness": 0.8
    },
    "boosts": [
      0.06,
      0.22,
      0.42,
      0.62,
      0.82,
      0.94
    ],
    "powerups": [
      0.12,
      0.32,
      0.53,
      0.74,
      0.9
    ],
    "points": [
      [
        -180,
        10,
        200
      ],
      [
        140,
        12,
        200
      ],
      [
        360,
        18,
        170
      ],
      [
        490,
        32,
        30
      ],
      [
        470,
        46,
        -150
      ],
      [
        320,
        54,
        -260
      ],
      [
        60,
        35,
        -280
      ],
      [
        -220,
        16,
        -280
      ],
      [
        -450,
        8,
        -210
      ],
      [
        -550,
        5,
        -30
      ],
      [
        -460,
        8,
        200
      ]
    ],
    "zones": [],
    "badge": "01 / GOLDEN HOUR",
    "kit": "coast",
    "weather": "coastal",
    "music": "coast",
    "sectors": [
      [
        "Ocean straight",
        0
      ],
      [
        "Headland climb",
        0.3
      ],
      [
        "Lighthouse sweeper",
        0.5
      ],
      [
        "Palm valley",
        0.76
      ]
    ],
    "barrierScale": 0.87
  },
  {
    "id": "harbor-express",
    "name": "Harbor Express",
    "description": "Wide city boulevards, an elevated harbor run and sweeping bends in the rain.",
    "seed": 98217,
    "width": 28,
    "laps": 2,
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
      "roughness": 0.8
    },
    "boosts": [
      0.06,
      0.22,
      0.42,
      0.62,
      0.82,
      0.94
    ],
    "powerups": [
      0.12,
      0.32,
      0.53,
      0.74,
      0.9
    ],
    "points": [
      [
        -100,
        4,
        260
      ],
      [
        240,
        6,
        260
      ],
      [
        480,
        12,
        170
      ],
      [
        540,
        20,
        -50
      ],
      [
        440,
        27,
        -250
      ],
      [
        180,
        27,
        -290
      ],
      [
        -120,
        18,
        -290
      ],
      [
        -450,
        6,
        -230
      ],
      [
        -560,
        4,
        -30
      ],
      [
        -460,
        4,
        260
      ]
    ],
    "zones": [],
    "badge": "02 / AFTER DARK",
    "kit": "neon",
    "weather": "rain",
    "music": "harbor",
    "sectors": [
      [
        "Festival boulevard",
        0
      ],
      [
        "Harbor climb",
        0.3
      ],
      [
        "Skyway",
        0.5
      ],
      [
        "Home straight",
        0.78
      ]
    ],
    "barrierScale": 0.87
  },
  {
    "id": "red-rock-speedway",
    "name": "Red Rock Speedway",
    "description": "Fast red-dirt straights, rolling ridges and a vast open canyon with room to slide.",
    "badge": "03 / WILD COUNTRY",
    "seed": 61616,
    "width": 30,
    "laps": 2,
    "time": "day",
    "music": "rally",
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
      "roughness": 0.8
    },
    "boosts": [
      0.06,
      0.22,
      0.42,
      0.62,
      0.82,
      0.94
    ],
    "powerups": [
      0.12,
      0.32,
      0.53,
      0.74,
      0.9
    ],
    "points": [
      [
        -230,
        14,
        270
      ],
      [
        100,
        22,
        280
      ],
      [
        420,
        30,
        240
      ],
      [
        640,
        42,
        80
      ],
      [
        620,
        52,
        -150
      ],
      [
        380,
        32,
        -330
      ],
      [
        30,
        12,
        -370
      ],
      [
        -320,
        18,
        -310
      ],
      [
        -570,
        29,
        -180
      ],
      [
        -660,
        18,
        30
      ],
      [
        -550,
        10,
        240
      ]
    ],
    "zones": [],
    "kit": "desert",
    "road": {
      "style": "dirt"
    },
    "weather": "dust",
    "sectors": [
      [
        "Outback flat-out",
        0
      ],
      [
        "Ridge run",
        0.27
      ],
      [
        "Canyon descent",
        0.52
      ],
      [
        "Red-rock sweep",
        0.78
      ]
    ],
    "barrierScale": 0.87
  }
];

export const DIFFICULTIES = {
  "easy": {
    "label": "Easy",
    "pace": 0.78,
    "error": 0.04,
    "aggression": 0.25,
    "assist": 0.42,
    "description": "Gentle rivals. Helpful steering. Plenty of room to learn."
  },
  "normal": {
    "label": "Medium",
    "pace": 0.91,
    "error": 0.025,
    "aggression": 0.48,
    "assist": 0.24,
    "description": "A close race. Earn your wins with clean lines and clever items."
  },
  "hard": {
    "label": "Hard",
    "pace": 1,
    "error": 0.012,
    "aggression": 0.7,
    "assist": 0.12,
    "description": "Fast rivals. Light steering help. Bring your best lap."
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
