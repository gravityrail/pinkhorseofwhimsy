import Scene from './core/scene.js';
import Camera from './camera/camera.js';
import Track from './track/track.js';
import Kart from './kart/kart.js';
import Environment from './environment/environment.js';
import UI from './ui/ui.js';
import Game from './core/game.js';

// Initialize and start the game
function init() {
    // Create scene
    const scene = new Scene();
    
    // Create track first
    const track = new Track(scene);
    
    // Create environment with track reference for terrain/lighting integration
    const environment = new Environment(scene, track);
    
    // Create kart
    const kart = new Kart(scene, track);
    
    // Create camera
    const camera = new Camera(scene);
    camera.init(kart);
    
    // Create UI (pass the environment to access sky for time controls)
    const ui = new UI(track, kart, environment);
    
    // Create game controller
    const game = new Game(scene, camera, track, kart, environment, ui);
    
    // Start the game loop
    game.start();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        scene.onWindowResize();
    });
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// For debugging
window.DEBUG = {
    track: null,
    kart: null,
    camera: null
};