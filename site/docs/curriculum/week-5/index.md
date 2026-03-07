---
sidebar_position: 1
title: "Week 5: 3D Space, Camera & Environment"
---

# Week 5 -- 3D Arc: Space, Camera & Environment

**Date:** May 15, 2026
**Arc:** 3D Game (Week 1 of 3)

![3D Game Development](/img/week-3d-arc.png)

## Featured Game: Five Nights at Freddy's: Security Breach (2021, Steel Wool)

Brian worked business development. Show the opening -- the player navigating the Mega Pizzaplex.

- **What to notice:** 3D space creates tension. You can't see behind you. Corridors create suspense. Open areas create vulnerability.
- *"In 2D, danger comes from left and right. In 3D, danger can come from anywhere -- and that changes everything about design."*

## Play-Test Spotlight

Selected student demos their completed 2D game.

## Learn

### Why 3D?

What changes when you add depth:

| 2D | 3D |
|---|---|
| Player sees everything | Player has limited view |
| Danger from left/right | Danger from any direction |
| Flat sprites | Objects have volume |
| Camera fixed or scrolling | Camera is a design tool |
| Simpler to build | More immersive |

### GDevelop 3D Basics

- **3D Box objects** -- textured cubes for walls, floors, ceilings
- **3D Model objects** -- imported .glb models for complex shapes
- **Camera positioning** -- where the player "looks from"

### Camera Types

| Type | Description | Games that use it |
|---|---|---|
| **First-person** | You see through the character's eyes | FNAF, Minecraft, Portal |
| **Third-person** | Camera follows behind the character | Mario 64, Fortnite, Zelda |
| **Fixed** | Camera stays in one place | Security cameras, puzzle games |
| **Top-down** | Looking straight down | RTS games, some RPGs |

### 3D Space: X, Y, Z

- **X** = left/right
- **Y** = up/down
- **Z** = forward/backward (depth!)

### Preventing Players from Getting Lost

1. **Landmarks** -- unique objects players can orient by
2. **Color coding** -- different areas have different color palettes
3. **Lighting** -- bright areas attract, dark areas warn
4. **Linear layout** -- start simple before adding branching paths

### Key Vocabulary

| Term | Definition |
|---|---|
| **3D Box** | A textured cube object in GDevelop |
| **Z-axis** | The depth axis -- the "new" dimension in 3D |
| **First-person** | Camera positioned at the character's eyes |
| **Third-person** | Camera positioned behind/above the character |
| **Skybox** | An image that wraps around the entire 3D world to simulate sky |
| **Texture** | An image applied to the surface of a 3D object |
| **Landmark** | A unique, visible object that helps players orient themselves |

## Build

1. Create a new 3D project in GDevelop.
2. Set up a ground plane and textured walls using 3D boxes.
3. Add player movement: WASD + mouse look.
4. Build a small environment: 2--3 connected rooms or areas with distinct visual identities.
5. Apply different textures to surfaces so spaces feel different.
6. Add at least one landmark -- something the player can orient by.

## Play & Feedback

Walk through each other's 3D spaces. Feedback: *"Could you find your way? Did it feel like a real place?"*

## Resources & Further Reading

- [GDevelop 3D Tutorial](https://wiki.gdevelop.io/gdevelop5/tutorials/3d/)
- [GDevelop 3D Objects Documentation](https://wiki.gdevelop.io/gdevelop5/objects/3d-box/)
- [Sketchfab Free 3D Models](https://sketchfab.com/features/free-3d-models)
- [Poly Haven -- Free 3D Assets & Textures](https://polyhaven.com/)
- [3D Level Design Basics (YouTube)](https://www.youtube.com/results?search_query=3d+level+design+basics)

## Stretch Goals

- Skybox or ceiling.
- Atmospheric lighting.
- Ambient sound (wind, hum, drip).
