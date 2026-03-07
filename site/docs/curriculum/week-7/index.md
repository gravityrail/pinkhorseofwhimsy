---
sidebar_position: 1
title: "Week 7: Polish, Levels & Publishing Prep"
---

# Week 7 -- 3D Arc: Polish, Levels & Publishing Prep

**Date:** May 29, 2026
**Arc:** 3D Game (Week 3 of 3)

## Featured Game: Rampage 2: Universal Tour (1999, Midway)

Brian produced this at Midway. Show a clip.

- **What to notice:** simple core mechanic (smash buildings), but layered with level variety, power-ups, humor, and progression.
- _"The core loop of Rampage is 'punch a building.' That's it. But we shipped a whole game because of everything we built around that loop."_

## Play-Test Spotlight

Selected student demos their 3D game with interactions and enemies.

## Learn

### Multiple Scenes in 3D

- Level transitions: loading new environments
- Scene variables vs. global variables (what persists between scenes?)
- Loading screens and transitions

### Title Screens & Menus

Every shipped game needs:

1. **Title screen** -- game name, "Press Start" or "Play" button
2. **Game over screen** -- score, "Try Again" button
3. **Win screen** -- celebration, final score, "Play Again"

### Sound Design for 3D

| Type               | 3D Consideration                               |
| ------------------ | ---------------------------------------------- |
| **Spatial audio**  | Sounds get louder as you approach the source   |
| **Ambient tracks** | Different areas have different ambient loops   |
| **UI sounds**      | Menu clicks, score dings -- not spatial        |
| **Music**          | Crossfade between areas for smooth transitions |

### Publishing Pipeline

| Target                  | How                                     | Cost                |
| ----------------------- | --------------------------------------- | ------------------- |
| **Grass Valley Arcade** | GDevelop web export, hosted on our site | Free                |
| **Shareable link**      | GDevelop's one-click web export         | Free                |
| **Desktop (Steam)**     | GDevelop desktop export                 | $100/title on Steam |

### What It Means to "Ship"

- It doesn't have to be perfect; it has to be _done_.
- Ship what you have, not what you wish you had.
- A shipped game teaches you 10x more than an unfinished one.

### Key Vocabulary

| Term                 | Definition                                       |
| -------------------- | ------------------------------------------------ |
| **Scene transition** | Moving from one level/screen to another          |
| **Global variable**  | A variable that persists across all scenes       |
| **Scene variable**   | A variable that resets when a new scene loads    |
| **Web export**       | Packaging a game as HTML/JS to play in a browser |
| **Desktop export**   | Packaging a game as a downloadable .exe or .app  |

## Build

1. Add a second area/level with a new element or twist.
2. Wire up scene transitions between areas.
3. Add a title screen and win/lose state.
4. Sound pass: at least 2 sound effects + background audio.
5. Polish pass: consistent textures, balanced difficulty, bug fixes.
6. Begin export: test web export. Preview your game in a browser.

## Play & Feedback

Full playthroughs: title to area 1 to area 2 to end state. Feedback: _"Is this ready to show your parents next week?"_

## Publishing Prep

- Export web builds for the Grass Valley Arcade.
- Write a 2-sentence description of your game.
- Take a screenshot for the arcade page.

## Resources & Further Reading

- [GDevelop Scene Management](https://wiki.gdevelop.io/gdevelop5/interface/scene-editor/)
- [GDevelop Web Export Guide](https://wiki.gdevelop.io/gdevelop5/publishing/web/)
- [GDevelop Desktop Export Guide](https://wiki.gdevelop.io/gdevelop5/publishing/desktop/)
- [Freesound.org -- Free Sound Effects](https://freesound.org/)
- [Free Music Archive](https://freemusicarchive.org/)

## Stretch Goals

- Difficulty progression between levels.
- Animated transitions between scenes.
- Optional: start desktop export for potential Steam publishing.
