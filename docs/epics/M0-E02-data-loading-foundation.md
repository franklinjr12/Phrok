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
