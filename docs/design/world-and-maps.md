# World and maps

# 6. Game World Overview

## 6.1 World Structure

The world is divided into several regions connected by towns and field maps.

The game should feel like a compact but complete fantasy continent.

Main regions:

1. **Crownfield**

   * Starting kingdom region
   * Grassy fields, beginner monsters, sewers, old roads

2. **Mossvale**

   * Forest region
   * Wolves, plants, insects, spirits, archery village

3. **Amber Dunes**

   * Desert region
   * Scorpions, bandits, snakes, ruins, buried tombs

4. **Blueharbor Coast**

   * Port region
   * Beach monsters, sea caves, pirates, aquatic mobs

5. **Ironroot Highlands**

   * Mining region
   * Golems, goblins, ores, smithing materials

6. **Moonveil Marsh**

   * Swamp region
   * Poison monsters, undead, curses, dark magic

7. **Starfall Tower**

   * Arcane endgame region
   * Magical constructs, demons, elementals, high-level bosses

---

# 7. Town Design

Towns are safe hubs with NPCs, services, merchants, storage, and small pieces of worldbuilding.

They do not need to be huge. Each town can be compact but dense.

## 7.1 Town Functions

Every major town should include:

| NPC / Service    | Function                                        |
| ---------------- | ----------------------------------------------- |
| Innkeeper        | Restores HP/SP, sets respawn point              |
| Storage Keeper   | Shared storage across towns                     |
| General Merchant | Sells potions, basic tools, arrows, scrolls     |
| Weapon Merchant  | Sells basic weapons                             |
| Armor Merchant   | Sells basic armor                               |
| Refiner          | Improves equipment                              |
| Crafter          | Crafts gear from materials                      |
| Support Shrine   | Lets player configure support summon            |
| Cart Trader      | Merchant-like NPC for buying/selling bulk goods |
| Healer           | Paid healing and status removal                 |
| Travel Agent     | Unlocks fast travel between discovered towns    |
| Hunter Board     | Repeatable monster kill tasks                   |
| Guild NPCs       | Class-specific information and skill flavor     |
| Quest NPCs       | Optional story and region quests                |

## 7.2 Town Size Guidelines

Small town:

* 1 screen or 2 connected screens
* 8–12 NPCs
* 1–2 shops
* 1 special service

Major city:

* 3–5 screens
* 20–30 NPCs
* Multiple shops
* Class halls
* Crafting district
* Storage
* Travel hub
* Campaign NPCs

---

# 8. Campaign Structure

The campaign exists to create progression structure, not to replace monster farming.

The campaign should:

* Introduce each major region
* Unlock towns
* Unlock dungeons
* Introduce MVP bosses
* Unlock advanced class specialization
* Introduce crafting and refinement
* Give the player reasons to explore maps
* Provide a final boss and ending

The campaign should **not** force the player through long dialogue sequences or constant quest chains.

## 8.1 Campaign Acts

| Act      | Level Range | Main Region            | Purpose                                           |
| -------- | ----------: | ---------------------- | ------------------------------------------------- |
| Act 1    |        1–15 | Crownfield             | Tutorial, first town, first dungeon               |
| Act 2    |       15–30 | Mossvale / Blueharbor  | Open world expansion                              |
| Act 3    |       30–45 | Amber Dunes / Ironroot | Advanced systems and class specialization         |
| Act 4    |       45–65 | Moonveil Marsh         | Harder mobs, status effects, stronger bosses      |
| Act 5    |       65–80 | Starfall Tower         | Campaign climax                                   |
| Postgame |       80–99 | All regions            | MVP farming, challenge dungeons, build completion |

## 8.2 Campaign Philosophy

Campaign quests should be short.

Good campaign objective examples:

* Defeat a specific elite monster
* Reach a new town
* Clear a dungeon floor
* Collect a boss fragment
* Unlock a travel route
* Investigate a corrupted map
* Defeat a regional MVP

Bad campaign objective examples:

* Talk to 8 NPCs in a row
* Deliver messages repeatedly
* Long forced exposition
* Mandatory fetch quests with low combat relevance
* Excessive puzzle gates

---

# 9. Quest Design

Quests exist, but they are not the main content.

Most progression should come from:

* Killing monsters
* Gaining experience
* Finding gear
* Farming materials
* Defeating bosses
* Improving builds

## 9.1 Quest Types

| Quest Type       | Priority | Description                                        |
| ---------------- | -------: | -------------------------------------------------- |
| Campaign Quest   |   Medium | Unlocks regions and major systems                  |
| Class Quest      |   Medium | Unlocks class-specific skills, passives, cosmetics |
| Hunting Contract |     High | Repeatable kill tasks for XP/materials             |
| Crafting Request |   Medium | Teaches crafting and rewards recipes               |
| NPC Side Quest   |      Low | Small worldbuilding or optional reward             |
| Boss Quest       |     High | Guides player toward major boss fights             |
| Collection Quest |      Low | Optional completionist content                     |

## 9.2 Hunting Board

Every town has a hunting board.

Example contracts:

| Contract       | Target                   | Reward                  |
| -------------- | ------------------------ | ----------------------- |
| Slime Control  | Defeat 30 Green Jellies  | XP, gold, potion bundle |
| Wolf Trouble   | Defeat 20 Forest Wolves  | XP, leather             |
| Bone Echoes    | Defeat 25 Cave Skeletons | XP, bone fragments      |
| Poison Cleanup | Defeat 15 Marsh Serpents | Antidotes, venom sacs   |
| Elite Hunt     | Defeat 1 named elite     | Rare material           |

Hunting boards are important because they give direction without making quests the core of the game.

---

# 10. Player Controls

## 10.1 Core Control Scheme

| Action                    | Input                |
| ------------------------- | -------------------- |
| Move                      | Left click on ground |
| Attack target             | Left click enemy     |
| Interact with NPC/object  | Left click           |
| Use skill slots           | Number keys 1–8      |
| Use potion slot 1         | Q                    |
| Use potion slot 2         | E                    |
| Stop movement             | S or Space           |
| Open inventory            | I                    |
| Open character stats      | C                    |
| Open skills               | K                    |
| Open map                  | M                    |
| Open quest log            | L                    |
| Open bestiary             | B                    |
| Open equipment            | P or V               |
| Show item labels          | Alt                  |
| Toggle auto-attack target | A                    |

WASD movement is not supported.

## 10.2 Movement Rules

Movement is click-to-move.

When the player clicks:

1. The game calculates a path to the clicked location.
2. The player walks along the path.
3. If the player clicks again, the path updates.
4. If the player clicks an enemy, the character moves into attack range.
5. If the enemy moves, the player follows until in range or until cancelled.

## 10.3 Skill Targeting

Skill types:

| Skill Type   | Targeting                                               |
| ------------ | ------------------------------------------------------- |
| Self buff    | Press hotkey                                            |
| Target enemy | Press hotkey, click enemy                               |
| Ground AoE   | Press hotkey, click ground                              |
| Directional  | Press hotkey, uses facing direction or cursor direction |
| Passive      | Always active after learned                             |
| Toggle       | Press hotkey to enable/disable                          |

For simplicity, the game can support quick-cast options later.

---

# 11. Camera and View

## 11.1 View

The game uses a strict **2D top-down tile view**.

No isometric angle.

No simulated 3D perspective.

No complex verticality.

## 11.2 Camera

The camera follows the player with slight smoothing.

Recommended behavior:

* Camera centered on player
* Slight dead zone to reduce jitter
* Optional small look-ahead toward cursor
* No rotation
* No zoom during normal gameplay
* Optional zoom out on world map or boss arenas

## 11.3 Tile Size

Recommended tile size:

| Asset Type             | Size              |
| ---------------------- | ----------------- |
| Base tile              | 32×32 px          |
| Small character sprite | 32×32 or 32×48 px |
| Medium monster         | 32×32 or 48×48 px |
| Large monster          | 64×64 px          |
| MVP boss               | 96×96 or larger   |
| Item icon              | 24×24 or 32×32 px |
| Skill icon             | 32×32 px          |

For Phaser.js, 32×32 tiles are practical and readable.

---

# 32. Map Design

## 32.1 Map Types

| Map Type      | Function                     |
| ------------- | ---------------------------- |
| Town          | Safe hub                     |
| Field         | Regular farming              |
| Road          | Connects regions             |
| Dungeon       | Higher density and bosses    |
| Cave          | Resource and monster farming |
| Boss Arena    | Special encounters           |
| Challenge Map | Endgame modifiers            |
| Secret Map    | Optional discovery           |

## 32.2 Field Map Requirements

Each field map should include:

* 3–5 monster types
* 1 elite variant
* 1 rare spawn or event
* 3–6 gathering nodes
* 1–3 treasure spots
* Clear entrance/exit points
* Distinct terrain identity
* Monster drop table

## 32.3 Dungeon Requirements

Each dungeon should include:

* Multiple floors or sections
* Higher monster density
* Environmental hazards
* One miniboss
* One final boss
* Rare crafting materials
* Shortcut unlocks
* Return reason after first clear

## 32.4 Example Map Progression

| Level Range | Maps                                           |
| ----------- | ---------------------------------------------- |
| 1–10        | Crownfield Meadows, Old Road, Training Sewers  |
| 10–20       | Mossvale Edge, Rat Warrens, Green Chapel Ruins |
| 20–35       | Deep Mossvale, Blueharbor Beach, Tide Cave     |
| 35–50       | Amber Dunes, Ironroot Mines, Bandit Pass       |
| 50–65       | Moonveil Marsh, Cursed Bell Crypt              |
| 65–80       | Starfall Outer Tower, Rune Archive             |
| 80–99       | Deep Tower, Echo Dungeons, MVP Arenas          |

---

# 33. Dungeons

## 33.1 Dungeon List

| Dungeon            | Level Range | Theme                           | Boss              |
| ------------------ | ----------: | ------------------------------- | ----------------- |
| Old Sewers         |        8–15 | Rats, slimes, spores            | Sewer Glutton     |
| Green Chapel Ruins |       19–25 | Plants, spirits, undead         | Thorn Priest      |
| Tide Cave          |       25–38 | Aquatic monsters, pirates       | Sunken Corsair    |
| Ironroot Mine      |       35–50 | Goblins, beetles, ore           | Brass Burrower    |
| Buried Sun Tomb    |       40–55 | Desert undead, snakes           | Dune Tyrant       |
| Cursed Bell Crypt  |       55–70 | Wraiths, curses, undead knights | Bell Wraith       |
| Starfall Tower     |       70–90 | Magic, constructs, demons       | Rune Chimera      |
| Fallen Observatory |       85–99 | Endgame arcane horror           | Fallen Star Saint |

## 33.2 Dungeon Replay Value

Dungeons should remain useful through:

* Rare drops
* Crafting materials
* Repeatable boss fights
* Hidden rooms
* Class-specific loot
* Endgame challenge versions
* Monster collection goals

---

# 34. Bestiary

The bestiary is an important system because monster knowledge is central to the game.

## 34.1 Bestiary Unlocks

When the player kills monsters, the bestiary fills in.

| Kills | Unlock                                                   |
| ----: | -------------------------------------------------------- |
|     1 | Name, sprite, level                                      |
|     5 | Element, race, behavior                                  |
|    15 | Common drops                                             |
|    30 | Rare drops                                               |
|    50 | Combat tips                                              |
|   100 | Small permanent damage bonus against that monster family |

## 34.2 Bestiary Entry Example

```text
Moss Wolf
Level: 16
Race: Beast
Element: Neutral
Behavior: Assist
Weakness: Fire, bleed
Common Drops: Wolf Fur, Small Fang
Rare Drops: Wolf Leather, Pack Fang
Combat Tip: Avoid pulling multiple wolves at once because nearby wolves assist each other.
```

---
