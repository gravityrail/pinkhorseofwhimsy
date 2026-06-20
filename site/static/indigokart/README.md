# Indigo Kart

A 3D go-karting game built with Three.js featuring realistic physics, a track with banking turns, and an immersive environment.

## Features

- 3D kart racing with realistic physics and controls
- Custom track generation with Bezier curves for smooth transitions
- Kart suspension system and wheel physics
- Dynamic camera system with smooth following
- Minimap for track visualization
- Ground with environmental details (trees, rocks)
- Custom sky with cloud effects
- Track status indicators and speed display

## How to Run

Open the `index.html` file in a modern web browser. You can use a local server for better performance:

```bash
# Using Python 3
python -m http.server

# Using Node.js with http-server
npx http-server
```

Then navigate to http://localhost:8000 (or the port shown in your terminal).

## Project Structure

```
indigokart/
├── assets/                      # Game assets
│   └── textures/                # Texture files
├── js/                          # JavaScript modules
│   ├── camera/                  # Camera control system
│   │   └── camera.js           # Camera implementation
│   ├── core/                    # Core game functionality
│   │   ├── game.js             # Main game loop and controller
│   │   └── scene.js            # Three.js scene setup
│   ├── environment/             # Environment elements
│   │   ├── environment.js      # Environment manager
│   │   ├── ground.js           # Ground plane implementation
│   │   └── sky.js              # Sky and clouds
│   ├── kart/                    # Kart-related code
│   │   ├── kart.js             # Kart implementation
│   │   └── kart-config.js      # Kart configuration
│   ├── track/                   # Track-related code
│   │   ├── track.js            # Track implementation
│   │   └── track-config.js     # Track configuration
│   ├── ui/                      # User interface elements
│   │   ├── minimap.js          # Minimap implementation
│   │   └── ui.js               # UI manager
│   ├── utils/                   # Utility functions
│   │   ├── bezier.js           # Bezier curve utilities
│   │   └── math.js             # Math helper functions
│   └── main.js                  # Main entry point
├── index.html                   # HTML entry point
└── README.md                    # Project documentation
```

## Controls

- **Arrow Up**: Accelerate
- **Arrow Down**: Brake
- **Arrow Left**: Turn left
- **Arrow Right**: Turn right

## Requirements

- A modern web browser with WebGL support