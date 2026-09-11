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
