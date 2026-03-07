---
sidebar_position: 1
title: "Week 6: Interaction, Enemies & Storytelling"
---

# Week 6 -- 3D Arc: Interaction, Enemies & Storytelling

**Date:** May 22, 2026 *(potential emergency closure day -- backup: May 29 / Jun 5 / Jun 9)*
**Arc:** 3D Game (Week 2 of 3)

## Featured Game: Sid Meier's Ace Patrol (2013, Firaxis/2K)

Brian was Senior Producer. Show a few turns of gameplay.

- **What to notice:** 3D space used for strategy, not just action. Camera angle, elevation, positioning all matter.
- *"3D doesn't have to mean first-person shooters. This is a turn-based strategy game where the 3D space IS the puzzle."*

## Play-Test Spotlight

Selected student demos their 3D environment.

## Learn

### 3D Collision and Triggers

Porting 2D concepts to 3D:

| 2D Concept | 3D Equivalent |
|---|---|
| Collision with enemy sprite | Collision with 3D enemy object |
| Picking up a 2D coin | Walking into a 3D collectible |
| Touching a door sprite | Entering a trigger zone near a 3D door |
| Platform edges | Ledges and drops |

### Trigger Zones

Invisible areas that activate events when the player enters:
- Open a door when player approaches
- Spawn an enemy when player enters a room
- Play a sound when player reaches a certain point
- Display text or objectives

### Environmental Storytelling

Telling a story through objects, placement, and space -- no dialogue needed:

| Technique | Example |
|---|---|
| **Object placement** | Overturned chairs suggest a struggle |
| **Lighting** | A single lit room in a dark building draws attention |
| **Contrast** | A pristine room next to a destroyed one |
| **Found objects** | Notes, photos, tools left behind |
| **Path of destruction** | Claw marks, broken glass, scorch marks |

### Key Vocabulary

| Term | Definition |
|---|---|
| **Trigger zone** | An invisible area that activates events when entered |
| **Environmental storytelling** | Conveying narrative through the game world itself |
| **Spatial audio** | Sound that changes based on direction and distance |
| **Projectile** | An object that moves in a direction (bullet, arrow, fireball) |

## Build

1. Add interactive elements: collectible items, a locked door + key, trigger zones.
2. Add at least one enemy or hazard adapted for 3D (patrolling guard, moving obstacle, danger zone).
3. Add a HUD: score, objective text, or health bar.
4. Environmental storytelling pass: place objects and details that hint at a story.

## Play & Feedback

Play each other's 3D games. Feedback: *"Did you know what to do? Did the environment tell you a story?"*

## Resources & Further Reading

- [GDevelop 3D Collision Documentation](https://wiki.gdevelop.io/gdevelop5/objects/3d-box/)
- [Environmental Storytelling in Games (YouTube)](https://www.youtube.com/results?search_query=environmental+storytelling+game+design)
- [What Remains of Edith Finch -- Environmental Storytelling Masterclass](https://www.youtube.com/results?search_query=edith+finch+environmental+storytelling)
- [Level Design Book - Environmental Narrative](https://book.leveldesignbook.com/)

## Stretch Goals

- Multiple rooms with different moods/themes.
- A simple puzzle (find item A to unlock area B).
- Lighting to guide the player or create atmosphere.
