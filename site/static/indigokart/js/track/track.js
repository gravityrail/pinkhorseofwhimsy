import * as THREE from 'three';
import { bezierPoint, calculateCurvature } from '../utils/bezier.js';
import { noise } from '../utils/math.js';
import { trackControlPoints, roughSections, maxBankingAngle, jumpRamps, TRACK_PHYSICS } from './track-config.js';

class Track {
    // EMERGENCY FIX: Don't use static textures to avoid exceeding WebGL texture limits
    // We'll use solid colors instead for track, edge, and ramps
    
    constructor(scene) {
        this.scene = scene;
        
        // Store a reference to the environment if it's available
        if (scene.environment) {
            this.environment = scene.environment;
        }
        
        // Initialize shared textures if needed
        this.initializeSharedTextures();
        
        // Ensure first point = last point for perfect continuity
        this.prepareControlPoints();
        
        // Generate track points from Bezier curve
        this.trackPointsCount = 400; // More points for smoother track
        this.trackPoints = [];
        this.generateTrackPoints();
        
        // Process jump ramps
        this.jumpRamps = [];
        this.processJumpRamps();
        
        // Create the track mesh
        this.trackMesh = this.createTrack();
        this.scene.add(this.trackMesh);
        
        // Create jump ramps
        this.createJumpRamps();
    }
    
    // Initialize shared textures
    initializeSharedTextures() {
        // Placeholder for potential texture initialization
        // We aren't using custom textures for the track yet, but
        // adding this method for future-proofing
        console.log("Track textures initialized");
    }
    
    prepareControlPoints() {
        // Make a copy to avoid modifying the original
        this.controlPoints = [...trackControlPoints];
        
        // Enforce First point = Last point for perfect continuity
        const lastIndex = this.controlPoints.length - 1;
        this.controlPoints[lastIndex].x = this.controlPoints[0].x;
        this.controlPoints[lastIndex].z = this.controlPoints[0].z;
        this.controlPoints[lastIndex].width = this.controlPoints[0].width;
    }
    
    generateTrackPoints() {
        // Generate points for each Bezier segment
        for (let i = 0; i < this.controlPoints.length; i += 4) {
            const p0 = this.controlPoints[i];
            const p1 = this.controlPoints[i + 1];
            const p2 = this.controlPoints[i + 2];
            const p3 = this.controlPoints[i + 3];
            
            // Number of points to generate for this segment
            const pointsPerSegment = this.trackPointsCount / (this.controlPoints.length / 4);
            
            // Calculate segment index and total segments for roughness section calculation
            const segmentIndex = i / 4;
            const totalSegments = this.controlPoints.length / 4;
            
            for (let j = 0; j < pointsPerSegment; j++) {
                const t = j / pointsPerSegment;
                
                // Skip the last point of each segment except the final one to avoid duplicates
                if (j === pointsPerSegment - 1 && i < this.controlPoints.length - 4) {
                    continue;
                }
                
                // Calculate point on Bezier curve
                const point = bezierPoint(p0, p1, p2, p3, t);
                
                // Calculate curvature
                const curvature = calculateCurvature(p0, p1, p2, p3, t);
                
                // Scale curvature to banking angle (subtle banking proportional to curvature)
                // We'll use a sigmoid function to ensure banking is always reasonable
                const bankingScale = maxBankingAngle; // Max banking in radians
                const banking = bankingScale * Math.tanh(curvature * 20); // Tanh limits to [-1, 1] range
                
                // Interpolate roughness from control points
                const roughnessValue = 
                    (1 - t) * (1 - t) * (1 - t) * p0.roughness +
                    3 * (1 - t) * (1 - t) * t * p1.roughness +
                    3 * (1 - t) * t * t * p2.roughness +
                    t * t * t * p3.roughness;
                
                // Calculate position along the track as percentage (0-1)
                const trackPercentage = (segmentIndex + t) / totalSegments;
                
                // Check if this point is in a defined rough section
                let additionalRoughness = 0;
                for (const section of roughSections) {
                    if (trackPercentage >= section.start && trackPercentage <= section.end) {
                        // Calculate intensity based on position within section (peak in middle)
                        const sectionPos = (trackPercentage - section.start) / (section.end - section.start);
                        const intensity = section.intensity * Math.sin(sectionPos * Math.PI);
                        additionalRoughness = Math.max(additionalRoughness, intensity);
                        break;
                    }
                }
                
                // Calculate total roughness
                const totalRoughness = roughnessValue + additionalRoughness;
                
                // Generate elevation variation based on roughness
                const bumpHeight = totalRoughness > 0 ? 
                    noise(point.x, point.z, 0.8, 0.15 * totalRoughness) : 0;
                    
                // Add point to track
                this.trackPoints.push({
                    x: point.x,
                    z: point.z,
                    width: point.width,
                    banking: Math.abs(banking), // Just store magnitude, sign will be determined by direction
                    bumpHeight: bumpHeight,
                    roughness: totalRoughness
                });
            }
        }
        
        // Smooth the track connection
        this.smoothTrackConnection();
    }
    
    smoothTrackConnection() {
        if (this.trackPoints.length < 2) return;
        
        // First ensure the first and last point are at the exact same location
        const firstPoint = this.trackPoints[0];
        const lastPoint = this.trackPoints[this.trackPoints.length - 1];
        
        // Force exact position match for last point
        lastPoint.x = firstPoint.x;
        lastPoint.z = firstPoint.z;
        lastPoint.width = firstPoint.width;
        lastPoint.banking = firstPoint.banking;
        
        // Now ensure a smooth gradient between the beginning and end of the track
        // We'll blend several points from each end to ensure a smooth transition
        const numBlendPoints = 6; // More points for smoother blending
        
        // Get a smooth transition from end to beginning
        for (let i = 1; i <= numBlendPoints; i++) {
            // Get points from both ends for blending
            const endPoint = this.trackPoints[this.trackPoints.length - 1 - i];
            const startPoint = this.trackPoints[i];
            
            // Calculate blend factor (more weight to closest points)
            const t = i / (numBlendPoints + 1);
            
            // Create intermediate banking and width values
            const blendedBanking = (endPoint.banking + startPoint.banking) / 2;
            const blendedWidth = (endPoint.width + startPoint.width) / 2;
            
            // Apply blended values with more influence toward their own side
            endPoint.banking = endPoint.banking * (1 - t) + blendedBanking * t;
            startPoint.banking = startPoint.banking * (1 - t) + blendedBanking * t;
            
            endPoint.width = endPoint.width * (1 - t) + blendedWidth * t;
            startPoint.width = startPoint.width * (1 - t) + blendedWidth * t;
        }
    }
    
    // Create track texture with skid marks and details
    createTrackTexture() {
        // Create a canvas for the texture
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext('2d');
        
        // Fill with base asphalt color
        context.fillStyle = '#444444';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add noise for asphalt texture
        this.addAsphaltTexture(context, canvas.width, canvas.height);
        
        // Add skid marks and wear patterns
        this.addSkidMarks(context, canvas.width, canvas.height);
        
        // Add dirt and grime near edges
        this.addTrackDirt(context, canvas.width, canvas.height);
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Set texture properties
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 1);
        
        return texture;
    }
    
    // Add realistic asphalt texture
    addAsphaltTexture(context, width, height) {
        // Add noise for asphalt texture
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = 0.5 + Math.random() * 2;
            
            // Vary the color slightly for realistic asphalt look
            const shade = 60 + Math.floor(Math.random() * 20);
            context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Add larger aggregate patches
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = 2 + Math.random() * 4;
            
            // Lighter patches for aggregate
            const shade = 80 + Math.floor(Math.random() * 20);
            context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    // Add skid marks to track
    addSkidMarks(context, width, height) {
        const skidCount = 15;
        context.globalAlpha = 0.2;
        
        // Create random skid marks
        for (let i = 0; i < skidCount; i++) {
            // Starting position
            const startX = width * 0.1 + Math.random() * width * 0.8;
            const startY = Math.random() * height;
            
            // Control points for curve
            const cp1x = startX + (Math.random() * 100 - 50);
            const cp1y = startY + (Math.random() * 100 - 50);
            const cp2x = startX + (Math.random() * 200 - 100);
            const cp2y = startY + (Math.random() * 200 - 100);
            const endX = startX + (Math.random() * 300 - 150);
            const endY = startY + (Math.random() * 300 - 150);
            
            // Width of skid mark
            const skidWidth = 3 + Math.random() * 6;
            
            // Draw the curve
            context.strokeStyle = '#000000';
            context.lineWidth = skidWidth;
            context.beginPath();
            context.moveTo(startX, startY);
            context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            context.stroke();
        }
        
        // Create some intense skid marks at corners
        const cornerSkidCount = 5;
        context.globalAlpha = 0.5;
        
        for (let i = 0; i < cornerSkidCount; i++) {
            const startX = width * 0.2 + Math.random() * width * 0.6;
            const startY = Math.random() * height;
            
            // Create a more aggressive curve for corner skids
            const angle = Math.random() * Math.PI;
            const length = 50 + Math.random() * 100;
            
            // Draw multiple curved lines for more intense skid
            for (let j = 0; j < 3; j++) {
                const offset = j * 3;
                context.strokeStyle = '#000000';
                context.lineWidth = 2 + Math.random() * 2;
                context.beginPath();
                context.moveTo(startX, startY + offset);
                
                // Draw S-curve
                context.bezierCurveTo(
                    startX + length * 0.3, startY + offset + length * 0.3, 
                    startX + length * 0.7, startY + offset - length * 0.3, 
                    startX + length, startY + offset
                );
                context.stroke();
            }
        }
        
        // Reset alpha
        context.globalAlpha = 1.0;
    }
    
    // Add dirt and grime near track edges
    addTrackDirt(context, width, height) {
        context.globalAlpha = 0.3;
        
        // Draw dirt along the edges
        for (let i = 0; i < 2000; i++) {
            // Position near edges
            const edge = Math.random() < 0.5 ? 0 : 1;
            const x = edge === 0 ? 
                Math.random() * width * 0.2 : 
                width * 0.8 + Math.random() * width * 0.2;
            const y = Math.random() * height;
            
            // Random dirt specs
            const size = 1 + Math.random() * 3;
            
            // Brown/gray dirt colors
            const r = 70 + Math.floor(Math.random() * 40);
            const g = 60 + Math.floor(Math.random() * 30);
            const b = 40 + Math.floor(Math.random() * 20);
            
            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Reset alpha
        context.globalAlpha = 1.0;
    }
    
    createTrack() {
        // Create parent group
        const trackGroup = new THREE.Group();
        
        // Create track texture
        const trackTexture = this.createTrackTexture();
        
        // Create materials for track with textures for better realism
        const trackSurfaceMaterial = new THREE.MeshStandardMaterial({
            map: trackTexture,
            color: 0x666666, // Base color
            roughness: 0.8,
            metalness: 0.1,
            flatShading: false
        });
        
        const trackEdgeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White edge
            roughness: 0.7,
            metalness: 0.0,
            emissive: 0x333333, // Slight glow for visibility
            emissiveIntensity: 0.2
        });
        
        const centerLineMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00, // Yellow center line
            roughness: 0.7,
            metalness: 0.0,
            emissive: 0x444400, // Slight glow for visibility
            emissiveIntensity: 0.1
        });
        
        // Create track surface with banking
        const trackSurface = this.createTrackSurface(trackSurfaceMaterial);
        trackGroup.add(trackSurface);
        
        // Create track edges
        this.createTrackEdges(trackGroup, trackEdgeMaterial);
        
        // Create center line dashes
        this.createCenterLine(trackGroup, centerLineMaterial);
        
        return trackGroup;
    }
    
    createTrackSurface(material) {
        // For a smooth track, we'll create a continuous surface using a single geometry
        const vertices = [];
        const indices = [];
        const normals = [];
        const uvs = [];
        
        // Process track points to generate a continuous surface
        for (let i = 0; i < this.trackPoints.length; i++) {
            // Get current point and next point with wrapping
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % this.trackPoints.length];
            
            // Get previous point for calculating direction
            const prevPoint = this.trackPoints[(i - 1 + this.trackPoints.length) % this.trackPoints.length];
            
            // Get tangent direction at this point
            const tangentX = p2.x - prevPoint.x;
            const tangentZ = p2.z - prevPoint.z;
            
            // Normalize tangent
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
            const normTangentX = tangentX / tangentLength;
            const normTangentZ = tangentZ / tangentLength;
            
            // Perpendicular vector to the tangent
            const perpX = -normTangentZ;
            const perpZ = normTangentX;
            
            // Calculate next point for turning direction
            const nextPoint = this.trackPoints[(i + 2) % this.trackPoints.length];
            
            // Calculate turn direction
            const prevSegX = p1.x - prevPoint.x;
            const prevSegZ = p1.z - prevPoint.z;
            const nextSegX = nextPoint.x - p2.x;
            const nextSegZ = nextPoint.z - p2.z;
            const crossProduct = prevSegX * nextSegZ - prevSegZ * nextSegX;
            const turnDirection = Math.sign(crossProduct);
            
            // Apply banking in the correct direction
            // Use the same sign as the turn direction for inward banking
            const bankingSign = Math.sign(turnDirection);
            const bankingRadians = bankingSign * p1.banking;
            
            // Calculate banking height offsets
            const halfWidth = p1.width / 2;
            const bankHeight = Math.sin(bankingRadians) * halfWidth;
            
            // Get terrain height at this position
            let terrainHeight = 0;
            
            // Try to get terrain height from environment
            if (this.environment && this.environment.ground) {
                try {
                    const groundHeight = this.environment.ground.getHeightAt(p1.x, p1.z);
                    if (typeof groundHeight === 'number') {
                        terrainHeight = groundHeight;
                    } else if (typeof groundHeight === 'object' && groundHeight !== null) {
                        terrainHeight = groundHeight.height || 0;
                    }
                } catch (e) {
                    // If any error, use 0
                    terrainHeight = 0;
                }
            }
            
            // Calculate elevation adjustment
            const baseOffset = 0.3; // Raise track above terrain
            let elevationNeeded = 0;
            if (p1.banking > 0.001) {
                elevationNeeded = Math.abs(bankHeight);
            }
            
            // Base Y value including terrain height, banking elevation and bump height
            const baseY = terrainHeight + baseOffset + elevationNeeded + p1.bumpHeight;
            
            // Calculate the left edge of the track with banking
            const leftX1 = p1.x - perpX * halfWidth;
            const leftZ1 = p1.z - perpZ * halfWidth;
            
            // Get terrain height at left edge
            let leftTerrainHeight = terrainHeight;
            if (this.environment && this.environment.ground) {
                try {
                    const leftGroundHeight = this.environment.ground.getHeightAt(leftX1, leftZ1);
                    if (typeof leftGroundHeight === 'number') {
                        leftTerrainHeight = leftGroundHeight;
                    } else if (typeof leftGroundHeight === 'object' && leftGroundHeight !== null) {
                        leftTerrainHeight = leftGroundHeight.height || 0;
                    }
                } catch (e) {
                    // If any error, keep center height
                }
            }
            
            // Left side Y includes banking tilt and terrain height
            const leftY1 = Math.max(leftTerrainHeight + baseOffset, baseY - Math.sin(bankingRadians) * halfWidth);
            
            // Calculate the right edge with banking
            const rightX1 = p1.x + perpX * halfWidth;
            const rightZ1 = p1.z + perpZ * halfWidth;
            
            // Get terrain height at right edge
            let rightTerrainHeight = terrainHeight;
            if (this.environment && this.environment.ground) {
                try {
                    const rightGroundHeight = this.environment.ground.getHeightAt(rightX1, rightZ1);
                    if (typeof rightGroundHeight === 'number') {
                        rightTerrainHeight = rightGroundHeight;
                    } else if (typeof rightGroundHeight === 'object' && rightGroundHeight !== null) {
                        rightTerrainHeight = rightGroundHeight.height || 0;
                    }
                } catch (e) {
                    // If any error, keep center height
                }
            }
            
            // Right side Y includes banking tilt in opposite direction and terrain height
            const rightY1 = Math.max(rightTerrainHeight + baseOffset, baseY + Math.sin(bankingRadians) * halfWidth);
            
            // Add vertices for this segment
            const vertBase = vertices.length / 3;
            
            // Left vertex for current point
            vertices.push(leftX1, leftY1, leftZ1);
            
            // Right vertex for current point
            vertices.push(rightX1, rightY1, rightZ1);
            
            // If this is not the last point, add a triangle
            if (i < this.trackPoints.length - 1) {
                // Create two triangles for this quad segment
                indices.push(
                    vertBase, vertBase + 1, vertBase + 2,
                    vertBase + 2, vertBase + 1, vertBase + 3
                );
            }
            
            // Calculate normal based on banking angle
            const normalX = -Math.sin(bankingRadians) * perpX;
            const normalY = Math.cos(bankingRadians);
            const normalZ = -Math.sin(bankingRadians) * perpZ;
            
            // Add normals
            normals.push(normalX, normalY, normalZ);
            normals.push(normalX, normalY, normalZ);
            
            // Add UV coordinates based on track percentage
            const trackPercent = i / this.trackPoints.length;
            uvs.push(0, trackPercent);  // Left edge
            uvs.push(1, trackPercent);  // Right edge
        }
        
        // Create the final vertices for the last-to-first segment connection
        // Use the first points' vertices again
        vertices.push(vertices[0], vertices[1], vertices[2]);  // First left vertex
        vertices.push(vertices[3], vertices[4], vertices[5]);  // First right vertex
        
        // Add normals for the connecting vertices
        normals.push(normals[0], normals[1], normals[2]);
        normals.push(normals[3], normals[4], normals[5]);
        
        // Add UVs for the connecting vertices
        uvs.push(0, 1);  // Left edge, end of track
        uvs.push(1, 1);  // Right edge, end of track
        
        // Create track surface geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        // Create the track mesh
        const trackMesh = new THREE.Mesh(geometry, material);
        trackMesh.receiveShadow = true;
        trackMesh.castShadow = true;
        
        return trackMesh;
    }
    
    createTrackEdges(parentGroup, material) {
        // Add white edge markings along both sides of the track
        const edgeWidth = 0.2;
        
        // Process track points to create edge markings
        for (let i = 0; i < this.trackPoints.length; i++) {
            // Get current point and next point with wrapping
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % this.trackPoints.length];
            
            // Get previous point for calculating direction
            const prevPoint = this.trackPoints[(i - 1 + this.trackPoints.length) % this.trackPoints.length];
            
            // Get tangent direction at this point
            const tangentX = p2.x - prevPoint.x;
            const tangentZ = p2.z - prevPoint.z;
            
            // Normalize tangent
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
            const normTangentX = tangentX / tangentLength;
            const normTangentZ = tangentZ / tangentLength;
            
            // Perpendicular vector to the tangent
            const perpX = -normTangentZ;
            const perpZ = normTangentX;
            
            // Skip some points for better performance
            if (i % 4 !== 0 && i !== this.trackPoints.length - 1) continue;
            
            // Calculate next point for turning direction
            const nextPoint = this.trackPoints[(i + 2) % this.trackPoints.length];
            
            // Calculate turn direction
            const prevSegX = p1.x - prevPoint.x;
            const prevSegZ = p1.z - prevPoint.z;
            const nextSegX = nextPoint.x - p2.x;
            const nextSegZ = nextPoint.z - p2.z;
            const crossProduct = prevSegX * nextSegZ - prevSegZ * nextSegX;
            const turnDirection = Math.sign(crossProduct);
            
            // Apply banking in the correct direction
            const bankingSign = Math.sign(turnDirection);
            const bankingRadians = bankingSign * p1.banking;
            
            // Calculate banking height offsets
            const halfWidth = p1.width / 2;
            const bankHeight = Math.sin(bankingRadians) * halfWidth;
            
            // Calculate elevation adjustment
            const baseElevation = 0.05; // Base track height
            let elevationNeeded = 0;
            if (p1.banking > 0.001) {
                elevationNeeded = Math.abs(bankHeight);
            }
            
            // Base Y value including banking elevation and bump height
            const baseY = baseElevation + elevationNeeded + p1.bumpHeight;
            
            // Calculate the left edge of the track with banking
            const leftEdgeX = p1.x - perpX * (halfWidth);
            const leftEdgeZ = p1.z - perpZ * (halfWidth);
            // Left side Y includes banking tilt
            const leftEdgeY = baseY - Math.sin(bankingRadians) * halfWidth;
            
            // Calculate the right edge with banking
            const rightEdgeX = p1.x + perpX * (halfWidth);
            const rightEdgeZ = p1.z + perpZ * (halfWidth);
            // Right side Y includes banking tilt in opposite direction
            const rightEdgeY = baseY + Math.sin(bankingRadians) * halfWidth;
            
            // Create edge markings
            this.createEdgeMarking(leftEdgeX, leftEdgeY, leftEdgeZ, p1, 
                                   prevPoint, p2, nextPoint, -1, edgeWidth, 
                                   bankingRadians, parentGroup, material);
                                   
            this.createEdgeMarking(rightEdgeX, rightEdgeY, rightEdgeZ, p1, 
                                  prevPoint, p2, nextPoint, 1, edgeWidth, 
                                  bankingRadians, parentGroup, material);
        }
    }
    
    createEdgeMarking(edgeX, edgeY, edgeZ, p1, prevPoint, p2, nextPoint, side, width, bankingRadians, parentGroup, material) {
        // Get tangent direction at this point
        const tangentX = p2.x - prevPoint.x;
        const tangentZ = p2.z - prevPoint.z;
        
        // Normalize tangent
        const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
        const normTangentX = tangentX / tangentLength;
        const normTangentZ = tangentZ / tangentLength;
        
        // Perpendicular vector to the tangent (inward)
        const perpX = -normTangentZ * side;
        const perpZ = normTangentX * side;
        
        // Create a small quad for this edge segment
        const vertices = [];
        const indices = [0, 1, 2, 1, 3, 2]; // Two triangles
        const normals = [];
        
        // Calculate the inner point (slightly inward from edge)
        const innerX = edgeX + perpX * width;
        const innerZ = edgeZ + perpZ * width;
        // Adjust Y for slight height increase
        const innerY = edgeY + 0.01; // Slight offset to avoid z-fighting
        
        // Calculate next edge point
        const segmentLength = Math.sqrt(
            (p2.x - p1.x) * (p2.x - p1.x) + 
            (p2.z - p1.z) * (p2.z - p1.z)
        );
        
        // Only create edge marking if we have some distance to the next point
        if (segmentLength < 0.1) return;
        
        // Cap the length to avoid very long segments
        const length = Math.min(segmentLength, 1);
        
        // Calculate end points along tangent
        const endEdgeX = edgeX + normTangentX * length;
        const endEdgeZ = edgeZ + normTangentZ * length;
        const endEdgeY = edgeY; // Same height
        
        const endInnerX = innerX + normTangentX * length;
        const endInnerZ = innerZ + normTangentZ * length;
        const endInnerY = innerY; // Same height
        
        // Add vertices for the quad
        vertices.push(
            edgeX, edgeY, edgeZ,       // Outside edge start
            innerX, innerY, innerZ,    // Inside edge start
            endEdgeX, endEdgeY, endEdgeZ,    // Outside edge end
            endInnerX, endInnerY, endInnerZ  // Inside edge end
        );
        
        // Calculate normal (facing up, adjusted for banking)
        const normalX = -Math.sin(bankingRadians) * perpX;
        const normalY = Math.cos(bankingRadians);
        const normalZ = -Math.sin(bankingRadians) * perpZ;
        
        // Use same normal for all vertices
        for (let i = 0; i < 4; i++) {
            normals.push(normalX, normalY, normalZ);
        }
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setIndex(indices);
        
        // Create mesh
        const edgeMesh = new THREE.Mesh(geometry, material);
        edgeMesh.receiveShadow = true;
        parentGroup.add(edgeMesh);
    }
    
    createCenterLine(parentGroup, centerLineMaterial) {
        // Create dashed center line
        const dashLength = 1.0; // Length of each dash
        const dashSpacing = 1.0; // Space between dashes
        const dashWidth = 0.15; // Width of the dash
        
        // Process track points to create center line dashes
        for (let i = 0; i < this.trackPoints.length - 1; i++) {
            // Skip points to create dashes with proper spacing
            if (i % 6 !== 0) continue; // Adjust this value for dash density
            
            // Get current point and next point
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % this.trackPoints.length];
            
            // Get previous point for calculating direction
            const prevPoint = this.trackPoints[(i - 1 + this.trackPoints.length) % this.trackPoints.length];
            
            // Calculate distance to next point
            const segmentLength = Math.sqrt(
                (p2.x - p1.x) * (p2.x - p1.x) + 
                (p2.z - p1.z) * (p2.z - p1.z)
            );
            
            // Skip if segment is too short
            if (segmentLength < dashLength + dashSpacing) continue;
            
            // Calculate how many dashes we can fit in this segment
            const dashesPerSegment = Math.floor(segmentLength / (dashLength + dashSpacing));
            
            // Skip if we can't fit any dashes
            if (dashesPerSegment < 1) continue;
            
            // Calculate segment ratio to position the dash
            const segmentRatio = 0.5; // Place dash in the middle of the segment
            
            // Interpolate between points
            const dashCenterX = p1.x + (p2.x - p1.x) * segmentRatio;
            const dashCenterZ = p1.z + (p2.z - p1.z) * segmentRatio;
            
            // Get elevation from roughness
            const lineElevation = p1.bumpHeight * (1 - segmentRatio) + p2.bumpHeight * segmentRatio;
            
            // Get tangent direction at this point
            const tangentX = p2.x - prevPoint.x;
            const tangentZ = p2.z - prevPoint.z;
            
            // Normalize tangent
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
            const normTangentX = tangentX / tangentLength;
            const normTangentZ = tangentZ / tangentLength;
            
            // Perpendicular vector to the tangent
            const perpX = -normTangentZ;
            const perpZ = normTangentX;
            
            // Calculate banking by interpolating between points
            const bankingAmount = p1.banking * (1 - segmentRatio) + p2.banking * segmentRatio;
            
            // Calculate turn direction
            const prevSegX = p1.x - prevPoint.x;
            const prevSegZ = p1.z - prevPoint.z;
            const nextSegX = p2.x - p1.x;
            const nextSegZ = p2.z - p1.z;
            const crossProduct = prevSegX * nextSegZ - prevSegZ * nextSegX;
            const turnDirection = Math.sign(crossProduct);
            
            // Apply banking in the correct direction
            const bankingSign = Math.sign(turnDirection);
            const bankingRadians = bankingSign * bankingAmount;
            
            // Calculate banking height offsets
            const halfWidth = (p1.width * (1 - segmentRatio) + p2.width * segmentRatio) / 2;
            const bankHeight = Math.sin(bankingRadians) * halfWidth;
            
            // Calculate elevation adjustment
            const baseElevation = 0.05; // Same as track surface
            let elevationNeeded = 0;
            if (bankingAmount > 0.001) {
                elevationNeeded = Math.abs(bankHeight);
            }
            
            // Y position includes base track height plus elevation for banking plus small offset
            const y = baseElevation + elevationNeeded + lineElevation;
            
            // Create a quad for this dash
            const dashVertices = [];
            const dashIndices = [0, 2, 1, 1, 2, 3]; // Two triangles for the quad
            const dashNormals = [];
            
            // Calculate the dash endpoints in the tangent direction
            const halfDashLength = dashLength / 2;
            const startX = dashCenterX - normTangentX * halfDashLength;
            const startZ = dashCenterZ - normTangentZ * halfDashLength;
            const endX = dashCenterX + normTangentX * halfDashLength;
            const endZ = dashCenterZ + normTangentZ * halfDashLength;
            
            // Calculate the dash corners
            const halfDashWidth = dashWidth / 2;
            
            // Start - left side
            dashVertices.push(
                startX - perpX * halfDashWidth,
                y,
                startZ - perpZ * halfDashWidth
            );
            
            // Start - right side
            dashVertices.push(
                startX + perpX * halfDashWidth,
                y,
                startZ + perpZ * halfDashWidth
            );
            
            // End - left side
            dashVertices.push(
                endX - perpX * halfDashWidth,
                y,
                endZ - perpZ * halfDashWidth
            );
            
            // End - right side
            dashVertices.push(
                endX + perpX * halfDashWidth,
                y,
                endZ + perpZ * halfDashWidth
            );
            
            // Add normals (facing up, adjusted for banking)
            const normalX = -Math.sin(bankingRadians) * perpX;
            const normalY = Math.cos(bankingRadians);
            const normalZ = -Math.sin(bankingRadians) * perpZ;
            
            // Add same normal for all vertices
            for (let k = 0; k < 4; k++) {
                dashNormals.push(normalX, normalY, normalZ);
            }
            
            // Create geometry for this dash
            const dashGeometry = new THREE.BufferGeometry();
            dashGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dashVertices, 3));
            dashGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(dashNormals, 3));
            dashGeometry.setIndex(dashIndices);
            
            // Create mesh and add to parent
            const dashMesh = new THREE.Mesh(dashGeometry, centerLineMaterial);
            dashMesh.receiveShadow = true;
            parentGroup.add(dashMesh);
        }
    }
    
    // Method to check if a point is on the track
    isPointOnTrack(x, z, margin = 0) {
        // Find closest track segment
        let closestDist = Infinity;
        let onTrack = false;
        
        // Check every segment of the track
        for (let i = 0; i < this.trackPoints.length; i++) {
            // Get current point and next point
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % this.trackPoints.length];
            
            // Calculate the distance from the point to the segment
            const distToSegment = this.distanceToSegment(x, z, p1.x, p1.z, p2.x, p2.z);
            
            // Update closest distance
            if (distToSegment.distance < closestDist) {
                closestDist = distToSegment.distance;
                
                // Check if point is inside the track width (with margin)
                // Interpolate track width at this position
                const trackWidth = p1.width * (1 - distToSegment.t) + p2.width * distToSegment.t;
                const halfTrackWidth = trackWidth / 2 + margin;
                
                onTrack = closestDist <= halfTrackWidth;
            }
        }
        
        return onTrack;
    }
    
    // Helper to calculate distance from a point to a segment
    distanceToSegment(px, pz, x1, z1, x2, z2) {
        const A = px - x1;
        const B = pz - z1;
        const C = x2 - x1;
        const D = z2 - z1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let t = -1;
        
        if (lenSq !== 0) {
            t = dot / lenSq;
        }
        
        let xx, zz;
        
        if (t < 0) {
            xx = x1;
            zz = z1;
            t = 0;
        } else if (t > 1) {
            xx = x2;
            zz = z2;
            t = 1;
        } else {
            xx = x1 + t * C;
            zz = z1 + t * D;
        }
        
        const dx = px - xx;
        const dz = pz - zz;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        return { distance, t };
    }
    
    // Get the track height at a specific position
    getHeightAt(x, z) {
        // Find closest track segment
        let closestDist = Infinity;
        let height = 0;
        let onTrack = false;
        let normal = { x: 0, y: 1, z: 0 }; // Default normal is straight up
        
        // Get the terrain height first
        let terrainHeight = 0;
        
        // Check if we can access the environment
        if (this.scene && this.scene.environment && this.scene.environment.ground) {
            try {
                // Get ground height from terrain
                terrainHeight = this.scene.environment.ground.getHeightAt(x, z);
                
                // If terrain height is a number, use it directly
                if (typeof terrainHeight === 'number') {
                    // Terrain height is already set
                } else if (typeof terrainHeight === 'object' && terrainHeight !== null) {
                    // If it's an object with a height property, use that
                    terrainHeight = terrainHeight.height || 0;
                }
            } catch (e) {
                // If any error occurs, just use 0 as the default
                terrainHeight = 0;
            }
        }
        
        // Check every segment of the track
        for (let i = 0; i < this.trackPoints.length; i++) {
            // Get current point and next point
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % this.trackPoints.length];
            
            // Calculate the distance from the point to the segment
            const distToSegment = this.distanceToSegment(x, z, p1.x, p1.z, p2.x, p2.z);
            
            // Update closest distance
            if (distToSegment.distance < closestDist) {
                closestDist = distToSegment.distance;
                
                // Interpolate between the two points
                const trackWidth = p1.width * (1 - distToSegment.t) + p2.width * distToSegment.t;
                const halfTrackWidth = trackWidth / 2;
                
                // Calculate interpolated height including bump height
                const bumpHeight = p1.bumpHeight * (1 - distToSegment.t) + p2.bumpHeight * distToSegment.t;
                
                // Get banking amount
                const banking = p1.banking * (1 - distToSegment.t) + p2.banking * distToSegment.t;
                
                // Calculate tangent direction along the track
                const tangentX = p2.x - p1.x;
                const tangentZ = p2.z - p1.z;
                const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
                const normTangentX = tangentX / tangentLength;
                const normTangentZ = tangentZ / tangentLength;
                
                // Perpendicular vector to the tangent
                const perpX = -normTangentZ;
                const perpZ = normTangentX;
                
                // Calculate track segment direction for banking orientation
                const prevPoint = this.trackPoints[(i - 1 + this.trackPoints.length) % this.trackPoints.length];
                const nextPoint = this.trackPoints[(i + 2) % this.trackPoints.length];
                
                // Calculate turn direction
                const prevSegX = p1.x - prevPoint.x;
                const prevSegZ = p1.z - prevPoint.z;
                const nextSegX = nextPoint.x - p2.x;
                const nextSegZ = nextPoint.z - p2.z;
                const crossProduct = prevSegX * nextSegZ - prevSegZ * nextSegX;
                const turnDirection = Math.sign(crossProduct);
                
                // Apply banking in the correct direction
                const bankingSign = Math.sign(turnDirection);
                const bankingRadians = bankingSign * banking;
                
                // Calculate track center height at this position
                const closestX = p1.x * (1 - distToSegment.t) + p2.x * distToSegment.t;
                const closestZ = p1.z * (1 - distToSegment.t) + p2.z * distToSegment.t;
                
                // Get the terrain height at the track center position with improved elevation handling
                // Sample multiple points around the track position for more reliable terrain following
                const sampleRadius = 8.0; // Much wider sampling for comprehensive terrain coverage
                const samples = [
                    { x: closestX, z: closestZ },                   // Center
                    { x: closestX + sampleRadius, z: closestZ },    // Right
                    { x: closestX - sampleRadius, z: closestZ },    // Left
                    { x: closestX, z: closestZ + sampleRadius },    // Forward
                    { x: closestX, z: closestZ - sampleRadius }     // Back
                ];
                
                // Get heights at all sample points
                let maxSampleHeight = terrainHeight;
                if (this.scene && this.scene.environment && this.scene.environment.ground) {
                    for (const sample of samples) {
                        try {
                            const sampleHeight = this.scene.environment.ground.getHeightAt(sample.x, sample.z);
                            const heightValue = (typeof sampleHeight === 'object') ? sampleHeight.height : sampleHeight;
                            maxSampleHeight = Math.max(maxSampleHeight, heightValue || 0);
                        } catch (e) {
                            // Ignore errors in sampling
                        }
                    }
                }
                
                let trackBaseHeight = maxSampleHeight;
                
                // Add much more significant offset from terrain to prevent clipping
                const baseHeight = trackBaseHeight + 1.5; // Dramatically increased offset for guaranteed clearance
                
                // Check if point is on track
                onTrack = (closestDist <= halfTrackWidth);
                
                // If on track, height includes banking and bump effects
                if (onTrack) {
                    // Calculate normal vector adjusted for banking
                    // Start with upward normal
                    let normalX = 0;
                    let normalY = 1;
                    let normalZ = 0;
                    
                    // Calculate banking effect based on distance from center
                    const distFromCenter = closestDist;
                    const bankEffect = banking * (distFromCenter / halfTrackWidth);
                    
                    // Direction from track center to point (for determining which way to bank)
                    const dirX = x - closestX;
                    const dirZ = z - closestZ;
                    
                    // Dot product to determine if point is left or right of track
                    const dot = dirX * perpX + dirZ * perpZ;
                    const sideSign = Math.sign(dot);
                    
                    // Tilt the normal based on banking
                    // Banking is around the track direction axis
                    // We tilt the Y component towards the perpendicular vector
                    const bankingEffect = bankingRadians * sideSign * (distFromCenter / halfTrackWidth);
                    
                    // Apply banking to normal
                    normalX = -Math.sin(bankingEffect) * perpX;
                    normalY = Math.cos(bankingEffect);
                    normalZ = -Math.sin(bankingEffect) * perpZ;
                    
                    // Update normal and height
                    normal = { x: normalX, y: normalY, z: normalZ };
                    height = baseHeight + bumpHeight + bankEffect;
                } else {
                    // Off track: interpolate down to ground level (smoothly)
                    const falloffDistance = 5; // Distance at which to reach ground level
                    const t = Math.min(1, (closestDist - halfTrackWidth) / falloffDistance);
                    
                    // Smoothly transition to terrain height
                    height = baseHeight * (1 - t) + terrainHeight * t + bumpHeight * (1 - t);
                    
                    // Normal gradually returns to vertical off track
                    normal = { x: 0, y: 1, z: 0 };
                }
            }
        }
        
        return { height, onTrack, normal };
    }
    
    // Get the combined height data considering both track and ramps
    getHeightWithRamps(x, z) {
        // First get regular track height
        const trackData = this.getHeightAt(x, z);
        
        // Check if we're on any ramp
        for (const ramp of this.jumpRamps) {
            // Check if point is on this ramp
            const rampData = this.isPointOnRamp(x, z, ramp);
            
            if (rampData && rampData.onRamp) {
                // Point is on a ramp - return the ramp data which includes height and normal
                return rampData;
            }
        }
        
        // Not on any ramp, return track data
        return trackData;
    }
    
    getStartPosition() {
        if (this.trackPoints.length === 0) return { x: 0, y: 0, z: 0 };
        
        const startPoint = this.trackPoints[0];
        const { height } = this.getHeightAt(startPoint.x, startPoint.z);
        
        return {
            x: startPoint.x,
            y: height,
            z: startPoint.z
        };
    }
    
    getStartRotation() {
        if (this.trackPoints.length < 2) return 0;
        
        const p0 = this.trackPoints[0];
        const p1 = this.trackPoints[1];
        
        // Calculate direction from first to second point
        const dx = p1.x - p0.x;
        const dz = p1.z - p0.z;
        
        // Kart forward is +Z in local coordinates, rotation is around Y-axis
        const rotation = Math.atan2(dx, dz);
        
        return rotation;
    }
    
    getTrackPoints() {
        return this.trackPoints;
    }
    
    // Process jump ramp definitions to position them on the track
    processJumpRamps() {
        // Process each ramp from the config
        jumpRamps.forEach(rampConfig => {
            // Find the track position for this ramp
            const trackIndex = Math.floor(rampConfig.trackPosition * this.trackPoints.length);
            const trackPoint = this.trackPoints[trackIndex];
            
            if (!trackPoint) {
                console.error("Invalid track position for ramp:", rampConfig);
                return;
            }
            
            // Get the next point for direction
            const nextTrackIndex = (trackIndex + 1) % this.trackPoints.length;
            const nextTrackPoint = this.trackPoints[nextTrackIndex];
            
            // Calculate tangent direction
            const tangentX = nextTrackPoint.x - trackPoint.x;
            const tangentZ = nextTrackPoint.z - trackPoint.z;
            
            // Normalize tangent
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
            const normTangentX = tangentX / tangentLength;
            const normTangentZ = tangentZ / tangentLength;
            
            // Perpendicular vector (for positioning offset from center)
            const perpX = -normTangentZ;
            const perpZ = normTangentX;
            
            // Calculate center position with offset
            const halfWidth = trackPoint.width / 2;
            const offsetDistance = halfWidth * rampConfig.offset;
            
            const centerX = trackPoint.x + perpX * offsetDistance;
            const centerZ = trackPoint.z + perpZ * offsetDistance;
            
            // Determine ramp width
            const rampWidth = trackPoint.width * rampConfig.width;
            
            // Create ramp object with calculated properties
            const ramp = {
                ...rampConfig,
                centerX,
                centerZ,
                tangentX: normTangentX,
                tangentZ: normTangentZ,
                perpX,
                perpZ,
                rampWidth,
                trackPointIndex: trackIndex
            };
            
            this.jumpRamps.push(ramp);
        });
    }
    
    // Create 3D meshes for the jump ramps
    createJumpRamps() {
        // Create materials for ramps with better visual quality
        const rampMaterial = new THREE.MeshStandardMaterial({
            color: 0x22AAFF, // Blue ramp
            roughness: 0.6,
            metalness: 0.3,
            flatShading: false,
            // Add slight emissive glow for better visibility
            emissive: 0x0044AA,
            emissiveIntensity: 0.2
        });
        
        const rampEdgeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFCC00, // Yellow warning edges
            roughness: 0.5,
            metalness: 0.2,
            // Add emissive glow for better visibility
            emissive: 0x664400,
            emissiveIntensity: 0.3
        });
        
        // Create a mesh for each ramp
        this.jumpRamps.forEach(ramp => {
            const rampGroup = new THREE.Group();
            
            // Create main ramp shape
            this.createRampMesh(ramp, rampGroup, rampMaterial, rampEdgeMaterial);
            
            // Add to scene
            this.scene.add(rampGroup);
        });
    }
    
    // Create the geometry for a single ramp
    createRampMesh(ramp, parentGroup, rampMaterial, edgeMaterial) {
        // Calculate ramp dimensions
        const halfWidth = ramp.rampWidth / 2;
        const halfLength = ramp.length / 2;
        
        // Vertices for the ramp surface (as triangle strip)
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        // Number of segments along the ramp length
        const segments = 10;
        
        // Create the ramp mesh (customized shape rather than a standard primitive)
        for (let i = 0; i <= segments; i++) {
            // Position along the ramp (0 at start, 1 at end)
            const t = i / segments;
            
            // Distance from ramp center along the track direction
            const lengthOffset = (t - 0.5) * ramp.length;
            
            // Height at this position (parabolic curve)
            // 0 at start, peak at middle, 0 at end
            const heightFactor = 1 - Math.pow(2 * t - 1, 2);
            const height = ramp.height * heightFactor;
            
            // Position in world space
            const posX = ramp.centerX + ramp.tangentX * lengthOffset;
            const posZ = ramp.centerZ + ramp.tangentZ * lengthOffset;
            
            // Create two vertices for this segment (left and right of center)
            const leftX = posX - ramp.perpX * halfWidth;
            const leftZ = posZ - ramp.perpZ * halfWidth;
            
            const rightX = posX + ramp.perpX * halfWidth;
            const rightZ = posZ + ramp.perpZ * halfWidth;
            
            // Base Y is track height plus ramp height
            const { height: trackHeight } = this.getHeightAt(posX, posZ);
            const y = trackHeight + height;
            
            // Add vertices
            // Left vertex
            vertices.push(leftX, y, leftZ);
            
            // Right vertex
            vertices.push(rightX, y, rightZ);
            
            // Calculate normal vector (perpendicular to ramp surface)
            // Since the ramp slopes up and then down, we need to calculate
            // the normal based on the slope at this point
            
            // Calculate tangent to the ramp curve
            const slopeAngle = Math.atan2(
                ramp.height * (1 - 2 * Math.abs(t - 0.5)) * Math.sign(t - 0.5),
                ramp.length / segments
            );
            
            // Normal is perpendicular to both the slope and the width
            const normalY = Math.cos(slopeAngle);
            const normalX = -Math.sin(slopeAngle) * ramp.tangentX;
            const normalZ = -Math.sin(slopeAngle) * ramp.tangentZ;
            
            // Add normals (same for both vertices in this segment)
            normals.push(normalX, normalY, normalZ);
            normals.push(normalX, normalY, normalZ);
            
            // Add UVs
            uvs.push(0, t);  // Left edge
            uvs.push(1, t);  // Right edge
            
            // Add indices for triangles (2 triangles per segment)
            if (i < segments) {
                const baseIndex = i * 2;
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex + 1, baseIndex + 3, baseIndex + 2
                );
            }
        }
        
        // Create geometry for the ramp
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        // Create mesh and add to parent
        const rampMesh = new THREE.Mesh(geometry, rampMaterial);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        parentGroup.add(rampMesh);
        
        // Add edge highlights
        this.addRampEdges(ramp, parentGroup, edgeMaterial);
    }
    
    // Add edge highlights to the ramp
    addRampEdges(ramp, parentGroup, edgeMaterial) {
        const halfWidth = ramp.rampWidth / 2;
        const segments = 10;
        const edgeWidth = 0.2;
        
        // Create geometry for left and right edges
        for (let side = -1; side <= 1; side += 2) { // -1 = left, 1 = right
            const edgeVertices = [];
            const edgeNormals = [];
            const edgeIndices = [];
            
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const lengthOffset = (t - 0.5) * ramp.length;
                const heightFactor = 1 - Math.pow(2 * t - 1, 2);
                const height = ramp.height * heightFactor;
                
                // Position in world space
                const posX = ramp.centerX + ramp.tangentX * lengthOffset;
                const posZ = ramp.centerZ + ramp.tangentZ * lengthOffset;
                
                // Edge position
                const edgeX = posX + ramp.perpX * side * halfWidth;
                const edgeZ = posZ + ramp.perpZ * side * halfWidth;
                
                // Inner edge position
                const innerX = edgeX - ramp.perpX * side * edgeWidth;
                const innerZ = edgeZ - ramp.perpZ * side * edgeWidth;
                
                // Base Y is track height plus ramp height
                const { height: trackHeight } = this.getHeightAt(posX, posZ);
                const y = trackHeight + height + 0.01; // Slight Y offset to avoid z-fighting
                
                // Add vertices for this segment
                edgeVertices.push(
                    edgeX, y, edgeZ,       // Outer edge
                    innerX, y, innerZ      // Inner edge
                );
                
                // Use the same normal for both vertices
                const slopeAngle = Math.atan2(
                    ramp.height * (1 - 2 * Math.abs(t - 0.5)) * Math.sign(t - 0.5),
                    ramp.length / segments
                );
                const normalY = Math.cos(slopeAngle);
                const normalX = -Math.sin(slopeAngle) * ramp.tangentX;
                const normalZ = -Math.sin(slopeAngle) * ramp.tangentZ;
                
                edgeNormals.push(normalX, normalY, normalZ);
                edgeNormals.push(normalX, normalY, normalZ);
                
                // Add indices for triangles
                if (i < segments) {
                    const baseIdx = i * 2;
                    edgeIndices.push(
                        baseIdx, baseIdx + 1, baseIdx + 2,
                        baseIdx + 1, baseIdx + 3, baseIdx + 2
                    );
                }
            }
            
            // Create edge geometry
            const edgeGeometry = new THREE.BufferGeometry();
            edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
            edgeGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(edgeNormals, 3));
            edgeGeometry.setIndex(edgeIndices);
            
            // Create edge mesh
            const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
            edgeMesh.castShadow = true;
            edgeMesh.receiveShadow = true;
            parentGroup.add(edgeMesh);
        }
        
        // Add chevron arrows on the ramp for visual cue
        this.addRampChevrons(ramp, parentGroup, edgeMaterial);
    }
    
    // Add chevron markings on the ramp
    addRampChevrons(ramp, parentGroup, chevronMaterial) {
        const halfWidth = ramp.rampWidth / 2;
        const segments = 10; // Define segments here to fix the reference error
        
        // Create 3 chevrons along the ramp
        for (let i = 1; i <= 3; i++) {
            const t = i / 4; // Position along ramp (1/4, 2/4, 3/4)
            const lengthOffset = (t - 0.5) * ramp.length;
            const heightFactor = 1 - Math.pow(2 * t - 1, 2);
            const height = ramp.height * heightFactor;
            
            // Position in world space
            const posX = ramp.centerX + ramp.tangentX * lengthOffset;
            const posZ = ramp.centerZ + ramp.tangentZ * lengthOffset;
            
            // Base Y is track height plus ramp height
            const { height: trackHeight } = this.getHeightAt(posX, posZ);
            const y = trackHeight + height + 0.02; // Slight Y offset
            
            // Create chevron geometry
            const chevronWidth = ramp.rampWidth * 0.5;
            const chevronLength = 0.5;
            const chevronThickness = 0.1;
            
            // Create chevron shape
            const chevronShape = new THREE.Shape();
            
            // Start at center-back
            chevronShape.moveTo(0, -chevronLength / 2);
            
            // Left wing
            chevronShape.lineTo(-chevronWidth / 2, chevronLength / 2);
            
            // Left inside corner
            chevronShape.lineTo(-chevronWidth / 2 + chevronThickness, chevronLength / 2 - chevronThickness);
            
            // Center point
            chevronShape.lineTo(0, -chevronLength / 2 + chevronThickness);
            
            // Right inside corner
            chevronShape.lineTo(chevronWidth / 2 - chevronThickness, chevronLength / 2 - chevronThickness);
            
            // Right wing
            chevronShape.lineTo(chevronWidth / 2, chevronLength / 2);
            
            // Close shape
            chevronShape.lineTo(0, -chevronLength / 2);
            
            // Create geometry from shape
            const chevronGeometry = new THREE.ShapeGeometry(chevronShape);
            
            // Create mesh
            const chevron = new THREE.Mesh(chevronGeometry, chevronMaterial);
            
            // Position and orient chevron
            chevron.position.set(posX, y, posZ);
            
            // Calculate rotation to align with ramp
            // First rotate to face along track
            const trackAngle = Math.atan2(ramp.tangentX, ramp.tangentZ);
            chevron.rotation.y = trackAngle;
            
            // Then rotate to match ramp slope
            const slopeAngle = Math.atan2(
                ramp.height * (1 - 2 * Math.abs(t - 0.5)) * Math.sign(t - 0.5),
                ramp.length / segments
            );
            chevron.rotation.x = slopeAngle;
            
            // Add to parent group
            parentGroup.add(chevron);
        }
    }
    
    // Check if a point is on a jump ramp
    isPointOnRamp(x, z) {
        for (const ramp of this.jumpRamps) {
            // Calculate the distance from the point to the ramp centerline
            const lengthVector = {
                x: ramp.tangentX,
                z: ramp.tangentZ
            };
            
            // Vector from ramp center to point
            const toPoint = {
                x: x - ramp.centerX,
                z: z - ramp.centerZ
            };
            
            // Project toPoint onto lengthVector to get position along ramp
            const dotProduct = toPoint.x * lengthVector.x + toPoint.z * lengthVector.z;
            
            // Check if point is within ramp length
            if (Math.abs(dotProduct) <= ramp.length / 2) {
                // Calculate the perpendicular distance from the point to the ramp centerline
                const perpDist = Math.abs(toPoint.x * ramp.perpX + toPoint.z * ramp.perpZ);
                
                // Check if point is within ramp width
                if (perpDist <= ramp.rampWidth / 2) {
                    // Position along ramp (0-1)
                    const t = (dotProduct / ramp.length) + 0.5;
                    
                    // Calculate ramp height at this position
                    const heightFactor = 1 - Math.pow(2 * t - 1, 2);
                    const height = ramp.height * heightFactor;
                    
                    // Check the track point for position information
                    const trackPoint = this.trackPoints[ramp.trackPointIndex];
                    
                    return {
                        onRamp: true,
                        ramp,
                        rampPosition: t,
                        rampHeight: height,
                        dotProduct, // How far along the ramp we are
                        perpDist    // How far from centerline we are
                    };
                }
            }
        }
        
        return { onRamp: false };
    }
    
    // Get the height at a point, including ramp height if on a ramp
    getHeightWithRamps(x, z) {
        // First check if the point is on a ramp
        const rampResult = this.isPointOnRamp(x, z);
        
        // Get the base track height
        const trackResult = this.getHeightAt(x, z);
        
        // Get terrain height directly (if available)
        let terrainHeight = 0;
        if (this.scene && this.scene.environment && this.scene.environment.ground) {
            try {
                const groundHeight = this.scene.environment.ground.getHeightAt(x, z);
                if (typeof groundHeight === 'number') {
                    terrainHeight = groundHeight;
                } else if (typeof groundHeight === 'object' && groundHeight !== null) {
                    terrainHeight = groundHeight.height || 0;
                }
            } catch (e) {
                // If any error occurs, default to 0
                terrainHeight = 0;
            }
        }
        
        // If on a ramp, add the ramp height to the track height
        if (rampResult.onRamp) {
            // Use the maximum of track and terrain height as base
            const baseHeight = Math.max(trackResult.height, terrainHeight);
            
            return {
                ...trackResult,
                height: baseHeight + rampResult.rampHeight,
                onRamp: true,
                ramp: rampResult.ramp,
                rampPosition: rampResult.rampPosition,
                rampNormal: this.calculateRampNormal(rampResult),
                rampTangent: {
                    x: rampResult.ramp.tangentX,
                    z: rampResult.ramp.tangentZ
                }
            };
        }
        
        return { ...trackResult, onRamp: false };
    }
    
    // Calculate the normal vector of the ramp surface at a given position
    calculateRampNormal(rampResult) {
        const ramp = rampResult.ramp;
        const t = rampResult.rampPosition;
        
        // Calculate the slope of the ramp at this position
        // The slope is steepest at the start/end and zero at the peak
        const slopeAngle = Math.atan2(
            ramp.height * (1 - 2 * Math.abs(t - 0.5)) * Math.sign(t - 0.5),
            ramp.length / 20 // Normalize by some factor related to segment length
        );
        
        // The normal is perpendicular to the ramp surface
        // For a slope along the X axis, if the slope tilts up, the normal tilts backward
        const normalY = Math.cos(slopeAngle);
        const normalX = -Math.sin(slopeAngle) * ramp.tangentX;
        const normalZ = -Math.sin(slopeAngle) * ramp.tangentZ;
        
        return { x: normalX, y: normalY, z: normalZ };
    }
}

export default Track;