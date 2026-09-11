# Endgame and production

# 42. Endgame

Endgame is about continuing to improve builds.

## 42.1 Endgame Activities

| Activity            | Description                          |
| ------------------- | ------------------------------------ |
| MVP Farming         | Farm bosses for rare drops           |
| Challenge Dungeons  | Harder versions of existing dungeons |
| Starfall Tower      | Floor-based challenge mode           |
| Build Completion    | Farm sigils, gear, refinement        |
| Bestiary Completion | Unlock monster knowledge bonuses     |
| Class Trials        | Hard class-specific encounters       |
| Secret Bosses       | Optional high-difficulty fights      |

## 42.2 Challenge Dungeon Modifiers

Examples:

| Modifier  | Effect                          |
| --------- | ------------------------------- |
| Burning   | Fire hazards appear             |
| Cursed    | Healing reduced                 |
| Swarming  | More monsters                   |
| Elite     | More elite monsters             |
| Fragile   | Player takes more damage        |
| Treasure  | Better drops                    |
| Elemental | Monsters gain elemental bonuses |

## 42.3 Starfall Tower

A 30-floor endgame challenge.

Every 5 floors:

* Miniboss

Every 10 floors:

* Major boss

Rewards:

* Sigils
* Refinement materials
* Cosmetics
* Mythic crafting materials
* Class augment items

---

# 45. Production Scope

This is a complete product vision, but it is large for a hobby project.

## 45.1 Full Version Content Target

| Content Type          |       Target |
| --------------------- | -----------: |
| Playable base classes |            4 |
| Advanced classes      |            8 |
| Towns                 |            6 |
| Field maps            |        20–30 |
| Dungeons              |            8 |
| Monster types         |       80–120 |
| MVP bosses            |         8–12 |
| Items                 |      300–500 |
| Skills                |      120–160 |
| Support companions    |          4–6 |
| Campaign length       |  20–35 hours |
| Completionist length  | 80–150 hours |

## 45.2 Practical Development Phases

Even though this GDD describes a full product, development should happen in stages.

### Phase 1: Core Prototype

* One map
* One class
* Click movement
* One monster
* Basic attack
* XP and level up
* Basic loot

### Phase 2: Vertical Slice

* One town
* Three maps
* One dungeon
* Two classes
* Inventory
* Equipment
* Skills
* Boss
* Save/load

### Phase 3: Core Game

* Four base classes
* Full stat system
* Full skill system
* Crafting
* Refinement
* Support companion
* Multiple towns
* Multiple dungeons

### Phase 4: Full Campaign

* All regions
* Campaign acts
* Advanced classes
* Boss progression
* Complete itemization

### Phase 5: Endgame

* MVP farming
* Challenge dungeons
* Starfall Tower
* Mythic items
* Build completion systems

### Phase 6: Polish

* Balance
* UI polish
* Audio
* Visual effects
* Accessibility
* Performance
* Bug fixing

---

# 46. Main Risks

## 46.1 Scope Creep

The biggest risk is content volume.

Classes, skills, monsters, items, and maps can expand endlessly.

Control this by making systems data-driven and reusing enemy behaviors.

## 46.2 Pathfinding Complexity

Click-to-move requires good pathfinding.

Bad pathfinding will make the game feel broken.

Prioritize this early.

## 46.3 UI Complexity

RPG systems require many screens.

Inventory, stats, gear, skills, crafting, refinement, storage, and bestiary need careful UI design.

Keep the UI functional before making it beautiful.

## 46.4 Balance Complexity

Four base classes and eight advanced classes are a lot.

Use spreadsheets or JSON-based simulations to test:

* DPS
* Time to kill
* XP per minute
* Gold per minute
* Boss survival
* Gear power curves

## 46.5 Art Volume

Pixel art is time-consuming.

Reduce art burden by:

* Recoloring variants
* Reusing skeleton animation structures
* Making small towns
* Using compact sprites
* Prioritizing readability over excessive animation

---

# 47. Definition of Done for Full Product

The game can be considered complete when:

* The player can create a character and choose a class immediately.
* All 4 base classes are playable.
* All 8 advanced classes are implemented.
* The player can reach level 99.
* The main campaign can be completed.
* All major towns exist.
* All main regions exist.
* All main dungeons exist.
* MVP bosses are farmable.
* Gear, crafting, refinement, and sigils are functional.
* Support companions are functional.
* Save/load is stable.
* UI supports all major systems.
* The game has enough content for long-term build farming.
* No class is blocked from solo completion.
* The game has its own original world, names, monsters, and art.

---

# 48. Final Design Summary

**Phrok** is a single-player, top-down, pixel art RPG that captures the best parts of classic Ragnarok-like design without copying its IP or depending on MMO systems.

The player does not begin as a novice. The player immediately chooses a class and starts building toward a unique playstyle.

The game is not primarily a quest RPG. It is an adventuring and buildcraft RPG where the fun comes from maps, monsters, loot, stats, skills, gear, crafting, and bosses.

Merchant and Acolyte concepts are removed as playable classes and redesigned as NPC services, support systems, and optional companions.

The technical direction is intentionally practical: **Phaser.js**, **TypeScript**, **Tiled**, **Aseprite**, and data-driven JSON content.

The final product should feel like a compact single-player MMO world built for one person: a game where the player can log in, pick a map, farm monsters, improve the character, chase rare drops, defeat MVPs, and slowly perfect a build over many sessions.
