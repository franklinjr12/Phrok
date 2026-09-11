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
