/**
 * Handles input for kart controls
 */
class InputHandler {
    constructor() {
        this.keys = {};
        this.lKeyPressed = false;
        this.sKeyPressed = false;
        this.rKeyPressed = false;
    }
    
    /**
     * Process input for a frame
     * @param {object} keys - Object with state of keys
     * @param {number} deltaTime - Time since last frame
     * @returns {object} - Processed input values
     */
    handleInput(keys, deltaTime) {
        this.keys = keys;
        const input = {
            acceleration: 0,
            braking: 0,
            steering: 0,
            toggleHeadlights: false,
            resetKart: false,
            toggleSlopeVisualization: false
        };
        
        // Process acceleration/braking
        if (keys.ArrowUp) {
            input.acceleration = 1;
        }
        
        if (keys.ArrowDown) {
            input.braking = 1;
        }
        
        // Process steering
        if (keys.ArrowLeft) {
            input.steering = -1;
        } else if (keys.ArrowRight) {
            input.steering = 1;
        }
        
        // Handle headlight toggle with 'L' key (one-time press)
        if (keys.l && !this.lKeyPressed) {
            this.lKeyPressed = true;
            input.toggleHeadlights = true;
        } else if (!keys.l && this.lKeyPressed) {
            this.lKeyPressed = false;
        }
        
        // Toggle slope debug visualization with 'S' key (one-time press)
        if (keys.s && !this.sKeyPressed) {
            this.sKeyPressed = true;
            input.toggleSlopeVisualization = true;
        } else if (!keys.s && this.sKeyPressed) {
            this.sKeyPressed = false;
        }
        
        // Handle reset with 'R' key
        if (keys.r && !this.rKeyPressed) {
            this.rKeyPressed = true;
            input.resetKart = true;
        } else if (!keys.r && this.rKeyPressed) {
            this.rKeyPressed = false;
        }
        
        return input;
    }
}

export default InputHandler;