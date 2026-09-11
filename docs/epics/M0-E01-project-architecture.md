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
