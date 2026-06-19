# Project Backlog

# **Echoes of the Rune Wilds**

## Single-Player 2D Top-Down Pixel Art RPG

## Phaser.js + TypeScript + Tiled + Aseprite

---

# 1. Backlog Overview

This backlog translates the GDD into an implementation roadmap from early prototype to full release.

Project setup tasks such as installing Node.js, Phaser, Vite, TypeScript, Aseprite, Tiled, Git, or editor configuration are intentionally skipped.

The project should be built as a data-driven Phaser.js game where most gameplay content is defined through JSON files rather than hardcoded directly into systems.

---

# 2. Core Product Scope

## 2.1 Final Game Target

The finished game should include:

* Single-player 2D top-down RPG.
* Mouse-left-click movement only.
* No WASD movement.
* Four playable base classes:

  * Swordsman
  * Mage
  * Archer
  * Thief
* Eight advanced classes:

  * Knight
  * Guardian
  * Wizard
  * Sage
  * Hunter
  * Minstrel
  * Assassin
  * Rogue
* Merchant and Acolyte as NPC/support systems only.
* Character creation with immediate class choice.
* Level cap 99.
* Stat allocation system.
* Skill point system.
* Equipment system.
* Inventory and storage.
* Loot and drop tables.
* Crafting.
* Gear refinement.
* NPC market.
* Support companions.
* Bestiary.
* Hunting board.
* Optional quests.
* Campaign progression as secondary structure.
* Map-based exploration as the core.
* MVP/boss farming.
* Endgame tower/challenge content.
* Local save/load.
* Pixel art asset pipeline compatible with Aseprite.
* Tiled map pipeline.
* Phaser.js implementation.

---

# 3. Backlog Conventions

## 3.1 Priority

| Priority | Meaning                                               |
| -------- | ----------------------------------------------------- |
| P0       | Required for core game or blocking other systems      |
| P1       | Important for vertical slice or alpha                 |
| P2       | Important for full release but not blocking prototype |
| P3       | Polish, optional improvements, or post-release        |

## 3.2 Status

| Status       | Meaning                                     |
| ------------ | ------------------------------------------- |
| Not Started  | Task has not begun                          |
| In Progress  | Task is actively being implemented          |
| Blocked      | Task cannot continue due to dependency      |
| Needs Review | Task is implemented but requires validation |
| Done         | Task passes acceptance criteria             |

## 3.3 Global Definition of Done

A task is done when:

* It is implemented in TypeScript.
* It has no obvious runtime errors.
* It works inside Phaser.
* It is data-driven when applicable.
* It avoids hardcoding content that should live in JSON.
* It has placeholder assets where final art is unavailable.
* It has clear acceptance behavior visible in-game or through tests.
* It does not break save/load compatibility unless a migration is added.
* It respects the GDD constraints:

  * 2D top-down.
  * Mouse-left-click movement.
  * No WASD.
  * Single-player.
  * Original IP-safe content.

---

# 4. Milestone Roadmap

| Milestone | Goal                             | Result                                                                      |
| --------- | -------------------------------- | --------------------------------------------------------------------------- |
| M0        | Architecture and data foundation | Project has stable structure, scenes, data loading, and placeholder content |
| M1        | Core playable prototype          | Player can move, attack, kill monsters, gain XP, and loot items             |
| M2        | Vertical slice                   | One town, one field map, one dungeon, two classes, items, UI, save/load     |
| M3        | Full core systems alpha          | All major RPG systems exist in rough form                                   |
| M4        | Class alpha                      | Four base classes and eight advanced classes implemented                    |
| M5        | Content alpha                    | Regions, maps, monsters, dungeons, bosses, and NPC services added           |
| M6        | Economy and progression alpha    | Crafting, refinement, market, support, bestiary, hunting board              |
| M7        | Campaign and endgame beta        | Campaign path, MVPs, tower, challenge dungeons                              |
| M8        | Polish beta                      | Balance, UI polish, accessibility, performance, bug fixing                  |
| M9        | Release candidate                | Complete game loop, stable save, content pass, final QA                     |
| M10       | Post-release backlog             | Optional expansions and improvements                                        |

---

# 5. M0 — Architecture and Data Foundation

## Epic M0-E01 — Project Architecture

### M0-E01-T001 — Define source folder architecture

**Priority:** P0
**Dependencies:** None

Create the core source folders:

```text
src/
  main.ts
  game/
    Game.ts
    config/
    scenes/
    systems/
    entities/
    components/
    data/
    ui/
    utils/
    constants/
    types/
assets/
  sprites/
  tilesets/
  maps/
  audio/
  ui/
  data/
```

**Acceptance Criteria**

* Source folders exist.
* Imports use clear relative paths or aliases.
* Folder names match the planned architecture.
* No gameplay logic is placed directly in `main.ts`.

---

### M0-E01-T002 — Create scene lifecycle structure

**Priority:** P0
**Dependencies:** M0-E01-T001

Create the initial Phaser scene classes:

* BootScene
* PreloadScene
* MainMenuScene
* CharacterCreationScene
* WorldScene
* UIScene
* DialogueScene
* GameOverScene

**Acceptance Criteria**

* Game starts at BootScene.
* BootScene transitions to PreloadScene.
* PreloadScene transitions to MainMenuScene.
* MainMenuScene can start a new game.
* New game opens CharacterCreationScene.
* Character creation transitions to WorldScene.
* UIScene can run in parallel with WorldScene.

---

### M0-E01-T003 — Create global game state container

**Priority:** P0
**Dependencies:** M0-E01-T002

Create a central game state object that stores:

* Current save slot.
* Player profile.
* Current map ID.
* Character data.
* Inventory data.
* Equipment data.
* Quest state.
* Bestiary state.
* World flags.
* Settings.

**Acceptance Criteria**

* Game state can be initialized for a new game.
* Game state can be passed between scenes.
* WorldScene can read the current character and map.
* UIScene can read player HP, SP, XP, level, and gold.

---

### M0-E01-T004 — Add event bus

**Priority:** P0
**Dependencies:** M0-E01-T002

Create a centralized event bus for communication between systems and scenes.

Events should support:

* Player health changed.
* Player SP changed.
* XP gained.
* Level up.
* Inventory changed.
* Equipment changed.
* Skill used.
* Enemy killed.
* Loot dropped.
* Map changed.
* Save completed.
* Dialogue opened.
* Dialogue closed.

**Acceptance Criteria**

* Systems can emit events.
* UIScene can subscribe to events.
* No direct circular dependency between UIScene and gameplay systems.

---

## Epic M0-E02 — Data Loading Foundation

### M0-E02-T001 — Create data registry

**Priority:** P0
**Dependencies:** M0-E01-T001

Create a data registry capable of loading and storing:

* Classes.
* Skills.
* Items.
* Monsters.
* Drop tables.
* Maps.
* NPCs.
* Recipes.
* Support companions.
* Quests.
* Status effects.
* XP tables.
* Difficulty settings.

**Acceptance Criteria**

* Data registry loads JSON from `assets/data`.
* Loaded data can be queried by ID.
* Missing IDs return clear errors.
* Invalid data does not crash the game silently.

---

### M0-E02-T002 — Define TypeScript data types

**Priority:** P0
**Dependencies:** M0-E02-T001

Create TypeScript interfaces for:

* `ClassDefinition`
* `SkillDefinition`
* `ItemDefinition`
* `MonsterDefinition`
* `DropTableDefinition`
* `MapDefinition`
* `NpcDefinition`
* `RecipeDefinition`
* `SupportDefinition`
* `QuestDefinition`
* `StatusEffectDefinition`
* `SaveData`
* `CharacterData`
* `InventoryData`
* `EquipmentData`

**Acceptance Criteria**

* All loaded JSON maps to typed interfaces.
* Gameplay systems use these types.
* No use of `any` for core gameplay data unless justified.

---

### M0-E02-T003 — Create schema validation helper

**Priority:** P1
**Dependencies:** M0-E02-T002

Add runtime validation for required fields in JSON data.

**Acceptance Criteria**

* Missing required fields are logged clearly.
* Data load errors mention file name and ID.
* Game can fail gracefully on invalid critical data.
* Optional fields use sensible defaults.

---

### M0-E02-T004 — Create placeholder JSON content

**Priority:** P0
**Dependencies:** M0-E02-T002

Create minimal placeholder data for:

* One class: Swordsman.
* One skill: Power Slash.
* One item: Training Sword.
* One monster: Green Jelly.
* One map: Crownfield Meadows.
* One drop table.
* One NPC.
* One recipe.
* One support companion.

**Acceptance Criteria**

* Placeholder data loads successfully.
* WorldScene can spawn the placeholder player and monster.
* Inventory can display the placeholder item.
* Skill system can read the placeholder skill.

---

# 6. M1 — Core Playable Prototype

## Epic M1-E01 — Player Entity and Movement

### M1-E01-T001 — Create player entity

**Priority:** P0
**Dependencies:** M0-E01-T002

Create the player entity with:

* Sprite placeholder.
* Position.
* Movement speed.
* Direction.
* Animation state.
* Collision body.
* Character data reference.

**Acceptance Criteria**

* Player appears in WorldScene.
* Player is centered by the camera.
* Player position can be read and updated.
* Player uses placeholder sprite if final art is missing.

---

### M1-E01-T002 — Implement mouse-left-click movement

**Priority:** P0
**Dependencies:** M1-E01-T001

Implement left-click movement to a clicked ground position.

**Acceptance Criteria**

* Left-clicking walkable ground moves the player.
* Player stops when reaching destination.
* New left-click replaces previous destination.
* WASD keys do not move the player.
* Movement feels responsive.

---

### M1-E01-T003 — Add movement click indicator

**Priority:** P1
**Dependencies:** M1-E01-T002

Display a visual marker where the player clicked.

**Acceptance Criteria**

* Marker appears on valid ground clicks.
* Marker fades or disappears after a short time.
* Marker does not appear on blocked tiles.
* Marker does not obstruct gameplay.

---

### M1-E01-T004 — Add directional movement animation states

**Priority:** P1
**Dependencies:** M1-E01-T002

Support animation states:

* Idle down.
* Idle up.
* Idle left.
* Idle right.
* Walk down.
* Walk up.
* Walk left.
* Walk right.

**Acceptance Criteria**

* Placeholder animation states exist.
* Direction updates based on movement vector.
* Player faces last movement direction when idle.

---

## Epic M1-E02 — Tilemap and Collision Prototype

### M1-E02-T001 — Load a Tiled map in Phaser

**Priority:** P0
**Dependencies:** M0-E02-T004

Load a simple Tiled JSON map with:

* Ground layer.
* Decoration layer.
* Collision layer.
* Object layer.
* Spawn point.

**Acceptance Criteria**

* Map renders in WorldScene.
* Player spawns at map spawn point.
* Camera follows the player.
* Map layers appear in correct order.

---

### M1-E02-T002 — Implement collision from Tiled layer

**Priority:** P0
**Dependencies:** M1-E02-T001

Prevent player from walking through blocked tiles.

**Acceptance Criteria**

* Collision layer blocks movement.
* Player cannot move through walls, water, trees, or blocked objects.
* Collision works with click movement.
* Player does not get stuck on tile corners.

---

### M1-E02-T003 — Add walkable tile detection

**Priority:** P0
**Dependencies:** M1-E02-T002

Create a helper that checks whether a clicked tile is walkable.

**Acceptance Criteria**

* Invalid click destinations are rejected.
* Valid destinations are accepted.
* The click marker only appears for valid movement.
* Enemy/NPC clicks can still be handled separately.

---

### M1-E02-T004 — Implement simple A* pathfinding

**Priority:** P0
**Dependencies:** M1-E02-T003

Implement grid-based pathfinding for click movement.

**Acceptance Criteria**

* Player can path around obstacles.
* Path updates when the player clicks a new point.
* Pathfinding uses map collision data.
* Performance is acceptable on prototype map size.

---

## Epic M1-E03 — Combat Prototype

### M1-E03-T001 — Create enemy entity

**Priority:** P0
**Dependencies:** M0-E02-T004

Create enemy entity with:

* Sprite placeholder.
* Position.
* HP.
* Level.
* Stats.
* Behavior mode.
* Collision.
* Targeting state.

**Acceptance Criteria**

* Green Jelly spawns on map.
* Enemy can be clicked.
* Enemy has HP.
* Enemy can die.

---

### M1-E03-T002 — Add click-to-target enemy

**Priority:** P0
**Dependencies:** M1-E03-T001

Allow player to select enemies by left-clicking them.

**Acceptance Criteria**

* Clicking enemy selects it.
* Selected enemy shows highlight.
* Target frame appears in UI.
* Clicking empty ground clears or changes movement target.

---

### M1-E03-T003 — Add auto-attack

**Priority:** P0
**Dependencies:** M1-E03-T002

Implement basic auto-attack behavior.

**Acceptance Criteria**

* Clicking an enemy moves player into attack range.
* Player attacks repeatedly when in range.
* Enemy takes damage.
* Enemy dies at 0 HP.
* Auto-attack stops when enemy dies.

---

### M1-E03-T004 — Add basic enemy attack

**Priority:** P0
**Dependencies:** M1-E03-T003

Allow enemy to attack the player when close enough.

**Acceptance Criteria**

* Enemy deals damage to player.
* Player HP decreases.
* Enemy respects attack cooldown.
* Player can die when HP reaches 0.

---

### M1-E03-T005 — Implement base combat formulas

**Priority:** P0
**Dependencies:** M1-E03-T003

Implement formulas for:

* Physical attack.
* Ranged attack.
* Magic attack.
* Defense.
* Hit chance.
* Dodge.
* Critical chance.
* Critical damage.

**Acceptance Criteria**

* Damage uses player stats and weapon stats.
* Damage uses enemy defense.
* Hit chance can miss.
* Crits can happen.
* Formula values are logged in debug mode.

---

## Epic M1-E04 — XP, Leveling, and Loot Prototype

### M1-E04-T001 — Add XP gain from monster kills

**Priority:** P0
**Dependencies:** M1-E03-T004

Award XP when the player kills monsters.

**Acceptance Criteria**

* Enemy death grants XP.
* XP bar updates.
* XP amount comes from monster JSON.
* XP gain emits an event.

---

### M1-E04-T002 — Add level-up system

**Priority:** P0
**Dependencies:** M1-E04-T001

Implement level progression up to level 99.

**Acceptance Criteria**

* Player levels up when XP threshold is reached.
* Level-up increases level.
* Level-up grants stat points.
* Level-up grants skill point.
* HP/SP can increase on level-up.
* Level-up event appears in UI.

---

### M1-E04-T003 — Add loot drops

**Priority:** P0
**Dependencies:** M1-E03-T004

Add monster drop generation.

**Acceptance Criteria**

* Monster death can spawn dropped items.
* Drop chances come from drop table JSON.
* Gold can drop.
* Player can pick up drops.
* Picked-up items enter inventory.

---

### M1-E04-T004 — Add simple inventory data structure

**Priority:** P0
**Dependencies:** M1-E04-T003

Implement inventory storage for:

* Items.
* Stack counts.
* Gold.
* Equipment instances.

**Acceptance Criteria**

* Inventory can add stackable items.
* Inventory can add non-stackable equipment.
* Inventory can remove items.
* Inventory emits change events.
* Inventory survives scene changes.

---

# 7. M2 — Vertical Slice

## Epic M2-E01 — Character Creation

### M2-E01-T001 — Create character creation screen layout

**Priority:** P0
**Dependencies:** M0-E01-T002

Create UI for:

* Character name.
* Class selection.
* Appearance placeholder.
* Starting stat preset.
* Confirm button.

**Acceptance Criteria**

* Screen opens from new game.
* Player can enter a name.
* Player can select class.
* Player can confirm character.
* Confirmed character enters WorldScene.

---

### M2-E01-T002 — Implement four base class definitions

**Priority:** P0
**Dependencies:** M0-E02-T002

Create JSON definitions for:

* Swordsman.
* Mage.
* Archer.
* Thief.

Each class needs:

* ID.
* Display name.
* Description.
* Starting stats.
* Growth rates.
* Starting weapon.
* Allowed weapon types.
* Base skills.
* Advanced class options.

**Acceptance Criteria**

* Character creation can display all four classes.
* Selecting class changes starting stats.
* Player starts with class-appropriate weapon.
* Player starts with class-appropriate first skill.

---

### M2-E01-T003 — Add class preview panel

**Priority:** P1
**Dependencies:** M2-E01-T002

Show class identity before selection.

**Acceptance Criteria**

* Each class shows role summary.
* Each class shows recommended stats.
* Each class shows starting weapon.
* Each class shows difficulty rating.
* Each class shows future specializations.

---

## Epic M2-E02 — First Town and Field

### M2-E02-T001 — Create Crownfield town map

**Priority:** P0
**Dependencies:** M1-E02-T001

Create first town map with:

* Spawn point.
* NPC positions.
* Portals.
* Non-combat safe zone.
* Collision.
* Decoration.
* Placeholder tiles.

**Acceptance Criteria**

* Player can walk around town.
* No hostile monsters spawn in town.
* NPCs are visible.
* Town connects to first field map.
* Collision works.

---

### M2-E02-T002 — Create Crownfield Meadows field map

**Priority:** P0
**Dependencies:** M1-E02-T001

Create first combat field map with:

* Monster spawn zones.
* Collision.
* Portal back to town.
* Basic gathering/treasure spots.
* Safe entrance zone.

**Acceptance Criteria**

* Player can enter from town.
* Monsters spawn in field.
* Player can fight and return to town.
* Map supports farming loop.

---

### M2-E02-T003 — Add map transitions

**Priority:** P0
**Dependencies:** M2-E02-T001, M2-E02-T002

Implement portals between maps.

**Acceptance Criteria**

* Player can move from town to field.
* Player can move from field to town.
* Player spawns at correct destination marker.
* Map transition autosaves.
* UI updates current map name.

---

## Epic M2-E03 — NPC Interaction

### M2-E03-T001 — Add NPC entity

**Priority:** P0
**Dependencies:** M2-E02-T001

Create NPC entity with:

* Sprite.
* Name.
* Interaction radius.
* Dialogue ID.
* Service type.

**Acceptance Criteria**

* NPC appears in town.
* Clicking NPC moves player into interaction range.
* Dialogue opens when in range.
* NPC can trigger service menus later.

---

### M2-E03-T002 — Create dialogue system

**Priority:** P0
**Dependencies:** M2-E03-T001

Implement basic dialogue box.

**Acceptance Criteria**

* Dialogue shows NPC name.
* Dialogue shows text.
* Dialogue supports next/close.
* Dialogue blocks movement while open.
* Dialogue can include choice buttons.

---

### M2-E03-T003 — Add first town NPC services as placeholders

**Priority:** P1
**Dependencies:** M2-E03-T002

Create placeholder NPCs:

* Innkeeper.
* Storage Keeper.
* General Merchant.
* Refiner.
* Crafter.
* Healer.
* Travel Agent.
* Hunter Board Clerk.

**Acceptance Criteria**

* Each NPC has unique dialogue.
* Each NPC can be clicked.
* Service buttons can be disabled until systems exist.
* NPC names are original and IP-safe.

---

## Epic M2-E04 — UI Vertical Slice

### M2-E04-T001 — Create HUD

**Priority:** P0
**Dependencies:** M1-E04-T002

HUD should show:

* HP.
* SP.
* Level.
* XP bar.
* Gold.
* Weight.
* Current target.
* Hotbar.

**Acceptance Criteria**

* HUD appears during WorldScene.
* HP updates when damaged.
* XP updates when XP is gained.
* Target panel updates when enemy is selected.
* HUD remains readable at 1080p.

---

### M2-E04-T002 — Create inventory screen

**Priority:** P0
**Dependencies:** M1-E04-T004

Inventory should support:

* Item list/grid.
* Item name.
* Item icon placeholder.
* Quantity.
* Rarity.
* Description.
* Use/drop buttons.

**Acceptance Criteria**

* Inventory opens with hotkey I.
* Inventory displays picked-up items.
* Stack counts update.
* Player can close inventory.
* Inventory pauses or blocks gameplay input while open.

---

### M2-E04-T003 — Create equipment screen

**Priority:** P0
**Dependencies:** M2-E04-T002

Equipment screen should show:

* Weapon.
* Offhand.
* Head.
* Body.
* Cloak.
* Boots.
* Accessory 1.
* Accessory 2.
* Sigil.
* Support charm.

**Acceptance Criteria**

* Equipment screen opens with hotkey C or P.
* Current gear appears by slot.
* Empty slots are visible.
* Equipping weapon changes attack stats.
* Removing gear updates stats.

---

### M2-E04-T004 — Add item comparison panel

**Priority:** P1
**Dependencies:** M2-E04-T003

Show comparison between current gear and hovered gear.

**Acceptance Criteria**

* Current and new item are shown side by side.
* Stat increases are visible.
* Stat decreases are visible.
* Requirements are shown.
* Special effects are shown.

---

## Epic M2-E05 — Save and Load Vertical Slice

### M2-E05-T001 — Implement save data structure

**Priority:** P0
**Dependencies:** M0-E01-T003

Save data should include:

* Save version.
* Character.
* Current map.
* Position.
* Inventory.
* Equipment.
* Skills.
* Stats.
* Gold.
* Bestiary state.
* Quest state.
* World flags.
* Settings.

**Acceptance Criteria**

* Save data serializes to JSON.
* Save data can be deserialized.
* Missing optional fields get defaults.
* Save version is included.

---

### M2-E05-T002 — Implement localStorage save/load

**Priority:** P0
**Dependencies:** M2-E05-T001

Use localStorage for early save system.

**Acceptance Criteria**

* Player can save manually.
* Game autosaves on map transition.
* Main menu can continue saved game.
* Loaded character retains level, XP, items, gear, map, and position.

---

### M2-E05-T003 — Add save slot UI

**Priority:** P1
**Dependencies:** M2-E05-T002

Create save slot selection in main menu.

**Acceptance Criteria**

* Three save slots are visible.
* Empty slots show “New Game”.
* Used slots show character name, class, level, and map.
* Player can load a used slot.
* Player can start a new game in an empty slot.

---

# 8. M3 — Full Core Systems Alpha

## Epic M3-E01 — Stats and Character Progression

### M3-E01-T001 — Implement stat allocation screen

**Priority:** P0
**Dependencies:** M1-E04-T002

Allow player to allocate points into:

* STR.
* AGI.
* VIT.
* INT.
* DEX.
* LUK.

**Acceptance Criteria**

* Screen shows current stats.
* Screen shows unspent stat points.
* Player can increase stats.
* Stat cost increases by stat range.
* Derived stats update immediately.
* Changes can be confirmed.

---

### M3-E01-T002 — Add derived stat calculation

**Priority:** P0
**Dependencies:** M3-E01-T001

Calculate:

* Max HP.
* Max SP.
* Physical attack.
* Ranged attack.
* Magic attack.
* Defense.
* Magic defense.
* Hit.
* Dodge.
* Crit.
* Attack speed.
* Cast speed.
* Move speed.
* Weight limit.

**Acceptance Criteria**

* Derived stats update from base stats.
* Derived stats update from gear.
* Derived stats update from buffs.
* Character screen displays derived stats.
* Combat uses derived stats.

---

### M3-E01-T003 — Add stat reset service

**Priority:** P2
**Dependencies:** M3-E01-T001

Create town NPC service for resetting allocated stats.

**Acceptance Criteria**

* NPC offers stat reset.
* Reset costs gold.
* Player gets spent stat points back.
* Base class starting stats remain intact.
* Confirmation prompt appears.

---

## Epic M3-E02 — Skill System

### M3-E02-T001 — Implement skill data model

**Priority:** P0
**Dependencies:** M0-E02-T002

Skill data should include:

* ID.
* Name.
* Class.
* Description.
* Type.
* Targeting mode.
* Required level.
* Required skill level.
* Max skill level.
* SP cost.
* Cooldown.
* Cast time.
* Recovery time.
* Range.
* Area.
* Element.
* Scaling stat.
* Damage multiplier.
* Status effects.
* Animation key.
* Icon.

**Acceptance Criteria**

* Skill JSON loads.
* Skill definitions can be queried by class.
* Missing fields use defaults where appropriate.
* Skill system can execute basic active skills.

---

### M3-E02-T002 — Implement skill point allocation

**Priority:** P0
**Dependencies:** M3-E02-T001

Allow player to spend skill points.

**Acceptance Criteria**

* Skill screen opens with hotkey K.
* Skills are grouped by class.
* Player can level unlocked skills.
* Locked skills show requirements.
* Skill points decrease when spent.
* Skill data saves and loads.

---

### M3-E02-T003 — Implement hotbar assignment

**Priority:** P0
**Dependencies:** M3-E02-T002

Allow active skills and consumables to be assigned to hotbar slots.

**Acceptance Criteria**

* Hotbar supports slots 1–8.
* Player can assign skills.
* Player can assign potions.
* Pressing slot key uses assigned action.
* Hotbar state saves and loads.

---

### M3-E02-T004 — Implement target-based skills

**Priority:** P0
**Dependencies:** M3-E02-T003

Support skills requiring selected enemy target.

**Acceptance Criteria**

* Skill fails gracefully if no target exists.
* Skill checks range.
* Player moves into range if configured.
* Skill applies damage/effects.
* Cooldown and SP cost apply.

---

### M3-E02-T005 — Implement self-buff skills

**Priority:** P0
**Dependencies:** M3-E02-T003

Support skills that apply buffs to the player.

**Acceptance Criteria**

* Buff applies to player.
* Buff icon appears.
* Buff modifies stats.
* Buff expires after duration.
* Buff state is removed correctly.

---

### M3-E02-T006 — Implement ground-targeted skills

**Priority:** P1
**Dependencies:** M3-E02-T003

Support AoE skills targeting a ground position.

**Acceptance Criteria**

* Skill enters targeting mode.
* Valid area preview appears.
* Left-click confirms target.
* Skill affects enemies in area.
* Invalid targets are rejected.

---

### M3-E02-T007 — Implement passive skills

**Priority:** P0
**Dependencies:** M3-E02-T002

Support passive stat and behavior modifiers.

**Acceptance Criteria**

* Passive skills apply automatically.
* Passive effects update derived stats.
* Passive effects save/load.
* Passive effects are visible in skill tooltips.

---

### M3-E02-T008 — Implement toggle skills

**Priority:** P2
**Dependencies:** M3-E02-T003

Support skills that can be turned on/off.

**Acceptance Criteria**

* Toggle skill changes state.
* Active toggle drains SP or reserves a cost if configured.
* Toggle effects apply while active.
* Toggle deactivates when resources are insufficient.

---

## Epic M3-E03 — Status Effects

### M3-E03-T001 — Implement status effect model

**Priority:** P0
**Dependencies:** M3-E02-T001

Status effect data should support:

* ID.
* Name.
* Type.
* Duration.
* Tick interval.
* Stack behavior.
* Max stacks.
* Stat modifiers.
* Damage over time.
* Control effect.
* Visual icon.
* Dispel rules.

**Acceptance Criteria**

* Status definitions load from JSON.
* Status can be applied to player or enemy.
* Status expires correctly.
* Status is visible in UI.

---

### M3-E03-T002 — Implement core status effects

**Priority:** P1
**Dependencies:** M3-E03-T001

Add:

* Poison.
* Burn.
* Freeze.
* Slow.
* Stun.
* Blind.
* Curse.
* Silence.
* Bleed.
* Armor Break.
* Marked.
* Shielded.
* Blessed.

**Acceptance Criteria**

* Each status has unique gameplay behavior.
* Each status has placeholder icon.
* Each status can be applied by skills or monsters.
* Status behavior is visible during combat.

---

## Epic M3-E04 — Enemy AI and Spawning

### M3-E04-T001 — Implement spawn zones

**Priority:** P0
**Dependencies:** M1-E03-T001

Use Tiled object layers to define spawn zones.

**Acceptance Criteria**

* Spawn zones are read from map data.
* Spawn zones have monster IDs.
* Spawn zones have max count.
* Spawn zones respawn monsters over time.
* Monsters spawn inside zone bounds.

---

### M3-E04-T002 — Implement passive enemy behavior

**Priority:** P0
**Dependencies:** M3-E04-T001

Passive monsters only attack when attacked.

**Acceptance Criteria**

* Passive monsters ignore nearby player.
* Passive monsters retaliate when damaged.
* Passive monsters return to idle after combat ends.

---

### M3-E04-T003 — Implement aggressive enemy behavior

**Priority:** P0
**Dependencies:** M3-E04-T001

Aggressive monsters attack when player enters aggro range.

**Acceptance Criteria**

* Enemy detects player.
* Enemy chases player.
* Enemy attacks when in range.
* Enemy gives up after leash distance or timeout.

---

### M3-E04-T004 — Implement assist enemy behavior

**Priority:** P1
**Dependencies:** M3-E04-T003

Assist monsters help nearby allied monsters.

**Acceptance Criteria**

* Nearby allies respond when one is attacked.
* Assist radius is configurable.
* Assist behavior does not pull the entire map.
* Debug overlay can show assist radius.

---

### M3-E04-T005 — Implement caster enemy behavior

**Priority:** P1
**Dependencies:** M3-E04-T003

Caster enemies use ranged or magical skills.

**Acceptance Criteria**

* Caster keeps distance when possible.
* Caster uses skill cooldowns.
* Caster can be silenced.
* Cast bar or telegraph appears.

---

### M3-E04-T006 — Implement elite enemy behavior

**Priority:** P1
**Dependencies:** M3-E04-T003

Elite enemies have stronger stats and unique traits.

**Acceptance Criteria**

* Elite enemy has visual marker.
* Elite has higher HP/damage.
* Elite can drop better loot.
* Elite respawns slower than normal monsters.

---

### M3-E04-T007 — Implement boss protocol

**Priority:** P1
**Dependencies:** M3-E04-T006

Boss protocol should include:

* Knockback resistance.
* Control resistance.
* Detection of stealth.
* Larger leash area.
* Special HP bar.
* Phase support.

**Acceptance Criteria**

* Boss enemies use boss protocol flag.
* Bosses cannot be trivialized by basic crowd control.
* Boss UI appears.
* Boss death triggers special rewards.

---

# 9. M4 — Class Alpha

## Epic M4-E01 — Base Class Skill Lists

### M4-E01-T001 — Implement Swordsman base skills

**Priority:** P0
**Dependencies:** M3-E02-T007

Implement:

* Power Slash.
* Guard Stance.
* Iron Body.
* Sweeping Cut.
* Battle Cry.
* Endure Pain.
* Weapon Training.
* Counter Blow.

**Acceptance Criteria**

* All Swordsman skills exist in JSON.
* Active skills can be used.
* Passive skills affect stats.
* Tooltips show effects.
* Skills scale with correct stats.

---

### M4-E01-T002 — Implement Mage base skills

**Priority:** P0
**Dependencies:** M3-E02-T007

Implement:

* Fire Bolt.
* Frost Bolt.
* Lightning Spark.
* Mana Recovery.
* Arcane Shield.
* Flame Wall.
* Frost Ring.
* Spell Focus.

**Acceptance Criteria**

* Mage can deal ranged magic damage.
* Mage has elemental options.
* Mage has defensive shield.
* Mage has at least one AoE/control skill.
* SP consumption feels meaningful.

---

### M4-E01-T003 — Implement Archer base skills

**Priority:** P0
**Dependencies:** M3-E02-T007

Implement:

* Double Shot.
* Arrow Rain.
* Hawk Eye.
* Quick Step.
* Elemental Arrows.
* Pinning Shot.
* Focus.
* Bow Training.

**Acceptance Criteria**

* Archer can attack from range.
* Archer has single-target skill.
* Archer has AoE skill.
* Archer has movement/survival tool.
* Archer skills scale with DEX.

---

### M4-E01-T004 — Implement Thief base skills

**Priority:** P0
**Dependencies:** M3-E02-T007

Implement:

* Quick Stab.
* Backstep.
* Dodge Training.
* Poison Blade.
* Steal Chance.
* Shadow Walk.
* Backstab.
* Dirty Fighting.

**Acceptance Criteria**

* Thief has fast melee combat.
* Thief can apply poison.
* Thief has mobility.
* Thief has loot/farming utility.
* Thief has crit/evasion identity.

---

## Epic M4-E02 — Advanced Class Unlock

### M4-E02-T001 — Add level 40 specialization unlock

**Priority:** P0
**Dependencies:** M4-E01-T001

Unlock advanced class choice at level 40.

**Acceptance Criteria**

* Player sees notification at level 40.
* Advanced class NPC/service becomes available.
* Player can choose one of two specializations.
* Choice updates class data.
* Choice unlocks advanced skill tree.
* Choice saves and loads.

---

### M4-E02-T002 — Add advanced class confirmation UI

**Priority:** P0
**Dependencies:** M4-E02-T001

Create UI for choosing specialization.

**Acceptance Criteria**

* Shows two options for current base class.
* Shows description and playstyle.
* Shows preview of advanced skills.
* Requires confirmation.
* Cannot choose advanced class from another base class.

---

## Epic M4-E03 — Advanced Class Skills

### M4-E03-T001 — Implement Knight skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Two-Hand Mastery.
* Charge Thrust.
* Whirlwind Blade.
* Heavy Impact.
* Momentum.
* Warpath.
* Armor Breaker.
* Knight’s Oath.

**Acceptance Criteria**

* Knight supports aggressive melee.
* Knight has cleave.
* Knight has charge/mobility.
* Knight has two-handed weapon scaling.
* Knight has burst window.

---

### M4-E03-T002 — Implement Guardian skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Shield Mastery.
* Shield Bash.
* Radiant Guard.
* Retaliation.
* Sacred Edge.
* Last Stand.
* Barrier Circle.
* Guardian’s Vow.

**Acceptance Criteria**

* Guardian supports defensive melee.
* Guardian uses shields.
* Guardian has sustain/mitigation.
* Guardian has anti-undead/holy identity.
* Guardian can solo safely.

---

### M4-E03-T003 — Implement Wizard skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Meteor Rain.
* Blizzard Field.
* Thunderstorm.
* Elemental Amplify.
* Mana Surge.
* Chain Casting.
* Arcane Explosion.
* Archwizard’s Seal.

**Acceptance Criteria**

* Wizard has strong AoE damage.
* Wizard has elemental identity.
* Wizard consumes significant SP.
* Wizard has clear cast/telegraph timing.
* Wizard is powerful but fragile.

---

### M4-E03-T004 — Implement Sage skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Elemental Weapon.
* Spell Break.
* Magic Field.
* Elemental Study.
* Mana Conversion.
* Rune Trap.
* Dispel Hex.
* Sage’s Equation.

**Acceptance Criteria**

* Sage supports tactical magic.
* Sage has utility and elemental control.
* Sage can counter enemy casters.
* Sage supports hybrid play.
* Sage feels distinct from Wizard.

---

### M4-E03-T005 — Implement Hunter skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Falcon Companion.
* Snare Trap.
* Blast Trap.
* Mark Prey.
* Camouflage.
* Beast Knowledge.
* Piercing Shot.
* Apex Hunter.

**Acceptance Criteria**

* Hunter has trap gameplay.
* Falcon companion attacks or assists.
* Hunter can prepare boss fights.
* Hunter has strong single-target ranged damage.
* Traps use ground placement.

---

### M4-E03-T006 — Implement Minstrel skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Battle Song.
* Weakening Verse.
* Echo Shot.
* Restorative Tune.
* Rhythm Flow.
* Discord Note.
* Spirit Chorus.
* Final Refrain.

**Acceptance Criteria**

* Minstrel is solo viable.
* Songs provide buffs/debuffs.
* Rhythm chaining creates distinct gameplay.
* Minstrel has ranged damage.
* Minstrel is not dependent on party members.

---

### M4-E03-T007 — Implement Assassin skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Katar Mastery.
* Venom Stack.
* Sonic Strike.
* Grim Edge.
* Fatal Wound.
* Evasion Burst.
* Execution.
* Assassin’s Mark.

**Acceptance Criteria**

* Assassin has crit/poison burst identity.
* Poison stacks work.
* Execution rewards low-health targets.
* Assassin has evasive survival.
* Assassin performs well against bosses.

---

### M4-E03-T008 — Implement Rogue skills

**Priority:** P1
**Dependencies:** M4-E02-T001

Implement:

* Mug.
* Trick Shot.
* Smoke Bomb.
* Disable Armor.
* Treasure Sense.
* Ambush.
* Copy Technique.
* Rogue’s Fortune.

**Acceptance Criteria**

* Rogue has farming/loot identity.
* Rogue has control/debuffs.
* Rogue supports dagger and bow options.
* Treasure Sense affects loot or discovery.
* Copy Technique is constrained and balanced.

---

# 10. M5 — Content Alpha

## Epic M5-E01 — Region Content Structure

### M5-E01-T001 — Create world region data

**Priority:** P0
**Dependencies:** M0-E02-T002

Create region definitions for:

* Crownfield.
* Mossvale.
* Amber Dunes.
* Blueharbor Coast.
* Ironroot Highlands.
* Moonveil Marsh.
* Starfall Tower.

**Acceptance Criteria**

* Each region has ID, name, level range, description, maps, dungeons, monsters, bosses.
* Region data is used by map UI.
* Region progression is visible in the world map.

---

### M5-E01-T002 — Add map metadata system

**Priority:** P0
**Dependencies:** M5-E01-T001

Each map should define:

* ID.
* Name.
* Region.
* Level range.
* Type.
* Portals.
* Spawn groups.
* NPCs.
* Music key.
* Recommended elements.
* Drop highlights.

**Acceptance Criteria**

* Map UI can display metadata.
* Loading a map uses metadata.
* Spawn system reads metadata.
* Music system can read map music key.

---

## Epic M5-E02 — Town Content

### M5-E02-T001 — Finalize Crownfield town

**Priority:** P1
**Dependencies:** M2-E02-T001

Add final functional layout for Crownfield.

**Acceptance Criteria**

* Town has all core service NPCs.
* Town has clear exits.
* Town has readable pixel layout.
* Town feels like starting hub.
* No major navigation issues.

---

### M5-E02-T002 — Create Mossvale hub

**Priority:** P1
**Dependencies:** M5-E01-T001

Create forest-region town/hub.

**Acceptance Criteria**

* Hub has service NPCs.
* Hub connects to Mossvale maps.
* Hub has unique forest visual identity.
* Hub contains hunting board.
* Hub has travel connection.

---

### M5-E02-T003 — Create Amber Dunes hub

**Priority:** P1
**Dependencies:** M5-E01-T001

Create desert-region hub.

**Acceptance Criteria**

* Hub has desert/oasis identity.
* Hub connects to desert maps and dungeon.
* Hub includes refiner/crafter access.
* Hub has local NPC dialogue.

---

### M5-E02-T004 — Create Blueharbor Coast hub

**Priority:** P1
**Dependencies:** M5-E01-T001

Create coastal/port hub.

**Acceptance Criteria**

* Hub has port identity.
* Hub connects to beach and sea cave maps.
* Hub includes travel agent.
* Hub has market NPCs.

---

### M5-E02-T005 — Create Ironroot Highlands hub

**Priority:** P1
**Dependencies:** M5-E01-T001

Create mining/highlands hub.

**Acceptance Criteria**

* Hub has mining/forge identity.
* Hub highlights crafting/refinement.
* Hub connects to mine dungeon.
* Hub includes material vendors.

---

### M5-E02-T006 — Create Moonveil Marsh hub

**Priority:** P2
**Dependencies:** M5-E01-T001

Create late-game marsh hub.

**Acceptance Criteria**

* Hub has cursed/marsh identity.
* Hub supports late-game services.
* Hub connects to undead/poison maps.
* Hub unlocks advanced hunting contracts.

---

## Epic M5-E03 — Field Maps

### M5-E03-T001 — Create Crownfield field set

**Priority:** P0
**Dependencies:** M5-E01-T002

Create:

* Crownfield Meadows.
* Old Road.
* Training Sewers exterior entrance.

**Acceptance Criteria**

* Supports levels 1–10.
* Has 5+ monster types total.
* Has safe beginner farming loops.
* Has at least one elite spawn.
* Has beginner drops.

---

### M5-E03-T002 — Create Mossvale field set

**Priority:** P1
**Dependencies:** M5-E01-T002

Create:

* Mossvale Edge.
* Deep Mossvale.
* Green Chapel Road.

**Acceptance Criteria**

* Supports levels 10–30.
* Introduces assist monsters.
* Introduces plant/beast families.
* Has useful Archer/Thief drops.
* Has entrance to Green Chapel Ruins.

---

### M5-E03-T003 — Create Blueharbor field set

**Priority:** P1
**Dependencies:** M5-E01-T002

Create:

* Blueharbor Beach.
* Tide Flats.
* Sea Cave Entrance.

**Acceptance Criteria**

* Supports levels 20–35.
* Introduces aquatic monsters.
* Introduces slow/water effects.
* Has Mage and Archer relevant drops.
* Has entrance to Tide Cave.

---

### M5-E03-T004 — Create Amber Dunes field set

**Priority:** P1
**Dependencies:** M5-E01-T002

Create:

* Amber Dunes.
* Bandit Pass.
* Buried Sun Approach.

**Acceptance Criteria**

* Supports levels 35–50.
* Introduces poison and ambush enemies.
* Has desert materials.
* Has entrance to Buried Sun Tomb.
* Has elite bandit encounter.

---

### M5-E03-T005 — Create Ironroot field set

**Priority:** P1
**Dependencies:** M5-E01-T002

Create:

* Ironroot Highlands.
* Old Quarry.
* Mine Road.

**Acceptance Criteria**

* Supports levels 35–55.
* Introduces construct/goblin families.
* Provides refinement materials.
* Has entrance to Ironroot Mine.
* Has crafting-focused loot.

---

### M5-E03-T006 — Create Moonveil Marsh field set

**Priority:** P2
**Dependencies:** M5-E01-T002

Create:

* Moonveil Marsh.
* Cursed Bell Road.
* Rotting Fen.

**Acceptance Criteria**

* Supports levels 50–70.
* Introduces undead/dark enemies.
* Uses poison/curse hazards.
* Has late-game material drops.
* Has entrance to Cursed Bell Crypt.

---

### M5-E03-T007 — Create Starfall exterior/endgame maps

**Priority:** P2
**Dependencies:** M5-E01-T002

Create:

* Starfall Approach.
* Rune Archive Exterior.
* Fallen Observatory Approach.

**Acceptance Criteria**

* Supports levels 65–99.
* Introduces arcane/construct enemies.
* Has endgame entrances.
* Has rare materials.
* Has high-level elites.

---

## Epic M5-E04 — Dungeons

### M5-E04-T001 — Create Old Sewers dungeon

**Priority:** P0
**Dependencies:** M5-E03-T001

Level range: 5–15
Boss: Sewer Glutton

**Acceptance Criteria**

* Dungeon has multiple rooms.
* Dungeon has monster density higher than fields.
* Dungeon has miniboss or final boss.
* Dungeon rewards beginner gear/materials.
* Dungeon is replayable.

---

### M5-E04-T002 — Create Green Chapel Ruins dungeon

**Priority:** P1
**Dependencies:** M5-E03-T002

Level range: 15–25
Boss: Thorn Priest

**Acceptance Criteria**

* Dungeon introduces plant/spirit enemies.
* Has environmental hazards.
* Has boss encounter.
* Has class-relevant loot.
* Has shortcut unlock.

---

### M5-E04-T003 — Create Tide Cave dungeon

**Priority:** P1
**Dependencies:** M5-E03-T003

Level range: 25–38
Boss: Sunken Corsair

**Acceptance Criteria**

* Dungeon uses water/aquatic theme.
* Has slow/water hazards.
* Has pirate/aquatic enemies.
* Has boss encounter.
* Has rare crafting materials.

---

### M5-E04-T004 — Create Ironroot Mine dungeon

**Priority:** P1
**Dependencies:** M5-E03-T005

Level range: 35–50
Boss: Brass Burrower

**Acceptance Criteria**

* Dungeon provides ores.
* Construct enemies appear.
* Mine hazards exist.
* Boss uses burrow/charge behavior.
* Refinement materials drop.

---

### M5-E04-T005 — Create Buried Sun Tomb dungeon

**Priority:** P1
**Dependencies:** M5-E03-T004

Level range: 40–55
Boss: Dune Tyrant

**Acceptance Criteria**

* Dungeon uses desert/tomb visuals.
* Has undead/reptile enemies.
* Has traps.
* Boss has multi-phase behavior.
* Drops sigil-related materials.

---

### M5-E04-T006 — Create Cursed Bell Crypt dungeon

**Priority:** P2
**Dependencies:** M5-E03-T006

Level range: 55–70
Boss: Bell Wraith

**Acceptance Criteria**

* Dungeon uses dark/curse identity.
* Undead enemies are central.
* Curse mechanics are introduced.
* Boss uses sound/bell telegraphs.
* Anti-undead builds are rewarded.

---

### M5-E04-T007 — Create Starfall Tower dungeon

**Priority:** P2
**Dependencies:** M5-E03-T007

Level range: 70–90
Boss: Rune Chimera

**Acceptance Criteria**

* Dungeon has arcane visual identity.
* Enemy elements vary.
* Boss alternates elements.
* High-level gear drops.
* Unlocks endgame tower.

---

### M5-E04-T008 — Create Fallen Observatory dungeon

**Priority:** P2
**Dependencies:** M5-E03-T007

Level range: 85–99
Boss: Fallen Star Saint

**Acceptance Criteria**

* Dungeon supports late-game farming.
* Boss is mechanically complex.
* Drops mythic materials.
* Endgame builds are tested.
* Dungeon can be replayed after campaign.

---

# 11. M6 — Economy and Progression Alpha

## Epic M6-E01 — Item System Expansion

### M6-E01-T001 — Implement item rarity

**Priority:** P0
**Dependencies:** M2-E04-T002

Add rarity tiers:

* Common.
* Uncommon.
* Rare.
* Epic.
* Legendary.
* Mythic.

**Acceptance Criteria**

* Items show rarity color.
* Rarity affects generated stats.
* Rarity affects sell value.
* Drop tables can reference rarity.

---

### M6-E01-T002 — Implement equipment stat modifiers

**Priority:** P0
**Dependencies:** M2-E04-T003

Equipment can modify:

* Attack.
* Magic attack.
* Defense.
* Magic defense.
* HP.
* SP.
* STR.
* AGI.
* VIT.
* INT.
* DEX.
* LUK.
* Crit.
* Attack speed.
* Cast speed.
* Cooldown.
* Element damage.
* Race damage.
* Resistances.
* Drop chance.
* Movement speed.

**Acceptance Criteria**

* Equipping gear updates derived stats.
* Removing gear removes bonuses.
* Multiple items stack correctly.
* UI displays gear bonuses.

---

### M6-E01-T003 — Create full equipment slot system

**Priority:** P0
**Dependencies:** M6-E01-T002

Support slots:

* Weapon.
* Offhand.
* Head.
* Body.
* Cloak.
* Boots.
* Accessory 1.
* Accessory 2.
* Sigil.
* Support Charm.

**Acceptance Criteria**

* All slots are visible.
* Items can only equip into valid slots.
* Weapon restrictions by class work.
* Two accessories can be equipped.
* Offhand rules work with two-handed weapons.

---

### M6-E01-T004 — Create initial 100 item definitions

**Priority:** P1
**Dependencies:** M6-E01-T003

Create initial items:

* 20 weapons.
* 20 armor pieces.
* 20 accessories.
* 20 materials.
* 10 consumables.
* 10 special/sigil/support items.

**Acceptance Criteria**

* Items are original.
* Items cover levels 1–50.
* Items have valid icons/placeholders.
* Items appear in shops, drops, or recipes.
* No item references copied IP.

---

### M6-E01-T005 — Expand to 300+ item definitions

**Priority:** P2
**Dependencies:** M6-E01-T004

Expand item database for full game.

**Acceptance Criteria**

* Items cover levels 1–99.
* All classes have useful gear paths.
* All regions have distinct material drops.
* Bosses have unique loot.
* Endgame has chase items.

---

## Epic M6-E02 — Consumables

### M6-E02-T001 — Implement potion usage

**Priority:** P0
**Dependencies:** M2-E04-T002

Support HP and SP potions.

**Acceptance Criteria**

* Potion heals HP or SP.
* Potion consumes item from inventory.
* Potion has cooldown.
* Potion can be assigned to hotbar.
* Potion cannot exceed max HP/SP.

---

### M6-E02-T002 — Implement buff consumables

**Priority:** P1
**Dependencies:** M3-E03-T001

Support temporary consumable buffs.

**Acceptance Criteria**

* Buff food/potion applies status effect.
* Buff has duration.
* Buff icon appears.
* Buff persists through map transition if configured.
* Buff expires correctly.

---

### M6-E02-T003 — Add auto-potion option

**Priority:** P2
**Dependencies:** M6-E02-T001

Allow player to configure auto-potion thresholds.

**Acceptance Criteria**

* Player can set HP threshold.
* Player can set SP threshold.
* Auto-potion consumes assigned potion.
* Auto-potion respects cooldown.
* Setting saves and loads.

---

## Epic M6-E03 — NPC Market

### M6-E03-T001 — Implement shop service

**Priority:** P0
**Dependencies:** M2-E03-T003, M6-E01-T001

Create shop UI for buying and selling.

**Acceptance Criteria**

* NPC opens shop.
* Player can buy items.
* Player can sell items.
* Gold updates.
* Inventory updates.
* Shop stock comes from JSON.

---

### M6-E03-T002 — Implement region-specific shops

**Priority:** P1
**Dependencies:** M6-E03-T001

Create different shop inventories by town/region.

**Acceptance Criteria**

* Crownfield sells beginner items.
* Mossvale sells forest supplies.
* Blueharbor sells water/sea items.
* Amber Dunes sells desert supplies.
* Ironroot sells refinement materials.
* Moonveil sells late-game supplies.

---

### M6-E03-T003 — Implement appraiser service

**Priority:** P2
**Dependencies:** M6-E03-T001

Allow special NPC to identify or improve sell value of rare items.

**Acceptance Criteria**

* Appraiser can reveal unknown item details if used.
* Appraiser can sell selected items at improved rate.
* Appraiser cost is balanced.
* Appraiser UI is clear.

---

## Epic M6-E04 — Storage

### M6-E04-T001 — Implement shared storage

**Priority:** P1
**Dependencies:** M2-E03-T003, M2-E05-T001

Create town storage accessible from Storage Keeper NPC.

**Acceptance Criteria**

* Player can deposit items.
* Player can withdraw items.
* Storage is shared across towns.
* Storage saves and loads.
* Gold cannot be lost through storage operations.

---

### M6-E04-T002 — Add storage filters/search

**Priority:** P2
**Dependencies:** M6-E04-T001

Add filtering by:

* Equipment.
* Consumables.
* Materials.
* Rarity.
* Class.
* Level.
* Name search.

**Acceptance Criteria**

* Filters update visible list.
* Search works by item name.
* Sorting works.
* UI remains usable with many items.

---

## Epic M6-E05 — Crafting

### M6-E05-T001 — Implement recipe data model

**Priority:** P0
**Dependencies:** M0-E02-T002

Recipes should include:

* ID.
* Name.
* Output item.
* Output quantity.
* Required materials.
* Required gold.
* Required level.
* Required region/NPC.
* Unlock condition.

**Acceptance Criteria**

* Recipe JSON loads.
* Crafting UI can list recipes.
* Missing materials are shown.
* Recipe output is generated correctly.

---

### M6-E05-T002 — Implement crafting UI

**Priority:** P0
**Dependencies:** M6-E05-T001

Create crafting menu.

**Acceptance Criteria**

* Player can view known recipes.
* Player can craft if requirements are met.
* Materials and gold are consumed.
* Crafted item enters inventory.
* Crafting emits inventory update.

---

### M6-E05-T003 — Implement recipe unlocks

**Priority:** P1
**Dependencies:** M6-E05-T002

Support recipe unlocks from:

* NPCs.
* Boss drops.
* Quests.
* Hunting board.
* Exploration.
* Bestiary milestones.

**Acceptance Criteria**

* Locked recipes are hidden or shown as locked.
* Unlock state saves and loads.
* Unlock notifications appear.
* Recipes cannot be crafted before unlock.

---

### M6-E05-T004 — Create 100+ recipes

**Priority:** P2
**Dependencies:** M6-E05-T003

Create recipes across:

* Weapons.
* Armor.
* Accessories.
* Consumables.
* Support items.
* Refinement materials.
* Sigils.

**Acceptance Criteria**

* Recipes cover levels 1–99.
* Recipes use regional materials.
* Recipes support all classes.
* Recipes provide meaningful progression.

---

## Epic M6-E06 — Gear Refinement

### M6-E06-T001 — Implement refinement levels

**Priority:** P0
**Dependencies:** M6-E01-T003

Gear can be refined from +0 to +10.

**Acceptance Criteria**

* Refinable items show refine level.
* Refine level affects item stats.
* Refine level saves and loads.
* Non-refinable items are rejected.

---

### M6-E06-T002 — Implement refinement UI

**Priority:** P0
**Dependencies:** M6-E06-T001

Create refiner NPC interface.

**Acceptance Criteria**

* Player selects item.
* UI shows cost and materials.
* UI shows success chance.
* UI shows possible failure result.
* Player can confirm refinement.

---

### M6-E06-T003 — Implement refinement failure rules

**Priority:** P1
**Dependencies:** M6-E06-T002

Rules:

* +1 to +4 always succeed.
* +5 to +7 can fail and lose one level.
* +8 to +10 can fail and lose one or two levels.
* No permanent item destruction.

**Acceptance Criteria**

* Success/failure uses configured chances.
* Failure never deletes item.
* Failure result is communicated clearly.
* Refinement costs are consumed on attempt.

---

### M6-E06-T004 — Add refinement materials

**Priority:** P1
**Dependencies:** M6-E06-T002

Add:

* Copper Ore.
* Iron Ore.
* Silver Ore.
* Rune Ore.
* Stabilizer.
* Boss Catalyst.

**Acceptance Criteria**

* Materials drop in correct regions.
* Materials appear in recipes/shops.
* Refiner requires correct materials.
* Boss Catalyst is rare.

---

## Epic M6-E07 — Sigil System

### M6-E07-T001 — Implement sigil equipment slot

**Priority:** P1
**Dependencies:** M6-E01-T003

Create build-defining sigil slot.

**Acceptance Criteria**

* Only sigil items can equip in sigil slot.
* Only one sigil can be equipped.
* Sigil effects update stats/behavior.
* Sigil effects appear in UI.

---

### M6-E07-T002 — Create first sigils

**Priority:** P1
**Dependencies:** M6-E07-T001

Create:

* Sigil of the Wolf.
* Sigil of Flame.
* Sigil of the Falcon.
* Sigil of Venom.
* Sigil of the Guardian.
* Sigil of the Sage.
* Sigil of Fortune.

**Acceptance Criteria**

* Each sigil supports a distinct build.
* Sigils drop from appropriate sources.
* Sigils are rare enough to feel valuable.
* Sigils are not mandatory for campaign completion.

---

## Epic M6-E08 — Support Companions

### M6-E08-T001 — Implement support companion slot

**Priority:** P1
**Dependencies:** M6-E01-T003

Allow one support companion at a time.

**Acceptance Criteria**

* Player can equip one support.
* Support appears near player or as UI-only helper.
* Support can trigger automatic actions.
* Support state saves and loads.

---

### M6-E08-T002 — Implement Pack Sprite support

**Priority:** P1
**Dependencies:** M6-E08-T001

Pack Sprite should provide:

* Extra carry weight.
* Auto-pickup filter.
* Emergency potion helper.
* Material finder.

**Acceptance Criteria**

* Pack Sprite affects weight limit.
* Auto-pickup behavior can be configured.
* Support actions use cooldowns.
* Support does not require micromanagement.

---

### M6-E08-T003 — Implement Shrine Wisp support

**Priority:** P1
**Dependencies:** M6-E08-T001

Shrine Wisp should provide:

* Minor heal.
* Cleanse.
* Blessing aura.
* Spirit barrier.
* Undead ward.

**Acceptance Criteria**

* Shrine Wisp can heal automatically.
* Cleanse works on eligible statuses.
* Blessing aura modifies stats.
* Undead ward helps against undead enemies.

---

### M6-E08-T004 — Implement support leveling

**Priority:** P2
**Dependencies:** M6-E08-T003

Support companions level separately.

**Acceptance Criteria**

* Support gains XP or affinity.
* Support unlocks better effects.
* Support level saves and loads.
* Support growth is visible in UI.

---

## Epic M6-E09 — Bestiary

### M6-E09-T001 — Implement bestiary data tracking

**Priority:** P1
**Dependencies:** M1-E04-T001

Track per-monster:

* Kills.
* First discovered.
* Drops discovered.
* Element discovered.
* Behavior discovered.
* Family discovered.

**Acceptance Criteria**

* Killing monster updates bestiary.
* Bestiary state saves and loads.
* Unknown monsters show partial info.
* Discovered monsters show more info.

---

### M6-E09-T002 — Implement bestiary UI

**Priority:** P1
**Dependencies:** M6-E09-T001

Create bestiary screen.

**Acceptance Criteria**

* Bestiary opens with hotkey B.
* Monsters are grouped by family/region.
* Monster details unlock by kill milestones.
* Drop info unlocks gradually.
* UI supports search/filter.

---

### M6-E09-T003 — Implement bestiary milestones

**Priority:** P2
**Dependencies:** M6-E09-T002

Milestones:

* 1 kill: name, sprite, level.
* 5 kills: element, family, behavior.
* 15 kills: common drops.
* 30 kills: rare drops.
* 50 kills: combat tips.
* 100 kills: small permanent bonus vs family.

**Acceptance Criteria**

* Milestones unlock correctly.
* Player receives notification.
* Permanent bonus applies correctly.
* Milestone state saves and loads.

---

## Epic M6-E10 — Hunting Board

### M6-E10-T001 — Implement hunting board system

**Priority:** P1
**Dependencies:** M6-E09-T001

Create repeatable hunting contracts.

**Acceptance Criteria**

* Board lists available contracts.
* Player can accept contract.
* Kill progress is tracked.
* Player can turn in contract.
* Rewards are granted.

---

### M6-E10-T002 — Add regional hunting contracts

**Priority:** P1
**Dependencies:** M6-E10-T001

Create contracts per region.

**Acceptance Criteria**

* Each region has level-appropriate hunts.
* Contracts reward XP/gold/materials.
* Elite hunts exist.
* Boss contracts can be unlocked.

---

### M6-E10-T003 — Add daily-style repeatable structure without real-time dependency

**Priority:** P2
**Dependencies:** M6-E10-T002

Use in-game refresh rules instead of real-world timers.

**Acceptance Criteria**

* Contracts refresh after map clears, boss kills, or rest.
* No online clock is required.
* Player cannot infinitely exploit one contract.
* Refresh logic is clear.

---

# 12. M7 — Campaign and Endgame Beta

## Epic M7-E01 — Campaign Progression

### M7-E01-T001 — Implement quest data model

**Priority:** P1
**Dependencies:** M0-E02-T002

Quest data should include:

* ID.
* Name.
* Type.
* Description.
* Objectives.
* Rewards.
* Required level.
* Required flags.
* Unlock flags.
* NPC start.
* NPC turn-in.
* Map markers.

**Acceptance Criteria**

* Quest JSON loads.
* Quest can be accepted.
* Quest objectives can update.
* Quest can be completed.
* Rewards are granted.
* Quest state saves and loads.

---

### M7-E01-T002 — Implement quest log UI

**Priority:** P1
**Dependencies:** M7-E01-T001

Create quest log screen.

**Acceptance Criteria**

* Quest log opens with hotkey L.
* Active quests are visible.
* Completed quests are visible.
* Objectives show progress.
* Map/region hints appear.

---

### M7-E01-T003 — Create Act 1 campaign quests

**Priority:** P1
**Dependencies:** M7-E01-T002

Act 1: levels 1–15, Crownfield.

**Acceptance Criteria**

* Introduces movement.
* Introduces combat.
* Introduces loot.
* Introduces NPC services.
* Leads player to Old Sewers.
* Ends with first dungeon boss.

---

### M7-E01-T004 — Create Act 2 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T003

Act 2: levels 15–30, Mossvale and Blueharbor.

**Acceptance Criteria**

* Introduces elemental awareness.
* Introduces crafting.
* Introduces hunting board.
* Leads to Green Chapel and Tide Cave.
* Unlocks next regions.

---

### M7-E01-T005 — Create Act 3 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T004

Act 3: levels 30–45, Amber Dunes and Ironroot.

**Acceptance Criteria**

* Introduces refinement.
* Introduces stronger elites.
* Leads to advanced class unlock near level 40.
* Introduces boss farming.
* Unlocks Moonveil.

---

### M7-E01-T006 — Create Act 4 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T005

Act 4: levels 45–65, Moonveil Marsh.

**Acceptance Criteria**

* Introduces curse/undead-heavy content.
* Tests advanced class identity.
* Unlocks late-game crafting.
* Leads to Bell Wraith.
* Unlocks Starfall Tower.

---

### M7-E01-T007 — Create Act 5 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T006

Act 5: levels 65–80, Starfall Tower.

**Acceptance Criteria**

* Introduces arcane endgame enemies.
* Resolves main campaign.
* Unlocks replayable final boss.
* Unlocks endgame systems.
* Campaign ending does not end the save.

---

## Epic M7-E02 — Boss and MVP System

### M7-E02-T001 — Implement boss arena flow

**Priority:** P1
**Dependencies:** M3-E04-T007

Support dedicated boss arenas.

**Acceptance Criteria**

* Entering arena locks boss encounter.
* Boss resets if player dies.
* Boss defeat grants rewards.
* Player can leave after victory.
* Boss UI appears.

---

### M7-E02-T002 — Implement boss phases

**Priority:** P1
**Dependencies:** M7-E02-T001

Bosses can change behavior based on HP thresholds.

**Acceptance Criteria**

* Boss phase changes at configured HP percentages.
* Phase change can trigger dialogue, VFX, or new attacks.
* Phase data comes from JSON.
* Boss behavior remains stable after save/load boundaries.

---

### M7-E02-T003 — Implement MVP summoning ritual

**Priority:** P2
**Dependencies:** M7-E02-T001

Allow players to summon MVPs using materials.

**Acceptance Criteria**

* Ritual requires materials.
* Ritual consumes materials.
* MVP spawns in correct arena/map.
* MVP drops special rewards.
* MVP can be repeated.

---

### M7-E02-T004 — Implement MVP respawn timers

**Priority:** P2
**Dependencies:** M7-E02-T003

Create single-player-friendly respawn logic.

**Acceptance Criteria**

* MVP respawns after in-game timer or map activity condition.
* Respawn does not require real-world waiting.
* Timer state saves and loads.
* Player can also use summoning ritual if available.

---

### M7-E02-T005 — Create regional MVPs

**Priority:** P2
**Dependencies:** M7-E02-T004

Create MVPs:

* King Slime Verdant.
* Thorn Matriarch.
* Sunken Corsair.
* Brass Burrower.
* Dune Tyrant.
* Bell Wraith.
* Rune Chimera.
* Fallen Star Saint.

**Acceptance Criteria**

* Each MVP has original identity.
* Each MVP has unique mechanics.
* Each MVP has unique loot.
* Each MVP supports repeated farming.
* Each MVP has bestiary entry.

---

## Epic M7-E03 — Endgame Tower

### M7-E03-T001 — Implement Starfall Tower mode

**Priority:** P2
**Dependencies:** M7-E01-T007

Create 30-floor challenge tower.

**Acceptance Criteria**

* Player enters tower from endgame hub.
* Tower tracks current floor.
* Each floor has enemy waves or challenge.
* Every 5 floors has miniboss.
* Every 10 floors has major boss.
* Rewards are granted by milestone.

---

### M7-E03-T002 — Add tower modifiers

**Priority:** P2
**Dependencies:** M7-E03-T001

Modifiers:

* Burning.
* Cursed.
* Swarming.
* Elite.
* Fragile.
* Treasure.
* Elemental.

**Acceptance Criteria**

* Modifiers change floor behavior.
* Modifier is displayed before floor begins.
* Modifier rewards scale appropriately.
* Modifiers do not create impossible combinations.

---

### M7-E03-T003 — Add tower reward structure

**Priority:** P2
**Dependencies:** M7-E03-T002

Rewards:

* Sigils.
* Refinement materials.
* Cosmetics.
* Mythic materials.
* Skill augments.

**Acceptance Criteria**

* Rewards scale by floor.
* Milestone rewards are guaranteed.
* Repeat clears remain useful.
* Tower does not replace all other farming.

---

## Epic M7-E04 — Challenge Dungeons

### M7-E04-T001 — Implement dungeon modifiers

**Priority:** P2
**Dependencies:** M5-E04-T008

Allow replayable dungeon modifiers.

**Acceptance Criteria**

* Player can choose challenge mode.
* Dungeon gets modifier.
* Rewards improve.
* Difficulty increases.
* Modifier state is visible.

---

### M7-E04-T002 — Implement class trials

**Priority:** P2
**Dependencies:** M4-E03-T008

Create combat trials for each advanced class.

**Acceptance Criteria**

* Each advanced class has unique trial.
* Trial teaches class mechanics.
* Trial rewards skill augment or cosmetic.
* Trial can be replayed.

---

# 13. M8 — UI, UX, Audio, Polish, and Accessibility

## Epic M8-E01 — UI Polish

### M8-E01-T001 — Create final HUD layout

**Priority:** P1
**Dependencies:** M2-E04-T001

Polish HUD for readability.

**Acceptance Criteria**

* HP/SP bars are readable.
* XP bar is readable.
* Hotbar icons are clear.
* Buff/debuff icons are readable.
* Target panel has enemy HP and status.

---

### M8-E01-T002 — Add minimap

**Priority:** P2
**Dependencies:** M5-E01-T002

Create minimap UI.

**Acceptance Criteria**

* Minimap shows player position.
* Minimap shows map shape or simplified layout.
* NPCs/portals can be marked.
* Quest markers can appear.
* Minimap can be toggled.

---

### M8-E01-T003 — Add world map screen

**Priority:** P2
**Dependencies:** M5-E01-T001

Create world map UI.

**Acceptance Criteria**

* Regions are visible.
* Current location is highlighted.
* Discovered maps are shown.
* Map level ranges are shown.
* Fast travel destinations are shown if unlocked.

---

### M8-E01-T004 — Add tooltip system

**Priority:** P1
**Dependencies:** M2-E04-T002

Tooltips for:

* Items.
* Skills.
* Stats.
* Status effects.
* Monsters.
* Map icons.

**Acceptance Criteria**

* Tooltips appear on hover.
* Tooltips fit screen bounds.
* Tooltips show relevant numbers.
* Tooltips are readable.

---

## Epic M8-E02 — Audio

### M8-E02-T001 — Implement audio manager

**Priority:** P1
**Dependencies:** M0-E01-T004

Support:

* Music.
* SFX.
* UI sounds.
* Volume settings.
* Mute settings.

**Acceptance Criteria**

* Music plays per map.
* SFX plays for combat.
* UI sounds play for menus.
* Volume settings work.
* Settings save and load.

---

### M8-E02-T002 — Add placeholder music and SFX

**Priority:** P1
**Dependencies:** M8-E02-T001

Add placeholder sounds for:

* Click.
* Attack.
* Hit.
* Skill cast.
* Pickup.
* Gold.
* Level up.
* Equip.
* Refine success.
* Refine failure.
* Boss spawn.
* Rare drop.

**Acceptance Criteria**

* Major gameplay actions have sound.
* Sounds can be replaced later.
* No missing sound errors occur.
* Audio does not become overwhelming.

---

### M8-E02-T003 — Add final audio pass

**Priority:** P3
**Dependencies:** M8-E02-T002

Replace placeholder audio with final assets.

**Acceptance Criteria**

* Each region has music.
* Bosses have boss music.
* Major skills have distinct SFX.
* UI has consistent audio language.
* Audio mix is comfortable.

---

## Epic M8-E03 — Visual Effects and Animation

### M8-E03-T001 — Implement VFX manager

**Priority:** P1
**Dependencies:** M3-E02-T004

Create reusable VFX system.

**Acceptance Criteria**

* Skills can spawn VFX.
* Hits can spawn VFX.
* Status effects can spawn VFX.
* VFX can be configured from data.
* VFX clean themselves up.

---

### M8-E03-T002 — Add damage numbers

**Priority:** P1
**Dependencies:** M1-E03-T005

Display floating combat text.

**Acceptance Criteria**

* Damage numbers appear.
* Critical damage has distinct style.
* Miss appears.
* Healing appears.
* Player can disable damage numbers.

---

### M8-E03-T003 — Add loot beams/rarity indicators

**Priority:** P2
**Dependencies:** M6-E01-T001

Show visual indicators for rare drops.

**Acceptance Criteria**

* Rare+ drops are visually distinct.
* Legendary/mythic drops are very noticeable.
* Indicators do not block gameplay.
* Setting can reduce visual intensity.

---

### M8-E03-T004 — Add final animation pass

**Priority:** P3
**Dependencies:** M4-E03-T008

Polish animations for:

* Player idle/walk/attack/cast.
* Monsters.
* NPCs.
* Bosses.
* Skill casts.
* Death.
* Hit reactions.

**Acceptance Criteria**

* Final animations replace placeholders.
* Directional animations work.
* Animation timing matches combat.
* No major visual desync.

---

## Epic M8-E04 — Accessibility and Settings

### M8-E04-T001 — Implement settings menu

**Priority:** P1
**Dependencies:** M8-E02-T001

Settings should include:

* Music volume.
* SFX volume.
* UI scale.
* Damage numbers.
* Screen shake.
* Flash intensity.
* Auto-potion.
* Difficulty.
* Text speed.

**Acceptance Criteria**

* Settings menu opens from main menu and pause menu.
* Settings apply immediately.
* Settings save and load.
* Defaults are sensible.

---

### M8-E04-T002 — Implement UI scaling

**Priority:** P1
**Dependencies:** M8-E04-T001

Support UI scale from 100% to 200%.

**Acceptance Criteria**

* HUD scales correctly.
* Menus scale correctly.
* Tooltips scale correctly.
* Text remains readable.
* UI does not overflow severely.

---

### M8-E04-T003 — Implement difficulty presets

**Priority:** P1
**Dependencies:** M3-E04-T007

Presets:

* Story.
* Normal.
* Veteran.

**Acceptance Criteria**

* Difficulty affects enemy damage/HP or player mitigation.
* Difficulty affects potion generosity or death penalty.
* Difficulty can be changed outside combat.
* No content is locked behind difficulty.

---

### M8-E04-T004 — Add colorblind/readability support

**Priority:** P2
**Dependencies:** M8-E04-T001

Add readable alternatives for color-coded information.

**Acceptance Criteria**

* Rarity is not only communicated through color.
* Status effects have icons.
* Element info uses labels/icons.
* Important warnings have shape/text cues.
* UI contrast is acceptable.

---

# 14. M9 — Balance, QA, and Release Candidate

## Epic M9-E01 — Balance Tools

### M9-E01-T001 — Add debug combat simulator

**Priority:** P1
**Dependencies:** M1-E03-T005

Create internal simulation for combat.

**Acceptance Criteria**

* Can simulate player vs monster.
* Can run multiple iterations.
* Outputs average time to kill.
* Outputs damage taken.
* Helps compare classes.

---

### M9-E01-T002 — Add balance spreadsheet export

**Priority:** P2
**Dependencies:** M9-E01-T001

Export relevant data to CSV.

**Acceptance Criteria**

* Exports monsters.
* Exports items.
* Exports skills.
* Exports XP curve.
* Exports drop tables.

---

### M9-E01-T003 — Balance levels 1–20

**Priority:** P0
**Dependencies:** M5-E04-T001

Balance early game.

**Acceptance Criteria**

* All base classes can clear early content.
* Player understands systems.
* No early monster is unfair.
* First dungeon is beatable.
* Level pacing feels smooth.

---

### M9-E01-T004 — Balance levels 20–50

**Priority:** P1
**Dependencies:** M5-E04-T005

Balance midgame.

**Acceptance Criteria**

* All classes can progress.
* Gear upgrades matter.
* Crafting/refinement are useful.
* Advanced class unlock is reachable.
* Bosses are challenging but fair.

---

### M9-E01-T005 — Balance levels 50–99

**Priority:** P2
**Dependencies:** M5-E04-T008

Balance late game.

**Acceptance Criteria**

* All advanced classes can finish campaign.
* Endgame builds have distinct strengths.
* MVPs are farmable but not trivial.
* XP curve is acceptable.
* Gear chase remains meaningful.

---

## Epic M9-E02 — Performance

### M9-E02-T001 — Add performance debug overlay

**Priority:** P1
**Dependencies:** M0-E01-T004

Show:

* FPS.
* Entity count.
* Active enemies.
* Active projectiles.
* Active VFX.
* Memory estimate.
* Current map ID.

**Acceptance Criteria**

* Overlay can be toggled.
* Overlay does not affect normal gameplay.
* Values update in real time.

---

### M9-E02-T002 — Optimize pathfinding

**Priority:** P1
**Dependencies:** M1-E02-T004

Improve pathfinding performance.

**Acceptance Criteria**

* Pathfinding works on large maps.
* Repeated clicks do not freeze game.
* Enemy pathfinding is throttled.
* Long paths are handled safely.

---

### M9-E02-T003 — Optimize entity updates

**Priority:** P1
**Dependencies:** M3-E04-T007

Optimize active entities.

**Acceptance Criteria**

* Off-screen entities can be simplified.
* Spawn zones do not overpopulate.
* Dead entities are cleaned up.
* Large fights maintain target FPS.

---

### M9-E02-T004 — Optimize UI rendering

**Priority:** P2
**Dependencies:** M8-E01-T001

Improve UI performance.

**Acceptance Criteria**

* Inventory with many items remains responsive.
* Tooltips do not cause stutter.
* Damage numbers are pooled.
* UI updates are event-driven.

---

## Epic M9-E03 — Save Stability

### M9-E03-T001 — Add save migration system

**Priority:** P1
**Dependencies:** M2-E05-T001

Support save version migration.

**Acceptance Criteria**

* Old save versions can be upgraded.
* Missing fields get defaults.
* Migration logs version changes.
* Corrupted saves fail gracefully.

---

### M9-E03-T002 — Add backup saves

**Priority:** P2
**Dependencies:** M9-E03-T001

Maintain rotating backups.

**Acceptance Criteria**

* Each slot has backup versions.
* Backup can restore if primary fails.
* Backup does not overwrite too aggressively.
* Player is warned if restore happens.

---

### M9-E03-T003 — Save/load stress testing

**Priority:** P0
**Dependencies:** M9-E03-T002

Test save/load across:

* New game.
* Map transition.
* Level up.
* Inventory change.
* Equipment change.
* Quest progress.
* Boss defeated.
* Advanced class chosen.
* Tower progress.

**Acceptance Criteria**

* No save corruption.
* No missing inventory.
* No lost equipment.
* No invalid map state.
* No broken class state.

---

## Epic M9-E04 — Bug Fixing and Release QA

### M9-E04-T001 — Create QA checklist per map

**Priority:** P1
**Dependencies:** M5-E03-T007

Checklist should validate:

* Collision.
* Spawn zones.
* Portals.
* NPCs.
* Loot.
* Music.
* Camera.
* Performance.
* Visual issues.

**Acceptance Criteria**

* Every map has checklist.
* Each issue can be tracked.
* Release candidate has no critical map blockers.

---

### M9-E04-T002 — Create QA checklist per class

**Priority:** P1
**Dependencies:** M4-E03-T008

Checklist should validate:

* Skill unlocks.
* Skill scaling.
* Gear compatibility.
* Boss viability.
* Campaign viability.
* Save/load class state.
* Hotbar behavior.

**Acceptance Criteria**

* Every class has checklist.
* Every advanced class can complete core content.
* No skill crashes the game.
* No class has impossible progression.

---

### M9-E04-T003 — Full playthrough test

**Priority:** P0
**Dependencies:** M9-E01-T005

Run full campaign playthrough.

**Acceptance Criteria**

* New game to campaign completion works.
* At least one class completes campaign.
* No critical crashes.
* Major systems are used.
* Save/load works throughout.

---

### M9-E04-T004 — Four-class campaign viability test

**Priority:** P0
**Dependencies:** M9-E04-T003

Complete or simulate campaign viability for all base classes.

**Acceptance Criteria**

* Swordsman can complete campaign.
* Mage can complete campaign.
* Archer can complete campaign.
* Thief can complete campaign.
* Pain points are documented and fixed.

---

### M9-E04-T005 — Advanced class viability test

**Priority:** P1
**Dependencies:** M9-E04-T004

Validate all advanced classes.

**Acceptance Criteria**

* Knight viable.
* Guardian viable.
* Wizard viable.
* Sage viable.
* Hunter viable.
* Minstrel viable.
* Assassin viable.
* Rogue viable.

---

## Epic M9-E05 — Release Candidate

### M9-E05-T001 — Replace critical placeholder assets

**Priority:** P1
**Dependencies:** M8-E03-T004

Replace placeholders for:

* Player classes.
* Major monsters.
* Bosses.
* Town NPCs.
* UI icons.
* Main menu.
* Core tilesets.

**Acceptance Criteria**

* Game no longer looks like pure prototype.
* Placeholder assets remain only in non-critical areas.
* Final art follows pixel art direction.
* Assets are original/IP-safe.

---

### M9-E05-T002 — Add credits screen

**Priority:** P2
**Dependencies:** M9-E05-T001

Create credits screen.

**Acceptance Criteria**

* Credits accessible from main menu.
* Credits list contributors/tools/licenses.
* Asset licenses are acknowledged.
* Music/SFX licenses are acknowledged.

---

### M9-E05-T003 — Add final main menu

**Priority:** P1
**Dependencies:** M2-E05-T003

Main menu should include:

* New Game.
* Continue.
* Load Game.
* Settings.
* Credits.
* Quit/Exit where applicable.

**Acceptance Criteria**

* All menu actions work.
* Menu is visually polished.
* Save slots display correctly.
* Settings can be opened.

---

### M9-E05-T004 — Release candidate build verification

**Priority:** P0
**Dependencies:** M9-E05-T003

Verify the final build.

**Acceptance Criteria**

* Game starts cleanly.
* New game works.
* Continue works.
* Saving/loading works.
* Campaign completion works.
* Endgame unlock works.
* No critical console errors.
* Performance is acceptable.

---

# 15. M10 — Post-Release / Expansion Backlog

## Epic M10-E01 — Optional Systems

### M10-E01-T001 — Add optional card system

**Priority:** P3
**Dependencies:** M6-E07-T002

Add simplified card-like modifiers as optional endgame customization.

**Acceptance Criteria**

* Cards are not required for campaign.
* Cards socket into limited slots.
* Cards are data-driven.
* Cards do not invalidate sigils.

---

### M10-E01-T002 — Add New Journey mode

**Priority:** P3
**Dependencies:** M7-E03-T003

Add replay mode with modifiers.

**Acceptance Criteria**

* Player can start New Journey after campaign.
* New rules or modifiers apply.
* Rewards are cosmetic or account-local.
* Save system handles mode safely.

---

### M10-E01-T003 — Add additional support companions

**Priority:** P3
**Dependencies:** M6-E08-T004

Add:

* Battle Peco.
* Arcane Familiar.
* Forest Hawk.
* Ember Sprite.
* Iron Beetle.

**Acceptance Criteria**

* Each support has unique role.
* Supports are balanced.
* Supports are unlocked through content.
* Support UI handles expanded list.

---

### M10-E01-T004 — Add cosmetic collection

**Priority:** P3
**Dependencies:** M9-E05-T001

Add unlockable cosmetics.

**Acceptance Criteria**

* Cosmetics do not affect stats.
* Cosmetics can be unlocked from bosses/trials.
* Player can equip cosmetics in town.
* Cosmetics save and load.

---

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
