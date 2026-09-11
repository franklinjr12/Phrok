## Epic M3-E01 — Stats and Character Progression

### M3-E01-T001 — Implement stat allocation screen

**Priority:** P0
**Dependencies:** M1-E04-T002

Allow player to allocate points into:

* STR.
* AGI.
* VIT.
* INT.
* DEX.
* LUK.

**Acceptance Criteria**

* Screen shows current stats.
* Screen shows unspent stat points.
* Player can increase stats.
* Stat cost increases by stat range.
* Derived stats update immediately.
* Changes can be confirmed.

---

### M3-E01-T002 — Add derived stat calculation

**Priority:** P0
**Dependencies:** M3-E01-T001

Calculate:

* Max HP.
* Max SP.
* Physical attack.
* Ranged attack.
* Magic attack.
* Defense.
* Magic defense.
* Hit.
* Dodge.
* Crit.
* Attack speed.
* Cast speed.
* Move speed.
* Weight limit.

**Acceptance Criteria**

* Derived stats update from base stats.
* Derived stats update from gear.
* Derived stats update from buffs.
* Character screen displays derived stats.
* Combat uses derived stats.

---

### M3-E01-T003 — Add stat reset service

**Priority:** P2
**Dependencies:** M3-E01-T001

Create town NPC service for resetting allocated stats.

**Acceptance Criteria**

* NPC offers stat reset.
* Reset costs gold.
* Player gets spent stat points back.
* Base class starting stats remain intact.
* Confirmation prompt appears.

---
