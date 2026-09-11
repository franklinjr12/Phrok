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
