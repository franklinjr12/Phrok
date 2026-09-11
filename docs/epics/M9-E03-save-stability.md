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
