import * as THREE from 'three';
import { CONFIG } from '../core/game.js';

class Ground {
    // Static shared textures to avoid texture limit issues
    static groundDiffuseTexture = null;
    static groundNormalTexture = null;
    static groundRoughnessTexture = null;
    
    constructor(scene) {
        this.scene = scene;
        
        // Define terrain features (hills, valleys)
        this.terrainFeatures = [
            // Major Hills - { type, x, z, height, radius }
            { type: 'hill', x: -120, z: 120, height: 18, radius: 65 },  // Increased height
            { type: 'hill', x: 150, z: -100, height: 25, radius: 80 },  // Increased height
            { type: 'hill', x: -200, z: -150, height: 22, radius: 75 }, // Increased height
            { type: 'hill', x: 180, z: 180, height: 28, radius: 90 },   // Increased height
            { type: 'hill', x: -80, z: -220, height: 20, radius: 70 },  // Increased height
            
            // Ridge hills - creating connected topography
            { type: 'hill', x: -160, z: 80, height: 15, radius: 60 },   // Connect to first hill
            { type: 'hill', x: 100, z: -140, height: 20, radius: 65 },  // Connect to second hill
            { type: 'hill', x: -230, z: -100, height: 17, radius: 45 }, // Connect to third hill
            
            // Smaller hills for undulation
            { type: 'hill', x: 60, z: 110, height: 12, radius: 40 },    // Increased height
            { type: 'hill', x: -140, z: 30, height: 10, radius: 35 },   // Increased height
            { type: 'hill', x: 90, z: -180, height: 14, radius: 45 },   // Increased height
            { type: 'hill', x: 10, z: -130, height: 8, radius: 30 },    // New hill
            { type: 'hill', x: -70, z: 90, height: 11, radius: 38 },    // New hill
            
            // More small bumps for terrain variation
            { type: 'hill', x: -30, z: -120, height: 5, radius: 25 },
            { type: 'hill', x: 100, z: 80, height: 7, radius: 30 },
            { type: 'hill', x: -110, z: -50, height: 6, radius: 28 },
            { type: 'hill', x: 50, z: -60, height: 5, radius: 22 },
            { type: 'hill', x: -60, z: 140, height: 9, radius: 32 },
            
            // Valleys/depressions - negative height (deeper and wider)
            { type: 'valley', x: -40, z: 180, height: -8, radius: 60 },  // Deeper
            { type: 'valley', x: 120, z: 40, height: -9, radius: 65 },   // Deeper
            { type: 'valley', x: -180, z: -60, height: -12, radius: 70 }, // Deeper
            { type: 'valley', x: 30, z: -200, height: -7, radius: 50 },  // New valley
            { type: 'valley', x: -100, z: 200, height: -10, radius: 55 }  // New valley
        ];
        
        // Create the ground with heightmap
        this.createGround();
    }
    
    createGround() {
        // Create a larger ground plane for a more expansive environment
        const worldSize = 1000; // Large enough to extend beyond view horizon
        const gridSize = 300; // Higher resolution to avoid cracks (increased from 200)
        const planeGeometry = new THREE.PlaneGeometry(worldSize, worldSize, gridSize, gridSize);
        
        // Generate height map for the terrain
        this.applyTerrainHeightmap(planeGeometry);
        
        // Create textures for the ground
        if (!Ground.groundDiffuseTexture) {
            Ground.groundDiffuseTexture = this.createGroundDiffuseTexture();
        }
        
        if (!Ground.groundNormalTexture) {
            Ground.groundNormalTexture = this.createGroundNormalTexture();
        }
        
        if (!Ground.groundRoughnessTexture) {
            Ground.groundRoughnessTexture = this.createGroundRoughnessTexture();
        }
        
        // Create a standard material with textures for realistic ground
        const groundMaterial = new THREE.MeshStandardMaterial({
            map: Ground.groundDiffuseTexture,
            normalMap: Ground.groundNormalTexture,
            roughnessMap: Ground.groundRoughnessTexture,
            metalness: 0.0,
            roughness: 0.9,
            color: 0x7D8A63, // Base color (greenish-brown)
            side: THREE.DoubleSide, // Render both sides to prevent cracks
            flatShading: false // Smooth shading for better terrain
        });
        
        // Store reference to the geometry for later height lookups
        this.groundGeometry = planeGeometry;
        
        // Create height lookup grid for fast height calculations
        this.createHeightLookupGrid(planeGeometry);
        
        // Create the ground mesh
        this.ground = new THREE.Mesh(planeGeometry, groundMaterial);
        
        // Position at y=0 and rotate to be flat (horizontal)
        this.ground.position.y = 0;
        this.ground.rotation.x = Math.PI / 2;
        
        // Compute vertex normals for proper lighting with smooth shading
        planeGeometry.computeVertexNormals();
        
        // Ensure normals are properly oriented to avoid lighting issues on steep slopes
        this.fixNormals(planeGeometry);
        
        // Make sure it receives shadows
        this.ground.receiveShadow = true;
        
        // Make sure it's rendered first (to be behind everything)
        this.ground.renderOrder = -1;
        
        // Add to scene
        this.scene.add(this.ground);
        
        // Add fog to create depth and distance falloff
        const fogColor = new THREE.Color(0xD4E0ED);
        this.scene.scene.fog = new THREE.FogExp2(fogColor, 0.0025);
        
        console.log("Enhanced terrain ground added to scene:", this.ground);
    }
    
    // Fix normals for steep slopes to avoid lighting artifacts
    fixNormals(geometry) {
        const normals = geometry.attributes.normal;
        const positions = geometry.attributes.position;
        
        // Ensure normals are facing up on steep slopes
        for (let i = 0; i < normals.count; i++) {
            const nx = normals.getX(i);
            const ny = normals.getY(i);
            const nz = normals.getZ(i);
            
            // If normal is too horizontal (steep slope)
            if (ny < 0.3) {
                // Bias towards the vertical
                const newNy = ny + 0.5 * (1 - ny);
                
                // Renormalize
                const length = Math.sqrt(nx*nx + newNy*newNy + nz*nz);
                normals.setX(i, nx / length);
                normals.setY(i, newNy / length);
                normals.setZ(i, nz / length);
            }
        }
        
        normals.needsUpdate = true;
    }
    
    // Apply height offsets from terrain features to geometry vertices
    applyTerrainHeightmap(geometry) {
        // Get vertices from geometry
        const positions = geometry.attributes.position.array;
        const vertexCount = positions.length / 3;
        
        // Dimensions for reference
        const worldSize = 1000;
        const halfSize = worldSize / 2;
        
        // Loop through all vertices
        for (let i = 0; i < vertexCount; i++) {
            // Get vertex coordinates (note: y is up in THREE.js, but we've rotated the plane so z is up)
            const x = positions[i * 3];
            const z = positions[i * 3 + 1];
            
            // Apply height from terrain features
            const height = this.calculateHeightAt(x, z);
            
            // Set the new height (y-coordinate in the rotated plane)
            positions[i * 3 + 2] = height;
        }
        
        // Flag geometry for update
        geometry.attributes.position.needsUpdate = true;
        
        // Store the world size for later reference
        this.worldSize = worldSize;
    }
    
    // Calculate height at a given point based on terrain features - COMPLETELY REDESIGNED
    calculateHeightAt(x, z) {
        // CRITICAL FIX: This is a more reliable approach to terrain height calculation
        
        // Base height starts at zero
        let totalHeight = 0;
        
        // Base elevation variation (reduced amplitude for better predictability)
        totalHeight += this.terrainNoise(x, z, 0.004, 1.0);
        
        // MAJOR CHANGE: Track each feature's contribution separately for better control
        let featureHeights = [];
        
        // Process all terrain features (hills/valleys)
        for (const feature of this.terrainFeatures) {
            // Distance from feature center
            const dx = x - feature.x;
            const dz = z - feature.z;
            const distance = Math.sqrt(dx*dx + dz*dz);
            
            // Use a larger radius to ensure feature detection from further away
            // This is critical for preventing objects from falling through hills
            const extendedRadius = feature.radius * 1.5; // 50% larger detection radius
            
            // If within feature's extended radius
            if (distance < extendedRadius) {
                // Calculate contribution with MODIFIED falloff function for better behavior
                let heightContribution = 0;
                
                if (distance < feature.radius) {
                    // Calculate falloff with a sharper peak near the center
                    // This creates more plateau-like hills that objects can't fall through
                    const distanceRatio = distance / feature.radius;
                    const falloff = Math.pow(1 - distanceRatio, 2);
                    
                    // Apply height contribution with FULL strength at center
                    heightContribution = feature.height * falloff;
                } else {
                    // Transition zone - apply a steep falloff 
                    const t = (distance - feature.radius) / (extendedRadius - feature.radius);
                    const falloff = Math.pow(1 - t, 3); // Cubic falloff for steeper edges
                    heightContribution = feature.height * falloff * 0.7;
                }
                
                // IMPORTANT: Store heights separately to find the maximum influence
                featureHeights.push(heightContribution);
            }
        }
        
        // CRITICAL CHANGE: Take the maximum height from all features
        // This ensures objects always sit on top of the highest point
        if (featureHeights.length > 0) {
            const maxFeatureHeight = Math.max(...featureHeights);
            const minFeatureHeight = Math.min(...featureHeights);
            
            // If we have a valley (negative height) and no hills, use the valley
            if (maxFeatureHeight <= 0 && minFeatureHeight < 0) {
                totalHeight += minFeatureHeight;
            } else if (maxFeatureHeight > 0) {
                // Otherwise use the highest hill
                totalHeight += maxFeatureHeight;
            }
        }
        
        // SPECIAL HANDLING for track area near center
        const centerDistance = Math.sqrt(x*x + z*z);
        const trackSafeRadius = 100; // Larger safe area
        
        if (centerDistance < trackSafeRadius) {
            // Apply a more aggressive flattening near the center
            // This creates a more definite flat area for the track
            const t = centerDistance / trackSafeRadius;
            // More aggressive flattening function
            const flattenFactor = Math.pow(t, 2);
            
            // Scale terrain height by flatten factor (0 at center, 1 at edge)
            totalHeight *= flattenFactor;
        }
        
        // SAFETY NET: Apply a minimum height floor to prevent any potential gaps
        // This ensures there are no "holes" in the terrain
        return Math.max(totalHeight, -10); // Enforce a minimum height limit
    }
    
    // COMPLETELY OVERHAULED height grid for reliable terrain height calculations
    createHeightLookupGrid(geometry) {
        console.log("Creating RELIABLE terrain height grid");
        
        // Use higher resolution for more precise height detection
        const gridResolution = 300;
        const cellSize = this.worldSize / gridResolution;
        const halfSize = this.worldSize / 2;
        
        // Create a simpler, more reliable grid directly from calculateHeightAt
        this.heightGrid = new Array(gridResolution);
        for (let i = 0; i < gridResolution; i++) {
            this.heightGrid[i] = new Array(gridResolution);
        }
        
        // CRITICAL CHANGE: Compute ALL grid values directly from calculateHeightAt
        // This ensures perfect consistency between the grid and direct calculations
        console.log("Computing height values for entire grid...");
        for (let i = 0; i < gridResolution; i++) {
            for (let j = 0; j < gridResolution; j++) {
                // Convert grid indices to world coordinates
                const x = (i * cellSize) - halfSize + (cellSize / 2); // Center of cell
                const z = (j * cellSize) - halfSize + (cellSize / 2);
                
                // Calculate height directly using our reliable method
                const height = this.calculateHeightAt(x, z);
                
                // Store height value with a small upward bias for safety
                this.heightGrid[i][j] = height + 0.1; // Safety margin to prevent objects falling through
            }
            
            // Progress update for large grid
            if (i % 50 === 0) {
                console.log(`Height grid computation progress: ${Math.floor((i / gridResolution) * 100)}%`);
            }
        }
        
        // Store grid properties
        this.gridResolution = gridResolution;
        this.cellSize = cellSize;
        
        console.log("Reliable terrain height grid created with full direct calculation");
    }
    
    // Fill empty cells with interpolated values from neighbors with depth limit
    interpolateEmptyCell(i, j, gridResolution, depth = 0) {
        // Add depth limit to prevent stack overflow
        const MAX_RECURSION_DEPTH = 3;
        if (depth > MAX_RECURSION_DEPTH) {
            // If we hit recursion limit, assign a default value and return
            this.heightGrid[i][j].height = 0; // Default height
            this.heightGrid[i][j].sampleCount = 1;
            this.heightGrid[i][j].neighborChecked = true;
            return;
        }
        
        // Already processed or has samples
        if (this.heightGrid[i][j].neighborChecked || this.heightGrid[i][j].sampleCount > 0) {
            return;
        }
        
        // Mark as checked to avoid infinite recursion
        this.heightGrid[i][j].neighborChecked = true;
        
        // Get neighboring cells (up to 8 neighbors)
        const neighbors = [];
        const offsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [dx, dz] of offsets) {
            const ni = i + dx;
            const nj = j + dz;
            
            // Skip if out of bounds
            if (ni < 0 || ni >= gridResolution || nj < 0 || nj >= gridResolution) {
                continue;
            }
            
            const neighbor = this.heightGrid[ni][nj];
            
            // If neighbor has samples, add to list
            if (neighbor.sampleCount > 0) {
                neighbors.push(neighbor);
            } else if (!neighbor.neighborChecked) {
                // Recursively interpolate neighbor first if it's also empty
                // Pass incremented depth to track recursion level
                this.interpolateEmptyCell(ni, nj, gridResolution, depth + 1);
                
                // Now that neighbor has been processed, check if it has a value
                if (neighbor.sampleCount > 0) {
                    neighbors.push(neighbor);
                }
            }
        }
        
        // Calculate average height from neighbors
        if (neighbors.length > 0) {
            let totalHeight = 0;
            for (const neighbor of neighbors) {
                totalHeight += neighbor.height;
            }
            
            // Set interpolated height for this cell
            this.heightGrid[i][j].height = totalHeight / neighbors.length;
            this.heightGrid[i][j].sampleCount = 1; // Mark as having a sample now
        } else {
            // If we have no neighbors with values, use a simpler approach
            // Look for the nearest non-empty cell in a spiral pattern
            for (let radius = 2; radius <= 5; radius++) {
                let found = false;
                
                // Check cells in an expanding radius
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                        // Only check cells at the current radius (Manhattan distance)
                        if (Math.abs(dx) + Math.abs(dz) === radius) {
                            const ni = i + dx;
                            const nj = j + dz;
                            
                            // Skip if out of bounds
                            if (ni < 0 || ni >= gridResolution || nj < 0 || nj >= gridResolution) {
                                continue;
                            }
                            
                            const distantNeighbor = this.heightGrid[ni][nj];
                            if (distantNeighbor.sampleCount > 0) {
                                // Found a cell with a value, use it
                                this.heightGrid[i][j].height = distantNeighbor.height;
                                this.heightGrid[i][j].sampleCount = 1;
                                found = true;
                                break;
                            }
                        }
                    }
                    if (found) break;
                }
                if (found) break;
                
                // If we checked the maximum radius and found nothing, use default
                if (radius === 5) {
                    this.heightGrid[i][j].height = 0;
                    this.heightGrid[i][j].sampleCount = 1;
                }
            }
        }
    }
    
    // Smooth out sharp transitions between adjacent cells
    smoothSharpTransitions(i, j, gridResolution) {
        const cell = this.heightGrid[i][j];
        
        // Get direct neighbors (4-connected)
        const neighbors = [
            this.heightGrid[i-1][j],
            this.heightGrid[i+1][j],
            this.heightGrid[i][j-1],
            this.heightGrid[i][j+1]
        ];
        
        // Calculate height differences to detect sharp transitions
        let maxDiff = 0;
        let heightSum = cell.height;
        let count = 1;
        
        for (const neighbor of neighbors) {
            const diff = Math.abs(cell.height - neighbor.height);
            maxDiff = Math.max(maxDiff, diff);
            heightSum += neighbor.height;
            count++;
        }
        
        // If we detect a very sharp transition
        if (maxDiff > 5.0) { // Threshold for "too sharp" transition
            // Create a weighted average that preserves most of the original height
            // but reduces the extreme difference
            const avgHeight = heightSum / count;
            const smoothFactor = 0.3; // How much to blend (0 = no change, 1 = full average)
            
            // Apply weighted smoothing
            cell.height = cell.height * (1 - smoothFactor) + avgHeight * smoothFactor;
        }
    }
    
    // Create a realistic diffuse texture for ground
    createGroundDiffuseTexture() {
        // Create a canvas for the texture
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext('2d');
        
        // Fill base color (dirt/soil)
        context.fillStyle = '#6A5A40';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add noise variations for natural look
        this.addNoiseLayer(context, canvas.width, canvas.height, 16, '#7D8A63', 0.7); // Grass-ish
        this.addNoiseLayer(context, canvas.width, canvas.height, 32, '#5A4A30', 0.5); // Dark soil
        this.addNoiseLayer(context, canvas.width, canvas.height, 64, '#8A7A50', 0.4); // Light soil
        
        // Add small vegetation and ground details
        this.addGrassDetails(context, canvas.width, canvas.height);
        this.addGroundDetails(context, canvas.width, canvas.height);
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Set texture properties
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }
    
    // Create a normal map for giving the ground depth
    createGroundNormalTexture() {
        // Create a canvas for the normal map
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill with neutral normal (pointing up)
        context.fillStyle = '#8080FF'; // RGB normal with Y pointing up
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create some random bumps for ground texture
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 2 + Math.random() * 8;
            
            // Randomize normal direction slightly for small bumps
            const r = Math.floor(100 + Math.random() * 30);
            const g = Math.floor(100 + Math.random() * 30);
            const b = 255; // Keep blue channel high for upward normal
            
            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Set texture properties
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }
    
    // Create a roughness map for ground surface detail
    createGroundRoughnessTexture() {
        // Create a canvas for the roughness map
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill with base roughness
        context.fillStyle = '#777777'; // Medium roughness
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add varied roughness for different ground materials
        for (let i = 0; i < 600; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 3 + Math.random() * 10;
            
            // Vary the roughness value
            const roughness = Math.floor(40 + Math.random() * 200);
            context.fillStyle = `rgb(${roughness}, ${roughness}, ${roughness})`;
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Create some smoother patches (rocks, etc)
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 2 + Math.random() * 6;
            
            // Smoother (darker in roughness map)
            const roughness = Math.floor(20 + Math.random() * 40);
            context.fillStyle = `rgb(${roughness}, ${roughness}, ${roughness})`;
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Set texture properties
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }
    
    // Add noise layer with perlin-like effect for natural ground variation
    addNoiseLayer(context, width, height, scale, color, alpha) {
        context.fillStyle = color;
        context.globalAlpha = alpha;
        
        // Create a noise grid
        const noiseGrid = [];
        const noiseScale = scale;
        const gridSize = Math.ceil(width / noiseScale) + 1;
        
        // Generate random values for grid points
        for (let y = 0; y < gridSize; y++) {
            noiseGrid[y] = [];
            for (let x = 0; x < gridSize; x++) {
                noiseGrid[y][x] = Math.random();
            }
        }
        
        // Draw noise as patches of color
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                // Find grid cell and interpolation weights
                const gridX = Math.floor(x / noiseScale);
                const gridY = Math.floor(y / noiseScale);
                const fracX = (x % noiseScale) / noiseScale;
                const fracY = (y % noiseScale) / noiseScale;
                
                // Interpolate values from grid corners
                let value = 0;
                
                if (gridY < noiseGrid.length && gridX < noiseGrid[gridY].length) {
                    const v1 = noiseGrid[gridY][gridX] || 0;
                    const v2 = noiseGrid[gridY][Math.min(gridX + 1, gridSize - 1)] || 0;
                    const v3 = noiseGrid[Math.min(gridY + 1, gridSize - 1)][gridX] || 0;
                    const v4 = noiseGrid[Math.min(gridY + 1, gridSize - 1)][Math.min(gridX + 1, gridSize - 1)] || 0;
                    
                    // Smooth interpolation (cosine) 
                    const fx = (1 - Math.cos(fracX * Math.PI)) * 0.5;
                    const fy = (1 - Math.cos(fracY * Math.PI)) * 0.5;
                    
                    // Bilinear interpolation
                    const top = v1 * (1 - fx) + v2 * fx;
                    const bottom = v3 * (1 - fx) + v4 * fx;
                    value = top * (1 - fy) + bottom * fy;
                    
                    // Apply threshold for more natural patches
                    if (value > 0.5) {
                        context.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
        
        // Reset alpha
        context.globalAlpha = 1.0;
    }
    
    // Add smaller vegetation detail patches
    addGrassDetails(context, width, height) {
        // Add small vegetation patches (sparse, less grass-like)
        for (let i = 0; i < 1800; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            
            // Random vegetation size
            const patchHeight = 1 + Math.random() * 2;
            const patchWidth = 0.5 + Math.random() * 1;
            
            // Random vegetation colors (muted, earthy colors)
            const colorType = Math.random();
            let r, g, b;
            
            if (colorType < 0.6) {
                // Various earth tones
                r = 80 + Math.floor(Math.random() * 40);
                g = 70 + Math.floor(Math.random() * 40);
                b = 40 + Math.floor(Math.random() * 30);
            } else if (colorType < 0.8) {
                // Sparse dried vegetation
                r = 110 + Math.floor(Math.random() * 40);
                g = 100 + Math.floor(Math.random() * 30);
                b = 50 + Math.floor(Math.random() * 30);
            } else {
                // Occasional darker patches
                r = 60 + Math.floor(Math.random() * 30);
                g = 55 + Math.floor(Math.random() * 30);
                b = 45 + Math.floor(Math.random() * 25);
            }
            
            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            
            // Random orientation
            const angle = Math.random() * Math.PI;
            
            context.save();
            context.translate(x, y);
            context.rotate(angle);
            context.fillRect(-patchWidth/2, -patchHeight/2, patchWidth, patchHeight);
            context.restore();
        }
    }
    
    // Add ground detail variations
    addGroundDetails(context, width, height) {
        // Draw small rocks and pebbles
        for (let i = 0; i < 500; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const size = 0.5 + Math.random() * 2;
            
            const gray = 80 + Math.floor(Math.random() * 60);
            context.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Add some fallen leaves or debris
        for (let i = 0; i < 300; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const size = 1 + Math.random() * 2;
            
            // Random colors for leaves/debris
            const colors = [
                '#614126', // Brown
                '#8A7B52', // Tan
                '#8A6642', // Light brown
                '#8B4513', // Saddle brown
                '#6B4226', // Burnt sienna
            ];
            
            context.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            
            // Draw as small oval or irregular shape
            context.save();
            context.translate(x, y);
            context.rotate(Math.random() * Math.PI * 2);
            context.beginPath();
            context.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }
    }
    
    // Get the height of the ground at a given x,z coordinate - COMPLETELY REDESIGNED approach
    getHeightAt(x, z) {
        // CRITICAL TERRAIN APPROACH: Always use the direct calculation method for consistency
        // This ensures perfect agreement between getHeightAt and calculateHeightAt
        const directHeight = this.calculateHeightAt(x, z); 
        
        // Create detailed terrain info 
        let terrainDetails = {};
        
        // Always add a small safety margin to heights
        // This is essential to prevent objects from passing through terrain
        const SAFETY_MARGIN = 0.2;
        const safeHeight = directHeight + SAFETY_MARGIN;
        
        // Even if we have a height grid, we'll verify against direct calculation
        // and take the MAXIMUM value to ensure nothing falls through terrain
        let height = safeHeight;
        
        if (this.heightGrid) {
            // First get height from grid for comparison
            const gridHeight = this.getHeightFromGrid(x, z);
            
            // Critical: Use the maximum height to guarantee objects stay on top of terrain
            height = Math.max(gridHeight, safeHeight);
            
            // Use a wider sampling radius to guarantee we find all relevant terrain features
            const sampleRadius = 4.0; // Much larger radius for comprehensive coverage
            const samples = [
                { x: x + sampleRadius, z: z },
                { x: x - sampleRadius, z: z },
                { x: x, z: z + sampleRadius },
                { x: x, z: z - sampleRadius },
                { x: x + sampleRadius, z: z + sampleRadius },
                { x: x - sampleRadius, z: z - sampleRadius },
                { x: x + sampleRadius, z: z - sampleRadius },
                { x: x - sampleRadius, z: z + sampleRadius },
                { x: x, z: z }
            ];
            
            // Get heights at all sample points (direct calculation for ultimate reliability)
            const sampleHeights = samples.map(sample => this.calculateHeightAt(sample.x, sample.z) + SAFETY_MARGIN);
            
            // Use the absolute maximum height from all samples
            // This completely prevents passing through terrain by being maximally conservative
            const maxHeight = Math.max(...sampleHeights, height);
            
            // Final height is the guaranteed maximum
            height = maxHeight;
            
            // Calculate normal vector based on height differences
            // Use the most reliable direct calculation method
            const dx1 = this.calculateHeightAt(x + sampleRadius, z) - this.calculateHeightAt(x - sampleRadius, z);
            const dz1 = this.calculateHeightAt(x, z + sampleRadius) - this.calculateHeightAt(x, z - sampleRadius);
            
            // Calculate surface normal
            const normalX = -dx1 / (2 * sampleRadius);
            const normalZ = -dz1 / (2 * sampleRadius);
            const normalY = 1.0; // Positive Y is up - use strong upward bias for stability
            
            // Normalize the vector
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
            
            terrainDetails.normal = {
                x: normalX / normalLength,
                y: normalY / normalLength,
                z: normalZ / normalLength
            };
        } else {
            // Even without a grid, provide normal information
            // For now, use default up-facing normal
            terrainDetails.normal = { x: 0, y: 1, z: 0 };
        }
        
        // Store the calculated height
        terrainDetails.height = height;
        
        // For backward compatibility:
        // If this is called with a third argument expecting the original number return value, 
        // return just the height number. This helps maintain compatibility with existing code.
        if (arguments.length > 2 && arguments[2] === 'numberOnly') {
            return height;
        }
        
        // Return detailed object with height and additional info for robust terrain interaction
        return terrainDetails;
    }
    
    // Simplified height lookup function for the new direct-computed grid
    getHeightFromGrid(x, z) {
        // Safety check
        if (!this.heightGrid || !this.gridResolution || !this.cellSize) {
            // Fall back to direct calculation for ultimate reliability
            return this.calculateHeightAt(x, z) + 0.1;
        }
        
        // Convert world coordinates to grid indices
        const halfSize = this.worldSize / 2;
        const gx = (x + halfSize) / this.cellSize;
        const gz = (z + halfSize) / this.cellSize;
        
        // Get grid cell indices with fractional parts for interpolation
        const gridX = Math.floor(gx);
        const gridZ = Math.floor(gz);
        
        // If out of bounds, use direct calculation for safety
        if (gridX < 0 || gridX >= this.gridResolution-1 || gridZ < 0 || gridZ >= this.gridResolution-1) {
            // ALWAYS fallback to direct calculation when out of bounds
            return this.calculateHeightAt(x, z) + 0.1;
        }
        
        // Get fractional parts for bilinear interpolation
        const fracX = gx - gridX;
        const fracZ = gz - gridZ;
        
        // Get heights from the four surrounding grid cells with safety checks
        // No need to check for 'height' property, the grid directly stores height values now
        const h00 = this.heightGrid[gridX][gridZ] || 0;
        const h10 = this.heightGrid[gridX+1][gridZ] || 0;
        const h01 = this.heightGrid[gridX][gridZ+1] || 0;
        const h11 = this.heightGrid[gridX+1][gridZ+1] || 0;
        
        // Perform bilinear interpolation for smooth height transitions
        // h(x,z) = h00 * (1-x) * (1-z) + h10 * x * (1-z) + h01 * (1-x) * z + h11 * x * z
        const height = 
            h00 * (1 - fracX) * (1 - fracZ) +
            h10 * fracX * (1 - fracZ) +
            h01 * (1 - fracX) * fracZ +
            h11 * fracX * fracZ;
        
        // ADDITIONAL SAFETY: Take max of interpolated value and direct calculation
        // This ensures no areas can be "lower" than they should be
        const directHeight = this.calculateHeightAt(x, z) + 0.1;
        return Math.max(height, directHeight);
    }
    
    // Generate smoothed noise for terrain height
    terrainNoise(x, z, frequency, amplitude) {
        // Simple perlin-like noise function
        const nx = x * frequency;
        const nz = z * frequency;
        
        // Get grid cell coordinates
        const ix = Math.floor(nx);
        const iz = Math.floor(nz);
        
        // Get local coordinates within cell (0 to 1)
        const fx = nx - ix;
        const fz = nz - iz;
        
        // Smooth interpolation function (improved from cosine)
        const sx = this.smoothStep(fx);
        const sz = this.smoothStep(fz);
        
        // Generate pseudo-random values at grid corners
        const a = this.pseudoRandom(ix, iz);
        const b = this.pseudoRandom(ix + 1, iz);
        const c = this.pseudoRandom(ix, iz + 1);
        const d = this.pseudoRandom(ix + 1, iz + 1);
        
        // Bilinear interpolation between corners
        const topMix = a * (1 - sx) + b * sx;
        const bottomMix = c * (1 - sx) + d * sx;
        const result = topMix * (1 - sz) + bottomMix * sz;
        
        // Apply amplitude scaling
        return (result * 2 - 1) * amplitude;
    }
    
    // Improved smooth step function for more natural terrain
    smoothStep(t) {
        // Cubic smooth step: 3t² - 2t³
        return t * t * (3 - 2 * t);
    }
    
    // Pseudo-random but deterministic function
    pseudoRandom(x, z) {
        // Generate deterministic "random" value from x,z coordinates
        const dot = x * 12.9898 + z * 78.233;
        const sin = Math.sin(dot) * 43758.5453;
        return sin - Math.floor(sin);
    }
}

export default Ground;