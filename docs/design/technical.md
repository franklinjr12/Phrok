# Technical design

# 36. Art Direction

## 36.1 Art Style

Pixel art with bright fantasy colors, readable silhouettes, and compact sprites.

Visual goals:

* Charming
* Clean
* Colorful
* Readable
* Slightly nostalgic
* Not overly dark
* Not overly realistic

## 36.2 Character Sprites

Recommended format:

| Sprite Type    | Size               |
| -------------- | ------------------ |
| Player         | 32×48 px           |
| NPC            | 32×48 px           |
| Small monster  | 32×32 px           |
| Medium monster | 48×48 px           |
| Large monster  | 64×64 px           |
| MVP            | 96×96 px or larger |

## 36.3 Animation Requirements

Player animations:

* Idle, 4 directions
* Walk, 4 directions
* Basic attack, 4 directions
* Cast, 4 directions
* Hit reaction
* Death
* Skill-specific effects can be separate VFX

Monster animations:

* Idle
* Walk
* Attack
* Hit
* Death
* Special cast for advanced monsters

## 36.4 Aseprite Pipeline

Aseprite is used for:

* Character sprites
* Monster sprites
* Tilesets
* Item icons
* Skill icons
* UI elements
* Animation tags
* Sprite sheet exports

Recommended export format:

* PNG sprite sheets
* JSON animation metadata
* Separate folders by entity type

Example:

```text
assets/
  sprites/
    player/
      swordsman.png
      swordsman.json
    monsters/
      green_jelly.png
      green_jelly.json
  tilesets/
    crownfield_tiles.png
  ui/
    icons/
```

---

# 37. Audio Direction

## 37.1 Music

Music should support long farming sessions.

Tracks should be:

* Loopable
* Pleasant
* Not too intense for field maps
* More dramatic for bosses
* Distinct by region

Music categories:

| Category | Style                                   |
| -------- | --------------------------------------- |
| Town     | Calm, melodic, safe                     |
| Field    | Light adventure                         |
| Dungeon  | Mysterious, repetitive but not annoying |
| Boss     | Energetic and tense                     |
| Endgame  | Arcane, powerful, darker                |

## 37.2 Sound Effects

Important SFX:

* Click movement
* Attack hits
* Skill casts
* Item pickup
* Gold pickup
* Level up
* Skill unlock
* Gear equip
* Refinement success/failure
* Boss spawn
* Rare drop
* UI open/close

Rare drop sound should be especially satisfying.

---

# 38. Technical Design

## 38.1 Recommended Stack

| Area            | Tool                                     |
| --------------- | ---------------------------------------- |
| Engine          | Phaser.js                                |
| Language        | TypeScript                               |
| Build tool      | Vite                                     |
| Map editor      | Tiled                                    |
| Art             | Aseprite                                 |
| Data            | JSON                                     |
| Save            | localStorage first, IndexedDB later      |
| Version control | Git                                      |
| Packaging       | Web first, Electron/Tauri optional later |

## 38.2 Why Phaser.js

Phaser is a strong choice for this hobby project because:

* It works well in the browser
* It is code-first
* It is friendly to AI coding agents
* TypeScript works well with structured game data
* It supports tilemaps
* It is easy to run and test quickly
* It can later be packaged for desktop or mobile wrappers

## 38.3 Recommended Project Structure

```text
src/
  main.ts
  game/
    Game.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      MainMenuScene.ts
      CharacterCreationScene.ts
      WorldScene.ts
      UIScene.ts
      BattleScene.ts
    systems/
      MovementSystem.ts
      CombatSystem.ts
      SkillSystem.ts
      LootSystem.ts
      InventorySystem.ts
      EquipmentSystem.ts
      LevelSystem.ts
      SaveSystem.ts
      QuestSystem.ts
      SpawnSystem.ts
      DialogueSystem.ts
      SupportSystem.ts
      RefinementSystem.ts
      CraftingSystem.ts
    entities/
      Player.ts
      Monster.ts
      NPC.ts
      Drop.ts
      Projectile.ts
      SupportCompanion.ts
    data/
      classes/
      skills/
      monsters/
      items/
      maps/
      quests/
      recipes/
      npcs/
    ui/
      windows/
      components/
      hud/
assets/
  sprites/
  tilesets/
  maps/
  audio/
  ui/
public/
```

## 38.4 Data-Driven Design

Most gameplay data should be stored in JSON.

Examples:

* Monsters
* Items
* Skills
* Classes
* Recipes
* Maps
* NPC dialogues
* Drop tables
* Quests
* Support companions

This makes the project much easier for AI agents to edit.

---

# 39. Example Data Schemas

## 39.1 Monster JSON

```json
{
  "id": "moss_wolf",
  "name": "Moss Wolf",
  "level": 16,
  "family": "beast",
  "element": "neutral",
  "behavior": ["aggressive", "assist"],
  "stats": {
    "hp": 420,
    "attack": 38,
    "defense": 12,
    "magicDefense": 4,
    "hit": 170,
    "dodge": 145
  },
  "drops": [
    { "itemId": "wolf_fur", "chance": 0.42 },
    { "itemId": "sharp_fang", "chance": 0.18 },
    { "itemId": "wolf_leather", "chance": 0.04 }
  ],
  "xp": 85,
  "gold": [8, 14],
  "sprite": "moss_wolf"
}
```

## 39.2 Skill JSON

```json
{
  "id": "power_slash",
  "name": "Power Slash",
  "class": "swordsman",
  "type": "active",
  "targeting": "enemy",
  "maxLevel": 10,
  "requirements": {
    "level": 1,
    "skills": []
  },
  "scaling": {
    "stat": "STR",
    "multiplierPerLevel": 0.15
  },
  "spCost": [8, 9, 10, 11, 12, 13, 14, 15, 16, 18],
  "cooldown": 1.2,
  "description": "Strike one enemy with a powerful melee attack."
}
```

## 39.3 Item JSON

```json
{
  "id": "iron_sword",
  "name": "Iron Sword",
  "type": "weapon",
  "subtype": "sword",
  "rarity": "uncommon",
  "requiredLevel": 12,
  "allowedClasses": ["swordsman", "knight", "guardian"],
  "stats": {
    "attack": 34,
    "str": 1
  },
  "refinable": true,
  "sellPrice": 120,
  "description": "A reliable iron sword used by young adventurers."
}
```

---

# 40. Phaser Implementation Notes

## 40.1 Scenes

Recommended scene structure:

| Scene                  | Responsibility                |
| ---------------------- | ----------------------------- |
| BootScene              | Initialize config             |
| PreloadScene           | Load assets                   |
| MainMenuScene          | New game, load game, settings |
| CharacterCreationScene | Create character              |
| WorldScene             | Main gameplay                 |
| UIScene                | HUD and windows               |
| DialogueScene          | Optional overlay for dialogue |
| GameOverScene          | Death and respawn handling    |

## 40.2 Tilemaps

Use Tiled maps exported as JSON.

Each map should include layers:

| Layer         | Purpose                        |
| ------------- | ------------------------------ |
| Ground        | Base tiles                     |
| Decoration    | Grass, flowers, minor details  |
| Collision     | Blocking tiles                 |
| Above         | Roofs, tree tops, tall objects |
| SpawnZones    | Monster spawn areas            |
| NPCs          | NPC placement                  |
| Portals       | Map transitions                |
| Interactables | Chests, signs, gathering nodes |

## 40.3 Pathfinding

Because movement is left-click only, pathfinding is important.

Recommended approach:

* Use grid-based A* pathfinding
* Collision layer from Tiled defines blocked tiles
* Monsters can use simpler steering or A*
* Player path should update on new click
* If target is enemy, path to attack range

## 40.4 Combat Targeting

Entity selection:

* Click enemy to select and attack
* Hover highlights enemy
* Target frame appears on HUD
* Skills can use selected target by default
* Ground skills require cursor placement

## 40.5 Save System

For browser version:

* Use localStorage for early development
* Use IndexedDB for larger saves later

Save data:

```json
{
  "version": "1.0.0",
  "character": {},
  "inventory": {},
  "equipment": {},
  "storage": {},
  "worldState": {},
  "quests": {},
  "bestiary": {},
  "settings": {}
}
```

---

# 41. Save and Death

## 41.1 Save Points

Autosave on:

* Map transition
* Level up
* Boss defeat
* Quest completion
* Crafting
* Refinement
* Equipment change
* Manual save in town

## 41.2 Death

On death:

* Player respawns at last town or shrine
* No item loss
* Small gold penalty
* Temporary durability damage
* Boss encounter resets

Death should punish mistakes but not waste too much time.

---

# 43. Build Examples

## 43.1 STR/VIT Guardian

Focus:

* Survive large packs
* Shield skills
* Holy damage
* Block and counter

Good for:

* Undead dungeons
* New players
* Safe boss progression

Weakness:

* Slower farming
* Lower burst damage

## 43.2 INT/DEX Wizard

Focus:

* High magic damage
* AoE clearing
* Elemental weakness exploitation

Good for:

* Dense monster maps
* Dungeon farming
* Elemental bosses

Weakness:

* Fragile
* SP hungry
* Needs positioning

## 43.3 DEX/AGI Hunter

Focus:

* Ranged damage
* Traps
* Kiting
* Falcon support

Good for:

* Boss preparation
* Field farming
* Safe ranged play

Weakness:

* Can struggle when surrounded
* Requires trap planning

## 43.4 AGI/LUK Assassin

Focus:

* Crits
* Poison
* Fast attacks
* Single-target burst

Good for:

* Bosses
* Elites
* Fast farming

Weakness:

* Lower AoE
* Vulnerable to bad pulls

---
