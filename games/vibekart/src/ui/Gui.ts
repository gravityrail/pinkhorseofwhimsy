import GUI from 'lil-gui';
import { currentConfig, DEFAULT_CONFIG } from '../core/Config';
import { Engine } from '../core/Engine';

/**
 * Setup GUI controls for the application
 */
export function setupGUI(engine: Engine): GUI {
  const gui = new GUI();
  gui.title('Vibekart Controls');
  
  // World settings folder
  const worldFolder = gui.addFolder('World');
  
  // Seed control
  worldFolder.add(currentConfig, 'seed').name('Seed').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Grid size controls (limited range for performance)
  const gridSizeFolder = worldFolder.addFolder('Grid Size');
  gridSizeFolder.add(currentConfig.world.gridSize, '0', 64, 512, 32).name('Width').onFinishChange(() => {
    engine.regenerateWorld();
  });
  gridSizeFolder.add(currentConfig.world.gridSize, '1', 64, 512, 32).name('Depth').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Terrain folder
  const terrainFolder = gui.addFolder('Terrain');
  
  // Base height
  terrainFolder.add(currentConfig.terrain, 'baseHeight', -20, 20, 1).name('Base Height').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Noise controls
  const noiseFolder = terrainFolder.addFolder('Noise');
  noiseFolder.add(currentConfig.terrain.noise, 'enabled').name('Enable Noise').onFinishChange(() => {
    engine.regenerateWorld();
  });
  noiseFolder.add(currentConfig.terrain.noise, 'scale', 10, 200, 5).name('Scale').onFinishChange(() => {
    engine.regenerateWorld();
  });
  noiseFolder.add(currentConfig.terrain.noise, 'amplitude', 0, 1.00, 0.01).name('Amplitude').onFinishChange(() => {
    engine.regenerateWorld();
  });
  noiseFolder.add(currentConfig.terrain.noise, 'octaves', 1, 8, 1).name('Octaves').onFinishChange(() => {
    engine.regenerateWorld();
  });
  noiseFolder.add(currentConfig.terrain.noise, 'persistence', 0.1, 0.9, 0.05).name('Persistence').onFinishChange(() => {
    engine.regenerateWorld();
  });
  noiseFolder.add(currentConfig.terrain.noise, 'lacunarity', 1.1, 3.0, 0.1).name('Lacunarity').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Hills folder - this is more complex as we need to handle array of hills
  const hillsFolder = terrainFolder.addFolder('Hills');
  
  // Function to update hills GUI
  function updateHillsGUI() {
    // Clear existing controllers
    while (hillsFolder.children.length > 0) {
      hillsFolder.children[0].destroy();
    }
    
    // Add button to add a new hill
    hillsFolder.add({
      addHill: () => {
        const newHill = {
          center: [
            currentConfig.world.gridSize[0] / 2,
            currentConfig.world.gridSize[1] / 2
          ] as [number, number],
          scale: [50, 50, 20] as [number, number, number],
          exponent: 2
        };
        currentConfig.terrain.hills.push(newHill);
        updateHillsGUI();
        engine.regenerateWorld();
      }
    }, 'addHill').name('Add Hill');
    
    // Add controllers for each hill
    currentConfig.terrain.hills.forEach((hill, index) => {
      const hillFolder = hillsFolder.addFolder(`Hill ${index + 1}`);
      
      // Center X, Y
      hillFolder.add(hill.center, '0', 0, currentConfig.world.gridSize[0], 1).name('Center X').onFinishChange(() => {
        engine.regenerateWorld();
      });
      hillFolder.add(hill.center, '1', 0, currentConfig.world.gridSize[1], 1).name('Center Y').onFinishChange(() => {
        engine.regenerateWorld();
      });
      
      // Scale X, Y, Z
      hillFolder.add(hill.scale, '0', 10, 200, 5).name('Scale X').onFinishChange(() => {
        engine.regenerateWorld();
      });
      hillFolder.add(hill.scale, '1', 10, 200, 5).name('Scale Y').onFinishChange(() => {
        engine.regenerateWorld();
      });
      hillFolder.add(hill.scale, '2', -50, 50, 1).name('Height').onFinishChange(() => {
        engine.regenerateWorld();
      });
      
      // Exponent
      hillFolder.add(hill, 'exponent', 1, 5, 0.1).name('Exponent').onFinishChange(() => {
        engine.regenerateWorld();
      });
      
      // Remove hill button
      hillFolder.add({
        removeHill: () => {
          currentConfig.terrain.hills.splice(index, 1);
          updateHillsGUI();
          engine.regenerateWorld();
        }
      }, 'removeHill').name('Remove');
    });
  }
  
  // Initial setup of hills GUI
  updateHillsGUI();
  
  // Track folder
  const trackFolder = gui.addFolder('Track');
  
  // Track width
  trackFolder.add(currentConfig.track, 'width', 2, 20, 0.5).name('Width').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Closed loop
  trackFolder.add(currentConfig.track, 'closedLoop').name('Closed Loop').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Control points - this would be complex to edit in GUI
  // For a real implementation, a visual editor would be better
  // This is a simplified version
  const controlPointsFolder = trackFolder.addFolder('Control Points');
  controlPointsFolder.add({
    randomize: () => {
      const numPoints = Math.floor(Math.random() * 4) + 4; // 4-8 points
      currentConfig.track.controlPoints = [];
      
      for (let i = 0; i < numPoints; i++) {
        const x = Math.random() * currentConfig.world.gridSize[0];
        const y = Math.random() * currentConfig.world.gridSize[1];
        currentConfig.track.controlPoints.push([x, y]);
      }
      
      engine.regenerateWorld();
    }
  }, 'randomize').name('Randomize Path');
  
  // Object settings
  const objectsFolder = gui.addFolder('Objects');
  
  // Initialize trees property if it doesn't exist
  if (!currentConfig.objects.trees) {
    currentConfig.objects.trees = {
      density: 1.0,
      distribution: {
        pine: 0.5,
        palm: 0.2,
        gum: 0.3
      }
    };
  }
  
  // Tree settings
  const treeFolder = objectsFolder.addFolder('Trees');
  
  // Overall tree density
  treeFolder.add(currentConfig.objects.trees, 'density', 0, 2, 0.1)
    .name('Overall Density')
    .onFinishChange(() => {
      // Update individual tree type densities based on distribution and overall density
      const treeRules = currentConfig.objects.probabilistic.filter(
        rule => ['pineTree', 'palmTree', 'gumTree'].includes(rule.objectType)
      );
      
      // Base densities
      const baseDensities = {
        pineTree: 0.005,
        palmTree: 0.002,
        gumTree: 0.003
      };
      
      // Apply density and distribution
      treeRules.forEach(rule => {
        const baseType = rule.objectType;
        // More explicit type narrowing
        const treeType = baseType.replace('Tree', '');
        // Validate that we have a proper tree type key
        if (treeType === 'pine' || treeType === 'palm' || treeType === 'gum') {
          const distFactor = currentConfig.objects.trees!.distribution[treeType];
          
          rule.density = baseDensities[baseType as keyof typeof baseDensities] * 
                        currentConfig.objects.trees!.density * 
                        (distFactor / 0.33); // Normalize to roughly original proportions
        }
      });
      
      engine.regenerateWorld();
    });
  
  // Tree distribution controls
  const distributionFolder = treeFolder.addFolder('Distribution');
  
  distributionFolder.add(currentConfig.objects.trees.distribution, 'pine', 0, 1, 0.05)
    .name('Pine Trees')
    .onChange(() => updateTreeProportions());
    
  distributionFolder.add(currentConfig.objects.trees.distribution, 'palm', 0, 1, 0.05)
    .name('Palm Trees')
    .onChange(() => updateTreeProportions());
    
  distributionFolder.add(currentConfig.objects.trees.distribution, 'gum', 0, 1, 0.05)
    .name('Gum Trees')
    .onChange(() => updateTreeProportions());
  
  // Function to update tree densities based on proportions
  function updateTreeProportions() {
    // Ensure trees object exists and has the expected properties
    if (!currentConfig.objects.trees || typeof currentConfig.objects.trees.density !== 'number') {
      return;
    }

    // Type-safe access to distribution
    const dist = currentConfig.objects.trees.distribution;
    const total = dist.pine + dist.palm + dist.gum;
    
    if (total === 0) return; // Avoid division by zero
    
    // Get tree rules - use type predicate to ensure objectType exists
    const pineRule = currentConfig.objects.probabilistic.find(r => r.objectType === 'pineTree');
    const palmRule = currentConfig.objects.probabilistic.find(r => r.objectType === 'palmTree');
    const gumRule = currentConfig.objects.probabilistic.find(r => r.objectType === 'gumTree');
    
    // Get tree density safely
    const treeDensity = currentConfig.objects.trees.density;
    
    // Update densities with proper scaling factors
    if (pineRule) pineRule.density = 0.005 * treeDensity * (dist.pine / total) * 3;
    if (palmRule) palmRule.density = 0.002 * treeDensity * (dist.palm / total) * 3;
    if (gumRule) gumRule.density = 0.003 * treeDensity * (dist.gum / total) * 3;
    
    engine.regenerateWorld();
  }
  
  // Water settings
  const waterFolder = gui.addFolder('Water');
  
  // Enable water
  waterFolder.add(currentConfig.water, 'enabled').name('Enable Water').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Water level
  waterFolder.add(currentConfig.water, 'level', -20, 20, 0.5).name('Water Level').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Atmospheric effects
  const atmosphereFolder = gui.addFolder('Atmosphere');
  
  // Time of day controls
  const timeFolder = atmosphereFolder.addFolder('Time');
  
  // Enable time system
  timeFolder.add(currentConfig.atmosphere.time, 'enabled').name('Enable Day/Night Cycle').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Create a time slider with hour display
  const timeOfDayController = timeFolder.add(currentConfig.atmosphere.time, 'startTimeOfDay', 0, 24, 0.1)
    .name('Time of Day')
    .onChange((value: number) => {
      engine.setTimeOfDay(value);
    });
  
  // Format time to readable format (HH:MM AM/PM)
  function formatTime(hour: number) {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m < 10 ? '0' + m : m} ${ampm}`;
  }
  
  // Auto progression
  timeFolder.add(currentConfig.atmosphere.time, 'autoTimeProgression').name('Auto Progression').onChange((value: boolean) => {
    engine.setAutoTimeProgression(value);
  });
  
  // Time speed
  timeFolder.add(currentConfig.atmosphere.time, 'timeSpeedMultiplier', 1, 100, 1).name('Time Speed (x)').onChange((value: number) => {
    engine.setTimeMultiplier(value);
  });
  
  // Update time display every second if time is progressing
  setInterval(() => {
    if (currentConfig.atmosphere.time.enabled && currentConfig.atmosphere.time.autoTimeProgression) {
      timeOfDayController.name(`Time: ${formatTime(engine.getTimeOfDay())}`);
    }
  }, 1000);
  
  // Sky settings
  const skyFolder = atmosphereFolder.addFolder('Sky');
  
  // Enable sky
  skyFolder.add(currentConfig.atmosphere.sky, 'enabled').name('Enable Sky').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Sun & moon intensity
  skyFolder.add(currentConfig.atmosphere.sky, 'sunIntensity', 0, 3, 0.1).name('Sun Intensity').onChange((value: number) => {
    engine.updateSkySettings(value, currentConfig.atmosphere.sky.moonIntensity, currentConfig.atmosphere.sky.starsIntensity);
  });
  
  skyFolder.add(currentConfig.atmosphere.sky, 'moonIntensity', 0, 1, 0.05).name('Moon Intensity').onChange((value: number) => {
    engine.updateSkySettings(currentConfig.atmosphere.sky.sunIntensity, value, currentConfig.atmosphere.sky.starsIntensity);
  });
  
  skyFolder.add(currentConfig.atmosphere.sky, 'starsIntensity', 0, 1, 0.05).name('Stars Intensity').onChange((value: number) => {
    engine.updateSkySettings(currentConfig.atmosphere.sky.sunIntensity, currentConfig.atmosphere.sky.moonIntensity, value);
  });
  
  // Weather settings
  const weatherFolder = atmosphereFolder.addFolder('Weather');
  
  // Weather type dropdown
  const weatherTypes = { 
    'Clear': 'clear', 
    'Cloudy': 'cloudy', 
    'Overcast': 'overcast', 
    'Fog': 'fog', 
    'Rain': 'rain', 
    'Storm': 'storm' 
  };
  
  weatherFolder.add(currentConfig.atmosphere.weather, 'type', weatherTypes).name('Weather Type').onChange((value: string) => {
    engine.updateWeather(value, currentConfig.atmosphere.weather.intensity);
  });
  
  // Weather intensity
  weatherFolder.add(currentConfig.atmosphere.weather, 'intensity', 0, 1, 0.05).name('Intensity').onChange((value: number) => {
    engine.updateWeather(currentConfig.atmosphere.weather.type, value);
  });
  
  // Cloud coverage for cloudy/overcast
  weatherFolder.add(currentConfig.atmosphere.weather, 'cloudCoverage', 0, 1, 0.05).name('Cloud Coverage').onChange(() => {
    engine.regenerateWorld();
  });
  
  // Fog settings
  weatherFolder.add(currentConfig.atmosphere.weather, 'fogDistance', 100, 2000, 50).name('Fog Distance').onChange(() => {
    engine.regenerateWorld();
  });
  
  weatherFolder.addColor(currentConfig.atmosphere.weather, 'fogColor').name('Fog Color').onChange(() => {
    engine.regenerateWorld();
  });
  
  // Rendering settings
  const renderingFolder = gui.addFolder('Rendering');
  
  // Shadows
  renderingFolder.add(currentConfig.rendering, 'shadows').name('Shadows').onFinishChange(() => {
    engine.regenerateWorld();
  });
  
  // Bloom settings
  const bloomFolder = renderingFolder.addFolder('Bloom');
  bloomFolder.add(currentConfig.rendering.bloom, 'enabled').name('Enable Bloom').onFinishChange(() => {
    engine.updateBloomPass();
  });
  bloomFolder.add(currentConfig.rendering.bloom, 'strength', 0, 3, 0.05).name('Strength').onFinishChange(() => {
    engine.updateBloomPass();
  });
  bloomFolder.add(currentConfig.rendering.bloom, 'radius', 0, 1, 0.01).name('Radius').onFinishChange(() => {
    engine.updateBloomPass();
  });
  bloomFolder.add(currentConfig.rendering.bloom, 'threshold', 0, 1, 0.01).name('Threshold').onFinishChange(() => {
    engine.updateBloomPass();
  });
  
  // Debug visualization settings
  const debugFolder = gui.addFolder('Debug');
  
  // Ensure debug object exists
  if (!currentConfig.debug) {
    currentConfig.debug = {
      showNormals: true,
      normalInterval: 10
    };
  }
  
  // Add toggle for showing surface normals
  debugFolder.add(currentConfig.debug, 'showNormals').name('Show Surface Normals').onChange((value: boolean) => {
    // Update global normal visibility
    engine.setNormalsVisibility(value);
  });
  
  // Add slider for normal grid density
  debugFolder.add(currentConfig.debug, 'normalInterval', 5, 30, 5).name('Normal Grid Spacing').onChange((value: number) => {
    // Update normal grid spacing if changed
    engine.updateNormalSpacing(value);
  });
  
  // Test Drive button
  const testDriveButton = gui.add({
    testDrive: () => {
      if (engine.getTestDriveActive()) {
        engine.stopTestDrive();
        testDriveButton.name('Test Drive');
      } else {
        engine.startTestDrive();
        testDriveButton.name('Exit Test Drive');
      }
    }
  }, 'testDrive').name('Test Drive');
  
  // Create a container for the Test Drive button at the top center, separate from GUI
  const buttonContainer = document.createElement('div');
  document.body.appendChild(buttonContainer);
  
  // Create a new button element to style and position independently of GUI
  const customButton = document.createElement('button');
  customButton.textContent = 'Test Drive';
  buttonContainer.appendChild(customButton);
  
  // Style the container
  buttonContainer.style.position = 'absolute';
  buttonContainer.style.top = '10px';
  buttonContainer.style.left = '0';
  buttonContainer.style.width = '100%';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.pointerEvents = 'none'; // Allow clicking through container
  buttonContainer.style.zIndex = '1000';
  
  // Style the button
  customButton.style.padding = '8px 16px';
  customButton.style.backgroundColor = '#2c3e50';
  customButton.style.color = 'white';
  customButton.style.border = 'none';
  customButton.style.borderRadius = '4px';
  customButton.style.cursor = 'pointer';
  customButton.style.fontFamily = 'Arial, sans-serif';
  customButton.style.fontSize = '14px';
  customButton.style.pointerEvents = 'auto'; // Make button clickable
  
  // Add click event to the custom button
  customButton.addEventListener('click', () => {
    if (engine.getTestDriveActive()) {
      engine.stopTestDrive();
      customButton.textContent = 'Test Drive';
    } else {
      engine.startTestDrive();
      customButton.textContent = 'Exit Test Drive';
    }
  });
  
  // Hide the original button from GUI
  testDriveButton.domElement.style.display = 'none';
  
  // Reset button
  gui.add({
    reset: () => {
      // Deep copy the default config using a safer approach
      // Create a complete new copy of the default config
      const newConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      
      // Assign the new config to the current config
      Object.assign(currentConfig, newConfig);
      
      // Refresh GUI
      gui.controllers.forEach(controller => {
        controller.updateDisplay();
      });
      
      // Refresh world
      engine.regenerateWorld();
      engine.updateBloomPass();
    }
  }, 'reset').name('Reset All');
  
  return gui;
}
