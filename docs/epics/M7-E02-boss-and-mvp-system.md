## Epic M7-E02 — Boss and MVP System

### M7-E02-T001 — Implement boss arena flow

**Priority:** P1
**Dependencies:** M3-E04-T007

Support dedicated boss arenas.

**Acceptance Criteria**

* Entering arena locks boss encounter.
* Boss resets if player dies.
* Boss defeat grants rewards.
* Player can leave after victory.
* Boss UI appears.

---

### M7-E02-T002 — Implement boss phases

**Priority:** P1
**Dependencies:** M7-E02-T001

Bosses can change behavior based on HP thresholds.

**Acceptance Criteria**

* Boss phase changes at configured HP percentages.
* Phase change can trigger dialogue, VFX, or new attacks.
* Phase data comes from JSON.
* Boss behavior remains stable after save/load boundaries.

---

### M7-E02-T003 — Implement MVP summoning ritual

**Priority:** P2
**Dependencies:** M7-E02-T001

Allow players to summon MVPs using materials.

**Acceptance Criteria**

* Ritual requires materials.
* Ritual consumes materials.
* MVP spawns in correct arena/map.
* MVP drops special rewards.
* MVP can be repeated.

---

### M7-E02-T004 — Implement MVP respawn timers

**Priority:** P2
**Dependencies:** M7-E02-T003

Create single-player-friendly respawn logic.

**Acceptance Criteria**

* MVP respawns after in-game timer or map activity condition.
* Respawn does not require real-world waiting.
* Timer state saves and loads.
* Player can also use summoning ritual if available.

---

### M7-E02-T005 — Create regional MVPs

**Priority:** P2
**Dependencies:** M7-E02-T004

Create MVPs:

* King Slime Verdant.
* Thorn Matriarch.
* Sunken Corsair.
* Brass Burrower.
* Dune Tyrant.
* Bell Wraith.
* Rune Chimera.
* Fallen Star Saint.

**Acceptance Criteria**

* Each MVP has original identity.
* Each MVP has unique mechanics.
* Each MVP has unique loot.
* Each MVP supports repeated farming.
* Each MVP has bestiary entry.

---
