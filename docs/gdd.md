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

# 12. Character Creation

At the start of the game, the player creates a character.

## 12.1 Character Creation Steps

1. Choose name
2. Choose visual appearance
3. Choose class
4. Choose starting stat preset
5. Confirm

## 12.2 Appearance Options

Minimum:

* Body type A/B
* Hair style
* Hair color
* Outfit palette based on class
* Skin tone

Cosmetic scope should stay small for the first full version.

## 12.3 Starting Classes

The playable classes are:

1. **Swordsman**
2. **Mage**
3. **Archer**
4. **Thief**

Removed as playable base classes:

* Merchant
* Acolyte

These are redesigned as NPC support systems, town services, and optional summons.

---

# 13. Class System

## 13.1 Class Philosophy

Each class must be fully viable for solo play.

No class should require a party.

Each class must have:

* A basic attack identity
* At least one single-target damage option
* At least one area option
* At least one defensive or escape option
* At least one sustain or recovery option
* Multiple build paths

## 13.2 Class Progression

The player chooses a base class at character creation.

At level 40, the player unlocks an advanced specialization.

The specialization does not erase the base class. It expands it.

| Base Class | Advanced Option 1 | Advanced Option 2 |
| ---------- | ----------------- | ----------------- |
| Swordsman  | Knight            | Guardian          |
| Mage       | Wizard            | Sage              |
| Archer     | Hunter            | Minstrel          |
| Thief      | Assassin          | Rogue             |

## 13.3 Why These Classes?

Playable classes should focus on direct solo adventuring.

Removed from playable roster:

| Removed Class Type | Reason                                            | New Role                                      |
| ------------------ | ------------------------------------------------- | --------------------------------------------- |
| Merchant           | Too economy-focused for solo play as a core class | NPC shops, crafting, cart traders, refinement |
| Acolyte            | Too support-focused for solo play as a core class | Healing NPCs, support summons, shrine buffs   |

Merchant and Acolyte concepts are still valuable, but they work better as world systems.

---

# 14. Player Attributes

The game uses six core attributes.

| Attribute | Main Effects                                          |
| --------- | ----------------------------------------------------- |
| STR       | Melee damage, carry weight, physical skill scaling    |
| AGI       | Attack speed, dodge, movement recovery                |
| VIT       | Max HP, defense, status resistance                    |
| INT       | Magic damage, max SP, SP recovery                     |
| DEX       | Accuracy, ranged damage, cast speed                   |
| LUK       | Critical chance, rare effect chance, small drop bonus |

## 14.1 Attribute Allocation

Each level grants attribute points.

Suggested progression:

| Level Range | Points Per Level |
| ----------- | ---------------: |
| 1–30        |                3 |
| 31–60       |                4 |
| 61–99       |                5 |

## 14.2 Attribute Cost

Attributes become more expensive as they increase.

| Attribute Value | Cost Per Point |
| --------------: | -------------: |
|            1–20 |              1 |
|           21–40 |              2 |
|           41–60 |              3 |
|           61–80 |              4 |
|           81–99 |              5 |

This creates long-term build commitment.

## 14.3 Derived Stats

| Derived Stat    | Formula Direction                 |
| --------------- | --------------------------------- |
| Max HP          | Level + VIT + class modifier      |
| Max SP          | Level + INT + class modifier      |
| Physical Attack | Weapon attack + STR/DEX scaling   |
| Magic Attack    | Weapon magic attack + INT scaling |
| Hit             | Level + DEX + LUK                 |
| Dodge           | Level + AGI + LUK                 |
| Critical        | LUK + equipment                   |
| Attack Speed    | Weapon type + AGI + DEX           |
| Defense         | Armor + VIT                       |
| Magic Defense   | Gear + INT                        |

---

# 15. Leveling System

There is one character level.

No separate base level and job level.

Maximum level: **99**

Each level grants:

* Attribute points
* Skill point
* Small automatic class stat growth
* Access to higher-level equipment and maps

## 15.1 XP Curve

The XP curve should feel grindy enough to support long play, but not as punishing as an MMO.

Suggested formula:

```text
XP_To_Next_Level = round(50 * Level^2 + 6 * Level^3)
```

Example pacing:

| Level | Expected State                       |
| ----: | ------------------------------------ |
|     1 | Character creation                   |
|     5 | Basic class loop understood          |
|    10 | First gear upgrades                  |
|    20 | First dungeon clears                 |
|    30 | First serious build decisions        |
|    40 | Advanced specialization unlocked     |
|    55 | Midgame boss farming                 |
|    70 | Campaign late game                   |
|    80 | Campaign completion range            |
| 90–99 | Endgame farming and build perfection |

---

# 16. Skill System

## 16.1 Skill Points

The player gains 1 skill point per level.

Skills have level requirements and sometimes skill prerequisites.

Because this is a solo hobby project, skill trees should be meaningful but not overly complex.

## 16.2 Skill Tree Structure

Each class has three branches:

| Branch Type        | Purpose                                |
| ------------------ | -------------------------------------- |
| Core Damage        | Main offensive skills                  |
| Utility / Survival | Movement, defense, sustain             |
| Build Specialty    | Passive modifiers and unique mechanics |

Each base class should have around:

* 8–12 base skills
* 8–12 advanced specialization skills
* 3–5 passives
* 1 capstone per specialization

---

# 17. Playable Classes

---

## 17.1 Swordsman

### Fantasy

A durable melee fighter who wins through weapon mastery, armor, positioning, and physical power.

### Combat Role

* Strong melee damage
* High HP
* Good defense
* Simple but reliable
* Best beginner class

### Main Stats

| Build          | Main Stats |
| -------------- | ---------- |
| Heavy Blade    | STR / VIT  |
| Fast Blade     | STR / AGI  |
| Shield Fighter | VIT / STR  |
| Skill Fighter  | STR / DEX  |

### Starting Weapon

Sword

### Basic Skills

| Skill           | Type    | Description                                      |
| --------------- | ------- | ------------------------------------------------ |
| Power Slash     | Active  | Strong single-target melee hit                   |
| Guard Stance    | Toggle  | Reduces damage but lowers movement speed         |
| Iron Body       | Passive | Increases HP and defense                         |
| Sweeping Cut    | Active  | Hits enemies in a small arc                      |
| Battle Cry      | Active  | Temporarily increases attack                     |
| Endure Pain     | Active  | Reduces stagger and knockback                    |
| Weapon Training | Passive | Increases melee weapon damage                    |
| Counter Blow    | Active  | Brief defensive window followed by counterattack |

---

## 17.2 Swordsman Advanced: Knight

### Fantasy

A mobile heavy warrior focused on aggressive melee damage.

### Specialty

* Two-handed weapons
* Charge attacks
* Cleave damage
* High burst physical damage

### Skills

| Skill            | Type     | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| Two-Hand Mastery | Passive  | Increases two-handed weapon damage                   |
| Charge Thrust    | Active   | Dashes to target and deals damage                    |
| Whirlwind Blade  | Active   | Circular AoE attack                                  |
| Heavy Impact     | Active   | Slow but powerful hit                                |
| Momentum         | Passive  | Consecutive attacks increase damage                  |
| Warpath          | Active   | Temporarily increases movement and attack speed      |
| Armor Breaker    | Active   | Reduces enemy defense                                |
| Knight’s Oath    | Capstone | Greatly improves melee damage after defeating elites |

---

## 17.3 Swordsman Advanced: Guardian

### Fantasy

A defensive fighter who uses shields, holy protection, and counterattacks.

### Specialty

* Shields
* Defense
* Sustain
* Anti-undead and anti-demon combat

### Skills

| Skill          | Type     | Description                               |
| -------------- | -------- | ----------------------------------------- |
| Shield Mastery | Passive  | Improves block and defense                |
| Shield Bash    | Active   | Stuns or interrupts enemies               |
| Radiant Guard  | Active   | Temporarily reduces incoming damage       |
| Retaliation    | Passive  | Chance to counter after blocking          |
| Sacred Edge    | Active   | Adds holy damage to attacks               |
| Last Stand     | Active   | Increases defense at low HP               |
| Barrier Circle | Active   | Creates a protective zone                 |
| Guardian’s Vow | Capstone | Converts some blocked damage into healing |

---

## 17.4 Mage

### Fantasy

A ranged spellcaster who manipulates elements and controls the battlefield.

### Combat Role

* High magic damage
* Low physical durability
* Strong elemental tools
* Area control

### Main Stats

| Build           | Main Stats |
| --------------- | ---------- |
| Elemental Nuker | INT / DEX  |
| Control Mage    | INT / VIT  |
| Fast Caster     | DEX / INT  |
| Crit Spell Mage | INT / LUK  |

### Starting Weapon

Staff

### Basic Skills

| Skill           | Type    | Description                           |
| --------------- | ------- | ------------------------------------- |
| Fire Bolt       | Active  | Single-target fire spell              |
| Frost Bolt      | Active  | Single-target ice spell, slows target |
| Lightning Spark | Active  | Single-target lightning spell         |
| Mana Recovery   | Passive | Improves SP regeneration              |
| Arcane Shield   | Active  | Absorbs damage using SP               |
| Flame Wall      | Active  | Places damaging wall on ground        |
| Frost Ring      | Active  | Small AoE slow                        |
| Spell Focus     | Passive | Improves cast speed and spell damage  |

---

## 17.5 Mage Advanced: Wizard

### Fantasy

A destructive elemental caster with powerful AoE spells.

### Specialty

* Large AoE damage
* Elemental nukes
* Boss burst windows
* High SP usage

### Skills

| Skill             | Type     | Description                           |
| ----------------- | -------- | ------------------------------------- |
| Meteor Rain       | Active   | Delayed fire AoE                      |
| Blizzard Field    | Active   | Ice AoE that slows and may freeze     |
| Thunderstorm      | Active   | Lightning AoE around target area      |
| Elemental Amplify | Active   | Increases next spell damage           |
| Mana Surge        | Passive  | Increases max SP and spell damage     |
| Chain Casting     | Passive  | Chance to reduce next cast time       |
| Arcane Explosion  | Active   | High damage centered on caster        |
| Archwizard’s Seal | Capstone | Alternating elements increases damage |

---

## 17.6 Mage Advanced: Sage

### Fantasy

A tactical spellcaster who manipulates elements, magic rules, and enemy weaknesses.

### Specialty

* Elemental enchantments
* Anti-magic
* Utility
* Hybrid weapon/spell builds

### Skills

| Skill            | Type     | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| Elemental Weapon | Active   | Adds chosen element to weapon attacks                |
| Spell Break      | Active   | Interrupts enemy casting                             |
| Magic Field      | Active   | Creates a zone that modifies elemental damage        |
| Elemental Study  | Passive  | Increases damage against known monster weaknesses    |
| Mana Conversion  | Active   | Converts HP into SP                                  |
| Rune Trap        | Active   | Places a magical trap                                |
| Dispel Hex       | Active   | Removes buffs from enemies or debuffs from self      |
| Sage’s Equation  | Capstone | Exploiting weakness refunds SP and reduces cooldowns |

---

## 17.7 Archer

### Fantasy

A ranged physical class that controls distance, uses arrows, traps, and precision.

### Combat Role

* Strong ranged damage
* Kiting
* Traps
* Good single-target damage
* Fragile if surrounded

### Main Stats

| Build           | Main Stats |
| --------------- | ---------- |
| Sniper          | DEX / AGI  |
| Trap Archer     | DEX / INT  |
| Crit Archer     | DEX / LUK  |
| Survival Archer | DEX / VIT  |

### Starting Weapon

Bow

### Basic Skills

| Skill            | Type    | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| Double Shot      | Active  | Fires two arrows at one target            |
| Arrow Rain       | Active  | Small area arrow attack                   |
| Hawk Eye         | Passive | Increases range and accuracy              |
| Quick Step       | Active  | Short repositioning move away from target |
| Elemental Arrows | Passive | Unlocks elemental arrow usage             |
| Pinning Shot     | Active  | Slows target                              |
| Focus            | Active  | Temporarily increases DEX and crit        |
| Bow Training     | Passive | Increases bow damage                      |

---

## 17.8 Archer Advanced: Hunter

### Fantasy

A wilderness fighter using traps, animal support, and precise shots.

### Specialty

* Traps
* Companion bird
* Map control
* Boss preparation

### Skills

| Skill            | Type     | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| Falcon Companion | Passive  | Summons a bird that sometimes attacks                |
| Snare Trap       | Active   | Roots enemies                                        |
| Blast Trap       | Active   | Explodes after delay                                 |
| Mark Prey        | Active   | Increases damage against one target                  |
| Camouflage       | Active   | Reduces enemy detection range                        |
| Beast Knowledge  | Passive  | More damage against beasts/insects/brutes            |
| Piercing Shot    | Active   | Arrow that passes through enemies                    |
| Apex Hunter      | Capstone | Marked enemies take increased trap and falcon damage |

---

## 17.9 Archer Advanced: Minstrel

### Fantasy

A ranged performer who uses music to empower self, weaken enemies, and fight with rhythm.

### Why Minstrel Instead of Bard/Dancer?

For a solo game, gender-split Bard/Dancer design is unnecessary. This game uses one class: **Minstrel**.

### Specialty

* Self-buffs
* Enemy debuffs
* Ranged attacks
* Rhythm-based skill chaining

### Skills

| Skill            | Type     | Description                                         |
| ---------------- | -------- | --------------------------------------------------- |
| Battle Song      | Active   | Increases attack speed and movement speed           |
| Weakening Verse  | Active   | Reduces enemy defense                               |
| Echo Shot        | Active   | Ranged attack that repeats after delay              |
| Restorative Tune | Active   | Regenerates HP slowly                               |
| Rhythm Flow      | Passive  | Using different skills in sequence improves effects |
| Discord Note     | Active   | Small AoE confusion/slow                            |
| Spirit Chorus    | Active   | Boosts support summon temporarily                   |
| Final Refrain    | Capstone | Every third skill triggers an echo effect           |

---

## 17.10 Thief

### Fantasy

A fast melee fighter who uses daggers, evasion, poison, stealth, and critical hits.

### Combat Role

* High mobility
* High single-target damage
* Evasion
* Poison
* Loot bonuses

### Main Stats

| Build          | Main Stats       |
| -------------- | ---------------- |
| Crit Dagger    | AGI / LUK        |
| Poison Thief   | AGI / INT or DEX |
| Backstabber    | STR / AGI        |
| Evasive Farmer | AGI / DEX / LUK  |

### Starting Weapon

Dagger

### Basic Skills

| Skill          | Type    | Description                                            |
| -------------- | ------- | ------------------------------------------------------ |
| Quick Stab     | Active  | Fast melee attack                                      |
| Backstep       | Active  | Short retreat movement                                 |
| Dodge Training | Passive | Increases dodge                                        |
| Poison Blade   | Active  | Adds poison to next attacks                            |
| Steal Chance   | Passive | Small chance for extra material drop                   |
| Shadow Walk    | Active  | Briefly lowers enemy detection                         |
| Backstab       | Active  | Bonus damage from behind or against distracted enemies |
| Dirty Fighting | Passive | Increases damage against debuffed enemies              |

---

## 17.11 Thief Advanced: Assassin

### Fantasy

A lethal damage dealer focused on poison, critical hits, and burst.

### Specialty

* Daggers or katars
* Critical damage
* Poison stacking
* Boss assassination

### Skills

| Skill           | Type     | Description                                           |
| --------------- | -------- | ----------------------------------------------------- |
| Katar Mastery   | Passive  | Improves katar damage and crit                        |
| Venom Stack     | Passive  | Poison effects stack higher                           |
| Sonic Strike    | Active   | Rapid burst attack                                    |
| Grim Edge       | Active   | Line attack from short range                          |
| Fatal Wound     | Active   | Increases damage over time on target                  |
| Evasion Burst   | Active   | Brief dodge increase                                  |
| Execution       | Active   | Deals bonus damage to low-HP enemies                  |
| Assassin’s Mark | Capstone | Critical hits extend poison and increase burst damage |

---

## 17.12 Thief Advanced: Rogue

### Fantasy

A tricky fighter who steals, disrupts, uses dirty tactics, and can fight with dagger or bow.

### Specialty

* Farming
* Debuffs
* Hybrid weapons
* Control
* Item discovery

### Skills

| Skill           | Type     | Description                                        |
| --------------- | -------- | -------------------------------------------------- |
| Mug             | Active   | Deals damage and increases drop chance from target |
| Trick Shot      | Active   | Ranged attack usable with bow or throwing knife    |
| Smoke Bomb      | Active   | Creates escape cloud                               |
| Disable Armor   | Active   | Reduces enemy defense                              |
| Treasure Sense  | Passive  | Reveals rare gathering nodes and loot containers   |
| Ambush          | Passive  | Bonus damage when attacking first                  |
| Copy Technique  | Active   | Temporarily mimics a basic enemy skill             |
| Rogue’s Fortune | Capstone | Elite and boss kills have improved material drops  |

---

# 18. Support Classes as NPCs and Summons

Merchant and Acolyte-inspired concepts are valuable, but not ideal as playable solo classes.

They become support systems.

---

## 18.1 Merchant Support

Merchant-like systems become town and progression features.

### Merchant NPC Functions

| NPC                 | Function                             |
| ------------------- | ------------------------------------ |
| Cart Trader         | Buys monster drops, sells bulk goods |
| Traveling Merchant  | Appears on maps with temporary deals |
| Market Clerk        | Lets player buy basic materials      |
| Appraiser           | Identifies rare equipment            |
| Contract Broker     | Converts trophies into rewards       |
| Refinement Supplier | Sells ores and catalysts             |

### Merchant Support Summon: Pack Sprite

The player can unlock a support companion inspired by merchant utility.

| Feature            | Effect                                     |
| ------------------ | ------------------------------------------ |
| Extra Carry Weight | Increases inventory capacity               |
| Auto Pickup Filter | Collects selected item types               |
| Emergency Potion   | Occasionally throws potion to player       |
| Trade Sense        | Slightly increases gold from monster drops |
| Material Finder    | Highlights nearby gathering nodes          |

This summon should not replace combat skill. It is a utility support option.

---

## 18.2 Acolyte Support

Acolyte-like systems become healing, shrine, and support mechanics.

### Acolyte NPC Functions

| NPC              | Function                       |
| ---------------- | ------------------------------ |
| Healer           | Restores HP/SP in town         |
| Shrine Keeper    | Grants temporary blessings     |
| Exorcist         | Gives anti-undead contracts    |
| Chapel Archivist | Provides lore and holy recipes |
| Blessing Vendor  | Sells limited buff scrolls     |

### Acolyte Support Summon: Shrine Wisp

The player can unlock a support companion focused on sustain.

| Feature        | Effect                                     |
| -------------- | ------------------------------------------ |
| Minor Heal     | Periodically heals player                  |
| Cleanse        | Removes poison/curse after cooldown        |
| Blessing Aura  | Small stat buff                            |
| Spirit Barrier | Temporary shield at low HP                 |
| Undead Ward    | Bonus resistance against undead/demon mobs |

The support summon must be weaker than a real playable class would be. It supports the player’s chosen class, but does not dominate combat.

---

## 18.3 Support Slot Rules

The player can equip one support companion at a time.

Support companions:

* Level up separately through use
* Have simple skill trees
* Cannot die permanently
* Can be changed in town
* Have cooldown-based support actions
* Do not require micromanagement

Support types:

| Support         | Role                      |
| --------------- | ------------------------- |
| Pack Sprite     | Utility, carry, loot      |
| Shrine Wisp     | Healing, cleanse, defense |
| Battle Peco     | Mobility, charge assist   |
| Arcane Familiar | SP sustain, magic buff    |
| Forest Hawk     | Ranged assist, scouting   |

---

# 19. Combat System

## 19.1 Combat Style

Combat is real-time, point-and-click, with hotkey skills.

The player clicks to move and attack while using keyboard hotkeys for skills.

The combat should not be too twitch-heavy. It should reward:

* Preparation
* Positioning
* Build choices
* Element matching
* Gear upgrades
* Skill timing
* Knowing monster behavior

## 19.2 Auto-Attack

When the player clicks an enemy:

1. Character moves into attack range.
2. Character attacks automatically.
3. Character continues attacking until:

   * Enemy dies
   * Player clicks elsewhere
   * Player uses a skill
   * Enemy moves out of range
   * Player is interrupted

## 19.3 Skill Combat

Skills consume SP and may have cooldowns.

Skill properties:

| Property      | Description                    |
| ------------- | ------------------------------ |
| SP Cost       | Resource cost                  |
| Cooldown      | Time before reuse              |
| Cast Time     | Delay before activation        |
| Recovery Time | Short lockout after skill      |
| Range         | Melee, ranged, ground-targeted |
| Element       | Damage type                    |
| Scaling       | STR, INT, DEX, etc.            |
| Status        | Poison, stun, slow, burn, etc. |

## 19.4 Damage Types

| Type            | Used By                           |
| --------------- | --------------------------------- |
| Physical Melee  | Swordsman, Thief                  |
| Physical Ranged | Archer, Rogue                     |
| Magical         | Mage, Wizard, Sage                |
| Poison          | Thief, Assassin, swamp monsters   |
| Holy            | Guardian, shrine effects          |
| Dark            | Undead, demons, corrupted enemies |
| Neutral         | Most basic attacks                |

## 19.5 Elements

Elements should matter but not become overwhelming.

Suggested elements:

| Element   | Strong Against                  | Weak Against       |
| --------- | ------------------------------- | ------------------ |
| Fire      | Plant, insect, ice              | Water              |
| Water     | Fire, desert mobs               | Lightning          |
| Lightning | Water, machines                 | Earth              |
| Earth     | Lightning, flying-light enemies | Fire               |
| Holy      | Undead, demon                   | Dark               |
| Dark      | Holy enemies                    | Holy               |
| Poison    | Living organic enemies          | Undead, machines   |
| Neutral   | No strong advantage             | No strong weakness |

Elemental advantage should feel meaningful.

Suggested multipliers:

| Matchup          | Multiplier |
| ---------------- | ---------: |
| Strong           |       1.5× |
| Normal           |       1.0× |
| Weak             |       0.7× |
| Immune/Resistant |       0.3× |

---

# 20. Core Combat Formulas

These formulas should be simple enough for implementation and balancing.

## 20.1 Physical Damage

```text
PhysicalAttack = WeaponAttack + STR * 1.4 + DEX * 0.4 + Level * 0.3

PhysicalDamage =
max(1, PhysicalAttack * SkillMultiplier * ElementMultiplier - EnemyDefense)
```

## 20.2 Ranged Damage

```text
RangedAttack = WeaponAttack + DEX * 1.4 + STR * 0.2 + Level * 0.3

RangedDamage =
max(1, RangedAttack * SkillMultiplier * ElementMultiplier - EnemyDefense)
```

## 20.3 Magic Damage

```text
MagicAttack = WeaponMagic + INT * 1.6 + DEX * 0.2 + Level * 0.3

MagicDamage =
max(1, MagicAttack * SkillMultiplier * ElementMultiplier - EnemyMagicDefense)
```

## 20.4 Hit Chance

```text
Hit = 150 + Level + DEX * 1.5 + LUK * 0.3
Dodge = 100 + Level + AGI * 1.6 + LUK * 0.2

HitChance = clamp(60%, 95%, 80% + (Hit - EnemyDodge) / 100)
```

## 20.5 Critical Chance

```text
CritChance = 5% + LUK * 0.25% + GearCritBonus
```

## 20.6 Critical Damage

```text
CriticalDamage = FinalPhysicalDamage * 1.5
```

Some skills and gear can increase this.

---

# 21. Status Effects

Status effects should be readable and useful.

| Status      | Effect                                            |
| ----------- | ------------------------------------------------- |
| Poison      | Damage over time, reduced healing                 |
| Burn        | Damage over time, stronger against plants/insects |
| Freeze      | Cannot move briefly, takes more physical damage   |
| Slow        | Reduced movement and attack speed                 |
| Stun        | Cannot act briefly                                |
| Blind       | Reduced accuracy                                  |
| Curse       | Reduced movement and LUK                          |
| Silence     | Cannot cast spells                                |
| Bleed       | Physical damage over time                         |
| Armor Break | Reduced defense                                   |
| Marked      | Takes increased damage from source                |
| Shielded    | Absorbs incoming damage                           |
| Blessed     | Increased stats temporarily                       |

Status effects should have visible icons near the HP/SP UI.

---

# 22. Monsters

## 22.1 Monster Design Goals

Every monster should have:

* Name
* Level
* HP
* Damage
* Defense
* Element
* Race/family
* Behavior
* Drops
* Spawn region
* At least one readable combat trait

## 22.2 Monster Families

| Family    | Common Traits                                  |
| --------- | ---------------------------------------------- |
| Slime     | Weak, beginner-friendly, material drops        |
| Beast     | Fast, physical, pack behavior                  |
| Plant     | Weak to fire, often stationary or poison-based |
| Insect    | Swarm behavior, armor materials                |
| Undead    | Weak to holy/fire, curse effects               |
| Demon     | High damage, dark skills                       |
| Construct | High defense, weak to lightning                |
| Aquatic   | Water element, slows, ranged attacks           |
| Reptile   | Poison and ambush behavior                     |
| Bandit    | Humanoid, uses weapons and tactics             |
| Spirit    | Magic damage, low physical defense             |
| Boss      | Unique mechanics                               |

## 22.3 Monster Behavior Types

| Behavior   | Description                             |
| ---------- | --------------------------------------- |
| Passive    | Does not attack unless attacked         |
| Aggressive | Attacks player on sight                 |
| Assist     | Nearby same-family mobs help each other |
| Coward     | Runs away at low HP                     |
| Caster     | Uses ranged skills                      |
| Charger    | Rushes toward player                    |
| Looter     | Moves toward dropped items or resources |
| Patrol     | Walks along a path                      |
| Ambusher   | Hidden until player approaches          |
| Elite      | Stronger version with special modifier  |
| Boss       | Special mechanics and resistances       |

---

# 23. Example Monster Roster

## 23.1 Early Game

| Monster      | Level | Region            | Element | Behavior   | Key Drops                 |
| ------------ | ----: | ----------------- | ------- | ---------- | ------------------------- |
| Green Jelly  |     1 | Crownfield        | Neutral | Passive    | Jelly Core, Soft Fluid    |
| Field Hopper |     3 | Crownfield        | Earth   | Passive    | Insect Wing               |
| Training Rat |     4 | Crownfield Sewers | Neutral | Aggressive | Rat Tail, Old Cloth       |
| Road Thief   |     6 | Crownfield Roads  | Neutral | Aggressive | Copper Coin, Torn Bandana |
| Wild Pup     |     8 | Crownfield        | Neutral | Assist     | Fur, Small Fang           |
| Sewer Spore  |    10 | Sewers            | Poison  | Stationary | Spore Cap, Toxin Dust     |

## 23.2 Midgame

| Monster       | Level | Region      | Element | Behavior   | Key Drops             |
| ------------- | ----: | ----------- | ------- | ---------- | --------------------- |
| Moss Wolf     |    16 | Mossvale    | Neutral | Assist     | Wolf Fur, Sharp Fang  |
| Vine Crawler  |    18 | Mossvale    | Earth   | Ambusher   | Vine Fiber            |
| Sand Viper    |    24 | Amber Dunes | Poison  | Aggressive | Venom Sac             |
| Dune Bandit   |    28 | Amber Dunes | Neutral | Patrol     | Curved Dagger         |
| Bronze Beetle |    32 | Ironroot    | Earth   | Assist     | Bronze Shell          |
| Cave Goblin   |    36 | Ironroot    | Neutral | Aggressive | Goblin Ear, Crude Ore |

## 23.3 Late Game

| Monster        | Level | Region         | Element   | Behavior   | Key Drops     |
| -------------- | ----: | -------------- | --------- | ---------- | ------------- |
| Marsh Wraith   |    48 | Moonveil       | Dark      | Caster     | Ectoplasm     |
| Rotting Knight |    52 | Moonveil       | Undead    | Aggressive | Rusted Plate  |
| Star Construct |    62 | Starfall Tower | Lightning | Caster     | Arcane Core   |
| Fallen Scholar |    68 | Starfall Tower | Dark      | Caster     | Torn Grimoire |
| Abyss Hound    |    74 | Starfall Tower | Dark      | Charger    | Demon Fang    |
| Rune Sentinel  |    80 | Starfall Tower | Neutral   | Elite      | Rune Alloy    |

---

# 24. MVP Boss System

## 24.1 MVP Philosophy

MVPs are powerful map bosses inspired by classic MMO boss hunting, but adapted for single-player.

They should be:

* Farmable
* Difficult
* Mechanically distinct
* Rewarding
* Not locked behind real-time waiting
* Important for rare gear and materials

## 24.2 MVP Access

Each MVP can be encountered in two ways:

1. **World Spawn**

   * Appears in its map after conditions are met
   * Respawn timer is short enough for solo play

2. **Summoning Ritual**

   * Player spends materials to summon the MVP
   * Allows deterministic farming

## 24.3 Recommended Spawn Rules

| Boss Type     | Respawn                       |
| ------------- | ----------------------------- |
| Field Elite   | 3–5 minutes                   |
| Miniboss      | 8–12 minutes                  |
| Regional MVP  | 20–30 minutes                 |
| Endgame MVP   | Summon-based or 30–45 minutes |
| Campaign Boss | Replayable after story clear  |

## 24.4 MVP Rewards

MVPs drop:

* Rare crafting materials
* Unique weapons
* Unique armor
* Sigils
* Cosmetic items
* Boss trophies
* Skill augment items
* High-value sell items

## 24.5 Example MVPs

| MVP                | Level | Region         | Theme             | Main Reward             |
| ------------------ | ----: | -------------- | ----------------- | ----------------------- |
| King Slime Verdant |    15 | Crownfield     | Beginner MVP      | Slime Crown, Jelly Core |
| Thorn Matriarch    |    30 | Mossvale       | Plant queen       | Thorn Bow, Vine Heart   |
| Sunken Corsair     |    38 | Blueharbor     | Pirate ghost      | Ghost Saber             |
| Brass Burrower     |    45 | Ironroot       | Giant beetle      | Brass Shell Plate       |
| Dune Tyrant        |    50 | Amber Dunes    | Desert beast      | Tyrant Fang             |
| Bell Wraith        |    60 | Moonveil       | Undead caster     | Wraith Bell             |
| Rune Chimera       |    75 | Starfall Tower | Elemental boss    | Chimera Core            |
| Fallen Star Saint  |    90 | Starfall Tower | Final endgame MVP | Star Saint Sigil        |

---

# 25. Equipment System

## 25.1 Equipment Slots

| Slot          | Purpose                             |
| ------------- | ----------------------------------- |
| Weapon        | Main damage source                  |
| Offhand       | Shield, dagger, focus, quiver, tome |
| Head          | Stat bonuses, special effects       |
| Body          | Defense and resistance              |
| Cloak         | Dodge, movement, resistance         |
| Boots         | Movement, HP/SP, utility            |
| Accessory 1   | Build modifier                      |
| Accessory 2   | Build modifier                      |
| Sigil         | Rare powerful effect                |
| Support Charm | Modifies support companion          |

## 25.2 Item Rarity

| Rarity    | Color  | Description                   |
| --------- | ------ | ----------------------------- |
| Common    | White  | Basic drops and shop gear     |
| Uncommon  | Green  | Slight stat bonuses           |
| Rare      | Blue   | Stronger stats and one effect |
| Epic      | Purple | Multiple effects              |
| Legendary | Gold   | Boss/MVP gear                 |
| Mythic    | Red    | Endgame chase items           |

## 25.3 Item Stats

Possible item stats:

* Attack
* Magic attack
* Defense
* Magic defense
* HP
* SP
* STR
* AGI
* VIT
* INT
* DEX
* LUK
* Critical chance
* Critical damage
* Attack speed
* Cast speed
* Cooldown reduction
* Element damage
* Race damage
* Status resistance
* Drop chance
* Movement speed

## 25.4 Unique Effects

Examples:

| Item                 | Effect                                          |
| -------------------- | ----------------------------------------------- |
| Thorn Bow            | Pinning Shot also applies bleed                 |
| Brass Plate          | Reduces damage from insects and constructs      |
| Ghost Saber          | Attacks deal bonus damage to undead             |
| Dune Boots           | Immune to desert slow terrain                   |
| Starfall Tome        | Alternating elements reduces spell cooldowns    |
| Assassin’s Moon Ring | Poisoned enemies take increased critical damage |

---

# 26. Gear Refinement

Refinement improves equipment.

## 26.1 Refinement Levels

Gear can be refined from +0 to +10.

| Refinement | Rule                               |
| ---------- | ---------------------------------- |
| +1 to +4   | Always succeeds                    |
| +5 to +7   | Can fail, item does not break      |
| +8 to +10  | Can fail and lose refinement level |

No permanent item destruction.

This is a single-player game, so destroying rare gear is too punishing.

## 26.2 Refinement Materials

| Material      | Source                  |
| ------------- | ----------------------- |
| Copper Ore    | Early mining maps       |
| Iron Ore      | Midgame mobs and mines  |
| Silver Ore    | Dungeons and elites     |
| Rune Ore      | Bosses and endgame maps |
| Stabilizer    | Crafting or rare shop   |
| Boss Catalyst | MVP drop                |

## 26.3 Refinement Bonuses

Weapons:

```text
+1 = +3% weapon attack
+2 = +6%
+3 = +9%
...
+10 = +30%
```

Armor:

```text
+1 = +2% defense
+2 = +4%
...
+10 = +20%
```

Some legendary items gain special effects at +7 and +10.

---

# 27. Crafting System

Crafting turns monster drops into useful gear and consumables.

## 27.1 Crafting Categories

| Category             | Examples                      |
| -------------------- | ----------------------------- |
| Weapons              | Swords, bows, daggers, staves |
| Armor                | Body armor, cloaks, boots     |
| Accessories          | Rings, charms, amulets        |
| Consumables          | Potions, antidotes, scrolls   |
| Support Items        | Support companion upgrades    |
| Refinement Materials | Ore upgrades, stabilizers     |
| Sigils               | Rare build-defining items     |

## 27.2 Recipe Sources

Recipes come from:

* Crafters in towns
* Boss drops
* Side quests
* Exploration
* Monster collection milestones
* Class quests
* Secret shops

## 27.3 Example Recipes

| Item               | Materials                                  |
| ------------------ | ------------------------------------------ |
| Wolf Leather Boots | 12 Wolf Fur, 4 Sharp Fang, 100 gold        |
| Venom Dagger       | 1 Iron Dagger, 8 Venom Sac, 2 Toxic Dust   |
| Thorn Bow          | 1 Hunter Bow, 15 Vine Fiber, 1 Thorn Heart |
| Rune Staff         | 1 Oak Staff, 6 Arcane Dust, 2 Rune Shards  |
| Brass Armor        | 20 Bronze Shell, 5 Iron Ore, 400 gold      |
| Antidote Bundle    | 3 Toxin Dust, 2 Red Herb                   |

---

# 28. Inventory and Storage

## 28.1 Inventory

Inventory should be limited but not annoying.

Recommended:

* Weight-based system
* Materials stack heavily
* Consumables stack
* Gear takes individual slots
* Quest items have separate storage
* Auto-sort
* Search/filter

## 28.2 Storage

Storage is shared across all towns.

Storage categories:

* Equipment
* Materials
* Consumables
* Cards/Sigils
* Quest items
* Trophies

## 28.3 Loot Filters

The player can configure:

* Show all drops
* Hide common materials
* Always show rare+
* Always show equipment
* Always show crafting materials
* Auto-pickup gold
* Auto-pickup materials

Support companions may improve pickup convenience.

---

# 29. Economy

The economy is single-player and NPC-based.

## 29.1 Gold Sources

* Selling monster drops
* Quest rewards
* Hunting board contracts
* Boss trophies
* Treasure chests
* Rare trade goods

## 29.2 Gold Sinks

* Potions
* Refinement
* Crafting
* Fast travel
* Storage expansion
* Support companion upgrades
* Skill reset
* Stat reset
* Gear appraisal
* Enchant rerolls

## 29.3 Shop Rules

| Action             | Rule                          |
| ------------------ | ----------------------------- |
| Buy item           | Full price                    |
| Sell item          | 25–35% of value               |
| Sell rare item     | Better price at appraiser     |
| Bulk sell          | Available through Cart Trader |
| Buy materials      | Expensive but useful          |
| Buy boss materials | Limited stock                 |

---

# 30. Sigil System

Sigils replace the idea of extremely rare build-defining item modifiers.

They are rare items equipped in the Sigil slot.

## 30.1 Sigil Design

Sigils should be powerful and build-defining, but limited to one equipped at a time.

Examples:

| Sigil                 | Effect                                    |
| --------------------- | ----------------------------------------- |
| Sigil of the Wolf     | Moving increases next melee attack damage |
| Sigil of the Flame    | Fire skills have a chance to burn ground  |
| Sigil of the Falcon   | Ranged crits can trigger an extra shot    |
| Sigil of Venom        | Poison stacks one additional time         |
| Sigil of the Guardian | Blocking creates a small shield           |
| Sigil of the Sage     | Elemental weakness hits restore SP        |
| Sigil of Fortune      | Slightly improves rare material drops     |

## 30.2 Sigil Sources

* MVPs
* Endgame dungeons
* Rare crafting
* Challenge tower
* Secret bosses

---

# 31. Cards Optional System

A card-like system can exist, but it should be simplified.

## 31.1 Recommendation

Use **Sigils** as the main rare modifier system.

If adding cards later, make them:

* Less numerous
* Easier to manage
* Not required for basic builds
* Mostly optional endgame customization

Possible card slots:

* Weapon card
* Armor card
* Accessory card

But for the base full product, Sigils may be enough.

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
| Old Sewers         |        5–15 | Rats, slimes, spores            | Sewer Glutton     |
| Green Chapel Ruins |       15–25 | Plants, spirits, undead         | Thorn Priest      |
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

# 35. User Interface

## 35.1 Main HUD

Main HUD should show:

* HP bar
* SP bar
* Level
* XP bar
* Current target
* Skill hotbar
* Potion slots
* Buff/debuff icons
* Minimap
* Gold indicator
* Weight indicator

## 35.2 Important Screens

| Screen     | Purpose                         |
| ---------- | ------------------------------- |
| Character  | Stats and derived stats         |
| Skills     | Skill tree and skill assignment |
| Inventory  | Items, materials, consumables   |
| Equipment  | Gear management                 |
| Crafting   | Recipes and materials           |
| Refinement | Upgrade gear                    |
| Map        | Region map and discovered zones |
| Bestiary   | Monster data                    |
| Quest Log  | Campaign and optional quests    |
| Support    | Companion configuration         |
| Storage    | Town storage                    |

## 35.3 Equipment Comparison

When hovering gear, show:

* Current item
* New item
* Stat differences
* Damage change estimate
* Defense change estimate
* Lost effects
* Gained effects
* Required class/level
* Refinement level

Example:

```text
Iron Sword +3
Attack: 42
STR +2

Compared to Bronze Sword +2:
Attack: +11
STR: +2
Attack Speed: -3%
Estimated DPS: +8.5%
```

---

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

# 44. Accessibility and Options

## 44.1 Gameplay Options

| Option                       | Purpose                    |
| ---------------------------- | -------------------------- |
| Difficulty presets           | Story, Normal, Veteran     |
| Auto-potion threshold        | Helps casual play          |
| Click indicator              | Shows movement target      |
| Hold-to-show loot            | Helps visibility           |
| Text speed                   | Dialogue comfort           |
| UI scale                     | Readability                |
| Damage numbers toggle        | Clarity or reduced clutter |
| Screen shake toggle          | Comfort                    |
| Colorblind-friendly elements | Status readability         |

## 44.2 Difficulty Presets

| Difficulty | Description                                     |
| ---------- | ----------------------------------------------- |
| Story      | Easier combat, better drops, lower penalties    |
| Normal     | Intended experience                             |
| Veteran    | Stronger mobs, lower drop pity, harsher economy |

Difficulty should not lock content.

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
