// Game constants and configurations
export const CONFIG = {
    // Game variables
    worldSize: 400,
    
    // Track roughness variables
    roughnessHeight: 0.15, // Maximum height of bumps
    roughnessFrequency: 0.8, // How frequently bumps occur
    
    // Game state
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        r: false,  // 'r' key for manual reset
        l: false,  // 'l' key for toggling headlights
        p: false,  // 'p' key for pausing time
        1: false,  // Number keys for time of day presets
        2: false,
        3: false,
        4: false,
        5: false
    },
    
    // Audio
    engineSound: null
};

class Game {
    constructor(scene, camera, track, kart, environment, ui) {
        this.scene = scene;
        this.camera = camera;
        this.track = track;
        this.kart = kart;
        this.environment = environment;
        this.ui = ui;
        
        this.lastTime = 0;
        this.running = false;
        
        // Initialize input handlers
        this.setupInputHandlers();
        
        // Initialize audio
        this.setupAudio();
    }
    
    setupInputHandlers() {
        // Keyboard event handlers
        window.addEventListener('keydown', (event) => {
            if (CONFIG.keys.hasOwnProperty(event.key)) {
                CONFIG.keys[event.key] = true;
            }
        });
        
        window.addEventListener('keyup', (event) => {
            if (CONFIG.keys.hasOwnProperty(event.key)) {
                CONFIG.keys[event.key] = false;
            }
        });
    }
    
    setupAudio() {
        // Initialize engine sound
        CONFIG.engineSound = document.getElementById('engineSound');
        CONFIG.engineSound.volume = 0;
        
        // Start engine sound on first user interaction
        const startAudio = () => {
            if (CONFIG.engineSound) {
                CONFIG.engineSound.play();
                CONFIG.engineSound.volume = 0.1;
                document.removeEventListener('click', startAudio);
                document.removeEventListener('keydown', startAudio);
            }
        };
        
        document.addEventListener('click', startAudio);
        document.addEventListener('keydown', startAudio);
    }
    
    start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameLoop(currentTime) {
        if (!this.running) return;
        
        // Calculate delta time in seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update game state
        this.update(deltaTime);
        
        // Render the scene
        this.render();
        
        // Schedule next frame
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update environment effects first - pass camera for lens flare positioning
        this.environment.update(deltaTime, this.camera.camera);
        
        // Update kart physics and position - pass environment for headlights
        this.kart.update(deltaTime, CONFIG.keys, this.environment);
        
        // Update camera
        this.camera.update(deltaTime);
        
        // Update UI
        this.ui.update();
    }
    
    render() {
        // Render the main scene
        this.scene.render();
        
        // Render UI elements
        this.ui.render();
    }
}

export default Game;