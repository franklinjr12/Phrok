## Epic M9-E04 — Bug Fixing and Release QA

### M9-E04-T001 — Create QA checklist per map

**Priority:** P1
**Dependencies:** M5-E03-T007

Checklist should validate:

* Collision.
* Spawn zones.
* Portals.
* NPCs.
* Loot.
* Music.
* Camera.
* Performance.
* Visual issues.

**Acceptance Criteria**

* Every map has checklist.
* Each issue can be tracked.
* Release candidate has no critical map blockers.

---

### M9-E04-T002 — Create QA checklist per class

**Priority:** P1
**Dependencies:** M4-E03-T008

Checklist should validate:

* Skill unlocks.
* Skill scaling.
* Gear compatibility.
* Boss viability.
* Campaign viability.
* Save/load class state.
* Hotbar behavior.

**Acceptance Criteria**

* Every class has checklist.
* Every advanced class can complete core content.
* No skill crashes the game.
* No class has impossible progression.

---

### M9-E04-T003 — Full playthrough test

**Priority:** P0
**Dependencies:** M9-E01-T005

Run full campaign playthrough.

**Acceptance Criteria**

* New game to campaign completion works.
* At least one class completes campaign.
* No critical crashes.
* Major systems are used.
* Save/load works throughout.

---

### M9-E04-T004 — Four-class campaign viability test

**Priority:** P0
**Dependencies:** M9-E04-T003

Complete or simulate campaign viability for all base classes.

**Acceptance Criteria**

* Swordsman can complete campaign.
* Mage can complete campaign.
* Archer can complete campaign.
* Thief can complete campaign.
* Pain points are documented and fixed.

---

### M9-E04-T005 — Advanced class viability test

**Priority:** P1
**Dependencies:** M9-E04-T004

Validate all advanced classes.

**Acceptance Criteria**

* Knight viable.
* Guardian viable.
* Wizard viable.
* Sage viable.
* Hunter viable.
* Minstrel viable.
* Assassin viable.
* Rogue viable.

---
