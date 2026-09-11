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
