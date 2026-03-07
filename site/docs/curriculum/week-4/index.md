---
sidebar_position: 1
title: "Week 4: Scoring, Polish & Publishing"
---

# Week 4 -- 2D Arc: Scoring, Polish & Publishing

**Date:** May 8, 2026
**Arc:** 2D Game (Week 3 of 3)
**Guest:** Brian Lowe (extended session -- up to 2 hours)

## Featured Game: Rock Band 3 (2010, Harmonix)

Brian was Senior Producer. Show a clip of expert-level gameplay.

- **What to notice:** every single input has immediate, precise feedback -- visual, audio, haptic. The "note highway" is pure game feel.
- *"We spent months making sure every button press felt exactly right. That's polish."*

## Brian Lowe -- The Craft of Polish (15 min)

- What "juice" means in the industry: screen shake, particles, sound, timing.
- Before/after examples from his own projects.
- The producer's dilemma: when is "good enough" actually good enough to ship?
- How QA testers break your game (and why you should thank them).

## Learn

### Variables & State

| Concept | Example |
|---|---|
| **Score** | `Score = Score + 10` when collecting a coin |
| **Lives** | `Lives = Lives - 1` when touching an enemy |
| **Timer** | Count down from 60; game over at 0 |
| **Game state** | Track whether game is "playing", "paused", or "game over" |

### HUD / UI Layer

The HUD (Heads-Up Display) shows information on screen without being "in" the game world:
- Score counter
- Lives remaining
- Timer
- Health bar

### Sound Design

| Type | Purpose | Examples |
|---|---|---|
| **Sound effects** | Instant feedback for actions | Jump, coin collect, enemy hit, death |
| **Music** | Set mood and energy | Background loop, boss music, victory jingle |
| **Ambient** | Create atmosphere | Wind, birds, machinery hum |

### Polish ("Juice")

Small touches that make a game feel alive:
- **Screen shake** on damage or big impacts
- **Particles** -- dust on landing, sparks on hit, coin sparkle
- **Squash and stretch** -- character squishes on landing, stretches when jumping
- **Sound layering** -- multiple effects at once for big moments

### Key Vocabulary

| Term | Definition |
|---|---|
| **Variable** | A named value the game tracks (score, lives, timer) |
| **HUD** | Heads-Up Display -- info shown to the player on screen |
| **Juice** | Small polish effects that make a game feel satisfying |
| **Particle effect** | Small animated images spawned in groups (sparks, dust, sparkles) |
| **Game loop** | The cycle of title screen to gameplay to win/lose to retry |
| **Export** | Packaging your game to run outside GDevelop |

## Build

1. Add collectibles (coins, gems, stars) with a score variable and HUD display.
2. Add lives (3 lives, then game over screen with "Retry").
3. Add a title screen with the game name and a "Play" button.
4. Add at least 2 sound effects and 1 particle effect.
5. Optional: background music, screen shake on damage.
6. Wire up a complete loop: title to play to win/lose to retry.
7. If time: begin web export to preview your game in a browser.

## Play & Feedback

Full playthroughs: title to level 1 to game over/win. Side-by-side comparison: same game with and without "juice."

## Extended Session (30 min, optional)

- Brian plays student 2D games, gives producer-level feedback.
- *"Would you ship this? What's the one thing holding it back?"*

## Arc Wrap-Up

*"You have a complete, playable 2D game. Over the next 3 weeks, we'll do the same thing in 3D."*

Students who want to keep polishing their 2D game during 3D weeks can do so.

## Resources & Further Reading

- [GDevelop Variables Tutorial](https://wiki.gdevelop.io/gdevelop5/tutorials/variables/)
- [GDevelop Sound & Music](https://wiki.gdevelop.io/gdevelop5/objects/audio/)
- [GDevelop Particle Emitter](https://wiki.gdevelop.io/gdevelop5/objects/particles_emitter/)
- [GDevelop Publishing Guide](https://wiki.gdevelop.io/gdevelop5/publishing/)
- [Juice it or Lose it (GDC Talk)](https://www.youtube.com/watch?v=Fy0aCDmgnxg) -- the definitive talk on polish
- [Game UI Database](https://www.gameuidatabase.com/) -- reference for HUD/UI design

## Stretch Goals

- Multiple levels with scene transitions.
- Background music that changes between areas.
- A win screen with final score and "Play Again" button.
