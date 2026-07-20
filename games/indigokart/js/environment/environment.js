import * as THREE from 'three';
import { CONFIG } from '../core/game.js';
import Sky from './sky.js';
import Ground from './ground.js';
import TrackLighting from './track-lighting.js';
import StreetLamp from './street-lamp.js';

class Environment {
    // Static shared textures for environment
    static rockTexture = null;
    
    constructor(scene, track) {
        this.scene = scene;
        this.track = track;
        
        // EMERGENCY FIX: Simplify texture initialization
        this.initializeSharedTextures();
        
        console.log("Texture initialization completed with reduced texture usage");
        console.log("Ground: using simplified color-only rendering");
        console.log("Sky: using procedural effects without textures");
        
        // Initialize ground - make sure it's created after textures are set up
        this.ground = new Ground(scene);
        
        // Make sure ground is visible
        console.log("Ground created:", this.ground);
        
        // Initialize sky - after ground to prevent texture limit overflow
        this.sky = new Sky(scene);
        
        // Track lights will be initialized after track is available
        this.trackLighting = null;
        
        // Add environmental details (trees, rocks, etc.)
        this.addEnvironmentalDetails();
        
        // Time for animation
        this.time = 0;
        
        // Initialize track lighting if track is available
        if (track) {
            this.initializeTrackLighting(track);
        }
    }
    
    // Initialize all shared textures
    initializeSharedTextures() {
        // Create shared rock texture if not already created
        if (!Environment.rockTexture) {
            Environment.rockTexture = this.createRockTexture();
            console.log("Initialized shared rock texture");
        }
        
        // EMERGENCY FIX: Don't create ground textures at all
        // This is to prevent exceeding the WebGL texture limit
        // We're using MeshBasicMaterial with plain color instead
        Ground.groundDiffuseTexture = null;
        Ground.groundNormalTexture = null;
        Ground.groundRoughnessTexture = null;
        console.log("Skipped all ground texture initialization for WebGL compatibility");
        
        // No longer pre-initializing Sky textures as they've been replaced with procedural effects
        
        // REMOVED: No longer using street lamp glow textures to save texture units
    }
    
    // Simplified texture creation methods
    
    // EMERGENCY FIX: Remove unused texture creation methods
    // These methods are no longer needed since we're using a texture-less approach
    // to fix the WebGL shader texture unit limit issue
    
    // REMOVED: createLampGlowTexture method
    // No longer using glow sprites for street lamps to save texture units
    
    // Initialize track lighting system with street lamps
    initializeTrackLighting(track) {
        if (!track) return;
        
        this.trackLighting = new TrackLighting(this.scene, track, this);
        console.log("Track lighting initialized with street lamps");
    }
    
    addEnvironmentalDetails() {
        this.addTreesAndRocks();
    }
    
    // EMERGENCY FIX: Don't create any texture - use color only
    createRockTexture() {
        // Skip texture creation entirely to fix WebGL texture limit error
        console.log("EMERGENCY FIX: Rock texture creation skipped to avoid exceeding texture limit");
        return null;
    }
    
    addTreesAndRocks() {
        // EMERGENCY FIX: Simplify materials to reduce texture usage
        // Tree materials - use MeshBasicMaterial instead of MeshStandardMaterial
        const treeTrunkMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8B4513 // Brown
        });
        
        const treeTopMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x228B22 // Forest green 
        });
        
        // EMERGENCY FIX: Use color-only materials with NO textures
        // Rock materials with absolutely no textures to avoid WebGL limits
        const rockMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x808080
        });
        
        // Simplified alternate rock material - also with no texture
        const darkRockMaterial = new THREE.MeshBasicMaterial({
            color: 0x606060
        });
        
        // Fixed positions for trees and rocks - designed with careful placement
        const environmentalObjects = [
            // Forest clusters
            { type: 'tree', x: -80, z: 60, size: 1.2, variation: 0.8 },
            { type: 'tree', x: -84, z: 52, size: 0.9, variation: 0.7 },
            { type: 'tree', x: -76, z: 48, size: 1.1, variation: 0.9 },
            { type: 'tree', x: -90, z: 40, size: 1.0, variation: 1.0 },
            { type: 'tree', x: -70, z: 65, size: 1.3, variation: 0.6 },
            
            { type: 'tree', x: 40, z: -90, size: 1.1, variation: 0.9 },
            { type: 'tree', x: 50, z: -85, size: 0.8, variation: 1.1 },
            { type: 'tree', x: 60, z: -75, size: 1.2, variation: 0.8 },
            { type: 'tree', x: 45, z: -65, size: 0.9, variation: 1.0 },
            
            { type: 'tree', x: -30, z: -85, size: 1.0, variation: 0.8 },
            { type: 'tree', x: -40, z: -90, size: 1.2, variation: 0.7 },
            { type: 'tree', x: -25, z: -75, size: 0.9, variation: 0.9 },
            { type: 'tree', x: -35, z: -70, size: 1.1, variation: 1.0 },
            
            { type: 'tree', x: 85, z: 30, size: 1.3, variation: 0.8 },
            { type: 'tree', x: 75, z: 25, size: 1.0, variation: 1.0 },
            { type: 'tree', x: 80, z: 40, size: 0.9, variation: 0.9 },
            { type: 'tree', x: 90, z: 20, size: 1.2, variation: 0.7 },
            
            // Individual trees at interesting locations
            { type: 'tree', x: 20, z: 70, size: 1.5, variation: 0.5 },
            { type: 'tree', x: -50, z: -40, size: 1.4, variation: 0.6 },
            { type: 'tree', x: 60, z: -20, size: 1.3, variation: 0.7 },
            { type: 'tree', x: -70, z: 10, size: 1.6, variation: 0.5 },
            
            // Strategic trees near track bends
            { type: 'tree', x: 0, z: 70, size: 1.2, variation: 0.8 },
            { type: 'tree', x: 70, z: 0, size: 1.3, variation: 0.7 },
            { type: 'tree', x: 0, z: -70, size: 1.1, variation: 0.9 },
            { type: 'tree', x: -70, z: 0, size: 1.4, variation: 0.6 },
            
            // Rock clusters
            { type: 'rock', x: -60, z: 40, size: 1.8, variation: 0.7 },
            { type: 'rock', x: -56, z: 37, size: 1.2, variation: 0.8 },
            { type: 'rock', x: -63, z: 45, size: 0.9, variation: 0.9 },
            
            { type: 'rock', x: 55, z: -50, size: 1.5, variation: 0.8 },
            { type: 'rock', x: 50, z: -53, size: 0.8, variation: 0.9 },
            { type: 'rock', x: 58, z: -47, size: 1.2, variation: 0.7 },
            
            { type: 'rock', x: 30, z: 55, size: 1.3, variation: 0.8 },
            { type: 'rock', x: 33, z: 60, size: 0.9, variation: 0.9 },
            { type: 'rock', x: 28, z: 50, size: 1.1, variation: 0.7 },
            
            { type: 'rock', x: -25, z: -60, size: 1.4, variation: 0.7 },
            { type: 'rock', x: -30, z: -57, size: 0.8, variation: 0.9 },
            { type: 'rock', x: -22, z: -63, size: 1.0, variation: 0.8 },
            
            // Individual decorative rocks
            { type: 'rock', x: 15, z: -30, size: 1.0, variation: 0.9 },
            { type: 'rock', x: -40, z: 20, size: 1.2, variation: 0.8 },
            { type: 'rock', x: 35, z: 15, size: 0.8, variation: 1.0 },
            { type: 'rock', x: -15, z: 35, size: 1.1, variation: 0.7 },
            
            // Track-side decorations
            { type: 'rock', x: -10, z: 65, size: 0.7, variation: 0.9 },
            { type: 'rock', x: 65, z: 10, size: 0.8, variation: 0.8 },
            { type: 'rock', x: 10, z: -65, size: 0.6, variation: 1.0 },
            { type: 'rock', x: -65, z: -10, size: 0.9, variation: 0.7 }
        ];
        
        // Place all objects
        for (const obj of environmentalObjects) {
            // Get ground height at this position
            const groundHeight = this.ground.getHeightAt(obj.x, obj.z);
            
            if (obj.type === 'tree') {
                // Create a tree with variation
                const treeSize = obj.size * (1 - obj.variation/2 + Math.random() * obj.variation);
                const tree = new THREE.Group();
                
                // Tree trunk with variation
                const trunkRadius = 0.5 * treeSize;
                const trunkHeight = 4 * treeSize;
                const trunkGeometry = new THREE.CylinderGeometry(
                    trunkRadius * 0.7, 
                    trunkRadius * 1.1,
                    trunkHeight, 8
                );
                const trunk = new THREE.Mesh(trunkGeometry, treeTrunkMaterial);
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                trunk.position.y = trunkHeight/2;
                tree.add(trunk);
                
                // Tree top with variation
                const topRadius = 3 * treeSize;
                const topHeight = 8 * treeSize;
                const treeTopGeometry = new THREE.ConeGeometry(topRadius, topHeight, 8);
                const treeTop = new THREE.Mesh(treeTopGeometry, treeTopMaterial);
                treeTop.position.y = trunkHeight + topHeight/2 - 1;
                treeTop.castShadow = true;
                treeTop.receiveShadow = true;
                tree.add(treeTop);
                
                // Position tree with slight random offset
                const offsetX = (Math.random() - 0.5) * 5 * obj.variation;
                const offsetZ = (Math.random() - 0.5) * 5 * obj.variation;
                
                // Calculate final position
                const finalX = obj.x + offsetX;
                const finalZ = obj.z + offsetZ;
                
                // Get more accurate terrain height at final position
                let terrainHeight = groundHeight;
                
                // Use track's heightmap if available for more accurate placement
                if (this.track && this.track.getHeightAt) {
                    const heightData = this.track.getHeightAt(finalX, finalZ);
                    // Handle both object and number return types
                    if (heightData && typeof heightData === 'object' && typeof heightData.height === 'number') {
                        terrainHeight = heightData.height;
                    } else if (typeof heightData === 'number') {
                        terrainHeight = heightData;
                    }
                }
                
                // Position tree on terrain
                tree.position.set(finalX, terrainHeight, finalZ);
                
                // Add some random rotation
                tree.rotation.y = Math.random() * Math.PI * 2;
                
                // Small random tilt for natural look
                tree.rotation.x = (Math.random() - 0.5) * 0.05;
                tree.rotation.z = (Math.random() - 0.5) * 0.05;
                
                this.scene.add(tree);
            } 
            else if (obj.type === 'rock') {
                // Create a rock cluster with variation
                const rockSize = obj.size * (1 - obj.variation/2 + Math.random() * obj.variation);
                const rockCluster = this.createRockCluster(rockMaterial, darkRockMaterial, rockSize);
                
                // Position with slight random offset
                const offsetX = (Math.random() - 0.5) * 3 * obj.variation;
                const offsetZ = (Math.random() - 0.5) * 3 * obj.variation;
                
                // Calculate final position
                const finalX = obj.x + offsetX;
                const finalZ = obj.z + offsetZ;
                
                // Get more accurate terrain height at final position
                let terrainHeight = groundHeight;
                
                // Use track's heightmap if available for more accurate placement
                if (this.track && this.track.getHeightAt) {
                    const heightData = this.track.getHeightAt(finalX, finalZ);
                    // Handle both object and number return types
                    if (heightData && typeof heightData === 'object' && typeof heightData.height === 'number') {
                        terrainHeight = heightData.height;
                    } else if (typeof heightData === 'number') {
                        terrainHeight = heightData;
                    }
                }
                
                // Position rock on terrain (slight offset to avoid z-fighting)
                rockCluster.position.set(finalX, terrainHeight + 0.1, finalZ);
                
                // Random rotation
                rockCluster.rotation.y = Math.random() * Math.PI * 2;
                
                this.scene.add(rockCluster);
            }
        }
    }
    
    addTrees() {
        // Tree materials
        const treeTrunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513, // Brown
            roughness: 0.9, 
            metalness: 0.1
        });
        
        const treeTopMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22, // Forest green 
            roughness: 0.9, 
            metalness: 0.0
        });
        
        // Create multiple trees around the landscape
        for (let i = 0; i < 50; i++) {
            // Random position away from the track
            const minDistance = CONFIG.worldSize * 0.25; // Min distance from center
            const maxDistance = CONFIG.worldSize * 0.8;  // Max distance
            const angle = Math.random() * Math.PI * 2;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            const posX = Math.cos(angle) * distance;
            const posZ = Math.sin(angle) * distance;
            
            // Check ground height at this position for proper placement
            const groundHeight = this.ground.getHeightAt(posX, posZ);
            
            // Create a tree
            const tree = new THREE.Group();
            
            // Tree trunk (cylinder)
            const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 4, 8);
            const trunk = new THREE.Mesh(trunkGeometry, treeTrunkMaterial);
            trunk.castShadow = true;
            trunk.position.y = 2; // Half height of trunk
            tree.add(trunk);
            
            // Tree top (cone)
            const treeTopGeometry = new THREE.ConeGeometry(3, 8, 8);
            const treeTop = new THREE.Mesh(treeTopGeometry, treeTopMaterial);
            treeTop.position.y = 7; // Position above trunk
            treeTop.castShadow = true;
            tree.add(treeTop);
            
            // Position tree on the landscape
            tree.position.set(posX, Math.abs(groundHeight), posZ);
            this.scene.add(tree);
            
            // Add some random rotation for variety
            tree.rotation.y = Math.random() * Math.PI * 2;
        }
    }
    
    addRocks() {
        // Use the shared rock texture
        const rockTexture = Environment.rockTexture;
        
        // Create rock materials using the shared texture
        const rockMaterial = new THREE.MeshStandardMaterial({ 
            map: rockTexture,
            roughness: 0.9, 
            metalness: 0.2,
            bumpMap: rockTexture,
            bumpScale: 0.2,
            envMapIntensity: 0.8
        });
        
        // Use a second material for variations but with the same texture
        const darkRockMaterial = new THREE.MeshStandardMaterial({
            map: rockTexture,
            roughness: 0.9,
            metalness: 0.1,
            bumpMap: rockTexture,
            bumpScale: 0.3,
            color: 0x606060
        });
        
        // Add rock clusters
        for (let i = 0; i < 30; i++) {
            // Random position around the track
            const minDistance = CONFIG.worldSize * 0.15;
            const maxDistance = CONFIG.worldSize * 0.7;
            const angle = Math.random() * Math.PI * 2;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            const posX = Math.cos(angle) * distance;
            const posZ = Math.sin(angle) * distance;
            
            // Check ground height at this position
            const groundHeight = this.ground.getHeightAt(posX, posZ);
            
            // Create a rock cluster
            const rockCluster = this.createRockCluster(
                rockMaterial, 
                darkRockMaterial,
                1 + Math.random() * 2  // Base size varies
            );
            
            // Position on ground with slight randomization
            rockCluster.position.set(posX, Math.abs(groundHeight) + 0.1, posZ);
            rockCluster.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(rockCluster);
        }
    }
    
    createRockCluster(lightMaterial, darkMaterial, baseSize) {
        // Create a parent group for the rock cluster
        const rockGroup = new THREE.Group();
        
        // Number of rocks in this cluster
        const rockCount = 3 + Math.floor(Math.random() * 5);
        
        // Create and merge multiple sphere geometries for smooth continuous surface
        for (let i = 0; i < rockCount; i++) {
            // Create a rock from a high-poly sphere, with noise displacement
            const size = baseSize * (0.5 + Math.random() * 0.8);
            let rockGeometry;
            
            // Randomly choose between different basic shapes
            const shapeType = Math.floor(Math.random() * 4);
            switch(shapeType) {
                case 0:
                    // Sphere with high detail for smooth surface
                    rockGeometry = new THREE.SphereGeometry(size, 16, 16);
                    break;
                case 1:
                    // Icosahedron (semi-regular solid) has a more natural rock feel
                    rockGeometry = new THREE.IcosahedronGeometry(size, 2);
                    break;
                case 2:
                    // Octahedron-based with subdiv level 2 - more angular but still smooth
                    rockGeometry = new THREE.OctahedronGeometry(size, 2);
                    break;
                case 3:
                    // Dodecahedron with smooth subdiv level - more rounded but with facets
                    rockGeometry = new THREE.DodecahedronGeometry(size, 1);
                    break;
            }
            
            // Apply random noise displacement to vertices
            const positions = rockGeometry.attributes.position;
            for (let j = 0; j < positions.count; j++) {
                const x = positions.getX(j);
                const y = positions.getY(j);
                const z = positions.getZ(j);
                
                const normalizedLength = Math.sqrt(x*x + y*y + z*z) / size;
                
                // Add different levels of noise at different frequencies
                const noise1 = Math.sin(x * 3) * Math.cos(y * 2) * Math.sin(z * 3) * 0.15;
                const noise2 = Math.sin(x * 7) * Math.cos(y * 5) * Math.sin(z * 7) * 0.05;
                
                // Apply displacement along normal vector to maintain volume
                const displacement = (noise1 + noise2) * size;
                const newLength = size * (normalizedLength + displacement);
                
                // Check if the point is near the bottom - flatten the bottom slightly
                const isBottom = y < -size * 0.5;
                const bottomFactor = isBottom ? 0.8 : 1.0;
                
                positions.setX(j, x * (newLength / (size * normalizedLength)) * bottomFactor);
                positions.setY(j, y * (newLength / (size * normalizedLength)) * (isBottom ? 0.7 : 1.0));
                positions.setZ(j, z * (newLength / (size * normalizedLength)) * bottomFactor);
            }
            
            // Update normals after modifying positions
            rockGeometry.computeVertexNormals();
            
            // Choose material - 70% light, 30% dark for variation
            const material = Math.random() < 0.7 ? lightMaterial : darkMaterial;
            
            // Create the rock mesh
            const rock = new THREE.Mesh(rockGeometry, material);
            
            // Position within the cluster
            const minDistance = size * 0.3; // Keep rocks close but not touching
            const maxDistance = size * 0.7;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const angle = Math.random() * Math.PI * 2;
            
            // Position mostly horizontally, not stacked too high
            rock.position.set(
                Math.cos(angle) * distance,
                -size * 0.5 + Math.random() * size * 0.3, // Position near ground with slight height variation
                Math.sin(angle) * distance
            );
            
            // Random rotation for each rock
            rock.rotation.set(
                Math.random() * 0.3, // Limited X rotation to keep rocks mostly upright
                Math.random() * Math.PI * 2,
                Math.random() * 0.3  // Limited Z rotation
            );
            
            // Add shadows
            rock.castShadow = true;
            rock.receiveShadow = true;
            
            // Add to the rock cluster
            rockGroup.add(rock);
        }
        
        // For larger clusters, add a few small detail rocks around the edge
        if (baseSize > 1.5) {
            for (let i = 0; i < 5; i++) {
                const detailSize = baseSize * 0.2;
                const detailGeometry = new THREE.SphereGeometry(detailSize, 8, 8);
                
                // Apply random noise to detail rocks too
                const positions = detailGeometry.attributes.position;
                for (let j = 0; j < positions.count; j++) {
                    const x = positions.getX(j);
                    const y = positions.getY(j);
                    const z = positions.getZ(j);
                    
                    // Add minor noise
                    positions.setX(j, x * (0.8 + Math.random() * 0.4));
                    positions.setY(j, y * (0.8 + Math.random() * 0.4));
                    positions.setZ(j, z * (0.8 + Math.random() * 0.4));
                }
                
                detailGeometry.computeVertexNormals();
                
                // Choose material - use dark material more often for small rocks
                const material = Math.random() < 0.3 ? lightMaterial : darkMaterial;
                const detailRock = new THREE.Mesh(detailGeometry, material);
                
                // Position around the main cluster
                const distance = baseSize * (1 + Math.random() * 0.5);
                const angle = Math.random() * Math.PI * 2;
                
                detailRock.position.set(
                    Math.cos(angle) * distance,
                    -detailSize * 0.5, // Place at ground level
                    Math.sin(angle) * distance
                );
                
                detailRock.castShadow = true;
                detailRock.receiveShadow = true;
                
                rockGroup.add(detailRock);
            }
        }
        
        return rockGroup;
    }
    
    // Public method to get ground height at a specific position
    getGroundHeightAt(x, z) {
        // Get height from ground - directly as a number
        const groundHeight = this.ground.getHeightAt(x, z);
        
        // If track exists, check if point is on track and use track height if needed
        if (this.track && this.track.getHeightAt) {
            const trackData = this.track.getHeightAt(x, z);
            
            if (trackData && typeof trackData === 'object' && trackData.onTrack) {
                // Point is on track, use track height
                return trackData.height;
            }
        }
        
        // Point is not on track, use ground height
        return groundHeight;
    }
    
    // Public method to set time of day
    setTimeOfDay(timeValue) {
        if (this.sky) {
            this.sky.setTimeOfDay(timeValue);
        }
    }
    
    // Toggle day-night cycle
    toggleDayNightCycle() {
        if (this.sky) {
            this.sky.dayNightCycle = !this.sky.dayNightCycle;
            return this.sky.dayNightCycle;
        }
        return false;
    }
    
    update(deltaTime, camera) {
        // Update time for sky animation
        this.time += deltaTime * 1000; // Convert to milliseconds for the sky shader
        
        // Store camera for future updates if needed
        if (camera) {
            this.currentCamera = camera;
        }
        
        // Pass camera to sky for lens flare and sun positioning
        if (this.currentCamera) {
            this.sky.update(this.time, this.currentCamera);
        } else {
            this.sky.update(this.time);
        }
        
        // Get the current time of day from the sky
        const timeOfDay = this.sky.timeOfDay;
        
        // Update track lighting (street lamps) based on time of day
        if (this.trackLighting) {
            this.trackLighting.update(timeOfDay);
        }
        
        // Update dynamic lighting based on time of day
        this.updateDynamicLighting(timeOfDay);
        
        // Update fog color based on time of day if sky exists
        if (this.sky && this.scene.scene.fog) {
            // Different fog colors for different times of day
            let fogColor;
            
            if (timeOfDay < 0.3) {
                // Morning - light blue
                fogColor = new THREE.Color(0xD4E0ED);
            } else if (timeOfDay < 0.45) {
                // Day to sunset transition - blend
                const blend = (timeOfDay - 0.3) / 0.15;
                fogColor = new THREE.Color(0xD4E0ED).lerp(new THREE.Color(0xE0B080), blend);
            } else if (timeOfDay < 0.55) {
                // Sunset - orange-ish
                fogColor = new THREE.Color(0xE0B080);
            } else if (timeOfDay < 0.85) {
                // Night - dark blue
                fogColor = new THREE.Color(0x0A1025);
            } else if (timeOfDay < 0.95) {
                // Dawn - purple-ish to light blue
                const blend = (timeOfDay - 0.85) / 0.1;
                fogColor = new THREE.Color(0x0A1025).lerp(new THREE.Color(0xB9C4DB), blend);
            } else {
                // Dawn to day - light blue
                const blend = (timeOfDay - 0.95) / 0.05;
                fogColor = new THREE.Color(0xB9C4DB).lerp(new THREE.Color(0xD4E0ED), blend);
            }
            
            // Update fog color
            this.scene.scene.fog.color = fogColor;
            
            // Adjust fog density based on time (thicker at night, clearer during day)
            const baseDensity = 0.0025;
            
            // Increase fog at night, decrease during day
            if (timeOfDay > 0.55 && timeOfDay < 0.95) {
                // More fog at night
                this.scene.scene.fog.density = baseDensity * 1.5;
            } else {
                // Normal fog during day
                this.scene.scene.fog.density = baseDensity;
            }
        }
    }
    
    // Handle dynamic lighting based on time of day
    updateDynamicLighting(timeOfDay) {
        // Update scene lighting based on time of day via scene lighting system
        if (this.scene.updateLighting) {
            this.scene.updateLighting(timeOfDay);
        }
        
        // Ensure we have access to the THREE.Scene
        if (!this.scene.scene) return;
        
        // Find and update ambient and directional lights in the scene
        this.scene.scene.traverse((object) => {
            // Update ambient light color and intensity based on time of day
            if (object.isAmbientLight) {
                if (timeOfDay < 0.3) {
                    // Morning - bright ambient
                    object.color.set(0x8099BB);
                    object.intensity = 0.8;
                } else if (timeOfDay < 0.45) {
                    // Day to sunset transition - warm
                    const blend = (timeOfDay - 0.3) / 0.15;
                    object.color.set(0x8099BB).lerp(new THREE.Color(0xE0B080), blend);
                    object.intensity = 0.8;
                } else if (timeOfDay < 0.55) {
                    // Sunset - warm orange ambient
                    object.color.set(0xE0B080);
                    object.intensity = 0.7;
                } else if (timeOfDay < 0.85) {
                    // Night - dark blue ambient
                    object.color.set(0x0A1025);
                    object.intensity = 0.4; // Lower intensity at night
                } else if (timeOfDay < 0.95) {
                    // Dawn - purple-ish to light blue
                    const blend = (timeOfDay - 0.85) / 0.1;
                    object.color.set(0x0A1025).lerp(new THREE.Color(0xB9C4DB), blend);
                    object.intensity = 0.5 + blend * 0.3; // Gradually increase intensity
                } else {
                    // Dawn to day - light blue
                    const blend = (timeOfDay - 0.95) / 0.05;
                    object.color.set(0xB9C4DB).lerp(new THREE.Color(0x8099BB), blend);
                    object.intensity = 0.8;
                }
            }
            
            // Update directional light (sun/moon light) based on time of day
            if (object.isDirectionalLight) {
                if (timeOfDay < 0.3) {
                    // Morning - bright, slightly yellow
                    object.color.set(0xFFFBED);
                    object.intensity = 1.0;
                } else if (timeOfDay < 0.45) {
                    // Day to sunset transition - increasingly orange
                    const blend = (timeOfDay - 0.3) / 0.15;
                    object.color.set(0xFFFBED).lerp(new THREE.Color(0xFFAA55), blend);
                    object.intensity = 1.0;
                } else if (timeOfDay < 0.55) {
                    // Sunset - orange directional light
                    object.color.set(0xFFAA55);
                    object.intensity = 0.8;
                } else if (timeOfDay < 0.85) {
                    // Night - very dim blue light (moonlight)
                    object.color.set(0x8080FF);
                    object.intensity = 0.15; // Very low intensity at night
                } else if (timeOfDay < 0.95) {
                    // Dawn - purple to yellow transition
                    const blend = (timeOfDay - 0.85) / 0.1;
                    object.color.set(0x8080FF).lerp(new THREE.Color(0xFFC066), blend);
                    object.intensity = 0.15 + blend * 0.85; // Gradually increase intensity
                } else {
                    // Dawn to day - orange to white
                    const blend = (timeOfDay - 0.95) / 0.05;
                    object.color.set(0xFFC066).lerp(new THREE.Color(0xFFFBED), blend);
                    object.intensity = 1.0;
                }
            }
        });
    }
}

export default Environment;