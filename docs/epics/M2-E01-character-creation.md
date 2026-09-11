## Epic M2-E01 — Character Creation

### M2-E01-T001 — Create character creation screen layout

**Priority:** P0
**Dependencies:** M0-E01-T002

Create UI for:

* Character name.
* Class selection.
* Appearance placeholder.
* Starting stat preset.
* Confirm button.

**Acceptance Criteria**

* Screen opens from new game.
* Player can enter a name.
* Player can select class.
* Player can confirm character.
* Confirmed character enters WorldScene.

---

### M2-E01-T002 — Implement four base class definitions

**Priority:** P0
**Dependencies:** M0-E02-T002

Create JSON definitions for:

* Swordsman.
* Mage.
* Archer.
* Thief.

Each class needs:

* ID.
* Display name.
* Description.
* Starting stats.
* Growth rates.
* Starting weapon.
* Allowed weapon types.
* Base skills.
* Advanced class options.

**Acceptance Criteria**

* Character creation can display all four classes.
* Selecting class changes starting stats.
* Player starts with class-appropriate weapon.
* Player starts with class-appropriate first skill.

---

### M2-E01-T003 — Add class preview panel

**Priority:** P1
**Dependencies:** M2-E01-T002

Show class identity before selection.

**Acceptance Criteria**

* Each class shows role summary.
* Each class shows recommended stats.
* Each class shows starting weapon.
* Each class shows difficulty rating.
* Each class shows future specializations.

---
