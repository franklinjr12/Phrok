## Epic M6-E08 — Support Companions

### M6-E08-T001 — Implement support companion slot

**Priority:** P1
**Dependencies:** M6-E01-T003

Allow one support companion at a time.

**Acceptance Criteria**

* Player can equip one support.
* Support appears near player or as UI-only helper.
* Support can trigger automatic actions.
* Support state saves and loads.

---

### M6-E08-T002 — Implement Pack Sprite support

**Priority:** P1
**Dependencies:** M6-E08-T001

Pack Sprite should provide:

* Extra carry weight.
* Auto-pickup filter.
* Emergency potion helper.
* Material finder.

**Acceptance Criteria**

* Pack Sprite affects weight limit.
* Auto-pickup behavior can be configured.
* Support actions use cooldowns.
* Support does not require micromanagement.

---

### M6-E08-T003 — Implement Shrine Wisp support

**Priority:** P1
**Dependencies:** M6-E08-T001

Shrine Wisp should provide:

* Minor heal.
* Cleanse.
* Blessing aura.
* Spirit barrier.
* Undead ward.

**Acceptance Criteria**

* Shrine Wisp can heal automatically.
* Cleanse works on eligible statuses.
* Blessing aura modifies stats.
* Undead ward helps against undead enemies.

---

### M6-E08-T004 — Implement support leveling

**Priority:** P2
**Dependencies:** M6-E08-T003

Support companions level separately.

**Acceptance Criteria**

* Support gains XP or affinity.
* Support unlocks better effects.
* Support level saves and loads.
* Support growth is visible in UI.

---
