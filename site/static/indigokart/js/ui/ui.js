import Minimap from './minimap.js';
import { CONFIG } from '../core/game.js';

class UI {
    constructor(track, kart, environment) {
        this.track = track;
        this.kart = kart;
        this.environment = environment;
        
        // Time controls state
        this.timePaused = false;
        
        // Create minimap
        this.minimap = new Minimap(track);
        
        // Get basic UI elements
        this.trackStatusElement = document.getElementById('trackStatus');
        this.speedStatusElement = document.getElementById('speedStatus');
        this.throttleBar = document.getElementById('throttleBar');
        this.brakeBar = document.getElementById('brakeBar');
        this.suspensionDisplays = {
            flSusp: document.getElementById('flSusp'),
            frSusp: document.getElementById('frSusp'),
            rlSusp: document.getElementById('rlSusp'),
            rrSusp: document.getElementById('rrSusp')
        };
        
        // Get terrain slope indicator elements
        this.slopeLabel = document.getElementById('slopeLabel');
        this.slopeMarker = document.getElementById('slopeMarker');
        
        // Get time control UI elements
        this.clockDisplay = document.getElementById('clockDisplay');
        this.pauseTimeButton = document.getElementById('pauseTimeButton');
        this.timePresets = {
            1: document.getElementById('timePreset1'), // Morning: 0.25
            2: document.getElementById('timePreset2'), // Noon: 0.4
            3: document.getElementById('timePreset3'), // Dusk: 0.5
            4: document.getElementById('timePreset4'), // Twilight: 0.6
            5: document.getElementById('timePreset5')  // Night: 0.75
        };
        
        // Get headlight controls
        this.headlightStatus = document.getElementById('headlightStatus');
        this.headlightToggleButton = document.getElementById('headlightToggleButton');
        
        // Set up time control event listeners
        this.setupTimeControls();
        
        // Set up headlight control
        this.setupHeadlightControls();
        
        // Initial UI update
        this.updateHeadlightIndicator();
    }
    
    setupTimeControls() {
        // Pause/resume time
        this.pauseTimeButton.addEventListener('click', () => {
            this.timePaused = !this.timePaused;
            
            if (this.environment && this.environment.sky) {
                this.environment.sky.dayNightCycle = !this.timePaused;
                this.pauseTimeButton.textContent = this.timePaused ? "▶️ Resume Time" : "⏸️ Pause Time";
                this.pauseTimeButton.classList.toggle('active', this.timePaused);
            }
        });
        
        // Time presets
        const timePresetValues = {
            1: 0.25, // Morning
            2: 0.4,  // Noon
            3: 0.5,  // Dusk
            4: 0.6,  // Twilight
            5: 0.75  // Night
        };
        
        // Add event listeners for preset buttons
        for (const [key, element] of Object.entries(this.timePresets)) {
            element.addEventListener('click', () => {
                if (this.environment && this.environment.sky) {
                    // Pause time when selecting a preset
                    this.timePaused = true;
                    this.environment.sky.dayNightCycle = false;
                    this.pauseTimeButton.textContent = "▶️ Resume Time";
                    this.pauseTimeButton.classList.add('active');
                    
                    // Set to preset time
                    this.environment.sky.setTimeOfDay(timePresetValues[key]);
                    
                    // Highlight active preset
                    this.highlightActivePreset(key);
                }
            });
        }
    }
    
    highlightActivePreset(activeKey) {
        // Remove active class from all buttons
        for (const element of Object.values(this.timePresets)) {
            element.classList.remove('active');
        }
        
        // Add active class to selected button
        if (this.timePresets[activeKey]) {
            this.timePresets[activeKey].classList.add('active');
        }
    }
    
    updateTimeOfDayUI() {
        if (!this.environment || !this.environment.sky) return;
        
        const timeOfDay = this.environment.sky.timeOfDay;
        
        // Update clock display
        const hours = Math.floor((timeOfDay * 24) % 24);
        const minutes = Math.floor((timeOfDay * 24 * 60) % 60);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        this.clockDisplay.textContent = `${displayHours}:${displayMinutes} ${ampm}`;
        
        // Update which preset button is active based on time
        if (this.timePaused) {
            // Find closest preset
            let closestPreset = null;
            let closestDistance = Infinity;
            
            const presetValues = {
                1: 0.25, // Morning
                2: 0.4,  // Noon
                3: 0.5,  // Dusk
                4: 0.6,  // Twilight
                5: 0.75  // Night
            };
            
            for (const [key, value] of Object.entries(presetValues)) {
                const distance = Math.abs(timeOfDay - value);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPreset = key;
                }
            }
            
            // Only highlight if very close to a preset (within 0.01)
            if (closestDistance < 0.01) {
                this.highlightActivePreset(closestPreset);
            } else {
                this.highlightActivePreset(null); // Deselect all
            }
        }
    }
    
    setupHeadlightControls() {
        // Add click event listener to headlight toggle button
        this.headlightToggleButton.addEventListener('click', () => {
            // Set kart to manual headlight control
            this.kart.manualHeadlightControl = true;
            
            // Toggle headlights
            const isOn = this.kart.toggleHeadlights();
            
            // Update button appearance
            this.headlightToggleButton.classList.toggle('active', isOn);
            
            console.log("Headlight button clicked, new state:", isOn);
        });
    }
    
    updateHeadlightIndicator() {
        const headlightsOn = this.kart.headlightsOn;
        
        // Update text indicator
        this.headlightStatus.textContent = headlightsOn ? "ON" : "OFF";
        this.headlightStatus.className = headlightsOn ? "indicator-on" : "indicator-off";
        
        // Update button state
        if (this.headlightToggleButton) {
            this.headlightToggleButton.classList.toggle('active', headlightsOn);
        }
    }
    
    updateSlopeIndicator() {
        // Skip if elements not found
        if (!this.slopeLabel || !this.slopeMarker) return;
        
        // Get current slope from kart (if available)
        // Make sure we're accessing the correct property through terrain physics
        const slope = this.kart && this.kart.terrainPhysics ? 
                      this.kart.terrainPhysics.getCurrentSlope() : 0;
        
        // Update slope description label
        let slopeText = "Flat";
        let slopeColor = "white";
        
        // Use tighter thresholds to show slope changes more readily
        if (slope > 0.03) {
            slopeText = "Downhill";
            slopeColor = "#90ff90"; // Light green
        } else if (slope > 0.01) {
            slopeText = "Slight Downhill";
            slopeColor = "#c0ffc0"; // Very light green
        } else if (slope < -0.03) {
            slopeText = "Uphill";
            slopeColor = "#ff9090"; // Light red
        } else if (slope < -0.01) {
            slopeText = "Slight Uphill";
            slopeColor = "#ffc0c0"; // Very light red
        }
        
        this.slopeLabel.textContent = slopeText;
        this.slopeLabel.style.color = slopeColor;
        
        // Update slope marker position
        // Convert slope to bar position (40px = center, +40px = max downhill, -40px = max uphill)
        const maxSlope = 0.15; // Maximum slope to display
        const barPosition = 40 + (slope / maxSlope) * 40;
        const clampedPosition = Math.max(0, Math.min(80, barPosition));
        
        // Update marker position
        this.slopeMarker.style.left = `${clampedPosition}px`;
    }
    
    update() {
        // Check for time control key presses (p for pause, number keys for presets)
        if (CONFIG.keys.p && !this.pKeyPressed) {
            this.pKeyPressed = true;
            this.pauseTimeButton.click(); // Simulate button click
        } else if (!CONFIG.keys.p && this.pKeyPressed) {
            this.pKeyPressed = false;
        }
        
        // Number keys for time presets
        for (let i = 1; i <= 5; i++) {
            if (CONFIG.keys[i] && !this[`key${i}Pressed`]) {
                this[`key${i}Pressed`] = true;
                if (this.timePresets[i]) {
                    this.timePresets[i].click(); // Simulate button click
                }
            } else if (!CONFIG.keys[i] && this[`key${i}Pressed`]) {
                this[`key${i}Pressed`] = false;
            }
        }
        
        // Update time display
        this.updateTimeOfDayUI();
        
        // Update headlight indicator
        this.updateHeadlightIndicator();
        
        // Update terrain slope indicator
        this.updateSlopeIndicator();
    }
    
    render() {
        // Render the minimap with current kart position and rotation
        this.minimap.render(this.kart.getPosition(), this.kart.getRotation().y);
    }
}

export default UI;