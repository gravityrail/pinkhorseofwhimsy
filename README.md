# 🦄 Pink Horse of Whimsy

A whimsical little arcade of homemade browser games, hosted at **[pinkhorseofwhimsy.com](https://pinkhorseofwhimsy.com)**.

The site is built with [Docusaurus](https://docusaurus.io/) (in [`site/`](site/)) and deployed to GitHub Pages automatically on every push to `trunk` (see [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

## Structure

| Path | What |
| --- | --- |
| [`site/`](site/) | The Docusaurus website (homepage, Arcade, curriculum docs). |
| [`site/static/worm/`](site/static/worm/) | **Worm** — a self-contained HTML5 game (single file, no build step). |
| [`site/static/arcade/games/`](site/static/arcade/games/) | GDevelop games built from [`games/`](games/) by the deploy workflow. |
| [`games/`](games/) | Source + build pipeline for the GDevelop example games. |

## Local development

```bash
cd site
npm install
npm start          # dev server with hot reload
npm run build      # production build into site/build/
```

Standalone games under `site/static/` (like Worm) are served as-is at their path — e.g. `/worm/`. To add one, drop its files in `site/static/<name>/` and add a card to the `GAMES` array in [`site/src/pages/arcade/index.tsx`](site/src/pages/arcade/index.tsx).

## Adding a game to the Arcade

See [`CLAUDE.md`](CLAUDE.md) for conventions.

---

<details>
<summary>📚 Legacy: Game Design &amp; Programming Club curriculum (GVCS, Spring 2026)</summary>

This repo began as an 8-week game-design club curriculum. That material is preserved below and still lives under `docs/`.

**Grades:** 5–8 (advanced 4th graders welcome)
**Sessions:** 1.5 hours (2 hours on guest weeks)
**Tool:** GDevelop 5 (all 8 weeks)
**Guest Producer:** Brian Lowe — Weeks 1, 4 & 8
**Publishing Goal:** Finished games published to Steam and/or the **Pink Horse Arcade** (web)

---

## Structure & Rhythm

### Session Format

1. **Play-Test Spotlight (10 min):** A student who crushed the previous week demos on the projector. Week 1: instructor shows classic examples instead.
2. **Featured Game (5 min):** A game Brian Lowe worked on, chosen to match the week's topic. Brief play/video + "what to notice" framing. On Brian's weeks, he introduces it himself.
3. **Learn (15 min):** New concept intro + live demo.
4. **Build (40–45 min):** Hands-on project work.
5. **Play & Feedback (10 min):** Pair up, play each other's builds, structured feedback.
6. **Wrap-Up (5 min):** Preview next week, optional stretch goals.

### Guest Weeks (Weeks 1, 4 & 8)

- Session extends to **2 hours** for students who can stay.
- Extra 30 min: informal Q&A, 1-on-1 feedback from Brian, open build time.
- Students who need to leave at 1.5 hours are always free to go.

### Three Arcs

| Arc         | Weeks | Focus                                                |
| ----------- | ----- | ---------------------------------------------------- |
| Foundations | 1     | Intro to game design, GDevelop setup, first tutorial |
| 2D Game     | 2–4   | Build a full 2D game from scratch over 3 weeks       |
| 3D Game     | 5–7   | Build a 3D game from scratch over 3 weeks            |
| Demo Day    | 8     | Polish, publish, showcase to parents & siblings      |

### Publishing

Students who complete their games can:

- **Publish to the web** on the **Pink Horse Arcade** — a shared page (itch.io or school-hosted) where all club games are playable.
- **Publish to Steam** via GDevelop's desktop export. Students who want to distribute/sell their games can do so with parental permission.
- **Share a link** with family and friends immediately via GDevelop's one-click web export.

---

## WEEK 1 — FOUNDATIONS: Welcome to Game Design (Apr 17)

**🎤 Guest: Brian Lowe (extended session — up to 2 hours)**

### Featured Games — A Tour Through the Decades

Brian introduces games from his own career to show how the medium evolved:

- **720°** (1986, Midway) — Early arcade: simple rules, pure skill, quarter-eating design.
- **Space Invaders Extreme** (2008, Backbone) — Classic 2D reimagined with modern game feel.
- **Sonic Generations** (2011, Backbone/Sega) — 2D and 3D in one game. Perfect preview of what the club will build.
- **Five Nights at Freddy's: Security Breach** (2021, Steel Wool) — Modern 3D, atmosphere, tension.

Brian frames each one: "Here's what the designers were trying to make you feel. Here's what was hard about making it."

### Brian Lowe — What It's Like to Make Games (20 min)

- What does a game producer actually do? (Hint: it's not just playing games.)
- His path: SSI → Midway → Backbone → 2K/Firaxis → Steel Wool and beyond.
- 69 shipped games — what he learned from the ones that worked and the ones that didn't.
- Advice: "The most important skill in game development is finishing."
- Q&A

### Learn

- What is a game? Rules, goals, challenge, feedback.
- Deconstructing a game: mechanics vs. theme vs. aesthetics.
- GDevelop tour: scenes, objects, behaviors, events, preview.
- Where to find help: built-in tutorials, asset store, community wiki.

### Build

- Open GDevelop. Create an account. Start the official platformer tutorial.
- Goal: complete the first section — a scene with a moving, jumping player character.
- Instructor circulates to troubleshoot setup and account issues.

### Play & Feedback

- Try each other's tutorial projects. Discussion: "What would you change to make this yours?"

### Extended Session (30 min, optional)

- More Q&A with Brian. Students who finish early can explore the asset store or start customizing.
- Brian circulates, chats with kids about their favorite games.

---

## WEEK 2 — 2D ARC: Movement, Sprites & World Building (Apr 24)

### Featured Game: **Gunstar Heroes** (1993, Treasure / Backbone remaster)

Brian produced the remaster. Play 2 minutes on the projector.

- What to notice: expressive sprites, tight movement, how the level scrolls, how responsive the controls feel.
- "This game was made by 7 people. Your team is 1. But the fundamentals are the same."

### Play-Test Spotlight

- Selected student shows their customized tutorial from Week 1.

### Learn

- Sprites: what they are, animation frames, hitboxes.
- GDevelop's sprite editor: drawing and importing.
- Platform behavior deep dive: gravity, jump height, acceleration, air control.
- Tiled sprites, backgrounds, and parallax scrolling.
- Concept: **game feel** — the same jump can feel floaty, snappy, or heavy depending on numbers.

### Build

- Start a **new 2D project** (fresh, not the tutorial).
- Create or choose a player sprite. Set up platform behavior.
- Build Level 1: ground, platforms, walls, pits, a background.
- Tune movement until it feels good: gravity, jump height, run speed, friction.
- Add at least one decorative/environmental element (trees, clouds, crates).

### Play & Feedback

- Swap and play. Feedback: "How does the movement feel? Too floaty? Too stiff?"

### Stretch Goals

- Custom pixel art character.
- Parallax scrolling background.
- Animated idle/run/jump states for the player sprite.

---

## WEEK 3 — 2D ARC: Enemies, Hazards & Level Design (May 1)

### Featured Game: **Sonic & Knuckles** (1994, Sega / Backbone remaster)

Brian produced the remaster. Play 2 minutes — a level with varied enemies and hazards.

- What to notice: enemy placement teaches you the rules. First encounter is safe, second is dangerous. Hazards are visible before they kill you.
- "Good level design is invisible teaching."

### Play-Test Spotlight

- Selected student demos their 2D world with tuned movement.

### Learn

- Collision events: when objects touch, things happen.
- Object groups: organizing enemies, hazards, collectibles.
- Enemy AI patterns: patrol (walk between two points), chase (move toward player), and sentry (stationary, shoots).
- Respawn logic: checkpoints, death → reset position.
- Level design principles: teach through play, escalate difficulty, reward exploration.

### Build

- Add a patrolling enemy with collision → player respawn.
- Add a static hazard (spikes, lava, pit) with collision → respawn.
- Add a death effect: animation, sound, screen flash.
- Set at least one checkpoint.
- Redesign your level layout to _teach_ the player about the hazards through placement.

### Play & Feedback

- Play each other's levels. Feedback: "Where did you die the most? Was it fair? Where did you feel smart?"

### Stretch Goals

- Multiple enemy types with different behaviors.
- A hidden area or secret path that rewards exploration.

---

## WEEK 4 — 2D ARC: Scoring, Polish & Publishing (May 8)

**🎤 Guest: Brian Lowe (extended session — up to 2 hours)**

### Featured Game: **Rock Band 3** (2010, Harmonix)

Brian was Senior Producer. Show a clip of expert-level gameplay.

- What to notice: every single input has immediate, precise feedback — visual, audio, haptic. The "note highway" is pure game feel.
- "We spent months making sure every button press felt exactly right. That's polish. That's the difference between a game people play once and a game people play for hundreds of hours."

### Play-Test Spotlight

- Selected student demos their 2D game with enemies and hazards.

### Brian Lowe — The Craft of Polish (15 min)

- What "juice" means in the industry: screen shake, particles, sound, timing.
- Before/after examples from his own projects.
- The producer's dilemma: when is "good enough" actually good enough to ship?
- How QA testers break your game (and why you should thank them).
- Quick Q&A

### Learn

- Variables: score, lives, timers — how games track state.
- HUD/UI layer: showing information on screen without it being "in" the game world.
- Sound design: effects, music, ambient. GDevelop's audio system.
- Particles: dust on landing, sparks on hit, coin sparkle.
- Publishing basics: how to export a GDevelop game for the web and for desktop.

### Build

- Add collectibles (coins, gems, stars) → score variable → HUD display.
- Add lives (3 lives → game over screen with "Retry").
- Add a title screen with the game name and a "Play" button.
- Add at least 2 sound effects and 1 particle effect.
- Optional: background music, screen shake on damage.
- Wire up a complete loop: title → play → win/lose → retry.
- If time: begin web export to preview your game in a browser.

### Play & Feedback

- Full playthroughs: title → level 1 → (level 2 if built) → game over/win.
- Side-by-side comparison: same game with and without "juice."

### Extended Session (30 min, optional)

- Brian plays student 2D games, gives producer-level feedback.
- Students work on stretch goals or start second levels.
- Discuss: "Would you ship this? What's the one thing holding it back?"

### Arc Wrap-Up

- "You have a complete, playable 2D game. Over the next 3 weeks, we'll do the same thing in 3D."
- Students who want to keep polishing their 2D game during 3D weeks can do so (differentiation).

---

## WEEK 5 — 3D ARC: Space, Camera & Environment (May 15)

### Featured Game: **Five Nights at Freddy's: Security Breach** (2021, Steel Wool Studios)

Brian worked business development. Show the opening — the player navigating the Mega Pizzaplex.

- What to notice: 3D space creates tension. You can't see behind you. Corridors create suspense. Open areas create vulnerability.
- "In 2D, danger comes from left and right. In 3D, danger can come from anywhere — and that changes everything about design."

### Play-Test Spotlight

- Selected student demos their completed 2D game.

### Learn

- Why 3D? What changes when you add depth — for players and for designers.
- GDevelop 3D basics: 3D box objects, 3D model objects, camera positioning.
- Camera types: first-person (you ARE the character) vs. third-person (you SEE the character).
- 3D space fundamentals: X/Y/Z axes, coordinates, scale.
- The biggest 3D challenge: the player gets lost. How to prevent it.

### Build

- Create a new 3D project in GDevelop.
- Set up a ground plane and textured walls using 3D boxes.
- Add player movement: WASD + mouse look.
- Build a small environment: 2–3 connected rooms or areas with distinct visual identities.
- Apply different textures to surfaces so spaces feel different.
- Add at least one landmark — something the player can orient by.

### Play & Feedback

- Walk through each other's 3D spaces. Feedback: "Could you find your way? Did it feel like a real place?"

### Stretch Goals

- Skybox or ceiling.
- Atmospheric lighting.
- Ambient sound (wind, hum, drip).

---

## WEEK 6 — 3D ARC: Interaction, Enemies & Storytelling (May 22)

_⚠️ Potential emergency closure day. If cancelled: shift to May 29 / Jun 5 / Jun 9 (Tue makeup)._

### Featured Game: **Sid Meier's Ace Patrol** (2013, Firaxis/2K)

Brian was Senior Producer. Show a few turns of gameplay.

- What to notice: 3D space used for strategy, not just action. Camera angle, elevation, positioning all matter.
- "3D doesn't have to mean first-person shooters. This is a turn-based strategy game where the 3D space IS the puzzle."

### Play-Test Spotlight

- Selected student demos their 3D environment.

### Learn

- 3D collision and triggers: picking up objects, opening doors, activating zones.
- Porting 2D concepts to 3D: enemies still patrol, collectibles still count — but now there's a z-axis.
- Environmental storytelling: telling a story through objects, placement, and space without any dialogue.
- Optional deep dive: basic projectile mechanics (shooting, throwing).

### Build

- Add interactive elements: collectible items, a locked door + key, trigger zones.
- Add at least one enemy or hazard adapted for 3D (patrolling guard, moving obstacle, danger zone).
- Add a HUD: score, objective text, or health bar.
- Environmental storytelling pass: place objects and details that hint at a story (who was here? what happened?).

### Play & Feedback

- Play each other's 3D games. Feedback: "Did you know what to do? Did the environment tell you a story?"

### Stretch Goals

- Multiple rooms with different moods/themes.
- A simple puzzle (find item A to unlock area B).
- Lighting to guide the player or create atmosphere.

---

## WEEK 7 — 3D ARC: Polish, Levels & Publishing Prep (May 29)

### Featured Game: **Rampage 2: Universal Tour** (1999, Midway)

Brian produced this at Midway. Show a clip.

- What to notice: simple core mechanic (smash buildings), but layered with level variety, power-ups, humor, and progression. Polish turns a one-note idea into a full game.
- "The core loop of Rampage is 'punch a building.' That's it. But we shipped a whole game because of everything we built around that loop."

### Play-Test Spotlight

- Selected student demos their 3D game with interactions and enemies.

### Learn

- Multiple scenes in 3D: level transitions, loading new environments.
- Title screens, menus, and game over screens in 3D projects.
- Sound design for 3D: spatial audio, ambient tracks, UI sounds.
- Publishing pipeline: web export for the Pink Horse Arcade, desktop export for Steam.
- What it means to "ship" a game: it doesn't have to be perfect, it has to be done.

### Build

- Add a second area/level with a new element or twist.
- Wire up scene transitions between areas.
- Add a title screen and win/lose state.
- Sound pass: at least 2 sound effects + background audio.
- Polish pass: consistent textures, balanced difficulty, bug fixes.
- Begin export: test web export. Preview your game in a browser.
- Optional: start desktop export process for potential Steam publishing.

### Play & Feedback

- Full playthroughs: title → area 1 → area 2 → end state.
- Feedback: "Is this ready to show your parents next week?"

### Publishing Prep

- Instructor helps students export web builds for the Pink Horse Arcade.
- Discussion: what makes a good game page? Title, screenshot, short description.
- Students write a 2-sentence description of each game they want to publish.

---

## WEEK 8 — DEMO DAY: Ship It! (Jun 5)

**🎤 Guest: Brian Lowe (extended session — up to 2 hours)**
**👨‍👩‍👧‍👦 Parents and siblings invited!**

### Featured Game: All of Them

Quick montage of every featured game from the course — 720°, Gunstar Heroes, Sonic & Knuckles, Rock Band 3, FNAF Security Breach, Ace Patrol, Rampage 2 — as a reminder of the journey from arcade to 3D.

### Final Build & Export (30 min)

- Last bug fixes and polish on 2D game, 3D game, or both.
- Final web exports for the Pink Horse Arcade.
- Desktop exports for students pursuing Steam.
- Write/finalize game descriptions for the arcade page.
- Instructor verifies all games are exported and playable.

### Arcade Mode (30 min)

- **The Pink Horse Arcade goes live.**
- All games open on screens around the room. Students, parents, and siblings rotate and play everything.
- Each station has the student's name, game title, and description.
- Encourage families to play both the 2D and 3D games.

### Lightning Talks (15 min)

- Each student: 1–2 minutes in front of the room.
  - "What's your game about? What was the hardest problem you solved? What are you proudest of?"
- Parents and siblings in the audience.

### Brian Lowe — Closing Session (20 min)

- Plays 2–3 student games live on the projector, reacting as a real producer.
- Gives genuine feedback: what works, what's clever, what a studio would build on.
- "Here's what I see in your work that's exactly like the real industry."
- Career Q&A from students AND parents.
- Closing message: "You built and shipped two real games in eight weeks. That's not a school project — that's game development. Some of you might do this for a living someday. Today, you already did."

### Awards (10 min)

Voted on by the whole room — students, parents, siblings, everyone:

- 🏆 **Best Story / World**
- 🎮 **Best Game Feel**
- 🌐 **Best 3D Environment**
- 💡 **Most Creative Mechanic**
- 🐛 **Best Bug** (celebrate the glitches!)
- 🌟 **People's Choice**

### After the Session

- Pink Horse Arcade link shared with all families.
- Students who want to pursue Steam publishing get a follow-up guide.
- Club info shared for anyone interested in a second session (fall 2026?).

---

## Tools & Setup

### Software

| Tool       | Cost                    | Platform                 | Notes                                                                                                                                               |
| ---------- | ----------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GDevelop 5 | Free / $7.99/mo premium | Web, Windows, Mac, Linux | Web version avoids install issues. Premium unlocks more assets but free tier covers the full curriculum. Check edu pricing at gdevelop.io/education |

### Publishing Platforms

| Platform            | Purpose                         | Cost                                     |
| ------------------- | ------------------------------- | ---------------------------------------- |
| GDevelop web export | Instant shareable link          | Free                                     |
| itch.io             | Pink Horse Arcade page        | Free                                     |
| Steam               | Desktop distribution (optional) | $100 one-time fee per title (Steamworks) |

### Per Student

- Laptop or Chromebook with modern web browser
- GDevelop account (free tier)
- Headphones (for sound work, weeks 4+)

### Per Session

- Projector/screen for demos, featured games, and Play-Test Spotlights
- Whiteboard or large paper
- Timer visible to class

### Instructor Prep

- Pre-build each week's target project state as a reference and fallback
- Maintain a "stuck?" cheat sheet of common GDevelop event patterns
- Have catch-up project files for students who miss a week
- Test GDevelop web version on school machines/network before Week 1
- Set up the Pink Horse Arcade itch.io page before Week 7
- Acquire/prepare clips or ROMs of featured games for each week

---

## Brian Lowe's Featured Games by Week

| Week | Featured Game                                                         | Year      | Brian's Role    | Why This Week                               |
| ---- | --------------------------------------------------------------------- | --------- | --------------- | ------------------------------------------- |
| 1    | 720°, Space Invaders Extreme, Sonic Generations, FNAF Security Breach | Various   | Various         | Tour of genres and eras                     |
| 2    | Gunstar Heroes (remaster)                                             | 1993/2009 | Senior Producer | Sprites, movement, game feel in 2D          |
| 3    | Sonic & Knuckles (remaster)                                           | 1994/2009 | Senior Producer | Enemy design, hazards, level design         |
| 4    | Rock Band 3                                                           | 2010      | Senior Producer | Polish, feedback, "juice"                   |
| 5    | FNAF: Security Breach                                                 | 2021      | Business Dev    | 3D space, atmosphere, navigation            |
| 6    | Sid Meier's Ace Patrol                                                | 2013      | Senior Producer | 3D interaction and strategy                 |
| 7    | Rampage 2: Universal Tour                                             | 1999      | Producer        | Polish and progression around a simple loop |
| 8    | All of the above                                                      | —         | —               | Montage / celebration                       |

---

## Differentiation

**Fast finishers:**

- Custom pixel art / 3D textures
- Advanced mechanics: double jump, wall slide, boss fights, dialogue
- Explore GDevelop's AI features
- Peer mentor: help classmates debug (teaching deepens learning)
- Start preparing Steam export early

**Students who need support:**

- Start from instructor's template project and modify/extend it
- Pair with a stronger student during build time
- Focus on design (level layout, art, theming) over event logic
- Pre-built event "recipes" to copy and adapt

**Students who miss a week:**

- Catch-up project file matching that week's start state
- 10-min 1-on-1 recap during build time

---

## Guest Speaker Framework

**Brian Lowe** confirmed for Weeks 1, 4, and 8, with optional drop-ins.

| Week | Brian's Role | Theme                                                              |
| ---- | ------------ | ------------------------------------------------------------------ |
| 1    | Keynote      | "What it's like to make games" — career, genres, inspiration       |
| 4    | Craft talk   | "The craft of polish" — game feel, QA, shipping decisions          |
| 8    | Capstone     | Plays student games, producer feedback, career Q&A, sends them off |

**Additional guest slots** (if Daniel's other game designer/producer friends are available):

- **Week 2 or 3:** A 2D artist, animator, or pixel art specialist
- **Week 5 or 6:** A 3D artist, level designer, or environment artist
- **Any week:** A QA tester, sound designer, or narrative designer

---

## Semester Summary

| Week | Date      | Arc         | Focus                                  | Featured Game         | Guest    |
| ---- | --------- | ----------- | -------------------------------------- | --------------------- | -------- |
| 1    | Apr 17    | Foundations | Intro to game design + GDevelop        | Multi-game tour       | 🎤 Brian |
| 2    | Apr 24    | 2D          | Sprites, movement, world building      | Gunstar Heroes        |          |
| 3    | May 1     | 2D          | Enemies, hazards, level design         | Sonic & Knuckles      |          |
| 4    | May 8     | 2D          | Scoring, polish, "juice," publishing   | Rock Band 3           | 🎤 Brian |
| 5    | May 15    | 3D          | 3D space, camera, environment          | FNAF: Security Breach |          |
| 6    | May 22 ⚠️ | 3D          | Interaction, enemies, storytelling     | Ace Patrol            |          |
| 7    | May 29    | 3D          | Polish, levels, publishing prep        | Rampage 2             |          |
| 8    | Jun 5     | 🎉          | Demo Day — parents, arcade, celebrate! | All of them           | 🎤 Brian |

</details>
