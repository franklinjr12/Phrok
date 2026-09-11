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
