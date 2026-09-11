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
