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
