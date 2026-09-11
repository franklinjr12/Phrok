## Epic M1-E03 — Combat Prototype

### M1-E03-T001 — Create enemy entity

**Priority:** P0
**Dependencies:** M0-E02-T004

Create enemy entity with:

* Sprite placeholder.
* Position.
* HP.
* Level.
* Stats.
* Behavior mode.
* Collision.
* Targeting state.

**Acceptance Criteria**

* Green Jelly spawns on map.
* Enemy can be clicked.
* Enemy has HP.
* Enemy can die.

---

### M1-E03-T002 — Add click-to-target enemy

**Priority:** P0
**Dependencies:** M1-E03-T001

Allow player to select enemies by left-clicking them.

**Acceptance Criteria**

* Clicking enemy selects it.
* Selected enemy shows highlight.
* Target frame appears in UI.
* Clicking empty ground clears or changes movement target.

---

### M1-E03-T003 — Add auto-attack

**Priority:** P0
**Dependencies:** M1-E03-T002

Implement basic auto-attack behavior.

**Acceptance Criteria**

* Clicking an enemy moves player into attack range.
* Player attacks repeatedly when in range.
* Enemy takes damage.
* Enemy dies at 0 HP.
* Auto-attack stops when enemy dies.

---

### M1-E03-T004 — Add basic enemy attack

**Priority:** P0
**Dependencies:** M1-E03-T003

Allow enemy to attack the player when close enough.

**Acceptance Criteria**

* Enemy deals damage to player.
* Player HP decreases.
* Enemy respects attack cooldown.
* Player can die when HP reaches 0.

---

### M1-E03-T005 — Implement base combat formulas

**Priority:** P0
**Dependencies:** M1-E03-T003

Implement formulas for:

* Physical attack.
* Ranged attack.
* Magic attack.
* Defense.
* Hit chance.
* Dodge.
* Critical chance.
* Critical damage.

**Acceptance Criteria**

* Damage uses player stats and weapon stats.
* Damage uses enemy defense.
* Hit chance can miss.
* Crits can happen.
* Formula values are logged in debug mode.

---
