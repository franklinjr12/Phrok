## Epic M10-E02 — Platform Expansion

### M10-E02-T001 — Evaluate desktop wrapper

**Priority:** P3
**Dependencies:** M9-E05-T004

Evaluate Electron or Tauri packaging.

**Acceptance Criteria**

* Desktop packaging feasibility is documented.
* Save file location is decided.
* Performance impact is measured.
* Packaging does not become required for web version.

---

### M10-E02-T002 — Evaluate mobile adaptation

**Priority:** P3
**Dependencies:** M9-E05-T004

Evaluate Android/mobile feasibility.

**Acceptance Criteria**

* Touch input needs are documented.
* UI scaling issues are documented.
* Performance risks are documented.
* Scope for mobile version is estimated.

---

# 16. Recommended Implementation Order

## Stage 1 — First playable loop

1. M0-E01-T001 — Source folder architecture.
2. M0-E01-T002 — Scene lifecycle.
3. M0-E02-T001 — Data registry.
4. M0-E02-T002 — TypeScript data types.
5. M0-E02-T004 — Placeholder JSON.
6. M1-E01-T001 — Player entity.
7. M1-E02-T001 — Load Tiled map.
8. M1-E02-T002 — Collision.
9. M1-E01-T002 — Click movement.
10. M1-E02-T004 — Pathfinding.
11. M1-E03-T001 — Enemy entity.
12. M1-E03-T002 — Target enemy.
13. M1-E03-T003 — Auto-attack.
14. M1-E04-T001 — XP gain.
15. M1-E04-T003 — Loot drops.

Goal: player can move, kill, gain XP, and loot.

---

## Stage 2 — Vertical slice

1. Character creation.
2. Four base classes.
3. Crownfield town.
4. Crownfield Meadows.
5. Map transitions.
6. NPC dialogue.
7. HUD.
8. Inventory.
9. Equipment.
10. Save/load.
11. Old Sewers dungeon.
12. First boss.

Goal: 30–60 minute playable slice.

---

## Stage 3 — RPG systems

1. Stat allocation.
2. Derived stats.
3. Skill allocation.
4. Hotbar.
5. Target/self/ground/passive skills.
6. Status effects.
7. Enemy AI.
8. Shops.
9. Storage.
10. Crafting.
11. Refinement.
12. Bestiary.
13. Hunting board.

Goal: the game feels like a real RPG.

---

## Stage 4 — Classes

1. Finish all base class skills.
2. Add level 40 specialization.
3. Implement all advanced classes.
4. Validate all class gear restrictions.
5. Validate all classes through midgame.
6. Balance damage/survival.

Goal: buildcraft becomes the center of the game.

---

## Stage 5 — Content expansion

1. Add all regions.
2. Add all towns.
3. Add all field maps.
4. Add all dungeons.
5. Add monsters.
6. Add loot tables.
7. Add items.
8. Add recipes.
9. Add bosses.
10. Add campaign acts.

Goal: full campaign content exists.

---

## Stage 6 — Endgame

1. Add MVP summoning.
2. Add MVP respawns.
3. Add endgame bosses.
4. Add Starfall Tower.
5. Add dungeon modifiers.
6. Add class trials.
7. Add endgame rewards.

Goal: post-campaign farming works.

---

## Stage 7 — Polish and release

1. UI polish.
2. Tooltips.
3. Audio.
4. VFX.
5. Accessibility.
6. Performance optimization.
7. Save migration.
8. Full playthrough QA.
9. Placeholder asset replacement.
10. Release candidate build.

Goal: stable release candidate.

---

# 17. MVP Cut Recommendation

If the full scope becomes too large, cut in this order:

## Keep no matter what

* Mouse click movement.
* Four base classes.
* Leveling.
* Stats.
* Skills.
* Combat.
* Loot.
* Equipment.
* Inventory.
* Save/load.
* One town.
* Two fields.
* One dungeon.
* One boss.
* Shops.
* Basic crafting or refinement.

## Cut first

* Full campaign.
* Starfall Tower.
* Challenge dungeons.
* Class trials.
* Extra towns.
* Some advanced classes.
* Support companion leveling.
* 300+ items.
* 100+ monsters.
* Cosmetics.
* Optional card system.

## Best MVP target

A strong MVP should include:

* Character creation.
* Four base classes.
* Level cap 20.
* One town.
* Three maps.
* One dungeon.
* One boss.
* 30 items.
* 20 skills.
* 10 monsters.
* Shops.
* Inventory.
* Equipment.
* Save/load.
* Basic crafting.
* Basic refinement.

---

# 18. Final Release Definition

The game is release-ready when:

* A new player can create a character and immediately choose a class.
* Movement is fully playable with left mouse click only.
* All four base classes are playable.
* All eight advanced classes are playable.
* The player can reach level 99.
* Stats, skills, equipment, loot, crafting, refinement, sigils, and supports work.
* Towns, maps, dungeons, bosses, and MVPs are connected into a complete world.
* The campaign can be completed.
* Endgame farming exists.
* Save/load is reliable.
* UI is readable.
* Performance is acceptable.
* The game uses original names, art, lore, enemies, UI, and assets.
* No critical bugs block progression.
* All major systems have been tested through full playthroughs.
