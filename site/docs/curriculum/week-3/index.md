---
sidebar_position: 1
title: "Week 3: Enemies, Hazards & Level Design"
---

# Week 3 -- 2D Arc: Enemies, Hazards & Level Design

**Date:** May 1, 2026
**Arc:** 2D Game (Week 2 of 3)

## Featured Game: Sonic & Knuckles (1994, Sega / Backbone remaster)

Brian produced the remaster. Play 2 minutes -- a level with varied enemies and hazards.

- **What to notice:** enemy placement teaches you the rules. First encounter is safe, second is dangerous. Hazards are visible before they kill you.
- *"Good level design is invisible teaching."*

## Play-Test Spotlight

Selected student demos their 2D world with tuned movement.

## Learn

### Collision Events

When objects touch, things happen. In GDevelop:

```
Condition: Player is in collision with Enemy
Action: Delete Player / Respawn at checkpoint / Lose a life
```

### Object Groups

Organize your objects! Instead of writing separate events for every enemy type, create groups:

- **Enemies** group: all enemy objects
- **Hazards** group: spikes, lava, pits
- **Collectibles** group: coins, gems, power-ups

### Enemy AI Patterns

| Pattern | How it works | Good for |
|---|---|---|
| **Patrol** | Walk between two points, reverse at each | Ground enemies, guards |
| **Chase** | Move toward the player when close | Aggressive enemies, ghosts |
| **Sentry** | Stay still, shoot at intervals | Turrets, archers |

### Level Design Principles

1. **Teach through play** -- introduce hazards in a safe context before making them dangerous
2. **Escalate difficulty** -- each section should be slightly harder than the last
3. **Reward exploration** -- hidden paths, bonus items, secrets
4. **Rest points** -- give the player safe moments between challenges

### Key Vocabulary

| Term | Definition |
|---|---|
| **Collision event** | A rule that triggers when two objects touch |
| **Object group** | A collection of objects that share the same events |
| **Patrol AI** | Enemy moves back and forth between two points |
| **Checkpoint** | A save point the player returns to after dying |
| **Respawn** | The player reappearing after death |

## Build

1. Add a patrolling enemy with collision leading to player respawn.
2. Add a static hazard (spikes, lava, pit) with collision leading to respawn.
3. Add a death effect: animation, sound, screen flash.
4. Set at least one checkpoint.
5. Redesign your level layout to *teach* the player about the hazards through placement.

## Play & Feedback

Play each other's levels. Feedback: *"Where did you die the most? Was it fair? Where did you feel smart?"*

## Resources & Further Reading

- [GDevelop Collision Events](https://wiki.gdevelop.io/gdevelop5/events/)
- [GDevelop Object Groups](https://wiki.gdevelop.io/gdevelop5/objects/object-groups/)
- [Boss Keys - Level Design YouTube Series](https://www.youtube.com/playlist?list=PLc38fcMFcV_s7Lf6xbeRfWYRt7-Vmi_X9) by Game Maker's Toolkit
- [The Level Design Book (free online)](https://book.leveldesignbook.com/)
- [Sonic Level Design principles explained](https://info.sonicretro.org/Sonic_Physics_Guide)

## Stretch Goals

- Multiple enemy types with different behaviors.
- A hidden area or secret path that rewards exploration.
- See the [Level Design Worksheet](/docs/worksheets/level-design) for planning tools.
