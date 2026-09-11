## Epic M3-E03 — Status Effects

### M3-E03-T001 — Implement status effect model

**Priority:** P0
**Dependencies:** M3-E02-T001

Status effect data should support:

* ID.
* Name.
* Type.
* Duration.
* Tick interval.
* Stack behavior.
* Max stacks.
* Stat modifiers.
* Damage over time.
* Control effect.
* Visual icon.
* Dispel rules.

**Acceptance Criteria**

* Status definitions load from JSON.
* Status can be applied to player or enemy.
* Status expires correctly.
* Status is visible in UI.

---

### M3-E03-T002 — Implement core status effects

**Priority:** P1
**Dependencies:** M3-E03-T001

Add:

* Poison.
* Burn.
* Freeze.
* Slow.
* Stun.
* Blind.
* Curse.
* Silence.
* Bleed.
* Armor Break.
* Marked.
* Shielded.
* Blessed.

**Acceptance Criteria**

* Each status has unique gameplay behavior.
* Each status has placeholder icon.
* Each status can be applied by skills or monsters.
* Status behavior is visible during combat.

---
