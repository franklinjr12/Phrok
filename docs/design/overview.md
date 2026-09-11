# Core game loop

# Game Design Document

# Working Title: **Phrok**

## 1. Executive Summary

**Phrok** is a single-player 2D top-down pixel art RPG inspired by the core design appeal of classic Ragnarok Online: open-ended adventuring, class identity, stat allocation, skill builds, gear progression, rare item drops, monster-filled maps, towns with useful NPCs, and powerful MVP-style bosses.

The game is not designed as a story-first RPG. It has a campaign, but the campaign exists mainly to introduce regions, unlock systems, guide progression, and give structure to the world. The real core of the game is:

> Choose a class, explore maps, kill monsters, collect loot, improve gear, allocate stats, unlock skills, farm bosses, and craft a personal character build.

The game is built for a hobby developer who wants to create and play a complete single-player RPG, while keeping the implementation friendly to AI coding agents. The recommended stack is **Phaser.js**, **TypeScript**, **Tiled**, and **Aseprite**.

This document describes the full product vision, not just an MVP.

---

# 2. Design Pillars

## 2.1 Buildcraft First

The player should constantly make meaningful build decisions:

* Which stats to raise
* Which skills to unlock
* Which passive bonuses to prioritize
* Which gear effects to combine
* Which monsters to farm for materials
* Which boss drops are worth chasing
* Which maps are best for the current build

The game should feel rewarding even when the player is not advancing the campaign.

## 2.2 Map-Based Adventuring

The world is divided into towns, fields, caves, forests, ruins, mines, deserts, beaches, towers, and dungeons.

Each map should have:

* A clear visual identity
* A specific monster roster
* Specific drops
* One or more elite enemies
* Optional rare spawns
* A reason to return later
* A place in the progression curve

The game should avoid becoming a linear corridor RPG.

## 2.3 Single-Player Ragnarok-Like Progression

The game should preserve the feeling of classic MMO progression while adapting it to solo play.

Keep:

* Classes
* Stats
* Skills
* Equipment
* Drops
* Monster farming
* Boss farming
* Town services
* Refinement
* Crafting
* Storage
* NPC shops
* Elemental advantages
* Rare loot chase

Remove or redesign:

* Party dependency
* Player economy
* Vending as a player class feature
* Support-only playable classes
* Waiting hours for bosses
* Excessive MMO grind
* Novice phase

## 2.4 Immediate Class Identity

The player does **not** start as a novice.

At character creation, the player immediately chooses a class.

The first minutes of the game should already make the player feel like:

* A sword-wielding fighter
* A spellcasting mage
* A bow-using archer
* A dagger-using thief

No generic beginner phase is required.

## 2.5 Simple 2D Top-Down Presentation

The game uses a pure **2D top-down view**.

No isometric depth simulation is required. No complex depth sorting is required beyond simple sprite layering where necessary.

The goal is to make development simpler while preserving the charm of tile-based pixel RPG maps.

## 2.6 Mouse-First Controls

Movement is done with **left mouse click only**.

The game should feel like a classic point-and-click RPG/MMO.

WASD movement is intentionally not part of the design.

---

# 3. Genre and Product Definition

| Category         | Decision                                                     |
| ---------------- | ------------------------------------------------------------ |
| Genre            | Single-player 2D action RPG / looter RPG                     |
| View             | 2D top-down                                                  |
| Art style        | Pixel art                                                    |
| Core inspiration | Classic Ragnarok-like map, class, stat, and loot systems     |
| Platform         | Browser first, desktop package later                         |
| Engine           | Phaser.js                                                    |
| Language         | TypeScript                                                   |
| Art tool         | Aseprite                                                     |
| Map tool         | Tiled                                                        |
| Input            | Mouse-first, keyboard hotkeys for skills/items/UI            |
| Multiplayer      | None                                                         |
| Monetization     | None, hobby project                                          |
| Campaign         | Present, but secondary                                       |
| Main loop        | Explore → fight → loot → level → build → craft → farm bosses |

---

# 4. Target Experience

The ideal player experience:

1. Create a character and choose a class immediately.
2. Spawn in a small starting city.
3. Talk to NPCs, buy basic supplies, and choose a nearby hunting map.
4. Fight monsters with point-and-click movement and hotkey skills.
5. Gain levels, stat points, and skill points.
6. Collect monster drops and equipment.
7. Return to town to sell items, store loot, craft gear, and refine equipment.
8. Unlock new maps and stronger monsters.
9. Discover bosses and MVP-style encounters.
10. Experiment with different builds.
11. Farm rare drops and materials.
12. Complete campaign chapters when desired.
13. Continue into endgame boss farming, dungeon challenges, and build completion.

The player should be able to have fun even during a short 20-minute session.

---

# 5. Legal and IP Direction

This game should be **inspired by classic Ragnarok Online systems**, not a clone.

Do not copy:

* Names of cities
* Names of monsters
* Character sprites
* Skill icons
* Sound effects
* Music
* NPC names
* UI layout exactly
* Map layouts
* Lore
* Logos
* Item names directly

Safe inspiration areas:

* Class-based RPG structure
* Stat allocation
* Skill trees
* Monster farming
* Town services
* Equipment slots
* Refinement systems
* Rare drops
* Elemental damage
* MVP-style bosses
* Top-down point-and-click adventuring

The final game should have its own original setting, names, monsters, art, and world identity.

---
